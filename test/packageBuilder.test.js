import assert from "node:assert/strict";
import test from "node:test";

import { HP_PERSIST_ALIASES, compactHpPresetValues } from "../src/hpPresetPayload.js";
import { HP_SCHEMA } from "../src/hpSchema.js";
import {
  HP_COLORS_MOD_VARIANTS,
  buildHpColorsPackage,
  buildHpColorsPackageFromPlan,
  createHpColorsPackagePlan
} from "../src/packageBuilder.js";
import { HP_COLORS_PACKAGE_ARTIFACTS } from "../src/packageArtifacts.js";
import { readPresetStoreFromBaseHudXml } from "../src/presetStoreXml.js";
import { extractSource2Resource } from "../src/source2ResourceCodec.js";
import { readVpkArchive } from "../src/vpkArchive.js";

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

function extractBaseHudXmlFromPackage(result) {
  const entries = readVpkArchive(result.vpkBytes).files;
  const baseHud = entries.find((entry) => entry.path === HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath);
  assert.ok(baseHud);
  return extractSource2Resource({ bytes: baseHud.bytes, codec: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec });
}

function extractScriptIncludes(baseHudXml) {
  const scripts = baseHudXml.match(/<scripts>[\s\S]*?<\/scripts>/)?.[0] || "";
  return [...scripts.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
}

test("createHpColorsPackagePlan returns a base HUD source artifact with package identity", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_WITH_ANITA_STYLE
  };

  const plan = createHpColorsPackagePlan({
    sourceTexts,
    preset: { name: "Lane", values: { hp_color_low: "#112233" } },
    modVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  assert.equal(plan.preset.name, "Lane");
  assert.equal(plan.modVariant, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(plan.artifacts.length, 1);
  assert.deepEqual(
    {
      id: plan.artifacts[0].id,
      sourcePath: plan.artifacts[0].sourcePath,
      archivePath: plan.artifacts[0].archivePath,
      codec: plan.artifacts[0].codec
    },
    {
      id: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.id,
      sourcePath: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath,
      archivePath: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath,
      codec: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec
    }
  );
  assert.match(plan.artifacts[0].sourceText, /HPColorsPresetStore/);
});

test("buildHpColorsPackageFromPlan compiles the plan manifest", () => {
  const plan = createHpColorsPackagePlan({
    sourceTexts: {
      [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_WITH_ANITA_STYLE
    }
  });

  const result = buildHpColorsPackageFromPlan(plan);
  const entries = readVpkArchive(result.vpkBytes).files;

  assert.equal(result.manifest.files.length, 1);
  assert.equal(result.manifest.files[0].id, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.id);
  assert.equal(result.manifest.files[0].archivePath, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath);
  assert.equal(result.manifest.files[0].codec, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec);
  assert.ok(result.manifest.files[0].byteLength > 0);
  assert.deepEqual(entries.map((entry) => entry.path), [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath]);
});
test("buildHpColorsPackage compiles only the base_hud override", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({ sourceTexts });
  const entries = readVpkArchive(result.vpkBytes).files;
  const baseHudXml = extractBaseHudXmlFromPackage(result);

  assert.ok(result.vpkBytes instanceof Uint8Array);
  assert.match(baseHudXml, /HPColorsPresetStore/);
  assert.equal(entries.length, 1);
  assert.deepEqual(
    entries.map((file) => file.path).sort(),
    ["panorama/layout/base_hud.vxml_c"]
  );
});

test("buildHpColorsPackage uses schema defaults when no preset is provided", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({ sourceTexts });

  assert.equal(result.preset.values.hp_enabled, HP_SCHEMA.hp_enabled.defaultValue);
  assert.equal(result.preset.values.hp_color_low, HP_SCHEMA.hp_color_low.defaultValue);
  assert.equal(result.preset.values.hp_counter_position, HP_SCHEMA.hp_counter_position.defaultValue);
  assert.equal(result.preset.heroMode, "off");
  assert.deepEqual(result.preset.heroes, []);
});

test("buildHpColorsPackage keeps only the core script include for the full mod", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts, modVariant: HP_COLORS_MOD_VARIANTS.FULL });
  const baseHudXml = extractBaseHudXmlFromPackage(result);

  assert.match(baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.deepEqual(extractScriptIncludes(baseHudXml), [
    "s2r://panorama/scripts/anita_ui_core.vjs_c"
  ]);
});

test("buildHpColorsPackage defaults to the minimal mod layout", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts });
  const baseHudXml = extractBaseHudXmlFromPackage(result);

  assert.equal(result.modVariant, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(baseHudXml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
  assert.match(baseHudXml, /HPColorsPresetStore/);
});

test("buildHpColorsPackage removes Anita UI includes for the minimal mod", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_WITH_ANITA_STYLE
  };

  const result = buildHpColorsPackage({ sourceTexts, modVariant: HP_COLORS_MOD_VARIANTS.MINIMAL });
  const baseHudXml = extractBaseHudXmlFromPackage(result);

  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(baseHudXml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(baseHudXml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
  assert.match(baseHudXml, /s2r:\/\/panorama\/styles\/base\.vcss_c/);
  assert.match(baseHudXml, /HPColorsPresetStore/);
});

test("buildHpColorsPackage writes multiple profile presets into one store", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };
  const presets = [
    { name: "Lane", version: 1, values: { hp_color_low: "#111111" } },
    { name: "Teamfight", version: 1, values: { hp_color_low: "#222222" } }
  ];

  const result = buildHpColorsPackage({ sourceTexts, presets });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const decoded = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.equal(result.preset.name, "Lane");
  assert.equal(result.presets.length, 2);
  assert.match(baseHudXml, /HPColorsPreset_001/);
  assert.match(baseHudXml, /HPColorsPreset_002/);
  assert.deepEqual(decoded.map((item) => item.name), ["Lane", "Teamfight"]);
});

