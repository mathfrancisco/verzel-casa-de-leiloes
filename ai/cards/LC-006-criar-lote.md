# LC-006 — Criar lote com snapshot do item, imagem e gênese da cadeia

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E2 Catálogo e lotes · Dia 2 |
| Depende de | LC-005 |
| Requisitos | RF-03 |
| Regras | RN-02, RN-03, RN-15, RN-16, RN-20 |
| Specs | SP-03, SP-08 |

## Objetivo

Leiloeiro publica um lote a partir de um item e o lote passa a existir sem depender da API externa.

## Escopo

- Migration: `images`, `lots`, `lot_entries`, `receipts` com restrições, índices e trigger append-only (`docs/04-modelagem-de-dados.md`)
- `domain/lotPhase.ts`, `domain/pseudonym.ts`, `packages/shared/canonicalJson.ts` e cálculo de `genesisHash`
- `POST /api/lots`: valida RN-02, busca item e imagem antes da transação, grava tudo numa transação
- `GET /api/lots/:id` (`LotDetail` sem lances ainda) e `GET /api/images/:id` com cache imutável

## Fora do escopo

- Lances e assinatura dos elos (LC-010, LC-011)
- Formulário web (LC-008)

## Critérios de aceite

- [ ] Lote criado guarda snapshot, imagem e `genesis_hash`
- [ ] Validações de RN-02 com mensagens por campo
- [ ] Catálogo fora → nada é gravado
- [ ] Trigger impede `UPDATE`/`DELETE` em `lot_entries`

## Testes obrigatórios

- CT-03-01 a CT-03-05, CT-03-07
- Unit: canonical JSON (ordem de chaves, datas, null)
- CT-08-12 — pseudônimos diferentes por lote

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
