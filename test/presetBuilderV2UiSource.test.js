import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const v1IslandPath = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);
const v2IslandPath = new URL("../src/components/PresetBuilderV2Island.jsx", import.meta.url);
const healthbarPreviewPath = new URL("../src/components/HealthbarPreview.jsx", import.meta.url);
const v2StylesPath = new URL("../src/styles/v2.css", import.meta.url);
const v2TreePath = new URL("../src/components/schema-tree-v2.jsx", import.meta.url);
const v2PagePath = new URL("../src/pages/v2.astro", import.meta.url);
const v2TickerPath = new URL("../src/components/KofiLeaderboardTicker.jsx", import.meta.url);
const supportersDataPath = new URL("../src/supportersData.js", import.meta.url);
const supportersCsvPath = new URL("../public/data/supporters.csv", import.meta.url);
const supportersStripPagePath = new URL("../src/pages/supporters-strip.astro", import.meta.url);
const supportersStripStylesPath = new URL("../src/styles/supporters-strip.css", import.meta.url);
const supportersStripLoopPath = new URL("../public/supporters-strip-loop.js", import.meta.url);
const supportersStripBackgroundPath = new URL("../src/assets/supporters-strip-header.png", import.meta.url);

test("v2 and the static strip share one reviewed supporter CSV", async () => {
  const [
    v1Page,
    v1Island,
    v2Page,
    v2Island,
    ticker,
    supportersData,
    supportersCsv,
    stripPage,
    stripStyles,
    stripLoop,
    stripBackground
  ] = await Promise.all([
    readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8"),
    readFile(v1IslandPath, "utf8"),
    readFile(v2PagePath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(v2TickerPath, "utf8"),
    readFile(supportersDataPath, "utf8"),
    readFile(supportersCsvPath, "utf8"),
    readFile(supportersStripPagePath, "utf8"),
    readFile(supportersStripStylesPath, "utf8"),
    readFile(supportersStripLoopPath, "utf8"),
    readFile(supportersStripBackgroundPath)
  ]);

  assert.doesNotMatch(v2Page, /kofi-leaderboard-embed|cdn\.ko-fi\.tools/i);
  assert.doesNotMatch(v2Island, /kofi-leaderboard-embed|cdn\.ko-fi\.tools/i);
  assert.doesNotMatch(v1Page, /kofi-leaderboard|cdn\.ko-fi\.tools/i);
  assert.doesNotMatch(v1Island, /kofi-leaderboard|cdn\.ko-fi\.tools/i);
  assert.doesNotMatch(ticker, /MutationObserver|Loading top supporters|View Ko-fi leaderboard|const SUPPORTERS/);
  assert.doesNotMatch(ticker, /Email|LastestTransactionId|@gmail\.com|@hotmail\.com/);
  assert.doesNotMatch(stripPage, /client:|fetch\(|https?:\/\//i);
  assert.match(stripPage, /script-src 'self'/);
  assert.match(stripPage, /supporters-strip-loop\.js\?v=32000/);
  assert.doesNotMatch(stripLoop, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage/i);
  assert.match(v2Page, /loadSupporters/);
  assert.match(v2Page, /supporters=\{supporters\}/);
  assert.match(v2Island, /KofiLeaderboardTicker supporters=\{supporters\}/);
  assert.match(stripPage, /loadSupporters/);
  assert.match(stripPage, /supporters-strip\.css/);
  assert.match(stripPage, /img-src 'self' data:/);
  assert.match(stripStyles, /background-image:\s*url\("\.\.\/assets\/supporters-strip-header\.png"\)/);
  assert.equal(stripBackground.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(stripBackground.readUInt32BE(16), 520);
  assert.equal(stripBackground.readUInt32BE(20), 60);
  assert.match(supportersData, /readFile\(SUPPORTERS_CSV_PATH/);
  assert.match(supportersData, /MAX_SUPPORTERS = 10/);
  assert.match(supportersCsv, /^display_name,total_usd$/m);
  assert.match(supportersCsv, /^oOBansh33,10$/m);
  assert.match(supportersCsv, /^www\.skillnshred\.com,20$/m);
  assert.match(supportersCsv, /^Ko-fi Supporter,10$/m);
  assert.match(supportersCsv, /^Ko-fi Supporter,5$/m);
  assert.equal((supportersCsv.match(/^Ko-fi Supporter,/gm) ?? []).length, 2);
  assert.doesNotMatch(supportersCsv, /Anonymous|rank|@|LastSupportedDateUTC|TransactionId/i);
  assert.match(stripStyles, /animation:\s*supporter-strip-scroll 32s linear 1 forwards/);
  assert.match(stripStyles, /6\.25%[\s\S]*75%[\s\S]*84\.375%[\s\S]*100%/);
  assert.match(stripStyles, /supporter-strip-cycle-gap[\s\S]*96px/);
  assert.match(stripStyles, /translate3d\(-50%, 0, 0\)/);
  assert.match(stripLoop, /animationend/);
  assert.match(stripLoop, /CYCLE_MS = 32000/);
  assert.match(stripPage, />Thank you for supporting</);
  assert.doesNotMatch(stripPage, /Thank you for supporting my work/);
  assert.match(stripStyles, /"VALVEOracle", "Reaver", "Radiance"/);
  assert.doesNotMatch(stripPage, /HP COLORS COMMUNITY/);
  assert.doesNotMatch(stripStyles, /prefers-reduced-motion/);

  for (const marker of [
    "topbar-supporter-strip",
    "topbar-supporter-window",
    "topbar-supporter-track",
    "topbar-supporter-sequence",
    "topbar-supporter-item",
    "topbar-supporter-amount",
    "topbar-supporter-rank",
    "https://ko-fi.com/hantuaraya/leaderboard",
    "ResizeObserver",
    "SUPPORTER_SPEED_PX_PER_SECOND = 36",
    "MIN_ANIMATION_SECONDS = 4",
    "--topbar-supporter-duration",
    "aria-hidden"
  ]) {
    assert.match(ticker, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
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
  assert.match(preview, /2x zoom/);
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
  assert.match(css, /\.schema-field-row\s*\{[^}]*grid-template-columns:\s*minmax\(170px,\s*1fr\)\s*minmax\(0,\s*1\.1fr\)/);
  assert.match(css, /\.anita-slider-group\s*\{[^}]*grid-template-columns:\s*minmax\(96px,\s*132px\)\s*minmax\(72px,\s*1fr\)/);
  assert.match(css, /@media \(max-width:\s*1240px\)\s*\{[\s\S]*?\.schema-field-row\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width:\s*1240px\)\s*\{[\s\S]*?\.healthbar-preview-actions\s*\{[^}]*1fr 1fr/);
  assert.match(css, /\.healthbar-preview-relation button,[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /\.healthbar-preview-health-layer img[\s\S]*mix-blend-mode:\s*multiply;[\s\S]*opacity:\s*0\.48;/);
  assert.doesNotMatch(css, /\.healthbar-preview-ult-ready\s*\{[^}]*filter:/);
  assert.match(preview, /hp_team_colors[\s\S]*healthbar-preview-team-switch/);
  assert.match(preview, /hp_friend_team_colors[\s\S]*healthbar-preview-team-switch/);
  assert.doesNotMatch(preview, /defaultTeam|>Default<\/button>/);
  assert.match(preview, /if \(!teamColorActive \|\| teamSelected\) return;[\s\S]*updateScenario\('team', 'team1'\)/);
  assert.match(css, /\.healthbar-preview-relation,[\s\S]*grid-template-columns:\s*auto repeat\(2/);
  assert.doesNotMatch(css, /\.healthbar-preview-team-switch\s*\{/);
  assert.match(css, /\.healthbar-preview-unit-info[\s\S]*transform:\s*translateX\(30%\)/);
  assert.match(css, /\.healthbar-preview-level[\s\S]*z-index:\s*6;[\s\S]*transform:\s*translateX\(-70%\)/);
  assert.match(css, /\.healthbar-preview-unit-info[\s\S]*z-index:\s*9;/);
  assert.match(css, /\.healthbar-preview-hud[\s\S]*grid-template-columns:\s*var\(--healthbar-level-size\)\s+6px\s+var\(--healthbar-width\)/);
  assert.match(css, /\.healthbar-preview-canvas\.is-zoomed[\s\S]*overflow:\s*auto;/);
  assert.match(css, /\.healthbar-preview-hud[\s\S]*transform:\s*translate\(/);
  assert.doesNotMatch(css, /\.healthbar-preview-bar[\s\S]*scaleX/);
  assert.match(preview, /--healthbar-preview-pulse-duration/);
  assert.match(css, /prefers-reduced-motion[\s\S]*healthbar-preview-pulse-overlay\.is-active[\s\S]*animation:\s*healthbar-preview-pulse var\(--healthbar-preview-pulse-duration,\s*0\.8s\) ease-in-out infinite !important/);
  assert.doesNotMatch(css, /healthbar-preview-pulse-overlay\.is-active\s*\{[^}]*animation:\s*none/);
  assert.doesNotMatch(css, /healthbar-preview-bar\.is-hidden[\s\S]*!important/);
});

test("v2 settings navigation spans the workspace without sticky offsets", async () => {
  const css = await readFile(v2StylesPath, "utf8");

  assert.match(css, /\.anita-tree\s*\{[^}]*position:\s*static;[^}]*align-self:\s*stretch;[^}]*min-height:\s*0;/);
  assert.doesNotMatch(css, /\.anita-tree\s*\{[^}]*top:\s*104px;/);
  assert.doesNotMatch(css, /\.anita-tree\s*\{[^}]*min-height:\s*680px;/);
});

test("v2 topbar keeps workflow, profile, utility, and supporter controls grouped", async () => {
  const [v1Island, v2Island] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8")
  ]);
  const titleRowMatch = v2Island.match(/<div className="panorama-title-row">([\s\S]*?)<\/div>/);


  assert.match(v2Island, /className="topbar-workflow-actions"/);
  assert.match(v2Island, /className="topbar-profile-workspace"/);
  assert.match(v2Island, /className="topbar-utility-bar"/);
  assert.match(v2Island, /className="topbar-support-actions"/);
  assert.ok(titleRowMatch);
  assert.match(titleRowMatch[1], /<span className="panorama-brand">HP Colors<\/span>[\s\S]*?className="commit-version-link"[\s\S]*?<KofiLeaderboardTicker supporters=\{supporters\}\s*\/>/);
  assert.doesNotMatch(titleRowMatch[1], /topbar-support-actions/);
  assert.match(
    v2Island,
    /<div className="topbar-workflow-actions"[\s\S]*?className="topbar-support-actions"[\s\S]*?className="target-mode-trigger"/
  );
  assert.doesNotMatch(v1Island, /KofiLeaderboardTicker|topbar-supporter-strip|topbar-support-actions/);
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
  assert.doesNotMatch(v1Island, /V2_STORAGE_KEY|V2_TARGET_MODE_STORAGE_KEY/);
  assert.match(v2Island, /migrateLegacyV2ProfileState\(storage, defaultState\)/);
  assert.match(v2Island, /loadPresetBuilderSession\(storage, defaultState, \{[\s\S]*?profileStorageKey: V2_STORAGE_KEY,[\s\S]*?targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY[\s\S]*?\}\)/);
  assert.match(v2Island, /commitPresetBuilderTargetMode\(\{[\s\S]*?targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY[\s\S]*?\}\)/);
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
