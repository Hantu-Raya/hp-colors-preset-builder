import { useEffect, useRef, useState } from 'preact/hooks';

const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const SUPPORTER_SPEED_PX_PER_SECOND = 36;
const MIN_ANIMATION_SECONDS = 4;
const SUPPORTERS = [
  { name: 'civo', total: 100 },
  { name: 'dacooder', total: 20 },
  { name: 'DimpuMudit', total: 17 },
  { name: 'Ko-fi Supporter', total: 10 },
  { name: 'Ko-fi Supporter', total: 5 },
  { name: 'greggey', total: 5 },
  { name: 'Timmcd', total: 5 }
];
const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatDonation(total) {
  return USD_FORMATTER.format(total);
}

function renderSequence(sequenceKey, sequenceRef = null, duplicate = false) {
  return (
    <div className="topbar-supporter-sequence" ref={sequenceRef} aria-hidden={duplicate ? 'true' : undefined}>
      {SUPPORTERS.map((entry, index) => (
        <span className={`topbar-supporter-item${index < 3 ? ` topbar-supporter-place-${index + 1}` : ''}`} key={`${sequenceKey}-${entry.name}-${index}`}>
          <span className="topbar-supporter-rank">{index + 1}</span>
          <span className="topbar-supporter-name">{entry.name}</span>
          <span className="topbar-supporter-amount">{formatDonation(entry.total)}</span>
        </span>
      ))}
    </div>
  );
}

export default function KofiLeaderboardTicker() {
  const [duration, setDuration] = useState(MIN_ANIMATION_SECONDS);
  const sequenceRef = useRef(null);

  useEffect(() => {
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
  }, []);

  const accessibleLabel = `Ko-fi top supporters: ${SUPPORTERS
    .map(({ name, total }, index) => `${index + 1} ${name} ${formatDonation(total)}`)
    .join(', ')}`;

  return (
    <div className="topbar-supporter-strip" role="group">
      <span className="topbar-supporter-label" aria-hidden="true">Top supporters</span>
      <a
        className="topbar-supporter-window"
        href={KOFI_LEADERBOARD_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={accessibleLabel}
      >
        <div
          className="topbar-supporter-track"
          aria-hidden="true"
          style={{ '--topbar-supporter-duration': `${duration}s` }}
        >
          {renderSequence('primary', sequenceRef)}
          {renderSequence('duplicate', null, true)}
        </div>
      </a>
    </div>
  );
}
