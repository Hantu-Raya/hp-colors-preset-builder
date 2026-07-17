import assert from "node:assert/strict";
import test from "node:test";

import { parseHpColorsImportProfiles } from "../src/hpImportCode.js";
import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { HP_COLORS_MOD_VARIANTS, createHpColorsPackagePlan } from "../src/packageBuilder.js";
import { createProfile } from "../src/profileStore.js";
import { createProfileCode } from "../src/presetBuilderExport.js";
import { HP_COLORS_PACKAGE_ARTIFACTS } from "../src/packageArtifacts.js";
import { decodePresetStoreEntry, validatePresetStoreXml } from "../src/presetStoreXml.js";

const sourceTexts = {
  [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: [
    "<root>",
    "  <styles>",
    '    <include src="s2r://panorama/styles/base.vcss_c" />',
    "  </styles>",
    "  <scripts>",
    '    <include src="s2r://panorama/scripts/anita_ui_core.vjs_c" />',
    "  </scripts>",
    '  <Panel id="AnitaUI_Anchor" hittest="false" />',
    "</root>"
  ].join("\n")
};

function targetProfile() {
  const defaults = HP_FIELD_CATALOG.createDefaultState();
  return createProfile({
    id: "target-profile",
    name: "Target profile",
    values: { ...defaults, hp_precise_pips_enabled: true },
    heroMode: "all",
    overrides: {
      hp_low_threshold: { slot: 4, minTier: 3, value: 28 }
    }
  });
}

test("Minimal package stores explicit ppe and compact signature override", () => {
  const payload = validatePresetStoreXml(createHpColorsPackagePlan({
    sourceTexts,
    preset: targetProfile(),
    modVariant: HP_COLORS_MOD_VARIANTS.MINIMAL
  }).artifacts[0].sourceText)[0];

  assert.equal(payload.values.hp_precise_pips_enabled, true);
  assert.deepEqual(payload.o, { l: [4, 3, 28] });
});

test("Full package keeps signature override but serializes ppe as convar-only default", () => {
  const payload = validatePresetStoreXml(createHpColorsPackagePlan({
    sourceTexts,
    preset: targetProfile(),
    modVariant: HP_COLORS_MOD_VARIANTS.FULL
  }).artifacts[0].sourceText)[0];

  assert.equal(payload.values.hp_precise_pips_enabled, false);
  assert.deepEqual(payload.o, { l: [4, 3, 28] });
});

test("profile code preserves explicit ppe and compact signature override", () => {
  const code = createProfileCode(targetProfile());
  const payload = decodePresetStoreEntry(code.slice(code.indexOf(":") + 1));
  const imported = parseHpColorsImportProfiles(code)[0];

  assert.equal(payload.values.hp_precise_pips_enabled, true);
  assert.deepEqual(payload.o, { l: [4, 3, 28] });
  assert.equal(imported.values.hp_precise_pips_enabled, true);
  assert.deepEqual(imported.importFeatures.absentFields, []);
  assert.deepEqual(imported.overrides, {
    hp_low_threshold: { slot: 4, minTier: 3, value: 28 }
  });
});

test("Full profile code preserves signature override without enabling ppe", () => {
  const code = createProfileCode(targetProfile(), 0, HP_COLORS_MOD_VARIANTS.FULL);
  const payload = decodePresetStoreEntry(code.slice(code.indexOf(":") + 1));

  assert.equal(payload.values.hp_precise_pips_enabled, false);
  assert.deepEqual(payload.o, { l: [4, 3, 28] });
});
