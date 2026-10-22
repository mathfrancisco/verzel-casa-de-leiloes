# Casa de Leilões — Teste técnico Elite Dev Verzel

Casa de leilões online: leiloeiros criam lotes a partir de obras de arte da
[API pública do Art Institute of Chicago](https://api.artic.edu/docs/), licitantes depositam
saldo simulado e disputam lances ao vivo, e qualquer pessoa pode auditar o histórico de lances
de um lote e verificar que ele não foi adulterado.

> **Status: em planejamento.** Ainda não há código. Este README será reescrito com instruções
> de instalação, execução, deploy e comportamentos conhecidos conforme as funcionalidades forem
> implementadas e testadas.

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
