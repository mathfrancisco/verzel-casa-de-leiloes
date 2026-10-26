import {
  lotStartIssue,
  type CatalogItem,
  type AuctioneerLot,
  type AuctioneerLotsResponse,
  type CreateLotInput,
  type LotDetail,
  type LotListQuery,
  type LotSort,
  type LotListResponse,
  type Role,
  type ShowcaseTab,
} from '@leilao/shared';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { genesisHash, sha256Hex } from '../domain/auditChain';
import { DomainError } from '../domain/errors';
import { lotPhase } from '../domain/lotPhase';
import { pseudonym } from '../domain/pseudonym';
import type { Db } from '../infra/db/client';
import { images, lotEntries, lots, walletEntries } from '../infra/db/schema';
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
    description: input.description,
    category: input.category,
    itemSnapshot: item,
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

/** Projeção privada do leiloeiro; o horário vem da mesma transação do banco. */
export async function listAuctioneerLots(
  db: Db,
  sellerId: string,
): Promise<AuctioneerLotsResponse> {
  return db.transaction(
    async (tx) => {
      const [clock] = await tx.execute<{ now: string }>(sql`SELECT now() AS now`);
      const now = new Date(clock!.now);
      const [ledger] = await tx
        .select({
          total: sql<number>`coalesce(sum(${walletEntries.amountCents}), 0)::bigint`.mapWith(
            Number,
          ),
        })
        .from(walletEntries)
        .where(
          and(
            eq(walletEntries.userId, sellerId),
            sql`${walletEntries.type} IN ('SETTLEMENT_CREDIT', 'REFUND_DEBIT')`,
          ),
        );
      const rows = await tx
        .select()
        .from(lots)
        .where(eq(lots.sellerId, sellerId))
        .orderBy(desc(lots.createdAt), desc(lots.id));

      return {
        items: rows.map((lot): AuctioneerLot => {
          const phase = lotPhase(lot, now);
          const result =
            lot.state === 'SETTLED'
              ? 'SOLD'
              : lot.state === 'CLOSED_NO_WINNER'
                ? 'UNSOLD'
                : lot.state === 'CANCELLED'
                  ? 'CANCELLED'
                  : 'PENDING';
          return {
            ...summary(lot, now),
            result,
            finalPriceCents: result === 'SOLD' ? lot.currentPriceCents : null,
            settledAt: lot.settledAt?.toISOString() ?? null,
            // RN-12 permite ativo sem lances; a opção RN-13, adotada para o LC-018, também cobre
            // lotes com lance (inclusive SETTLED), mas nunca os sem vencedor ou já cancelados.
            cancellable:
              lot.state === 'SETTLED' ||
              (lot.state === 'ACTIVE' &&
                (lot.bidCount > 0 || phase === 'SCHEDULED' || phase === 'LIVE')),
          };
        }),
        totalReceivedCents: ledger!.total,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
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

// ---- Vitrine (RN-03, RN-14) ----

/** Filtro de cada aba; `now()` é o horário da transação, igual em todas as consultas. */
const TAB_FILTER: Record<ShowcaseTab, SQL> = {
  live: sql`${lots.state} = 'ACTIVE' AND ${lots.startsAt} <= now() AND ${lots.endsAt} > now()`,
  scheduled: sql`${lots.state} = 'ACTIVE' AND ${lots.startsAt} > now()`,
  closed: sql`((${lots.state} = 'ACTIVE' AND ${lots.endsAt} <= now()) OR ${lots.state} IN ('SETTLED', 'CLOSED_NO_WINNER'))`,
};

/**
 * Ordenações da vitrine. `kind` define como o valor entra no cursor; cada ordenação tem nome
 * próprio para o cursor só valer na ordem que o emitiu.
 */
const price = sql`coalesce(${lots.currentPriceCents}, ${lots.startingPriceCents})`;
const ORDERS = {
  ends_asc: { expr: sql`${lots.endsAt}`, kind: 'time', direction: 'asc' },
  ends_desc: { expr: sql`${lots.endsAt}`, kind: 'time', direction: 'desc' },
  starts_asc: { expr: sql`${lots.startsAt}`, kind: 'time', direction: 'asc' },
  created_desc: {
    expr: sql`${lots.createdAt}`,

    kind: 'time',
    direction: 'desc',
  },
  price_asc: { expr: price, kind: 'number', direction: 'asc' },
  price_desc: { expr: price, kind: 'number', direction: 'desc' },
} as const;
type OrderName = keyof typeof ORDERS;

/** Sem `sort`: ao vivo termina antes; agendado começa antes; encerrado mais recente. */
const DEFAULT_ORDER: Record<ShowcaseTab, OrderName> = {
  live: 'ends_asc',
  scheduled: 'starts_asc',
  closed: 'ends_desc',
};
const SORT_ORDER: Record<LotSort, OrderName> = {
  ending_soon: 'ends_asc',
  newest: 'created_desc',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
};

const cursorSchema = z.object({
  o: z.enum(Object.keys(ORDERS) as [OrderName, ...OrderName[]]),
  v: z.union([z.string().datetime(), z.number().int().safe()]),
  id: z.string().regex(UUID),
});

const encodeCursor = (o: OrderName, v: string | number, id: string) =>
  Buffer.from(JSON.stringify({ o, v, id })).toString('base64url');

function decodeCursor(cursor: string, order: OrderName) {
  try {
    const decoded = cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    );
    const valid =
      decoded.o === order &&
      typeof decoded.v === (ORDERS[order].kind === 'time' ? 'string' : 'number');
    if (valid) return decoded;
  } catch {
    // cai no erro abaixo
  }
  throw new DomainError('VALIDATION_ERROR', {
    issues: [{ path: ['cursor'], message: 'Cursor inválido.' }],
  });
}

/** Filtros opcionais da vitrine (RF-17), comuns às consultas de lista e de contagem. */
function searchFilters(query: LotListQuery): SQL[] {
  const filters: SQL[] = [];
  if (query.q) {
    // Só letras e números chegam ao tsquery: sem operadores injetados. Prefixo (`:*`) casa a
    // palavra enquanto é digitada; todas as palavras são exigidas.
    const words = query.q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    filters.push(
      words.length === 0
        ? sql`false`
        : sql`${lots.searchVector} @@ to_tsquery('simple', ${words.map((w) => `${w}:*`).join(' & ')})`,
    );
  }
  if (query.category) filters.push(eq(lots.category, query.category));
  if (query.minPriceCents !== undefined) filters.push(sql`${price} >= ${query.minPriceCents}`);
  if (query.maxPriceCents !== undefined) filters.push(sql`${price} <= ${query.maxPriceCents}`);
  return filters;
}

export async function listLots(db: Db, query: LotListQuery): Promise<LotListResponse> {
  const orderName = query.sort ? SORT_ORDER[query.sort] : DEFAULT_ORDER[query.phase];
  const order = ORDERS[orderName];
  const cursor = query.cursor ? decodeCursor(query.cursor, orderName) : undefined;
  // Paginação por chave (valor de ordenação, id): estável mesmo com lotes novos chegando.
  const cursorValue =
    order.kind === 'time' ? sql`${cursor?.v}::timestamptz` : sql`${cursor?.v}::bigint`;
  const after = cursor
    ? order.direction === 'asc'
      ? sql`(${order.expr}, ${lots.id}) > (${cursorValue}, ${cursor.id}::uuid)`
      : sql`(${order.expr}, ${lots.id}) < (${cursorValue}, ${cursor.id}::uuid)`
    : undefined;
  const by = order.direction === 'asc' ? asc : desc;
  const filters = searchFilters(query);

  return db.transaction(async (tx) => {
    // As contagens das abas seguem os filtros, para o rótulo bater com o que a aba mostraria.
    const [counts] = await tx
      .select({
        now: sql<string>`now()`,
        live: sql<number>`count(*) FILTER (WHERE ${TAB_FILTER.live})::int`,
        scheduled: sql<number>`count(*) FILTER (WHERE ${TAB_FILTER.scheduled})::int`,
        closed: sql<number>`count(*) FILTER (WHERE ${TAB_FILTER.closed})::int`,
      })
      .from(lots)
      .where(and(...filters));
    const now = new Date(counts!.now);

    const rows = await tx
      .select({ lot: lots, sortValue: sql<string | Date | number>`${order.expr}`.as('sort_value') })
      .from(lots)
      .where(and(TAB_FILTER[query.phase], ...filters, after))
      .orderBy(by(order.expr), by(lots.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(({ lot }) => summary(lot, now)),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor(
              orderName,
              order.kind === 'time'
                ? new Date(last.sortValue).toISOString()
                : Number(last.sortValue),
              last.lot.id,
            )
          : null,
      counts: { live: counts!.live, scheduled: counts!.scheduled, closed: counts!.closed },
      serverTime: now.toISOString(),
    };
  });
}
