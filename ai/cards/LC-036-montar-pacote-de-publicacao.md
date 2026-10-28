# LC-036 — Montar pacote de publicação

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 2–3 h |
| Depende de | LC-029, LC-034 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Reunir README, links e assets existentes em pacote revisável; preparar checklist para publicação pelo usuário.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): README.md, docs/CHECKLIST.md (somente conforme evidência), arquivos de mídia existentes e links documentados.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Monte pacote mínimo com README e mídia existente, links conferidos e checklist de publicação pronto para revisão.
- Inclua atribuição/licença e rótulos de evidência local/produção; liste itens ausentes em vez de simular assets.
- Não enviar post nem formulário por ferramenta; publicação externa fica para ação explícita do usuário.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `README.md`, `docs/CHECKLIST.md` (somente evidência), assets existentes, links documentados e novo `docs/portfolio/pacote-publicacao.md`.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Publicar conteúdo, enviar formulário ou postagem em nome do usuário.

## Critérios de aceite

- [ ] Novo entregável `docs/portfolio/pacote-publicacao.md` contém rascunho de post para LinkedIn/GitHub, descrição curta do problema e diferencial técnico, links/CTA e checklist final.
- [ ] Pacote mínimo reúne README, demo/link válido e assets existentes, com cada item rotulado e rastreável.
- [ ] Checklist lista direitos/licenças, evidência local versus produção e itens ausentes, sem marcar ausência como pronta.
- [ ] Nenhum formulário/post foi enviado; pacote está pronto para revisão/ação explícita do usuário.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Pacote mínimo revisável contém somente links e assets existentes; nenhum envio externo foi realizado.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Documentação: rtk git diff --check e revisão manual de links, CTA, direitos e evidências; documentação não dispensa gates do projeto se código for alterado.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: [docs/portfolio/pacote-publicacao.md](../../docs/portfolio/pacote-publicacao.md). Nada foi publicado nem enviado.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
