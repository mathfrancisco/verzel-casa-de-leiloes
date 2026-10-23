import { ERROR_MESSAGES } from '@leilao/shared';
import type { ZodTypeAny } from 'zod';
import { ApiError } from './api';

/** Fonte única de texto de erro para o usuário. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL_ERROR;
  if (error instanceof TypeError)
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

type FieldErrors = Record<string, string>;

/**
 * Erros por campo, a partir da validação local com o schema compartilhado ou de um
 * `VALIDATION_ERROR` devolvido pela API.
 */
export function fieldErrors(source: ZodTypeAny | unknown, values?: unknown): FieldErrors {
  let issues: { path: (string | number)[]; message: string }[] = [];

  if (source instanceof ApiError) {
    if (source.code === 'VALIDATION_ERROR' && Array.isArray(source.details?.issues)) {
      issues = source.details.issues as typeof issues;
    }
  } else if (isSchema(source)) {
    const result = source.safeParse(values);
    if (!result.success) issues = result.error.issues;
  }

  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    errors[field] ??= issue.message;
  }
  return errors;
}

function isSchema(value: unknown): value is ZodTypeAny {
  return typeof (value as ZodTypeAny | undefined)?.safeParse === 'function';
}