test("buildHpColorsPackage preserves profile heroes in the preset store", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [
      { name: "Shiv Lane", version: 1, values: { hp_color_low: "#111111" }, heroes: ["shiv", "hero_bebop"] },
      { name: "Global", version: 1, values: { hp_color_low: "#222222" } }
    ]
  });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const decoded = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.deepEqual(result.presets[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(result.presets[0].heroMode, "selected");
  assert.deepEqual(decoded[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(decoded[0].heroMode, "selected");
  assert.deepEqual(decoded[1].heroes, []);
  assert.equal(decoded[1].heroMode, "off");
});

test("buildHpColorsPackage preserves explicit off and all hero modes", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [
      { name: "Disabled", version: 1, values: { hp_color_low: "#111111" }, heroMode: "off", heroes: ["hero_haze"] },
      { name: "Global", version: 1, values: { hp_color_low: "#222222" }, heroMode: "all", heroes: ["hero_haze"] }
    ]
  });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const decoded = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.deepEqual(result.presets.map((preset) => preset.heroMode), ["off", "all"]);
  assert.deepEqual(result.presets.map((preset) => preset.heroes), [[], []]);
  assert.deepEqual(decoded.map((preset) => preset.heroMode), ["off", "all"]);
  assert.deepEqual(decoded.map((preset) => preset.heroes), [[], []]);
});

test("buildHpColorsPackage sanitizes raw profile preset values", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [{ name: "Raw", version: 1, values: { hp_low_threshold: 999, hp_mode: 99 } }]
  });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const [decoded] = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.equal(decoded.values.hp_low_threshold, 100);
  assert.equal(decoded.values.hp_mode, HP_SCHEMA.hp_mode.defaultValue);
});

test("buildHpColorsPackage preserves healthbar layer colors in preset payloads", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    presets: [{
      name: "Layer Colors",
      version: 1,
      values: {
        hp_heal_color: "#66ff88",
        hp_delta_color: "#ffee66",
        hp_friend_heal_color: "#55ee99",
        hp_friend_delta_color: "#776655",
        hp_bullet_shield_color: "#ffffff",
        hp_friend_bullet_shield_color: "#acca91"
      }
    }]
  });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const [decoded] = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.equal(decoded.values.hp_heal_color, "#66FF88");
  assert.equal(decoded.values.hp_delta_color, "#FFEE66");
  assert.equal(decoded.values.hp_friend_heal_color, "#55EE99");
  assert.equal(decoded.values.hp_friend_delta_color, "#776655");
  assert.equal(decoded.values.hp_bullet_shield_color, "#FFFFFF");
  assert.equal(decoded.values.hp_friend_bullet_shield_color, "#ACCA91");
});

test("buildHpColorsPackage accepts compact presets and writes verbose canonical payloads", () => {
  const sourceTexts = {
    [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: '<root><Panel id="AnitaUI_Anchor" hittest="false" /></root>'
  };

  const result = buildHpColorsPackage({
    sourceTexts,
    preset: {
      n: " Shiv ",
      vs: { e: false, cl: "#abc", l: 999, m: 99, ebsc: "#ffffff", fbsc: "#acca91" },
      hm: "selected",
      hs: ["shiv", "unknown", "hero_bebop"]
    }
  });
  const baseHudXml = extractBaseHudXmlFromPackage(result);
  const [decoded] = readPresetStoreFromBaseHudXml(baseHudXml);

  assert.equal(result.preset.name, "Shiv");
  assert.equal(result.preset.values.hp_enabled, false);
  assert.equal(result.preset.values.hp_color_low, "#AABBCC");
  assert.equal(result.preset.values.hp_low_threshold, 100);
  assert.equal(result.preset.values.hp_mode, HP_SCHEMA.hp_mode.defaultValue);
  assert.equal(result.preset.values.hp_bullet_shield_color, "#FFFFFF");
  assert.equal(result.preset.values.hp_friend_bullet_shield_color, "#ACCA91");
  assert.equal(result.preset.heroMode, "selected");
  assert.deepEqual(result.preset.heroes, ["hero_shiv", "hero_bebop"]);

  assert.deepEqual(Object.keys(decoded).sort(), ["heroMode", "heroes", "name", "values", "version"].sort());
  assert.equal(decoded.name, "Shiv");
  assert.equal(decoded.version, 1);
  assert.deepEqual(Object.keys(decoded.values), Object.keys(HP_SCHEMA));
  assert.equal(Object.keys(decoded.values).length, 55);
  assert.equal(decoded.values.hp_enabled, false);
  assert.equal(decoded.values.hp_color_low, "#AABBCC");
  assert.equal(decoded.values.hp_low_threshold, 100);
  assert.equal(decoded.values.hp_mode, HP_SCHEMA.hp_mode.defaultValue);
  assert.equal(decoded.values.hp_bullet_shield_color, "#FFFFFF");
  assert.equal(decoded.values.hp_friend_bullet_shield_color, "#ACCA91");
  const compact = compactHpPresetValues(decoded.values);
  assert.deepEqual(Object.keys(compact).sort(), Object.values(HP_PERSIST_ALIASES).sort());
  assert.equal(compact.ebsc, "#FFFFFF");
  assert.equal(compact.fbsc, "#ACCA91");
  assert.equal(decoded.heroMode, "selected");
  assert.deepEqual(decoded.heroes, ["hero_shiv", "hero_bebop"]);
});
