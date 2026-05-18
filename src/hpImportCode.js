import { HP_SCHEMA, coerceHpValue } from "./hpSchema.js";

export const HP_IMPORT_CODE_PREFIX = "[ANITA-v1-hp_colors]:";
export const HP_IMPORT_CODE_NAMESPACE = "hp_colors";
export const HP_IMPORT_CODE_VERSION = 97;
export const HP_IMPORT_CODE_COMPACT_VERSION = 1;
export const HP_IMPORT_CODE_LEGACY_VERSIONS = new Set([25]);
const MAX_IMPORT_TEXT_CHARS = 32768;
const MAX_IMPORT_TOKEN_CHARS = 16384;
const MAX_IMPORT_PAYLOAD_CHARS = 8192;
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP = new Map(Array.from(BASE64_CHARS, (ch, idx) => [ch, idx]));

export const HP_PERSIST_ALIASES = Object.freeze({
  hp_enabled: "e",
  hp_mode: "m",
  hp_low_threshold: "l",
  hp_high_threshold: "h",
  hp_bg_visible: "b",
  hp_team_colors: "t",
  hp_info_health_margin_top: "ihmt",
  hp_healthbar_height: "hbh",
  hp_color_low: "cl",
  hp_color_mid: "cm",
  hp_color_high: "ch",
  hp_counter_size: "s",
  hp_counter_position: "p",
  hp_text_color_mode: "tm",
  hp_level_number_visible: "lnv",
  hp_pip_visible: "plv",
  hp_ult_color_enabled: "uce",
  hp_ult_color_custom: "ucc",
  hp_text_color_low: "tl",
  hp_text_color_mid: "ti",
  hp_text_color_high: "th",
  hp_pulse_bpm: "bp",
  hp_pulse_intensity: "pi",
  hp_pulse_enabled: "pe",
  hp_pulse_text_enabled: "pte",
  hp_pulse_text_scale: "pts",
  hp_pulse_text_position: "ptp",
  hp_pulse_hide_bar: "phb",
  hp_pulse_color_enabled: "pce",
  hp_pulse_color: "pc",
  hp_pulse_color_mode: "pcm",
  hp_skip_buildings: "sb",
  hp_pulse_threshold: "pt",
  hp_friend_enabled: "fe",
  hp_friend_pulse_enabled: "fpe",
  hp_friend_pulse_bpm: "fpb",
  hp_friend_pulse_intensity: "fpi",
  hp_friend_pulse_threshold: "fpt",
  hp_friend_color_low: "fcl",
  hp_friend_color_mid: "fcm",
  hp_friend_color_high: "fch",
  hp_friend_pulse_color_enabled: "fpce",
  hp_friend_pulse_color: "fpc",
  hp_kill_zone_enabled: "kze",
  hp_kill_zone_threshold: "kzt",
  hp_kill_zone_color: "kzc",
  hp_kill_zone_width: "kzw",
  hp_counter_format: "cf"
});

const HP_ALIAS_TO_ID = Object.freeze(
  Object.fromEntries(Object.entries(HP_PERSIST_ALIASES).map(([id, alias]) => [alias, id]))
);

function decodeBase64UrlStrict(input) {
  const token = String(input || "");
  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("Invalid base64url token");
  if (token.length > MAX_IMPORT_TOKEN_CHARS) throw new Error("Import code is too large");
  if (token.length % 4 === 1) throw new Error("Invalid base64url token");
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  let binary;
  try {
    binary = typeof atob === "function" ? atob(padded) : binaryFromBase64(padded);
  } catch {
    throw new Error("Invalid base64url token");
  }
  const roundtrip = typeof btoa === "function"
    ? btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
    : base64UrlFromBinary(binary);
  if (roundtrip !== token) {
    throw new Error("Invalid base64url token");
  }
  const payloadText = utf8FromBinary(binary);
  if (payloadText.length > MAX_IMPORT_PAYLOAD_CHARS) throw new Error("Import code is too large");
  return payloadText;
}

function binaryFromBase64(base64) {
  let bits = 0;
  let bitCount = 0;
  let out = "";
  for (const ch of String(base64 || "").replace(/=+$/g, "")) {
    if (!BASE64_LOOKUP.has(ch)) throw new Error("Invalid base64url token");
    bits = (bits << 6) | BASE64_LOOKUP.get(ch);
    bitCount += 6;
    while (bitCount >= 8) {
      bitCount -= 8;
      out += String.fromCharCode((bits >> bitCount) & 0xff);
    }
  }
  return out;
}

