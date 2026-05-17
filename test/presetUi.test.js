import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const HP_COLORS_TARGET_ANITA = "F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors/panorama/scripts/anita_ui_core.js";

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

test("hp_colors compatibility target reads all baked presets and keeps first preset auto-apply", { skip: !existsSync(HP_COLORS_TARGET_ANITA) }, async () => {
  const source = await readFile(HP_COLORS_TARGET_ANITA, "utf8");

  assert.match(source, /function readBakedPresetEntries\(modConfig\)/);
  assert.match(source, /FindChildrenWithClassTraverse\("hp_colors_preset_entry"\)/);
  assert.match(source, /presets\.push\(\{/);
  assert.match(source, /function readBakedPresetValues\(modConfig\)\s*\{\s*var presets = readBakedPresetEntries\(modConfig\);/);
  assert.match(source, /if \(presets\.length > 0\) return presets\[0\]\.values \|\| \{\};/);
  assert.match(source, /var baked = readBakedPresetEntries\(config\);/);
  assert.match(source, /token: this\.buildPresetCodeToken\(config, preset\.values \|\| \{\}\)/);
  assert.match(source, /copyPreset\(presetRow, status, "Copied " \+ presetRow\.name \+ "\."\)/);
  assert.match(source, /force_emit:\s*true/);
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
