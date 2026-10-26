# LC-015 — Construir a auditoria pública com verificação no servidor e no navegador

| Campo | Valor |
|---|---|
| Status | DONE |
| Épico / dia | E5 Auditoria e gestão · Dia 5 |
| Depende de | LC-010, LC-014 |
| Requisitos | RF-15, RNF-05, RNF-06 |
| Regras | RN-15, RN-16 |
| Specs | SP-08, SP-09 |

## Objetivo

Qualquer pessoa confere, sem login, se o histórico de um lote está íntegro.

## Escopo

- `GET /api/audit/public-key` e `GET /api/lots/:id/audit`
- Rota `/auditoria/:lotId`: veredito, checagens, tabela de elos, "como verificar", verificação local no navegador
- Testes de adulteração com SQL direto (trigger desabilitado na sessão de teste)

## Fora do escopo

- Truncamento de lote ao vivo via `localStorage` é melhoria opcional deste card, não bloqueia o DONE

## Critérios de aceite

- [x] Cada adulteração via SQL é acusada no check esperado
- [x] Página mostra o mesmo veredito calculado no navegador
- [x] Resposta sem PII

## Testes obrigatórios

- CT-08-01 a CT-08-11 (versão integração, adulterando o banco)

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidência local

- Testes focados: API de auditoria 14/14 e componente web 2/2.
- `lint`, `typecheck`, `test` e `build` completos passaram com exit 0. A suíte
  totalizou 407 testes: 104 shared, 222 API e 81 web, sem falhas ou skips.
  Após corrigir a formatação do teste `ready`, o lint foi repetido com sucesso.
  Os avisos de `act` e de future flags nos testes de componentes não foram fatais.
- No build de produção servido localmente, a auditoria pública mostrou `INTACT`
  com os sete checks aprovados. Após alterar o valor do lance via SQL, mostrou
  `TAMPERED`, com falha em `HASHES` no elo 1. UUID inválido retornou 404.
- Na viewport de 360 px, o documento final mediu 345 px de largura, sem
  overflow horizontal; as tabelas rolaram internamente (655 px e 279 px).
  O ajuste de uma regra CSS foi seguido por novo build web e ensaio no navegador.
- Revisão técnica assistida final sem problemas após correções de UUID inválido,
  associação do veredito ao relatório e melhorias de CT-08-05/CT-08-06.
- Catálogo falso e PostgreSQL descartável. Evidência: `../work/lc015-validation.log`.
- Publicação e CI permanecem pendentes; o card fica em `REVIEW`.
- Integração: PR #16 integrada em `9aaeb8d`; CI da PR (run 40381804069) e pós-merge (run 40382175128) passaram.
