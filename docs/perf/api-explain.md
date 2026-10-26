# Desempenho da API — planos de execução (EXPLAIN)

Medição com `EXPLAIN (ANALYZE, BUFFERS)` no PostgreSQL 16, em banco descartável com o seed de
demonstração mais dados sintéticos inseridos só por SQL: 5.005 lotes (70% encerrados, 15% ao vivo,
15% agendados, 20 vendedores), 50.998 `lot_entries` (um lote com 1.000 lances), 20.000
`wallet_entries`. As consultas são as geradas de fato pelo Drizzle (capturadas pelo logger), com
`ANALYZE` feito antes. Tempos em ms, banco local: servem para comparar antes × depois, não como SLA.

## Resumo

| Consulta (caminho quente) | Antes | Depois | Observação |
|---|---|---|---|
| Vitrine ao vivo — página | 0,19 | 0,18 | `lots_state_ends_idx` + sort incremental; sem mudança |
| Vitrine agendados — página | 0,23 | 0,16 | `lots_state_starts_idx` |
| **Vitrine encerrados — página** | **4,39** (Seq Scan + top-N sort em 3.252 linhas) | **0,99** (Index Scan `lots_visible_ends_idx`) | índice novo |
| **Vitrine encerrados, `sort=newest`** | **4,40** (Seq Scan + sort) | **0,11** (Index Scan `lots_visible_created_idx`) | índice novo |
| Vitrine ao vivo + busca `q` | 0,21 | 0,19 | GIN `lots_search_idx` não é escolhido a 5k linhas, mas a página sai pelo índice de estado |
| Vitrine ao vivo + categoria + faixa de preço | 0,71 | 0,70 | BitmapAnd `lots_category_price_idx` × `lots_state_ends_idx` |
| Vitrine ao vivo `sort=price_asc` | 1,77 | 1,75 | top-N heapsort sobre ~750 linhas ao vivo; ver "Não alterado" |
| Contagens das abas (todas as vitrines) | 1,9–3,2 | 1,9–3,0 | Seq Scan (820 buffers) — ver "Não alterado" |
| Sala do lote GET /api/lots/:id | 0,06 + 0,07 | idem | `lots_pkey` + `lot_entries_lot_seq_unique` (Index Scan Backward, limite 50) |
| Sala do lote, posição do licitante (`max` por `bidder_id`, 1.000 lances) | 0,66 | 0,59 | Bitmap por `lot_id`; só lê o lote consultado |
| Auditoria de um lote (5 consultas, cadeia de 1.000 elos) | 0,08 / 0,02 / 0,02 / 0,01 / 1,09 | idem | elos por `lot_entries_lot_seq_unique` + sort por `seq` em memória (259 kB) |
| Carteira / participações do licitante (4 consultas) | 0,03 / 0,13 / 0,09 / 0,25 | idem | `wallet_entries_user_created_idx`, `lots_active_leader_idx` |
| Painel do leiloeiro (3 consultas, 283 lotes do vendedor) | 0,01 / 0,07 / 1,03 | idem | `lots_seller_created_idx` (Bitmap) + sort de 283 linhas |

## Mudança: índices parciais da vitrine (migration `0005_indices_vitrine.sql`)

A aba "encerrados" filtra `(state = 'ACTIVE' AND ends_at <= now()) OR state IN ('SETTLED',
'CLOSED_NO_WINNER')`. O `OR` entre estados impede o uso de `lots_state_ends_idx`/`lots_state_starts_idx`
(ambos começam por `state`), então a consulta varria a tabela inteira e ordenava. O mesmo vale para
`sort=newest` (`created_at desc`), que não tem índice de ordenação em nenhuma aba.

Dois índices parciais, sem os cancelados (nunca aparecem na vitrine; o predicado `state <>
'CANCELLED'` é implicado por qualquer um dos braços do filtro, então o planejador os aceita):

```sql
CREATE INDEX "lots_visible_ends_idx"    ON "lots" ("ends_at"    DESC NULLS FIRST, "id" DESC NULLS FIRST) WHERE state <> 'CANCELLED';
CREATE INDEX "lots_visible_created_idx" ON "lots" ("created_at" DESC NULLS FIRST, "id" DESC NULLS FIRST) WHERE state <> 'CANCELLED';
```

