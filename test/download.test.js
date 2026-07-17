import assert from "node:assert/strict";
import test from "node:test";

import { copyText } from "../src/download.js";

function createDocument({ copied = true } = {}) {
  const appended = [];
  const area = {
    style: {},
    setAttribute() {},
    select() {},
    remove() { this.removed = true; }
  };
  return {
    area,
    appended,
    body: { appendChild(node) { appended.push(node); } },
    createElement(tagName) {
      assert.equal(tagName, "textarea");
      return area;
    },
    execCommand(command) {
      assert.equal(command, "copy");
      return copied;
    }
  };
}

test("copyText uses the Clipboard API when permission is available", async () => {
  const writes = [];
  const documentRef = createDocument();

  await copyText("profile-code", {
    clipboard: { writeText(value) { writes.push(value); } },
    documentRef
  });

  assert.deepEqual(writes, ["profile-code"]);
  assert.equal(documentRef.appended.length, 0);
});

test("copyText falls back when the Clipboard API rejects permission", async () => {
  const documentRef = createDocument();

  await copyText("profile-code", {
    clipboard: { writeText() { throw new Error("denied"); } },
    documentRef
  });

  assert.equal(documentRef.area.value, "profile-code");
  assert.equal(documentRef.appended.length, 1);
  assert.equal(documentRef.area.removed, true);
});

test("copyText reports failure when neither copy path succeeds", async () => {
  const documentRef = createDocument({ copied: false });

  await assert.rejects(
    copyText("profile-code", {
      clipboard: { writeText() { throw new Error("denied"); } },
      documentRef
    }),
    /Clipboard copy failed/
  );
});
