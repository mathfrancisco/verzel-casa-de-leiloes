# SP-03 — Lotes: criação, vitrine, painel, cancelamento e busca

**Requisitos:** RF-03, RF-04, RF-05, RF-06, RF-17, RF-18 · **Regras:** RN-02, RN-03, RN-12,
RN-13, RN-14, RN-20 · **Cards:** LC-006, LC-007, LC-008, LC-017, LC-018, LC-019

## API

| Método | Rota | Auth | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/lots` | AUCTIONEER | 201 `LotDetail` | `VALIDATION_ERROR`, `CATALOG_ITEM_NOT_FOUND`, `CATALOG_UNAVAILABLE` |
| GET | `/api/lots` | — | 200 `{ items: LotSummary[], nextCursor }` | `VALIDATION_ERROR` |
| GET | `/api/lots/:id` | opcional | 200 `LotDetail` | `LOT_NOT_FOUND` |
| POST | `/api/lots/:id/cancel` | AUCTIONEER dono | 200 `LotDetail` | `FORBIDDEN`, `LOT_NOT_FOUND`, `LOT_NOT_CANCELLABLE` |
| GET | `/api/auctioneer/lots` | AUCTIONEER | 200 `{ items: AuctioneerLot[], totalReceivedCents }` | — |
| GET | `/api/images/:id` | — | 200 bytes, cache imutável | `NOT_FOUND` |

### Criar lote — corpo

```json
{
  "externalId": "27992",
  "title": "A Sunday on La Grande Jatte",
  "description": "…",
  "category": "PAINTING",
  "startingPriceCents": 100000,
  "minIncrementCents": 10000,
  "startsAt": "2026-10-24T18:00:00.000Z",
  "endsAt": "2026-10-25T18:00:00.000Z"
}
```

Validações da RN-02. O servidor busca o item (`getItem`) e a imagem (`fetchImage`), grava
`images`, monta `item_snapshot`, calcula `genesis_hash` e `seller_pseudonym`, tudo numa transação
(a chamada externa acontece **antes** da transação).

### Vitrine — query

`phase=live|scheduled|closed` (obrigatório), `q`, `category`, `minPriceCents`, `maxPriceCents`,
`sort=ending_soon|price_desc|price_asc|newest`, `cursor`, `limit` (≤ 24). Padrões de ordenação:
ao vivo → `ending_soon`; agendados → início mais próximo; encerrados → mais recentes.
`CANCELLED` nunca aparece. `closed` inclui `CLOSING`, `SETTLED`, `UNSOLD`.

### Tipos

```ts
LotSummary = { id, title, imageUrl, category, phase, startsAt, endsAt,
               currentPriceCents | null, startingPriceCents, bidCount, serverTime }

LotDetail = LotSummary & {
  description, item: { artist, date, medium, dimensions, origin, sourceUrl },
  minIncrementCents, minimumNextBidCents, leaderPseudonym | null,
  sellerPseudonym, originalEndsAt, extended: boolean,
  recentEntries: { seq, type, bidderPseudonym, amountCents, createdAt }[],  // últimos 50
  me?: { myPseudonym, isLeader, myBestBidCents | null, position | null, isSeller } // só logado
  receiptCode?: string  // só para o vencedor e o vendedor
}

AuctioneerLot = LotSummary & { result: 'PENDING' | 'SOLD' | 'UNSOLD' | 'CANCELLED',
                               finalPriceCents | null, settledAt | null, cancellable: boolean }
```

`position` = colocação do melhor lance do usuário entre os licitantes distintos (1 = líder).
`totalReceivedCents` = soma de `SETTLEMENT_CREDIT` − `REFUND_DEBIT` do leiloeiro.

### Cancelar

- Base (RN-12): `SCHEDULED`/`LIVE` sem lances.
- Opcional (RN-13): com lances, antes ou depois da liquidação — estorno conforme a RN.
  Corpo opcional `{ reason }` (≤ 200 caracteres) registrado no evento `CANCELLED`.
- Eventos: `lot.cancelled` na sala; `wallet.changed` para afetados.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-03-01 | integração | Criar lote válido (FakeCatalog) | 201; imagem e snapshot gravados; `genesis_hash` presente |
| CT-03-02 | integração | `endsAt` < `startsAt` + 5 min; incremento 0; preço negativo | 400 |
| CT-03-03 | integração | Licitante tenta criar lote | 403 |
| CT-03-04 | integração | Criar com catálogo fora | 503 e nenhum registro gravado |
| CT-03-05 | unit | `lotPhase` nas bordas de `startsAt`/`endsAt` | fases corretas (RN-03) |
| CT-03-06 | integração | Vitrine com lotes de todas as fases + cancelado | cada aba certa; cancelado ausente |
| CT-03-07 | integração | `GET /lots/:id` público | sem nome/e-mail/id de usuário |
| CT-03-08 | integração | Cancelar sem lances (dono) | 200; some da vitrine; evento `CANCELLED` na cadeia |
| CT-03-09 | integração | Cancelar lote de outro leiloeiro | 403 |
| CT-03-10 | integração | Cancelar com lances, antes da liquidação | 200; comprometido do líder liberado |
| CT-03-11 | integração | Cancelar após liquidação | 200; `REFUND_*` lançados; comprovante revogado; invariantes I-1, I-7 |
| CT-03-12 | integração | Cancelar `CLOSED_NO_WINNER` ou já cancelado | 409 `LOT_NOT_CANCELLABLE` |
| CT-03-13 | integração | Painel: resultados e total recebido após 2 liquidações e 1 estorno | valores corretos |
| CT-03-14 | integração | Busca `q`, categoria, faixa de preço, ordenação, paginação | resultados e ordem corretos |
