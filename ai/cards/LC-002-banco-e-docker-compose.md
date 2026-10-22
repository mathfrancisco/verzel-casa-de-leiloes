# LC-002 — Configurar Postgres, Drizzle, migrations iniciais e Docker Compose

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Épico / dia | E1 Fundação · Dia 1 |
| Depende de | LC-001 |
| Requisitos | RNF-02, RNF-13 |
| Regras | RN-07 |
| Specs | SP-10 |

## Objetivo

Banco local com um comando e schema versionado das tabelas de usuários e carteira.

## Escopo

- `docker-compose.yml` com serviço `db` (postgres:16-alpine, volume, healthcheck)
- Drizzle + `drizzle-kit`; scripts `db:generate` e `db:migrate`
- Migration 0001: enums e tabelas `users`, `wallets`, `wallet_entries`, `idempotency_keys` conforme `docs/04-modelagem-de-dados.md` (extensão `citext`)
- Validação de env com Zod no start da API; `GET /ready` checa o banco
- Helper de testes de integração que cria um banco limpo por arquivo de teste

## Fora do escopo

- Tabelas de lotes e cadeia (LC-006)
- Serviço `app` no compose (LC-004)

## Critérios de aceite

- [x] `docker compose up -d db && pnpm db:migrate` cria o schema do zero
- [x] `CHECK (balance_cents >= 0)` e `CHECK (amount_cents <> 0)` existem e são testados
- [x] API não sobe sem `DATABASE_URL`/`JWT_SECRET` e explica o motivo

## Testes obrigatórios

- CT-10-02 — API sem variável obrigatória falha no start
- Integração: inserir saldo negativo em `wallets` é rejeitado pelo banco
- Integração: `GET /ready` 200 com banco e 503 sem banco

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `docker compose config` | válido |
| `docker compose up -d db` | `db Up (healthy)` |
| `pnpm db:migrate` em banco vazio, 2× | "Migrations aplicadas." nas duas; tabelas `idempotency_keys`, `users`, `wallet_entries`, `wallets`; 2 migrations registradas |
| `pnpm test` (Postgres do compose) | shared 29 ✓ · web 3 ✓ · api 22 ✓ (5 arquivos: env, startup, ready, schema, health) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| `pnpm dev` com `.env` → `curl localhost:3000/ready` | `{"status":"ready"}` |
| API sem `DATABASE_URL`/`JWT_SECRET` (teste `startup`) | sai com código 1 e lista as duas variáveis |
| Bancos descartáveis dos testes | 0 restantes após a suíte |

Decisões:
- Driver `postgres` (postgres.js) com Drizzle; migrations SQL versionadas em `apps/api/drizzle/`
  (`0000_extensions` cria `citext`, `0001_schema_inicial` gerada pelo `drizzle-kit`).
- `loadEnv` valida só `DATABASE_URL`, `JWT_SECRET`, `PORT` e `NODE_ENV`; as demais variáveis da
  SP-10 entram com os cards que as usam (YAGNI).
- IDs `uuid` sem default no banco: a aplicação gera (LC-003).
- `wallet_entries.lot_id` ainda sem FK; ela entra com a tabela `lots` (LC-006).
- Testes de integração usam `DATABASE_URL` (padrão `postgres://leilao:leilao@localhost:5432/leilao`)
  para criar um banco descartável por arquivo; o usuário precisa de permissão `CREATEDB`.
