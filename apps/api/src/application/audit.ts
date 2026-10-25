import {
  verifyChain,
  type AuditCrypto,
  type AuditGenesis,
  type AuditReport,
  type AuditReportResponse,
  type CanonicalValue,
} from '@leilao/shared';
import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../infra/db/client';
import { images, lotEntries, lots, receipts } from '../infra/db/schema';

export interface AuditDeps {
  db: Db;
  crypto: AuditCrypto;
  publicKey: Uint8Array;
  publicKeyBase64url: string;
}

function genesis(lot: typeof lots.$inferSelect, imageSha256: string): AuditGenesis {
  return {
    lotId: lot.id,
    externalId: lot.itemExternalId,
    imageSha256,
    title: lot.title,
    description: lot.description,
    category: lot.category,
    itemSnapshot: lot.itemSnapshot as AuditGenesis['itemSnapshot'],
    sellerPseudonym: lot.sellerPseudonym,
    startingPriceCents: lot.startingPriceCents,
    minIncrementCents: lot.minIncrementCents,
    startsAt: lot.startsAt.toISOString(),
    originalEndsAt: lot.originalEndsAt.toISOString(),
  };
}

/** Reads one repeatable snapshot so report fields cannot mix two committed chain states. */
export async function getAuditReport(
  deps: AuditDeps,
  lotId: string,
): Promise<AuditReportResponse | null> {
  const result = await deps.db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
    const [lot] = await tx.select().from(lots).where(eq(lots.id, lotId));
    if (!lot) return null;
    const [image, entries, receipt, clock] = await Promise.all([
      tx
        .select({ sha256: images.sha256 })
        .from(images)
        .where(eq(images.id, lot.imageId))
        .then((rows) => rows[0]),
      tx.select().from(lotEntries).where(eq(lotEntries.lotId, lotId)).orderBy(asc(lotEntries.seq)),
      tx
        .select()
        .from(receipts)
        .where(eq(receipts.lotId, lotId))
        .then((rows) => rows[0] ?? null),
      tx.execute<{ now: string }>(sql`SELECT now() AS now`).then((rows) => rows[0]!.now),
    ]);
    if (!image) throw new Error('Imagem do lote ausente.');
    const report: AuditReport = {
      lot: {
        id: lot.id,
        title: lot.title,
        state: lot.state,
        genesis: genesis(lot, image.sha256),
        genesisHash: lot.genesisHash,
        bidCount: lot.bidCount,
        chainLength: lot.chainLength,
        headHash: lot.headHash,
      },
      entries: entries.map((entry) => ({
        seq: entry.seq,
        type: entry.type,
        bidderPseudonym: entry.bidderPseudonym,
        amountCents: entry.amountCents,
        createdAt: entry.createdAt.toISOString(),
        payload: entry.payload as CanonicalValue,
        prevHash: entry.prevHash,
        hash: entry.hash,
        signature: entry.signature,
      })),
      receipt: receipt && {
        code: receipt.publicCode,
        finalHash: receipt.finalHash,
        signature: receipt.signature,
        amountCents: receipt.amountCents,
        winnerPseudonym: receipt.winnerPseudonym,
        issuedAt: receipt.issuedAt.toISOString(),
        revokedAt: receipt.revokedAt?.toISOString() ?? null,
      },
    };
    return { report, serverTime: new Date(clock).toISOString() };
  });
  if (!result) return null;
  const verdict = await verifyChain(result.report, deps.publicKey, deps.crypto);
  return {
    ...result.report,
    verdict,
    publicKey: deps.publicKeyBase64url,
    serverTime: result.serverTime,
  };
}
