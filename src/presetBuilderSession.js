import { HP_FIELD_CATALOG } from "./hpSchema.js";
import {
  getHpHeroById,
  HP_HEROES,
  HP_HERO_SCOPE_ALL,
  HP_HERO_SCOPE_OFF,
  HP_HERO_SCOPE_SELECTED,
  normalizeHeroIds,
  normalizeHeroScopeMode
} from "./hpHeroData.js";
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import { buildPresetVpkFileName } from "./presetVpkFileName.js";
import {
  addProfile,
  cleanProfileName,
  createInitialProfile,
  createProfile,
  FIRST_PROFILE_ID,
  loadProfileState,
  profileToPreset,
  removeProfile,
  reorderProfiles,
  STORAGE_KEY as PROFILE_STORAGE_KEY
} from "./profileStore.js";
import { getTargetModeDetails, isFullTargetMode, loadTargetModeState } from "./targetModeStore.js";

const DEFAULT_PRESET_NAME = "Web Builder Preset";
const BUILD_VARIANTS = new Set(Object.values(HP_COLORS_MOD_VARIANTS));

function canConfirmBuild({ installValidated, buildVariant }) {
  return installValidated === true && BUILD_VARIANTS.has(buildVariant);
}

function getNextInstallValidationState({ installValidated, buildVariant }) {
  if (installValidated === true) {
    return {
      installValidated: false,
      buildVariant: null
    };
  }
  return {
    installValidated: true,
    buildVariant: BUILD_VARIANTS.has(buildVariant) ? buildVariant : DEFAULT_HP_COLORS_MOD_VARIANT
  };
}

function getBuildVariantWarning({ buildVariant, profileCount, firstPresetName }) {
  return null;
}

function formatHeroSelection(heroMode, heroIds) {
  const selected = normalizeHeroIds(heroIds);
  const mode = normalizeHeroScopeMode(heroMode, selected);
  if (mode === HP_HERO_SCOPE_OFF) return "Hero select off";
  if (mode === HP_HERO_SCOPE_ALL) return "All heroes";
  if (selected.length === 1) return getHpHeroById(selected[0])?.name || selected[0];
  return `${selected.length} heroes`;
}

function flattenGroups(groups) {
  const out = [];
  const walk = (group) => {
    out.push(group);
    for (const child of group.children || []) walk(child);
  };
  for (const group of groups || []) walk(group);
  return out;
}

function getVisibleFields(group, state) {
  return (group?.fields || []).filter((field) => HP_FIELD_CATALOG.isFieldVisible(field, state));
}

function nextImportedProfileId(usedIds) {
  let index = 1;
  while (usedIds.has(`profile-${index}`)) index += 1;
  const id = `profile-${index}`;
  usedIds.add(id);
  return id;
}

function updateActiveProfile(session, updater) {
  const profiles = Array.isArray(session.profiles) && session.profiles.length
    ? session.profiles
    : [createInitialProfile({})];
  const targetId = profiles.some((profile) => profile.id === session.activeProfileId)
    ? session.activeProfileId
    : profiles[0]?.id;
  return {
    ...session,
    profiles: profiles.map((profile) => {
      if (profile.id !== targetId) return profile;
      const patch = typeof updater === "function" ? updater(profile) : updater;
      return { ...profile, ...patch };
    })
  };
}

export function createPresetBuilderSession(defaultState) {
  return {
    importText: "",
    status: "Status: Ready",
    profiles: [createInitialProfile(defaultState)],
    activeProfileId: FIRST_PROFILE_ID,
    profilesLoaded: false,
    profileMenuOpen: false,
    heroMenuOpen: false,
    dragIndex: null,
    importOpen: false,
    convertOpen: false,
    convertFile: null,
    convertStatus: "",
    previewOpen: false,
    warningOpen: false,
    installValidated: false,
    targetMode: DEFAULT_HP_COLORS_MOD_VARIANT,
    targetModeLoaded: false,
    modePickerOpen: false,
    modePickerRequired: false,
    modePickerUpgrade: false
  };
}

export function loadPresetBuilderSession(storage, defaultState) {
  const profileState = loadProfileState(storage, defaultState);
  const targetModeState = loadTargetModeState(storage, { profileStorageKey: PROFILE_STORAGE_KEY });
  return {
    ...createPresetBuilderSession(defaultState),
    profiles: profileState.profiles,
    activeProfileId: profileState.activeProfileId,
    profilesLoaded: true,
    targetMode: targetModeState.targetMode,
    targetModeLoaded: true,
    modePickerOpen: targetModeState.shouldShowPicker,
    modePickerRequired: targetModeState.shouldShowPicker,
    modePickerUpgrade: targetModeState.isUpgradePrompt
  };
}

