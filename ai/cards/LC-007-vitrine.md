# LC-007 — Construir a vitrine com abas ao vivo, agendados e encerrados

| Campo | Valor |
|---|---|
| Status | REVIEW |
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

- [x] Cada lote aparece só na aba da sua fase; cancelado nunca aparece
- [x] Lote muda de aba sozinho quando a fase muda (refetch ao zerar a contagem)
- [x] Vitrine funciona com `CATALOG_PROVIDER` em modo falha

## Testes obrigatórios

- CT-03-06
- CT-09-03 — contagem regressiva com offset
- CT-02-07 (parte vitrine)

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) atualizado

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 76 ✓ · web 38 ✓ · api 140 ✓ (254) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| CT-03-06 (API) | cada aba só com a sua fase; ordem por aba; cancelados fora das abas e da contagem; paginação por cursor nas ordens crescente e decrescente; consulta inválida → 400 |
| CT-02-07 (vitrine) | catálogo em modo falha → vitrine 200 com todos os lotes |
| CT-09-03 | relógio do navegador 5 min atrasado → contagem usa a hora do servidor |
| Chromium (`pnpm dev`) | abas "Ao vivo (2) Agendados (2) Encerrados (2)"; cancelado não aparece; **sem recarregar**, após ~80 s o lote que terminou foi para Encerrados e o agendado entrou em Ao vivo ("Ao vivo (2) Agendados (1) Encerrados (3)"); 375 px sem rolagem horizontal |

Decisões:
- A resposta da vitrine traz `counts` por aba e `serverTime` (SP-03 atualizada).
- Aba na URL em português (`/?aba=ao-vivo|agendados|encerrados`), com links e `aria-current`.
- Ao zerar uma contagem, a vitrine invalida as consultas de lotes; também recarrega a cada 60 s.
- Estilo com variáveis CSS em vez de Tailwind (`apps/web/AGENTS.md` atualizado).
- A página inicial provisória com status da API e `lib/health.ts` foram removidas (sem uso).
