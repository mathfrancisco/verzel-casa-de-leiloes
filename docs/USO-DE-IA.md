# Uso de IA no projeto

O teste permite o uso de IA e pede que eu informe onde e como a usei. O fluxo de
trabalho está descrito em [`../ai/README.md`](../ai/README.md).

## Meu papel

Eu conduzi o trabalho e respondo pelas decisões. Li o desafio, comparei
alternativas e escolhi a stack (Vite, Fastify, PostgreSQL) e o provedor de
deploy (Northflank). Defini a organização em requisitos, regras de negócio,
specs e cards, a ordem dos cards e o que cada um precisava provar antes de ser
considerado pronto. Também defini as regras de trabalho: uma branch por card,
publicação em cadência de uma hora, banco descartável e catálogo falso nos
testes, e segredos fora do código.

## Como a IA ajudou

Usei assistentes de código (Claude Code e Codex) como apoio em todo o
desenvolvimento, sempre a partir das minhas instruções. A IA:

- rascunhou a documentação de planejamento (requisitos, regras, arquitetura,
  modelagem, specs e cards), que revisei e complementei;
- escreveu a maior parte do código e dos testes de cada card;
- executou lint, typecheck, testes, build e ensaios no navegador;
- fez revisões técnicas do diff e apontou correções;
- abriu e integrou as PRs depois dos checks verdes, conforme minha autorização.

O principal ganho foi velocidade: com a IA consegui cobrir em poucos dias o
escopo completo — carteira, motor de lances, tempo real, liquidação, auditoria
com cadeia assinada, comprovantes, painel e cancelamento — com testes
automatizados em cada etapa.

## Verificação

Nenhum card foi considerado pronto sem `pnpm lint`, `pnpm typecheck`,
`pnpm test` e `pnpm build` verdes e, quando havia interface, ensaio no
navegador. A evidência de cada card está no próprio card e em
[`CHECKLIST.md`](CHECKLIST.md). Cada PR só foi integrada com os checks do CI
verdes. Uma execução local não é tratada como evidência de CI ou deploy.
