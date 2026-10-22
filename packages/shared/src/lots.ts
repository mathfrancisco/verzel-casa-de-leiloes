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
