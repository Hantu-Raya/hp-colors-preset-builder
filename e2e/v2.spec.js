import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHpMenuGroups } from '../src/hpMenuNavigation.js';
import { REWRITE_FIELD_CATALOG } from '../src/hpSchema.js';
import { extractSource2Resource, SOURCE2_RESOURCE_CODECS } from '../src/source2ResourceCodec.js';
import { encodeUtf16Hex, readRewritePresetCode, REWRITE_PRESET_ARCHIVE_PATH, REWRITE_PRESET_TEMPLATE_PATH } from '../src/rewritePackageBuilder.js';
import { readVpkArchive } from '../src/vpkArchive.js';

const REWRITE_PRESET = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv 🚀","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

const REWRITE_TEMPLATE_URL = new URL('../public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml', import.meta.url);

async function routeRewriteTemplate(page) {
  const template = await readFile(REWRITE_TEMPLATE_URL, 'utf8');
  await page.route(`**/${REWRITE_PRESET_TEMPLATE_PATH}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/xml',
    body: template
  }));
}

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

async function chooseRewriteQollockTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Rewrite + QOLLOCK' }).click();
  await expect(dialog).toBeHidden();
}

test('v2 Rewrite target adds presets from the topbar and Presets tab', async ({ page }) => {
  await page.goto('v2/');
  await chooseRewriteQollockTarget(page);

  await page.getByRole('button', { name: 'Add preset' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 2');

  await openV2Presets(page);
  const actions = page.locator('.preset-overview-actions');
  await actions.getByRole('button', { name: 'Add preset' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 3');
  await expect(page.locator('#presetName')).toHaveValue('Profile 3');

  await page.keyboard.press('Escape');
  const renderedFieldIds = [];
  for (const group of createHpMenuGroups(REWRITE_FIELD_CATALOG)) {
    await page.getByRole('option', { name: new RegExp(group.name) }).click();
    for (const menuPage of group.children) {
      if (menuPage.fields.length === 0) continue;
      await page.getByRole('tab', { name: menuPage.name, exact: true }).click();
      renderedFieldIds.push(...await page.locator('.schema-field-label[id$="-label"]').evaluateAll(
        (labels) => labels.map((label) => label.id.replace(/-label$/, ''))
      ));
    }
  }
  expect([...new Set(renderedFieldIds)].sort()).toEqual(
    REWRITE_FIELD_CATALOG.bindings.map((binding) => binding.webId).sort()
  );
});

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

test('v2 rewrite profiles build a rewrite-only pak96 and retain code-copy controls', async ({ page }) => {
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
  await routeRewriteTemplate(page);
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
  await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');
  await expect(page.locator('.hero-selector-value')).toHaveText(/Shiv/);
  await expect(page.getByRole('button', { name: 'Build VPK' })).toHaveCount(1);
  await expect(page.getByText(/will build pak96_dir\.vpk for hp_colors_rewrite/)).toBeVisible();

  await page.getByRole('button', { name: 'Export profiles' }).click();
  await page.getByRole('button', { name: 'Copy all rewrite presets' }).click();
  const copied = await page.evaluate(() => window.__rewritePresetClipboard);
  expect(copied.startsWith('HPCRP1')).toBe(true);
  const payload = JSON.parse(copied.slice(6));
  expect(payload.records).toHaveLength(1);
  expect(payload.selectedPresetId).toBe(payload.records[0].id);
  expect(payload.hiddenBakedPresetIds).toEqual([]);
  expect(payload.records[0]).toMatchObject({
    name: 'Shiv 🚀',
    mode: 'selected',
    heroes: ['hero_shiv'],
    conditions: {
      lowThreshold: { slot: 4, minTier: 3, value: 28 },
      enemyPulseThreshold: { slot: 4, minTier: 3, value: 28 },
      enemyKillMarkerThreshold: { slot: 4, minTier: 3, value: 28 }
    }
  });
  await page.getByRole('button', { name: 'Build VPK' }).click();
  const warning = page.getByRole('dialog', { name: 'Confirm hp_colors_rewrite preset VPK' });
  await expect(warning).toBeVisible();
  await warning.getByRole('button', { name: 'I installed hp_colors_rewrite' }).click();
  const downloadPromise = page.waitForEvent('download');
  await warning.getByRole('button', { name: 'Confirm build' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pak96_dir.vpk');
  const downloadedBytes = new Uint8Array(await readFile(await download.path()));
  const archive = readVpkArchive(downloadedBytes);
  expect(archive.files.map((file) => file.path)).toEqual([REWRITE_PRESET_ARCHIVE_PATH]);
  const compiledXml = extractSource2Resource({ bytes: archive.files[0].bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  expect(compiledXml).toContain('HPColorsRewritePresetStore');
  expect(compiledXml).toContain('hp_colors_rewrite_preset_contract="HPCRP1"');
  expect(compiledXml).toContain('hp_colors_rewrite_preset_version="1"');
  expect(compiledXml).toContain(`text="${encodeUtf16Hex(copied)}"`);
  expect(compiledXml).not.toMatch(/base_hud|anita|hp_colors_builder_presets/i);
  expect(readRewritePresetCode(archive.files[0].bytes)).toBe(copied);
  await expect(page.locator('.status-card')).toContainText(/Built pak96_dir\.vpk for hp_colors_rewrite/);
});

test('rewrite imports remain in v2 and never replace v1 profiles', async ({ page }) => {
  await page.goto('.');
  await chooseMinimalTarget(page);
  await page.locator('#presetName').fill('V1 only');
  await page.locator('#presetName').press('Tab');
  await page.waitForTimeout(900);

  await page.goto('v2/');
  await expect(page.locator('#presetName')).toHaveValue('Web Builder Preset');
  await openV2Presets(page);
  await page.getByRole('button', { name: 'Import game preset codes' }).click();
  await page.locator('#importText').fill(REWRITE_PRESET);
  await page.getByRole('button', { name: 'Import codes' }).click();
  await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');

  await page.goto('.');
  await expect(page.locator('#presetName')).toHaveValue('V1 only');
});
