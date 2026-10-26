import { createAuditEntry, type CancelLotInput, type LotDetail } from '@leilao/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DomainError } from '../domain/errors';
import { lotPhase } from '../domain/lotPhase';
import type { Db } from '../infra/db/client';
import { lotEntries, lots, receipts, walletEntries, wallets } from '../infra/db/schema';
import type { RealtimeEvent } from './bids';
import { getLotDetail, type LotDeps, type Viewer } from './lots';
import { walletView } from './wallet';
import type { BidDeps } from './bids';

export type CancelDeps = Pick<LotDeps, 'pseudonymSecret'> &
  Pick<BidDeps, 'signer' | 'crypto' | 'collectEvents'> & { db: Db };

/**
 * Cancelamento do leiloeiro (RN-12, RN-13) numa única transação, travando lote → carteiras.
 * Antes da liquidação só muda o estado (o comprometido é derivado da liderança em lote ACTIVE);
 * depois, estorna o vencedor e o leiloeiro e revoga o comprovante.
 */
export async function cancelLot(
  deps: CancelDeps,
  viewer: Viewer,
  lotId: string,
  input: CancelLotInput,
): Promise<LotDetail> {
  let events: RealtimeEvent[] = [];
  const detail = await deps.db.transaction(async (tx) => {
    const [lot] = await tx.select().from(lots).where(eq(lots.id, lotId)).for('update');
    if (!lot) throw new DomainError('LOT_NOT_FOUND');
    if (lot.sellerId !== viewer.id) throw new DomainError('FORBIDDEN');

    const [nowRow] = await tx.execute<{ now: string }>(
      sql`SELECT date_trunc('milliseconds', now()) AS now`,
    );
    const now = new Date(nowRow!.now);
    const phase = lotPhase(lot, now);
    const settled = lot.state === 'SETTLED';
    // RN-12: agendado/ao vivo; RN-13: com lances (inclusive aguardando liquidação) ou liquidado.
    const cancellable =
      settled ||
      (lot.state === 'ACTIVE' && (phase === 'SCHEDULED' || phase === 'LIVE' || lot.bidCount > 0));
    if (!cancellable) throw new DomainError('LOT_NOT_CANCELLABLE');

    const reason = input.reason ?? '';
    const payload: Record<string, string> = reason ? { reason } : {};
    const entry = await createAuditEntry(
      {
        lotId,
        seq: lot.chainLength + 1,
        type: 'CANCELLED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: now.toISOString(),
        payload,
        prevHash: lot.headHash,
      },
      deps.signer,
      deps.crypto,
    );

    const affected: string[] = [];
    if (settled) {
      const [receipt] = await tx.select().from(receipts).where(eq(receipts.lotId, lotId));
      if (!receipt) throw new Error('Lote liquidado sem comprovante.');
      const amountCents = receipt.amountCents;
      const userIds = [receipt.winnerId, lot.sellerId].sort();
      await tx
        .select({ userId: wallets.userId })
        .from(wallets)
        .where(inArray(wallets.userId, userIds))
        .orderBy(asc(wallets.userId))
        .for('update');
      await tx.insert(walletEntries).values([
        { userId: lot.sellerId, type: 'REFUND_DEBIT', amountCents: -amountCents, lotId },
        { userId: receipt.winnerId, type: 'REFUND_CREDIT', amountCents, lotId },
      ]);
      await tx
        .update(wallets)
        .set({ balanceCents: sql`${wallets.balanceCents} - ${amountCents}`, updatedAt: now })
        .where(eq(wallets.userId, lot.sellerId));
      await tx
        .update(wallets)
        .set({ balanceCents: sql`${wallets.balanceCents} + ${amountCents}`, updatedAt: now })
        .where(eq(wallets.userId, receipt.winnerId));
      await tx.update(receipts).set({ revokedAt: now }).where(eq(receipts.id, receipt.id));
      affected.push(receipt.winnerId, lot.sellerId);
    } else if (lot.leaderId) {
      affected.push(lot.leaderId);
    }

    await tx.insert(lotEntries).values({ ...entry, lotId, payload, createdAt: now });
    await tx
      .update(lots)
      .set({
        state: 'CANCELLED',
        cancelledAt: now,
        chainLength: entry.seq,
        headHash: entry.hash,
      })
      .where(eq(lots.id, lotId));

    const bidders = await tx
      .selectDistinct({ bidderId: lotEntries.bidderId })
      .from(lotEntries)
      .where(and(eq(lotEntries.lotId, lotId), eq(lotEntries.type, 'BID')));
    const serverTime = now.toISOString();
    const cancelled = { lotId, reason };
    events = [
      { type: 'lot.cancelled', serverTime, payload: cancelled },
      // Licitantes fora da sala também precisam saber (RF-18).
      ...bidders.flatMap((b) =>
        b.bidderId
          ? [{ type: 'lot.cancelled' as const, userId: b.bidderId, serverTime, payload: cancelled }]
          : [],
      ),
    ];
    for (const userId of affected) {
      const wallet = await walletView(tx, userId);
      events.push({
        type: 'wallet.changed',
        userId,
        serverTime,
        payload: {
          totalCents: wallet.totalCents,
          committedCents: wallet.committedCents,
          availableCents: wallet.availableCents,
        },
      });
    }

    const result = await getLotDetail(
      { db: tx as unknown as Db, pseudonymSecret: deps.pseudonymSecret },
      lotId,
      viewer,
    );
    if (!result) throw new Error('Lote desapareceu durante a transação.');
    return result;
  });
  deps.collectEvents?.(events);
  return detail;
}
