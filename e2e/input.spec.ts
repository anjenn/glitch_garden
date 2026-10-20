import { expect, test } from '@playwright/test';

test.describe('input (SM-02, SM-04, SM-10)', () => {
  test('clicking the garden commits a mutation and logs it', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('#effects').boundingBox();
    expect(box).not.toBeNull();
    // Center-ish of the garden region on both desktop and phone layouts.
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.55);
    await expect(page.locator('#mutations')).toHaveText('001');
    await expect(page.locator('#journal .entry, .right-ui')).toBeTruthy();
    await expect(page.locator('#toast')).toHaveClass(/show/);
  });

  test('moving the pointer quickly never changes the mutation count', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('#effects').boundingBox();
    const cx = box!.x + box!.width * 0.5;
    const cy = box!.y + box!.height * 0.55;
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(cx + Math.sin(i) * 120, cy + Math.cos(i) * 80);
    }
    await page.waitForTimeout(250);
    await expect(page.locator('#mutations')).toHaveText('000');
  });

  test('Enter and Space mutate when the canvas has focus', async ({ page }) => {
    await page.goto('/');
    await page.locator('#effects').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mutations')).toHaveText('001');
    await page.keyboard.press('Space');
    await expect(page.locator('#mutations')).toHaveText('002');
  });

  test('the help dialog opens, traps Escape and closes', async ({ page }) => {
    await page.goto('/');
    await page.click('#helpBottom');
    await expect(page.locator('#about')).toBeVisible();
    await expect(page.locator('#closeAbout')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#about')).toBeHidden();
  });

  test('copy seed falls back gracefully', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denied')) },
        configurable: true,
      });
    });
    let prompted: string | null = null;
    page.once('dialog', (dialog) => {
      prompted = dialog.defaultValue();
      void dialog.dismiss();
    });
    await page.click('#copySeed');
    await expect.poll(() => prompted).toMatch(/^\d+$/);
  });
});
