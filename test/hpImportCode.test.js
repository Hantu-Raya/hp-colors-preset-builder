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

const HP_COLORS_PRESET_ENTRY_TOKEN = "eyJuYW1lIjoiV2ViIEJ1aWxkZXIgUHJlc2V0IiwidmVyc2lvbiI6MSwidmFsdWVzIjp7ImhwX2VuYWJsZWQiOnRydWUsImhwX2JnX3Zpc2libGUiOnRydWUsImhwX21vZGUiOjAsImhwX2xvd190aHJlc2hvbGQiOjI1LCJocF9oaWdoX3RocmVzaG9sZCI6NjUsImhwX3RlYW1fY29sb3JzIjp0cnVlLCJocF9za2lwX2J1aWxkaW5ncyI6dHJ1ZSwiaHBfaW5mb19oZWFsdGhfbWFyZ2luX3RvcCI6MjMsImhwX2hlYWx0aGJhcl9oZWlnaHQiOjEzMCwiaHBfdWx0X2NvbG9yX2VuYWJsZWQiOnRydWUsImhwX3VsdF9jb2xvcl9jdXN0b20iOiIjRTE2MTYxIiwiaHBfY29sb3JfbG93IjoiI0UxNjE2MSIsImhwX2NvbG9yX21pZCI6IiNGRjdCMDAiLCJocF9jb2xvcl9oaWdoIjoiIzAwRkYwMCIsImhwX3B1bHNlX2VuYWJsZWQiOnRydWUsImhwX3B1bHNlX3RocmVzaG9sZCI6MjUsImhwX3B1bHNlX2JwbSI6NzUsImhwX3B1bHNlX2ludGVuc2l0eSI6MSwiaHBfcHVsc2VfaGlkZV9iYXIiOmZhbHNlLCJocF9wdWxzZV90ZXh0X2VuYWJsZWQiOmZhbHNlLCJocF9wdWxzZV90ZXh0X3NjYWxlIjoxMjAsImhwX3B1bHNlX3RleHRfcG9zaXRpb24iOiIyMCwxOTYiLCJocF9jb3VudGVyX3NpemUiOjE4NywiaHBfY291bnRlcl9wb3NpdGlvbiI6IjQzLC05IiwiaHBfY291bnRlcl9mb3JtYXQiOjAsImhwX3RleHRfY29sb3JfbW9kZSI6MSwiaHBfbGV2ZWxfbnVtYmVyX3Zpc2libGUiOnRydWUsImhwX3BpcF92aXNpYmxlIjp0cnVlLCJocF90ZXh0X2NvbG9yX2xvdyI6IiNGRkIwQjAiLCJocF90ZXh0X2NvbG9yX21pZCI6IiNGRkZGRkYiLCJocF90ZXh0X2NvbG9yX2hpZ2giOiIjRkZGRkZGIiwiaHBfZnJpZW5kX2VuYWJsZWQiOmZhbHNlLCJocF9mcmllbmRfY29sb3JfbG93IjoiI0UxNjE2MSIsImhwX2ZyaWVuZF9jb2xvcl9taWQiOiIjRkY3QjAwIiwiaHBfZnJpZW5kX2NvbG9yX2hpZ2giOiIjMDBGRjAwIiwiaHBfZnJpZW5kX3B1bHNlX2VuYWJsZWQiOmZhbHNlLCJocF9mcmllbmRfcHVsc2VfdGhyZXNob2xkIjoyNSwiaHBfZnJpZW5kX3B1bHNlX2JwbSI6NzUsImhwX2ZyaWVuZF9wdWxzZV9pbnRlbnNpdHkiOjEsImhwX2ZyaWVuZF9wdWxzZV9jb2xvcl9lbmFibGVkIjpmYWxzZSwiaHBfZnJpZW5kX3B1bHNlX2NvbG9yIjoiI0ZGMjIyMiIsImhwX2tpbGxfem9uZV9lbmFibGVkIjpmYWxzZSwiaHBfa2lsbF96b25lX3RocmVzaG9sZCI6MjUsImhwX2tpbGxfem9uZV9jb2xvciI6IiNGRjIyMjIiLCJocF9raWxsX3pvbmVfd2lkdGgiOjMxfX0";

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

test("parses raw HPColorsPresetStore entry tokens", () => {
  const state = parseHpColorsImportCode(HP_COLORS_PRESET_ENTRY_TOKEN, HP_SCHEMA);

  assert.equal(state.hp_enabled, true);
  assert.equal(state.hp_mode, 0);
  assert.equal(state.hp_team_colors, true);
  assert.equal(state.hp_skip_buildings, true);
  assert.equal(state.hp_counter_size, 187);
  assert.equal(state.hp_counter_position, "43,-9");
  assert.equal(state.hp_text_color_mode, 1);
  assert.equal(state.hp_text_color_low, "#FFB0B0");
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("parses legacy version 25 import tokens", () => {
  const state = parseHpColorsImportCode(buildToken({ v: 25, c: 1, values: { e: false, cm: "#abcdef", tm: 1 } }), HP_SCHEMA);

  assert.equal(state.hp_enabled, false);
  assert.equal(state.hp_color_mid, "#ABCDEF");
  assert.equal(state.hp_text_color_mode, 1);
});

test("parses import colors as canonical hex only", () => {
  const state = parseHpColorsImportCode(buildToken({
    v: 97,
    c: 1,
    values: {
      cl: "#abc",
      cm: "not-a-color;visibility:collapse",
      ch: 'url("s2r://panorama/images/hud/icon.png")'
    }
  }), HP_SCHEMA);

  assert.equal(state.hp_color_low, "#AABBCC");
  assert.equal(state.hp_color_mid, HP_SCHEMA.hp_color_mid.defaultValue);
  assert.equal(state.hp_color_high, HP_SCHEMA.hp_color_high.defaultValue);
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

test("rejects oversized import payloads before JSON parsing", () => {
  const hugeToken = `[ANITA-v1-hp_colors]:${"A".repeat(70000)}`;

  assert.throws(() => extractHpColorsImportToken(hugeToken), /too large/i);
  assert.throws(() => parseHpColorsImportCode(hugeToken, HP_SCHEMA), /too large/i);
});

test("rejects decoded payloads over the size cap before JSON parsing", () => {
  const token = buildToken({ v: 97, c: 1, notes: "A".repeat(9000), values: { e: true } });

  assert.ok(token.length < 16384);
  assert.throws(() => parseHpColorsImportCode(token, HP_SCHEMA), /too large/i);
});
