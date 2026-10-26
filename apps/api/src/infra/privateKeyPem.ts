import { createPrivateKey, type KeyObject } from 'node:crypto';

const PEM = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/;

/**
 * Lê a chave privada Ed25519 da variável de ambiente. Painéis de deploy costumam colar o PEM
 * numa linha só (quebras viram espaços ou `\n` literal); aqui o PEM é remontado antes do parse.
 */
export function parseEd25519PrivateKey(raw: string): KeyObject {
  const text = raw.replace(/\n/g, '\n');
  const match = PEM.exec(text);
  const pem = match
    ? `-----BEGIN ${match[1]}-----\n${match[2]!.replace(/\s+/g, '')}\n-----END ${match[1]}-----\n`
    : text;
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new TypeError('A chave não é Ed25519.');
  return key;
}
