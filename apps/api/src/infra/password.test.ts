import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('gera hash argon2id que não contém a senha e confere corretamente (CT-01-09)', async () => {
    const hash = await hashPassword('senha-forte');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('senha-forte');
    expect(await verifyPassword(hash, 'senha-forte')).toBe(true);
    expect(await verifyPassword(hash, 'senha-errada')).toBe(false);
  });

  it('hash malformado é tratado como senha inválida', async () => {
    expect(await verifyPassword('nao-e-hash', 'qualquer')).toBe(false);
  });
});
