# Ledger de execução do pacote de portfólio

- Plano: [profissionalização do portfólio](../plano-profissionalizacao-portfolio-2026-10-27.md).
- Branch local: `feat/portfolio-essenciais`; baseline: `a5b3afa` (`origin/main`).
- Escopo autorizado: sete cards P0, um por vez, na ordem LC-024 → LC-026 → LC-025 → LC-028 → LC-029 → LC-034 → LC-036. Após LC-024, LC-025 e LC-026 são independentes entre si.
- Modelo de trabalho: preservar o WIP existente no branch local; delegações, se usadas, devem ser limitadas a arquivos e critérios claros conforme `AGENTS.md`.
- LC-024: concluído como auditoria documental dos 23 cards legados; revisão independente aprovada. Status legado não foi promovido.
- LC-026: concluído após aprovação do coordenador e revisão independente sem achados. Lint corrigido ao excluir `.claude/worktrees/**`; build e `pnpm test` passaram. `pnpm test:e2e` passou 27/27 (5,6 min; fluxo principal 5,2 min), com annotation local de 240 ms para superação; orçamento de 5 s não comprova SLA `<1 s`. Relatório: [lc026-diagnostico.md](lc026-diagnostico.md). Nenhuma alteração de produto.
- LC-025: em andamento; próximo card, para validar demo/revisão publicada e smoke autenticado. Deploy baseline run 7367652915 passou em `a5b3afa`; não equivale a confirmação dos fluxos após reset.
- Ambiente reportado: Node 22.16 em `../work/node.exe` e pnpm 10.28 em `../work/pnpm.cmd`. Typecheck terminou com exit code 0. Lint reportou 24 erros `no-undef`, todos em cópias preexistentes sob `.claude/worktrees/**`; diagnóstico e resolução ficam no LC-026.
- CI de baseline: run [40565064515](https://github.com/mathfrancisco/verzel-casa-de-leiloes/actions/runs/40565064515) `success` para SHA `a5b3afafcdae8010f837fe406eb170107211dd12`.
- Limites operacionais: sem reset de produção ou envio de formulário/post. Smoke autenticado pós-reset em produção permanece pendente; CI baseline não comprova revisão publicada atual.
- 28/10/2026, LC-025: smoke autenticado em produção com duas sessões isoladas. Encerramento e comprovante ficaram pendentes por causa da janela do lote. Registro: [lc025-smoke-producao.md](lc025-smoke-producao.md).
- 28/10/2026, LC-028 e LC-029: PR #36 mergeada (`d9cc1d5`). Em produção, `/favicon.svg` responde 200 e as tags OG estão no HTML.
- 28/10/2026, LC-034: capturas e vídeo gravados localmente com FakeCatalog. Registro: [lc034-midia.md](lc034-midia.md).
- 28/10/2026, LC-036: pacote de publicação em [pacote-publicacao.md](pacote-publicacao.md). Nada foi enviado.
- 28/10/2026, LC-033: estudo de caso em [../estudo-de-caso.md](../estudo-de-caso.md). Os testes citados passaram: integração 46/46 e auditVerify 22/22.
