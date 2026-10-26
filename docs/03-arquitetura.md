# 03 — Arquitetura

Diagramas em Mermaid (o GitHub renderiza). Regras citadas como `RN-xx` estão em
[`02-regras-de-negocio.md`](02-regras-de-negocio.md).

---

## 1. Contexto

```mermaid
flowchart LR
    V([Visitante]) -->|vitrine, auditoria, comprovante| APP
    L([Leiloeiro]) -->|cria e gerencia lotes| APP
    B([Licitante]) -->|deposita, dá lances| APP
    APP[Casa de Leilões]
    APP -->|busca itens e imagens<br/>HTTPS, com cache e circuit breaker| AIC[(API Art Institute<br/>of Chicago)]
```

A API externa só é usada na **busca** e na **criação de lote**. Todo o resto lê do nosso banco
(RN-20, RN-21).

---

## 2. Containers (deploy)

```mermaid
flowchart TB
    subgraph Browser
        SPA[SPA React + Vite<br/>TanStack Query · socket.io-client<br/>verificação Ed25519 no navegador]
    end

    subgraph "Serviço web (1 imagem Docker)"
        API[Fastify<br/>REST /api/*]
        WS[Socket.IO<br/>/socket.io]
        STATIC[Arquivos estáticos do SPA]
        WORKER[Worker de liquidação<br/>loop de 1 s]
    end

    DB[(PostgreSQL 16)]
    AIC[(API Art Institute)]

    SPA -- HTTPS mesmo domínio<br/>cookie httpOnly --> API
    SPA -- WebSocket mesmo domínio --> WS
    SPA -- GET / --> STATIC
    API --> DB
    WORKER --> DB
    API -- busca/criação de lote --> AIC
    API -. eventos pós-commit .-> WS
    WORKER -. eventos pós-commit .-> WS
```

**Um único serviço** serve API, WebSocket e o build do SPA: mesmo domínio, sem CORS, cookie
`SameSite=Lax` funciona, WebSocket autentica pelo mesmo cookie. Em desenvolvimento o Vite roda
separado com proxy para a API.

---

## 3. Componentes do back-end

```mermaid
flowchart LR
    subgraph http [http — rotas finas]
        R1[auth.routes]
        R2[catalog.routes]
        R3[lots.routes]
        R4[bids.routes]
        R5[wallet.routes]
        R6[audit.routes]
        R7[receipts.routes]
    end

    subgraph application [application — casos de uso]
        U1[register / login]
        U2[searchCatalog]
        U3[createLot / cancelLot / listLots]
        U4[placeBid]
        U5[deposit / getWallet]
        U6[settleDueLots]
        U7[auditLot]
    end

    subgraph domain [domain — regras puras, sem I/O]
        D1[bidRules]
        D2[antiSniping]
        D3[lotPhase]
        D4[auditChain<br/>canonical JSON · SHA-256]
        D5[pseudonym]
        D6[money]
    end

    subgraph ports [ports]
        P1[CatalogProvider]
        P2[Signer]
        P3[Clock]
    end

    subgraph infra [infra]
        I1[db — Drizzle]
        I2[ArticCatalog<br/>cache · breaker · timeout]
        I3[FakeCatalog]
        I4[Ed25519Signer]
        I5[realtime — Socket.IO]
    end

    http --> application --> domain
    application --> ports
    I2 -.implementa.-> P1
    I3 -.implementa.-> P1
    I4 -.implementa.-> P2
    application --> I1
    application --> I5
    JOB[jobs/settlementWorker] --> U6
```

Regras de dependência: `domain` não importa nada de fora; `application` orquestra transações e
usa `ports`; `http` só valida (Zod de `packages/shared`) e chama casos de uso; detalhes de
Fastify, Socket.IO e Drizzle ficam em `http` e `infra`.

Ports existem **só** onde há troca real de implementação (catálogo real × fake; assinatura com
chave de teste; relógio controlável nos testes). Sem repositórios genéricos ou camadas especulativas.

---

## 4. Fluxos principais

### 4.1 Lance

