# Revisão de design (front)

Escopo: `apps/web/src/styles.css` e marcação apresentacional. Sem mudança de comportamento, contrato,
textos ou seletores de e2e. Capturas a 360 px e 1280 px, tema claro e escuro, com o seed e
`CATALOG_PROVIDER=fake`. Pares `antes-*` / `depois-*` nesta pasta.

## Mudanças

| Mudança | Por quê |
|---|---|
| Tokens de escala tipográfica (`--fs-*`), espaçamento (`--space-*`), raio, sombra, `--ok-bg`, `--skeleton`; `line-height: 1.5`; `h1`/`h2` com tamanho e margem definidos | Antes valia o padrão do navegador: títulos sem ritmo e linhas apertadas. |
| Cabeçalho: a 360 px marca e alternador de tema ficam na 1ª linha; links e conta nas seguintes; botões menores; `white-space: nowrap` no alternador; fixo no topo só a partir de 30 rem | Corrige "C Tema escuro" truncado e o cabeçalho de 4 linhas com Carteira/Meus arremates/Sair. Sticky só em telas largas para não comer a viewport do celular. |
| Sala do lote: preço atual em `2rem` (bloco `.lot-price-main`), mínimo e cronômetro em segundo plano, faixa de status com cor + borda + texto + ícone (`lot-status-winning/outbid`, via prop `statusTone` em `LotSummary`) | O preço era texto corrido. O status agora é visível sem depender só de cor (texto e ícone já existiam e foram mantidos; `aria-live` intacto). |
| Formulário de lance: campo estilizado nos dois temas (antes ficava cinza no escuro), 44 px de altura, atalhos que dividem a linha, botão "Dar lance" maior | Alvo de toque e legibilidade a 360 px. |
| Vitrine: filtros num painel, preço mín./máx. lado a lado a 360 px, preço do card maior, divisória acima da contagem, abas com 44 px e `gap` | Hierarquia do card e agrupamento dos filtros. |
| Estados: `.empty-state` (vazio tracejado) em vitrine, carteira, extrato, meus arremates, painel, histórico e busca do catálogo; skeleton (`.lot-skeleton`, `aria-hidden`) ao carregar a vitrine; "Carregando lote…" com `role="status"`; erro da vitrine em caixa | Vazio, carregando e erro estavam como parágrafo solto. |
| Carteira: saldo disponível em destaque (borda de acento, `2rem`, cor de sucesso); depósito em cartão; números tabulares | RF: "disponível em destaque". |
| Painel do leiloeiro: a 360 px o título e "Novo lote" empilham (antes o botão ficava estreito e alto) | Quebra de layout. |
| Novo lote: `.selected-item img` com `aspect-ratio: 1`, `min-height` e `max-width: 14rem`; miniaturas do catálogo com altura mínima | Imagem sem tamanho reservado causava salto de layout e ocupava a tela inteira a 360 px. |
| `button.secondary` (usado em "Limpar filtros" e sem estilo) agora tem estilo de contorno; abas de "Meus arremates" (`role=tab`) com aparência de abas; `hover` nos botões | Estilos que faltavam. |
| Auditoria: veredito "Íntegro" com fundo e borda de sucesso; cabeçalhos de tabela e hashes em corpo menor | Veredito mais evidente. |

## Contraste e foco

Pares novos (todos >= 4,5:1): `--ok` sobre `--ok-bg` (claro `#126b35`/`#e6f5ec`; escuro `#6fdc9a`/`#12301f`),
`--warn-text` sobre `--warn-bg` (inalterados). Foco visível (`:focus-visible`, 3 px) e regiões `aria-live`
não foram alterados; a suíte axe do e2e roda nos dois temas.

## Fora do escopo / sugestões

- Os filtros da vitrine ocupam boa parte da primeira tela a 360 px; um `<details>` recolhível mudaria
  comportamento e markup e ficou como sugestão.
- Capturas de tela com a sala em estado "superado" não foram geradas (exigiria um segundo licitante).
