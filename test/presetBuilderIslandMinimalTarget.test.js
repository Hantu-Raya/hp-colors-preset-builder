import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const islandUrl = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);

test("minimal target keeps the profile and hero selection controls visible", async () => {
  const source = await readFile(islandUrl, "utf8");

  assert.doesNotMatch(source, /\{fullTargetMode\s*\?\s*\(\s*<div className="topbar-profile-controls"/);
  assert.doesNotMatch(source, /\{fullTargetMode\s*\?\s*\(\s*<div className="hero-selector"/);
});

test("minimal target no longer tells users that bundles use only the first preset", async () => {
  const source = await readFile(islandUrl, "utf8");

  assert.doesNotMatch(source, /first preset for minimal mode/i);
  assert.doesNotMatch(source, /COPY ALL bundles use the first preset only/i);
  assert.doesNotMatch(source, /1 minimal preset/i);
});

test("island delegates async preset workflows to presetBuilderWorkflow", async () => {
  const source = await readFile(islandUrl, "utf8");

  assert.match(source, /presetBuilderWorkflow\.js/);
  assert.equal(source.includes("saveTargetModeState"), false);
  assert.equal(source.includes("await import('../hpImportCode.js')"), false);
  assert.equal(source.includes("await import('../packageBuilder.js')"), false);
  assert.equal(source.includes("await import('../vpkConverter.js')"), false);
  assert.equal(source.includes("buildConvertedVpkFileName"), false);
  assert.equal(source.includes("downloadBytes"), false);
});
