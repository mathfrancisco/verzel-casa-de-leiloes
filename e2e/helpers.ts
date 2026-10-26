import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

// Usuários do seed (apps/api/src/seed/seed.ts).
export const SENHA = 'demo1234';
export const LEILOEIRO = 'leiloeiro@demo.com';
export const ANA = 'ana@demo.com';
export const BRUNO = 'bruno@demo.com';

/** Sessões gravadas por `auth.setup.ts`: um login por usuário por execução (a API limita o login). */
export const SESSION_DIR = 'e2e/.auth';
export const sessionFile = (email: string) => `${SESSION_DIR}/${email.split('@')[0]}.json`;

/** Login pela tela. Usado no setup e nos testes que exercitam o próprio login. */
export async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

/** Entra sem passar pela tela: aplica o cookie de sessão gravado por `auth.setup.ts`. */
export async function signIn(page: Page, email: string) {
  const state = JSON.parse(readFileSync(sessionFile(email), 'utf8')) as {
    cookies: Parameters<ReturnType<Page['context']>['addCookies']>[0];
  };
  await page.context().addCookies(state.cookies);
}
