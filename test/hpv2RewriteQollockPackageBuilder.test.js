import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRewriteQollockPresetPackage,
  encodeUtf16Hex,
  inspectRewriteQollockPresetTemplate,
  readRewriteQollockPresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_TOPBAR_ARCHIVE_PATH,
  REWRITE_QOLLOCK_TOPBAR_TEMPLATE_PATH,
  REWRITE_SHOWRANKS_TOPBAR_TEMPLATE_PATH,
  REWRITE_PRESET_CONTRACT,
  REWRITE_PRESET_CONTRACT_VERSION,
  REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
  REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
  REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
  validateRewriteQollockPresetTemplate,
  validateRewriteQollockPresetVpk,
  REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME
} from "../src/hpv2RewritePackageBuilder.js";
import { compileSource2Resource, extractSource2Resource, SOURCE2_RESOURCE_CODECS } from "../src/source2ResourceCodec.js";
import { readVpkArchive, writeVpkArchive, createVpkArchive } from "../src/vpkArchive.js";
const TOPBAR_PATH = new URL(`../public/${REWRITE_QOLLOCK_TOPBAR_TEMPLATE_PATH}`, import.meta.url);
const SHOWRANKS_TOPBAR_PATH = new URL(`../public/${REWRITE_SHOWRANKS_TOPBAR_TEMPLATE_PATH}`, import.meta.url);

const TEMPLATE_PATH = new URL("../public/templates/hpv2_hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml", import.meta.url);
const topbarTemplateText = await readFile(TOPBAR_PATH, "utf8");
const showranksTopbarTemplateText = await readFile(SHOWRANKS_TOPBAR_PATH, "utf8");
const PRESET_CODE = `HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"QOLLOCK composite","mode":"all","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"user_0001"}`;
const templateText = await readFile(TEMPLATE_PATH, "utf8");

function hasId(id) {
  return new RegExp(`(?:id|class)="${id}"`).test(templateText);
}

