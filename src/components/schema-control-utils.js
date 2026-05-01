export function normalizeHexColor(value, fallback = '#FFFFFF') {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const short = /^#([0-9a-fA-F]{3})$/.exec(withHash);
  if (short) return `#${short[1].split('').map((part) => part + part).join('').toUpperCase()}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toUpperCase();
  return fallback;
}

export function parsePositionValue(value) {
  let x = 0;
  let y = 200;
  if (Array.isArray(value)) {
    x = Number(value[0]);
    y = Number(value[1]);
  } else if (value && typeof value === 'object') {
    x = Number(value.x);
    y = Number(value.y);
  } else if (typeof value === 'string') {
    const parts = value.match(/-?\d+(?:\.\d+)?/g);
    if (parts?.length) {
      x = Number(parts[0]);
      y = parts.length > 1 ? Number(parts[1]) : y;
    }
  }
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 200 };
}

export function formatPositionValue(position) {
  const { x, y } = parsePositionValue(position);
  return `${Math.round(x)},${Math.round(y)}`;
}

export function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

export function isDefaultValue(value, defaultValue) {
  return String(value) === String(defaultValue);
}