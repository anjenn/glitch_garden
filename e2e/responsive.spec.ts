import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'small phone', width: 360, height: 800 },
];

for (const viewport of viewports) {
  test(`${viewport.name} (${viewport.width}px) renders without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('#mutate')).toBeVisible();
    await expect(page.locator('#effects')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    // Controls stay tappable: the primary button is at least 44px tall.
    const box = await page.locator('#mutate').boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
}

test('reduced motion disables CSS animation and the canvas still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const animation = await page
    .locator('.pixelspark')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
  await page.click('#mutate');
  await expect(page.locator('#mutations')).toHaveText('001');
});

test('canvas is nearest-neighbor scaled', async ({ page }) => {
  await page.goto('/');
  const rendering = await page
    .locator('#effects')
    .evaluate((el) => getComputedStyle(el).imageRendering);
  expect(['pixelated', 'crisp-edges']).toContain(rendering);
  const smoothing = await page.locator('#effects').evaluate((el) => {
    const ctx = (el as HTMLCanvasElement).getContext('2d');
    return ctx?.imageSmoothingEnabled;
  });
  expect(smoothing).toBe(false);
});
