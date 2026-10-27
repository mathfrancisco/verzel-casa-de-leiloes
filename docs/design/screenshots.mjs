/* global process, URL, localStorage, console */
// Gera as capturas de tela de docs/design com a API simulada (sem banco).
// Uso: (pnpm --filter @leilao/web dev) e depois  node docs/design/screenshots.mjs antes|depois
import { chromium } from '@playwright/test';

const phase = process.argv[2] ?? 'depois';
const base = process.env.WEB_URL ?? 'http://localhost:5173';
const now = Date.now();
const iso = (ms) => new Date(now + ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;

const art = (hue) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="hsl(${hue} 25% 90%)"/><circle cx="130" cy="120" r="70" fill="hsl(${hue} 55% 55%)"/><rect x="190" y="90" width="150" height="110" rx="8" fill="hsl(${(hue + 40) % 360} 45% 38%)"/><rect x="60" y="220" width="280" height="14" rx="7" fill="hsl(${hue} 30% 70%)"/></svg>`;

const titles = [
  'Lírios d’água',
  'O Quarto em Arles',
  'Noite Estrelada sobre o Ródano',
  'A Grande Onda',
  'Domingo na Grande Jatte',
  'Mulher ao espelho',
  'Paisagem com ciprestes',
  'Natureza-morta com maçãs',
];
const lots = (tab) =>
  titles.map((title, i) => ({
    id: `lot-${tab}-${i}`,
    title,
    imageUrl: `/api/images/${i}`,
    category: ['PAINTING', 'PRINT', 'DRAWING', 'PHOTOGRAPH'][i % 4],
    phase: tab === 'live' ? 'LIVE' : tab === 'scheduled' ? 'SCHEDULED' : 'SETTLED',
    startsAt: iso(tab === 'scheduled' ? (i + 2) * HOUR : -3 * HOUR),
    endsAt: iso(tab === 'closed' ? -HOUR : (i + 1) * 47 * MIN + 13_000),
    currentPriceCents: i % 3 === 0 ? null : 150_000 + i * 37_500,
    startingPriceCents: 100_000 + i * 20_000,
    bidCount: i % 3 === 0 ? 0 : 3 + i * 2,
    serverTime: iso(0),
  }));

async function mock(page, user) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.startsWith('/api/images/'))
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: art((Number(url.pathname.split('/').pop()) * 47) % 360),
      });
    if (url.pathname === '/api/auth/me')
      return user ? json({ user }) : json({ code: 'UNAUTHENTICATED' }, 401);
    if (url.pathname === '/api/wallet')
      return json({
        totalCents: 1_400_000,
        committedCents: 150_000,
        availableCents: 1_250_000,
        commitments: [],
        entries: [
          {
            id: 1,
            type: 'DEPOSIT',
            amountCents: 1_400_000,
            lotId: null,
            lotTitle: null,
            createdAt: iso(-HOUR),
          },
        ],
      });
    if (url.pathname === '/api/lots') {
      const tab = url.searchParams.get('phase') ?? 'live';
      return json({
        items: lots(tab),
        nextCursor: null,
        counts: { live: 8, scheduled: 8, closed: 8 },
        serverTime: iso(0),
      });
    }
    return json({ code: 'NOT_FOUND' }, 404);
  });
  await page.route('**/socket.io/**', (route) => route.abort());
}

const bidder = { id: 'u1', name: 'Ana Souza', email: 'ana@demo.com', role: 'BIDDER' };
const browser = await chromium.launch();
for (const [vw, size] of [
  ['desktop', { width: 1440, height: 900 }],
  ['360', { width: 360, height: 740 }],
]) {
  for (const theme of ['light', 'dark']) {
    for (const [name, path] of [
      ['vitrine', '/'],
      ['carteira', '/carteira'],
    ]) {
      const ctx = await browser.newContext({ viewport: size, colorScheme: theme });
      const page = await ctx.newPage();
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await mock(page, bidder);
      await page.goto(base + path);
      await page.waitForTimeout(1200);
      if (await page.getByText('Nova versão disponível').count()) {
        await page.reload(); // primeira carga do Vite re-otimiza dependências
        await page.waitForTimeout(1200);
      }
      const file = `docs/design/clickbids-${phase}-${name}-${vw}-${theme}.png`;
      await page.screenshot({ path: file });
      console.log(file);
      await ctx.close();
    }
  }
}
if (phase === 'depois') {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await mock(page, bidder);
  await page.goto(base + '/');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/design/clickbids-depois-menu-360-light.png' });
}
await browser.close();
