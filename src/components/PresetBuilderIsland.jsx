import React, { useMemo, useState } from 'react';
import { HP_SCHEMA } from '../hpSchema.js';
import { createDefaultFormState, splitCategoryGroups, countVisibleGroupFields, getCategoryKey, getCategoryPathLabel, isFieldVisible, sanitizeFormState } from '../hpFormModel.js';
import { buildHpColorsPackage } from '../packageBuilder.js';
import { writeVpkWithDeadMod } from '../deadModPacker.js';
import { writeVpk } from '../vpkWriter.js';
import { downloadBytes } from '../download.js';
import { parseHpColorsImportCode } from '../hpImportCode.js';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Separator } from './ui/separator.jsx';
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
  const [status, setStatus] = useState('Ready.');
  const [state, setState] = useState(() => createDefaultFormState(HP_SCHEMA));
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
    <div className="builder-shell">
      <header className="builder-header">
        <div>
          <h1>HP Colors Web Builder</h1>
          <p>Compact preset editing with a three-zone layout.</p>
        </div>
        <div className="header-actions">
          <div className="field-stack compact">
            <Label htmlFor="presetName">Preset name</Label>
            <Input id="presetName" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          </div>
          <Button type="button" onClick={() => setWarningOpen(true)}>Build pak96_dir.vpk</Button>
        </div>
      </header>

      <div className="builder-grid">
        <Card className="rail-card left-rail">
          <CardHeader>
            <CardTitle>Schema tree</CardTitle>
            <CardDescription>Jump by hp_colors grouping.</CardDescription>
          </CardHeader>
            <CardContent><SchemaTree groups={groups} activeKey={activeKey} state={state} onSelect={handleSelectGroup} /></CardContent>
        </Card>

        <Card className="rail-card center-rail">
          <CardHeader>
            <CardTitle>{getCategoryPathLabel(currentGroup)}</CardTitle>
            <CardDescription>{visibleCount} visible controls</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="center-scroll">
              <div className="field-stack">
                {(currentGroup?.fields || []).map((field) => isFieldVisible(field, state) ? <SchemaField key={field.id} field={field} value={state[field.id]} onChange={updateField} /> : null)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rail-card right-rail">
          <CardHeader>
            <CardTitle>Preview & status</CardTitle>
            <CardDescription>Import stays close to build.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="field-stack">
              <div className="field-stack compact">
                <Label htmlFor="importText">Import preset</Label>
                <Textarea id="importText" rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste HP Colors import code here" />
                <Button type="button" variant="secondary" onClick={handleImport}>Import preset state</Button>
              </div>
              <Separator />
              <div className="preview-box"><pre>{preview}</pre></div>
              <p role="status" className="status-text">{status}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {warningOpen && (
        <div className="build-warning-modal" role="dialog" aria-modal="true" aria-labelledby="buildWarningTitle">
          <div className="build-warning-backdrop" />
          <div className="build-warning-panel panel">
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
    </div>
  );
}
