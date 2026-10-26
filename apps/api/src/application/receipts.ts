import type { Participation, ParticipationsResponse, Receipt } from '@leilao/shared';
import { desc, eq, max, sql } from 'drizzle-orm';
import { lotPhase } from '../domain/lotPhase';
import type { Db } from '../infra/db/client';
import { images, lotEntries, lots, receipts } from '../infra/db/schema';

export interface ReceiptDeps {
  db: Db;
  publicKeyBase64url: string;
}

/** Reads only the public receipt snapshot; no user identity reaches this DTO. */
export async function getReceipt(deps: ReceiptDeps, code: string): Promise<Receipt | null> {
  const [row] = await deps.db
    .select({ receipt: receipts, lot: lots, image: images })
    .from(receipts)
    .innerJoin(lots, eq(lots.id, receipts.lotId))
    .innerJoin(images, eq(images.id, lots.imageId))
    .where(eq(receipts.publicCode, code));
  if (!row) return null;
  return {
    code: row.receipt.publicCode,
    lot: {
      id: row.lot.id,
      title: row.lot.title,
      imageUrl: `/api/images/${row.image.id}`,
      item: row.lot.itemSnapshot as Receipt['lot']['item'],
    },
    amountCents: row.receipt.amountCents,
    winnerPseudonym: row.receipt.winnerPseudonym,
    issuedAt: row.receipt.issuedAt.toISOString(),
    finalHash: row.receipt.finalHash,
    signature: row.receipt.signature,
    publicKey: deps.publicKeyBase64url,
    auditUrl: `/auditoria/${row.lot.id}`,
    revoked: row.receipt.revokedAt !== null,
    revokedAt: row.receipt.revokedAt?.toISOString() ?? null,
  };
}

/** Lists a bidder's lots using the database clock for phases and status. */
export async function listParticipations(db: Db, userId: string): Promise<ParticipationsResponse> {
  return db.transaction(async (tx) => {
    const clockRows = await tx.execute<{ now: string }>(sql`SELECT now() AS now`);
    const now = clockRows[0]!.now;
    const rows = await tx
      .select({
        lot: lots,
        imageId: images.id,
        myBestBidCents: max(lotEntries.amountCents),
        receiptCode: receipts.publicCode,
        receiptWinnerId: receipts.winnerId,
      })
      .from(lotEntries)
      .innerJoin(lots, eq(lots.id, lotEntries.lotId))
      .innerJoin(images, eq(images.id, lots.imageId))
      .leftJoin(receipts, eq(receipts.lotId, lots.id))
      .where(eq(lotEntries.bidderId, userId))
      .groupBy(lots.id, images.id, receipts.publicCode, receipts.winnerId)
      .orderBy(desc(lots.endsAt));
    const clock = new Date(now);
    const items: Participation[] = rows.map((row) => {
      const phase = lotPhase(row.lot, clock);
      let status: Participation['status'];
      if (row.lot.state === 'CANCELLED') status = 'CANCELLED';
      else if (row.lot.state === 'SETTLED')
        status = row.receiptWinnerId === userId ? 'WON' : 'LOST';
      else if (row.lot.state === 'CLOSED_NO_WINNER') status = 'LOST';
      else status = row.lot.leaderId === userId ? 'WINNING' : 'OUTBID';
      return {
        lotId: row.lot.id,
        title: row.lot.title,
        imageUrl: `/api/images/${row.imageId}`,
        phase,
        myBestBidCents: row.myBestBidCents ?? row.lot.startingPriceCents,
        currentPriceCents: row.lot.currentPriceCents ?? row.lot.startingPriceCents,
        status,
        receiptCode: status === 'WON' ? row.receiptCode : null,
        endsAt: row.lot.endsAt.toISOString(),
      };
    });
    return { items };
  });
}
