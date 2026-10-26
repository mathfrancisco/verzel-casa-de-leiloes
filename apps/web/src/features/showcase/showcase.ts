import {
  LOT_CATEGORIES,
  LOT_SORTS,
  parseBRL,
  type LotCategory,
  type LotSort,
  type LotSummary,
  type ShowcaseTab,
} from '@leilao/shared';

/** Valores de `?aba=` na URL (em português) para cada aba. */
export const TAB_PARAM: Record<ShowcaseTab, string> = {
  live: 'ao-vivo',
  scheduled: 'agendados',
  closed: 'encerrados',
};

export const TAB_LABEL: Record<ShowcaseTab, string> = {
  live: 'Ao vivo',
  scheduled: 'Agendados',
  closed: 'Encerrados',
};

export function tabFromParam(param: string | null): ShowcaseTab {
  const found = (Object.keys(TAB_PARAM) as ShowcaseTab[]).find((tab) => TAB_PARAM[tab] === param);
  return found ?? 'live';
}

/** Filtros da vitrine (RF-17), espelhados na URL: `q`, `categoria`, `min`/`max` (centavos), `ordem`. */
export interface ShowcaseFilters {
  q: string;
  category: LotCategory | '';
  min: number | null;
  max: number | null;
  sort: LotSort | '';
}

export const SORT_LABEL: Record<LotSort, string> = {
  ending_soon: 'Termina primeiro',
  newest: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
};

const MAX_QUERY = 100;
const asCents = (value: string | null) => {
  if (value === null || !/^\d{1,15}$/.test(value)) return null;
  return Number(value);
};

/** Lê os filtros da URL; valores inválidos (URL editada à mão) são ignorados. */
export function filtersFromParams(params: URLSearchParams): ShowcaseFilters {
  const category = params.get('categoria');
  const sort = params.get('ordem');
  return {
    q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY),
    category: category && category in LOT_CATEGORIES ? (category as LotCategory) : '',
    min: asCents(params.get('min')),
    max: asCents(params.get('max')),
    sort: (LOT_SORTS as readonly string[]).includes(sort ?? '') ? (sort as LotSort) : '',
  };
}

/** Parâmetros da URL da vitrine; filtros vazios não aparecem. */
export function searchFromState(tab: ShowcaseTab, filters: ShowcaseFilters): URLSearchParams {
  const params = new URLSearchParams({ aba: TAB_PARAM[tab] });
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('categoria', filters.category);
  if (filters.min !== null) params.set('min', String(filters.min));
  if (filters.max !== null) params.set('max', String(filters.max));
  if (filters.sort) params.set('ordem', filters.sort);
  return params;
}

export function lotsApiPath(tab: ShowcaseTab, filters: ShowcaseFilters, cursor?: string): string {
  const params = new URLSearchParams({ phase: tab });
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.min !== null) params.set('minPriceCents', String(filters.min));
  if (filters.max !== null) params.set('maxPriceCents', String(filters.max));
  if (filters.sort) params.set('sort', filters.sort);
  if (cursor) params.set('cursor', cursor);
  return `/api/lots?${params}`;
}

/** Texto em reais de um campo de preço → centavos (vazio = sem limite). */
export function priceParamFromText(
  text: string,
): { ok: true; cents: number | null } | { ok: false } {
  if (text.trim() === '') return { ok: true, cents: null };
  const cents = parseBRL(text);
  return cents === null ? { ok: false } : { ok: true, cents };
}

export function activeFilterCount(filters: ShowcaseFilters): number {
  return (
    Number(filters.q !== '') +
    Number(filters.category !== '') +
    Number(filters.min !== null) +
    Number(filters.max !== null) +
    Number(filters.sort !== '')
  );
}

const compareId = (a: LotSummary, b: LotSummary) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const effectivePrice = (lot: LotSummary) => lot.currentPriceCents ?? lot.startingPriceCents;

/**
 * Junta as páginas carregadas (sem repetir lotes) na ordem da consulta. `newest` não tem campo
 * de data no resumo: mantém a ordem recebida do servidor, com os dados mais recentes.
 */
export function mergeLotPages(
  pages: LotSummary[][],
  tab: ShowcaseTab,
  sort: LotSort | '' = '',
): LotSummary[] {
  const lots = new Map<string, LotSummary>();
  for (const page of pages) {
    for (const lot of page) lots.set(lot.id, lot);
  }
  const merged = [...lots.values()];
  if (sort === 'newest') return merged;

  if (sort === 'price_asc' || sort === 'price_desc') {
    const direction = sort === 'price_asc' ? 1 : -1;
    return merged.sort(
      (a, b) => direction * (effectivePrice(a) - effectivePrice(b)) || direction * compareId(a, b),
    );
  }

  const descending = sort === '' && tab === 'closed';
  const timeField = sort === '' && tab === 'scheduled' ? 'startsAt' : 'endsAt';
  const direction = descending ? -1 : 1;
  return merged.sort(
    (a, b) =>
      direction * (Date.parse(a[timeField]) - Date.parse(b[timeField])) ||
      direction * compareId(a, b),
  );
}

export function priceLine(lot: LotSummary): { label: string; amountCents: number | null } {
  const current = lot.currentPriceCents;
  switch (lot.phase) {
    case 'SETTLED':
      return { label: 'Arrematado por', amountCents: current };
    case 'UNSOLD':
      return { label: 'Sem lances', amountCents: null };
    case 'CLOSING':
      return current === null
        ? { label: 'Sem lances', amountCents: null }
        : { label: 'Lance vencedor', amountCents: current };
    default:
      return current === null
        ? { label: 'Lance inicial', amountCents: lot.startingPriceCents }
        : { label: 'Lance atual', amountCents: current };
  }
}
