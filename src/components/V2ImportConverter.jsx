import { useMemo, useState } from 'preact/hooks';
import { convertImportTextToHpv2 } from '../v2ImportConverter.js';

export default function V2ImportConverter({ baseUrl = '/' }) {
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const v2Href = useMemo(
    () => `${String(baseUrl || '/').replace(/\/?$/, '/')}v2/`,
    [baseUrl]
  );

  function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const converted = convertImportTextToHpv2({
        importText,
        storage: window.localStorage,
        baseUrl
      });
      setFeedback({
        type: 'success',
        message: `Converted ${converted.importedCount} preset${converted.importedCount === 1 ? '' : 's'}. Opening HPv2…`
      });
      window.location.assign(converted.href);
    } catch (error) {
      setFeedback({ type: 'error', message: error?.message || String(error) });
      setBusy(false);
    }
  }

  return (
    <section className="v2-import-converter" aria-labelledby="v2-import-title">
      <div className="v2-import-converter-copy">
        <p className="eyebrow">Legacy import handoff</p>
        <h1 id="v2-import-title">Convert HP Colors presets to HPv2</h1>
        <p>
          Paste a V1 preset code or JSON export. The converter preserves its profiles,
          hero targeting, values, and signature-tier conditions, then opens the current HPv2 builder.
        </p>
      </div>

      <form className="v2-import-converter-form" onSubmit={submit}>
        <label htmlFor="v2-import-source">Preset code or JSON</label>
        <textarea
          id="v2-import-source"
          value={importText}
          onInput={(event) => setImportText(event.currentTarget.value)}
          rows={12}
          spellCheck={false}
          autoComplete="off"
          placeholder="Paste [ANITA-v1-hp_colors] data, an HP Colors import code, or exported JSON"
        />
        <div className="v2-import-converter-actions">
          <button type="submit" disabled={busy || !importText.trim()}>
            {busy ? 'Converting…' : 'Convert and open HPv2'}
          </button>
          <a href={v2Href}>Open V2 without importing</a>
        </div>
        {feedback ? (
          <p className={`v2-import-converter-feedback is-${feedback.type}`} role="status">
            {feedback.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
