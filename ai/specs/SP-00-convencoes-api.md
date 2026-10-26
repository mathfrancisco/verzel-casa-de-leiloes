# SP-00 — Convenções da API

Vale para todas as specs.

- Base: `/api`. JSON UTF-8. Rotas mutáveis (`POST/PUT/PATCH/DELETE`) exigem
  `Content-Type: application/json`, mesmo sem corpo (enviar `{}`); caso contrário → 400
  `VALIDATION_ERROR`.
- Autenticação: cookie `session` (httpOnly, `SameSite=Lax`, `Secure` em produção) com JWT
  `{ sub: userId, role }`, validade 7 dias.
- Dinheiro: inteiros em centavos, campos com sufixo `Cents`. Datas: ISO-8601 UTC com ms.
- Toda resposta de sucesso que carrega estado de lote inclui `serverTime`.
- IDs públicos de usuário **não existem** em respostas públicas; usar pseudônimo.

## Formato de erro

```json
{ "error": { "code": "BELOW_MINIMUM", "message": "Lance abaixo do mínimo.", "details": { "minimumCents": 135000 } } }
```

| Código | HTTP | Uso |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Corpo/query inválidos (`details.issues` do Zod) |
| `VALIDATION_ERROR` | 413 | Corpo acima do limite do servidor (100 KiB); mesmo código, mensagem `PAYLOAD_TOO_LARGE_MESSAGE` |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Falta `Idempotency-Key` onde é exigido |
| `UNAUTHENTICATED` | 401 | Sem sessão válida |
| `INVALID_CREDENTIALS` | 401 | Login falhou (mensagem genérica) |
| `FORBIDDEN` | 403 | Papel errado ou recurso de outro usuário |
| `SELLER_CANNOT_BID` | 403 | Leiloeiro tentando dar lance |
| `NOT_FOUND` / `LOT_NOT_FOUND` | 404 | Recurso inexistente |
| `CATALOG_ITEM_NOT_FOUND` | 404 | Item não existe na API externa |
| `EMAIL_TAKEN` | 409 | Cadastro com e-mail existente |
| `LOT_CANCELLED` · `LOT_NOT_STARTED` · `LOT_CLOSED` · `ALREADY_WINNING` | 409 | Regras de lance |
| `LOT_NOT_CANCELLABLE` | 409 | Cancelamento não permitido no estado atual |
| `BELOW_MINIMUM` · `INSUFFICIENT_FUNDS` | 422 | Regras de valor |
| `RATE_LIMITED` | 429 | Excesso de requisições |
| `CATALOG_UNAVAILABLE` | 503 | API externa fora/breaker aberto |
| `INTERNAL_ERROR` | 500 | Erro inesperado (sem stack na resposta) |

Os códigos e mensagens padrão ficam em `packages/shared/src/errors.ts`.

## Idempotência

`POST /api/lots/:id/bids` e `POST /api/wallet/deposits` exigem header `Idempotency-Key` (UUID).
Mesma chave + mesmo usuário → mesma resposta da primeira execução, sem novo efeito. Chaves
expiram em 24 h.

## Rate limit

| Rota | Limite |
|---|---|
| `POST /api/auth/login`, `/register` | 10/min por IP |
| `GET /api/catalog/*` | 30/min por usuário |
| `POST /api/lots/:id/bids` | 30/min por usuário |
| demais | 300/min por IP |
