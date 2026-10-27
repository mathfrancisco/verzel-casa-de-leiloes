# LC-037 — Criar laboratório local com fixture de auditoria

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P2 opcional |
| Épico / janela | Portfólio · Posterior; somente após escolha explícita |
| Esforço estimado | 4–8 h |
| Depende de | LC-032 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-08 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Criar ambiente local descartável para explorar auditoria usando fixture, condicionado à seleção futura deste escopo.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/api/src/application/audit.ts, apps/api/src/application/ (fixtures/testes existentes) e configuração local descartável a definir.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Antes de iniciar, confirmar seleção explícita futura deste item e definir fixture local descartável.
- Isolar dados/segredos, documentar reset local e provar que não há conexão a banco de produção.
- Sem essa escolha futura, card permanece TODO e não entra na fila de execução.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/api/src/application/audit.ts`, fixtures/testes de auditoria existentes; configuração local descartável somente após seleção.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Executar antes da seleção explícita futura do usuário.

## Critérios de aceite

- [ ] Fixture reproduz resultado de auditoria sem conectar a banco de produção ou carregar segredo real.
- [ ] Setup/reset afeta somente ambiente local descartável e teste prova isolamento; instruções distinguem fixture de dado real.
- [ ] Sem escolha futura explícita, nenhuma implementação inicia e status permanece TODO.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Implementação só começa após escolha futura explícita; sem ela o status continua TODO.
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
