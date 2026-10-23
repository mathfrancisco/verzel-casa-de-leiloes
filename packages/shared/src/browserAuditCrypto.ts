import * as nobleEd25519 from '@noble/ed25519';
import type { AuditCrypto } from './auditVerify';

export interface BrowserSubtle {
  digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
  importKey(
    format: 'raw',
    keyData: Uint8Array,
    algorithm: { name: string },
    extractable: boolean,
    usages: string[],
  ): Promise<unknown>;
  verify(
    algorithm: { name: string },
    key: unknown,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean>;
}

/** WebCrypto first; noble keeps Ed25519 verification available in browsers lacking it. */
export class BrowserAuditCrypto implements AuditCrypto {
  constructor(
    private readonly subtle: BrowserSubtle | undefined = (
      globalThis.crypto as { subtle?: BrowserSubtle } | undefined
    )?.subtle,
    private readonly forceNobleVerification = false,
  ) {}

  async sha256(data: Uint8Array): Promise<Uint8Array> {
    if (!this.subtle) throw new Error('WebCrypto SHA-256 indisponível');
    return new Uint8Array(await this.subtle.digest('SHA-256', data));
  }

  async verify(
    publicKey: Uint8Array,
    signature: Uint8Array,
    message: Uint8Array,
  ): Promise<boolean> {
    if (this.subtle && !this.forceNobleVerification) {
      try {
        const key = await this.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, [
          'verify',
        ]);
        return await this.subtle.verify({ name: 'Ed25519' }, key, signature, message);
      } catch {
        // Some browser engines expose WebCrypto without Ed25519; use the audited fallback.
      }
    }
    return nobleEd25519.verifyAsync(signature, message, publicKey);
  }
}
