# LC-012 — Implementar o gateway Socket.IO com salas de lote e de usuário

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Eventos só após commit; nenhum payload com PII
- [ ] Visitante não entra em sala de usuário

## Testes obrigatórios

- CT-06-01 a CT-06-05

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
