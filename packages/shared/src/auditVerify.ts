import { canonicalJson, type CanonicalValue } from './canonicalJson';
import type { CatalogItem, LotCategory } from './catalog';

export type AuditEntryType = 'BID' | 'CLOSED' | 'CANCELLED';

export interface AuditGenesis {
  lotId: string;
  externalId: string;
  imageSha256: string;
  title: string;
  description: string;
  category: LotCategory;
  itemSnapshot: CatalogItem;
  sellerPseudonym: string;
  startingPriceCents: number;
  minIncrementCents: number;
  startsAt: string;
  originalEndsAt: string;
}

export interface AuditEntryInput {
  lotId: string;
  seq: number;
  type: AuditEntryType;
  bidderPseudonym: string | null;
  amountCents: number | null;
  createdAt: string;
  payload: CanonicalValue;
  prevHash: string;
}

export interface AuditEntry extends Omit<AuditEntryInput, 'lotId'> {
  hash: string;
  signature: string;
}

export interface AuditReceipt {
  code: string;
  finalHash: string;
  signature: string;
  amountCents: number;
  winnerPseudonym: string;
  issuedAt: string;
  revokedAt: string | null;
}

export interface ReceiptSignaturePayload {
  lotId: string;
  finalHash: string;
  amountCents: number;
  winnerPseudonym: string;
  issuedAt: string;
}

export interface AuditReport {
  lot: {
    id: string;
    title: string;
    state: string;
    genesis: AuditGenesis;
    genesisHash: string;
    bidCount: number;
    chainLength: number;
    headHash: string;
  };
  entries: AuditEntry[];
  receipt: AuditReceipt | null;
}

/** Public HTTP representation returned by the audit endpoints. */
export interface AuditReportResponse extends AuditReport {
  verdict: AuditVerdict;
  /** Raw 32-byte Ed25519 public key encoded as base64url. */
  publicKey: string;
  serverTime: string;
}

export interface AuditPublicKeyResponse {
  algorithm: 'Ed25519';
  /** Raw 32-byte Ed25519 public key encoded as base64url. */
  publicKey: string;
}

export interface AuditCrypto {
  sha256(data: Uint8Array): Promise<Uint8Array>;
  verify(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): Promise<boolean>;
}

export interface Signer {
  sign(message: Uint8Array): Promise<Uint8Array>;
}

export type AuditCheckId =
  | 'SEQUENCE'
  | 'LINKS'
  | 'HASHES'
  | 'SIGNATURES'
  | 'HEAD'
  | 'RECEIPT'
  | 'RULES';

export interface AuditCheck {
  id: AuditCheckId;
  ok: boolean;
  failedAtSeq?: number;
  detail?: string;
}

export interface AuditVerdict {
  status: 'INTACT' | 'TAMPERED';
  checks: AuditCheck[];
}

const encoder = new TextEncoder();
const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const utf8Bytes = (value: string): Uint8Array => encoder.encode(value);

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Browser- and Node-neutral base64url encoding for raw Ed25519 material. */
export function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    out += base64[a >> 2]!;
    out += base64[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    out += b === undefined ? '=' : base64[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    out += c === undefined ? '=' : base64[c & 63]!;
  }
  return out.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function base64urlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1)
    throw new TypeError('base64url inválido');
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const bytes: number[] = [];
  for (let index = 0; index < padded.length; index += 4) {
    const chars = padded.slice(index, index + 4);
    const values = [...chars].map((char) => (char === '=' ? 0 : base64.indexOf(char)));
    if (values.some((item) => item < 0)) throw new TypeError('base64url inválido');
    const [a, b, c, d] = values as [number, number, number, number];
    bytes.push((a << 2) | (b >> 4));
    if (chars[2] !== '=') bytes.push(((b & 15) << 4) | (c >> 2));
    if (chars[3] !== '=') bytes.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(bytes);
}

export async function hashGenesis(genesis: AuditGenesis, crypto: AuditCrypto): Promise<string> {
  return bytesToHex(await crypto.sha256(utf8Bytes(canonicalJson(genesis))));
}

export async function hashEntry(entry: AuditEntryInput, crypto: AuditCrypto): Promise<string> {
  return bytesToHex(await crypto.sha256(utf8Bytes(canonicalJson(entry))));
}

export function receiptSignatureBytes(payload: ReceiptSignaturePayload): Uint8Array {
  return utf8Bytes(canonicalJson(payload));
}

/** The signature is over UTF-8 bytes of the lowercase hexadecimal hash, per SP-08. */
export async function createAuditEntry(
  input: AuditEntryInput,
  signer: Signer,
  crypto: AuditCrypto,
): Promise<AuditEntry> {
  const hash = await hashEntry(input, crypto);
  const { lotId, ...entry } = input;
  void lotId;
  return { ...entry, hash, signature: bytesToBase64url(await signer.sign(utf8Bytes(hash))) };
}

