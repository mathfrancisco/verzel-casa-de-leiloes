# LC-008 — Construir a busca no catálogo e o formulário de novo lote no painel

| Campo | Valor |
|---|---|
| Status | DONE |
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

- [x] Fluxo buscar → selecionar → publicar funciona no navegador
- [x] Erros do servidor aparecem junto ao campo correspondente
- [x] Licitante não acessa `/painel/novo`

## Testes obrigatórios

- Componente: validação do formulário (fim < início + 5 min, incremento 0)
- CT-09-04 (parte painel)

## Definição de pronto

- [x] `pnpm lint && pnpm typecheck && pnpm test` verdes, saída real no PR
- [x] Todos os critérios de aceite com evidência
- [x] Status atualizado aqui e em `ai/cards/README.md`
- [x] `docs/CHECKLIST.md` (só com evidência) atualizado

## Evidências (23/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 76 ✓ · web 47 ✓ · api 141 ✓ (264); novos: 9 da lógica do formulário (web) e 1 do CSP (api) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| Validação do formulário | fim < início + 5 min, incremento 0, valor em formato inválido, início no passado, sem obra e data vazia → erro no campo certo; reais → centavos e hora local → UTC |
| Chromium (`pnpm dev`, `CATALOG_PROVIDER=fake`) | licitante em `/painel/novo` → "Sem permissão" (CT-09-04); busca "mo" lista a obra; seleção preenche título, categoria e atributos; erros do cliente ao lado dos campos; erro de campo vindo do servidor (simulado) aparece no campo Título com `aria-describedby`; publicação real → redireciona para `/lotes/:id` e a API devolve o lote `SCHEDULED` com R$ 1.500,00 / R$ 100,00; catálogo fora (503 simulado) → mensagem clara |
| Busca contra a AIC real | **pendente** (rede deste ambiente bloqueia `api.artic.edu`; ver LC-005) |

## Validação de integração (25/10/2026)

Estado revalidado sobre `main` após a integração do LC-007. Esta rodada não incluiu uma nova
execução de navegador.

| Verificação | Resultado |
|---|---|
| `pnpm lint` (Node 22.16.0, pnpm 10.28.0) | Passou (`eslint .` e `prettier --check .`). O checkout tinha CRLF enquanto os blobs versionados usam LF; finais de linha foram normalizados sem reformatação em massa. |
| `pnpm typecheck` | Passou (shared, API, web). |
| `pnpm test` | Passou: shared 76, web 48, API 153; 277 testes no total. Inclui regressão para ocultar resultados antigos quando a busca é apagada e teste de cache imutável de assets no Windows. Consultas curtas também não disparam busca. |
| `pnpm build` | Passou (API e web). |
| Revisão de diff | Sem achados pendentes. |
| Banco de integração | PostgreSQL 16.15, container `verzel-cards-test-db`, database `verzel_test_admin`, mapeado em `127.0.0.1:55439`; somente banco descartável. |
| CI / integração | Integrado pela PR #9 em `main` (`76fab265`); checks de CI da PR (run 40248272220) e pós-merge (run 40248403542), incluindo Docker, passaram; GitGuardian passou. |

O caminho `/lotes/:id` ainda mostra “Página não encontrada” até a sala do lote do LC-013 existir;
isso é uma dependência de navegação planejada e não altera a criação do lote deste card.

O card está integrado e concluído. A busca contra a API real da AIC permanece pendente devido à
restrição de rede já registrada no LC-005; essa validação externa não foi feita nesta integração.

Decisões:
- CSP `img-src 'self' data: https://www.artic.edu`: as miniaturas da busca vêm direto do IIIF
  do museu; as imagens de lotes continuam servidas pela própria API.
- Miniaturas da busca pedem 400 px ao IIIF (o lote guarda a de 843 px).
- O catálogo falso usa a imagem embutida como `data:` URL (sem imagens quebradas em dev e E2E).
- O redirecionamento vai para `/lotes/:id`, que mostra "Página não encontrada" até a sala do
  lote existir (LC-013).
