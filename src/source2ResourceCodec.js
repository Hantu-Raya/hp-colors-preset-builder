import { crc32 } from "./crc32.js";

export const SOURCE2_RESOURCE_CODECS = Object.freeze({
  TEXT: "text",
  PANORAMA_LAYOUT: "panoramaLayout"
});

export const MAX_SOURCE2_RESOURCE_BYTES = 2 * 1024 * 1024;
export const MAX_SOURCE2_XML_BYTES = 2 * 1024 * 1024;
const HEADER_SIZE = 16;
const BLOCK_ENTRY_SIZE = 12;
const DATA_ALIGNMENT = 16;
const SOURCE2_HEADER_VERSION = 12;
const SOURCE2_HEADER_FLAGS = 0;
const SOURCE2_HEADER_BLOCK_TABLE_OFFSET = 8;
const FATAL_TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function align(value, boundary) {
  return Math.ceil(value / boundary) * boundary;
}

function writeFourCc(bytes, offset, value) {
  for (let i = 0; i < 4; i += 1) bytes[offset + i] = value.charCodeAt(i);
}

function readFourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function asBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function decodeUtf8(bytes, errorMessage = "Invalid UTF-8 resource payload") {
  try {
    return FATAL_TEXT_DECODER.decode(bytes);
  } catch {
    throw new Error(errorMessage);
  }
}

function compileDataResource(sourceBytes) {
  if (sourceBytes.byteLength > MAX_SOURCE2_RESOURCE_BYTES) throw new Error("Source 2 resource exceeds 2 MiB limit");
  const dataOffset = align(HEADER_SIZE + BLOCK_ENTRY_SIZE, DATA_ALIGNMENT);
  const fileSize = dataOffset + sourceBytes.byteLength;
  if (fileSize > MAX_SOURCE2_RESOURCE_BYTES) throw new Error("Source 2 resource exceeds 2 MiB limit");
  const bytes = new Uint8Array(fileSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, fileSize, true);
  view.setUint16(4, SOURCE2_HEADER_VERSION, true);
  view.setUint16(6, SOURCE2_HEADER_FLAGS, true);
  view.setUint32(8, SOURCE2_HEADER_BLOCK_TABLE_OFFSET, true);
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
  if (bytes.byteLength > MAX_SOURCE2_RESOURCE_BYTES) throw new Error("Source 2 resource exceeds 2 MiB limit");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fileSize = view.getUint32(0, true);
  const version = view.getUint16(4, true);
  const flags = view.getUint16(6, true);
  const tableOffset = view.getUint32(8, true);
  const blockCount = view.getUint32(12, true);
  if (fileSize !== bytes.byteLength || version !== SOURCE2_HEADER_VERSION || ![0, 3].includes(flags) || tableOffset !== SOURCE2_HEADER_BLOCK_TABLE_OFFSET || blockCount < 1 || blockCount > 1024) {
    throw new Error("Invalid Source 2 resource header");
  }
  const tableEnd = HEADER_SIZE + (blockCount * BLOCK_ENTRY_SIZE);
  if (tableEnd > bytes.byteLength) throw new Error("Invalid Source 2 resource table");
  let dataEntryOffset = -1;
  for (let index = 0; index < blockCount; index += 1) {
    const entryOffset = HEADER_SIZE + (index * BLOCK_ENTRY_SIZE);
    const fourCc = readFourCc(bytes, entryOffset);
    if (!/^[\x20-\x7e]{4}$/.test(fourCc)) throw new Error("Invalid Source 2 resource block header");
    if (fourCc === "DATA") {
      if (dataEntryOffset >= 0) throw new Error("Multiple Source 2 DATA blocks");
      dataEntryOffset = entryOffset;
    }
  }
  if (dataEntryOffset < 0) throw new Error("Missing Source 2 DATA block");
  const relativeOffset = view.getUint32(dataEntryOffset + 4, true);
  const dataLength = view.getUint32(dataEntryOffset + 8, true);
  const dataOffset = dataEntryOffset + 4 + relativeOffset;
  if (dataOffset < tableEnd || dataOffset > bytes.byteLength || dataLength > bytes.byteLength - dataOffset) throw new Error("Invalid Source 2 DATA block bounds");
  return bytes.slice(dataOffset, dataOffset + dataLength);
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
    if (sourceBytes.byteLength > MAX_SOURCE2_XML_BYTES) throw new Error("Panorama XML exceeds 2 MiB limit");
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
  if (codec === SOURCE2_RESOURCE_CODECS.TEXT) return decodeUtf8(readDataBlock(bytes));
  if (codec === SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT) {
    const data = readDataBlock(bytes);
    if (data.byteLength < 6) throw new Error("Invalid Panorama layout resource");
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const expectedCrc = view.getUint32(0, true);
    const wrapperFlags = view.getUint16(4, true);
    const sourceBytes = data.slice(6);
    if (wrapperFlags !== 0 || crc32(sourceBytes) !== expectedCrc) throw new Error("Invalid Panorama layout resource CRC or flags");
    if (sourceBytes.byteLength > MAX_SOURCE2_XML_BYTES) throw new Error("Panorama XML exceeds 2 MiB limit");
    return decodeUtf8(sourceBytes, "Invalid Panorama layout UTF-8");
  }
  unknownCodec(codec);
}
