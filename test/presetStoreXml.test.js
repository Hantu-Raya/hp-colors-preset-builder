import assert from "node:assert/strict";
import test from "node:test";

import { base64UrlDecode, base64UrlEncode, injectPresetStoreIntoBaseHudXml } from "../src/presetStoreXml.js";

test("injectPresetStoreIntoBaseHudXml adds encoded preset labels after Anita anchor", () => {
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

  const patched = injectPresetStoreIntoBaseHudXml(xml, [preset]);

  assert.match(patched, /HPColorsPresetStore/);
  assert.match(patched, /HPColorsPreset_001/);
  assert.match(patched, /hp_colors_preset_entry/);

  const encoded = patched.match(/text="([^"]+)"/)[1];
  assert.deepEqual(JSON.parse(base64UrlDecode(encoded)), preset);
});

test("base64UrlEncode round-trips unicode-free JSON text", () => {
  const source = JSON.stringify({ name: "Magenta", values: { hp_color_low: "#FF00FF" } });
  assert.equal(base64UrlDecode(base64UrlEncode(source)), source);
});
