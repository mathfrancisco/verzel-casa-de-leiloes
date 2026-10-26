import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ANA, LEILOEIRO, signIn } from './helpers';

const THEMES = ['light', 'dark'] as const;

async function firstLotId(page: Page): Promise<string> {
  const response = await page.request.get('/api/lots?phase=live');
  const body = (await response.json()) as { items: { id: string; endsAt: string }[] };
  // O lote que encerra por último não muda de estado durante a execução (o fluxo dura minutos).
  const id = [...body.items].sort((a, b) => b.endsAt.localeCompare(a.endsAt))[0]?.id;
  if (!id) throw new Error('Seed sem lote ao vivo: rode `pnpm seed`.');
  return id;
}

async function expectNoCriticalViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const critical = violations.filter((v) => v.impact === 'critical');
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  // Contraste AA é "serious" no axe: também exigido (RNF-11).
  const contrast = violations.filter((v) => v.id === 'color-contrast');
  expect(contrast, JSON.stringify(contrast, null, 2)).toEqual([]);
}

for (const theme of THEMES) {
  test.describe(`axe, tema ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => localStorage.setItem(key!, value!),
        ['theme', theme],
      );
    });

    async function open(page: Page, path: string, ready: () => Promise<unknown>) {
      await page.goto(path);
      await ready();
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
      await expectNoCriticalViolations(page);
    }

    test('/ (vitrine)', async ({ page }) => {
      await open(page, '/', () => expect(page.locator('.lot-card').first()).toBeVisible());
    });

    test('/lotes/:id', async ({ page }) => {
      const id = await firstLotId(page);
      await open(page, `/lotes/${id}`, () =>
        expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
      );
    });

    test('/auditoria/:id', async ({ page }) => {
      const id = await firstLotId(page);
      await open(page, `/auditoria/${id}`, () =>
        expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
      );
    });

    test('/carteira', async ({ page }) => {
      await signIn(page, ANA);
      await open(page, '/carteira', () =>
        expect(page.getByRole('heading', { name: /carteira/i }).first()).toBeVisible(),
      );
    });

    test('/painel', async ({ page }) => {
      await signIn(page, LEILOEIRO);
      await open(page, '/painel', () =>
        expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
      );
    });
  });
}

test('CT-09-05: tema escolhido persiste ao recarregar, sem flash', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /tema escuro/i });
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Sem flash: a classe já está em <html> no DOMContentLoaded, antes de o React montar.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __darkAtDcl: boolean }).__darkAtDcl =
        document.documentElement.classList.contains('dark') && !document.querySelector('#root > *');
    });
  });
  await page.reload();
  expect(await page.evaluate(() => (window as never as { __darkAtDcl: boolean }).__darkAtDcl)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: /tema escuro/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('layout sem rolagem horizontal em 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const id = await firstLotId(page);
  for (const path of ['/', `/lotes/${id}`, `/auditoria/${id}`]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
