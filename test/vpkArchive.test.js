import assert from "node:assert/strict";
import test from "node:test";

import { crc32 } from "../src/crc32.js";
import {
  createVpkArchive,
  findVpkArchiveFile,
  readVpkArchive,
  writeVpkArchive
} from "../src/vpkArchive.js";

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

test("writeVpkArchive writes a single-file VPK v2 with embedded file data", () => {
  const payload = new TextEncoder().encode("demo");
  const bytes = writeVpkArchive({ files: [{ path: "panorama/scripts/demo.vjs_c", bytes: payload }] });
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

test("VPK archive round-trips multiple files", () => {
  const files = [
    { path: "panorama/scripts/demo.vjs_c", bytes: new TextEncoder().encode("script") },
    { path: "panorama/layout/base_hud.vxml_c", bytes: new TextEncoder().encode("layout") }
  ];

  const archive = readVpkArchive(writeVpkArchive(createVpkArchive(files)));

  assert.equal(archive.version, 2);
  assert.deepEqual(archive.files.map((file) => file.path).sort(), files.map((file) => file.path).sort());
  assert.equal(new TextDecoder().decode(findVpkArchiveFile(archive, "panorama/scripts/demo.vjs_c").bytes), "script");
  assert.equal(new TextDecoder().decode(findVpkArchiveFile(archive, "panorama/layout/base_hud.vxml_c").bytes), "layout");
});

test("findVpkArchiveFile returns entries by path or null", () => {
  const archive = createVpkArchive([{ path: "demo.txt", bytes: new TextEncoder().encode("demo") }]);

  assert.equal(findVpkArchiveFile(archive, "demo.txt")?.path, "demo.txt");
  assert.equal(findVpkArchiveFile(archive, "missing.txt"), null);
});

test("readVpkArchive rejects invalid magic and unsupported version", () => {
  assert.throws(() => readVpkArchive(new Uint8Array([1, 2, 3])), /Invalid VPK file/);

  const bytes = writeVpkArchive({ files: [{ path: "demo.txt", bytes: new Uint8Array([1]) }] });
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(4, 3, true);
  assert.throws(() => readVpkArchive(bytes), /Unsupported VPK version/);
});

test("VPK output is deterministic regardless of input file order", () => {
  const files = [
    { path: "z/data.txt", bytes: new Uint8Array([3]) },
    { path: "a/data.txt", bytes: new Uint8Array([1]) },
    { path: "m/data.txt", bytes: new Uint8Array([2]) }
  ];
  assert.deepEqual(
    Array.from(writeVpkArchive(createVpkArchive(files))),
    Array.from(writeVpkArchive(createVpkArchive([...files].reverse())))
  );
});

test("VPK reader rejects CRC corruption, trailing bytes, and duplicate paths", () => {
  const bytes = writeVpkArchive({ files: [{ path: "demo.txt", bytes: new Uint8Array([1, 2, 3]) }] });
  const corrupt = bytes.slice();
  corrupt[corrupt.length - 1] ^= 0xff;
  assert.throws(() => readVpkArchive(corrupt), /CRC mismatch/);
  assert.throws(() => readVpkArchive(new Uint8Array([...bytes, 0])), /bounds/);
  assert.throws(() => createVpkArchive([
    { path: "demo.txt", bytes: new Uint8Array([1]) },
    { path: "DEMO.TXT", bytes: new Uint8Array([2]) }
  ]), /Duplicate VPK path/);
});

test("VPK writer rejects non-canonical paths", () => {
  assert.throws(() => createVpkArchive([{ path: "../demo.txt", bytes: new Uint8Array([1]) }]), /Invalid VPK path/);
  assert.throws(() => createVpkArchive([{ path: "/demo.txt", bytes: new Uint8Array([1]) }]), /Invalid VPK path/);
  assert.throws(() => createVpkArchive([{ path: "demo\\demo.txt", bytes: new Uint8Array([1]) }]), /Invalid VPK path/);
});
