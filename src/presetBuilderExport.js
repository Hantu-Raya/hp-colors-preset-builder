import { normalizeHpPresetPayload } from "./hpPresetPayload.js";
import { HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import { encodePresetStoreEntry } from "./presetStoreXml.js";
import { HP_PROFILE_LIMIT } from "./profileStore.js";

export const HP_COLORS_IMPORT_CODE_PREFIX = "[ANITA-v1-hp_colors]:";
export { HP_PROFILE_LIMIT };

function normalizeExportProfile(profile, index, targetMode) {
  const preset = normalizeHpPresetPayload(profile, { index });
  if (targetMode === HP_COLORS_MOD_VARIANTS.FULL) {
    preset.values.hp_precise_pips_enabled = false;
  }
  return preset;
}

export function createProfileCode(profile, index = 0, targetMode = HP_COLORS_MOD_VARIANTS.MINIMAL) {
  return `${HP_COLORS_IMPORT_CODE_PREFIX}${encodePresetStoreEntry(normalizeExportProfile(profile, index, targetMode))}`;
}

export function createAllProfileCodes(profiles, targetMode = HP_COLORS_MOD_VARIANTS.MINIMAL) {
  return (Array.isArray(profiles) ? profiles : [])
    .slice(0, HP_PROFILE_LIMIT)
    .map((profile, index) => createProfileCode(profile, index, targetMode))
    .join("\n");
}

export function createProfilesJsonExport(profiles, targetMode = HP_COLORS_MOD_VARIANTS.MINIMAL) {
  return JSON.stringify({
    version: 1,
    profiles: (Array.isArray(profiles) ? profiles : [])
      .slice(0, HP_PROFILE_LIMIT)
      .map((profile, index) => normalizeExportProfile(profile, index, targetMode))
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
