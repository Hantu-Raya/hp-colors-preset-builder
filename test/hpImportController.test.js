import assert from "node:assert/strict";
import test from "node:test";
import { HP_SCHEMA } from "../src/hpSchema.js";
import { createHpImportHandler } from "../src/hpImportController.js";
import { parseHpColorsImportCode } from "../src/hpImportCode.js";

function encodeImport(values) {
  const payload = { v: 97, c: 1, values };
  const text = JSON.stringify(payload);
  const base64 = Buffer.from(text, "utf8").toString("base64url");
  return `[ANITA-v1-hp_colors]:${base64}`;
}

test("import replaces the full preset state", () => {
  const imported = parseHpColorsImportCode(encodeImport({ hp_enabled: false, hp_mode: 1 }), HP_SCHEMA);
  assert.equal(imported.hp_enabled, false);
  assert.equal(imported.hp_mode, 1);
  assert.equal(imported.hp_bg_visible, true);
  assert.equal(Object.keys(imported).length, Object.keys(HP_SCHEMA).length);
});

test("import rejects invalid payloads without mutation", () => {
  assert.throws(() => parseHpColorsImportCode("nope", HP_SCHEMA), /Malformed HP Colors import code/);
});

test("import handler replaces state and preserves it on failure", () => {
  const statusNode = { textContent: "Ready." };
  const importText = { value: encodeImport({ hp_enabled: false, hp_mode: 1 }) };
  let currentState = { hp_enabled: true, hp_mode: 0 };
  const handleImport = createHpImportHandler({
    importText,
    statusNode,
    schema: HP_SCHEMA,
    applyState(nextState) {
      currentState = nextState;
    }
  });

  handleImport();
  assert.equal(currentState.hp_enabled, false);
  assert.equal(currentState.hp_mode, 1);
  assert.equal(statusNode.textContent, "Imported preset state.");

  const previousState = currentState;
  importText.value = "nope";
  handleImport();
  assert.equal(currentState, previousState);
  assert.equal(statusNode.textContent, "Malformed HP Colors import code");
});
