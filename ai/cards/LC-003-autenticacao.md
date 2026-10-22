# LC-003 — Implementar cadastro, login, logout e autorização por papel

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Épico / dia | E1 Fundação · Dia 1 |
| Depende de | LC-002 |
| Requisitos | RF-01, RNF-09 |
| Regras | RN-01 |
| Specs | SP-01, SP-00 |

## Objetivo

Usuários se cadastram como leiloeiro ou licitante e o servidor restringe rotas por papel.

## Escopo

- Rotas `/api/auth/register`, `/login`, `/logout`, `/me` conforme SP-01
- argon2id; JWT em cookie httpOnly; plugin `auth` e `requireRole`
- Handler de erro global no formato de SP-00
- Rate limit em login/cadastro (`@fastify/rate-limit`), `@fastify/helmet`
- Web: páginas `/entrar` e `/cadastro`, contexto de sessão (`useMe`), guarda de rota por papel, cabeçalho com usuário e sair

## Fora do escopo

- Recuperação de senha (fora do escopo do PDF)

## Critérios de aceite

- [x] Cadastro cria usuário e carteira com saldo 0 na mesma transação
- [x] Login inválido sempre responde `INVALID_CREDENTIALS`
- [x] Rotas protegidas respondem 401/403 corretamente
- [x] Fluxo de cadastro → login → sair funciona no navegador

## Testes obrigatórios

- CT-01-01 a CT-01-09

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 37 ✓ · web 24 ✓ · api 44 ✓ (105 testes); `auth.test.ts` cobre CT-01-01 a CT-01-08, `password.test.ts` o CT-01-09 |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| Navegador (Chromium + `pnpm dev`) | visitante em `/carteira` → `/entrar?next=/carteira`; cadastro vazio mostra erros por campo; cadastro de licitante entra logado; licitante em `/painel` vê "Sem permissão"; sair; senha errada → "E-mail ou senha incorretos."; login volta para `/carteira`; sessão persiste ao recarregar; cookie `httpOnly`, `SameSite=Lax`, `path=/` |

Negativos cobertos: e-mail repetido com maiúsculas diferentes, senha curta, papel inválido,
e-mail inválido, nada gravado quando a validação falha, senha errada e e-mail inexistente com a
mesma resposta, cookie adulterado, token de outro segredo, papel errado (403), sem sessão (401),
`Content-Type` diferente de JSON, JSON malformado, excesso de tentativas (429), redirecionamento
`next` externo ignorado.

Decisões:
- Mensagens padrão dos códigos de erro em `packages/shared/src/errors.ts` (`ERROR_MESSAGES`).
- Requisições `POST/PUT/PATCH/DELETE` sem `Content-Type: application/json` → 400
  `VALIDATION_ERROR` (registrado na SP-00). O cliente web sempre envia JSON (`{}` sem corpo).
- Rotas registradas dentro de um plugin para o rate limit ler a configuração de cada rota.
- IDs de usuário em UUID v7 (pacote `uuid`).
- Telas de carteira e painel são placeholders "Em construção" só para exercitar a proteção de
  rota; o conteúdo entra no LC-009 e no LC-017.
