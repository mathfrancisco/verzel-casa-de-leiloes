# LC-024 — Auditoria das evidências e do quadro legado

**Revisão:** 27/10/2026 · `feat/portfolio-essenciais` sobre `a5b3afa` (`origin/main`)  
**Escopo:** confronto documental dos cards LC-001–LC-023 com o quadro, checklist, documentos de smoke e código presente no checkout.  
**Resultado:** divergências e lacunas registradas; nenhum card legado teve seu status alterado por esta auditoria.

## Evidência de estado

- Checkout em `a5b3afa` (`feat/portfolio-essenciais`, `origin/main` na coleta). O README dos cards e os cards LC-024–LC-039 já estavam como alterações não commitadas; também havia `.claude/worktrees/` não rastreado. Foram preservados.
- O inventário do repositório contém código em `apps/api`, `apps/web` e `packages/shared`, specs SP-00–SP-10, testes Vitest/Playwright e workflow `.github/workflows/ci.yml`. A presença de código prova implementação presente nesse commit, não a publicação daquele conteúdo nem, sozinha, o aceite integral do card.
- A consulta `gh run list` falhou inicialmente com `error connecting to api.github.com`; seu resultado inicial foi desconhecido. Em nova consulta autorizada pelo coordenador, o run **40565064515** terminou `success` para `a5b3afafcdae8010f837fe406eb170107211dd12`: [execução do CI](https://github.com/mathfrancisco/verzel-casa-de-leiloes/actions/runs/40565064515). Isso prova o CI desse SHA, não a revisão atualmente servida pelo deploy. O workflow define lint, typecheck, testes, build e E2E com `CATALOG_PROVIDER=fake`.
- `docs/smoke-producao.md` contém um smoke de produção de 26/10 associado a `6597069` e ensaios locais de 27/10 (`2fbbb1d`, depois `4c00b3c`). O ensaio local cobriu duas sessões e consulta/criação via catálogo real; o documento ainda deixa pendente o fluxo autenticado em produção após o reset (lance, encerramento, comprovante e leiloeiro). Não inferir que o smoke local ocorreu no deploy.
- A documentação de checklist e vários cards cita evidências em `../work/*.log`. Esses arquivos ficam fora deste checkout e não foram relidos nesta auditoria; as alegações foram tratadas como registros documentais, não como saídas independentemente reproduzidas.
- Não houve execução de testes de produto, alteração de dados, seed, deploy ou reset de banco neste card documental.

## Confronto por card

| Card | Status registrado | Indicador local/documental encontrado | Limite da evidência | Encaminhamento proposto |
|---|---|---|---|---|
| LC-001 | REVIEW | Monorepo, apps e pacote shared estão presentes; README e checklist descrevem stack, build/testes e Node 22. | Não foi repetido setup em clone limpo nesta auditoria. | Manter REVIEW; vincular evidência reproduzível de instalação e gates se for necessário fechar. |
| LC-002 | REVIEW | Compose, migrations e schema existem; docs descrevem Postgres e inicialização. | Esta auditoria não iniciou uma base vazia nem validou `docker compose up`. | Manter REVIEW até evidência reproduzida de clone limpo/Compose. |
| LC-003 | REVIEW | Rotas e UI de autenticação estão no código; cards/checklist registram autorização por papel e integração histórica. | Evidências históricas não foram repetidas contra deploy atual. | Manter REVIEW; smoke autenticado atualizado em LC-025 pode informar a decisão. |
| LC-004 | DOING — texto histórico cita CI/deploy pendentes | Docker/workflow estão no repo; deploy público é descrito em `smoke-producao.md`; CI atual do SHA `a5b3afa` passou no run 40565064515. | Status do card e aceite estão antigos; SHA atualmente publicado e smoke da revisão publicada não foram confirmados. | Registrar a divergência; reconciliar depois com LC-025 e confirmação da revisão do deploy. Não mudar status aqui. |
| LC-005 | REVIEW — falta smoke real | ArticCatalog, FakeCatalog, fixtures e testes estão presentes; o card documenta cobertura fake e falha de acesso externo em 22/10. | Busca real foi registrada localmente em 27/10, mas não há evidência de busca/criação no deploy atual. | Manter REVIEW; separar validação do adaptador local da validação em produção e anexar evidência datada. |
| LC-006 | REVIEW | Criação de lote, snapshot, imagem e gênese aparecem no código/spec; o card contém testes e execução local documentados. | Smoke atual no deploy após reset permanece pendente no documento de produção. | Manter REVIEW; validar estado publicado junto do smoke autenticado. |
| LC-007 | REVIEW | Vitrine por fases, estados, contagens e testes são documentados no card e refletidos no código. | Não foi repetida navegação autenticada/anônima no deploy nesta auditoria. | Manter REVIEW; registrar smoke de leitura no ambiente/revisão confirmados. |
| LC-008 | DONE | Código de busca/criação existe; card identifica PR #9 e checks de PR/pós-merge 40248272220/40248403542. | Card registra que navegação e busca real no deploy ficaram pendentes; log independente citado está fora deste checkout. | Manter status; não confundir implementação integrada com smoke externo concluído. |
| LC-009 | DONE | Carteira e testes estão presentes; checklist/card registram cobertura de saldo e CI pós-merge 40258206330. | Não houve teste nesta auditoria nem verificação de carteira no deploy atual. | Manter status; usar smoke LC-025 para confirmação operacional, sem dinheiro real. |
| LC-010 | DONE | Verificador compartilhado, hash e assinatura estão no código; evidências de integração/local constam no card e checklist. | Auditoria documental não repetiu adulteração nem verifica confiança independente na chave. | Manter status; apresentar os limites criptográficos no README. |
| LC-011 | DONE | Motor transacional, regras de lance, anti-sniping e testes estão presentes; PR #11 é citada. | Parte das evidências de execução é referenciada por logs fora do checkout; não foi repetida. | Manter status; nova evidência de dois usuários pertence ao smoke LC-025. |
| LC-012 | DONE | Gateway realtime, salas e eventos existem; PR #12 e evidências de teste são citadas. | A divergência entre o smoke de produção com sessão compartilhada e ensaio local com duas sessões ainda precisa de prova no deploy. | Manter status; diagnóstico de reconexão/E2E fica no LC-026. |
| LC-013 | DONE | Sala e feedback de lances existem; PR #13 e execução E2E no run 40398010742 são citadas. | O smoke de 26/10 não observou superação sem recarga por usar uma sessão; o teste local posterior não substitui o deploy. | Manter status; validar em contextos isolados no LC-025. |
| LC-014 | DONE | Liquidação/worker/comprovante estão no código; PR #14, pós-merge 40354507447 e fluxo documentado em produção em 26/10 são citados. | Evidência publicada é de SHA antigo e lote específico; não prova estado após alterações posteriores/reset. | Manter status; renovar fluxo autenticado no deploy pelo LC-025. |
| LC-015 | DONE | Página/verificador de auditoria estão no código; PR #16 e smoke de auditoria íntegra com 7 checks em 26/10 são citados. | Não foram refeitos casos adulterados nem conferida revisão publicada atual. | Manter status; LC-032 pode melhorar apresentação sem trocar o verificador. |
| LC-016 | DONE | Rotas de comprovante/participações e UI estão presentes; card documenta teste local/browser e registra integração pendente naquele momento. | Prova local detalhada está em log fora deste checkout; deploy e SHA atuais não foram comprovados por esse log. | Manter status; conferir comprovante público no smoke LC-025. |
| LC-017 | DONE | Painel de resultados existe; card/checklist relatam validação com banco descartável e harness local. | O harness é local e não comprova painel no deploy atual. | Manter status; não alegar validação operacional sem smoke. |
| LC-018 | DONE | Cancelamento/estorno existem; card relata cenários de concorrência e checklist associa evidência a log externo. | Esta auditoria não executou os casos de estorno; log não foi lido. | Manter status; manter invariantes de transação e não usar dados de produção em teste. |
| LC-019 | DONE | Busca, filtros e paginação constam no código/card; integração e CI histórico são citados. | Playwright completo da URL/filtros era explicitamente ausente no registro do card. | Manter status; tratar essa ausência como limite, não como falha demonstrada do produto. |
| LC-020 | DONE | Seed e fixtures fake estão no repo; card registra testes e integração PR #21. | O seed é sensível ao tempo e pode produzir outra fase de lote depois; não foi executado nesta auditoria. | Manter status; só usar seed em DB descartável/local conforme AGENTS. |
| LC-021 | DONE | Tema claro/escuro e testes axe/Playwright estão descritos; integração PR #22 e pós-merge 40388949773 constam no card. | Evidência cobre axe/Chromium e não revisão manual com leitor de tela, conforme o próprio checklist. | Manter status; a verificação manual complementar pertence ao LC-035. |
| LC-022 | DONE | E2E e workflow estão presentes; PR #23/pós-merge 40400348575 e quatro execuções históricas são citadas no checklist. | Há flake ocasional documentado; os runs históricos não provam o CI atual. O run 40565064515 confirma apenas SHA `a5b3afa`. | Manter status; investigar qualquer falha reproduzível pelo LC-026, sem inflar timeout/retries. |
| LC-023 | REVIEW | README está presente; Checklist documenta formulário ainda não enviado e smoke pós-reset incompleto; card explicita que o envio cabe ao usuário. | Não foi inspecionado formulário nem confirmado deploy anônimo/SHA servida nesta auditoria; envio permanece pendente. | Manter REVIEW; LC-025 complementa smoke sem reenviar formulário; LC-029/036 melhoram pacote de apresentação. |

## Decisões e próximos passos

1. Preservar os status legados exatamente como registrados; esta auditoria não substitui a revisão de cada responsável.
2. Usar LC-025 para confirmar URL, revisão servida e fluxos autenticados em sessões isoladas. Nenhum CI, smoke local ou registro histórico prova a revisão atualmente implantada.
3. Usar LC-026 para investigar apenas warnings/falhas reproduzíveis de realtime/E2E. Os registros atuais mostram divergência de contexto e um aviso; não demonstram sozinhos defeito de realtime.
4. Distinguir checks atuais, históricos e externos no README: run 40565064515 é sucesso do CI no SHA `a5b3afa`; catálogo fake é usado em CI; consulta real local registrada não é smoke de produção.
5. Checklist contém linhas `[x]` com notas “pendente”, “aguardar” ou cobertura parcial. Uma revisão futura deve reconciliar os itens por requisito com evidência e limitações, preservando os critérios do PDF; nenhuma caixa foi alterada nesta auditoria.

## Validação deste card

- `rtk git diff --check` — saída vazia; concluído em 27/10/2026.
- Revisão manual dos links locais do relatório e das dependências dos cards novos — concluída em 27/10/2026.
- Testes de produto — não executados; não aplicáveis à auditoria documental.
- Estado do CI remoto consultado pelo coordenador: run 40565064515 `success`, SHA `a5b3afafcdae8010f837fe406eb170107211dd12`.
