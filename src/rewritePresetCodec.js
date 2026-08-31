import { normalizeHeroIds, HP_HERO_SCOPE_ALL, HP_HERO_SCOPE_SELECTED } from './hpHeroData.js';
import { HP_FIELD_CATALOG, REWRITE_CODEC_FIELD_BINDINGS, REWRITE_FIELD_BINDINGS, REWRITE_FIELD_CATALOG } from './hpSchema.js';

const SETTINGS_PREFIX = 'HPCR2';
const PRESET_PREFIX = 'HPCRP1';
const USER_ID = /^user_\d{4,}$/;

const REWRITE_KEYS = Object.freeze(REWRITE_CODEC_FIELD_BINDINGS.map((binding) => binding.canonicalKey));
const DEFAULTS = Object.freeze(REWRITE_CODEC_FIELD_BINDINGS.map((binding) => binding.defaultValue));
const BOOLEAN_INDEXES = new Set(REWRITE_CODEC_FIELD_BINDINGS
  .map((binding, index) => binding.canonicalType === 'boolean' ? index : null)
  .filter((index) => index !== null));
const COLOR_INDEXES = new Set(REWRITE_CODEC_FIELD_BINDINGS
  .map((binding, index) => binding.canonicalType === 'color' ? index : null)
  .filter((index) => index !== null));
const ENUMS = Object.freeze(Object.fromEntries(REWRITE_CODEC_FIELD_BINDINGS
  .map((binding, index) => binding.canonicalType === 'enum' || binding.canonicalType === 'enum-toggle'
    ? [index, binding.canonicalOptions]
    : null)
  .filter(Boolean)));
const BOUNDS = Object.freeze(Object.fromEntries(REWRITE_CODEC_FIELD_BINDINGS
  .map((binding, index) => binding.bounds ? [index, [binding.bounds.min, binding.bounds.max]] : null)
  .filter(Boolean)));
