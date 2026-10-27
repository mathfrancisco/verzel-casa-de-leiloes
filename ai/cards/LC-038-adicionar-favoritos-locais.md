# LC-038 — Adicionar favoritos locais

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P2 opcional |
| Épico / janela | Portfólio · Posterior; somente após escolha explícita |
| Esforço estimado | 3–6 h |
| Depende de | LC-030 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Permitir favoritos persistidos apenas no navegador, condicionado à seleção futura e sem prometer sincronização.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/src/features/showcase/ShowcasePage.tsx, LotCard.tsx, showcase.ts e testes existentes.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Antes de iniciar, confirmar seleção explícita futura deste item; desenhar interação e persistência curta.
- Persistir somente IDs locais com validação, tratamento de storage indisponível e migração/limpeza segura.
- Não criar API, sincronização entre dispositivos, notificações ou alteração de regras de leilão.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/src/features/showcase/ShowcasePage.tsx`, `LotCard.tsx`, `showcase.ts`, testes existentes.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Executar antes da seleção explícita futura do usuário.

## Critérios de aceite

- [ ] Favoritos guardam somente IDs locais e sobrevivem a reload; storage inválido/indisponível tem fallback sem quebrar vitrine.
- [ ] Ação adicionar/remover tem estado e rótulo acessível, sem mudar preço, filtro ou regras de lance.
- [ ] UI/documentação declara persistência só neste navegador; nenhuma chamada/API promete sincronização.
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
