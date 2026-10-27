# LC-026 — Diagnóstico de lint, realtime e E2E

**Data:** 27/10/2026 · **Branch:** `feat/portfolio-essenciais` · **Baseline:** `a5b3afa`

## Lint: causa reproduzida e correção de escopo

Antes da alteração, `rtk pnpm lint` reproduziu 24 erros `no-undef` em seis cópias de `apps/web/public/theme-init.js`, todas dentro de `.claude/worktrees/agent-*`. Cada cópia reportava quatro identificadores globais de navegador (`localStorage`, `window` e `document`); eram worktrees auxiliares preexistentes, fora do código-fonte deste checkout. O lint não alcançava a etapa Prettier por causa do `&&`.

Adicionei `.claude/worktrees/**` à lista de ignores do ESLint e ao `.prettierignore`. A regra e cobertura do código versionado continuam habilitadas. O objetivo é excluir checkouts auxiliares aninhados dos verificadores do repositório; nenhum conteúdo de worktree foi removido ou editado.

## Realtime e cobertura já existente

- O cliente mantém um singleton same-origin com `autoConnect: false`. `RealtimeLifecycle` instala listeners de conta, trata `connect` e visibilidade, invalida snapshots e remove os listeners ao desmontar. Quando a sessão muda, `refreshRealtimeSession` desconecta e abre novo handshake se o socket estava conectado/ativo.
- `useLotChannel` entra na sala, reentra em `connect`, sai no cleanup, invalida snapshots após ack positivo e após a aba voltar ao primeiro plano. Lances com `seq` menor/igual ao maior já exibido são ignorados.
- `apps/web/src/lib/realtime.test.tsx` usa socket mockado para cobrir conexão única, mudança de sala, reconexão, visibilidade offline/online, deduplicação por `seq`, ack do join, mudança de sessão e cleanup dos listeners/leave.
- `apps/api/test/integration/realtime.test.ts` cobre integração Socket.IO: join/leave ordenados mesmo com lookup atrasado; eventos de lance e outbid por sala pessoal; recovery de `bid.outbid` após queda curta do transporte; sala pessoal privada; transação com rollback sem emissão. São verificações distintas da suite E2E.
- `e2e/fluxo-completo.spec.ts` executa criação, disputa entre contextos Ana/Bruno, aviso de superação sem recarga, lances recusados, encerramento, comprovante e auditoria. A medição de outbid tem teto de 5 s (`OUTBID_CEILING_MS`), apesar de CT-06-06 definir expectativa inferior a 1 s. Isso é uma lacuna entre critério e orçamento do teste; não prova falha funcional. O smoke de produção de 26/10 usou Ana e Bruno na mesma sessão, portanto não observou superação sem recarga; o ensaio local de 27/10 em sessões separadas observou o aviso, sem substituir prova no deploy atual.

## Conclusão e limites

A causa do lint foi a enumeração inadvertida de worktrees auxiliares aninhados; a exclusão é cirúrgica e não altera regras de lint para os arquivos do projeto. A leitura do ciclo de vida e dos testes encontrou cobertura explícita de reconnect, cleanup e ordenação, sem falha reproduzida de produto nesta etapa. As observações de smoke em contextos diferentes não autorizam concluir que realtime está defeituoso.

O limite E2E de 5 s não valida sozinho o requisito de `< 1 s`. A suíte E2E passou e registrou uma annotation local de 240 ms, uma amostra de execução que não estabelece SLA. Também permanece necessária confirmação dos fluxos autenticados no deploy publicado, em LC-025.

## Evidência de execução coordenada

- Após a correção de lint, o coordenador executou as suítes com Node 22: shared, 8 arquivos/114 testes; web, 31 arquivos/149 testes; API, 35 arquivos/297 testes. Uma primeira tentativa ficou bloqueada por `EACCES` ao acessar o banco local; a repetição autorizada terminou com exit code 0. O log foi salvo fora do checkout em `../work/portfolio-tests.log` e não foi relido por esta auditoria.
- A primeira tentativa E2E não iniciou o fluxo por falta de `@fontsource-variable/inter` em `node_modules`, apesar de constar no manifest/lockfile. `pnpm install --frozen-lockfile` terminou com exit 0, restaurou um pacote e não alterou o lockfile. A repetição `pnpm test:e2e` terminou com exit 0: 27 testes passaram em 5,6 min; o fluxo completo demorou 5,2 min e registrou 240 ms entre o lance e o aviso de superação. Log fora do checkout: `../work/portfolio-e2e-rerun.log`. O primeiro bloqueio não foi falha funcional.
- O Vite registrou `ECONNRESET` entre testes de rotas, sem falha de teste; não há causa atribuída. Em observação Playwright local, `/api/auth/me` retornou 401 anônimo esperado, sem `pageerror`; o WebSocket abriu, fechou com código 1005 e abriu novamente após resolução da sessão. Isto não demonstra defeito nem estabelece que o comportamento se deva ao StrictMode.
- Build terminou com exit code 0. O deployment baseline run [7367652915](https://github.com/mathfrancisco/verzel-casa-de-leiloes/actions/runs/7367652915) passou para SHA `a5b3afafcdae8010f837fe406eb170107211dd12`; a URL pública foi observada em 19:00:30Z e os assets index coincidiram com o build local. Isso não substitui smoke autenticado pós-reset.
- Revisão independente terminou sem achados. LC-026 foi aprovado para `DONE`; LC-025 iniciou em seguida para validar demo publicada e smoke autenticado.
