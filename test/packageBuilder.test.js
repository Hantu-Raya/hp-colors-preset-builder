import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { buildHpColorsPackage, createRandomPreset } from "../src/packageBuilder.js";

test("createRandomPreset keeps booleans stable and randomizes safe fields", () => {
  const randomValues = [0.01, 0.51, 0.99, 0.25, 0.75, 0.33, 0.67, 0.12, 0.88, 0.45];
  const preset = createRandomPreset(() => randomValues.shift() ?? 0.5);

  assert.equal(preset.version, 1);
  assert.equal(preset.values.hp_enabled, true);
  assert.match(preset.values.hp_color_low, /^#[0-9A-F]{6}$/);
  assert.match(preset.values.hp_color_mid, /^#[0-9A-F]{6}$/);
  assert.ok(Number.isFinite(preset.values.hp_low_threshold));
  assert.ok(preset.values.hp_low_threshold >= 0 && preset.values.hp_low_threshold <= 100);
});

test("buildHpColorsPackage compiles only the base_hud override", () => {
  const sourceTexts = {
    "templates/hp_colors/panorama/scripts/anita_ui_core.js": "console.log('core');",
    "templates/hp_colors/panorama/scripts/anita_persist_loader.js": "console.log('persist');",
    "templates/hp_colors/panorama/scripts/hp_registrar.js": "console.log('registrar');",
    "templates/hp_colors/panorama/scripts/healthbar_logic.js": "console.log('logic');",
    "templates/hp_colors/panorama/styles/anita_ui.css": "Body{}",
    "templates/hp_colors/panorama/styles/unit_status.css": "Body{}",
    "templates/hp_colors/panorama/layout/base_hud.xml": '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>',
    "templates/hp_colors/panorama/layout/hud_escape_menu.xml": '<root />',
    "templates/hp_colors/panorama/layout/hud_health.xml": '<root />',
    "templates/hp_colors/panorama/layout/unit_status_overlay.xml": '<root />'
  };

  const result = buildHpColorsPackage({ sourceTexts, random: () => 0.5 });

  assert.match(result.baseHudXml, /HPColorsPresetStore/);
  assert.equal(result.files.length, 1);
  assert.deepEqual(
    result.files.map((file) => file.path).sort(),
    ["panorama/layout/base_hud.vxml_c"]
  );
});

test("buildHpColorsPackage uses schema defaults when no preset is provided", () => {
  const sourceTexts = {
    "templates/hp_colors/panorama/layout/base_hud.xml": '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({ sourceTexts, random: () => 0.99 });

  assert.equal(result.preset.values.hp_enabled, HP_SCHEMA.hp_enabled.defaultValue);
  assert.equal(result.preset.values.hp_color_low, HP_SCHEMA.hp_color_low.defaultValue);
  assert.equal(result.preset.values.hp_counter_position, HP_SCHEMA.hp_counter_position.defaultValue);
});
