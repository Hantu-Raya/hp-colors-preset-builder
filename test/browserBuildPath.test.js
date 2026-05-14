import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("browser build path uses the local VPK writer without DeadMod runtime fallback", async () => {
  const source = await readFile(new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url), "utf8");
  const forbidden = [
    "writeVpkWith" + "DeadMod",
    "deadMod" + "Packer",
    "vendor/" + "deadmod"
  ];

  assert.match(source, /writeVpk/);
  for (const marker of forbidden) {
    assert.equal(source.includes(marker), false, `Unexpected browser build marker: ${marker}`);
  }
});
