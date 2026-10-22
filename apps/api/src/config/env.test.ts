import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgres://leilao:leilao@localhost:5432/leilao',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('aceita o mínimo obrigatório e aplica padrões', () => {
    expect(loadEnv(valid)).toEqual({
      ...valid,
      PORT: 3000,
      NODE_ENV: 'development',
      CATALOG_PROVIDER: 'artic',
    });
  });

  it('converte PORT e aceita NODE_ENV conhecido', () => {
    const env = loadEnv({ ...valid, PORT: '8080', NODE_ENV: 'production' });
    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe('production');
  });

  it('lista todas as variáveis ausentes na mensagem', () => {
    expect(() => loadEnv({})).toThrow(EnvError);
    expect(() => loadEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });

  it.each([
    [{ ...valid, DATABASE_URL: 'mysql://localhost/x' }, 'DATABASE_URL'],
    [{ ...valid, JWT_SECRET: 'curto' }, 'JWT_SECRET'],
    [{ ...valid, PORT: 'abc' }, 'PORT'],
    [{ ...valid, NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ ...valid, CATALOG_PROVIDER: 'met' }, 'CATALOG_PROVIDER'],
  ])('rejeita valor inválido de %o', (source, name) => {
    expect(() => loadEnv(source)).toThrow(name);
  });
});
