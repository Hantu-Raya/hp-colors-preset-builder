const HEADER_SIZE = 16;
const BLOCK_ENTRY_SIZE = 12;

function asBytes(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function readFourCc(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
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

export function extractPanoramaLayoutSource(input) {
  const data = readDataBlock(input);
  if (data.byteLength < 6) throw new Error("Invalid Panorama layout resource");
  return new TextDecoder().decode(data.slice(6));
}
