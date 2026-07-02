import assert from "node:assert/strict";
import test from "node:test";
import { HP_FIELD_CATALOG, HP_SCHEMA } from "../src/hpSchema.js";

function leafGroups(groups) {
  const leaves = [];
  const walk = (group) => {
    if (group.fields?.length) leaves.push(group);
    for (const child of group.children || []) walk(child);
  };
  for (const group of groups) walk(group);
  return leaves;
}

test("schema groups follow registrar categories", () => {
  const groups = leafGroups(HP_FIELD_CATALOG.splitCategoryGroups());
  assert.deepEqual(groups.map((g) => g.path.join("|")), [
    "GENERAL|Core Behavior",
    "HEALTH BARS|Enemy Colors",
    "HEALTH BARS|Number Overlay",
    "HEALTH BARS|Ally Colors",
    "VISUAL EFFECTS|Low HP Pulse",
    "VISUAL EFFECTS|Kill Marker"
  ]);
  assert.equal(groups[0].fields[0].id, "hp_enabled");
});

test("default state includes all schema ids", () => {
  const state = HP_FIELD_CATALOG.createDefaultState();
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("visibility follows visibleWhen rules", () => {
  const state = HP_FIELD_CATALOG.createDefaultState();
  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_text_color_low, state), false);
  state.hp_text_color_mode = 1;
  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_text_color_low, state), true);
});

test("ally layer colors follow ally visibility rules", () => {
  const state = HP_FIELD_CATALOG.createDefaultState();

  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_friend_heal_color, state), false);
  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_friend_delta_color, state), false);

  state.hp_friend_enabled = true;

  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_friend_heal_color, state), true);
  assert.equal(HP_FIELD_CATALOG.isFieldVisible(HP_SCHEMA.hp_friend_delta_color, state), true);
});

test("field catalog sanitizes state through HP schema defaults", () => {
  const state = HP_FIELD_CATALOG.createDefaultState();
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));

  const sanitized = HP_FIELD_CATALOG.sanitizeState({ hp_low_threshold: 999, hp_color_low: "#abc" });
  assert.equal(sanitized.hp_low_threshold, 100);
  assert.equal(sanitized.hp_color_low, "#AABBCC");
  assert.equal(HP_FIELD_CATALOG.coerceValue("hp_heal_color", "#abc"), "#AABBCC");
});
