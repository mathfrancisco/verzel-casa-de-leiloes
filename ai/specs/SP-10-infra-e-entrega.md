# SP-10 — Infra, seed, CI, deploy e documentação

**Requisitos:** RF-16, RNF-01, RNF-07, RNF-12, RNF-13, RNF-14 · **Cards:** LC-001, LC-002,
LC-004, LC-020, LC-022, LC-023

## Monorepo

- `pnpm` workspaces: `apps/api`, `apps/web`, `packages/shared`. Node 22 LTS (`.nvmrc`,
  `engines`). TypeScript `strict`.
- ESLint + Prettier na raiz; `tsc --noEmit` por pacote.
- Scripts na raiz: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`,
  `db:generate`, `seed`, `seed:reset`, `keys:generate`.

## Variáveis de ambiente (`.env.example`)

| Variável | Exemplo | Uso |
|---|---|---|
| `DATABASE_URL` | `postgres://leilao:leilao@localhost:5432/leilao` | Postgres |
| `JWT_SECRET` | 32+ bytes aleatórios | Sessão |
| `AUDIT_SIGNING_PRIVATE_KEY` | base64url (gerada por `pnpm keys:generate`) | Assinatura da cadeia |
| `AUDIT_SIGNING_PUBLIC_KEY` | base64url | Exposta em `/api/audit/public-key` e no build do web |
| `PSEUDONYM_SECRET` | 32+ bytes aleatórios | Pseudônimos |
| `CATALOG_PROVIDER` | `artic` \| `fake` | Catálogo |
| `PORT` | `3000` | HTTP |
| `NODE_ENV` | `production` | Cookies `Secure`, logs |

A API valida as variáveis com Zod no start e não sobe se faltar alguma.

## Docker

- `Dockerfile` multi-stage: instala, builda `shared` → `web` → `api`; imagem final só com
  `dist`, `drizzle`, `node_modules` de produção e o build do web em `public/` (ao lado de
  `dist/`). Usuário não-root.
- Start: `node dist/main.js` (aplica as migrations e sobe o servidor). `GET /health` (processo) e `GET /ready` (banco ok).
- `docker-compose.yml`: `db` (postgres:16-alpine, volume, healthcheck) e `app` (build local,
  `CATALOG_PROVIDER=artic`, roda migrations e seed na primeira subida). `docker compose up`
  → app em `http://localhost:3000`.

## Seed

`docs/04-modelagem-de-dados.md` §7. Idempotente (`seed` não duplica); `seed:reset` apaga e
recria com datas relativas a agora. Usa `FakeCatalog` com fixtures em
`apps/api/seed/fixtures` (JSON + imagens de domínio público).

## CI (`.github/workflows/ci.yml`)

Em push e PR: `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` (service
`postgres:16`) → `build` → `test:e2e` (sobe a app com `CATALOG_PROVIDER=fake`) → build da
imagem Docker. Sem segredos reais: chaves de teste geradas no job.

## Deploy

- Dia 1: esqueleto no ar (health + página React + Postgres gerenciado) para validar build,
  WebSocket e cookies no provedor.
- Provedor escolhido: **Northflank** (plano Sandbox: gratuito, sem cartão, serviços sempre
  ligados, 1 banco incluído). Motivo e passo a passo no README.
- Migrations rodam no início do processo da API (`src/main.ts`), não em um job separado.
- Pós-deploy: `seed` executado uma vez; smoke test manual (login dos 3 usuários, lance,
  auditoria) registrado no PR.

## README final (RNF-07)

Seções obrigatórias: visão geral e link do deploy · usuários de demonstração · como rodar
(Docker Compose e manual) · banco (configurar, migrar, semear) · variáveis de ambiente ·
testes · arquitetura (resumo + link) · **técnica anti-adulteração** · resiliência à API ·
decisões e interpretações (ex.: anti-sniping) · **comportamentos inesperados e limitações
conhecidas** · uso de IA.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-10-01 | manual/CI | `docker compose up` em clone limpo | app responde, seed presente |
| CT-10-02 | integração | API sem `JWT_SECRET` | falha no start com mensagem clara |
| CT-10-03 | integração | `seed` 2× | sem duplicar; auditoria de todos os lotes `INTACT` |
| CT-10-04 | e2e | Fluxo completo (LC-022) | verde no CI |
