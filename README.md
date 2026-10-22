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
