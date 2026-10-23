# LC-006 — Criar lote com snapshot do item, imagem e gênese da cadeia

| Campo | Valor |
|---|---|
| Status | REVIEW |
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

- [x] Lote criado guarda snapshot, imagem e `genesis_hash`
- [x] Validações de RN-02 com mensagens por campo
- [x] Catálogo fora → nada é gravado
- [x] Trigger impede `UPDATE`/`DELETE` em `lot_entries`

## Testes obrigatórios

- CT-03-01 a CT-03-05, CT-03-07
- Unit: canonical JSON (ordem de chaves, datas, null)
- CT-08-12 — pseudônimos diferentes por lote

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 71 ✓ · web 24 ✓ · api 128 ✓ (223) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| CT-03-01 | lote criado com `item_snapshot`, bytes e SHA-256 da imagem e `genesis_hash` igual ao recalculado; `head_hash = genesis_hash` |
| CT-03-02 | fim < início + 5 min, incremento 0, preço negativo, início no passado → 400 com o campo |
| CT-03-03 / visitante | licitante → 403; sem sessão → 401 |
| CT-03-04 | catálogo fora → 503 e nenhuma linha em `lots`/`images`; falha só na imagem → 503 e nada gravado; obra inexistente → 404 |
| CT-03-05 | fases nas bordas de início/fim e estados finais |
| CT-03-07 | `GET /api/lots/:id` público sem id, nome ou e-mail do vendedor; `me` só logado |
| CT-08-12 | pseudônimo do mesmo usuário muda por lote e por segredo |
| Imagem | `GET /api/images/:id` com bytes, `content-type` e cache imutável; continua com o catálogo fora |
| Append-only | `UPDATE`/`DELETE` em `lot_entries` recusados pelo trigger |
| Restrições | FK `wallet_entries.lot_id → lots`; CHECKs de líder sem lances e fim antes do início |
| API rodando (`CATALOG_PROVIDER=fake`) | cadastro 201 → lote `SCHEDULED` com `Leiloeiro XXXXXX` → leitura pública sem `me` → imagem 200 `image/png` |

Decisões:
- `item_snapshot` em `jsonb` dentro de `lots` (sem tabela `catalog_items`), como na modelagem.
- O horário de início é validado contra o relógio do banco **antes** das chamadas externas.
- `PSEUDONYM_SECRET` passa a ser obrigatório no start (README, Compose e `.env.example`).
- `fetchImage` aceita só JPEG/PNG/WebP até 5 MB; imagem 404 → `CATALOG_ITEM_NOT_FOUND`.
- `recentEntries`, `position` e `myBestBidCents` já são calculados a partir de `lot_entries`
  (vazios até existirem lances no LC-011).
