import assert from "node:assert/strict";
import test from "node:test";

import { buildCommitUrl, createGitCommitInfo } from "../src/gitCommitInfo.js";

test("buildCommitUrl creates GitHub commit links from supported remote URLs", () => {
  const hash = "1234567890abcdef";

  assert.equal(
    buildCommitUrl("https://github.com/Hantu-Raya/hp-colors-preset-builder.git", hash),
    "https://github.com/Hantu-Raya/hp-colors-preset-builder/commit/1234567890abcdef"
  );
  assert.equal(
    buildCommitUrl("git@github.com:Hantu-Raya/hp-colors-preset-builder.git", hash),
    "https://github.com/Hantu-Raya/hp-colors-preset-builder/commit/1234567890abcdef"
  );
});

test("createGitCommitInfo exposes the short hash and commit URL", () => {
  const info = createGitCommitInfo({
    hash: "b1fd667e7fe467f7d8b352c7ad0607e6618c3a79",
    remoteUrl: "https://github.com/Hantu-Raya/hp-colors-preset-builder.git",
    subject: "Add minimal build target"
  });

  assert.equal(info.hash, "b1fd667e7fe467f7d8b352c7ad0607e6618c3a79");
  assert.equal(info.shortHash, "b1fd667e7fe4");
  assert.equal(info.url, "https://github.com/Hantu-Raya/hp-colors-preset-builder/commit/b1fd667e7fe467f7d8b352c7ad0607e6618c3a79");
  assert.equal(info.subject, "Add minimal build target");
  assert.equal(info.title, "Latest commit b1fd667e7fe4: Add minimal build target");
});

test("createGitCommitInfo shows the PR title and branch for GitHub merge commits", () => {
  const info = createGitCommitInfo({
    hash: "cac441a188dbb55f0fdf2c8bd742892e07b29cc7",
    remoteUrl: "https://github.com/Hantu-Raya/hp-colors-preset-builder.git",
    subject: "Merge pull request #2 from Hantu-Raya/codex/hp-colors-cleanup",
    body: [
      "Merge pull request #2 from Hantu-Raya/codex/hp-colors-cleanup",
      "",
      "Add target-aware VPK tools"
    ].join("\n")
  });

  assert.equal(info.subject, "Add target-aware VPK tools");
  assert.equal(info.branch, "codex/hp-colors-cleanup");
  assert.equal(info.title, "Latest update: Add target-aware VPK tools | Branch: codex/hp-colors-cleanup");
});

test("createGitCommitInfo links GitHub merge commits to the source branch commit", () => {
  const sourceHash = "a651848e3a3a9e0faec67dba4454e1ec63c62a24";
  const mergeHash = "cac441a188dbb55f0fdf2c8bd742892e07b29cc7";
  const info = createGitCommitInfo({
    hash: mergeHash,
    sourceHash,
    remoteUrl: "https://github.com/Hantu-Raya/hp-colors-preset-builder.git",
    subject: "Merge pull request #2 from Hantu-Raya/codex/hp-colors-cleanup",
    body: [
      "Merge pull request #2 from Hantu-Raya/codex/hp-colors-cleanup",
      "",
      "Add target-aware VPK tools"
    ].join("\n")
  });

  assert.equal(info.hash, sourceHash);
  assert.equal(info.mergeHash, mergeHash);
  assert.equal(info.shortHash, "a651848e3a3a");
  assert.equal(info.url, `https://github.com/Hantu-Raya/hp-colors-preset-builder/commit/${sourceHash}`);
});

test("createGitCommitInfo returns null when required git data is missing", () => {
  assert.equal(createGitCommitInfo({ hash: "", remoteUrl: "https://github.com/Hantu-Raya/hp-colors-preset-builder.git" }), null);
  assert.equal(createGitCommitInfo({ hash: "abc", remoteUrl: "" }), null);
});
