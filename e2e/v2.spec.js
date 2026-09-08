import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHpMenuGroups } from '../src/hpv2HpMenuNavigation.js';
import { REWRITE_FIELD_CATALOG } from '../src/hpv2HpSchema.js';
import { extractSource2Resource, SOURCE2_RESOURCE_CODECS } from '../src/source2ResourceCodec.js';
import { encodeUtf16Hex, readRewritePresetCode, readRewriteShowranksPresetCode, readRewriteQollockPresetCode, REWRITE_PRESET_ARCHIVE_PATH, REWRITE_PRESET_TEMPLATE_PATH } from '../src/hpv2RewritePackageBuilder.js';
import { readVpkArchive } from '../src/vpkArchive.js';
import { loadSupporters } from '../src/supportersData.js';

const REWRITE_PRESET = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv 🚀","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

const REWRITE_TEMPLATE_URL = new URL('../public/templates/hpv2_hp_colors_rewrite/panorama/layout/hud_escape_menu.xml', import.meta.url);

const KOFI_SCRIPT_URL = 'https://cdn.ko-fi.tools/v2/js/leaderboard.js';
const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const supporters = await loadSupporters();
const donorCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const STATIC_SUPPORTER_LABEL = `Ko-fi top supporters: ${supporters.map(({ displayName, totalUsd }, index) => `${index + 1} ${displayName} ${donorCurrency.format(totalUsd)}`).join(', ')}`;
const STATIC_SUPPORTER_TEXT = supporters.map(({ displayName, totalUsd }, index) => `${index + 1}${displayName}${donorCurrency.format(totalUsd)}`);

