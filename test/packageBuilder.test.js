import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { BASE_HUD_SOURCE_PATH, buildHpColorsPackage } from "../src/packageBuilder.js";

test("buildHpColorsPackage compiles only the base_hud override", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({ sourceTexts });

  assert.match(result.baseHudXml, /HPColorsPresetStore/);
  assert.equal(result.files.length, 1);
  assert.deepEqual(
    result.files.map((file) => file.path).sort(),
    ["panorama/layout/base_hud.vxml_c"]
  );
});

test("buildHpColorsPackage uses schema defaults when no preset is provided", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({ sourceTexts });

  assert.equal(result.preset.values.hp_enabled, HP_SCHEMA.hp_enabled.defaultValue);
  assert.equal(result.preset.values.hp_color_low, HP_SCHEMA.hp_color_low.defaultValue);
  assert.equal(result.preset.values.hp_counter_position, HP_SCHEMA.hp_counter_position.defaultValue);
});
