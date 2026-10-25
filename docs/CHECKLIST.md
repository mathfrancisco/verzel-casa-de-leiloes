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
| [ ] | Painel: buscar na API e criar lote (imagem, título, atributos, início/fim, valor mínimo) | RF-02, RF-03 | LC-008 | Tela e API prontas e testadas no navegador com o catálogo falso (LC-006, LC-008); falta busca contra a AIC real |
| [ ] | Painel: cancelar lote sem lances | RF-05 | LC-018 | |
| [ ] | Painel: resultado de cada encerrado e total recebido | RF-06 | LC-017 | |
| [ ] | Sala: lance atual, histórico, posição, contagem regressiva | RF-10 | LC-013 | Build final validado no navegador a 360 px sem overflow; estado do lance e histórico carregados no teste de duas sessões; registro local em `../work/lc013-validation.log`. Aguardar registro da evidência no PR para marcar. |
| [ ] | Sala: "você está ganhando" / "você foi superado" sem recarregar | RF-10 | LC-012, LC-013 | Duas sessões reais no navegador: evento de superação exibido apenas ao licitante correto em 243 ms no build final; toast fora da sala em 130 ms; em teste separado, logout removeu toast e formulário. Sem formulário para visitante/leiloeiro. LC-012 passou foco API 17/17 e cliente 4/4; LC-013 passou testes e gates locais. Evidências em `../work/lc013-validation.log` e `../work/lc012-validation.log`; aguardar registro no PR para marcar. |
| [x] | Carteira: total, comprometido, disponível, depósito simulado | RF-07, RF-08 | LC-009 | Testes focados LC-009: API PostgreSQL isolado 10/10, contrato 5/5, domínio 2/2 e web 8/8 (Node 22) |
| [ ] | Meus arremates: com lance + vencidos com comprovante e link | RF-13, RF-14 | LC-016 | |
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
| [ ] | Liquidação: debita vencedor, credita leiloeiro, comprovante; sem lances fecha sem vencedor | RN-10, RN-11 | LC-014 | |
| [ ] | Histórico à prova de adulteração (inclusive direto no banco), técnica explicada | RN-15, RNF-05 | LC-010, LC-015, LC-023 | LC-010: verificador unitário e paridade Node/happy-dom verificados localmente; adulteração SQL e auditoria pública pendentes. |
| [ ] | Privacidade em auditoria e comprovante | RN-16, RNF-06 | LC-015, LC-016 | |

## Opcionais

| ✓ | Item do PDF | Requisito | Card | Evidência |
|---|---|---|---|---|
| [ ] | Busca e filtro de lotes | RF-17 | LC-019 | |
| [ ] | Cancelamento com estorno automático | RF-18 | LC-018 | |
| [x] | Docker Compose | RNF-13 | LC-002, LC-004 | `docker compose up` sobe Postgres + app em `localhost:3000` com migrations no start |
| [ ] | Testes automatizados | RNF-12 | todos + LC-022 | |
| [ ] | Dark mode | RF-19 | LC-021 | |
