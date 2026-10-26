# Checklist de requisitos (PDF → requisito → card → evidência)

Cada linha só é marcada quando houver evidência real (teste rodando, tela no deploy ou trecho
do README), registrada no PR do card. IDs em [`01-requisitos.md`](01-requisitos.md); cards em
[`../ai/cards/README.md`](../ai/cards/README.md).

## Obrigatórios gerais

| ✓ | Item do PDF | Requisito | Card | Evidência |
|---|---|---|---|---|
| [ ] | Deploy público da aplicação | RNF-01 | LC-004, LC-023 | |
| [x] | Repositório público no GitHub | — | — | github.com/mathfrancisco/verzel-casa-de-leiloes |
| [x] | Front-End em React | RNF-02 | LC-001 | `apps/web` (React 18 + Vite), build e testes verdes |
| [x] | Back-End em Node.js (Fastify) | RNF-02 | LC-001 | `apps/api` (Fastify 5, Node 22), `/health` testado |
| [ ] | PostgreSQL com instruções no README | RNF-02, RNF-07 | LC-002, LC-023 | |
| [ ] | Itens vindos de uma API pública | RF-02 | LC-005 | Busca no catálogo da AIC pronta e testada com fixtures (LC-005); lote a partir do item no LC-006; falta smoke contra a API real |
| [ ] | Papéis leiloeiro (não dá lance) e licitante | RF-01 | LC-003, LC-011 | Papéis e autorização por papel prontos (LC-003); bloqueio de lance do leiloeiro no LC-011 |
| [ ] | Seed: 1 leiloeiro, 2 clientes, ≥ 1 lote com lances abertos | RF-16 | LC-020 | |
| [ ] | README detalhado, com comportamentos inesperados | RNF-07 | LC-023 | |
| [ ] | Entrega em até 7 dias (29/10/2026) | RNF-08 | LC-023 | |
| [ ] | Formulário enviado, com uso de IA ([`USO-DE-IA.md`](USO-DE-IA.md)) | — | LC-023 | |

## Front-End

| ✓ | Item do PDF | Requisito | Card | Evidência |
|---|---|---|---|---|
| [x] | Vitrine: ao vivo / agendados / encerrados, sem cancelados | RF-04 | LC-007 | Testes da API por aba + teste no Chromium com troca de aba automática (LC-007) |
| [ ] | Painel: buscar na API e criar lote (imagem, título, atributos, início/fim, valor mínimo) | RF-02, RF-03 | LC-008 | LC-008 integrado na PR #9; CI da PR (run 40248272220) e pós-merge (run 40248403542), incluindo Docker, passaram; GitGuardian passou. Navegador real e busca contra a AIC continuam pendentes; ver card para evidências locais e históricas |
| [ ] | Painel: cancelar lote sem lances | RF-05 | LC-018 | |
| [x] | Painel: resultado de cada encerrado e total recebido | RF-06 | LC-017 | CT-03-13 (sem estorno, que é do LC-018) passou no PostgreSQL descartável: total conferido contra o razão, lotes de outro leiloeiro ausentes, 401/403 e painel sem botão de cancelar em teste de componente. No navegador (harness local, FakeCatalog, banco descartável), /painel mostrou total R$ 26,00 igual ao razão e seis lotes com fase/resultado corretos, links de sala e auditoria e sem botão de cancelar. Evidência em `../work/lc017-validation.log`. |
| [ ] | Sala: lance atual, histórico, posição, contagem regressiva | RF-10 | LC-013 | Build final validado no navegador a 360 px sem overflow; estado do lance e histórico carregados no teste de duas sessões; registro local em `../work/lc013-validation.log`. Aguardar registro da evidência no PR para marcar. |
| [ ] | Sala: "você está ganhando" / "você foi superado" sem recarregar | RF-10 | LC-012, LC-013 | Duas sessões reais no navegador: evento de superação exibido apenas ao licitante correto em 243 ms no build final; toast fora da sala em 130 ms; em teste separado, logout removeu toast e formulário. Sem formulário para visitante/leiloeiro. LC-012 passou foco API 17/17 e cliente 4/4; LC-013 passou testes e gates locais. Evidências em `../work/lc013-validation.log` e `../work/lc012-validation.log`; aguardar registro no PR para marcar. |
| [x] | Carteira: total, comprometido, disponível, depósito simulado | RF-07, RF-08 | LC-009 | Testes focados LC-009: API PostgreSQL isolado 10/10, contrato 5/5, domínio 2/2 e web 8/8 (Node 22); integrado na PR #7 (`1b777fd`); CI pós-merge run 40258206330 passou |
| [x] | Meus arremates: com lance + vencidos com comprovante e link | RF-13, RF-14 | LC-016 | CT-07-06/07 passaram no PostgreSQL descartável; suíte local 412 testes (shared 104, API 224, web 84), lint, typecheck e build verdes. No navegador, comprovante público sem login verificou assinatura, item, artista, valor, pseudônimo, data, hash e link de auditoria; adulteração da resposta resultou em assinatura inválida e código inexistente em 404 amigável. A 360 px não houve overflow. Evidência em `../work/lc016-validation.log`; PR/CI pendentes. |
| [ ] | Auditoria: pública, histórico completo, íntegro/adulterado | RF-15 | LC-015 | |
| [ ] | Feedback: abaixo do mínimo, saldo insuficiente, já ganhando, não iniciado, encerrado | RF-11 | LC-011, LC-013 | CT-09-01: Playwright enviou o formulário contra 10 respostas HTTP injetadas no endpoint de lance; todas renderizaram a mensagem SP-09 em `role="alert"` com `aria-live="assertive"`. Evidência em `../work/lc013-validation.log`; aguardar registro no PR para marcar. |

