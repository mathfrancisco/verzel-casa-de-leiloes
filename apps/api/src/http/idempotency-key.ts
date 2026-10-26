import type { FastifyRequest } from 'fastify';
import { DomainError } from '../domain/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lê `Idempotency-Key` (SP-00): ausente → IDEMPOTENCY_KEY_REQUIRED; fora de UUID → VALIDATION_ERROR. */
export function readIdempotencyKey(request: FastifyRequest): string {
  const key = request.headers['idempotency-key'];
  if (key === undefined || (typeof key === 'string' && key.trim() === '')) {
    throw new DomainError('IDEMPOTENCY_KEY_REQUIRED');
  }
  if (typeof key !== 'string' || !UUID.test(key)) {
    throw new DomainError('VALIDATION_ERROR', { field: 'Idempotency-Key' });
  }
  return key.toLowerCase();
}
