import { expect, test, type Browser, type Page } from '@playwright/test';
import { ANA, BRUNO, LEILOEIRO, sessionFile } from './helpers';

// LC-022 · CT-06-06, CT-09-04, CT-10-04: o fluxo principal de ponta a ponta, sem atalhos no
// servidor. O leiloeiro cria o lote pela UI; Ana e Bruno (dois contextos de navegador) disputam;
// o lote encerra de verdade, pelo worker de liquidação, e o resultado é conferido no comprovante e
// na auditoria.
//
// Duração: a RN-02 exige lotes de pelo menos 5 minutos e a RN-09 prorroga lances nos últimos 2
// minutos. Por isso o teste cria um lote de 5 minutos, dá os lances logo no início (sem prorrogar)
// e espera o encerramento real. Não há relógio falso nem rota de teste na API.

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const ENDS_IN_MS = 5 * 60_000;
// CT-06-06 pede < 1 s; o teto folgado evita falso negativo em CI. O tempo medido vai no relatório.
const OUTBID_CEILING_MS = 5_000;

async function openContext(browser: Browser, email: string) {
  const context = await browser.newContext({ storageState: sessionFile(email) });
  const page = await context.newPage();
  return { context, page };
}

async function placeBid(page: Page, amount: string) {
  await page.getByLabel('Seu lance').fill(amount);
  await page.getByRole('button', { name: 'Dar lance' }).click();
}

test('fluxo completo: criar lote, disputar, ser superado, encerrar, comprovante e auditoria', async ({
  browser,
}) => {
  const title = `Lírios d’água E2E ${Date.now()}`;
  const auctioneer = await openContext(browser, LEILOEIRO);
  const ana = await openContext(browser, ANA);
  const bruno = await openContext(browser, BRUNO);
  let lotUrl = '';
  let lotId = '';
  let endsAt = 0;

  await test.step('leiloeiro cria um lote de 5 minutos pela UI', async () => {
    const page = auctioneer.page;
    await page.goto('/painel/novo');
    await page.getByLabel('Buscar no acervo do Art Institute of Chicago').fill('Monet');
    await page.getByRole('button', { name: /Lírios/ }).click();
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Lance inicial (R$)').fill('1.500,00');
    await page.getByLabel('Incremento mínimo (R$)').fill('100,00');
    // O início aceita até 1 min no passado e o campo só tem precisão de minutos: calcula o
    // início logo antes de enviar e deixa ao menos 30 s de folga até o próximo minuto.
    const seconds = new Date().getSeconds();
    if (seconds >= 30) await page.waitForTimeout((62 - seconds) * 1000);
    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + ENDS_IN_MS);
    endsAt = end.getTime();
    await page.getByLabel('Início', { exact: true }).fill(localInput(start));
    await page.getByLabel('Fim', { exact: true }).fill(localInput(end));
    await page.getByRole('button', { name: 'Publicar lote' }).click();

    await expect(page).toHaveURL(/\/lotes\/[0-9a-f-]{36}$/);
    lotUrl = new URL(page.url()).pathname;
    lotId = lotUrl.split('/').pop()!;
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  });

  await test.step('Ana abre a sala e dá o primeiro lance', async () => {
    await ana.page.goto(lotUrl);
    await expect(ana.page.getByText('Faça seu primeiro lance')).toBeVisible();
    await placeBid(ana.page, '1.500,00');
    await expect(ana.page.locator('.lot-status')).toHaveText('✓ Você está ganhando');
  });

  await test.step('Bruno cobre Ana e Ana é avisada sem recarregar (CT-06-06)', async () => {
    await bruno.page.goto(lotUrl);
    // Bruno vê o lance de Ana chegar: o mínimo do próximo lance já é o dele.
    await expect(bruno.page.getByLabel('Seu lance')).toHaveValue(/1\.600,00$/);

    // Marca a página de Ana: se ela recarregasse, a marca sumiria.
    await ana.page.evaluate(() => {
      (window as unknown as { __semRecarga: boolean }).__semRecarga = true;
    });
    const startedAt = Date.now();
    await placeBid(bruno.page, '1.600,00');
    await expect(bruno.page.locator('.lot-status')).toHaveText('✓ Você está ganhando');
    await expect(ana.page.locator('.lot-status')).toHaveText('⚠ Você foi superado', {
      timeout: OUTBID_CEILING_MS,
    });
    const elapsed = Date.now() - startedAt;
    test.info().annotations.push({ type: 'tempo até "superado"', description: `${elapsed} ms` });
    expect(elapsed).toBeLessThan(OUTBID_CEILING_MS);
    await expect(
      ana.page.getByRole('status').filter({ hasText: 'Você foi superado em' }),
    ).toBeVisible();
    expect(
      await ana.page.evaluate(() => (window as unknown as { __semRecarga?: boolean }).__semRecarga),
    ).toBe(true);
  });

  await test.step('lances recusados mostram mensagem clara (RN-05, RN-06)', async () => {
    // Abaixo do mínimo: o próximo lance válido é R$ 1.700,00.
    await placeBid(ana.page, '1.000,00');
    await expect(
      ana.page.getByText(
        'Lance abaixo do mínimo. O próximo lance deve ser de pelo menos R$ 1.700,00.',
      ),
    ).toBeVisible();
    await expect(ana.page.locator('.lot-status')).toHaveText('⚠ Você foi superado');

    // Ana cobre Bruno com um lance válido e passa a liderar.
    await placeBid(ana.page, '1.700,00');
    await expect(ana.page.locator('.lot-status')).toHaveText('✓ Você está ganhando');
    await expect(bruno.page.locator('.lot-status')).toHaveText('⚠ Você foi superado');

    // Quem lidera não pode cobrir o próprio lance.
    await placeBid(ana.page, '1.800,00');
    await expect(ana.page.getByText('Você já está ganhando este lote.')).toBeVisible();
  });

  await test.step('o lote encerra sozinho e Ana vence', async () => {
    const remaining = Math.max(0, endsAt - Date.now());
    // Os lances foram dados com mais de 2 minutos para o fim: sem prorrogação (RN-09).
    expect(remaining).toBeGreaterThan(2 * 60_000);
    await expect(ana.page.locator('.lot-status')).toHaveText('Lote encerrado — você venceu', {
      timeout: remaining + 90_000,
    });
    await expect(bruno.page.locator('.lot-status')).toHaveText('Lote encerrado — você não venceu', {
      timeout: 30_000,
    });
    await expect(ana.page.getByLabel('Seu lance')).toHaveCount(0);
  });

  await test.step('Ana abre o comprovante e a assinatura é verificada no navegador', async () => {
    await ana.page.goto('/meus-lances');
    await ana.page.getByRole('tab', { name: 'Arrematados' }).click();
    const item = ana.page.getByRole('listitem').filter({ hasText: title });
    await expect(item).toContainText('Arrematado');
    await expect(item).toContainText('R$ 1.700,00');
    await item.getByRole('link', { name: 'Comprovante' }).click();

    await expect(ana.page.getByRole('heading', { name: 'Comprovante de arremate' })).toBeVisible();
    await expect(ana.page.getByText('✓ Assinatura verificada neste navegador')).toBeVisible();
    await expect(ana.page.getByText('R$ 1.700,00')).toBeVisible();
    // Público: sem nome nem e-mail do vencedor (RN-16).
    const text = await ana.page.locator('main').innerText();
    expect(text).not.toContain('ana@demo.com');
    expect(text).not.toMatch(/\bAna\b/);
  });

  await test.step('qualquer pessoa audita o lote: cadeia íntegra', async () => {
    const visitor = await browser.newContext();
    const page = await visitor.newPage();
    await page.goto(`/auditoria/${lotId}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoria pública' })).toBeVisible();
    await expect(page.getByText('✓ Cadeia íntegra')).toBeVisible();
    await expect(page.locator('.audit-tampered')).toHaveCount(0);
    // Elos: 3 lances aceitos e o encerramento.
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(rows.filter({ hasText: 'BID' })).toHaveCount(3);
    await expect(rows.filter({ hasText: 'CLOSED' })).toHaveCount(1);
    await visitor.close();
  });

  await test.step('o painel do leiloeiro mostra o lote arrematado', async () => {
    await auctioneer.page.goto('/painel');
    const card = auctioneer.page.getByRole('listitem').filter({ hasText: title });
    await expect(card).toContainText('Arrematado por R$ 1.700,00');
  });

  await Promise.all([auctioneer.context.close(), ana.context.close(), bruno.context.close()]);
});
