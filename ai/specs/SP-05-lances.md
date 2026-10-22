# SP-05 — Lances

**Requisitos:** RF-09, RF-11, RNF-04 · **Regras:** RN-04 a RN-09, RN-15, RN-16, RN-18 ·
**Cards:** LC-011

## API

| Método | Rota | Auth | Corpo | Sucesso | Erros |
|---|---|---|---|---|---|
| POST | `/api/lots/:id/bids` | BIDDER + `Idempotency-Key` | `{ amountCents }` | 201 `{ bid, lot: LotDetail }` | ver tabela de erros da RN (ordem de validação em `docs/02-regras-de-negocio.md`) |

`bid = { seq, amountCents, bidderPseudonym, createdAt, hash }`.

Detalhes de erro: `BELOW_MINIMUM.details = { minimumCents }`;
`INSUFFICIENT_FUNDS.details = { availableCents }`; `LOT_NOT_STARTED.details = { startsAt }`.

## Algoritmo (caso de uso `placeBid`)

Exatamente o de `docs/03-arquitetura.md` §4.1. Pontos obrigatórios:

1. Uma transação; `SELECT … FOR UPDATE` no lote, depois na carteira.
2. Validações **na ordem** da tabela da RN; a primeira falha decide o erro.
3. `now()` do banco como horário do lance.
4. Elo `BID` com `seq = chain_length + 1`, `prev_hash = head_hash`, hash e assinatura (SP-08).
5. Anti-sniping (RN-09): se `ends_at − now() ≤ 2 min` → `ends_at = now() + 2 min`;
   `payload.endsAtAfter` registra o novo fim.
6. Atualiza `current_price_cents`, `leader_id`, `bid_count`, `chain_length`, `head_hash`, `ends_at`.
7. Grava a chave de idempotência com a resposta.
8. Após o commit: `bid.accepted` (+ `lot.extended` se prorrogou) na sala; `bid.outbid` e
   `wallet.changed` para o líder anterior; `wallet.changed` para o licitante.

Regras puras em `domain/bidRules.ts` (`validateBid(lotState, bidder, amount, now, available)`
→ `ok | DomainError`) e `domain/antiSniping.ts` — testadas sem banco.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-05-01 | unit | 1º lance = inicial / inicial − 1 | aceito / `BELOW_MINIMUM` com mínimo |
| CT-05-02 | unit | Seguinte = atual + incremento / − 1 centavo | aceito / `BELOW_MINIMUM` |
| CT-05-03 | unit | Antes do início, exatamente no início, exatamente no fim | `LOT_NOT_STARTED` / aceito / `LOT_CLOSED` |
| CT-05-04 | unit | Líder dá novo lance | `ALREADY_WINNING` |
| CT-05-05 | unit | Valor = disponível / disponível + 1 | aceito / `INSUFFICIENT_FUNDS` com disponível |
| CT-05-06 | unit | Anti-sniping: faltando 2:01, 2:00, 0:01 | sem mudança / fim = lance + 2 min / fim = lance + 2 min |
| CT-05-07 | unit | Ordem de validação: lote encerrado **e** valor baixo | `LOT_CLOSED` |
| CT-05-08 | integração | Lance válido | 201; elo na cadeia; lote atualizado; invariantes I-3, I-4 |
| CT-05-09 | integração | Leiloeiro dá lance | 403 `SELLER_CANNOT_BID` |
| CT-05-10 | integração | Lote cancelado | 409 `LOT_CANCELLED` |
| CT-05-11 | integração | **20 lances simultâneos** de licitantes diferentes no mesmo lote, mesmo valor | 1 aceito, demais `BELOW_MINIMUM`; cadeia íntegra |
| CT-05-12 | integração | **Mesmo licitante, 2 lotes ao mesmo tempo**, cada lance = disponível total | 1 aceito, outro `INSUFFICIENT_FUNDS`; invariante I-2 |
| CT-05-13 | integração | A lidera com R$ 3.000, B cobre | disponível de A volta na hora; `bid.outbid` para A |
| CT-05-14 | integração | Mesma `Idempotency-Key` 2× | um elo só; mesma resposta |
| CT-05-15 | integração | Lance nos últimos 2 min | `ends_at` estendido; `lot.extended` emitido |
| CT-05-16 | integração | Resposta do lance e eventos | sem nome/e-mail/id de usuário |
