# Plano para apresentar a Casa de Leilões como projeto de portfólio

**Data da pesquisa:** 27/10/2026  
**Objetivo:** tornar o projeto compreensível, confiável e interessante para recrutadores e
engenheiros que o encontrem no GitHub ou por uma publicação profissional.  
**Horizonte:** preparar uma versão de apresentação antes de 29/10/2026; depois, desenvolver
itens de portfólio em ciclos pequenos de 2–3 semanas.

## Resumo executivo

A Casa de Leilões já implementa uma fatia de produto relevante: descoberta de obras, lotes,
lances concorrentes, atualização em tempo real, saldo simulado, liquidação, comprovante e uma
auditoria que verifica a cadeia criptográfica no navegador. A aplicação usa React, Fastify,
Socket.IO, PostgreSQL e TypeScript, e inclui testes e deploy público.

O trabalho de maior retorno para o portfólio é tornar essa história visível e verificável. Quem
chega ao repositório deve entender em menos de um minuto o problema, os papéis, o que é simulado
e o que torna o sistema interessante. Em seguida deve encontrar uma demonstração guiada, com
contas e passos seguros, capturas atuais e um vídeo curto do fluxo real.

Não é necessário redesenhar o produto inteiro nem trocar a stack. O front já possui identidade
própria, busca, filtros, tema escuro, responsividade e decisões documentadas. As prioridades são
atualizar a evidência, melhorar a apresentação do README e fechar os fluxos públicos após a
última mudança no deploy. Qualquer afirmação de funcionamento deve apontar para teste, captura
datada ou observação explícita.

## Escopo e critério de sucesso

Este plano trata da apresentação profissional de um projeto demonstrativo, não da conversão da
aplicação em uma casa de leilões comercial. O dinheiro é fictício. O catálogo externo fornece
obras, mas não há custódia de dinheiro, logística de entrega ou curadoria profissional.

O resultado está pronto para publicação quando uma pessoa sem contexto consegue:

1. explicar em uma frase o produto e seus dois papéis;
2. abrir o deploy e encontrar uma obra sem precisar de ajuda;
3. entrar com contas de demonstração em contextos de navegador separados e acompanhar um lance;
4. abrir a auditoria pública e entender o resultado em linguagem simples;
5. distinguir fatos testados de limitações e comportamento ainda não verificado;
6. encontrar no repositório instruções de execução, arquitetura, testes e decisões técnicas.

## Diagnóstico do estado atual

### Já existe e deve aparecer na apresentação

- Monorepo pnpm em TypeScript, Node 22 e PostgreSQL 16.
- Web em React/Vite e API em Fastify, com contrato compartilhado em `packages/shared`.
- Login, cadastro, papéis de licitante e leiloeiro e rotas protegidas no servidor.
- Vitrine com abas ao vivo/agendados/encerrados, busca, filtros, paginação e ordenação.
- Criação de lote a partir de catálogo do Art Institute of Chicago, com provedor fake para testes.
- Motor de lance no servidor, transação, idempotência, saldo comprometido e regra anti-sniping.
- Eventos Socket.IO, aviso de superação, carteira simulada e liquidação com comprovante.
- Auditoria pública com pseudônimos, hashes encadeados, assinaturas Ed25519 e verificação local.
- Seed de demonstração, Docker Compose, testes Vitest/Playwright, documentação extensa e deploy.
- Interface com tema claro/escuro, responsividade e relatório de axe documentados.
- Relatórios existentes sobre chunks do front e benchmark sintético da API; reutilizá-los com
  as condições originais, sem alegar ausência de medições.

Esses pontos são um diferencial técnico forte para um projeto individual. O README atual já
explica vários deles, mas sua extensão e densidade fazem a narrativa principal competir com os
detalhes operacionais. Use uma introdução curta e conduza a pessoa para os detalhes conforme o
interesse.

### Lacunas que afetam a confiança da apresentação

1. O README contém contas e instruções, mas o acesso de demonstração não é evidente na página de
   login. É preciso reduzir o tempo até a primeira interação sem fragilizar a autenticação.
2. O seed usa datas relativas à sua execução; uma sala “terminando em minutos” pode estar
   encerrada quando alguém visitar o deploy mais tarde. O estado servido agora pode divergir do
   seed local mais recente.
