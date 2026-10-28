// Roteiro de apoio ao LC-035: percorre vitrine, login, sala e auditoria pelo teclado, mede foco
// visível, reflow em 320 px e a ação principal no celular, nos temas claro e escuro.
// Uso: node scripts/portfolio/a11y-manual.mjs <lotId> (app local em 127.0.0.1:5173, seed de demo).
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const BASE = 'http://127.0.0.1:5173';
const LOT = process.argv[2];
const PASS = 'demo1234'; // senha pública do seed local
const out = [];
const log = (line) => out.push(line);

async function tabWalk(page, label, steps = 25) {
  const seen = [];
  let missingFocus = 0;
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const visible =
        (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== 'none';
      const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.id || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);
      return { tag: el.tagName.toLowerCase(), name, visible };
    });
    if (!info) continue;
    if (!info.visible) missingFocus++;
    seen.push(`${info.tag}:${info.name}${info.visible ? '' : ' [SEM FOCO VISÍVEL]'}`);
  }
  log(`- ${label}: ${seen.length} paradas, ${missingFocus} sem foco visível`);
  log(`  ${seen.join(' → ')}`);
}

async function reflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  log(`- ${label} em 320 px: rolagem horizontal ${overflow > 1 ? `${overflow}px [FALHA]` : 'nenhuma'}`);
}

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  log(`\n## Tema ${scheme === 'light' ? 'claro' : 'escuro'}`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await tabWalk(page, 'Vitrine (anônimo)');

  await page.goto(`${BASE}/entrar`);
  await tabWalk(page, 'Entrar', 12);
  await page.getByLabel('E-mail').fill('ana@demo.com');
  await page.getByLabel('Senha').fill(PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Sair' }).first().waitFor();

  await page.goto(`${BASE}/lotes/${LOT}`);
  await page.getByRole('button', { name: 'Dar lance' }).waitFor();
  await page.waitForTimeout(1500);
  const status = await page.getByRole('status').allInnerTexts();
  log(`- Sala: regiões role=status → ${JSON.stringify(status.map((s) => s.trim()).filter(Boolean))}`);
  await page.locator('#bid-amount').fill('1');
  await page.getByRole('button', { name: 'Dar lance' }).click();
  await page.waitForTimeout(800);
  const err = await page.evaluate(() => {
    const input = document.querySelector('#bid-amount');
    const ids = (input?.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    return {
      invalid: input?.getAttribute('aria-invalid'),
      described: ids.map((id) => document.getElementById(id)?.innerText.trim()).filter(Boolean),
      alert: [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText.trim()),
    };
  });
  log(`- Sala, lance inválido: aria-invalid=${err.invalid}; descrição=${JSON.stringify(err.described)}; role=alert=${JSON.stringify(err.alert)}`);
  await page.goto(`${BASE}/lotes/${LOT}`);
  await page.getByRole('button', { name: 'Dar lance' }).waitFor();
  await tabWalk(page, 'Sala (Ana)', 30);

  await page.goto(`${BASE}/auditoria/${LOT}`);
  await page.waitForTimeout(2500);
  await tabWalk(page, 'Auditoria', 15);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.getByRole('button', { name: 'Copiar hash' }).click();
  await page.waitForTimeout(300);
  const copy = await page.getByRole('status').allInnerTexts();
  log(`- Auditoria, copiar hash: role=status → ${JSON.stringify(copy.map((s) => s.trim()).filter(Boolean))}`);
  await ctx.close();

  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: scheme,
  });
  const m = await mob.newPage();
  await m.goto(`${BASE}/entrar`);
  await m.getByLabel('E-mail').fill('ana@demo.com');
  await m.getByLabel('Senha').fill(PASS);
  await m.getByRole('button', { name: 'Entrar' }).click();
  await m.waitForURL((u) => !u.pathname.startsWith('/entrar'));
  await m.goto(`${BASE}/lotes/${LOT}`);
  const btn = m.getByRole('button', { name: 'Dar lance' });
  await btn.waitFor();
  await m.waitForTimeout(1200);
  const box = await btn.boundingBox();
  log(`- Celular 390×844: "Dar lance" com topo em ${Math.round(box.y)} px e base em ${Math.round(box.y + box.height)} px (${box.y + box.height <= 844 ? 'na primeira tela' : 'exige rolagem'})`);
  await m.screenshot({ path: `docs/portfolio/media/lc035-sala-390-${scheme}.png` });
  await mob.close();

  const narrow = await browser.newContext({ viewport: { width: 320, height: 700 }, colorScheme: scheme });
  const n = await narrow.newPage();
  for (const [label, path] of [
    ['Vitrine', '/'],
    ['Sala', `/lotes/${LOT}`],
    ['Auditoria', `/auditoria/${LOT}`],
    ['Entrar', '/entrar'],
  ]) {
    await n.goto(BASE + path);
    await n.waitForLoadState('networkidle');
    await reflow(n, label);
  }
  await narrow.close();
}
await browser.close();
console.log(out.join('\n'));
