import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { createDefaultFormState } from "../src/hpFormModel.js";
import {
  addProfile,
  createProfile,
  loadProfileState,
  profileToPreset,
  removeProfile,
  reorderProfiles,
  saveProfileState,
  STORAGE_KEY
} from "../src/profileStore.js";

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("loadProfileState restores ordered saved profiles and active selection", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const storage = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      activeProfileId: "second",
      profiles: [
        { id: "first", name: "Lane", values: { hp_color_low: "#111111" } },
        { id: "second", name: "Teamfight", values: { hp_color_low: "#222222" } }
      ]
    })
  });

  const loaded = loadProfileState(storage, defaultState);

  assert.deepEqual(loaded.profiles.map((profile) => profile.id), ["first", "second"]);
  assert.equal(loaded.activeProfileId, "second");
  assert.equal(loaded.profiles[0].values.hp_color_low, "#111111");
  assert.equal(loaded.profiles[0].values.hp_enabled, defaultState.hp_enabled);
});

test("saveProfileState writes builder-only profile state to local storage", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const storage = createMemoryStorage();
  const profiles = [
    createProfile({ id: "first", name: "Lane", values: { ...defaultState, hp_color_low: "#111111" } }),
    createProfile({ id: "second", name: "Teamfight", values: { ...defaultState, hp_color_low: "#222222" } })
  ];

  saveProfileState(storage, { profiles, activeProfileId: "second" });
  const stored = JSON.parse(storage.getItem(STORAGE_KEY));

  assert.equal(stored.activeProfileId, "second");
  assert.deepEqual(stored.profiles.map((profile) => profile.name), ["Lane", "Teamfight"]);
});

test("profile add and remove update count but never remove the final profile", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const initial = [createProfile({ id: "profile-1", name: "Lane", values: defaultState })];
  const added = addProfile(initial, defaultState);

  assert.equal(added.profiles.length, 2);
  assert.equal(added.activeProfileId, "profile-2");

  const removed = removeProfile(added.profiles, added.activeProfileId);
  assert.equal(removed.profiles.length, 1);
  assert.equal(removed.activeProfileId, "profile-1");

  const finalAttempt = removeProfile(removed.profiles, removed.activeProfileId);
  assert.equal(finalAttempt.profiles.length, 1);
  assert.equal(finalAttempt.activeProfileId, "profile-1");
});

test("reorderProfiles changes load priority without changing active profile", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const profiles = [
    createProfile({ id: "first", name: "Lane", values: defaultState }),
    createProfile({ id: "second", name: "Teamfight", values: defaultState }),
    createProfile({ id: "third", name: "Late", values: defaultState })
  ];

  const reordered = reorderProfiles(profiles, 2, 0);

  assert.deepEqual(reordered.map((profile) => profile.id), ["third", "first", "second"]);
});

test("profileToPreset preserves ordered build JSON shape", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const profiles = [
    createProfile({ id: "second", name: "Teamfight", values: { ...defaultState, hp_color_low: "#222222" } }),
    createProfile({ id: "first", name: "Lane", values: { ...defaultState, hp_color_low: "#111111" } })
  ];
  const presets = profiles.map(profileToPreset);

  assert.deepEqual(
    presets.map((preset) => ({ name: preset.name, version: preset.version, low: preset.values.hp_color_low })),
    [
      { name: "Teamfight", version: 1, low: "#222222" },
      { name: "Lane", version: 1, low: "#111111" }
    ]
  );
});
