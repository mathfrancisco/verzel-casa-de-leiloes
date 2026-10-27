# LC-032 — Explicar auditoria em camadas

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P1 |
| Épico / janela | Portfólio · Posterior (2–3 semanas) |
| Esforço estimado | 4–7 h |
| Depende de | LC-024 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-08, SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Tornar resultado e limites da auditoria compreensíveis mantendo verificador, hash e feedback de cópia.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/features/audit/AuditPage.tsx, AuditPage.test.tsx, apps/api/src/application/audit.ts e docs/ de auditoria existentes.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Preserve a verificação criptográfica existente e seus vetores/testes; apresente resultado em camadas compreensíveis.
- Explique escopo, chave API pública, truncamento e condições em que a conclusão não pode ser garantida.
- Mantenha ação de copiar hash com feedback acessível e evite afirmar autenticidade além do que o verificador prova.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/audit/AuditPage.tsx`, `apps/web/src/features/audit/AuditPage.test.tsx`, `apps/api/src/application/audit.ts`, `ai/specs/SP-08-auditoria.md`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Resultado distingue cadeia íntegra, inválida e inconclusiva, cobrindo erro de rede e chave malformada sem exibir falso estado íntegro.
- [ ] Verificador preserva e reporta o primeiro check falho; chave pública da API e truncamento são limites explícitos, sem promessa de identidade/autenticidade.
- [ ] A ação copiar hash conserva valor copiado e anuncia feedback acessível; erro de cópia mantém alternativa selecionável.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Produto: rtk pnpm --filter @leilao/web test; rtk pnpm test; rtk pnpm lint; rtk pnpm typecheck. Primeiro executar testes focados da auditoria, depois gates completos exigidos por AGENTS.md antes de DONE.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência inicial: **Não executado; card criado para execução futura.**

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
