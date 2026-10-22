# LC-005 — Implementar o catálogo da API Art Institute com cache e circuit breaker

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E2 Catálogo e lotes · Dia 2 |
| Depende de | LC-003 |
| Requisitos | RF-02, RNF-03 |
| Regras | RN-21 |
| Specs | SP-02 |

## Objetivo

Leiloeiro busca obras na API externa e o app sobrevive à lentidão ou queda dela.

## Escopo

- Port `CatalogProvider`; `ArticCatalog` (timeout, retry, breaker, cache LRU) e `FakeCatalog` (modos ok/fail/slow/notFound)
- Fixtures JSON gravadas da AIC para testes de mapeamento
- Rotas `GET /api/catalog/search` e `GET /api/catalog/items/:externalId` (só leiloeiro, rate limit)
- Seleção por `CATALOG_PROVIDER`

## Fora do escopo

- Criação de lote (LC-006)
- Tela de busca (LC-008)

## Critérios de aceite

- [ ] Busca real retorna itens com imagem e domínio público
- [ ] API fora → 503 `CATALOG_UNAVAILABLE` rápido (breaker), sem travar o servidor
- [ ] Testes nunca fazem HTTP real

## Testes obrigatórios

- CT-02-01 a CT-02-06, CT-02-08

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