3. `docs/smoke-producao.md` contém registros em datas e revisões diferentes. O registro de
   27/10 documenta testes locais com duas sessões e busca real no catálogo, mas termina com o
   fluxo autenticado de produção após o reset pendente. Não extrapolar o teste local para o
   deploy.
4. O smoke de produção anterior documenta que a superação de lance não foi observada quando os
   dois usuários compartilharam a mesma sessão. Um ensaio posterior local resolveu esse cenário
   com duas sessões. No deploy, usar perfis de navegador isolados e produzir uma evidência nova.
5. A última consulta a CI por `gh` falhou por conexão. O estado atual dos checks não foi
   confirmado nesta pesquisa; verificar antes de inserir badge ou dizer que está verde.
6. `docs/CHECKLIST.md` e `ai/cards/README.md` retêm registros de momentos e estados distintos.
   O quadro registra LC-004 como `DOING` e LC-023 como `REVIEW`, enquanto a evidência de produto
   evoluiu depois. A reconciliação documental precisa de evidência, não de suposição.
7. As capturas em `docs/design/` incluem estados gerados com catálogo/filtros simulados. São úteis
   para documentar design, mas não devem ser apresentadas como prova de conteúdo do deploy.
8. A faixa da vitrine já diz que usuários de demonstração estão no README. A pessoa ainda precisa
   sair da jornada para encontrar as credenciais; acesso contextual pode reduzir atrito sem
   duplicar nem enfraquecer a autenticação.
9. `apps/web/index.html` define o título “Casa de Leilões”, sem descrição e cartões sociais específicos.
10. A revisão registrada de design nota a ausência de uma captura do estado “você foi superado”.
11. Limitações importantes já estão no README: a chave pública é recebida da mesma API, truncar
    um prefixo da cadeia de um lote ativo pode não ser detectado e o tempo real usa uma instância.
    A apresentação deve explicar o limite sem chamar a auditoria de prova de identidade externa.

### Limite de evidência

No deploy, em 27/10, a vitrine pública mostrou uma obra Hokusai, com um lote ao vivo, um agendado
e três encerrados. A sala pública do lote exibiu R$ 1.200, próximo lance mínimo R$ 1.300,
metadados, histórico e link de auditoria. A auditoria pública mostrou “Cadeia íntegra” e
verificação local em 3 ms naquela visita (não é benchmark). Esses estados públicos foram
observados; login e lance autenticado, catálogo pelo papel de leiloeiro, encerramento e novo
comprovante em produção após o reset continuam sem evidência nesta execução.

