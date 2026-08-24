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
import {
  addProfile,
  cleanProfileName,
  createInitialProfile,
  createProfile,
  FIRST_PROFILE_ID,
  HP_PROFILE_LIMIT,
  loadProfileState,
  profileToPreset,
  removeProfile,
  reorderProfiles,
  STORAGE_KEY as PROFILE_STORAGE_KEY
} from "./profileStore.js";
import { createRewriteProfileMetadata, getRewriteEditorState } from "./rewritePresetCodec.js";
import { getTargetModeDetails, isFullTargetMode, isRewriteQollockTarget, loadTargetModeState } from "./targetModeStore.js";
import { PRESET_VPK_FILE_NAME, REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME, REWRITE_SHOWRANKS_PRESET_VPK_FILE_NAME } from "./presetVpkFileName.js";
import { loadShowranksCompatibleState } from "./showranksCompatibleStore.js";

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

function isRewriteCatalog(catalog) {
  return catalog?.variant === "rewrite";
}

function getProfileEditorState(profile, catalog) {
  return isRewriteCatalog(catalog)
    ? getRewriteEditorState(profile)
    : catalog.sanitizeState(profile?.values || {});
}

function getCatalogDefaultState(catalog, defaultState) {
  return isRewriteCatalog(catalog) ? catalog.createDefaultState() : defaultState;
}

function updateRewriteProfile(
  profile,
  nextValues,
  nextOverrides = profile?.rewrite?.webOverrides || profile?.overrides || {}
) {
  const rewrite = createRewriteProfileMetadata({
    ...profile,
    values: nextValues,
    overrides: nextOverrides
  }, { valuesAreRewrite: true });
  return { ...profile, rewrite };
}

function getVisibleFields(group, state, catalog) {
  return (group?.fields || []).filter((field) => field.id !== 'hp_precise_pips_enabled' && catalog.isFieldVisible(field, state));
}

function nextImportedProfileId(usedIds) {
  let index = 1;
  while (usedIds.has(`profile-${index}`)) index += 1;
  const id = `profile-${index}`;
  usedIds.add(id);
  return id;
}

function cloneImportedRewriteMetadata(profile) {
  if (!Object.prototype.hasOwnProperty.call(profile || {}, "rewrite") || profile.rewrite === undefined) return undefined;
  return JSON.parse(JSON.stringify(profile.rewrite));
}

function importedProfileMessage(imported, fallbackName, targetMode) {
  const name = cleanProfileName(imported.name, fallbackName);
  const features = imported.importFeatures;
  if (!features || targetMode !== HP_COLORS_MOD_VARIANTS.MINIMAL) return `Imported ${name}.`;
  const omittedPrecisePips = features.precisePips === null ||
    features.absentFields?.includes?.("ppe");
  const omittedSignatureConditions = features.signatureConditionCount === 0 ||
    features.absentFields?.includes?.("o");
  if (omittedPrecisePips && omittedSignatureConditions) {
    return `Imported ${name}. The source code omitted ppe (More Precise HP Pips; Game default selected) and o (signature-tier conditions).`;
  }
  if (omittedPrecisePips) {
    return `Imported ${name}. The source code omitted ppe (More Precise HP Pips), so Game default is selected.`;
  }
  if (omittedSignatureConditions) {
    return `Imported ${name}. The source code omitted o (signature-tier conditions).`;
  }
  return `Imported ${name} with More Precise HP Pips ${features.precisePips ? "enabled" : "disabled"} and ${features.signatureConditionCount} signature-tier condition${features.signatureConditionCount === 1 ? "" : "s"}.`;
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
      const nextProfile = { ...profile, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch || {}, "rewrite") && patch.rewrite === undefined) {
        delete nextProfile.rewrite;
      }
      return nextProfile;
    })
  };
}

export function createPresetBuilderSession(defaultState) {
  return {
    importText: "",
    status: "Status: Ready",
    feedback: null,
    busy: false,
    busyOperation: null,
    buildResult: null,
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
    conditionalFieldId: null,
    installValidated: false,
    targetMode: DEFAULT_HP_COLORS_MOD_VARIANT,
    targetModeLoaded: false,
    modePickerOpen: false,
    modePickerRequired: false,
    modePickerUpgrade: false,
    showranksCompatible: false
  };
}

