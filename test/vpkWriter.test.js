import assert from "node:assert/strict";
import test from "node:test";

import { crc32 } from "../src/crc32.js";
import { writeVpk } from "../src/vpkWriter.js";

function readCString(bytes, pos) {
  let end = pos;
  while (end < bytes.length && bytes[end] !== 0) end += 1;
  return { value: new TextDecoder().decode(bytes.slice(pos, end)), next: end + 1 };
}

function parseFirstEntry(bytes) {
  let pos = 28;
  const ext = readCString(bytes, pos); pos = ext.next;
  const dir = readCString(bytes, pos); pos = dir.next;
  const name = readCString(bytes, pos); pos = name.next;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    ext: ext.value,
    dir: dir.value,
    name: name.value,
    crc: view.getUint32(pos, true),
    preloadBytes: view.getUint16(pos + 4, true),
    archiveIndex: view.getUint16(pos + 6, true),
    entryOffset: view.getUint32(pos + 8, true),
    entryLength: view.getUint32(pos + 12, true),
    terminator: view.getUint16(pos + 16, true)
  };
}

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("writeVpk writes a single-file VPK v2 with embedded file data", () => {
  const payload = new TextEncoder().encode("demo");
  const bytes = writeVpk([{ path: "panorama/scripts/demo.vjs_c", bytes: payload }]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  assert.equal(view.getUint32(0, true), 0x55aa1234);
  assert.equal(view.getUint32(4, true), 2);
  assert.equal(view.getUint32(12, true), payload.byteLength);

  const entry = parseFirstEntry(bytes);
  assert.deepEqual(entry, {
    ext: "vjs_c",
    dir: "panorama/scripts",
    name: "demo",
    crc: crc32(payload),
    preloadBytes: 0,
    archiveIndex: 0x7fff,
    entryOffset: 0,
    entryLength: payload.byteLength,
    terminator: 0xffff
  });

  const treeSize = view.getUint32(8, true);
  const dataStart = 28 + treeSize;
  assert.deepEqual(Array.from(bytes.slice(dataStart, dataStart + payload.byteLength)), Array.from(payload));
});
