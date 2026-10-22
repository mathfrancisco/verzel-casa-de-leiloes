# SP-02 — Catálogo externo e resiliência

**Requisitos:** RF-02, RNF-03 · **Regras:** RN-20, RN-21 · **Cards:** LC-005

## Responsabilidade

Buscar e detalhar itens na API do Art Institute of Chicago, protegendo o app contra lentidão,
limite e indisponibilidade. É o **único** módulo que fala com a API externa.

## Port

```ts
interface CatalogProvider {
  search(query: string, page: number): Promise<CatalogSearchResult>; // lança CatalogUnavailable
  getItem(externalId: string): Promise<CatalogItem>;                 // lança CatalogItemNotFound | CatalogUnavailable
  fetchImage(item: CatalogItem): Promise<{ bytes: Uint8Array; contentType: string }>; // entra no LC-006
}
```

`search` e `getItem` existem desde o LC-005; `fetchImage` é adicionado no LC-006, junto com o
primeiro caso de uso que precisa dele.

Implementações: `ArticCatalog` (produção) e `FakeCatalog` (testes, E2E, seed; modos `ok`,
`fail`, `slow`, `notFound`). Escolha por `CATALOG_PROVIDER=artic|fake`.

## API

| Método | Rota | Auth | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/catalog/search?q=&page=` | AUCTIONEER | 200 `{ items, page, totalPages, fromCache }` | `VALIDATION_ERROR`, `CATALOG_UNAVAILABLE`, `RATE_LIMITED` |
| GET | `/api/catalog/items/:externalId` | AUCTIONEER | 200 `CatalogItem` | `CATALOG_ITEM_NOT_FOUND`, `CATALOG_UNAVAILABLE` |

`CatalogItem = { externalId, title, artist, date, medium, dimensions, origin, imageUrl, sourceUrl, suggestedCategory }`.
Só itens **com imagem** e `is_public_domain = true` entram no resultado.

`q`: 2–100 caracteres; `page`: 1–50; 12 itens por página.

## Detalhes do adapter `ArticCatalog`

- Endpoints: `GET https://api.artic.edu/api/v1/artworks/search?q=…&fields=…&limit=12&page=…`,
  `GET /api/v1/artworks/:id`; imagem IIIF `https://www.artic.edu/iiif/2/{image_id}/full/843,/0/default.jpg`.
- Header `AIC-User-Agent: verzel-casa-de-leiloes (contato no README)`.
- Timeout 3 s; 1 retry com jitter (200–500 ms) só para erro de rede/5xx/429.
- Circuit breaker: abre após 5 falhas consecutivas; após 30 s permite 1 tentativa (meia-abertura).
- Cache LRU em memória: buscas e itens, TTL 10 min, até 500 entradas. Dentro do TTL a resposta
  vem do cache com `fromCache: false` (uso normal). Se a API falhar (ou o breaker estiver aberto)
  e existir uma busca anterior igual, mesmo vencida, ela é servida com `fromCache: true` para a
  UI avisar que os dados podem estar desatualizados.
- `externalId` precisa ser numérico (1–10 dígitos); caso contrário `CATALOG_ITEM_NOT_FOUND`
  sem chamar a API. Itens sem imagem ou fora do domínio público também são "não encontrados".
- Rate limit de 30 req/min por usuário (chave = id do usuário da sessão; sem sessão, IP).
- Mapeia `classification_titles`/`artwork_type_title` → `suggestedCategory`.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-02-01 | unit | Mapeamento da resposta da AIC → `CatalogItem` (fixture JSON gravada) | campos corretos, itens sem imagem descartados |
| CT-02-02 | unit | 5 falhas seguidas | breaker abre; 6ª chamada falha sem HTTP |
| CT-02-03 | unit | Breaker aberto há 30 s | 1 tentativa; sucesso fecha o breaker |
| CT-02-04 | unit | Mesma busca 2× dentro do TTL | 1 chamada HTTP |
| CT-02-05 | unit | Timeout > 3 s | `CatalogUnavailable` após 1 retry |
| CT-02-06 | integração | `FakeCatalog` em `fail` → `GET /api/catalog/search` | 503 `CATALOG_UNAVAILABLE` |
| CT-02-07 | integração | `FakeCatalog` em `fail` → vitrine, detalhe do lote, lance, auditoria, comprovante, imagem | todos 2xx (RN-21) |
| CT-02-08 | integração | Licitante chama a busca | 403 |
