import assert from "node:assert/strict";
import test from "node:test";

import { HP_FIELD_CATALOG, HP_SCHEMA } from "../src/hpSchema.js";
import {
  addProfile,
  createInitialProfile,
  createProfile,
  loadProfileState,
  HP_PROFILE_LIMIT,
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
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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

test("signature conditions round trip through profile storage and preset export", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const storage = createMemoryStorage();
  const profile = createProfile({
    id: "conditional",
    name: "Conditional",
    values: defaultState,
    overrides: { hp_color_low: { slot: 2, minTier: 3, value: "#123456" } }
  });

  saveProfileState(storage, { profiles: [profile], activeProfileId: profile.id });
  const loaded = loadProfileState(storage, defaultState);
  const preset = profileToPreset(loaded.profiles[0]);

  assert.deepEqual(preset.overrides, {
    hp_color_low: { slot: 2, minTier: 3, value: "#123456" }
  });
});

test("new profiles default to all heroes when no mode or heroes are supplied", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const profile = createProfile({ id: "first", name: "Global", values: defaultState });

  assert.deepEqual(profile.heroes, []);
  assert.equal(profile.heroMode, "all");
  assert.deepEqual(profileToPreset(profile).heroes, []);
  assert.equal(profileToPreset(profile).heroMode, "all");
});

test("new profiles default to all heroes while explicit off remains off", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const initial = createInitialProfile(defaultState);
  const added = addProfile([initial], defaultState).profiles[1];
  const importedOff = createProfile({ id: "off", name: "Imported off", values: defaultState, heroMode: "off" });

  assert.equal(initial.heroMode, "all");
  assert.equal(added.heroMode, "all");
  assert.equal(importedOff.heroMode, "off");
});

test("createProfile accepts compact values and hero keys", () => {
  const profile = createProfile({
    id: "compact",
    n: "Compact Lane",
    vs: { e: false, cl: "#abc" },
    hm: "selected",
    hs: ["shiv", "unknown", "hero_bebop"]
  });

  assert.equal(profile.id, "compact");
  assert.equal(profile.name, "Compact Lane");
  assert.equal(profile.values.hp_enabled, false);
  assert.equal(profile.values.hp_color_low, "#AABBCC");
  assert.deepEqual(Object.keys(profile.values), Object.keys(HP_SCHEMA));
  assert.equal(profile.heroMode, "selected");
  assert.deepEqual(profile.heroes, ["hero_shiv", "hero_bebop"]);
});

test("profile hero scope modes round trip through storage and preset export", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const profiles = [
    createProfile({ id: "first", name: "Lane", values: defaultState }),
    createProfile({ id: "second", name: "Teamfight", values: defaultState }),
    createProfile({ id: "third", name: "Late", values: defaultState })
  ];

  const reordered = reorderProfiles(profiles, 2, 0);

  assert.deepEqual(reordered.map((profile) => profile.id), ["third", "first", "second"]);
});

test("profileToPreset preserves ordered build JSON shape", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
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

test("profileToPreset preserves healthbar layer colors", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const preset = profileToPreset(createProfile({
    id: "layers",
    name: "Layers",
    values: {
      ...defaultState,
      hp_heal_color: "#66ff88",
      hp_delta_color: "#ffee66",
      hp_friend_heal_color: "#55ee99",
      hp_friend_delta_color: "#776655"
    }
  }));

  assert.equal(preset.values.hp_heal_color, "#66FF88");
  assert.equal(preset.values.hp_delta_color, "#FFEE66");
  assert.equal(preset.values.hp_friend_heal_color, "#55EE99");
  assert.equal(preset.values.hp_friend_delta_color, "#776655");
});

test("profileToPreset expands compact aliases through the public preset shape", () => {
  const preset = profileToPreset({
    name: "Compact Preset",
    values: { e: false, cl: "#abc" },
    heroMode: "selected",
    heroes: ["shiv", "unknown", "hero_bebop"]
  });

  assert.equal(preset.name, "Compact Preset");
  assert.equal(preset.version, 1);
  assert.equal(preset.values.hp_enabled, false);
  assert.equal(preset.values.hp_color_low, "#AABBCC");
  assert.deepEqual(Object.keys(preset.values), Object.keys(HP_SCHEMA));
  assert.equal(preset.heroMode, "selected");
  assert.deepEqual(preset.heroes, ["hero_shiv", "hero_bebop"]);
});

test("profile blank names stay editable but preset export falls back", () => {
  const profile = createProfile({ name: "" });
  const preset = profileToPreset(profile, 0);

  assert.equal(profile.name, "");
  assert.equal(preset.name, "Web Builder Preset");
});

test("profile count is capped at the contract limit", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const profiles = Array.from({ length: HP_PROFILE_LIMIT }, (_, index) => createProfile({
    id: `profile-${index + 1}`,
    name: `Profile ${index + 1}`,
    values: defaultState
  }));
  const result = addProfile(profiles, defaultState);

  assert.equal(result.profiles.length, HP_PROFILE_LIMIT);
  assert.equal(result.limitReached, true);
});

test("storage security and quota failures are returned to the caller", () => {
  const defaultState = HP_FIELD_CATALOG.createDefaultState();
  const blockedRead = loadProfileState({ getItem() { throw new DOMException("Blocked", "SecurityError"); } }, defaultState);
  assert.match(blockedRead.error, /could not be read: Blocked/);
  assert.equal(blockedRead.profiles.length, 1);

  const blockedWrite = saveProfileState({
    setItem() { throw new DOMException("Quota full", "QuotaExceededError"); }
  }, { profiles: [createInitialProfile(defaultState)], activeProfileId: "profile-1" });
  assert.equal(blockedWrite.ok, false);
  assert.match(blockedWrite.error, /could not be saved: Quota full/);
});
