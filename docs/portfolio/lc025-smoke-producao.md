# LC-025 — Smoke autenticado em produção

- **Data:** 28/10/2026, por volta de 09:30 (horário de Brasília).
- **URL:** https://p01--verzel-casa-de-leiloes--4cj5fhqhqb2r.code.run
- **Revisão observada:** a API não expõe o SHA implantado. O último CI da `main` foi o run
  [40565064515](https://github.com/mathfrancisco/verzel-casa-de-leiloes/actions/runs/40565064515),
  com resultado `success` em `a5b3afa`. A produção ainda responde 404 em `/favicon.ico`, o que
  confirma que o branch `feat/portfolio-essenciais` (LC-028) **não** está implantado. A confirmação
  do SHA exato fica pendente no painel do Northflank.
- **Banco:** não houve reset. O smoke usou as contas de demonstração do seed e dinheiro simulado.
- **Credenciais:** o dono do repositório digitou as senhas. Nenhum valor secreto aparece neste
  registro.

## Contextos

| Sessão | Navegador | Conta |
|---|---|---|
| A | Painel do navegador do app Claude (viewport mobile) | `ana@demo.com` |
| B | Chromium do Playwright MCP (perfil separado) | `bruno@demo.com` |

## Passos e resultados

| # | Ação | Resultado observado |
|---|---|---|
| 1 | `GET /health` | `200 {"status":"ok"}` |
| 2 | Login de A e de B | `GET /api/auth/me` retorna 200 nas duas sessões |
| 3 | A abre o lote ao vivo `01a17dad…` (Great Wave, termina em 30/10 14:05 UTC) | Preço R$ 1.200,00, mínimo R$ 1.300,00, "Você está ganhando" |
| 4 | B oferece R$ 1.250,00 | Recusado: "Lance abaixo do mínimo. O próximo lance deve ser de pelo menos R$ 1.300,00." |
| 5 | B oferece R$ 1.300,00 | Aceito. A, sem recarregar a página, passa a ver R$ 1.300,00, "⚠ Você foi superado", a posição 2ª e o aviso "Você foi superado em Under the Wave off Kanagawa…" |
| 6 | Carteiras | A: `committedCents 0`, disponível R$ 50.000,00. B: `committedCents 130000`, disponível R$ 47.900,00 |
| 7 | `GET /api/lots/:id/audit` (sessão A) | 200 com o genesis do lote |
| 8 | B clica em Sair | B: `/api/auth/me` 401. A continua com 200, sem mistura de sessão |
| 9 | A clica em Sair (menu mobile) | A: `/api/auth/me` 401 |

## Limites e pendências

- **Encerramento e comprovante não foram testados em produção.** O único lote ao vivo termina em
  30/10. Esses fluxos continuam cobertos apenas pelos testes E2E com FakeCatalog
  (`pnpm test:e2e`, 27/27, registrados no LC-026).
- O catálogo externo (ArtIC) não foi exercitado neste smoke. A busca do leiloeiro em produção
  fica fora deste registro.
- No console apareceram `401 /api/auth/me` antes do login (esperado), `404 /favicon.ico`
  (resolvido pelo LC-028, ainda não implantado) e um aviso do WebSocket fechado durante a troca
  de página.
- `POST /api/auth/logout` chamado direto por `fetch` sem corpo respondeu 400. O botão da
  interface funciona. O comportamento da rota com chamada direta não foi investigado.
- O smoke deixou um lance real de demonstração (B, R$ 1.300,00) no lote ao vivo.
