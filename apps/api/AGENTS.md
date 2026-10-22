# AGENTS.md — apps/api (Fastify)

Complementa o `AGENTS.md` da raiz. Arquitetura em `docs/03-arquitetura.md` §3 e §8.

## Camadas

| Pasta | Pode importar | Não pode |
|---|---|---|
| `src/domain` | só `packages/shared` e outros arquivos de `domain` | Fastify, Drizzle, Socket.IO, `fetch`, `Date.now()` |
| `src/application` | `domain`, `ports`, `infra/db`, `infra/realtime` | Fastify (`request`/`reply`) |
| `src/http` | `application`, `packages/shared` | Drizzle direto, regra de negócio |
| `src/infra` | bibliotecas externas | regras de negócio |
| `src/jobs` | `application` | regra de negócio própria |

`src/main.ts` é o único lugar que escolhe implementações (real × fake) e as injeta.

## Padrões

- **Rota:** schema Zod do `packages/shared` → `await useCase(deps, input, user)` → DTO de saída
  explícito. Nada de `return row` do banco.
- **Erros:** casos de uso lançam `DomainError(code, details)`; o `setErrorHandler` converte para
  `{ error: { code, message, details } }` com o status da tabela de `docs/02-regras-de-negocio.md`.
- **Transações:** `db.transaction(async (tx) => …)`; travas com `.for('update')`; ordem lote →
  carteira; carteiras múltiplas em ordem de `user_id`.
- **Tempo:** sempre `now()` do banco dentro da transação; nos testes de domínio, `Clock` fake.
- **Realtime:** coletar eventos durante a transação e emitir **após** o commit.
- **Auth:** hook `preHandler` `requireRole('BIDDER' | 'AUCTIONEER')`; dono do recurso checado no
  caso de uso.
- **Logs:** `request.log` (pino); nunca logar senha, token, cookie ou chave.

## Testes

- `*.test.ts` ao lado do arquivo (unit) e `test/integration/*.test.ts` (Postgres real via
  `docker compose`, banco recriado por arquivo de teste).
- HTTP com `app.inject()`; catálogo com `FakeCatalog`; chave Ed25519 de teste fixa.
- Concorrência: `Promise.all` com N lances reais contra o banco + checagem das invariantes de
  `docs/04-modelagem-de-dados.md` §6.
