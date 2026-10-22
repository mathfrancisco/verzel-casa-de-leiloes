import type { ApiErrorBody, LotListResponse } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import { buildTestApp } from '../support/app';
import { createTestDatabase } from '../support/database';
import { insertLotRow } from '../support/lots';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
const catalog = new FakeCatalog();
const ids: Record<string, string> = {};

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog });
  const sellerId = (
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Leila Leiloeira',
        email: 'leila@demo.com',
        password: 'senha-forte',
        role: 'AUCTIONEER',
      },
    })
  ).json().user.id as string;

  const lot = (
    key: string,
    startsInMin: number,
    endsInMin: number,
    state?: 'SETTLED' | 'CLOSED_NO_WINNER' | 'CANCELLED',
  ) =>
    insertLotRow(testDb, { sellerId, title: key, startsInMin, endsInMin, state }).then(
      (id) => (ids[key] = id),
    );

  // Ao vivo: terminam em 30, 10 e 20 min (ordem esperada: 10, 20, 30).
  await lot('vivo-30', -60, 30);
  await lot('vivo-10', -60, 10);
  await lot('vivo-20', -60, 20);
  // Agendados: começam em 120 e 60 min.
  await lot('agendado-120', 120, 240);
  await lot('agendado-60', 60, 240);
  // Encerrados: aguardando liquidação, arrematado e sem lances.
  await lot('encerrando', -120, -1);
  await lot('arrematado', -300, -200, 'SETTLED');
  await lot('sem-lances', -300, -100, 'CLOSED_NO_WINNER');
  // Cancelados (ativo no horário e no passado): nunca aparecem.
  await lot('cancelado-vivo', -60, 60, 'CANCELLED');
  await lot('cancelado-agendado', 60, 120, 'CANCELLED');
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

describe('GET /api/lots — vitrine (CT-03-06)', () => {
  it('ao vivo: só lotes em andamento, terminando antes primeiro', async () => {
    const { res, body } = await list('phase=live');
    expect(res.statusCode).toBe(200);
    expect(titles(body)).toEqual(['vivo-10', 'vivo-20', 'vivo-30']);
    expect(body.items.every((i) => i.phase === 'LIVE')).toBe(true);
  });

  it('agendados: começando antes primeiro', async () => {
    const { body } = await list('phase=scheduled');
    expect(titles(body)).toEqual(['agendado-60', 'agendado-120']);
    expect(body.items.every((i) => i.phase === 'SCHEDULED')).toBe(true);
  });

  it('encerrados: encerrando, arrematado e sem lances, mais recentes primeiro', async () => {
    const { body } = await list('phase=closed');
    expect(titles(body)).toEqual(['encerrando', 'sem-lances', 'arrematado']);
    expect(body.items.map((i) => i.phase)).toEqual(['CLOSING', 'UNSOLD', 'SETTLED']);
  });

  it('cancelados não aparecem em nenhuma aba e não entram na contagem', async () => {
    const all = [];
    for (const phase of ['live', 'scheduled', 'closed'])
      all.push(...titles((await list(`phase=${phase}`)).body));
    expect(all.filter((t) => t.startsWith('cancelado'))).toEqual([]);

    const { body } = await list('phase=live');
    expect(body.counts).toEqual({ live: 3, scheduled: 2, closed: 3 });
  });

  it('resumo traz imagem, preço, lances e horário do servidor, sem dados pessoais', async () => {
    const { res, body } = await list('phase=live');
    expect(body.items[0]).toMatchObject({
      id: ids['vivo-10'],
      imageUrl: expect.stringMatching(/^\/api\/images\//),
      startingPriceCents: 1000,
      currentPriceCents: null,
      bidCount: 0,
      serverTime: expect.any(String),
    });
    expect(body.serverTime).toEqual(expect.any(String));
    expect(res.body).not.toContain('leila@demo.com');
    expect(res.body).not.toContain('Leila Leiloeira');
  });

  it('pagina por cursor sem repetir nem pular', async () => {
    const first = await list('phase=live&limit=2');
    expect(titles(first.body)).toEqual(['vivo-10', 'vivo-20']);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await list(
      `phase=live&limit=2&cursor=${encodeURIComponent(first.body.nextCursor!)}`,
    );
    expect(titles(second.body)).toEqual(['vivo-30']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('pagina também nas abas em ordem decrescente', async () => {
    const first = await list('phase=closed&limit=2');
    const second = await list(
      `phase=closed&limit=2&cursor=${encodeURIComponent(first.body.nextCursor!)}`,
    );
    expect([...titles(first.body), ...titles(second.body)]).toEqual([
      'encerrando',
      'sem-lances',
      'arrematado',
    ]);
  });

  it.each(['', 'phase=cancelled', 'phase=live&limit=100', 'phase=live&cursor=lixo'])(
    'consulta inválida "%s" → 400',
    async (query) => {
      const { res } = await list(query);
      expect(res.statusCode).toBe(400);
      expect(res.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('funciona com o catálogo externo fora do ar (CT-02-07, vitrine)', async () => {
    catalog.setMode('fail');
    const { res, body } = await list('phase=live');
    catalog.setMode('ok');
    expect(res.statusCode).toBe(200);
    expect(body.items).toHaveLength(3);
  });
});
