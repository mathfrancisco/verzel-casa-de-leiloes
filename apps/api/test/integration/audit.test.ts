import { idemKey } from '../support/idempotency';
import {
  base64urlToBytes,
  BrowserAuditCrypto,
  bytesToBase64url,
  createAuditEntry,
  hashEntry,
  receiptSignatureBytes,
  type AuditReport,
  type AuditReportResponse,
  verifyChain,
} from '@leilao/shared';
import { randomUUID } from 'node:crypto';
import { NodeAuditCrypto } from '../../src/infra/auditCrypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeCatalog } from '../../src/infra/catalog/fake-catalog';
import {
  buildTestApp,
  sessionCookie,
  TEST_AUDIT_PUBLIC_KEY,
  TEST_AUDIT_SIGNER,
} from '../support/app';
import { createTestDatabase } from '../support/database';

let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
let app: ReturnType<typeof buildTestApp>;
let sequence = 0;

beforeAll(async () => {
  testDb = await createTestDatabase();
  app = buildTestApp(testDb, {}, { catalog: new FakeCatalog() });
});

afterAll(async () => {
  await app.close();
  await testDb.drop();
});

async function createLot() {
  const account = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Leiloeiro da auditoria',
      email: `audit-auctioneer-${++sequence}@example.test`,
      password: 'senha-forte',
      role: 'AUCTIONEER',
    },
  });
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: sessionCookie(account),
    payload: {
      externalId: '1001',
      title: 'Lote auditável',
      description: 'Sem dados pessoais.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() + 3_600_000).toISOString(),
      endsAt: new Date(Date.now() + 25 * 3_600_000).toISOString(),
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ id: string }>();
}

async function createBid() {
  const bidder = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Licitante da auditoria',
      email: `audit-bidder-${++sequence}@example.test`,
      password: 'senha-forte',
      role: 'BIDDER',
    },
  });
  const cookie = sessionCookie(bidder);
  await app.inject({
    method: 'POST',
    url: '/api/wallet/deposits',
    cookies: cookie,
    headers: { 'idempotency-key': idemKey(`audit-deposit-${sequence}`) },
    payload: { amountCents: 5_000 },
  });
  const seller = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Leiloeiro da auditoria',
      email: `audit-seller-${++sequence}@example.test`,
      password: 'senha-forte',
      role: 'AUCTIONEER',
    },
  });
  const lot = await app.inject({
    method: 'POST',
    url: '/api/lots',
    cookies: sessionCookie(seller),
    payload: {
      externalId: '1001',
      title: 'Lote com lance',
      description: 'Auditoria.',
      category: 'PAINTING',
      startingPriceCents: 1_000,
      minIncrementCents: 100,
      startsAt: new Date(Date.now() - 15_000).toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  expect(lot.statusCode).toBe(201);
  const id = lot.json<{ id: string }>().id;
  const bid = await app.inject({
    method: 'POST',
    url: `/api/lots/${id}/bids`,
    cookies: cookie,
    headers: { 'idempotency-key': idemKey(`audit-bid-${sequence}`) },
    payload: { amountCents: 1_000 },
  });
  expect(bid.statusCode).toBe(201);
  return id;
}

async function appendLegitimateEntry(id: string, type: 'BID' | 'CLOSED' = 'CLOSED') {
  const report = (
    await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })
  ).json<AuditReport>();
  const previous = report.entries.at(-1);
  const seq = report.entries.length + 1;
  const createdAt = new Date().toISOString();
  const entry = await createAuditEntry(
    {
      lotId: id,
      seq,
      type,
      bidderPseudonym: type === 'BID' ? 'PSEUDONIMO-02' : (previous?.bidderPseudonym ?? null),
      amountCents: type === 'BID' ? 1_100 : (previous?.amountCents ?? null),
      createdAt,
      payload:
        type === 'BID'
          ? { amountCents: 1_100 }
          : {
              winnerPseudonym: previous?.bidderPseudonym ?? '',
              amountCents: previous?.amountCents ?? 0,
            },
      prevHash: previous?.hash ?? report.lot.genesisHash,
    },
    TEST_AUDIT_SIGNER,
    new NodeAuditCrypto(),
  );
  await testDb.sql`INSERT INTO lot_entries (lot_id, seq, type, bidder_pseudonym, amount_cents, payload, created_at, prev_hash, hash, signature) VALUES (${id}, ${entry.seq}, ${entry.type}, ${entry.bidderPseudonym}, ${entry.amountCents}, ${JSON.stringify(entry.payload)}::jsonb, ${entry.createdAt}, ${entry.prevHash}, ${entry.hash}, ${entry.signature})`;
  await testDb.sql`UPDATE lots SET chain_length = ${seq}, head_hash = ${entry.hash} WHERE id = ${id}`;
  return entry;
}

