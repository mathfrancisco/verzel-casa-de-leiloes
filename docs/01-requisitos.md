# 01 — Requisitos

Requisitos extraídos do PDF do desafio. Cada um tem um ID estável usado nas specs (`SP-xx`),
nos cards (`LC-xxx`) e nos testes (`CT-xx-yy`). Prioridade: **P0** = obrigatório no PDF,
**P1** = opcional do PDF (meta do projeto é entregar todos), **P2** = melhoria nossa.

## Atores

| Ator | Descrição |
|---|---|
| **Leiloeiro** | Vendedor. Cria e gerencia os próprios lotes. Não dá lances. |
| **Licitante** | Cliente. Deposita saldo simulado, dá lances e arremata. |
| **Visitante** | Qualquer pessoa sem login. Vê vitrine, auditoria e comprovantes. |
| **Sistema** | Processos automáticos: encerramento, liquidação, notificações em tempo real. |
| **API externa** | Art Institute of Chicago — fonte dos itens leiloados. |

---

## Requisitos funcionais (RF)

| ID | Prio | Ator | Requisito | Critérios de aceite (resumo) | Regras |
|---|---|---|---|---|---|
| RF-01 | P0 | Visitante | Cadastrar-se escolhendo o papel (leiloeiro ou licitante) e fazer login/logout | E-mail único; senha mínima de 8 caracteres; papel fixo após cadastro; sessão por cookie httpOnly | RN-01 |
| RF-02 | P0 | Leiloeiro | Buscar itens na API externa | Busca por texto com paginação; mostra imagem, título, artista, data; com API fora, mensagem clara e app segue funcionando | RN-21 |
| RF-03 | P0 | Leiloeiro | Criar lote a partir de um item buscado | Campos: imagem, título, atributos do item, descrição, categoria, início, fim, lance inicial, incremento mínimo; item e imagem copiados (snapshot) | RN-02, RN-20 |
| RF-04 | P0 | Visitante | Ver vitrine separada em **ao vivo**, **agendados** e **encerrados** | Cancelados nunca aparecem; card com imagem, preço atual, nº de lances, contagem regressiva | RN-03, RN-14 |
| RF-05 | P0 | Leiloeiro | Cancelar lote próprio que ainda não recebeu lances | Botão só aparece quando permitido; servidor revalida; lote sai da vitrine | RN-12 |
| RF-06 | P0 | Leiloeiro | Ver resultado de cada lote encerrado e o total recebido | Por lote: arrematado ou não, valor, data; total = soma dos créditos de liquidação (menos estornos) | RN-10, RN-11 |
| RF-07 | P0 | Licitante | Depositar saldo simulado | Valor positivo até o teto por operação; idempotente; reflete na hora | RN-17 |
| RF-08 | P0 | Licitante | Ver carteira: total, comprometido e disponível | Comprometido detalhado por lote; atualiza em tempo real ao ser superado | RN-07 |
| RF-09 | P0 | Licitante | Dar lance em lote ao vivo | Aceito só se cumprir todas as regras de lance; resposta com novo estado do lote | RN-04 a RN-09 |
| RF-10 | P0 | Licitante/Visitante | Sala do lote ao vivo | Lance atual, histórico, posição do usuário, contagem regressiva, indicador "você está ganhando"/"você foi superado"; tudo sem recarregar | RN-03, RN-09 |
| RF-11 | P0 | Licitante | Receber motivo claro de lance recusado | Mensagens para: abaixo do mínimo (com o mínimo), saldo insuficiente (com o disponível), já está ganhando, lote não iniciado, lote encerrado | RN-04 a RN-08 |
| RF-12 | P0 | Sistema | Encerrar e liquidar lotes automaticamente | Ao fim: debita vencedor, credita leiloeiro, gera comprovante; sem lances fecha sem vencedor; exatamente uma vez | RN-10, RN-11 |
| RF-13 | P0 | Licitante | Receber comprovante de arremate compartilhável por link | Página pública por código não enumerável; sem dados pessoais | RN-16, RN-19 |
| RF-14 | P0 | Licitante | Ver "Meus arremates" | Lotes em que deu lance (ganhando/superado/venceu/perdeu) e lotes vencidos com comprovante e link | RN-07 |
| RF-15 | P0 | Visitante | Auditar histórico de lances de qualquer lote | Página pública, histórico completo, veredito **íntegro/adulterado** e onde quebrou | RN-15, RN-16 |
| RF-16 | P0 | Sistema | Dados de demonstração | 1 leiloeiro, 2 licitantes, ≥ 1 lote ao vivo com lances abertos | — |
| RF-17 | P1 | Visitante | Buscar e filtrar lotes | Texto, categoria, faixa de preço, status, ordenação, paginação | RN-14 |
| RF-18 | P1 | Leiloeiro | Cancelar lote com lances, com estorno automático | Antes da liquidação: libera comprometido; depois: estorna vencedor e leiloeiro; comprovante revogado; licitantes notificados | RN-13 |
| RF-19 | P1 | Todos | Alternar tema claro/escuro | Padrão do sistema; escolha persistida; sem flash ao carregar | — |
| RF-20 | P2 | Licitante | Ser notificado ao ser superado mesmo fora da sala | Toast global via canal do usuário | RN-07 |

