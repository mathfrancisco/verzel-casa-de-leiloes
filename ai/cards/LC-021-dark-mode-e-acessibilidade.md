# LC-021 — Adicionar dark mode e revisar acessibilidade e responsividade

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E6 Qualidade e entrega · Dia 6 |
| Depende de | LC-013, LC-015, LC-016, LC-017 |
| Requisitos | RF-19, RNF-11 |
| Regras | — |
| Specs | SP-09 |

## Objetivo

Interface agradável nos dois temas, utilizável no celular e por teclado/leitor de tela.

## Escopo

- Tema por classe `dark`, alternador, persistência, script anti-flash
- Revisão de contraste AA, foco visível, rótulos, `aria-live`, layout ≥ 360 px
- Checagem automatizada com `@axe-core/playwright` nas telas principais

## Fora do escopo

- —

## Critérios de aceite

- [ ] Nenhuma violação crítica do axe nas telas principais, nos dois temas
- [ ] Tema persiste sem flash

## Testes obrigatórios

- CT-09-05
- Axe nas rotas `/`, `/lotes/:id`, `/carteira`, `/auditoria/:id`, `/painel`

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
