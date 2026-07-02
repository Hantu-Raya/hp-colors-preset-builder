export const PRESET_STORE_PANEL_ID = "HPColorsPresetStore";
export const PRESET_STORE_LABEL_CLASS = "hp_colors_preset_entry";

const XML_INSERT_MARKER = /(<Panel\s+id="AnitaUI_Anchor"[\s\S]*?\/>)/;

function utf8Bytes(text) {
  return new TextEncoder().encode(String(text));
}

function utf8Text(bytes) {
  return new TextDecoder().decode(bytes);
}

function encodeBase64UrlText(text) {
  const bytes = utf8Bytes(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64UrlText(encoded) {
  const padded = String(encoded).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(encoded).length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return utf8Text(bytes);
}

function readXmlAttributes(tag) {
  const attrs = {};
  for (const match of String(tag).matchAll(/\b([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function hasPresetEntryClass(className) {
  return String(className || "").split(/\s+/).includes(PRESET_STORE_LABEL_CLASS);
}

export function encodePresetStoreEntry(preset) {
  return encodeBase64UrlText(JSON.stringify(preset));
}

export function decodePresetStoreEntry(encoded) {
  try {
    return JSON.parse(decodeBase64UrlText(encoded));
  } catch {
    throw new Error("Invalid HP Colors preset entry in this VPK");
  }
}

function presetLabelXml(preset, index) {
  const encoded = encodePresetStoreEntry(preset);
  const id = `HPColorsPreset_${String(index + 1).padStart(3, "0")}`;
  return `\t\t<Label id="${id}" class="${PRESET_STORE_LABEL_CLASS}" text="${encoded}" />`;
}

export function readPresetStoreFromBaseHudXml(baseHudXml) {
  const labels = [];
  for (const match of String(baseHudXml).matchAll(/<Label\b[^>]*\/>/g)) {
    const attrs = readXmlAttributes(match[0]);
    if (hasPresetEntryClass(attrs.class)) labels.push(attrs.text);
  }
  if (!labels.length) throw new Error("No HP Colors preset entry found in this VPK");
  return labels.map((encoded) => decodePresetStoreEntry(encoded));
}

export function writePresetStoreToBaseHudXml(baseHudXml, presets) {
  const labels = presets.map(presetLabelXml).join("\n");
  const store = [
    `\t\t<Panel id="${PRESET_STORE_PANEL_ID}" hittest="false" style="visibility: collapse; width: 0px; height: 0px;">`,
    labels,
    "\t\t</Panel>"
  ].join("\n");

  if (baseHudXml.includes(PRESET_STORE_PANEL_ID)) {
    return baseHudXml.replace(/<Panel\s+id="HPColorsPresetStore"[\s\S]*?<\/Panel>/, store);
  }
  if (!XML_INSERT_MARKER.test(baseHudXml)) {
    throw new Error("Could not find AnitaUI_Anchor in base_hud.xml");
  }
  return baseHudXml.replace(XML_INSERT_MARKER, `$1\n${store}`);
}
