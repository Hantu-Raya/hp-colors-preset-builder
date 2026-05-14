import { sanitizeFormState } from "./hpFormModel.js";

export const PRESET_DRAFT_STORAGE_KEY = "hp-colors-preset-builder:draft:v1";
const PRESET_DRAFT_VERSION = 1;

function normalizePresetName(value) {
  const name = String(value || "").trim();
  return name || "Web Builder Preset";
}

export function serializePresetDraft({ presetName, state }, schema) {
  return JSON.stringify({
    version: PRESET_DRAFT_VERSION,
    presetName: normalizePresetName(presetName),
    state: sanitizeFormState(schema, state)
  });
}

export function parsePresetDraft(serialized, schema) {
  if (!serialized) return null;
  let parsed;
  try {
    parsed = JSON.parse(String(serialized));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.version !== PRESET_DRAFT_VERSION) return null;
  if (!parsed.state || typeof parsed.state !== "object" || Array.isArray(parsed.state)) return null;
  return {
    presetName: normalizePresetName(parsed.presetName),
    state: sanitizeFormState(schema, parsed.state)
  };
}

export function loadPresetDraft(storage, schema) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return parsePresetDraft(storage.getItem(PRESET_DRAFT_STORAGE_KEY), schema);
  } catch {
    return null;
  }
}

export function savePresetDraft(storage, draft, schema) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(PRESET_DRAFT_STORAGE_KEY, serializePresetDraft(draft, schema));
    return true;
  } catch {
    return false;
  }
}
