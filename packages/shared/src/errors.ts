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

/** Mensagens padrão. O front pode trocar por textos com detalhes (ex.: valor mínimo). */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Dados inválidos.',
  IDEMPOTENCY_KEY_REQUIRED: 'Cabeçalho Idempotency-Key obrigatório.',
  UNAUTHENTICATED: 'Faça login para continuar.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  SELLER_CANNOT_BID: 'Leiloeiros não podem dar lances.',
  NOT_FOUND: 'Não encontrado.',
  LOT_NOT_FOUND: 'Lote não encontrado.',
  CATALOG_ITEM_NOT_FOUND: 'Item não encontrado no catálogo.',
  EMAIL_TAKEN: 'Este e-mail já está cadastrado.',
  LOT_CANCELLED: 'Este lote foi cancelado pelo leiloeiro.',
  LOT_NOT_STARTED: 'Este lote ainda não começou.',
  LOT_CLOSED: 'Este lote já foi encerrado.',
  ALREADY_WINNING: 'Você já está ganhando este lote.',
  LOT_NOT_CANCELLABLE: 'Este lote não pode ser cancelado.',
  BELOW_MINIMUM: 'Lance abaixo do mínimo.',
  INSUFFICIENT_FUNDS: 'Saldo insuficiente.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns segundos.',
  INTERNAL_ERROR: 'Algo deu errado. Tente novamente.',
  CATALOG_UNAVAILABLE: 'O catálogo de obras está indisponível no momento. Tente em instantes.',
};

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Corpo acima do limite do servidor: `VALIDATION_ERROR` com HTTP 413 (SP-00). */
export const PAYLOAD_TOO_LARGE_STATUS = 413;
export const PAYLOAD_TOO_LARGE_MESSAGE = 'Corpo da requisição grande demais.';
