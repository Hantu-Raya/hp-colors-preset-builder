import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { BASE_HUD_SOURCE_PATH, HP_COLORS_MOD_VARIANTS, buildHpColorsPackage } from "../src/packageBuilder.js";
import { base64UrlDecode } from "../src/presetStoreXml.js";

const BASE_HUD_WITH_ANITA_STYLE = [
  "<root>",
  "\t<styles>",
  '\t\t<include src="s2r://panorama/styles/base.vcss_c" />',
  '\t\t<include src="s2r://panorama/styles/anita_ui.vcss_c" />',
  "\t</styles>",
  "\t<scripts>",
  '\t\t<include src="s2r://panorama/scripts/anita_persist_loader.vjs_c" />',
  '\t\t<include src="s2r://panorama/scripts/hp_registrar.vjs_c" />',
  "\t</scripts>",
  '\t<Panel id="AnitaUI_Anchor" hittest="false" />',
  "</root>"
].join("\n");

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

test("buildHpColorsPackage keeps anita_ui style include for the full mod", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts, modVariant: HP_COLORS_MOD_VARIANTS.FULL });

  assert.match(result.baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(result.baseHudXml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.match(result.baseHudXml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
});

test("buildHpColorsPackage removes Anita UI includes for the minimal mod", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts, modVariant: HP_COLORS_MOD_VARIANTS.MINIMAL });

  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
  assert.match(result.baseHudXml, /s2r:\/\/panorama\/styles\/base\.vcss_c/);
  assert.match(result.baseHudXml, /HPColorsPresetStore/);
});

test("buildHpColorsPackage writes multiple profile presets into one store", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };
  const presets = [
    { name: "Lane", version: 1, values: { hp_color_low: "#111111" } },
    { name: "Teamfight", version: 1, values: { hp_color_low: "#222222" } }
  ];

  const result = buildHpColorsPackage({ sourceTexts, presets });
  const encodedLabels = [...result.baseHudXml.matchAll(/text="([^"]+)"/g)].map((match) => match[1]);
  const decoded = encodedLabels.map((encoded) => JSON.parse(base64UrlDecode(encoded)));

  assert.equal(result.preset.name, "Lane");
  assert.equal(result.presets.length, 2);
  assert.match(result.baseHudXml, /HPColorsPreset_001/);
  assert.match(result.baseHudXml, /HPColorsPreset_002/);
  assert.deepEqual(decoded.map((item) => item.name), ["Lane", "Teamfight"]);
});

test("buildHpColorsPackage sanitizes raw profile preset values", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [{ name: "Raw", version: 1, values: { hp_low_threshold: 999, hp_mode: 99 } }]
  });
  const encoded = result.baseHudXml.match(/text="([^"]+)"/)[1];
  const decoded = JSON.parse(base64UrlDecode(encoded));

  assert.equal(decoded.values.hp_low_threshold, 100);
  assert.equal(decoded.values.hp_mode, HP_SCHEMA.hp_mode.defaultValue);
});
