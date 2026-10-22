# LC-020 — Criar o seed de demonstração com cadeia válida

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E6 Qualidade e entrega · Dia 6 |
| Depende de | LC-014, LC-018 |
| Requisitos | RF-16 |
| Regras | RN-15 |
| Specs | SP-10 |

## Objetivo

Avaliador entra e percorre o fluxo sem montar nada do zero.

## Escopo

- Fixtures locais (JSON + imagens de domínio público) via `FakeCatalog`
- Usuários, depósitos e lotes de `docs/04-modelagem-de-dados.md` §7, com lances via `placeBid` e liquidação via `settleDueLots`
- Scripts `seed` (idempotente) e `seed:reset`; executado no compose

## Fora do escopo

- —

## Critérios de aceite

- [ ] Login dos 3 usuários funciona; há lote ao vivo com lances abertos
- [ ] Auditoria de todos os lotes do seed = `INTACT`

## Testes obrigatórios

- CT-10-03

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
