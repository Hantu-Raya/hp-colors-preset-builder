import { HP_PRESET_SCHEMA } from "./contracts/hpColorsPresetContract.js";

export const HP_SCHEMA = HP_PRESET_SCHEMA;

function canonicalHexColor(value) {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return "";

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }
  return `#${hex}`.toUpperCase();
}

function normalizeHexColorValue(value, fallback = "#FFFFFF") {
  return canonicalHexColor(value) || canonicalHexColor(fallback) || "#FFFFFF";
}

function coerceValue(key, value) {
  const spec = HP_SCHEMA[key];
  if (!spec) return undefined;
  if (spec.type === "toggle") {
    if (value === true || value === false) return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    if (typeof value === "string") {
      const lowered = value.toLowerCase();
      if (lowered === "true") return true;
      if (lowered === "false") return false;
    }
    return !!spec.defaultValue;
  }
  if (spec.type === "colorpicker") {
    return normalizeHexColorValue(value, spec.defaultValue);
  }
  if (spec.type === "slider" || spec.type === "cycler") {
    const num = Number(value);
    if (!Number.isFinite(num)) return spec.defaultValue;
    if (spec.type === "cycler") {
      const count = Array.isArray(spec.options) ? spec.options.length : 0;
      let nextIndex = Math.round(num);
      if (nextIndex < 0) nextIndex = 0;
      if (count > 0 && nextIndex >= count) {
        const fallbackIndex = Number(spec.defaultValue);
        nextIndex = Number.isFinite(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < count ? Math.round(fallbackIndex) : 0;
      }
      return nextIndex;
    }

    const bounds = spec.bounds || {};
    const step = Number(bounds.step);
    const min = Number.isFinite(bounds.min) ? bounds.min : -Infinity;
    const max = Number.isFinite(bounds.max) ? bounds.max : Infinity;
    let nextNumber = Math.min(max, Math.max(min, num));
    if (!Number.isFinite(step) || step === 0) return Number.isInteger(step) ? Math.round(nextNumber) : nextNumber;
    if (Math.round(step) === step) return Math.round(nextNumber);
    return Number(nextNumber.toFixed(2));
  }
  if (spec.type === "positionpicker") {
    let posX = 0;
    let posY = 200;
    const rawPos = value;

    if (rawPos && typeof rawPos === "object") {
      if (Array.isArray(rawPos)) {
        if (rawPos.length > 0) posX = Number(rawPos[0]);
        if (rawPos.length > 1) posY = Number(rawPos[1]);
      } else {
        if (Object.prototype.hasOwnProperty.call(rawPos, "x")) posX = Number(rawPos.x);
        if (Object.prototype.hasOwnProperty.call(rawPos, "y")) posY = Number(rawPos.y);
      }
    } else if (typeof rawPos === "string") {
      const parts = rawPos.match(/-?\d+(?:\.\d+)?/g);
      if (parts && parts.length > 0) {
        posX = Number(parts[0]);
        if (parts.length > 1) posY = Number(parts[1]);
      }
    } else if (typeof rawPos === "number") {
      posY = Number(rawPos);
    }

    if (!Number.isFinite(posX)) posX = 0;
    if (!Number.isFinite(posY)) posY = 200;
    if (posX < 0) posX = 0;
    if (key === "hp_counter_position" || key === "hp_pulse_text_position") {
      if (posY < -50) posY = -50;
    } else if (posY < 0) {
      posY = 0;
    }
    if (posX > 400) posX = 400;
    if (posY > 400) posY = 400;

    return `${Math.round(posX)},${Math.round(posY)}`;
  }
  return value;
}

function splitCategoryPath(category = "") {
  return String(category || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function ensureGroup(groups, name, path) {
  let group = groups.find((entry) => entry.name === name);
  if (!group) {
    group = { name, path: [...path, name], children: [], fields: [] };
    groups.push(group);
  }
  return group;
}

function createDefaultState() {
  const state = {};
  for (const [id, spec] of Object.entries(HP_SCHEMA)) {
    state[id] = coerceValue(id, spec?.defaultValue);
  }
  return state;
}

function sanitizeState(state = {}) {
  const next = {};
  for (const [id, spec] of Object.entries(HP_SCHEMA)) {
    next[id] = coerceValue(id, state?.[id] ?? spec?.defaultValue);
  }
  return next;
}

function splitCategoryGroups() {
  const rootGroups = [];
  for (const [id, spec] of Object.entries(HP_SCHEMA)) {
    const path = splitCategoryPath(spec?.category);
    if (!path.length) continue;
    let cursor = rootGroups;
    let lineage = [];
    let current = null;
    for (const segment of path) {
      current = ensureGroup(cursor, segment, lineage);
      lineage = current.path;
      cursor = current.children;
    }
    current.fields.push({ id, ...spec });
  }
  return rootGroups;
}

function isFieldVisible(spec, state) {
  if (!spec?.visibleWhen) return true;
  const { id, equals } = spec.visibleWhen;
  return state?.[id] === equals;
}

function getCategoryPathLabel(group) {
  return (group?.path || []).join(" / ");
}

function getCategoryKey(group) {
  return (group?.path || [group?.name || ""]).join("|");
}

function countOverrides(values, defaultState) {
  let count = 0;
  for (const id of Object.keys(HP_SCHEMA)) {
    if (!Object.is(values?.[id], defaultState[id])) count += 1;
  }
  return count;
}

export const HP_FIELD_CATALOG = Object.freeze({
  schema: HP_SCHEMA,
  coerceValue,
  createDefaultState,
  sanitizeState,
  splitCategoryGroups,
  isFieldVisible,
  getCategoryKey,
  getCategoryPathLabel,
  countOverrides
});