function base64UrlFromBinary(binary) {
  let bits = 0;
  let bitCount = 0;
  let out = "";
  for (const ch of String(binary || "")) {
    bits = (bits << 8) | ch.charCodeAt(0);
    bitCount += 8;
    while (bitCount >= 6) {
      bitCount -= 6;
      out += BASE64_CHARS[(bits >> bitCount) & 63];
    }
  }
  if (bitCount > 0) out += BASE64_CHARS[(bits << (6 - bitCount)) & 63];
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8FromBinary(binary) {
  const bytes = Uint8Array.from(String(binary || ""), (ch) => ch.charCodeAt(0));
  return typeof TextDecoder === "function" ? new TextDecoder("utf-8").decode(bytes) : binary;
}

function expandValues(values, schema) {
  const expanded = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (Object.prototype.hasOwnProperty.call(schema || {}, key)) {
      expanded[key] = value;
      continue;
    }
    const fullId = HP_ALIAS_TO_ID[key];
    if (!fullId || !Object.prototype.hasOwnProperty.call(schema || {}, fullId)) {
      throw new Error(`Unknown alias or field id: ${key}`);
    }
    expanded[fullId] = value;
  }
  return expanded;
}

export function extractHpColorsImportToken(text) {
  const body = String(text || "").trim();
  if (!body) throw new Error("Malformed HP Colors import code");
  if (body.length > MAX_IMPORT_TEXT_CHARS) throw new Error("Import code is too large");
  const hpMatches = body.match(/\[ANITA-v1-hp_colors\]:[^\s]+/g) || [];
  if (hpMatches.length === 1) {
    if (hpMatches[0].length > MAX_IMPORT_TOKEN_CHARS) throw new Error("Import code is too large");
    return hpMatches[0];
  }
  if (hpMatches.length > 1) throw new Error("Multiple HP Colors import tokens found");

  const anyMatches = body.match(/\[ANITA-v1-[a-z0-9_]+\]:[^\s]+/g) || [];
  if (anyMatches.length === 1) {
    if (anyMatches[0].length > MAX_IMPORT_TOKEN_CHARS) throw new Error("Import code is too large");
    return anyMatches[0];
  }
  if (anyMatches.length > 1) throw new Error("Multiple Anita import tokens found");

  throw new Error("Malformed HP Colors import code");
}

function extractHpColorsImportTokens(text) {
  const body = String(text || "").trim();
  if (!body) throw new Error("Malformed HP Colors import code");
  if (body.length > MAX_IMPORT_TEXT_CHARS) throw new Error("Import code is too large");
  const hpMatches = body.match(/\[ANITA-v1-hp_colors\]:[^\s]+/g) || [];
  for (const token of hpMatches) {
    if (token.length > MAX_IMPORT_TOKEN_CHARS) throw new Error("Import code is too large");
  }
  return hpMatches;
}

function decodeImportPayloadText(text) {
  const body = String(text || "").trim();
  let token;
  try {
    token = extractHpColorsImportToken(body);
  } catch (error) {
    if (!/Malformed HP Colors import code/i.test(error?.message || "")) throw error;
    if (!/^[A-Za-z0-9_-]+$/.test(body)) throw error;
    try {
      const payloadText = decodeBase64UrlStrict(body);
      if (/^\s*\{/.test(payloadText)) return payloadText;
    } catch {
      // Keep bare non-preset strings on the original malformed-code path.
    }
    throw error;
  }

  const match = token.match(/^\[ANITA-v1-([a-z0-9_]+)\]:([^\s]+)$/i);
  if (!match) throw new Error("Malformed HP Colors import code");
  const namespace = match[1];
  if (namespace !== HP_IMPORT_CODE_NAMESPACE) throw new Error("Wrong import code namespace");
  return decodeBase64UrlStrict(match[2]);
}

function parsePayloadText(payloadText) {
  let parsed;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JSON payload");
  }
  return parsed;
}

