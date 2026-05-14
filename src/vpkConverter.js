import { HP_SCHEMA } from "./hpSchema.js";
import { BASE_HUD_SOURCE_PATH, HP_COLORS_MOD_VARIANTS, buildHpColorsPackage } from "./packageBuilder.js";
import { parseHpColorsImportCode } from "./hpImportCode.js";
import { base64UrlDecode } from "./presetStoreXml.js";
import { extractPanoramaLayoutSource } from "./source2ResourceReader.js";
import { readVpk } from "./vpkReader.js";

const BASE_HUD_OUTPUT_PATH = "panorama/layout/base_hud.vxml_c";

function extractPresetEntryToken(baseHudXml) {
  const match = String(baseHudXml).match(/<Label\b[^>]*\bclass="[^"]*\bhp_colors_preset_entry\b[^"]*"[^>]*\btext="([^"]+)"/);
  if (!match) throw new Error("No HP Colors preset entry found in this VPK");
  return match[1];
}

function extractPresetFromBaseHudXml(baseHudXml) {
  const token = extractPresetEntryToken(baseHudXml);
  let parsed;
  try {
    parsed = JSON.parse(base64UrlDecode(token));
  } catch {
    throw new Error("Invalid HP Colors preset entry in this VPK");
  }
  const values = parseHpColorsImportCode(token, HP_SCHEMA);
  return {
    name: String(parsed?.name || "Converted Preset"),
    version: 1,
    values
  };
}

export function extractHpColorsPresetFromVpk(vpkBytes) {
  const files = readVpk(vpkBytes);
  const baseHud = files.find((file) => file.path === BASE_HUD_OUTPUT_PATH);
  if (!baseHud) throw new Error("This VPK does not contain the HP Colors base_hud override");
  const baseHudXml = extractPanoramaLayoutSource(baseHud.bytes);
  return extractPresetFromBaseHudXml(baseHudXml);
}

export function convertHpColorsPresetVpk({ vpkBytes, baseHudXml, targetModVariant }) {
  const preset = extractHpColorsPresetFromVpk(vpkBytes);
  return buildHpColorsPackage({
    sourceTexts: { [BASE_HUD_SOURCE_PATH]: baseHudXml },
    preset,
    modVariant: targetModVariant || HP_COLORS_MOD_VARIANTS.FULL
  });
}
