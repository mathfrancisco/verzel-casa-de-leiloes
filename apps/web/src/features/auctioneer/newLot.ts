import {
  createLotSchema,
  lotStartIssue,
  parseBRL,
  type CatalogItem,
  type LotCategory,
} from '@leilao/shared';
import type { z } from 'zod';

/** Estado do formulário: valores como o usuário digita (reais e datas locais). */
export interface LotForm {
  title: string;
  description: string;
  category: LotCategory | '';
  startingPrice: string;
  minIncrement: string;
  /** Formato do `<input type="datetime-local">`: `AAAA-MM-DDTHH:mm`, na hora local. */
  startsAt: string;
  endsAt: string;
}

export type CreateLotRequest = z.input<typeof createLotSchema>;
export type FormErrors = Partial<Record<keyof LotForm | 'externalId', string>>;

/** Campo do schema da API → campo do formulário (para erros do cliente e do servidor). */
const FIELD: Record<string, keyof LotForm | 'externalId'> = {
  startingPriceCents: 'startingPrice',
  minIncrementCents: 'minIncrement',
};

export const toFormErrors = (errors: Record<string, string>): FormErrors =>
  Object.fromEntries(Object.entries(errors).map(([field, msg]) => [FIELD[field] ?? field, msg]));

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalInputValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const MINUTE = 60_000;

export function formFromItem(item: CatalogItem, now: Date): LotForm {
  const start = new Date(Math.ceil(now.getTime() / MINUTE) * MINUTE);
  return {
    title: item.title.slice(0, 140),
    description: '',
    category: item.suggestedCategory,
    startingPrice: '',
    minIncrement: '',
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(new Date(start.getTime() + 24 * 60 * MINUTE)),
  };
}

type BuildResult = { ok: true; payload: CreateLotRequest } | { ok: false; errors: FormErrors };

/** Valida no cliente com as mesmas regras da API (RN-02) e monta o corpo do POST. */
export function buildCreateLotPayload(
  form: LotForm,
  externalId: string | null,
  now: Date,
): BuildResult {
  const errors: FormErrors = {};
  if (!externalId) errors.externalId = 'Selecione uma obra do catálogo.';

  const startingPriceCents = parseBRL(form.startingPrice);
  const minIncrementCents = parseBRL(form.minIncrement);
  if (startingPriceCents === null)
    errors.startingPrice = 'Informe um valor em reais, ex.: 1.500,00.';
  if (minIncrementCents === null) errors.minIncrement = 'Informe um valor em reais, ex.: 100,00.';

  const startsAt = form.startsAt ? new Date(form.startsAt) : null;
  const endsAt = form.endsAt ? new Date(form.endsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) errors.startsAt = 'Informe data e hora.';
  if (!endsAt || Number.isNaN(endsAt.getTime())) errors.endsAt = 'Informe data e hora.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const payload: CreateLotRequest = {
    externalId: externalId!,
    title: form.title,
    description: form.description,
    category: form.category as LotCategory,
    startingPriceCents: startingPriceCents!,
    minIncrementCents: minIncrementCents!,
    startsAt: startsAt!.toISOString(),
    endsAt: endsAt!.toISOString(),
  };

  const parsed = createLotSchema.safeParse(payload);
  const schemaErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) schemaErrors[String(issue.path[0])] ??= issue.message;
  }
  const startIssue = lotStartIssue(startsAt!, now);
  if (startIssue) schemaErrors.startsAt ??= startIssue;

  return Object.keys(schemaErrors).length > 0
    ? { ok: false, errors: toFormErrors(schemaErrors) }
    : { ok: true, payload };
}
