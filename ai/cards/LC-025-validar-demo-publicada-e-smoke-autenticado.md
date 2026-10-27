# LC-025 — Validar demo publicada e smoke autenticado

| Campo | Valor |
|---|---|
| Status | DOING |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 3–5 h |
| Depende de | LC-024 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09, SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Executar smoke manual autenticado após reconciliar evidências, registrando revisão, ambiente e limites; complementar LC-023 sem reenviar formulário.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): e2e/ e playwright.config.ts (verificar alvos atuais); apps/web/src/features/auth/LoginPage.tsx, apps/web/src/features/lotRoom/LotRoomPage.tsx e LC-023 (leitura).
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Confirme revisão implantada, URL e disponibilidade sem revelar credenciais; use contas existentes e login normal.
- Faça fluxo guiado com dois contextos isolados, catálogo real somente no smoke manual e testes normais com FakeCatalog.
- Registre passos, resultado, data, revisão e limitações; se uma ação puder afetar dados reais, pare e documente.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `e2e/`, `playwright.config.ts`, `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/features/lotRoom/LotRoomPage.tsx`, `apps/web/src/features/wallet/WalletPage.tsx`, `apps/web/src/features/receipt/ReceiptPage.tsx`; confirmar alvos no estado atual.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Resetar banco de produção, expor segredos ou reenviar formulário de LC-023.

## Critérios de aceite

- [ ] Dois contextos isolados completam login/logout e um lance válido seguido de superação, sem misturar cookies/sessões.
- [ ] Fluxo demonstra rejeição de lance inválido e leitura de carteira; testar encerramento/comprovante somente se estado e janela do lote permitirem. Se não ocorrer, registrar como pendente e não declarar smoke integral.
- [ ] Indisponibilidade do catálogo externo é anotada como limite, sem alegar sucesso nem bloquear falsamente o restante do smoke.
- [ ] Registro inclui URL, data, SHA/revisão observada, variável de ambiente sem valor secreto e separa smoke manual real de testes FakeCatalog; não reseta DB.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
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