export function loadPresetBuilderSession(storage, defaultState, {
  profileStorageKey = PROFILE_STORAGE_KEY,
  targetModeStorageKey
} = {}) {
  const profileState = loadProfileState(storage, defaultState, profileStorageKey);
  const targetModeState = loadTargetModeState(storage, {
    profileStorageKey,
    storageKey: targetModeStorageKey
  });
  const showranksState = loadShowranksCompatibleState(storage);
  const storageError = profileState.error || targetModeState.error || showranksState.error || null;
  return {
    ...createPresetBuilderSession(defaultState),
    profiles: profileState.profiles,
    activeProfileId: profileState.activeProfileId,
    profilesLoaded: true,
    targetMode: targetModeState.targetMode,
    targetModeLoaded: true,
    modePickerOpen: targetModeState.shouldShowPicker,
    modePickerRequired: targetModeState.shouldShowPicker,
    modePickerUpgrade: targetModeState.isUpgradePrompt,
    showranksCompatible: showranksState.showranksCompatible,
    feedback: storageError ? { type: "error", message: storageError } : null,
    status: storageError ? `Status: ${storageError}` : "Status: Ready"
  };
}

function resolvePresetVpkFileName(session) {
  if (isRewriteQollockTarget(session.targetMode)) return REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME;
  const containsRewriteProfiles = (Array.isArray(session.profiles) ? session.profiles : []).some((profile) => Boolean(profile?.rewrite));
  if (containsRewriteProfiles && session.showranksCompatible) return REWRITE_SHOWRANKS_PRESET_VPK_FILE_NAME;
  return PRESET_VPK_FILE_NAME;
}


export function selectPresetBuilderSession(session, defaultState, groups, activeKey, catalog = HP_FIELD_CATALOG) {
  const profiles = Array.isArray(session.profiles) && session.profiles.length
    ? session.profiles
    : [createInitialProfile(defaultState)];
  const activeProfile = profiles.find((profile) => profile.id === session.activeProfileId) || profiles[0] || createInitialProfile(defaultState);
  const activeProfileIndex = Math.max(0, profiles.findIndex((profile) => profile.id === activeProfile.id));
  const activeDefaultState = getCatalogDefaultState(catalog, defaultState);
  const presetName = cleanProfileName(activeProfile.name, activeProfileIndex);
  const state = getProfileEditorState(activeProfile, catalog);
  const activeHeroMode = normalizeHeroScopeMode(activeProfile.heroMode || activeProfile.hm, activeProfile.heroes || activeProfile.hs);
  const selectedHeroIds = activeHeroMode === HP_HERO_SCOPE_SELECTED ? normalizeHeroIds(activeProfile.heroes) : [];
  const selectedHeroSet = new Set(selectedHeroIds);
  const heroSelectionLabel = formatHeroSelection(activeHeroMode, selectedHeroIds);
  const flatGroups = flattenGroups(groups);
  const firstLeafKey = catalog.getCategoryKey(flatGroups.find((group) => !group.children?.length) || flatGroups[0]);
  const currentGroup = flatGroups.find((group) => catalog.getCategoryKey(group) === activeKey) || flatGroups[0];
  const visibleFields = getVisibleFields(currentGroup, state, catalog);
  const buildProfilePresets = profiles.map(profileToPreset);
  const targetModeDetails = getTargetModeDetails(session.targetMode);
  const profileScopeCounts = profiles.reduce((counts, profile) => {
    const mode = normalizeHeroScopeMode(profile.heroMode || profile.hm, profile.heroes || profile.hs);
    counts[mode] = (counts[mode] || 0) + 1;
    return counts;
  }, { all: 0, selected: 0, off: 0 });
  const changedSettingCount = profiles.reduce(
    (total, profile) => total
      + catalog.countOverrides(getProfileEditorState(profile, catalog), activeDefaultState)
      + Object.keys(profile.overrides || {}).length,
    0
  );

  return {
    activeProfile,
    activeProfileIndex,
    presetName,
    state,
    activeHeroMode,
    selectedHeroIds,
    selectedHeroSet,
    activeOverrides: isRewriteCatalog(catalog) ? activeProfile.rewrite?.webOverrides || {} : activeProfile.overrides || {},
    heroSelectionLabel,
    flatGroups,
    firstLeafKey,
    currentGroup,
    visibleFields,
    visibleCount: visibleFields.length,
    activeOverrideCount: catalog.countOverrides(state, activeDefaultState) + Object.keys(activeProfile.overrides || {}).length,
    changedSettingCount,
    profileScopeCounts,
    allProfilesOff: profiles.length > 0 && profileScopeCounts.off === profiles.length,
    profileLimit: HP_PROFILE_LIMIT,
    targetModeDetails,
    fullTargetMode: isFullTargetMode(session.targetMode),
    buildProfilePresets,
    canConfirmBuildVariant: !session.busy && canConfirmBuild({ installValidated: session.installValidated, buildVariant: session.targetMode }),
    presetVpkFileName: resolvePresetVpkFileName(session),
    installDirectory: "Deadlock/game/citadel/addons",
    catalog,
    defaultState: activeDefaultState,
  };
}

