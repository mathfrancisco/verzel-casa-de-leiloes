# LC-016 — Construir comprovante público e a tela Meus arremates

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E5 Auditoria e gestão · Dia 5 |
| Depende de | LC-014 |
| Requisitos | RF-13, RF-14 |
| Regras | RN-16, RN-19 |
| Specs | SP-07, SP-09 |

## Objetivo

Vencedor acessa e compartilha o comprovante; licitante acompanha tudo em que deu lance.

## Escopo

- `GET /api/receipts/:code` e `GET /api/me/participations`
- Rota `/comprovante/:code` com verificação da assinatura no navegador e link para auditoria
- Rota `/meus-lances` com abas e botão compartilhar (Web Share API / copiar link)

## Fora do escopo

- Prévia Open Graph do link (melhoria opcional)

## Critérios de aceite

- [x] Comprovante abre sem login e sem PII; código inválido → página 404 amigável (CT-07-06 passou no PostgreSQL isolado)
- [x] Status de participação corretos em todos os casos (CT-07-07 passou no PostgreSQL isolado)

## Testes obrigatórios

- CT-07-06, CT-07-07

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída local real; PR ainda pendente
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
- Integração: PR #17 integrada em `84b58d2`; CI da PR (run 40382967358) e pós-merge (run 40383341310) passaram.
