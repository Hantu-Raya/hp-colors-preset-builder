import assert from "node:assert/strict";
import test from "node:test";
import { buildConvertedVpkFileName, buildPresetVpkFileName } from "../src/presetVpkFileName.js";

test("buildPresetVpkFileName always returns the canonical package filename", () => {
  assert.equal(buildPresetVpkFileName("Web Builder Preset"), "pak96_dir.vpk");
  assert.equal(buildPresetVpkFileName("HP: Colors / Low HP*"), "pak96_dir.vpk");
  assert.equal(buildPresetVpkFileName("   "), "pak96_dir.vpk");
});

test("buildConvertedVpkFileName always returns the canonical package filename", () => {
  assert.equal(buildConvertedVpkFileName("pak96_dir.vpk"), "pak96_dir.vpk");
  assert.equal(buildConvertedVpkFileName("PAK96"), "pak96_dir.vpk");
});
