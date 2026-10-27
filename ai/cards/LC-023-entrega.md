# LC-023 — Publicar o deploy final, escrever o README e enviar o teste

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Épico / dia | E6 Qualidade e entrega · Dia 7 |
| Depende de | LC-021, LC-022 |
| Requisitos | RNF-01, RNF-07, RNF-08 |
| Regras | — |
| Specs | SP-10 |

## Objetivo

Entrega completa: app no ar, README que permite avaliar sem perguntar nada, formulário enviado.

## Escopo

- Deploy final com seed; smoke test com os usuários de demonstração e com a API externa bloqueada
- README com todas as seções obrigatórias de SP-10 (incluindo técnica anti-adulteração, interpretações e limitações)
- `docs/CHECKLIST.md` 100% revisado com evidências
- Envio do formulário (feito por mim, não pelo agente)

## Fora do escopo

- —

## Critérios de aceite

- [ ] Todos os itens do checklist marcados com evidência ou explicados
- [ ] Link público e repositório conferidos numa janela anônima

## Testes obrigatórios

- Smoke test do deploy registrado (prints ou lista de passos executados)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) atualizado
