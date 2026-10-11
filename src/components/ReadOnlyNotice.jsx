import { GAMEBANANA_MOD_URL } from '../builderReadOnly.js';

export default function ReadOnlyNotice() {
  return (
    <div className="read-only-overlay">
      <section className="read-only-notice" role="note" aria-labelledby="readOnlyTitle">
        <h2 id="readOnlyTitle">This builder is now read-only</h2>
        <p>
          HP Colors Rewritev2 now saves your settings and presets locally in game.
          Get the latest version from the GameBanana page.
        </p>
        <a className="read-only-link" href={GAMEBANANA_MOD_URL} target="_blank" rel="noreferrer">
          Open GameBanana page
        </a>
      </section>
    </div>
  );
}
