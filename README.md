# Casa de Leilões — Teste técnico Elite Dev Verzel

Casa de leilões online: leiloeiros criam lotes a partir de obras de arte da
[API pública do Art Institute of Chicago](https://api.artic.edu/docs/), licitantes depositam
saldo simulado e disputam lances ao vivo, e qualquer pessoa pode auditar o histórico de lances
de um lote e verificar que ele não foi adulterado.

> **Status: em planejamento.** Ainda não há código. Este README será reescrito com instruções
> de instalação, execução, deploy e comportamentos conhecidos conforme as funcionalidades forem
> implementadas e testadas.

## Documentos

- [Plano de execução](docs/PLANO.md) — stack, arquitetura, modelo de dados, regras de lance,
  técnica anti-adulteração, resiliência à API externa, testes e cronograma.
- [Checklist de requisitos](docs/CHECKLIST.md) — cada requisito do PDF ligado ao plano e à evidência.
- [Uso de IA](docs/USO-DE-IA.md) — onde e como a IA foi usada.

## Stack prevista

React + Vite · Node.js + Fastify · PostgreSQL + Drizzle · Socket.IO · Vitest + Playwright ·
Docker Compose.