function failed(id: AuditCheckId, detail: string, failedAtSeq?: number): AuditCheck {
  return { id, ok: false, detail, ...(failedAtSeq === undefined ? {} : { failedAtSeq }) };
}

function validIso(value: string): number | null {
  const time = Date.parse(value);
  return Number.isNaN(time) || new Date(time).toISOString() !== value ? null : time;
}

function isRecord(value: unknown): value is Record<string, CanonicalValue> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

export async function verifyChain(
  report: AuditReport,
  publicKey: Uint8Array,
  crypto: AuditCrypto,
): Promise<AuditVerdict> {
  const entries = report.entries;
  const checks: AuditCheck[] = [];

  const sequence = entries.find((entry, index) => entry.seq !== index + 1);
  checks.push(
    sequence
      ? failed('SEQUENCE', 'Sequência deve ser contínua a partir de 1.', sequence.seq)
      : { id: 'SEQUENCE', ok: true },
  );

  let expectedPrev = report.lot.genesisHash;
  let links: AuditCheck | undefined;
  try {
    if (
      (await hashGenesis(report.lot.genesis, crypto)) !== report.lot.genesisHash ||
      report.lot.genesis.lotId !== report.lot.id
    ) {
      links = failed('LINKS', 'Gênese não corresponde aos termos do lote.');
    } else {
      const mismatch = entries.find((entry) => {
        const valid = entry.prevHash === expectedPrev;
        expectedPrev = entry.hash;
        return !valid;
      });
      if (mismatch)
        links = failed('LINKS', 'prevHash não aponta para o elo anterior.', mismatch.seq);
    }
  } catch {
    links = failed('LINKS', 'Gênese não pode ser recalculada.');
  }
  checks.push(links ?? { id: 'LINKS', ok: true });

  let hashes: AuditCheck | undefined;
  for (const entry of entries) {
    try {
      const { hash, signature, ...input } = entry;
      void signature;
      if ((await hashEntry({ ...input, lotId: report.lot.id }, crypto)) !== hash) {
        hashes = failed('HASHES', 'Hash do elo não confere.', entry.seq);
        break;
      }
    } catch {
      hashes = failed('HASHES', 'Elo não pode ser canonicalizado.', entry.seq);
      break;
    }
  }
  checks.push(hashes ?? { id: 'HASHES', ok: true });

  let signatures: AuditCheck | undefined;
  for (const entry of entries) {
    try {
      if (
        !(await crypto.verify(publicKey, base64urlToBytes(entry.signature), utf8Bytes(entry.hash)))
      ) {
        signatures = failed('SIGNATURES', 'Assinatura do elo inválida.', entry.seq);
        break;
      }
    } catch {
      signatures = failed('SIGNATURES', 'Assinatura do elo inválida.', entry.seq);
      break;
    }
  }
  checks.push(signatures ?? { id: 'SIGNATURES', ok: true });

  const expectedHead = entries.at(-1)?.hash ?? report.lot.genesisHash;
  checks.push(
    report.lot.chainLength !== entries.length ||
      report.lot.bidCount !== entries.filter((entry) => entry.type === 'BID').length ||
      report.lot.headHash !== expectedHead
      ? failed('HEAD', 'Cabeça ou contadores do lote não conferem.')
      : { id: 'HEAD', ok: true },
  );

  let receipt: AuditCheck | undefined;
  const settledClosed = entries.find(
    (entry) =>
      entry.type === 'CLOSED' &&
      isRecord(entry.payload) &&
      typeof entry.payload.winnerPseudonym === 'string' &&
      typeof entry.payload.amountCents === 'number',
  );
  if (report.receipt) {
    try {
      const payload = settledClosed?.payload;
      const cancelledAfterSettlement = settledClosed
        ? entries.find((entry) => entry.seq > settledClosed.seq && entry.type === 'CANCELLED')
        : undefined;
      if (
        !settledClosed ||
        report.receipt.finalHash !== settledClosed.hash ||
        validIso(report.receipt.issuedAt) === null ||
        validIso(settledClosed.createdAt) === null ||
        validIso(report.receipt.issuedAt)! < validIso(settledClosed.createdAt)! ||
        (cancelledAfterSettlement
          ? report.receipt.revokedAt !== cancelledAfterSettlement.createdAt
          : report.receipt.revokedAt !== null) ||
        !isRecord(payload) ||
        payload.winnerPseudonym !== report.receipt.winnerPseudonym ||
        payload.amountCents !== report.receipt.amountCents ||
        !(await crypto.verify(
          publicKey,
          base64urlToBytes(report.receipt.signature),
          receiptSignatureBytes({
            lotId: report.lot.id,
            finalHash: report.receipt.finalHash,
            amountCents: report.receipt.amountCents,
            winnerPseudonym: report.receipt.winnerPseudonym,
            issuedAt: report.receipt.issuedAt,
          }),
        ))
      )
        receipt = failed('RECEIPT', 'Comprovante não corresponde ao encerramento.');
    } catch {
      receipt = failed('RECEIPT', 'Assinatura do comprovante inválida.');
    }
  } else if (settledClosed || report.lot.state === 'SETTLED')
    receipt = failed('RECEIPT', 'Lote liquidado sem comprovante.');
  checks.push(receipt ?? { id: 'RECEIPT', ok: true });

  let rules: AuditCheck | undefined;
  let currentEnd = validIso(report.lot.genesis.originalEndsAt);
  const start = validIso(report.lot.genesis.startsAt);
  let previousBid: AuditEntry | undefined;
  let previousAt: number | undefined;
  let terminal: AuditEntryType | undefined;
  let closedWithWinner = false;
  if (currentEnd === null || start === null || currentEnd <= start)
    rules = failed('RULES', 'Janela original inválida.');
  for (const entry of entries) {
    if (rules) continue;
    const at = validIso(entry.createdAt);
    if (at === null || (previousAt !== undefined && at < previousAt)) {
      rules = failed('RULES', 'Ordem temporal inválida.', entry.seq);
      continue;
    }
    previousAt = at;
    if (entry.type !== 'BID') {
      if (entry.type === 'CLOSED' && !terminal) {
        const payload = isRecord(entry.payload) ? entry.payload : undefined;
        if (
          at < currentEnd! ||
          !payload ||
          (previousBid
            ? payload.winnerPseudonym !== previousBid.bidderPseudonym ||
              payload.amountCents !== previousBid.amountCents
            : payload.result !== 'UNSOLD')
        )
          rules = failed('RULES', 'Encerramento não corresponde ao histórico.', entry.seq);
        else {
          closedWithWinner = Boolean(previousBid);
          terminal = 'CLOSED';
        }
      } else if (
        entry.type === 'CANCELLED' &&
        (!terminal || (terminal === 'CLOSED' && closedWithWinner))
      )
        terminal = 'CANCELLED';
      else rules = failed('RULES', 'Transição terminal inválida.', entry.seq);
      continue;
    }
    if (terminal) {
      rules = failed('RULES', 'Lance após evento terminal.', entry.seq);
      continue;
    }
    const payload = entry.payload;
    if (
      at === null ||
      at < start! ||
      at >= currentEnd! ||
      !entry.bidderPseudonym ||
      !Number.isSafeInteger(entry.amountCents)
    ) {
      rules = failed('RULES', 'Lance fora da janela ou incompleto.', entry.seq);
      continue;
    }
    const minimum = previousBid
      ? previousBid.amountCents! + report.lot.genesis.minIncrementCents
      : report.lot.genesis.startingPriceCents;
    if (
      entry.amountCents! < minimum ||
      previousBid?.bidderPseudonym === entry.bidderPseudonym ||
      !isRecord(payload)
    ) {
      rules = failed('RULES', 'Lance não atende mínimo, líder ou payload.', entry.seq);
      continue;
    }
    const extendsAt = currentEnd! - at <= 120_000;
    const recordedEnd = Object.prototype.hasOwnProperty.call(payload, 'endsAtAfter')
      ? payload.endsAtAfter
      : undefined;
    if (extendsAt) {
      const expected = new Date(at + 120_000).toISOString();
      if (recordedEnd !== expected)
        rules = failed('RULES', 'Extensão anti-sniping inválida.', entry.seq);
      else currentEnd = at + 120_000;
    } else if (recordedEnd !== undefined)
      rules = failed('RULES', 'Extensão fora da janela anti-sniping.', entry.seq);
    previousBid = entry;
  }
  if (!rules) {
    const expectedState =
      !terminal && entries.length === 0 && report.lot.state === 'SCHEDULED'
        ? 'SCHEDULED'
        : terminal === 'CANCELLED'
          ? 'CANCELLED'
          : terminal === 'CLOSED'
            ? closedWithWinner
              ? 'SETTLED'
              : 'CLOSED_NO_WINNER'
            : 'ACTIVE';
    if (report.lot.state !== expectedState)
      rules = failed('RULES', 'Estado do lote não corresponde aos eventos.');
  }
  checks.push(rules ?? { id: 'RULES', ok: true });

  return { status: checks.every((check) => check.ok) ? 'INTACT' : 'TAMPERED', checks };
}