## Back-End

| ✓ | Item do PDF | Requisito / Regra | Card | Evidência |
|---|---|---|---|---|
| [ ] | Vitrine, salas, auditoria e comprovante funcionam com a API fora | RNF-03 / RN-21 | LC-005, LC-023 | |
| [x] | Lance só em lote ao vivo | RN-04 | LC-011 | Domínio 12/12 e integração 9/9 locais; 5 execuções sequenciais no PostgreSQL descartável. Lint, typecheck, testes e build locais passaram; PR/CI pendentes. |
| [x] | 1º lance ≥ inicial; seguintes ≥ atual + incremento | RN-05 | LC-011 | CT-05-01/02 e regressão acima de R$ 10 milhões; integração local e gates locais verdes; PR/CI pendentes. |
| [x] | Líder não cobre o próprio lance | RN-06 | LC-011 | CT-05-07 e integração LC-011 locais; gates locais verdes; PR/CI pendentes. |
| [x] | Saldo comprometido; superado libera na hora; lance só se couber | RN-07, RN-08 | LC-009, LC-011 | CT-05-12 e evento de superação verificam compromisso e liberação; 5 execuções locais; gates locais verdes. |
| [x] | Anti-sniping: últimos 2 min → +2 min | RN-09 | LC-011 | CT-05-06/15 de domínio e integração locais; gates locais verdes; PR/CI pendentes. |
| [ ] | Liquidação: debita vencedor, credita leiloeiro, comprovante; sem lances fecha sem vencedor | RN-10, RN-11 | LC-014 | Evidência local: suíte final 391 testes, incluindo foco LC-014 20/20 e CT-07-04 8/8; `../work/lc014-validation.log`. Aguardar registro no PR para marcar. |
| [ ] | Histórico à prova de adulteração (inclusive direto no banco), técnica explicada | RN-15, RNF-05 | LC-010, LC-015, LC-023 | LC-015 local: auditoria API 14/14; relatório intacto com sete checks; valor adulterado por SQL detectado em `HASHES` no elo 1; UUID inválido 404. Navegador em build final: viewport 360 px sem overflow; tabelas com rolagem interna. Evidência em `../work/lc015-validation.log`. Aguardar registro no PR para marcar. |
| [ ] | Privacidade em auditoria e comprovante | RN-16, RNF-06 | LC-015, LC-016 | LC-015 API 14/14 e teste de componente web 2/2; privacidade validada localmente. Aguardar registro no PR para marcar. |

## Opcionais

| ✓ | Item do PDF | Requisito | Card | Evidência |
|---|---|---|---|---|
| [ ] | Busca e filtro de lotes | RF-17 | LC-019 | |
| [ ] | Cancelamento com estorno automático | RF-18 | LC-018 | |
| [x] | Docker Compose | RNF-13 | LC-002, LC-004 | `docker compose up` sobe Postgres + app em `localhost:3000` com migrations no start |
| [ ] | Testes automatizados | RNF-12 | todos + LC-022 | |
| [ ] | Dark mode | RF-19 | LC-021 | |
