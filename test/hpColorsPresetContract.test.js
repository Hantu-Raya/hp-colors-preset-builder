import assert from "node:assert/strict";
import test from "node:test";

import {
  HP_ACCEPTED_INPUT_SHAPES,
  HP_ACCEPTED_INPUT_VERSIONS,
  HP_COLORS_PRESET_CONTRACT,
  HP_FULL_ONLY_EXCLUDED_FIELD_IDS,
  HP_HERO_CATALOG,
  HP_PERSIST_ALIASES,
  HP_PRESET_FIELD_IDS,
  HP_PRESET_PAYLOAD_VERSION,
  HP_PRESET_SCHEMA,
  HP_RUNTIME_STORAGE_VERSION
} from "../src/contracts/hpColorsPresetContract.js";
import { HP_HEROES } from "../src/hpHeroData.js";


test("canonical contract exposes the shared 56-field runtime schema", () => {
  assert.equal(HP_PRESET_FIELD_IDS.length, 56);
  assert.deepEqual(HP_FULL_ONLY_EXCLUDED_FIELD_IDS, []);
  assert.equal(HP_PRESET_FIELD_IDS.length, 56);
  assert.equal(HP_RUNTIME_STORAGE_VERSION, 99);
  assert.equal(Object.keys(HP_PERSIST_ALIASES).length, 56);
  assert.equal(HP_COLORS_PRESET_CONTRACT.fields, HP_PRESET_SCHEMA);
});

test("canonical contract owns payload versions, field metadata, and current heroes", () => {
  assert.equal(HP_PRESET_PAYLOAD_VERSION, 1);
  assert.ok(HP_ACCEPTED_INPUT_VERSIONS.includes(99));
  assert.ok(HP_ACCEPTED_INPUT_VERSIONS.includes(1));
  assert.deepEqual(HP_ACCEPTED_INPUT_SHAPES, ["verbose", "compact", "minimal", "legacy-tuple"]);
  assert.equal(HP_PRESET_SCHEMA.hp_friend_bullet_shield_color.defaultValue, "#FFFFFF");
  assert.equal(HP_HERO_CATALOG.length, HP_HEROES.length);
  assert.deepEqual(HP_HERO_CATALOG.map(({ id, name }) => ({ id, name })), HP_HEROES.map(({ id, name }) => ({ id, name })));
  assert.equal(HP_HERO_CATALOG.find((hero) => hero.id === "hero_gigawatt").name, "Seven");
});
