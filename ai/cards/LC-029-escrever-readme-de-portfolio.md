# LC-029 — Escrever README de portfólio

| Campo | Valor |
|---|---|
| Status | DONE |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 3–5 h |
| Depende de | LC-025, LC-026, LC-028 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09, SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Apresentar produto, execução, arquitetura, demonstração e limites com afirmações apoiadas por evidência.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): README.md, ai/specs/SP-10-infra-e-entrega.md, package.json, docs/ (somente referências verificadas).
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Explique papéis e fluxo em menos de um minuto, execução local, stack, arquitetura e comandos verificáveis.
- Inclua estado da demo, dinheiro fictício, limites de catálogo/serviços, IA usada e evidências de LC-025/026.
- Referencie screenshots/vídeo somente quando existirem; deixe atualização de evidência visual a LC-036.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `README.md`, `package.json`, `ai/specs/SP-10-infra-e-entrega.md`, evidências verificadas de LC-025/026.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] README permite identificar produto, stack, papéis, como rodar e fluxo de demo sem depender de conversa privada.
- [ ] Limites de dinheiro fictício, catálogo/serviços e alegações de IA ficam explícitos; screenshots/vídeo só aparecem com arquivo e origem existentes.
- [ ] Links de demo/repositório/comandos apontam para destinos existentes e evidências LC-025/026 sustentam cada alegação de operação.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Documentação: rtk git diff --check; verificar manualmente todos os links, comandos, evidências e limites do README. Se código mudar, aplicar gates de AGENTS.md.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência: topo do README reescrito na PR #36. As alegações de produção apontam para o LC-025 e as de testes para o LC-026.

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
