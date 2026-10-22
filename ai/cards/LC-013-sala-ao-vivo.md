# LC-013 — Construir a sala do lote ao vivo com feedback de lance

| Campo | Valor |
|---|---|
| Status | TODO |
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

- [ ] Dois navegadores: o superado vê o aviso em < 1 s sem recarregar
- [ ] Cada código de erro mostra a mensagem da SP-09
- [ ] Leiloeiro dono e visitante veem a sala sem formulário de lance

## Testes obrigatórios

- CT-09-01
- CT-06-06 (manual até o LC-022 automatizar)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
