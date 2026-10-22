import type { LotSummary, ShowcaseTab } from '@leilao/shared';

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
