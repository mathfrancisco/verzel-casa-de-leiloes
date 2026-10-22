import { ERROR_MESSAGES, ERROR_STATUS, type ApiErrorBody, type ErrorCode } from '@leilao/shared';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../domain/errors';

function send(
  reply: FastifyReply,
  code: ErrorCode,
  details?: Record<string, unknown>,
  message?: string,
) {
  const body: ApiErrorBody = { error: { code, message: message ?? ERROR_MESSAGES[code] } };
  if (details) body.error.details = details;
  return reply.code(ERROR_STATUS[code]).send(body);
}

/** Converte qualquer erro no formato `{ error: { code, message, details } }` da SP-00. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => send(reply, 'NOT_FOUND'));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) return send(reply, error.code, error.details, error.message);

    if (error instanceof ZodError) {
      const issues = error.issues.map(({ path, message }) => ({ path, message }));
      return send(reply, 'VALIDATION_ERROR', { issues });
    }

    if (error.statusCode === 429) return send(reply, 'RATE_LIMITED');
    // Erros do próprio Fastify na leitura da requisição (JSON malformado, corpo grande…).
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return send(reply, 'VALIDATION_ERROR');
    }

    request.log.error({ err: error }, 'erro inesperado');
    return send(reply, 'INTERNAL_ERROR');
  });
}
