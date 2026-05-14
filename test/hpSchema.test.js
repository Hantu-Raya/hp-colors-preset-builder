import test from "node:test";
import assert from "node:assert/strict";
import { HP_SCHEMA, coerceHpValue } from "../src/hpSchema.js";

test("HP schema exposes the supported preset fields", () => {
  assert.deepEqual(Object.keys(HP_SCHEMA).sort(), [
    "hp_bg_visible",
    "hp_color_high",
    "hp_color_low",
    "hp_color_mid",
    "hp_counter_format",
    "hp_counter_position",
    "hp_counter_size",
    "hp_enabled",
    "hp_friend_color_high",
    "hp_friend_color_low",
    "hp_friend_color_mid",
    "hp_friend_enabled",
    "hp_friend_pulse_bpm",
    "hp_friend_pulse_color",
    "hp_friend_pulse_color_enabled",
    "hp_friend_pulse_enabled",
    "hp_friend_pulse_intensity",
    "hp_friend_pulse_threshold",
    "hp_healthbar_height",
    "hp_high_threshold",
    "hp_info_health_margin_top",
    "hp_kill_zone_color",
    "hp_kill_zone_enabled",
    "hp_kill_zone_threshold",
    "hp_kill_zone_width",
    "hp_level_number_visible",
    "hp_low_threshold",
    "hp_mode",
    "hp_pip_visible",
    "hp_pulse_bpm",
    "hp_pulse_enabled",
    "hp_pulse_hide_bar",
    "hp_pulse_intensity",
    "hp_pulse_text_enabled",
    "hp_pulse_text_position",
    "hp_pulse_text_scale",
    "hp_pulse_threshold",
    "hp_skip_buildings",
    "hp_team_colors",
    "hp_text_color_high",
    "hp_text_color_low",
    "hp_text_color_mid",
    "hp_text_color_mode",
    "hp_ult_color_custom",
    "hp_ult_color_enabled"
  ]);
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
});

test("HP schema canonicalizes colors and rejects style strings", () => {
  assert.equal(coerceHpValue("hp_color_low", "#abc"), "#AABBCC");
  assert.equal(coerceHpValue("hp_color_low", "#abcdef"), "#ABCDEF");
  assert.equal(coerceHpValue("hp_color_low", "not-a-color;visibility:collapse"), HP_SCHEMA.hp_color_low.defaultValue);
  assert.equal(coerceHpValue("hp_color_low", 'url("s2r://panorama/images/hud/icon.png")'), HP_SCHEMA.hp_color_low.defaultValue);
});
