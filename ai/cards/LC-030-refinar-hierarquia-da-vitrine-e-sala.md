# LC-030 — Refinar hierarquia da vitrine e sala

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 6–10 h |
| Depende de | LC-027 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Avaliar e melhorar a hierarquia visual da vitrine e da sala preservando comportamento existente.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/features/showcase/ShowcasePage.tsx, LotCard.tsx, apps/web/src/features/lotRoom/LotRoomPage.tsx, LotSummary.tsx e apps/web/src/styles.css.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Mapeie componentes/estilos da vitrine e sala existentes e compare com o plano antes de editar.
- Preserve filtros, regras de lances, conteúdo, fallback de imagem, responsividade e hierarquia de preço.
- Faça alterações localizadas; não recrie um layout que já atende ao objetivo.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/showcase/ShowcasePage.tsx`, `LotCard.tsx`, `apps/web/src/features/lotRoom/LotRoomPage.tsx`, `LotSummary.tsx`, `apps/web/src/styles.css`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] A inspeção registra diferença concreta entre hierarquia atual e objetivo antes de editar; se já atende, justifica não mudar.
- [ ] Vitrine preserva busca/filtros/abas e informa preço/status; sala mantém controles/erros e preço claramente legível.
- [ ] Imagens ausentes usam fallback, mobile não perde ação principal e nenhum requisito/regra de lance muda.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Node 22; comandos futuros: teste focado do pacote alterado (`rtk pnpm --filter @leilao/web test` ou `rtk pnpm --filter @leilao/api test`), depois `rtk pnpm test`, `rtk pnpm lint` e `rtk pnpm typecheck` conforme AGENTS.md; E2E aplicável: `rtk pnpm test:e2e`.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: inspeção em `docs/portfolio/lc030-inspecao.md`; `pnpm --filter @leilao/web test` 32 arquivos / 156 testes passando, `pnpm typecheck` ok; `pnpm lint` só falha em Prettier de `features/auth/DemoAccounts.tsx` e `LoginPage.test.tsx` (herdado do LC-027, fora do escopo). E2E e checagem visual em 390 px não executados.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
