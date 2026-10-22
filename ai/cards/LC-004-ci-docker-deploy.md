# LC-004 — Configurar CI, imagem Docker única e deploy do esqueleto

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] `docker compose up` em clone limpo sobe a app em `http://localhost:3000`
- [ ] CI verde no GitHub Actions
- [ ] Link público abre o app, cadastro/login funcionam e o cookie persiste
- [ ] Provedor escolhido e motivo registrados no README

## Testes obrigatórios

- CT-10-01 — compose em clone limpo
- Smoke manual no deploy (registrar no PR: URL, cadastro, login, `/ready`)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
