import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const v1IslandPath = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);
const v2IslandPath = new URL("../src/components/PresetBuilderV2Island.jsx", import.meta.url);
const v2TreePath = new URL("../src/components/schema-tree-v2.jsx", import.meta.url);
const v2PagePath = new URL("../src/pages/v2.astro", import.meta.url);
const rewriteTemplatePath = new URL("../public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml", import.meta.url);
const rewriteQollockTemplatePath = new URL("../public/templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml", import.meta.url);
const oldRewriteScriptPath = new URL("../public/templates/hp_colors_rewrite/panorama/scripts/hp_colors_builder_presets.js", import.meta.url);
const oldRewriteCompiledPath = new URL("../public/templates/hp_colors_rewrite/panorama/scripts/hp_colors_builder_presets.vjs_c", import.meta.url);

test("v1 and v2 link to separate GitHub Pages routes", async () => {
  const [v1Island, v2Island, v2Page] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(v2PagePath, "utf8")
  ]);

  for (const island of [v1Island, v2Island]) {
    assert.match(island, />\s*V1 original\s*</);
    assert.match(island, /import\.meta\.env\.BASE_URL\}v2\//);
    assert.match(island, />\s*V2 game menu\s*</);
  }
  assert.match(v2Page, /PresetBuilderV2Island/);
  assert.match(v2Page, /styles\/v2\.css/);
  assert.match(v2Page, /<title>HP Colors Preset Builder V2<\/title>/);
});

test("v2 owns the in-game menu navigation without changing v1", async () => {
  const [v1Island, v2Island, v2Tree] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(v2TreePath, "utf8")
  ]);

  assert.match(v1Island, /HP_FIELD_CATALOG\.splitCategoryGroups\(\)/);
  assert.doesNotMatch(v1Island, /createHpMenuGroups/);
  assert.match(v2Island, /createHpMenuGroups\(HP_FIELD_CATALOG\.schema\)/);
  assert.match(v2Island, /currentGroup\?\.pageId === 'health-pips-levels'/);
  assert.match(v2Tree, /export function SchemaTabs/);
  assert.match(v2Tree, /aria-label="HP Colors sections"/);
});

test("rewrite transfer and preset actions stay isolated to v2", async () => {
  const [v1Island, v2Island] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8")
  ]);

  assert.doesNotMatch(v1Island, /rewritePresetCodec|HPCRP1|Copy rewrite preset/);
  assert.match(v2Island, /decodeRewriteTransfer/);
  assert.match(v2Island, /createRewriteSettingsCode/);
  assert.match(v2Island, /createRewritePresetCode/);
  assert.match(v2Island, /createRewritePresetBundle/);
  assert.match(v2Island, /runRewritePresetBuildWorkflow/);
  assert.match(v2Island, /createRewritePresetTemplateLoader/);
  assert.match(v2Island, /Build VPK/);
  assert.match(v2Island, />\s*Add preset\s*</);
  assert.match(v2Island, />\s*Remove selected\s*</);
  assert.match(v2Island, /Paste an HPCRP1 preset or bundle/);
  assert.match(v2Island, /Copy all rewrite presets/);
  assert.doesNotMatch(v1Island, /V2_STORAGE_KEY/);
  assert.match(v2Island, /migrateLegacyV2ProfileState\(storage, defaultState\)/);
  assert.match(v2Island, /loadPresetBuilderSession\(storage, defaultState, \{ profileStorageKey: V2_STORAGE_KEY \}\)/);
  assert.match(v2Island, /saveProfileState\(storage, latestProfileSnapshot\.current, V2_STORAGE_KEY\)/);
});

test("rewrite template is XML-only, strict, and stores the hidden HPCRP1 label", async () => {
  const [template, packageBuilder] = await Promise.all([
    readFile(rewriteTemplatePath, "utf8"),
    readFile(new URL("../src/rewritePackageBuilder.js", import.meta.url), "utf8")
  ]);
  assert.match(template, /<root>/);
  assert.match(template, /hp_colors_rewrite_preset_contract="HPCRP1"/);
  assert.match(template, /hp_colors_rewrite_preset_version="1"/);
  assert.match(template, /HPColorsRewritePresetStore/);
  assert.match(template, /HPColorsRewritePreset_001/);
  assert.match(template, /hp_colors_rewrite_preset_entry/);
  assert.match(template, /hp_colors_state\.vjs_c/);
  assert.match(template, /hp_colors_menu\.vjs_c/);
  assert.doesNotMatch(template, /anita|hp_colors_builder_presets|base_hud/i);
  assert.match(packageBuilder, /REWRITE_PRESET_ARCHIVE_PATH/);
  assert.match(packageBuilder, /REWRITE_PRESET_CONTRACT_VERSION/);
  assert.match(packageBuilder, /encodeUtf16Hex/);
  assert.match(packageBuilder, /SOURCE2_RESOURCE_CODECS\.PANORAMA_LAYOUT/);
  assert.doesNotMatch(packageBuilder, /REWRITE_PRESET_TEMPLATE_MARKER|SLOT_CODE_UNITS|VJS template/i);
  await assert.rejects(() => readFile(oldRewriteScriptPath, "utf8"));
  await assert.rejects(() => readFile(oldRewriteCompiledPath));
});

test("Rewrite QOLLOCK is a separate selectable target with a composite template", async () => {
  const [island, targetMode, workflow, template] = await Promise.all([
    readFile(v2IslandPath, "utf8"),
    readFile(new URL("../src/targetModeStore.js", import.meta.url), "utf8"),
    readFile(new URL("../src/presetBuilderWorkflow.js", import.meta.url), "utf8"),
    readFile(rewriteQollockTemplatePath, "utf8")
  ]);
  assert.match(island, /isRewriteQollockTarget/);
  assert.match(island, /runRewriteQollockPresetBuildWorkflow/);
  assert.match(island, /createRewriteQollockPresetTemplateLoader/);
  assert.match(targetMode, /REWRITE_QOLLOCK/);
  assert.match(workflow, /REWRITE_QOLLOCK_PRESET_TEMPLATE_PATH/);
  assert.match(workflow, /REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME/);
  const qolIndex = template.indexOf('<Button id="ModSettingsBtn"');
  const hpIndex = template.indexOf('<Button id="HPColorsMenuButton"');
  assert.ok(qolIndex >= 0 && qolIndex < hpIndex);
  assert.match(template, /<Panel id="SettingsWindow"/);
  assert.match(template, /<Panel id="HPColorsEditorRoot"/);
  assert.doesNotMatch(template, /panorama\/scripts\/.*\.js\b|panorama\/styles\/.*\.css\b/);
});
