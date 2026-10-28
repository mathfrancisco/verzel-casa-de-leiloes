# LC-039 — Definir observabilidade enxuta

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P2 opcional |
| Épico / janela | Portfólio · Posterior; somente após escolha explícita |
| Esforço estimado | 3–5 h |
| Depende de | LC-026, LC-031 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-06, SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Desenhar observabilidade com privacidade, custo e retenção explícitos antes de qualquer implementação.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/lib/realtime.ts, apps/web/src/lib/RealtimeLifecycle.tsx, configuração/logs do API e documentação de custo/retenção a criar somente após decisão.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Antes de iniciar, confirmar seleção explícita futura e estimar custo, retenção, acesso e operação.
- Definir eventos mínimos sem payloads, saldos, identidade ou segredos; revisar redaction antes de coletar.
- Não adicionar SaaS pago automaticamente; entregar desenho e decisão de escopo antes de implementar.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/lib/realtime.ts`, `RealtimeLifecycle.tsx`, configuração/logs API e documentação de performance existente.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Executar antes da seleção explícita futura do usuário.

## Critérios de aceite

- [ ] Proposta define eventos mínimos, retenção, custo e acesso antes de qualquer coleta/implementação.
- [ ] Esquema exclui payloads, saldos, identidade e segredos; redaction e risco de logs são demonstráveis.
- [ ] Nenhum SaaS pago ou coleta é habilitado automaticamente; custo/retention sem aprovação explícita impede implementação.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Implementação só começa após escolha futura explícita; sem ela o status continua TODO.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Desenho documental: rtk git diff --check; revisar manualmente esquema de eventos, redaction, retenção, acesso e estimativa de custo antes de implementação.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência inicial: **Não executado; card criado para execução futura.**

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
