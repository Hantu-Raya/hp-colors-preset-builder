import React, { useEffect, useMemo, useState } from 'react';
import { Braces, ChevronDown, Download, GripVertical, Heart, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { HP_SCHEMA } from '../hpSchema.js';
import { createDefaultFormState, splitCategoryGroups, countVisibleGroupFields, getCategoryKey, getCategoryPathLabel, isFieldVisible, sanitizeFormState } from '../hpFormModel.js';
import { buildHpColorsPackage } from '../packageBuilder.js';
import { writeVpkWithDeadMod } from '../deadModPacker.js';
import { writeVpk } from '../vpkWriter.js';
import { downloadBytes } from '../download.js';
import { parseHpColorsImportCode } from '../hpImportCode.js';
import { addProfile, cleanProfileName, countPresetOverrides, createInitialProfile, FIRST_PROFILE_ID, profileToPreset, removeProfile, reorderProfiles, loadProfileState, saveProfileState } from '../profileStore.js';
import { Input } from './ui/input.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Textarea } from './ui/textarea.jsx';
import { SchemaField } from './schema-field.jsx';
import { SchemaTree } from './schema-tree.jsx';

const WARNING_LINES = [
  'This builder writes an override for base_hud.',
  'pak number of the preset must be lower than the custom color mod.',
  'Acknowledge to continue building pak96_dir.vpk.'
];

export default function PresetBuilderIsland() {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('Status: Ready');
  const defaultState = useMemo(() => createDefaultFormState(HP_SCHEMA), []);
  const [profiles, setProfiles] = useState(() => [createInitialProfile(defaultState)]);
  const [activeProfileId, setActiveProfileId] = useState(FIRST_PROFILE_ID);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
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
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        setWarningOpen(true);
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

  async function performBuild() {
    setStatus('Building pak96_dir.vpk...');
    try {
      const templateUrl = `${import.meta.env.BASE_URL}templates/hp_colors/panorama/layout/base_hud.xml`;
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
      const baseHudXml = await response.text();
      const buildPresets = profiles.map(profileToPreset);
      const { files } = buildHpColorsPackage({ sourceTexts: { 'templates/hp_colors/panorama/layout/base_hud.xml': baseHudXml }, presets: buildPresets });
      let pak;
      try { pak = await writeVpkWithDeadMod(files); } catch { pak = writeVpk(files); }
      downloadBytes('pak96_dir.vpk', pak);
      setStatus(`Built pak96_dir.vpk (${pak.byteLength.toLocaleString()} bytes, ${buildPresets.length} profile${buildPresets.length === 1 ? '' : 's'}).`);
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  }

  return (
    <div className="panorama-page">
      <div className="panorama-shell" role="region" aria-label="HP Colors preset builder">
        <header className="panorama-topbar">
          <div className="panorama-brand-block">
            <span className="panorama-kicker">Deadlock preset builder</span>
            <span className="panorama-brand">HP Colors</span>
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
              <Input id="presetName" value={activeProfile.name} onChange={(e) => renameActiveProfile(e.target.value)} />
            </label>
            <button type="button" className="build-action" onClick={() => setWarningOpen(true)}>
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
            <ScrollArea className="detail-scroll">
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
            </ScrollArea>
          </section>

          <aside className="anita-right-rail">
            <div className="rail-heading">
              <span className="panorama-kicker">Tools</span>
              <strong>Preset utility</strong>
            </div>
            <DisclosurePanel title="Import preset" open={importOpen} onOpenChange={setImportOpen}>
              <div className="import-panel-body">
                <Textarea id="importText" rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste HP Colors import code here" />
                <div className="rail-actions">
                  <button type="button" className="secondary-action" onClick={handleImport}>
                    <Upload aria-hidden="true" />
                    <span>Import</span>
                  </button>
                </div>
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
            <h3 id="buildWarningTitle">Check load order before build</h3>
            {WARNING_LINES.map((line) => <p key={line}>{line}</p>)}
            <div className="build-warning-actions">
              <button type="button" className="secondary-action" onClick={() => setWarningOpen(false)}>Cancel</button>
              <button type="button" className="primary-action" onClick={async () => { setWarningOpen(false); await performBuild(); }}>
                <Download aria-hidden="true" />
                <span>Build now</span>
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
