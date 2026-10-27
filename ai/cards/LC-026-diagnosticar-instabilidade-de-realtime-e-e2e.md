# LC-026 — Diagnosticar instabilidade de realtime e E2E

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 3–6 h |
| Depende de | LC-024 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-06, SP-09, SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Identificar a causa demonstrada de warnings/falhas em tempo real e E2E e corrigir somente o defeito comprovado.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/lib/realtime.ts, apps/web/src/lib/RealtimeLifecycle.tsx, apps/web/src/lib/realtime.test.tsx, e2e/ e apps/web/src/features/lotRoom/LotRoomPage.tsx.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Reproduza warnings/falhas com comando e saída capturados, distinguindo warning de falha funcional.
- Inspecione ciclo de vida Socket.IO, sequência, teardown e testes E2E antes de propor mudança.
- Corrija apenas a causa reproduzida; não aumente timeout/retry às cegas e registre quando não houver defeito comprovado.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/lib/realtime.ts`, `apps/web/src/lib/RealtimeLifecycle.tsx`, `apps/web/src/lib/realtime.test.tsx`, `e2e/`, módulo de realtime API a localizar antes de edição.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Aumentar timeout/retry sem diagnóstico reproduzível ou tratar warning isolado como bug.

## Critérios de aceite

- [x] Lint reproduzido com comando e saída; observações de browser isoladas não foram rotuladas como defeito funcional.
- [x] Causa comprovada dos 24 erros de lint foi corrigida no escopo de ignores; nenhum timeout/retry foi alterado.
- [x] Testes web/API existentes cobrem reconnect, cleanup e ordenação; suites passaram. E2E completo passou e não foi usado como única prova.
- [x] Escopo e arquivos-alvo conferidos; novo relatório identificado em `../../docs/portfolio/lc026-diagnostico.md`.
- [x] Evidências, contexto e limites documentados; o critério de `<1 s` segue mais estrito que o teto E2E de 5 s.
- [x] Regras do projeto, segurança, privacidade e comportamento foram preservados; nenhuma alteração de produto.
- [x] Causa do lint corrigida; observações de WebSocket e smoke não demonstraram defeito de realtime.
- [x] Comandos e resultados registrados sem atribuir causa não demonstrada aos avisos transitórios.

## Testes e comandos futuros

- Node 22; comandos futuros: teste focado do pacote alterado (`rtk pnpm --filter @leilao/web test` ou `rtk pnpm --filter @leilao/api test`), depois `rtk pnpm test`, `rtk pnpm lint` e `rtk pnpm typecheck` conforme AGENTS.md; E2E aplicável: `rtk pnpm test:e2e`.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência coordenada Node 22.16, banco local descartável e `FakeCatalog`: `pnpm test` passou (shared 8 arquivos/114 testes, web 31/149, API 35/297); `pnpm test:e2e` passou com 27 testes em ~5,6 min, incluindo fluxo final de ~5,2 min. A annotation do fluxo registrou 240 ms entre lance e aviso “superado” numa execução local; isso é uma amostra, e o teto E2E continua 5 s frente ao requisito `<1 s`. `pnpm lint` e build terminaram com exit code 0. Primeira tentativa de testes bloqueada por EACCES no DB local; primeira tentativa E2E bloqueada por pacote ausente, restaurado com `pnpm install --frozen-lockfile` sem alteração do lockfile. Detalhes e logs em `../../docs/portfolio/lc026-diagnostico.md` e `../work/portfolio-e2e-rerun.log` (fora do checkout).

## Definição de pronto

- [x] Critérios aceitos com evidência verificável e limitações descritas.
- [x] Gates aplicáveis registrados com saídas reportadas pelo coordenador; os logs externos estão referenciados como externos.
- [x] Quadro e checklist atualizados com os resultados desta investigação.
- [x] Status DONE após aprovação do coordenador e revisão independente sem achados.