const KEY_INDEX = Object.freeze(Object.fromEntries(REWRITE_KEYS.map((key, index) => [key, index])));
const BINDING_BY_KEY = Object.freeze(Object.fromEntries(REWRITE_FIELD_BINDINGS.map((binding) => [binding.canonicalKey, binding])));
const RETIRED_INDEXES = new Set(REWRITE_KEYS
  .map((key, index) => BINDING_BY_KEY[key] ? null : index)
  .filter((index) => index !== null));

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalColor(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function normalizeRewriteValue(index, value, strict = false) {
  if (BOOLEAN_INDEXES.has(index)) {
    if (strict && typeof value !== 'boolean') throw new Error(`INVALID SETTING: ${REWRITE_KEYS[index]}`);
    return typeof value === 'boolean' ? value : DEFAULTS[index];
  }
  if (COLOR_INDEXES.has(index)) {
    const color = canonicalColor(value);
    if (strict && !color) throw new Error(`INVALID SETTING: ${REWRITE_KEYS[index]}`);
    return color || DEFAULTS[index];
  }
  if (ENUMS[index]) {
    if (strict && !ENUMS[index].includes(value)) throw new Error(`INVALID SETTING: ${REWRITE_KEYS[index]}`);
    return ENUMS[index].includes(value) ? value : DEFAULTS[index];
  }
  if (strict && (typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error(`INVALID SETTING: ${REWRITE_KEYS[index]}`);
  }
  const number = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULTS[index];
  const bounds = BOUNDS[index];
  return bounds ? Math.min(bounds[1], Math.max(bounds[0], number)) : number;
}

function normalizeRewriteValues(values) {
  const normalized = DEFAULTS.map((fallback, index) => normalizeRewriteValue(index, values?.[index] ?? fallback));
  for (const index of RETIRED_INDEXES) normalized[index] = DEFAULTS[index];
  normalized[42] = Math.min(normalized[42], Math.max(0, normalized[43] - 1));
  normalized[43] = Math.max(normalized[43], Math.min(100, normalized[42] + 1));
  return normalized;
}

const SHIPPED_DEFAULTS = Object.freeze(normalizeRewriteValues(
  REWRITE_CODEC_FIELD_BINDINGS.map((binding) => binding.webCanonicalDefault)
));

function matchesShippedDefaults(values) {
  const normalized = normalizeRewriteValues(values);
  return normalized.every((value, index) => Object.is(value, SHIPPED_DEFAULTS[index]));
}

function parsePairs(raw, errorLabel) {
  if (!Array.isArray(raw)) throw new Error(`INVALID ${errorLabel} PAIRS`);
  const values = DEFAULTS.slice();
  const seen = new Set();
  for (const pair of raw) {
    if (!Array.isArray(pair) || !Number.isInteger(pair[0]) || pair[0] < 0) {
      throw new Error(`INVALID ${errorLabel} PAIR`);
    }
    const index = pair[0];
    if (seen.has(index)) throw new Error(`DUPLICATE ${errorLabel} SETTING`);
    if (index >= REWRITE_KEYS.length) throw new Error(`UNKNOWN ${errorLabel} SETTING`);
    seen.add(index);
    if (RETIRED_INDEXES.has(index)) continue;
    values[index] = normalizeRewriteValue(index, pair[1], true);
  }
  return normalizeRewriteValues(values);
}

function validateRule(key, rule) {
  const index = KEY_INDEX[key];
  const binding = BINDING_BY_KEY[key];
  if (index === undefined || !binding?.conditionEligible || !isPlainObject(rule)) return null;
  if (Object.keys(rule).sort().join(',') !== 'minTier,slot,value') return null;
  if (!Number.isInteger(rule.slot) || rule.slot < 1 || rule.slot > 4) return null;
  if (!Number.isInteger(rule.minTier) || rule.minTier < 1 || rule.minTier > 3) return null;
  let value;
  try {
    value = normalizeRewriteValue(index, rule.value, true);
  } catch {
    return null;
  }
  if (!Object.is(value, rule.value) && !(COLOR_INDEXES.has(index) && value === canonicalColor(rule.value))) return null;
  return { slot: rule.slot, minTier: rule.minTier, value };
}

function parseConditions(raw, allowEmpty) {
  if (raw === null || raw === undefined) return null;
  if (!isPlainObject(raw)) throw new Error('INVALID PRESET CONDITIONS');
  const result = {};
  for (const [key, rule] of Object.entries(raw)) {
    const normalized = validateRule(key, rule);
    if (!normalized) throw new Error('INVALID PRESET CONDITIONS');
    result[key] = normalized;
  }
  if (!allowEmpty && Object.keys(result).length === 0) throw new Error('INVALID PRESET CONDITIONS');
  return Object.keys(result).length ? result : null;
}

function pairsFor(values) {
  const normalized = normalizeRewriteValues(values);
  const pairs = [];
  for (let index = 0; index < normalized.length; index += 1) {
    if (!Object.is(normalized[index], DEFAULTS[index])) pairs.push([index, normalized[index]]);
  }
  return pairs;
}


function canonicalToWeb(binding, value) {
  if (binding.canonicalType === 'enum') return binding.canonicalOptions.indexOf(value);
  if (binding.canonicalType === 'enum-toggle') return value === 'follow';
  return value;
}

function webToCanonical(binding, value) {
  if (binding.canonicalType === 'enum') return binding.canonicalOptions[value] || binding.defaultValue;
  if (binding.canonicalType === 'enum-toggle') return value ? 'follow' : 'custom';
  return value;
}

function canonicalValuesFromMetadata(raw, fallback = DEFAULTS) {
  if (Array.isArray(raw)) return normalizeRewriteValues(raw);
  if (!isPlainObject(raw)) return normalizeRewriteValues(fallback);
  const values = [...fallback];
  for (const [key, value] of Object.entries(raw)) {
    const index = KEY_INDEX[key];
    if (index !== undefined && !RETIRED_INDEXES.has(index)) values[index] = value;
  }
  return normalizeRewriteValues(values);
}

function rewriteToWeb(values) {
  const web = { ...REWRITE_FIELD_CATALOG.createDefaultState() };
  const normalized = normalizeRewriteValues(values);
  for (const binding of REWRITE_FIELD_BINDINGS) {
    web[binding.webId] = canonicalToWeb(binding, normalized[KEY_INDEX[binding.canonicalKey]]);
  }
  return REWRITE_FIELD_CATALOG.sanitizeState(web);
}

function sharedPositionAxis(value, axis, fallback) {
  const parts = String(value || '').split(',').map(Number);
  const index = axis === 'x' ? 0 : 1;
  return Number.isFinite(parts[index]) ? parts[index] : fallback;
}

function rewriteWebValues(profile) {
  if (profile?.rewrite?.webValues) {
    return REWRITE_FIELD_CATALOG.sanitizeState(profile.rewrite.webValues);
  }
  if (!profile?.rewrite) {
    const shared = { ...REWRITE_FIELD_CATALOG.createDefaultState() };
    const sharedDefaults = HP_FIELD_CATALOG.createDefaultState();
    for (const binding of REWRITE_FIELD_BINDINGS) {
      const source = binding.sharedSource || binding.webId;
      const sourceId = typeof source === 'object' ? source.id : source;
      if (!Object.prototype.hasOwnProperty.call(profile?.values || {}, sourceId)) continue;
      const raw = profile.values[sourceId];
      if (Object.is(raw, sharedDefaults[sourceId])) continue;
      shared[binding.webId] = typeof source === 'object'
        ? sharedPositionAxis(raw, source.axis, binding.webDefault)
        : raw;
    }

    return REWRITE_FIELD_CATALOG.sanitizeState(shared);
  }
  const canonical = canonicalValuesFromMetadata(profile.rewrite.values, DEFAULTS);
  return rewriteToWeb(canonical);
}

function applyWebToRewrite(values, profile, forceAll = false) {
  const result = normalizeRewriteValues(values);
  const current = rewriteWebValues(profile);
  const baseline = profile?.rewrite?.webValues;
  for (const binding of REWRITE_FIELD_BINDINGS) {
    const index = KEY_INDEX[binding.canonicalKey];
    if (forceAll || !baseline || !Object.is(current[binding.webId], baseline[binding.webId])) {
      result[index] = normalizeRewriteValue(index, webToCanonical(binding, current[binding.webId]));
    }
  }
  return normalizeRewriteValues(result);
}

function rewriteConditionsToWeb(conditions) {
  const overrides = {};
  for (const [rewriteKey, rule] of Object.entries(conditions || {})) {
    const binding = BINDING_BY_KEY[rewriteKey];
    if (!binding || !binding.conditionEligible) continue;
    overrides[binding.webId] = {
      ...clone(rule),
      value: canonicalToWeb(binding, rule.value)
    };
  }
  return overrides;
}

function webConditionsToRewrite(profile, currentOverrides = null) {
  const conditions = clone(profile?.rewrite?.conditions) || {};
  const baseline = profile?.rewrite?.webOverrides || {};
  const current = currentOverrides || profile?.rewrite?.webOverrides || profile?.overrides || {};
  for (const binding of REWRITE_FIELD_BINDINGS) {
    if (!binding.conditionEligible) continue;
    const before = baseline[binding.webId];
    const after = current[binding.webId];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (after === undefined) delete conditions[binding.canonicalKey];
    else {
      const rule = validateRule(binding.canonicalKey, {
        ...after,
        value: webToCanonical(binding, after.value)
      });
      if (!rule) throw new Error(`Invalid condition for ${binding.webId}.`);
      conditions[binding.canonicalKey] = rule;
    }
  }
  return Object.keys(conditions).length ? conditions : null;
}

function makeProfile(record, index, defaultState) {
  const values = normalizeRewriteValues(record.values);
  const webValues = rewriteToWeb(values, defaultState);
  const webOverrides = rewriteConditionsToWeb(record.conditions);
  return {
    id: `profile-${index + 1}`,
    name: record.name,
    values: HP_FIELD_CATALOG.sanitizeState(webValues),
    heroMode: record.mode,
    heroes: record.heroes,
    overrides: {},
    rewrite: {
      id: record.id,
      kind: record.kind || 'user',
      values,
      conditions: clone(record.conditions),
      webValues: clone(webValues),
      webOverrides: clone(webOverrides)
    }
  };
}
export function getRewriteEditorState(profile) {
  return rewriteWebValues(profile);
}

export function createRewriteProfileMetadata(profile, { valuesAreRewrite = false } = {}) {
  const hasMetadata = Boolean(profile?.rewrite);
  const editorValues = valuesAreRewrite ? REWRITE_FIELD_CATALOG.sanitizeState(profile?.values || {}) : null;
  const canonical = valuesAreRewrite
    ? applyWebToRewrite(DEFAULTS, { ...profile, rewrite: { ...(profile.rewrite || {}), webValues: editorValues } }, true)
    : hasMetadata && profile.rewrite.values !== undefined
      ? canonicalValuesFromMetadata(profile.rewrite.values, DEFAULTS)
      : applyWebToRewrite(DEFAULTS, profile, true);
  const webValues = valuesAreRewrite
    ? editorValues
    : hasMetadata && profile.rewrite.webValues
      ? REWRITE_FIELD_CATALOG.sanitizeState(profile.rewrite.webValues)
      : rewriteToWeb(canonical);
  const conditions = hasMetadata && !valuesAreRewrite
    ? clone(profile.rewrite.conditions)
    : webConditionsToRewrite(profile, profile?.overrides || {});
  return {
    id: String(profile?.rewrite?.id || profile?.id || ''),
    kind: profile?.rewrite?.kind || 'user',
    values: canonical,
    conditions,
    webValues: clone(webValues),
    webOverrides: rewriteConditionsToWeb(conditions)
  };
}

function parseRecord(raw, index, defaultState, usedIds) {
  if (!isPlainObject(raw)) throw new Error('INVALID PRESET RECORD');
  const id = String(raw.id || '');
  const kind = String(raw.kind || '');
  const name = String(raw.name || '').trim();
  if (!id || usedIds.has(id) || !['user', 'baked'].includes(kind) || !name || name.length > 48) {
    throw new Error('INVALID PRESET RECORD');
  }
  usedIds.add(id);
  const values = parsePairs(raw.values, 'PRESET');
  const heroes = normalizeHeroIds(raw.heroes || []);
  if (!Array.isArray(raw.heroes) || JSON.stringify(heroes) !== JSON.stringify(raw.heroes)) throw new Error('INVALID PRESET HEROES');
  const conditions = parseConditions(raw.conditions, false);
  if (kind === 'baked') {
    if (id !== 'baked_default' || raw.mode !== 'off' || heroes.length || !matchesShippedDefaults(values) || conditions) {
      throw new Error('INVALID BAKED PRESET');
    }
  } else {
    if (!USER_ID.test(id) || ![HP_HERO_SCOPE_ALL, HP_HERO_SCOPE_SELECTED].includes(raw.mode)) throw new Error('INVALID PRESET SCOPE');
    if ((raw.mode === HP_HERO_SCOPE_SELECTED) !== Boolean(heroes.length)) throw new Error('INVALID PRESET SCOPE');
  }
  return makeProfile({ id, kind, name, mode: kind === 'baked' ? HP_HERO_SCOPE_ALL : raw.mode, heroes, values, conditions }, index, defaultState);
}

function parsePresetTransfer(text, defaultState) {
  let payload;
  try {
    payload = JSON.parse(text.slice(PRESET_PREFIX.length));
  } catch {
    throw new Error('INVALID HPCRP1 CODE');
  }
  if (!isPlainObject(payload) || !Array.isArray(payload.records) || !payload.records.length || payload.records.length > 128) {
    throw new Error('INVALID HPCRP1 PAYLOAD');
  }
  const usedIds = new Set();
  const profiles = payload.records.map((record, index) => parseRecord(record, index, defaultState, usedIds));
  if (payload.selectedPresetId !== undefined && !usedIds.has(String(payload.selectedPresetId))) throw new Error('INVALID SELECTED PRESET');
  return { format: PRESET_PREFIX, profiles };
}

function parseSettingsTransfer(text, defaultState) {
  let payload;
  try {
    payload = JSON.parse(text.slice(SETTINGS_PREFIX.length));
  } catch {
    throw new Error('INVALID HPCR2 CODE');
  }
  let pairs = payload;
  let conditions = null;
  if (isPlainObject(payload)) {
    if (Object.keys(payload).sort().join(',') !== 'c,v') throw new Error('INVALID HPCR2 PAYLOAD');
    pairs = payload.v;
    conditions = parseConditions(payload.c, true);
  }
  const values = parsePairs(pairs, 'HPCR2');
  return {
    format: SETTINGS_PREFIX,
    profiles: [makeProfile({ id: 'user_0001', kind: 'user', name: 'Imported rewrite settings', mode: HP_HERO_SCOPE_ALL, heroes: [], values, conditions }, 0, defaultState)]
  };
}

export function decodeRewriteTransfer(raw, { defaultState = HP_FIELD_CATALOG.createDefaultState() } = {}) {
  const text = String(raw || '').trim();
  if (text.startsWith(PRESET_PREFIX)) return parsePresetTransfer(text, defaultState);
  if (text.startsWith(SETTINGS_PREFIX)) return parseSettingsTransfer(text, defaultState);
  return null;
}

function profileValues(profile) {
  const source = canonicalValuesFromMetadata(profile?.rewrite?.values, DEFAULTS);
  return applyWebToRewrite(source, profile, !profile?.rewrite);
}

function userRecord(profile, index) {
  const heroes = normalizeHeroIds(profile?.heroes || []);
  const mode = profile?.heroMode === HP_HERO_SCOPE_SELECTED && heroes.length ? HP_HERO_SCOPE_SELECTED : HP_HERO_SCOPE_ALL;
  const sourceId = String(profile?.rewrite?.id || '');
  const name = String(profile?.name || `Preset ${index + 1}`).trim().slice(0, 48) || `Preset ${index + 1}`;
  const values = profileValues(profile);
  const valuePairs = pairsFor(values);
  const conditions = webConditionsToRewrite(profile);
  if (profile?.rewrite?.kind === 'baked' && matchesShippedDefaults(values) && !conditions && mode === HP_HERO_SCOPE_ALL) {
    return { id: 'baked_default', kind: 'baked', name, mode: 'off', heroes: [], values: pairsFor(SHIPPED_DEFAULTS), conditions: null };
  }
  return {
    id: USER_ID.test(sourceId) ? sourceId : `user_${String(index + 1).padStart(4, '0')}`,
    kind: 'user',
    name,
    mode,
    heroes: mode === HP_HERO_SCOPE_SELECTED ? heroes : [],
    values: valuePairs,
    conditions
  };
}

function hiddenBakedPresetIds(records) {
  return records.some((record) => record.kind === 'user' && record.mode === HP_HERO_SCOPE_ALL)
    ? ['baked_default']
    : [];
}

export function createRewriteSettingsCode(profile) {
  const values = profileValues(profile);
  const conditions = webConditionsToRewrite(profile);
  const payload = { v: pairsFor(values), c: conditions || {} };
  return `${SETTINGS_PREFIX}${JSON.stringify(payload)}`;
}

export function createRewritePresetCode(profile, index = 0) {
  const record = userRecord(profile, index);
  const payload = {
    records: [record],
    hiddenBakedPresetIds: hiddenBakedPresetIds([record]),
    selectedPresetId: record.id
  };
  return `${PRESET_PREFIX}${JSON.stringify(payload)}`;
}

export function createRewritePresetBundle(profiles, activeProfileId = null) {
  if (!Array.isArray(profiles) || !profiles.length) throw new Error('Add at least one preset before copying.');
  const records = profiles.map(userRecord);
  const used = new Set();
  let nextId = 1;
  for (const record of records) {
    if (used.has(record.id)) {
      while (used.has(`user_${String(nextId).padStart(4, '0')}`)) nextId += 1;
      record.id = `user_${String(nextId).padStart(4, '0')}`;
      nextId += 1;
    }
    used.add(record.id);
  }
  const selectedIndex = Math.max(0, profiles.findIndex((profile) => profile?.id === activeProfileId));
  const payload = {
    records,
    hiddenBakedPresetIds: hiddenBakedPresetIds(records),
    selectedPresetId: records[selectedIndex].id
  };
  return `${PRESET_PREFIX}${JSON.stringify(payload)}`;
}
