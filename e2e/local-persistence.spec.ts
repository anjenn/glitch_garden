import { expect, test } from '@playwright/test';

test.describe('local persistence (SM-03, SM-06, SM-07, SM-08, SM-09)', () => {
  test('mutations survive a reload and visits increment', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#mutations')).toHaveText('000');
    await expect(page.locator('#visits')).toHaveText('001');

    await page.click('#mutate');
    await expect(page.locator('#mutations')).toHaveText('001');
    await page.click('#mutate');
    await expect(page.locator('#mutations')).toHaveText('002');
    const seed = await page.locator('#seedTiny').textContent();
    await expect(page.locator('#journal .entry')).toHaveCount(2);

    await page.reload();
    await expect(page.locator('#mutations')).toHaveText('002');
    await expect(page.locator('#visits')).toHaveText('002');
    await expect(page.locator('#seedTiny')).toHaveText(seed ?? '');
    await expect(page.locator('#journal .entry')).toHaveCount(2);
  });

  test('palette shift is logged and recolors without moving entities', async ({ page }) => {
    await page.goto('/');
    const before = await page.evaluate(() => localStorage.getItem('glitch-garden:v1'));
    await page.locator('#paletteTop, #palette').locator('visible=true').first().click();
    await expect(page.locator('#mutations')).toHaveText('001');
    await expect(page.locator('#journal .entry').first()).toContainText('PALETTE');
    await expect(
      page.locator('#paletteTop, #palette').locator('visible=true').first(),
    ).toContainText('DUSK');
    const after = await page.evaluate(() => localStorage.getItem('glitch-garden:v1'));
    const a = JSON.parse(before ?? '{}') as { world: { entities: unknown; palette: number } };
    const b = JSON.parse(after ?? '{}') as { world: { entities: unknown; palette: number } };
    expect(b.world.palette).toBe(1);
    expect(b.world.entities).toEqual(a.world.entities);
  });

  test('new world asks for confirmation; cancel keeps the world', async ({ page }) => {
    await page.goto('/');
    await page.click('#mutate');
    const seed = await page.locator('#seedTiny').textContent();
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.click('#newWorld');
    await expect(page.locator('#mutations')).toHaveText('001');
    await expect(page.locator('#seedTiny')).toHaveText(seed ?? '');

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#newWorld');
    await expect(page.locator('#mutations')).toHaveText('000');
    await expect(page.locator('#visits')).toHaveText('001');
    await expect(page.locator('#journal .entry')).toHaveCount(0);
  });

  test('malformed storage does not crash the app', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('glitch-garden:v1', '{"schemaVersion":1,"world":"nope"'),
    );
    await page.reload();
    await expect(page.locator('#mutate')).toBeVisible();
    await expect(page.locator('#mutations')).toHaveText('000');
  });

  test('the page is honestly labeled as a local demo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mode-chip')).toHaveText('LOCAL DEMO');
  });
});
