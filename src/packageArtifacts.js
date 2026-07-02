import { SOURCE2_RESOURCE_CODECS } from "./source2ResourceCodec.js";

export const HP_COLORS_ARTIFACT_IDS = Object.freeze({ BASE_HUD: "baseHud" });

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
  if (sourceTexts && Object.prototype.hasOwnProperty.call(sourceTexts, artifact.sourcePath)) {
    return sourceTexts[artifact.sourcePath];
  }
  for (const sourcePath of artifact.legacySourcePaths) {
    if (sourceTexts && Object.prototype.hasOwnProperty.call(sourceTexts, sourcePath)) {
      return sourceTexts[sourcePath];
    }
  }
  throw new Error(`Missing source text: ${artifact.sourcePath}`);
}
