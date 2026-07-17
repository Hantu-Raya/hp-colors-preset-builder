export async function copyText(text, {
  clipboard = globalThis.navigator?.clipboard,
  documentRef = globalThis.document
} = {}) {
  const value = String(text ?? "");
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(value);
      return true;
    } catch {
      // Browser clipboard permissions can be denied even when the API exists.
    }
  }
  if (!documentRef) throw new Error("Clipboard is unavailable");
  const area = documentRef.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  documentRef.body.appendChild(area);
  area.select();
  let copied = false;
  try { copied = documentRef.execCommand("copy"); } catch { copied = false; }
  area.remove();
  if (!copied) throw new Error("Clipboard copy failed");
  return true;
}

export function downloadBytes(filename, bytes, mimeType = "application/octet-stream") {
  if (typeof document === "undefined" || !globalThis.URL?.createObjectURL) throw new Error("Downloads are unavailable");
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = String(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    link.remove();
    throw new Error(`Download failed: ${error?.message || String(error)}`);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return true;
}

export function downloadText(filename, text, mimeType = "text/plain;charset=utf-8") {
  return downloadBytes(filename, new TextEncoder().encode(String(text ?? "")), mimeType);
}
