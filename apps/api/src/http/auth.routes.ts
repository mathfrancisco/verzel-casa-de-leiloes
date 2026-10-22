import { loginSchema, registerSchema, type UserDto, type UserResponse } from '@leilao/shared';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate, getUser, registerUser, type AuthDeps } from '../application/auth';
import { DomainError } from '../domain/errors';
import { requireAuth } from './auth-guard';

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface AuthRoutesOptions extends AuthDeps {
  secureCookies: boolean;
  rateLimitPerMinute: number;
}

export function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): void {
  const deps: AuthDeps = { db: opts.db };
  const rateLimit = { max: opts.rateLimitPerMinute, timeWindow: '1 minute' };

  async function startSession(reply: FastifyReply, user: UserDto) {
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: opts.secureCookies,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }

  app.post('/api/auth/register', { config: { rateLimit } }, async (request, reply) => {
    const user = await registerUser(deps, registerSchema.parse(request.body));
    await startSession(reply, user);
    return reply.code(201).send({ user } satisfies UserResponse);
  });

  app.post('/api/auth/login', { config: { rateLimit } }, async (request, reply) => {
    const user = await authenticate(deps, loginSchema.parse(request.body));
    await startSession(reply, user);
    return { user } satisfies UserResponse;
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request) => {
    const user = await getUser(deps, request.user.sub);
    if (!user) throw new DomainError('UNAUTHENTICATED');
    return { user } satisfies UserResponse;
  });
}
