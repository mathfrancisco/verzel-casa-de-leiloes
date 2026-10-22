// Códigos de erro estáveis da API (ai/specs/SP-00-convencoes-api.md).
// Front e back usam esta lista; o front traduz o código em mensagem para o usuário.

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  SELLER_CANNOT_BID: 403,
  NOT_FOUND: 404,
  LOT_NOT_FOUND: 404,
  CATALOG_ITEM_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  LOT_CANCELLED: 409,
  LOT_NOT_STARTED: 409,
  LOT_CLOSED: 409,
  ALREADY_WINNING: 409,
  LOT_NOT_CANCELLABLE: 409,
  BELOW_MINIMUM: 422,
  INSUFFICIENT_FUNDS: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  CATALOG_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