test("Rewrite QOLLOCK template mirrors the composite include and panel contract", () => {
  const inspected = validateRewriteQollockPresetTemplate(templateText);
  assert.equal(inspected.contract, REWRITE_PRESET_CONTRACT);
  assert.equal(inspected.contractVersion, REWRITE_PRESET_CONTRACT_VERSION);
  assert.equal(inspected.labelText, "");
  assert.deepEqual(inspected.styleIncludes, REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES);
  assert.deepEqual(inspected.scriptIncludes, REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES);
  for (const id of REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS) assert.equal(hasId(id), true, id);
  assert.match(templateText, /hp_colors_v2_menu\.vcss_c/);
  assert.match(templateText, /hp_colors_v2_contract\.vjs_c/);
  assert.match(templateText, /hp_colors_v2_state\.vjs_c/);
  assert.match(templateText, /hp_colors_v2_menu\.vjs_c/);
  assert.doesNotMatch(templateText, /(?:styles|scripts)\/hp_colors_(?:menu|contract|state)\.v(?:css|js)_c/);
  // QOLLOCK 4.0 (pak60) defines $.ToggleSettingsWindow in ui/window; the bridge must load after it.
  const windowIndex = inspected.scriptIncludes.indexOf("s2r://panorama/scripts/ui/window.vjs_c");
  const bridgeIndex = inspected.scriptIncludes.indexOf("s2r://panorama/scripts/qollock_hp_colors_bridge.vjs_c");
  assert.ok(windowIndex >= 0 && windowIndex < bridgeIndex);
  assert.ok(inspected.scriptIncludes.includes("s2r://panorama/scripts/core/ql_namespace.vjs_c"));

  const qolIndex = templateText.indexOf('<Button id="ModSettingsBtn"');
  const hpIndex = templateText.indexOf('<Button id="HPColorsMenuButton"');
  assert.ok(qolIndex >= 0 && qolIndex < hpIndex);
  assert.match(templateText, /<Label text="QOL LOCK" class="menuButtonLabel" \/>/);
  assert.match(templateText, /<Label text="HP COLORS V2" class="menuButtonLabel" \/>/);
  assert.match(templateText, /<Panel id="SettingsWindow"/);
  assert.match(templateText, /<Panel id="HPColorsEditorRoot"/);
  assert.match(
    templateText,
    /<CitadelHTMLPanel id="HPColorsSupporterTicker"[^>]*hittest="false"[^>]*acceptsfocus="false"/
  );
  for (const id of ["newgame", "watchgame", "guides"]) {
    assert.match(templateText, new RegExp(`id="${id}"`), id);
  }
  assert.match(
    templateText,
    /<Panel class="SettingsRow">\s*<Button id="ModSettingsBtn"[\s\S]*?<\/Button>\s*<\/Panel>\s*<Panel class="SettingsRow">\s*<Button id="HPColorsMenuButton"[\s\S]*?<\/Button>\s*<\/Panel>/
  );
  assert.doesNotMatch(templateText, /qollock_settings_guard\.vjs_c/);
  assert.doesNotMatch(templateText, /anita|hp_colors_builder_presets|base_hud/i);
  assert.equal((templateText.match(/&amp;&amp;/g) || []).length, 2);
  assert.doesNotMatch(
    templateText,
    /&(?!amp;|apos;|quot;|lt;|gt;|#\d+;|#x[\da-f]+;)/i
  );
});

test("Rewrite QOLLOCK package compiles both layouts and round-trips HPCRP1", () => {
  const built = buildRewriteQollockPresetPackage({
    templateText,
    topbarTemplateText,
    presetCode: PRESET_CODE
  });
  const archive = readVpkArchive(built.vpkBytes);
  assert.equal(REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME, "pak01_dir.vpk");
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_TOPBAR_ARCHIVE_PATH, REWRITE_PRESET_ARCHIVE_PATH]);
  const escapeFile = archive.files.find((file) => file.path === REWRITE_PRESET_ARCHIVE_PATH);
  const topbarFile = archive.files.find((file) => file.path === REWRITE_TOPBAR_ARCHIVE_PATH);
  assert.equal(readRewriteQollockPresetCode(escapeFile.bytes), PRESET_CODE);
  const topbarText = extractSource2Resource({ bytes: topbarFile.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  assert.equal(topbarText, topbarTemplateText);
  assert.equal(built.topbarSourceText, topbarTemplateText);
  assert.match(built.sourceText, new RegExp(`text="${encodeUtf16Hex(PRESET_CODE)}"`));
  assert.match(built.sourceText, /id="HPColorsAllyTeamHighToggle"/);
  for (const id of ["TeamSPMDisplay_friendly", "TeamSPMDisplay_enemy", "BuffHUD", "RejuvHUD", "RejuvBuff", "Buff", "Rejuv"]) {
    assert.match(topbarText, new RegExp(`id="${id}"`), id);
  }
  assert.doesNotMatch(topbarText, /ShowRankBarebonesNotificationRoot|showrank_barebones_topbar\.vcss_c/);
  assert.equal(validateRewriteQollockPresetVpk(built.vpkBytes).files.length, 2);
});

test("Rewrite QOLLOCK package requires and validates its target topbar layout", () => {
  assert.throws(
    () => buildRewriteQollockPresetPackage({ templateText, presetCode: PRESET_CODE }),
    /requires topbarTemplateText/
  );
  const built = buildRewriteQollockPresetPackage({
    templateText,
    topbarTemplateText,
    presetCode: PRESET_CODE
  });
  const extra = writeVpkArchive(createVpkArchive([
    { path: REWRITE_PRESET_ARCHIVE_PATH, bytes: built.bytes },
    { path: REWRITE_TOPBAR_ARCHIVE_PATH, bytes: built.topbarBytes },
    { path: "panorama/scripts/qollock_hp_colors_bridge.vjs_c", bytes: new Uint8Array([1]) }
  ]));
  assert.throws(() => validateRewriteQollockPresetVpk(extra), /exactly two files/);
  const wrongPath = writeVpkArchive(createVpkArchive([
    { path: REWRITE_PRESET_ARCHIVE_PATH, bytes: built.bytes },
    { path: "panorama/layout/base_hud.vxml_c", bytes: built.topbarBytes }
  ]));
  assert.throws(() => validateRewriteQollockPresetVpk(wrongPath), /unexpected file/);
  const showranksTopbarBytes = compileSource2Resource({
    sourceText: showranksTopbarTemplateText,
    codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT
  });
  const contaminated = writeVpkArchive(createVpkArchive([
    { path: REWRITE_PRESET_ARCHIVE_PATH, bytes: built.bytes },
    { path: REWRITE_TOPBAR_ARCHIVE_PATH, bytes: showranksTopbarBytes }
  ]));
  assert.throws(() => validateRewriteQollockPresetVpk(contaminated), /incompatible target markers/);
  assert.throws(
    () => validateRewriteQollockPresetTemplate(templateText.replace("qollock_hp_colors_bridge.vjs_c", "hp_colors_menu.vjs_c")),
    /stale or incompatible/
  );
  for (const id of REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS) {
    assert.throws(
      () => validateRewriteQollockPresetTemplate(templateText.replace(`id="${id}"`, `id="Missing${id}"`)),
      /panel contract is stale or incompatible|must contain exactly one HPColorsRewritePresetStore panel/
    );
  }
  assert.throws(
    () => inspectRewriteQollockPresetTemplate(templateText.replace('<Button id="ModSettingsBtn"', '<Button id="OtherSettingsBtn"')),
    /panel contract is stale or incompatible/
  );
});
