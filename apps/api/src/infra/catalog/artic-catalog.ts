import {
  CATALOG_PAGE_SIZE,
  type CatalogItem,
  type CatalogSearchResult,
  type LotCategory,
} from '@leilao/shared';
import { z } from 'zod';
import { DomainError } from '../../domain/errors';
import type { CatalogImage, CatalogProvider } from '../../ports/catalog';
import { CircuitBreaker } from './circuit-breaker';
import { TtlCache } from './ttl-cache';

// API do Art Institute of Chicago: https://api.artic.edu/docs/

const API_URL = 'https://api.artic.edu/api/v1/artworks';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  'verzel-casa-de-leiloes (https://github.com/mathfrancisco/verzel-casa-de-leiloes)';
const FIELDS = [
  'id',
  'title',
  'artist_display',
  'date_display',
  'medium_display',
  'dimensions',
  'place_of_origin',
  'image_id',
  'is_public_domain',
  'classification_titles',
  'artwork_type_title',
].join(',');

const artworkSchema = z.object({
  id: z.number(),
  title: z.string().nullish(),
  artist_display: z.string().nullish(),
  date_display: z.string().nullish(),
  medium_display: z.string().nullish(),
  dimensions: z.string().nullish(),
  place_of_origin: z.string().nullish(),
  image_id: z.string().nullish(),
  is_public_domain: z.boolean().nullish(),
  classification_titles: z.array(z.string()).nullish(),
  artwork_type_title: z.string().nullish(),
});
const configSchema = z.object({ iiif_url: z.string().url() }).partial().default({});

const searchResponseSchema = z.object({
  pagination: z.object({ total_pages: z.number() }),
  data: z.array(artworkSchema),
  config: configSchema,
});
const itemResponseSchema = z.object({ data: artworkSchema, config: configSchema });

type Artwork = z.infer<typeof artworkSchema>;

const CATEGORY_KEYWORDS: [LotCategory, string[]][] = [
  ['PAINTING', ['painting']],
  ['SCULPTURE', ['sculpture']],
  ['PHOTOGRAPHY', ['photograph']],
  ['PRINT', ['print', 'lithograph', 'etching', 'woodcut', 'engraving']],
  ['DRAWING', ['drawing', 'watercolor']],
  ['TEXTILE', ['textile']],
];

function suggestCategory(art: Artwork): LotCategory {
  const words = [art.artwork_type_title ?? '', ...(art.classification_titles ?? [])]
    .join(' ')
    .toLowerCase();
  return CATEGORY_KEYWORDS.find(([, keys]) => keys.some((k) => words.includes(k)))?.[0] ?? 'OTHER';
}

function toItem(art: Artwork, iiifUrl: string): CatalogItem | null {
  if (!art.image_id || art.is_public_domain === false) return null;
  return {
    externalId: String(art.id),
    title: art.title?.trim() || 'Sem título',
    artist: art.artist_display?.split('\n')[0]?.trim() || null,
    date: art.date_display ?? null,
    medium: art.medium_display ?? null,
    dimensions: art.dimensions ?? null,
    origin: art.place_of_origin ?? null,
    imageUrl: `${iiifUrl}/${art.image_id}/full/843,/0/default.jpg`,
    sourceUrl: `https://www.artic.edu/artworks/${art.id}`,
    suggestedCategory: suggestCategory(art),
  };
}

export interface ArticCatalogOptions {
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  retryDelayMs?: () => number;
  now?: () => number;
}