```mermaid
sequenceDiagram
    autonumber
    actor B as Licitante
    participant SPA
    participant API as POST /api/lots/:id/bids
    participant DB as PostgreSQL
    participant WS as Socket.IO

    B->>SPA: digita valor e confirma
    SPA->>API: { amountCents } + Idempotency-Key
    API->>DB: BEGIN
    API->>DB: SELECT lot FOR UPDATE
    Note over API: RN-04 janela · RN-06 líder · RN-05 mínimo
    API->>DB: SELECT wallet FOR UPDATE
    API->>DB: SUM(currentPrice) dos lotes que lidera
    Note over API: RN-08 cabe no disponível
    API->>DB: INSERT bid (seq, prev_hash, hash, signature)
    API->>DB: UPDATE lot (preço, líder, head_hash, ends_at RN-09)
    API->>DB: COMMIT
    API-->>SPA: 201 { lote atualizado }
    API->>WS: bid.accepted → sala lot:{id}
    API->>WS: bid.outbid + wallet.changed → user:{líder anterior}
    API->>WS: wallet.changed → user:{licitante}
```

Recusa em qualquer passo → `ROLLBACK` e erro com código (`BELOW_MINIMUM`, `INSUFFICIENT_FUNDS`,
...), que o SPA traduz para a mensagem da RN.

**Concorrência:** ordem fixa de travas **lote → carteira** (e carteiras por id na liquidação),
então não há deadlock. Lances no mesmo lote são serializados pela linha do lote; lances do mesmo
licitante em lotes diferentes, pela linha da carteira.

### 4.2 Encerramento e liquidação

```mermaid
sequenceDiagram
    autonumber
    participant W as settlementWorker (a cada 1 s)
    participant DB as PostgreSQL
    participant WS as Socket.IO

    W->>DB: BEGIN
    W->>DB: SELECT lots WHERE state='ACTIVE' AND ends_at <= now()<br/>FOR UPDATE SKIP LOCKED LIMIT 20
    alt sem lances
        W->>DB: evento CLOSED · state = CLOSED_NO_WINNER
    else com lances
        W->>DB: SELECT wallets (vencedor, leiloeiro) FOR UPDATE ordenado por id
        W->>DB: INSERT wallet_entries (débito vencedor, crédito leiloeiro)
        W->>DB: evento CLOSED assinado · INSERT receipt
        W->>DB: state = SETTLED
    end
    W->>DB: COMMIT
    W->>WS: lot.closed → sala · wallet.changed → vencedor e leiloeiro
```

Idempotente pelo `state` + `SKIP LOCKED`: duas instâncias nunca liquidam o mesmo lote; se o
processo cair no meio, a transação é desfeita e o próximo ciclo refaz.

### 4.3 Busca no catálogo com a API instável

```mermaid
sequenceDiagram
    autonumber
    actor L as Leiloeiro
    participant API as GET /api/catalog/search
    participant C as ArticCatalog
    participant AIC as API externa

    L->>API: q="monet"
    API->>C: search(q, page)
    alt resultado em cache (TTL 10 min)
        C-->>API: itens do cache
    else circuit breaker aberto
        C-->>API: CatalogUnavailable
    else chamada
        C->>AIC: GET (timeout 3 s, 1 retry com jitter)
        AIC-->>C: 200 itens  / erro ou timeout
        C-->>API: itens / CatalogUnavailable (conta falha no breaker)
    end
    API-->>L: 200 itens · ou 503 CATALOG_UNAVAILABLE (UI mostra aviso)
```

---

## 5. Histórico à prova de adulteração

**Técnica: cadeia de hashes assinada (log append-only), verificável por qualquer pessoa.**

```mermaid
flowchart LR
    G["Gênese<br/>SHA-256(termos do lote)"] --> B1
    B1["#1 lance<br/>prev = gênese<br/>hash₁ · assinatura₁"] --> B2
    B2["#2 lance<br/>prev = hash₁<br/>hash₂ · assinatura₂"] --> B3
    B3["#3 evento CLOSED<br/>prev = hash₂<br/>hash₃ · assinatura₃"] --> RC
    RC["Comprovante<br/>final_hash = hash₃<br/>assinatura"]
```

1. **Gênese:** `genesis_hash = SHA-256(JSON canônico dos termos)` — id do lote, pseudônimo do
   vendedor, lance inicial, incremento, início, fim original, título, descrição, categoria,
   `item_snapshot` completo, id do item e hash da imagem.
2. **Cada elo:** `hash = SHA-256(JSON canônico {lotId, seq, type, bidderPseudonym, amountCents,
   createdAt, payload, prevHash})` e `signature = Ed25519(chave privada, bytes UTF-8 do hash
   hexadecimal)`. JSON canônico = chaves
   ordenadas, sem espaços, números inteiros, datas ISO-8601 UTC com milissegundos.
