# LC-031 — Distinguir conexão de sincronização

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 4–8 h |
| Depende de | LC-026, LC-030 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-06, SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Expor com precisão conexão realtime, sequência e atualidade do snapshot sem alterar a autoridade do servidor.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/lib/realtime.ts, RealtimeLifecycle.tsx, serverClock.ts e testes correspondentes já existentes.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Investigue lifecycle, heartbeat/snapshot e sequência existente; modele estados conectado, reconectando e snapshot atual.
- Proteja contra evento atrasado e estado obsoleto após reconnect, com cobertura de regressão focada.
- Servidor segue autoridade para dinheiro e horário do banco; UI não simula confirmação financeira.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/showcase/useLotChannel.ts` (alvo principal), `apps/web/src/lib/realtime.ts`, `apps/web/src/lib/RealtimeLifecycle.tsx`, `apps/web/src/lib/serverClock.ts`, `apps/web/src/lib/realtime.test.tsx`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Interface mostra conectado sem snapshot confirmado como NÃO sincronizado; conectado por si só nunca é apresentado como dado atual.
- [ ] Após reconnect, snapshot/seq atual prevalece sobre evento atrasado; estado antigo não reverte preço/saldo nem ordem.
- [ ] Preço e decisão financeira vêm do servidor; horário segue serverClock/banco, sem confirmação otimista enganosa.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Node 22; comandos futuros: teste focado do pacote alterado (`rtk pnpm --filter @leilao/web test` ou `rtk pnpm --filter @leilao/api test`), depois `rtk pnpm test`, `rtk pnpm lint` e `rtk pnpm typecheck` conforme AGENTS.md; E2E aplicável: `rtk pnpm test:e2e`.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência inicial: **Não executado; card criado para execução futura.**

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
