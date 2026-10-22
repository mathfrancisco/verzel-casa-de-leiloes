# LC-001 — Criar o monorepo TypeScript com lint, testes e pacote shared

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E1 Fundação · Dia 1 |
| Depende de | — |
| Requisitos | RNF-02, RNF-12 |
| Regras | — |
| Specs | SP-00, SP-10 |

## Objetivo

Repositório com `apps/api`, `apps/web` e `packages/shared` compilando, com lint, typecheck e Vitest funcionando em todos.

## Escopo

- `pnpm` workspaces, Node 22 (`.nvmrc`, `engines`), TypeScript `strict` com `tsconfig` base
- ESLint + Prettier na raiz; scripts `lint`, `typecheck`, `test`, `dev`, `build`
- `apps/api`: Fastify com `GET /health`; `apps/web`: Vite + React com página inicial; proxy `/api` e `/socket.io` no Vite
- `packages/shared`: `errors.ts` (códigos de SP-00), `money.ts` (helpers de centavos) e um teste
- `.env.example` com as variáveis de SP-10 (sem valores reais)

## Fora do escopo

- Banco e migrations (LC-002)
- CI e Docker (LC-004)

## Critérios de aceite

- [ ] `pnpm install && pnpm lint && pnpm typecheck && pnpm test` verdes na raiz
- [ ] `pnpm dev` sobe API (porta 3000) e web (porta 5173); `/api/health` acessível pelo proxy do Vite
- [ ] `apps/web` importa um tipo de `packages/shared` e compila

## Testes obrigatórios

- Teste unitário de `money.ts` (centavos ↔ string pt-BR, valores de borda)
- Teste de `GET /health` via `app.inject()`

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
