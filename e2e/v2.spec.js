import { expect, test } from '@playwright/test';

async function chooseMinimalTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Minimal mod' }).click();
  await expect(dialog).toBeHidden();
}

test('keeps v1 original and exposes v2 as a separate route', async ({ page }) => {
  await page.goto('.');
  await chooseMinimalTarget(page);
  await expect(page.getByRole('option', { name: /^GENERAL/ })).toBeVisible();

  await page.getByRole('link', { name: 'V2 game menu' }).click();
  await expect(page).toHaveURL(/\/hp-colors-preset-builder\/v2\/$/);
  await expect(page.getByRole('option', { name: /OVERVIEW/ })).toBeVisible();

  await page.getByRole('link', { name: 'V1 original' }).click();
  await expect(page).toHaveURL(/\/hp-colors-preset-builder\/$/);
  await expect(page.getByRole('option', { name: /^GENERAL/ })).toBeVisible();
});

test('v2 mirrors the in-game category and page navigation', async ({ page }) => {
  await page.goto('v2/');
  await chooseMinimalTarget(page);

  const sections = page.getByRole('listbox', { name: 'HP Colors sections' }).getByRole('option');
  await expect(sections).toHaveCount(4);

  await page.getByRole('option', { name: /ENEMY/ }).click();
  const enemyTabs = page.getByRole('tablist', { name: 'ENEMY pages' }).getByRole('tab');
  await expect(enemyTabs).toHaveText(['BAR', 'HEAL & DAMAGE', 'SHIELDS & ICONS', 'PULSE', 'KILL MARKER']);
  await page.getByRole('tab', { name: 'KILL MARKER' }).click();
  await expect(page.getByRole('heading', { name: 'ENEMY KILL MARKER' })).toBeVisible();

  await page.getByRole('option', { name: /OVERVIEW/ }).click();
  await page.getByRole('tab', { name: 'PRESETS' }).click();
  await expect(page.getByRole('button', { name: 'Import game preset codes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert VPK' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export profiles' })).toBeVisible();
});
