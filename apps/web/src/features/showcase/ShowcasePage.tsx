import { SHOWCASE_TABS, type LotListResponse } from '@leilao/shared';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';
import { syncServerTime } from '../../lib/serverClock';
import { LotCard } from './LotCard';
import { mergeLotPages, TAB_LABEL, TAB_PARAM, tabFromParam } from './showcase';

const EMPTY_TEXT = {
  live: 'Nenhum lote ao vivo agora.',
  scheduled: 'Nenhum lote agendado.',
  closed: 'Nenhum lote encerrado ainda.',
} as const;

export function ShowcasePage() {
  const [params] = useSearchParams();
  const tab = tabFromParam(params.get('aba'));
  const queryClient = useQueryClient();

  const lots = useInfiniteQuery({
    queryKey: ['lots', tab],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : '';
      const body = await apiFetch<LotListResponse>(`/api/lots?phase=${tab}${cursor}`);
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
  const items = mergeLotPages(lots.data?.pages.map((page) => page.items) ?? [], tab);

  return (
    <section aria-labelledby="titulo-vitrine">
      <h1 id="titulo-vitrine">Vitrine</h1>
      <nav aria-label="Fases dos lotes" className="tabs">
        {SHOWCASE_TABS.map((t) => (
          <Link key={t} to={`/?aba=${TAB_PARAM[t]}`} aria-current={t === tab ? 'page' : undefined}>
            {TAB_LABEL[t]}
            {counts && <span className="tab-count"> ({counts[t]})</span>}
          </Link>
        ))}
      </nav>

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

      {lots.isSuccess && items.length === 0 && <p>{EMPTY_TEXT[tab]}</p>}

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
