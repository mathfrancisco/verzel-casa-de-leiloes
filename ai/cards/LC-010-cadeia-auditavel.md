# LC-010 — Implementar a cadeia de hashes assinada e o verificador compartilhado

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E3 Lances e carteira · Dia 3 |
| Depende de | LC-006 |
| Requisitos | RNF-05 |
| Regras | RN-15, RN-16 |
| Specs | SP-08 |

## Objetivo

Funções puras que criam e verificam elos, idênticas no servidor e no navegador.

## Escopo

- `packages/shared/auditVerify.ts`: `hashEntry`, `verifyChain` (checks SEQUENCE, LINKS, HASHES, SIGNATURES, HEAD, RECEIPT, RULES)
- Port `Signer` + `Ed25519Signer` (Node `crypto`); script `pnpm keys:generate`
- Adaptador de cripto para navegador (WebCrypto com fallback `@noble/ed25519`)
- Fixture de cadeia compartilhada para testes de paridade

## Fora do escopo

- Endpoint e página de auditoria (LC-015)
- Uso no lance (LC-011)

## Critérios de aceite

- [ ] Cadeia válida → `INTACT`; cada tipo de adulteração em memória → `TAMPERED` no check certo
- [ ] Mesmo resultado no Node e no ambiente de navegador (Vitest `happy-dom`/`jsdom` com WebCrypto)

## Testes obrigatórios

- CT-08-01 a CT-08-09 em versão unitária (adulterando objetos em memória)
- CT-08-10

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
