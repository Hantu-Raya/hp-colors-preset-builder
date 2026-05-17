import { HP_SCHEMA } from "./hpSchema.js";
import { createDefaultFormState, sanitizeFormState } from "./hpFormModel.js";
import { injectPresetStoreIntoBaseHudXml } from "./presetStoreXml.js";
import { compilePanoramaLayoutResource, compileTextResource } from "./source2ResourceWriter.js";

export const BASE_HUD_SOURCE_PATH = "public/templates/hp_colors/panorama/layout/base_hud.xml";
export const HP_COLORS_MOD_VARIANTS = Object.freeze({
  FULL: "full",
  MINIMAL: "minimal"
});

const MINIMAL_MOD_INCLUDE_RE = /^[\t ]*<include\s+src="s2r:\/\/panorama\/(?:styles\/anita_ui\.vcss_c|scripts\/(?:anita_persist_loader|hp_registrar)\.vjs_c)"\s*\/>\r?\n?/gm;

function normalizePreset(preset, index = 0) {
  const fallbackName = index === 0 ? "Web Builder Preset" : `Profile ${index + 1}`;
  const rawName = typeof preset?.name === "string" ? preset.name.trim() : "";
  const values = preset?.values && typeof preset.values === "object" && !Array.isArray(preset.values)
    ? preset.values
    : createDefaultFormState(HP_SCHEMA);
  return {
    name: rawName || fallbackName,
    version: 1,
    values: sanitizeFormState(HP_SCHEMA, values)
  };
}

function toOutputPath(sourcePath) {
  return String(sourcePath)
    .replace(/^public\/templates\/hp_colors\//, "")
    .replace(/^templates\/hp_colors\//, "")
    .replace(/\.js$/i, ".vjs_c")
    .replace(/\.css$/i, ".vcss_c")
    .replace(/\.xml$/i, ".vxml_c");
}

function compileSourceFile(sourcePath, sourceText) {
  if (/\.xml$/i.test(sourcePath)) {
    return compilePanoramaLayoutResource(sourceText);
  }
  return compileTextResource(sourceText);
}

function normalizeModVariant(modVariant) {
  if (modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL) return HP_COLORS_MOD_VARIANTS.MINIMAL;
  if (modVariant === HP_COLORS_MOD_VARIANTS.FULL || modVariant == null) return HP_COLORS_MOD_VARIANTS.FULL;
  throw new Error(`Unknown HP Colors mod variant: ${modVariant}`);
}

function prepareBaseHudXml(baseHudXml, modVariant) {
  if (modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL) {
    return String(baseHudXml).replace(MINIMAL_MOD_INCLUDE_RE, "");
  }
  return baseHudXml;
}

export function buildHpColorsPackage({
  sourceTexts,
  preset = null,
  presets = null,
  modVariant = HP_COLORS_MOD_VARIANTS.FULL
}) {
  const activeModVariant = normalizeModVariant(modVariant);
  const defaultPreset = { name: "Web Builder Preset", version: 1, values: createDefaultFormState(HP_SCHEMA) };
  const sourcePresets = Array.isArray(presets) && presets.length > 0
    ? presets
    : [preset || defaultPreset];
  const activePresets = sourcePresets.map((item, index) => normalizePreset(item, index));
  const baseHudXml = sourceTexts && (
    sourceTexts[BASE_HUD_SOURCE_PATH] ||
    sourceTexts["templates/hp_colors/panorama/layout/base_hud.xml"]
  );
  if (!baseHudXml) {
    throw new Error(`Missing source text: ${BASE_HUD_SOURCE_PATH}`);
  }

  const modSpecificBaseHudXml = prepareBaseHudXml(baseHudXml, activeModVariant);
  const patchedBaseHudXml = injectPresetStoreIntoBaseHudXml(modSpecificBaseHudXml, activePresets);
  const files = [{
    path: toOutputPath(BASE_HUD_SOURCE_PATH),
    bytes: compileSourceFile(BASE_HUD_SOURCE_PATH, patchedBaseHudXml)
  }];

  return {
    preset: activePresets[0],
    presets: activePresets,
    modVariant: activeModVariant,
    baseHudXml: patchedBaseHudXml,
    files
  };
}
