import { defineConfig, devices } from '@playwright/test';

// Pré-requisitos: banco com `pnpm seed` e variáveis da API no ambiente (ver .env.example),
// com CATALOG_PROVIDER=fake (a E2E nunca chama a API externa). O LC-022 estende esta config.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @leilao/api dev',
      url: 'http://127.0.0.1:3000/api/lots?phase=live',
      // Testes nunca chamam a API externa real (AGENTS.md).
      env: { CATALOG_PROVIDER: 'fake' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @leilao/web dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
