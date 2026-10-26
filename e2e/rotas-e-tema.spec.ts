import { expect, test } from '@playwright/test';
import { ANA, LEILOEIRO, SENHA, signIn } from './helpers';

// CT-09-04: rotas protegidas por papel (a UI só antecipa; o servidor decide).
test.describe('CT-09-04: rotas por papel', () => {
  for (const path of ['/carteira', '/meus-lances', '/painel', '/painel/novo']) {
    test(`visitante em ${path} vai para o login e volta depois de entrar`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    });
  }

  test('login com ?next= devolve o leiloeiro à rota pedida', async ({ page }) => {
    await page.goto('/painel');
    await expect(page).toHaveURL(/\/entrar\?next=%2Fpainel$/);
    await page.getByLabel('E-mail').fill(LEILOEIRO);
    await page.getByLabel('Senha').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/painel');
    await expect(page.getByRole('heading', { name: 'Painel do leiloeiro' })).toBeVisible();
  });

  test('licitante: acessa carteira e arremates; painel e novo lote dão "Sem permissão"', async ({
    page,
  }) => {
    await signIn(page, ANA);
    await page.goto('/carteira');
    await expect(page.getByRole('heading', { name: /carteira/i }).first()).toBeVisible();
    await page.goto('/meus-lances');
    await expect(page.getByRole('heading', { name: 'Meus arremates' })).toBeVisible();
    for (const path of ['/painel', '/painel/novo']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible();
      await expect(page).toHaveURL(path);
    }
    await expect(page.getByRole('link', { name: 'Painel' })).toHaveCount(0);
  });

  test('leiloeiro: acessa painel e novo lote; "Meus arremates" dá "Sem permissão"', async ({
    page,
  }) => {
    await signIn(page, LEILOEIRO);
    await page.goto('/painel');
    await expect(page.getByRole('heading', { name: 'Painel do leiloeiro' })).toBeVisible();
    await page.goto('/painel/novo');
    await expect(page.getByRole('heading', { name: 'Novo lote' })).toBeVisible();
    await page.goto('/meus-lances');
    await expect(page.getByRole('heading', { name: 'Sem permissão' })).toBeVisible();
  });

  test('o servidor também recusa: licitante não acessa a API do leiloeiro', async ({ page }) => {
    await signIn(page, ANA);
    const response = await page.request.get('/api/auctioneer/lots');
    expect(response.status()).toBe(403);
  });

  test('rota inexistente mostra a página 404', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: /não encontrada/i })).toBeVisible();
  });
});

// Tema (RF-19): sistema como padrão, escolha explícita vence e sobrevive à navegação.
test.describe('tema', () => {
  test('sem escolha salva, segue o tema do sistema', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('a escolha explícita vence o sistema e persiste entre páginas', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('button', { name: /tema escuro/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.goto('/entrar');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /tema escuro/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: /tema escuro/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
