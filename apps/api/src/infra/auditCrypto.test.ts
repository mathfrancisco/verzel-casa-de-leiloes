// @vitest-environment happy-dom
import { generateKeyPairSync, webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BrowserAuditCrypto,
  createAuditEntry,
  hashGenesis,
  receiptSignatureBytes,
  type AuditReport,
  verifyChain,
} from '@leilao/shared';
import { Ed25519Signer, NodeAuditCrypto } from './auditCrypto';

const genesis = {
  lotId: '0192f3a0-0000-7000-8000-000000000001',
  externalId: '1',
  imageSha256: 'a'.repeat(64),
  title: 'Obra',
  description: 'Descrição',
  category: 'PAINTING' as const,
  itemSnapshot: {
    externalId: '1',
    title: 'Obra',
    artist: null,
    date: null,
    medium: null,
    dimensions: null,
    origin: null,
    imageUrl: 'https://example.invalid/image',
    sourceUrl: 'https://example.invalid/item',
    suggestedCategory: 'PAINTING' as const,
  },
  sellerPseudonym: 'Leiloeiro ABCDEF',
  startingPriceCents: 100,
  minIncrementCents: 10,
  startsAt: '2026-10-24T18:00:00.000Z',
  originalEndsAt: '2026-10-24T19:00:00.000Z',
};

describe('adaptadores Ed25519 (CT-08-10)', () => {
  it('produz o mesmo veredito em Node e happy-dom com WebCrypto e fallback noble', async () => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const rawPublicKey = Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url');
    const nodeCrypto = new NodeAuditCrypto();
    const signer = new Ed25519Signer(privateKey);
    const genesisHash = await hashGenesis(genesis, nodeCrypto);
    const bid = await createAuditEntry(
      {
        lotId: genesis.lotId,
        seq: 1,
        type: 'BID',
        bidderPseudonym: 'Licitante AAAAAA',
        amountCents: 100,
        createdAt: '2026-10-24T18:10:00.000Z',
        payload: {},
        prevHash: genesisHash,
      },
      signer,
      nodeCrypto,
    );
    const closed = await createAuditEntry(
      {
        lotId: genesis.lotId,
        seq: 2,
        type: 'CLOSED',
        bidderPseudonym: null,
        amountCents: null,
        createdAt: '2026-10-24T19:00:00.000Z',
        payload: { winnerPseudonym: bid.bidderPseudonym!, amountCents: bid.amountCents! },
        prevHash: bid.hash,
      },
      signer,
      nodeCrypto,
    );
    const issuedAt = '2026-10-24T19:00:01.000Z';
    const receipt = {
      code: 'receipt-code',
      finalHash: closed.hash,
      signature: Buffer.from(
        await signer.sign(
          receiptSignatureBytes({
            lotId: genesis.lotId,
            finalHash: closed.hash,
            amountCents: bid.amountCents!,
            winnerPseudonym: bid.bidderPseudonym!,
            issuedAt,
          }),
        ),
      ).toString('base64url'),
      amountCents: bid.amountCents!,
      winnerPseudonym: bid.bidderPseudonym!,
      issuedAt,
      revokedAt: null,
    };
    const report: AuditReport = {
      lot: {
        id: genesis.lotId,
        title: genesis.title,
        state: 'SETTLED',
        genesis,
        genesisHash,
        bidCount: 1,
        chainLength: 2,
        headHash: closed.hash,
      },
      entries: [bid, closed],
      receipt,
    };
    const defaultBrowserVerdict = await verifyChain(report, rawPublicKey, new BrowserAuditCrypto());
    const nobleBrowserVerdict = await verifyChain(
      report,
      rawPublicKey,
      new BrowserAuditCrypto(undefined, true),
    );
    await expect(verifyChain(report, rawPublicKey, nodeCrypto)).resolves.toEqual(
      defaultBrowserVerdict,
    );
    expect(nobleBrowserVerdict).toEqual(defaultBrowserVerdict);
    report.receipt!.issuedAt = '2026-10-24T19:00:02.000Z';
    expect(await verifyChain(report, rawPublicKey, new BrowserAuditCrypto())).toMatchObject({
      status: 'TAMPERED',
    });
  });
});
