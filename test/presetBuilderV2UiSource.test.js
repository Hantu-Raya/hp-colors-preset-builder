import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const v1IslandPath = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);
const v2IslandPath = new URL("../src/components/PresetBuilderV2Island.jsx", import.meta.url);
const v2TreePath = new URL("../src/components/schema-tree-v2.jsx", import.meta.url);
const v2PagePath = new URL("../src/pages/v2.astro", import.meta.url);

test("v1 and v2 link to separate GitHub Pages routes", async () => {
  const [v1Island, v2Island, v2Page] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(v2PagePath, "utf8")
  ]);

  for (const island of [v1Island, v2Island]) {
    assert.match(island, />\s*V1 original\s*</);
    assert.match(island, /import\.meta\.env\.BASE_URL\}v2\//);
    assert.match(island, />\s*V2 game menu\s*</);
  }
  assert.match(v2Page, /PresetBuilderV2Island/);
  assert.match(v2Page, /styles\/v2\.css/);
  assert.match(v2Page, /<title>HP Colors Preset Builder V2<\/title>/);
});

test("v2 owns the in-game menu navigation without changing v1", async () => {
  const [v1Island, v2Island, v2Tree] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8"),
    readFile(v2TreePath, "utf8")
  ]);

  assert.match(v1Island, /HP_FIELD_CATALOG\.splitCategoryGroups\(\)/);
  assert.doesNotMatch(v1Island, /createHpMenuGroups/);
  assert.match(v2Island, /createHpMenuGroups\(HP_FIELD_CATALOG\.schema\)/);
  assert.match(v2Island, /currentGroup\?\.pageId === 'health-pips-levels'/);
  assert.match(v2Tree, /export function SchemaTabs/);
  assert.match(v2Tree, /aria-label="HP Colors sections"/);
});

test("rewrite transfer and preset actions stay isolated to v2", async () => {
  const [v1Island, v2Island] = await Promise.all([
    readFile(v1IslandPath, "utf8"),
    readFile(v2IslandPath, "utf8")
  ]);

  assert.doesNotMatch(v1Island, /rewritePresetCodec|HPCRP1|Copy rewrite preset/);
  assert.match(v2Island, /decodeRewriteTransfer/);
  assert.match(v2Island, /createRewriteSettingsCode/);
  assert.match(v2Island, /createRewritePresetCode/);
  assert.match(v2Island, /createRewritePresetBundle/);
  assert.match(v2Island, />\s*Add preset\s*</);
  assert.match(v2Island, />\s*Remove selected\s*</);
  assert.match(v2Island, /Paste an HPCRP1 preset or bundle/);
});
