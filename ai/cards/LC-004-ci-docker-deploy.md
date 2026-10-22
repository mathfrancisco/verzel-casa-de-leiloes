# LC-004 — Configurar CI, imagem Docker única e deploy do esqueleto

| Campo | Valor |
|---|---|
| Status | DOING — aguardando push (CI) e conta no Northflank (deploy) |
| Épico / dia | E1 Fundação · Dia 1 |
| Depende de | LC-003 |
| Requisitos | RNF-01, RNF-12, RNF-13, RNF-14 |
| Regras | — |
| Specs | SP-10 |

## Objetivo

Esqueleto (login funcionando) publicado num link público e CI rodando a cada push.

## Escopo

- `Dockerfile` multi-stage: API serve o build do web (`@fastify/static`, fallback do SPA para `index.html`)
- Migrations no start; usuário não-root
- Serviço `app` no `docker-compose.yml`
- `.github/workflows/ci.yml`: install → lint → typecheck → test (service postgres) → build → docker build
- Deploy no provedor escolhido + Postgres gerenciado; WebSocket de teste validado (eco simples)
- README: seção provisória com link do deploy e como rodar com Docker

## Fora do escopo

- E2E (LC-022)
- README final (LC-023)

## Critérios de aceite

- [x] `docker compose up` em clone limpo sobe a app em `http://localhost:3000`
- [ ] CI verde no GitHub Actions
- [ ] Link público abre o app, cadastro/login funcionam e o cookie persiste
- [x] Provedor escolhido e motivo registrados no README

## Testes obrigatórios

- CT-10-01 — compose em clone limpo
- Smoke manual no deploy (registrar no PR: URL, cadastro, login, `/ready`)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (22/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| `pnpm test` | shared 37 ✓ · web 24 ✓ · api 52 ✓ (113); novos: SPA servido pela API (6), eco WebSocket (1), migrations no start (1) |
| `docker build` | imagem de 301 MB, roda como usuário `node`, contém só `dist`, `drizzle`, `public`, `node_modules` de produção |
| `docker compose up` com volume zerado | migrations aplicadas no start (2 registradas); `/ready` → `{"status":"ready"}`; `/` → SPA; `/lotes/1` → 200 (SPA); `/api/x` → 404 JSON |
| Cadastro via container | 201; cookie `HttpOnly; Secure; SameSite=Lax` |
| Chromium contra o container (`localhost:3000`) | os 8 passos do fluxo de autenticação do LC-003 passaram |
| Socket.IO contra o container | transporte `websocket`; eco `{"pong":true,…}` |
| `.github/workflows/ci.yml` | YAML válido; **execução no GitHub pendente do push** |
| Deploy no Northflank | **pendente**: depende da conta do usuário |

Observação do ambiente de desenvolvimento: aqui o Docker Hub limitou downloads (429) e o acesso
externo passa por um proxy com certificado próprio. Para testar, a imagem base veio do espelho
`mirror.gcr.io` e o build usou uma cópia temporária do `Dockerfile` com o certificado do proxy
(duas linhas a mais). O `Dockerfile` do repositório não depende disso.

Decisões:
- Migrations no início do processo da API (idempotentes), sem job separado.
- Socket.IO já anexado ao servidor com um eco `ping`, para validar WebSocket no deploy; salas e
  eventos ficam no LC-012.
- Rotas sem extensão fora de `/api` e `/socket.io` devolvem o `index.html` (SPA); `/assets/*`
  com cache imutável, `index.html` com `no-cache`.
