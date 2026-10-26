import { defineConfig, devices } from '@playwright/test';

// Pré-requisitos: banco com `pnpm seed` e variáveis da API no ambiente (ver .env.example),
// com CATALOG_PROVIDER=fake (a E2E nunca chama a API externa).
//
// Projetos para isolar o estado compartilhado do banco semeado:
// - `setup`: grava a sessão dos usuários do seed (o login da API é limitado por minuto);
// - `chromium`: especs somente leitura (axe, rotas por papel, tema), em paralelo;
// - `fluxo`: o fluxo completo, que cria um lote novo e muda saldos. Roda depois, sozinho e em
//   série, para nunca disputar o banco com os demais.
const FLOW_SPEC = /fluxo-completo\.spec\.ts/;
const SETUP = /auth.setup.ts/;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    // O login da API tem limite por minuto: entra uma vez por usuário e reaproveita a sessão.
    { name: 'setup', testMatch: SETUP },
    {
      name: 'chromium',
      testIgnore: [FLOW_SPEC, SETUP],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'fluxo',
      testMatch: FLOW_SPEC,
      dependencies: ['chromium'],
      fullyParallel: false,
      // O lote mais curto que a RN-02 permite dura 5 minutos: o teste espera o encerramento real.
      timeout: 8 * 60_000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @leilao/api dev',
      url: 'http://127.0.0.1:3000/api/lots?phase=live',
      // Testes nunca chamam a API externa real (AGENTS.md).
      env: { CATALOG_PROVIDER: 'fake' },
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @leilao/web dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
  ],
});
