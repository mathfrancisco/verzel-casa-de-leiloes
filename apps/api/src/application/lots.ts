import {
  lotStartIssue,
  type CatalogItem,
  type CreateLotInput,
  type LotDetail,
  type Role,
} from '@leilao/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { genesisHash, sha256Hex } from '../domain/auditChain';
import { DomainError } from '../domain/errors';
import { lotPhase } from '../domain/lotPhase';
import { pseudonym } from '../domain/pseudonym';
import type { Db } from '../infra/db/client';
import { images, lotEntries, lots } from '../infra/db/schema';
import type { CatalogProvider } from '../ports/catalog';

export interface LotDeps {
  db: Db;
  catalog: CatalogProvider;
  pseudonymSecret: string;
}

export interface Viewer {
  id: string;
  role: Role;
}

type LotRow = typeof lots.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function dbNow(db: Db): Promise<Date> {
  const [row] = await db.execute<{ now: string }>(sql`SELECT now() AS now`);
  return new Date(row!.now);
}

/**
 * Cria o lote a partir de um item do catálogo (RN-02, RN-20). As chamadas externas acontecem
 * antes da transação; se falharem, nada é gravado.
 */
export async function createLot(
  deps: LotDeps,
  seller: Viewer,
  input: CreateLotInput,
): Promise<LotDetail> {
  const startIssue = lotStartIssue(input.startsAt, await dbNow(deps.db));
  if (startIssue) {
    throw new DomainError('VALIDATION_ERROR', {
      issues: [{ path: ['startsAt'], message: startIssue }],
    });
  }

  const item = await deps.catalog.getItem(input.externalId);
  const image = await deps.catalog.fetchImage(item);
  const imageSha256 = sha256Hex(image.bytes);

  const lotId = uuidv7();
  const imageId = uuidv7();
  const sellerPseudonym = pseudonym(deps.pseudonymSecret, 'AUCTIONEER', seller.id, lotId);
  const genesis = genesisHash({
    lotId,
    externalId: item.externalId,
    imageSha256,
    title: input.title,
    sellerPseudonym,
    startingPriceCents: input.startingPriceCents,
    minIncrementCents: input.minIncrementCents,
    startsAt: input.startsAt.toISOString(),
    originalEndsAt: input.endsAt.toISOString(),
  });

  await deps.db.transaction(async (tx) => {
    await tx.insert(images).values({
      id: imageId,
      contentType: image.contentType,
      bytes: Buffer.from(image.bytes),
      sha256: imageSha256,
    });
    await tx.insert(lots).values({
      id: lotId,
      sellerId: seller.id,
      imageId,
      itemSource: 'artic',
      itemExternalId: item.externalId,
      itemSnapshot: item,
      title: input.title,
      description: input.description,
      category: input.category,
      startingPriceCents: input.startingPriceCents,
      minIncrementCents: input.minIncrementCents,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      originalEndsAt: input.endsAt,
      genesisHash: genesis,
      headHash: genesis,
      sellerPseudonym,
    });
  });

  return (await getLotDetail(deps, lotId, seller))!;
}

export async function getLotDetail(
  deps: Pick<LotDeps, 'db' | 'pseudonymSecret'>,
  lotId: string,
  viewer: Viewer | null,
): Promise<LotDetail | null> {
  if (!UUID.test(lotId)) return null;
  const [found] = await deps.db
    .select({ lot: lots, now: sql<string>`now()` })
    .from(lots)
    .where(eq(lots.id, lotId));
  if (!found) return null;

  const { lot } = found;
  const now = new Date(found.now);
  const entries = await deps.db
    .select()
    .from(lotEntries)
    .where(eq(lotEntries.lotId, lotId))
    .orderBy(desc(lotEntries.seq))
    .limit(50);

  return {
    ...summary(lot, now),
    description: lot.description,
    item: itemView(lot.itemSnapshot as CatalogItem),
    minIncrementCents: lot.minIncrementCents,
    minimumNextBidCents:
      lot.currentPriceCents === null
        ? lot.startingPriceCents
        : lot.currentPriceCents + lot.minIncrementCents,
    leaderPseudonym: lot.leaderId
      ? pseudonym(deps.pseudonymSecret, 'BIDDER', lot.leaderId, lot.id)
      : null,
    sellerPseudonym: lot.sellerPseudonym,
    originalEndsAt: lot.originalEndsAt.toISOString(),
    extended: lot.endsAt > lot.originalEndsAt,
    recentEntries: entries.map((e) => ({
      seq: e.seq,
      type: e.type,
      bidderPseudonym: e.bidderPseudonym,
      amountCents: e.amountCents,
      createdAt: e.createdAt.toISOString(),
    })),
    ...(viewer && { me: await viewerView(deps, lot, viewer) }),
  };
}

export async function getImage(db: Db, id: string) {
  if (!UUID.test(id)) return null;
  const [image] = await db
    .select({ bytes: images.bytes, contentType: images.contentType })
    .from(images)
    .where(eq(images.id, id));
  return image ?? null;
}

function summary(lot: LotRow, now: Date) {
  return {
    id: lot.id,
    title: lot.title,
    imageUrl: `/api/images/${lot.imageId}`,
    category: lot.category,
    phase: lotPhase(lot, now),
    startsAt: lot.startsAt.toISOString(),
    endsAt: lot.endsAt.toISOString(),
    currentPriceCents: lot.currentPriceCents,
    startingPriceCents: lot.startingPriceCents,
    bidCount: lot.bidCount,
    serverTime: now.toISOString(),
  };
}

function itemView(item: CatalogItem): LotDetail['item'] {
  const { artist, date, medium, dimensions, origin, sourceUrl } = item;
  return { artist, date, medium, dimensions, origin, sourceUrl };
}

async function viewerView(
  deps: Pick<LotDeps, 'db' | 'pseudonymSecret'>,
  lot: LotRow,
  viewer: Viewer,
): Promise<NonNullable<LotDetail['me']>> {
  // Melhor lance de cada licitante; a posição é a colocação do melhor lance do usuário.
  const best = await deps.db
    .select({
      bidderId: lotEntries.bidderId,
      best: sql<number>`max(${lotEntries.amountCents})::bigint`,
    })
    .from(lotEntries)
    .where(and(eq(lotEntries.lotId, lot.id), eq(lotEntries.type, 'BID')))
    .groupBy(lotEntries.bidderId);
  const myBest = best.find((b) => b.bidderId === viewer.id)?.best;
  const myBestBidCents = myBest === undefined ? null : Number(myBest);

  return {
    myPseudonym: pseudonym(deps.pseudonymSecret, viewer.role, viewer.id, lot.id),
    isLeader: lot.leaderId === viewer.id,
    myBestBidCents,
    position:
      myBestBidCents === null
        ? null
        : 1 + best.filter((b) => Number(b.best) > myBestBidCents).length,
    isSeller: lot.sellerId === viewer.id,
  };
}
