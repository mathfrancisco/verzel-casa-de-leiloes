# LC-034 — Capturas e vídeo da demonstração

Toda a mídia desta pasta foi gravada em **ambiente local**, não em produção.

- **Data:** 28/10/2026.
- **Revisão:** `0d09124` (branch `feat/interface-portfolio`), com a interface dos cards LC-027, LC-030, LC-031, LC-032 e LC-035. A primeira gravação, sobre `d9cc1d5`, foi substituída.
- **Catálogo:** `CATALOG_PROVIDER=fake`. O seed usa as obras CC0 versionadas em
  `apps/api/seed/fixtures`.
- **Banco:** Postgres descartável `verzel_video`, criado só para esta gravação, com `pnpm db:migrate` e
  `pnpm seed`.
- **Contas:** `ana@demo.com` e `bruno@demo.com` do seed, com a senha pública de demonstração. Não
  aparecem e-mail, senha nem dado pessoal nas imagens.
- **Sessões:** cada conta usou um contexto isolado do Chromium (Playwright). O aviso "Você foi
  superado" foi gerado por um lance real do Bruno e recebido pela Ana sem recarregar a página.
- **Scripts:** [`scripts/portfolio/capture.mjs`](../../scripts/portfolio/capture.mjs) gera as
  capturas e [`scripts/portfolio/record.mjs`](../../scripts/portfolio/record.mjs) monta o vídeo.

## Capturas

| Arquivo | Estado mostrado | Texto alternativo |
|---|---|---|
| [01-vitrine.png](media/01-vitrine.png) | Vitrine anônima | Vitrine com lotes ao vivo e o aviso de saldo simulado |
| [02-sala-ana.png](media/02-sala-ana.png) | Sala do lote, sessão A | Sala do lote Great Wave com preço, lance mínimo e cronômetro |
| [03-lance-recusado-bruno.png](media/03-lance-recusado-bruno.png) | Lance recusado, sessão B | Mensagem "Lance abaixo do mínimo" após um lance inválido |
| [04-ana-superada.png](media/04-ana-superada.png) | Superação ao vivo, sessão A | Novo preço e o aviso "Você foi superado", sem recarregar a página |
| [05-carteira-ana.png](media/05-carteira-ana.png) | Carteira, sessão A | Carteira com saldo simulado e nenhuma reserva |
| [06-comprovante.png](media/06-comprovante.png) | Comprovante pré-semeado | Comprovante público do lote Water Lilies, um dado de demonstração do seed |
| [07-auditoria.png](media/07-auditoria.png) | Auditoria pública | Auditoria com "Cadeia íntegra" e todas as verificações aprovadas |
| [08-sala-mobile.png](media/08-sala-mobile.png) | Sala no celular (390 × 844) | Sala do lote em layout mobile |

## Vídeo

- [`demo-local-2026-10-28.webm`](media/demo-local-2026-10-28.webm): 1280 × 720, VP9, 85 s.
- Legendas: [`demo-local-2026-10-28.pt-BR.vtt`](media/demo-local-2026-10-28.pt-BR.vtt). O mesmo
  texto também está gravado na imagem.
- O vídeo é uma **sequência de capturas reais**, não uma gravação contínua. Cada troca de cena
  mostra o selo "✂ corte", e o canto superior traz o rótulo "Gravação local". Nenhum estado foi
  composto ou simulado.
- Os primeiros segundos do arquivo contêm o carregamento da página do player. Por isso, os
  tempos do `.vtt` podem ficar até cerca de 6 s adiantados em relação à imagem.
- Não há música nem áudio.

## Direitos

- **Obras:** as imagens vêm do Art Institute of Chicago e estão marcadas como domínio público (CC0).
  Veja `apps/api/seed/fixtures/README.md`. Créditos: Katsushika Hokusai, *Under the Wave off
  Kanagawa*; Claude Monet, *Water Lilies*; e as demais obras da vitrine, listadas em `items.json`.
- **Interface e código:** pertencem ao autor do repositório.

## Limites

- Nada desta pasta comprova o comportamento em produção. A evidência de produção está em
  [lc025-smoke-producao.md](lc025-smoke-producao.md).
- O encerramento ao vivo de um lote não foi gravado. O comprovante mostrado vem do seed.
- Se os cards LC-030, LC-031, LC-032 ou LC-035 mudarem a interface, as capturas precisam ser
  refeitas.
