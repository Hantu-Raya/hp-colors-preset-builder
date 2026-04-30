import assert from "node:assert/strict";
import test from "node:test";

import { patchRegistrarDefaults } from "../src/patchHpColors.js";

test("patchRegistrarDefaults updates matching setting defaultValue fields only", () => {
  const source = [
    "{ type: \"toggle\", id: \"hp_enabled\", label: \"Enable\", defaultValue: true },",
    "{ type: \"colorpicker\", id: \"hp_color_low\", label: \"Low\", defaultValue: \"#E16161\" },",
    "{ type: \"slider\", id: \"hp_low_threshold\", label: \"Low\", defaultValue: 30, min: 1, max: 99 },",
    "{ type: \"slider\", id: \"hp_unused\", label: \"Other\", defaultValue: 1 }"
  ].join("\\n");

  const patched = patchRegistrarDefaults(source, {
    hp_enabled: false,
    hp_color_low: "#112233",
    hp_low_threshold: 25,
    unknown_key: "ignored"
  });

  assert.match(patched, /id: "hp_enabled".*defaultValue: false/);
  assert.match(patched, /id: "hp_color_low".*defaultValue: "#112233"/);
  assert.match(patched, /id: "hp_low_threshold".*defaultValue: 25/);
  assert.match(patched, /id: "hp_unused".*defaultValue: 1/);
  assert.doesNotMatch(patched, /unknown_key/);
});
