import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { createInitialProfile } from "../src/profileStore.js";
import {
  createRewritePresetTemplateLoader,
  runRewritePresetBuildWorkflow
} from "../src/presetBuilderWorkflow.js";
import {
  readRewritePresetCode,
  REWRITE_PRESET_ARCHIVE_PATH,
  REWRITE_PRESET_TEMPLATE_PATH
} from "../src/rewritePackageBuilder.js";
import { readVpkArchive } from "../src/vpkArchive.js";

const TEMPLATE_PATH = new URL(
  "../public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml",
  import.meta.url
);

function makeTemplate() {
  return readFileSync(TEMPLATE_PATH, "utf8");
}

test("rewrite template loader caches successful XML text and retries failed fetches", async () => {
  const template = makeTemplate();
  let calls = 0;
  const loader = createRewritePresetTemplateLoader({
    baseUrl: "/builder/",
    fetchImpl: async (url) => {
      calls += 1;
      assert.equal(url, `/builder/${REWRITE_PRESET_TEMPLATE_PATH}`);
      return { ok: true, text: async () => template };
    }
  });
  const [first, second] = await Promise.all([loader(), loader()]);
  assert.equal(calls, 1);
  assert.equal(first, template);
  assert.equal(second, template);

  let failures = 0;
  const failingLoader = createRewritePresetTemplateLoader({
    fetchImpl: async () => {
      failures += 1;
      if (failures === 1) return { ok: false, status: 503, text: async () => "" };
      return { ok: true, text: async () => template };
    }
  });
  await assert.rejects(() => failingLoader(), { message: "Failed to load rewrite preset template (503)" });
  assert.equal(await failingLoader(), template);
});

test("rewrite build workflow creates and downloads XML-only pak01 with success hash/status", async () => {
  const template = makeTemplate();
  const profile = createInitialProfile(HP_FIELD_CATALOG.createDefaultState());
  profile.name = "Workflow \"preset\"";
  const dispatched = [];
  const downloads = [];
  const result = await runRewritePresetBuildWorkflow({
    profiles: [profile],
    activeProfileId: profile.id,
    loadRewritePresetTemplate: async () => template,
    download: async (filename, bytes) => downloads.push({ filename, bytes }),
    digest: async () => "rewrite-sha256",
    dispatch: (intent) => dispatched.push(intent)
  });
  assert.equal(result.filename, "pak01_dir.vpk");
  assert.equal(result.targetLabel, "hp_colors_rewrite");
  assert.equal(result.sha256, "rewrite-sha256");
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "pak01_dir.vpk");
  const archive = readVpkArchive(downloads[0].bytes);
  assert.deepEqual(archive.files.map((file) => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  assert.ok(readRewritePresetCode(archive.files[0].bytes).startsWith("HPCRP1"));
  assert.match(dispatched.at(-1).status, /^Built pak01_dir\.vpk for hp_colors_rewrite/);
});
