import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  DEFAULT_HP_COLORS_MOD_VARIANT,
  buildHpColorsPackage
} from "../src/packageBuilder.js";
import {
  HP_COLORS_PACKAGE_ARTIFACTS,
  validateHpColorsPackageFiles
} from "../src/packageArtifacts.js";
import {
  HP_FULL_ONLY_EXCLUDED_FIELD_IDS,
  HP_PRESET_FIELD_COUNT,
  HP_PRESET_FIELD_IDS,
  HP_PRESET_PAYLOAD_VERSION
} from "../src/contracts/hpColorsPresetContract.js";
import { createInitialProfile } from "../src/profileStore.js";
import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { validatePresetStoreXml } from "../src/presetStoreXml.js";
import { extractSource2Resource } from "../src/source2ResourceCodec.js";
import { buildPresetVpkFileName } from "../src/presetVpkFileName.js";
import { readVpkArchive } from "../src/vpkArchive.js";

const OUTPUT_FILENAME = "pak96_dir.vpk";
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const BASE_HUD_ARTIFACT = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;

function includeSources(xml, section) {
  const sectionXml = xml.match(new RegExp(`<${section}>[\\s\\S]*?<\\/${section}>`))?.[0] || "";
  return [...sectionXml.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
}

function assertMinimalIncludes(xml) {
  assert.deepEqual(includeSources(xml, "styles"), [
    "s2r://panorama/styles/base.vcss_c",
    "s2r://panorama/styles/citadel_base_styles.vcss_c"
  ]);
  assert.deepEqual(includeSources(xml, "scripts"), [
    "s2r://panorama/scripts/anita_ui_core.vjs_c"
  ]);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/styles\/anita_ui\.vcss_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/anita_persist_loader\.vjs_c/);
  assert.doesNotMatch(xml, /s2r:\/\/panorama\/scripts\/hp_registrar\.vjs_c/);
}

function inspectPackage(result) {
  assert.ok(result.vpkBytes instanceof Uint8Array, "builder must return VPK bytes");
  assert.equal(result.modVariant, DEFAULT_HP_COLORS_MOD_VARIANT);

  const archive = readVpkArchive(result.vpkBytes);
  validateHpColorsPackageFiles(archive.files);
  assert.equal(archive.files.length, 1);
  assert.deepEqual(archive.files.map((file) => file.path), [BASE_HUD_ARTIFACT.archivePath]);

  const [entry] = archive.files;
  const baseHudXml = extractSource2Resource({ bytes: entry.bytes, codec: BASE_HUD_ARTIFACT.codec });
  assertMinimalIncludes(baseHudXml);
  assert.equal((baseHudXml.match(/<Panel\s+id="HPColorsPresetStore"/g) || []).length, 1);

  const profiles = validatePresetStoreXml(baseHudXml);
  assert.equal(profiles.length, 1);
  const [profile] = profiles;
  assert.equal(profile.version, HP_PRESET_PAYLOAD_VERSION);
  assert.equal(Object.keys(profile.values).length, 55);
  assert.equal(HP_PRESET_FIELD_COUNT, 55);
  assert.deepEqual(Object.keys(profile.values), HP_PRESET_FIELD_IDS);
  assert.equal(profile.heroMode, "all");
  assert.deepEqual(profile.heroes, []);
  for (const fieldId of HP_FULL_ONLY_EXCLUDED_FIELD_IDS) {
    assert.equal(Object.hasOwn(profile.values, fieldId), false, `full-only field present: ${fieldId}`);
  }

  return { archive, baseHudXml, profiles };
}

async function main() {
  assert.equal(buildPresetVpkFileName(), OUTPUT_FILENAME);

  const sourceText = await readFile(path.resolve(REPOSITORY_ROOT, BASE_HUD_ARTIFACT.sourcePath), "utf8");
  const sourceTexts = { [BASE_HUD_ARTIFACT.sourcePath]: sourceText };
  const defaultProfile = createInitialProfile(HP_FIELD_CATALOG.createDefaultState());
  const input = { sourceTexts, preset: defaultProfile };

  const first = buildHpColorsPackage(input);
  const second = buildHpColorsPackage(input);
  assert.equal(Buffer.compare(Buffer.from(first.vpkBytes), Buffer.from(second.vpkBytes)), 0, "generated VPK bytes are not deterministic");

  inspectPackage(first);
  inspectPackage(second);
  console.log(`Verified ${OUTPUT_FILENAME}: deterministic, one validated minimal artifact, one global v1 profile with 55 fields.`);
}

main().catch((error) => {
  console.error(`Generated artifact verification failed: ${error?.stack || error}`);
  process.exitCode = 1;
});
