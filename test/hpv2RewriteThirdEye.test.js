import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRewriteThirdEyePresetPackage,
  encodeUtf16Hex,
  inspectRewriteThirdEyePresetTemplate,
  readRewriteThirdEyePresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_THIRDEYE_PRESET_SCRIPT_INCLUDES,
  REWRITE_THIRDEYE_PRESET_STYLE_INCLUDES,
  REWRITE_THIRDEYE_PRESET_TEMPLATE_PATH,
  REWRITE_THIRDEYE_PRESET_VPK_FILE_NAME,
  REWRITE_THIRDEYE_REQUIRED_PANEL_IDS,
  validateRewriteThirdEyePresetTemplate,
  validateRewriteThirdEyePresetVpk
} from "../src/hpv2RewritePackageBuilder.js";
import {
  commitPresetBuilderTargetMode,
  createRewriteThirdEyePresetTemplateLoader,
  runRewriteThirdEyePresetBuildWorkflow
} from "../src/hpv2PresetBuilderWorkflow.js";
import { HP_FIELD_CATALOG, REWRITE_FIELD_CATALOG } from "../src/hpv2HpSchema.js";
import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import {
  createPresetBuilderSession,
  loadPresetBuilderSession,
  selectPresetBuilderSession
} from "../src/hpv2PresetBuilderSession.js";
import { V2_TARGET_MODE_STORAGE_KEY } from "../src/targetModeStore.js";
import { readVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_URL = new URL(`../public/${REWRITE_THIRDEYE_PRESET_TEMPLATE_PATH}`, import.meta.url);
const PRESET_CODE = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Third Eye","mode":"all","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"user_0001"}';
const templateText = await readFile(TEMPLATE_URL, "utf8");

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test("Third Eye template exposes the exact merged include and panel contract", () => {
  const inspected = validateRewriteThirdEyePresetTemplate(templateText);
  assert.equal(inspected.labelText, "");
  assert.deepEqual(inspected.styleIncludes, REWRITE_THIRDEYE_PRESET_STYLE_INCLUDES);
  assert.deepEqual(inspected.scriptIncludes, REWRITE_THIRDEYE_PRESET_SCRIPT_INCLUDES);
  for (const id of REWRITE_THIRDEYE_REQUIRED_PANEL_IDS) {
    assert.match(templateText, new RegExp(`id="${id}"`), id);
  }
  assert.match(templateText, /id="EscapeBackground"[^>]*onactivate="if \(!\$\.HPColorsMenuCancel\(\)\)/);
  assert.match(templateText, /id="EscapeButton"[^>]*onactivate="if \(!\$\.HPColorsMenuCancel\(\)\)/);
  assert.doesNotMatch(templateText, /s2r:\/\/panorama\/scripts\/ui\/window\.vjs_c/);
  assert.match(templateText, /hp_colors_thirdeye_bridge\.vjs_c/);
  assert.match(templateText, /hp_colors_thirdeye_window\.vjs_c/);
});

test("Third Eye package emits only the merged Escape-menu resource and round-trips HPCRP1", () => {
  const built = buildRewriteThirdEyePresetPackage({ templateText, presetCode: PRESET_CODE });
  assert.equal(REWRITE_THIRDEYE_PRESET_VPK_FILE_NAME, "pak01_dir.vpk");
  const archive = readVpkArchive(built.vpkBytes);
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.equal(readRewriteThirdEyePresetCode(archive.files[0].bytes), PRESET_CODE);
  assert.equal(validateRewriteThirdEyePresetVpk(built.vpkBytes).files.length, 1);
  assert.match(built.sourceText, new RegExp(`text="${encodeUtf16Hex(PRESET_CODE)}"`));
  assert.doesNotMatch(built.sourceText, /base_hud|anita/i);
});

test("Third Eye inspector and package reject malformed lifecycle, includes, IDs, and payloads", () => {
  assert.throws(
    () => inspectRewriteThirdEyePresetTemplate(templateText.replace("hp_colors_thirdeye_bridge.vjs_c", "wrong_bridge.vjs_c")),
    /include contract is stale or incompatible/
  );
  assert.throws(
    () => inspectRewriteThirdEyePresetTemplate(templateText.replace('id="ThirdEyeWindowClose"', 'id="MissingThirdEyeWindowClose"')),
    /panel contract is stale or incompatible/
  );
  assert.throws(
    () => inspectRewriteThirdEyePresetTemplate(templateText.replace(/(id="EscapeButton"[^>]*onactivate=)"[^"]*"/, '$1"CitadelResumePlaying()"')),
    /lifecycle contract is stale or incompatible/
  );
  assert.throws(
    () => buildRewriteThirdEyePresetPackage({ templateText, presetCode: "HPCR2[]" }),
    /HPCRP1/
  );
});

test("Third Eye target persists only in the HPV2 session and selects pak01", () => {
  const storage = createStorage();
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const session = createPresetBuilderSession(defaultState);
  const committed = commitPresetBuilderTargetMode({
    session,
    targetMode: HP_COLORS_MOD_VARIANTS.REWRITE_THIRDEYE,
    storage,
    targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY,
    allowHpv2OnlyTargets: true
  });
  assert.equal(committed.targetMode, HP_COLORS_MOD_VARIANTS.REWRITE_THIRDEYE);
  assert.equal(storage.values.get(V2_TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.REWRITE_THIRDEYE);
  const reloaded = loadPresetBuilderSession(storage, defaultState, {
    targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY,
    allowHpv2OnlyTargets: true
  });
  assert.equal(reloaded.targetMode, HP_COLORS_MOD_VARIANTS.REWRITE_THIRDEYE);
  assert.equal(selectPresetBuilderSession(reloaded, defaultState, [], null, REWRITE_FIELD_CATALOG).presetVpkFileName, "pak01_dir.vpk");
  const legacy = loadPresetBuilderSession(storage, defaultState, { targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY });
  assert.equal(legacy.targetMode, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(legacy.modePickerOpen, true);
});

test("Third Eye workflow loads the target template once and downloads the compatibility preset", async () => {
  const urls = [];
  let downloaded = null;
  const loader = createRewriteThirdEyePresetTemplateLoader({
    baseUrl: "/builder/",
    fetchImpl: async (url) => {
      urls.push(url);
      return { ok: true, text: async () => templateText };
    }
  });
  const dispatches = [];
  const result = await runRewriteThirdEyePresetBuildWorkflow({
    profiles: [{ id: "profile-1", name: "Third Eye", heroMode: "all", heroes: [], values: {} }],
    activeProfileId: "profile-1",
    loadRewriteThirdEyePresetTemplate: loader,
    download: async (filename, bytes) => { downloaded = { filename, bytes }; },
    digest: async () => "third-eye-hash",
    dispatch: (intent) => dispatches.push(intent)
  });
  assert.equal(urls[0], `/builder/${REWRITE_THIRDEYE_PRESET_TEMPLATE_PATH}`);
  assert.equal(urls.length, 1);
  assert.equal(downloaded.filename, "pak01_dir.vpk");
  assert.equal(result.target, "hp_colors_rewrite_v2_thirdeye");
  assert.equal(result.targetLabel, "hp_colors_rewrite_v2_thirdeye");
  assert.equal(result.sha256, "third-eye-hash");
  assert.equal(dispatches.at(-1).type, "SET_STATUS");
  assert.match(dispatches.at(-1).status, /hp_colors_rewrite_v2_thirdeye/);
});
test("Third Eye target is exposed only by HPV2 UI source", async () => {
  const [hpv2Island, legacyIsland, rootIsland] = await Promise.all([
    readFile(new URL("../src/components/PresetBuilderHPV2Island.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/PresetBuilderV2Island.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url), "utf8")
  ]);
  assert.match(hpv2Island, /Rewritev2 \+ Third Eye/);
  assert.match(hpv2Island, /runRewriteThirdEyePresetBuildWorkflow/);
  assert.match(hpv2Island, /createRewriteThirdEyePresetTemplateLoader/);
  assert.match(legacyIsland, /LEGACY_TARGET_MODE_CHOICES/);
  assert.match(rootIsland, /LEGACY_TARGET_MODE_CHOICES/);
  assert.doesNotMatch(legacyIsland, /REWRITE_THIRDEYE/);
  assert.doesNotMatch(rootIsland, /REWRITE_THIRDEYE/);
});
