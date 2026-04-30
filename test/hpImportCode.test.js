import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { extractHpColorsImportToken, parseHpColorsImportCode } from "../src/hpImportCode.js";

function base64UrlEncode(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildToken(payload) {
  return `[ANITA-v1-hp_colors]:${base64UrlEncode(JSON.stringify(payload))}`;
}

test("extracts the HP Colors token from pasted game code", () => {
  const token = buildToken({ v: 97, c: 1, values: { e: false } });
  assert.equal(extractHpColorsImportToken(`prefix\n${token}\nsuffix`), token);
});

test("parses a valid HP Colors export token into full schema state", () => {
  const state = parseHpColorsImportCode(buildToken({ v: 97, c: 1, values: { e: false, cl: "#112233", p: "12,34" } }), HP_SCHEMA);

  assert.equal(state.hp_enabled, false);
  assert.equal(state.hp_color_low, "#112233");
  assert.equal(state.hp_counter_position, "12,34");
  assert.equal(state.hp_high_threshold, HP_SCHEMA.hp_high_threshold.defaultValue);
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("parses legacy version 25 import tokens", () => {
  const state = parseHpColorsImportCode(buildToken({ v: 25, c: 1, values: { e: false, cm: "#abcdef", tm: 1 } }), HP_SCHEMA);

  assert.equal(state.hp_enabled, false);
  assert.equal(state.hp_color_mid, "#abcdef");
  assert.equal(state.hp_text_color_mode, 1);
});

test("rejects malformed, wrong-namespace, or invalid payloads", () => {
  assert.throws(() => parseHpColorsImportCode("not a token", HP_SCHEMA), /Malformed HP Colors import code/i);
  assert.throws(() => parseHpColorsImportCode("[anita-v1-hp_colors]:abc", HP_SCHEMA), /Malformed HP Colors import code/i);
  assert.throws(() => parseHpColorsImportCode("[ANITA-v1-wrong]:abc", HP_SCHEMA), /namespace/i);
  assert.throws(() => parseHpColorsImportCode("[ANITA-v1-hp_colors]:!!!!", HP_SCHEMA), /base64url/i);
  assert.throws(() => parseHpColorsImportCode("[ANITA-v1-hp_colors]:eA", HP_SCHEMA), /JSON payload/i);
  assert.throws(() => parseHpColorsImportCode("[ANITA-v1-hp_colors]:e30", HP_SCHEMA), /JSON payload/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 98, c: 1, values: { e: true } }), HP_SCHEMA), /version/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 97, values: { e: true } }), HP_SCHEMA), /JSON payload/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 97, compact: 1, values: { e: true } }), HP_SCHEMA), /JSON payload/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 97, c: 2, values: { e: true } }), HP_SCHEMA), /version/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 97, c: 1, values: { zz: 1 } }), HP_SCHEMA), /unknown/i);
  assert.throws(() => parseHpColorsImportCode(buildToken({ v: 97, c: 1, values: { badField: 1 } }), HP_SCHEMA), /unknown/i);
});
