import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { HP_FIELD_CATALOG } from "../src/hpv2HpSchema.js";
import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import { createPresetBuilderSession, loadPresetBuilderSession } from "../src/hpv2PresetBuilderSession.js";
import { V2_STORAGE_KEY, createInitialProfile } from "../src/profileStore.js";
import { SHOWRANKS_COMPATIBLE_STORAGE_KEY } from "../src/showranksCompatibleStore.js";
import { TARGET_MODE_STORAGE_KEY, V2_TARGET_MODE_STORAGE_KEY } from "../src/targetModeStore.js";
import {
  commitPresetBuilderTargetMode,
  createRewritePresetTemplateLoader,
  runRewritePresetBuildWorkflow
} from "../src/hpv2PresetBuilderWorkflow.js";
import {
  readRewritePresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_PRESET_TEMPLATE_PATH
} from "../src/hpv2RewritePackageBuilder.js";
import { readVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_PATH = new URL(
  "../public/templates/hpv2_hp_colors_rewrite/panorama/layout/hud_escape_menu.xml",
  import.meta.url
);

function makeTemplate() {
  return readFileSync(TEMPLATE_PATH, "utf8");
}

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    values
  };
}

test("HPv2 target commits persist ShowRanks and reload it without changing profiles", () => {
  const storage = createMemoryStorage();
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const session = createPresetBuilderSession(defaultState);
  const profiles = session.profiles;
  const options = { storage, targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY };

  const showranks = commitPresetBuilderTargetMode({
    ...options,
    session,
    targetMode: HP_COLORS_MOD_VARIANTS.FULL,
    showranksCompatible: true
  });
  assert.equal(showranks.targetMode, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(showranks.showranksCompatible, true);
  assert.strictEqual(showranks.profiles, profiles);
  assert.equal(storage.values.get(V2_TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(storage.values.get(SHOWRANKS_COMPATIBLE_STORAGE_KEY), "true");
  assert.equal(storage.values.has(TARGET_MODE_STORAGE_KEY), false);

  const reloaded = loadPresetBuilderSession(storage, defaultState, {
    targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
  });
  assert.equal(reloaded.targetMode, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(reloaded.showranksCompatible, true);

  const normal = commitPresetBuilderTargetMode({
    ...options,
    session: showranks,
    targetMode: HP_COLORS_MOD_VARIANTS.FULL
  });
  assert.equal(normal.showranksCompatible, false);
  assert.equal(storage.values.get(SHOWRANKS_COMPATIBLE_STORAGE_KEY), "false");
  assert.strictEqual(normal.profiles, profiles);

  const legacyShowranksStorage = createMemoryStorage({
    [V2_STORAGE_KEY]: JSON.stringify({
      version: 1,
      activeProfileId: "profile-1",
      profiles: [{
        id: "profile-1",
        name: "Rewrite",
        values: defaultState,
        heroMode: "all",
        heroes: [],
        overrides: {},
        rewrite: { values: {}, conditions: null }
      }]
    }),
    [V2_TARGET_MODE_STORAGE_KEY]: HP_COLORS_MOD_VARIANTS.MINIMAL,
    [SHOWRANKS_COMPATIBLE_STORAGE_KEY]: "true"
  });
  const migrated = loadPresetBuilderSession(legacyShowranksStorage, defaultState, {
    profileStorageKey: V2_STORAGE_KEY,
    targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
  });
  assert.equal(migrated.targetMode, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(migrated.showranksCompatible, true);
  assert.equal(migrated.modePickerOpen, false);

  legacyShowranksStorage.setItem(V2_TARGET_MODE_STORAGE_KEY, HP_COLORS_MOD_VARIANTS.REWRITE_QOLLOCK);
  const qollockReload = loadPresetBuilderSession(legacyShowranksStorage, defaultState, {
    profileStorageKey: V2_STORAGE_KEY,
    targetModeStorageKey: V2_TARGET_MODE_STORAGE_KEY
  });
  assert.equal(qollockReload.targetMode, HP_COLORS_MOD_VARIANTS.REWRITE_QOLLOCK);
  assert.equal(qollockReload.showranksCompatible, false);

  const qollock = commitPresetBuilderTargetMode({
    ...options,
    session: normal,
    targetMode: HP_COLORS_MOD_VARIANTS.REWRITE_QOLLOCK,
    showranksCompatible: true
  });
  assert.equal(qollock.targetMode, HP_COLORS_MOD_VARIANTS.REWRITE_QOLLOCK);
  assert.equal(qollock.showranksCompatible, false);
  assert.equal(storage.values.get(SHOWRANKS_COMPATIBLE_STORAGE_KEY), "false");
  assert.strictEqual(qollock.profiles, profiles);
});

test("rewrite template loader caches successful XML text and retries failed fetches", async () => {
  const template = makeTemplate();
  let calls = 0;
  const loader = createRewritePresetTemplateLoader({
    baseUrl: "/builder/",
    fetchImpl: async (url) => {
      calls += 1;
      assert.equal(url, `/builder/${REWRITE_PRESET_TEMPLATE_PATH}`);
      return { ok: true, text: async () => template };
    }
  });
  const [first, second] = await Promise.all([loader(), loader()]);
  assert.equal(calls, 1);
  assert.equal(first, template);
  assert.equal(second, template);

  let failures = 0;
  const failingLoader = createRewritePresetTemplateLoader({
    fetchImpl: async () => {
      failures += 1;
      if (failures === 1) return { ok: false, status: 503, text: async () => "" };
      return { ok: true, text: async () => template };
    }
  });
  await assert.rejects(() => failingLoader(), { message: "Failed to load rewrite preset template (503)" });
  assert.equal(await failingLoader(), template);
});

test("rewrite build workflow creates and downloads XML-only pak01 with success hash/status", async () => {
  const template = makeTemplate();
  const profile = createInitialProfile(HP_FIELD_CATALOG.createDefaultState());
  profile.name = "Workflow \"preset\"";
  const dispatched = [];
  const downloads = [];
  const result = await runRewritePresetBuildWorkflow({
    profiles: [profile],
    activeProfileId: profile.id,
    loadRewritePresetTemplate: async () => template,
    download: async (filename, bytes) => downloads.push({ filename, bytes }),
    digest: async () => "rewrite-sha256",
    dispatch: (intent) => dispatched.push(intent)
  });
  assert.equal(result.filename, "pak01_dir.vpk");
  assert.equal(result.targetLabel, "hp_colors_rewrite");
  assert.equal(result.sha256, "rewrite-sha256");
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "pak01_dir.vpk");
  const archive = readVpkArchive(downloads[0].bytes);
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.ok(readRewritePresetCode(archive.files[0].bytes).startsWith("HPCRP1"));
  assert.match(dispatched.at(-1).status, /^Built pak01_dir\.vpk for hp_colors_rewrite/);
});
