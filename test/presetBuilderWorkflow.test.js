import assert from "node:assert/strict";
import test from "node:test";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import { HP_COLORS_PACKAGE_ARTIFACTS } from "../src/packageArtifacts.js";
import { buildHpColorsPackage } from "../src/packageBuilder.js";
import { createPresetBuilderSession } from "../src/presetBuilderSession.js";
import { TARGET_MODE_STORAGE_KEY } from "../src/targetModeStore.js";
import {
  BASE_HUD_TEMPLATE_PATH,
  commitPresetBuilderTargetMode,
  createBaseHudXmlLoader,
  runPresetBuildWorkflow,
  runPresetConvertWorkflow,
  runPresetImportWorkflow
} from "../src/presetBuilderWorkflow.js";

const BASE_HUD_TEMPLATE = [
  "<root>",
  "\t<styles>",
  '\t\t<include src="s2r://panorama/styles/base.vcss_c" />',
  '\t\t<include src="s2r://panorama/styles/anita_ui.vcss_c" />',
  "\t</styles>",
  "\t<scripts>",
  '\t\t<include src="s2r://panorama/scripts/anita_ui_core.vjs_c" />',
  '\t\t<include src="s2r://panorama/scripts/hp_registrar.vjs_c" />',
  "\t</scripts>",
  '\t<Panel id="AnitaUI_Anchor" hittest="false" />',
  "</root>"
].join("\n");

function encodeImportPayloadText(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildToken(payload) {
  return `[ANITA-v1-hp_colors]:${encodeImportPayloadText(JSON.stringify(payload))}`;
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    values
  };
}

