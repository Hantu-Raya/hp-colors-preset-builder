import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { HP_SCHEMA } from '../hpSchema.js';
import { createDefaultFormState, splitCategoryGroups, countVisibleGroupFields, getCategoryKey, getCategoryPathLabel, isFieldVisible, sanitizeFormState } from '../hpFormModel.js';
import { BASE_HUD_SOURCE_PATH, HP_COLORS_MOD_VARIANTS, buildHpColorsPackage } from '../packageBuilder.js';
import { writeVpk } from '../vpkWriter.js';
import { downloadBytes } from '../download.js';
import { parseHpColorsImportCode } from '../hpImportCode.js';
import { buildConvertedVpkFileName, buildPresetVpkFileName } from '../presetVpkFileName.js';
import { convertHpColorsPresetVpk } from '../vpkConverter.js';
import { buildGitCommitInfoRequestUrl, isGitCommitInfoPayload } from '../gitCommitInfoRefresh.js';
import {
  canChooseBuildMod,
  canConfirmBuild,
  getBuildVariantWarning,
  getBuildChoiceVisibility,
  getNextInstallValidationState
} from '../buildModalState.js';
import { addProfile, cleanProfileName, countPresetOverrides, createInitialProfile, FIRST_PROFILE_ID, profileToPreset, removeProfile, reorderProfiles, loadProfileState, saveProfileState } from '../profileStore.js';
import { SchemaField } from './schema-field.jsx';
import { SchemaTree } from './schema-tree.jsx';

const DEFAULT_PRESET_NAME = 'Web Builder Preset';
const BUILD_MOD_CHOICES = [
  {
    id: HP_COLORS_MOD_VARIANTS.FULL,
    title: 'Full mod',
    description: 'Use with the full HP Colors mod. Keeps the Anita UI menu and live in-game customization.',
    downloadHref: 'https://gamebanana.com/mods/download/603113#FileInfo_1701236'
  },
  {
    id: HP_COLORS_MOD_VARIANTS.MINIMAL,
    title: 'Minimal mod',
    description: 'Use with the minimal mod. Preset functionality only, no Anita UI menu, favors performance.',
    downloadHref: 'https://gamebanana.com/mods/download/603113#FileInfo_1701235'
  }
];

