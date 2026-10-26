import { useQuery } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogSearch } from './CatalogSearch';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../../lib/useDebouncedValue', () => ({ useDebouncedValue: () => '' }));

describe('CatalogSearch', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        items: [
          {
            externalId: '16568',
            title: 'Nenúfares',
            artist: 'Claude Monet',
            date: '1906',
            medium: null,
            dimensions: null,
            origin: null,
            imageUrl: 'https://example.test/image.jpg',
            sourceUrl: 'https://example.test/artwork',
            suggestedCategory: 'PAINTING',
          },
        ],
        page: 1,
        totalPages: 1,
        fromCache: false,
      },
      isFetching: false,
      isError: false,
      isSuccess: true,
    } as never);
  });

  it('esconde resultados antigos quando a busca é apagada', () => {
    const html = renderToStaticMarkup(<CatalogSearch selectedId={null} onSelect={() => {}} />);

    expect(html).not.toContain('Nenúfares');
    expect(html).not.toContain('Páginas da busca');
  });
});