test("commitPresetBuilderTargetMode normalizes and persists target mode", () => {
  const storage = createMemoryStorage();
  const session = {
    ...createPresetBuilderSession(HP_FIELD_CATALOG.createDefaultState()),
    modePickerOpen: true,
    modePickerRequired: true,
    modePickerUpgrade: true,
    installValidated: true,
    targetModeLoaded: false
  };

  const next = commitPresetBuilderTargetMode({ session, targetMode: "bad-value", storage });

  assert.equal(storage.values.get(TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(next.targetMode, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(next.modePickerOpen, false);
  assert.equal(next.modePickerRequired, false);
  assert.equal(next.modePickerUpgrade, false);
  assert.equal(next.installValidated, false);
  assert.equal(next.targetModeLoaded, true);
});

test("createBaseHudXmlLoader caches success and retries after failure", async () => {
  const calls = [];
  const loadBaseHudXml = createBaseHudXmlLoader({
    baseUrl: "/base/",
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, status: 200, text: async () => "<root />" };
    }
  });

  assert.equal(await loadBaseHudXml(), "<root />");
  assert.equal(await loadBaseHudXml(), "<root />");
  assert.deepEqual(calls, [`/base/${BASE_HUD_TEMPLATE_PATH}`]);

  let failCount = 0;
  const failingLoader = createBaseHudXmlLoader({
    fetchImpl: async () => {
      failCount += 1;
      return failCount === 1
        ? { ok: false, status: 503, text: async () => "" }
        : { ok: true, status: 200, text: async () => "retry" };
    }
  });
  await assert.rejects(() => failingLoader(), { message: "Failed to load base_hud.xml (503)" });
  assert.equal(await failingLoader(), "retry");
});

test("runPresetImportWorkflow dispatches success and failure intents", async () => {
  const dispatched = [];
  await runPresetImportWorkflow({
    importText: buildToken({ version: 1, n: "Lane", vs: { cl: "#123456" }, hs: ["shiv"] }),
    defaultState: HP_FIELD_CATALOG.createDefaultState(),
    groups: [],
    activeKey: "root",
    dispatch: (intent, context) => dispatched.push({ intent, context })
  });

  assert.equal(dispatched[0].intent.type, "IMPORT_PROFILES_SUCCEEDED");
  assert.equal(dispatched[0].intent.importedProfiles[0].name, "Lane");
  assert.equal(dispatched[0].intent.importedProfiles[0].values.hp_color_low, "#123456");
  assert.equal(dispatched[0].context.activeKey, "root");

  const failures = [];
  await runPresetImportWorkflow({
    importText: "not a token",
    defaultState: {},
    groups: [],
    dispatch: (intent) => failures.push(intent)
  });
  assert.deepEqual(failures, [{ type: "IMPORT_FAILED", message: "Malformed HP Colors import code" }]);
});

test("runPresetBuildWorkflow builds, downloads, and reports success", async () => {
  const dispatched = [];
  const downloads = [];
  await runPresetBuildWorkflow({
    selection: {
      presetVpkFileName: "Lane.vpk",
      buildProfilePresets: [{ name: "Lane", values: { hp_color_low: "#112233" } }]
    },
    targetMode: HP_COLORS_MOD_VARIANTS.FULL,
    loadBaseHudXml: async () => BASE_HUD_TEMPLATE,
    download: (name, bytes) => downloads.push({ name, bytes }),
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.deepEqual(dispatched[0], { type: "BUILD_STARTED" });
  assert.equal(dispatched[1].type, "SET_STATUS");
  assert.equal(downloads[0].name, "pak96_dir.vpk");
  assert.ok(downloads[0].bytes instanceof Uint8Array);
  assert.match(dispatched.at(-1).status, /^Built pak96_dir\.vpk for full mod \(/);
  assert.match(dispatched.at(-1).status, /1 profile\)\.$/);
});

test("runPresetBuildWorkflow normalizes bad target mode to minimal", async () => {
  const dispatched = [];
  await runPresetBuildWorkflow({
    selection: {
      presetVpkFileName: "Lane.vpk",
      buildProfilePresets: [{ name: "Lane", values: { hp_color_low: "#112233" } }]
    },
    targetMode: "bad-value",
    loadBaseHudXml: async () => BASE_HUD_TEMPLATE,
    download: () => {},
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.match(dispatched.at(-1).status, /^Built pak96_dir\.vpk for minimal mod \(/);
});

test("runPresetBuildWorkflow reports loader failures without downloading", async () => {
  const dispatched = [];
  const downloads = [];
  await runPresetBuildWorkflow({
    selection: { presetVpkFileName: "Lane.vpk", buildProfilePresets: [{ name: "Lane", values: {} }] },
    targetMode: HP_COLORS_MOD_VARIANTS.FULL,
    loadBaseHudXml: async () => { throw new Error("load failed"); },
    download: (...args) => downloads.push(args),
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.deepEqual(downloads, []);
  assert.equal(dispatched.at(-1).status, "load failed");
});

test("runPresetConvertWorkflow without a file dispatches only the no-file status", async () => {
  const dispatched = [];
  await runPresetConvertWorkflow({
    convertFile: null,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL,
    loadBaseHudXml: async () => BASE_HUD_TEMPLATE,
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.deepEqual(dispatched, [{ type: "SET_CONVERT_STATUS", status: "Select a generated HP Colors preset VPK first." }]);
});

test("runPresetConvertWorkflow converts a valid generated VPK", async () => {
  const built = buildHpColorsPackage({
    sourceTexts: { [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_TEMPLATE },
    preset: { name: "Lane", values: { hp_color_low: "#112233" } },
    modVariant: HP_COLORS_MOD_VARIANTS.FULL
  });
  const dispatched = [];
  const downloads = [];
  const file = {
    name: "Lane.vpk",
    arrayBuffer: async () => built.vpkBytes.buffer.slice(built.vpkBytes.byteOffset, built.vpkBytes.byteOffset + built.vpkBytes.byteLength)
  };

  await runPresetConvertWorkflow({
    convertFile: file,
    targetModVariant: HP_COLORS_MOD_VARIANTS.MINIMAL,
    loadBaseHudXml: async () => BASE_HUD_TEMPLATE,
    download: (name, bytes) => downloads.push({ name, bytes }),
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.equal(downloads[0].name, "pak96_dir.vpk");
  assert.ok(downloads[0].bytes instanceof Uint8Array);
  assert.deepEqual(dispatched.slice(-2), [
    { type: "SET_CONVERT_STATUS", status: "Converted pak96_dir.vpk for the minimal mod." },
    { type: "SET_STATUS", status: "Converted pak96_dir.vpk for the minimal mod." }
  ]);
});

test("runPresetConvertWorkflow reports converter errors to both statuses", async () => {
  const dispatched = [];
  const file = {
    name: "broken.vpk",
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
  };

  await runPresetConvertWorkflow({
    convertFile: file,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL,
    loadBaseHudXml: async () => BASE_HUD_TEMPLATE,
    download: () => assert.fail("download should not run"),
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.deepEqual(dispatched.slice(-2), [
    { type: "SET_CONVERT_STATUS", status: "Invalid VPK file" },
    { type: "SET_STATUS", status: "Invalid VPK file" }
  ]);
});