export function reducePresetBuilderSession(session, intent, context = {}) {
  switch (intent?.type) {
    case "TOGGLE_PROFILE_MENU":
      return { ...session, profileMenuOpen: !session.profileMenuOpen, heroMenuOpen: false };
    case "TOGGLE_HERO_MENU":
      return { ...session, heroMenuOpen: !session.heroMenuOpen, profileMenuOpen: false };
    case "CLOSE_MENUS":
      return { ...session, profileMenuOpen: false, heroMenuOpen: false };
    case "CLOSE_TARGET_MODE_PICKER":
      return { ...session, modePickerOpen: false };
    case "SET_FEEDBACK":
      return { ...session, feedback: intent.feedback || null };
    case "CLEAR_FEEDBACK":
      return { ...session, feedback: null };
    case "OPERATION_STARTED":
      if (session.busy) return session;
      return { ...session, busy: true, busyOperation: intent.operation || "operation", feedback: null };
    case "OPERATION_SUCCEEDED":
      return {
        ...session,
        busy: false,
        busyOperation: null,
        feedback: intent.message ? { type: "success", message: intent.message } : session.feedback
      };
    case "OPERATION_FAILED":
      return {
        ...session,
        busy: false,
        busyOperation: null,
        feedback: { type: "error", message: intent.message || "The operation failed." },
        status: intent.message ? `Status: ${intent.message}` : session.status
      };
    case "BUILD_STARTED":
      if (session.busy) return session;
      return {
        ...session,
        busy: true,
        busyOperation: "build",
        buildResult: null,
        feedback: null,
        warningOpen: false,
        status: "Status: Building preset VPK…"
      };
    case "CONVERT_STARTED":
      return {
        ...session,
        busy: true,
        busyOperation: "convert",
        feedback: null
      };
    case "CONVERT_SUCCEEDED":
      return {
        ...session,
        busy: false,
        busyOperation: null,
        feedback: { type: "success", message: `Converted ${intent.result?.filename || "preset VPK"}.` },
        convertStatus: `Converted ${intent.result?.filename || "preset VPK"}.`
      };
    case "CONVERT_FAILED": {
      const message = intent.message || "The preset VPK could not be converted.";
      return {
        ...session,
        busy: false,
        busyOperation: null,
        feedback: { type: "error", message },
        convertStatus: message
      };
    }
    case "BUILD_SUCCEEDED":
      return {
        ...session,
        busy: false,
        busyOperation: null,
        buildResult: intent.result || null,
        feedback: { type: "success", message: `Built ${intent.result?.filename || "preset VPK"}.` },
        status: `Status: Built ${intent.result?.filename || "preset VPK"}.`
      };
    case "BUILD_FAILED": {
      const message = intent.message || intent.error?.message || "The preset VPK could not be built.";
      return {
        ...session,
        busy: false,
        busyOperation: null,
        buildResult: null,
        feedback: { type: "error", message },
        status: `Status: ${message}`
      };
    }
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
    case "OPEN_SIGNATURE_CONDITION":
      return { ...session, conditionalFieldId: intent.id };
    case "CLOSE_SIGNATURE_CONDITION":
      return { ...session, conditionalFieldId: null };
    case "SET_SIGNATURE_CONDITION":
      return {
        ...updateActiveProfile(session, (profile) => {
          const currentOverrides = isRewriteCatalog(context.catalog)
            ? profile.rewrite?.webOverrides || {}
            : profile.overrides || {};
          const overrides = intent.rule
            ? { ...currentOverrides, [intent.id]: intent.rule }
            : Object.fromEntries(Object.entries(currentOverrides).filter(([id]) => id !== intent.id));
          return isRewriteCatalog(context.catalog)
            ? updateRewriteProfile(profile, getProfileEditorState(profile, context.catalog), overrides)
            : { overrides };
        }),
        conditionalFieldId: null
      };
    case "ENSURE_REWRITE_PROFILES": {
      const profiles = Array.isArray(session.profiles) ? session.profiles : [];
      if (profiles.every((profile) => profile?.rewrite)) return session;
      return {
        ...session,
        profiles: profiles.map((profile) => profile?.rewrite
          ? profile
          : updateRewriteProfile(profile, getRewriteEditorState(profile)))
      };
    }
    case "OPEN_BUILD_WARNING":
      if (session.busy) return session;
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
    case "SET_SHOWRANKS_COMPATIBLE":
      if (session.showranksCompatible === (intent.showranksCompatible === true)) return session;
      return { ...session, showranksCompatible: intent.showranksCompatible === true };
    case "OPEN_TARGET_MODE_PICKER":
      return { ...session, modePickerRequired: false, modePickerOpen: true };
    case "TOGGLE_INSTALL_VALIDATION": {
      const next = getNextInstallValidationState({ installValidated: session.installValidated, buildVariant: session.targetMode });
      if (next.buildVariant) {
        return { ...session, installValidated: next.installValidated, targetMode: next.buildVariant };
      }
      return { ...session, installValidated: false };
    }
    case "UPDATE_FIELD": {
      const catalog = context.catalog || HP_FIELD_CATALOG;
      return updateActiveProfile(session, (profile) => {
        const current = getProfileEditorState(profile, catalog);
        const nextValues = {
          ...current,
          [intent.id]: catalog.coerceValue(intent.id, intent.value)
        };
        return isRewriteCatalog(catalog)
          ? updateRewriteProfile(profile, nextValues)
          : { values: { ...profile.values, [intent.id]: nextValues[intent.id] } };
      });
    }
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
    case "ADD_PROFILE": {
      const catalog = context.catalog || HP_FIELD_CATALOG;
      const rewriteCatalog = isRewriteCatalog(catalog);
      const profileDefaultState = intent.defaultState || context.defaultState || getCatalogDefaultState(catalog, HP_FIELD_CATALOG.createDefaultState());
      const storedDefaultState = rewriteCatalog ? HP_FIELD_CATALOG.createDefaultState() : profileDefaultState;
      const next = addProfile(session.profiles, storedDefaultState);
      if (next.limitReached) {
        return {
          ...session,
          feedback: { type: "error", message: `Profile limit reached (${HP_PROFILE_LIMIT}).` },
          status: `Profile limit reached (${HP_PROFILE_LIMIT}).`
        };
      }
      const addedRaw = next.profiles[next.profiles.length - 1];
      const added = rewriteCatalog
        ? updateRewriteProfile(addedRaw, profileDefaultState)
        : addedRaw;
      const profiles = [...next.profiles.slice(0, -1), added];
      return {
        ...session,
        profiles,
        activeProfileId: next.activeProfileId,
        profileMenuOpen: true,
        status: `Added ${cleanProfileName(added.name, profiles.length - 1)}.`
      };
    }
    case "CLEAR_HEROES":
      return updateActiveProfile(session, { heroMode: HP_HERO_SCOPE_ALL, heroes: [] });
    case "DISABLE_HERO_SELECTION":
      return updateActiveProfile(session, { heroMode: HP_HERO_SCOPE_OFF, heroes: [] });
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
    case "NAVIGATE_PROFILE":
      return { ...session, activeProfileId: intent.profileId, profileMenuOpen: true };
    case "DROP_PROFILE":
      return {
        ...session,
        profiles: reorderProfiles(session.profiles, intent.fromIndex, intent.toIndex),
        dragIndex: null,
        status: "Reordered profiles. First profile has highest load priority."
      };
    case "MOVE_PROFILE": {
      const profiles = Array.isArray(session.profiles) ? session.profiles : [];
      const fromIndex = profiles.findIndex((profile) => profile.id === (intent.profileId || session.activeProfileId));
      const toIndex = intent.toIndex ?? (fromIndex + Number(intent.direction || 0));
      const reordered = reorderProfiles(profiles, fromIndex, toIndex);
      if (reordered === profiles) return session;
      return {
        ...session,
        profiles: reordered,
        status: "Reordered profiles. First profile has highest load priority."
      };
    }
    case "RESET_FIELDS": {
      const catalog = context.catalog || HP_FIELD_CATALOG;
      const fieldIds = Array.isArray(intent.fieldIds) ? intent.fieldIds : [];
      const defaultState = intent.defaultState || context.defaultState || getCatalogDefaultState(catalog, HP_FIELD_CATALOG.createDefaultState());
      return updateActiveProfile(session, (profile) => {
        const next = { ...getProfileEditorState(profile, catalog) };
        const resetIds = new Set(fieldIds);
        for (const id of fieldIds) next[id] = defaultState[id];
        const currentOverrides = isRewriteCatalog(catalog)
          ? profile.rewrite?.webOverrides || {}
          : profile.overrides || {};
        const overrides = Object.fromEntries(Object.entries(currentOverrides).filter(([id]) => !resetIds.has(id)));
        return isRewriteCatalog(catalog)
          ? updateRewriteProfile(profile, next, overrides)
          : { values: next, overrides };
      });
    }
    case "RESET_ALL_FIELDS": {
      const catalog = context.catalog || HP_FIELD_CATALOG;
      const defaultState = intent.defaultState || context.defaultState || getCatalogDefaultState(catalog, HP_FIELD_CATALOG.createDefaultState());
      return updateActiveProfile(session, (profile) => isRewriteCatalog(catalog)
        ? updateRewriteProfile(profile, defaultState, {})
        : { values: { ...defaultState }, overrides: {} });
    }
    case "IMPORT_PROFILES_SUCCEEDED": {
      const importedProfiles = Array.isArray(intent.importedProfiles) ? intent.importedProfiles : [];
      if (importedProfiles.length === 1) {
        const imported = importedProfiles[0];
        const selected = selectPresetBuilderSession(
          session,
          context.defaultState || {},
          context.groups || [],
          context.activeKey,
          context.catalog || HP_FIELD_CATALOG
        );
        const message = importedProfileMessage(imported, selected.presetName, session.targetMode);
        return {
          ...updateActiveProfile(session, {
            name: imported.name,
            values: imported.values,
            heroMode: imported.heroMode,
            heroes: imported.heroes,
            overrides: imported.overrides || {},
            rewrite: cloneImportedRewriteMetadata(imported)
          }),
          busy: false,
          busyOperation: null,
          feedback: { type: "success", message },
          status: message
        };
      }
      if (importedProfiles.length > 1) {
        const profiles = Array.isArray(session.profiles) ? session.profiles : [];
        const available = Math.max(0, HP_PROFILE_LIMIT - profiles.length);
        const acceptedProfiles = importedProfiles.slice(0, available);
        if (!acceptedProfiles.length) {
          return {
            ...session,
            busy: false,
            busyOperation: null,
            feedback: { type: "error", message: `Profile limit reached (${HP_PROFILE_LIMIT}).` },
            status: `Profile limit reached (${HP_PROFILE_LIMIT}).`
          };
        }
        const usedIds = new Set(profiles.map((profile) => String(profile.id || "")));
        const appendedProfiles = acceptedProfiles.map((profile, index) => createProfile({
          id: nextImportedProfileId(usedIds),
          name: cleanProfileName(profile.name, profiles.length + index),
          values: profile.values,
          heroMode: profile.heroMode,
          heroes: profile.heroes,
          overrides: profile.overrides || {},
          rewrite: profile.rewrite
        }));
        const truncated = appendedProfiles.length < importedProfiles.length;
        const message = truncated
          ? `Imported ${appendedProfiles.length}; profile limit is ${HP_PROFILE_LIMIT}.`
          : `Imported ${appendedProfiles.length} profiles from preset codes.`;
        return {
          ...session,
          busy: false,
          busyOperation: null,
          profiles: [...profiles, ...appendedProfiles],
          activeProfileId: appendedProfiles[0].id,
          profileMenuOpen: true,
          feedback: { type: truncated ? "error" : "success", message },
          status: message
        };
      }
      return { ...session, busy: false, busyOperation: null };
    }
    case "IMPORT_FAILED":
      return {
        ...session,
        busy: false,
        busyOperation: null,
        feedback: { type: "error", message: intent.message },
        status: intent.message
      };
    default:
      return session;
  }
}

