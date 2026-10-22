import type { Role } from '@leilao/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../domain/errors';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new DomainError('UNAUTHENTICATED');
  }
}

/** `preHandler` que exige sessão válida com o papel indicado. */
export function requireRole(role: Role) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await requireAuth(request);
    if (request.user.role !== role) throw new DomainError('FORBIDDEN');
  };
}

/** Usuário da sessão, se houver; rotas públicas usam para personalizar a resposta. */
export async function optionalUser(
  request: FastifyRequest,
): Promise<{ id: string; role: Role } | null> {
  try {
    await request.jwtVerify();
    return { id: request.user.sub, role: request.user.role };
  } catch {
    return null;
  }
}
