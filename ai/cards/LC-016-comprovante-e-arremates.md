# LC-016 — Construir comprovante público e a tela Meus arremates

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Comprovante abre sem login e sem PII; código inválido → página 404 amigável
- [ ] Status de participação corretos em todos os casos

## Testes obrigatórios

- CT-07-06, CT-07-07

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
