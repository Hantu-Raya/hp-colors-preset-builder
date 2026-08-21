import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const v1IslandPath = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);
const v2IslandPath = new URL("../src/components/PresetBuilderV2Island.jsx", import.meta.url);
const healthbarPreviewPath = new URL("../src/components/HealthbarPreview.jsx", import.meta.url);
const v2StylesPath = new URL("../src/styles/v2.css", import.meta.url);
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

  assert.match(v1Island, />\s*V1 original\s*</);
  assert.match(v1Island, />\s*V2 game menu\s*</);
  for (const island of [v1Island, v2Island]) {
    assert.match(island, /import\.meta\.env\.BASE_URL\}v2\//);
  }
  assert.match(v2Island, /aria-label="V1 original builder"/);
  assert.match(v2Island, /aria-label="V2 game menu builder"/);
  assert.match(v2Page, /PresetBuilderV2Island/);
  assert.match(v2Page, /styles\/v2\.css/);
  assert.match(v2Page, /<title>HP Colors Preset Builder V2<\/title>/);
});

test("v2 disables Minimal and uses Rewrite download links without changing v1", async () => {
  const [v1Island, v2Island, targetMode] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(new URL("../src/targetModeStore.js", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(v1Island, /unavailableInV2|downloadHrefV2/);
  assert.match(v2Island, /choice\.unavailableInV2 === true/);
  assert.match(v2Island, /disabled=\{unavailable\}/);
  assert.match(v2Island, /is-unavailable/);
  assert.match(v2Island, />Unavailable in V2</);
  assert.match(v2Island, /'downloadHrefV2' in choice \? choice\.downloadHrefV2 : choice\.downloadHref/);
  assert.match(targetMode, /unavailableInV2: true/);
  assert.match(targetMode, /FileInfo_1792071/);
  assert.match(targetMode, /FileInfo_1792072/);
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

test("v2 topbar opens the preset library directly", async () => {
  const v2Island = await readFile(v2IslandPath, "utf8");

  assert.match(v2Island, /pageId === 'overview-presets'/);
  assert.match(v2Island, /function openPresetLibrary\(\)/);
  assert.match(v2Island, /onClick=\{openPresetLibrary\}/);
  assert.match(v2Island, /aria-current=\{showPresetTools \? 'page' : undefined\}/);
  assert.match(v2Island, />Presets</);
});

test("v2 preview renders only on Rewrite settings pages and keeps state outside the reducer", async () => {
  const [island, preview] = await Promise.all([
    readFile(v2IslandPath, "utf8"),
    readFile(healthbarPreviewPath, "utf8")
  ]);

  assert.match(island, /import HealthbarPreview from '\.\/HealthbarPreview\.jsx'/);
  assert.match(island, /showHealthbarPreview = !showPresetTools/);
  assert.match(island, /anita-page-body has-preview/);
  assert.match(island, /healthbar-preview-rail/);
  assert.match(island, /profileState=\{rewritePreviewState\}/);
  assert.match(island, /conversionRequired=\{previewConversionRequired\}/);
  assert.match(island, /const handlePreviewConvert = useCallback\(\(\) => \{\s*const storage = window\.localStorage;[\s\S]*?setSession\(\(previous\) => \{/);
  assert.match(island, /const targeted = commitPresetBuilderTargetMode\(\{[\s\S]*?targetMode: HP_COLORS_MOD_VARIANTS\.FULL/);
  assert.match(island, /return reducePresetBuilderSession\(targeted, \{ type: 'ENSURE_REWRITE_PROFILES' \}/);
  assert.match(island, /onConvert=\{handlePreviewConvert\}/);
  assert.match(preview, /healingPercent: 0,[\s\S]*damagePercent: 0,[\s\S]*bulletShieldPercent: 0,[\s\S]*techShieldPercent: 0/);
  assert.match(island, /activeCatalog\.variant !== 'rewrite'/);
  assert.match(preview, /onConvert = null/);
  assert.match(preview, /<button type="button" className="primary-action" onClick=\{onConvert\}>Convert to Rewrite<\/button>/);
  assert.match(preview, /createHealthbarPreviewModel\(profileState, scenario, \{ stock: showStock \}\)/);
  assert.match(preview, /sessionStorage/);
  assert.doesNotMatch(preview, /localStorage/);
  assert.match(preview, /healthbar-preview-health/);
  assert.match(preview, /Show stock/);
  assert.match(preview, /onPointerDown=\{onPress\}/);
  assert.match(preview, /onKeyDown=\{handleKeyDown\}/);
  assert.match(preview, /2x inspection/);
  assert.match(preview, /healthbar-preview-scenario/);
  assert.match(preview, /animationPaused/);
  assert.match(preview, /Reset/);
  assert.match(preview, /healthbar-preview-pulse-overlay/);
  assert.match(preview, /hero_healthbar_bg_psd\.png/);
  assert.match(preview, /hero_healthbar_fill_center_psd\.png/);
  assert.match(preview, /hero_healthbar_fill_shield_psd\.png/);
  assert.match(preview, /hero_healthbar_missing_psd\.png/);
  assert.doesNotMatch(island, /HealthbarPreview[\s\S]*showPresetTools \? null/);
});

test("v2 preview maps each texture role and explicit geometry once", async () => {
  const [preview, css] = await Promise.all([
    readFile(healthbarPreviewPath, "utf8"),
    readFile(v2StylesPath, "utf8")
  ]);

  assert.match(preview, /healthbar-preview-missing-layer[\s\S]*PREVIEW_ASSETS\.missing/);
  assert.match(preview, /healthbar-preview-unit-info-bg[\s\S]*PREVIEW_ASSETS\.unitInfo/);
  assert.match(preview, /healthbar-preview-ult-ready[\s\S]*PREVIEW_ASSETS\.ultReady/);
  assert.match(preview, /killMarkerLeftPercent[\s\S]*killMarker\.leftPx[\s\S]*barWidthPx/);
  assert.match(preview, /killMarkerWidthPercent[\s\S]*killMarker\.widthPx[\s\S]*barWidthPx/);
  assert.match(preview, /--healthbar-width[\s\S]*barWidth/);
  assert.doesNotMatch(preview, /scaleX|barScale|widthScalePercent/);
  assert.match(css, /\.healthbar-preview-missing-layer[\s\S]*right:\s*0;[\s\S]*left:\s*auto;/);
  assert.match(css, /\.healthbar-preview-pips[\s\S]*rgba\(5,\s*8,\s*8,[\s\S]*left top[\s\S]*--healthbar-minor-pip-step\)\s*45%[\s\S]*--healthbar-major-pip-step\)\s*100%/);
  assert.match(css, /\.healthbar-preview-health-layer img[\s\S]*mix-blend-mode:\s*multiply;[\s\S]*opacity:\s*0\.48;/);
  assert.doesNotMatch(css, /\.healthbar-preview-ult-ready\s*\{[^}]*filter:/);
  assert.match(css, /\.healthbar-preview-unit-info[\s\S]*transform:\s*translateX\(30%\)/);
  assert.match(css, /\.healthbar-preview-level[\s\S]*z-index:\s*6;[\s\S]*transform:\s*translateX\(-70%\)/);
  assert.match(css, /\.healthbar-preview-unit-info[\s\S]*z-index:\s*9;/);
  assert.match(css, /\.healthbar-preview-hud[\s\S]*grid-template-columns:\s*var\(--healthbar-level-size\)\s+6px\s+var\(--healthbar-width\)/);
  assert.match(css, /\.healthbar-preview-canvas\.is-zoomed[\s\S]*overflow:\s*auto;/);
  assert.match(css, /\.healthbar-preview-hud[\s\S]*transform:\s*translate\(/);
  assert.doesNotMatch(css, /\.healthbar-preview-bar[\s\S]*scaleX/);
  assert.match(css, /prefers-reduced-motion[\s\S]*animation:\s*none/);
  assert.doesNotMatch(css, /healthbar-preview-bar\.is-hidden[\s\S]*!important/);
});

test("v2 topbar keeps workflow, profile, and utility controls grouped", async () => {
  const v2Island = await readFile(v2IslandPath, "utf8");

  assert.match(v2Island, /className="topbar-workflow-actions"/);
  assert.match(v2Island, /className="topbar-profile-workspace"/);
  assert.match(v2Island, /className="topbar-utility-bar"/);
  assert.match(v2Island, /className="topbar-support-actions"/);
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

test("showranks compatibility is a v2-only rewrite toggle with merged menu output", async () => {
  const [v1Island, v2Island, workflow] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(new URL("../src/presetBuilderWorkflow.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(v1Island, /showranks|ShowRank/i);
  assert.match(v2Island, /Showranks compatible/);
  assert.match(v2Island, /rewriteBuildTarget && !rewriteQollockTarget \? \(/);
  assert.match(v2Island, /commitShowranksCompatibleState/);
  assert.match(v2Island, /showranksCompatible: session\.showranksCompatible/);
  assert.match(workflow, /buildRewriteShowranksPresetPackage/);
  assert.match(workflow, /REWRITE_SHOWRANKS_PRESET_VPK_FILE_NAME/);
});
