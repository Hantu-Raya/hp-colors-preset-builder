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
