export const SHOWRANKS_COMPATIBLE_STORAGE_KEY = "hp_colors_preset_builder_showranks_compatible_v1";

export function normalizeShowranksCompatible(value) {
  return value === true || value === "true";
}

export function loadShowranksCompatibleState(storage) {
  try {
    const raw = storage?.getItem?.(SHOWRANKS_COMPATIBLE_STORAGE_KEY);
    return { showranksCompatible: normalizeShowranksCompatible(raw), error: null };
  } catch (error) {
    return {
      showranksCompatible: false,
      error: `Showranks compatibility could not be read: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function saveShowranksCompatibleState(storage, showranksCompatible) {
  if (!storage?.setItem) return { ok: true, error: null };
  try {
    storage.setItem(SHOWRANKS_COMPATIBLE_STORAGE_KEY, showranksCompatible ? "true" : "false");
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: `Showranks compatibility could not be saved: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
