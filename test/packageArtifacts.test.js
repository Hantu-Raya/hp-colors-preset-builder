import assert from "node:assert/strict";
import test from "node:test";

import {
  HP_COLORS_PACKAGE_ARTIFACTS,
  findHpColorsPackageArtifactByArchivePath,
  getHpColorsPackageArtifact,
  readHpColorsArtifactSourceText
} from "../src/packageArtifacts.js";
import { SOURCE2_RESOURCE_CODECS } from "../src/source2ResourceCodec.js";

test("base HUD artifact records source, legacy, archive, and codec identity", () => {
  const artifact = getHpColorsPackageArtifact("baseHud");

  assert.equal(artifact.id, "baseHud");
  assert.equal(artifact.sourcePath, "public/templates/hp_colors/panorama/layout/base_hud.xml");
  assert.deepEqual(artifact.legacySourcePaths, ["templates/hp_colors/panorama/layout/base_hud.xml"]);
  assert.equal(artifact.archivePath, "panorama/layout/base_hud.vxml_c");
  assert.equal(artifact.codec, SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT);
});

test("readHpColorsArtifactSourceText prefers canonical source text over legacy text", () => {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;

  assert.equal(readHpColorsArtifactSourceText({
    [artifact.sourcePath]: "canonical",
    [artifact.legacySourcePaths[0]]: "legacy"
  }, artifact), "canonical");
});

test("readHpColorsArtifactSourceText accepts the legacy template source path", () => {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;

  assert.equal(readHpColorsArtifactSourceText({
    [artifact.legacySourcePaths[0]]: "legacy"
  }, artifact), "legacy");
});

test("readHpColorsArtifactSourceText throws the canonical missing-source error", () => {
  const artifact = HP_COLORS_PACKAGE_ARTIFACTS.baseHud;

  assert.throws(
    () => readHpColorsArtifactSourceText({}, artifact),
    { message: "Missing source text: public/templates/hp_colors/panorama/layout/base_hud.xml" }
  );
});

test("findHpColorsPackageArtifactByArchivePath returns the base HUD artifact", () => {
  assert.equal(
    findHpColorsPackageArtifactByArchivePath("panorama/layout/base_hud.vxml_c"),
    HP_COLORS_PACKAGE_ARTIFACTS.baseHud
  );
});