3. **Chave privada só em variável de ambiente** do servidor, nunca no banco. A chave pública fica
   em `GET /api/audit/public-key` e embutida no build do front.
4. **Verificações e o que cada uma detecta:**

| Verificação | Detecta |
|---|---|
| `seq` contínuo 1..N | remoção no meio |
| `prev_hash` = hash do elo anterior; primeiro aponta para a gênese | inserção, reordenação, troca de termos do lote |
| hash recalculado = hash gravado | alteração de qualquer campo |
| assinatura válida com a chave pública | quem tem acesso ao banco e recalcula a cadeia inteira (não tem a chave) |
| `bid_count`/`head_hash` do lote e `final_hash` do comprovante = último elo | truncamento do final (para lotes liquidados) |
| regras RN-04/05/06 reexecutadas sobre o histórico | incoerências semânticas |

5. **Verificação dupla:** o servidor devolve o veredito detalhado e o navegador **refaz tudo
   sozinho** com WebCrypto (fallback `@noble/ed25519`) — o visitante não precisa confiar no servidor.
6. **Limitação conhecida (vai no README):** quem controla **ao mesmo tempo** o banco e a chave
   privada poderia reescrever tudo; e truncar o final de um lote **ainda ao vivo** só é
   detectado se o navegador já tinha visto a cabeça anterior (guardada em `localStorage`). A
   evolução natural seria publicar checkpoints dos hashes num serviço externo independente.
7. **Defesa extra (não substitui a detecção):** trigger que bloqueia `UPDATE`/`DELETE` em `bids`
   e `lot_events` para o usuário da aplicação.

---

## 6. Tempo real

| Canal | Quem entra | Eventos |
|---|---|---|
| `lot:{id}` | qualquer pessoa na sala | `bid.accepted`, `lot.extended`, `lot.closed`, `lot.cancelled` |
| `user:{id}` | o próprio usuário (cookie no handshake) | `bid.outbid`, `wallet.changed` |

- Eventos são emitidos **depois do commit** (nunca anunciam algo que foi desfeito).
- Toda resposta REST e evento carrega `serverTime`; o SPA calcula o offset do relógio para a
  contagem regressiva.
- Ao reconectar, o SPA invalida as queries e refaz o snapshot via REST — evento perdido não
  deixa a tela inconsistente.
- Uma instância basta para o teste. Escalar horizontalmente exigiria o adapter Postgres/Redis do
  Socket.IO (não implementado — YAGNI).

---

## 7. Segurança

| Tema | Medida |
|---|---|
| Senhas | argon2id |
| Sessão | JWT assinado (HS256) em cookie `httpOnly`, `Secure`, `SameSite=Lax`, 7 dias |
| CSRF | `SameSite=Lax` + rotas mutáveis exigem `Content-Type: application/json` |
| Autorização | Por papel e por dono do recurso **no servidor**; a UI só esconde botões |
| Entrada | Zod em todas as rotas e eventos; limites de tamanho |
| Abuso | `@fastify/rate-limit` em login, cadastro, busca no catálogo e lances |
| Cabeçalhos | `@fastify/helmet` (CSP compatível com imagens servidas pela própria API) |
| Segredos | `JWT_SECRET`, `AUDIT_SIGNING_PRIVATE_KEY`, `PSEUDONYM_SECRET` só em env; `.env.example` sem valores reais |
| PII | Respostas públicas montadas por DTOs explícitos, com teste de contrato |

---

## 8. Estrutura de pastas

```
apps/
  api/src/
    domain/        bidRules, antiSniping, lotPhase, auditChain, pseudonym, money
    application/   casos de uso (um arquivo por caso)
    ports/         CatalogProvider, Signer, Clock
    infra/         db/ (schema, migrations), catalog/, crypto/, realtime/
    http/          rotas, plugins (auth, erros, rate limit), schemas
    jobs/          settlementWorker
    main.ts        composição (injeta implementações reais ou fakes)
  web/src/
    routes/        páginas por rota
    features/      lots, bidding, wallet, audit, auctioneer, auth
    components/    UI compartilhada (acessível)
    lib/           api client, socket, money, time offset, audit verify
packages/
  shared/src/      schemas Zod, códigos de erro, eventos realtime, tipos
```

---

## 9. Decisões de stack (por quê)

