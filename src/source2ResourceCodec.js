import { crc32 } from "./crc32.js";

export const SOURCE2_RESOURCE_CODECS = Object.freeze({
  TEXT: "text",
  PANORAMA_LAYOUT: "panoramaLayout"
});

const HEADER_SIZE = 16;
const BLOCK_ENTRY_SIZE = 12;
const DATA_ALIGNMENT = 16;

function align(value, boundary) {
  return Math.ceil(value / boundary) * boundary;
}

function writeFourCc(bytes, offset, value) {
  for (let i = 0; i < 4; i += 1) {
    bytes[offset + i] = value.charCodeAt(i);
  }
}

function readFourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function asBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function compileDataResource(sourceBytes) {
  const dataOffset = align(HEADER_SIZE + BLOCK_ENTRY_SIZE, DATA_ALIGNMENT);
  const fileSize = dataOffset + sourceBytes.byteLength;
  const bytes = new Uint8Array(fileSize);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, fileSize, true);
  view.setUint16(4, 12, true);
  view.setUint16(6, 0, true);
  view.setUint32(8, 8, true);
  view.setUint32(12, 1, true);

  writeFourCc(bytes, 16, "DATA");
  view.setUint32(20, dataOffset - 20, true);
  view.setUint32(24, sourceBytes.byteLength, true);
  bytes.set(sourceBytes, dataOffset);

  return bytes;
}

function readDataBlock(input) {
  const bytes = asBytes(input);
  if (bytes.byteLength < HEADER_SIZE + BLOCK_ENTRY_SIZE) throw new Error("Invalid Source 2 resource");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fileSize = view.getUint32(0, true);
  const blockCount = view.getUint32(12, true);
  if (fileSize !== bytes.byteLength || blockCount < 1) throw new Error("Invalid Source 2 resource");

  for (let index = 0; index < blockCount; index += 1) {
    const entryOffset = HEADER_SIZE + (index * BLOCK_ENTRY_SIZE);
    if (entryOffset + BLOCK_ENTRY_SIZE > bytes.byteLength) throw new Error("Invalid Source 2 resource");
    if (readFourCc(bytes, entryOffset) !== "DATA") continue;
    const dataOffset = (entryOffset + 4) + view.getUint32(entryOffset + 4, true);
    const dataLength = view.getUint32(entryOffset + 8, true);
    if (dataOffset < 0 || dataOffset + dataLength > bytes.byteLength) throw new Error("Invalid Source 2 DATA block");
    return bytes.slice(dataOffset, dataOffset + dataLength);
  }

  throw new Error("Missing Source 2 DATA block");
}

function unknownCodec(codec) {
  throw new Error(`Unknown Source 2 resource codec: ${codec}`);
}

export function compileSource2Resource({ sourceText, codec }) {
  if (codec === SOURCE2_RESOURCE_CODECS.TEXT) {
    return compileDataResource(new TextEncoder().encode(String(sourceText ?? "")));
  }
  if (codec === SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT) {
    const sourceBytes = new TextEncoder().encode(String(sourceText ?? ""));
    const payload = new Uint8Array(6 + sourceBytes.byteLength);
    const view = new DataView(payload.buffer);
    view.setUint32(0, crc32(sourceBytes), true);
    view.setUint16(4, 0, true);
    payload.set(sourceBytes, 6);
    return compileDataResource(payload);
  }
  unknownCodec(codec);
}

export function extractSource2Resource({ bytes, codec }) {
  if (codec === SOURCE2_RESOURCE_CODECS.TEXT) {
    return new TextDecoder().decode(readDataBlock(bytes));
  }
  if (codec === SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT) {
    const data = readDataBlock(bytes);
    if (data.byteLength < 6) throw new Error("Invalid Panorama layout resource");
    return new TextDecoder().decode(data.slice(6));
  }
  unknownCodec(codec);
}
