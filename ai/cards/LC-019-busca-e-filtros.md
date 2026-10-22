# LC-019 — Adicionar busca e filtros à vitrine

| Campo | Valor |
|---|---|
| Status | TODO |
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

## Fora do escopo

- —

## Critérios de aceite

- [ ] Combinações de filtros retornam o esperado; cancelados nunca aparecem
- [ ] Recarregar a página mantém os filtros

## Testes obrigatórios

- CT-03-14
- CT-09-06

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
