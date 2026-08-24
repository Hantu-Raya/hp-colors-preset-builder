import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRewriteQollockPresetPackage,
  encodeUtf16Hex,
  inspectRewriteQollockPresetTemplate,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_PRESET_CONTRACT,
  REWRITE_PRESET_CONTRACT_VERSION,
  REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
  REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
  REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
  readRewriteQollockPresetCode,
  validateRewriteQollockPresetTemplate,
  validateRewriteQollockPresetVpk,
  REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME
} from "../src/rewritePackageBuilder.js";
import { readVpkArchive, writeVpkArchive, createVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_PATH = new URL("../public/templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml", import.meta.url);
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

  const qolIndex = templateText.indexOf('<Button id="ModSettingsBtn"');
  const hpIndex = templateText.indexOf('<Button id="HPColorsMenuButton"');
  assert.ok(qolIndex >= 0 && qolIndex < hpIndex);
  assert.match(templateText, /<Label text="QOL LOCK" class="menuButtonLabel" \/>/);
  assert.match(templateText, /<Label text="HP COLORS" class="menuButtonLabel" \/>/);
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
});

test("Rewrite QOLLOCK package emits one composite layout and round-trips HPCRP1", () => {
  const built = buildRewriteQollockPresetPackage({ templateText, presetCode: PRESET_CODE });
  const archive = readVpkArchive(built.vpkBytes);
  assert.equal(REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME, "pak01_dir.vpk");
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.equal(readRewriteQollockPresetCode(archive.files[0].bytes), PRESET_CODE);
  assert.equal(built.presetCode, PRESET_CODE);
  assert.match(built.sourceText, new RegExp(`text="${encodeUtf16Hex(PRESET_CODE)}"`));
  assert.match(built.sourceText, /id="HPColorsAllyTeamHighToggle"/);
  assert.equal(validateRewriteQollockPresetVpk(built.vpkBytes).files.length, 1);
});

test("Rewrite QOLLOCK VPK rejects runtime assets and stale composite layouts", () => {
  const built = buildRewriteQollockPresetPackage({ templateText, presetCode: PRESET_CODE });
  const extra = writeVpkArchive(createVpkArchive([
    { path: REWRITE_PRESET_ARCHIVE_PATH, bytes: built.bytes },
    { path: "panorama/scripts/qollock_hp_colors_bridge.vjs_c", bytes: new Uint8Array([1]) }
  ]));
  assert.throws(() => validateRewriteQollockPresetVpk(extra), /exactly one file/);
  assert.throws(
    () => validateRewriteQollockPresetTemplate(templateText.replace("qollock_hp_colors_bridge.vjs_c", "hp_colors_menu.vjs_c")),
    /stale or incompatible/
  );
  for (const id of ["HPColorsReadoutMaxTeamColorToggle", "HPColorsAllyTeamHighToggle"]) {
    assert.throws(
      () => validateRewriteQollockPresetTemplate(templateText.replace(`id="${id}"`, `id="Missing${id}"`)),
      /panel contract is stale or incompatible/
    );
  }
  assert.throws(
    () => inspectRewriteQollockPresetTemplate(templateText.replace('<Button id="ModSettingsBtn"', '<Button id="OtherSettingsBtn"')),
    /panel contract is stale or incompatible/
  );
});
