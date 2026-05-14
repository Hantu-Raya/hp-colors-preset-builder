import assert from "node:assert/strict";
import test from "node:test";
import { HP_SCHEMA } from "../src/hpSchema.js";
import { buildCategoryGroups, createDefaultFormState, isFieldVisible } from "../src/hpFormModel.js";

test("schema groups follow registrar categories", () => {
  const groups = buildCategoryGroups(HP_SCHEMA);
  assert.deepEqual(groups.map((g) => g.category), [
    "GENERAL|Core Behavior",
    "HEALTH BARS|Enemy Colors",
    "VISUAL EFFECTS|Low HP Pulse",
    "HEALTH BARS|Number Overlay",
    "HEALTH BARS|Ally Colors",
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