export default function PresetBuilderIsland({ gitCommitInfo = null }) {
  const defaultState = useMemo(() => createDefaultFormState(HP_SCHEMA), []);
  const [freshGitCommitInfo, setFreshGitCommitInfo] = useState(gitCommitInfo);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('Status: Ready');
  const [profiles, setProfiles] = useState(() => [createInitialProfile(defaultState)]);
  const [activeProfileId, setActiveProfileId] = useState(FIRST_PROFILE_ID);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertFile, setConvertFile] = useState(null);
  const [convertStatus, setConvertStatus] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [installValidated, setInstallValidated] = useState(false);
  const [buildVariant, setBuildVariant] = useState(null);
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
  const currentGroup = flatGroups.find((group) => getCategoryKey(group) === activeKey) || flatGroups[0];
  const visibleCount = countVisibleGroupFields(currentGroup, state);
  const activeOverrideCount = countPresetOverrides(state, defaultState);
  const preview = useMemo(() => JSON.stringify({ presets: profiles.map(profileToPreset) }, null, 2), [profiles]);
  const canPickBuildVariant = canChooseBuildMod({ installValidated });
  const canConfirmBuildVariant = canConfirmBuild({ installValidated, buildVariant });
  const buildChoiceVisibility = getBuildChoiceVisibility({ installValidated });
  const presetVpkFileName = buildPresetVpkFileName(presetName || DEFAULT_PRESET_NAME);
  const activeGitCommitInfo = freshGitCommitInfo || gitCommitInfo;
  const topPresetName = cleanProfileName(profiles[0]?.name, 0);
  const buildVariantWarning = getBuildVariantWarning({
    buildVariant,
    profileCount: profiles.length,
    firstPresetName: topPresetName
  });

  function openBuildWarning() {
    setInstallValidated(false);
    setBuildVariant(null);
    setWarningOpen(true);
  }

  useEffect(() => {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    const loaded = loadProfileState(storage, defaultState);
    setProfiles(loaded.profiles);
    setActiveProfileId(loaded.activeProfileId);
    setProfilesLoaded(true);
  }, [defaultState]);

  useEffect(() => {
    if (!profilesLoaded) return;
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    saveProfileState(storage, { profiles, activeProfileId });
  }, [activeProfileId, profiles, profilesLoaded]);

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
      values: sanitizeFormState(HP_SCHEMA, { ...profile.values, [id]: value })
    }));
  }

  function renameActiveProfile(name) {
    updateActiveProfile({ name });
  }

  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(getCategoryKey(cursor || group));
  }

  function handleImport() {
    try {
      const importedState = parseHpColorsImportCode(importText, HP_SCHEMA);
      updateActiveProfile({ values: importedState });
      setStatus(`Imported into ${presetName}.`);
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
      return { values: sanitizeFormState(HP_SCHEMA, next) };
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
    const activeModVariant = modVariant || HP_COLORS_MOD_VARIANTS.FULL;
    const activePresetName = String(presetName || DEFAULT_PRESET_NAME).trim() || DEFAULT_PRESET_NAME;
    const activePresetVpkFileName = buildPresetVpkFileName(activePresetName);
    setStatus(`Building ${activePresetVpkFileName}...`);
    try {
      const templateUrl = `${import.meta.env.BASE_URL}templates/hp_colors/panorama/layout/base_hud.xml`;
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
      const baseHudXml = await response.text();
      const buildPresets = profiles.map(profileToPreset);
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
      const templateUrl = `${import.meta.env.BASE_URL}templates/hp_colors/panorama/layout/base_hud.xml`;
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
      const baseHudXml = await response.text();
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
                <p className="anita-detail-hint">{visibleCount} visible controls / {profiles.length} profile{profiles.length === 1 ? '' : 's'}</p>
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
                {(currentGroup?.fields || []).map((field) => (
                  isFieldVisible(field, state)
                    ? <SchemaField key={field.id} field={field} value={state[field.id]} onChange={updateField} />
                    : null
                ))}
                {(currentGroup?.fields || []).every((field) => !isFieldVisible(field, state)) ? (
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
            <DisclosurePanel title="Import preset" open={importOpen} onOpenChange={setImportOpen}>
              <div className="import-panel-body">
                <textarea
                  id="importText"
                  className="builder-textarea"
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste HP Colors import code here"
                />
                <div className="rail-actions">
                  <button type="button" className="secondary-action" onClick={handleImport}>
                    <Upload aria-hidden="true" />
                    <span>Import</span>
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
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={!convertFile}
                    onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.FULL)}
                  >
                    <RotateCcw aria-hidden="true" />
                    <span>To Full</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={!convertFile}
                    onClick={() => performConvert(HP_COLORS_MOD_VARIANTS.MINIMAL)}
                  >
                    <RotateCcw aria-hidden="true" />
                    <span>To Minimal</span>
                  </button>
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

      {warningOpen && (
        <div className="build-warning-modal" role="dialog" aria-modal="true" aria-labelledby="buildWarningTitle">
          <button type="button" className="build-warning-backdrop" onClick={() => setWarningOpen(false)} aria-label="Cancel" />
          <div className="build-warning-panel">
            <div className="build-warning-badge">Warning</div>
            <h3 id="buildWarningTitle">Choose target mod</h3>
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
            <div className={installValidated ? 'build-validation-card is-valid' : 'build-validation-card'}>
              <div>
                <span className="build-validation-label">Install check</span>
                {installValidated ? null : <strong>Validate the base mod first</strong>}
              </div>
              <button
                type="button"
                className="secondary-action build-validation-action"
                onClick={() => {
                  const next = getNextInstallValidationState({ installValidated, buildVariant });
                  setInstallValidated(next.installValidated);
                  setBuildVariant(next.buildVariant);
                }}
              >
                <ShieldCheck aria-hidden="true" />
                <span>{installValidated ? 'Unvalidate' : 'Validate install'}</span>
              </button>
            </div>
            <div className="build-mod-choice-grid" role="group" aria-label="Target HP Colors mod">
              {BUILD_MOD_CHOICES.map((choice) => {
                const selected = buildVariant === choice.id;
                return (
                  <div
                    key={choice.id}
                    className={[
                      'build-mod-choice',
                      selected ? 'is-selected' : '',
                      canPickBuildVariant ? '' : 'is-locked'
                    ].filter(Boolean).join(' ')}
                  >
                    <button
                      type="button"
                      className="build-mod-choice-select"
                      aria-pressed={selected}
                      disabled={!canPickBuildVariant}
                      onClick={() => {
                        if (!canPickBuildVariant) return;
                        setBuildVariant(choice.id);
                      }}
                    >
                      <span className="build-mod-choice-title">{choice.title}</span>
                      {buildChoiceVisibility.showDescription ? (
                        <span className="build-mod-choice-description">{choice.description}</span>
                      ) : null}
                    </button>
                    {buildChoiceVisibility.showDownload ? (
                      <a
                        className="build-mod-choice-download"
                        href={choice.downloadHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download this mod
                      </a>
                    ) : null}
                    {selected ? (
                      <span className="build-mod-choice-check" aria-hidden="true">
                        <Check />
                      </span>
                    ) : null}
                  </div>
                );
              })}
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
                  const selectedVariant = buildVariant;
                  setWarningOpen(false);
                  await performBuild(selectedVariant);
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
