# Uso de IA no projeto

O teste permite o uso de IA e pede que eu informe onde e como a usei, além do que
revisei ou ajustei. Atualizo este registro durante o desenvolvimento e o resumo
no formulário de envio. O fluxo de trabalho está descrito em
[`../ai/README.md`](../ai/README.md).

## Meu papel no processo

Eu conduzo o trabalho e respondo pelas decisões. Leio o desafio, pesquiso
alternativas, defino prioridades e instruo o próximo passo com base nos
requisitos, nas regras de negócio, nas especificações e nos cards. Quando a IA
apoia uma etapa, uso suas respostas como insumo: avalio o caminho proposto,
peço ajustes ou esclarecimentos e decido o que incorporar ao projeto.

Na implementação, avanço card a card. A IA pode ajudar a produzir código,
documentação e testes, além de executar verificações quando solicitado. O
registro abaixo distingue essa assistência da minha condução e informa a
revisão humana que ficou registrada para cada fase. A execução de um comando
pela IA, por si só, não substitui a avaliação do resultado.

## Registro

| Data | Etapa | Minha orquestração e decisões | Apoio de IA registrado | Revisão registrada |
|---|---|---|---|---|
| 22/10/2026 | Planejamento | Li o PDF do desafio, passei os tópicos para a IA, criei o repositório no GitHub, revisei o plano e o checklist e limitei esta etapa ao planejamento. | Rascunhou o plano de execução, o checklist de requisitos e a estrutura inicial do repositório a partir das minhas orientações. | Revisei o plano e o checklist. |
| 22/10/2026 | Documentação | Conduzi arquitetura, modelagem, regras e requisitos; pedi documentação adicional; comparei Vite com Next.js e NestJS com Express e Fastify; escolhi Fastify e defini a organização de specs, cards e `AGENTS.md`. | Preparou requisitos, regras de negócio, arquitetura com diagramas, modelagem, specs, cards e `AGENTS.md`. | Revisei o material gerado e pedi complementos. |
| 22/10/2026 | Implementação (LC-001) | Li as specs e os cards e iniciei pelo monorepo, usando a IA para ajuda e esclarecimentos durante o desenvolvimento. | Preparou a estrutura do monorepo, configurações de TypeScript, ESLint e Prettier, `/health`, página inicial, helpers de dinheiro e códigos de erro; executou lint, typecheck, testes e build. | A condução da etapa foi registrada; o registro original não detalha uma revisão específica do resultado. |
| 22/10/2026 | Implementação (LC-002) | Defini uma branch por card, commit local e push somente quando eu solicitar; conduzi a etapa LC-002. | Preparou o Compose do Postgres, schema e migrations iniciais com Drizzle, validação de variáveis de ambiente e `/ready`, com testes de integração; executou lint, typecheck, testes e build. | Revisei o resultado, conforme registrado para esta etapa. |
| 22/10/2026 | Implementação (LC-003) | Direcionei a continuidade para LC-003. | Preparou cadastro, login, logout e autorização por papel na API e nas telas, com testes; executou lint, typecheck, testes, build e o fluxo no navegador. | Revisei o resultado, conforme registrado para esta etapa. |
| 22/10/2026 | Deploy | Pesquisei provedores, pedi alternativas além das primeiras sugestões, conferi a página oficial do plano Sandbox do Northflank e escolhi esse provedor. | Comparou Railway, Render com Neon, Fly.io, Koyeb, Northflank, Cloud Run, Oracle Cloud e VPS com fontes, considerando WebSocket, disponibilidade contínua e banco que não expira. | Conferi a informação do plano na página oficial e tomei a decisão de provedor. |
| 22/10/2026 | Implementação (LC-004) | Conduzi a continuidade do desenvolvimento por card. | Preparou Dockerfile, CI do GitHub Actions, serviço `app` no Compose, API servindo o site, eco de WebSocket e guia de deploy no Northflank; executou testes, build da imagem e o fluxo no navegador contra o container. | A revisão humana desta fase não foi detalhada separadamente no registro original. |
| 22/10/2026 | Implementação (LC-005) | Direcionei a continuidade para LC-005. | Preparou o catálogo da API do Art Institute com cache, circuit breaker, retry e timeout, o catálogo fake e as rotas de busca, com testes; executou lint, typecheck, testes e build. | Revisei o resultado, conforme registrado para esta etapa. |
| 22/10/2026 | Implementação (LC-006) | Direcionei a continuidade para LC-006. | Preparou a criação de lote com snapshot do item, imagem no banco, gênese da cadeia e pseudônimos; tabelas de lotes e cadeia com trigger append-only; rotas de lote e imagem; e testes. Executou lint, typecheck, testes, build e um teste com a API em execução. | Revisei o resultado, conforme registrado para esta etapa. |
| 22/10/2026 | Implementação (LC-007) | Direcionei a continuidade para LC-007. | Preparou a vitrine com abas, ordenação, cursor e contagens na API, além da tela com cards e contagem regressiva pela hora do servidor; executou lint, typecheck, testes, build e a vitrine no navegador. | Revisei o resultado, conforme registrado para esta etapa. |
| 23/10/2026 | Implementação (LC-008) | Direcionei a continuidade para LC-008. | Preparou a tela de novo lote com busca no catálogo, seleção da obra, validação de valores em reais e datas locais, erros por campo e ajuste de CSP para miniaturas; executou lint, typecheck, testes, build e o fluxo no navegador. | Revisei o resultado, conforme registrado para esta etapa. |
| 23/10/2026 | Retomada e implementação (LC-009) | Pedi para localizar o projeto após LC-008 e continuar os cards. Aprovei alinhar a spec do hash de LC-006 com a descrição, a categoria e o snapshot do lote, e orientei investigar o Northflank após LC-009. | Implementou carteira e fluxos relacionados na API e no frontend. Uma revisão técnica assistida identificou e corrigiu pontos de isolamento de cache e retry. | Verificações locais da API, do pacote compartilhado e da aplicação web, além de lint, typecheck e build, passaram. A persistência da chave em novas tentativas também foi revalidada; o deploy de LC-009 ainda não foi realizado. |
