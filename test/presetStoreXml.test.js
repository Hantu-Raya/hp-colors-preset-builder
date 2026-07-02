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
    values: { hp_color_low: "#FF00FF" }
  };

  const patched = writePresetStoreToBaseHudXml(xml, [preset]);

  assert.match(patched, /HPColorsPresetStore/);
  assert.match(patched, /HPColorsPreset_001/);
  assert.match(patched, /hp_colors_preset_entry/);
  assert.deepEqual(readPresetStoreFromBaseHudXml(patched), [preset]);
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
    values: { hp_color_low: "#FF00FF" }
  };
  const xml = [
    "<root>",
    '\t\t<Panel id="HPColorsPresetStore" hittest="false">',
    `\t\t\t<Label id="HPColorsPreset_001" text="${encodePresetStoreEntry(preset)}" class="foo hp_colors_preset_entry bar" />`,
    "\t\t</Panel>",
    "</root>"
  ].join("\n");

  assert.deepEqual(readPresetStoreFromBaseHudXml(xml), [preset]);
});

test("readPresetStoreFromBaseHudXml throws when no store entries exist", () => {
  assert.throws(
    () => readPresetStoreFromBaseHudXml("<root></root>"),
    { message: "No HP Colors preset entry found in this VPK" }
  );
});

test("readPresetStoreFromBaseHudXml throws the VPK invalid-entry error for malformed text", () => {
  const xml = [
    "<root>",
    '\t<Label id="HPColorsPreset_001" class="hp_colors_preset_entry" text="not-valid-json" />',
    "</root>"
  ].join("\n");

  assert.throws(
    () => readPresetStoreFromBaseHudXml(xml),
    { message: "Invalid HP Colors preset entry in this VPK" }
  );
});
