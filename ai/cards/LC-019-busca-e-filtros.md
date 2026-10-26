# LC-019 — Adicionar busca e filtros à vitrine

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Épico / dia | E5 Auditoria e gestão · Dia 5 |
| Depende de | LC-007 |
| Requisitos | RF-17 |
| Regras | RN-14 |
| Specs | SP-03, SP-09 |

## Objetivo

Visitante encontra lotes por texto, categoria, faixa de preço e ordenação.

## Escopo

- Migration: `search_vector` gerado + índice GIN; índice por categoria/preço
- Parâmetros `q`, `category`, `minPriceCents`, `maxPriceCents`, `sort` em `GET /api/lots`
- Web: barra de busca com debounce, filtros, ordenação, estado na URL

Decisões: busca com configuração `simple` e prefixo, sem remoção de acentos (sem extensão `unaccent`); filtro de preço usa o preço efetivo (lance atual, ou inicial sem lances); `counts` das abas respeitam os filtros; o filtro por "status" do RF-17 é a própria aba (fase); a URL usa `aba` (já existente) e `categoria`, `min`, `max`, `ordem`.

## Fora do escopo

- —

## Critérios de aceite

- [x] Combinações de filtros retornam o esperado; cancelados nunca aparecem (CT-03-14: texto, artista, descrição, categoria, faixa, ordenações e paginação por cursor em todas, combinações, contagens, cancelado ausente mesmo casando com a busca)
- [x] Recarregar a página mantém os filtros (CT-09-06 como teste de componente: URL com filtros repete a consulta e preenche os controles; Playwright/`e2e` ainda não existe, LC-022)

## Testes obrigatórios

- CT-03-14
- CT-09-06

## Definição de pronto

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` padrão e `pnpm build` verdes (503: shared 114, web 120, API 269). Saída local em `../work/lc019-validation.log`; PR pendente. Vitrine ainda não testada no navegador
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` atualizado; `docs/USO-DE-IA.md` fica a cargo do coordenador
