# SP-09 — Front-End

**Requisitos:** RF-04, RF-06, RF-08, RF-10, RF-11, RF-13 a RF-15, RF-17, RF-19, RNF-11 ·
**Cards:** LC-007, LC-008, LC-009, LC-013, LC-015, LC-016, LC-017, LC-019, LC-021

## Rotas

| Rota | Acesso | Tela |
|---|---|---|
| `/` | público | Vitrine |
| `/lotes/:id` | público (lance só licitante) | Sala do lote |
| `/auditoria/:lotId` | público | Auditoria |
| `/comprovante/:code` | público | Comprovante |
| `/entrar`, `/cadastro` | visitante | Login / cadastro |
| `/carteira` | licitante | Carteira |
| `/meus-lances` | licitante | Meus arremates |
| `/painel` | leiloeiro | Meus lotes, resultados e total recebido |
| `/painel/novo` | leiloeiro | Buscar no catálogo e criar lote |

Rota protegida sem sessão → `/entrar?next=…`; papel errado → página "sem permissão".

## Telas — conteúdo mínimo

**Vitrine:** abas Ao vivo / Agendados / Encerrados (contagem em cada); grid de cards (imagem,
título, preço atual ou inicial, nº de lances, contagem regressiva ou "encerrado"/"arrematado por
R$ X"). Filtros (RF-17): busca com debounce de 300 ms, categoria, faixa de preço, ordenação;
estado refletido na URL (`?aba=ao-vivo&q=…&categoria=PRINT&min=1000&max=550000&ordem=price_asc`;
`min`/`max` em centavos, digitados em reais; valores inválidos na URL são ignorados); as abas
mantêm os filtros e "Limpar filtros" os remove. Texto e preços aplicam após 300 ms parado, categoria
e ordenação na hora; preço inválido ou mínimo > máximo mostra aviso e não consulta. Estados: carregando (skeleton), vazio, erro.

**Sala do lote:** imagem e atributos; preço atual e mínimo do próximo lance; contagem regressiva
(com selo "prorrogado" quando `extended`); faixa de status:
- "Você está ganhando" (verde + ícone), "Você foi superado" (âmbar + ícone), "Faça seu primeiro
  lance", "Lote encerrado — você venceu / não venceu";
- formulário de lance com valor pré-preenchido com o mínimo, botões rápidos (+1, +2, +5
  incrementos), confirmação para valores ≥ 2× o atual;
- mensagens de erro por código (tabela abaixo) junto ao campo, em `aria-live`;
- histórico (pseudônimo, valor, hora, "(você)"), posição do usuário;
- link "Auditar este lote". Leiloeiro dono vê a sala sem formulário.

**Carteira:** total, comprometido (lista por lote com link), disponível em destaque; depósito
com valores rápidos e campo livre; extrato.

**Meus arremates:** abas "Participando" (ganhando/superado) e "Arrematados" (comprovante + botão
compartilhar via Web Share API, fallback copiar link) e "Encerrados sem vitória".

**Comprovante:** item, valor, data, pseudônimo do vencedor, hash final, selo "verificado"
(assinatura conferida no navegador), link para auditoria, aviso se revogado.

**Auditoria:** cabeçalho com veredito grande **Íntegro** / **Adulterado**; lista de checagens
com ✓/✗ e onde falhou; tabela de elos (seq, tipo, pseudônimo, valor, data, hash curto); seção
"Como verificar" explicando a técnica e mostrando a chave pública; verificação refeita no
navegador ("Verificado no seu navegador em X ms").

**Painel do leiloeiro:** lista de lotes com fase, preço atual, resultado (`PENDING`, `SOLD` por
R$ X, `UNSOLD`, `CANCELLED`), botão cancelar quando `cancellable` (com confirmação explicando o
estorno); cartão "Total recebido". **Novo lote:** busca no catálogo (grid de resultados, aviso
quando `CATALOG_UNAVAILABLE` ou `fromCache`), seleção do item preenche título/categoria e mostra
atributos; campos de preço, incremento, início e fim com validação no cliente espelhando a RN-02.

## Mensagens de erro

| Código | Mensagem |
|---|---|
| `BELOW_MINIMUM` | Lance abaixo do mínimo. O próximo lance deve ser de pelo menos {minimum}. |
| `INSUFFICIENT_FUNDS` | Saldo insuficiente. Seu disponível é {available}. [Depositar] |
| `ALREADY_WINNING` | Você já está ganhando este lote. |
| `LOT_NOT_STARTED` | Este lote ainda não começou. Abre em {startsAt}. |
| `LOT_CLOSED` | Este lote já foi encerrado. |
| `LOT_CANCELLED` | Este lote foi cancelado pelo leiloeiro. |
| `SELLER_CANNOT_BID` | Leiloeiros não podem dar lances. |
| `RATE_LIMITED` | Muitas tentativas. Aguarde alguns segundos. |
| `CATALOG_UNAVAILABLE` | O catálogo de obras está indisponível no momento. Tente em instantes. |
| outros | Algo deu errado. Tente novamente. |

## Transversal

- Formatação: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; datas em
  `pt-BR` no fuso do navegador.
- Responsivo a partir de 360 px; sala em uma coluna no celular.
- Dark mode (RF-19): `prefers-color-scheme` por padrão, alternador no cabeçalho, escolha em
  `localStorage`, script inline no `index.html` aplica a classe antes da pintura (sem flash).
- Acessibilidade: ver `apps/web/AGENTS.md`.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-09-01 | componente | Formulário de lance recebe cada código de erro | mensagem correta e anunciada |
| CT-09-02 | componente | Helpers de dinheiro: "1.234,56" ↔ 123456 | ida e volta exatas |
| CT-09-03 | componente | Contagem regressiva com offset de relógio de +5 min | tempo correto |
| CT-09-04 | e2e | Rotas protegidas por papel | redirecionamentos corretos |
| CT-09-05 | e2e | Alternar tema e recarregar | tema mantido sem flash |
| CT-09-06 | e2e | Filtros da vitrine refletem na URL e sobrevivem ao recarregar | ok |
