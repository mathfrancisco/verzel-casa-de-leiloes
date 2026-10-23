import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth';

const valid = {
  name: 'Ana Souza',
  email: 'Ana@Demo.com ',
  password: 'senha-forte',
  role: 'BIDDER',
};

describe('registerSchema', () => {
  it('aceita cadastro válido e normaliza o e-mail', () => {
    expect(registerSchema.parse(valid)).toEqual({ ...valid, email: 'ana@demo.com' });
  });

  it.each([
    [{ ...valid, name: 'A' }, 'name'],
    [{ ...valid, email: 'nao-e-email' }, 'email'],
    [{ ...valid, password: '1234567' }, 'password'],
    [{ ...valid, password: 'x'.repeat(129) }, 'password'],
    [{ ...valid, role: 'ADMIN' }, 'role'],
  ])('rejeita %o no campo %s', (input, field) => {
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it('usa mensagens em português', () => {
    const result = registerSchema.safeParse({ ...valid, password: '123' });
    expect(result.error?.issues[0]?.message).toBe('A senha deve ter pelo menos 8 caracteres.');
  });
});

describe('loginSchema', () => {
  it('exige e-mail e senha', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
