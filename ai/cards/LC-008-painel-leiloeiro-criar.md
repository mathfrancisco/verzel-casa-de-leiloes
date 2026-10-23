# LC-008 — Construir a busca no catálogo e o formulário de novo lote no painel

| Campo | Valor |
|---|---|
| Status | REVIEW |
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
- [x] `docs/CHECKLIST.md` (só com evidência) e `docs/USO-DE-IA.md` atualizados

## Evidências (23/10/2026)

| Verificação | Resultado |
|---|---|
| `pnpm test` | shared 76 ✓ · web 47 ✓ · api 141 ✓ (264); novos: 9 da lógica do formulário (web) e 1 do CSP (api) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | verdes |
| Validação do formulário | fim < início + 5 min, incremento 0, valor em formato inválido, início no passado, sem obra e data vazia → erro no campo certo; reais → centavos e hora local → UTC |
| Chromium (`pnpm dev`, `CATALOG_PROVIDER=fake`) | licitante em `/painel/novo` → "Sem permissão" (CT-09-04); busca "mo" lista a obra; seleção preenche título, categoria e atributos; erros do cliente ao lado dos campos; erro de campo vindo do servidor (simulado) aparece no campo Título com `aria-describedby`; publicação real → redireciona para `/lotes/:id` e a API devolve o lote `SCHEDULED` com R$ 1.500,00 / R$ 100,00; catálogo fora (503 simulado) → mensagem clara |
| Busca contra a AIC real | **pendente** (rede deste ambiente bloqueia `api.artic.edu`; ver LC-005) |

Decisões:
- CSP `img-src 'self' data: https://www.artic.edu`: as miniaturas da busca vêm direto do IIIF
  do museu; as imagens de lotes continuam servidas pela própria API.
- Miniaturas da busca pedem 400 px ao IIIF (o lote guarda a de 843 px).
- O catálogo falso usa a imagem embutida como `data:` URL (sem imagens quebradas em dev e E2E).
- O redirecionamento vai para `/lotes/:id`, que mostra "Página não encontrada" até a sala do
  lote existir (LC-013).
