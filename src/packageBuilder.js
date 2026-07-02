import { normalizeHpPresetPayload } from "./hpPresetPayload.js";
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import {
  HP_COLORS_PACKAGE_ARTIFACTS,
  readHpColorsArtifactSourceText
} from "./packageArtifacts.js";
import { writePresetStoreToBaseHudXml } from "./presetStoreXml.js";
import { compileSource2Resource } from "./source2ResourceCodec.js";
import { createVpkArchive, writeVpkArchive } from "./vpkArchive.js";

export { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS };

const MINIMAL_MOD_STYLE_INCLUDE_RE = /^[\t ]*<include\s+src="s2r:\/\/panorama\/styles\/anita_ui\.vcss_c"\s*\/>\r?\n?/gm;
const CORE_SCRIPT_BLOCK = [
  "\t<scripts>",
  '\t\t<include src="s2r://panorama/scripts/anita_ui_core.vjs_c" />',
  "\t</scripts>"
].join("\n");

function keepCoreScriptOnly(baseHudXml) {
  return String(baseHudXml).replace(/<scripts>[\s\S]*?<\/scripts>/, CORE_SCRIPT_BLOCK);
}

function normalizeModVariant(modVariant) {
  if (modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL) return HP_COLORS_MOD_VARIANTS.MINIMAL;
  if (modVariant === HP_COLORS_MOD_VARIANTS.FULL) return HP_COLORS_MOD_VARIANTS.FULL;
  if (modVariant == null) return DEFAULT_HP_COLORS_MOD_VARIANT;
  throw new Error(`Unknown HP Colors mod variant: ${modVariant}`);
}

function prepareBaseHudXml(baseHudXml, modVariant) {
  const scriptNormalizedXml = keepCoreScriptOnly(baseHudXml);
  if (modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL) {
    return scriptNormalizedXml.replace(MINIMAL_MOD_STYLE_INCLUDE_RE, "");
  }
  return scriptNormalizedXml;
}

function normalizePackagePresets({ preset, presets }) {
  const sourcePresets = Array.isArray(presets) && presets.length > 0 ? presets : [preset || {}];
  return sourcePresets.map((item, index) => normalizeHpPresetPayload(item, { index }));
}

export function createHpColorsPackagePlan({
  sourceTexts,
  preset = null,
  presets = null,
  modVariant = DEFAULT_HP_COLORS_MOD_VARIANT
}) {
  const activeModVariant = normalizeModVariant(modVariant);
  const activePresets = normalizePackagePresets({ preset, presets });
  const baseHudArtifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;
  const baseHudXml = readHpColorsArtifactSourceText(sourceTexts, baseHudArtifact);
  const modSpecificBaseHudXml = prepareBaseHudXml(baseHudXml, activeModVariant);
  const patchedBaseHudXml = writePresetStoreToBaseHudXml(modSpecificBaseHudXml, activePresets);

  return {
    preset: activePresets[0],
    presets: activePresets,
    modVariant: activeModVariant,
    artifacts: [{
      id: baseHudArtifact.id,
      sourcePath: baseHudArtifact.sourcePath,
      archivePath: baseHudArtifact.archivePath,
      codec: baseHudArtifact.codec,
      sourceText: patchedBaseHudXml
    }]
  };
}

export function buildHpColorsPackageFromPlan(plan) {
  const files = (plan?.artifacts || []).map((artifact) => ({
    path: artifact.archivePath,
    bytes: compileSource2Resource({ sourceText: artifact.sourceText, codec: artifact.codec })
  }));
  const vpkBytes = writeVpkArchive(createVpkArchive(files));

  return {
    preset: plan.preset,
    presets: plan.presets,
    modVariant: plan.modVariant,
    manifest: {
      files: files.map((file, index) => {
        const artifact = plan.artifacts[index];
        return {
          id: artifact.id,
          sourcePath: artifact.sourcePath,
          archivePath: artifact.archivePath,
          codec: artifact.codec,
          byteLength: file.bytes.byteLength
        };
      })
    },
    vpkBytes
  };
}

export function buildHpColorsPackage(input) {
  return buildHpColorsPackageFromPlan(createHpColorsPackagePlan(input));
}
