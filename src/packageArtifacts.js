import { SOURCE2_RESOURCE_CODECS } from "./source2ResourceCodec.js";
import { normalizeVpkPath } from "./vpkArchive.js";

export const HP_COLORS_ARTIFACT_IDS = Object.freeze({ BASE_HUD: "baseHud" });
export const HP_COLORS_PACKAGE_FILE_PATHS = Object.freeze(["panorama/layout/base_hud.vxml_c"]);
export const HP_COLORS_PACKAGE_LIMITS = Object.freeze({
  MAX_PROFILES: 128,
  MAX_PROFILE_NAME_CHARS: 96,
  MAX_HEROES_PER_PROFILE: 128,
  MAX_ENCODED_PRESET_BYTES: 64 * 1024,
  MAX_XML_RESOURCE_BYTES: 2 * 1024 * 1024,
  MAX_VPK_BYTES: 4 * 1024 * 1024
});

export const HP_COLORS_PACKAGE_ARTIFACTS = Object.freeze({
  baseHud: Object.freeze({
    id: "baseHud",
    sourcePath: "public/templates/hp_colors/panorama/layout/base_hud.xml",
    legacySourcePaths: Object.freeze(["templates/hp_colors/panorama/layout/base_hud.xml"]),
    archivePath: "panorama/layout/base_hud.vxml_c",
    codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT
  })
});

const ARTIFACTS = Object.freeze(Object.values(HP_COLORS_PACKAGE_ARTIFACTS));

export function getHpColorsPackageArtifact(id) {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS[id];
  if (!artifact) throw new Error(`Unknown HP Colors package artifact: ${id}`);
  return artifact;
}

export function findHpColorsPackageArtifactBySourcePath(sourcePath) {
  const normalized = String(sourcePath || "");
  return ARTIFACTS.find((artifact) => artifact.sourcePath === normalized || artifact.legacySourcePaths.includes(normalized)) || null;
}

export function findHpColorsPackageArtifactByArchivePath(archivePath) {
  const normalized = String(archivePath || "");
  return ARTIFACTS.find((artifact) => artifact.archivePath === normalized) || null;
}

export function readHpColorsArtifactSourceText(sourceTexts, artifact) {
  if (sourceTexts && Object.prototype.hasOwnProperty.call(sourceTexts, artifact.sourcePath)) return sourceTexts[artifact.sourcePath];
  for (const sourcePath of artifact.legacySourcePaths) {
    if (sourceTexts && Object.prototype.hasOwnProperty.call(sourceTexts, sourcePath)) return sourceTexts[sourcePath];
  }
  throw new Error(`Missing source text: ${artifact.sourcePath}`);
}

export function validateHpColorsPackageFiles(files) {
  if (!Array.isArray(files) || files.length !== HP_COLORS_PACKAGE_FILE_PATHS.length) {
    throw new Error("HP Colors package must contain exactly base_hud.vxml_c");
  }
  const expected = new Set(HP_COLORS_PACKAGE_FILE_PATHS);
  for (const file of files) {
    const path = normalizeVpkPath(file?.path);
    if (!expected.has(path)) throw new Error(`Unexpected HP Colors package entry: ${path}`);
    if (!(file.bytes instanceof Uint8Array)) throw new Error(`Invalid bytes for HP Colors package entry: ${path}`);
  }
  if (new Set(files.map((file) => file.path.toLowerCase())).size !== files.length) throw new Error("Duplicate HP Colors package entry");
  return true;
}
