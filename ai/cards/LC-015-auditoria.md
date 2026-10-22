# LC-015 — Construir a auditoria pública com verificação no servidor e no navegador

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Cada adulteração via SQL é acusada no check esperado
- [ ] Página mostra o mesmo veredito calculado no navegador
- [ ] Resposta sem PII

## Testes obrigatórios

- CT-08-01 a CT-08-11 (versão integração, adulterando o banco)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
