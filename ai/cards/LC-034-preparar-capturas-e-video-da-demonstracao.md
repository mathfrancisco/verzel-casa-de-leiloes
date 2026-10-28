# LC-034 — Preparar capturas e vídeo da demonstração

| Campo | Valor |
|---|---|
| Status | TODO |
| Prioridade | P0 |
| Épico / janela | Portfólio · Antes de 29/10/2026 |
| Esforço estimado | 3–5 h |
| Depende de | LC-025, LC-028 |
| Requisitos | Melhoria de portfólio descrita no plano; requisitos existentes preservados |
| Regras | AGENTS.md · regras do projeto |
| Specs | SP-09, SP-10 |
| Plano | [Plano de profissionalização](../../docs/plano-profissionalizacao-portfolio-2026-10-27.md) |

## Objetivo

Preparar evidências visuais iniciais e vídeo curto da demo sem confundir ambiente local com produção.

## Escopo

- Alvos iniciais a inspecionar (não implicam que será necessário alterá-los): assets/capturas/vídeo existentes (localizar antes de substituir), docs/ e README.md; novos arquivos de mídia somente se necessário.
- Ler o plano vinculado e confirmar que as precondições continuam válidas antes de iniciar.
- Use pacote inicial existente se houver e confirme data, contexto e autorização de imagem/dados.
- Grave o vídeo mínimo sem esperar cards P1; versão final tem 60–90 segundos, inclui legendas revisadas e usa cortes declarados para remover esperas sem falsificar resultado.
- Rotule capturas locais versus produção; recapturas após mudanças dos cards 030/031/032/035 ficam a cargo desses cards.
- Atualizar este card e o quadro somente com evidências efetivamente obtidas; preservar dependências legadas e executar um card por vez.

## Arquivos envolvidos

- `docs/` e diretório de mídia existente a localizar, `README.md`; mídia nova, se necessária, será registrada como novo arquivo.
- Confirmar existência e ownership antes de implementar. Caminhos condicionais e novos estão indicados acima; não criar arquivo só para satisfazer a lista.

## Fora do escopo

- Alterar ou declarar concluídos cards antigos sem evidência e sem respeitar suas dependências.
- Redesenhar/reescrever áreas sem relação demonstrada com o objetivo deste card.

## Critérios de aceite

- [ ] Captura/vídeo identifica se é local ou produção e data/revisão observada; direitos/autorização de obras e dados estão registrados.
- [ ] Vídeo final tem 60–90 segundos, inclui legendas revisadas e usa cortes que não alteram a interpretação do fluxo.
- [ ] Existe captura mobile legível; nenhuma credencial/dado pessoal aparece. Recapturas após mudanças dos cards 030/031/032/035 ficam a cargo desses cards.
- [ ] Escopo e arquivos-alvo foram conferidos no estado atual antes da edição; caminhos propostos estão identificados como novos.
- [ ] Cada afirmação e resultado tem evidência rastreável, contexto e limite; lacunas permanecem explicitamente abertas.
- [ ] Regras do projeto, segurança, privacidade e comportamento existente foram preservados; dependências ainda não DONE impedem execução.
- [ ] Resultado pode ser conferido por outra pessoa sem acesso a contexto privado ou segredos.
- [ ] Testes e evidências de execução futura foram registrados sem alegar resultados não executados.

## Testes e comandos futuros

- Para documentação e assets: rtk git diff --check e revisão manual de links, arquivos, direitos e rótulos de ambiente; não inventar testes para produção de mídia.
- Para mudanças de produto: usar FakeCatalog e banco descartável; smoke manual com catálogo real é separado e nunca reseta banco de produção.
- Executar testes focados do módulo alterado e os gates exigidos pelo projeto; registrar comando literal e saída real. Docs-only não requer testes artificiais.
- Evidência inicial: **Não executado; card criado para execução futura.**

## Definição de pronto

- [ ] Critérios aceitos com evidência verificável e limitações descritas.
- [ ] Gates de execução aplicáveis registrados com saída real; nunca inferir sucesso.
- [ ] Atualizações de quadro/checklist feitas apenas se autorizadas pelas regras do projeto e sustentadas por evidência.
- [ ] Status atualizado por quem executar; este card permanece TODO até trabalho real e revisão.
