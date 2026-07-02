import assert from "node:assert/strict";
import test from "node:test";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { HP_COLORS_MOD_VARIANTS, buildHpColorsPackage } from "../src/packageBuilder.js";
import { HP_COLORS_PACKAGE_ARTIFACTS } from "../src/packageArtifacts.js";
import { convertHpColorsPresetVpk } from "../src/vpkConverter.js";
import { readVpkArchive, writeVpkArchive } from "../src/vpkArchive.js";
import { compileSource2Resource, extractSource2Resource } from "../src/source2ResourceCodec.js";
import { encodePresetStoreEntry } from "../src/presetStoreXml.js";

const BASE_HUD_TEMPLATE = [
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

const PRESET = {
  name: "Wrong Target Test",
  version: 1,
  values: {
    ...HP_FIELD_CATALOG.createDefaultState(),
    hp_color_low: "#E16161",
    hp_counter_size: 187
  }
};

function buildPresetVpk(modVariant, overrides = {}) {
  const result = buildHpColorsPackage({
    sourceTexts: { [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: BASE_HUD_TEMPLATE },
    preset: overrides.preset || PRESET,
    presets: overrides.presets,
    modVariant
  });
  return result.vpkBytes;
}

function readConvertedBaseHudXml(vpkBytes) {
  const entries = readVpkArchive(vpkBytes).files;
  const baseHud = entries.find((entry) => entry.path === HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath);
  assert.ok(baseHud);
  return extractSource2Resource({ bytes: baseHud.bytes, codec: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec });
}

function extractScriptIncludes(baseHudXml) {
  const scripts = baseHudXml.match(/<scripts>[\s\S]*?<\/scripts>/)?.[0] || "";
  return [...scripts.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
}

function buildRawBaseHudVpk(baseHudXml) {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;
  return writeVpkArchive({
    files: [{
      path: artifact.archivePath,
      bytes: compileSource2Resource({ sourceText: baseHudXml, codec: artifact.codec })
    }]
  });
}

test("convertHpColorsPresetVpk retargets a full preset VPK to the minimal mod", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.MINIMAL
  });

  const xml = readConvertedBaseHudXml(converted.vpkBytes);

  assert.equal(converted.modVariant, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(converted.preset.name, PRESET.name);
  assert.equal(converted.preset.values.hp_color_low, "#E16161");
  assert.equal(converted.preset.values.hp_counter_size, 187);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(xml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
});

test("convertHpColorsPresetVpk defaults to the minimal mod", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL),
    baseHudXml: BASE_HUD_TEMPLATE
  });
  const xml = readConvertedBaseHudXml(converted.vpkBytes);

  assert.equal(converted.modVariant, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(xml, /s2r:\/\/panorama\/scripts\/anita_ui_core\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
});

test("convertHpColorsPresetVpk retargets a minimal preset VPK back to the full mod", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.MINIMAL),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  const xml = readConvertedBaseHudXml(converted.vpkBytes);

  assert.equal(converted.modVariant, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(converted.preset.name, PRESET.name);
  assert.match(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.deepEqual(extractScriptIncludes(xml), [
    "s2r://panorama/scripts/anita_ui_core.vjs_c"
  ]);
  assert.match(xml, /HPColorsPresetStore/);
});

test("convertHpColorsPresetVpk preserves multiple hero-targeted presets", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL, {
      presets: [
        { name: "Shiv", version: 1, values: { hp_color_low: "#111111" }, heroes: ["hero_shiv"] },
        { name: "Bebop", version: 1, values: { hp_color_low: "#222222" }, heroes: ["hero_bebop"] }
      ]
    }),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  const xml = readConvertedBaseHudXml(converted.vpkBytes);

  assert.equal(converted.presets.length, 2);
  assert.deepEqual(converted.presets.map((preset) => preset.name), ["Shiv", "Bebop"]);
  assert.deepEqual(converted.presets.map((preset) => preset.heroMode), ["selected", "selected"]);
  assert.deepEqual(converted.presets.map((preset) => preset.heroes), [["hero_shiv"], ["hero_bebop"]]);
  assert.equal((xml.match(/hp_colors_preset_entry/g) || []).length, 2);
});

test("convertHpColorsPresetVpk preserves explicit off and all hero modes", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL, {
      presets: [
        { name: "Disabled", version: 1, values: { hp_color_low: "#111111" }, heroMode: "off", heroes: ["hero_haze"] },
        { name: "Global", version: 1, values: { hp_color_low: "#222222" }, heroMode: "all", heroes: ["hero_haze"] }
      ]
    }),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  assert.deepEqual(converted.presets.map((preset) => preset.heroMode), ["off", "all"]);
  assert.deepEqual(converted.presets.map((preset) => preset.heroes), [[], []]);
});

test("convertHpColorsPresetVpk returns an artifact manifest for the rebuilt package", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.MINIMAL
  });

  assert.equal(converted.manifest.files.length, 1);
  assert.equal(converted.manifest.files[0].id, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.id);
  assert.equal(converted.manifest.files[0].archivePath, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath);
  assert.equal(converted.manifest.files[0].codec, HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec);
  assert.ok(converted.manifest.files[0].byteLength > 0);
});

test("convertHpColorsPresetVpk reads preset labels with text before class", () => {
  const preset = {
    name: "Text First",
    version: 1,
    values: { hp_color_low: "#112233" }
  };
  const sourceBaseHudXml = [
    "<root>",
    '\t<Panel id="AnitaUI_Anchor" hittest="false" />',
    '\t<Panel id="HPColorsPresetStore" hittest="false">',
    `\t\t<Label id="HPColorsPreset_001" text="${encodePresetStoreEntry(preset)}" class="foo hp_colors_preset_entry" />`,
    "\t</Panel>",
    "</root>"
  ].join("\n");

  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildRawBaseHudVpk(sourceBaseHudXml),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  assert.equal(converted.preset.name, "Text First");
  assert.equal(converted.preset.values.hp_color_low, "#112233");
});

test("convertHpColorsPresetVpk reports malformed base HUD resources", () => {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;
  const vpkBytes = writeVpkArchive({
    files: [{ path: artifact.archivePath, bytes: new Uint8Array([1, 2, 3]) }]
  });

  assert.throws(
    () => convertHpColorsPresetVpk({ vpkBytes, baseHudXml: BASE_HUD_TEMPLATE }),
    /Invalid Source 2 resource|Invalid Panorama layout resource/
  );
});
