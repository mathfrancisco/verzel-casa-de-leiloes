# Casa de Leilões — Teste técnico Elite Dev Verzel

Casa de leilões online. Leiloeiros criam lotes a partir de obras da
[API pública do Art Institute of Chicago](https://api.artic.edu/docs/), licitantes depositam
saldo simulado e disputam lances ao vivo, e qualquer pessoa pode **auditar** o histórico de
lances de um lote e verificar, no próprio navegador, que ele não foi adulterado.

> **Demonstração.** Todo saldo é simulado. Nenhum dinheiro real é movimentado.

- **Demo ao vivo:** <https://p01--verzel-casa-de-leiloes--4cj5fhqhqb2r.code.run>
- **Repositório:** <https://github.com/mathfrancisco/verzel-casa-de-leiloes>
- **Stack:** TypeScript · monorepo pnpm · `apps/web` React + Vite · `apps/api` Node 22 + Fastify +
  Socket.IO · PostgreSQL 16 + Drizzle · `packages/shared` (Zod, códigos de erro, eventos) ·
  Vitest + Playwright.

### Experimente em três passos

1. Abra a demo em **dois perfis de navegador separados**, por exemplo uma janela normal e uma
   anônima. Na mesma janela, as duas contas dividiriam o cookie de sessão.
2. Entre como `ana@demo.com` em um perfil e como `bruno@demo.com` no outro. A senha das duas
   contas é `demo1234`.
3. Abra o lote ao vivo nos dois perfis e dê um lance com o Bruno. Sem recarregar a página, a Ana
   vê o novo preço e o aviso "Você foi superado". Depois, use "Auditar este lote" para conferir o
   histórico.

O leiloeiro (`leiloeiro@demo.com`) busca obras no catálogo e cria lotes. Ele não dá lances.

### O que acontece por trás

- **Lance transacional:** valor mínimo, saldo e prorrogação são validados no servidor, em uma
  transação que trava o lote e depois a carteira.
- **Tempo real:** o evento só sai depois do `COMMIT`, via Socket.IO. Se a conexão cair por pouco
  tempo, os eventos perdidos são reenviados.
- **Liquidação:** ao encerrar, o vencedor é debitado, o valor reservado dos demais é liberado e
  um comprovante é gerado.
- **Auditoria:** cada lance é um elo encadeado por hash e assinado com Ed25519. A verificação roda
  no navegador.

### Capturas e vídeo

Gravação **local** (FakeCatalog) feita em 28/10/2026 sobre a revisão `0d09124` (interface dos cards LC-027 a LC-035), com duas sessões
isoladas. Origem, direitos e limites estão em
[`docs/portfolio/lc034-midia.md`](docs/portfolio/lc034-midia.md).

**Vídeo da demonstração (85 s, legendado).** Clique na imagem para assistir:

[![Vídeo da demonstração: vitrine, dois licitantes disputando um lote, carteira, comprovante e auditoria](docs/portfolio/media/01-vitrine.png)](https://github.com/mathfrancisco/verzel-casa-de-leiloes/raw/main/docs/portfolio/media/demo-local-2026-10-28.webm)

As cenas são capturas reais, e cada corte é indicado no vídeo. As legendas também estão em
[`demo-local-2026-10-28.pt-BR.vtt`](docs/portfolio/media/demo-local-2026-10-28.pt-BR.vtt).

| | |
|---|---|
| ![Vitrine com lotes ao vivo e o aviso de saldo simulado](docs/portfolio/media/01-vitrine.png) **Vitrine** | ![Sala do lote com preço atual, lance mínimo e cronômetro](docs/portfolio/media/02-sala-ana.png) **Sala do lote (sessão A, Ana)** |
| ![Mensagem "Lance abaixo do mínimo" após um lance inválido](docs/portfolio/media/03-lance-recusado-bruno.png) **Lance recusado pelo servidor (sessão B, Bruno)** | ![Novo preço e aviso "Você foi superado", sem recarregar a página](docs/portfolio/media/04-ana-superada.png) **Superação em tempo real (sessão A)** |
| ![Carteira com saldo simulado e nenhuma reserva](docs/portfolio/media/05-carteira-ana.png) **Carteira com saldo simulado** | ![Comprovante público do lote Water Lilies, criado pelo seed](docs/portfolio/media/06-comprovante.png) **Comprovante (dado do seed)** |
| ![Auditoria pública com "Cadeia íntegra" e todas as verificações aprovadas](docs/portfolio/media/07-auditoria.png) **Auditoria verificada no navegador** | <img src="docs/portfolio/media/08-sala-mobile.png" alt="Sala do lote em layout mobile" width="220"> **Sala no celular** |

Obras: Art Institute of Chicago, domínio público (CC0).

Para a explicação técnica (concorrência, idempotência, eventos após o commit, cadeia de
auditoria e seus limites), leia o [estudo de caso](docs/estudo-de-caso.md).

### Estado da demo e evidências

- **Smoke em produção, 28/10/2026:** duas sessões isoladas, um lance recusado abaixo do mínimo,
  a superação recebida sem recarregar, as carteiras e o logout foram conferidos. O encerramento e
  o comprovante não foram testados em produção. Detalhes e limites:
  [`docs/portfolio/lc025-smoke-producao.md`](docs/portfolio/lc025-smoke-producao.md).
- **Testes automatizados:** E2E com Playwright, 27/27 em execução local com `FakeCatalog`
  ([`docs/portfolio/lc026-diagnostico.md`](docs/portfolio/lc026-diagnostico.md)). O CI nunca
  chama a API externa real.
- **Lotes ao vivo:** a API repõe dois lotes de demonstração a cada hora quando nenhum lote ativo
  estiver em andamento ([Banco de dados](#banco-de-dados)).
- **Smoke anterior do deploy:** [`docs/smoke-producao.md`](docs/smoke-producao.md).
- **Limites:** a busca no catálogo depende da API do Art Institute of Chicago. Vitrine, sala,
  auditoria e comprovante não dependem dela. Veja
  [Limitações](#comportamentos-inesperados-e-limitações-conhecidas) e [Uso de IA](#uso-de-ia).

## Sumário

1. [Usuários de demonstração](#usuários-de-demonstração)
2. [Como rodar](#como-rodar)
3. [Banco de dados](#banco-de-dados)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Testes](#testes)
6. [Arquitetura](#arquitetura)
7. [Técnica anti-adulteração](#técnica-anti-adulteração)
8. [Resiliência à API externa](#resiliência-à-api-externa)
9. [Decisões e interpretações](#decisões-e-interpretações)
10. [Comportamentos inesperados e limitações conhecidas](#comportamentos-inesperados-e-limitações-conhecidas)
11. [Deploy](#deploy)
12. [Desempenho](#desempenho)
13. [Uso de IA](#uso-de-ia)
14. [Documentação](#documentação)

## Usuários de demonstração

O seed (`apps/api/src/seed`) cria três usuários, todos com a senha `demo1234`:

| Papel | E-mail | Senha | O que faz |
|---|---|---|---|
| Leiloeiro | `leiloeiro@demo.com` | `demo1234` | Busca no catálogo, cria e cancela lotes, vê resultados e total recebido. **Não dá lance.** |
| Licitante | `ana@demo.com` | `demo1234` | Deposita saldo e dá lances. Começa com R$ 50.000,00 depositados. |
| Licitante | `bruno@demo.com` | `demo1234` | Idem. Começa com R$ 50.000,00 depositados. |

O seed também cria 5 lotes, todos com cadeia de auditoria íntegra: um **arrematado** (com
comprovante), um **encerrado sem lances**, um **ao vivo com lances** de Ana e Bruno (fim em ~3
dias), um **ao vivo terminando em ~10 minutos** e um **agendado**. As datas são relativas ao
momento em que o seed roda; localmente, `pnpm seed:reset` recria tudo com datas novas. Em
qualquer ambiente, o painel do leiloeiro cria lotes novos.

Para testar a disputa em tempo real, abra Ana e Bruno em **navegadores ou janelas anônimas
diferentes**: a sessão é um cookie, então os dois na mesma janela compartilham o login.

## Como rodar

Requisitos: Node 22 (`.nvmrc`), pnpm 10 e Docker.

### Com Docker Compose (app completa)

```bash
docker compose up --build       # Postgres + app em http://localhost:3000
```

O `docker-compose.yml` sobe três serviços:

- `db` — PostgreSQL 16 (volume `db-data`, healthcheck).
- `keys` — serviço de uma execução que **gera uma chave Ed25519 local** na primeira subida e a
  grava no volume `keys` (`/keys/audit-signing-private.pem`, modo `0600`). Nas subidas seguintes
  reaproveita a mesma chave, então a assinatura da cadeia continua válida entre reinícios e a
  auditoria dos lotes semeados permanece íntegra. Se o volume for apagado
  (`docker compose down -v`), a chave muda junto com o banco, que também é recriado.
- `app` — a imagem única (`Dockerfile`: API + WebSocket + build do site). Usa
  `AUDIT_SIGNING_PRIVATE_KEY` do ambiente, se definida; senão, a chave do volume. O comando é
  `node dist/seed.js && exec node dist/main.js`: roda o **seed idempotente** (na primeira subida
  cria os dados de demonstração) e então o servidor, que aplica as migrations ao iniciar.
  `CATALOG_PROVIDER=artic`: a busca do leiloeiro chama a API real do Art Institute.

Os valores padrão de `JWT_SECRET` e `PSEUDONYM_SECRET` no compose servem **só para uso local**;
sobrescreva-os exportando as variáveis antes do `docker compose up`.

### Manual (desenvolvimento)

```bash
pnpm install
cp .env.example .env            # preencha os segredos (ver "Variáveis de ambiente")
pnpm keys:generate              # gera keys/audit-signing-private.pem; cole o PEM em AUDIT_SIGNING_PRIVATE_KEY
docker compose up -d db         # PostgreSQL 16 em localhost:5432 (usuário/senha/banco: leilao)
pnpm db:migrate                 # aplica as migrations de apps/api/drizzle
pnpm seed                       # dados de demonstração (idempotente)
pnpm dev                        # API em :3000 e web em :5173 (o web repassa /api para a API)
```

Sem Docker, qualquer PostgreSQL 16 serve: ajuste `DATABASE_URL`. O usuário precisa poder criar
bancos para os testes de integração.

## Banco de dados

- **Configurar:** defina `DATABASE_URL` (`postgres://usuário:senha@host:porta/banco`).
  Localmente, `docker compose up -d db` entrega o banco `leilao` (usuário e senha `leilao`).
- **Migrar:** `pnpm db:migrate`. As migrations (Drizzle, SQL legível em `apps/api/drizzle`) também
  rodam **sozinhas ao iniciar a API** (`src/main.ts`), então em produção não há passo separado.
  Para gerar uma nova a partir do schema: `pnpm db:generate`.
- **Semear:** `pnpm seed` — idempotente: se o leiloeiro de demonstração já existe, não duplica
  nada. Se uma execução anterior foi interrompida e deixou o seed incompleto, ele avisa.
- **Zerar (somente local):** `pnpm seed:reset` apaga o schema inteiro e recria tudo. Recusa rodar
  com `NODE_ENV=production` e recusa bancos que não sejam `localhost`, `127.0.0.1`, `::1` ou `db`.
- O seed usa os mesmos casos de uso da API (com relógio controlado), então a cadeia assinada de
  cada lote semeado é válida. Usa um catálogo local (`apps/api/seed/fixtures`): dez obras reais do Art Institute em
  domínio público (CC0), com imagens e metadados versionados, e **não chama a API externa**.
  As cinco primeiras viram os lotes iniciais. A cada hora, se nenhum lote ativo termina no futuro,
  o leiloeiro demo abre dois lotes ao vivo novos, revezando as dez obras.

## Variáveis de ambiente

A API valida as variáveis com Zod ao iniciar e **não sobe** se faltar alguma obrigatória
(a mensagem lista cada variável inválida). Modelo em [`.env.example`](.env.example); nunca
comite o `.env`.

| Variável | Obrigatória | Formato | Uso |
|---|---|---|---|
| `DATABASE_URL` | sim | URI `postgres://…` | Conexão com o PostgreSQL |
| `JWT_SECRET` | sim | 32+ caracteres aleatórios | Assina o cookie de sessão |
| `PSEUDONYM_SECRET` | sim | 32+ caracteres aleatórios | HMAC dos pseudônimos por lote. **Não troque depois** de haver lances gravados |
| `AUDIT_SIGNING_PRIVATE_KEY` | sim | PEM PKCS#8 Ed25519 (aceita também em uma linha, com `\n` literal ou CRLF) | Assinatura da cadeia de auditoria. A chave pública é derivada dela e servida em `GET /api/audit/public-key` |
| `CATALOG_PROVIDER` | não (padrão `artic`) | `artic` \| `fake` | Catálogo real ou falso (testes) |
| `PORT` | não (padrão `3000`) | inteiro 1–65535 | Porta HTTP |
| `NODE_ENV` | não (padrão `development`) | `development` \| `test` \| `production` | Cookies `Secure`, logs, trava do `seed:reset` |

Gerar segredos: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
Gerar o par Ed25519: `pnpm keys:generate [pasta]` (padrão `keys/`).

> `AUDIT_SIGNING_PUBLIC_KEY` aparece no `.env.example`, mas **o código atual não a lê**: a API
> deriva a chave pública da privada.

## Testes

```bash
pnpm lint                 # ESLint + Prettier --check
pnpm typecheck            # tsc em cada pacote
pnpm test                 # unit + integração (shared, api, web); a API precisa do Postgres de DATABASE_URL
pnpm build
pnpm test:e2e             # Playwright (chromium + axe), fluxo completo
```

- Os testes de integração criam e apagam um **banco descartável por arquivo** no Postgres de
  `DATABASE_URL`.
- O E2E sobe API e web com `CATALOG_PROVIDER=fake` e cobre o fluxo completo (lances com
  encerramento real, rotas por papel, tema claro/escuro, acessibilidade com axe e 360 px sem
  rolagem horizontal).
- **O CI e os testes nunca chamam a API externa real**: usam o `FakeCatalog`.
- CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), em push na `main` e em PR:
  `checks` (install `--frozen-lockfile`, lint, typecheck, test com service `postgres:16`, build)
  → `e2e` (segredos efêmeros gerados no job, migrate, seed, Playwright) → `docker` (build da
  imagem).
- Contagem registrada no PR #26: shared 114, web 130, API 273 (517 testes unit/integração) e E2E
  27/27 local. Os números mudam a cada PR; o resultado autoritativo é o CI.

## Arquitetura

Um único serviço serve API REST, WebSocket (Socket.IO) e o build do SPA no mesmo domínio (sem
CORS; o cookie `httpOnly`/`SameSite=Lax` também autentica o WebSocket). Um worker interno liquida
os lotes vencidos a cada 1 s. Camadas do back: `http` (rotas finas, validação Zod) →
`application` (casos de uso transacionais) → `domain` (regras puras, sem I/O); portas só onde há
duas implementações (catálogo real/fake, assinatura, relógio).

Invariantes: lance, saldo, liquidação e cancelamento rodam **no servidor, em transação**, com
travas na ordem lote → carteira; dinheiro em centavos inteiros; tempo do relógio do banco;
eventos em tempo real só depois do `COMMIT`.

Diagramas, fluxos e decisões de stack: [`docs/03-arquitetura.md`](docs/03-arquitetura.md).
Modelo de dados: [`docs/04-modelagem-de-dados.md`](docs/04-modelagem-de-dados.md). Regras de
negócio (normativas): [`docs/02-regras-de-negocio.md`](docs/02-regras-de-negocio.md).

## Técnica anti-adulteração

O histórico de cada lote é uma **cadeia de hashes assinada** (log append-only), verificável por
qualquer pessoa.

1. **Gênese.** `genesis_hash = SHA-256(JSON canônico dos termos do lote)` (preço inicial,
   incremento, início, fim original, título, snapshot do item, etc.).
2. **Cada elo** (lance ou evento `CLOSED`/`CANCELLED`) guarda o `prev_hash` (o primeiro aponta
   para a gênese), o `hash = SHA-256(JSON canônico do elo, incluindo prev_hash)` e uma
   **assinatura Ed25519** do hash. A chave privada fica só em variável de ambiente do servidor,
   nunca no banco.
3. **Pseudônimos.** Auditoria, sala e comprovante mostram licitantes só como `Licitante 7KQ2PX`,
   derivado por HMAC com `PSEUDONYM_SECRET`, **por lote**: nome, e-mail e IDs internos não saem
   nessas respostas.
4. **Defesa em profundidade no banco.** Triggers bloqueiam `UPDATE`/`DELETE`/`TRUNCATE` em
   `lot_entries` (migration `0003`). Não é a proteção principal: a cadeia assinada detecta a
   adulteração **mesmo que o trigger seja removido** por quem tem acesso ao banco.
5. **Verificação no navegador.** A página de auditoria (`/auditoria/:id`) e o comprovante
   refazem as verificações localmente (WebCrypto), sem depender do veredito do servidor.

As **7 verificações** (a auditoria mostra cada uma):

| Verificação | Detecta |
|---|---|
| `SEQUENCE` | `seq` contínuo a partir de 1: remoção ou salto no meio |
| `LINKS` | `prev_hash` igual ao hash do elo anterior; primeiro elo aponta para a gênese: inserção, reordenação, troca dos termos do lote |
| `HASHES` | hash recalculado igual ao gravado: alteração de qualquer campo (ex.: valor de um lance editado por SQL) |
| `SIGNATURES` | assinatura Ed25519 válida: quem recalcula a cadeia inteira mas não tem a chave privada |
| `HEAD` | último elo igual ao `head_hash`/contagem do lote: truncamento do final |
| `RECEIPT` | `final_hash` do comprovante igual ao último elo: coerência com o comprovante |
| `RULES` | reexecuta RN-04/05/06 sobre o histórico: incoerências de regra |

Se qualquer verificação falha, o lote aparece como **adulterado**, apontando o elo e a
verificação que falhou. Em teste local, um valor alterado por SQL foi detectado em `HASHES` no
elo alterado ([`docs/CHECKLIST.md`](docs/CHECKLIST.md), linha da auditoria). Limites da técnica:
ver [Limitações conhecidas](#comportamentos-inesperados-e-limitações-conhecidas).

## Resiliência à API externa

A API do Art Institute of Chicago é usada **somente** na busca do painel do leiloeiro e na
criação do lote.

- Ao criar o lote, título, atributos e **imagem são copiados** para o nosso banco (snapshot
  imutável, RN-20): as imagens são servidas pela própria API a partir do PostgreSQL, sem
  hotlink.
- **Vitrine, sala de lances, auditoria e comprovante nunca chamam a API externa** (RN-21): leem
  só do PostgreSQL.
- O cliente do catálogo tem cache em memória (TTL de 10 min), timeout de 3 s, 1 nova tentativa
  com jitter e *circuit breaker*. Com a API fora, só a **busca** responde `503
  CATALOG_UNAVAILABLE` (a interface mostra o aviso); todo o resto segue normal.
- CI e testes usam o `FakeCatalog`; o seed usa fixtures locais.

## Decisões e interpretações

Detalhes e exemplos em [`docs/02-regras-de-negocio.md`](docs/02-regras-de-negocio.md) (normativo).

- **Anti-sniping (RN-09).** O enunciado diz "estende o fim do lote para +2 minutos". Adotamos o
  *soft close* clássico: lance aceito quando faltam **≤ 2 min** move o fim para *momento do lance +
  2 min* (nunca diminui; pode repetir). Lance com mais de 2 min restantes não muda o fim.
- **Saldo comprometido (RN-07/08).** O comprometido é **derivado** da liderança (soma do preço
  atual dos lotes ativos que o usuário lidera); ser superado libera o valor na mesma transação.
  Não há saque; o depósito é simulado (R$ 1 a R$ 1.000.000 por operação, com `Idempotency-Key`).
- **Sem auto-cobertura (RN-06).** Quem lidera não pode cobrir o próprio lance.
- **Lote imutável (RN-02).** Depois de publicado não se edita (os termos fazem parte da gênese
  da cadeia); corrige-se cancelando e criando outro.
- **Cancelamento com estorno (RN-12/13, opcional implementado).** Sem lances: cancela direto.
  Com lances antes da liquidação: libera o comprometido. Depois da liquidação: estorna
  (`REFUND_DEBIT`/`REFUND_CREDIT`) e marca o comprovante como **revogado**. Lote cancelado some
  da vitrine, mas sala, auditoria e comprovante seguem acessíveis por link, com aviso.
- **Fases derivadas (RN-03).** A fase do lote é calculada pelo relógio do banco, não gravada; a
  janela entre o fim e a liquidação (no máximo alguns segundos) aparece como "encerrado".
- **Liquidação exatamente uma vez (RN-10).** Pelo `state` do lote + `FOR UPDATE SKIP LOCKED`.
- **Privacidade (RN-16).** Pseudônimo **por lote**: o mesmo licitante não é correlacionável
  entre lotes. O próprio usuário logado vê "(você)".
- **Comprovante (RN-19).** Acessível por código aleatório de 128 bits (link não enumerável).
- **Opcionais entregues:** busca e filtro de lotes, cancelamento com estorno, Docker Compose,
  testes automatizados (unit, integração, E2E) e dark mode.

## Comportamentos inesperados e limitações conhecidas

- **O código público do comprovante fica fora da assinatura.** O código da URL
  (`/comprovante/:code`) é só um identificador de acesso aleatório e não faz parte do conteúdo
  assinado; o que é assinado e verificado é o conteúdo do comprovante (valor, item, pseudônimo,
  hash final).
- **Truncar os elos finais de um lote ATIVO não é detectável.** Com o lote ainda ao vivo, quem
  controla o banco e remove os últimos elos (ajustando contagem e `head_hash`) deixa uma cadeia
  prefixo válida; só lotes liquidados têm o comprovante para cruzar o `final_hash`. A evolução
  natural seria publicar checkpoints dos hashes num serviço externo independente.
- **Quem controla banco e chave privada ao mesmo tempo** poderia reescrever tudo. Além disso, a
  chave pública usada na verificação vem da própria API (campo `publicKey` da auditoria e do
  comprovante): a verificação no navegador prova a consistência da cadeia com aquela chave, não a
  identidade independente do servidor.
- **Plano gratuito do Northflank (0,1 vCPU / 256 MB).** Rodar o seed num *shell* junto com a API
  **estoura a memória e reinicia o pod**. Por isso o seed de produção roda por *override* do
  comando de início: `sh -c 'node dist/seed.js; exec node dist/main.js'` (ver [Deploy](#deploy)).
- **Datas do seed são relativas à execução.** Em produção, o lote "terminando em minutos" encerra
  logo depois do seed; os demais seguem ao vivo por dias ou já estão encerrados/agendados.
- **Flake ocasional no E2E do CI** no passo do aviso "você foi superado", que espera até 5 s pelo
  evento em tempo real; o Playwright roda sem retry (`retries: 0`) e, com o runner sob carga, o
  passo pode estourar. Reexecutar o job resolve; não indica falha de regra.
- **A vitrine busca lotes e carteira duas vezes no carregamento.** Não afeta a correção, só
  gera requisições redundantes; não corrigido.
- **Sessão por cookie:** Ana e Bruno na mesma janela do navegador compartilham o login (ver
  [Usuários de demonstração](#usuários-de-demonstração)).
- **Uma instância:** o tempo real não escala horizontalmente (exigiria o adapter Postgres/Redis
  do Socket.IO, não implementado).
- **Fora do escopo (o enunciado exclui):** nota fiscal, revenda, app nativo, recuperação de senha.
- **Smoke de produção incompleto:** no deploy não foram observados o aviso "você foi superado"
  sem recarregar (Ana e Bruno estavam na mesma sessão do navegador) nem o fluxo do leiloeiro
  (busca na API do Art Institute e criação de lote). Ver
  [`docs/smoke-producao.md`](docs/smoke-producao.md).

## Deploy

Provedor: **Northflank** (plano gratuito *Sandbox*: sem cartão, serviços sempre ligados, sem
"dormir"; a sala usa WebSocket e o encerramento dos lotes roda no próprio servidor, então um
serviço que hiberna atrasaria liquidações). Alternativas avaliadas: Railway (pago), Render +
Neon (serviço dorme), Fly.io e Koyeb. Link:
<https://p01--verzel-casa-de-leiloes--4cj5fhqhqb2r.code.run>.

Passo a passo (os nomes dos campos podem variar um pouco no painel):

1. Crie um projeto no Northflank e conecte sua conta do GitHub.
2. **Addon** → PostgreSQL, versão 16.
3. **Service** → *Combined service* (build + deploy) a partir deste repositório, branch `main`,
   build por **Dockerfile** (`/Dockerfile`, contexto `/`).
4. **Porta** 3000, protocolo HTTP, **pública**.
5. **Segredos/variáveis** (usamos um *secret group* `verzel-runtime` ligado ao serviço):
   - `DATABASE_URL` — URI de conexão do addon PostgreSQL;
   - `JWT_SECRET` e `PSEUDONYM_SECRET` — dois segredos aleatórios diferentes, de 32+ caracteres;
   - `AUDIT_SIGNING_PRIVATE_KEY` — PEM PKCS#8 Ed25519 (`pnpm keys:generate`); aceita colado em
     uma linha;
   - `CATALOG_PROVIDER` = `artic`; `NODE_ENV` = `production`.

   Não troque `PSEUDONYM_SECRET` nem `AUDIT_SIGNING_PRIVATE_KEY` depois de haver lances: os
   pseudônimos e as assinaturas novos deixariam de bater com a cadeia já gravada.
6. **Health check / readiness**: HTTP `GET /ready` na porta 3000 (intervalo de 10 s). `/health`
   indica só que o processo está vivo; `/ready` também confere o banco.
7. **Seed (uma vez):** sobrescreva o comando de início do serviço com
   `sh -c 'node dist/seed.js; exec node dist/main.js'`. O seed é idempotente, então o override
   pode permanecer. Não rode o seed num shell paralelo (OOM, ver limitações).
8. Deploy. A cada push na `main`, o Northflank refaz o build e publica. As migrations rodam ao
   iniciar a API.

Smoke test pós-deploy: [`docs/smoke-producao.md`](docs/smoke-producao.md) (vitrine, lances de Ana e
Bruno, prorrogação anti-sniping, encerramento, comprovante e auditoria íntegra com as 7
verificações).

## Desempenho

- **API:** planos `EXPLAIN (ANALYZE, BUFFERS)` antes/depois, índices novos da vitrine, limites do
  servidor e análise de N+1: [`docs/perf/api-explain.md`](docs/perf/api-explain.md).
- **Front:** divisão do bundle por rota (JS carregado na vitrine de 371,87 kB para ~333,5 kB, com
  sala, auditoria, comprovante, carteira e painel em chunks sob demanda), imagens lazy e
  re-renders isolados na sala: [`docs/perf/front-bundle.md`](docs/perf/front-bundle.md).
- **Revisão de design** (hierarquia, estados e layout a 360 px nos dois temas):
  [`docs/design/revisao.md`](docs/design/revisao.md).

## Uso de IA

Usei IA como par de programação, com regras escritas no repositório. As decisões de produto,
regras de negócio e arquitetura foram minhas. A IA executou tarefas pequenas e verificáveis.

1. **Documentação antes do código.** Escrevi primeiro os requisitos (RF/RNF), as regras de
   negócio, a arquitetura e a modelagem de dados em `docs/`. Esses documentos são a fonte de
   verdade. Quando havia conflito, a ordem de precedência era: regras de negócio > spec > card >
   plano.
2. **Specs e cards como contrato.** Dividi o sistema em specs por módulo (`ai/specs/SP-xx`) com
   API, códigos de erro e casos de teste positivos e negativos. Dividi o trabalho em cards
   pequenos (`ai/cards/LC-xxx`) com dependências e critérios de aceite. A IA trabalhava em um card
   por vez.
3. **Instruções para os agentes.** O [`AGENTS.md`](AGENTS.md) define o protocolo e os invariantes
   que nenhuma tarefa pode quebrar. Exemplos: lances em transação no servidor, dinheiro em
   centavos inteiros, histórico append-only com hash encadeado e assinatura Ed25519, respostas
   públicas só com pseudônimos, e testes que nunca chamam a API externa real.
4. **TDD e verificação.** Para cada card, a IA escrevia os testes primeiro, via os testes falharem
   e depois implementava o mínimo para eles passarem. Nenhum card foi fechado sem lint, typecheck
   e testes rodados. Cada PR registra a saída real dos comandos.
5. **Revisão e testes de ponta a ponta.** Usei a IA para revisar diffs em busca de bugs e para
   rodar testes E2E: vitrine, lance ao vivo, aviso de "superado" em tempo real, integridade da
   auditoria e criação de lote via API do Art Institute of Chicago.
6. **Controle humano.** Revisei e aprovei cada PR. Ações sensíveis ficaram comigo: senhas, reset
   do banco de produção e merges.

O processo completo (specs, cards e prompts) está em [`ai/README.md`](ai/README.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [00 — Plano geral](docs/00-plano-geral.md) | Entendimento do desafio, stack, cronograma, riscos |
| [01 — Requisitos](docs/01-requisitos.md) | Requisitos funcionais e não funcionais, matriz de rastreabilidade |
| [02 — Regras de negócio](docs/02-regras-de-negocio.md) | Regras numeradas (normativo) |
| [03 — Arquitetura](docs/03-arquitetura.md) | Diagramas, fluxos, técnica anti-adulteração, decisões de stack |
| [04 — Modelagem de dados](docs/04-modelagem-de-dados.md) | Diagrama ER, restrições, índices, invariantes |
| [Checklist](docs/CHECKLIST.md) | Cada item do PDF → requisito → card → evidência |
| [Smoke de produção](docs/smoke-producao.md) | Passos executados no deploy |
| [Desempenho](docs/perf/api-explain.md) | EXPLAIN da API e bundle do front |
| [Desenvolvimento com IA](ai/README.md) | Specs, cards, prompts e `AGENTS.md` |
