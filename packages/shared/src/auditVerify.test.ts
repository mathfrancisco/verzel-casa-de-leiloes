import { describe, expect, it } from 'vitest';
import {
  createAuditEntry,
  bytesToBase64url,
  hashGenesis,
  receiptSignatureBytes,
  type AuditCrypto,
  type AuditReport,
  type Signer,
  verifyChain,
} from './auditVerify';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// A deterministic test double keeps these tests independent from a Node-only crypto API.
const crypto: AuditCrypto = {
  async sha256(bytes) {
    return encoder.encode(`hash:${decoder.decode(bytes)}`);
  },
  async verify(_publicKey, signature, message) {
    return decoder.decode(signature) === `signature:${decoder.decode(message)}`;
  },
};

const signer: Signer = {
  async sign(message) {
    return encoder.encode(`signature:${decoder.decode(message)}`);
  },
};

const PUBLIC_KEY = encoder.encode('test-public-key');
const ISO_START = '2026-10-24T18:00:00.000Z';
const ISO_END = '2026-10-24T19:00:00.000Z';

async function intactReport(): Promise<AuditReport> {
  const genesis = {
    lotId: '0192f3a0-0000-7000-8000-000000000001',
    externalId: '16568',
    imageSha256: 'a'.repeat(64),
    title: 'Lírios d’água',
    description: 'Pintura impressionista.',
    category: 'PAINTING' as const,
    itemSnapshot: {
      externalId: '16568',
      title: 'Lírios d’água',
      artist: 'Claude Monet',
      date: '1906',
      medium: 'Óleo sobre tela',
      dimensions: '89 × 100 cm',
      origin: 'França',
      imageUrl: 'https://example.invalid/16568.jpg',
      sourceUrl: 'https://example.invalid/16568',
      suggestedCategory: 'PAINTING' as const,
    },
    sellerPseudonym: 'Leiloeiro ABCDEF',
    startingPriceCents: 100_000,
    minIncrementCents: 10_000,
    startsAt: ISO_START,
    originalEndsAt: ISO_END,
  };
  const canonicalGenesisHash = await hashGenesis(genesis, crypto);
  const first = await createAuditEntry(
    {
      lotId: genesis.lotId,
      seq: 1,
      type: 'BID',
      bidderPseudonym: 'Licitante AAAAAA',
      amountCents: 100_000,
      createdAt: '2026-10-24T18:10:00.000Z',
      payload: {},
      prevHash: canonicalGenesisHash,
    },
    signer,
    crypto,
  );
  const second = await createAuditEntry(
    {
      lotId: genesis.lotId,
      seq: 2,
      type: 'BID',
      bidderPseudonym: 'Licitante BBBBBB',
      amountCents: 110_000,
      createdAt: '2026-10-24T18:58:30.000Z',
      payload: { endsAtAfter: '2026-10-24T19:00:30.000Z' },
      prevHash: first.hash,
    },
    signer,
    crypto,
  );
  const closed = await createAuditEntry(
    {
      lotId: genesis.lotId,
      seq: 3,
      type: 'CLOSED',
      bidderPseudonym: null,
      amountCents: null,
      createdAt: '2026-10-24T19:00:31.000Z',
      payload: { winnerPseudonym: second.bidderPseudonym, amountCents: second.amountCents },
      prevHash: second.hash,
    },
    signer,
    crypto,
  );
  const receiptSignature = await signer.sign(
    receiptSignatureBytes({
      lotId: genesis.lotId,
      finalHash: closed.hash,
      amountCents: second.amountCents!,
      winnerPseudonym: second.bidderPseudonym!,
      issuedAt: closed.createdAt,
    }),
  );
  return {
    lot: {
      id: genesis.lotId,
      title: genesis.title,
      state: 'SETTLED',
      genesis,
      genesisHash: canonicalGenesisHash,
      bidCount: 2,
      chainLength: 3,
      headHash: closed.hash,
    },
    entries: [first, second, closed],
    receipt: {
      code: 'receipt-code',
      finalHash: closed.hash,
      signature: bytesToBase64url(receiptSignature),
      amountCents: second.amountCents!,
      winnerPseudonym: second.bidderPseudonym!,
      issuedAt: closed.createdAt,
      revokedAt: null,
    },
  };
}

