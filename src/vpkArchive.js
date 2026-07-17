import { crc32 } from "./crc32.js";

const VPK_MAGIC = 0x55aa1234;
export const VPK_ARCHIVE_VERSION = 2;
export const MAX_VPK_ARCHIVE_BYTES = 4 * 1024 * 1024;
const HEADER_SIZE = 28;
const EMBEDDED_ARCHIVE_INDEX = 0x7fff;
const ENTRY_TERMINATOR = 0xffff;
const MAX_UINT32 = 0xffffffff;
const FATAL_TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function asBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function pushBytes(out, bytes) {
  for (let i = 0; i < bytes.length; i += 1) out.push(bytes[i]);
}

function pushCString(out, value) {
  pushBytes(out, textBytes(value));
  out.push(0);
}

function pushUint16(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function compareCodeUnits(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function normalizeVpkPath(path) {
  const value = String(path ?? "");
  if (!value || value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    throw new Error(`Invalid VPK path: ${value}`);
  }
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes("//")) {
    throw new Error(`Invalid VPK path: ${value}`);
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Invalid VPK path: ${value}`);
  }
  return value;
}

function readCString(bytes, cursor, limit) {
  let end = cursor;
  while (end < limit && bytes[end] !== 0) end += 1;
  if (end >= limit) throw new Error("Malformed VPK tree");
  let value;
  try {
    value = FATAL_TEXT_DECODER.decode(bytes.slice(cursor, end));
  } catch {
    throw new Error("Malformed VPK tree UTF-8");
  }
  return { value, next: end + 1 };
}

function splitPath(path) {
  const clean = normalizeVpkPath(path);
  const slash = clean.lastIndexOf("/");
  const dir = slash >= 0 ? clean.slice(0, slash) : " ";
  const file = slash >= 0 ? clean.slice(slash + 1) : clean;
  const dot = file.lastIndexOf(".");
  if (dot <= 0 || dot === file.length - 1) throw new Error(`VPK path needs extension: ${path}`);
  return { ext: file.slice(dot + 1), dir, name: file.slice(0, dot) };
}

function joinPath(dir, name, ext) {
  return normalizeVpkPath(`${dir && dir !== " " ? `${dir}/` : ""}${name}.${ext}`);
}

function normalizeFiles(files = []) {
  if (!Array.isArray(files)) throw new Error("VPK files must be an array");
  const normalized = files.map((file) => ({ path: normalizeVpkPath(file?.path), bytes: asBytes(file?.bytes) }));
  const seen = new Set();
  for (const file of normalized) {
    const folded = file.path.toLowerCase();
    if (seen.has(folded)) throw new Error(`Duplicate VPK path: ${file.path}`);
    seen.add(folded);
    splitPath(file.path);
  }
  normalized.sort((a, b) => compareCodeUnits(a.path, b.path));
  return normalized;
}

function buildTree(files, offsets) {
  const groups = new Map();
  files.forEach((file, index) => {
    const parts = splitPath(file.path);
    if (!groups.has(parts.ext)) groups.set(parts.ext, new Map());
    const extGroup = groups.get(parts.ext);
    if (!extGroup.has(parts.dir)) extGroup.set(parts.dir, []);
    extGroup.get(parts.dir).push({ ...parts, index, bytes: file.bytes });
  });

  const out = [];
  [...groups.keys()].sort(compareCodeUnits).forEach((ext) => {
    pushCString(out, ext);
    const dirs = groups.get(ext);
    [...dirs.keys()].sort(compareCodeUnits).forEach((dir) => {
      pushCString(out, dir);
      dirs.get(dir).sort((a, b) => compareCodeUnits(a.name, b.name)).forEach((entry) => {
        pushCString(out, entry.name);
        pushUint32(out, crc32(entry.bytes));
        pushUint16(out, 0);
        pushUint16(out, EMBEDDED_ARCHIVE_INDEX);
        pushUint32(out, offsets[entry.index]);
        pushUint32(out, entry.bytes.byteLength);
        pushUint16(out, ENTRY_TERMINATOR);
      });
      out.push(0);
    });
    out.push(0);
  });
  out.push(0);
  return new Uint8Array(out);
}

export function createVpkArchive(files = []) {
  return { version: VPK_ARCHIVE_VERSION, files: normalizeFiles(files) };
}

export function readVpkArchive(input) {
  const bytes = asBytes(input);
  if (bytes.byteLength < HEADER_SIZE) throw new Error("Invalid VPK file");
  if (bytes.byteLength > MAX_VPK_ARCHIVE_BYTES) throw new Error("VPK file exceeds 4 MiB limit");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== VPK_MAGIC) throw new Error("Invalid VPK file");
  if (view.getUint32(4, true) !== VPK_ARCHIVE_VERSION) throw new Error("Unsupported VPK version");

  const treeSize = view.getUint32(8, true);
  const dataSize = view.getUint32(12, true);
  const treeStart = HEADER_SIZE;
  const treeEnd = treeStart + treeSize;
  if (treeEnd < treeStart || treeEnd > bytes.byteLength || dataSize > bytes.byteLength - treeEnd || treeEnd + dataSize !== bytes.byteLength) {
    throw new Error("Malformed VPK file bounds");
  }

  const files = [];
  const ranges = [];
  let cursor = treeStart;
  let terminated = false;
  while (cursor < treeEnd) {
    const extPart = readCString(bytes, cursor, treeEnd);
    cursor = extPart.next;
    if (!extPart.value) {
      terminated = true;
      break;
    }
    while (cursor < treeEnd) {
      const dirPart = readCString(bytes, cursor, treeEnd);
      cursor = dirPart.next;
      if (!dirPart.value) break;
      while (cursor < treeEnd) {
        const namePart = readCString(bytes, cursor, treeEnd);
        cursor = namePart.next;
        if (!namePart.value) break;
        if (cursor + 18 > treeEnd) throw new Error("Malformed VPK entry");
        const expectedCrc = view.getUint32(cursor, true);
        const preloadBytes = view.getUint16(cursor + 4, true);
        const archiveIndex = view.getUint16(cursor + 6, true);
        const entryOffset = view.getUint32(cursor + 8, true);
        const entryLength = view.getUint32(cursor + 12, true);
        const terminator = view.getUint16(cursor + 16, true);
        cursor += 18;
        if (terminator !== ENTRY_TERMINATOR) throw new Error("Malformed VPK entry");
        if (preloadBytes !== 0) throw new Error("Unsupported VPK preload data");
        if (archiveIndex !== EMBEDDED_ARCHIVE_INDEX) throw new Error("Unsupported VPK archive index");
        if (entryOffset > dataSize || entryLength > dataSize - entryOffset) throw new Error("Malformed VPK entry data bounds");
        const start = treeEnd + entryOffset;
        const end = start + entryLength;
        const payload = bytes.slice(start, end);
        if (crc32(payload) !== expectedCrc) throw new Error("VPK entry CRC mismatch");
        const path = joinPath(dirPart.value, namePart.value, extPart.value);
        files.push({ path, bytes: payload });
        ranges.push({ start: entryOffset, end: entryOffset + entryLength });
      }
    }
  }
  if (!terminated || cursor !== treeEnd) throw new Error("Malformed VPK tree terminator");

  const seen = new Set();
  for (const file of files) {
    const folded = file.path.toLocaleLowerCase("en-US");
    if (seen.has(folded)) throw new Error(`Duplicate VPK path: ${file.path}`);
    seen.add(folded);
  }
  ranges.sort((a, b) => a.start - b.start);
  let expectedOffset = 0;
  for (const range of ranges) {
    if (range.start !== expectedOffset) throw new Error("Malformed VPK entry data layout");
    expectedOffset = range.end;
  }
  if (expectedOffset !== dataSize) throw new Error("Malformed VPK entry data layout");
  return { version: VPK_ARCHIVE_VERSION, files };
}

export function writeVpkArchive(archive) {
  if (archive?.version != null && archive.version !== VPK_ARCHIVE_VERSION) throw new Error("Unsupported VPK version");
  const files = normalizeFiles(archive?.files || []);
  let offset = 0;
  const offsets = files.map((file) => {
    if (offset > MAX_UINT32 - file.bytes.byteLength) throw new Error("VPK data exceeds 4 GiB");
    const current = offset;
    offset += file.bytes.byteLength;
    return current;
  });
  const tree = buildTree(files, offsets);
  const fileDataSize = offset;
  const totalSize = HEADER_SIZE + tree.byteLength + fileDataSize;
  if (totalSize > MAX_VPK_ARCHIVE_BYTES) throw new Error("VPK archive exceeds 4 MiB limit");
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, VPK_MAGIC, true);
  view.setUint32(4, VPK_ARCHIVE_VERSION, true);
  view.setUint32(8, tree.byteLength, true);
  view.setUint32(12, fileDataSize, true);
  view.setUint32(16, 0, true);
  view.setUint32(20, 0, true);
  view.setUint32(24, 0, true);
  let cursor = HEADER_SIZE;
  bytes.set(tree, cursor);
  cursor += tree.byteLength;
  files.forEach((file) => {
    bytes.set(file.bytes, cursor);
    cursor += file.bytes.byteLength;
  });
  return bytes;
}

export function findVpkArchiveFile(archive, archivePath) {
  const normalized = normalizeVpkPath(archivePath);
  return (archive?.files || []).find((file) => file.path === normalized) || null;
}
