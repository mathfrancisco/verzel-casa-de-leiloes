# LC-028 — Adicionar favicon e metadados sociais

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 1–2 h |
| Depende de | LC-024 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Aprimorar identidade da aba e prévias sociais com metadados estáticos e assets locais autorizados.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): apps/web/index.html (confirmar existência), apps/web/public/ (confirmar assets e CSP no deploy). Alvos novos só após inspeção.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Inspecione index HTML, diretório public e política CSP antes de incluir favicon/preview.
- Use somente assets locais com origem/direitos confirmados e metadados OG/Twitter úteis a crawlers sem JavaScript.
- Não adicionar SSR apenas para metadados; valide URL absoluta conforme origem pública configurada.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `apps/web/index.html` e `apps/web/public/` se existirem; verificar CSP e origem pública. Novos assets serão explicitamente identificados.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Favicon publicado retorna 200 e é referenciado por caminho válido; asset local tem origem/direitos registrados.
- [ ] HTML entregue sem JavaScript inclui title, description e OG essenciais úteis ao preview bot; URL/canonical são coerentes com domínio configurado.
- [ ] CSP continua restritiva e nenhuma etapa de SSR/serviço externo foi adicionada apenas para metadados.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Node 22; comandos futuros: teste focado do pacote alterado (`rtk pnpm --filter @leilao/web test` ou `rtk pnpm --filter @leilao/api test`), depois `rtk pnpm test`, `rtk pnpm lint` e `rtk pnpm typecheck` conforme AGENTS.md; E2E aplicável: `rtk pnpm test:e2e`.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: produção em 28/10/2026, depois do merge da PR #36 (`d9cc1d5`): `/favicon.svg` responde 200 e o HTML traz `og:title`, `og:description`, `og:url`, `og:type`, `og:locale` e `og:site_name`. Ainda falta `og:image`.

## Execução 27/10/2026

- Novo asset `apps/web/public/favicon.svg`: desenho próprio (martelo sobre `--brand` #e5532d), sem direitos de terceiros. Servido pelo `@fastify/static` (mesma origem; CSP `default-src 'self'` inalterada).
- `apps/web/index.html`: title descritivo, meta description, `link rel=icon`, canonical e OG (`type`, `locale`, `site_name`, `title`, `description`, `url`) + `twitter:card=summary`, estáticos no HTML (sem SSR).
- Sem `og:image`: nenhuma imagem com licença confirmada para redes sociais; lacuna aberta para LC-034.
- `pnpm --filter @leilao/web build`: ok, `dist/favicon.svg` copiado. `pnpm lint`: "ESLint: No issues found". `pnpm --filter @leilao/web test`: 31 arquivos, 149 testes passaram.
- Pendente: confirmar 200 de `/favicon.svg` e o HTML no deploy após merge; não verificado.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
