import { expect, test } from '@playwright/test';

const REWRITE_PRESET = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

async function openV2Presets(page) {
  await page.getByRole('option', { name: /OVERVIEW/ }).click();
  await page.getByRole('tab', { name: 'PRESETS' }).click();
}

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

test('v2 imports rewrite presets, exports them, and adds or removes presets', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__rewritePresetClipboard = text;
        }
      }
    });
  });
  await page.goto('v2/');
  await chooseMinimalTarget(page);
  await openV2Presets(page);

  const actions = page.locator('.preset-overview-actions');
  await actions.getByRole('button', { name: 'Add preset' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 2');
  await actions.getByRole('button', { name: 'Remove selected' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 1');

  await page.getByRole('button', { name: 'Import game preset codes' }).click();
  await page.locator('#importText').fill(REWRITE_PRESET);
  await page.getByRole('button', { name: 'Import codes' }).click();
  await expect(page.locator('#presetName')).toHaveValue('Shiv');
  await expect(page.locator('.hero-selector-value')).toHaveText(/Shiv/);

  await page.getByRole('button', { name: 'Export profiles' }).click();
  await page.getByRole('button', { name: 'Copy rewrite preset' }).click();
  const copied = await page.evaluate(() => window.__rewritePresetClipboard);
  expect(copied.startsWith('HPCRP1')).toBe(true);
  const payload = JSON.parse(copied.slice(6));
  expect(payload.records).toHaveLength(1);
  expect(payload.records[0]).toMatchObject({
    name: 'Shiv',
    mode: 'selected',
    heroes: ['hero_shiv'],
    conditions: {
      lowThreshold: { slot: 4, minTier: 3, value: 28 },
      enemyPulseThreshold: { slot: 4, minTier: 3, value: 28 },
      enemyKillMarkerThreshold: { slot: 4, minTier: 3, value: 28 }
    }
  });
  expect(payload.records[0].values).toContainEqual([31, 'oracle']);
  expect(payload.records[0].values).toContainEqual([56, 440]);
});
