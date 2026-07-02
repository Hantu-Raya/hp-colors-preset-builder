import assert from "node:assert/strict";
import test from "node:test";

import { crc32 } from "../src/crc32.js";
import {
  SOURCE2_RESOURCE_CODECS,
  compileSource2Resource,
  extractSource2Resource
} from "../src/source2ResourceCodec.js";

function fourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function dataRange(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataOffsetField = 20;
  const dataOffset = dataOffsetField + view.getUint32(dataOffsetField, true);
  const dataSize = view.getUint32(24, true);
  return { view, dataOffset, dataSize };
}

test("compileSource2Resource text writes a DATA-only Source 2 resource container", () => {
  const source = "(() => {\n  \"use strict\";\n})();\n";
  const bytes = compileSource2Resource({ sourceText: source, codec: SOURCE2_RESOURCE_CODECS.TEXT });
  const { view, dataOffset, dataSize } = dataRange(bytes);

  assert.equal(view.getUint32(0, true), bytes.byteLength);
  assert.equal(view.getUint16(4, true), 12);
  assert.equal(view.getUint16(6, true), 0);
  assert.equal(view.getUint32(8, true), 8);
  assert.equal(view.getUint32(12, true), 1);
  assert.equal(fourCc(bytes, 16), "DATA");
  assert.equal(dataOffset % 16, 0);
  assert.equal(dataSize, new TextEncoder().encode(source).byteLength);
  assert.equal(new TextDecoder().decode(bytes.slice(dataOffset, dataOffset + dataSize)), source);
});

test("compileSource2Resource panorama layout writes the CRC wrapper", () => {
  const source = "<root><Panel id=\"Hud\" /></root>";
  const sourceBytes = new TextEncoder().encode(source);
  const bytes = compileSource2Resource({ sourceText: source, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const { view, dataOffset, dataSize } = dataRange(bytes);

  assert.equal(view.getUint32(0, true), bytes.byteLength);
  assert.equal(view.getUint16(4, true), 12);
  assert.equal(view.getUint16(6, true), 0);
  assert.equal(view.getUint32(8, true), 8);
  assert.equal(view.getUint32(12, true), 1);
  assert.equal(fourCc(bytes, 16), "DATA");
  assert.equal(dataOffset % 16, 0);
  assert.equal(dataSize, 6 + sourceBytes.byteLength);
  assert.equal(view.getUint32(dataOffset, true), crc32(sourceBytes));
  assert.equal(view.getUint16(dataOffset + 4, true), 0);
  assert.equal(new TextDecoder().decode(bytes.slice(dataOffset + 6, dataOffset + dataSize)), source);
});

test("extractSource2Resource text round-trips original text", () => {
  const source = "console.log('ok');\n";
  const bytes = compileSource2Resource({ sourceText: source, codec: SOURCE2_RESOURCE_CODECS.TEXT });

  assert.equal(extractSource2Resource({ bytes, codec: SOURCE2_RESOURCE_CODECS.TEXT }), source);
});

test("extractSource2Resource panorama layout round-trips original XML", () => {
  const source = "<root><Panel id=\"Hud\" /></root>";
  const bytes = compileSource2Resource({ sourceText: source, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });

  assert.equal(extractSource2Resource({ bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT }), source);
});

test("compileSource2Resource and extractSource2Resource reject unknown codecs", () => {
  assert.throws(
    () => compileSource2Resource({ sourceText: "", codec: "unknown" }),
    { message: "Unknown Source 2 resource codec: unknown" }
  );
  assert.throws(
    () => extractSource2Resource({ bytes: new Uint8Array(), codec: "unknown" }),
    { message: "Unknown Source 2 resource codec: unknown" }
  );
});

test("extractSource2Resource rejects panorama DATA payloads shorter than the wrapper", () => {
  const bytes = compileSource2Resource({ sourceText: "abc", codec: SOURCE2_RESOURCE_CODECS.TEXT });

  assert.throws(
    () => extractSource2Resource({ bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT }),
    /Invalid Panorama layout resource/
  );
});
