import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("browser build path uses the local VPK writer without DeadMod runtime fallback", async () => {
  const source = await readFile(new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url), "utf8");
  const workflowSource = await readFile(new URL("../src/presetBuilderWorkflow.js", import.meta.url), "utf8");
  const packageBuilderSource = await readFile(new URL("../src/packageBuilder.js", import.meta.url), "utf8");
  const forbidden = [
    "writeVpkWith" + "DeadMod",
    "deadMod" + "Packer",
    "vendor/" + "deadmod"
  ];

  assert.equal(source.includes("../vpkArchive.js"), false);
  assert.match(packageBuilderSource, /writeVpkArchive/);
  for (const marker of forbidden) {
    assert.equal(source.includes(marker), false, `Unexpected browser build marker in island: ${marker}`);
    assert.equal(workflowSource.includes(marker), false, `Unexpected browser build marker in workflow: ${marker}`);
  }
  assert.equal(source.includes("../packageBuilder.js"), false);
  assert.match(workflowSource, /packageBuilder\.js/);
});
