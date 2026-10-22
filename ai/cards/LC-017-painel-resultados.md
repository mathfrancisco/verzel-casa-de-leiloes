# LC-017 — Mostrar lotes, resultados e total recebido no painel do leiloeiro

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Resultados e total batem com os lançamentos da carteira
- [ ] Leiloeiro só vê os próprios lotes

## Testes obrigatórios

- CT-03-13 (sem a parte de estorno até o LC-018)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
