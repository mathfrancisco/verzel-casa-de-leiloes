import type { CatalogItem, CatalogSearchResult } from '@leilao/shared';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { messageFor } from '../../lib/errorMessages';
import { useDebouncedValue } from '../../lib/useDebouncedValue';

interface CatalogSearchProps {
  selectedId: string | null;
  onSelect: (item: CatalogItem) => void;
}

export function CatalogSearch({ selectedId, onSelect }: CatalogSearchProps) {
  const inputId = useId();
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());
  const hasValidQuery = text.trim().length >= 2;

  const search = useQuery({
    queryKey: ['catalog', q, page],
    queryFn: () =>
      apiFetch<CatalogSearchResult>(`/api/catalog/search?q=${encodeURIComponent(q)}&page=${page}`),
    enabled: q.length >= 2,
    retry: false,
    placeholderData: (previous) => previous,
  });

  return (
    <section aria-labelledby={`${inputId}-titulo`} className="catalog-search">
      <h2 id={`${inputId}-titulo`}>1. Escolha a obra</h2>
      <div className="field">
        <label htmlFor={inputId}>Buscar no acervo do Art Institute of Chicago</label>
        <input
          id={inputId}
          type="search"
          value={text}
          placeholder="Ex.: Monet, retrato, paisagem"
          onChange={(e) => {
            setText(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div aria-live="polite">
        {q.length > 0 && q.length < 2 && <p>Digite pelo menos 2 caracteres.</p>}
        {hasValidQuery && search.isFetching && <p role="status">Buscando…</p>}
        {hasValidQuery && search.isError && (
          <p className="form-error">{messageFor(search.error)}</p>
        )}
        {hasValidQuery && search.data?.fromCache && (
          <p className="notice">
            O catálogo está indisponível agora; mostrando resultados salvos de uma busca anterior.
          </p>
        )}
        {hasValidQuery && search.isSuccess && search.data.items.length === 0 && (
          <p className="empty-state">Nenhuma obra encontrada.</p>
        )}
      </div>

      {hasValidQuery && search.data && search.data.items.length > 0 && (
        <>
          <ul className="catalog-grid">
            {search.data.items.map((item) => (
              <li key={item.externalId}>
                <button
                  type="button"
                  className="catalog-item"
                  aria-pressed={item.externalId === selectedId}
                  onClick={() => onSelect(item)}
                >
                  <img
                    src={item.imageUrl.replace('/843,/', '/400,/')}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="catalog-title">{item.title}</span>
                  <span className="catalog-meta">
                    {[item.artist, item.date].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas da busca" className="pager">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Anterior
            </button>
            <span>
              Página {search.data.page} de {search.data.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= search.data.totalPages}
            >
              Próxima
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
