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
- Na implementação, leio as specs e os cards, conduzo o desenvolvimento card a card e peço
  ajuda à IA na hora de desenvolver e para tirar dúvidas. A IA roda os testes e o lint sobre a
  implementação e eu reviso o resultado antes de aprovar.

## Registro

| Data | Etapa | Quem | O que foi feito |
|---|---|---|---|
| 22/10/2026 | Planejamento | IA | A partir do PDF e das minhas orientações tópico a tópico, rascunhou o plano de execução e o checklist de requisitos e montou a estrutura inicial do repositório |
| 22/10/2026 | Planejamento | Eu | Li o PDF do desafio e fui passando cada tópico para a IA. Criei o repositório no GitHub, revisei o plano e o checklist e defini que esta primeira etapa ficaria só no planejamento |
| 22/10/2026 | Documentação | IA | Gerou requisitos, regras de negócio, arquitetura com diagramas, modelagem de dados, specs, cards e `AGENTS.md` |
| 22/10/2026 | Documentação | Eu | Revisei tudo o que foi gerado. Pedi mais documentação e conduzi cada parte: arquitetura, modelagem, regras de negócio e requisitos. Avaliei as alternativas de stack (Vite × Next.js, NestJS × Express × Fastify) e mantive Fastify. Defini a organização da área de IA (specs, cards e `AGENTS.md`) para o desenvolvimento assistido |
| 22/10/2026 | Implementação (LC-001) | Eu | Li as specs e os cards e iniciei a implementação pelo LC-001 (monorepo), pedindo ajuda e tirando dúvidas com a IA durante o desenvolvimento |
| 22/10/2026 | Implementação (LC-001) | IA | Gerou a estrutura do monorepo (configuração de TypeScript, ESLint e Prettier, `/health` da API, página inicial, helpers de dinheiro e códigos de erro) e rodou lint, typecheck, testes e build |
| 22/10/2026 | Implementação (LC-002) | Eu | Defini o fluxo de trabalho por card (uma branch por card, commit local e push só quando eu pedir) e segui com o LC-002, revisando o resultado |
| 22/10/2026 | Implementação (LC-002) | IA | Gerou o Docker Compose do Postgres, o schema e as migrations iniciais (Drizzle), a validação de variáveis de ambiente e o `/ready`, com testes de integração; rodou lint, typecheck, testes e build |
| 22/10/2026 | Implementação (LC-003) | Eu | Pedi para seguir com o LC-003 e revisei o resultado |
| 22/10/2026 | Implementação (LC-003) | IA | Gerou cadastro, login, logout e autorização por papel (API e telas), com testes; rodou lint, typecheck, testes, build e o fluxo no navegador |
| 22/10/2026 | Deploy | Eu | Pesquisei provedores cloud para o deploy, pedi alternativas além das primeiras sugestões, conferi na página oficial o plano Sandbox do Northflank (gratuito, sem cartão, sempre ligado) e escolhi o Northflank |
| 22/10/2026 | Deploy | IA | Comparou provedores (Railway, Render + Neon, Fly.io, Koyeb, Northflank, Cloud Run, Oracle Cloud, VPS) com fontes, considerando WebSocket, serviço sempre ligado e banco que não expira |
| 22/10/2026 | Implementação (LC-004) | IA | Gerou Dockerfile, CI do GitHub Actions, serviço `app` no Compose, API servindo o site, eco de WebSocket e guia de deploy no Northflank; rodou testes, build da imagem e o fluxo no navegador contra o container |
| 22/10/2026 | Implementação (LC-005) | Eu | Pedi para seguir com o LC-005 e revisei o resultado |
| 22/10/2026 | Implementação (LC-005) | IA | Gerou o catálogo da API do Art Institute (cache, circuit breaker, retry, timeout), o catálogo fake e as rotas de busca, com testes; rodou lint, typecheck, testes e build |
| 22/10/2026 | Implementação (LC-006) | Eu | Pedi para seguir com o LC-006 e revisei o resultado |
| 22/10/2026 | Implementação (LC-006) | IA | Gerou a criação de lote (snapshot do item, imagem no banco, gênese da cadeia, pseudônimos), as tabelas de lotes e da cadeia com trigger append-only e as rotas de lote e imagem, com testes; rodou lint, typecheck, testes, build e um teste com a API rodando |
| 22/10/2026 | Implementação (LC-007) | Eu | Pedi para seguir com o LC-007 e revisei o resultado |
| 22/10/2026 | Implementação (LC-007) | IA | Gerou a vitrine (API com abas, ordenação, cursor e contagens; tela com abas, cards e contagem regressiva pela hora do servidor), com testes; rodou lint, typecheck, testes, build e a vitrine no navegador |
| 23/10/2026 | Implementação (LC-008) | Eu | Pedi para seguir com o LC-008 e revisei o resultado |
| 23/10/2026 | Implementação (LC-008) | IA | Gerou a tela de novo lote (busca no catálogo, seleção da obra, formulário com validação em reais e datas locais, erros por campo) e o ajuste de CSP para as miniaturas, com testes; rodou lint, typecheck, testes, build e o fluxo no navegador |
| 25/10/2026 | Direcionamento (LC-008) | Eu | Autorizei continuar os cards, respeitando a janela de uma hora para publicação e o uso de PostgreSQL descartável nas validações locais |
| 25/10/2026 | Implementação e validação (LC-008) | IA | Corrigiu a busca para ocultar resultados antigos quando a consulta é apagada e evitar busca com consulta curta, adicionou uma regressão para consulta apagada e ajustou o encaminhamento do asset para preservar cache imutável no Windows. Revalidou lint, typecheck, 277 testes e build; a revisão de diff não encontrou achados pendentes. A execução de navegador, a busca na API real do museu e os checks de CI continuam pendentes |

## Como conduzo a implementação assistida

Eu organizo o trabalho por requisitos, cards e dependências: leio as specs, escolho a ordem e o
escopo, pesquiso alternativas quando há decisão técnica, e dou instruções e contexto para a IA
seguir um caminho. A IA auxilia na implementação, documentação e execução de verificações; uso os
resultados e as revisões disponíveis para decidir os ajustes e o próximo passo. O registro acima
descreve também tarefas executadas pela IA, para não omitir essa assistência. Cada resultado é
relatado com o que foi verificado e com o que continua pendente; uma execução local não é tratada
como evidência de CI, deploy ou validação externa.
