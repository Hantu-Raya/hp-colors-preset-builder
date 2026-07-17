import {
  HP_PRESET_FIELD_IDS,
  HP_PRESET_PAYLOAD_VERSION
} from "./contracts/hpColorsPresetContract.js";
import { normalizeHpPresetPayload } from "./hpPresetPayload.js";
import { HP_COLORS_PACKAGE_LIMITS } from "./packageArtifacts.js";

export const PRESET_STORE_PANEL_ID = "HPColorsPresetStore";
export const PRESET_STORE_LABEL_CLASS = "hp_colors_preset_entry";
const XML_INSERT_MARKER = /(<Panel\s+id="AnitaUI_Anchor"[\s\S]*?\/>)/;
const FATAL_TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function utf8Bytes(text) { return new TextEncoder().encode(String(text)); }
function utf8Text(bytes) {
  try { return FATAL_TEXT_DECODER.decode(bytes); } catch { throw new Error("Invalid UTF-8 in HP Colors preset entry"); }
}
function encodeBase64UrlText(text) {
  const bytes = utf8Bytes(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64UrlText(encoded) {
  const value = String(encoded || "");
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid HP Colors preset entry in this VPK");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary;
  try { binary = atob(padded); } catch { throw new Error("Invalid HP Colors preset entry in this VPK"); }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return utf8Text(bytes);
}

function readXmlAttributes(tag) {
  const attrs = {};
  const body = String(tag).replace(/^<[^\s>]+\s*|\/?\s*>$/g, "");
  const re = /([A-Za-z_:][A-Za-z0-9_:.\-]*)\s*=\s*"([^"<>]*)"/g;
  let consumed = "";
  let match;
  while ((match = re.exec(body))) {
    if (Object.prototype.hasOwnProperty.call(attrs, match[1])) throw new Error("Duplicate XML attribute");
    attrs[match[1]] = match[2];
    consumed += match[0];
  }
  const remainder = body.replace(re, "").trim();
  if (remainder) throw new Error("Malformed XML attributes");
  return attrs;
}

function isControlText(value) { return /[\u0000-\u001f\u007f]/.test(value); }
function hasPresetEntryClass(className) { return String(className || "").split(/\s+/).includes(PRESET_STORE_LABEL_CLASS); }
function isPlainObject(value) { return value && typeof value === "object" && !Array.isArray(value); }

function validatePresetPayload(payload, encodedBytes = 0) {
  if (!isPlainObject(payload) || payload.version !== HP_PRESET_PAYLOAD_VERSION) throw new Error("HP Colors preset payload must use version 1");
  if (typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > HP_COLORS_PACKAGE_LIMITS.MAX_PROFILE_NAME_CHARS || isControlText(payload.name)) throw new Error("HP Colors preset name exceeds 96-character limit");
  if (!isPlainObject(payload.values)) throw new Error("HP Colors preset values must be an object");
  const keys = Object.keys(payload.values);
  if (keys.length !== HP_PRESET_FIELD_IDS.length || keys.some((key) => !HP_PRESET_FIELD_IDS.includes(key))) throw new Error("HP Colors preset values must contain exactly 55 recognized fields");
  const normalized = normalizeHpPresetPayload(payload, { requireValues: true });
  for (const id of HP_PRESET_FIELD_IDS) {
    if (JSON.stringify(payload.values[id]) !== JSON.stringify(normalized.values[id])) throw new Error(`HP Colors preset field is not normalized: ${id}`);
  }
  if (!["off", "all", "selected"].includes(payload.heroMode) || !Array.isArray(payload.heroes) || payload.heroes.length > HP_COLORS_PACKAGE_LIMITS.MAX_HEROES_PER_PROFILE) throw new Error("Invalid HP Colors hero scope");
  if (encodedBytes > HP_COLORS_PACKAGE_LIMITS.MAX_ENCODED_PRESET_BYTES) throw new Error("Encoded HP Colors preset exceeds 64 KiB limit");
  return payload;
}

export function encodePresetStoreEntry(preset) {
  const encoded = encodeBase64UrlText(JSON.stringify(preset));
  if (utf8Bytes(encoded).byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_ENCODED_PRESET_BYTES) throw new Error("Encoded HP Colors preset exceeds 64 KiB limit");
  return encoded;
}

export function decodePresetStoreEntry(encoded) {
  const encodedBytes = utf8Bytes(encoded);
  if (encodedBytes.byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_ENCODED_PRESET_BYTES) throw new Error("Encoded HP Colors preset exceeds 64 KiB limit");
  let payload;
  try { payload = JSON.parse(decodeBase64UrlText(encoded)); } catch (error) { throw new Error(error?.message || "Invalid HP Colors preset entry in this VPK"); }
  return validatePresetPayload(payload, encodedBytes.byteLength);
}

