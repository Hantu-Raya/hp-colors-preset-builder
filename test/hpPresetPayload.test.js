import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import {
  HP_PERSIST_ALIASES,
  compactHpPresetValues,
  expandHpPresetValueAliases,
  normalizeHpPresetPayload,
  normalizeHpPresetValues
} from "../src/hpPresetPayload.js";

test("alias catalog covers every schema field exactly once", () => {
  const schemaKeys = Object.keys(HP_SCHEMA).sort();
  const aliasEntries = Object.entries(HP_PERSIST_ALIASES);
  const aliasValues = aliasEntries.map(([, alias]) => alias);

  assert.deepEqual(Object.keys(HP_PERSIST_ALIASES).sort(), schemaKeys);
  assert.equal(new Set(aliasValues).size, aliasValues.length);
  assert.equal(HP_PERSIST_ALIASES.hp_bullet_shield_color, "ebsc");
  assert.equal(HP_PERSIST_ALIASES.hp_friend_bullet_shield_color, "fbsc");
  assert.equal(aliasEntries.length, 55);
});

test("expandHpPresetValueAliases accepts compact aliases and full field ids together", () => {
  assert.deepEqual(
    expandHpPresetValueAliases({ e: false, hp_color_low: "#abc", pc: "#123456", ebsc: "#ffffff", fbsc: "#acca91" }),
    {
      hp_enabled: false,
      hp_color_low: "#abc",
      hp_pulse_color: "#123456",
      hp_bullet_shield_color: "#ffffff",
      hp_friend_bullet_shield_color: "#acca91"
    }
  );
});

test("expandHpPresetValueAliases keeps full field ids over compact aliases", () => {
  assert.deepEqual(
    expandHpPresetValueAliases({
      hp_bullet_shield_color: "#112233",
      ebsc: "#445566",
      hp_friend_bullet_shield_color: "#778899",
      fbsc: "#AABBCC"
    }),
    {
      hp_bullet_shield_color: "#112233",
      hp_friend_bullet_shield_color: "#778899"
    }
  );
});

test("compactHpPresetValues exports bullet shield values with compact aliases", () => {
  const compact = compactHpPresetValues({
    hp_bullet_shield_color: "#ffffff",
    hp_friend_bullet_shield_color: "#acca91"
  });

  assert.equal(Object.keys(compact).length, 55);
  assert.deepEqual(Object.keys(compact).sort(), Object.values(HP_PERSIST_ALIASES).sort());
  assert.equal(compact.ebsc, "#FFFFFF");
  assert.equal(compact.fbsc, "#ACCA91");
  assert.deepEqual(expandHpPresetValueAliases({ ebsc: compact.ebsc, fbsc: compact.fbsc }), {
    hp_bullet_shield_color: "#FFFFFF",
    hp_friend_bullet_shield_color: "#ACCA91"
  });
});

test("expandHpPresetValueAliases rejects unknown aliases", () => {
  assert.throws(
    () => expandHpPresetValueAliases({ zz: 1 }),
    /Unknown alias or field id: zz/
  );
});

test("normalizeHpPresetValues expands aliases and coerces through the full schema", () => {
  const values = normalizeHpPresetValues({ e: false, cl: "#abc", l: 999, m: 99, ebsc: "#ffffff", fbsc: "#acca91" });

  assert.equal(values.hp_enabled, false);
  assert.equal(values.hp_color_low, "#AABBCC");
  assert.equal(values.hp_low_threshold, 100);
  assert.equal(values.hp_bullet_shield_color, "#FFFFFF");
  assert.equal(values.hp_friend_bullet_shield_color, "#ACCA91");
  assert.equal(values.hp_mode, HP_SCHEMA.hp_mode.defaultValue);
  assert.deepEqual(Object.keys(values), Object.keys(HP_SCHEMA));
});

test("normalizeHpPresetValues requireObject rejects non-object payload values", () => {
  assert.throws(
    () => normalizeHpPresetValues(null, { requireObject: true }),
    /Invalid JSON payload/
  );
  assert.throws(
    () => normalizeHpPresetValues([], { requireObject: true }),
    /Invalid JSON payload/
  );
});

test("normalizeHpPresetPayload reads compact keys and canonicalizes values and hero scope", () => {
  const payload = normalizeHpPresetPayload(
    { n: " Shiv ", vs: { e: false, cl: "#abc" }, hm: "selected", hs: ["shiv", "unknown", "hero_bebop"] },
    { index: 2 }
  );

  assert.deepEqual(Object.keys(payload).sort(), ["heroMode", "heroes", "name", "values", "version"].sort());
  assert.equal(payload.name, "Shiv");
  assert.equal(payload.version, 1);
  assert.equal(payload.values.hp_enabled, false);
  assert.equal(payload.values.hp_color_low, "#AABBCC");
  assert.deepEqual(Object.keys(payload.values), Object.keys(HP_SCHEMA));
  assert.equal(payload.heroMode, "selected");
  assert.deepEqual(payload.heroes, ["hero_shiv", "hero_bebop"]);
});

test("normalizeHpPresetPayload falls back blank names unless preservation is requested", () => {
  assert.equal(normalizeHpPresetPayload({ name: "" }, { index: 0 }).name, "Web Builder Preset");
  assert.equal(normalizeHpPresetPayload({ name: "" }, { preserveBlankName: true }).name, "");
});
