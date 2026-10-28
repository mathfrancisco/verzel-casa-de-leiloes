# LC-027 — Oferecer acesso contextual à demo e onboarding

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 4–6 h |
| Depende de | LC-024 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-01, SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Tornar os caminhos de entrada e os papéis de demonstração claros usando autenticação normal e sessões independentes.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/features/auth/LoginPage.tsx, RegisterPage.tsx, apps/web/src/components/Layout.tsx e apps/web/src/lib/access.ts.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Inspecione login, registro e navegação atuais antes de propor onboarding; reutilize as contas existentes.
- Demonstre dois usuários em sessões isoladas, sem bypass, credenciais embutidas ou compartilhamento de sessão.
- Se for preciso ambiente demo, usar configuração isolada; nunca expor credenciais não-demo.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/features/auth/RegisterPage.tsx`, `apps/web/src/features/showcase/IntroStrip.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/lib/access.ts`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Pessoa entra pela autenticação normal, distingue papel participante/leiloeiro e encontra primeiro passo sem informação privilegiada.
- [ ] Duas sessões separadas mantêm identidade e cookies independentes; nenhum endpoint ou UI ignora autorização.
- [ ] Conta demonstrativa/documentação usa apenas ambiente isolado e nunca expõe credenciais não-demo.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Node 22; comandos futuros: teste focado do pacote alterado (`rtk pnpm --filter @leilao/web test` ou `rtk pnpm --filter @leilao/api test`), depois `rtk pnpm test`, `rtk pnpm lint` e `rtk pnpm typecheck` conforme AGENTS.md; E2E aplicável: `rtk pnpm test:e2e`.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: Vitest web 32 arquivos / 155 testes passando (inclui `LoginPage.test.tsx`); lint e typecheck sem erros (Node 24 local; o engine pede 22). E2E não executado; sem verificação visual em 390px.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
