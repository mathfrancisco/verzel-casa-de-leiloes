import type { ApiErrorBody, LotListResponse } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';
import { insertLotRow } from '../support/lots';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;

const register = async (role: 'AUCTIONEER' | 'BIDDER', email: string) =>
  (
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Pessoa Teste', email, password: 'senha-forte', role },
    })
  ).json().user.id as string;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb);
  const sellerId = await register('AUCTIONEER', 'leila@demo.com');
  const bidderId = await register('BIDDER', 'bia@demo.com');

  // Ao vivo (preço efetivo): Lírios 5.000 · Natureza 20.000 · Bronze 12.000 (lance) · Gravura 3.000
  await insertLotRow(testDb, {
    sellerId,
    title: 'Lírios d’água',
    artist: 'Claude Monet',
    startsInMin: -60,
    endsInMin: 30,
    startingPriceCents: 5000,
    createdInMin: -50,
  });
  await insertLotRow(testDb, {
    sellerId,
    title: 'Natureza morta com frutas',
    artist: 'Paul Cézanne',
    startsInMin: -60,
    endsInMin: 10,
    startingPriceCents: 20_000,
    createdInMin: -40,
  });
  await insertLotRow(testDb, {
    sellerId,
    title: 'Cavalo de bronze',
    description: 'Escultura fundida em bronze.',
    category: 'SCULPTURE',
    startsInMin: -60,
    endsInMin: 20,
    startingPriceCents: 8000,
    current: { bidderId, priceCents: 12_000 },
    createdInMin: -30,
  });
  await insertLotRow(testDb, {
    sellerId,
    title: 'Gravura japonesa',
    category: 'PRINT',
    startsInMin: -60,
    endsInMin: 40,
    startingPriceCents: 3000,
    createdInMin: -20,
  });
  // Mesmo preço do primeiro: exercita o desempate por id na paginação.
  await insertLotRow(testDb, {
    sellerId,
    title: 'Paisagem gêmea',
    startsInMin: -60,
    endsInMin: 50,
    startingPriceCents: 5000,
    createdInMin: -10,
  });
  // Fora da aba ao vivo, mas com "lírios" no título.
  await insertLotRow(testDb, {
    sellerId,
    title: 'Lírios agendados',
    startsInMin: 60,
    endsInMin: 120,
    startingPriceCents: 6000,
  });
  await insertLotRow(testDb, {
    sellerId,
    title: 'Lírios encerrados',
    startsInMin: -300,
    endsInMin: -100,
    state: 'CLOSED_NO_WINNER',
    startingPriceCents: 7000,
  });
  await insertLotRow(testDb, {
    sellerId,
    title: 'Lírios cancelados',
    startsInMin: -60,
    endsInMin: 60,
    state: 'CANCELLED',
    startingPriceCents: 5000,
  });
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

const list = async (query: string) => {
  const res = await app.inject({ method: 'GET', url: `/api/lots?${query}` });
  return { res, body: res.json<LotListResponse>() };
};
const titles = (body: LotListResponse) => body.items.map((i) => i.title);

