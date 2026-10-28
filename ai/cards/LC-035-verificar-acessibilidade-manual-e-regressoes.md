# LC-035 — Verificar acessibilidade manual e regressões

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 4–7 h |
| Depende de | LC-030, LC-031, LC-032 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Complementar LC-021 com validação manual de teclado, leitor de tela e mobile em temas claro e escuro.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/features/showcase/, apps/web/src/features/lotRoom/, apps/web/src/features/audit/, apps/web/src/components/ e apps/web/src/styles.css.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Teste teclado e foco, nomes/estados anunciados por leitor de tela e viewport mobile na vitrine, sala e auditoria.
- Cubra temas claro e escuro, erros, reconexão e feedback de cópia, registrando navegador/tecnologia assistiva.
- Complementa LC-021; não substituir teste automático existente nem declarar conformidade sem evidência.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/showcase/`, `apps/web/src/features/lotRoom/`, `apps/web/src/features/audit/`, `apps/web/src/components/`, `apps/web/src/styles.css`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Teclado permite alcançar controles e foco visível na vitrine, sala e auditoria; modais/erros não prendem foco indevidamente.
- [ ] Leitor de tela anuncia rótulo, estado, preço/erro e feedback de cópia; fluxos são verificados em tema claro/escuro.
- [ ] Viewport mobile documenta zoom/reflow e ação principal sem sobreposição; achados têm passos e ambiente reproduzíveis.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Node 22; executar rtk pnpm --filter @leilao/web test para regressões focadas, depois rtk pnpm test, rtk pnpm lint e rtk pnpm typecheck conforme AGENTS.md. Registrar manualmente navegador, leitor de tela, viewport, passos e achados; E2E se aplicável: rtk pnpm test:e2e.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: [docs/portfolio/lc035-acessibilidade.md](../../docs/portfolio/lc035-acessibilidade.md). Teclado, foco, reflow em 320 px e celular em 390 × 844 verificados nos temas claro e escuro; ajuste de CSS aplicado. O teste com leitor de tela real não foi executado.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
