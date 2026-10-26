import {
  createAuditEntry,
  type AuditCrypto,
  type BidResponse,
  type PlaceBidInput,
  type Signer,
} from '@leilao/shared';
import { and, eq, sql } from 'drizzle-orm';
import { antiSniping } from '../domain/antiSniping';
import { validateBid } from '../domain/bidRules';
import { DomainError } from '../domain/errors';
import { pseudonym } from '../domain/pseudonym';
import type { Db } from '../infra/db/client';
import { idempotencyKeys, lotEntries, lots, walletEntries, wallets } from '../infra/db/schema';
import { getLotDetail, type Viewer } from './lots';
import { walletView } from './wallet';

const BID_ROUTE_PREFIX = '/api/lots/';

export interface BidEvent {
  type:
    | 'bid.accepted'
    | 'lot.extended'
    | 'bid.outbid'
    | 'wallet.changed'
    | 'lot.closed'
    | 'lot.won'
    | 'lot.cancelled';
  userId?: string;
  serverTime: string;
  payload:
    | Record<string, unknown>
    | { totalCents: number; committedCents: number; availableCents: number };
}

export type RealtimeEvent = BidEvent;

export interface BidDeps {
  db: Db;
  pseudonymSecret: string;
  signer: Signer;
  crypto: AuditCrypto;
  /** LC-012 binds this collector to Socket.IO. It is called only after a successful commit. */
  collectEvents?: (events: BidEvent[]) => void;
}

function route(lotId: string) {
  return `${BID_ROUTE_PREFIX}${lotId}/bids`;
}