### D1 — Front-End: React + Vite (SPA), e não Next.js

| Critério | Vite (SPA) | Next.js |
|---|---|---|
| Natureza do app | Altamente interativo e em tempo real — o caso típico de SPA | Brilha com SSR/SEO e páginas majoritariamente estáticas |
| Deploy | Gera estáticos que o próprio back-end serve → **1 serviço, 1 domínio** | Runtime Node próprio (ou Vercel) separado do back-end |
| Cookies / WebSocket | Mesmo origin: cookie `SameSite=Lax` e WebSocket sem CORS | Domínios diferentes → CORS, cookie `SameSite=None`, WebSocket cross-origin |
| Complexidade | Uma forma de renderizar | Server/Client Components, cache do App Router, dois ambientes |

O que se perde: SEO e prévia de link. O PDF não pede SEO; se der tempo, a API injeta meta tags
Open Graph só em `/comprovante/:code`. React sem ferramenta de build não compensa: o CRA foi
descontinuado e configurar bundler à mão não agrega à avaliação.

### D2 — Back-End: Node.js + Fastify, e não NestJS ou Express puro

| Critério | Fastify | NestJS | Express |
|---|---|---|---|
| Cerimônia | Baixa: plugins e funções | Alta: módulos, decorators, DI | Mínima |
| Validação/serialização | Schemas por rota nativos (usamos Zod compartilhado) | Pipes | Manual |
| Erros e hooks | `setErrorHandler`, hooks `onRequest`/`preHandler` para auth e papel | Filters e Guards | Middlewares manuais |
| Desempenho | Alto | Bom (sobre Express/Fastify) | Médio |
| Testes | `app.inject()` sem abrir porta | `TestingModule` | supertest |
| Ecossistema necessário | `@fastify/cookie`, `jwt`, `rate-limit`, `helmet`, `static` oficiais | Completo | Pacotes de terceiros |

Fastify dá a estrutura necessária (plugins encapsulados, hooks de auth, schemas) sem a
cerimônia do NestJS, que em 7 dias consumiria tempo das regras de negócio. Em relação ao
Express, já traz validação, tratamento de erros, `inject` para testes e plugins oficiais de
segurança. A organização em camadas (seção 3) fica por conta da estrutura de pastas, não do framework.

### D3 — Banco: PostgreSQL

| Necessidade | Recurso |
|---|---|
| Lances simultâneos no mesmo lote | Transações ACID + `SELECT … FOR UPDATE` |
| Mesmo saldo em dois lotes | `FOR UPDATE` na carteira |
| Liquidar exatamente uma vez | `FOR UPDATE SKIP LOCKED` |
| Invariantes | `CHECK`, `UNIQUE (lot_id, seq)` |
| Histórico append-only | Trigger bloqueando `UPDATE`/`DELETE` |
| Snapshot do item / imagem | `jsonb` / `bytea` |
| Busca (opcional) | `pg_trgm` |
| Dinheiro exato | `BIGINT` em centavos |

MySQL 8 também atenderia o essencial, mas `jsonb`, `pg_trgm`, `CHECK` e triggers são mais
maduros no Postgres e há mais oferta gratuita gerenciada (Neon, Supabase, Render, Railway).
MongoDB não combina: os dados são relacionais e o núcleo é consistência financeira sob
concorrência.

### D4 — Drizzle ORM, e não Prisma

As regras dependem de `FOR UPDATE` / `SKIP LOCKED`; o Drizzle expressa isso tipado
(`.for('update', { skipLocked: true })`), no Prisma seria SQL cru. As migrations do Drizzle são
SQL legível, fácil de revisar e explicar.

### D5 — Socket.IO, e não WebSocket puro ou SSE

Salas por lote/usuário, reconexão automática e fallback prontos. SSE seria suficiente para
servidor → cliente, mas Socket.IO simplifica salas e autenticação no handshake.

### D6 — TypeScript ponta a ponta em monorepo pnpm

Front, back e `packages/shared` (schemas Zod, códigos de erro, tipos de eventos) na mesma
linguagem: o contrato da API é checado pelo compilador nos dois lados, e o avaliador clona um
único repositório.

### D7 — Art Institute of Chicago como API externa

Pública, sem chave, imagens IIIF de domínio público e atributos ricos (artista, data, técnica,
dimensões). Reserva: Metropolitan Museum API (mesmo port `CatalogProvider`).
