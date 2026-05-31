import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  Download,
  GitCommitHorizontal,
  GripVertical,
  Heart,
  Layers3,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  Upload
} from 'lucide-preact';
import { HP_SCHEMA, coerceHpValue } from '../hpSchema.js';
import { createDefaultFormState, splitCategoryGroups, getCategoryKey, getCategoryPathLabel, isFieldVisible } from '../hpFormModel.js';
import {
  getHpHeroById,
  HP_HEROES,
  HP_HERO_SCOPE_ALL,
  HP_HERO_SCOPE_OFF,
  HP_HERO_SCOPE_SELECTED,
  normalizeHeroIds,
  normalizeHeroScopeMode
} from '../hpHeroData.js';
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from '../hpModVariants.js';
import { downloadBytes } from '../download.js';
import { buildConvertedVpkFileName, buildPresetVpkFileName } from '../presetVpkFileName.js';
import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from '../gitCommitInfoRefresh.js';
import {
  canConfirmBuild,
  getBuildVariantWarning,
  getNextInstallValidationState
} from '../buildModalState.js';
import {
  TARGET_MODE_CHOICES,
  getBuildProfilesForTargetMode,
  getTargetModeDetails,
  isFullTargetMode,
  loadTargetModeState,
  saveTargetModeState
} from '../targetModeStore.js';
import { addProfile, cleanProfileName, countPresetOverrides, createInitialProfile, createProfile, FIRST_PROFILE_ID, profileToPreset, removeProfile, reorderProfiles, loadProfileState, saveProfileState, STORAGE_KEY as PROFILE_STORAGE_KEY } from '../profileStore.js';
import { SchemaField } from './schema-field.jsx';
import { SchemaTree } from './schema-tree.jsx';

const DEFAULT_PRESET_NAME = 'Web Builder Preset';

let baseHudXmlPromise = null;

function loadBaseHudXml() {
  if (!baseHudXmlPromise) {
    const templateUrl = `${import.meta.env.BASE_URL}templates/hp_colors/panorama/layout/base_hud.xml`;
    baseHudXmlPromise = fetch(templateUrl).then((response) => {
      if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
      return response.text();
    }).catch((error) => {
      baseHudXmlPromise = null;
      throw error;
    });
  }
  return baseHudXmlPromise;
}

function getVisibleFields(group, state) {
  return (group?.fields || []).filter((field) => isFieldVisible(field, state));
}

function nextImportedProfileId(usedIds) {
  let index = 1;
  while (usedIds.has(`profile-${index}`)) index += 1;
  const id = `profile-${index}`;
  usedIds.add(id);
  return id;
}

function scheduleIdleWork(callback) {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 800 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 160);
  return () => window.clearTimeout(id);
}

function formatHeroSelection(heroMode, heroIds) {
  const selected = normalizeHeroIds(heroIds);
  const mode = normalizeHeroScopeMode(heroMode, selected);
  if (mode === HP_HERO_SCOPE_OFF) return 'Hero select off';
  if (mode === HP_HERO_SCOPE_ALL) return 'All heroes';
  if (selected.length === 1) return getHpHeroById(selected[0])?.name || selected[0];
  return `${selected.length} heroes`;
}

