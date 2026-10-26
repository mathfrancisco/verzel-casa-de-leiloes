# LC-010 — Implementar a cadeia de hashes assinada e o verificador compartilhado

| Campo | Valor |
|---|---|
| Status | DONE |
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

- [x] Cadeia válida → `INTACT`; cada tipo de adulteração em memória → `TAMPERED` no check certo
- [x] Mesmo resultado no Node e no ambiente de navegador (Vitest `happy-dom` com WebCrypto e fallback `@noble/ed25519`)

## Testes obrigatórios

- CT-08-01 a CT-08-09 em versão unitária (adulterando objetos em memória)
- CT-08-10

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes localmente
- [x] Todos os critérios de aceite com evidência local
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências

- Local: `pnpm lint` concluiu com `All matched files use Prettier code style!`; `pnpm typecheck` concluiu nos três pacotes; `pnpm test` concluiu 325 testes (103 shared, 166 API e 56 web), sem skips, usando o banco descartável `127.0.0.1:55439` e `FakeCatalog`; `pnpm build` concluiu `tsup` e Vite.
- Revisão técnica assistida: os quatro achados sobre recibo, revogação, transições terminais e paridade do navegador foram corrigidos e a re-revisão não encontrou pendências.
- Integração: PR #10 integrada em `0b6dfaa`; CI da PR (run 40262860918) e pós-merge (run 40263027354) passaram.