async function createSettledFixture() {
  const id = await createBid();
  const closed = await appendLegitimateEntry(id, 'CLOSED');
  const issuedAt = new Date().toISOString();
  const signature = bytesToBase64url(
    await TEST_AUDIT_SIGNER.sign(
      receiptSignatureBytes({
        lotId: id,
        finalHash: closed.hash,
        amountCents: closed.amountCents!,
        winnerPseudonym: closed.bidderPseudonym!,
        issuedAt,
      }),
    ),
  );
  await testDb.sql`UPDATE lots SET state = 'SETTLED' WHERE id = ${id}`;
  await testDb.sql`INSERT INTO receipts (id, lot_id, public_code, winner_id, winner_pseudonym, amount_cents, final_hash, signature, issued_at) SELECT ${randomUUID()}, ${id}, ${`REC-${randomUUID()}`}, bidder_id, ${closed.bidderPseudonym}, ${closed.amountCents}, ${closed.hash}, ${signature}, ${issuedAt} FROM lot_entries WHERE lot_id = ${id} AND seq = 1`;
  return { id, closed };
}

describe('auditoria pública (SP-08)', () => {
  it('expõe a chave Ed25519 bruta e o relatório íntegro sem PII (CT-08-01, CT-08-11)', async () => {
    const lot = await createLot();
    const key = await app.inject({ method: 'GET', url: '/api/audit/public-key' });
    expect(key.statusCode).toBe(200);
    expect(key.json()).toEqual({ algorithm: 'Ed25519', publicKey: expect.any(String) });
    expect(base64urlToBytes(key.json<{ publicKey: string }>().publicKey)).toEqual(
      TEST_AUDIT_PUBLIC_KEY,
    );

    const response = await app.inject({ method: 'GET', url: `/api/lots/${lot.id}/audit` });
    expect(response.statusCode).toBe(200);
    const report = response.json<
      AuditReport & { verdict: { status: string }; publicKey: string; serverTime: string }
    >();
    expect(report.verdict.status).toBe('INTACT');
    expect(report.publicKey).toBe(key.json<{ publicKey: string }>().publicKey);
    expect(report.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.stringify(report)).not.toMatch(/"(?:name|email|userId|bidderId)"/);
  });

  it('responde 404 para lote inexistente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/lots/00000000-0000-0000-0000-000000000000/audit',
    });
    expect(response.statusCode).toBe(404);
  });

  it('responde 404 para identificador de lote inválido', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/lots/not-a-uuid/audit' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'LOT_NOT_FOUND' } });
  });

  it('detecta alteração direta de valor e restaura o gatilho append-only (CT-08-02)', async () => {
    const id = await createBid();
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`UPDATE lot_entries SET amount_cents = 1_100 WHERE lot_id = ${id} AND seq = 1`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const response = await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` });
    expect(response.statusCode).toBe(200);
    const report = response.json<
      AuditReport & {
        verdict: { status: string; checks: { id: string; ok: boolean; failedAtSeq?: number }[] };
      }
    >();
    expect(report.verdict.status).toBe('TAMPERED');
    expect(report.verdict.checks).toContainEqual(
      expect.objectContaining({ id: 'HASHES', ok: false, failedAtSeq: 1 }),
    );
  });

  it('detecta uma cadeia recalculada sem a chave privada (CT-08-03)', async () => {
    const id = await createBid();
    await appendLegitimateEntry(id);
    const original = (
      await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })
    ).json<AuditReport>();
    const first = original.entries[0]!;
    const second = original.entries[1]!;
    const firstHash = await hashEntry(
      {
        lotId: id,
        seq: first.seq,
        type: first.type,
        bidderPseudonym: first.bidderPseudonym,
        amountCents: 1_100,
        createdAt: first.createdAt,
        payload: first.payload,
        prevHash: first.prevHash,
      },
      new NodeAuditCrypto(),
    );
    const secondHash = await hashEntry(
      {
        lotId: id,
        seq: second.seq,
        type: second.type,
        bidderPseudonym: second.bidderPseudonym,
        amountCents: second.amountCents,
        createdAt: second.createdAt,
        payload: second.payload,
        prevHash: firstHash,
      },
      new NodeAuditCrypto(),
    );
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`UPDATE lot_entries SET amount_cents = 1_100, hash = ${firstHash} WHERE lot_id = ${id} AND seq = 1`;
      await testDb.sql`UPDATE lot_entries SET prev_hash = ${firstHash}, hash = ${secondHash} WHERE lot_id = ${id} AND seq = 2`;
      await testDb.sql`UPDATE lots SET head_hash = ${secondHash} WHERE id = ${id}`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const response = await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` });
    const checks = response.json<{ verdict: { checks: { id: string; ok: boolean }[] } }>().verdict
      .checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'HASHES', ok: true }));
    expect(checks).toContainEqual(expect.objectContaining({ id: 'SIGNATURES', ok: false }));
  });

  it('detecta renumeração adulterada (CT-08-04)', async () => {
    const id = await createBid();
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`UPDATE lot_entries SET seq = 2 WHERE lot_id = ${id}`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const response = await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` });
    const verdict = response.json<{
      verdict: { status: string; checks: { id: string; ok: boolean }[] };
    }>().verdict;
    expect(verdict.status).toBe('TAMPERED');
    expect(verdict.checks).toContainEqual(expect.objectContaining({ id: 'SEQUENCE', ok: false }));
  });

  it('detecta alteração dos termos da gênese (CT-08-08)', async () => {
    const id = await createBid();
    await testDb.sql`UPDATE lots SET starting_price_cents = 1_001 WHERE id = ${id}`;
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'LINKS', ok: false }));
  });

  it('detecta pseudônimo alterado (CT-08-09)', async () => {
    const id = await createBid();
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`UPDATE lot_entries SET bidder_pseudonym = 'FORJADO' WHERE lot_id = ${id}`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'HASHES', ok: false }));
  });

  it('detecta remoção de elo intermediário pela sequência (CT-08-04)', async () => {
    const id = await createBid();
    await appendLegitimateEntry(id);
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`DELETE FROM lot_entries WHERE lot_id = ${id} AND seq = 1`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'SEQUENCE', ok: false }));
    expect(checks).toContainEqual(expect.objectContaining({ id: 'LINKS', ok: false }));
  });

  it('detecta elo forjado com hash válido e assinatura antiga (CT-08-05)', async () => {
    const id = await createBid();
    await appendLegitimateEntry(id);
    const report = (
      await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })
    ).json<AuditReport>();
    const first = report.entries[0]!;
    const entry = report.entries[1]!;
    const forgedPrevHash = 'f'.repeat(64);
    const forgedAt = new Date().toISOString();
    const forged = await createAuditEntry(
      {
        lotId: id,
        seq: 2,
        type: 'BID',
        bidderPseudonym: 'PSEUDONIMO-FORJADO',
        amountCents: 1_100,
        createdAt: forgedAt,
        payload: { amountCents: 1_100 },
        prevHash: forgedPrevHash,
      },
      TEST_AUDIT_SIGNER,
      new NodeAuditCrypto(),
    );
    const renumberedHash = await hashEntry(
      {
        lotId: id,
        seq: 3,
        type: entry.type,
        bidderPseudonym: entry.bidderPseudonym,
        amountCents: entry.amountCents,
        createdAt: entry.createdAt,
        payload: entry.payload,
        prevHash: forged.hash,
      },
      new NodeAuditCrypto(),
    );
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`UPDATE lot_entries SET seq = 3, prev_hash = ${forged.hash}, hash = ${renumberedHash} WHERE lot_id = ${id} AND seq = 2`;
      await testDb.sql`INSERT INTO lot_entries (lot_id, seq, type, bidder_id, bidder_pseudonym, amount_cents, payload, created_at, prev_hash, hash, signature) VALUES (${id}, 2, ${forged.type}, (SELECT bidder_id FROM lot_entries WHERE lot_id = ${id} AND seq = 1), ${forged.bidderPseudonym}, ${forged.amountCents}, ${JSON.stringify(forged.payload)}::jsonb, ${forged.createdAt}, ${forged.prevHash}, ${forged.hash}, ${first.signature})`;
      await testDb.sql`UPDATE lots SET chain_length = 3, head_hash = ${renumberedHash} WHERE id = ${id}`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'LINKS', ok: false }));
    expect(checks).toContainEqual(expect.objectContaining({ id: 'SIGNATURES', ok: false }));
  });

  it('detecta cauda liquidada removida mesmo com cabeça ajustada (CT-08-06)', async () => {
    const { id } = await createSettledFixture();
    const report = (
      await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })
    ).json<AuditReport>();
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`DELETE FROM lot_entries WHERE lot_id = ${id} AND seq = 2`;
      await testDb.sql`UPDATE lots SET chain_length = 1, head_hash = ${report.entries[0]!.hash} WHERE id = ${id}`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'HEAD', ok: true }));
    expect(checks).toContainEqual(expect.objectContaining({ id: 'RECEIPT', ok: false }));
  });

  it('detecta remoção de cauda sem ajustar a cabeça (CT-08-07)', async () => {
    const id = await createBid();
    await appendLegitimateEntry(id);
    await testDb.sql.unsafe('ALTER TABLE lot_entries DISABLE TRIGGER USER');
    try {
      await testDb.sql`DELETE FROM lot_entries WHERE lot_id = ${id} AND seq = 2`;
    } finally {
      await testDb.sql.unsafe('ALTER TABLE lot_entries ENABLE TRIGGER USER');
    }
    const checks = (await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })).json<{
      verdict: { checks: { id: string; ok: boolean }[] };
    }>().verdict.checks;
    expect(checks).toContainEqual(expect.objectContaining({ id: 'HEAD', ok: false }));
  });

  it('mantém o veredito paritário entre Node e WebCrypto para relatório real (CT-08-10)', async () => {
    const id = await createBid();
    const report = (
      await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` })
    ).json<AuditReportResponse>();
    const publicKey = base64urlToBytes(report.publicKey);
    const nodeVerdict = await verifyChain(report, publicKey, new NodeAuditCrypto());
    const browserVerdict = await verifyChain(report, publicKey, new BrowserAuditCrypto());

    expect(browserVerdict).toEqual(nodeVerdict);
    expect(browserVerdict).toEqual(report.verdict);
  });

  it('não expõe PII quando o relatório contém elos e recibo (CT-08-11)', async () => {
    const { id } = await createSettledFixture();
    const response = await app.inject({ method: 'GET', url: `/api/lots/${id}/audit` });
    expect(response.statusCode).toBe(200);
    const report = response.json<AuditReportResponse>();
    expect(report.entries).not.toHaveLength(0);
    expect(report.receipt).not.toBeNull();
    expect(JSON.stringify(report)).not.toMatch(
      /"(?:name|email|userId|bidderId|winnerId|sellerId)"/,
    );
  });
});
