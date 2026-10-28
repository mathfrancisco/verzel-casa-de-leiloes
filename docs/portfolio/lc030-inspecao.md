# LC-030 — Nota de inspeção (hierarquia da vitrine e da sala)

Base: `667c9a8` (main + LC-027). Inspeção feita lendo `LotCard.tsx`, `LotRoomPage.tsx`,
`LotSummary.tsx`, `styles.css` e as capturas `docs/portfolio/media/01-vitrine.png`,
`02-sala-ana.png`, `08-sala-mobile.png`. Sem execução visual (API indisponível neste ambiente).

## Lacunas concretas encontradas

1. **Sala mobile (390 px):** a ordem do DOM é imagem, título, descrição, atributos (5 linhas),
   link do catálogo e só então preço/status/formulário. Em `08-sala-mobile.png` o preço atual
   aparece apenas na borda inferior da primeira tela e o botão "Dar lance" exige rolar além dos
   metadados. Gap: ação principal fora da primeira tela.
2. **Status "ganhando/superado" apagado:** `.lot-status-winning/-outbid` (cores/fundo) são
   sobrescritos por `.lot-status { background: var(--soft) }` declarada depois no CSS, então o
   fundo verde/âmbar não aparece; o status também tem o mesmo tamanho do texto comum.
3. **Vitrine:** o preço do cartão é uma pílula de 0,75–0,81 rem, do mesmo peso visual que
   "Lance inicial" e a categoria; o preço não é o elemento mais claro do cartão.

## Já atende (não alterado)

- Preço atual da sala já é o maior texto do bloco (`--fs-2xl`), "Próximo lance mínimo" e
  cronômetro ficam logo abaixo; botão "Dar lance" já é grande (`--fs-lg`, 700).
- Vitrine já tem busca, filtros, abas, chip de fase, contagem regressiva e fallback de imagem;
  nada disso foi mexido. Texto/roles usados pelo E2E (`.lot-status`, "Dar lance", "Faça seu
  primeiro lance", etc.) permanecem iguais.

## Mudanças (localizadas)

- `LotRoomPage.tsx`: cabeçalho (categoria + h1) e detalhes (descrição, atributos, link) viram
  dois blocos (`.lot-room-head`, `.lot-room-details`) dentro de `.lot-room-text`; sem mudança de
  conteúdo ou regra de lance.
- `styles.css` (bloco final "LC-030"): em ≤ 40 rem, ordem visual imagem → título → preço/status →
  formulário de lance → detalhes → histórico (via `display: contents` + `order`), imagem 16:9;
  status com fundo/cor restaurados e fonte maior; preço do cartão da vitrine maior e mais
  pesado; "Lance inicial" e meta em tom secundário. Temas claro e escuro usam só tokens.

## Limites

- Altura exata acima da dobra em 390 px não foi medida em navegador; estimativa por CSS.
- E2E e checagem visual não executados aqui.
