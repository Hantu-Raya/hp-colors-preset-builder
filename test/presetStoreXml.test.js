import assert from "node:assert/strict";
import test from "node:test";

import {
  encodePresetStoreEntry,
  readPresetStoreFromBaseHudXml,
  writePresetStoreToBaseHudXml
} from "../src/presetStoreXml.js";

test("writePresetStoreToBaseHudXml adds semantic preset labels after Anita anchor", () => {
  const xml = [
    "<root>",
    '  <Panel id="AnitaUI_Anchor" hittest="false" />',
    "</root>"
  ].join("\n");
  const preset = {
    name: "Test",
    version: 1,
    values: { hp_color_low: "#FF00FF", hp_precise_pips_enabled: true }
  };

  const patched = writePresetStoreToBaseHudXml(xml, [preset]);

  assert.match(patched, /HPColorsPresetStore/);
  assert.match(patched, /HPColorsPreset_001/);
  assert.match(patched, /hp_colors_preset_entry/);
  const decoded = readPresetStoreFromBaseHudXml(patched);
  assert.equal(decoded[0].name, preset.name);
  assert.equal(decoded[0].version, 1);
  assert.equal(decoded[0].values.hp_color_low, "#FF00FF");
  assert.equal(decoded[0].values.hp_precise_pips_enabled, true);
  assert.equal(Object.keys(decoded[0].values).length, 56);
});

test("preset store encodes signature conditions as compact runtime overrides", () => {
  const xml = [
    "<root>",
    '  <Panel id="AnitaUI_Anchor" hittest="false" />',
    "</root>"
  ].join("\n");
  const patched = writePresetStoreToBaseHudXml(xml, [{
    name: "Conditional",
    version: 1,
    values: { hp_color_low: "#FF00FF" },
    overrides: { hp_color_low: { slot: 3, minTier: 2, value: "#123456" } }
  }]);

  const decoded = readPresetStoreFromBaseHudXml(patched);
  assert.deepEqual(decoded[0].overrides, {
    hp_color_low: { slot: 3, minTier: 2, value: "#123456" }
  });
});

test("writePresetStoreToBaseHudXml preserves multiple preset labels", () => {
  const xml = [
    "<root>",
    '  <Panel id="AnitaUI_Anchor" hittest="false" />',
    "</root>"
  ].join("\n");

  const patched = writePresetStoreToBaseHudXml(xml, [
    { name: "One", version: 1, values: { hp_color_low: "#111111" } },
    { name: "Two", version: 1, values: { hp_color_low: "#222222" } }
  ]);
  const decoded = readPresetStoreFromBaseHudXml(patched);

  assert.match(patched, /HPColorsPreset_001/);
  assert.match(patched, /HPColorsPreset_002/);
  assert.deepEqual(decoded.map((preset) => preset.name), ["One", "Two"]);
});

test("writePresetStoreToBaseHudXml replaces an existing store", () => {
  const xml = [
    "<root>",
    '  <Panel id="AnitaUI_Anchor" hittest="false" />',
    '\t\t<Panel id="HPColorsPresetStore" hittest="false" style="visibility: collapse; width: 0px; height: 0px;">',
    `\t\t\t<Label id="HPColorsPreset_001" class="hp_colors_preset_entry" text="${encodePresetStoreEntry({ name: "Old", version: 1, values: { hp_color_low: "#111111" } })}" />`,
    "\t\t</Panel>",
    "</root>"
  ].join("\n");

  const patched = writePresetStoreToBaseHudXml(xml, [
    { name: "New", version: 1, values: { hp_color_low: "#222222" } }
  ]);
  const decoded = readPresetStoreFromBaseHudXml(patched);

  assert.deepEqual(decoded.map((preset) => preset.name), ["New"]);
});

test("readPresetStoreFromBaseHudXml reads labels when text appears before class", () => {
  const preset = {
    name: "Text First",
    version: 1,
    values: { hp_color_low: "#FF00FF", hp_precise_pips_enabled: true }
  };
  const xml = [
    "<root>",
    '\t\t<Panel id="HPColorsPresetStore" hittest="false">',
    `\t\t\t<Label id="HPColorsPreset_001" text="${encodePresetStoreEntry(preset)}" class="foo hp_colors_preset_entry bar" />`,
    "\t\t</Panel>",
    "</root>"
  ].join("\n");

  const decoded = readPresetStoreFromBaseHudXml(xml);
  assert.equal(decoded[0].name, preset.name);
  assert.equal(decoded[0].values.hp_color_low, "#FF00FF");
  assert.equal(decoded[0].values.hp_precise_pips_enabled, true);
  assert.equal(Object.keys(decoded[0].values).length, 56);
});

test("readPresetStoreFromBaseHudXml throws when no store entries exist", () => {
  assert.throws(
    () => readPresetStoreFromBaseHudXml('<root><Panel id="HPColorsPresetStore" /></root>'),
    { message: "No HP Colors preset entry found in this VPK" }
  );
});

test("readPresetStoreFromBaseHudXml throws the VPK invalid-entry error for malformed text", () => {
  const xml = [
    "<root>",
    '\t<Panel id="HPColorsPresetStore">',
    '\t\t<Label id="HPColorsPreset_001" class="hp_colors_preset_entry" text="not-valid-json" />',
    "\t</Panel>",
    "</root>"
  ].join("\n");

  assert.throws(
    () => readPresetStoreFromBaseHudXml(xml),
    { message: "Invalid HP Colors preset entry in this VPK" }
  );
});
