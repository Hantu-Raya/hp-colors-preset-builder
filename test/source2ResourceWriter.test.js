import assert from "node:assert/strict";
import test from "node:test";

import { crc32 } from "../src/crc32.js";
import { compilePanoramaLayoutResource, compileTextResource } from "../src/source2ResourceWriter.js";

function fourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

test("compileTextResource writes a DATA-only Source 2 resource container", () => {
  const source = "(() => {\\n  \"use strict\";\\n})();\\n";
  const bytes = compileTextResource(source);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  assert.equal(view.getUint32(0, true), bytes.byteLength);
  assert.equal(view.getUint16(4, true), 12);
  assert.equal(view.getUint16(6, true), 0);
  assert.equal(view.getUint32(8, true), 8);
  assert.equal(view.getUint32(12, true), 1);
  assert.equal(fourCc(bytes, 16), "DATA");

  const dataOffsetField = 20;
  const dataOffset = dataOffsetField + view.getUint32(dataOffsetField, true);
  const dataSize = view.getUint32(24, true);

  assert.equal(dataOffset % 16, 0);
  assert.equal(dataSize, new TextEncoder().encode(source).byteLength);
  assert.equal(new TextDecoder().decode(bytes.slice(dataOffset, dataOffset + dataSize)), source);
});

test("compilePanoramaLayoutResource writes the Panorama layout DATA payload wrapper", () => {
  const source = "<root><Panel id=\"Hud\" /></root>";
  const sourceBytes = new TextEncoder().encode(source);
  const bytes = compilePanoramaLayoutResource(source);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  assert.equal(view.getUint32(0, true), bytes.byteLength);
  assert.equal(view.getUint16(4, true), 12);
  assert.equal(view.getUint16(6, true), 0);
  assert.equal(view.getUint32(8, true), 8);
  assert.equal(view.getUint32(12, true), 1);
  assert.equal(fourCc(bytes, 16), "DATA");

  const dataOffsetField = 20;
  const dataOffset = dataOffsetField + view.getUint32(dataOffsetField, true);
  const dataSize = view.getUint32(24, true);

  assert.equal(dataOffset % 16, 0);
  assert.equal(dataSize, 6 + sourceBytes.byteLength);
  assert.equal(view.getUint32(dataOffset, true), crc32(sourceBytes));
  assert.equal(view.getUint16(dataOffset + 4, true), 0);
  assert.equal(new TextDecoder().decode(bytes.slice(dataOffset + 6, dataOffset + dataSize)), source);
});
