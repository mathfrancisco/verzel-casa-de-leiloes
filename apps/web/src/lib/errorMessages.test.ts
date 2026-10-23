import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { fieldErrors, messageFor } from './errorMessages';
import { registerSchema } from '@leilao/shared';

describe('messageFor', () => {
  it('usa a mensagem padrão do código', () => {
    expect(messageFor(new ApiError(401, 'INVALID_CREDENTIALS', 'x'))).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('falha de rede vira mensagem de conexão', () => {
    expect(messageFor(new TypeError('Failed to fetch'))).toBe(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    );
  });
});

describe('fieldErrors', () => {
  it('mapeia erros do schema por campo', () => {
    const errors = fieldErrors(registerSchema, {
      name: 'A',
      email: 'x',
      password: '1',
      role: 'BIDDER',
    });
    expect(errors).toEqual({
      name: 'O nome deve ter pelo menos 2 caracteres.',
      email: 'Informe um e-mail válido.',
      password: 'A senha deve ter pelo menos 8 caracteres.',
    });
  });

  it('mapeia VALIDATION_ERROR vindo da API por campo', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', {
      issues: [{ path: ['email'], message: 'Informe um e-mail válido.' }],
    });
    expect(fieldErrors(error)).toEqual({ email: 'Informe um e-mail válido.' });
  });

  it('dados válidos não geram erros', () => {
    expect(
      fieldErrors(registerSchema, {
        name: 'Ana',
        email: 'a@b.com',
        password: '12345678',
        role: 'BIDDER',
      }),
    ).toEqual({});
  });
});
