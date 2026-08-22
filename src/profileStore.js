import {
  DEFAULT_HP_PRESET_NAME,
  cleanHpPresetName,
  defaultHpPresetName,
  normalizeHpPresetPayload
} from "./hpPresetPayload.js";
import { HP_HERO_SCOPE_ALL } from "./hpHeroData.js";

export const STORAGE_KEY = "hp_colors_preset_builder_profiles_v1";
export const V2_STORAGE_KEY = "hp_colors_preset_builder_profiles_v2";
const DEFAULT_PRESET_NAME = DEFAULT_HP_PRESET_NAME;
export const FIRST_PROFILE_ID = "profile-1";
export const HP_PROFILE_LIMIT = 128;


function cloneJsonSafe(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function addRewriteMetadata(profile, source) {
  if (!hasOwn(source, "rewrite") || source.rewrite === undefined) return profile;
  profile.rewrite = cloneJsonSafe(source.rewrite);
  return profile;
}

function defaultProfileName(index) {
  return defaultHpPresetName(index);
}

export function cleanProfileName(name, index = 0) {
  return cleanHpPresetName(name, index, defaultProfileName(index));
}

export function createProfile(input = {}) {
  const {
    id = FIRST_PROFILE_ID,
    name = DEFAULT_PRESET_NAME,
    values = {},
    heroes = [],
    heroMode = null,
    n,
    vs,
    hs,
    hm,
    overrides,
    o,
    rewrite
  } = input || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  const rawHeroes = has("hs") ? hs : heroes;
  const inferredHeroMode = Array.isArray(rawHeroes) && rawHeroes.length ? null : HP_HERO_SCOPE_ALL;
  const normalized = normalizeHpPresetPayload({
    name: has("n") ? n : name,
    values: has("vs") ? vs : values,
    heroMode: has("hm") || has("heroMode") ? (has("hm") ? hm : heroMode) : inferredHeroMode,
    heroes: rawHeroes,
    overrides: has("o") ? o : overrides
  }, { preserveBlankName: true });

  return addRewriteMetadata({
    id: String(id || FIRST_PROFILE_ID),
    name: normalized.name,
    values: normalized.values,
    heroMode: normalized.heroMode,
    heroes: normalized.heroes,
    overrides: normalized.overrides || {}
  }, { rewrite });
}


export function createInitialProfile(defaultState) {
  return createProfile({
    id: FIRST_PROFILE_ID,
    name: DEFAULT_PRESET_NAME,
    values: defaultState,
    heroMode: HP_HERO_SCOPE_ALL
  });
}

function nextProfileId(profiles) {
  let maxId = 0;
  for (const profile of profiles || []) {
    const match = /^profile-(\d+)$/.exec(String(profile?.id || ""));
    if (match) maxId = Math.max(maxId, Number(match[1]) || 0);
  }
  return `profile-${maxId + 1}`;
}

function normalizeProfiles(rawProfiles, defaultState) {
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) return [createInitialProfile(defaultState)];
  const usedIds = new Set();
  return rawProfiles.slice(0, HP_PROFILE_LIMIT).map((rawProfile, index) => {
    const rawId = String(rawProfile?.id || "").trim();
    const id = rawId && !usedIds.has(rawId) ? rawId : `profile-${index + 1}`;
    usedIds.add(id);
    return createProfile({
      id,
      name: cleanProfileName(rawProfile?.name, index),
      values: rawProfile?.values || rawProfile?.vs || defaultState,
      heroMode: rawProfile?.heroMode ?? rawProfile?.hm ?? HP_HERO_SCOPE_ALL,
      heroes: rawProfile?.heroes || rawProfile?.hs || [],
      overrides: rawProfile?.overrides || rawProfile?.o || {},
      rewrite: rawProfile?.rewrite
    });
  });
}

