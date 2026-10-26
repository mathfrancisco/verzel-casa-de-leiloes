# LC-013 — Construir a sala do lote ao vivo com feedback de lance

| Campo | Valor |
|---|---|
| Status | REVIEW |
| Épico / dia | E4 Tempo real e liquidação · Dia 4 |
| Depende de | LC-012, LC-007 |
| Requisitos | RF-10, RF-11, RF-20 |
| Regras | RN-04 a RN-09 |
| Specs | SP-09, SP-06 |

## Objetivo

Licitante disputa o lote vendo tudo em tempo real e entende por que um lance foi recusado.

## Escopo

- Rota `/lotes/:id`: preço, mínimo, contagem regressiva com selo de prorrogação, faixa ganhando/superado, histórico, posição
- Formulário de lance com valor sugerido, atalhos de incremento, confirmação de valor alto, `Idempotency-Key` por tentativa
- Mapa de mensagens de erro (`src/lib/errorMessages.ts`) com `aria-live`
- Toast global de "você foi superado" e atualização da carteira no cabeçalho

## Fora do escopo

- Comprovante e meus arremates (LC-016)

## Critérios de aceite

- [x] Dois navegadores: o superado vê o aviso em < 1 s sem recarregar
- [x] Cada código de erro mostra a mensagem da SP-09
- [x] Leiloeiro dono e visitante veem a sala sem formulário de lance

## Testes obrigatórios

- CT-09-01: navegador local validou os 10 códigos previstos, com mensagem SP-09
  em `role="alert"` e `aria-live="assertive"`; Playwright enviou o formulário
  contra respostas HTTP injetadas no endpoint de lance.
- CT-06-06 (manual até o LC-022 automatizar): duas sessões reais no navegador,
  com o catálogo fake e banco PostgreSQL descartável; aviso de superação em
  258 ms na primeira medição e 243 ms no build final.

## Definição de pronto

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passaram
  localmente; registrar a saída no PR quando publicar
- [x] Todos os critérios de aceite têm evidência local
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` atualizado com evidência local e pendência de PR;
  `docs/USO-DE-IA.md` atualizado

## Evidência e pendências

Os gates locais completos passaram com exit 0: lint, typecheck, testes (379:
104 shared, 196 API e 79 web) e build. Após um ajuste restrito ao teste de
fallback, o foco passou 10/10 e o Prettier passou. No navegador, o toast de
superação apareceu apenas na sessão correta; fora da sala apareceu em 130 ms.
Logout removeu o toast privado e o formulário. Visitante e leiloeiro dono não
receberam formulário, e a largura de 360 px não apresentou overflow.

Revisão técnica assistida por `cavecrew-reviewer` encontrou vazamento do toast
privado entre sessões e cobertura incompleta de mensagens; os ajustes foram
feitos e revistos com os ensaios de navegador. Não houve revisão humana
registrada. Evidência em `../work/lc013-validation.log`.

O card permanece em `REVIEW` enquanto publicação e CI estiverem pendentes.