describe('verifyChain (SP-08)', () => {
  it('CT-08-01: aprova uma cadeia íntegra', async () => {
    expect((await verifyChain(await intactReport(), PUBLIC_KEY, crypto)).status).toBe('INTACT');
  });

  it.each([
    ['CT-08-02', 'HASHES', (report: AuditReport) => (report.entries[0]!.amountCents = 100_001)],
    ['CT-08-03', 'SIGNATURES', (report: AuditReport) => (report.entries[0]!.hash = 'b'.repeat(64))],
    ['CT-08-04', 'SEQUENCE', (report: AuditReport) => report.entries.splice(1, 1)],
    ['CT-08-05', 'LINKS', (report: AuditReport) => (report.entries[1]!.prevHash = 'c'.repeat(64))],
    ['CT-08-06', 'RECEIPT', (report: AuditReport) => (report.receipt!.finalHash = 'd'.repeat(64))],
    ['CT-08-07', 'HEAD', (report: AuditReport) => (report.lot.headHash = 'e'.repeat(64))],
    [
      'CT-08-08',
      'LINKS',
      (report: AuditReport) => (report.lot.genesis.startingPriceCents = 100_001),
    ],
    [
      'CT-08-09',
      'HASHES',
      (report: AuditReport) => (report.entries[0]!.bidderPseudonym = 'Licitante XXXXXX'),
    ],
    ['RULES', 'RULES', (report: AuditReport) => (report.entries[1]!.amountCents = 105_000)],
  ])('%s acusa %s', async (_caseId, failedCheck, tamper) => {
    const report = await intactReport();
    tamper(report);
    const verdict = await verifyChain(report, PUBLIC_KEY, crypto);
    expect(verdict.status).toBe('TAMPERED');
    expect(verdict.checks.find((check) => check.id === failedCheck)?.ok).toBe(false);
  });

  it('CT-08-06: exige recibo mesmo depois de CANCELLED', async () => {
    const report = await intactReport();
    const closed = report.entries.at(-1)!;
    const cancelled = await createAuditEntry(
      {
        lotId: report.lot.id,
        seq: 4,
        type: 'CANCELLED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: '2026-10-24T19:01:00.000Z',
        payload: {},
        prevHash: closed.hash,
      },
      signer,
      crypto,
    );
    report.entries.push(cancelled);
    report.lot.state = 'CANCELLED';
    report.lot.chainLength = 4;
    report.lot.headHash = cancelled.hash;
    report.receipt!.revokedAt = cancelled.createdAt;
    expect((await verifyChain(report, PUBLIC_KEY, crypto)).status).toBe('INTACT');
    report.receipt = null;
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RECEIPT')
        ?.ok,
    ).toBe(false);
  });

  it('detecta adulteração de issuedAt no recibo', async () => {
    const report = await intactReport();
    report.receipt!.issuedAt = '2026-10-24T19:01:00.000Z';
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RECEIPT')
        ?.ok,
    ).toBe(false);
  });

  it.each([
    ['revogação nula após cancelamento', null],
    ['revogação arbitrária após cancelamento', '2026-10-24T19:02:00.000Z'],
  ])('rejeita %s', async (_name, revokedAt) => {
    const report = await intactReport();
    const closed = report.entries.at(-1)!;
    const cancelled = await createAuditEntry(
      {
        lotId: report.lot.id,
        seq: 4,
        type: 'CANCELLED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: '2026-10-24T19:01:00.000Z',
        payload: {},
        prevHash: closed.hash,
      },
      signer,
      crypto,
    );
    report.entries.push(cancelled);
    report.lot.state = 'CANCELLED';
    report.lot.chainLength = 4;
    report.lot.headHash = cancelled.hash;
    report.receipt!.revokedAt = revokedAt;
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RECEIPT')
        ?.ok,
    ).toBe(false);
  });

  it('rejeita recibo revogado sem CANCELLED', async () => {
    const report = await intactReport();
    report.receipt!.revokedAt = '2026-10-24T19:01:00.000Z';
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RECEIPT')
        ?.ok,
    ).toBe(false);
  });

  it('rejeita CANCELLED depois de CLOSED UNSOLD e estado adulterado', async () => {
    const report = await intactReport();
    report.entries = report.entries.slice(0, 2);
    const closed = await createAuditEntry(
      {
        lotId: report.lot.id,
        seq: 3,
        type: 'CLOSED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: '2026-10-24T19:00:31.000Z',
        payload: { result: 'UNSOLD' },
        prevHash: report.entries[1]!.hash,
      },
      signer,
      crypto,
    );
    const cancelled = await createAuditEntry(
      {
        lotId: report.lot.id,
        seq: 4,
        type: 'CANCELLED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: '2026-10-24T19:01:00.000Z',
        payload: {},
        prevHash: closed.hash,
      },
      signer,
      crypto,
    );
    report.entries.push(closed, cancelled);
    report.lot.state = 'CANCELLED';
    report.lot.chainLength = 4;
    report.lot.headHash = cancelled.hash;
    report.receipt = null;
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RULES')
        ?.ok,
    ).toBe(false);
    const stateReport = await intactReport();
    stateReport.lot.state = 'ACTIVE';
    expect(
      (await verifyChain(stateReport, PUBLIC_KEY, crypto)).checks.find(
        (check) => check.id === 'RULES',
      )?.ok,
    ).toBe(false);
  });

  it.each(['BID', 'CLOSED'] as const)('rejeita %s depois de CLOSED', async (type) => {
    const report = await intactReport();
    const prior = report.entries.at(-1)!;
    const entry = await createAuditEntry(
      {
        lotId: report.lot.id,
        seq: 4,
        type,
        bidderPseudonym: type === 'BID' ? 'Licitante CCCCCC' : null,
        amountCents: type === 'BID' ? 120_000 : null,
        createdAt: '2026-10-24T19:01:00.000Z',
        payload: {},
        prevHash: prior.hash,
      },
      signer,
      crypto,
    );
    report.entries.push(entry);
    report.lot.chainLength = 4;
    report.lot.headHash = entry.hash;
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RULES')
        ?.ok,
    ).toBe(false);
  });

  it('aceita cadeia vazia cuja cabeça é a gênese', async () => {
    const report = await intactReport();
    report.entries = [];
    report.receipt = null;
    report.lot.state = 'ACTIVE';
    report.lot.bidCount = 0;
    report.lot.chainLength = 0;
    report.lot.headHash = report.lot.genesisHash;
    expect((await verifyChain(report, PUBLIC_KEY, crypto)).status).toBe('INTACT');
  });

  it.each([
    ['recusa lance no fim exato', '2026-10-24T19:00:00.000Z', {}],
    ['recusa auto-cobertura', '2026-10-24T18:20:00.000Z', {}],
    ['recusa extensão ausente', '2026-10-24T18:58:30.000Z', {}],
  ])('%s', async (_name, createdAt, payload) => {
    const report = await intactReport();
    const entry = report.entries[1]!;
    entry.createdAt = createdAt;
    entry.payload = payload;
    if (_name === 'recusa auto-cobertura')
      entry.bidderPseudonym = report.entries[0]!.bidderPseudonym;
    expect(
      (await verifyChain(report, PUBLIC_KEY, crypto)).checks.find((check) => check.id === 'RULES')
        ?.ok,
    ).toBe(false);
  });
});
