import { createHash, createPublicKey, sign, type KeyObject, verify } from 'node:crypto';
import { bytesToBase64url, type AuditCrypto, type Signer } from '@leilao/shared';

export class Ed25519Signer implements Signer {
  constructor(private readonly privateKey: KeyObject) {
    if (privateKey.type !== 'private' || privateKey.asymmetricKeyType !== 'ed25519') {
      throw new TypeError('Ed25519Signer requer uma chave privada Ed25519.');
    }
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(sign(null, message, this.privateKey));
  }
}

/** Node adapter kept outside shared so the browser bundle has no Node crypto import. */
export class NodeAuditCrypto implements AuditCrypto {
  async sha256(data: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(createHash('sha256').update(data).digest());
  }

  async verify(
    publicKey: Uint8Array,
    signature: Uint8Array,
    message: Uint8Array,
  ): Promise<boolean> {
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: bytesToBase64url(publicKey) },
      format: 'jwk',
    });
    return verify(null, message, key, signature);
  }
}
