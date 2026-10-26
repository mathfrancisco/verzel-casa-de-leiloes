import { randomBytes } from 'node:crypto';
import {
  bytesToBase64url,
  createAuditEntry,
  receiptSignatureBytes,
  type AuditCrypto,
  type Signer,
} from '@leilao/shared';
import { and, asc, eq, inArray, lte, notInArray, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import type { RealtimeEvent } from './bids';
import { walletView } from './wallet';
import type { Db } from '../infra/db/client';
import {
  idempotencyKeys,
  lotEntries,
  lots,
  receipts,
  walletEntries,
  wallets,
} from '../infra/db/schema';

export interface SettlementDeps {
  db: Db;
  signer: Signer;
  crypto: AuditCrypto;
  collectEvents?: (events: RealtimeEvent[]) => void;
  /** Relógio controlado do seed; sem ele vale o `now()` do banco. */
  clock?: () => Date;
}

export interface SettleDueLotsOptions {
  limit: number;
}

export function generateReceiptCode(): string {
  return randomBytes(16).toString('base64url');
}

/** Claims one due lot in the same transaction that writes its settlement. */
async function settleOne(deps: SettlementDeps, skippedIds: string[]) {
  let events: RealtimeEvent[] | null = null;
  let claimedId: string | null = null;
  try {
    await deps.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({ id: lots.id })
        .from(lots)
        .where(
          and(
            eq(lots.state, 'ACTIVE'),
            lte(lots.endsAt, deps.clock?.() ?? sql`now()`),
            skippedIds.length ? notInArray(lots.id, skippedIds) : undefined,
          ),
        )
        .orderBy(asc(lots.endsAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!candidate) return;
      claimedId = candidate.id;

      const [lot] = await tx.select().from(lots).where(eq(lots.id, candidate.id));
      if (!lot) return;
      // As colunas timestamptz(3) arredondam microssegundos; assinar o mesmo valor truncado evita
      // que a data persistida do recibo divirja dos bytes assinados.
      const [nowRow] = await tx.execute<{ now: string }>(
        sql`SELECT date_trunc('milliseconds', now()) AS now`,
      );
      const now = deps.clock?.() ?? new Date(nowRow!.now);
      const common = {
        lotId: lot.id,
        seq: lot.chainLength + 1,
        type: 'CLOSED' as const,
        bidderPseudonym: null,
        amountCents: null,
        createdAt: now.toISOString(),
        prevHash: lot.headHash,
      };

      if (lot.bidCount === 0 || !lot.leaderId || lot.currentPriceCents === null) {
        const payload = { result: 'UNSOLD' as const };
        const entry = await createAuditEntry({ ...common, payload }, deps.signer, deps.crypto);
        await tx.insert(lotEntries).values({ ...entry, lotId: lot.id, payload, createdAt: now });
        await tx
          .update(lots)
          .set({
            state: 'CLOSED_NO_WINNER',
            settledAt: now,
            chainLength: common.seq,
            headHash: entry.hash,
          })
          .where(eq(lots.id, lot.id));
        events = [
          {
            type: 'lot.closed',
            serverTime: now.toISOString(),
            payload: {
              lotId: lot.id,
              result: 'UNSOLD',
              finalPriceCents: null,
              winnerPseudonym: null,
            },
          },
        ];
        return;
      }

      const walletUserIds = [lot.leaderId, lot.sellerId].sort();
      await tx
        .select({ userId: wallets.userId })
        .from(wallets)
        .where(inArray(wallets.userId, walletUserIds))
        .orderBy(asc(wallets.userId))
        .for('update');
      const [winnerEntry] = await tx
        .select({ bidderPseudonym: lotEntries.bidderPseudonym })
        .from(lotEntries)
        .where(eq(lotEntries.lotId, lot.id))
        .orderBy(sql`${lotEntries.seq} DESC`)
        .limit(1);
      if (!winnerEntry?.bidderPseudonym)
        throw new Error('Lote com vencedor sem lance final válido.');

      const winnerPseudonym = winnerEntry.bidderPseudonym;
      const amountCents = lot.currentPriceCents;
      const payload = { winnerPseudonym, amountCents };
      const entry = await createAuditEntry({ ...common, payload }, deps.signer, deps.crypto);
      const receiptCode = generateReceiptCode();
      const receiptSignature = bytesToBase64url(
        await deps.signer.sign(
          receiptSignatureBytes({
            lotId: lot.id,
            finalHash: entry.hash,
            amountCents,
            winnerPseudonym,
            issuedAt: now.toISOString(),
          }),
        ),
      );

      await tx.insert(walletEntries).values([
        {
          userId: lot.leaderId,
          type: 'SETTLEMENT_DEBIT',
          amountCents: -amountCents,
          lotId: lot.id,
        },
        { userId: lot.sellerId, type: 'SETTLEMENT_CREDIT', amountCents, lotId: lot.id },
      ]);
      await tx
        .update(wallets)
        .set({ balanceCents: sql`${wallets.balanceCents} - ${amountCents}`, updatedAt: now })
        .where(eq(wallets.userId, lot.leaderId));
      await tx
        .update(wallets)
        .set({ balanceCents: sql`${wallets.balanceCents} + ${amountCents}`, updatedAt: now })
        .where(eq(wallets.userId, lot.sellerId));
      await tx.insert(lotEntries).values({ ...entry, lotId: lot.id, payload, createdAt: now });
      await tx.insert(receipts).values({
        id: uuidv7(),
        lotId: lot.id,
        publicCode: receiptCode,
        winnerId: lot.leaderId,
        winnerPseudonym,
        amountCents,
        finalHash: entry.hash,
        signature: receiptSignature,
        issuedAt: now,
      });
      await tx
        .update(lots)
        .set({ state: 'SETTLED', settledAt: now, chainLength: common.seq, headHash: entry.hash })
        .where(eq(lots.id, lot.id));

      const [winnerWallet, sellerWallet] = await Promise.all([
        walletView(tx, lot.leaderId),
        walletView(tx, lot.sellerId),
      ]);
      const walletPayload = (wallet: Awaited<ReturnType<typeof walletView>>) => ({
        totalCents: wallet.totalCents,
        committedCents: wallet.committedCents,
        availableCents: wallet.availableCents,
      });
      events = [
        {
          type: 'lot.closed',
          serverTime: now.toISOString(),
          payload: { lotId: lot.id, result: 'SOLD', finalPriceCents: amountCents, winnerPseudonym },
        },
        {
          type: 'lot.won',
          userId: lot.leaderId,
          serverTime: now.toISOString(),
          payload: { lotId: lot.id, lotTitle: lot.title, amountCents, receiptCode },
        },
        {
          type: 'wallet.changed',
          userId: lot.leaderId,
          serverTime: now.toISOString(),
          payload: walletPayload(winnerWallet),
        },
        {
          type: 'wallet.changed',
          userId: lot.sellerId,
          serverTime: now.toISOString(),
          payload: walletPayload(sellerWallet),
        },
      ];
    });
    return { events, failedId: null, error: null };
  } catch (error) {
    return { events: null, failedId: claimedId, error };
  }
}

export async function settleDueLots(deps: SettlementDeps, options: SettleDueLotsOptions) {
  let settled = 0;
  const skippedIds: string[] = [];
  const failures: unknown[] = [];
  for (let index = 0; index < options.limit; index += 1) {
    const result = await settleOne(deps, skippedIds);
    if (result.error) {
      failures.push(result.error);
      if (!result.failedId) break;
      skippedIds.push(result.failedId);
      continue;
    }
    if (!result.events) break;
    settled += 1;
    try {
      deps.collectEvents?.(result.events);
    } catch (error) {
      // A transação já foi confirmada: registrar a falha não pode impedir os outros lotes.
      failures.push(error);
    }
  }
  return { settled, failures };
}

export async function clearExpiredIdempotencyKeys(db: Db) {
  await db
    .delete(idempotencyKeys)
    .where(sql`${idempotencyKeys.createdAt} < now() - interval '24 hours'`);
}
