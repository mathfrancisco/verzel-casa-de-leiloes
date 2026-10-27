# Redesenho no estilo ClickBids

Referência: Dribbble "ClickBids Auctions". Só `apps/web` mudou; dados, hooks e regras de negócio
ficaram intactos (nenhuma spec de comportamento ou texto de contrato foi alterada).

## O que mudou

- **Casca (`Layout.tsx`)**: cabeçalho horizontal virou **barra lateral fixa** com o wordmark
  ("Casa de **L**eilões", letra de destaque laranja), itens com ícones de linha fina (SVG inline em
  `components/Icon.tsx`, sem dependência nova), seção "CONTA" em caixa-alta cinza, cartão do perfil
  com o saldo da carteira e botão redondo "+" (aria-label "Depositar saldo", leva à carteira),
  "Depositar", "Sair", alternador de tema e rodapé cinza pequeno. O conteúdo fica num **painel
  branco arredondado** sobre fundo bege com textura sutil.
- **Rotas mapeadas**: Leilões (`/`), Meus arremates (licitante), Painel e Novo lote (leiloeiro),
  Carteira/Depositar (`/carteira`), Entrar e Criar conta (visitante). Não há item "Auditoria" na
  barra: a auditoria é por lote (`/auditoria/:lotId`) e continua acessível a partir do lote.
- **Topo do conteúdo**: botão quadrado de voltar (fora da home) + trilha "Início › …" por rota.
- **Vitrine**: título "Leilões **ao vivo**" (acento muda com a aba), subtítulo cinza, relógio em
  caixas de dígito (`CountdownBoxes.tsx`: zeros à esquerda em cinza, dígitos ativos em laranja,
  legenda "para encerrar" / "para começar", calculado a partir do próximo lote a encerrar/começar
  e com o mesmo `useRemainingMs`), chip de progresso "8 / 24 lotes encerrados" com barra de acento
  (usa `counts` da API). A `IntroStrip` continua, reestilizada (cartão suave, passos numerados com
  marcador de acento). Abas viraram abas sublinhadas.
- **Cards de lote**: grade de 4 colunas (3, 2 e 1 em telas menores), card branco com raio grande,
  imagem centrada em fundo claro, chip de fase (AO VIVO em acento, AGENDADO contornado,
  ENCERRADO escuro), ícone de participantes + contagem de lances, título em negrito (acento no
  hover), rodapé com "Lance inicial R$ x" em texto pequeno de acento, contagem em negrito e o
  lance atual numa pílula que preenche com o acento no hover/foco.
- **Mobile (<= 64rem)**: a barra lateral vira **gaveta** aberta por um botão (aria-expanded,
  aria-controls, fecha com Esc, ao navegar ou tocando no fundo); barra superior com o wordmark.
  Conferido sem rolagem horizontal em 360 px.
- **Tokens (`styles.css`)**: fundo `#f4efe6`, texto `#1d1d1f`, `--brand #e5532d` (só fundos
  decorativos e texto grande, 3,75:1 sobre branco), `--accent #be3a17` (texto pequeno, 5,5:1) e
  `--accent-bg #c8401c` (preenchimentos com texto branco, 5,0:1). O tema escuro redefine os mesmos
  tokens (`--brand #ff6a3d`, `--accent #ff8f69`). Foco visível (outline de 3px), alvos >= 44px e
  `prefers-reduced-motion` mantidos. Foi adicionado um link "Pular para o conteúdo".

## Acessibilidade e testes

- Papéis e rótulos usados pelos testes foram mantidos (`nav` "Principal", botão "Sair", botão
  "Tema escuro" com `aria-pressed`, `time` das contagens, `.lot-card`, `.lot-status`).
- axe (WCAG 2 A/AA) com a API simulada, sem violações em vitrine, carteira e entrar, nos perfis
  licitante, leiloeiro e visitante, nos dois temas, em 1440 px e 360 px.

## Capturas

`docs/design/clickbids-antes-*.png` (antes) e `clickbids-depois-*.png` (depois), para vitrine e
carteira, desktop 1440 px e 360 px, claro e escuro, mais `clickbids-depois-menu-360-light.png`
(gaveta aberta). Geradas por `node docs/design/screenshots.mjs antes|depois` contra o Vite, com a
API simulada por interceptação de rotas (sem banco).
