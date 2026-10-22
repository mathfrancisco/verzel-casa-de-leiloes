# Plano de execução — Casa de Leilões (Teste Elite Dev Verzel)

> Status: **planejamento**. Nada abaixo está implementado ainda. Este documento é a visão geral;
> os detalhes normativos estão nos documentos abaixo e a verificação item a item fica em
> [`CHECKLIST.md`](CHECKLIST.md).

| Doc | Conteúdo |
|---|---|
| [01 — Requisitos](01-requisitos.md) | RF (funcionais), RNF (não funcionais), matriz de rastreabilidade |
| [02 — Regras de negócio](02-regras-de-negocio.md) | RN numeradas, com exemplos e casos de borda |
| [03 — Arquitetura](03-arquitetura.md) | Diagramas, fluxos, decisões de stack e por quê |
| [04 — Modelagem de dados](04-modelagem-de-dados.md) | Diagrama ER, tabelas, restrições, índices, invariantes |
| [`/ai`](../ai/README.md) | Specs, cards e fluxo de desenvolvimento assistido por IA |

Em caso de conflito, vale: **02 Regras de negócio > specs (`ai/specs`) > este plano**.

- **Recebido em:** 22/10/2026 · **Prazo (7 dias corridos):** 29/10/2026
- **Entrega:** repositório público no GitHub + **deploy obrigatório** + formulário
  `https://elitedev.verzel.com.br/?elite-dev-2026-2` (nome, e-mail, repo, deploy, uso de IA).
- **Meta:** 100% dos requisitos base + **todos os 5 opcionais** (busca/filtro, cancelamento
  com estorno automático, Docker Compose, testes automatizados, dark mode).

---

## 1. Entendimento do desafio

Uma casa de leilões online onde:

| Papel | Pode | Não pode |
|---|---|---|
| **Leiloeiro (vendedor)** | Buscar itens numa API pública, criar lotes, cancelar lotes, ver resultados e total recebido | Dar lances (em nenhum lote) |
| **Licitante (cliente)** | Depositar saldo simulado, acompanhar lotes ao vivo, dar lances, arrematar, compartilhar comprovante | Criar lotes |
| **Visitante (sem login)** | Ver vitrine, auditar histórico de qualquer lote, abrir comprovante por link | Dar lances |

Pontos que mais pesam na avaliação (onde está a "pegadinha" de cada requisito):

1. **Concorrência no lance** — dois lances simultâneos não podem ambos "vencer"; um licitante
   não pode comprometer o mesmo saldo em dois lotes ao mesmo tempo.
2. **Saldo comprometido** — liberado *imediatamente* ao ser superado.
3. **Anti-sniping** — prorrogação sem condição de corrida com o encerramento.
4. **Liquidação** — exatamente uma vez (idempotente), mesmo com reinício do servidor.
5. **Histórico à prova de adulteração** — detectar alteração, remoção **e inserção**, *mesmo
   feitas direto no banco*. Técnica é escolha nossa e **precisa ser explicada**.
6. **Resiliência à API externa** — vitrine, salas, auditoria e comprovante funcionam com a API fora.
7. **Privacidade** — auditoria e comprovante identificam licitantes sem expor dados pessoais.
8. **README detalhado** — ausência de explicações tira nota. Comportamentos inesperados documentados.

---

