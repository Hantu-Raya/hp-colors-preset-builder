import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";

export const TARGET_MODE_STORAGE_KEY = "hp_colors_preset_builder_target_mode_v1";

export const TARGET_MODE_CHOICES = Object.freeze([
  Object.freeze({
    id: HP_COLORS_MOD_VARIANTS.MINIMAL,
    title: "Minimal mod",
    label: "Minimal",
    summary: "Preset VPK for the lightweight HP Colors runtime.",
    description: "Use this when you installed the minimal HP Colors mod. It builds the preset store the minimal runtime reads, including static hero-targeted profile routing without the full Anita UI menu.",
    downloadHref: "https://gamebanana.com/mods/download/603113#FileInfo_1701235"
  }),
  Object.freeze({
    id: HP_COLORS_MOD_VARIANTS.FULL,
    title: "Full mod",
    label: "Full",
    summary: "Preset VPK for the full HP Colors in-game menu.",
    description: "Use this when you installed full HP Colors. It supports the full Anita UI menu, multi-profile preset routing, and hero-targeted profiles.",
    downloadHref: "https://gamebanana.com/mods/download/603113#FileInfo_1701236"
  })
]);

const TARGET_MODE_BY_ID = new Map(TARGET_MODE_CHOICES.map((choice) => [choice.id, choice]));

export function normalizeTargetMode(targetMode) {
  if (targetMode === HP_COLORS_MOD_VARIANTS.FULL) return HP_COLORS_MOD_VARIANTS.FULL;
  if (targetMode === HP_COLORS_MOD_VARIANTS.MINIMAL) return HP_COLORS_MOD_VARIANTS.MINIMAL;
  return DEFAULT_HP_COLORS_MOD_VARIANT;
}

function readSavedTargetMode(storage) {
  const raw = storage?.getItem?.(TARGET_MODE_STORAGE_KEY);
  if (!raw) return null;
  if (raw === HP_COLORS_MOD_VARIANTS.FULL || raw === HP_COLORS_MOD_VARIANTS.MINIMAL) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.targetMode || parsed?.mode || null;
  } catch {
    return null;
  }
}

export function loadTargetModeState(storage, { profileStorageKey = null } = {}) {
  const saved = readSavedTargetMode(storage);
  if (saved === HP_COLORS_MOD_VARIANTS.FULL || saved === HP_COLORS_MOD_VARIANTS.MINIMAL) {
    return {
      targetMode: saved,
      shouldShowPicker: false,
      isUpgradePrompt: false
    };
  }

  return {
    targetMode: DEFAULT_HP_COLORS_MOD_VARIANT,
    shouldShowPicker: true,
    isUpgradePrompt: Boolean(profileStorageKey && storage?.getItem?.(profileStorageKey))
  };
}

export function saveTargetModeState(storage, targetMode) {
  if (!storage?.setItem) return;
  storage.setItem(TARGET_MODE_STORAGE_KEY, normalizeTargetMode(targetMode));
}

export function getTargetModeDetails(targetMode) {
  const mode = normalizeTargetMode(targetMode);
  return TARGET_MODE_BY_ID.get(mode) || TARGET_MODE_BY_ID.get(DEFAULT_HP_COLORS_MOD_VARIANT);
}

export function isFullTargetMode(targetMode) {
  return normalizeTargetMode(targetMode) === HP_COLORS_MOD_VARIANTS.FULL;
}

