# LC-012 — Implementar o gateway Socket.IO com salas de lote e de usuário

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E4 Tempo real e liquidação · Dia 4 |
| Depende de | LC-011 |
| Requisitos | RF-10, RF-20, RNF-10 |
| Regras | RN-07, RN-16 |
| Specs | SP-06 |

## Objetivo

Mudanças de lote e carteira chegam aos clientes sem recarregar.

## Escopo

- Socket.IO no Fastify, autenticação pelo cookie no handshake, sala `user:{id}` automática
- `lot.join`/`lot.leave` validados; tipos em `packages/shared/realtime.ts`
- Publicação dos eventos coletados após commit (lance, depósito)
- Cliente web: conexão única, hook `useLotChannel`, invalidação ao reconectar

## Fora do escopo

- Telas (LC-013)

## Critérios de aceite

- [x] Eventos só após commit; nenhum payload com PII — CT-06-01 a CT-06-05 locais no PostgreSQL descartável
- [x] Visitante não entra em sala de usuário — CT-06-04 local, incluindo tentativa de sala pessoal

## Testes obrigatórios

- CT-06-01 a CT-06-05

## Definição de pronto

- [x] Gates locais verdes: lint, typecheck, testes (363: shared 104, API 196, web 63; sem falhas ou skips) e build; log em `../work/lc012-validation.log`
- [x] Gates registrados na PR #12 (integração com `main`: 365 testes — shared 104, API 197, web 64); PR integrada em `3749d9c`; CI da PR (run 40333632167) e pós-merge (run 40333960247) passaram
- [x] Todos os critérios de aceite com evidência local
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
