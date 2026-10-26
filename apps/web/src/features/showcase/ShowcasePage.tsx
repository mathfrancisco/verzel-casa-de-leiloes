import {
  formatBRL,
  LOT_CATEGORIES,
  LOT_SORTS,
  SHOWCASE_TABS,
  type LotListResponse,
} from '@leilao/shared';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';
import { syncServerTime } from '../../lib/serverClock';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { LotCard } from './LotCard';
import {
  activeFilterCount,
  filtersFromParams,
  lotsApiPath,
  mergeLotPages,
  priceParamFromText,
  searchFromState,
  SORT_LABEL,
  TAB_LABEL,
  tabFromParam,
  type ShowcaseFilters,
} from './showcase';

const EMPTY_TEXT = {
  live: 'Nenhum lote ao vivo agora.',
  scheduled: 'Nenhum lote agendado.',
  closed: 'Nenhum lote encerrado ainda.',
} as const;

const filterKey = (f: ShowcaseFilters) => `${f.q}|${f.min}|${f.max}`;
const NO_FILTERS: ShowcaseFilters = { q: '', category: '', min: null, max: null, sort: '' };

interface Draft {
  q: string;
  min: string;
  max: string;
}

const priceText = (cents: number | null) =>
  cents === null ? '' : formatBRL(cents).replace(/^R\$\s*/u, '');
const draftFrom = (f: ShowcaseFilters): Draft => ({
  q: f.q,
  min: priceText(f.min),
  max: priceText(f.max),
});

/** Valida os campos de preço digitados; devolve os valores aplicáveis e o aviso, se houver. */
function checkPrices(draft: Draft, current: ShowcaseFilters) {
  const min = priceParamFromText(draft.min);
  const max = priceParamFromText(draft.max);
  if (!min.ok || !max.ok) {
    return { min: current.min, max: current.max, error: 'Preço inválido. Use o formato 1.234,56.' };
  }
  if (min.cents !== null && max.cents !== null && min.cents > max.cents) {
    return {
      min: current.min,
      max: current.max,
      error: 'O preço mínimo não pode ser maior que o máximo.',
    };
  }
  return { min: min.cents, max: max.cents, error: null };
}

