import { HP_SCHEMA, coerceHpValue } from "./hpSchema.js";

export const HP_IMPORT_CODE_PREFIX = "[ANITA-v1-hp_colors]:";
export const HP_IMPORT_CODE_NAMESPACE = "hp_colors";
export const HP_IMPORT_CODE_VERSION = 97;
export const HP_IMPORT_CODE_COMPACT_VERSION = 1;
export const HP_IMPORT_CODE_LEGACY_VERSIONS = new Set([25]);

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
  return utf8FromBinary(binary);
}

function binaryFromBase64(base64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Map(Array.from(chars, (ch, idx) => [ch, idx]));
  let bits = 0;
  let bitCount = 0;
  let out = "";
  for (const ch of String(base64 || "").replace(/=+$/g, "")) {
    if (!lookup.has(ch)) throw new Error("Invalid base64url token");
    bits = (bits << 6) | lookup.get(ch);
    bitCount += 6;
    while (bitCount >= 8) {
      bitCount -= 8;
      out += String.fromCharCode((bits >> bitCount) & 0xff);
    }
  }
  return out;
}

function base64UrlFromBinary(binary) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bits = 0;
  let bitCount = 0;
  let out = "";
  for (const ch of String(binary || "")) {
    bits = (bits << 8) | ch.charCodeAt(0);
    bitCount += 8;
    while (bitCount >= 6) {
      bitCount -= 6;
      out += chars[(bits >> bitCount) & 63];
    }
  }
  if (bitCount > 0) out += chars[(bits << (6 - bitCount)) & 63];
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8FromBinary(binary) {
  const bytes = Uint8Array.from(String(binary || ""), (ch) => ch.charCodeAt(0));
  return typeof TextDecoder === "function" ? new TextDecoder("utf-8").decode(bytes) : binary;
}

function sanitizeSchemaState(schema, state) {
  const next = {};
  for (const [id, spec] of Object.entries(schema || {})) {
    next[id] = coerceHpValue(id, Object.prototype.hasOwnProperty.call(state || {}, id) ? state[id] : spec?.defaultValue);
  }
  return next;
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
  const hpMatches = body.match(/\[ANITA-v1-hp_colors\]:[^\s]+/g) || [];
  if (hpMatches.length === 1) return hpMatches[0];
  if (hpMatches.length > 1) throw new Error("Multiple HP Colors import tokens found");

  const anyMatches = body.match(/\[ANITA-v1-[a-z0-9_]+\]:[^\s]+/g) || [];
  if (anyMatches.length === 1) return anyMatches[0];
  if (anyMatches.length > 1) throw new Error("Multiple Anita import tokens found");

  throw new Error("Malformed HP Colors import code");
}

export function parseHpColorsImportCode(text, schema = HP_SCHEMA) {
  const token = extractHpColorsImportToken(text);
  const match = token.match(/^\[ANITA-v1-([a-z0-9_]+)\]:([^\s]+)$/i);
  if (!match) throw new Error("Malformed HP Colors import code");
  const namespace = match[1];
  if (namespace !== HP_IMPORT_CODE_NAMESPACE) throw new Error("Wrong import code namespace");

  const payloadText = decodeBase64UrlStrict(match[2]);
  let parsed;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JSON payload");
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, "v") ||
      !Object.prototype.hasOwnProperty.call(parsed, "c") ||
      !Object.prototype.hasOwnProperty.call(parsed, "values")) {
    throw new Error("Invalid JSON payload");
  }
  if (!parsed.values || typeof parsed.values !== "object" || Array.isArray(parsed.values)) {
    throw new Error("Invalid JSON payload");
  }

  const version = Number(parsed.v);
  if (version !== HP_IMPORT_CODE_VERSION && !HP_IMPORT_CODE_LEGACY_VERSIONS.has(version)) throw new Error("Unsupported version");
  const compactVersion = Number(parsed.c);
  if (compactVersion !== HP_IMPORT_CODE_COMPACT_VERSION) throw new Error("Unsupported version");

  const expanded = expandValues(parsed.values, schema);
  const result = {};
  for (const [id, spec] of Object.entries(schema || {})) {
    const value = Object.prototype.hasOwnProperty.call(expanded, id) ? expanded[id] : spec?.defaultValue;
    result[id] = coerceHpValue(id, value);
  }
  return sanitizeSchemaState(schema, result);
}
