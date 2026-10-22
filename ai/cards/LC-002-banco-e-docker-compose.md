# LC-002 — Configurar Postgres, Drizzle, migrations iniciais e Docker Compose

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] `docker compose up -d db && pnpm db:migrate` cria o schema do zero
- [ ] `CHECK (balance_cents >= 0)` e `CHECK (amount_cents <> 0)` existem e são testados
- [ ] API não sobe sem `DATABASE_URL`/`JWT_SECRET` e explica o motivo

## Testes obrigatórios

- CT-10-02 — API sem variável obrigatória falha no start
- Integração: inserir saldo negativo em `wallets` é rejeitado pelo banco
- Integração: `GET /ready` 200 com banco e 503 sem banco

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
