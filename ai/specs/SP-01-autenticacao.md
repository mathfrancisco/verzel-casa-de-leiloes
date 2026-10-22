# SP-01 — Autenticação e papéis

**Requisitos:** RF-01, RNF-09 · **Regras:** RN-01 · **Cards:** LC-003

## Responsabilidade

Cadastro, login, logout, usuário atual e autorização por papel. Sem recuperação de senha
(fora do escopo do PDF).

## API

| Método | Rota | Auth | Corpo | Sucesso | Erros |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password, role }` | 201 `{ user }` + cookie | `VALIDATION_ERROR`, `EMAIL_TAKEN`, `RATE_LIMITED` |
| POST | `/api/auth/login` | — | `{ email, password }` | 200 `{ user }` + cookie | `INVALID_CREDENTIALS`, `RATE_LIMITED` |
| POST | `/api/auth/logout` | sessão | — | 204, cookie removido | — |
| GET | `/api/auth/me` | sessão | — | 200 `{ user }` | `UNAUTHENTICATED` |

`user = { id, name, email, role }` — só devolvido ao próprio usuário.

Validação: `name` 2–80; `email` válido, normalizado em minúsculas; `password` 8–128;
`role ∈ { AUCTIONEER, BIDDER }`.

## Comportamento

- Senha com argon2id. Login com e-mail inexistente e senha errada respondem igual
  (`INVALID_CREDENTIALS`) e em tempo semelhante.
- Cadastro cria a carteira com saldo 0 na mesma transação.
- Plugin Fastify `auth` decora `request.user` a partir do cookie; `requireRole(role)` como
  `preHandler` → `UNAUTHENTICATED` ou `FORBIDDEN`.
- Cookie inválido/expirado → tratado como visitante em rotas públicas; 401 nas protegidas.

## Casos de teste

| ID | Tipo | Cenário | Esperado |
|---|---|---|---|
| CT-01-01 | integração | Cadastro válido de licitante | 201, cookie definido, carteira criada com 0 |
| CT-01-02 | integração | Cadastro com e-mail já usado (variação de maiúsculas) | 409 `EMAIL_TAKEN` |
| CT-01-03 | integração | Cadastro com senha de 7 caracteres / papel inválido | 400 `VALIDATION_ERROR` |
| CT-01-04 | integração | Login correto | 200 + cookie |
| CT-01-05 | integração | Login com senha errada e com e-mail inexistente | 401 `INVALID_CREDENTIALS` em ambos |
| CT-01-06 | integração | `/me` sem cookie / com cookie adulterado | 401 |
| CT-01-07 | integração | Leiloeiro chama rota `requireRole('BIDDER')` | 403 `FORBIDDEN` |
| CT-01-08 | integração | Logout e depois `/me` | 401 |
| CT-01-09 | unit | Hash armazenado não contém a senha e verifica corretamente | ok |