describe('GET /api/lots — busca textual (CT-03-14)', () => {
  it('encontra pelo título, ignorando maiúsculas, e respeita a aba', async () => {
    const { res, body } = await list('phase=live&q=LÍRIOS');
    expect(res.statusCode).toBe(200);
    expect(titles(body)).toEqual(['Lírios d’água']);
  });

  it('casa prefixo enquanto o usuário digita', async () => {
    expect(titles((await list('phase=live&q=lír')).body)).toEqual(['Lírios d’água']);
    expect(titles((await list('phase=live&q=gra')).body)).toEqual(['Gravura japonesa']);
  });

  it('encontra pelo artista e pela descrição', async () => {
    expect(titles((await list('phase=live&q=monet')).body)).toEqual(['Lírios d’água']);
    expect(titles((await list('phase=live&q=cézanne')).body)).toEqual([
      'Natureza morta com frutas',
    ]);
    expect(titles((await list('phase=live&q=fundida')).body)).toEqual(['Cavalo de bronze']);
  });

  it('várias palavras exigem todas (E)', async () => {
    expect(titles((await list('phase=live&q=natureza+frutas')).body)).toEqual([
      'Natureza morta com frutas',
    ]);
    expect((await list('phase=live&q=natureza+monet')).body.items).toEqual([]);
  });

  it('sem resultados devolve lista vazia, não erro', async () => {
    const { res, body } = await list('phase=live&q=inexistente');
    expect(res.statusCode).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it.each(["'; DROP TABLE lots; --", '!!!', '&|:*()<->', '\\', '%27'])(
    'texto malicioso ou só pontuação "%s" é inofensivo',
    async (q) => {
      const { res, body } = await list(`phase=live&q=${encodeURIComponent(q)}`);
      expect(res.statusCode).toBe(200);
      expect(body.items).toEqual([]);
    },
  );

  it('lote cancelado nunca aparece, mesmo casando com a busca', async () => {
    for (const phase of ['live', 'scheduled', 'closed']) {
      const { body } = await list(`phase=${phase}&q=cancelados`);
      expect(body.items).toEqual([]);
    }
  });

  it('q vazio equivale a sem busca', async () => {
    const { body } = await list('phase=live&q=');
    expect(body.items).toHaveLength(5);
  });
});

describe('GET /api/lots — categoria e faixa de preço', () => {
  it('filtra por categoria', async () => {
    expect(titles((await list('phase=live&category=SCULPTURE')).body)).toEqual([
      'Cavalo de bronze',
    ]);
    expect(titles((await list('phase=live&category=PRINT')).body)).toEqual(['Gravura japonesa']);
    expect((await list('phase=live&category=TEXTILE')).body.items).toEqual([]);
  });

  it('faixa de preço usa o lance atual, ou o inicial sem lances, e inclui as bordas', async () => {
    // Bronze: inicial 8.000, atual 12.000 → conta como 12.000.
    expect(titles((await list('phase=live&minPriceCents=5000&maxPriceCents=12000')).body)).toEqual([
      'Cavalo de bronze',
      'Lírios d’água',
      'Paisagem gêmea',
    ]);
    expect(titles((await list('phase=live&maxPriceCents=10000')).body)).toEqual([
      'Lírios d’água',
      'Gravura japonesa',
      'Paisagem gêmea',
    ]);
    expect(titles((await list('phase=live&minPriceCents=12001')).body)).toEqual([
      'Natureza morta com frutas',
    ]);
  });

  it('combina texto, categoria e preço (E)', async () => {
    expect(
      titles((await list('phase=live&q=lírios&category=PAINTING&maxPriceCents=6000')).body),
    ).toEqual(['Lírios d’água']);
    expect((await list('phase=live&q=lírios&category=SCULPTURE')).body.items).toEqual([]);
    expect((await list('phase=live&q=lírios&minPriceCents=6000')).body.items).toEqual([]);
  });

  it('as contagens das abas refletem os filtros e excluem cancelados', async () => {
    const { body } = await list('phase=live&q=lírios');
    expect(body.counts).toEqual({ live: 1, scheduled: 1, closed: 1 });
    expect((await list('phase=live&category=PRINT')).body.counts).toEqual({
      live: 1,
      scheduled: 0,
      closed: 0,
    });
  });
});

describe('GET /api/lots — ordenação e paginação', () => {
  it.each([
    [
      'ending_soon',
      [
        'Natureza morta com frutas',
        'Cavalo de bronze',
        'Lírios d’água',
        'Gravura japonesa',
        'Paisagem gêmea',
      ],
    ],
    [
      'newest',
      [
        'Paisagem gêmea',
        'Gravura japonesa',
        'Cavalo de bronze',
        'Natureza morta com frutas',
        'Lírios d’água',
      ],
    ],
  ])('sort=%s', async (sort, expected) => {
    expect(titles((await list(`phase=live&sort=${sort}`)).body)).toEqual(expected);
  });

  it('sort=price_asc e price_desc usam o preço efetivo', async () => {
    const asc = titles((await list('phase=live&sort=price_asc')).body);
    expect(asc[0]).toBe('Gravura japonesa');
    expect(asc.slice(1, 3).sort()).toEqual(['Lírios d’água', 'Paisagem gêmea']);
    expect(asc.slice(3)).toEqual(['Cavalo de bronze', 'Natureza morta com frutas']);

    const desc = titles((await list('phase=live&sort=price_desc')).body);
    expect(desc.slice(0, 2)).toEqual(['Natureza morta com frutas', 'Cavalo de bronze']);
    expect(desc.at(-1)).toBe('Gravura japonesa');
  });

  it.each(['ending_soon', 'price_asc', 'price_desc', 'newest'])(
    'sort=%s: paginar de 1 em 1 não repete nem pula (inclusive com preços iguais)',
    async (sort) => {
      const full = titles((await list(`phase=live&sort=${sort}&limit=24`)).body);
      const paged: string[] = [];
      let cursor: string | null = null;
      do {
        const { body } = await list(
          `phase=live&sort=${sort}&limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        );
        paged.push(...titles(body));
        cursor = body.nextCursor;
      } while (cursor);
      expect(paged).toEqual(full);
      expect(new Set(paged).size).toBe(5);
    },
  );

  it('paginação respeita os filtros', async () => {
    const first = await list('phase=live&maxPriceCents=12000&sort=price_desc&limit=2');
    expect(titles(first.body)[0]).toBe('Cavalo de bronze');
    const second = await list(
      `phase=live&maxPriceCents=12000&sort=price_desc&limit=2&cursor=${encodeURIComponent(first.body.nextCursor!)}`,
    );
    expect([...titles(first.body), ...titles(second.body)]).toHaveLength(4);
    expect(second.body.nextCursor).toBeNull();
  });

  it('sort explícito vale também nas abas agendados e encerrados', async () => {
    expect(titles((await list('phase=closed&sort=price_desc&q=lírios')).body)).toEqual([
      'Lírios encerrados',
    ]);
  });
});

describe('GET /api/lots — validação', () => {
  it.each([
    'phase=live&category=JOIAS',
    'phase=live&sort=aleatorio',
    'phase=live&minPriceCents=-1',
    'phase=live&minPriceCents=1.5',
    'phase=live&maxPriceCents=abc',
    'phase=live&minPriceCents=2000&maxPriceCents=1000',
    `phase=live&q=${'x'.repeat(101)}`,
  ])('consulta inválida "%s" → 400 VALIDATION_ERROR', async (query) => {
    const { res } = await list(query);
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  });

  it('cursor emitido para outra ordenação é rejeitado', async () => {
    const first = await list('phase=live&sort=price_asc&limit=1');
    const cursor = encodeURIComponent(first.body.nextCursor!);
    expect((await list(`phase=live&sort=newest&limit=1&cursor=${cursor}`)).res.statusCode).toBe(
      400,
    );
    expect((await list(`phase=live&sort=price_asc&limit=1&cursor=${cursor}`)).res.statusCode).toBe(
      200,
    );
  });

  it('resposta pública não traz dados pessoais', async () => {
    const { res } = await list('phase=live&q=monet');
    expect(res.body).not.toContain('leila@demo.com');
    expect(res.body).not.toContain('bia@demo.com');
  });
});