## 2. Decisões de stack

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** ponta a ponta (monorepo `pnpm`) | Tipos e schemas de validação compartilhados entre front e back; um só toolchain em 7 dias |
| Front-End | **React 18 + Vite**, React Router, TanStack Query, Tailwind CSS, `socket.io-client` | React é obrigatório; Vite é leve; TanStack Query resolve cache/refetch ao reconectar |
| Back-End | **Node 22 + Fastify 5**, Zod, Socket.IO, `pino` | Fastify é rápido e simples (sem a cerimônia do NestJS); Socket.IO dá salas e reconexão |
| Banco | **PostgreSQL 16** + **Drizzle ORM** (migrations com `drizzle-kit`) | Transações e `SELECT … FOR UPDATE` / `SKIP LOCKED` são o coração das regras de lance |
| Auth | E-mail + senha (**argon2id**), JWT em **cookie httpOnly SameSite=Lax** | Mesmo domínio para SPA, API e WebSocket → sem CORS nem cookie cross-site |
| Cripto | `node:crypto` (SHA-256, Ed25519, HMAC); no browser WebCrypto com fallback `@noble/ed25519` | Auditoria verificável também no navegador do visitante |
| Testes | **Vitest** (unit + integração com Postgres real), **Playwright** (E2E) | Mesmo runner no front e no back |
| Infra | **Docker Compose** (dev/avaliação) · **1 imagem Docker** no deploy (API serve o build do SPA) | Um único serviço = deploy simples, WebSocket no mesmo origin |
| Deploy | Render / Railway / Fly.io (serviço web) + Postgres gerenciado (Neon ou o do provedor) | Decidir no Dia 1 fazendo o deploy do "hello world" (ver §11) |
| CI | GitHub Actions: lint → typecheck → unit → integração (service Postgres) → E2E → build da imagem | |