export function loadProfileState(storage, defaultState, storageKey = STORAGE_KEY) {
  try {
    const raw = storage?.getItem?.(storageKey);
    if (!raw) {
      const profiles = [createInitialProfile(defaultState)];
      return { profiles, activeProfileId: profiles[0].id, error: null };
    }
    const parsed = JSON.parse(raw);
    const profiles = normalizeProfiles(parsed?.profiles, defaultState);
    const activeProfileId = profiles.some((profile) => profile.id === parsed?.activeProfileId)
      ? parsed.activeProfileId
      : profiles[0].id;
    return { profiles, activeProfileId, error: null };
  } catch (error) {
    const profiles = [createInitialProfile(defaultState)];
    return {
      profiles,
      activeProfileId: profiles[0].id,
      error: `Saved profiles could not be read: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function saveProfileState(storage, state, storageKey = STORAGE_KEY) {
  if (!storage?.setItem) return { ok: true, error: null };
  const profiles = Array.isArray(state?.profiles) && state.profiles.length
    ? state.profiles.slice(0, HP_PROFILE_LIMIT)
    : [createInitialProfile({})];
  const activeProfileId = profiles.some((profile) => profile.id === state?.activeProfileId)
    ? state.activeProfileId
    : profiles[0].id;
  try {
    storage.setItem(storageKey, JSON.stringify({
      version: 1,
      activeProfileId,
      profiles: profiles.map((profile, index) => {
        const normalized = normalizeHpPresetPayload(profile, { index });
        const persisted = {
          id: String(profile.id || `profile-${index + 1}`),
          name: normalized.name,
          values: normalized.values,
          heroMode: normalized.heroMode,
          heroes: normalized.heroes,
          overrides: normalized.overrides || {}
        };
        return addRewriteMetadata(persisted, profile);
      })
    }));
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: `Profiles could not be saved: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function migrateLegacyV2ProfileState(storage, defaultState) {
  if (!storage?.getItem || !storage?.setItem) return { migrated: false, error: null };
  try {
    if (storage.getItem(V2_STORAGE_KEY)) return { migrated: false, error: null };
    const rawLegacy = storage.getItem(STORAGE_KEY);
    if (!rawLegacy) return { migrated: false, error: null };
    const parsedLegacy = JSON.parse(rawLegacy);
    if (!Array.isArray(parsedLegacy?.profiles) || !parsedLegacy.profiles.some((profile) => hasOwn(profile, "rewrite"))) {
      return { migrated: false, error: null };
    }

    const legacy = loadProfileState(storage, defaultState);
    const v2Save = saveProfileState(storage, legacy, V2_STORAGE_KEY);
    if (!v2Save.ok) return { migrated: false, error: v2Save.error };

    const v1Profiles = legacy.profiles.filter((profile) => !hasOwn(profile, "rewrite"));
    const fallback = createInitialProfile(defaultState);
    const nextV1Profiles = v1Profiles.length ? v1Profiles : [fallback];
    const nextV1ActiveId = nextV1Profiles.some((profile) => profile.id === legacy.activeProfileId)
      ? legacy.activeProfileId
      : nextV1Profiles[0].id;
    const v1Save = saveProfileState(storage, {
      profiles: nextV1Profiles,
      activeProfileId: nextV1ActiveId
    });
    return { migrated: v1Save.ok, error: v1Save.error };
  } catch (error) {
    return {
      migrated: false,
      error: `V2 profiles could not be isolated: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function addProfile(profiles, defaultState) {
  const current = normalizeProfiles(profiles, defaultState);
  if (current.length >= HP_PROFILE_LIMIT) {
    return { profiles: current, activeProfileId: current[0]?.id, limitReached: true };
  }
  const profile = createProfile({
    id: nextProfileId(current),
    name: defaultProfileName(current.length),
    values: defaultState,
    heroMode: HP_HERO_SCOPE_ALL
  });
  return { profiles: [...current, profile], activeProfileId: profile.id };
}

export function removeProfile(profiles, activeProfileId) {
  const current = Array.isArray(profiles) && profiles.length ? profiles : [createInitialProfile({})];
  if (current.length <= 1) return { profiles: current, activeProfileId: current[0].id };
  const activeIndex = Math.max(0, current.findIndex((profile) => profile.id === activeProfileId));
  const removeId = current[activeIndex]?.id || current[0].id;
  const nextProfiles = current.filter((profile) => profile.id !== removeId);
  const nextActive = nextProfiles[Math.max(0, activeIndex - 1)] || nextProfiles[0];
  return { profiles: nextProfiles, activeProfileId: nextActive.id };
}

export function reorderProfiles(profiles, fromIndex, toIndex) {
  if (!Array.isArray(profiles) || profiles.length < 2) return profiles || [];
  const from = Number(fromIndex);
  const to = Number(toIndex);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return profiles;
  if (from < 0 || from >= profiles.length || to < 0 || to >= profiles.length || from === to) return profiles;
  const next = [...profiles];
  const [profile] = next.splice(from, 1);
  next.splice(to, 0, profile);
  return next;
}

export function profileToPreset(profile, index = 0) {
  return normalizeHpPresetPayload(profile, { index });
}

export function createProfilePersistenceSnapshot(state) {
  return { profiles: state?.profiles, activeProfileId: state?.activeProfileId };
}
