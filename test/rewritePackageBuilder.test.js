import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRewritePresetPackage,
  buildRewriteShowranksPresetPackage,
  encodeUtf16Hex,
  inspectRewritePresetTemplate,
  inspectRewriteShowranksPresetTemplate,
  readRewritePresetCode,
  readRewriteShowranksPresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_PRESET_CONTRACT,
  REWRITE_PRESET_CONTRACT_VERSION,
  REWRITE_PRESET_STORE_LABEL_CLASS,
  REWRITE_PRESET_STORE_LABEL_ID,
  REWRITE_PRESET_STORE_PANEL_ID,
  validateRewritePresetTemplate,
  validateRewritePresetVpk,
  validateRewriteShowranksPresetVpk
} from "../src/rewritePackageBuilder.js";
import { createVpkArchive, readVpkArchive, writeVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_PATH = new URL("../public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml", import.meta.url);
const PRESET_CODE = `HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Unicode ${String.fromCodePoint(0x1f680)} / \\"safe\\"","mode":"all","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"user_0001"}`;

const templateText = await readFile(TEMPLATE_PATH, "utf8");

test("XML template has the stable rewrite layout contract and one empty hidden store label", () => {
  const inspected = validateRewritePresetTemplate(templateText);
  assert.equal(inspected.contract, REWRITE_PRESET_CONTRACT);
  assert.equal(inspected.contractVersion, REWRITE_PRESET_CONTRACT_VERSION);
  assert.equal(inspected.storePanelId, REWRITE_PRESET_STORE_PANEL_ID);
  assert.equal(inspected.labelId, REWRITE_PRESET_STORE_LABEL_ID);
  assert.match(inspected.labelClass, new RegExp(`\\b${REWRITE_PRESET_STORE_LABEL_CLASS}\\b`));
  assert.equal(inspected.labelText, "");
  assert.deepEqual(inspected.scriptIncludes, [
    "s2r://panorama/scripts/hp_colors_contract.vjs_c",
    "s2r://panorama/scripts/hp_colors_state.vjs_c",
    "s2r://panorama/scripts/hp_colors_menu.vjs_c"
  ]);
  assert.doesNotMatch(templateText, /anita/i);
  assert.doesNotMatch(templateText, /hp_colors_builder_presets|base_hud/i);
});

test("rewrite template loads the shared settings contract and preserves native Escape fallback", () => {
  assert.match(
    templateText,
    /<include src="s2r:\/\/panorama\/scripts\/hp_colors_contract\.vjs_c" \/>\s*<include src="s2r:\/\/panorama\/scripts\/hp_colors_state\.vjs_c" \/>/
  );
  assert.match(
    templateText,
    /<CitadelHudEscapeMenu onload="\$\.HPColorsMenuBoot\(\)" oncancel="if \(!\$\.HPColorsMenuCancel\(\)\) CitadelResumePlaying\(\)">/
  );
});

test("rewrite template keeps the native menu entry and shared threshold ownership", () => {
  const entryIndex = templateText.indexOf('<Button id="HPColorsMenuButton" class="nav_menu_item minor">');
  const feedbackIndex = templateText.indexOf('id="PlayerFeedback"');
  const settingsIndex = templateText.indexOf('<Panel class="SettingsRow">');

  assert.ok(feedbackIndex >= 0 && feedbackIndex < entryIndex);
  assert.ok(entryIndex >= 0 && entryIndex < settingsIndex);
  assert.match(
    templateText,
    /<Button id="HPColorsMenuButton" class="nav_menu_item minor">\s*<Label text="HP COLORS" class="menuButtonLabel" \/>\s*<\/Button>/
  );
  assert.doesNotMatch(templateText, /HPColorsMenuAccent|HPColorsMenuSwatch|HPColorsMenuBinding/);
  assert.match(templateText, /id="HPColorsSharedLowThresholdSliderHost"/);
  assert.match(templateText, /id="HPColorsSharedHighThresholdSliderHost"/);
  assert.doesNotMatch(templateText, /id="HPColorsLowThresholdSliderHost"|id="HPColorsHighThresholdSliderHost"/);
});

test("rewrite package compiles exactly one hud_escape_menu XML layout and round-trips HPCRP1", () => {
  const built = buildRewritePresetPackage({ templateText, presetCode: PRESET_CODE });
  const archive = readVpkArchive(built.vpkBytes);
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.equal(readRewritePresetCode(archive.files[0].bytes), PRESET_CODE);
  assert.equal(built.presetCode, PRESET_CODE);
  assert.match(built.sourceText, /HPColorsRewritePresetStore/);
  assert.match(built.sourceText, /hp_colors_rewrite_preset_contract="HPCRP1"/);
  assert.match(built.sourceText, /hp_colors_rewrite_preset_version="1"/);
  assert.match(built.sourceText, new RegExp(`text="${encodeUtf16Hex(PRESET_CODE)}"`));
  assert.doesNotMatch(built.sourceText, /hp_colors_builder_presets|base_hud|anita/i);
  assert.equal(validateRewritePresetVpk(built.vpkBytes).files.length, 1);
});

test("rewrite package preserves Unicode code units in the XML label", () => {
  const code = PRESET_CODE.replace("safe", "quoted \\\\ path");
  const built = buildRewritePresetPackage({ templateText, presetCode: code });
  assert.equal(readRewritePresetCode(built.bytes), code);
  assert.match(built.sourceText, new RegExp(`text="${encodeUtf16Hex(code)}"`));
});

test("rewrite package rejects stale, malformed, populated, and incompatible XML templates", () => {
  assert.throws(() => validateRewritePresetTemplate(templateText.replace("hp_colors_rewrite_preset_version=\"1\"", "hp_colors_rewrite_preset_version=\"2\"")), /stale or incompatible/);
  assert.throws(() => validateRewritePresetTemplate(templateText.replace("hp_colors_menu.vjs_c", "hp_colors_builder_presets.vjs_c")), /stale or incompatible/);
  assert.throws(() => validateRewritePresetTemplate(templateText.replace("HPColorsRewritePresetStore", "OtherStore")), /exactly one HPColorsRewritePresetStore/);
  assert.throws(
    () => validateRewritePresetTemplate(
      templateText.replace(
        'oncancel="if (!$.HPColorsMenuCancel()) CitadelResumePlaying()"',
        'oncancel="$.HPColorsMenuCancel()"'
      )
    ),
    /lifecycle contract is stale or incompatible/
  );
  assert.throws(
    () => validateRewritePresetTemplate(
      templateText.replace(
        /(<Label id="HPColorsRewritePreset_001"[\s\S]*?\btext=)""/,
        '$1"0001"'
      )
    ),
    /must be empty/
  );
  assert.throws(() => validateRewritePresetTemplate(templateText.replace("</root>", "</root><root />")), /exactly one root/);
  assert.throws(() => buildRewritePresetPackage({ templateText, presetCode: "HPCR2[]" }), /HPCRP1/);
  assert.throws(() => buildRewritePresetPackage({ templateText, presetCode: `HPCRP1${"x".repeat(64 * 1024)}` }), /Invalid HPCRP1 code|64 KiB/);
});

test("rewrite VPK rejects any asset besides the XML layout", () => {
  const built = buildRewritePresetPackage({ templateText, presetCode: PRESET_CODE });
  const extra = writeVpkArchive(createVpkArchive([
    { path: REWRITE_PRESET_ARCHIVE_PATH, bytes: built.bytes },
    { path: "panorama/scripts/other.vjs_c", bytes: new Uint8Array([1]) }
  ]));
  assert.throws(() => validateRewritePresetVpk(extra), /exactly one file/);
  const wrong = writeVpkArchive(createVpkArchive([{ path: "panorama/layout/base_hud.vxml_c", bytes: built.bytes }]));
  assert.throws(() => validateRewritePresetVpk(wrong), /unexpected file/);
});

test("showranks package merges the ShowRank escape-menu hooks and round-trips HPCRP1", () => {
  const built = buildRewriteShowranksPresetPackage({ templateText, presetCode: PRESET_CODE });
  assert.match(built.sourceText, /<include src="s2r:\/\/panorama\/scripts\/showrank_barebones\.vjs_c" \/>/);
  assert.match(
    built.sourceText,
    /<CitadelHudEscapeMenu onload="\$\.HPColorsMenuBoot\(\); if \(\$\.ShowRankBarebonesEscapeOpen\) \$\.ShowRankBarebonesEscapeOpen\(\);" oncancel="if \(!\$\.HPColorsMenuCancel\(\)\) CitadelResumePlaying\(\)" onmouseover="if \(\$\.ShowRankBarebonesEscapeOpen\) \$\.ShowRankBarebonesEscapeOpen\(\);" onmouseout="if \(\$\.ShowRankBarebonesEscapeOut\) \$\.ShowRankBarebonesEscapeOut\(\);">/
  );
  const inspected = inspectRewriteShowranksPresetTemplate(built.sourceText, { requireEmpty: false });
  assert.deepEqual(inspected.scriptIncludes, [
    "s2r://panorama/scripts/hp_colors_contract.vjs_c",
    "s2r://panorama/scripts/hp_colors_state.vjs_c",
    "s2r://panorama/scripts/hp_colors_menu.vjs_c",
    "s2r://panorama/scripts/showrank_barebones.vjs_c"
  ]);
  assert.equal(readRewriteShowranksPresetCode(built.bytes), PRESET_CODE);
  assert.equal(validateRewriteShowranksPresetVpk(built.vpkBytes).files.length, 1);
});

test("canonical rewrite contract rejects the showranks layout and vice versa", () => {
  const built = buildRewriteShowranksPresetPackage({ templateText, presetCode: PRESET_CODE });
  assert.throws(() => validateRewritePresetVpk(built.vpkBytes), /stale or incompatible/);
  assert.throws(() => validateRewritePresetTemplate(built.sourceText), /stale or incompatible/);
  const plain = buildRewritePresetPackage({ templateText, presetCode: PRESET_CODE });
  assert.throws(() => validateRewriteShowranksPresetVpk(plain.vpkBytes), /stale or incompatible/);
});

test("showranks merge rejects templates whose canonical anchors drifted", () => {
  assert.throws(
    () => buildRewriteShowranksPresetPackage({
      templateText: templateText.replace('onload="$.HPColorsMenuBoot()"', 'onload="$.OtherBoot()"'),
      presetCode: PRESET_CODE
    }),
    /lifecycle contract is stale or incompatible/
  );
  assert.throws(
    () => buildRewriteShowranksPresetPackage({
      templateText: templateText.replace("hp_colors_menu.vjs_c", "hp_colors_other.vjs_c"),
      presetCode: PRESET_CODE
    }),
    /stale or incompatible/
  );
});
