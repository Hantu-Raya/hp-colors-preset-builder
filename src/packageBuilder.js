import { normalizeHpPresetPayload } from "./hpPresetPayload.js";
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import {
  HP_COLORS_PACKAGE_ARTIFACTS,
  HP_COLORS_PACKAGE_FILE_PATHS,
  HP_COLORS_PACKAGE_LIMITS,
  readHpColorsArtifactSourceText,
  validateHpColorsPackageFiles
} from "./packageArtifacts.js";
import { writePresetStoreToBaseHudXml, validatePresetStoreXml } from "./presetStoreXml.js";
import { compileSource2Resource, extractSource2Resource } from "./source2ResourceCodec.js";
import { createVpkArchive, readVpkArchive, writeVpkArchive } from "./vpkArchive.js";

export { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS };
export { HP_COLORS_PACKAGE_LIMITS };

const BASE_STYLE_INCLUDES = [
  "s2r://panorama/styles/base.vcss_c",
  "s2r://panorama/styles/citadel_base_styles.vcss_c"
];
const FULL_STYLE_INCLUDES = [...BASE_STYLE_INCLUDES, "s2r://panorama/styles/anita_ui.vcss_c"];
const CORE_SCRIPT_INCLUDES = ["s2r://panorama/scripts/anita_ui_core.vjs_c"];
const XML_INSERT_MARKER = /(<Panel\s+id="AnitaUI_Anchor"[\s\S]*?\/>)/;

function normalizeModVariant(modVariant) {
  if (modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL) return HP_COLORS_MOD_VARIANTS.MINIMAL;
  if (modVariant === HP_COLORS_MOD_VARIANTS.FULL) return HP_COLORS_MOD_VARIANTS.FULL;
  if (modVariant == null) return DEFAULT_HP_COLORS_MOD_VARIANT;
  throw new Error(`Unknown HP Colors mod variant: ${modVariant}`);
}

function includeBlock(tag, includes) {
  return [`\t<${tag}>`, ...includes.map((src) => `\t\t<include src="${src}" />`), `\t</${tag}>`].join("\n");
}

function replaceOrInsertBlock(xml, tag, block) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`);
  if (re.test(xml)) return xml.replace(re, block);
  if (!XML_INSERT_MARKER.test(xml)) throw new Error(`Could not find AnitaUI_Anchor in base_hud.xml`);
  return xml.replace(XML_INSERT_MARKER, `${block}\n$1`);
}

function prepareBaseHudXml(baseHudXml, modVariant) {
  let xml = String(baseHudXml ?? "");
  const styles = modVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? BASE_STYLE_INCLUDES : FULL_STYLE_INCLUDES;
  xml = replaceOrInsertBlock(xml, "styles", includeBlock("styles", styles));
  xml = replaceOrInsertBlock(xml, "scripts", includeBlock("scripts", CORE_SCRIPT_INCLUDES));
  return xml;
}

function normalizePackagePresets({ preset, presets }) {
  const sourcePresets = Array.isArray(presets) && presets.length > 0 ? presets : [preset || {}];
  if (sourcePresets.length > HP_COLORS_PACKAGE_LIMITS.MAX_PROFILES) throw new Error("HP Colors package must contain 1-128 profiles");
  return sourcePresets.map((item, index) => normalizeHpPresetPayload(item, { index }));
}

export function validateHpColorsBaseHudXml(baseHudXml, modVariant = DEFAULT_HP_COLORS_MOD_VARIANT) {
  const activeModVariant = normalizeModVariant(modVariant);
  const xml = String(baseHudXml ?? "");
  const styleIncludes = [...(xml.match(/<styles>[\s\S]*?<\/styles>/)?.[0] || "").matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
  const scriptIncludes = [...(xml.match(/<scripts>[\s\S]*?<\/scripts>/)?.[0] || "").matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
  const expectedStyles = activeModVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? BASE_STYLE_INCLUDES : FULL_STYLE_INCLUDES;
  if (JSON.stringify(styleIncludes) !== JSON.stringify(expectedStyles) || JSON.stringify(scriptIncludes) !== JSON.stringify(CORE_SCRIPT_INCLUDES)) throw new Error(`Invalid ${activeModVariant} HP Colors include contract`);
  validatePresetStoreXml(xml);
  return true;
}

export function createHpColorsPackagePlan({ sourceTexts, preset = null, presets = null, modVariant = DEFAULT_HP_COLORS_MOD_VARIANT }) {
  const activeModVariant = normalizeModVariant(modVariant);
  const activePresets = normalizePackagePresets({ preset, presets });
  const baseHudArtifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;
  const baseHudXml = readHpColorsArtifactSourceText(sourceTexts, baseHudArtifact);
  const modSpecificBaseHudXml = prepareBaseHudXml(baseHudXml, activeModVariant);
  const patchedBaseHudXml = writePresetStoreToBaseHudXml(modSpecificBaseHudXml, activePresets);
  validateHpColorsBaseHudXml(patchedBaseHudXml, activeModVariant);
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

export function validateHpColorsPackagePlan(plan) {
  if (!plan || !Array.isArray(plan.artifacts) || plan.artifacts.length !== HP_COLORS_PACKAGE_FILE_PATHS.length) throw new Error("HP Colors package plan must contain exactly base_hud.vxml_c");
  if (!Array.isArray(plan.presets) || plan.presets.length < 1 || plan.presets.length > HP_COLORS_PACKAGE_LIMITS.MAX_PROFILES) throw new Error("HP Colors package must contain 1-128 profiles");
  const artifact = plan.artifacts[0];
  if (artifact.id !== HP_COLORS_PACKAGE_ARTIFACTS.baseHud.id || artifact.archivePath !== HP_COLORS_PACKAGE_ARTIFACTS.baseHud.archivePath || artifact.codec !== HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec || typeof artifact.sourceText !== "string") throw new Error("Invalid HP Colors package artifact");
  validateHpColorsBaseHudXml(artifact.sourceText, plan.modVariant);
  return true;
}

export function buildHpColorsPackageFromPlan(plan) {
  validateHpColorsPackagePlan(plan);
  const files = plan.artifacts.map((artifact) => ({ path: artifact.archivePath, bytes: compileSource2Resource({ sourceText: artifact.sourceText, codec: artifact.codec }) }));
  validateHpColorsPackageFiles(files);
  const vpkBytes = writeVpkArchive(createVpkArchive(files));
  if (vpkBytes.byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_VPK_BYTES) throw new Error("HP Colors VPK exceeds 4 MiB limit");
  const archive = readVpkArchive(vpkBytes);
  validateHpColorsPackageFiles(archive.files);
  const extracted = extractSource2Resource({ bytes: archive.files[0].bytes, codec: HP_COLORS_PACKAGE_ARTIFACTS.baseHud.codec });
  validateHpColorsBaseHudXml(extracted, plan.modVariant);
  return {
    preset: plan.preset,
    presets: plan.presets,
    modVariant: plan.modVariant,
    manifest: { files: files.map((file, index) => ({
      id: plan.artifacts[index].id,
      sourcePath: plan.artifacts[index].sourcePath,
      archivePath: plan.artifacts[index].archivePath,
      codec: plan.artifacts[index].codec,
      byteLength: file.bytes.byteLength
    })) },
    vpkBytes
  };
}

export function buildHpColorsPackage(input) {
  return buildHpColorsPackageFromPlan(createHpColorsPackagePlan(input));
}
