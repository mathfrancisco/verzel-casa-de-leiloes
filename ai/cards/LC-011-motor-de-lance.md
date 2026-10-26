# LC-011 — Implementar o motor de lance transacional com anti-sniping

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E3 Lances e carteira · Dia 3 |
| Depende de | LC-009, LC-010 |
| Requisitos | RF-09, RF-11, RNF-04 |
| Regras | RN-04, RN-05, RN-06, RN-07, RN-08, RN-09, RN-18 |
| Specs | SP-05 |

## Objetivo

Lances corretos sob concorrência, com saldo comprometido e prorrogação garantidos pelo banco.

## Escopo

- `domain/bidRules.ts` e `domain/antiSniping.ts` (puros)
- Caso de uso `placeBid` (transação, travas lote → carteira, elo assinado, idempotência)
- Rota `POST /api/lots/:id/bids`; coletor de eventos pós-commit (emissão real em LC-012)
- `LotDetail` passa a trazer histórico recente, `me` e `minimumNextBidCents`

## Fora do escopo

- Socket.IO (LC-012)
- UI da sala (LC-013)
- Liquidação (LC-014)

## Critérios de aceite

- [x] Todas as validações na ordem da RN com os detalhes de erro
- [x] Testes de concorrência verdes repetidamente (rodar 5× seguidas)
- [x] Invariantes I-2, I-3, I-4 checadas após cada teste de integração

## Testes obrigatórios

- CT-05-01 a CT-05-16 (CT-05-13/15 verificam eventos no coletor)

## Definição de pronto

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` verdes localmente em Node 22; CI da PR #11 e pós-merge verdes
- [x] Todos os critérios de aceite com evidência local: 12 testes de domínio, suíte final de integração 9/9 e 8 casos repetidos 5× no PostgreSQL descartável
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidência local

- PostgreSQL descartável `verzel-cards-test-db` em `127.0.0.1:55439`.
- `bidRules.test.ts` + `antiSniping.test.ts`: 12/12; `bids.test.ts`: 9/9.
- O conjunto original de 8 casos de integração executou 5 vezes sequenciais, verificando I-2, I-3 e I-4 após cada caso; a suíte final com o caso do coletor pós-commit passou 9/9.
- Revisão técnica assistida confirmou as correções de chave Ed25519, limite de valor e falha do coletor pós-commit. A revisão do merge com `main` corrigiu o relógio do lance para `clock_timestamp()` após a trava do lote (`bde5e41`), com teste de espera na trava.
- Integração: PR #11 integrada em `0153523a`; CI da PR (run 40324635804) e pós-merge (run 40324912155) passaram.
