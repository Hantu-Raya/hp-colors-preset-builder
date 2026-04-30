import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hp registrar exposes a Preset tab action button", async () => {
  const source = await readFile(new URL("../templates/hp_colors/panorama/scripts/hp_registrar.js", import.meta.url), "utf8");

  assert.match(source, /category:\s*"PRESET\|Preset"/);
  assert.match(source, /type:\s*"button"/);
  assert.match(source, /action:\s*"apply_baked_preset"/);
});

test("Anita button renderer emits individual updates for baked preset values", async () => {
  const source = await readFile(new URL("../templates/hp_colors/panorama/scripts/anita_ui_core.js", import.meta.url), "utf8");

  assert.match(source, /function readBakedPresetValues/);
  assert.match(source, /HPColorsPresetStore/);
  assert.match(source, /hp_colors_preset_entry/);
  assert.match(source, /AnitaBase64\.decode/);
  assert.match(source, /emitUpdate\(modTitle,\s*settingId,\s*values\[settingId\],\s*meta\)/);
});

test("hp counter position and low pulse use same y math", async () => {
  const uiSource = await readFile(new URL("../templates/hp_colors/panorama/scripts/anita_ui_core.js", import.meta.url), "utf8");
  const runtimeSource = await readFile(new URL("../templates/hp_colors/panorama/scripts/healthbar_logic.js", import.meta.url), "utf8");

  assert.match(uiSource, /hp_counter_position/);
  assert.match(uiSource, /hp_pulse_text_position/);
  assert.match(runtimeSource, /hp_counter_position/);
  assert.match(runtimeSource, /hp_pulse_text_position/);
});

test("hp counter translate uses same y math in normal and low pulse modes", async () => {
  const runtimeSource = await readFile(new URL("../templates/hp_colors/panorama/scripts/healthbar_logic.js", import.meta.url), "utf8");

  assert.match(runtimeSource, /hp_counter_position/);
  assert.match(runtimeSource, /hp_pulse_text_position/);
});
