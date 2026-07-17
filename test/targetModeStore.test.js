import assert from "node:assert/strict";
import test from "node:test";

import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import {
  TARGET_MODE_STORAGE_KEY,
  getTargetModeDetails,
  loadTargetModeState,
  normalizeTargetMode,
  saveTargetModeState
} from "../src/targetModeStore.js";

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test("loadTargetModeState shows picker when no target mode has been saved", () => {
  const state = loadTargetModeState(createStorage());

  assert.deepEqual(state, {
    targetMode: HP_COLORS_MOD_VARIANTS.MINIMAL,
    shouldShowPicker: true,
    isUpgradePrompt: false
  });
});

test("loadTargetModeState marks legacy users when old profile storage exists without target mode", () => {
  const state = loadTargetModeState(createStorage({
    "hp_colors_preset_builder_profiles_v1": "{}"
  }), { profileStorageKey: "hp_colors_preset_builder_profiles_v1" });

  assert.equal(state.targetMode, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(state.shouldShowPicker, true);
  assert.equal(state.isUpgradePrompt, true);
});

test("loadTargetModeState restores a saved full target without opening the picker", () => {
  const state = loadTargetModeState(createStorage({
    [TARGET_MODE_STORAGE_KEY]: HP_COLORS_MOD_VARIANTS.FULL
  }));

  assert.deepEqual(state, {
    targetMode: HP_COLORS_MOD_VARIANTS.FULL,
    shouldShowPicker: false,
    isUpgradePrompt: false
  });
});

test("saveTargetModeState writes only normalized full or minimal values", () => {
  const storage = createStorage();

  saveTargetModeState(storage, "bad-value");
  assert.equal(storage.getItem(TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.MINIMAL);

  saveTargetModeState(storage, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(storage.getItem(TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.FULL);
});

test("normalizeTargetMode falls back to minimal for unknown values", () => {
  assert.equal(normalizeTargetMode(HP_COLORS_MOD_VARIANTS.FULL), HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(normalizeTargetMode(HP_COLORS_MOD_VARIANTS.MINIMAL), HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(normalizeTargetMode(null), HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(normalizeTargetMode("full-mod"), HP_COLORS_MOD_VARIANTS.MINIMAL);
});

test("getTargetModeDetails exposes choice copy and download links", () => {
  const minimal = getTargetModeDetails(HP_COLORS_MOD_VARIANTS.MINIMAL);
  const full = getTargetModeDetails(HP_COLORS_MOD_VARIANTS.FULL);

  assert.equal(minimal.id, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.match(minimal.description, /preset/i);
  assert.match(minimal.downloadHref, /^https:\/\//);
  assert.equal(full.id, HP_COLORS_MOD_VARIANTS.FULL);
  assert.match(full.description, /Anita UI/i);
  assert.match(full.downloadHref, /^https:\/\//);
});


test("target mode storage failures are surfaced", () => {
  const loaded = loadTargetModeState({
    getItem() { throw new DOMException("Access denied", "SecurityError"); }
  });
  assert.match(loaded.error, /could not be read: Access denied/);
  assert.equal(loaded.shouldShowPicker, true);

  const saved = saveTargetModeState({
    setItem() { throw new DOMException("Quota full", "QuotaExceededError"); }
  }, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(saved.ok, false);
  assert.match(saved.error, /could not be saved: Quota full/);
});
