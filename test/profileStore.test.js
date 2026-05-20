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

test("profile heroes round trip through storage and preset export", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const storage = createMemoryStorage();
  const profiles = [
    createProfile({
      id: "first",
      name: "Lane",
      values: { ...defaultState, hp_color_low: "#111111" },
      heroes: ["shiv", "hero_bebop", "unknown_hero", "hero_shiv"]
    })
  ];

  saveProfileState(storage, { profiles, activeProfileId: "first" });
  const loaded = loadProfileState(storage, defaultState);
  const preset = profileToPreset(loaded.profiles[0]);

  assert.deepEqual(loaded.profiles[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(loaded.profiles[0].heroMode, "selected");
  assert.deepEqual(preset.heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(preset.heroMode, "selected");
});

test("missing profile heroes keep hero selection off", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const profile = createProfile({ id: "first", name: "Global", values: defaultState });

  assert.deepEqual(profile.heroes, []);
  assert.equal(profile.heroMode, "off");
  assert.deepEqual(profileToPreset(profile).heroes, []);
  assert.equal(profileToPreset(profile).heroMode, "off");
});

test("profile hero scope modes round trip through storage and preset export", () => {
  const defaultState = createDefaultFormState(HP_SCHEMA);
  const storage = createMemoryStorage();
  const profiles = [
    createProfile({ id: "off", name: "Off", values: defaultState, heroMode: "off", heroes: ["hero_haze"] }),
    createProfile({ id: "all", name: "All", values: defaultState, heroMode: "all", heroes: ["hero_haze"] }),
    createProfile({ id: "selected", name: "Selected", values: defaultState, heroMode: "selected", heroes: ["haze"] })
  ];

  saveProfileState(storage, { profiles, activeProfileId: "selected" });
  const loaded = loadProfileState(storage, defaultState);
  const presets = loaded.profiles.map(profileToPreset);

  assert.deepEqual(loaded.profiles.map((profile) => profile.heroMode), ["off", "all", "selected"]);
  assert.deepEqual(loaded.profiles.map((profile) => profile.heroes), [[], [], ["hero_haze"]]);
  assert.deepEqual(presets.map((preset) => preset.heroMode), ["off", "all", "selected"]);
  assert.deepEqual(presets.map((preset) => preset.heroes), [[], [], ["hero_haze"]]);
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
