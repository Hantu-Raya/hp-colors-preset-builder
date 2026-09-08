import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const builderRoot = fileURLToPath(new URL('../', import.meta.url));
const pageUrl = 'https://hantu-raya.github.io/hp-colors-preset-builder/hpv2/';
const commitInfoUrl = 'https://hantu-raya.github.io/hp-colors-preset-builder/commit-info.json';
const settingsCode = 'HPCR2{"v":[[8,"#FD4949"],[20,"#FFEFD7"],[21,"#FFEFD7"],[22,"#FFEFD7"]],"c":{}}';
const presetCode = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Browser Smoke","mode":"all","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"user_0001"}';

const commitInfo = await fetch(commitInfoUrl).then((response) => {
  assert.equal(response.ok, true, `commit metadata request failed: ${response.status}`);
  return response.json();
});
const localHead = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: builderRoot,
  encoding: 'utf8'
}).trim();
assert.equal(commitInfo.hash, localHead, 'deployed commit does not match local HEAD');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedText = String(text);
        }
      }
    });
  });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  const targetDialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  if (await targetDialog.isVisible()) {
    await targetDialog.getByRole('button', { name: /^Rewrite Preset VPK/ }).click();
    await targetDialog.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: 'Presets', exact: true }).click();
  await page.getByRole('button', { name: 'Import game preset codes', exact: true }).click();

  const importField = page.getByRole('textbox', { name: 'Paste COPY ALL or HP Colors import codes here' });
  const importButton = page.getByRole('button', { name: 'Import codes', exact: true });
  await importField.fill(settingsCode);
  await importButton.click();
  await page.getByText('Imported rewrite settings', { exact: true }).first().waitFor();

  await importField.fill(presetCode);
  await importButton.click();
  await page.getByRole('textbox', { name: 'Profile' }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Profile' }).inputValue(), 'Browser Smoke');

  await page.getByRole('button', { name: 'Export profiles', exact: true }).click();
  await page.getByRole('button', { name: 'Copy rewrite settings', exact: true }).click();
  await page.waitForFunction(() => window.__copiedText?.startsWith('HPCR2'));
  const exportedSettings = await page.evaluate(() => window.__copiedText);
  assert.equal(exportedSettings.startsWith('HPCR2'), true);

  await page.getByRole('button', { name: 'Copy rewrite preset', exact: true }).click();
  await page.waitForFunction(() => window.__copiedText?.startsWith('HPCRP1'));
  const exportedPreset = await page.evaluate(() => window.__copiedText);
  const presetPayload = JSON.parse(exportedPreset.slice('HPCRP1'.length));
  assert.equal(presetPayload.records.length, 1);
  assert.equal(presetPayload.records[0].name, 'Browser Smoke');

  await importField.fill(exportedPreset);
  await importButton.click();
  assert.equal(await page.getByRole('textbox', { name: 'Profile' }).inputValue(), 'Browser Smoke');

  await page.getByRole('button', { name: 'Copy all rewrite presets', exact: true }).click();
  await page.waitForFunction(() => window.__copiedText?.startsWith('HPCRP1'));
  const bundle = JSON.parse((await page.evaluate(() => window.__copiedText)).slice('HPCRP1'.length));
  assert.equal(bundle.records.length > 0, true);

  console.log(JSON.stringify({ commit: localHead, settings: 'HPCR2', presets: 'HPCRP1', roundTrip: true }));
} finally {
  await browser.close();
}
