import assert from "node:assert/strict";
import test from "node:test";

import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from "../src/gitCommitInfoRefresh.js";

test("buildGitCommitInfoRequestUrl adds a cache-busted commit info endpoint under the app base", () => {
  assert.equal(
    buildGitCommitInfoRequestUrl("/hp-colors-preset-builder/", 926),
    "/hp-colors-preset-builder/commit-info.json?v=926"
  );
  assert.equal(
    buildGitCommitInfoRequestUrl("/hp-colors-preset-builder", "new commit"),
    "/hp-colors-preset-builder/commit-info.json?v=new%20commit"
  );
});

test("isGitCommitInfoPayload accepts only usable commit link payloads", () => {
  assert.equal(isGitCommitInfoPayload({ url: "https://example.test/commit/abc", shortHash: "abc123" }), true);
  assert.equal(isGitCommitInfoPayload({ url: "", shortHash: "abc123" }), false);
  assert.equal(isGitCommitInfoPayload({ url: "https://example.test/commit/abc", shortHash: "" }), false);
  assert.equal(isGitCommitInfoPayload(null), false);
});
