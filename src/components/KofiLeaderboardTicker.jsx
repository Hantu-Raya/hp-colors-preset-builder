import { useEffect, useRef, useState } from 'preact/hooks';

const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const SUPPORTER_SPEED_PX_PER_SECOND = 36;
const MIN_ANIMATION_SECONDS = 4;
const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatDonation(total) {
  return USD_FORMATTER.format(total);
}

function renderSequence(supporters, sequenceKey, sequenceRef = null, duplicate = false) {
  return (
    <div className="topbar-supporter-sequence" ref={sequenceRef} aria-hidden={duplicate ? 'true' : undefined}>
      {supporters.map((entry) => (
        <span className={`topbar-supporter-item${entry.rank <= 3 ? ` topbar-supporter-place-${entry.rank}` : ''}`} key={`${sequenceKey}-${entry.rank}`}>
          <span className="topbar-supporter-rank">{entry.rank}</span>
          <span className="topbar-supporter-name">{entry.displayName}</span>
          <span className="topbar-supporter-amount">{formatDonation(entry.totalUsd)}</span>
        </span>
      ))}
    </div>
  );
}

export default function KofiLeaderboardTicker({ supporters }) {
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

  const accessibleLabel = `Ko-fi top supporters: ${supporters
    .map(({ rank, displayName, totalUsd }) => `${rank} ${displayName} ${formatDonation(totalUsd)}`)
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
          {renderSequence(supporters, 'primary', sequenceRef)}
          {renderSequence(supporters, 'duplicate', null, true)}
        </div>
      </a>
    </div>
  );
}
