# SP-07 — Encerramento, liquidação, comprovante e "Meus arremates"

**Requisitos:** RF-06, RF-12, RF-13, RF-14, RNF-04 · **Regras:** RN-10, RN-11, RN-13, RN-16,
RN-19 · **Cards:** LC-014, LC-016, LC-017

## Worker de liquidação

- `jobs/settlementWorker.ts`: inicia com a API, ciclo de 1 s, para no shutdown (aguarda o ciclo
  corrente). Cada ciclo chama `settleDueLots(deps, { limit: 20 })`.
- Algoritmo: `docs/03-arquitetura.md` §4.2. Uma transação **por lote** (falha num lote não
  impede os outros).
- Com lances: `SETTLEMENT_DEBIT` (vencedor, −valor), `SETTLEMENT_CREDIT` (leiloeiro, +valor),
  elo `CLOSED` com `payload { winnerPseudonym, amountCents }`, `receipt`, `state = SETTLED`,
  `settled_at`.
- Sem lances: elo `CLOSED` com `payload { result: 'UNSOLD' }`, `state = CLOSED_NO_WINNER`.
- Eventos pós-commit: `lot.closed` na sala; `lot.won` + `wallet.changed` ao vencedor;
  `wallet.changed` ao leiloeiro.
- Também limpa `idempotency_keys` com mais de 24 h (a cada 10 min).

## API

| Método | Rota | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/receipts/:code` | — | 200 `Receipt` | `NOT_FOUND` |
| GET | `/api/me/participations` | BIDDER | 200 `{ items: Participation[] }` | — |

```ts
Receipt = { code, lot: { id, title, imageUrl, item }, amountCents, winnerPseudonym,
            issuedAt, finalHash, signature, publicKey, auditUrl, revoked: boolean, revokedAt | null }

Participation = { lotId, title, imageUrl, phase, myBestBidCents, currentPriceCents,
                  status: 'WINNING' | 'OUTBID' | 'WON' | 'LOST' | 'CANCELLED',
                  receiptCode | null, endsAt }
```

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-07-01 | integração | Lote com lances vence | débito/crédito corretos, receipt criado, `SETTLED`; invariantes I-1, I-5, I-7 |
| CT-07-02 | integração | Lote sem lances vence | `CLOSED_NO_WINNER`, sem lançamentos (I-6) |
| CT-07-03 | integração | `settleDueLots` chamado 2× em paralelo | liquidação única |
| CT-07-04 | integração | Lote prorrogado por anti-sniping | não liquida antes do novo fim |
| CT-07-05 | integração | Lance chega após `ends_at` antes do worker rodar | 409 `LOT_CLOSED` |
| CT-07-06 | integração | `GET /receipts/:code` | dados corretos, sem PII; código inexistente → 404 |
| CT-07-07 | integração | Participações de licitante com lotes ganhando, superado, vencido, perdido | status corretos e `receiptCode` só nos vencidos |
| CT-07-08 | unit | `public_code` | 22 caracteres base64url, gerado com `crypto.randomBytes(16)` |
