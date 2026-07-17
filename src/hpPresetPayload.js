import { normalizeHeroScope } from "./hpHeroData.js";
import {
  HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS,
  HP_PERSIST_ALIASES,
  HP_PRESET_PAYLOAD_VERSION
} from "./contracts/hpColorsPresetContract.js";

import { HP_FIELD_CATALOG } from "./hpSchema.js";

export const DEFAULT_HP_PRESET_NAME = "Web Builder Preset";
export { HP_PERSIST_ALIASES, HP_PRESET_PAYLOAD_VERSION };

export const HP_FIELD_ID_BY_PERSIST_ALIAS = Object.freeze({
  ...Object.fromEntries(Object.entries(HP_PERSIST_ALIASES).map(([id, alias]) => [alias, id])),
  ...HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export const HP_SIGNATURE_OVERRIDE_INELIGIBLE_IDS = Object.freeze({
  hp_precise_pips_enabled: true
});

export function normalizeHpPresetOverrides(rawOverrides) {
  if (!isPlainObject(rawOverrides)) return {};
  const canonical = {};
  for (const [rawId, rawRule] of Object.entries(rawOverrides)) {
    const id = hasOwn(HP_FIELD_CATALOG.schema, rawId) ? rawId : HP_FIELD_ID_BY_PERSIST_ALIAS[rawId];
    if (!id || HP_SIGNATURE_OVERRIDE_INELIGIBLE_IDS[id] || hasOwn(canonical, id) && rawId !== id) continue;
    const tuple = Array.isArray(rawRule)
      ? rawRule
      : [rawRule?.slot, rawRule?.minTier, rawRule?.value];
    const slot = Number(tuple[0]);
    const minTier = Number(tuple[1]);
    if (!Number.isInteger(slot) || slot < 1 || slot > 4 || !Number.isInteger(minTier) || minTier < 1 || minTier > 3) continue;
    canonical[id] = { slot, minTier, value: HP_FIELD_CATALOG.coerceValue(id, tuple[2]) };
  }
  return canonical;
}

export function compactHpPresetOverrides(rawOverrides) {
  const normalized = normalizeHpPresetOverrides(rawOverrides);
  return Object.fromEntries(Object.entries(normalized).map(([id, rule]) => [
    HP_PERSIST_ALIASES[id],
    [rule.slot, rule.minTier, rule.value]
  ]));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}


export function defaultHpPresetName(index = 0) {
  return index === 0 ? DEFAULT_HP_PRESET_NAME : `Profile ${index + 1}`;
}

export function cleanHpPresetName(name, index = 0, fallbackName = defaultHpPresetName(index)) {
  const value = typeof name === "string" ? name.trim() : String(name || "").trim();
  return value || fallbackName;
}

export function expandHpPresetValueAliases(values) {
  const expanded = {};
  const source = values || {};
  for (const [key, value] of Object.entries(source)) {
    if (hasOwn(HP_FIELD_CATALOG.schema, key)) {
      expanded[key] = value;
      continue;
    }

    const fullId = HP_FIELD_ID_BY_PERSIST_ALIAS[key];
    if (!fullId || !hasOwn(HP_FIELD_CATALOG.schema, fullId)) {
      throw new Error(`Unknown alias or field id: ${key}`);
    }
    if (!hasOwn(source, fullId)) expanded[fullId] = value;
  }
  return expanded;
}

export function normalizeHpPresetValues(values, { requireObject = false } = {}) {
  if (!isPlainObject(values)) {
    if (requireObject) throw new Error("Invalid JSON payload");
    return HP_FIELD_CATALOG.createDefaultState();
  }
  return HP_FIELD_CATALOG.sanitizeState(expandHpPresetValueAliases(values));
}

export function compactHpPresetValues(values) {
  const normalized = normalizeHpPresetValues(values);
  const compact = {};
  for (const [id, alias] of Object.entries(HP_PERSIST_ALIASES)) {
    compact[alias] = normalized[id];
  }
  return compact;
}

export function normalizeHpPresetPayload(payload = {}, {
  index = 0,
  fallbackName = defaultHpPresetName(index),
  requireValues = false,
  preserveBlankName = false
} = {}) {
  const source = isPlainObject(payload) ? payload : {};
  const rawName = hasOwn(source, "n") ? source.n : source.name;
  const rawValues = hasOwn(source, "vs") ? source.vs : source.values;
  const rawHeroMode = hasOwn(source, "hm") ? source.hm : source.heroMode;
  const rawHeroes = hasOwn(source, "hs") ? source.hs : source.heroes;
  const rawOverrides = hasOwn(source, "o") ? source.o : source.overrides;
  const name = preserveBlankName && typeof rawName === "string" && rawName.trim() === ""
    ? ""
    : cleanHpPresetName(rawName, index, fallbackName);
  const values = normalizeHpPresetValues(rawValues, { requireObject: requireValues });
  const scope = normalizeHeroScope(rawHeroMode, rawHeroes || []);
  const overrides = normalizeHpPresetOverrides(rawOverrides);
  const normalized = {
    name,
    version: HP_PRESET_PAYLOAD_VERSION,
    values,
    heroMode: scope.heroMode,
    heroes: scope.heroes
  };
  if (Object.keys(overrides).length) normalized.overrides = overrides;
  return normalized;
}
