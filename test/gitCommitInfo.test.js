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

test("createGitCommitInfo returns null when required git data is missing", () => {
  assert.equal(createGitCommitInfo({ hash: "", remoteUrl: "https://github.com/Hantu-Raya/hp-colors-preset-builder.git" }), null);
  assert.equal(createGitCommitInfo({ hash: "abc", remoteUrl: "" }), null);
});