---

## Requisitos não funcionais (RNF)

| ID | Prio | Categoria | Requisito | Como verificar |
|---|---|---|---|---|
| RNF-01 | P0 | Entrega | **Deploy público** obrigatório, acessível sem configuração | Link no README; smoke test manual e E2E contra o deploy |
| RNF-02 | P0 | Stack | React no front; Node.js no back; PostgreSQL; instruções de banco no README | Revisão do repositório |
| RNF-03 | P0 | Resiliência | Vitrine, salas, auditoria e comprovante funcionam com a API externa fora | Teste com `FakeCatalog` em modo falha (CT-02-xx) |
| RNF-04 | P0 | Consistência | Lances e liquidação corretos sob concorrência; nenhum saldo comprometido duas vezes; liquidação exatamente uma vez | Testes de integração concorrentes (CT-05-xx, CT-07-xx) |
| RNF-05 | P0 | Integridade | Alteração, remoção ou inserção no histórico — inclusive direto no banco — detectada pela auditoria; técnica explicada | Testes que adulteram via SQL (CT-08-xx) + seção no README |
| RNF-06 | P0 | Privacidade | Auditoria e comprovante identificam licitantes sem expor dados pessoais | Teste de contrato sem campos de PII |
| RNF-07 | P0 | Documentação | README detalhado: setup passo a passo, banco, seed, deploy, técnica anti-adulteração, comportamentos inesperados | Revisão; checklist |
| RNF-08 | P0 | Prazo | Entrega até 29/10/2026 (7 dias corridos) | Cronograma do plano |
| RNF-09 | P0 | Segurança | Senhas com argon2id; JWT em cookie httpOnly; autorização por papel **no servidor**; validação de toda entrada; rate limit em login, busca e lance; segredos só em variáveis de ambiente | Testes de autorização; revisão |
| RNF-10 | P0 | Tempo real | Lance aceito chega aos outros clientes da sala em < 1 s em condições normais; reconexão recompõe o estado | E2E com 2 navegadores |
| RNF-11 | P0 | Usabilidade | Responsivo (≥ 360 px), acessível (foco visível, `aria-live` nos avisos, contraste AA), valores em BRL, datas em `pt-BR` no fuso do usuário | Revisão + Playwright |
| RNF-12 | P1 | Qualidade | Testes automatizados (unit, integração, E2E) rodando no CI a cada push | GitHub Actions verde |
| RNF-13 | P1 | Portabilidade | `docker compose up` sobe banco, API e front com seed | Executar do zero numa máquina limpa |
| RNF-14 | P2 | Operação | Logs estruturados (`pino`), `/health` e `/ready`, migrations no start | Verificar no deploy |
| RNF-15 | P2 | Precisão | Dinheiro em centavos inteiros; tempo do relógio do banco em UTC | Revisão + testes de domínio |

---

## Fora de escopo

Nota fiscal, revenda entre usuários, aplicativo nativo, recuperação de senha (PDF). Também não
faremos: saque de saldo, pagamento real, edição de lote após publicado, múltiplas moedas.

---

## Matriz de rastreabilidade

| Requisito | Regras | Spec | Cards |
|---|---|---|---|
| RF-01 | RN-01 | SP-01 | LC-003 |
| RF-02 | RN-21 | SP-02 | LC-005, LC-008 |
| RF-03 | RN-02, RN-20 | SP-03 | LC-006, LC-008 |
| RF-04 | RN-03, RN-14 | SP-03, SP-09 | LC-007 |
| RF-05 | RN-12 | SP-03 | LC-018 |
| RF-06 | RN-10, RN-11 | SP-07, SP-09 | LC-017 |
| RF-07, RF-08 | RN-07, RN-17 | SP-04 | LC-009 |
| RF-09, RF-11 | RN-04 a RN-09 | SP-05 | LC-011, LC-013 |
| RF-10 | RN-03, RN-09 | SP-06, SP-09 | LC-012, LC-013 |
| RF-12 | RN-10, RN-11 | SP-07 | LC-014 |
| RF-13, RF-14 | RN-16, RN-19 | SP-07, SP-09 | LC-016 |
| RF-15 | RN-15, RN-16 | SP-08 | LC-010, LC-015 |
| RF-16 | — | SP-10 | LC-020 |
| RF-17 | RN-14 | SP-03 | LC-019 |
| RF-18 | RN-13 | SP-03, SP-07 | LC-018 |
| RF-19 | — | SP-09 | LC-021 |
| RF-20 | RN-07 | SP-06 | LC-013 |
| RNF-01, RNF-14 | — | SP-10 | LC-004, LC-023 |
| RNF-03 | RN-21 | SP-02 | LC-005 |
| RNF-04 | RN-07, RN-10 | SP-05, SP-07 | LC-011, LC-014 |
| RNF-05, RNF-06 | RN-15, RN-16 | SP-08 | LC-010, LC-015 |
| RNF-07 | — | SP-10 | LC-023 |
| RNF-09 | RN-01 | SP-01 | LC-003 |
| RNF-12 | — | SP-10 | LC-004, LC-022 |
| RNF-13 | — | SP-10 | LC-002 |
