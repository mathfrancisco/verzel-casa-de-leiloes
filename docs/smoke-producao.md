# Smoke test produção — 26/10/2026 (main@6597069, Northflank)

- Seed: CMD override `sh -c 'node dist/seed.js; exec node dist/main.js'` (rodar seed via shell junto da API estoura 256 MB e reinicia o pod). Log 20:34:48Z "Seed de demonstração criado.".
- Vitrine: Ao vivo 2, Agendados 1, Encerrados 2.
- Lote "Névoa sobre a cidade" (01a179ec-3f9c-7288-8a4a-1945647b20a9): Ana R$ 220,00 (17:41 BRT, carteira 48.800,00 -> 48.580,00 retido); Bruno R$ 240,00 (17:43, "Prorrogado" anti-sniping); CLOSED 17:45:54; Bruno "Lote encerrado — você venceu".
- Auditoria: "Cadeia íntegra", 7 verificações ok (SEQUENCE, LINKS, HASHES, SIGNATURES, HEAD, RECEIPT, RULES), 4 elos.
- Comprovante /comprovante/-jhr5zofTwKjaxS3a9H7FQ: R$ 240,00, Licitante U5RYZV, hash final e022dc85…9dfd9b25, "Assinatura verificada neste navegador".
- Pendente: aviso "você foi superado" sem recarregar não observado (Ana e Bruno na mesma sessão do navegador); leiloeiro: busca no catálogo ARTIC e criar lote.

# Ensaio local e produção — 27/10/2026 (main@4c00b3c)

Local (`docker compose`, banco zerado, main@2fbbb1d e depois 4c00b3c):

- Vitrine anônima ok; sem requisição ao `artic.edu` a partir do navegador.
- Ana R$ 220,00 ("Você está ganhando"); Bruno R$ 240,00 por outra sessão; a tela da Ana mudou
  para "Você foi superado" e posição 2ª **sem recarregar**.
- Auditoria: "Cadeia íntegra", 7 verificações ok, 3 elos.
- Leiloeiro: busca "Monet" no catálogo ARTIC real (página 1 de 50), lote "Water Lilies" criado
  com imagem e metadados do museu.
- Seed com obras reais (PR #31): imagem real na sala, categoria em português ("Gravura"), menu
  lateral abrindo à direita em 375 px.

Produção (Northflank):

- Banco zerado (`DROP SCHEMA`) e serviço reiniciado; o seed recriou usuários e 5 lotes com obras
  reais. `/ready` 200; `/api/images/:id` 200 `image/jpeg`; auditoria do lote 200.
- Pendente: fluxo com login em produção após o reset (lances, encerramento, comprovante, leiloeiro).
