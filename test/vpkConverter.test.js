import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { BASE_HUD_SOURCE_PATH, HP_COLORS_MOD_VARIANTS, buildHpColorsPackage } from "../src/packageBuilder.js";
import { convertHpColorsPresetVpk } from "../src/vpkConverter.js";
import { readVpk } from "../src/vpkReader.js";
import { extractPanoramaLayoutSource } from "../src/source2ResourceReader.js";
import { writeVpk } from "../src/vpkWriter.js";

const BASE_HUD_TEMPLATE = [
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

const PRESET = {
  name: "Wrong Target Test",
  version: 1,
  values: {
    ...Object.fromEntries(Object.entries(HP_SCHEMA).map(([id, spec]) => [id, spec.defaultValue])),
    hp_color_low: "#E16161",
    hp_counter_size: 187
  }
};

function buildPresetVpk(modVariant) {
  const result = buildHpColorsPackage({
    sourceTexts: { [BASE_HUD_SOURCE_PATH]: BASE_HUD_TEMPLATE },
    preset: PRESET,
    modVariant
  });
  return writeVpk(result.files);
}

function readConvertedBaseHudXml(files) {
  const vpk = writeVpk(files);
  const entries = readVpk(vpk);
  const baseHud = entries.find((entry) => entry.path === "panorama/layout/base_hud.vxml_c");
  assert.ok(baseHud);
  return extractPanoramaLayoutSource(baseHud.bytes);
}

test("convertHpColorsPresetVpk retargets a full preset VPK to the minimal mod", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.FULL),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.MINIMAL
  });

  const xml = readConvertedBaseHudXml(converted.files);

  assert.equal(converted.modVariant, HP_COLORS_MOD_VARIANTS.MINIMAL);
  assert.equal(converted.preset.name, PRESET.name);
  assert.equal(converted.preset.values.hp_color_low, "#E16161");
  assert.equal(converted.preset.values.hp_counter_size, 187);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
});

test("convertHpColorsPresetVpk retargets a minimal preset VPK back to the full mod", () => {
  const converted = convertHpColorsPresetVpk({
    vpkBytes: buildPresetVpk(HP_COLORS_MOD_VARIANTS.MINIMAL),
    baseHudXml: BASE_HUD_TEMPLATE,
    targetModVariant: HP_COLORS_MOD_VARIANTS.FULL
  });

  const xml = readConvertedBaseHudXml(converted.files);

  assert.equal(converted.modVariant, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(converted.preset.name, PRESET.name);
  assert.match(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.match(xml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.match(xml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
  assert.match(xml, /HPColorsPresetStore/);
});
