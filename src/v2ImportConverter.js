import { HP_COLORS_MOD_VARIANTS } from './hpModVariants.js';
import { parseHpColorsImportProfiles } from './hpImportCode.js';
import {
  HP_PROFILE_LIMIT,
  V2_STORAGE_KEY,
  createProfile,
  saveProfileState
} from './profileStore.js';
import { createRewriteProfileMetadata, decodeRewriteTransfer } from './rewritePresetCodec.js';
import { V2_TARGET_MODE_STORAGE_KEY, saveTargetModeState } from './targetModeStore.js';

function restoreStorageValue(storage, key, value) {
  if (value === null) storage.removeItem?.(key);
  else storage.setItem(key, value);
}

function convertedProfile(source, index) {
  const profile = createProfile({
    ...source,
    id: `profile-${index + 1}`
  });
  return {
    ...profile,
    rewrite: createRewriteProfileMetadata(profile)
  };
}

export function convertImportTextToHpv2({ importText, storage, baseUrl = '/' } = {}) {
  if (!storage?.getItem || !storage?.setItem) {
    throw new Error('Browser storage is unavailable.');
  }

  const text = String(importText || '').trim();
  if (!text) throw new Error('Paste an HP Colors preset code or JSON export.');

  let importedProfiles;
  try {
    const rewriteTransfer = decodeRewriteTransfer(text);
    importedProfiles = rewriteTransfer?.profiles || parseHpColorsImportProfiles(text);
  } catch (error) {
    throw new Error(`Invalid HP Colors import: ${error?.message || String(error)}`);
  }
  if (!importedProfiles.length) throw new Error('The import contains no presets.');
  if (importedProfiles.length > HP_PROFILE_LIMIT) {
    throw new Error(`The import contains more than ${HP_PROFILE_LIMIT} presets.`);
  }

  const profiles = importedProfiles.map(convertedProfile);
  const state = { profiles, activeProfileId: profiles[0].id };
  const originalProfiles = storage.getItem(V2_STORAGE_KEY);
  const originalTarget = storage.getItem(V2_TARGET_MODE_STORAGE_KEY);

  const savedProfiles = saveProfileState(storage, state, V2_STORAGE_KEY);
  if (!savedProfiles.ok) throw new Error(savedProfiles.error);

  const savedTarget = saveTargetModeState(storage, HP_COLORS_MOD_VARIANTS.FULL, {
    storageKey: V2_TARGET_MODE_STORAGE_KEY
  });
  if (!savedTarget.ok) {
    restoreStorageValue(storage, V2_STORAGE_KEY, originalProfiles);
    restoreStorageValue(storage, V2_TARGET_MODE_STORAGE_KEY, originalTarget);
    throw new Error(savedTarget.error);
  }

  const normalizedBase = `${String(baseUrl || '/').replace(/\/?$/, '/')}`;
  return {
    importedCount: profiles.length,
    activeProfileId: state.activeProfileId,
    href: `${normalizedBase}v2/`
  };
}