export function selectPresetBuilderSession(session, defaultState, groups, activeKey) {
  const profiles = Array.isArray(session.profiles) && session.profiles.length
    ? session.profiles
    : [createInitialProfile(defaultState)];
  const activeProfile = profiles.find((profile) => profile.id === session.activeProfileId) || profiles[0] || createInitialProfile(defaultState);
  const activeProfileIndex = Math.max(0, profiles.findIndex((profile) => profile.id === activeProfile.id));
  const presetName = cleanProfileName(activeProfile.name, activeProfileIndex);
  const state = activeProfile.values;
  const activeHeroMode = normalizeHeroScopeMode(activeProfile.heroMode || activeProfile.hm, activeProfile.heroes || activeProfile.hs);
  const selectedHeroIds = activeHeroMode === HP_HERO_SCOPE_SELECTED ? normalizeHeroIds(activeProfile.heroes) : [];
  const selectedHeroSet = new Set(selectedHeroIds);
  const heroSelectionLabel = formatHeroSelection(activeHeroMode, selectedHeroIds);
  const flatGroups = flattenGroups(groups);
  const firstLeafKey = HP_FIELD_CATALOG.getCategoryKey(flatGroups.find((group) => !group.children?.length) || flatGroups[0]);
  const currentGroup = flatGroups.find((group) => HP_FIELD_CATALOG.getCategoryKey(group) === activeKey) || flatGroups[0];
  const visibleFields = getVisibleFields(currentGroup, state);
  const buildProfilePresets = profiles.map(profileToPreset);
  const targetModeDetails = getTargetModeDetails(session.targetMode);
  const topPresetName = cleanProfileName(profiles[0]?.name, 0);

  return {
    activeProfile,
    activeProfileIndex,
    presetName,
    state,
    activeHeroMode,
    selectedHeroIds,
    selectedHeroSet,
    heroSelectionLabel,
    flatGroups,
    firstLeafKey,
    currentGroup,
    visibleFields,
    visibleCount: visibleFields.length,
    activeOverrideCount: HP_FIELD_CATALOG.countOverrides(state, defaultState),
    targetModeDetails,
    fullTargetMode: isFullTargetMode(session.targetMode),
    buildProfilePresets,
    preview: session.previewOpen ? JSON.stringify({ targetMode: session.targetMode, presets: buildProfilePresets }, null, 2) : "",
    canConfirmBuildVariant: canConfirmBuild({ installValidated: session.installValidated, buildVariant: session.targetMode }),
    presetVpkFileName: buildPresetVpkFileName(presetName || DEFAULT_PRESET_NAME),
    topPresetName,
    buildVariantWarning: getBuildVariantWarning({
      buildVariant: session.targetMode,
      profileCount: buildProfilePresets.length,
      firstPresetName: topPresetName
    })
  };
}

