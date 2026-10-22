# LC-003 — Implementar cadastro, login, logout e autorização por papel

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Cadastro cria usuário e carteira com saldo 0 na mesma transação
- [ ] Login inválido sempre responde `INVALID_CREDENTIALS`
- [ ] Rotas protegidas respondem 401/403 corretamente
- [ ] Fluxo de cadastro → login → sair funciona no navegador

## Testes obrigatórios

- CT-01-01 a CT-01-09

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
