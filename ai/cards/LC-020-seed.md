# LC-020 — Criar o seed de demonstração com cadeia válida

| Campo | Valor |
|---|---|
| Status | DONE |
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

- [x] Login dos 3 usuários funciona; há lote ao vivo com lances abertos (`seed.test.ts`: login 200 dos 3, um lote ao vivo com 3 lances; navegador: Ana logada, carteira R$ 48.800,00, "Estudo em vermelho" com 3 lances)
- [x] Auditoria de todos os lotes do seed = `INTACT` (`seed.test.ts` após o 1º e o 2º `seed` e após `seed:reset`; navegador: 5 lotes `INTACT`, página do liquidado com as 7 verificações e recibo)

## Testes obrigatórios

- CT-10-03

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes (507: shared 114, web 120, API 273). Saída em `../work/lc020-validation.log`; PR pendente. Implementado sobre LC-014 e LC-018 em `REVIEW`, por decisão do coordenador
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` atualizado; `docs/USO-DE-IA.md` fica a cargo do coordenador

## Decisões

- Relógio controlado: `createLot`, `placeBid` e `settleDueLots` aceitam `clock?: () => Date`
  opcional. Sem ele (API e worker), vale o `now()` do banco; só o seed o passa. Assim lances e
  liquidações do passado são assinados com o horário em que "aconteceram" e a auditoria fica
  íntegra sem forjar dados.
- Idempotência: se `leiloeiro@demo.com` existe, o `seed` não faz nada. `seed:reset` apaga os
  schemas `public` e `drizzle`, reaplica as migrations e semeia; recusa `NODE_ENV=production`
  e banco fora de `localhost`, `127.0.0.1`, `::1` ou `db`. Se o leiloeiro existe sem os 5 lotes
  (execução interrompida), o `seed` avisa "Seed incompleto" em vez de seguir calado.
- Fixtures em `apps/api/seed/fixtures`: 5 itens fictícios e imagens PNG geradas por script
  (CC0). Não são obras do Art Institute; trocar por imagens CC0 reais exige baixá-las.
- Compose: `app` roda `node dist/seed.js && node dist/main.js`; a imagem copia `seed/`.

## Limitações

- Depósitos têm horário real; lances do seed têm horário controlado no passado. A carteira não
  é auditada, mas o extrato mostra o depósito depois dos lances antigos.
- O `docker-compose.yml` ainda não define `AUDIT_SIGNING_PRIVATE_KEY` (lacuna anterior); sem
  ela, nem a API nem o seed sobem no compose. CT-10-01 fica para LC-023.
- Esta branch tem o `placeBid` com `now()`; a correção `clock_timestamp()` publicada no LC-011
  entra ao integrar `main`, ao lado do `clock` opcional.

Integração: PR #21 integrada em `9c19b4f`; CI da PR (run 40387584676) e pós-merge (run 40387958180) passaram.
