import { useEffect, useRef, useState } from 'preact/hooks';

const KOFI_LEADERBOARD_URL = 'https://ko-fi.com/hantuaraya/leaderboard';
const SUPPORTER_SPEED_PX_PER_SECOND = 36;
const MIN_ANIMATION_SECONDS = 4;

function renderSequence(supporters, sequenceKey, sequenceRef = null, duplicate = false) {
  return (
    <div className="topbar-supporter-sequence" ref={sequenceRef} aria-hidden={duplicate ? 'true' : undefined}>
      {supporters.map(({ displayName }, index) => (
        <span className="topbar-supporter-item" key={`${sequenceKey}-${index}-${displayName}`}>
          <span className="topbar-supporter-name">{displayName}</span>
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

  const accessibleLabel = `Ko-fi supporters: ${supporters
    .map(({ displayName }) => displayName)
    .join(', ')}`;

  return (
    <div className="topbar-supporter-strip" role="group">
      <span className="topbar-supporter-label" aria-hidden="true">Supporters</span>
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
