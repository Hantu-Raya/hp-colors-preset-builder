import assert from "node:assert/strict";
import test from "node:test";

import { HP_SCHEMA } from "../src/hpSchema.js";
import { extractHpColorsImportToken, parseHpColorsImportCode, parseHpColorsImportProfiles } from "../src/hpImportCode.js";

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
  const state = parseHpColorsImportCode(buildToken({ v: 97, c: 1, values: { e: false, cl: "#112233", p: "12,34", pce: true, pcm: 1, pc: "#123456" } }), HP_SCHEMA);

  assert.equal(state.hp_enabled, false);
  assert.equal(state.hp_color_low, "#112233");
  assert.equal(state.hp_counter_position, "12,34");
  assert.equal(state.hp_pulse_color_enabled, true);
  assert.equal(state.hp_pulse_color_mode, 1);
  assert.equal(state.hp_pulse_color, "#123456");
  assert.equal(state.hp_high_threshold, HP_SCHEMA.hp_high_threshold.defaultValue);
  assert.deepEqual(Object.keys(state), Object.keys(HP_SCHEMA));
});

test("parses current game preset aliases used by HP Colors exports", () => {
  const token = "[ANITA-v1-hp_colors]:eyJ2Ijo5NywiYyI6MSwiaG0iOiJvZmYiLCJuYW1lIjoiU3RyZXNzIGdyYWRpZW50IGFsbHkgcHVsc2Uga2lsbCBtYXJrZXIiLCJ2YWx1ZXMiOnsibSI6MSwibCI6NDAsImgiOjgwLCJ0IjpmYWxzZSwic2IiOmZhbHNlLCJwZSI6dHJ1ZSwicHQiOjQ1LCJicCI6MTgwLCJwaSI6MiwicGNlIjp0cnVlLCJwY20iOjEsInBjIjoiI0ZGMzJBOCIsInB0ZSI6dHJ1ZSwicHRzIjoxODAsInBoYiI6ZmFsc2UsImN2Ijp0cnVlLCJzIjoxNzAsImNmIjoxLCJ0bSI6MSwibG52IjpmYWxzZSwicGx2Ijp0cnVlLCJ0bCI6IiNGRkZGRkYiLCJ0aSI6IiNGRkUwNjYiLCJ0aCI6IiM4OEZGQUEiLCJmZSI6dHJ1ZSwiZmNsIjoiIzRERkY4OCIsImZjbSI6IiM0NUQ2RkYiLCJmY2giOiIjRTZGRjVDIiwiZnBlIjp0cnVlLCJmcHQiOjQ1LCJmcGIiOjE4MCwiZnBpIjoyLCJmcGNlIjp0cnVlLCJmcGMiOiIjNDRGRkZGIiwia3plIjp0cnVlLCJrenQiOjMwLCJrenMiOiIjRkYyQTJBIiwia3p3Ijo2fX0";
  const state = parseHpColorsImportCode(token, HP_SCHEMA);

  assert.equal(state.hp_counter_visible, true);
  assert.equal(state.hp_counter_size, 170);
  assert.equal(state.hp_counter_format, 1);
  assert.equal(state.hp_kill_zone_enabled, true);
  assert.equal(state.hp_kill_zone_threshold, 30);
  assert.equal(state.hp_kill_zone_color, "#FF2A2A");
  assert.equal(state.hp_kill_zone_width, 6);
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

test("parses a bundled HP Colors token into multiple preset profiles", () => {
  const profiles = parseHpColorsImportProfiles(buildToken({
    v: 97,
    c: 1,
    values: { e: false },
    presets: [
      { name: "main hantu", version: 1, values: { e: false, cl: "#112233" } },
      { name: "razzor", version: 1, values: { m: 1, ch: "#445566" } },
      { name: "Current live settings", version: 1, values: { p: "12,34", pce: true } }
    ]
  }), HP_SCHEMA);

  assert.equal(profiles.length, 3);
  assert.equal(profiles[0].name, "main hantu");
  assert.equal(profiles[0].values.hp_enabled, false);
  assert.equal(profiles[0].values.hp_color_low, "#112233");
  assert.equal(profiles[1].name, "razzor");
  assert.equal(profiles[1].values.hp_mode, 1);
  assert.equal(profiles[1].values.hp_color_high, "#445566");
  assert.equal(profiles[2].name, "Current live settings");
  assert.equal(profiles[2].values.hp_counter_position, "12,34");
  assert.equal(profiles[2].values.hp_pulse_color_enabled, true);
});

test("parses a compact COPY ALL HP Colors bundle into multiple preset profiles", () => {
  const profiles = parseHpColorsImportProfiles(buildToken({
    v: 97,
    c: 1,
    values: { e: false },
    ps: [
      { n: "main hantu", vs: { e: false, cl: "#112233" } },
      { n: "razzor", vs: { m: 1, ch: "#445566" } },
      { n: "Current live settings", vs: { p: "12,34", pce: true } }
    ]
  }), HP_SCHEMA);

  assert.equal(profiles.length, 3);
  assert.equal(profiles[0].name, "main hantu");
  assert.equal(profiles[0].values.hp_enabled, false);
  assert.equal(profiles[0].values.hp_color_low, "#112233");
  assert.equal(profiles[1].name, "razzor");
  assert.equal(profiles[1].values.hp_mode, 1);
  assert.equal(profiles[1].values.hp_color_high, "#445566");
  assert.equal(profiles[2].name, "Current live settings");
  assert.equal(profiles[2].values.hp_counter_position, "12,34");
  assert.equal(profiles[2].values.hp_pulse_color_enabled, true);
});

test("parses compact hs and verbose heroes in import profiles", () => {
  const profiles = parseHpColorsImportProfiles(buildToken({
    v: 97,
    c: 1,
    values: { e: false },
    ps: [
      { n: "shiv lane", vs: { e: false, cl: "#112233" }, hs: ["shiv", "hero_bebop"] },
      { n: "global", vs: { m: 1 }, heroes: ["Grey Talon", "unknown"] }
    ]
  }), HP_SCHEMA);

  assert.deepEqual(profiles[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(profiles[0].heroMode, "selected");
  assert.deepEqual(profiles[1].heroes, ["hero_orion"]);
  assert.equal(profiles[1].heroMode, "selected");
});

test("parses legacy tuple bundle heroes", () => {
  const code = base64UrlEncode(JSON.stringify({
    v: 97,
    p: [
      ["shiv tuple", { e: false, cl: "#112233" }, ["hero_shiv", "Bebop"]]
    ]
  }));

  const profiles = parseHpColorsImportProfiles(code, HP_SCHEMA);

  assert.equal(profiles[0].name, "shiv tuple");
  assert.equal(profiles[0].values.hp_color_low, "#112233");
  assert.deepEqual(profiles[0].heroes, ["hero_shiv", "hero_bebop"]);
  assert.equal(profiles[0].heroMode, "selected");
});

test("parses minimal COPY ALL bundle hero scope modes", () => {
  const code = base64UrlEncode(JSON.stringify({
    v: 97,
    p: [
      ["disabled", { e: false }, "off"],
      ["global", { m: 1 }, "all"],
      ["haze only", { ch: "#445566" }, ["hero_haze"]]
    ]
  }));

  const profiles = parseHpColorsImportProfiles(code, HP_SCHEMA);

  assert.equal(profiles.length, 3);
  assert.equal(profiles[0].name, "disabled");
  assert.equal(profiles[0].heroMode, "off");
  assert.deepEqual(profiles[0].heroes, []);
  assert.equal(profiles[1].name, "global");
  assert.equal(profiles[1].heroMode, "all");
  assert.deepEqual(profiles[1].heroes, []);
  assert.equal(profiles[2].name, "haze only");
  assert.equal(profiles[2].heroMode, "selected");
  assert.deepEqual(profiles[2].heroes, ["hero_haze"]);
});

test("parses single-profile heroes and hs payloads", () => {
  const verbose = parseHpColorsImportProfiles(buildToken({
    v: 97,
    c: 1,
    name: "Verbose",
    values: { e: false },
    heroes: ["Shiv"]
  }), HP_SCHEMA);
  const compact = parseHpColorsImportProfiles(buildToken({
    v: 97,
    c: 1,
    name: "Compact",
    values: { e: true },
    hs: ["hero_bebop"]
  }), HP_SCHEMA);

  assert.deepEqual(verbose[0].heroes, ["hero_shiv"]);
  assert.equal(verbose[0].heroMode, "selected");
  assert.deepEqual(compact[0].heroes, ["hero_bebop"]);
  assert.equal(compact[0].heroMode, "selected");
});

test("parses the minimal COPY ALL HP Colors bundle into multiple preset profiles", () => {
  const code = base64UrlEncode(JSON.stringify({
    v: 97,
    p: [
      ["main hantu", { e: false, cl: "#112233" }],
      ["razzor", { m: 1, ch: "#445566" }]
    ]
  }));

  const profiles = parseHpColorsImportProfiles(code, HP_SCHEMA);

  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].name, "main hantu");
  assert.equal(profiles[0].heroMode, "off");
  assert.equal(profiles[0].values.hp_enabled, false);
  assert.equal(profiles[0].values.hp_color_low, "#112233");
  assert.equal(profiles[1].name, "razzor");
  assert.equal(profiles[1].heroMode, "off");
  assert.equal(profiles[1].values.hp_mode, 1);
  assert.equal(profiles[1].values.hp_color_high, "#445566");
});

test("minimal COPY ALL bundle is shorter than the previous compact object bundle", () => {
  const previous = buildToken({
    v: 97,
    c: 1,
    values: { e: false, cl: "#112233" },
    ps: [
      { n: "main hantu", vs: { e: false, cl: "#112233" } },
      { n: "razzor", vs: { m: 1, ch: "#445566" } }
    ]
  });
  const minimal = base64UrlEncode(JSON.stringify({
    v: 97,
    p: [
      ["main hantu", { e: false, cl: "#112233" }],
      ["razzor", { m: 1, ch: "#445566" }]
    ]
  }));

  assert.ok(minimal.length < previous.length);
  assert.ok(previous.length - minimal.length >= 70);
});

test("parses multiple pasted HP Colors tokens into multiple preset profiles", () => {
  const first = buildToken({ v: 97, c: 1, values: { e: false, cl: "#112233" } });
  const second = buildToken({ v: 97, c: 1, values: { m: 1, ch: "#445566" } });

  const profiles = parseHpColorsImportProfiles(`main hantu\n${first}\n\nrazzor\n${second}`, HP_SCHEMA);

  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].name, "Imported preset 1");
  assert.equal(profiles[0].values.hp_color_low, "#112233");
  assert.equal(profiles[1].name, "Imported preset 2");
  assert.equal(profiles[1].values.hp_mode, 1);
});

test("parses a bare HPColorsPresetStore encoded preset payload", () => {
  const encoded = base64UrlEncode(JSON.stringify({
    name: "Web Builder Preset",
    version: 1,
    values: {
      hp_enabled: true,
      hp_color_low: "#E16161",
      hp_counter_position: "43,-9",
      hp_counter_size: 187
    }
  }));

  const state = parseHpColorsImportCode(encoded, HP_SCHEMA);

  assert.equal(state.hp_enabled, true);
  assert.equal(state.hp_color_low, "#E16161");
  assert.equal(state.hp_counter_position, "43,-9");
  assert.equal(state.hp_counter_size, 187);
  assert.equal(state.hp_high_threshold, HP_SCHEMA.hp_high_threshold.defaultValue);
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
  assert.throws(() => parseHpColorsImportCode("nope", HP_SCHEMA), /Malformed HP Colors import code/i);
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