`NULLS FIRST` é o padrão do `DESC` e é o que o `ORDER BY` do Drizzle gera: a primeira versão
(gerada com `NULLS LAST`, padrão do `.desc()` do drizzle-kit) não era usada pelo planejador. O par
`(valor desc, id desc)` casa com a paginação por chave `(valor, id)` e a direção oposta (`asc`) é
atendida por varredura reversa. Custo de escrita baixo: as colunas indexadas (`ends_at`,
`created_at`, `id`) quase não mudam depois da criação do lote (`ends_at` só na extensão
anti-sniping); os lances já alteram outras colunas indexadas de `lots` (`current_price_cents`,
`leader_id`), então estes índices não pioram o caminho do lance.

### Antes — encerrados (Seq Scan + sort)

```
Sort  (actual time=4.331..4.333 rows=13)
  Sort Key: ends_at DESC, id DESC
  Sort Method: top-N heapsort  Memory: 47kB
  ->  Seq Scan on lots  (actual time=0.009..2.078 rows=3252)
Execution Time: 4.393 ms
```

### Depois — encerrados

```
Limit  (actual time=0.920..0.931 rows=13)
  ->  Index Scan using lots_visible_ends_idx on lots  (actual time=0.919..0.928 rows=13)
        Filter: (((state = 'ACTIVE') AND (ends_at <= now())) OR (state = ANY ('{SETTLED,CLOSED_NO_WINNER}')))
        Rows Removed by Filter: 1503
        Buffers: shared hit=1518
Execution Time: 0.985 ms
```

Os 1.503 descartados são lotes ao vivo/agendados com `ends_at` no futuro, que aparecem primeiro na
ordem decrescente; o ganho é menor que no `newest` (onde só 3 linhas são descartadas, 13 buffers).

### Antes/depois — `closed` + `sort=newest`

```
-- antes
Sort (top-N heapsort) -> Seq Scan on lots (rows=3252)               Execution Time: 4.402 ms
-- depois
Limit -> Index Scan using lots_visible_created_idx (rows=13, Rows Removed by Filter: 3, Buffers: 13)
                                                                     Execution Time: 0.106 ms
```

## Não alterado (decisão consciente)

- **Contagens das abas** (`count(*) FILTER …` sem `WHERE` quando não há filtros): o Seq Scan de
  820 páginas (~2 ms a 5k lotes) é o plano mais barato para contar quase a tabela toda; cresce
  linearmente. Se a vitrine passar de ~50k lotes, a saída é uma contagem em cache curto ou tabela
  de contadores — não um índice.
- **`sort=price_asc|price_desc`**: ordena por `coalesce(current_price_cents, starting_price_cents)`
  sobre o conjunto da aba (~750 lotes ao vivo), 1,7 ms. Um índice por expressão ficaria
  desatualizado a cada lance (escrita em toda oferta) para ganhar < 2 ms.
- **Busca `q`**: o GIN `lots_search_idx` só vira vantagem com mais lotes; o planejador já o escolhe
  quando a seletividade compensa.
- **Auditoria / sala do lote**: a posição do licitante lê todos os lances `BID` do lote (agregado
  por `bidder_id`); com 1.000 lances custa 0,6 ms. Linear no tamanho da cadeia do lote, não do banco.
- **Painel do leiloeiro** devolve todos os lotes do vendedor sem paginação (sort de 283 linhas,
  ~1 ms). Paginação mudaria o contrato; ver sugestão no PR.
- **Limpeza de chaves de idempotência** (`created_at < now() - 24h`, sem índice em `created_at`):
  roda em segundo plano sobre tabela pequena (24 h de dados); não medido como caminho quente.

## N+1

Revisados todos os `for`/`map(async…)` em `application/` e `http/`: nenhum faz consulta por item de
resultado. `cancelLot` chama `walletView` no máximo 2 vezes (vencedor e vendedor), e `settleDueLots`
percorre lotes vencidos em lotes de transação de propósito. `test/integration/perf.test.ts` trava o
número de consultas da vitrine, do painel do leiloeiro e da carteira (igual com 1 ou 16 lotes /
0 ou 5 compromissos).

## Limites do servidor (não são planos, registrados aqui por completude)

`SERVER_LIMITS` em `apps/api/src/app.ts`: `bodyLimit` 100 KiB (maior corpo legítimo é a criação de
lote), `requestTimeout` 30 s, `connectionTimeout` 120 s, `keepAliveTimeout` 65 s (> 60 s dos
balanceadores). `statement_timeout` de 15 s no pool (`infra/db/client.ts`; migrations usam
conexão própria, sem o limite). Corpo grande demais responde `413` com `VALIDATION_ERROR` no
envelope da SP-00 (a SP-00 não tem código próprio para isso).