function assertPayloadVersion(parsed, options = {}) {
  if (Object.prototype.hasOwnProperty.call(parsed, "v") || Object.prototype.hasOwnProperty.call(parsed, "c")) {
    const requireCompactVersion = options.requireCompactVersion !== false;
    if (!Object.prototype.hasOwnProperty.call(parsed, "v") || (requireCompactVersion && !Object.prototype.hasOwnProperty.call(parsed, "c"))) {
      throw new Error("Invalid JSON payload");
    }
    const version = Number(parsed.v);
    if (version !== HP_IMPORT_CODE_VERSION && !HP_IMPORT_CODE_LEGACY_VERSIONS.has(version)) throw new Error("Unsupported version");
    if (Object.prototype.hasOwnProperty.call(parsed, "c")) {
      const compactVersion = Number(parsed.c);
      if (compactVersion !== HP_IMPORT_CODE_COMPACT_VERSION) throw new Error("Unsupported version");
    }
  } else if (Object.prototype.hasOwnProperty.call(parsed, "version")) {
    const presetVersion = Number(parsed.version);
    if (presetVersion !== 1) throw new Error("Unsupported version");
  } else {
    throw new Error("Invalid JSON payload");
  }
}

function valuesToSchemaState(values, schema) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Invalid JSON payload");
  }

  const expanded = expandValues(values, schema);
  const result = {};
  for (const [id, spec] of Object.entries(schema || {})) {
    const value = Object.prototype.hasOwnProperty.call(expanded, id) ? expanded[id] : spec?.defaultValue;
    result[id] = coerceHpValue(id, value);
  }
  return result;
}

function parseImportPayloadValues(parsed, schema) {
  assertPayloadVersion(parsed);
  return valuesToSchemaState(parsed.values, schema);
}

function cleanImportedPresetName(name, index) {
  const value = String(name || "").trim();
  return value || `Imported preset ${index + 1}`;
}

function createImportProfile(name, values, schema, index) {
  return {
    name: cleanImportedPresetName(name, index),
    values: valuesToSchemaState(values, schema)
  };
}

function hasVersionFields(value) {
  return Object.prototype.hasOwnProperty.call(value, "v") ||
    Object.prototype.hasOwnProperty.call(value, "c") ||
    Object.prototype.hasOwnProperty.call(value, "version");
}

function parseImportProfileEntry(preset, schema, index, allowInheritedVersion) {
  if (!preset || typeof preset !== "object" || Array.isArray(preset)) {
    throw new Error("Invalid JSON payload");
  }
  if (hasVersionFields(preset)) {
    assertPayloadVersion(preset);
  } else if (!allowInheritedVersion) {
    throw new Error("Invalid JSON payload");
  }
  const values = Object.prototype.hasOwnProperty.call(preset, "vs") ? preset.vs : preset.values;
  const name = Object.prototype.hasOwnProperty.call(preset, "n") ? preset.n : preset.name;
  return createImportProfile(name, values, schema, index);
}

function parseMinimalBundleEntry(entry, schema, index) {
  if (!Array.isArray(entry) || entry.length !== 2) throw new Error("Invalid JSON payload");
  return createImportProfile(entry[0], entry[1], schema, index);
}

function parseImportProfilesFromPayload(parsed, schema, fallbackIndex = 0) {
  if (Object.prototype.hasOwnProperty.call(parsed, "p")) {
    assertPayloadVersion(parsed, { requireCompactVersion: false });
    if (!Array.isArray(parsed.p) || parsed.p.length === 0) throw new Error("Invalid JSON payload");
    return parsed.p.map((entry, index) => parseMinimalBundleEntry(entry, schema, index));
  }
  assertPayloadVersion(parsed);
  if (Object.prototype.hasOwnProperty.call(parsed, "ps")) {
    if (!Array.isArray(parsed.ps) || parsed.ps.length === 0) throw new Error("Invalid JSON payload");
    return parsed.ps.map((preset, index) => parseImportProfileEntry(preset, schema, index, true));
  }
  if (Array.isArray(parsed.presets) && parsed.presets.length > 0) {
    return parsed.presets.map((preset, index) => parseImportProfileEntry(preset, schema, index, false));
  }

  return [{
    name: cleanImportedPresetName(parsed.name, fallbackIndex),
    values: valuesToSchemaState(parsed.values, schema)
  }];
}

export function parseHpColorsImportCode(text, schema = HP_SCHEMA) {
  const payloadText = decodeImportPayloadText(text);
  return parseImportPayloadValues(parsePayloadText(payloadText), schema);
}

export function parseHpColorsImportProfiles(text, schema = HP_SCHEMA) {
  const body = String(text || "").trim();
  const tokens = extractHpColorsImportTokens(body);
  if (tokens.length > 0) {
    return tokens.flatMap((token, index) => {
      const payloadText = decodeImportPayloadText(token);
      return parseImportProfilesFromPayload(parsePayloadText(payloadText), schema, index);
    });
  }

  const payloadText = decodeImportPayloadText(body);
  return parseImportProfilesFromPayload(parsePayloadText(payloadText), schema, 0);
}
