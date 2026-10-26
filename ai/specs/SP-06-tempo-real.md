# SP-06 — Tempo real

**Requisitos:** RF-10, RF-20, RNF-10 · **Regras:** RN-07, RN-09 · **Cards:** LC-012, LC-013

## Conexão

- Socket.IO em `/socket.io`, mesmo domínio. Handshake lê o cookie `session`; sem cookie =
  visitante (só salas públicas).
- Ao conectar autenticado, o servidor coloca o socket em `user:{userId}` automaticamente.
- Cliente entra/sai de sala de lote: `lot.join { lotId }` / `lot.leave { lotId }` (validação
  Zod; lote inexistente → ack com erro).

## Eventos servidor → cliente

Tipos em `packages/shared/src/realtime.ts`. Todos levam `serverTime`.

| Canal | Evento | Payload |
|---|---|---|
| `lot:{id}` | `bid.accepted` | `{ lotId, seq, amountCents, bidderPseudonym, createdAt, hash, currentPriceCents, minimumNextBidCents, bidCount, endsAt }` |
| `lot:{id}` | `lot.extended` | `{ lotId, endsAt, previousEndsAt }` |
| `lot:{id}` | `lot.closed` | `{ lotId, result: 'SOLD' \| 'UNSOLD', finalPriceCents, winnerPseudonym }` |
| `lot:{id}` | `lot.cancelled` | `{ lotId, reason }` |
| `user:{id}` | `lot.cancelled` | `{ lotId, reason }` (cada licitante do lote, para quem está fora da sala) |
| `user:{id}` | `bid.outbid` | `{ lotId, lotTitle, newPriceCents }` |
| `user:{id}` | `wallet.changed` | `{ totalCents, committedCents, availableCents }` |
| `user:{id}` | `lot.won` | `{ lotId, lotTitle, amountCents, receiptCode }` |

## Regras

- Emitir **somente após o commit** (coletar eventos na transação e publicar depois).
- Nenhum payload público contém dado pessoal (só pseudônimos).
- Cliente: ao (re)conectar ou voltar à aba, invalida queries do lote e da carteira e refaz o
  snapshot via REST; eventos com `seq` ≤ ao já exibido são ignorados.
- "Você está ganhando/foi superado" é derivado no cliente comparando `bidderPseudonym` com o
  pseudônimo do usuário naquele lote (fornecido em `LotDetail.me`) — sem expor ids.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-06-01 | integração | 2 clientes na sala; lance aceito | ambos recebem `bid.accepted` |
| CT-06-02 | integração | Lance recusado | nenhum evento emitido |
| CT-06-03 | integração | Líder superado | recebe `bid.outbid` e `wallet.changed` no canal pessoal |
| CT-06-04 | integração | Visitante tenta entrar em `user:{id}` | negado |
| CT-06-05 | integração | Erro na transação após coletar evento | nada emitido |
| CT-06-06 | e2e | 2 navegadores: B cobre A | A vê "Você foi superado" sem recarregar (< 1 s) |
