import { test } from '@playwright/test';
import { ANA, BRUNO, LEILOEIRO, login, sessionFile } from './helpers';

// O login da API tem limite por minuto (RNF-06). Em vez de logar em cada teste, entra uma vez por
// usuário e os demais testes reaproveitam o cookie de sessão.
for (const email of [LEILOEIRO, ANA, BRUNO]) {
  test(`sessão de ${email}`, async ({ page }) => {
    await login(page, email);
    await page.context().storageState({ path: sessionFile(email) });
  });
}