O navegador registrou 404 de `favicon.ico`, 401 de `/api/auth/me` na sessão anônima (esperado) e
aviso de socket encerrado antes de conexão. Corrigir o ícone e investigar o aviso de socket; não
tratar o 401 como defeito nem concluir que realtime funciona ou falha a partir do aviso isolado.
O HEAD local observado foi `a5b3afa` (seed com cinco obras, PR #34); a revisão servida no deploy
não foi confirmada, então não atribuir a ela esse SHA. A consulta a CI via `gh` falhou por
conexão. Nenhum teste foi executado nesta pesquisa; lint, typecheck, testes, build e CI são
verificações futuras, não resultados desta avaliação.

## Posicionamento recomendado

Apresente o projeto como um **marketplace demonstrativo de leilões de arte**, cujo principal
desafio é preservar a consistência de lances concorrentes enquanto apresenta uma trilha pública
verificável. Esse foco comunica produto e engenharia ao mesmo tempo.

**Frase curta sugerida:** “Uma casa de leilões online para obras de arte, com lances ao vivo,
saldo fictício e histórico verificável no navegador.”

**Subtítulo técnico:** “React + Fastify + PostgreSQL; concorrência controlada no servidor,
eventos depois do commit e uma cadeia de auditoria assinada com Ed25519.”

Não afirmar que o sistema processa pagamentos reais, garante procedência das obras, opera como
leilão juridicamente vinculante, usa escrow ou publica prova independente contra o próprio
servidor. O depósito é simulado e a verificação usa a chave pública que a API entrega.

## Referências funcionais pesquisadas

Estas referências servem como inspiração de comunicação e jornada. Esta pesquisa não é uma
auditoria comparativa completa de design, operação ou segurança dos serviços.

| Referência | Prática visível | Aplicação adequada ao projeto | Não copiar como promessa |
|---|---|---|---|
| [Artsy — Auction FAQs](https://www.artsy.net/auction-faq) | Explica cadastro, mínimo do próximo lance, lance máximo e o que acontece depois do encerramento. | Escrever uma ajuda curta junto do formulário: valor mínimo, incremento, status e efeito de ser superado. | O lance máximo automático da Artsy não corresponde à regra deste projeto e não deve ser implementado nem insinuado sem nova decisão. |
| [Christie’s — How does online bidding work?](https://www.christies.com/en/help/auction-help-library/how-does-online-bidding-work) | Distingue participação online em evento ao vivo dos leilões online com período prolongado. | Chamar o formato atual de leilão online com janela de tempo; esclarecer contagem regressiva e prorrogação por lance perto do fim. | Não dizer que existe transmissão com leiloeiro ou sala de vídeo. |
| [Catawiki — How it works](https://auction.catawiki.com/en/help/about) | Organiza a jornada de comprador e vendedor em passos e contextualiza os objetos listados. | Apresentar uma sequência curta: encontrar obra, acompanhar lote, entrar, ofertar e consultar resultado/auditoria. | Não prometer análise por especialista, escrow, envio de obra ou segurança de pagamento. |

Use referências para melhorar clareza da linguagem, não para importar funcionalidades por
semelhança superficial. Mantenha a regra de lance atual como fonte de verdade.

## Priorização

| Prioridade | Ação | Impacto no portfólio | Esforço estimado |
|---|---|---:|---:|
| P0 | Confirmar deploy pós-reset, duas contas/sessões, ciclo de lance e auditoria; registrar data e revisão. | Muito alto | 0,5–1,5 dia |
| P0 | Simplificar a dobra inicial do README e colocar demo, limites, arquitetura e evidência visual. | Muito alto | 0,5–1 dia |
| P0 | Capturar a jornada real e produzir vídeo curto com dados não sensíveis. | Alto | 0,5–1 dia |
| P1 | Reconciliar checklist/cards e colocar descrição/metadados sociais básicos. | Médio/alto | 0,5–1 dia |
| P1 | Organizar estudo de caso técnico e diagrama conciso de concorrência/auditoria. | Alto | 1–2 dias |
| P1 | Corrigir problemas observados de navegação/console e atualizar imagens com direitos revistos. | Médio | 0,5–2 dias, conforme causa |
| P2 | Melhorias de descoberta e ferramenta visual de laboratório de auditoria. | Médio | 2–5 dias por item, após desenho |

Estimativas são esforço de uma pessoa familiarizada com o repositório, sem contar espera por
provedor, revisão externa, falha de ambiente ou mudança de escopo. Orçamento adicional não é
necessário para o pacote editorial; qualquer serviço ou recurso pago deve ser decidido com preço
e benefício atuais em mãos. Não adotar planos pagos como premissa.

## Plano executável

### Fase 0 — Fazer a vitrine passar confiança

**Objetivo:** confirmar o que uma pessoa realmente consegue fazer no deploy atual.  
**Esforço:** 0,5–1,5 dia.  
**Dependência:** disponibilidade do deploy e das duas contas de demonstração.

Tarefas:

1. Registrar a revisão/commit servida em produção e compará-la com `main`; não presumir que a
   URL pública atualiza automaticamente após merge.
2. Revisar os dados e regras em `apps/api/src/seed/` e no README. Confirmar que as contas listadas
   continuam válidas e que a senha de demonstração não permite acesso a dados reais.
3. Abrir dois perfis de navegador isolados: Ana em um e Bruno no outro. Não usar duas abas da
   mesma sessão, pois o login por cookie é compartilhado.
4. Selecionar lote ao vivo, registrar o estado antes/depois, dar lance válido no perfil A e
   cobri-lo pelo perfil B. Confirmar aviso sem recarregar, posição e valores coerentes.
5. Se o lote estiver perto do encerramento, observar a prorrogação sem forçar operações de
   liquidação ou alterar o banco de produção.
6. Testar catálogo e criação de lote pelo papel de leiloeiro em produção. Distinguir resultado
   real do catálogo de fixture local.
7. Abrir auditoria e comprovante públicos e verificar rótulo de integridade e pseudônimo. Não
   divulgar nomes, tokens, e-mails, cookies, segredos ou dados privados nas capturas.
8. Anotar data, revisão, navegador, papel, resultado e bloqueio em `docs/smoke-producao.md`.
   Preservar entradas anteriores, identificando claramente cada nova execução.
9. Corrigir o 404 do favicon e investigar isoladamente o aviso de socket encerrado antes da
   conexão. O 401 da consulta de sessão anônima é comportamento esperado.

Critérios de aceite:

- Há evidência datada para visitante, sala e auditoria públicas. Antes de afirmar fluxos
  autenticados, obter evidência de login dos dois papéis, duas sessões, lance, superação e
  comprovante em produção; registrar explicitamente o que continuar pendente.
- A API real do catálogo está documentada como “verificada” só se o fluxo de produção terminou
  sem fixture. Há teste local real documentado em 27/10, mas ele não confirma o fluxo no deploy.
- Falha ou indisponibilidade gera uma lista curta de bloqueios com passos de reprodução e sem
  alegar sucesso por causa de execução local.
- A revisão servida e a revisão validada estão claras.

### Fase 1 — README de portfólio em duas velocidades

**Objetivo:** permitir leitura rápida sem perder a documentação de operação.  
**Esforço:** 0,5–1 dia.  
**Dependência:** fatos da Fase 0.

Arquivos: `README.md`; opcionalmente mover detalhes repetitivos a `docs/` mantendo links.

Estrutura proposta para o começo do README:

1. Nome, frase de posicionamento e link de produção.
2. GIF ou imagem otimizada e atual, com alternativa textual.
3. Aviso destacado: “Demo; nenhum dinheiro real é movimentado.”
4. Três passos para experimentar, com credenciais de demo e instrução de perfis separados.
5. “O que acontece por trás”: lance transacional, atualização realtime, liquidação e auditoria.
6. Links “Como executar”, “Arquitetura”, “Decisões”, “Limitações” e “Uso de IA”.

Mantenha adiante as seções existentes sobre Docker, ambiente, testes, deploy, segurança e
limitações. Ajuste apenas se a evidência estiver atualizada; não apague ressalvas úteis para
encurtar a página.

Critérios de aceite:

- A descrição em uma frase deixa claro que o saldo é simulado.
- Um recrutador pode iniciar a demo sem procurar credenciais no meio de documentação extensa.
- Duas sessões diferentes e o resultado sem recarregar são instruídos corretamente.
- Instruções locais continuam reproduzíveis e mencionam Node 22, pnpm e banco conforme o setup.
- Cada afirmação de produção aponta para validação datada e não se mistura com captura mockada.

### Fase 1A — Acabamento visual da primeira visita

**Objetivo:** direcionar o olhar para a obra, o próximo lance e uma ação útil, preservando a
identidade visual ClickBids já aplicada.  
**Esforço:** 1–2 dias.  
**Dependência:** README e estados de demonstração da Fase 0; escopo revisado com as convenções
de `apps/web/AGENTS.md`.

Arquivos: `apps/web/src/features/showcase/ShowcasePage.tsx`, `LotCard.tsx` e CSS em
`apps/web/src/styles.css`; a ficha usa `apps/web/src/features/lotRoom/LotRoomPage.tsx`,
`LotSummary.tsx` e CSS correspondente. Conferir seletor/testes existentes antes de alterar
marcação.

Direção proposta para a vitrine:

- Encurtar a introdução atual para uma frase editorial, explicar “saldo simulado” e colocar duas
  ações claras: “Explorar lotes” (âncora para grade) e “Como participar” (abre ajuda curta).
- Tornar título e imagem da obra o foco do card; destacar o lance atual ou lance inicial em
  hierarquia numérica maior e manter “próximo lance mínimo” com rótulo explícito na sala.
- Conservar estado e valor: status ao vivo/agendado/encerrado, número de lances, artista,
  cronômetro e filtros continuam legíveis, mas com informação secundária mais discreta.
- Usar a faixa de introdução como entrada contextual para contas de demonstração já descritas no
  README. Credenciais não precisam ficar repetidas no card de cada lote.
- Reservar tamanho de imagem para evitar salto, confirmar proporção e direitos de uso por item e
  fornecer estado alternativo quando a imagem estiver ausente.

Direção proposta para a sala:

- Em desktop, composição de duas áreas: obra/imagem e metadados à esquerda; preço, próximo
  mínimo, estado da participação e ação de lance à direita. Em mobile, empilhar preço/ação antes
  dos dados secundários e manter controles com alvo confortável.
- Agrupar artista, técnica, data, dimensões e origem em ficha editorial compacta, sem transformar
  valores ausentes em espaços vazios.
- Explicar anti-sniping como regra objetiva perto do cronômetro: lance nos minutos finais pode
  prorrogar o encerramento; mostrar horário atualizado e estado “prorrogado”.
- Diferenciar conexão realtime de sincronização confirmada: um socket conectado não significa
  que o último lance já foi recebido. Mostrar horário/versão do último estado sincronizado e um
  caminho para atualizar quando houver reconexão ou dado antigo. Não criar um sinal de “ao vivo”
  baseado apenas no socket aberto.
- Manter preço, liderança/superação e erro do próprio lance como texto acessível e anúncio
  apropriado, sem depender exclusivamente da cor.

Critérios de aceite:

- Em 360 px não há rolagem horizontal; em viewport larga, obra e ação principal aparecem sem
  competir com todos os detalhes da ficha.
- Preço e mínimo possuem rótulo inequívoco; status de disputa funciona com leitor de tela e
  continua compreensível sem cor.
- Estado de reconexão não promete sincronização antes de receber snapshot/evento válido; teste
  cobre socket desconectado, reconectando e estado atualizado.
- Links de ação levam a foco e destino corretos; capturas claro/escuro refletem a implementação.
- O layout atual com bege e laranja continua sendo a base; não introduzir Tailwind ou uma
  dependência de componentes sem justificativa real.

### Fase 1B — Auditoria legível por camadas

**Objetivo:** apresentar a verificação como algo compreensível para visitante e útil para quem
analisa a implementação.  
**Esforço:** 0,5–1 dia.  
**Dependência:** redação de auditoria na Fase 3 e fluxo de dados real confirmado.

Arquivos: `apps/web/src/features/audit/AuditPage.tsx`, estilos de auditoria em
`apps/web/src/styles.css` e os testes da feature. Preservar o verificador atual em
`packages/shared`; esta proposta trata de apresentação e estados, não de trocar a criptografia.

Exibir primeiro uma faixa de resultado: íntegra, inconsistência encontrada ou verificando. Logo
abaixo, resumir em linguagem comum que os elos, hashes e assinatura conferem com a chave pública
fornecida pelo servidor. Depois oferecer os detalhes existentes, como sequência, vínculos,
checks e hashes; permitir leitura móvel da tabela e cópia explícita de hash quando útil.

Se a auditoria apontar falha, destacar o primeiro elo/check falho, preservar dados técnicos para
reprodução e não substituir o detalhe por mensagem genérica. Incluir uma nota curta explicando
que a consistência com a chave entregue pela própria API não é prova de identidade independente.
Testar estados carregando, íntegro, adulterado, chave malformada e erro de rede com dados de
teste; eventual laboratório de adulteração fica local e isolado, sem editar produção.

Critérios de aceite:

- Um visitante consegue responder “está íntegro?” antes de ler uma tabela de hashes.
- Quem audita tecnicamente ainda vê quais verificações passaram e qual falhou.
- A afirmação sobre a chave pública fica junto do resultado sem afirmar confiança independente.
- Tabela/hashes continuam legíveis em viewport pequeno e com teclado.

### Fase 2 — Evidência visual e narrativa curta

**Objetivo:** mostrar o produto e um problema técnico em 60–90 segundos.  
**Esforço:** 0,5–1 dia.  
**Dependência:** Fase 0 aprovada; estado de demonstração estável.

Roteiro de gravação:

1. **0–10 s:** vitrine, busca de uma obra e indicação de que o dinheiro não é real.
2. **10–25 s:** abrir um lote e explicar valor mínimo, cronômetro e histórico.
3. **25–45 s:** mostrar dois perfis de navegador; licitante A oferta, licitante B cobre e A recebe
   status de superação sem atualizar a página.
4. **45–65 s:** apresentar carteira simulada, resultado/comprovante se o ciclo já terminou ou
   mostrar um comprovante pré-semeado claramente identificado como dado de demonstração.
5. **65–85 s:** abrir auditoria, mostrar o resultado em linguagem comum e então expandir os
   detalhes de hashes/assinaturas.
6. **85–90 s:** exibir stack e repositório.

Capturas necessárias: vitrine com obra real permitida, sala do lote, estado superado, estado
auditoria íntegra e versão mobile. Manter dados pessoais fora do quadro. Selecionar imagem por
imagem e registrar fonte/licença/crédito. A disponibilidade de catálogo público não significa,
por si só, que todo arquivo de imagem pode ser republicado em redes sociais. Se direitos forem
incertos, usar miniatura da aplicação com link de volta à fonte ou uma captura da interface que
não amplie a imagem.

Editar o material para caber em 60–90 segundos, cortando esperas de cronômetro, liquidação ou
troca entre perfis. Usar cortes e letreiros discretos para deixar claro que partes foram
condensadas; não fazer a edição parecer uma única sequência contínua em tempo real. Publicar o
vídeo com legendas revisadas, contraste suficiente e sem música que complique licenciamento.
Repetir os passos com seed estável local se a janela do lote no deploy for curta;
identificar o vídeo como gravação da demo e registrar data/revisão. Não simular comportamento que
não foi observado.

Critérios de aceite:

- O vídeo tem duração máxima aproximada de 90 segundos, legendas e nenhum segredo ou dado
  identificável.
- A tela “você foi superado” vem de duas sessões reais; se for ambiente local, isso está
  explicitamente identificado.
- Capturas mobile e desktop mostram interfaces existentes, sem compor estados fictícios.
- Texto alternativo e crédito/fonte acompanham as imagens no README ou na publicação.

### Fase 3 — Apresentação técnica verificável

**Objetivo:** explicar as escolhas de engenharia sem vender garantias que o mecanismo não dá.
**Esforço:** 1–2 dias.  
**Dependência:** inventário de arquitetura e validação dos trechos em `docs/03-arquitetura.md`,
`docs/04-modelagem-de-dados.md` e specs relevantes.

Criar um estudo de caso de 2–4 minutos de leitura com:

- problema e fluxo principal dos papéis;
- diagrama simples: navegador → API/casos de uso → Postgres; eventos publicados após commit;
- cenário concorrente: dois lances disputam o mesmo lote, serialização e saldo comprometido;
- como idempotência trata repetição de requisição e qual falha ela evita;
- como anti-sniping altera o término e como o cliente se mantém atualizado;
- encadeamento `prev_hash`, assinatura Ed25519, verificação local e privacidade por pseudônimo;
- decisões descartadas e por quê: saldo fictício, uma instância Socket.IO, catálogo fake em testes;
- relação com `docs/perf/front-bundle.md` e `docs/perf/api-explain.md`: reutilizar evidência
  existente de chunks/lazy loading e benchmark sintético local de 5.005 lotes, com as condições
  originais;
- limitações criptográficas e operacionais transcritas do README com linguagem mais simples;
- comandos e saídas reais dos checks executados na revisão que será publicada.

Sugestão para comunicar auditoria em duas camadas:

1. Resumo: “A sequência, os hashes e as assinaturas conferem com a chave pública enviada pelo
   servidor.”
2. Detalhe expansível: checks individuais, hash, assinatura e elo que falhou.
3. Nota de limite: “A aplicação verifica consistência usando a chave fornecida pela API; isto
   não identifica de forma independente quem controla o servidor.”

Uma demonstração de adulteração pode ser um exercício futuro em fixture local isolada, nunca uma
alteração em lote de produção. Explicar que o README já documenta os limites da cadeia, incluindo
truncamento de lotes ativos.

Critérios de aceite:

- Outro engenheiro consegue relacionar cada seta do diagrama a módulos existentes no código.
- A descrição da auditoria não usa “impossível de adulterar”, “prova pública independente” ou
  equivalentes.
- O texto separa deliberadamente dado fictício, resultado de teste e comportamento em produção.
- Os testes citados incluem comando, revisão e saída literal registrada; não há contagem herdada
  sem reexecução naquela revisão.

### Fase 4 — Documentação e acabamento de publicação

**Objetivo:** tirar contradições da página pública e facilitar compartilhamento.  
**Esforço:** 0,5–1 dia.  
**Dependência:** Fases 0–3.

Arquivos a avaliar:

- `docs/CHECKLIST.md` e `ai/cards/README.md`: registrar status documental conforme o modelo do
  projeto, com links para evidência real; não marcar DONE por conveniência.
- `docs/smoke-producao.md`: preservar cronologia, adicionar a nova execução e explicar diferença
  entre smoke local e produção.
- `apps/web/index.html`: título descritivo, meta description e tags Open Graph coerentes com o projeto;
  escolher imagem social com licença confirmada.
- `docs/design/`: identificar explicitamente capturas simuladas; acrescentar capturas atuais
  separadas, em local e dimensão razoáveis.
- `README.md`: link para diagrama, estudo de caso e vídeo.

Executar, como verificação futura e no ambiente definido pelo projeto:

```powershell
rtk pnpm lint
rtk pnpm typecheck
rtk pnpm test
rtk pnpm build
rtk pnpm test:e2e
```

Usar Node 22 e banco descartável conforme as instruções do repositório; assegurar que os testes e
a captura automatizada usam `FakeCatalog`, sem chamadas ao catálogo real. Separar problemas de
integração do deploy dos resultados locais. Caso a suite falhe, registrar causa/estado, corrigir
ou documentar bloqueio; não remover ou pular teste para liberar publicação.

Critérios de aceite:

- README, checklist e cards não contradizem a validação mais recente; mudanças de estado têm
  evidência referenciada.
- Metadados são legíveis quando o link é compartilhado e não prometem comportamento financeiro
  ou criptográfico além do implementado.
- Comandos de qualidade registram saída real para o commit publicado; CI atual é consultada ou
  explicitamente informada como não confirmada.
- Nenhuma chave, `.env`, cookie, dump ou segredo entra em captura, relatório ou Git.

### Fase 5 — Publicação do portfólio

**Objetivo:** publicar uma narrativa honesta e orientar respostas técnicas.  
**Esforço:** 0,25–0,5 dia.  
**Dependência:** Fases 0–4 aprovadas.

Esqueleto de publicação profissional:

> Criei uma casa de leilões online de arte para explorar um problema de backend que parece
> simples até haver concorrência: dois lances podem disputar o mesmo lote ao mesmo tempo.
>
> A aplicação processa lances no servidor em transação, atualiza as sessões em tempo real e
> registra uma cadeia de auditoria verificável no navegador. O saldo é simulado; não há
> movimentação financeira real.
>
> [Vídeo curto da demonstração] · [Deploy] · [Código]
>
> Stack: TypeScript, React, Fastify, Socket.IO, PostgreSQL e Playwright. No README descrevi as
> decisões de concorrência, os limites da auditoria e como executar o projeto localmente.

Personalizar o texto com aprendizados próprios, não com alegações de impacto comercial. Linkar
deploy, GitHub e vídeo; informar quando o vídeo foi capturado se o seed muda. Evitar “produção
financeira”, “segurança garantida”, percentuais de performance ou escala sem medição atual.

## Roadmap proposto

### Preparação antes de 29/10/2026: mínimo apresentável

1. Com o prazo de 29/10, priorizar validar o fluxo autenticado que falta após reset e registrar
   bloqueios concretos.
2. Atualizar o topo do README e inserir passos curtos para visitante, Ana/Bruno e leiloeiro.
3. Gravar a jornada real da vitrine → dois lances → auditoria e criar capturas desktop/mobile.
4. Colocar um quadro curto de arquitetura, limitações e comandos; não reescrever toda a
   documentação existente.
5. Reconciliar status de cards/checklist com evidências, sem editar o histórico como se fosse
   contemporâneo.
6. Rodar as verificações necessárias no Node 22 e registrar saída real. Se ambiente ou prazo
   impedir o conjunto, reduzir alegações e publicar o bloqueio com transparência.
7. Verificar que links públicos abrem, descrição social faz sentido e imagens podem ser usadas.

Para este prazo de dois dias, limitar-se a fechar evidência e publicação: validação disponível,
README compacto, uma captura/vídeo editado e registro de limitações. A extensão visual das Fases
1A/1B pertence ao ciclo de 2–3 semanas se não houver tempo de fazer, testar e revisar com
qualidade.

### Duas a três semanas após o pacote inicial

| Ciclo | Entregável possível | Regra de entrada |
|---|---|---|
| Semana 1 | Estudo de caso técnico com diagrama e decisões de concorrência e auditoria. | Fatos reconciliados e verificações datadas. |
| Semana 1–2 | Aplicar Fases 1A/1B: hierarquia visual da vitrine/sala, estados de sincronização e auditoria em camadas. | Aceites mobile, leitores de tela, snapshot/evento válido e estados de erro cobertos. |
| Semana 2 | Ferramenta local de demonstração de auditoria com fixture descartável, capaz de marcar elo alterado como inválido. | Especificação curta, isolamento e nenhum endpoint de produção alterado. |
| Semana 2–3 | Ajustes de descoberta: favoritos locais ou lista de observação sem mexer nas regras de leilão. | Validar valor para audiência; decidir privacidade e persistência antes de implementar. |
| Semana 3 | Acessibilidade manual orientada a teclado/leitor de tela e revisão de legibilidade das tabelas de auditoria. | Corrigir achados reais, documentar navegador/tecnologia assistiva e revalidar. |

Favoritos, laboratório e observabilidade são propostas opcionais. Cada uma precisa de escopo,
critério de sucesso e análise de custo próprios. Evitar empilhar dependências ou criar arquitetura
de escala hipotética para uma demonstração em instância única.

## Riscos e decisões para manter explícitas

| Risco | Tratamento no plano |
|---|---|
| Seed envelhece e sala acaba antes da visita. | Registrar datas, escolher lote atual, ensinar recriar seed somente localmente. Desenhar renovação de demo sem ação destrutiva automática em produção. |
| Login de dois usuários usa o mesmo cookie. | Instruir janelas/perfis isolados e validar duas sessões reais. Não remover autenticação para facilitar. |
| API externa ou hospedagem gratuita fica indisponível. | Mostrar estado observado e opções de acesso; manter teste/fallback com fake claramente rotulado. |
| Limitações da prova criptográfica ficam escondidas por marketing. | Repetir ressalva em estudo de caso e página de auditoria, sem desqualificar o que ela efetivamente verifica. |
| Screenshot contém imagem sem direito de republicação. | Conferir a licença por imagem e manter atribuição; catálogo/API não concede automaticamente todos os direitos de redistribuição. |
| Check CI ou smoke antigo é tratado como atual. | Associar revisão e data à evidência; consultar estado atual antes de usar badges/alegações. |
| Plano vira expansão sem fim. | Fechar evidência e material editorial nos dois dias disponíveis; itens P1/P2 têm escopo e validação próprios. |

Não gerar ou trocar chaves de produção como parte do polimento visual ou editorial. A troca pode
invalidar verificações de auditorias existentes se a rotação/versionamento não estiver planejada.
Não executar `seed:reset` em produção para renovar a demonstração.

## Referências do próprio repositório

- [README](../README.md): execução, credenciais demo, arquitetura, limites e deploy.
- [Arquitetura](03-arquitetura.md) e [modelagem de dados](04-modelagem-de-dados.md): fluxo e invariantes.
- [Checklist de requisitos](CHECKLIST.md) e [quadro de cards](../ai/cards/README.md): reconciliação de status.
- [Smoke de produção](smoke-producao.md): cronologia de ensaios local e publicado.
- [Direção visual ClickBids](design/clickbids.md): tokens, componentes, comportamento responsivo.
- [Revisão visual](design/revisao.md): correções aplicadas e oportunidades que ficaram fora.
- [Spec front-end](../ai/specs/SP-09-front-end.md): contratos existentes para interface e acessibilidade.

## Conclusão prática

O projeto já possui material suficiente para uma história forte de portfólio. A diferença entre
“um repositório interessante” e “um projeto profissionalmente apresentado” é a qualidade da
primeira experiência: link funcional, credenciais claras, vídeo honesto, fluxo de duas sessões
observado, limites visíveis e documentação que corresponde ao commit em produção. Faça esse
pacote antes de ampliar funcionalidades.
