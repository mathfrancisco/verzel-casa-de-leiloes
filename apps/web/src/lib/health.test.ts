import { describe, expect, it } from 'vitest';
import { fetchHealth } from './health';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('fetchHealth', () => {
  it('devolve a resposta da API quando ela está no ar', async () => {
    const body = { status: 'ok', serverTime: '2026-10-22T22:00:00.000Z' };
    const fetchFn = async (url: string) => {
      expect(url).toBe('/api/health');
      return jsonResponse(body);
    };

    await expect(fetchHealth(fetchFn)).resolves.toEqual(body);
  });

  it('falha quando a API responde erro', async () => {
    await expect(fetchHealth(async () => jsonResponse({}, 503))).rejects.toThrow('503');
  });

  it('falha quando a resposta não tem o formato esperado', async () => {
    await expect(fetchHealth(async () => jsonResponse({ status: 'down' }))).rejects.toThrow();
  });
});
