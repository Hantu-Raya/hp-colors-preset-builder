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
import { HP_FIELD_CATALOG } from '../hpSchema.js';
import {
  getHpHeroById,
  HP_HEROES,
  HP_HERO_SCOPE_ALL,
  HP_HERO_SCOPE_OFF
} from '../hpHeroData.js';
import { HP_COLORS_MOD_VARIANTS } from '../hpModVariants.js';
import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from '../gitCommitInfoRefresh.js';
import { TARGET_MODE_CHOICES } from '../targetModeStore.js';
import { cleanProfileName, createProfilePersistenceSnapshot, saveProfileState } from '../profileStore.js';
import {
  createPresetBuilderSession,
  loadPresetBuilderSession,
  reducePresetBuilderSession,
  selectPresetBuilderSession
} from '../presetBuilderSession.js';
import {
  commitPresetBuilderTargetMode,
  createBaseHudXmlLoader,
  runPresetBuildWorkflow,
  runPresetConvertWorkflow,
  runPresetImportWorkflow
} from '../presetBuilderWorkflow.js';
import { SchemaField } from './schema-field.jsx';
import { SchemaTree } from './schema-tree.jsx';



function scheduleIdleWork(callback) {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 800 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 160);
  return () => window.clearTimeout(id);
}


export default function PresetBuilderIsland({ gitCommitInfo = null }) {
  const defaultState = useMemo(() => HP_FIELD_CATALOG.createDefaultState(), []);
  const [freshGitCommitInfo, setFreshGitCommitInfo] = useState(gitCommitInfo);
  const [session, setSession] = useState(() => createPresetBuilderSession(defaultState));
  const latestProfileSnapshot = useRef(createProfilePersistenceSnapshot(session));
  const groups = useMemo(() => HP_FIELD_CATALOG.splitCategoryGroups(), []);
  const initialSelection = useMemo(
    () => selectPresetBuilderSession(session, defaultState, groups, null),
    [defaultState, groups, session]
  );
  const [activeKey, setActiveKey] = useState(() => initialSelection.firstLeafKey);
  const selectedSession = useMemo(
    () => selectPresetBuilderSession(session, defaultState, groups, activeKey),
    [activeKey, defaultState, groups, session]
  );
  const {
    activeProfile,
    activeProfileIndex,
    presetName,
    state,
    activeHeroMode,
    selectedHeroIds,
    selectedHeroSet,
    heroSelectionLabel,
    currentGroup,
    visibleFields,
    visibleCount,
    activeOverrideCount,
    targetModeDetails,
    fullTargetMode,
    buildProfilePresets,
    preview,
    canConfirmBuildVariant,
    presetVpkFileName,
    buildVariantWarning
  } = selectedSession;
  const activeGitCommitInfo = freshGitCommitInfo || gitCommitInfo;
  const {
    importText,
    status,
    profiles,
    activeProfileId,
    profilesLoaded,
    profileMenuOpen,
    heroMenuOpen,
    dragIndex,
    importOpen,
    convertOpen,
    convertFile,
    convertStatus,
    previewOpen,
    warningOpen,
    installValidated,
    targetMode,
    targetModeLoaded,
    modePickerOpen,
    modePickerRequired,
    modePickerUpgrade
  } = session;

  const loadBaseHudXml = useMemo(
    () => createBaseHudXmlLoader({ baseUrl: import.meta.env.BASE_URL }),
    []
  );

  const dispatchSessionIntent = useCallback((intent, context) => {
    setSession((prev) => reducePresetBuilderSession(prev, intent, context));
  }, []);

  const openBuildWarning = useCallback(() => {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'OPEN_BUILD_WARNING' }));
  }, []);

  function commitTargetMode(nextMode) {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    setSession((prev) => commitPresetBuilderTargetMode({ session: prev, targetMode: nextMode, storage }));
  }

  function openTargetModePicker() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'OPEN_TARGET_MODE_PICKER' }));
  }

  useEffect(() => {
    latestProfileSnapshot.current = createProfilePersistenceSnapshot(session);
  }, [session]);

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    setSession(loadPresetBuilderSession(storage, defaultState));
  }, [defaultState]);

  useEffect(() => {
    if (!profilesLoaded) return;
    return scheduleIdleWork(() => {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      saveProfileState(storage, latestProfileSnapshot.current);
    });
  }, [profilesLoaded, session]);

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

  function updateField(id, value) {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'UPDATE_FIELD', id, value }));
  }

  function renameActiveProfile(name) {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'RENAME_ACTIVE_PROFILE', name }));
  }

  function handleHeroToggle(heroId) {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'TOGGLE_HERO', heroId }));
  }

  function handleClearHeroes() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'CLEAR_HEROES' }));
  }

  function handleDisableHeroSelection() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'DISABLE_HERO_SELECTION' }));
  }

  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(HP_FIELD_CATALOG.getCategoryKey(cursor || group));
  }

  const handleImport = useCallback(() => runPresetImportWorkflow({
    importText,
    defaultState,
    groups,
    activeKey,
    dispatch: dispatchSessionIntent
  }), [activeKey, defaultState, dispatchSessionIntent, groups, importText]);

  function handleResetPage() {
    setSession((prev) => reducePresetBuilderSession(prev, {
      type: 'RESET_FIELDS',
      fieldIds: (currentGroup?.fields || []).map((field) => field.id),
      defaultState
    }));
  }

  function handleResetAll() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'RESET_ALL_FIELDS', defaultState }));
  }

  function handleAddProfile() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'ADD_PROFILE', defaultState }));
  }

  function handleDeleteProfile() {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'DELETE_ACTIVE_PROFILE' }, { presetName }));
  }

  function handleSelectProfile(profileId) {
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'SELECT_PROFILE', profileId }));
  }

  function handleDropProfile(event, toIndex) {
    event.preventDefault();
    const rawIndex = event.dataTransfer.getData('text/plain');
    const fromIndex = rawIndex === '' ? dragIndex : Number(rawIndex);
    setSession((prev) => reducePresetBuilderSession(prev, { type: 'DROP_PROFILE', fromIndex, toIndex }));
  }

  const performBuild = useCallback((modVariant) => runPresetBuildWorkflow({
    selection: selectedSession,
    targetMode: modVariant || targetMode,
    loadBaseHudXml,
    dispatch: dispatchSessionIntent
  }), [dispatchSessionIntent, loadBaseHudXml, selectedSession, targetMode]);

  const performConvert = useCallback((targetModVariant) => runPresetConvertWorkflow({
    convertFile,
    targetModVariant,
    loadBaseHudXml,
    dispatch: dispatchSessionIntent
  }), [convertFile, dispatchSessionIntent, loadBaseHudXml]);

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
                  onClick={() => setSession((prev) => ({ ...prev, profileMenuOpen: !prev.profileMenuOpen }))}
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
                      const overrides = HP_FIELD_CATALOG.countOverrides(profile.values, defaultState);
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
                            setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_DRAG_INDEX', dragIndex: index }));
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(index));
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(event) => handleDropProfile(event, index)}
                          onDragEnd={() => setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_DRAG_INDEX', dragIndex: null }))}
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
                onClick={() => setSession((prev) => ({ ...prev, heroMenuOpen: !prev.heroMenuOpen }))}
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
                <h2>{HP_FIELD_CATALOG.getCategoryPathLabel(currentGroup)}</h2>
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
            <DisclosurePanel title="Import game preset codes" open={importOpen} onOpenChange={(open) => setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_IMPORT_OPEN', open }))}>
              <div className="import-panel-body">
                <p className="panel-helper">
                  Paste COPY ALL from the in-game HP Colors menu, or paste several individual HP Colors codes. Bundles import as separate profiles for the selected target.
                </p>
                <textarea
                  id="importText"
                  className="builder-textarea"
                  rows={5}
                  value={importText}
                  onChange={(e) => setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_IMPORT_TEXT', text: e.target.value }))}
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

            <DisclosurePanel title="Convert VPK" open={convertOpen} onOpenChange={(open) => setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_CONVERT_OPEN', open }))}>
              <div className="convert-panel-body">
                <label className="builder-file-control">
                  <span>Preset VPK</span>
                  <input
                    type="file"
                    accept=".vpk"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_CONVERT_FILE', file: nextFile }));
                      setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_CONVERT_STATUS', status: nextFile ? `Ready: ${nextFile.name}` : '' }));
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

            <DisclosurePanel title="JSON preview" open={previewOpen} onOpenChange={(open) => setSession((prev) => reducePresetBuilderSession(prev, { type: 'SET_PREVIEW_OPEN', open }))}>
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
            <button type="button" className="build-warning-backdrop" onClick={() => setSession((prev) => ({ ...prev, modePickerOpen: false }))} aria-label="Cancel" />
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
                <button type="button" className="secondary-action" onClick={() => setSession((prev) => ({ ...prev, modePickerOpen: false }))}>Cancel</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {warningOpen && (
        <div className="build-warning-modal" role="dialog" aria-modal="true" aria-labelledby="buildWarningTitle">
          <button type="button" className="build-warning-backdrop" onClick={() => setSession((prev) => reducePresetBuilderSession(prev, { type: 'CLOSE_BUILD_WARNING' }))} aria-label="Cancel" />
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
                  setSession((prev) => reducePresetBuilderSession(prev, { type: 'CLOSE_BUILD_WARNING' }));
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
                  setSession((prev) => reducePresetBuilderSession(prev, { type: 'TOGGLE_INSTALL_VALIDATION' }));
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
              <button type="button" className="secondary-action" onClick={() => setSession((prev) => reducePresetBuilderSession(prev, { type: 'CLOSE_BUILD_WARNING' }))}>Cancel</button>
              <button
                type="button"
                className="primary-action build-confirm-action"
                disabled={!canConfirmBuildVariant}
                onClick={async () => {
                  if (!canConfirmBuildVariant) return;
                  setSession((prev) => reducePresetBuilderSession(prev, { type: 'CLOSE_BUILD_WARNING' }));
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
