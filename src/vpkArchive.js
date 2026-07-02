import { crc32 } from "./crc32.js";

const VPK_MAGIC = 0x55aa1234;
export const VPK_ARCHIVE_VERSION = 2;
const HEADER_SIZE = 28;
const EMBEDDED_ARCHIVE_INDEX = 0x7fff;
const ENTRY_TERMINATOR = 0xffff;

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

function readCString(bytes, cursor, limit) {
  let end = cursor;
  while (end < limit && bytes[end] !== 0) end += 1;
  if (end >= limit) throw new Error("Malformed VPK tree");
  return {
    value: new TextDecoder().decode(bytes.slice(cursor, end)),
    next: end + 1
  };
}

function splitPath(path) {
  const clean = String(path).replaceAll("\\", "/").replace(/^\/+/, "");
  const slash = clean.lastIndexOf("/");
  const dir = slash >= 0 ? clean.slice(0, slash) : " ";
  const file = slash >= 0 ? clean.slice(slash + 1) : clean;
  const dot = file.lastIndexOf(".");
  if (dot <= 0 || dot === file.length - 1) {
    throw new Error(`VPK path needs extension: ${path}`);
  }
  return {
    ext: file.slice(dot + 1),
    dir,
    name: file.slice(0, dot)
  };
}

function joinPath(dir, name, ext) {
  const fileName = `${name}.${ext}`;
  return dir && dir !== " " ? `${dir}/${fileName}` : fileName;
}

function normalizeFiles(files = []) {
  return files.map((file) => ({
    path: String(file.path),
    bytes: asBytes(file.bytes)
  }));
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
  [...groups.keys()].sort().forEach((ext) => {
    pushCString(out, ext);
    const dirs = groups.get(ext);
    [...dirs.keys()].sort().forEach((dir) => {
      pushCString(out, dir);
      dirs.get(dir).sort((a, b) => a.name.localeCompare(b.name)).forEach((entry) => {
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
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== VPK_MAGIC) throw new Error("Invalid VPK file");
  if (view.getUint32(4, true) !== VPK_ARCHIVE_VERSION) throw new Error("Unsupported VPK version");

  const treeSize = view.getUint32(8, true);
  const dataSize = view.getUint32(12, true);
  const treeStart = HEADER_SIZE;
  const treeEnd = treeStart + treeSize;
  const dataStart = treeEnd;
  if (treeEnd > bytes.byteLength || dataStart + dataSize > bytes.byteLength) {
    throw new Error("Malformed VPK file");
  }

  const files = [];
  let cursor = treeStart;
  while (cursor < treeEnd) {
    const extPart = readCString(bytes, cursor, treeEnd);
    cursor = extPart.next;
    if (!extPart.value) break;

    while (cursor < treeEnd) {
      const dirPart = readCString(bytes, cursor, treeEnd);
      cursor = dirPart.next;
      if (!dirPart.value) break;

      while (cursor < treeEnd) {
        const namePart = readCString(bytes, cursor, treeEnd);
        cursor = namePart.next;
        if (!namePart.value) break;
        if (cursor + 18 > treeEnd) throw new Error("Malformed VPK entry");

        const preloadBytes = view.getUint16(cursor + 4, true);
        const archiveIndex = view.getUint16(cursor + 6, true);
        const entryOffset = view.getUint32(cursor + 8, true);
        const entryLength = view.getUint32(cursor + 12, true);
        const terminator = view.getUint16(cursor + 16, true);
        cursor += 18;

        if (terminator !== ENTRY_TERMINATOR) throw new Error("Malformed VPK entry");
        if (preloadBytes !== 0) throw new Error("Unsupported VPK preload data");
        if (archiveIndex !== EMBEDDED_ARCHIVE_INDEX) throw new Error("Unsupported VPK archive index");
        const start = dataStart + entryOffset;
        const end = start + entryLength;
        if (start < dataStart || end > bytes.byteLength) throw new Error("Malformed VPK entry data");

        files.push({
          path: joinPath(dirPart.value, namePart.value, extPart.value),
          bytes: bytes.slice(start, end)
        });
      }
    }
  }

  return { version: VPK_ARCHIVE_VERSION, files };
}

export function writeVpkArchive(archive) {
  const files = normalizeFiles(archive?.files || []);

  let offset = 0;
  const offsets = files.map((file) => {
    const current = offset;
    offset += file.bytes.byteLength;
    return current;
  });

  const tree = buildTree(files, offsets);
  const fileDataSize = offset;
  const totalSize = HEADER_SIZE + tree.byteLength + fileDataSize;
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
  return (archive?.files || []).find((file) => file.path === archivePath) || null;
}
