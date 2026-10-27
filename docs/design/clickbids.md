# Redesenho no estilo ClickBids

Referência: Dribbble "ClickBids Auctions". Só `apps/web` mudou; dados, hooks e regras de negócio
ficaram intactos (nenhuma spec de comportamento ou texto de contrato foi alterada). A versão
descrita aqui é a final (segunda passada, mais leve e densa que a primeira).

## Visão geral

- **Casca (`Layout.tsx`)**: um único painel branco arredondado (raio 24px, sombra suave) sobre o
  fundo bege com textura sutil. Dentro dele, barra lateral fixa e conteúdo separados por um
  divisor fino de 1px.
- **Barra lateral**: wordmark de 22px ("Casa de **L**eilões", uma letra em laranja-avermelhado),
  itens de 14px com ícones de linha fina (SVG inline em `components/Icon.tsx`, sem dependência
  nova). O item ativo não tem fundo: só texto mais escuro e ícone de acento. Seção "CONTA" em
  caixa-alta cinza; linha de perfil compacta (avatar, "Meu perfil", saldo à direita e "+" redondo
  de 24px, `aria-label` "Depositar saldo"); Depositar, Sair, alternador de tema e rodapé cinza
  pequeno.
- **Rotas mapeadas**: Leilões (`/`), Meus arremates (licitante), Painel e Novo lote (leiloeiro),
  Carteira/Depositar (`/carteira`), Entrar e Criar conta (visitante). Não há item "Auditoria": ela
  é por lote (`/auditoria/:lotId`) e continua acessível a partir do lote.
- **Topo do conteúdo**: botão quadrado de voltar (36px, contorno; fora da home) e trilha
  "Início › …" por rota, com o último item em cinza.
- **Vitrine**: título "Leilões **ao vivo**" (o acento muda com a aba), subtítulo "Total em lances:
  R$ x" (soma dos preços atuais dos lotes carregados), chip de progresso branco "8 / 24 lotes
  encerrados" com o número em acento e barra fina de acento na borda inferior, e relógio
  (`CountdownBoxes.tsx`): caixas brancas com borda e sombra leves, dígitos de 18px (zeros à
  esquerda em cinza, dígitos ativos em texto de acento), dois-pontos entre os grupos e legenda
  "para encerrar" / "para começar" centralizada. O alvo é o próximo lote a encerrar/começar e usa
  o mesmo `useRemainingMs`. A `IntroStrip` virou faixa fina com borda e continua dispensável;
  filtros em uma linha compacta (campos de 36px); abas de 14px com sublinhado de acento.
- **Cards de lote**: grade de 4 colunas (3, 2 e 1 em telas menores), sem borda, raio 12px, sombra
  só no hover. Imagem em fundo `#f7f6f4` com `object-fit: contain`; fase como chip minúsculo
  (ponto + texto) no canto superior direito; abaixo, ícone de participantes + "N lances" e o
  título (acento no hover; o título é o link do card, com área de clique cobrindo o card todo).
  Rodapé após um fio: "Lance inicial R$ x" em acento sobre o horário/contagem em negrito, e o
  lance atual numa pílula bege com texto marrom que vira acento com texto branco no hover/foco.
- **Mobile (<= 64rem)**: a barra lateral vira gaveta aberta por um botão (`aria-expanded`,
  `aria-controls`, fecha com Esc, ao navegar ou tocando no fundo); barra superior com o wordmark;
  o painel ocupa a tela inteira. Sem rolagem horizontal em 360 px.
- **Tipografia**: Inter (Google Fonts em `index.html`, com fallback de sistema), base de 14px, h1
  peso 700, títulos de card 15px peso 600, rótulos de 11–12px, `letter-spacing` -0.02em nos
  títulos.
- **Tokens (`styles.css`)**: fundo `#f4efe6`, texto `#1d1d1f`, `--brand #e5532d` (fundos
  decorativos e texto grande), `--accent #be3a17` (texto pequeno, 5,5:1) e `--accent-bg #c8401c`
  (preenchimentos com texto branco, 5,0:1). O tema escuro redefine os mesmos tokens (`--brand
  #ff6a3d`, `--accent #ff8f69`). Foco visível, alvos de toque confortáveis, `prefers-reduced-motion`
  respeitado e link "Pular para o conteúdo".

## Acessibilidade e testes

- Papéis e rótulos usados pelos testes foram mantidos (`nav` "Principal", botão "Sair", botão
  "Tema escuro" com `aria-pressed`, `time` das contagens, `.lot-card`, `.lot-status`).
- axe (WCAG 2 A/AA) com a API simulada: sem violações em vitrine, carteira e entrar, nos dois
  temas, em 1440 px e 360 px.

## Capturas

`docs/design/clickbids-antes-*.png` (versão anterior ao redesenho) e `clickbids-depois-*.png`
(versão final), para vitrine e carteira, desktop 1440 px e 360 px, claro e escuro, mais
`clickbids-depois-menu-360-light.png` (gaveta aberta). Geradas por
`node docs/design/screenshots.mjs antes|depois` contra o Vite, com a API simulada por
interceptação de rotas (sem banco).
