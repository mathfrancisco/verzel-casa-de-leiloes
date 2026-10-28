# LC-035 — Verificação de acessibilidade e regressões

- **Data:** 28/10/2026.
- **Branch:** `feat/interface-portfolio`, com os cards LC-027, LC-030, LC-031 e LC-032 aplicados.
- **Ambiente:** app local (Vite + API) com `CATALOG_PROVIDER=fake` e o banco de demonstração do
  seed. Navegador Chromium do Playwright em Windows 11.
- **Roteiro:** [`scripts/portfolio/a11y-manual.mjs`](../../scripts/portfolio/a11y-manual.mjs). Para
  repetir: `node scripts/portfolio/a11y-manual.mjs <lotId>`, com o app rodando em
  `127.0.0.1:5173`.
- **Complementa o LC-021.** Os testes com axe no E2E (`e2e/acessibilidade.spec.ts`) continuam
  valendo. A suíte E2E passou com 27 de 27 neste branch.

## Resultados (temas claro e escuro)

| Verificação | Resultado |
|---|---|
| Teclado na vitrine | 24 paradas na ordem lógica: link "Pular para o conteúdo", menu, tema, apresentação, abas, filtros e cards. O foco do card aparece no contorno do `article` (`.lot-card:focus-within`), não no link interno. Isso é intencional e está visível. |
| Teclado no login | Pular → menu → campos → "Entrar". As contas de demonstração ficam em `<details>` depois do formulário. |
| Teclado na sala | 29 paradas, todas com foco visível. O foco percorre valor, atalhos, "Dar lance" e "Auditar este lote", sem armadilha de foco. |
| Teclado na auditoria | 14 paradas, todas com foco visível, incluindo "Copiar hash" e o `<summary>` dos detalhes técnicos. |
| Estado de sincronização | Uma região `role="status"` com o texto "● Conectado e sincronizado", nos dois temas. |
| Erro de lance | A mensagem do servidor ("Você já está ganhando este lote.") aparece em `role="alert"`. |
| Copiar hash | `role="status"` anuncia "Hash copiado.". |
| Reflow em 320 px | Nenhuma rolagem horizontal na vitrine, na sala, na auditoria e no login. |
| Ação principal no celular (390 × 844) | **Antes:** "Dar lance" terminava em 890 px e exigia rolagem. **Depois do ajuste:** termina em 822 px, na primeira tela. Capturas: [claro](media/lc035-sala-390-light.png) e [escuro](media/lc035-sala-390-dark.png). |

## Correção feita neste card

- `apps/web/src/styles.css`: no layout de até 40rem, a imagem da sala passa a 2:1 e os três
  atalhos de incremento ficam numa linha. Isso coloca "Dar lance" na primeira tela em 390 × 844.

## Achados não corrigidos

- O campo `#bid-amount` não recebe `aria-invalid` nem `aria-describedby` quando o lance é
  recusado. O erro é anunciado pelo `role="alert"`, mas não fica associado ao campo.
- O botão de tema mostra "☀ Tema escuro" no tema claro. Vale revisar se o rótulo descreve a ação
  ou o estado.

## Não executado

- **Leitor de tela real** (NVDA ou VoiceOver). Os nomes, papéis e regiões ao vivo foram conferidos
  pelo DOM e pela árvore de acessibilidade, não por áudio. Até esse teste ser feito, o card fica em
  `REVIEW`.
- **Zoom do navegador a 200 %.** O reflow foi testado com viewport de 320 px, que é equivalente
  para o critério de reflow, mas o zoom em si não foi exercitado.
