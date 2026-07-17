import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});

async function chooseMinimalTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Minimal mod' }).click();
  await expect(dialog).toBeHidden();
}

async function openMobileBuilder(page) {
  await page.goto('.');
  await expect(page.getByRole('region', { name: 'HP Colors preset builder' })).toBeVisible();
  await chooseMinimalTarget(page);
  await expect(page.getByRole('navigation', { name: 'Mobile builder navigation' })).toBeVisible();
}

test.describe('mobile builder workflow', () => {
  test('fits 390px viewport, keeps navigation sticky, and exposes touch-sized controls', async ({ page }) => {
    await openMobileBuilder(page);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      navPosition: getComputedStyle(document.querySelector('.mobile-workspace-nav')).position
    }));
    expect(metrics.overflow).toBeLessThanOrEqual(0);
    expect(metrics.navPosition).toBe('sticky');

    for (const locator of [
      page.locator('.mobile-workspace-nav a').first(),
      page.getByRole('button', { name: 'Add preset' }),
      page.locator('.hero-selector-trigger'),
      page.getByRole('button', { name: 'Build VPK' })
    ]) {
      const box = await locator.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('reorders profiles with mobile fallback controls and completes build flow', async ({ page }) => {
    await openMobileBuilder(page);
    await page.getByRole('button', { name: 'Add preset' }).click();
    await page.locator('#presetName').fill('Mobile second');
    const trigger = page.locator('.profile-selector-trigger');
    const profiles = page.locator('.profile-selector-menu');
    if (!(await profiles.isVisible())) await trigger.click();
    await expect(profiles).toBeVisible();
    await profiles.locator('.profile-move-actions button:not([disabled])').nth(1).click();
    await expect(profiles.locator('.profile-row-name').first()).toHaveText('Mobile second');

    await page.getByRole('button', { name: 'Build VPK' }).click();
    const warning = page.getByRole('dialog', { name: /Confirm Minimal preset VPK/ });
    await warning.getByRole('button', { name: 'I installed the selected base mod' }).click();
    const downloadPromise = page.waitForEvent('download');
    await warning.getByRole('button', { name: 'Confirm build' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('pak96_dir.vpk');
    await expect(page.locator('.build-result-card')).toContainText('pak96_dir.vpk');
  });
});