export function reducePresetBuilderSession(session, intent, context = {}) {
  switch (intent?.type) {
    case "SET_IMPORT_TEXT":
      return { ...session, importText: intent.text };
    case "SET_STATUS":
      return { ...session, status: intent.status };
    case "SET_CONVERT_FILE":
      return { ...session, convertFile: intent.file };
    case "SET_CONVERT_STATUS":
      return { ...session, convertStatus: intent.status };
    case "SET_PREVIEW_OPEN":
      return { ...session, previewOpen: Boolean(intent.open) };
    case "SET_IMPORT_OPEN":
      return { ...session, importOpen: Boolean(intent.open) };
    case "SET_CONVERT_OPEN":
      return { ...session, convertOpen: Boolean(intent.open) };
    case "OPEN_BUILD_WARNING":
      return { ...session, installValidated: false, warningOpen: true };
    case "CLOSE_BUILD_WARNING":
      return { ...session, warningOpen: false };
    case "COMMIT_TARGET_MODE":
      return {
        ...session,
        targetMode: intent.targetMode,
        modePickerOpen: false,
        modePickerRequired: false,
        modePickerUpgrade: false,
        installValidated: false,
        targetModeLoaded: true,
        profileMenuOpen: false,
        heroMenuOpen: false
      };
    case "OPEN_TARGET_MODE_PICKER":
      return { ...session, modePickerRequired: false, modePickerOpen: true };
    case "TOGGLE_INSTALL_VALIDATION": {
      const next = getNextInstallValidationState({ installValidated: session.installValidated, buildVariant: session.targetMode });
      if (next.buildVariant) {
        return { ...session, installValidated: next.installValidated, targetMode: next.buildVariant };
      }
      return { ...session, installValidated: false };
    }
    case "UPDATE_FIELD":
      return updateActiveProfile(session, (profile) => ({
        values: { ...profile.values, [intent.id]: HP_FIELD_CATALOG.coerceValue(intent.id, intent.value) }
      }));
    case "RENAME_ACTIVE_PROFILE":
      return updateActiveProfile(session, { name: intent.name });
    case "TOGGLE_HERO": {
      const normalized = normalizeHeroIds([intent.heroId])[0];
      if (!normalized) return session;
      return updateActiveProfile(session, (profile) => {
        const currentMode = normalizeHeroScopeMode(profile.heroMode || profile.hm, profile.heroes || profile.hs);
        const current = currentMode === HP_HERO_SCOPE_SELECTED ? normalizeHeroIds(profile.heroes) : [];
        const currentSet = new Set(current);
        if (currentSet.has(normalized)) {
          currentSet.delete(normalized);
        } else {
          currentSet.add(normalized);
        }
        const heroes = HP_HEROES.map((hero) => hero.id).filter((id) => currentSet.has(id));
        return {
          heroMode: heroes.length ? HP_HERO_SCOPE_SELECTED : HP_HERO_SCOPE_OFF,
          heroes
        };
      });
    }
    case "CLEAR_HEROES":
      return updateActiveProfile(session, { heroMode: HP_HERO_SCOPE_ALL, heroes: [] });
    case "DISABLE_HERO_SELECTION":
      return updateActiveProfile(session, { heroMode: HP_HERO_SCOPE_OFF, heroes: [] });
    case "ADD_PROFILE": {
      const next = addProfile(session.profiles, intent.defaultState || context.defaultState || {});
      const added = next.profiles[next.profiles.length - 1];
      return {
        ...session,
        profiles: next.profiles,
        activeProfileId: next.activeProfileId,
        profileMenuOpen: true,
        status: `Added ${cleanProfileName(added.name, next.profiles.length - 1)}.`
      };
    }
    case "DELETE_ACTIVE_PROFILE": {
      if ((session.profiles || []).length <= 1) return session;
      const presetName = context.presetName || cleanProfileName((session.profiles || [])[0]?.name, 0);
      const next = removeProfile(session.profiles, session.activeProfileId);
      return {
        ...session,
        profiles: next.profiles,
        activeProfileId: next.activeProfileId,
        status: `Removed ${presetName}.`
      };
    }
    case "SELECT_PROFILE":
      return { ...session, activeProfileId: intent.profileId, profileMenuOpen: false };
    case "SET_DRAG_INDEX":
      return { ...session, dragIndex: intent.dragIndex };
    case "DROP_PROFILE":
      return {
        ...session,
        profiles: reorderProfiles(session.profiles, intent.fromIndex, intent.toIndex),
        dragIndex: null,
        status: "Reordered profiles. First profile has highest load priority."
      };
    case "RESET_FIELDS": {
      const fieldIds = Array.isArray(intent.fieldIds) ? intent.fieldIds : [];
      const defaultState = intent.defaultState || context.defaultState || {};
      return updateActiveProfile(session, (profile) => {
        const next = { ...profile.values };
        for (const id of fieldIds) next[id] = defaultState[id];
        return { values: next };
      });
    }
    case "RESET_ALL_FIELDS":
      return updateActiveProfile(session, { values: { ...(intent.defaultState || context.defaultState || {}) } });
    case "IMPORT_PROFILES_SUCCEEDED": {
      const importedProfiles = Array.isArray(intent.importedProfiles) ? intent.importedProfiles : [];
      if (importedProfiles.length === 1) {
        const imported = importedProfiles[0];
        const selected = selectPresetBuilderSession(session, context.defaultState || {}, context.groups || [], context.activeKey);
        return {
          ...updateActiveProfile(session, {
            name: imported.name,
            values: imported.values,
            heroMode: imported.heroMode,
            heroes: imported.heroes
          }),
          status: `Imported ${cleanProfileName(imported.name, selected.activeProfileIndex)}.`
        };
      }
      if (importedProfiles.length > 1) {
        const profiles = Array.isArray(session.profiles) ? session.profiles : [];
        const usedIds = new Set(profiles.map((profile) => String(profile.id || "")));
        const appendedProfiles = importedProfiles.map((profile, index) => createProfile({
          id: nextImportedProfileId(usedIds),
          name: cleanProfileName(profile.name, profiles.length + index),
          values: profile.values,
          heroMode: profile.heroMode,
          heroes: profile.heroes
        }));
        return {
          ...session,
          profiles: [...profiles, ...appendedProfiles],
          activeProfileId: appendedProfiles[0].id,
          profileMenuOpen: true,
          status: `Imported ${appendedProfiles.length} profiles from preset codes.`
        };
      }
      return session;
    }
    case "IMPORT_FAILED":
      return { ...session, status: intent.message };
    default:
      return session;
  }
}

