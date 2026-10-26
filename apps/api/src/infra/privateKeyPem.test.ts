import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseEd25519PrivateKey } from './privateKeyPem';

const pem = generateKeyPairSync('ed25519')
  .privateKey.export({ format: 'pem', type: 'pkcs8' })
  .toString();
const body = pem.split('\n')[1]!;

describe('parseEd25519PrivateKey', () => {
  it('aceita o PEM com quebras de linha reais', () => {
    expect(parseEd25519PrivateKey(pem).asymmetricKeyType).toBe('ed25519');
  });

  it('aceita o PEM colado numa linha só, com espaços no lugar das quebras', () => {
    const oneLine = `-----BEGIN PRIVATE KEY----- ${body} -----END PRIVATE KEY-----`;
    expect(parseEd25519PrivateKey(oneLine).asymmetricKeyType).toBe('ed25519');
  });

  it('aceita o PEM com \\n literal e CRLF', () => {
    const literal = pem.trim().replace(/\n/g, '\\n');
    expect(literal).not.toContain('\n');
    expect(parseEd25519PrivateKey(literal).type).toBe('private');
    expect(parseEd25519PrivateKey(pem.replace(/\n/g, '\r\n')).type).toBe('private');
  });

  it('recusa valor que não é chave privada Ed25519', () => {
    expect(() => parseEd25519PrivateKey('não é chave')).toThrow();
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })
      .privateKey.export({ format: 'pem', type: 'pkcs8' })
      .toString();
    expect(() => parseEd25519PrivateKey(rsa)).toThrow();
  });
});
