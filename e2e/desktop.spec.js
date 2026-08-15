import assert from 'node:assert/strict';
import { test, expect } from '@playwright/test';
import { readVpkArchive } from '../src/vpkArchive.js';
import { extractSource2Resource } from '../src/source2ResourceCodec.js';
import { HP_COLORS_PACKAGE_ARTIFACTS } from '../src/packageArtifacts.js';
import { validatePresetStoreXml } from '../src/presetStoreXml.js';

const BASE_PATH = '/hp-colors-preset-builder/';
const APP_ORIGIN = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321').origin;

async function chooseMinimalTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Minimal mod' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.target-mode-trigger')).toContainText('Minimal');
}

async function chooseFullTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Full mod' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.target-mode-trigger')).toContainText('Full');
}

async function openBuilder(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('.');
  await expect(page.getByRole('region', { name: 'HP Colors preset builder' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(BASE_PATH);
  return errors;
}

function makeCompactV97Token() {
  const payload = JSON.stringify({ v: 97, c: 1, hm: 'all', name: 'Recovered', values: { e: false, cl: '#123456' } });
  return `[ANITA-v1-hp_colors]:${Buffer.from(payload).toString('base64url')}`;
}

async function downloadBytes(download) {
  const stream = await download.createReadStream();
  assert.ok(stream, 'download stream should be available');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return new Uint8Array(Buffer.concat(chunks));
}

async function expectPrecisePipsFieldOrder(page) {
  const pipVisibilityRow = page.locator('.schema-field-list > .schema-field-row').filter({
    has: page.locator('#hp_pip_visible-label')
  });
  await expect(pipVisibilityRow).toHaveCount(1);
  await expect(page.locator('.schema-field-list .schema-field-label', { hasText: 'More Precise HP Pips' })).toHaveCount(1);
  const labels = await pipVisibilityRow.evaluate((row) => {
    const nextRow = row.nextElementSibling;
    const followingRow = nextRow?.nextElementSibling;
    return [row, nextRow, followingRow].map((item) => item?.querySelector('.schema-field-label')?.textContent?.trim());
  });
  expect(labels).toEqual([
    'Show pip HP segments',
    'More Precise HP Pips',
    'Low HP number color'
  ]);
}

test.describe('desktop builder workflow', () => {
  test('opens target picker and closes dialog on Escape', async ({ page }) => {
    const errors = await openBuilder(page);
    await chooseMinimalTarget(page);

    await page.locator('.target-mode-trigger').click();
    const targetDialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
    await expect(targetDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(targetDialog).toBeHidden();
    expect(errors).toEqual([]);
  });

  for (const [target, chooseTarget] of [
    ['Minimal', chooseMinimalTarget],
    ['Full', chooseFullTarget]
  ]) {
    test(`orders precise pips directly after pip visibility for the ${target} target`, async ({ page }) => {
      const errors = await openBuilder(page);
      await chooseTarget(page);
      await page.getByRole('option', { name: /^Number Overlay/ }).click();
      await page.getByRole('radiogroup', { name: 'HP number color source' }).getByRole('radio', { name: 'Custom' }).click();
      await expectPrecisePipsFieldOrder(page);
      expect(errors).toEqual([]);
    });
  }

  test('copies precise and default pip convars for the full target', async ({ page }) => {
    const errors = await openBuilder(page);
    await chooseFullTarget(page);
    await page.getByRole('option', { name: /^Number Overlay/ }).click();
    await page.getByRole('button', { name: 'Configure' }).click();

    const dialog = page.getByRole('dialog', { name: 'More Precise HP Pips' });
    await expect(dialog).toContainText('HP Colors cannot apply or verify these game settings.');
    await expect(dialog.locator('code')).toContainText('"citadel_unit_status_health_per_minor_pip" "10"');

    await dialog.getByRole('radio', { name: 'Game default' }).click();
    await expect(dialog).toContainText('restore the default pip scale');
    await expect(dialog.locator('code')).toContainText('"citadel_unit_status_minor_pip_per_major_pip" "5"');
    expect(errors).toEqual([]);
  });

  test('edits and persists profiles, selects a hero, recovers from malformed import, and exports', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
    await openBuilder(page);
    await chooseMinimalTarget(page);

    await page.locator('#presetName').fill('Alpha');
    await page.getByRole('button', { name: 'Add preset' }).click();
    await expect(page.locator('#presetName')).toHaveValue('Profile 2');
    await page.locator('#presetName').fill('Beta');
    const trigger = page.locator('.profile-selector-trigger');
    const profiles = page.locator('.profile-selector-menu');
    if (!(await profiles.isVisible())) await trigger.click();
    await expect(profiles).toBeVisible();
    await profiles.locator('.profile-move-actions button:not([disabled])').nth(1).click();
    await expect(profiles.locator('.profile-row-name').first()).toHaveText('Beta');

    await page.locator('.hero-selector-trigger').click();
    await page.getByRole('option', { name: 'Warden' }).click();
    await expect(page.locator('.hero-selector-value')).toHaveText(/Warden/);
    await page.locator('.hero-selector-trigger').click();
    await expect(page.locator('.hero-selector-menu')).toBeHidden();

    const importTrigger = page.getByRole('button', { name: 'Import game preset codes' });
    if (!(await page.locator('#importText').isVisible())) await importTrigger.click();
    await expect(page.locator('#importText')).toBeVisible();
    await page.locator('#importText').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.locator('#importText').pressSequentially('not a valid HP Colors code');
    const firstImportButton = page.getByRole('button', { name: 'Import codes' });
    await expect(firstImportButton).toBeEnabled();
    await firstImportButton.click();
    await expect(page.getByRole('alert')).toContainText(/malformed|invalid/i);
    const importText = page.locator('#importText');
    if (!(await importText.isVisible())) await page.getByRole('button', { name: 'Import game preset codes' }).click();
    await importText.fill('');
    await importText.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await importText.pressSequentially(makeCompactV97Token());
    const importButton = page.getByRole('button', { name: 'Import codes' });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(page.locator('.operation-feedback[role="status"]')).toContainText('Imported Recovered');

    await page.getByRole('button', { name: 'Export profiles' }).click();
    await page.getByRole('button', { name: 'Copy current profile code' }).click();
    await expect(page.locator('.operation-feedback[role="status"]')).toContainText('Copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^\[ANITA-v1-hp_colors\]:/);

    const jsonDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON' }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);

    await page.reload();
    await expect(page.locator('#presetName')).toHaveValue('Recovered');
    await expect(page.locator('.hero-selector-value')).toHaveText(/All heroes/);
  });

  test('builds, downloads, decodes, and converts the fixed VPK output', async ({ page }) => {
    await openBuilder(page);
    await chooseMinimalTarget(page);
    await page.getByRole('option', { name: /^Number Overlay/ }).click();
    await expect(page.getByRole('button', { name: 'Configure' })).toHaveCount(0);
    await expect(page.getByText('Stored in this Minimal preset.')).toBeVisible();
    const precisePipsToggle = page.getByRole('checkbox', { name: 'More Precise HP Pips' });
    await expect(precisePipsToggle).not.toBeChecked();
    await expect(precisePipsToggle).toHaveText('Off');
    await precisePipsToggle.click();
    await expect(precisePipsToggle).toBeChecked();
    await expect(precisePipsToggle).toHaveText('On');

    const precisePipsDialog = page.getByRole('dialog', { name: 'More Precise HP Pips' });
    await expect(precisePipsDialog).toContainText('HP Colors cannot apply or verify these game settings');
    await expect(precisePipsDialog.locator('code')).toHaveText([
      '"citadel_unit_status_health_per_minor_pip" "10"',
      '"citadel_unit_status_health_per_pip" "10"',
      '"citadel_unit_status_minor_pip_per_major_pip" "10"'
    ].join('\n'));

    await precisePipsDialog.getByRole('radio', { name: 'Game default' }).click();
    await expect(precisePipsToggle).not.toBeChecked();
    await expect(precisePipsToggle).toHaveText('Off');
    await expect(precisePipsDialog.locator('code')).toHaveText([
      '"citadel_unit_status_health_per_minor_pip" "100"',
      '"citadel_unit_status_health_per_pip" "100"',
      '"citadel_unit_status_minor_pip_per_major_pip" "5"'
    ].join('\n'));
    await precisePipsDialog.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Build VPK' }).click();
    const warning = page.getByRole('dialog', { name: /Confirm Minimal preset VPK/ });
    await warning.getByRole('button', { name: 'I installed the selected base mod' }).click();
    const buildDownloadPromise = page.waitForEvent('download');
    await warning.getByRole('button', { name: 'Confirm build' }).click();
    const buildDownload = await buildDownloadPromise;
    expect(buildDownload.suggestedFilename()).toBe('pak96_dir.vpk');
    const bytes = await downloadBytes(buildDownload);
    const archive = readVpkArchive(bytes);
    expect(archive.files.map((file) => file.path)).toEqual(['panorama/layout/base_hud.vxml_c']);
    const xml = extractSource2Resource({ bytes: archive.files[0].bytes, codec: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec });
    const decodedPresets = validatePresetStoreXml(xml);
    expect(decodedPresets).toHaveLength(1);
    expect(decodedPresets[0].values.hp_precise_pips_enabled).toBe(false);
    await expect(page.locator('.build-result-card')).toContainText('pak96_dir.vpk');

    await page.getByRole('button', { name: 'Convert VPK' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'pak96_dir.vpk',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(bytes)
    });
    const convertDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'To Full' }).click();
    const convertDownload = await convertDownloadPromise;
    expect(convertDownload.suggestedFilename()).toBe('pak96_dir.vpk');
    await expect(page.locator('.convert-status')).toContainText(/Converted pak96_dir.vpk/);
  });
});
