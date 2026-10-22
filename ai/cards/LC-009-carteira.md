# LC-009 — Implementar carteira com depósito simulado e saldo comprometido

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E3 Lances e carteira · Dia 3 |
| Depende de | LC-003 |
| Requisitos | RF-07, RF-08 |
| Regras | RN-07, RN-17 |
| Specs | SP-04 |

## Objetivo

Licitante deposita saldo e vê total, comprometido e disponível.

## Escopo

- `GET /api/wallet` e `POST /api/wallet/deposits` com idempotência (SP-04)
- `domain/computeAvailable` e consulta de comprometido
- Web: rota `/carteira` com os três valores, compromissos por lote, depósito e extrato

## Fora do escopo

- Atualização em tempo real (LC-012/LC-013)

## Critérios de aceite

- [ ] Depósito repetido com a mesma chave não duplica
- [ ] Comprometido reflete lotes liderados
- [ ] Leiloeiro vê a carteira mas não deposita

## Testes obrigatórios

- CT-04-01 a CT-04-07

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
