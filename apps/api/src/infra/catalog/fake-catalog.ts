import { CATALOG_PAGE_SIZE, type CatalogItem, type CatalogSearchResult } from '@leilao/shared';
import { DomainError } from '../../domain/errors';
import type { CatalogImage, CatalogProvider } from '../../ports/catalog';

type Mode = 'ok' | 'fail' | 'slow' | 'notFound';

/** PNG 1×1 válido, usado como imagem de todas as obras falsas. */
export const FAKE_IMAGE: CatalogImage = {
  bytes: Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    ),
  ),
  contentType: 'image/png',
};

const item = (externalId: string, title: string, artist: string): CatalogItem => ({
  externalId,
  title,
  artist,
  date: '1900',
  medium: 'Óleo sobre tela',
  dimensions: '50 × 60 cm',
  origin: 'França',
  imageUrl: `https://example.invalid/iiif/${externalId}.jpg`,
  sourceUrl: `https://example.invalid/obras/${externalId}`,
  suggestedCategory: 'PAINTING',
});

const DEFAULT_ITEMS = [
  item('1001', 'Lírios d’água', 'Claude Monet'),
  item('1002', 'Noite estrelada sobre o rio', 'Vincent van Gogh'),
  item('1003', 'Bailarinas em azul', 'Edgar Degas'),
];

/** Catálogo em memória, sem rede, para testes, E2E e seed. */
export class FakeCatalog implements CatalogProvider {
  private mode: Mode = 'ok';

  constructor(
    private readonly items: CatalogItem[] = DEFAULT_ITEMS,
    private readonly slowMs = 5000,
  ) {}

  setMode(mode: Mode): void {
    this.mode = mode;
  }

  async search(query: string, page: number): Promise<CatalogSearchResult> {
    await this.simulate();
    const q = query.toLowerCase();
    const matches =
      this.mode === 'notFound'
        ? []
        : this.items.filter((i) => `${i.title} ${i.artist}`.toLowerCase().includes(q));
    const start = (page - 1) * CATALOG_PAGE_SIZE;
    return {
      items: matches.slice(start, start + CATALOG_PAGE_SIZE),
      page,
      totalPages: Math.max(1, Math.ceil(matches.length / CATALOG_PAGE_SIZE)),
      fromCache: false,
    };
  }

  async getItem(externalId: string): Promise<CatalogItem> {
    await this.simulate();
    const found =
      this.mode === 'notFound' ? undefined : this.items.find((i) => i.externalId === externalId);
    if (!found) throw new DomainError('CATALOG_ITEM_NOT_FOUND');
    return found;
  }

  async fetchImage(_item: CatalogItem): Promise<CatalogImage> {
    await this.simulate();
    return FAKE_IMAGE;
  }

  private async simulate(): Promise<void> {
    if (this.mode === 'fail') throw new DomainError('CATALOG_UNAVAILABLE');
    if (this.mode === 'slow') await new Promise((resolve) => setTimeout(resolve, this.slowMs));
  }
}
