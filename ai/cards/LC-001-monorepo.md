# LC-001 — Criar o monorepo TypeScript com lint, testes e pacote shared

| Campo | Valor |
|---|---|
| Status | REVIEW |
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

- [x] `pnpm install && pnpm lint && pnpm typecheck && pnpm test` verdes na raiz
- [x] `pnpm dev` sobe API (porta 3000) e web (porta 5173); `/api/health` acessível pelo proxy do Vite
- [x] `apps/web` importa um tipo de `packages/shared` e compila

## Testes obrigatórios

- Teste unitário de `money.ts` (centavos ↔ string pt-BR, valores de borda)
- Teste de `GET /health` via `app.inject()`

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) atualizado

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm lint` | ESLint sem erros; Prettier: "All matched files use Prettier code style!" |
| `pnpm typecheck` | `shared`, `api` e `web`: Done |
| `pnpm test` | shared 29 ✓ · api 3 ✓ · web 3 ✓ (35 testes) |
| `pnpm build` | api: "ESM Build success" · web: "built in 873ms" |
| `pnpm dev` → `curl localhost:3000/health` | `{"status":"ok","serverTime":"…"}` |
| `pnpm dev` → `curl localhost:5173/api/health` (proxy do Vite) | `{"status":"ok","serverTime":"…"}` |
| `PORT=3100 node apps/api/dist/main.js` + SIGTERM | health ok; encerrou com código 0 |

Decisões: health exposto em `/health` (provedor de deploy) e `/api/health` (SPA, mesmo
prefixo do resto da API); `packages/shared` é consumido como TypeScript fonte e entra no
bundle da API via `tsup` (`noExternal`).
