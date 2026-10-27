# LC-024 — Reconciliar evidências e quadro legado

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 2–3 h |
| Depende de | — |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Auditar status, links e evidências existentes sem alterar status herdados; registrar lacunas verificáveis.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): ai/cards/LC-001 a LC-023 (leitura), ai/cards/README.md, docs/CHECKLIST.md e evidências já existentes (leitura).
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Compare cada status herdado com evidência local disponível: código, logs, checks, deploy e links datados.
- Separe evidência observada, afirmação documental, lacuna e item não verificável; não invente CI nem converta status sem prova.
- Registre divergências e proposta de correção para decisão explícita; a auditoria não autoriza editar status dos cards antigos.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `ai/cards/README.md`, cards LC-001..LC-023 (leitura), `docs/CHECKLIST.md` (leitura), fontes de evidência referenciadas no plano.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [x] Toda divergência inclui referência verificável, data/contexto e ação proposta; sem evidência, a conclusão permanece desconhecida. Registro em `../../docs/portfolio/lc024-evidencias.md`.
- [x] A tabela e os cards legados ficam sem alteração de status automática; CI/deploy só são declarados quando fonte observável comprova.
- [x] Links e dependências dos cards novos são resolvíveis, e nenhuma dependência legada é removida.
- [x] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [x] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [x] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [x] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [x] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Documentação/auditoria: `rtk git diff --check` e revisão manual de links locais, status e referências de evidência passaram em 27/10/2026; não rodar testes de produto para este card documental.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência desta execução: `docs/portfolio/lc024-evidencias.md`, com tabela de 23 cards, limites por evidência e run de CI do SHA auditado.

## Definição de pronto

- [x] Critérios aceitos com evidência verificável e limitações descritas.
- [x] Gates documentais aplicáveis registrados com saída real; testes de produto não se aplicam a esta auditoria.
- [x] Atualizações no quadro e checklist apenas apontam para evidência nova, sem alterar requisitos/status legados.
- [x] Auditoria revisada independentemente e aprovada; status atualizado para DONE.
