import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // O pacote shared é TypeScript sem build próprio: entra no bundle da API.
  noExternal: ['@leilao/shared'],
});