function decodePresetStoreEntryLoose(encoded, index) {
  const encodedBytes = utf8Bytes(encoded);
  if (encodedBytes.byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_ENCODED_PRESET_BYTES) throw new Error("Encoded HP Colors preset exceeds 64 KiB limit");
  let payload;
  try { payload = JSON.parse(decodeBase64UrlText(encoded)); } catch { throw new Error("Invalid HP Colors preset entry in this VPK"); }
  try {
    return normalizeHpPresetPayload(payload, { index });
  } catch (error) {
    throw new Error(error?.message || "Invalid HP Colors preset entry in this VPK");
  }
}

function normalizePresetInputs(presets) {
  return presets.map((preset, index) => normalizeHpPresetPayload(preset, { index }));
}

function parseXml(baseHudXml) {
  const xml = String(baseHudXml ?? "");
  if (utf8Bytes(xml).byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_XML_RESOURCE_BYTES) throw new Error("HP Colors XML exceeds 2 MiB limit");
  const stack = [];
  let rootCount = 0;
  let rootName = "";
  let storeCount = 0;
  let storeDepth = -1;
  const labels = [];
  const tokenRe = /<!--[\s\S]*?-->|<\?[^>]*>|<![^>]*>|<[^>]+>|[^<]+/g;
  let match;
  while ((match = tokenRe.exec(xml))) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<?") || token.startsWith("<!")) continue;
    if (!token.startsWith("<")) {
      if (stack.length === 0 && token.trim()) throw new Error("XML text outside root");
      continue;
    }
    if (/^<\//.test(token)) {
      const name = token.match(/^<\/\s*([A-Za-z_:][A-Za-z0-9_:.\-]*)\s*>$/)?.[1];
      if (!name || stack.pop() !== name) throw new Error("Malformed XML nesting");
      if (name === PRESET_STORE_PANEL_ID) storeDepth = -1;
      continue;
    }
    const start = token.match(/^<\s*([A-Za-z_:][A-Za-z0-9_:.\-]*)([\s\S]*?)\s*(\/?)>$/);
    if (!start) throw new Error("Malformed XML tag");
    const [, name, , selfClosing] = start;
    const attrs = readXmlAttributes(token);
    if (!stack.length) {
      rootCount += 1;
      rootName = name;
      if (rootCount !== 1 || name !== "root") throw new Error("HP Colors XML must contain one root element");
    }
    if (name === "Panel" && attrs.id === PRESET_STORE_PANEL_ID) {
      storeCount += 1;
      if (storeCount > 1) throw new Error("HP Colors XML must contain one HPColorsPresetStore");
      storeDepth = stack.length + 1;
    }
    if (name === "Label" && storeDepth >= 0 && stack.length === storeDepth) {
      if (!hasPresetEntryClass(attrs.class) || !attrs.id || !attrs.text) throw new Error("Malformed HP Colors preset label");
      labels.push({ id: attrs.id, encoded: attrs.text });
    }
    if (!selfClosing) stack.push(name);
  }
  if (stack.length || rootCount !== 1 || rootName !== "root" || storeCount !== 1) throw new Error("Invalid HP Colors preset store XML");
  if (labels.length === 0) throw new Error("No HP Colors preset entry found in this VPK");
  labels.forEach((label, index) => {
    const expected = `HPColorsPreset_${String(index + 1).padStart(3, "0")}`;
    if (label.id !== expected) throw new Error("HP Colors preset label IDs must be unique and sequential");
  });
  return labels;
}

export function validatePresetStoreXml(baseHudXml) {
  return parseXml(baseHudXml).map(({ encoded }) => decodePresetStoreEntry(encoded));
}

export function readPresetStoreFromBaseHudXml(baseHudXml) {
  return parseXml(baseHudXml).map(({ encoded }, index) => decodePresetStoreEntryLoose(encoded, index));
}

function presetLabelXml(preset, index) {
  const encoded = encodePresetStoreEntry(preset);
  const id = `HPColorsPreset_${String(index + 1).padStart(3, "0")}`;
  return `\t\t<Label id="${id}" class="${PRESET_STORE_LABEL_CLASS}" text="${encoded}" />`;
}

export function writePresetStoreToBaseHudXml(baseHudXml, presets) {
  if (!Array.isArray(presets) || presets.length < 1 || presets.length > HP_COLORS_PACKAGE_LIMITS.MAX_PROFILES) throw new Error("HP Colors package must contain 1-128 profiles");
  const normalizedPresets = normalizePresetInputs(presets);
  normalizedPresets.forEach((preset) => validatePresetPayload(preset));
  const labels = normalizedPresets.map(presetLabelXml).join("\n");
  const store = [
    `\t\t<Panel id="${PRESET_STORE_PANEL_ID}" hittest="false" style="visibility: collapse; width: 0px; height: 0px;">`,
    labels,
    "\t\t</Panel>"
  ].join("\n");
  const source = String(baseHudXml ?? "");
  const output = source.includes(PRESET_STORE_PANEL_ID)
    ? source.replace(/<Panel\s+id="HPColorsPresetStore"[\s\S]*?<\/Panel>/, store)
    : !XML_INSERT_MARKER.test(source) ? (() => { throw new Error("Could not find AnitaUI_Anchor in base_hud.xml"); })() : source.replace(XML_INSERT_MARKER, `$1\n${store}`);
  validatePresetStoreXml(output);
  return output;
}
