import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HP_SCHEMA, coerceHpValue } from "../src/hpSchema.js";

async function readRegistrarIds() {
  const source = await readFile(new URL("../templates/hp_colors/panorama/scripts/hp_registrar.js", import.meta.url), "utf8");
  return [...source.matchAll(/^\s*\{\s*type:\s*"[^"]+",\s*id:\s*"([a-z0-9_]+)"/gm)]
    .map((match) => match[1])
    .filter((id) => id !== "hp_preset_apply_baked");
}

test("HP schema keys match registrar persisted ids", async () => {
  assert.deepEqual(Object.keys(HP_SCHEMA).sort(), (await readRegistrarIds()).sort());
});

test("HP schema preserves representative metadata", () => {
  assert.deepEqual(HP_SCHEMA.hp_pulse_text_position, {
    type: "positionpicker",
    label: "Pulsing number position",
    category: "VISUAL EFFECTS|Low HP Pulse",
    defaultValue: "20,196",
    visibleWhen: { id: "hp_pulse_text_enabled", equals: true }
  });

  assert.deepEqual(HP_SCHEMA.hp_counter_position, {
    type: "positionpicker",
    label: "HP number position",
    category: "HEALTH BARS|Number Overlay",
    defaultValue: "27,20"
  });

  assert.deepEqual(HP_SCHEMA.hp_pulse_text_scale.visibleWhen, { id: "hp_pulse_text_enabled", equals: true });
  assert.deepEqual(HP_SCHEMA.hp_low_threshold.bounds, { min: 0, max: 100, step: 1 });
  assert.equal(HP_SCHEMA.hp_counter_position.type, "positionpicker");
});

test("HP schema coerces position picker strings", () => {
  assert.equal(coerceHpValue("hp_counter_position", " 12,34 "), "12,34");
  assert.equal(coerceHpValue("hp_counter_position", { x: 5, y: 600 }), "5,400");
  assert.equal(coerceHpValue("hp_counter_position", 1234), "0,400");
  assert.equal(coerceHpValue("hp_counter_position", { x: Number.NaN, y: Number.NaN }), "0,200");
  assert.equal(coerceHpValue("hp_counter_position", { x: 5, y: -250 }), "5,-50");
  assert.equal(coerceHpValue("hp_pulse_text_position", { x: 5, y: -250 }), "5,-50");
});

test("HP schema coerces toggles, cyclers, and sliders like the parser", () => {
  assert.equal(coerceHpValue("hp_enabled", "false"), false);
  assert.equal(coerceHpValue("hp_enabled", " false "), true);
  assert.equal(coerceHpValue("hp_enabled", "0"), false);
  assert.equal(coerceHpValue("hp_enabled", "true"), true);
  assert.equal(coerceHpValue("hp_mode", 99), 1);
  assert.equal(coerceHpValue("hp_mode", -1), 0);
  assert.equal(coerceHpValue("hp_low_threshold", 12.6), 13);
  assert.equal(coerceHpValue("hp_color_low", "not-a-color"), "not-a-color");
});
