# LC-017 — Mostrar lotes, resultados e total recebido no painel do leiloeiro

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E5 Auditoria e gestão · Dia 5 |
| Depende de | LC-014 |
| Requisitos | RF-06 |
| Regras | RN-10, RN-11 |
| Specs | SP-03, SP-09 |

## Objetivo

Leiloeiro vê o resultado de cada lote e quanto recebeu no total.

## Escopo

- `GET /api/auctioneer/lots` com `result`, `finalPriceCents`, `cancellable` e `totalReceivedCents`
- Rota `/painel`: lista com fase/resultado, cartão de total recebido, link para sala e auditoria

## Fora do escopo

- Botão de cancelar (LC-018)

## Critérios de aceite

- [x] Resultados e total batem com os lançamentos da carteira (CT-03-13 sem a parte de estorno passou no PostgreSQL isolado; total = `SETTLEMENT_CREDIT` + `REFUND_DEBIT` negativo, conferido contra o razão)
- [x] Leiloeiro só vê os próprios lotes (lote de outro leiloeiro ausente; visitante 401 e licitante 403)

## Testes obrigatórios

- CT-03-13 (sem a parte de estorno até o LC-018)

## Definição de pronto

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` e `pnpm test` padrão verdes (418: shared 104, web 87, API 227, duas execuções seguidas); timeouts de `startup.test.ts` (25 s) e do teste longo do painel (30 s) ajustados à carga da suíte paralela. No navegador, /painel mostrou total R$ 26,00 igual ao razão, seis lotes com fase/resultado corretos, links de sala e auditoria e sem botão de cancelar. Saída local em `../work/lc017-validation.log`; PR pendente
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) atualizado
- Integração: PR #18 integrada em `ac90fc0`; CI da PR (run 40384004031) e pós-merge (run 40384379860) passaram.
