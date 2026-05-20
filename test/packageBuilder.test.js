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
  '\t\t<include src="s2r://panorama/scripts/anita_ui_core.vjs_c" />',
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
  assert.equal(result.preset.heroMode, "off");
  assert.deepEqual(result.preset.heroes, []);
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

test("buildHpColorsPackage defaults to the minimal mod layout", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts });

  assert.equal(result.modVariant, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(result.baseHudXml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
  assert.match(result.baseHudXml, /HPColorsPresetStore/);
});

test("buildHpColorsPackage removes Anita UI includes for the minimal mod", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts, modVariant: HP_COLORS_MOD_VARIANTS.MINIMAL });

  assert.doesNotMatch(result.baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(result.baseHudXml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
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

test("buildHpColorsPackage preserves profile heroes in the preset store", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [
      { name: "Shiv Lane", version: 1, values: { hp_color_low: "#111111" }, heroes: ["shiv", "hero_bebop"] },
      { name: "Global", version: 1, values: { hp_color_low: "#222222" } }
    ]
  });
  const decoded = [...result.baseHudXml.matchAll(/text="([^"]+)"/g)]
    .map((match) => JSON.parse(base64UrlDecode(match[1])));

  assert.deepEqual(result.presets[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(result.presets[0].heroMode, "selected");
  assert.deepEqual(decoded[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(decoded[0].heroMode, "selected");
  assert.deepEqual(decoded[1].heroes, []);
  assert.equal(decoded[1].heroMode, "off");
});

test("buildHpColorsPackage preserves explicit off and all hero modes", () => {
  const sourceTexts = {
    [BASE_HUD_SOURCE_PATH]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [
      { name: "Disabled", version: 1, values: { hp_color_low: "#111111" }, heroMode: "off", heroes: ["hero_haze"] },
      { name: "Global", version: 1, values: { hp_color_low: "#222222" }, heroMode: "all", heroes: ["hero_haze"] }
    ]
  });
  const decoded = [...result.baseHudXml.matchAll(/text="([^"]+)"/g)]
    .map((match) => JSON.parse(base64UrlDecode(match[1])));

  assert.deepEqual(result.presets.map((preset) => preset.heroMode), ["off", "all"]);
  assert.deepEqual(result.presets.map((preset) => preset.heroes), [[], []]);
  assert.deepEqual(decoded.map((preset) => preset.heroMode), ["off", "all"]);
  assert.deepEqual(decoded.map((preset) => preset.heroes), [[], []]);
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
