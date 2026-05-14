import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { createDefaultFormState } from "../src/hpFormModel.js";
import { loadPresetDraft, savePresetDraft, serializePresetDraft } from "../src/presetDraftStore.js";

function createMemoryStorage() {
  const entries = new Map();
  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      entries.set(key, String(value));
    }
  };
}

test("serializes and restores the last preset name and sanitized state", () => {
  const storage = createMemoryStorage();
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const state = {
    ...defaultState,
    hp_enabled: false,
    hp_counter_size: 187,
    hp_counter_position: "43,-9",
    hp_color_low: "not-a-color"
  };

  assert.equal(savePresetDraft(storage, { presetName: "Last Applied", state }, HP_SCHEMA), true);
  const draft = loadPresetDraft(storage, HP_SCHEMA);

  assert.equal(draft.presetName, "Last Applied");
  assert.equal(draft.state.hp_enabled, false);
  assert.equal(draft.state.hp_counter_size, 187);
  assert.equal(draft.state.hp_counter_position, "43,-9");
  assert.equal(draft.state.hp_color_low, HP_SCHEMA.hp_color_low.defaultValue);
  assert.deepEqual(Object.keys(draft.state), Object.keys(HP_SCHEMA));
});

test("ignores invalid draft payloads", () => {
  const storage = createMemoryStorage();
  storage.setItem("hp-colors-preset-builder:draft:v1", "{bad json");

  assert.equal(loadPresetDraft(storage, HP_SCHEMA), null);
  assert.equal(loadPresetDraft(null, HP_SCHEMA), null);
});

test("keeps draft storage schema versioned", () => {
  const serialized = serializePresetDraft({ presetName: "Saved", state: createDefaultFormState(HP_SCHEMA) }, HP_SCHEMA);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.presetName, "Saved");
  assert.equal(typeof parsed.state, "object");
});
