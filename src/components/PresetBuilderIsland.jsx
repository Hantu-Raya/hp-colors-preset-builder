import React, { useMemo, useState } from 'react';
import { HP_SCHEMA } from '../hpSchema.js';
import { createDefaultFormState, splitCategoryGroups, countVisibleGroupFields, getCategoryKey, getCategoryPathLabel, isFieldVisible, sanitizeFormState } from '../hpFormModel.js';
import { buildHpColorsPackage } from '../packageBuilder.js';
import { writeVpkWithDeadMod } from '../deadModPacker.js';
import { writeVpk } from '../vpkWriter.js';
import { downloadBytes } from '../download.js';
import { parseHpColorsImportCode } from '../hpImportCode.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Textarea } from './ui/textarea.jsx';
import { SchemaField } from './schema-field.jsx';
import { SchemaTree } from './schema-tree.jsx';

const DEFAULT_PRESET_NAME = 'Web Builder Preset';
const WARNING_LINES = [
  'This builder writes an override for base_hud.',
  'pak number of the preset must be lower than the custom color mod.',
  'Acknowledge to continue building pak96_dir.vpk.'
];

export default function PresetBuilderIsland() {
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('Status: Ready');
  const defaultState = useMemo(() => createDefaultFormState(HP_SCHEMA), []);
  const [state, setState] = useState(() => defaultState);
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

  const currentGroup = flatGroups.find((group) => getCategoryKey(group) === activeKey) || flatGroups[0];
  const visibleCount = countVisibleGroupFields(currentGroup, state);
  const preview = useMemo(() => JSON.stringify({ name: presetName, version: 1, values: state }, null, 2), [presetName, state]);

  function updateField(id, value) {
    setState((prev) => sanitizeFormState(HP_SCHEMA, { ...prev, [id]: value }));
  }

  function handleSelectGroup(group) {
    let cursor = group;
    while (cursor?.children?.length) cursor = cursor.children[0];
    setActiveKey(getCategoryKey(cursor || group));
  }

  function handleImport() {
    try {
      setState(parseHpColorsImportCode(importText, HP_SCHEMA));
      setStatus('Imported preset state.');
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  }

  function handleResetPage() {
    setState((prev) => {
      const next = { ...prev };
      for (const field of currentGroup?.fields || []) {
        next[field.id] = defaultState[field.id];
      }
      return sanitizeFormState(HP_SCHEMA, next);
    });
  }

  function handleResetAll() {
    setState(defaultState);
  }

  async function performBuild() {
    setStatus('Building pak96_dir.vpk...');
    try {
      const templateUrl = `${import.meta.env.BASE_URL}templates/hp_colors/panorama/layout/base_hud.xml`;
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
      const baseHudXml = await response.text();
      const preset = { name: String(presetName || DEFAULT_PRESET_NAME).trim() || DEFAULT_PRESET_NAME, version: 1, values: state };
      const { files } = buildHpColorsPackage({ sourceTexts: { 'templates/hp_colors/panorama/layout/base_hud.xml': baseHudXml }, preset });
      let pak;
      try { pak = await writeVpkWithDeadMod(files); } catch { pak = writeVpk(files); }
      downloadBytes('pak96_dir.vpk', pak);
      setStatus(`Built pak96_dir.vpk (${pak.byteLength.toLocaleString()} bytes).`);
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  }

  return (
    <div className="panorama-page">
      <div className="panorama-shell" role="region" aria-label="HP Colors preset builder">
        <header className="panorama-topbar">
          <span className="panorama-brand">HP Colors</span>
          <div className="panorama-header-actions">
            <div className="preset-name-control">
              <Label htmlFor="presetName">Preset name</Label>
              <Input id="presetName" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            </div>
            <button type="button" className="build-action" onClick={() => setWarningOpen(true)}>Build pak96_dir.vpk</button>
          </div>
        </header>

        <div className="panorama-workspace">
          <SchemaTree groups={groups} activeKey={activeKey} state={state} defaultState={defaultState} onSelect={handleSelectGroup} />

          <section className="anita-detail-panel">
            <div className="anita-detail-header-row">
              <div>
                <h2>{getCategoryPathLabel(currentGroup)}</h2>
                <p className="anita-detail-hint">{visibleCount} visible controls</p>
              </div>
              <div className="reset-actions">
                <Button type="button" variant="outline" size="sm" onClick={handleResetPage}>Reset page</Button>
                <Button type="button" variant="outline" size="sm" onClick={handleResetAll}>Reset all</Button>
              </div>
            </div>
            <ScrollArea className="detail-scroll">
              <div className="schema-field-list">
                {(currentGroup?.fields || []).map((field) => isFieldVisible(field, state) ? <SchemaField key={field.id} field={field} value={state[field.id]} onChange={updateField} /> : null)}
              </div>
            </ScrollArea>
          </section>

          <aside className="anita-right-rail">
            <DisclosurePanel title="Import preset" open={importOpen} onOpenChange={setImportOpen}>
              <div className="import-panel-body">
                <Textarea id="importText" rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste HP Colors import code here" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button type="button" variant="secondary" onClick={handleImport}>Import preset state</Button>
                </div>
              </div>
            </DisclosurePanel>

            <DisclosurePanel title="JSON preview" open={previewOpen} onOpenChange={setPreviewOpen}>
              <div className="preview-box"><pre>{preview}</pre></div>
            </DisclosurePanel>

            <p role="status" className="status-text">{status}</p>
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
              <Button type="button" variant="outline" onClick={() => setWarningOpen(false)}>Cancel</Button>
              <Button type="button" onClick={async () => { setWarningOpen(false); await performBuild(); }}>Acknowledge</Button>
            </div>
          </div>
        </div>
      )}

      <footer className="page-footer" aria-label="Project notices">
        <p>
          Unofficial fan-made tool. Not affiliated with Valve.
          {' '}
          Third-party components and bundled runtime files are listed in NOTICE.md.
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