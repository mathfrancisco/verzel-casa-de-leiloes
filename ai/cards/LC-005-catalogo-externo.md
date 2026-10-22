# LC-005 — Implementar o catálogo da API Art Institute com cache e circuit breaker

| Campo | Valor |
|---|---|
| Status | REVIEW — falta smoke contra a API real |
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

- [ ] Busca real retorna itens com imagem e domínio público — **pendente**: `api.artic.edu` bloqueado na rede deste ambiente; verificar no deploy ou com o domínio liberado
- [x] API fora → 503 `CATALOG_UNAVAILABLE` rápido (breaker), sem travar o servidor
- [x] Testes nunca fazem HTTP real

## Testes obrigatórios

- CT-02-01 a CT-02-06, CT-02-08

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 45 ✓ · web 24 ✓ · api 82 ✓ (151); novos no LC-005: shared 8, cache 2, breaker 4, adapter AIC 13, rotas 9 |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| CT-02-01 mapeamento | ✓ (fixtures **escritas à mão** no formato documentado da AIC — ver `test/fixtures/artic/README.md`) |
| CT-02-02 / 03 breaker | ✓ 5 falhas → aberto (10 chamadas HTTP, 6ª sem HTTP); após 30 s, 1 tentativa e fecha |
| CT-02-04 cache | ✓ mesma busca (maiúsculas diferentes) → 1 chamada HTTP |
| CT-02-05 timeout | ✓ API travada → `CATALOG_UNAVAILABLE` após 2 tentativas, em < 500 ms com timeout de teste de 20 ms |
| CT-02-06 / 08 rotas | ✓ catálogo fora → 503; licitante → 403; visitante → 401; consulta inválida → 400; 31ª busca no minuto → 429 |
| Busca real na AIC | **não executada**: a política de rede deste ambiente recusou `api.artic.edu` |

Decisões:
- `fetchImage` fica para o LC-006 (YAGNI); spec atualizada.
- `fromCache: true` só quando a API falhou e havia busca anterior (mesmo vencida); spec atualizada.
- `FakeCatalog` com modos `ok`, `fail`, `slow`, `notFound`; `CATALOG_PROVIDER=fake` usa ele em produção (E2E/seed).
- Identificação para a AIC no header `AIC-User-Agent` com o link do repositório (sem e-mail pessoal).
