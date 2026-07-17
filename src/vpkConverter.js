import { DEFAULT_HP_COLORS_MOD_VARIANT, buildHpColorsPackage } from "./packageBuilder.js";
import { parseHpColorsPresetStorePayload } from "./hpImportCode.js";
import {
  HP_COLORS_PACKAGE_ARTIFACTS,
  validateHpColorsPackageFiles
} from "./packageArtifacts.js";
import { readPresetStoreFromBaseHudXml } from "./presetStoreXml.js";
import { extractSource2Resource } from "./source2ResourceCodec.js";
import { findVpkArchiveFile, readVpkArchive } from "./vpkArchive.js";

export function convertHpColorsPresetVpk({ vpkBytes, baseHudXml, targetModVariant }) {
  const baseHudArtifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;
  const archive = readVpkArchive(vpkBytes);
  validateHpColorsPackageFiles(archive.files);
  const baseHud = findVpkArchiveFile(archive, baseHudArtifact.archivePath);
  if (!baseHud) throw new Error("This VPK does not contain the HP Colors base_hud override");
  const sourceBaseHudXml = extractSource2Resource({ bytes: baseHud.bytes, codec: baseHudArtifact.codec });
  const presets = readPresetStoreFromBaseHudXml(sourceBaseHudXml).map(parseHpColorsPresetStorePayload);
  return buildHpColorsPackage({
    sourceTexts: { [baseHudArtifact.sourcePath]: baseHudXml },
    presets,
    modVariant: targetModVariant || DEFAULT_HP_COLORS_MOD_VARIANT
  });
}
