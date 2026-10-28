# LC-036 — Pacote de publicação

Rascunho para revisão. **Nada foi publicado nem enviado.** O post e o formulário ficam por conta
do autor.

## Problema e diferencial

- **Problema:** em um leilão online, quem dá lance precisa confiar que o preço, a ordem dos lances
  e o vencedor não foram alterados depois.
- **Diferencial técnico:**
  - os lances são validados em transação no servidor;
  - a atualização chega em tempo real, depois do `COMMIT`;
  - cada lance é um elo encadeado por hash e assinado com Ed25519;
  - qualquer pessoa verifica a cadeia no próprio navegador.

## Rascunho de post (LinkedIn)

> Construí uma casa de leilões online de arte como teste técnico: obras em domínio público do
> Art Institute of Chicago, lances ao vivo e um histórico de lances que qualquer pessoa pode
> auditar no navegador.
>
> Por trás:
> - lance validado no servidor, em transação (lote → carteira);
> - atualização em tempo real via Socket.IO, só depois do commit;
> - cada lance encadeado por hash e assinado com Ed25519;
> - testes unitários, de integração e E2E com Playwright, sem chamar a API externa.
>
> O saldo é simulado: nenhum dinheiro real é movimentado.
>
> Demo: https://p01--verzel-casa-de-leiloes--4cj5fhqhqb2r.code.run
> Código: https://github.com/mathfrancisco/verzel-casa-de-leiloes
>
> TypeScript · React · Fastify · PostgreSQL · Socket.IO

## Descrição curta (GitHub "About")

> Casa de leilões de arte com lances ao vivo e histórico auditável no navegador. Saldo simulado.
> TypeScript, React, Fastify, Socket.IO, PostgreSQL.

## Itens do pacote

| Item | Onde | Origem | Estado |
|---|---|---|---|
| README de portfólio | [README.md](../../README.md) | LC-029 | Pronto |
| Demo publicada | https://p01--verzel-casa-de-leiloes--4cj5fhqhqb2r.code.run | Produção | Smoke em 28/10/2026 ([LC-025](lc025-smoke-producao.md)) |
| Favicon e metadados OG | `apps/web/index.html`, `apps/web/public/favicon.svg` | LC-028 | Em produção: `/favicon.svg` 200 e 6 tags `og:*` no HTML (28/10/2026) |
| Capturas (8) | [media/](media/) | Local, LC-034 | Prontas, rotuladas como locais |
| Vídeo de 85 s com legendas (incorporado ao README) | [media/demo-local-2026-10-28.webm](media/demo-local-2026-10-28.webm) | Local, LC-034 | Pronto, com rótulo e cortes declarados |
| Uso de IA | [README › Uso de IA](../../README.md#uso-de-ia) | Autor | Pronto |

## Checklist final

- [x] O link da demo responde: `/health` 200 em 28/10/2026.
- [x] As capturas e o vídeo estão rotulados como gravação local, com data e revisão.
- [x] Os direitos das obras estão registrados (CC0, Art Institute of Chicago). Veja
  [lc034-midia.md](lc034-midia.md#direitos).
- [x] Não aparece dado pessoal, senha nem segredo na mídia.
- [x] Imagem `og:image` (captura da vitrine, `apps/web/public/og-image.png`) adicionada. A resposta 200 em produção precisa ser conferida depois do deploy.
- [ ] **Ausente:** vídeo ou GIF gravado em produção. Só existe a gravação local.
- [ ] **Ausente:** encerramento e comprovante testados em produção. O lote ao vivo termina em
  30/10.
- [ ] **Ausente:** SHA confirmado no painel do Northflank.
- [ ] **Ação do autor:** revisar o texto do post e publicar.
- [x] Formulário do desafio enviado pelo autor em 28/10/2026.
