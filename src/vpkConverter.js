import { HP_SCHEMA } from "./hpSchema.js";
import { BASE_HUD_SOURCE_PATH, DEFAULT_HP_COLORS_MOD_VARIANT, buildHpColorsPackage } from "./packageBuilder.js";
import { parseHpColorsImportCode } from "./hpImportCode.js";
import { normalizeHeroScope } from "./hpHeroData.js";
import { base64UrlDecode } from "./presetStoreXml.js";
import { extractPanoramaLayoutSource } from "./source2ResourceReader.js";
import { readVpk } from "./vpkReader.js";

const BASE_HUD_OUTPUT_PATH = "panorama/layout/base_hud.vxml_c";

function extractPresetEntryTokens(baseHudXml) {
  const matches = String(baseHudXml).matchAll(/<Label\b[^>]*\bclass="[^"]*\bhp_colors_preset_entry\b[^"]*"[^>]*\btext="([^"]+)"/g);
  const tokens = [...matches].map((match) => match[1]).filter(Boolean);
  if (!tokens.length) throw new Error("No HP Colors preset entry found in this VPK");
  return tokens;
}

function decodePresetToken(token) {
  let parsed;
  try {
    parsed = JSON.parse(base64UrlDecode(token));
  } catch {
    throw new Error("Invalid HP Colors preset entry in this VPK");
  }
  const values = parseHpColorsImportCode(token, HP_SCHEMA);
  const scope = normalizeHeroScope(parsed?.heroMode || parsed?.hm, parsed?.heroes || parsed?.hs);
  return {
    name: String(parsed?.name || "Converted Preset"),
    version: 1,
    values,
    heroMode: scope.heroMode,
    heroes: scope.heroes
  };
}

function extractPresetsFromBaseHudXml(baseHudXml) {
  return extractPresetEntryTokens(baseHudXml).map(decodePresetToken);
}

function extractPresetFromBaseHudXml(baseHudXml) {
  return extractPresetsFromBaseHudXml(baseHudXml)[0];
}

export function extractHpColorsPresetFromVpk(vpkBytes) {
  const files = readVpk(vpkBytes);
  const baseHud = files.find((file) => file.path === BASE_HUD_OUTPUT_PATH);
  if (!baseHud) throw new Error("This VPK does not contain the HP Colors base_hud override");
  const baseHudXml = extractPanoramaLayoutSource(baseHud.bytes);
  return extractPresetFromBaseHudXml(baseHudXml);
}

export function convertHpColorsPresetVpk({ vpkBytes, baseHudXml, targetModVariant }) {
  const files = readVpk(vpkBytes);
  const baseHud = files.find((file) => file.path === BASE_HUD_OUTPUT_PATH);
  if (!baseHud) throw new Error("This VPK does not contain the HP Colors base_hud override");
  const sourceBaseHudXml = extractPanoramaLayoutSource(baseHud.bytes);
  const presets = extractPresetsFromBaseHudXml(sourceBaseHudXml);
  return buildHpColorsPackage({
    sourceTexts: { [BASE_HUD_SOURCE_PATH]: baseHudXml },
    presets,
    modVariant: targetModVariant || DEFAULT_HP_COLORS_MOD_VARIANT
  });
}
