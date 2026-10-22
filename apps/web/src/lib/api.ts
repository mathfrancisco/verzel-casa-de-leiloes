import type { ApiErrorBody, ErrorCode } from '@leilao/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Chama a API no mesmo domínio (cookie de sessão) e converte erros em `ApiError`. */
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: ApiRequest = {},
  fetchFn: FetchFn = (url, init) => fetch(url, init),
): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') {
    // A API recusa requisições mutáveis sem JSON (proteção contra CSRF).
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body ?? {});
  }

  const res = await fetchFn(path, init);
  if (res.status === 204) return undefined as T;

  const payload: unknown = await res.json().catch(() => undefined);
  if (res.ok) return payload as T;

  const error = (payload as Partial<ApiErrorBody> | undefined)?.error;
  if (error?.code) throw new ApiError(res.status, error.code, error.message, error.details);
  throw new ApiError(res.status, 'INTERNAL_ERROR', 'Resposta inesperada do servidor.');
}
