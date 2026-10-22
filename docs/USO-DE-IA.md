# Uso de IA no projeto

O teste permite o uso de IA e pede que seja relatado onde, como e o que foi revisado ou ajustado.
Este registro é atualizado ao longo do desenvolvimento e resumido no formulário de envio. O
fluxo de trabalho com IA está descrito em [`../ai/README.md`](../ai/README.md).

## Como trabalho com a IA

- A IA gera; **eu reviso tudo o que ela gera** antes de entrar no repositório.
- Eu conduzo cada parte: digo o que precisa ser feito e como (arquitetura, modelagem, regras de
  negócio, requisitos, tarefas), aponto modificações e trago ideias novas que a IA não teve.
- O processo é iterativo: a IA gera uma versão, eu reviso e peço ajustes, e ela gera de novo até
  ficar como eu quero.
- Decisões de stack, escopo e prioridade são minhas.

## Registro

| Data | Etapa | Quem | O que foi feito |
|---|---|---|---|
| 22/10/2026 | Planejamento | IA | A partir do PDF e das minhas orientações tópico a tópico, rascunhou o plano de execução e o checklist de requisitos e montou a estrutura inicial do repositório |
| 22/10/2026 | Planejamento | Eu | Li o PDF do desafio e fui passando cada tópico para a IA. Criei o repositório no GitHub, revisei o plano e o checklist e defini que esta primeira etapa ficaria só no planejamento |
| 22/10/2026 | Documentação | IA | Gerou requisitos, regras de negócio, arquitetura com diagramas, modelagem de dados, specs, cards e `AGENTS.md` |
| 22/10/2026 | Documentação | Eu | Revisei tudo o que foi gerado. Pedi mais documentação e conduzi cada parte: arquitetura, modelagem, regras de negócio e requisitos. Avaliei as alternativas de stack (Vite × Next.js, NestJS × Express × Fastify) e mantive Fastify. Defini a organização da área de IA (specs, cards e `AGENTS.md`) para o desenvolvimento assistido |
