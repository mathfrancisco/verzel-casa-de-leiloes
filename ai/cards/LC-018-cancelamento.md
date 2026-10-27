# LC-018 — Implementar cancelamento de lote com estorno automático

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E5 Auditoria e gestão · Dia 5 |
| Depende de | LC-017 |
| Requisitos | RF-05, RF-18 |
| Regras | RN-12, RN-13 |
| Specs | SP-03 |

## Objetivo

Leiloeiro cancela lotes; quem tinha dinheiro envolvido é estornado automaticamente.

## Escopo

- `POST /api/lots/:id/cancel` cobrindo RN-12 e RN-13 (antes e depois da liquidação)
- Elo `CANCELLED` assinado; `REFUND_*`; comprovante revogado; eventos `lot.cancelled` e `wallet.changed`
- Botão no painel com confirmação explicando o efeito; aviso de cancelado na sala, auditoria e comprovante

Decisões: lote `ACTIVE` em `CLOSING` (fim passou, ainda sem liquidar) é cancelável só se tiver lances (RN-13 "antes da liquidação"); sem lances vira `CLOSED_NO_WINNER` (não cancelável, RN-12/RN-13). Cada licitante do lote recebe também `lot.cancelled` no canal pessoal (RF-18), além da sala. O motivo opcional é público (payload do elo e do evento).

## Fora do escopo

- —

## Critérios de aceite

- [x] Cancelado some da vitrine e continua auditável (CT-03-08: ausente da aba ao vivo; auditoria `INTACT` com elo `CANCELLED`; sala, auditoria e comprovante mostram o aviso)
- [x] Estornos mantêm as invariantes I-1 e I-7 (checadas após cancelamento antes e depois da liquidação e sob dois cancelamentos concorrentes)

## Testes obrigatórios

- CT-03-08 a CT-03-12
- CT-03-13 completo

## Definição de pronto

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` padrão e `pnpm build` verdes (433: shared 104, web 94, API 235). Saída local em `../work/lc018-validation.log`; PR pendente. Painel ainda não testado no navegador
- [x] Todos os critérios de aceite com evidência
- [x] Navegador (harness local, FakeCatalog, banco descartável): botão só em lotes canceláveis; confirmação explicou estorno; total recebido caiu de R$ 26,00 para R$ 11,00 após cancelar arrematado; sala e auditoria mostraram aviso e elo `CANCELLED`. Evidência em `../work/lc018-validation.log`
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` atualizado
- Integração: PR #19 integrada em `acc6e58`; CI da PR (run 40385566227) e pós-merge (run 40385941500) passaram.
