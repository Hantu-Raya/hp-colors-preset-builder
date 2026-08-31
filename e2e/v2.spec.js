import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHpMenuGroups } from '../src/hpv2HpMenuNavigation.js';
import { REWRITE_FIELD_CATALOG } from '../src/hpv2HpSchema.js';
import { extractSource2Resource, SOURCE2_RESOURCE_CODECS } from '../src/source2ResourceCodec.js';
import { encodeUtf16Hex, readRewritePresetCode, REWRITE_PRESET_ARCHIVE_PATH, REWRITE_PRESET_TEMPLATE_PATH } from '../src/hpv2RewritePackageBuilder.js';
import { readVpkArchive } from '../src/vpkArchive.js';

const REWRITE_PRESET = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv 🚀","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

const REWRITE_TEMPLATE_URL = new URL('../public/templates/hpv2_hp_colors_rewrite/panorama/layout/hud_escape_menu.xml', import.meta.url);

const KOFI_SCRIPT_URL = 'https://cdn.ko-fi.tools/v2/js/leaderboard.js';
const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const STATIC_SUPPORTER_LABEL = 'Ko-fi top supporters: 1 civo $100, 2 dacooder $20, 3 www.skillnshred.com $20, 4 DimpuMudit $17, 5 Ko-fi Supporter $10, 6 oOBansh33 $10, 7 greggey $5, 8 Ko-fi Supporter $5, 9 Timmcd $5';
const STATIC_SUPPORTER_TEXT = [
  '1civo$100',
  '2dacooder$20',
  '3www.skillnshred.com$20',
  '4DimpuMudit$17',
  '5Ko-fi Supporter$10',
  '6oOBansh33$10',
  '7greggey$5',
  '8Ko-fi Supporter$5',
  '9Timmcd$5'
];

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
  await dialog.getByRole('button', { name: /^Rewrite Preset VPK/ }).click();
  await expect(dialog).toBeHidden();
}

