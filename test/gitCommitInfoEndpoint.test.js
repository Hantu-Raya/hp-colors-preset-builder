import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/pages/commit-info.json.js";

test("commit info endpoint returns uncached JSON metadata", async () => {
  const response = GET();
  const payload = await response.json();

  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0, must-revalidate");
  assert.equal(typeof payload.shortHash, "string");
  assert.equal(typeof payload.url, "string");
});
