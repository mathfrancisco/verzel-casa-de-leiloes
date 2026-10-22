# LC-007 — Construir a vitrine com abas ao vivo, agendados e encerrados

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E2 Catálogo e lotes · Dia 2 |
| Depende de | LC-006 |
| Requisitos | RF-04 |
| Regras | RN-03, RN-14 |
| Specs | SP-03, SP-09 |

## Objetivo

Qualquer pessoa vê os lotes separados por fase, sem os cancelados.

## Escopo

- `GET /api/lots?phase=` com ordenação padrão por fase e paginação por cursor
- Web: rota `/`, abas com contagem, cards com imagem, preço, nº de lances, contagem regressiva com offset de `serverTime`
- Estados de carregando, vazio e erro; layout responsivo

## Fora do escopo

- Busca e filtros (LC-019)
- Atualização em tempo real dos cards (opcional dentro de LC-013)

## Critérios de aceite

- [ ] Cada lote aparece só na aba da sua fase; cancelado nunca aparece
- [ ] Lote muda de aba sozinho quando a fase muda (refetch ao zerar a contagem)
- [ ] Vitrine funciona com `CATALOG_PROVIDER` em modo falha

## Testes obrigatórios

- CT-03-06
- CT-09-03 — contagem regressiva com offset
- CT-02-07 (parte vitrine)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