**API externa escolhida:** [Art Institute of Chicago API](https://api.artic.edu/docs/) — pública,
sem chave, obras de arte com imagens IIIF de domínio público e atributos ricos (artista, data,
técnica, dimensões, origem). Alternativa de reserva: Metropolitan Museum API.

### Estrutura do monorepo

```
apps/
  api/      Fastify + Socket.IO + Drizzle (domínio, casos de uso, adapters)
  web/      React + Vite (SPA)
packages/
  shared/   schemas Zod, códigos de erro, tipos de eventos realtime, helpers de dinheiro
docs/       plano, checklist, decisões, uso de IA
docker-compose.yml · Dockerfile · .github/workflows/ci.yml
```

### Organização do back-end (Clean Architecture pragmática)

```
apps/api/src/
  domain/         regras puras: bidRules, antiSniping, auditChain, pseudonym, money (sem I/O)
  application/    casos de uso: placeBid, createLot, cancelLot, settleLot, deposit, auditLot
  ports/          CatalogProvider, Clock, Signer (só o necessário para injetar fakes nos testes)
  infra/          db (Drizzle), catalog/artic (HTTP + cache + circuit breaker), realtime (Socket.IO)
  http/           rotas finas: validação Zod → caso de uso → resposta
  jobs/           settlementWorker
```

---

## 3. Modelo de dados (resumo)

Detalhes normativos, diagrama ER, restrições e invariantes em
[`04-modelagem-de-dados.md`](04-modelagem-de-dados.md). Dinheiro sempre em **centavos
(`BIGINT`)**; tempo sempre do relógio do banco (`now()`), em UTC.

| Tabela | Papel |
|---|---|
| `users` | Usuários com papel `AUCTIONEER` ou `BIDDER` |
| `wallets` | Saldo total por usuário (cache travado com `FOR UPDATE`, `CHECK >= 0`) |
| `wallet_entries` | Livro-razão: depósitos, liquidações e estornos |
| `images` | Imagem do item baixada na criação do lote (não dependemos do CDN externo) |
| `lots` | Termos do lote + snapshot do item (`jsonb`) + estado atual (preço, líder, cabeça da cadeia) |
| `lot_entries` | Cadeia append-only de lances e eventos (`BID`, `CLOSED`, `CANCELLED`), `UNIQUE(lot_id, seq)` |
| `receipts` | Comprovantes públicos por código não enumerável |
| `idempotency_keys` | Respostas de lances e depósitos repetidos |

---

## 4. Regras de negócio e como serão garantidas

### 4.1 Lance (`POST /api/lots/:id/bids`) — tudo numa transação

```
BEGIN
  SELECT * FROM lots WHERE id = $1 FOR UPDATE;           -- serializa lances do mesmo lote
  state = CANCELLED            → LOT_CANCELLED
  now() <  starts_at           → LOT_NOT_STARTED
  now() >= ends_at ou SETTLED  → LOT_CLOSED
  usuário é leiloeiro          → SELLER_CANNOT_BID      (também barrado pelo papel)
  leader_id = usuário          → ALREADY_WINNING
  mínimo = bid_count = 0 ? starting_price : current_price + min_increment
  valor < mínimo               → BELOW_MINIMUM  (resposta inclui o mínimo)
  SELECT * FROM wallets WHERE user_id = $u FOR UPDATE;   -- serializa lances do mesmo licitante
  comprometido = SUM(current_price) dos lotes ACTIVE onde leader_id = usuário
  valor > balance - comprometido → INSUFFICIENT_FUNDS (resposta inclui o disponível)
  INSERT lot_entries (type = BID, seq = chain_length + 1, prev_hash = head_hash, hash, signature)
  UPDATE lots SET current_price, leader_id, bid_count, chain_length, head_hash,
                  ends_at = GREATEST(ends_at, now() + 2 min) se ends_at - now() <= 2 min
COMMIT
→ emite eventos realtime (só depois do commit)
```

- **Ordem de travas sempre `lote → carteira`** (e carteiras por id na liquidação) ⇒ sem deadlock.
- **Saldo comprometido é derivado** (soma dos lotes em que o usuário lidera). Ao ser superado, o
  `leader_id` muda na mesma transação ⇒ o valor volta ao disponível **imediatamente**, sem
  "job de liberação".
- **Idempotência**: header `Idempotency-Key` no lance e no depósito (duplo clique / retry de rede).
- Valores validados pelo Zod: inteiro, positivo, teto razoável.

### 4.2 Anti-sniping

"Lance aceito nos últimos 2 minutos estende o fim do lote para +2 minutos." Interpretação adotada
(documentar no README): **o novo fim passa a ser `momento do lance + 2 min`** (soft close
clássico). Acontece sob a mesma trava do lote, então nunca corre com o encerramento. O front
recebe `ends_at` atualizado pelo WebSocket e mostra "prorrogado".

### 4.3 Encerramento e liquidação

Worker no próprio processo da API, a cada 1 s:

```
SELECT … FROM lots WHERE state='ACTIVE' AND ends_at <= now()
  FOR UPDATE SKIP LOCKED LIMIT 20
```

- Sem lances → `CLOSED_NO_WINNER`.
- Com lances → débito do vencedor + crédito ao leiloeiro (`wallet_entries`), evento `CLOSED`
  encadeado e assinado, `receipt` gerado, `state = SETTLED`.
- Idempotente pelo `state`; `SKIP LOCKED` permite mais de uma instância; se o servidor cair,
  o próximo ciclo liquida. Lances após `ends_at` são recusados pela regra, mesmo que o worker
  atrase.
- Invariante: saldo nunca fica negativo — o valor debitado estava comprometido e não há saque.

### 4.4 Cancelamento

- **Base:** leiloeiro cancela o próprio lote enquanto não houver lances.
- **Opcional (estorno automático):** cancelar com lances ou já liquidado:
  - antes da liquidação → comprometimento do líder liberado na hora (é derivado);
  - após a liquidação → lançamentos `REFUND_DEBIT` (leiloeiro) e `REFUND_CREDIT` (vencedor),
    comprovante marcado como revogado. Sempre possível porque o leiloeiro não dá lances, logo
    seu saldo nunca é menor que o recebido.
  - evento `CANCELLED` entra na cadeia; licitantes afetados são notificados em tempo real.
- Lotes cancelados **somem da vitrine**, mas a auditoria continua acessível pelo link.

### 4.5 Códigos de erro → mensagens (feedback)

| Código | HTTP | Mensagem no front |
|---|---|---|
| `BELOW_MINIMUM` | 422 | "Lance abaixo do mínimo. O mínimo agora é R$ X." |
| `INSUFFICIENT_FUNDS` | 422 | "Saldo insuficiente. Disponível: R$ X." + atalho para depositar |
| `ALREADY_WINNING` | 409 | "Você já está ganhando este lote." |
| `LOT_NOT_STARTED` | 409 | "Este lote ainda não começou. Abre em dd/mm hh:mm." |
| `LOT_CLOSED` | 409 | "Lote encerrado." |
| `LOT_CANCELLED` | 409 | "Lote cancelado pelo leiloeiro." |
| `SELLER_CANNOT_BID` | 403 | "Leiloeiros não podem dar lances." |

Os códigos ficam em `packages/shared`, então front e back não divergem.

---

## 5. Histórico à prova de adulteração (técnica e explicação)

**Cadeia de hashes assinada (append-only log), verificável por qualquer pessoa.**

1. **Gênese:** ao publicar o lote, `genesis_hash = SHA-256(JSON canônico dos termos do lote)`
   (id, vendedor pseudônimo, lance inicial, incremento, início, fim original, id do item).
   Alterar os termos depois quebra a cadeia.
2. **Cada lance/evento:** `hash = SHA-256(JSON canônico { lotId, seq, type, bidderPseudonym,
   amountCents, createdAt, prevHash })` e `signature = Ed25519(chave_privada, hash)`.
3. **A chave privada fica só na variável de ambiente do servidor**, nunca no banco. A chave
   pública é publicada em `GET /api/audit/public-key` e embutida no front.
4. **A auditoria verifica:**
   - `seq` contínuo de 1 a N → detecta **remoção** no meio;
   - `prev_hash` de cada item = `hash` do anterior → detecta **inserção/reordenação**;
   - hash recalculado = hash gravado → detecta **alteração**;
   - assinatura válida → detecta quem tem acesso ao banco e tenta **recalcular a cadeia
     inteira** (sem a chave privada, não consegue assinar);
   - regras de negócio reexecutadas (cada lance ≥ anterior + incremento, dentro da janela) →
     detecta incoerências semânticas.
5. **Remoção do final da cadeia (truncamento)** é o caso mais difícil: quem apaga os últimos
   lances pode reaproveitar a assinatura do penúltimo. Mitigações:
   - lote liquidado: o **comprovante** carrega `final_hash` assinado e o vencedor tem o link — a
     auditoria compara a cabeça da cadeia com o comprovante;
   - lote ao vivo: o navegador guarda a última cabeça vista (`localStorage`) e alerta se o
     servidor passar a mostrar uma cadeia menor; `bid_count`/`head_hash` do lote também são
     conferidos;
   - registrar no README como **limitação conhecida** (sem um "testemunho" externo — ex.:
     publicar checkpoints em um serviço independente — não há garantia absoluta contra
     truncamento por quem controla servidor e banco ao mesmo tempo).
6. **Verificação em dois lugares:** o servidor devolve o veredito detalhado e o **navegador
   re-verifica sozinho** com WebCrypto ("não confie, verifique"). A página mostra
   **Íntegro / Adulterado** e em qual item a cadeia quebrou.

Testes de integração vão adulterar o banco com SQL direto (`UPDATE`, `DELETE`, `INSERT`,
recálculo de hashes sem chave, truncamento) e exigir que a auditoria acuse cada caso.

---

## 6. Privacidade

- Licitante aparece como **pseudônimo por lote**: `Licitante ` + 6 caracteres de
  `HMAC-SHA256(PSEUDONYM_SECRET, userId:lotId)`. Pseudônimos diferentes em lotes diferentes ⇒
  não dá para correlacionar o histórico de alguém entre lotes.
- Auditoria e comprovante **nunca** retornam nome, e-mail ou id interno. Teste de contrato
  garante que essas respostas não têm campos de PII.
- Logado, o próprio usuário vê "(você)" ao lado do seu pseudônimo.
- Link do comprovante usa código aleatório de 128 bits (não enumerável).

---

## 7. Resiliência à API externa

- **Port `CatalogProvider`** com adapter `ArticCatalog` (HTTP) e `FakeCatalog` (testes/E2E/seed).
- No adapter: timeout de 3 s, 1 retry com jitter, **circuit breaker** (abre após 5 falhas, meia
  abertura após 30 s), **cache LRU** de buscas e itens (TTL 10 min), rate limit por usuário na
  rota de busca, header `AIC-User-Agent` como a API pede.
- **Snapshot na criação do lote:** título, atributos e a **imagem (bytes)** são copiados para o
  nosso banco. Vitrine, sala, auditoria e comprovante **só leem do nosso banco** ⇒ continuam
  funcionando com a API fora do ar.
- API fora: o painel do leiloeiro mostra "Catálogo indisponível no momento" (e itens do cache,
  se houver), sem quebrar o restante da aplicação.
- Teste: com `FakeCatalog` em modo "sempre falha", vitrine/sala/auditoria/comprovante
  respondem 200.

---

## 8. Tempo real

- Socket.IO no mesmo servidor. Salas: `lot:{id}` (pública) e `user:{id}` (autenticada via
  cookie no handshake).
- Eventos em `lot:{id}`: `bid.accepted` (preço, pseudônimo do líder, seq, hash, `endsAt`),
  `lot.extended`, `lot.closed`, `lot.cancelled`.
- Eventos em `user:{id}`: `bid.outbid`, `wallet.changed`.
- Toda resposta carrega `serverTime`; o front calcula o offset do relógio para a contagem
  regressiva não depender do relógio do usuário.
- Ao reconectar, o front refaz o snapshot via REST (TanStack Query) — evento perdido não deixa
  a tela inconsistente.
- Uma instância é suficiente para o teste; escalar exigiria o adapter Postgres/Redis do
  Socket.IO (registrado como evolução, não implementado — YAGNI).

---

## 9. Telas (Front-End)

| Tela | Rota | Conteúdo |
|---|---|---|
| Vitrine | `/` | Abas **Ao vivo / Agendados / Encerrados** (cancelados não aparecem); cards com imagem, preço atual, contagem regressiva. **Opcional:** busca por texto, filtro por categoria/faixa de preço, ordenação (termina antes, maior preço), paginação |
| Sala do lote | `/lotes/:id` | Lance atual, histórico, **sua posição**, contagem regressiva, faixa **"Você está ganhando" / "Você foi superado"**, campo de lance com mínimo sugerido, mensagens de erro claras; tudo via WebSocket |
| Carteira | `/carteira` | Saldo total, **comprometido** (com detalhamento por lote), disponível, depósito simulado |
| Meus arremates | `/meus-lances` | Lotes em que deu lance (ganhando / superado / venceu / perdeu) e lotes vencidos com comprovante + botão compartilhar (Web Share API / copiar link) |
| Comprovante | `/comprovante/:code` | Público: item, valor, data, pseudônimo do vencedor, hash final, link para auditoria |
| Auditoria | `/auditoria/:lotId` | Pública: histórico completo, veredito **Íntegro / Adulterado**, verificação no navegador, passo a passo de como verificar |
| Painel do leiloeiro | `/painel` | Buscar itens na API → criar lote (imagem, título, atributos, início/fim, lance inicial, incremento, categoria, descrição); meus lotes com status; cancelar; resultado de cada encerrado (arrematado? por quanto?) e **total recebido** |
| Login / Cadastro | `/entrar`, `/cadastro` | Escolha de papel no cadastro |

Transversal: rotas protegidas por papel no front **e** no back; layout responsivo; acessibilidade
(foco visível, `aria-live` para "você foi superado" e mensagens de erro, contraste AA);
**Dark mode** (opcional) com Tailwind `class`, padrão do sistema + escolha persistida, sem flash.

---

## 10. Dados de teste (seed)

Rodado automaticamente no `docker compose up` e por comando no deploy. Usa fixtures locais (não
chama a API externa) e cria os lances pelo **mesmo caso de uso** do app, para a cadeia ser válida.

| Usuário | Papel | Senha | Saldo |
|---|---|---|---|
| `leiloeiro@demo.com` | Leiloeiro | `demo1234` | — |
| `ana@demo.com` | Licitante | `demo1234` | R$ 50.000 |
| `bruno@demo.com` | Licitante | `demo1234` | R$ 50.000 |

Lotes: **1 ao vivo com lances abertos** (fim distante para cobrir a janela de avaliação),
1 ao vivo terminando em poucos minutos (para ver anti-sniping/encerramento), 1 agendado,
1 encerrado e liquidado (com comprovante) e 1 encerrado sem lances. Script `pnpm seed:reset`
recria tudo com datas relativas a "agora".

---

## 11. Deploy

- Dia 1: subir o esqueleto (health check + página React) para validar build, WebSocket e
  Postgres gerenciado no provedor escolhido. Deploy cedo elimina o maior risco do prazo.
- Imagem única: build do SPA copiado para a API (`@fastify/static`), migrations rodando no start.
- Variáveis: `DATABASE_URL`, `JWT_SECRET`, `AUDIT_SIGNING_PRIVATE_KEY`, `PSEUDONYM_SECRET`,
  `CATALOG_PROVIDER=artic|fake`. Script `pnpm keys:generate` para o par Ed25519.
- Atenção a planos gratuitos que "dormem" (cold start derruba o WebSocket por alguns segundos e
  o worker de liquidação só roda acordado) — documentar no README e, se possível, usar plano
  sem hibernação.

---

## 12. Estratégia de testes (opcional "Testes automatizados")

| Nível | O que cobre |
|---|---|
| Unit (domínio) | Cada recusa de lance (tabela de casos), mínimo do 1º e dos seguintes, anti-sniping nas bordas (2:00, 1:59, 0:01), pseudônimo, canonicalização JSON, verificação da cadeia para cada tipo de adulteração |
| Integração (Postgres real) | Lance em transação; **20 lances simultâneos no mesmo lote** → cadeia íntegra e um só líder; **mesmo licitante em 2 lotes ao mesmo tempo** além do saldo → só um aceito; liberação imediata do comprometido; liquidação idempotente (rodar 2×); cancelamento com estorno antes e depois da liquidação; adulterações via SQL detectadas |
| Contrato HTTP | Status e códigos de erro; papel (leiloeiro não dá lance, licitante não cria lote); auditoria/comprovante sem PII; resiliência com `FakeCatalog` falhando |
| E2E (Playwright) | Leiloeiro cria lote → Ana e Bruno (2 contextos de navegador) disputam → "você foi superado" aparece sem recarregar → encerramento → comprovante → auditoria íntegra |
| CI | Tudo acima no GitHub Actions a cada push |

---

## 13. Cronograma (7 dias)

| Dia | Data | Entregas | Pronto quando |
|---|---|---|---|
| 0 | 22/10 | Leitura do PDF, plano, checklist, repositório | Este documento no GitHub |
| 1 | 23/10 | Monorepo pnpm, lint/format, Docker Compose, schema + migrations, auth (cadastro/login/papéis), CI, **deploy do esqueleto** | Login funcionando no ar |
| 2 | 24/10 | `CatalogProvider` (Artic + Fake, cache, breaker), snapshot de item e imagem, criação de lote, vitrine (abas) | Leiloeiro cria lote a partir da API e ele aparece na vitrine |
| 3 | 25/10 | Motor de lance (transação, regras, carteira, comprometido, idempotência), depósito, cadeia de hashes + assinatura, testes unit/integração de concorrência | Testes de concorrência verdes |
| 4 | 26/10 | Sala ao vivo com WebSocket, mensagens de feedback, anti-sniping, worker de liquidação, comprovante | Disputa completa entre 2 navegadores até o comprovante |
| 5 | 27/10 | Auditoria (servidor + navegador), Meus arremates + compartilhar, resultados e total no painel, cancelamento com estorno, busca/filtro | Testes de adulteração via SQL verdes |
| 6 | 28/10 | E2E Playwright, dark mode, acessibilidade/responsivo, seed final, deploy final, teste com API fora | Fluxo E2E verde contra o build de produção |
| 7 | 29/10 | README completo, `USO-DE-IA.md`, revisão final do checklist, folga para imprevistos, envio do formulário | Formulário enviado |

Ordem de corte se o prazo apertar (do último a cair para o primeiro): busca/filtro → dark mode →
estorno pós-liquidação → E2E. Requisitos base e deploy **nunca** entram no corte.

---

## 14. Riscos

| Risco | Mitigação |
|---|---|
| Plano gratuito de hospedagem hiberna | Deploy no Dia 1 para conhecer o comportamento; documentar; preferir plano sem hibernação |
| API externa instável/limitada | Snapshot + cache + breaker + `FakeCatalog`; seed não depende dela |
| Condições de corrida em lance/liquidação | Travas de linha, ordem fixa de travas, `SKIP LOCKED`, testes de concorrência |
| Relógio do cliente errado | Offset calculado a partir de `serverTime` |
| Ed25519 no WebCrypto em navegador antigo | Fallback `@noble/ed25519` |
| Escopo grande para 7 dias | Cronograma com "pronto quando" diário e ordem de corte definida |

---

## 15. Fora de escopo (o PDF diz que não precisa)

Nota fiscal, revenda entre usuários, aplicativo nativo, recuperação de senha.
