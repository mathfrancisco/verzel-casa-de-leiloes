# AGENTS.md — Casa de Leilões (Teste Elite Dev Verzel)

Instruções para agentes de IA (Claude Code, Codex, Cursor, Copilot…). Curto de propósito:
detalhes ficam nos documentos linkados. **Leia antes de editar qualquer arquivo.**

## O projeto

Casa de leilões online: leiloeiro cria lotes a partir da API do Art Institute of Chicago;
licitante deposita saldo simulado e dá lances ao vivo; qualquer pessoa audita o histórico de
lances (cadeia de hashes assinada). Prazo: 29/10/2026. Deploy obrigatório.

Stack: TypeScript · monorepo pnpm · `apps/web` React + Vite · `apps/api` Node 22 + Fastify +
Socket.IO · PostgreSQL 16 + Drizzle · `packages/shared` (Zod, códigos de erro, eventos) ·
Vitest + Playwright.

## Onde está cada coisa

| Precisa de… | Leia |
|---|---|
| Visão geral e cronograma | `docs/00-plano-geral.md` |
| O que construir (RF/RNF) | `docs/01-requisitos.md` |
| Regras de negócio (**normativo**) | `docs/02-regras-de-negocio.md` |
| Diagramas, camadas, decisões | `docs/03-arquitetura.md` |
| Schema, restrições, invariantes | `docs/04-modelagem-de-dados.md` |
| Contrato de cada módulo (API, erros, testes) | `ai/specs/SP-xx-*.md` |
| Tarefa a executar | `ai/cards/LC-xxx-*.md` (quadro em `ai/cards/README.md`) |
| Convenções do back / front | `apps/api/AGENTS.md` · `apps/web/AGENTS.md` |

Precedência em conflito: **regras de negócio > spec > card > plano**. Se encontrar conflito,
pare, aponte-o e proponha a correção no documento — não escolha sozinho em silêncio.

## Protocolo de trabalho (um card por vez)

1. Escolha **um** card `LC-xxx` com status `TODO` cujas dependências estejam `DONE`.
2. Leia o card, as RN/RF/RNF e as specs que ele cita. Leia o código existente — não presuma
   que um módulo existe porque um documento o menciona.
3. Escreva os testes do card primeiro (casos positivos **e** negativos listados na spec), veja
   falharem, implemente o mínimo para passarem.
4. Rode as verificações (abaixo) e registre a **saída real** no PR.
5. Atualize: status do card, `ai/cards/README.md`, `docs/CHECKLIST.md` (só com evidência),
   specs/regras se o comportamento mudou.
6. Commit em português, no imperativo, citando o card: `feat(lances): motor de lance transacional (LC-011)`.
7. Nunca marque `DONE` com teste falhando, pulado ou não executado.

## Comandos (disponíveis a partir do LC-001)

```bash
pnpm install
docker compose up -d db        # Postgres local
pnpm db:migrate                # aplica migrations
pnpm seed                      # dados de demonstração
pnpm dev                       # api + web em modo desenvolvimento
pnpm lint && pnpm typecheck
pnpm test                      # unit + integração (precisa do Postgres)
pnpm test:e2e                  # Playwright
```

## Invariantes que nenhum card pode quebrar

- Regras de lance, saldo, liquidação e cancelamento rodam **no servidor, em transação**, com
  travas na ordem **lote → carteira**. A UI só antecipa mensagens.
- Dinheiro em **centavos inteiros**; tempo do relógio do **banco** (UTC).
- `lot_entries` é append-only; todo elo é encadeado (`prev_hash`) e assinado (Ed25519). Nunca
  gravar lance fora do caso de uso `placeBid`.
- Respostas públicas (auditoria, comprovante, sala) **não** contêm nome, e-mail nem IDs de
  usuário — só pseudônimos por lote.
- Vitrine, sala, auditoria e comprovante **não** chamam a API externa.
- Eventos realtime só depois do `COMMIT`.
- Segredos (`JWT_SECRET`, `AUDIT_SIGNING_PRIVATE_KEY`, `PSEUDONYM_SECRET`) só em variável de
  ambiente; nunca no código, no banco, em log ou no front.
- CI e testes **nunca** chamam a API externa real — use `FakeCatalog`.

## Princípios de código

- KISS e YAGNI: a menor solução que cumpre o card com testes. Sem camadas, interfaces ou
  abstrações especulativas; ports só onde já existem duas implementações (real e fake).
- Rotas finas: validar com Zod (`packages/shared`) → chamar caso de uso → responder.
- Regras puras em `apps/api/src/domain`, sem I/O, testáveis sem banco.
- Erros de domínio com código estável (`BELOW_MINIMUM`, …) definidos em `packages/shared`.
- Não refatorar código fora do escopo do card; anote como sugestão no PR.
- Não adicionar dependência sem justificar no PR; versões fixadas no lockfile.

## Não faça

- Não desative, pule ou apague testes para ficar verde.
- Não edite migration já aplicada — crie outra.
- Não comite `.env`, chaves ou dumps de banco.
- Não implemente o que o PDF exclui: nota fiscal, revenda, app nativo, recuperação de senha.
- Não afirme que algo funciona sem ter rodado o comando que prova.
