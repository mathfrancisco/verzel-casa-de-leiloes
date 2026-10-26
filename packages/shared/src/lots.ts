import { z } from 'zod';
import { LOT_CATEGORIES, type LotCategory } from './catalog';

// Contrato de lotes (ai/specs/SP-03-lotes.md) e validações da RN-02.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const categories = Object.keys(LOT_CATEGORIES) as [LotCategory, ...LotCategory[]];

const isoDate = z
  .string()
  .datetime({ offset: true, message: 'Data inválida.' })
  .transform((value) => new Date(value));

export const createLotSchema = z
  .object({
    externalId: z.string().regex(/^\d{1,10}$/, 'Selecione uma obra do catálogo.'),
    title: z
      .string()
      .trim()
      .min(3, 'O título deve ter pelo menos 3 caracteres.')
      .max(140, 'O título deve ter no máximo 140 caracteres.'),
    description: z
      .string()
      .trim()
      .max(2000, 'A descrição deve ter no máximo 2.000 caracteres.')
      .default(''),
    category: z.enum(categories, { errorMap: () => ({ message: 'Escolha uma categoria.' }) }),
    startingPriceCents: z
      .number({ invalid_type_error: 'Informe o lance inicial.' })
      .int('Use no máximo 2 casas decimais.')
      .min(100, 'O lance inicial mínimo é R$ 1,00.')
      .max(1_000_000_000, 'O lance inicial máximo é R$ 10.000.000,00.'),
    minIncrementCents: z
      .number({ invalid_type_error: 'Informe o incremento mínimo.' })
      .int('Use no máximo 2 casas decimais.')
      .min(100, 'O incremento mínimo é R$ 1,00.'),
    startsAt: isoDate,
    endsAt: isoDate,
  })
  .superRefine((lot, ctx) => {
    if (lot.minIncrementCents > lot.startingPriceCents * 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['minIncrementCents'],
        message: 'O incremento não pode passar de 10 vezes o lance inicial.',
      });
    }
    const duration = lot.endsAt.getTime() - lot.startsAt.getTime();
    if (duration < 5 * MINUTE) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'O lote deve durar pelo menos 5 minutos.',
      });
    } else if (duration > 30 * DAY) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'O lote pode durar no máximo 30 dias.',
      });
    }
  });

export type CreateLotInput = z.infer<typeof createLotSchema>;

/** Regra de RN-02 que depende do relógio: aceita "começar agora" (até 1 min de atraso). */
export function lotStartIssue(startsAt: Date, now: Date): string | null {
  return startsAt.getTime() < now.getTime() - MINUTE ? 'O início não pode estar no passado.' : null;
}

export type LotPhase = 'SCHEDULED' | 'LIVE' | 'CLOSING' | 'SETTLED' | 'UNSOLD' | 'CANCELLED';

export interface LotSummary {
  id: string;
  title: string;
  imageUrl: string;
  category: LotCategory;
  phase: LotPhase;
  startsAt: string;
  endsAt: string;
  currentPriceCents: number | null;
  startingPriceCents: number;
  bidCount: number;
  serverTime: string;
}

export interface LotEntryView {
  seq: number;
  type: 'BID' | 'CLOSED' | 'CANCELLED';
  bidderPseudonym: string | null;
  amountCents: number | null;
  createdAt: string;
}

export interface LotDetail extends LotSummary {
  description: string;
  item: {
    artist: string | null;
    date: string | null;
    medium: string | null;
    dimensions: string | null;
    origin: string | null;
    sourceUrl: string;
  };
  minIncrementCents: number;
  minimumNextBidCents: number;
  leaderPseudonym: string | null;
  sellerPseudonym: string;
  originalEndsAt: string;
  extended: boolean;
  recentEntries: LotEntryView[];
  me?: {
    myPseudonym: string;
    isLeader: boolean;
    myBestBidCents: number | null;
    position: number | null;
    isSeller: boolean;
  };
  receiptCode?: string;
}

export type AuctioneerLotResult = 'PENDING' | 'SOLD' | 'UNSOLD' | 'CANCELLED';

export interface AuctioneerLot extends LotSummary {
  result: AuctioneerLotResult;
  finalPriceCents: number | null;
  settledAt: string | null;
  cancellable: boolean;
}

export interface AuctioneerLotsResponse {
  items: AuctioneerLot[];
  totalReceivedCents: number;
}

/** Abas da vitrine (RN-14). `closed` inclui encerrando, arrematado e sem vencedor. */
export const SHOWCASE_TABS = ['live', 'scheduled', 'closed'] as const;
export type ShowcaseTab = (typeof SHOWCASE_TABS)[number];

/** Ordenações da vitrine (SP-03). Sem `sort`, cada aba usa o seu padrão. */
export const LOT_SORTS = ['ending_soon', 'price_desc', 'price_asc', 'newest'] as const;
export type LotSort = (typeof LOT_SORTS)[number];

/** Parâmetro de URL vazio (`?q=`) equivale a ausente. */
const emptyAsMissing = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const priceFilter = z.preprocess(
  emptyAsMissing,
  z.coerce
    .number({ invalid_type_error: 'Preço inválido.' })
    .int('Preço inválido.')
    .min(0, 'Preço inválido.')
    .max(Number.MAX_SAFE_INTEGER, 'Preço inválido.')
    .optional(),
);

export const lotListQuerySchema = z
  .object({
    phase: z.enum(SHOWCASE_TABS, { errorMap: () => ({ message: 'Aba inválida.' }) }),
    q: z.preprocess(
      emptyAsMissing,
      z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.').optional(),
    ),
    category: z.preprocess(
      emptyAsMissing,
      z.enum(categories, { errorMap: () => ({ message: 'Categoria inválida.' }) }).optional(),
    ),
    minPriceCents: priceFilter,
    maxPriceCents: priceFilter,
    sort: z.preprocess(
      emptyAsMissing,
      z.enum(LOT_SORTS, { errorMap: () => ({ message: 'Ordenação inválida.' }) }).optional(),
    ),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  .refine(
    (query) =>
      query.minPriceCents === undefined ||
      query.maxPriceCents === undefined ||
      query.minPriceCents <= query.maxPriceCents,
    { path: ['minPriceCents'], message: 'O preço mínimo não pode ser maior que o máximo.' },
  );

export type LotListQuery = z.infer<typeof lotListQuerySchema>;

export const placeBidSchema = z.object({
  // Drizzle entrega bigint como number; preserve precisão até o limite seguro do JavaScript.
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export type PlaceBidInput = z.infer<typeof placeBidSchema>;

export interface BidResponse {
  bid: {
    seq: number;
    amountCents: number;
    bidderPseudonym: string;
    createdAt: string;
    hash: string;
  };
  lot: LotDetail;
}

export interface LotListResponse {
  items: LotSummary[];
  nextCursor: string | null;
  /** Quantidade de lotes em cada aba, para os rótulos das abas. */
  counts: Record<ShowcaseTab, number>;
  serverTime: string;
}

/** Corpo opcional do cancelamento (SP-03): motivo registrado no elo `CANCELLED`. */
export const cancelLotSchema = z.object({
  reason: z.string().trim().max(200, 'O motivo deve ter no máximo 200 caracteres.').optional(),
});
export type CancelLotInput = z.infer<typeof cancelLotSchema>;
