# Casa de Leilões — Teste técnico Elite Dev Verzel

Casa de leilões online: leiloeiros criam lotes a partir de obras de arte da
[API pública do Art Institute of Chicago](https://api.artic.edu/docs/), licitantes depositam
saldo simulado e disputam lances ao vivo, e qualquer pessoa pode auditar o histórico de lances
de um lote e verificar que ele não foi adulterado.

> **Status: em desenvolvimento.** Este README é completado conforme cada parte é implementada e
> testada. Progresso em [`ai/cards/README.md`](ai/cards/README.md).

## Como rodar (desenvolvimento)

Requisitos: Node 22, pnpm 10 e Docker.

```bash
pnpm install
cp .env.example .env            # preencha JWT_SECRET (mínimo de 32 caracteres)
docker compose up -d db         # PostgreSQL 16 em localhost:5432 (usuário/senha/banco: leilao)
pnpm db:migrate                 # aplica as migrations de apps/api/drizzle
pnpm dev                        # API em :3000 e web em :5173 (o web repassa /api para a API)
```

Verificações: `pnpm lint`, `pnpm typecheck`, `pnpm test` (os testes de integração criam e
apagam um banco descartável por arquivo no Postgres de `DATABASE_URL`) e `pnpm build`.

Sem Docker: qualquer PostgreSQL 16 serve; ajuste `DATABASE_URL` no `.env` (o usuário precisa
poder criar bancos para os testes).

## Rodar com Docker (app completa)

```bash
docker compose up --build       # Postgres + app em http://localhost:3000
```

A imagem única (`Dockerfile`) contém a API, o WebSocket e o build do site. As migrations rodam
sozinhas quando a app sobe. O `JWT_SECRET` do `docker-compose.yml` serve só para uso local.

## Deploy (Northflank)

**Por que Northflank:** o plano gratuito *Sandbox* não pede cartão, roda serviços **sempre
ligados** (sem "dormir") e inclui um banco. Isso importa aqui porque a sala de lances usa
WebSocket e o encerramento dos lotes roda dentro do próprio servidor: um serviço que hiberna
atrasaria liquidações e daria espera de ~1 min na primeira visita. Alternativas avaliadas:
Railway (pago), Render + Neon (gratuitos, mas o serviço dorme), Fly.io e Koyeb.

Passo a passo (os nomes dos campos podem variar um pouco no painel):

1. Crie um projeto no Northflank e conecte sua conta do GitHub.
2. **Addon** → PostgreSQL, versão 16.
3. **Service** → *Combined service* (build + deploy) a partir deste repositório, branch `main`,
   build por **Dockerfile** (`/Dockerfile`, contexto `/`).
4. **Porta** 3000, protocolo HTTP, **pública**.
5. **Variáveis de ambiente** do serviço:
   - `DATABASE_URL` = URI de conexão do addon PostgreSQL (vincule o addon ao serviço ou a um
     *secret group* e use a variável de URI que ele expõe);
   - `JWT_SECRET` = segredo aleatório de 32+ caracteres
     (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`);
   - `NODE_ENV` = `production`.
6. **Health check**: HTTP `GET /ready` na porta 3000.
7. Deploy. A cada push na `main`, o Northflank refaz o build e publica.

Link público: _a preencher após o primeiro deploy_.

## Documentação

| Documento | Conteúdo |
|---|---|
| [00 — Plano geral](docs/00-plano-geral.md) | Entendimento do desafio, stack, cronograma, riscos |
| [01 — Requisitos](docs/01-requisitos.md) | Requisitos funcionais e não funcionais, matriz de rastreabilidade |
| [02 — Regras de negócio](docs/02-regras-de-negocio.md) | Regras numeradas (normativo) |
| [03 — Arquitetura](docs/03-arquitetura.md) | Diagramas, fluxos, técnica anti-adulteração, decisões de stack |
| [04 — Modelagem de dados](docs/04-modelagem-de-dados.md) | Diagrama ER, restrições, índices, invariantes |
| [Checklist](docs/CHECKLIST.md) | Cada item do PDF → requisito → card → evidência |
| [Uso de IA](docs/USO-DE-IA.md) | Onde e como a IA foi usada |
| [Desenvolvimento com IA](ai/README.md) | Specs, cards, prompts e `AGENTS.md` |

## Stack prevista

React + Vite · Node.js + Fastify · PostgreSQL + Drizzle · Socket.IO · Vitest + Playwright ·
Docker Compose.
