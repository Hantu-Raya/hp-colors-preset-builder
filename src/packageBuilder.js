import { HP_SCHEMA } from "./hpSchema.js";
import { createDefaultFormState } from "./hpFormModel.js";
import { injectPresetStoreIntoBaseHudXml } from "./presetStoreXml.js";
import { compilePanoramaLayoutResource, compileTextResource } from "./source2ResourceWriter.js";

export const BASE_HUD_SOURCE_PATH = "public/templates/hp_colors/panorama/layout/base_hud.xml";

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

export function buildHpColorsPackage({ sourceTexts, preset = null }) {
  const activePreset = preset || { name: "Web Builder Preset", version: 1, values: createDefaultFormState(HP_SCHEMA) };
  const baseHudXml = sourceTexts && sourceTexts[BASE_HUD_SOURCE_PATH];
  if (!baseHudXml) {
    throw new Error(`Missing source text: ${BASE_HUD_SOURCE_PATH}`);
  }

  const patchedBaseHudXml = injectPresetStoreIntoBaseHudXml(baseHudXml, [activePreset]);
  const files = [{
    path: toOutputPath(BASE_HUD_SOURCE_PATH),
    bytes: compileSourceFile(BASE_HUD_SOURCE_PATH, patchedBaseHudXml)
  }];

  return {
    preset: activePreset,
    baseHudXml: patchedBaseHudXml,
    files
  };
}