export async function placeBid(
  deps: BidDeps,
  viewer: Viewer,
  lotId: string,
  input: PlaceBidInput,
  idempotencyKey: string,
): Promise<BidResponse> {
  // RN-04: a sessão é validada no handler; o papel vem antes de consultar o lote.
  if (viewer.role !== 'BIDDER') throw new DomainError('SELLER_CANNOT_BID');

  let events: BidEvent[] = [];
  const response = await deps.db.transaction(async (tx) => {
    // Serializes an absent key too, avoiding a unique-key race while preserving lot -> wallet locks.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${viewer.id}:${idempotencyKey}`}, 0))`,
    );
    const [stored] = await tx
      .select({ route: idempotencyKeys.route, response: idempotencyKeys.response })
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, viewer.id), eq(idempotencyKeys.key, idempotencyKey)));
    if (stored) {
      if (stored.route !== route(lotId)) {
        throw new DomainError(
          'VALIDATION_ERROR',
          { field: 'Idempotency-Key' },
          'Chave de idempotência já usada em outra operação.',
        );
      }
      return stored.response as BidResponse;
    }

    const [lockedLot] = await tx.select().from(lots).where(eq(lots.id, lotId)).for('update');
    if (!lockedLot) throw new DomainError('LOT_NOT_FOUND');
    const [nowRow] = await tx.execute<{ now: string }>(sql`select now() as now`);
    const now = new Date(nowRow!.now);

    // Defesa de consistência caso um vendedor seja representado com papel incorreto.
    if (lockedLot.sellerId === viewer.id) {
      throw new DomainError('SELLER_CANNOT_BID');
    }
    await tx.select().from(wallets).where(eq(wallets.userId, viewer.id)).for('update');

    // Um depósito não usa a trava consultiva do lance e pode ter incluído esta chave enquanto
    // este lance aguardava a carteira. Reconsultar após a trava impede violação de PK/500.
    const [storedAfterWallet] = await tx
      .select({ route: idempotencyKeys.route, response: idempotencyKeys.response })
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, viewer.id), eq(idempotencyKeys.key, idempotencyKey)));
    if (storedAfterWallet) {
      if (storedAfterWallet.route !== route(lotId)) {
        throw new DomainError(
          'VALIDATION_ERROR',
          { field: 'Idempotency-Key' },
          'Chave de idempotência já usada em outra operação.',
        );
      }
      return storedAfterWallet.response as BidResponse;
    }
    const [ledger] = await tx
      .select({
        total: sql<number>`coalesce(sum(${walletEntries.amountCents}), 0)::bigint`.mapWith(Number),
      })
      .from(walletEntries)
      .where(eq(walletEntries.userId, viewer.id));
    const [commitments] = await tx
      .select({
        committed: sql<number>`coalesce(sum(${lots.currentPriceCents}), 0)::bigint`.mapWith(Number),
      })
      .from(lots)
      .where(and(eq(lots.state, 'ACTIVE'), eq(lots.leaderId, viewer.id)));
    const available = ledger!.total - commitments!.committed;

    validateBid(lockedLot, viewer.id, input.amountCents, now, available);
    const bidderPseudonym = pseudonym(deps.pseudonymSecret, 'BIDDER', viewer.id, lotId);
    const extendedEndsAt = antiSniping(lockedLot.endsAt, now);
    const payload: Record<string, string> = extendedEndsAt
      ? { endsAtAfter: extendedEndsAt.toISOString() }
      : {};
    const entry = await createAuditEntry(
      {
        lotId,
        seq: lockedLot.chainLength + 1,
        type: 'BID',
        bidderPseudonym,
        amountCents: input.amountCents,
        createdAt: now.toISOString(),
        payload,
        prevHash: lockedLot.headHash,
      },
      deps.signer,
      deps.crypto,
    );
    const { createdAt: createdAtForResponse, ...entryForDatabase } = entry;
    await tx.insert(lotEntries).values({
      ...entryForDatabase,
      lotId,
      bidderId: viewer.id,
      payload,
      createdAt: now,
    });
    await tx
      .update(lots)
      .set({
        currentPriceCents: input.amountCents,
        leaderId: viewer.id,
        bidCount: lockedLot.bidCount + 1,
        chainLength: lockedLot.chainLength + 1,
        headHash: entry.hash,
        ...(extendedEndsAt ? { endsAt: extendedEndsAt } : {}),
      })
      .where(eq(lots.id, lotId));

    const lot = await getLotDetail(
      { db: tx as unknown as Db, pseudonymSecret: deps.pseudonymSecret },
      lotId,
      viewer,
    );
    if (!lot) throw new Error('Lote desapareceu durante a transação.');
    const result: BidResponse = {
      bid: {
        seq: entry.seq,
        amountCents: input.amountCents,
        bidderPseudonym,
        createdAt: createdAtForResponse,
        hash: entry.hash,
      },
      lot,
    };
    await tx
      .insert(idempotencyKeys)
      .values({ userId: viewer.id, key: idempotencyKey, route: route(lotId), response: result });

    events = [
      {
        type: 'bid.accepted',
        serverTime: now.toISOString(),
        payload: {
          lotId,
          ...result.bid,
          currentPriceCents: input.amountCents,
          minimumNextBidCents: input.amountCents + lockedLot.minIncrementCents,
          bidCount: lockedLot.bidCount + 1,
          endsAt: lot.endsAt,
        },
      },
      ...(extendedEndsAt
        ? [
            {
              type: 'lot.extended' as const,
              serverTime: now.toISOString(),
              payload: {
                lotId,
                endsAt: extendedEndsAt.toISOString(),
                previousEndsAt: lockedLot.endsAt.toISOString(),
              },
            },
          ]
        : []),
      {
        type: 'wallet.changed',
        userId: viewer.id,
        serverTime: now.toISOString(),
        payload: walletChangedPayload(await walletView(tx, viewer.id)),
      },
      ...(lockedLot.leaderId
        ? [
            {
              type: 'bid.outbid' as const,
              userId: lockedLot.leaderId,
              serverTime: now.toISOString(),
              payload: { lotId, lotTitle: lockedLot.title, newPriceCents: input.amountCents },
            },
            {
              type: 'wallet.changed' as const,
              userId: lockedLot.leaderId,
              serverTime: now.toISOString(),
              payload: walletChangedPayload(await walletView(tx, lockedLot.leaderId)),
            },
          ]
        : []),
    ];
    return result;
  });
  deps.collectEvents?.(events);
  return response;
}

function walletChangedPayload(wallet: Awaited<ReturnType<typeof walletView>>) {
  return {
    totalCents: wallet.totalCents,
    committedCents: wallet.committedCents,
    availableCents: wallet.availableCents,
  };
}
