# SP-04 — Carteira

**Requisitos:** RF-07, RF-08 · **Regras:** RN-07, RN-08, RN-17 · **Cards:** LC-009

## API

| Método | Rota | Auth | Corpo | Sucesso | Erros |
|---|---|---|---|---|---|
| GET | `/api/wallet` | sessão | — | 200 `Wallet` | `UNAUTHENTICATED` |
| POST | `/api/wallet/deposits` | BIDDER + `Idempotency-Key` | `{ amountCents }` | 201 `Wallet` | `VALIDATION_ERROR`, `IDEMPOTENCY_KEY_REQUIRED`, `FORBIDDEN` |

```ts
Wallet = {
  totalCents, committedCents, availableCents,
  commitments: { lotId, title, amountCents, endsAt }[],   // lotes que lidera
  entries: { id, type, amountCents, lotId | null, lotTitle | null, createdAt }[] // últimos 50
}
```

Leiloeiro também tem `GET /api/wallet` (vê os créditos recebidos), mas não deposita.

## Comportamento

- Depósito: trava a carteira, insere `DEPOSIT`, atualiza `balance_cents`, grava a chave de
  idempotência — tudo numa transação. Emite `wallet.changed` para o usuário.
- `committedCents` pela consulta de `docs/04-modelagem-de-dados.md` §5.
- Função de domínio `computeAvailable(total, committed)` usada pela carteira e pelo lance.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-04-01 | integração | Depositar R$ 100 | total +10000, entrada `DEPOSIT` |
| CT-04-02 | integração | Mesma `Idempotency-Key` 2× | um único depósito, mesma resposta |
| CT-04-03 | integração | Sem `Idempotency-Key` | 400 |
| CT-04-04 | integração | 0, negativo, decimal, acima de R$ 1 milhão | 400 |
| CT-04-05 | integração | Leiloeiro deposita | 403 |
| CT-04-06 | integração | Licitante liderando 2 lotes | comprometido = soma, disponível = total − soma, `commitments` com 2 itens |
| CT-04-07 | integração | 10 depósitos concorrentes com chaves distintas | total = soma; invariante I-1 |