export default function PresetBuilderIsland({ gitCommitInfo = null }) {
  const defaultState = useMemo(() => createDefaultFormState(HP_SCHEMA), []);
  const [freshGitCommitInfo, setFreshGitCommitInfo] = useState(gitCommitInfo);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('Status: Ready');
  const [profiles, setProfiles] = useState(() => [createInitialProfile(defaultState)]);
  const [activeProfileId, setActiveProfileId] = useState(FIRST_PROFILE_ID);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertFile, setConvertFile] = useState(null);
  const [convertStatus, setConvertStatus] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [installValidated, setInstallValidated] = useState(false);
  const [targetMode, setTargetMode] = useState(DEFAULT_HP_COLORS_MOD_VARIANT);
  const [targetModeLoaded, setTargetModeLoaded] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [modePickerRequired, setModePickerRequired] = useState(false);
  const [modePickerUpgrade, setModePickerUpgrade] = useState(false);
  const latestProfileSnapshot = useRef({ profiles, activeProfileId });
  const groups = useMemo(() => splitCategoryGroups(HP_SCHEMA), []);

  const flatGroups = useMemo(() => {
    const out = [];
    const walk = (group) => { out.push(group); (group.children || []).forEach(walk); };
    groups.forEach(walk);
    return out;
  }, [groups]);

  const firstLeafKey = useMemo(() => getCategoryKey(flatGroups.find((group) => !group.children?.length) || flatGroups[0]), [flatGroups]);
  const [activeKey, setActiveKey] = useState(() => firstLeafKey);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0] || createInitialProfile(defaultState);
  const activeProfileIndex = Math.max(0, profiles.findIndex((profile) => profile.id === activeProfile.id));
  const presetName = cleanProfileName(activeProfile.name, activeProfileIndex);
  const state = activeProfile.values;
  const activeHeroMode = normalizeHeroScopeMode(activeProfile.heroMode || activeProfile.hm, activeProfile.heroes || activeProfile.hs);
  const selectedHeroIds = activeHeroMode === HP_HERO_SCOPE_SELECTED ? normalizeHeroIds(activeProfile.heroes) : [];
  const selectedHeroSet = useMemo(() => new Set(selectedHeroIds), [selectedHeroIds]);
  const heroSelectionLabel = formatHeroSelection(activeHeroMode, selectedHeroIds);
  const currentGroup = flatGroups.find((group) => getCategoryKey(group) === activeKey) || flatGroups[0];
  const visibleFields = useMemo(() => getVisibleFields(currentGroup, state), [currentGroup, state]);
  const visibleCount = visibleFields.length;
  const activeOverrideCount = countPresetOverrides(state, defaultState);
  const targetModeDetails = getTargetModeDetails(targetMode);
  const fullTargetMode = isFullTargetMode(targetMode);
  const buildProfilePresets = useMemo(
    () => getBuildProfilesForTargetMode(profiles.map(profileToPreset), targetMode),
    [profiles, targetMode]
  );
  const preview = useMemo(
    () => (previewOpen ? JSON.stringify({ targetMode, presets: buildProfilePresets }, null, 2) : ''),
    [buildProfilePresets, previewOpen, targetMode]
  );
  const canConfirmBuildVariant = canConfirmBuild({ installValidated, buildVariant: targetMode });
  const presetVpkFileName = buildPresetVpkFileName(presetName || DEFAULT_PRESET_NAME);
  const activeGitCommitInfo = freshGitCommitInfo || gitCommitInfo;
  const topPresetName = cleanProfileName(profiles[0]?.name, 0);
  const buildVariantWarning = getBuildVariantWarning({
    buildVariant: targetMode,
    profileCount: buildProfilePresets.length,
    firstPresetName: topPresetName
  });

  const openBuildWarning = useCallback(() => {
    setInstallValidated(false);
    setWarningOpen(true);
  }, []);

  function commitTargetMode(nextMode) {
    setTargetMode(nextMode);
    setModePickerOpen(false);
    setModePickerRequired(false);
    setModePickerUpgrade(false);
    setInstallValidated(false);
    setTargetModeLoaded(true);
    saveTargetModeState(typeof window !== 'undefined' ? window.localStorage : null, nextMode);
    setProfileMenuOpen(false);
    setHeroMenuOpen(false);
  }

  function openTargetModePicker() {
    setModePickerRequired(false);
    setModePickerOpen(true);
  }

  useEffect(() => {
    latestProfileSnapshot.current = { profiles, activeProfileId };
  }, [activeProfileId, profiles]);

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    const loaded = loadProfileState(storage, defaultState);
    const loadedTargetMode = loadTargetModeState(storage, { profileStorageKey: PROFILE_STORAGE_KEY });
    setProfiles(loaded.profiles);
    setActiveProfileId(loaded.activeProfileId);
    setTargetMode(loadedTargetMode.targetMode);
    setModePickerOpen(loadedTargetMode.shouldShowPicker);
    setModePickerRequired(loadedTargetMode.shouldShowPicker);
    setModePickerUpgrade(loadedTargetMode.isUpgradePrompt);
    setTargetModeLoaded(true);
    setProfilesLoaded(true);
  }, [defaultState]);

  useEffect(() => {
    if (!profilesLoaded) return;
    return scheduleIdleWork(() => {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      saveProfileState(storage, latestProfileSnapshot.current);
    });
  }, [activeProfileId, profiles, profilesLoaded]);

  useEffect(() => {
    if (!profilesLoaded || typeof window === 'undefined') return;
    const flushProfileState = () => {
      saveProfileState(window.localStorage, latestProfileSnapshot.current);
    };
    window.addEventListener('pagehide', flushProfileState);
    return () => {
      window.removeEventListener('pagehide', flushProfileState);
      flushProfileState();
    };
  }, [profilesLoaded]);

  useEffect(() => {
    let ignore = false;
    const refreshCommitInfo = async () => {
      try {
        const response = await fetch(buildGitCommitInfoRequestUrl(import.meta.env.BASE_URL), { cache: 'no-store' });
        if (!response.ok) return;
        const nextGitCommitInfo = await response.json();
        if (!ignore && isGitCommitInfoPayload(nextGitCommitInfo)) {
          setFreshGitCommitInfo(nextGitCommitInfo);
        }
      } catch {
        // Keep the statically embedded commit info when the refresh endpoint is unavailable.
      }
    };
    refreshCommitInfo();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        openBuildWarning();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  function updateActiveProfile(updater) {
    setProfiles((prev) => {
      const targetId = prev.some((profile) => profile.id === activeProfileId) ? activeProfileId : prev[0]?.id;
      return prev.map((profile) => {
        if (profile.id !== targetId) return profile;
        const patch = typeof updater === 'function' ? updater(profile) : updater;
        return { ...profile, ...patch };
      });
    });
  }

  function updateField(id, value) {
    updateActiveProfile((profile) => ({
      values: { ...profile.values, [id]: coerceHpValue(id, value) }
    }));
  }

  function renameActiveProfile(name) {
    updateActiveProfile({ name });
  }

  function handleHeroToggle(heroId) {
    const normalized = normalizeHeroIds([heroId])[0];
    if (!normalized) return;
    updateActiveProfile((profile) => {
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

  function handleClearHeroes() {
    updateActiveProfile({ heroMode: HP_HERO_SCOPE_ALL, heroes: [] });
  }

  function handleDisableHeroSelection() {
    updateActiveProfile({ heroMode: HP_HERO_SCOPE_OFF, heroes: [] });
  }

  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(getCategoryKey(cursor || group));
  }

  async function handleImport() {
    try {
      const { parseHpColorsImportProfiles } = await import('../hpImportCode.js');
      const importedProfiles = parseHpColorsImportProfiles(importText, HP_SCHEMA);
      if (importedProfiles.length <= 1) {
        const imported = importedProfiles[0];
        updateActiveProfile({ name: imported.name, values: imported.values, heroMode: imported.heroMode, heroes: imported.heroes });
        setStatus(`Imported ${cleanProfileName(imported.name, activeProfileIndex)}.`);
        return;
      }

      const usedIds = new Set(profiles.map((profile) => String(profile.id || '')));
      const appendedProfiles = importedProfiles.map((profile, index) => createProfile({
        id: nextImportedProfileId(usedIds),
        name: cleanProfileName(profile.name, profiles.length + index),
        values: profile.values,
        heroMode: profile.heroMode,
        heroes: profile.heroes
      }));
      setProfiles([...profiles, ...appendedProfiles]);
      setActiveProfileId(appendedProfiles[0].id);
      setProfileMenuOpen(true);
      setStatus(`Imported ${appendedProfiles.length} profiles from preset codes.`);
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  }

  function handleResetPage() {
    updateActiveProfile((profile) => {
      const next = { ...profile.values };
      for (const field of currentGroup?.fields || []) {
        next[field.id] = defaultState[field.id];
      }
      return { values: next };
    });
  }

  function handleResetAll() {
    updateActiveProfile({ values: { ...defaultState } });
  }

  function handleAddProfile() {
    const next = addProfile(profiles, defaultState);
    const added = next.profiles[next.profiles.length - 1];
    setProfiles(next.profiles);
    setActiveProfileId(next.activeProfileId);
    setProfileMenuOpen(true);
    setStatus(`Added ${cleanProfileName(added.name, next.profiles.length - 1)}.`);
  }

  function handleDeleteProfile() {
    if (profiles.length <= 1) return;
    const next = removeProfile(profiles, activeProfileId);
    setProfiles(next.profiles);
    setActiveProfileId(next.activeProfileId);
    setStatus(`Removed ${presetName}.`);
  }

  function handleSelectProfile(profileId) {
    setActiveProfileId(profileId);
    setProfileMenuOpen(false);
  }

  function handleDropProfile(event, toIndex) {
    event.preventDefault();
    const rawIndex = event.dataTransfer.getData('text/plain');
    const fromIndex = rawIndex === '' ? dragIndex : Number(rawIndex);
    setProfiles((prev) => reorderProfiles(prev, fromIndex, toIndex));
    setDragIndex(null);
    setStatus('Reordered profiles. First profile has highest load priority.');
  }

  async function performBuild(modVariant) {
    const activeModVariant = modVariant || targetMode;
    const activePresetName = String(presetName || DEFAULT_PRESET_NAME).trim() || DEFAULT_PRESET_NAME;
    const activePresetVpkFileName = buildPresetVpkFileName(activePresetName);
    setStatus(`Building ${activePresetVpkFileName}...`);
    try {
      const [{ BASE_HUD_SOURCE_PATH, buildHpColorsPackage }, { writeVpk }] = await Promise.all([
        import('../packageBuilder.js'),
        import('../vpkWriter.js')
      ]);
      const baseHudXml = await loadBaseHudXml();
      const buildPresets = getBuildProfilesForTargetMode(profiles.map(profileToPreset), activeModVariant);
      const { files } = buildHpColorsPackage({
        sourceTexts: { [BASE_HUD_SOURCE_PATH]: baseHudXml },
        presets: buildPresets,
        modVariant: activeModVariant
      });
      const pak = writeVpk(files);
      downloadBytes(activePresetVpkFileName, pak);
      const modLabel = activeModVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? 'minimal mod' : 'full mod';
      setStatus(`Built ${activePresetVpkFileName} for ${modLabel} (${pak.byteLength.toLocaleString()} bytes, ${buildPresets.length} profile${buildPresets.length === 1 ? '' : 's'}).`);
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  }

  async function performConvert(targetModVariant) {
    if (!convertFile) {
      setConvertStatus('Select a generated HP Colors preset VPK first.');
      return;
    }
    const targetLabel = targetModVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? 'minimal mod' : 'full mod';
    setConvertStatus(`Converting ${convertFile.name} to ${targetLabel}...`);
    try {
      const [{ convertHpColorsPresetVpk }, { writeVpk }] = await Promise.all([
        import('../vpkConverter.js'),
        import('../vpkWriter.js')
      ]);
      const baseHudXml = await loadBaseHudXml();
      const converted = convertHpColorsPresetVpk({
        vpkBytes: new Uint8Array(await convertFile.arrayBuffer()),
        baseHudXml,
        targetModVariant
      });
      const pak = writeVpk(converted.files);
      const outputName = buildConvertedVpkFileName(convertFile.name);
      downloadBytes(outputName, pak);
      setConvertStatus(`Converted ${outputName} for the ${targetLabel}.`);
      setStatus(`Converted ${outputName} for the ${targetLabel}.`);
    } catch (error) {
      const message = error?.message || String(error);
      setConvertStatus(message);
      setStatus(message);
    }
  }

  return (
    <div className="panorama-page">
      <div className="panorama-shell" role="region" aria-label="HP Colors preset builder">
        <header className="panorama-topbar">
          <div className="panorama-brand-block">
            <span className="panorama-kicker">Deadlock preset builder</span>
            <div className="panorama-title-row">
              <span className="panorama-brand">HP Colors</span>
              {activeGitCommitInfo?.url && activeGitCommitInfo?.shortHash ? (
                <a
                  className="commit-version-link"
                  href={activeGitCommitInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`}
                  data-tooltip={activeGitCommitInfo.title || `Latest commit ${activeGitCommitInfo.shortHash}`}
                >
                  <GitCommitHorizontal aria-hidden="true" />
                  <span>Commit</span>
                  <code>{activeGitCommitInfo.shortHash}</code>
                </a>
              ) : null}
            </div>
            <nav className="similar-tools" aria-label="Similar tools">
              <span className="similar-tools-label">Similar tools</span>
              <a className="similar-tool-link" href="https://hantu-raya.github.io/color-blind-web-builder/" target="_blank" rel="noreferrer">
                Color Blind Builder
              </a>
              <a className="similar-tool-link" href="https://hantu-raya.github.io/3d-hud-web-merger/" target="_blank" rel="noreferrer">
                3D HUD VPK Merger
              </a>
            </nav>
          </div>
          <div className="panorama-header-actions">
            <a className="support-button top-support-button" href="https://ko-fi.com/hantuaraya" target="_blank" rel="noreferrer" aria-label="Donate on Ko-fi">
              <Heart aria-hidden="true" />
              <span>Donate</span>
            </a>
            <a className="support-button star-repo-button" href="https://github.com/Hantu-Raya/hp-colors-preset-builder" target="_blank" rel="noreferrer" aria-label="Star the repository on GitHub">
              <Star aria-hidden="true" />
              <span>Star</span>
            </a>
            <button type="button" className="target-mode-trigger" onClick={openTargetModePicker}>
              <Layers3 aria-hidden="true" />
              <span className="target-mode-text">
                <span>Preset target</span>
                <strong>{targetModeDetails.label}</strong>
              </span>
            </button>
            <div className="topbar-profile-controls" aria-label="Preset profiles">
              <button type="button" className="profile-icon-action" onClick={handleAddProfile} aria-label="Add preset">
                <Plus aria-hidden="true" />
              </button>
              <button type="button" className="profile-icon-action" onClick={handleDeleteProfile} disabled={profiles.length <= 1} aria-label="Remove preset">
                <Trash2 aria-hidden="true" />
              </button>
              <div className="profile-selector">
                <button
                  type="button"
                  className="profile-selector-trigger"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span className="profile-selector-title">{presetName}</span>
                  <span className="profile-selector-meta">{activeOverrideCount} override{activeOverrideCount === 1 ? '' : 's'} / {profiles.length}</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                {profileMenuOpen && (
                  <div className="profile-selector-menu" role="listbox" aria-label="Preset profiles">
                    {profiles.map((profile, index) => {
                      const label = cleanProfileName(profile.name, index);
                      const overrides = countPresetOverrides(profile.values, defaultState);
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          draggable
                          className={profile.id === activeProfile.id ? 'profile-menu-row is-active' : 'profile-menu-row'}
                          role="option"
                          aria-selected={profile.id === activeProfile.id}
                          onClick={() => handleSelectProfile(profile.id)}
                          onDragStart={(event) => {
                            setDragIndex(index);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(index));
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(event) => handleDropProfile(event, index)}
                          onDragEnd={() => setDragIndex(null)}
                        >
                          <GripVertical className="profile-drag-handle" aria-hidden="true" />
                          <span className="profile-menu-text">
                            <span className="profile-row-name">{label}</span>
                            <span className="profile-row-meta">{overrides} override{overrides === 1 ? '' : 's'} / priority {index + 1}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <label className="preset-name-control" htmlFor="presetName">
              <span>Profile</span>
              <input id="presetName" className="builder-input" value={activeProfile.name} onChange={(e) => renameActiveProfile(e.target.value)} />
            </label>
            <div className="hero-selector">
              <button
                type="button"
                className="hero-selector-trigger"
                onClick={() => setHeroMenuOpen((open) => !open)}
                aria-expanded={heroMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="hero-selector-stack" aria-hidden="true">
                  {activeHeroMode === HP_HERO_SCOPE_OFF ? (
                    <span className="hero-avatar hero-avatar-all" aria-hidden="true">Off</span>
                  ) : (
                    (selectedHeroIds.length ? selectedHeroIds.slice(0, 3) : HP_HEROES.slice(0, 3).map((hero) => hero.id)).map((heroId) => (
                      <HeroAvatar key={heroId} hero={getHpHeroById(heroId)} />
                    ))
                  )}
                </span>
                <span className="hero-selector-text">
                  <span className="hero-selector-label">Heroes</span>
                  <span className="hero-selector-value">{heroSelectionLabel}</span>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {heroMenuOpen ? (
                <div className="hero-selector-menu" role="listbox" aria-label="Target heroes" aria-multiselectable="true">
                  <button
                    type="button"
                    className={activeHeroMode === HP_HERO_SCOPE_OFF ? 'hero-menu-row is-active' : 'hero-menu-row'}
                    role="option"
                    aria-selected={activeHeroMode === HP_HERO_SCOPE_OFF}
                    onClick={handleDisableHeroSelection}
                  >
                    <span className="hero-avatar hero-avatar-all" aria-hidden="true">Off</span>
                    <span className="hero-menu-name">Hero select off</span>
                    {activeHeroMode === HP_HERO_SCOPE_OFF ? <Check aria-hidden="true" /> : null}
                  </button>
                  <button
                    type="button"
                    className={activeHeroMode === HP_HERO_SCOPE_ALL ? 'hero-menu-row is-active' : 'hero-menu-row'}
                    role="option"
                    aria-selected={activeHeroMode === HP_HERO_SCOPE_ALL}
                    onClick={handleClearHeroes}
                  >
                    <span className="hero-avatar hero-avatar-all" aria-hidden="true">All</span>
                    <span className="hero-menu-name">All heroes</span>
                    {activeHeroMode === HP_HERO_SCOPE_ALL ? <Check aria-hidden="true" /> : null}
                  </button>
                  {HP_HEROES.map((hero) => {
                    const selected = selectedHeroSet.has(hero.id);
                    return (
                      <button
                        key={hero.id}
                        type="button"
                        className={selected ? 'hero-menu-row is-active' : 'hero-menu-row'}
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleHeroToggle(hero.id)}
                      >
                        <HeroAvatar hero={hero} />
                        <span className="hero-menu-name">{hero.name}</span>
                        {selected ? <Check aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <button type="button" className="build-action" onClick={openBuildWarning}>
              <Download aria-hidden="true" />
              <span>Build VPK</span>
            </button>
          </div>
        </header>

        <div className="panorama-workspace">
          <SchemaTree groups={groups} activeKey={activeKey} state={state} defaultState={defaultState} onSelect={handleSelectGroup} />

          <section className="anita-detail-panel">
            <div className="anita-detail-header-row">
              <div>
                <h2>{getCategoryPathLabel(currentGroup)}</h2>
                <p className="anita-detail-hint">
                  {visibleCount} visible controls / {profiles.length} profile{profiles.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="reset-actions">
                <button type="button" className="quiet-action" onClick={handleResetPage}>
                  <RotateCcw aria-hidden="true" />
                  <span>Page</span>
                </button>
                <button type="button" className="quiet-action" onClick={handleResetAll}>
                  <RotateCcw aria-hidden="true" />
                  <span>All</span>
                </button>
              </div>
            </div>
            <div className="detail-scroll">
              <div className="schema-field-list">
                {visibleFields.map((field) => (
                  <SchemaField key={field.id} field={field} value={state[field.id]} onChange={updateField} />
                ))}
                {visibleFields.length === 0 ? (
                  <div className="empty-panel">
                    <strong>No visible controls</strong>
                    <span>Enable the related setting in this preset to reveal the dependent options.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="anita-right-rail">
            <div className="rail-heading">
              <span className="panorama-kicker">Tools</span>
              <strong>Preset utility</strong>
            </div>
            <DisclosurePanel title="Import game preset codes" open={importOpen} onOpenChange={setImportOpen}>
              <div className="import-panel-body">
                <p className="panel-helper">
                  Paste COPY ALL from the in-game HP Colors menu, or paste several individual HP Colors codes. Bundles import as separate profiles for the selected target.
                </p>
                <textarea
                  id="importText"
                  className="builder-textarea"
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste COPY ALL or HP Colors import codes here"
                />
                <div className="rail-actions">
                  <button type="button" className="secondary-action" onClick={handleImport}>
                    <Upload aria-hidden="true" />
                    <span>Import codes</span>
                  </button>
                </div>
              </div>
            </DisclosurePanel>

            <DisclosurePanel title="Convert VPK" open={convertOpen} onOpenChange={setConvertOpen}>
              <div className="convert-panel-body">
                <label className="builder-file-control">
                  <span>Preset VPK</span>
                  <input
                    type="file"
                    accept=".vpk"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setConvertFile(nextFile);
                      setConvertStatus(nextFile ? `Ready: ${nextFile.name}` : '');
                    }}
                  />
                </label>
                <p className="panel-helper">Rebuild a generated HP Colors preset VPK for the other base mod.</p>
                <div className="convert-action-grid">
                  {!fullTargetMode ? (
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!convertFile}
                      onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.FULL)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>To Full</span>
                    </button>
                  ) : null}
                  {fullTargetMode ? (
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!convertFile}
                      onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.MINIMAL)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>To Minimal</span>
                    </button>
                  ) : null}
                </div>
                {convertStatus ? <p className="convert-status">{convertStatus}</p> : null}
              </div>
            </DisclosurePanel>

            <DisclosurePanel title="JSON preview" open={previewOpen} onOpenChange={setPreviewOpen}>
              <div className="preview-box"><pre>{preview}</pre></div>
            </DisclosurePanel>

            <div className="status-card" role="status">
              <Braces aria-hidden="true" />
              <span>{status}</span>
            </div>
          </aside>
        </div>
      </div>

      {modePickerOpen && targetModeLoaded ? (
        <div className="build-warning-modal target-mode-modal" role="dialog" aria-modal="true" aria-labelledby="targetModeTitle">
          {!modePickerRequired ? (
            <button type="button" className="build-warning-backdrop" onClick={() => setModePickerOpen(false)} aria-label="Cancel" />
          ) : (
            <div className="build-warning-backdrop" aria-hidden="true" />
          )}
          <div className="build-warning-panel target-mode-panel">
            <div className="build-warning-badge">{modePickerUpgrade ? 'New setup step' : 'Setup'}</div>
            <h3 id="targetModeTitle">Choose your HP Colors mod</h3>
            <p>
              {modePickerUpgrade
                ? 'This update needs to know which base mod your preset VPK is for. Your saved presets are still here.'
                : 'Pick the base mod that will read the preset VPK. You can change this later from the top bar.'}
            </p>
            <div className="target-mode-choice-grid" role="group" aria-label="HP Colors target mod">
              {TARGET_MODE_CHOICES.map((choice) => {
                const selected = targetMode === choice.id;
                return (
                  <div key={choice.id} className={selected ? 'target-mode-choice is-selected' : 'target-mode-choice'}>
                    <button type="button" className="target-mode-choice-select" onClick={() => commitTargetMode(choice.id)}>
                      <span className="target-mode-choice-title">
                        <Layers3 aria-hidden="true" />
                        <strong>{choice.title}</strong>
                        {selected ? <Check aria-hidden="true" /> : null}
                      </span>
                      <span className="target-mode-choice-summary">{choice.summary}</span>
                      <span className="target-mode-choice-description">{choice.description}</span>
                    </button>
                    <a className="target-mode-choice-download" href={choice.downloadHref} target="_blank" rel="noreferrer">
                      <Download aria-hidden="true" />
                      <span>Download this mod</span>
                    </a>
                  </div>
                );
              })}
            </div>
            {!modePickerRequired ? (
              <div className="build-warning-actions">
                <button type="button" className="secondary-action" onClick={() => setModePickerOpen(false)}>Cancel</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {warningOpen && (
        <div className="build-warning-modal" role="dialog" aria-modal="true" aria-labelledby="buildWarningTitle">
          <button type="button" className="build-warning-backdrop" onClick={() => setWarningOpen(false)} aria-label="Cancel" />
          <div className="build-warning-panel">
            <div className="build-warning-badge">Build target</div>
            <h3 id="buildWarningTitle">Confirm {targetModeDetails.label} preset VPK</h3>
            <div className="build-warning-summary" aria-label="Build summary">
              <div className="build-warning-item">
                <span className="build-warning-item-icon"><PakFileIcon aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Creates</span>
                  <strong>base_hud preset override</strong>
                </span>
              </div>
              <div className="build-warning-item">
                <span className="build-warning-item-icon"><Layers3 aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Pak order</span>
                  <strong>Preset number must be lower than the Full or Minimal base mod.</strong>
                </span>
              </div>
              <div className="build-warning-item is-output">
                <span className="build-warning-item-icon"><PakFileIcon showLabel aria-hidden="true" /></span>
                <span className="build-warning-item-copy">
                  <span>Output</span>
                  <strong>{presetVpkFileName}</strong>
                </span>
              </div>
            </div>
            <div className="target-mode-summary-card">
              <div>
                <span className="target-mode-summary-label">Selected base mod</span>
                <strong>{targetModeDetails.title}</strong>
                <p>{targetModeDetails.summary}</p>
                <a className="target-mode-summary-download-link" href={targetModeDetails.downloadHref} target="_blank" rel="noreferrer">
                  Need the base mod? Download it first.
                </a>
              </div>
              <div className="target-mode-summary-actions">
                <button type="button" className="secondary-action" onClick={() => {
                  setWarningOpen(false);
                  openTargetModePicker();
                }}>
                  <Layers3 aria-hidden="true" />
                  <span>Change target</span>
                </button>
              </div>
            </div>
            <div className={installValidated ? 'build-validation-card is-valid' : 'build-validation-card'}>
              <div>
                <span className="build-validation-label">Install check</span>
                {installValidated ? null : <strong>Validate the base mod first</strong>}
              </div>
              <button
                type="button"
                className="secondary-action build-validation-action"
                onClick={() => {
                  const next = getNextInstallValidationState({ installValidated, buildVariant: targetMode });
                  setInstallValidated(next.installValidated);
                }}
              >
                <ShieldCheck aria-hidden="true" />
                <span>{installValidated ? 'Unvalidate' : 'Validate install'}</span>
              </button>
            </div>
            {buildVariantWarning ? (
              <div className="build-mod-warning" role="alert" aria-live="polite">
                <span className="build-mod-warning-icon">
                  <AlertTriangle aria-hidden="true" />
                </span>
                <span className="build-mod-warning-copy">
                  <strong>{buildVariantWarning.title}</strong>
                  <span>{buildVariantWarning.message}</span>
                </span>
              </div>
            ) : null}
            <div className="build-warning-actions">
              <button type="button" className="secondary-action" onClick={() => setWarningOpen(false)}>Cancel</button>
              <button
                type="button"
                className="primary-action build-confirm-action"
                disabled={!canConfirmBuildVariant}
                onClick={async () => {
                  if (!canConfirmBuildVariant) return;
                  setWarningOpen(false);
                  await performBuild(targetMode);
                }}
              >
                <Download aria-hidden="true" />
                <span>Confirm build</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="page-footer" aria-label="Project notices">
        <p>
          Unofficial fan-made tool. Not affiliated with Valve. Runs locally; preset files are not uploaded. Built by
          {' '}
          <a href="https://github.com/Hantu-Raya" target="_blank" rel="noreferrer">Hantu-Raya</a>.
          {' '}
          Source on
          {' '}
          <a href="https://github.com/Hantu-Raya/hp-colors-preset-builder" target="_blank" rel="noreferrer">GitHub</a>.
          {' '}
          Apache-2.0 licensed; see LICENSE and NOTICE.
        </p>
      </footer>
    </div>
  );
}

function PakFileIcon({ showLabel = false, ...props }) {
  return (
    <svg className={showLabel ? 'pak-file-icon has-label' : 'pak-file-icon'} viewBox="0 0 96 96" fill="none" {...props}>
      <path
        d="M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z"
        stroke="#07110d"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M55 15v15h15"
        stroke="#07110d"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 14h23l15 15v40c0 4.8-3.8 8.6-8.6 8.6H32c-4.8 0-8.6-3.8-8.6-8.6V22.6c0-4.8 3.8-8.6 8.6-8.6Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M55 15v15h15"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLabel ? (
        <text
          x="4"
          y="90"
          fill="currentColor"
          stroke="#07110d"
          strokeWidth="2.8"
          paintOrder="stroke fill"
          strokeLinejoin="round"
          fontFamily="Consolas, 'Courier New', monospace"
          fontSize="34"
          fontWeight="900"
        >
          VPK
        </text>
      ) : null}
    </svg>
  );
}

function HeroAvatar({ hero }) {
  if (!hero) return <span className="hero-avatar hero-avatar-fallback" aria-hidden="true">?</span>;
  if (hero.icon?.src) {
    return (
      <span className="hero-avatar" aria-hidden="true">
        <img src={hero.icon.src} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className="hero-avatar"
      aria-hidden="true"
    >
      {hero.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function DisclosurePanel({ title, open, onOpenChange, children }) {
  return (
    <section className={open ? 'disclosure-panel is-open' : 'disclosure-panel'}>
      <button type="button" className="disclosure-trigger" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="disclosure-body">{children}</div> : null}
    </section>
  );
}
