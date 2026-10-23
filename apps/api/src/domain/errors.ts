import { ERROR_MESSAGES, type ErrorCode } from '@leilao/shared';

/** Erro esperado de regra de negócio; o handler HTTP o converte no formato da SP-00. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
    message: string = ERROR_MESSAGES[code],
  ) {
    super(message);
  }
}
