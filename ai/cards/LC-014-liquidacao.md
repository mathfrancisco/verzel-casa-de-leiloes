# LC-014 — Implementar o worker de encerramento e liquidação com comprovante

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E4 Tempo real e liquidação · Dia 4 |
| Depende de | LC-011, LC-012 |
| Requisitos | RF-12, RF-13, RNF-04 |
| Regras | RN-10, RN-11, RN-19 |
| Specs | SP-07 |

## Objetivo

Lotes encerram sozinhos, o dinheiro muda de mãos uma única vez e o vencedor recebe o comprovante.

## Escopo

- `settleDueLots` e `settlementWorker` (ciclo de 1 s, shutdown limpo)
- Elo `CLOSED` assinado, lançamentos financeiros, `receipt` com código aleatório e assinatura
- Eventos `lot.closed`, `lot.won`, `wallet.changed`
- Limpeza de chaves de idempotência antigas

## Fora do escopo

- Página do comprovante (LC-016)

## Critérios de aceite

- [ ] Lote com lances liquida corretamente; sem lances fecha sem vencedor
- [ ] Execuções paralelas não duplicam liquidação
- [ ] Invariantes I-1, I-5, I-6, I-7 verdes

## Testes obrigatórios

- CT-07-01 a CT-07-05, CT-07-08

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
