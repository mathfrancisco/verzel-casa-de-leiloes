# LC-033 — Documentar estudo de caso de engenharia

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 3–5 h |
| Depende de | LC-024, LC-026 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-05, SP-06, SP-08 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Documentar concorrência, locks, eventos após commit e criptografia com referências verificadas ao código e às medições.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/api/src/application/bids.ts, apps/api/src/application/audit.ts, apps/api/src/http/ (inspecionar locks/commit), docs/ de performance existentes.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Ancore explicações em módulos e testes atuais para concorrência, locks, event-after-commit e cadeia criptográfica.
- Reutilize documentação/performance apenas com ambiente, condições e limitações visíveis.
- Não alegue throughput ou segurança absoluta; separar mecanismo implementado de propriedade provada.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/api/src/application/bids.ts`, `apps/api/src/application/audit.ts`, módulos HTTP/transação/evento a localizar, documentação de performance existente.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Cada explicação de lock/concorrência aponta para implementação e teste reais; eventos após commit descritos com ordem observada.
- [ ] Criptografia explica entrada/verificação e limites sem alegar imutabilidade absoluta ou prova de identidade.
- [ ] Medição de performance só aparece com comando, hardware/ambiente, volume e limitações; sem dados, não há alegação quantitativa.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Documentação: rtk git diff --check; verificar referências cruzadas a código/testes, medições e condições do experimento. Se código mudar, aplicar gates de AGENTS.md.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência inicial: **Não executado; card criado para execução futura.**

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