const unavailable = () => new DomainError('CATALOG_UNAVAILABLE');
const notFound = () => new DomainError('CATALOG_ITEM_NOT_FOUND');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ArticCatalog implements CatalogProvider {
  private readonly fetchFn;
  private readonly timeoutMs;
  private readonly retryDelayMs;
  private readonly breaker;
  private readonly searches;
  private readonly items;

  constructor(opts: ArticCatalogOptions = {}) {
    this.fetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
    this.timeoutMs = opts.timeoutMs ?? 3000;
    this.retryDelayMs = opts.retryDelayMs ?? (() => 200 + Math.random() * 300);
    const now = opts.now ?? Date.now;
    this.breaker = new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now });
    const cache = { ttlMs: 10 * 60 * 1000, maxEntries: 500, now };
    this.searches = new TtlCache<Omit<CatalogSearchResult, 'fromCache'>>(cache);
    this.items = new TtlCache<CatalogItem>(cache);
  }

  async search(query: string, page: number): Promise<CatalogSearchResult> {
    const key = `${query.toLowerCase()}|${page}`;
    const fresh = this.searches.getFresh(key);
    if (fresh) return { ...fresh, fromCache: false };

    const url = new URL(`${API_URL}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('fields', FIELDS);
    url.searchParams.set('limit', String(CATALOG_PAGE_SIZE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('query[term][is_public_domain]', 'true');

    try {
      const body = searchResponseSchema.safeParse(await this.getJson(url.toString()));
      if (!body.success) throw unavailable();
      const iiif = body.data.config.iiif_url ?? 'https://www.artic.edu/iiif/2';
      const result = {
        items: body.data.data.map((art) => toItem(art, iiif)).filter((i) => i !== null),
        page,
        totalPages: Math.min(body.data.pagination.total_pages, 50),
      };
      this.searches.set(key, result);
      return { ...result, fromCache: false };
    } catch (err) {
      const stale = this.searches.getAny(key);
      if (stale && err instanceof DomainError && err.code === 'CATALOG_UNAVAILABLE') {
        return { ...stale, fromCache: true };
      }
      throw err;
    }
  }

  async getItem(externalId: string): Promise<CatalogItem> {
    if (!/^\d{1,10}$/.test(externalId)) throw notFound();
    const cached = this.items.getFresh(externalId);
    if (cached) return cached;

    const raw = await this.getJson(`${API_URL}/${externalId}?fields=${FIELDS}`);
    if (raw === null) throw notFound();
    const body = itemResponseSchema.safeParse(raw);
    if (!body.success) throw unavailable();

    const item = toItem(
      body.data.data,
      body.data.config.iiif_url ?? 'https://www.artic.edu/iiif/2',
    );
    if (!item) throw notFound();
    this.items.set(externalId, item);
    return item;
  }

  async fetchImage(item: CatalogItem): Promise<CatalogImage> {
    const image = await this.request(item.imageUrl, async (res) => {
      const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!IMAGE_TYPES.has(contentType)) throw unavailable();
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw unavailable();
      return { bytes, contentType };
    });
    if (image === null) throw notFound();
    return image;
  }

  private getJson(url: string): Promise<unknown> {
    return this.request(url, (res) => res.json() as Promise<unknown>);
  }

  /**
   * GET com timeout, 1 retry para erro de rede/5xx/429 e circuit breaker.
   * Devolve `null` para 404 (não é falha da API).
   */
  private async request<T>(url: string, read: (res: Response) => Promise<T>): Promise<T | null> {
    if (!this.breaker.canRequest()) throw unavailable();

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(this.retryDelayMs());
      try {
        const res = await this.fetchWithTimeout(url);
        if (res.status === 404) {
          this.breaker.recordSuccess();
          return null;
        }
        if (res.ok) {
          const body = await read(res);
          this.breaker.recordSuccess();
          return body;
        }
        if (res.status < 500 && res.status !== 429) {
          // Outro 4xx: a API está no ar, mas recusou nossa chamada. Não adianta repetir.
          this.breaker.recordSuccess();
          throw unavailable();
        }
      } catch (err) {
        if (err instanceof DomainError) throw err;
        // erro de rede, timeout ou JSON inválido: tenta de novo
      }
    }
    this.breaker.recordFailure();
    throw unavailable();
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('timeout'));
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([
        this.fetchFn(url, { headers: { 'AIC-User-Agent': USER_AGENT }, signal: controller.signal }),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
