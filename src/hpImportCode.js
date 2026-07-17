import { normalizeHpPresetPayload, normalizeHpPresetValues } from "./hpPresetPayload.js";
import {
  HP_ACCEPTED_INPUT_VERSIONS,
  HP_PRESET_PAYLOAD_VERSION,
  HP_RUNTIME_LEGACY_STORAGE_VERSIONS,
  HP_RUNTIME_STORAGE_VERSION
} from "./contracts/hpColorsPresetContract.js";

const HP_IMPORT_CODE_PREFIX = "[ANITA-v1-hp_colors]:";
const HP_IMPORT_CODE_NAMESPACE = "hp_colors";
const HP_IMPORT_CODE_VERSION = HP_RUNTIME_STORAGE_VERSION;
const HP_IMPORT_CODE_COMPACT_VERSION = HP_PRESET_PAYLOAD_VERSION;
const HP_IMPORT_CODE_LEGACY_VERSIONS = new Set(HP_RUNTIME_LEGACY_STORAGE_VERSIONS);
const MAX_IMPORT_TOKEN_CHARS = 16384;
const MAX_IMPORT_PAYLOAD_CHARS = 8192;
const MAX_IMPORT_TEXT_CHARS = 32768;
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP = new Map(Array.from(BASE64_CHARS, (ch, idx) => [ch, idx]));


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
  if (/^\s*\{/.test(body)) return body;
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
    if (!HP_ACCEPTED_INPUT_VERSIONS.includes(version) || version === HP_PRESET_PAYLOAD_VERSION && !HP_IMPORT_CODE_LEGACY_VERSIONS.has(version)) throw new Error("Unsupported version");
    if (Object.prototype.hasOwnProperty.call(parsed, "c")) {
      const compactVersion = Number(parsed.c);
      if (compactVersion !== HP_IMPORT_CODE_COMPACT_VERSION) throw new Error("Unsupported version");
    }
  } else if (Object.prototype.hasOwnProperty.call(parsed, "version")) {
    const presetVersion = Number(parsed.version);
    if (presetVersion !== HP_PRESET_PAYLOAD_VERSION) throw new Error("Unsupported version");
  } else {
    throw new Error("Invalid JSON payload");
  }
}

function parseImportPayloadValues(parsed) {
  assertPayloadVersion(parsed);
  return normalizeHpPresetValues(parsed.values, { requireObject: true });
}

function hasVersionFields(value) {
  return Object.prototype.hasOwnProperty.call(value, "v") ||
    Object.prototype.hasOwnProperty.call(value, "c") ||
    Object.prototype.hasOwnProperty.call(value, "version");
}

function withImportFeatures(profile, source) {
  const rawValues = source?.values && typeof source.values === "object"
    ? source.values
    : source?.vals && typeof source.vals === "object"
      ? source.vals
      : source?.vs && typeof source.vs === "object"
        ? source.vs
        : {};
  const hasPrecisePips = Object.prototype.hasOwnProperty.call(rawValues, "hp_precise_pips_enabled") ||
    Object.prototype.hasOwnProperty.call(rawValues, "ppe");
  return {
    ...profile,
    importFeatures: {
      precisePips: hasPrecisePips ? profile.values.hp_precise_pips_enabled : null,
      signatureConditionCount: Object.keys(profile.overrides || {}).length
    }
  };
}

function parseImportProfileEntry(preset, index, allowInheritedVersion) {
  if (!preset || typeof preset !== "object" || Array.isArray(preset)) {
    throw new Error("Invalid JSON payload");
  }
  if (hasVersionFields(preset)) {
    assertPayloadVersion(preset);
  } else if (!allowInheritedVersion) {
    throw new Error("Invalid JSON payload");
  }
  return withImportFeatures(normalizeHpPresetPayload(preset, {
    index,
    fallbackName: `Imported preset ${index + 1}`,
    requireValues: true
  }), preset);
}

function parseMinimalBundleEntry(entry, index) {
  if (!Array.isArray(entry) || entry.length < 2 || entry.length > 4) throw new Error("Invalid JSON payload");
  const payload = Array.isArray(entry[2])
    ? { name: entry[0], values: entry[1], heroMode: "selected", heroes: entry[2], overrides: entry[3] }
    : { name: entry[0], values: entry[1], heroMode: entry[2], heroes: [], overrides: entry[3] };
  return withImportFeatures(normalizeHpPresetPayload(payload, {
    index,
    fallbackName: `Imported preset ${index + 1}`,
    requireValues: true
  }), payload);
}

function parseImportProfilesFromPayload(parsed, fallbackIndex = 0) {
  if (Object.prototype.hasOwnProperty.call(parsed, "p")) {
    assertPayloadVersion(parsed, { requireCompactVersion: false });
    if (!Array.isArray(parsed.p) || parsed.p.length === 0) throw new Error("Invalid JSON payload");
    return parsed.p.map((entry, index) => parseMinimalBundleEntry(entry, index));
  }
  assertPayloadVersion(parsed);
  if (Object.prototype.hasOwnProperty.call(parsed, "ps")) {
    if (!Array.isArray(parsed.ps) || parsed.ps.length === 0) throw new Error("Invalid JSON payload");
    return parsed.ps.map((preset, index) => parseImportProfileEntry(preset, index, true));
  }
  if (Array.isArray(parsed.presets) && parsed.presets.length > 0) {
    return parsed.presets.map((preset, index) => parseImportProfileEntry(preset, index, false));
  }
  if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
    return parsed.profiles.map((profile, index) => parseImportProfileEntry(profile, index, true));
  }

  return [withImportFeatures(normalizeHpPresetPayload(parsed, {
    index: fallbackIndex,
    fallbackName: `Imported preset ${fallbackIndex + 1}`,
    requireValues: true
  }), parsed)];
}

export function parseHpColorsPresetStorePayload(payload) {
  try {
    const profiles = parseImportProfilesFromPayload(payload, 0);
    if (profiles.length !== 1) throw new Error("Invalid HP Colors preset entry in this VPK");
    return profiles[0];
  } catch {
    throw new Error("Invalid HP Colors preset entry in this VPK");
  }
}


export function parseHpColorsImportCode(text) {
  const payloadText = decodeImportPayloadText(text);
  return parseImportPayloadValues(parsePayloadText(payloadText));
}

export function parseHpColorsImportProfiles(text) {
  const body = String(text || "").trim();
  const tokens = extractHpColorsImportTokens(body);
  if (tokens.length > 0) {
    return tokens.flatMap((token, index) => {
      const payloadText = decodeImportPayloadText(token);
      return parseImportProfilesFromPayload(parsePayloadText(payloadText), index);
    });
  }

  const payloadText = decodeImportPayloadText(body);
  return parseImportProfilesFromPayload(parsePayloadText(payloadText), 0);
}
