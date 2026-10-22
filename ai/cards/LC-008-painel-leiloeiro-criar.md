# LC-008 — Construir a busca no catálogo e o formulário de novo lote no painel

| Campo | Valor |
|---|---|
| Status | TODO |
| Épico / dia | E2 Catálogo e lotes · Dia 2 |
| Depende de | LC-005, LC-006 |
| Requisitos | RF-02, RF-03 |
| Regras | RN-02, RN-21 |
| Specs | SP-09, SP-03 |

## Objetivo

Leiloeiro encontra uma obra, confere os atributos e publica o lote pela interface.

## Escopo

- Rota `/painel/novo`: busca com debounce, grid de resultados, aviso de catálogo indisponível/cache
- Seleção preenche título e categoria sugerida e mostra atributos
- Formulário com validação no cliente espelhando RN-02 (valores em R$, datas locais convertidas para UTC)
- Após criar, redireciona para a sala do lote

## Fora do escopo

- Lista de lotes, resultados e cancelamento (LC-017, LC-018)

## Critérios de aceite

- [ ] Fluxo buscar → selecionar → publicar funciona no navegador
- [ ] Erros do servidor aparecem junto ao campo correspondente
- [ ] Licitante não acessa `/painel/novo`

## Testes obrigatórios

- Componente: validação do formulário (fim < início + 5 min, incremento 0)
- CT-09-04 (parte painel)

## Definição de pronto

- [ ] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [ ] Todos os critérios de aceite com evidência
- [ ] Status atualizado aqui e em `ai/cards/README.md`
- [ ] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados
