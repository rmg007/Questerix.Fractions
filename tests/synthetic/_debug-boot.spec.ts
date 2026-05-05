import { test } from '@playwright/test';

test('inspect boot path', async ({ browser }) => {
  test.setTimeout(30_000);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('console', (m) => console.log(`[console:${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  await page.goto('/?testHooks=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const list = async (label: string) => {
    const ids = await page.$$eval('[data-testid]', (els) =>
      els.map((e) => e.getAttribute('data-testid'))
    );
    console.log(`${label}: ${JSON.stringify(ids)}`);
  };
  await list('after goto');

  const start = page.locator('[data-testid="boot-start-btn"]');
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await page.waitForTimeout(1500);
  }
  await list('after start');

  const card = page.locator('[data-testid="level-card-L1"]');
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2000);
  }
  await list('after L1 card');

  const node = page.locator('[data-testid="map-level-1"]');
  if (await node.isVisible().catch(() => false)) {
    await node.click();
    await page.waitForTimeout(2500);
  }
  await list('after map-level-1');

  await ctx.close();
});
