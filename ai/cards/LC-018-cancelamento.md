# LC-018 — Implementar cancelamento de lote com estorno automático

| Campo | Valor |
|---|---|
| Status | TODO |
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

## Fora do escopo

- —

## Critérios de aceite

- [ ] Cancelado some da vitrine e continua auditável
- [ ] Estornos mantêm as invariantes I-1 e I-7

## Testes obrigatórios

- CT-03-08 a CT-03-12
- CT-03-13 completo

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
