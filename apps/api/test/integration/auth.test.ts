import { randomBytes } from 'node:crypto';
import type { ApiErrorBody, UserResponse } from '@leilao/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requireRole } from '../../src/http/auth-guard';
import { buildTestApp, sessionCookie } from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb);
});
afterAll(async () => {
  await app.close();
  await testDb.drop();
});

let seq = 0;
const newUser = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ana Souza',
  email: `ana${++seq}@demo.com`,
  password: 'senha-forte',
  role: 'BIDDER',
  ...overrides,
});

const register = (payload: unknown) =>
  app.inject({ method: 'POST', url: '/api/auth/register', payload: payload as object });
const login = (payload: unknown) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: payload as object });
const me = (cookies?: Record<string, string>) =>
  app.inject({ method: 'GET', url: '/api/auth/me', cookies });

describe('POST /api/auth/register', () => {
  it('cadastra licitante, define cookie de sessão e cria carteira com 0 (CT-01-01)', async () => {
    const input = newUser();
    const res = await register(input);

    expect(res.statusCode).toBe(201);
    const { user } = res.json<UserResponse>();
    expect(user).toEqual({
      id: expect.any(String),
      name: 'Ana Souza',
      email: input.email,
      role: 'BIDDER',
    });
    expect(res.json()).not.toHaveProperty('user.passwordHash');

    const cookie = res.cookies.find((c) => c.name === 'session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });

    const [wallet] = await testDb.sql`SELECT balance_cents FROM wallets WHERE user_id = ${user.id}`;
    expect(Number(wallet?.balance_cents)).toBe(0);
  });

  it('cadastra leiloeiro', async () => {
    const res = await register(newUser({ role: 'AUCTIONEER' }));
    expect(res.json<UserResponse>().user.role).toBe('AUCTIONEER');
  });

  it('recusa e-mail já usado, mesmo com maiúsculas diferentes (CT-01-02)', async () => {
    const input = newUser();
    await register(input);
    const res = await register({ ...input, email: input.email.toUpperCase() });

    expect(res.statusCode).toBe(409);
    expect(res.json<ApiErrorBody>().error.code).toBe('EMAIL_TAKEN');
  });

  it.each([
    [{ password: '1234567' }, 'password'],
    [{ role: 'ADMIN' }, 'role'],
    [{ email: 'sem-arroba' }, 'email'],
  ])('recusa dados inválidos %o (CT-01-03)', async (overrides, field) => {
    const res = await register(newUser(overrides));

    expect(res.statusCode).toBe(400);
    const { error } = res.json<ApiErrorBody>();
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.issues).toEqual([
      expect.objectContaining({ path: [field], message: expect.any(String) }),
    ]);
  });

  it('não cria nada quando a validação falha', async () => {
    const input = newUser({ password: 'curta' });
    await register(input);
    const rows = await testDb.sql`SELECT 1 FROM users WHERE email = ${input.email}`;
    expect(rows).toHaveLength(0);
  });
});

describe('POST /api/auth/login', () => {
  it('entra com credenciais corretas (CT-01-04)', async () => {
    const input = newUser();
    await register(input);
    const res = await login({ email: input.email.toUpperCase(), password: input.password });

    expect(res.statusCode).toBe(200);
    expect(res.json<UserResponse>().user.email).toBe(input.email);
    expect(res.cookies.some((c) => c.name === 'session')).toBe(true);
  });

  it('responde igual para senha errada e e-mail inexistente (CT-01-05)', async () => {
    const input = newUser();
    await register(input);
    const otherPassword = randomBytes(8).toString('hex');
    const wrongPassword = await login({ email: input.email, password: otherPassword });
    const unknownEmail = await login({ email: 'ninguem@demo.com', password: otherPassword });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.statusCode).toBe(401);
      expect(res.json<ApiErrorBody>().error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos.',
      });
      expect(res.cookies).toHaveLength(0);
    }
  });
});

describe('GET /api/auth/me', () => {
  it('devolve o usuário da sessão', async () => {
    const res = await register(newUser());
    const meRes = await me(sessionCookie(res));

    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toEqual({ user: res.json<UserResponse>().user });
  });

  it.each([
    ['sem cookie', undefined],
    ['com cookie adulterado', { session: 'eyJhbGciOiJIUzI1NiJ9.e30.assinatura-falsa' }],
  ])('responde 401 %s (CT-01-06)', async (_label, cookies) => {
    const res = await me(cookies);
    expect(res.statusCode).toBe(401);
    expect(res.json<ApiErrorBody>().error.code).toBe('UNAUTHENTICATED');
  });

  it('responde 401 para token assinado com outro segredo', async () => {
    const other = buildTestApp(testDb, {
      jwtSecret: randomBytes(32).toString('base64url'),
    });
    const res = await other.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: newUser(),
    });
    await other.close();

    expect((await me(sessionCookie(res))).statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('remove o cookie; sem ele, /me responde 401 (CT-01-08)', async () => {
    const cookies = sessionCookie(await register(newUser()));
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies,
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(res.statusCode).toBe(204);
    const cleared = res.cookies.find((c) => c.name === 'session');
    expect(cleared?.value).toBe('');
    expect((await me()).statusCode).toBe(401);
  });
});

describe('autorização por papel', () => {
  it('leiloeiro em rota de licitante recebe 403 (CT-01-07)', async () => {
    const auctioneer = sessionCookie(await register(newUser({ role: 'AUCTIONEER' })));
    const bidder = sessionCookie(await register(newUser({ role: 'BIDDER' })));

    // Rota só de teste, registrada numa instância própria antes do primeiro request.
    const guarded = buildTestApp(testDb);
    guarded.get('/test/so-licitante', { preHandler: requireRole('BIDDER') }, async () => ({
      ok: true,
    }));
    const call = (cookies?: Record<string, string>) =>
      guarded.inject({ method: 'GET', url: '/test/so-licitante', cookies });

    const forbidden = await call(auctioneer);
    const allowed = await call(bidder);
    const anonymous = await call();
    await guarded.close();

    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json<ApiErrorBody>().error.code).toBe('FORBIDDEN');
    expect(allowed.statusCode).toBe(200);
    expect(anonymous.statusCode).toBe(401);
  });
});

describe('formato de erro e proteções', () => {
  it('rota inexistente responde NOT_FOUND no formato padrão', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
  });

  it('rota mutável exige Content-Type application/json', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'text/plain' },
      payload: 'email=a@b.com',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  });

  it('JSON malformado responde VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{ruim',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  });

  it('limita tentativas de login por IP', async () => {
    const limited = buildTestApp(testDb, { authRateLimitPerMinute: 2 });
    const attempt = () =>
      limited.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'x@demo.com', password: randomBytes(8).toString('hex') },
      });
    await attempt();
    await attempt();
    const res = await attempt();
    await limited.close();

    expect(res.statusCode).toBe(429);
    expect(res.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  });

  it('envia cabeçalhos de segurança (helmet)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('CSP libera imagens só do próprio site e do Art Institute (miniaturas da busca)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    const imgSrc = String(res.headers['content-security-policy'])
      .split(';')
      .find((d) => d.trim().startsWith('img-src'));
    expect(imgSrc?.trim().split(/\s+/)).toEqual([
      'img-src',
      "'self'",
      'data:',
      'https://www.artic.edu',
    ]);
  });
});
