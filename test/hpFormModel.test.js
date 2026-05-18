import assert from "node:assert/strict";
import test from "node:test";
import { HP_SCHEMA } from "../src/hpSchema.js";
import { createDefaultFormState, isFieldVisible, splitCategoryGroups } from "../src/hpFormModel.js";

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
  const groups = leafGroups(splitCategoryGroups(HP_SCHEMA));
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
  const state = createDefaultFormState(HP_SCHEMA);
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("visibility follows visibleWhen rules", () => {
  const state = createDefaultFormState(HP_SCHEMA);
  assert.equal(isFieldVisible(HP_SCHEMA.hp_text_color_low, state), false);
  state.hp_text_color_mode = 1;
  assert.equal(isFieldVisible(HP_SCHEMA.hp_text_color_low, state), true);
});
