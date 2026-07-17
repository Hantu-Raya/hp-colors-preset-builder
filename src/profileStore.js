import {
  DEFAULT_HP_PRESET_NAME,
  cleanHpPresetName,
  defaultHpPresetName,
  normalizeHpPresetPayload
} from "./hpPresetPayload.js";
import { HP_HERO_SCOPE_ALL } from "./hpHeroData.js";

export const STORAGE_KEY = "hp_colors_preset_builder_profiles_v1";
export const DEFAULT_PRESET_NAME = DEFAULT_HP_PRESET_NAME;
export const FIRST_PROFILE_ID = "profile-1";
export const HP_PROFILE_LIMIT = 32;

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
    hm
  } = input || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input || {}, key);
  const rawHeroes = has("hs") ? hs : heroes;
  const inferredHeroMode = Array.isArray(rawHeroes) && rawHeroes.length ? null : HP_HERO_SCOPE_ALL;
  const normalized = normalizeHpPresetPayload({
    name: has("n") ? n : name,
    values: has("vs") ? vs : values,
    heroMode: has("hm") || has("heroMode") ? (has("hm") ? hm : heroMode) : inferredHeroMode,
    heroes: rawHeroes
  }, { preserveBlankName: true });

  return {
    id: String(id || FIRST_PROFILE_ID),
    name: normalized.name,
    values: normalized.values,
    heroMode: normalized.heroMode,
    heroes: normalized.heroes
  };
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
      heroes: rawProfile?.heroes || rawProfile?.hs || []
    });
  });
}

export function loadProfileState(storage, defaultState) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
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

export function saveProfileState(storage, state) {
  if (!storage?.setItem) return { ok: true, error: null };
  const profiles = Array.isArray(state?.profiles) && state.profiles.length
    ? state.profiles.slice(0, HP_PROFILE_LIMIT)
    : [createInitialProfile({})];
  const activeProfileId = profiles.some((profile) => profile.id === state?.activeProfileId)
    ? state.activeProfileId
    : profiles[0].id;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProfileId,
      profiles: profiles.map((profile, index) => {
        const normalized = normalizeHpPresetPayload(profile, { index });
        return {
          id: String(profile.id || `profile-${index + 1}`),
          name: normalized.name,
          values: normalized.values,
          heroMode: normalized.heroMode,
          heroes: normalized.heroes
        };
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
