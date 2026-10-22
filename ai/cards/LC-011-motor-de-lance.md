# LC-011 — Implementar o motor de lance transacional com anti-sniping

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Todas as validações na ordem da RN com os detalhes de erro
- [ ] Testes de concorrência verdes repetidamente (rodar 5× seguidas)
- [ ] Invariantes I-2, I-3, I-4 checadas após cada teste de integração

## Testes obrigatórios

- CT-05-01 a CT-05-16 (CT-05-13/15 verificam eventos no coletor)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
