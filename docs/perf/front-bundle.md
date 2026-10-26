# Bundle do front (`apps/web`)

Medido com `pnpm --filter ./apps/web build` (Vite 6, saída em kB; gzip entre parênteses).

## Antes (main, um único chunk)

| Arquivo | Tamanho |
|---|---|
| `index-*.js` | 371,87 (gzip 114,47) |
| `index-*.css` | 8,57 (gzip 2,27) |

## Depois (divisão por rota + vendor)

| Chunk | Tamanho | Carregado em |
|---|---|---|
| `index-*.js` (app + vitrine) | 86,68 (24,55) | toda página |
| `vendor-react-*.js` | 165,10 (53,88) | toda página |
| `vendor-socket-*.js` | 41,71 (13,06) | toda página (vitrine usa realtime) |
| `vendor-query-*.js` | 40,34 (11,97) | toda página |
| `LotRoomPage-*.js` | 9,04 (3,82) | sala do lote |
| `NewLotPage-*.js` | 7,00 (2,78) | novo lote |
| `browserAuditCrypto-*.js` | 6,29 (3,26) | auditoria (importado por `AuditPage`) |
| `AuditPage-*.js` | 4,34 (1,85) | auditoria |
| `AuctioneerPanelPage-*.js` | 4,00 (1,76) | painel |
| `WalletPage-*.js` | 3,16 (1,40) | carteira |
| `ReceiptPage-*.js` | 3,00 (1,35) | comprovante |
| `ParticipationsPage-*.js` | 2,19 (1,10) | meus arremates |
| `RegisterPage-*.js` | 2,09 (1,03) | cadastro |
| `LoginPage-*.js` | 1,39 (0,76) | entrar |
| `FormField`, `CancelledNotice` | ~0,3 cada | compartilhados |
| `index-*.css` | 8,57 (2,27) | sem mudança |

## Leitura

- A soma dos JS carregados na vitrine é ~333,5 kB (gzip ~103,5), ~10% a menos que antes
  (371,87 / 114,47): as páginas de sala, auditoria, comprovante, carteira, painel e autenticação
  saem do carregamento inicial (~38 kB). O grosso do peso é vendor (React, router, Socket.IO,
  TanStack Query), que a vitrine precisa.
- Os chunks `vendor-*` mudam pouco entre deploys, então ficam em cache do navegador quando só o
  código do app muda.
- A criptografia da auditoria (`browserAuditCrypto`) só é baixada ao abrir a auditoria.
- Rotas lazy usam `Suspense` em `components/Layout.tsx` com `role="status"`.

## Imagens e re-renders

- `<img>`: `loading="lazy"` + `decoding="async"` em todas, exceto as imagens principais da sala
  do lote e do comprovante (`fetchPriority="high"`). Dimensões explícitas (`width`/`height`) ou
  `aspect-ratio` no CSS evitam deslocamento de layout.
- Sala do lote: `LotSummary` (preço, cronômetro, status) e `LotHistory` (histórico) são
  `memo`; o tick de 1 s fica dentro de `Countdown`. Teste em
  `features/lotRoom/LotRoomRenders.test.tsx`.
