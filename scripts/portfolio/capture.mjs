// Captura estados reais da demo local (FakeCatalog) com duas sessões isoladas.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const BASE = 'http://127.0.0.1:5173';
const LOT = process.argv[2];
const RECEIPT = process.argv[3];
const OUT = process.argv[4];
const PASS = 'demo1234'; // senha pública do seed local
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const desktop = { viewport: { width: 1280, height: 800 }, colorScheme: 'dark', locale: 'pt-BR' };
const shot = (page, name, full = false) =>
  page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });

async function login(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Sair' }).first().waitFor();
  return page;
}

const anon = await (await browser.newContext(desktop)).newPage();
await anon.goto(BASE);
await anon.waitForLoadState('networkidle');
await shot(anon, '01-vitrine');

const ana = await login(await browser.newContext(desktop), 'ana@demo.com');
const bruno = await login(await browser.newContext(desktop), 'bruno@demo.com');

await ana.goto(`${BASE}/lotes/${LOT}`);
await bruno.goto(`${BASE}/lotes/${LOT}`);
await ana.getByRole('button', { name: 'Dar lance' }).waitFor();
await bruno.getByRole('button', { name: 'Dar lance' }).waitFor();
await ana.waitForTimeout(1500);
await shot(ana, '02-sala-ana');

// Bruno tenta abaixo do mínimo e depois cobre a Ana.
const minText = await bruno.getByText(/Próximo lance mínimo/).innerText();
const min = Number(minText.replace(/\D/g, '')) / 100;
await bruno.locator('main input').fill(String(min - 50));
await bruno.getByRole('button', { name: 'Dar lance' }).click();
await bruno.getByText(/Lance abaixo do mínimo/).waitFor();
await shot(bruno, '03-lance-recusado-bruno');
await bruno.locator('main input').fill(String(min));
await bruno.getByRole('button', { name: 'Dar lance' }).click();

await ana.getByText('Você foi superado').first().waitFor({ timeout: 10_000 });
await ana.waitForTimeout(800);
await shot(ana, '04-ana-superada');

await ana.goto(`${BASE}/carteira`);
await ana.waitForLoadState('networkidle');
await shot(ana, '05-carteira-ana');

await anon.goto(`${BASE}/comprovante/${RECEIPT}`);
await anon.waitForLoadState('networkidle');
await anon.waitForTimeout(1500);
await shot(anon, '06-comprovante');

await anon.goto(`${BASE}/auditoria/${LOT}`);
await anon.waitForLoadState('networkidle');
await anon.waitForTimeout(3000);
await shot(anon, '07-auditoria');

const mobileCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  colorScheme: 'dark',
  locale: 'pt-BR',
});
const mob = await mobileCtx.newPage();
await mob.goto(`${BASE}/lotes/${LOT}`);
await mob.waitForLoadState('networkidle');
await mob.waitForTimeout(1500);
await shot(mob, '08-sala-mobile');

await browser.close();
console.log('ok');
