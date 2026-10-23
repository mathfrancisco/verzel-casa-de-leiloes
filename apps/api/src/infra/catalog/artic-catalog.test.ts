import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../domain/errors';
import { ArticCatalog } from './artic-catalog';

const fixture = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/artic/${name}`, import.meta.url), 'utf8');

const ok = (body: string) => () => Promise.resolve(new Response(body, { status: 200 }));

function setup(responder: (url: string) => Promise<Response>) {
  const calls: string[] = [];
  let now = 0;
  const catalog = new ArticCatalog({
    fetchFn: (url, init) => {
      calls.push(String(url));
      expect(new Headers(init?.headers).get('AIC-User-Agent')).toContain('verzel-casa-de-leiloes');
      return responder(String(url));
    },
    timeoutMs: 20,
    retryDelayMs: () => 0,
    now: () => now,
  });
  return { catalog, calls, advance: (ms: number) => (now += ms) };
}

const expectCode = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
};

describe('ArticCatalog — mapeamento (CT-02-01)', () => {
  it('converte a busca e descarta itens sem imagem', async () => {
    const { catalog, calls } = setup(ok(fixture('search-monet.json')));
    const result = await catalog.search('monet', 1);

    expect(result).toMatchObject({ page: 1, totalPages: 6, fromCache: false });
    expect(result.items.map((i) => i.externalId)).toEqual(['16568', '87088']);
    expect(result.items[0]).toEqual({
      externalId: '16568',
      title: 'Water Lilies',
      artist: 'Claude Monet',
      date: '1906',
      medium: 'Oil on canvas',
      dimensions: '89.9 × 94.1 cm (35 3/8 × 37 1/16 in.)',
      origin: 'France',
      imageUrl:
        'https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/full/843,/0/default.jpg',
      sourceUrl: 'https://www.artic.edu/artworks/16568',
      suggestedCategory: 'PAINTING',
    });
    expect(result.items[1]?.suggestedCategory).toBe('PRINT');

    const url = new URL(calls[0]!);
    expect(url.pathname).toBe('/api/v1/artworks/search');
    expect(url.searchParams.get('q')).toBe('monet');
    expect(url.searchParams.get('limit')).toBe('12');
    expect(url.searchParams.get('query[term][is_public_domain]')).toBe('true');
  });

  it('busca item por id', async () => {
    const { catalog, calls } = setup(ok(fixture('artwork-16568.json')));
    const item = await catalog.getItem('16568');
    expect(item.title).toBe('Water Lilies');
    expect(new URL(calls[0]!).pathname).toBe('/api/v1/artworks/16568');
  });

  it('item inexistente → CATALOG_ITEM_NOT_FOUND, sem contar como falha da API', async () => {
    const { catalog } = setup(() => Promise.resolve(new Response('{}', { status: 404 })));
    for (let i = 0; i < 6; i++) await expectCode(catalog.getItem('999'), 'CATALOG_ITEM_NOT_FOUND');
  });

  it('item sem imagem não pode ser leiloado → CATALOG_ITEM_NOT_FOUND', async () => {
    const body = JSON.parse(fixture('artwork-16568.json'));
    body.data.image_id = null;
    const { catalog } = setup(ok(JSON.stringify(body)));
    await expectCode(catalog.getItem('16568'), 'CATALOG_ITEM_NOT_FOUND');
  });

  it('id não numérico nem chega a chamar a API', async () => {
    const { catalog, calls } = setup(ok('{}'));
    await expectCode(catalog.getItem('../etc'), 'CATALOG_ITEM_NOT_FOUND');
    expect(calls).toHaveLength(0);
  });

  it('resposta em formato inesperado → CATALOG_UNAVAILABLE', async () => {
    const { catalog } = setup(ok('{"data":"x"}'));
    await expectCode(catalog.search('monet', 1), 'CATALOG_UNAVAILABLE');
  });
});

describe('ArticCatalog — resiliência', () => {
  it('erro 5xx tenta de novo uma vez e então falha (retry)', async () => {
    const { catalog, calls } = setup(() => Promise.resolve(new Response('', { status: 503 })));
    await expectCode(catalog.search('monet', 1), 'CATALOG_UNAVAILABLE');
    expect(calls).toHaveLength(2);
  });

  it('erro 5xx seguido de sucesso devolve o resultado', async () => {
    let n = 0;
    const { catalog } = setup(() =>
      n++ === 0
        ? Promise.resolve(new Response('', { status: 502 }))
        : Promise.resolve(new Response(fixture('search-monet.json'))),
    );
    expect((await catalog.search('monet', 1)).items).toHaveLength(2);
  });

  it('timeout: CATALOG_UNAVAILABLE após 1 retry (CT-02-05)', async () => {
    const { catalog, calls } = setup(
      (url) =>
        new Promise((_resolve, reject) => {
          // Simula API travada: só termina quando o AbortSignal do timeout dispara.
          void url;
          setTimeout(() => reject(new DOMException('timeout', 'TimeoutError')), 1000);
        }),
    );
    // O adapter usa AbortSignal.timeout; o fetch falso ignora o sinal, então medimos o tempo total.
    const started = Date.now();
    await expectCode(catalog.search('monet', 1), 'CATALOG_UNAVAILABLE');
    expect(Date.now() - started).toBeLessThan(500);
    expect(calls).toHaveLength(2);
  });

  it('5 falhas seguidas abrem o breaker; a 6ª falha sem chamar a API (CT-02-02)', async () => {
    const { catalog, calls } = setup(() => Promise.reject(new TypeError('fetch failed')));
    for (let i = 0; i < 5; i++) await expectCode(catalog.search(`q${i}`, 1), 'CATALOG_UNAVAILABLE');
    expect(calls).toHaveLength(10);

    await expectCode(catalog.search('outra', 1), 'CATALOG_UNAVAILABLE');
    expect(calls).toHaveLength(10);
  });

  it('após 30 s faz 1 tentativa; sucesso fecha o breaker (CT-02-03)', async () => {
    let failing = true;
    const { catalog, calls, advance } = setup(() =>
      failing
        ? Promise.reject(new TypeError('fetch failed'))
        : Promise.resolve(new Response(fixture('search-monet.json'))),
    );
    for (let i = 0; i < 5; i++) await catalog.search(`q${i}`, 1).catch(() => {});
    failing = false;

    advance(30_000);
    await expect(catalog.search('monet', 1)).resolves.toMatchObject({ fromCache: false });
    expect(calls).toHaveLength(11);
    await expect(catalog.search('monet', 2)).resolves.toBeDefined();
  });

  it('mesma busca dentro do TTL faz 1 chamada HTTP (CT-02-04)', async () => {
    const { catalog, calls } = setup(ok(fixture('search-monet.json')));
    await catalog.search('Monet', 1);
    const second = await catalog.search('monet', 1);
    expect(calls).toHaveLength(1);
    expect(second.fromCache).toBe(false);
  });

  it('com a API fora, devolve busca anterior marcada fromCache', async () => {
    let failing = false;
    const { catalog, advance } = setup(() =>
      failing
        ? Promise.reject(new TypeError('fetch failed'))
        : Promise.resolve(new Response(fixture('search-monet.json'))),
    );
    await catalog.search('monet', 1);
    failing = true;
    advance(11 * 60 * 1000); // passou do TTL de 10 min

    const result = await catalog.search('monet', 1);
    expect(result.fromCache).toBe(true);
    expect(result.items).toHaveLength(2);
    await expectCode(catalog.search('nunca-buscado', 1), 'CATALOG_UNAVAILABLE');
  });
});
