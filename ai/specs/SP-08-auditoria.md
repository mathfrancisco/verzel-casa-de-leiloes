# SP-08 — Auditoria e privacidade

**Requisitos:** RF-15, RNF-05, RNF-06 · **Regras:** RN-15, RN-16 · **Cards:** LC-010, LC-015

Técnica explicada em `docs/03-arquitetura.md` §5. Esta spec fixa formatos e algoritmos para que
servidor e navegador produzam **exatamente** os mesmos bytes.

## Formatos

**JSON canônico** (`packages/shared/src/canonicalJson.ts`, usado por API e web): chaves em ordem
lexicográfica, sem espaços, strings UTF-8, inteiros sem notação científica, sem `undefined`;
`null` explícito. Datas como string ISO-8601 UTC com milissegundos.

**Gênese:**

```json
{"externalId":"27992","imageSha256":"…","lotId":"…","minIncrementCents":10000,
 "originalEndsAt":"…","sellerPseudonym":"Leiloeiro 3KD9QA","startingPriceCents":100000,
 "startsAt":"…","title":"…"}
```

`genesisHash = hex(SHA-256(canonical(genesis)))`.

**Elo:**

```json
{"amountCents":135000,"bidderPseudonym":"Licitante 7KQ2PX","createdAt":"…","lotId":"…",
 "payload":{…},"prevHash":"…","seq":3,"type":"BID"}
```

`hash = hex(SHA-256(canonical(elo)))`; `signature = base64url(Ed25519.sign(privateKey, bytes(hash)))`.
Em `CLOSED`/`CANCELLED`, `amountCents` e `bidderPseudonym` são `null`.

**Pseudônimo:** `prefix + " " + base32(HMAC-SHA256(PSEUDONYM_SECRET, userId + ":" + lotId))[0..6]`,
com `prefix` = `Licitante` ou `Leiloeiro`.

## API

| Método | Rota | Auth | Sucesso |
|---|---|---|---|
| GET | `/api/audit/public-key` | — | 200 `{ algorithm: "Ed25519", publicKey: "<base64url raw 32 bytes>" }` |
| GET | `/api/lots/:id/audit` | — | 200 `AuditReport` (funciona para qualquer estado, inclusive cancelado) |

```ts
AuditReport = {
  lot: { id, title, state, genesis: {…}, genesisHash, bidCount, chainLength, headHash },
  entries: { seq, type, bidderPseudonym, amountCents, createdAt, payload, prevHash, hash, signature }[],
  receipt: { code, finalHash, signature, amountCents, winnerPseudonym, issuedAt, revokedAt } | null,
  verdict: { status: 'INTACT' | 'TAMPERED',
             checks: { id: 'SEQUENCE' | 'LINKS' | 'HASHES' | 'SIGNATURES' | 'HEAD' | 'RECEIPT' | 'RULES',
                       ok: boolean, failedAtSeq?: number, detail?: string }[] },
  publicKey, serverTime
}
```

## Verificador (`packages/shared/src/auditVerify.ts`)

Função pura `verifyChain(report, publicKey, crypto)` usada no servidor (Node `crypto`) e no
navegador (WebCrypto / `@noble/ed25519`). Ordem das checagens = tabela de
`docs/03-arquitetura.md` §5. Retorna o `verdict`.

`RULES` reexecuta sobre o histórico: cada `BID` dentro de `[startsAt, endsAt vigente]`,
primeiro ≥ inicial, demais ≥ anterior + incremento, sem dois `BID` seguidos do mesmo pseudônimo.

## Casos de teste (adulteração via SQL direto — todos devem resultar em `TAMPERED`)

| ID | Adulteração | Check que acusa |
|---|---|---|
| CT-08-01 | Cadeia intacta (controle) | — (`INTACT`) |
| CT-08-02 | `UPDATE lot_entries SET amount_cents = …` | `HASHES` |
| CT-08-03 | `UPDATE` do valor **e** recálculo do hash e dos `prev_hash` seguintes (sem a chave) | `SIGNATURES` |
| CT-08-04 | `DELETE` de um elo do meio | `SEQUENCE` / `LINKS` |
| CT-08-05 | `INSERT` de elo forjado no meio (renumerando `seq`) | `LINKS` / `SIGNATURES` |
| CT-08-06 | `DELETE` do último elo de lote liquidado + ajuste de `head_hash` | `RECEIPT` |
| CT-08-07 | `DELETE` do último elo sem ajustar o lote | `HEAD` |
| CT-08-08 | `UPDATE lots SET starting_price_cents = …` | `LINKS` (gênese) |
| CT-08-09 | Trocar `bidder_pseudonym` de um elo | `HASHES` |
| CT-08-10 | Mesmo resultado do verificador no Node e no navegador (fixture compartilhada) | idênticos |
| CT-08-11 | `AuditReport` e `Receipt` sem campos `name`, `email`, `userId`, `bidderId` | ok |
| CT-08-12 | Pseudônimo do mesmo usuário em 2 lotes | diferentes |

Para os testes de adulteração, o trigger append-only é desabilitado na sessão de teste
(`ALTER TABLE … DISABLE TRIGGER`), simulando um invasor com acesso ao banco.
