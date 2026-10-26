import { describe, expect, it } from 'vitest';
import { ApiError, apiFetch } from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiFetch', () => {
  it('envia JSON com cookies do mesmo domínio e devolve o corpo', async () => {
    let init: RequestInit | undefined;
    const result = await apiFetch<{ ok: boolean }>(
      '/api/x',
      { method: 'POST', body: { a: 1 } },
      async (_url, i) => {
        init = i;
        return json({ ok: true });
      },
    );

    expect(result).toEqual({ ok: true });
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
  });

  it('POST sem corpo ainda envia JSON (a API exige o Content-Type)', async () => {
    let init: RequestInit | undefined;
    await apiFetch('/api/auth/logout', { method: 'POST' }, async (_u, i) => {
      init = i;
      return new Response(null, { status: 204 });
    });
    expect(init?.body).toBe('{}');
  });

  it('preserva cabeçalhos específicos da operação', async () => {
    let init: RequestInit | undefined;
    await apiFetch(
      '/api/wallet/deposits',
      { method: 'POST', headers: { 'Idempotency-Key': 'deposito-1' } },
      async (_url, requestInit) => {
        init = requestInit;
        return new Response(null, { status: 204 });
      },
    );

    expect(new Headers(init?.headers).get('idempotency-key')).toBe('deposito-1');
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
  });

  it('resposta 204 devolve undefined', async () => {
    const result = await apiFetch(
      '/api/x',
      { method: 'POST' },
      async () => new Response(null, { status: 204 }),
    );
    expect(result).toBeUndefined();
  });

  it('erro no formato da API vira ApiError com código e detalhes', async () => {
    const body = { error: { code: 'EMAIL_TAKEN', message: 'Este e-mail já está cadastrado.' } };
    const error = await apiFetch('/api/x', {}, async () => json(body, 409)).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
  });

  it('erro fora do formato vira INTERNAL_ERROR', async () => {
    const error = await apiFetch(
      '/api/x',
      {},
      async () => new Response('<html>', { status: 502 }),
    ).catch((e) => e);
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });
});
