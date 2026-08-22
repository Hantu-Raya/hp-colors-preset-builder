import { useEffect, useRef, useState } from 'preact/hooks';

const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const KOFI_LOAD_TIMEOUT_MS = 8000;
const SUPPORTER_SPEED_PX_PER_SECOND = 36;
const MIN_ANIMATION_SECONDS = 4;

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function readSupporters(sourceNode) {
  if (!sourceNode) return [];

  return Array.from(sourceNode.querySelectorAll('.kofi-leaderboard-item'))
    .map((item) => ({
      rank: cleanText(item.querySelector('.kofi-leaderboard-supporter-order')?.textContent),
      name: cleanText(item.querySelector('.kofi-leaderboard-supporter-name')?.textContent)
    }))
    .filter(({ rank, name }) => rank && name);
}

function renderSequence(entries, sequenceKey, sequenceRef = null, duplicate = false) {
  return (
    <div className="topbar-supporter-sequence" ref={sequenceRef} aria-hidden={duplicate ? 'true' : undefined}>
      {entries.map((entry, index) => (
        <span className="topbar-supporter-item" key={`${sequenceKey}-${index}`}>
          <span className="topbar-supporter-rank">{entry.rank}</span>
          <span className="topbar-supporter-name">{entry.name}</span>
        </span>
      ))}
    </div>
  );
}

export default function KofiLeaderboardTicker() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading');
  const [duration, setDuration] = useState(MIN_ANIMATION_SECONDS);
  const sequenceRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const sourceNode = document.getElementById('kofi-leaderboard-embed');
    if (!sourceNode) {
      setStatus('static');
      return undefined;
    }
    let timeoutId = window.setTimeout(() => {
      setEntries([]);
      setStatus('static');
    }, KOFI_LOAD_TIMEOUT_MS);
    const finishWithSupporters = (nextEntries) => {
      if (!nextEntries.length) return false;
      window.clearTimeout(timeoutId);
      setEntries(nextEntries);
      setStatus('populated');
      return true;
    };
    const readSource = () => {
      if (sourceNode.dataset.leaderboardStatus === 'error') {
        window.clearTimeout(timeoutId);
        setEntries([]);
        setStatus('static');
        return;
      }
      const nextEntries = readSupporters(sourceNode);
      const generatedItems = sourceNode?.querySelectorAll('.kofi-leaderboard-item').length || 0;
      if (finishWithSupporters(nextEntries)) return;
      if (generatedItems) {
        window.clearTimeout(timeoutId);
        setEntries([]);
        setStatus('static');
      }
    };

    readSource();
    let observer = null;
    if (sourceNode && 'MutationObserver' in window) {
      observer = new window.MutationObserver(readSource);
      observer.observe(sourceNode, { attributes: true, childList: true, subtree: true, characterData: true });
    }

    const script = document.querySelector('script[defer][src$="/leaderboard.js"]');
    const handleScriptError = () => {
      window.clearTimeout(timeoutId);
      setEntries([]);
      setStatus('static');
    };
    script?.addEventListener('error', handleScriptError);

    return () => {
      window.clearTimeout(timeoutId);
      observer?.disconnect();
      script?.removeEventListener('error', handleScriptError);
    };
  }, []);


  useEffect(() => {
    if (status !== 'populated' || typeof window === 'undefined') return undefined;

    const sequence = sequenceRef.current;
    if (!sequence) return undefined;
    const measureSequence = () => {
      const width = sequence.getBoundingClientRect().width || sequence.scrollWidth;
      if (width > 0) setDuration(Math.max(MIN_ANIMATION_SECONDS, width / SUPPORTER_SPEED_PX_PER_SECOND));
    };

    measureSequence();
    if ('ResizeObserver' in window) {
      const observer = new window.ResizeObserver(measureSequence);
      observer.observe(sequence);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measureSequence);
    return () => window.removeEventListener('resize', measureSequence);
  }, [entries, status]);

  const className = status === 'static'
    ? 'topbar-supporter-strip is-static'
    : 'topbar-supporter-strip';
  const accessibleLabel = entries.length
    ? `Ko-fi top supporters: ${entries.map(({ rank, name }) => `${rank} ${name}`).join(', ')}`
    : undefined;

  return (
    <div className={className} role="group">
      <span className="topbar-supporter-label" aria-hidden="true">Top supporters</span>
      <a
        className="topbar-supporter-window"
        href={KOFI_LEADERBOARD_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={accessibleLabel}
      >
        {status === 'loading' ? <span className="topbar-supporter-loading">Loading top supporters</span> : null}
        {status === 'static' ? <span className="topbar-supporter-static">View Ko-fi leaderboard</span> : null}
        {status === 'populated' ? (
          <div
            className="topbar-supporter-track"
            aria-hidden="true"
            style={{ '--topbar-supporter-duration': `${duration}s` }}
          >
            {renderSequence(entries, 'primary', sequenceRef)}
            {renderSequence(entries, 'duplicate', null, true)}
          </div>
        ) : null}
      </a>
    </div>
  );
}