export function ShowcasePage() {
  const [params, setParams] = useSearchParams();
  const tab = tabFromParam(params.get('aba'));
  const filters = filtersFromParams(params);
  const queryClient = useQueryClient();
  const ids = { q: useId(), category: useId(), min: useId(), max: useId(), sort: useId() };

  // Texto digitado (busca e preços) só vira filtro depois de 300 ms parado; o resto é imediato.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(filters));
  const debounced = useDebouncedValue(draft, 300);
  const urlKey = filterKey(filters);
  const appliedKey = useRef(urlKey);
  const latest = useRef({ tab, filters, setParams });
  useEffect(() => {
    latest.current = { tab, filters, setParams };
  });

  const apply = useCallback((next: ShowcaseFilters) => {
    appliedKey.current = filterKey(next);
    latest.current.setParams(searchFromState(latest.current.tab, next), { replace: true });
  }, []);

  // URL mudou por fora (voltar do navegador, link): os campos acompanham.
  useEffect(() => {
    if (appliedKey.current === urlKey) return;
    appliedKey.current = urlKey;
    setDraft(draftFrom(latest.current.filters));
  }, [urlKey]);

  // Só reage ao texto já estabilizado: aplica busca e preços válidos na URL.
  const priceError = checkPrices(debounced, filters).error;
  useEffect(() => {
    const { filters: current } = latest.current;
    const checked = checkPrices(debounced, current);
    const next = {
      ...current,
      q: debounced.q.trim().slice(0, 100),
      min: checked.min,
      max: checked.max,
    };
    if (filterKey(next) !== filterKey(current)) apply(next);
  }, [debounced, apply]);

  const lots = useInfiniteQuery({
    queryKey: ['lots', tab, filters],
    queryFn: async ({ pageParam }) => {
      const body = await apiFetch<LotListResponse>(lotsApiPath(tab, filters, pageParam));
      syncServerTime(body.serverTime);
      return body;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });

  // Quando uma contagem zera, o lote muda de aba: recarrega todas as abas.
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['lots'] });
  }, [queryClient]);

  const counts = lots.data?.pages[0]?.counts;
  const items = mergeLotPages(lots.data?.pages.map((page) => page.items) ?? [], tab, filters.sort);
  const filtering = activeFilterCount(filters) > 0;
  const update = (patch: Partial<ShowcaseFilters>) => apply({ ...filters, ...patch });
  const clear = () => {
    setDraft(draftFrom(NO_FILTERS));
    apply(NO_FILTERS);
  };

  return (
    <section aria-labelledby="titulo-vitrine">
      <h1 id="titulo-vitrine">Vitrine</h1>
      <nav aria-label="Fases dos lotes" className="tabs">
        {SHOWCASE_TABS.map((t) => (
          <Link
            key={t}
            to={`/?${searchFromState(t, filters)}`}
            aria-current={t === tab ? 'page' : undefined}
          >
            {TAB_LABEL[t]}
            {counts && <span className="tab-count"> ({counts[t]})</span>}
          </Link>
        ))}
      </nav>

      <form
        role="search"
        aria-label="Buscar e filtrar lotes"
        className="filters"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="field">
          <label htmlFor={ids.q}>Buscar</label>
          <input
            id={ids.q}
            type="search"
            value={draft.q}
            maxLength={100}
            placeholder="Título, artista ou descrição"
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={ids.category}>Categoria</label>
          <select
            id={ids.category}
            value={filters.category}
            onChange={(e) => update({ category: e.target.value as ShowcaseFilters['category'] })}
          >
            <option value="">Todas</option>
            {Object.entries(LOT_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={ids.min}>Preço mínimo (R$)</label>
          <input
            id={ids.min}
            inputMode="decimal"
            value={draft.min}
            placeholder="0,00"
            aria-invalid={priceError ? true : undefined}
            onChange={(e) => setDraft({ ...draft, min: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={ids.max}>Preço máximo (R$)</label>
          <input
            id={ids.max}
            inputMode="decimal"
            value={draft.max}
            placeholder="sem limite"
            aria-invalid={priceError ? true : undefined}
            onChange={(e) => setDraft({ ...draft, max: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={ids.sort}>Ordenar por</label>
          <select
            id={ids.sort}
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as ShowcaseFilters['sort'] })}
          >
            <option value="">Padrão da aba</option>
            {LOT_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABEL[sort]}
              </option>
            ))}
          </select>
        </div>
        {filtering && (
          <button type="button" className="secondary" onClick={clear}>
            Limpar filtros
          </button>
        )}
        {priceError && (
          <p role="alert" className="field-error filters-error">
            {priceError}
          </p>
        )}
      </form>

      {lots.isPending && (
        <p role="status" aria-busy="true">
          Carregando lotes…
        </p>
      )}

      {lots.isError && (
        <div role="alert" className="form-error">
          <p>{messageFor(lots.error)}</p>
          <button type="button" onClick={() => void lots.refetch()}>
            Tentar de novo
          </button>
        </div>
      )}

      {lots.isSuccess && items.length === 0 && (
        <p>{filtering ? 'Nenhum lote encontrado com estes filtros.' : EMPTY_TEXT[tab]}</p>
      )}

      {items.length > 0 && (
        <div className="lot-grid">
          {items.map((lot) => (
            <LotCard key={lot.id} lot={lot} onPhaseChange={refresh} />
          ))}
        </div>
      )}

      {lots.hasNextPage && (
        <button
          type="button"
          className="load-more"
          onClick={() => void lots.fetchNextPage()}
          disabled={lots.isFetchingNextPage}
        >
          {lots.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </section>
  );
}
