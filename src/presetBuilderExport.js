import { normalizeHpPresetPayload } from "./hpPresetPayload.js";
import { encodePresetStoreEntry } from "./presetStoreXml.js";
import { HP_PROFILE_LIMIT } from "./profileStore.js";

export const HP_COLORS_IMPORT_CODE_PREFIX = "[ANITA-v1-hp_colors]:";
export { HP_PROFILE_LIMIT };

export function createProfileCode(profile, index = 0) {
  const preset = normalizeHpPresetPayload(profile, { index });
  return `${HP_COLORS_IMPORT_CODE_PREFIX}${encodePresetStoreEntry(preset)}`;
}

export function createAllProfileCodes(profiles) {
  return (Array.isArray(profiles) ? profiles : [])
    .slice(0, HP_PROFILE_LIMIT)
    .map((profile, index) => createProfileCode(profile, index))
    .join("\n");
}

export function createProfilesJsonExport(profiles) {
  return JSON.stringify({
    version: 1,
    profiles: (Array.isArray(profiles) ? profiles : [])
      .slice(0, HP_PROFILE_LIMIT)
      .map((profile, index) => normalizeHpPresetPayload(profile, { index }))
  }, null, 2);
}

export function createProfilesJsonFileName(profileName) {
  const stem = String(profileName || "hp-colors-presets")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "hp-colors-presets";
  return `${stem}.json`;
}