async function chooseRewriteQollockTarget(page) {
  const dialog = page.getByRole('dialog', { name: 'Choose your HP Colors mod' });
  await expect(dialog).toBeVisible();
  await dialog.locator('.target-mode-choice-select').filter({ hasText: 'Rewrite + QOLLOCK' }).click();
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

test('supporter strip holds donor one and resets through a protected transition', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') externalRequests.push(request.url());
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('supporters-strip/');

  const strip = page.locator('.supporter-strip');
  const track = strip.locator('.supporter-strip-track');
  const cycles = track.locator('.supporter-strip-cycle');
  const primary = cycles.nth(0);
  const duplicate = cycles.nth(1);
  const primarySequence = primary.locator('.supporter-strip-sequence');
  const duplicateSequence = duplicate.locator('.supporter-strip-sequence');
  const thanks = primary.locator('.supporter-strip-thanks');
  await expect(strip).toBeVisible();
  await expect(cycles).toHaveCount(2);
  await expect(primarySequence.locator('.supporter-strip-item')).toHaveCount(9);
  expect(await primarySequence.locator('.supporter-strip-item').allTextContents()).toEqual(
    STATIC_SUPPORTER_TEXT,
  );
  expect(await duplicateSequence.locator('.supporter-strip-item').allTextContents()).toEqual(
    STATIC_SUPPORTER_TEXT,
  );
  await expect(primary.locator('.supporter-strip-thanks')).toHaveCount(1);
  await expect(duplicate.locator('.supporter-strip-thanks')).toHaveCount(1);
  await expect(thanks).toContainText('Thank you for supporting');
  await expect(thanks).not.toContainText('HP COLORS COMMUNITY');
  await expect(thanks.locator('.supporter-strip-thanks-copy')).toHaveCSS(
    'font-family',
    /VALVEOracle/,
  );
  await expect(track).toHaveCSS('animation-name', 'supporter-strip-scroll');
  await expect(track).toHaveCSS('animation-duration', '32s');
  await expect(track).toHaveCSS('animation-iteration-count', '1');
  await expect(strip).toHaveCSS('background-color', 'rgb(25, 30, 23)');
  await expect(strip).toHaveCSS(
    'background-image',
    /supporters-strip-header(?:\.[^"/)]+)?\.png/,
  );

  const loop = await track.evaluate((element) => {
    const [animation] = element.getAnimations();
    const keyframes = animation.effect.getKeyframes();
    const duration = animation.effect.getTiming().duration;
    const stripBox = element.parentElement.getBoundingClientRect();
    const primaryFirstDonor = element.querySelector(
      '[data-cycle="primary"] .supporter-strip-item',
    );
    const primaryThanks = element.querySelector('[data-cycle="primary"] .supporter-strip-thanks');
    const duplicateFirstDonor = element.querySelector(
      '[data-cycle="duplicate"] .supporter-strip-item',
    );
    animation.pause();
    animation.currentTime = 0;
    const startDonorBox = primaryFirstDonor.getBoundingClientRect();
    animation.currentTime = 1_999;
    const heldDonorBox = primaryFirstDonor.getBoundingClientRect();
    animation.currentTime = duration * keyframes[2].offset;
    const holdStartTransform = getComputedStyle(element).transform;
    animation.currentTime = duration * keyframes[3].offset;
    const holdEndTransform = getComputedStyle(element).transform;
    animation.currentTime = 29_500;
    const transitionTransform = getComputedStyle(element).transform;
    const transitionThanksBox = primaryThanks.getBoundingClientRect();
    const transitionDonorBox = duplicateFirstDonor.getBoundingClientRect();
    animation.currentTime = duration - 1;
    const endDonorBox = duplicateFirstDonor.getBoundingClientRect();
    element.dispatchEvent(
      new AnimationEvent('animationend', { animationName: 'supporter-strip-scroll' }),
    );
    const [restartedAnimation] = element.getAnimations();
    return {
      duration,
      initialHoldDuration: duration * keyframes[1].offset,
      holdDuration: duration * (keyframes[3].offset - keyframes[2].offset),
      transitionDuration: duration * (1 - keyframes[3].offset),
      holdStartTransform,
      holdEndTransform,
      transitionTransform,
      startDonorX: startDonorBox.x,
      heldDonorX: heldDonorBox.x,
      transitionThanksX: transitionThanksBox.x,
      transitionThanksRight: transitionThanksBox.right,
      transitionDonorX: transitionDonorBox.x,
      stripX: stripBox.x,
      stripRight: stripBox.right,
      endDonorX: endDonorBox.x,
      restarted: restartedAnimation !== animation,
      restartTime: restartedAnimation.currentTime
    };
  });
  expect(loop.duration).toBe(32_000);
  expect(loop.initialHoldDuration).toBeCloseTo(2_000, 2);
  expect(loop.holdDuration).toBeCloseTo(3_000, 2);
  expect(loop.transitionDuration).toBeCloseTo(5_000, 2);
  expect(Math.abs(loop.startDonorX - loop.stripX)).toBeLessThanOrEqual(1);
  expect(Math.abs(loop.heldDonorX - loop.stripX)).toBeLessThanOrEqual(1);
  expect(loop.holdEndTransform).toBe(loop.holdStartTransform);
  expect(loop.transitionTransform).not.toBe(loop.holdEndTransform);
  expect(loop.transitionThanksX).toBeLessThan(loop.stripX);
  expect(loop.transitionDonorX - loop.transitionThanksRight).toBeGreaterThanOrEqual(90);
  expect(loop.transitionDonorX).toBeGreaterThan(loop.stripX);
  expect(loop.transitionDonorX).toBeLessThan(loop.stripRight);
  expect(Math.abs(loop.endDonorX - loop.stripX)).toBeLessThanOrEqual(1);
  expect(loop.restarted).toBe(true);
  expect(loop.restartTime).toBeLessThan(100);
  await expect(strip.locator('a, button, input, form')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
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
  await expect(supporterItems).toHaveCount(9);
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
  expect(Math.abs((readout.x + readout.width / 2) - (bar.x + bar.width / 2))).toBeLessThanOrEqual(8);
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

test('v2 plain Rewrite target requires explicit preview conversion', async ({ page }) => {
  await page.goto('hpv2/');
  await clearPreviewStorage(page);
  await chooseRewriteTarget(page);

  const preview = page.locator('.healthbar-preview');
  await expect(preview.locator('.healthbar-preview-status')).toHaveText('Conversion required');
  await expect(preview.locator('#healthbar-preview-health')).toHaveCount(0);

  const convert = preview.getByRole('button', { name: 'Convert to Rewrite', exact: true });
  await expect(convert).toBeVisible();
  await convert.click();

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
  await expect(page.getByRole('button', { name: 'Convert VPK' })).toBeVisible();
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
  await expect(page.getByText(/will build pak01_dir\.vpk for hp_colors_rewrite/)).toBeVisible();

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
