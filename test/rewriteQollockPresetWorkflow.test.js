import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { createInitialProfile } from "../src/profileStore.js";
import {
  createRewriteQollockPresetTemplateLoader,
  runRewriteQollockPresetBuildWorkflow
} from "../src/presetBuilderWorkflow.js";
import {
  readRewriteQollockPresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_QOLLOCK_PRESET_TEMPLATE_PATH
} from "../src/rewritePackageBuilder.js";
import { readVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_PATH = new URL(
  "../public/templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml",
  import.meta.url
);

function makeTemplate() {
  return readFileSync(TEMPLATE_PATH, "utf8");
}

test("Rewrite QOLLOCK template loader caches and uses the dedicated template path", async () => {
  const template = makeTemplate();
  let calls = 0;
  const loader = createRewriteQollockPresetTemplateLoader({
    baseUrl: "/builder/",
    fetchImpl: async (url) => {
      calls += 1;
      assert.equal(url, `/builder/${REWRITE_QOLLOCK_PRESET_TEMPLATE_PATH}`);
      return { ok: true, text: async () => template };
    }
  });
  const [first, second] = await Promise.all([loader(), loader()]);
  assert.equal(calls, 1);
  assert.equal(first, template);
  assert.equal(second, template);
});

test("Rewrite QOLLOCK build workflow downloads fixed pak01 with one layout file", async () => {
  const profile = createInitialProfile(HP_FIELD_CATALOG.createDefaultState());
  profile.name = "QOLLOCK workflow preset";
  const downloads = [];
  const dispatched = [];
  const result = await runRewriteQollockPresetBuildWorkflow({
    profiles: [profile],
    activeProfileId: profile.id,
    loadRewriteQollockPresetTemplate: async () => makeTemplate(),
    download: async (filename, bytes) => downloads.push({ filename, bytes }),
    digest: async () => "qollock-sha256",
    dispatch: (intent) => dispatched.push(intent)
  });

  assert.equal(result.filename, "pak01_dir.vpk");
  assert.equal(result.target, "hp_colors_rewrite_qollock");
  assert.equal(result.targetLabel, "hp_colors_rewrite_qollock");
  assert.equal(result.sha256, "qollock-sha256");
  assert.deepEqual(downloads.map((download) => download.filename), ["pak01_dir.vpk"]);
  const archive = readVpkArchive(downloads[0].bytes);
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.ok(readRewriteQollockPresetCode(archive.files[0].bytes).startsWith("HPCRP1"));
  assert.match(dispatched.at(-1).status, /^Built pak01_dir\.vpk for hp_colors_rewrite_qollock/);
});