async function routeRewriteTemplate(page) {
  const template = await readFile(REWRITE_TEMPLATE_URL, 'utf8');
  await page.route(`**/${REWRITE_PRESET_TEMPLATE_PATH}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/xml',
    body: template
  }));
}

async function openV2Presets(page) {
  const presetsTab = page.getByRole('tab', { name: 'PRESETS' });
  await presetsTab.focus();
  await presetsTab.press('Enter');
}

async function chooseMinimalTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Minimal mod' }).click();
  await expect(dialog).toBeHidden();
}

async function chooseRewriteTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^Rewrite(?:v2)? Preset VPK/ }).click();
  await expect(dialog).toBeHidden();
}

async function chooseRewriteQollockTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Rewritev2 + QOLLOCK' }).click();
  await expect(dialog).toBeHidden();
}
async function clearPreviewStorage(page) {
  await page.evaluate(() => {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (const key of Object.keys(storage)) {
        if (/preview/i.test(key)) storage.removeItem(key);
      }
    }
  });
}

async function readPreviewStorage(page) {
  return page.evaluate(() => {
    const previewKey = Object.keys(window.sessionStorage).find((key) => /preview/i.test(key));
    return {
      session: previewKey ? JSON.parse(window.sessionStorage.getItem(previewKey)) : null,
      localPreviewKeys: Object.keys(window.localStorage).filter((key) => /preview/i.test(key))
    };
  });
}

test('homepage and canonical V2 route never request the remote Ko-fi leaderboard script', async ({ page }) => {
  let requestCount = 0;
  await page.route(KOFI_SCRIPT_URL, async (route) => {
    requestCount += 1;
    await route.abort('blockedbyclient');
  });

  await page.goto('.');
  await chooseRewriteTarget(page);
  await expect(page.locator('.topbar-supporter-strip')).toBeVisible();
  await page.goto('hpv2/');
  await expect(page.locator('.topbar-supporter-strip')).toBeVisible();
  expect(requestCount).toBe(0);
});

test('supporter strip holds thanks centered for three seconds and loops without a jump', async ({ page }) => {
  await page.goto('supporters-strip/');
  const track = page.locator('.supporter-strip-track');
  await expect(track.locator('[data-cycle="primary"] .supporter-strip-item')).toHaveText(STATIC_SUPPORTER_TEXT);

  for (const width of [390, 520, 1460, 3840]) {
    await page.setViewportSize({ width, height: 60 });
    await expect.poll(() => track.evaluate((element) => {
      const animation = element.getAnimations()[0];
      if (!animation) return false;
      const cycleWidth = element.firstElementChild.getBoundingClientRect().width;
      const end = new DOMMatrix(animation.effect.getKeyframes().at(-1).transform).m41;
      return Math.abs(end + cycleWidth) < 0.1;
    })).toBe(true);
    const motion = await track.evaluate((element) => {
      const [animation] = element.getAnimations();
      animation.pause();
      const duration = animation.effect.getTiming().duration;
      const cycle = element.firstElementChild;
      const duplicate = cycle.nextElementSibling;
      const cycleWidth = cycle.getBoundingClientRect().width;
      const viewport = element.parentElement.getBoundingClientRect();
      const sequence = cycle.querySelector('.supporter-strip-sequence');
      const thanks = cycle.querySelector('.supporter-strip-thanks-copy');
      const holdStart = sequence.getBoundingClientRect().width / 36 * 1000;
      const xAt = (time) => {
        animation.currentTime = time;
        return cycle.getBoundingClientRect().x;
      };
      const start = xAt(0);
      const scrolling = xAt(1000);
      const holdEarly = xAt(holdStart + 250);
      const holdLate = xAt(holdStart + 2750);
      const thanksBox = thanks.getBoundingClientRect();
      const lastDonorRight = sequence.lastElementChild.getBoundingClientRect().right;
      const nextDonorLeft = duplicate.querySelector('.supporter-strip-item').getBoundingClientRect().left;
      const resumed = xAt(holdStart + 4000);
      animation.currentTime = duration - 1;
      const beforeSeam = duplicate.getBoundingClientRect().x;
      const rightEdge = element.lastElementChild.getBoundingClientRect().right;
      animation.currentTime = duration + 1;
      const afterSeam = cycle.getBoundingClientRect().x;
      animation.play();
      return { duration, cycleWidth, start, scrolling, holdEarly, holdLate, resumed, beforeSeam, afterSeam, rightEdge, viewportLeft: viewport.left, viewportRight: viewport.right, center: (viewport.left + viewport.right) / 2, thanksCenter: (thanksBox.left + thanksBox.right) / 2, lastDonorRight, nextDonorLeft };
    });
    expect(motion.duration).toBeCloseTo(motion.cycleWidth / 36 * 1000 + 3000, 1);
    expect(motion.start - motion.scrolling).toBeCloseTo(36, 1);
    expect(motion.holdEarly).toBeCloseTo(motion.holdLate, 2);
    expect(Math.abs(motion.thanksCenter - motion.center)).toBeLessThan(1);
    expect(motion.lastDonorRight).toBeLessThanOrEqual(motion.viewportLeft);
    expect(motion.nextDonorLeft).toBeGreaterThanOrEqual(motion.viewportRight - 1);
    expect(motion.holdLate - motion.resumed).toBeCloseTo(36, 1);
    expect(Math.abs(motion.beforeSeam - motion.afterSeam)).toBeLessThan(1);
    expect(motion.rightEdge).toBeGreaterThanOrEqual(motion.viewportRight);
  }
});

test('supporter strip respects reduced motion and retains the full accessible donor list', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('supporters-strip/');
  const strip = page.getByRole('group');
  await expect(strip).toHaveAttribute('aria-label', `${STATIC_SUPPORTER_LABEL}. Thank you for supporting.`);
  const donor = strip.locator('.supporter-strip-item').first();
  const before = await donor.boundingBox();
  await page.waitForTimeout(150);
  expect(await donor.boundingBox()).toEqual(before);
});

test('v2 keeps the wide title row ordered and renders the ranked supporter leaderboard', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 900 });
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);
  await expect(page.locator('#kofi-leaderboard-embed')).toHaveCount(0);
  await expect(page.locator(`script[src="${KOFI_SCRIPT_URL}"]`)).toHaveCount(0);

  const titleRow = page.locator('.panorama-title-row');
  await expect(titleRow.locator('.commit-version-link')).toBeVisible();
  await expect(titleRow.locator('.topbar-supporter-strip')).toBeVisible();
  const workflow = page.locator('.topbar-workflow-actions');
  await expect(workflow.locator('.topbar-support-actions')).toBeVisible();
  const directChildClasses = await titleRow.locator(':scope > *').evaluateAll((nodes) => (
    nodes.map((node) => node.className)
  ));
  expect(directChildClasses).toEqual([
    'panorama-brand',
    'commit-version-link',
    'topbar-supporter-strip'
  ]);
  const [workflowBox, supportBox, targetBox] = await Promise.all([
    workflow.boundingBox(),
    workflow.locator('.topbar-support-actions').boundingBox(),
    workflow.locator('.target-mode-trigger').boundingBox()
  ]);
  expect(supportBox.x - workflowBox.x).toBeLessThanOrEqual(12);
  expect(supportBox.x + supportBox.width).toBeLessThanOrEqual(targetBox.x);

  const strip = page.locator('.topbar-supporter-strip');
  const window = strip.locator('.topbar-supporter-window');
  await expect(window).toHaveAttribute('href', KOFI_LEADERBOARD_URL);
  await expect(window).toHaveAttribute('aria-label', STATIC_SUPPORTER_LABEL);
  const track = strip.locator('.topbar-supporter-track');
  await expect(track).toHaveAttribute('aria-hidden', 'true');
  await expect(track.locator('.topbar-supporter-sequence')).toHaveCount(2);
  await expect(track.locator('.topbar-supporter-sequence').nth(1)).toHaveAttribute('aria-hidden', 'true');
  const supporterItems = track.locator('.topbar-supporter-sequence').first().locator('.topbar-supporter-item');
  await expect(supporterItems).toHaveCount(STATIC_SUPPORTER_TEXT.length);
  expect(await supporterItems.allTextContents()).toEqual(STATIC_SUPPORTER_TEXT);
  await expect(supporterItems.filter({ hasText: 'Ko-fi Supporter' })).toHaveCount(2);
  const firstItemClasses = await supporterItems.first().locator(':scope > *').evaluateAll((nodes) => (
    nodes.map((node) => node.className)
  ));
  expect(firstItemClasses).toEqual(['topbar-supporter-rank', 'topbar-supporter-name', 'topbar-supporter-amount']);
  for (let index = 0; index < 3; index += 1) {
    await expect(supporterItems.nth(index)).toHaveClass(new RegExp(`topbar-supporter-place-${index + 1}`));
  }
  const podiumShadows = await supporterItems.evaluateAll((items) => (
    items.slice(0, 3).map((item) => getComputedStyle(item).textShadow)
  ));
  expect(new Set(podiumShadows).size).toBe(3);
  expect(podiumShadows.every((shadow) => shadow !== 'none')).toBe(true);

  await page.locator('#presetName').fill('Ticker survives rerender');
  await page.locator('#presetName').press('Tab');
  await expect(page.locator('#presetName')).toHaveValue('Ticker survives rerender');
  await expect(window).toHaveAttribute('aria-label', STATIC_SUPPORTER_LABEL);
  await expect(track).toBeVisible();
});

test('v2 auto-scrolls the static supporter list without playback controls', async ({ page }) => {
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);

  const strip = page.locator('.topbar-supporter-strip');
  const track = strip.locator('.topbar-supporter-track');
  await expect(strip.locator('.topbar-supporter-pause')).toHaveCount(0);
  await expect(track).toHaveCSS('animation-name', 'topbar-supporter-scroll');
  await expect(track).toHaveCSS('animation-play-state', 'running');
  expect(parseFloat(await track.evaluate((node) => getComputedStyle(node).animationDuration))).toBeGreaterThan(4);
});


test('v2 keeps the supporter ticker moving when the OS requests reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);

  const strip = page.locator('.topbar-supporter-strip');
  const track = strip.locator('.topbar-supporter-track');
  await expect(strip.locator('.topbar-supporter-pause')).toHaveCount(0);
  await expect(track).toHaveCSS('animation-name', 'topbar-supporter-scroll');
  await expect(track).toHaveCSS('animation-play-state', 'running');
  expect(parseFloat(await track.evaluate((node) => getComputedStyle(node).animationDuration))).toBeGreaterThan(4);
  await expect(track.locator('.topbar-supporter-sequence').nth(1)).toBeVisible();
});

test('v2 has no page horizontal overflow at supported header widths', async ({ page }) => {
  for (const viewport of [
    { width: 1460, height: 900 },
    { width: 1133, height: 917 },
    { width: 390, height: 844 },
    { width: 320, height: 760 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('hpv2/');
    await expect(page.locator('.panorama-topbar')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth
    }));
    expect(dimensions.htmlScrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test('v2 shows the healthbar preview for both Rewrite targets and hides it on Presets', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteTarget(page);

  const rail = page.locator('.healthbar-preview-rail');
  await expect(rail).toBeVisible();
  await expect(rail.getByRole('heading', { name: 'Healthbar preview' })).toBeVisible();


  await page.locator('.target-mode-trigger').click();
  await chooseRewriteQollockTarget(page);
  await expect(rail).toBeVisible();
  await expect(rail.getByRole('heading', { name: 'Healthbar preview' })).toBeVisible();

  await page.getByRole('button', { name: 'Presets', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'PRESET LIBRARY' })).toBeVisible();
  await expect(rail).toHaveCount(0);
});
test('v2 settings navigation aligns with tall settings content', async ({ page }) => {
  await page.setViewportSize({ width: 1460, height: 838 });
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);
  await page.locator('.panorama-workspace').evaluate((workspace) => {
    window.scrollTo(0, workspace.offsetTop);
  });

  const [workspaceBox, treeBox] = await Promise.all([
    page.locator('.panorama-workspace').boundingBox(),
    page.locator('.anita-tree').boundingBox()
  ]);
  expect(Math.abs(treeBox.y - workspaceBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs((treeBox.y + treeBox.height) - (workspaceBox.y + workspaceBox.height))).toBeLessThanOrEqual(2);
});

test('v2 preview controls update output, support hold-to-stock, zoom, and reset', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);
  await expect(page.locator('#healthbar-preview-health')).toBeVisible();

  await page.locator('.target-mode-trigger').click();
  await chooseRewriteTarget(page);

  const preview = page.locator('.healthbar-preview');
  const health = preview.locator('#healthbar-preview-health');
  const healthOutput = preview.locator('.healthbar-preview-health-control output');
  const relation = preview.locator('.healthbar-preview-relation');
  const canvas = preview.locator('.healthbar-preview-canvas');
  const stock = preview.getByRole('button', { name: 'Show stock' });

  await expect(health).toHaveValue('100');
  await expect(healthOutput).toContainText('100%');
  await health.focus();
  await health.press('Home');
  await expect(health).toHaveValue('0');
  await expect(healthOutput).toContainText('0%');

  await relation.getByRole('radio', { name: 'ALLY' }).click();
  await expect(relation.getByRole('radio', { name: 'ALLY' })).toHaveAttribute('aria-checked', 'true');
  await expect(preview.locator('.healthbar-preview-status')).toHaveText('ALLY');

  await expect(canvas).toHaveAttribute('data-zoom', 'fit');
  await preview.getByRole('radio', { name: '2x zoom' }).click();
  await expect(canvas).toHaveAttribute('data-zoom', '2x');
  await expect(canvas).toHaveClass(/is-zoomed/);

  await stock.focus();
  await expect(stock).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.down('Space');
  await expect(stock).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.locator('.healthbar-preview-status')).toHaveText('Stock');
  await expect(healthOutput).toContainText('0%');
  await page.keyboard.up('Space');
  await expect(stock).toHaveAttribute('aria-pressed', 'false');
  await expect(preview.locator('.healthbar-preview-status')).toHaveText('ALLY');

  await preview.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(health).toHaveValue('100');
  await expect(healthOutput).toContainText('100%');
  await expect(relation.getByRole('radio', { name: 'ENEMY' })).toHaveAttribute('aria-checked', 'true');
  await expect(canvas).toHaveAttribute('data-zoom', 'fit');
  await expect(stock).toHaveAttribute('aria-pressed', 'false');
  await expect(preview.locator('.healthbar-preview-status')).toHaveText('ENEMY');
});

test('v2 preview matches the compact in-game healthbar geometry', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  const preview = page.locator('.healthbar-preview');
  const hud = await preview.locator('.healthbar-preview-hud').boundingBox();
  const bar = await preview.locator('.healthbar-preview-bar').boundingBox();
  const level = await preview.locator('.healthbar-preview-level').boundingBox();
  const readout = await preview.locator('.healthbar-preview-readout').boundingBox();
  const pips = await preview.locator('.healthbar-preview-pips').boundingBox();
  const unitInfo = await preview.locator('.healthbar-preview-unit-info').boundingBox();
  const unitInfoBackground = preview.locator('.healthbar-preview-unit-info-bg');

  expect(hud).not.toBeNull();
  expect(bar).not.toBeNull();
  expect(level).not.toBeNull();
  expect(readout).not.toBeNull();
  expect(pips).not.toBeNull();
  expect(unitInfo).not.toBeNull();
  await expect(unitInfoBackground).toHaveJSProperty('naturalWidth', 512);
  expect(bar.width).toBeGreaterThanOrEqual(118);
  expect(bar.width).toBeLessThanOrEqual(136);
  expect(bar.height).toBeGreaterThanOrEqual(18);
  expect(bar.height).toBeLessThanOrEqual(22);
  expect(level.width).toBeGreaterThanOrEqual(35);
  expect(level.width).toBeLessThanOrEqual(37);
  expect(level.height).toBeGreaterThanOrEqual(35);
  expect(level.height).toBeLessThanOrEqual(37);
  expect(Math.abs(bar.x - hud.x - level.width - 6)).toBeLessThanOrEqual(1);
  expect(level.x + level.width).toBeLessThanOrEqual(unitInfo.x + unitInfo.width * 0.18 + 2);
  const unitInfoOverlap = unitInfo.x + unitInfo.width - bar.x;
  expect(unitInfoOverlap).toBeGreaterThanOrEqual(unitInfo.width * 0.28);
  expect(unitInfoOverlap).toBeLessThanOrEqual(unitInfo.width * 0.32);
  expect(Math.abs((level.y + level.height / 2) - (bar.y + bar.height / 2))).toBeLessThanOrEqual(2);
  expect(readout.y + readout.height).toBeLessThanOrEqual(bar.y + 1);
  const readoutCenterOffset = (readout.x + readout.width / 2) - (bar.x + bar.width / 2);
  expect(readoutCenterOffset).toBeGreaterThanOrEqual(-12);
  expect(readoutCenterOffset).toBeLessThanOrEqual(-8);
  expect(pips.y).toBeGreaterThanOrEqual(bar.y);
  expect(pips.y + pips.height).toBeLessThanOrEqual(bar.y + bar.height);
});

test('v2 preview keeps high-health pip groups readable', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  const maxHealth = page.locator('#healthbar-preview-max-health');
  await maxHealth.evaluate((input) => {
    input.value = '32700';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const pips = page.locator('.healthbar-preview-pips');
  await expect(pips).toHaveAttribute('aria-label', '29 health pips at 1100 HP intervals, with 5 major markers');
  const minorStepPixels = await pips.evaluate((element) => {
    const style = getComputedStyle(element);
    const percent = Number.parseFloat(style.getPropertyValue('--healthbar-minor-pip-step'));
    return element.getBoundingClientRect().width * percent / 100;
  });
  expect(minorStepPixels).toBeGreaterThanOrEqual(4);
});

test('v2 preview starts the enemy pulse at its configured threshold with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  const health = page.locator('#healthbar-preview-health');
  await health.evaluate((input) => {
    input.value = '25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(health).toHaveValue('25');

  const pulse = page.locator('.healthbar-preview-pulse-overlay');
  await expect(pulse).toHaveClass(/is-active/);
  const pulseBox = await pulse.boundingBox();
  expect(pulseBox.width).toBeGreaterThan(0);
  await expect(pulse).toHaveCSS('animation-name', 'healthbar-preview-pulse');
});

test('v2 preview offers only Team 1 and Team 2 for enabled enemy and ally team colors', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  const preview = page.locator('.healthbar-preview');
  const teamSwitch = preview.locator('.healthbar-preview-team-switch');
  const fill = preview.locator('.healthbar-preview-health-layer');
  await expect(teamSwitch).toHaveCount(0);

  await page.getByRole('option', { name: '02 ENEMY' }).click();
  const enemyToggle = page.getByRole('checkbox', { name: 'Use team color at high HP' });
  await enemyToggle.click();
  await expect(enemyToggle).toHaveAttribute('aria-checked', 'true');

  await expect(teamSwitch).toBeVisible();
  await expect(teamSwitch.getByRole('radio')).toHaveCount(2);
  await expect(teamSwitch.getByRole('radio', { name: 'Default' })).toHaveCount(0);
  await expect(teamSwitch.getByRole('radio', { name: 'Team 1' })).toHaveAttribute('aria-checked', 'true');
  const enemyTeam1Color = await fill.evaluate((element) => getComputedStyle(element).backgroundColor);

  await teamSwitch.getByRole('radio', { name: 'Team 2' }).click();
  const enemyTeam2Color = await fill.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(enemyTeam2Color).not.toEqual(enemyTeam1Color);

  await page.getByRole('option', { name: '03 ALLY' }).click();
  const allyEnabled = page.getByRole('checkbox', { name: 'Color ally HP bars' });
  await allyEnabled.click();
  await expect(allyEnabled).toHaveAttribute('aria-checked', 'true');
  const allyToggle = page.getByRole('checkbox', { name: 'Use team color at high HP' });
  await allyToggle.click();
  await expect(allyToggle).toHaveAttribute('aria-checked', 'true');
  await preview.getByRole('radio', { name: 'ALLY' }).click();

  await expect(teamSwitch).toBeVisible();
  await expect(teamSwitch.getByRole('radio')).toHaveCount(2);
  await expect(teamSwitch.getByRole('radio', { name: 'Default' })).toHaveCount(0);
  await teamSwitch.getByRole('radio', { name: 'Team 1' }).click();
  const allyTeam1Color = await fill.evaluate((element) => getComputedStyle(element).backgroundColor);
  await teamSwitch.getByRole('radio', { name: 'Team 2' }).click();
  const allyTeam2Color = await fill.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(allyTeam2Color).not.toEqual(allyTeam1Color);
});

test('v2 schema rows and preview actions hold together at narrow window sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 917 });
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  await page.getByRole('option', { name: '02 ENEMY' }).click();
  const row = page.locator('.schema-field-row').filter({ hasText: 'Low HP starts at %' });
  await row.scrollIntoViewIfNeeded();

  const range = await row.locator('.anita-range').boundingBox();
  const star = await row.locator('.field-condition-button').boundingBox();
  expect(range).not.toBeNull();
  expect(star).not.toBeNull();
  expect(star.x).toBeGreaterThanOrEqual(range.x + range.width - 1);

  const rowBox = await row.boundingBox();
  expect(star.x + star.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);

  const zoomRadio = await page.getByRole('radio', { name: '2x zoom' }).boundingBox();
  expect(zoomRadio).not.toBeNull();
  expect(zoomRadio.height).toBeLessThanOrEqual(36);
});

test('v2 preview keeps scenario and mobile collapse in session storage across reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteQollockTarget(page);

  const rail = page.locator('.healthbar-preview-rail');
  const preview = page.locator('.healthbar-preview');
  await expect(rail).toBeVisible();
  const previewBox = await rail.boundingBox();
  const settingsBox = await page.locator('.anita-detail-panel').boundingBox();
  expect(previewBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(previewBox.y).toBeLessThan(settingsBox.y);

  const expand = preview.getByRole('button', { name: 'Show preview' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(preview.locator('.healthbar-preview-content')).toBeHidden();
  await expand.click();
  const collapse = preview.getByRole('button', { name: 'Hide preview' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(preview.locator('.healthbar-preview-content')).toBeVisible();

  await preview.locator('.healthbar-preview-relation').getByRole('radio', { name: 'ALLY' }).click();
  const scenario = preview.locator('.healthbar-preview-scenario');
  await scenario.locator('summary').click();
  await scenario.locator('#healthbar-preview-unit-kind').selectOption('boss');
  await expect(scenario.locator('#healthbar-preview-unit-kind')).toHaveValue('boss');

  await collapse.click();
  await expect(preview.getByRole('button', { name: 'Show preview' })).toHaveAttribute('aria-expanded', 'false');
  await expect(preview.locator('.healthbar-preview-content')).toBeHidden();

  const beforeReload = await readPreviewStorage(page);
  expect(beforeReload.session).toMatchObject({
    mobileCollapsed: true,
    scenario: { relation: 'ally', unitKind: 'boss' }
  });
  expect(beforeReload.localPreviewKeys).toEqual([]);

  await page.reload();
  const reloadedPreview = page.locator('.healthbar-preview');
  await expect(reloadedPreview).toBeVisible();
  await expect(reloadedPreview.getByRole('button', { name: 'Show preview' })).toHaveAttribute('aria-expanded', 'false');
  await expect(reloadedPreview.locator('.healthbar-preview-content')).toBeHidden();
  await expect(reloadedPreview.locator('#healthbar-preview-unit-kind')).toHaveValue('boss');
  await expect(reloadedPreview.locator('.healthbar-preview-status')).toHaveText('ALLY');

  const afterReload = await readPreviewStorage(page);
  expect(afterReload.session).toMatchObject({
    mobileCollapsed: true,
    scenario: { relation: 'ally', unitKind: 'boss' }
  });
  expect(afterReload.localPreviewKeys).toEqual([]);
});

test('v2 plain Rewrite target loads Rewrite preview without conversion', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteTarget(page);

  const preview = page.locator('.healthbar-preview');
  await expect(preview.locator('#healthbar-preview-health')).toBeVisible();
  await expect(preview.getByRole('button', { name: 'Convert to Rewrite', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.healthbar-preview #healthbar-preview-health')).toBeVisible();
});


test('v2 Rewrite target adds presets from the topbar and Presets tab', async ({ page }) => {
  await page.goto('hpv2/');
  await chooseRewriteQollockTarget(page);

  await page.getByRole('button', { name: 'Add preset' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 2');

  await page.getByRole('button', { name: 'Presets' }).click();
  await expect(page.getByRole('heading', { name: 'PRESET LIBRARY' })).toBeVisible();
  const actions = page.locator('.preset-overview-actions');
  await actions.getByRole('button', { name: 'Add preset' }).click();
  await expect(page.locator('.profile-selector-meta')).toContainText('/ 3');
  await expect(page.locator('#presetName')).toHaveValue('Profile 3');

  await page.keyboard.press('Escape');
  await page.getByRole('option', { name: /HEALTH INFO/ }).click();
  await page.getByRole('tab', { name: 'STAMINA', exact: true }).click();
  await expect(page.locator('#hpv2_enemy_stamina_color-label')).toHaveCount(0);
  await page.getByRole('checkbox', {
    name: 'Use custom enemy stamina color'
  }).click();
  await expect(page.locator('#hpv2_enemy_stamina_color-label')).toBeVisible();

  await page.getByRole('option', { name: /ALLY/ }).click();
  await page.getByRole('tab', { name: 'PULSE', exact: true }).click();
  await expect(page.locator('#hpv2_friend_pulse_color_mode-label')).toHaveCount(0);
  await page.getByRole('checkbox', {
    name: 'Use custom ally pulse color'
  }).click();
  await expect(page.locator('#hpv2_friend_pulse_color_mode-label')).toBeVisible();

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

test('serves original V2 at the homepage and /v2/ while keeping HPv2 separate', async ({ page }) => {
  await page.goto('.');
  await expect(page).toHaveTitle('HP Colors Preset Builder V2');
  await chooseRewriteTarget(page);
  await expect(page.getByRole('option', { name: /OVERVIEW/ })).toBeVisible();

  await page.goto('v2/');
  await expect(page).toHaveTitle('HP Colors Preset Builder V2');
  await expect(page.getByRole('link', { name: 'HPv2 preview builder' })).toHaveAttribute('href', /hpv2\/$/);

  await page.goto('hpv2/');
  await expect(page).toHaveTitle('HP Colors Preset Builder HPv2');
  await expect(page).toHaveURL(/\/hp-colors-preset-builder\/hpv2\/$/);
  await expect(page.getByRole('link', { name: 'Original V2 builder' })).toHaveAttribute('href', /v2\/$/);
});

test('v2 mirrors the in-game category and page navigation', async ({ page }) => {
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);

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
  await expect(page.getByRole('button', { name: 'Convert VPK' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export profiles' })).toBeVisible();
});

test('v2 rewrite profiles build a priority-safe pak01 and retain code-copy controls', async ({ page }) => {
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
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);
  await openV2Presets(page);
  await page.locator('.hero-selector-trigger').click();
  await expect(page.getByRole('option', { name: 'Hero select off', exact: true })).toHaveCount(0);
  await page.locator('.hero-selector-trigger').click();

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
  const warning = page.getByRole('dialog', { name: /^Confirm .* preset VPK$/ });
  await expect(warning).toBeVisible();
  await expect(warning.getByRole('button', { name: 'Confirm build' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await warning.getByRole('button', { name: 'Confirm build' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pak01_dir.vpk');
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
  await expect(page.locator('.status-card')).toContainText(/Built pak01_dir\.vpk for hp_colors_rewrite/);
});

for (const width of [1460, 390]) {
  test(`HPv2 target choices persist and build the matching package without install acknowledgement at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('hpv2/');
    const variants = [
      { title: 'Rewritev2 + ShowRanks', read: readRewriteShowranksPresetCode, runtime: 'showrank_barebones' },
      { title: 'Rewritev2', read: readRewritePresetCode, runtime: 'hp_colors_rewrite_v2' },
      { title: 'Rewritev2 + QOLLOCK', read: readRewriteQollockPresetCode, runtime: 'QOLLOCK' }
    ];
    for (const [index, variant] of variants.entries()) {
      const picker = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
      if (index > 0) await page.locator('.target-mode-trigger').click();
      await expect(picker).toBeVisible();
      const choice = picker.locator('.target-mode-choice-select').filter({
        has: page.locator('strong', { hasText: new RegExp(`^${variant.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
      });
      await choice.click();
      await expect(picker).toBeHidden();
      await expect(page.locator('.target-mode-trigger')).toContainText(variant.title);
      await expect(page.getByRole('button', { name: /Showranks compatible/ })).toHaveCount(0);
      if (index === 0) {
        await openV2Presets(page);
        await page.getByRole('button', { name: 'Import game preset codes' }).click();
        await page.locator('#importText').fill(REWRITE_PRESET);
        await page.getByRole('button', { name: 'Import codes' }).click();
        await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');
      }
      await page.reload();
      await expect(page.locator('.target-mode-trigger')).toContainText(variant.title);
      await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');
      await page.locator('.target-mode-trigger').click();
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await picker.getByRole('button', { name: 'Cancel', exact: true }).last().click();

      await page.getByRole('button', { name: 'Build VPK', exact: true }).click();
      const warning = page.getByRole('dialog', { name: /^Confirm .* preset VPK$/ });
      await expect(warning).toContainText(variant.title);
      await expect(warning).toContainText(variant.runtime);
      await expect(warning).toContainText(/restart/i);
      await expect(warning.getByRole('button', { name: /I installed|Undo.*confirmation/i })).toHaveCount(0);
      const confirm = warning.getByRole('button', { name: 'Confirm build', exact: true });
      await expect(confirm).toBeEnabled();
      const viewport = await warning.locator('.build-warning-panel').boundingBox();
      expect(viewport.x).toBeGreaterThanOrEqual(0);
      expect(viewport.x + viewport.width).toBeLessThanOrEqual(width);
      const downloaded = page.waitForEvent('download');
      await confirm.click();
      const download = await downloaded;
      expect(download.suggestedFilename()).toBe('pak01_dir.vpk');
      const archive = readVpkArchive(new Uint8Array(await readFile(await download.path())));
      expect(archive.files.map((file) => file.path)).toEqual([REWRITE_PRESET_ARCHIVE_PATH]);
      const presetCode = variant.read(archive.files[0].bytes);
      expect(JSON.parse(presetCode.slice(6)).records.some((record) => record.name === 'Shiv 🚀')).toBe(true);
      await page.reload();
    }
  });
}

test('HPv2 rewrite imports persist across reload', async ({ page }) => {
  await page.goto('hpv2/');
  await chooseRewriteTarget(page);
  await expect(page.locator('#presetName')).toHaveValue('Web Builder Preset');
  await openV2Presets(page);
  await page.getByRole('button', { name: 'Import game preset codes' }).click();
  await page.locator('#importText').fill(REWRITE_PRESET);
  await page.getByRole('button', { name: 'Import codes' }).click();
  await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');

  await page.reload();
  await expect(page.locator('#presetName')).toHaveValue('Shiv 🚀');
});
