import { normalizeHeroIds, HP_HERO_SCOPE_ALL, HP_HERO_SCOPE_SELECTED } from './hpHeroData.js';
import { HP_FIELD_CATALOG } from './hpSchema.js';

const SETTINGS_PREFIX = 'HPCR2';
const PRESET_PREFIX = 'HPCRP1';
const USER_ID = /^user_\d{4,}$/;

export const REWRITE_KEYS = Object.freeze([
  'enabled', 'widthScale', 'heightScale', 'positionX', 'positionY',
  'enemyEnabled', 'enemyVisible', 'enemyMode', 'enemyLow', 'enemyMid', 'enemyHigh',
  'enemyTeamHigh', 'excludeBuildings', 'excludeBosses', 'enemyHealing', 'enemyDelta',
  'enemyBulletShield', 'allyEnabled', 'allyVisible', 'allyMode', 'allyLow', 'allyMid',
  'allyHigh', 'allyHealing', 'allyDelta', 'allyBulletShield', 'ultMode', 'ultCustom',
  'readoutVisible', 'readoutFormat', 'readoutSize', 'readoutFont', 'readoutOffsetX',
  'readoutOffsetY', 'readoutColorMode', 'readoutMode', 'readoutLow', 'readoutMid',
  'readoutHigh', 'pipsVisible', 'precisePipsEnabled', 'levelsVisible', 'lowThreshold',
  'highThreshold', 'enemyPulseEnabled', 'enemyPulseThreshold', 'enemyPulseBpm',
  'enemyPulseIntensity', 'enemyPulseColorEnabled', 'enemyPulseColorMode',
  'enemyPulseColor', 'enemyPulseHideBar', 'enemyPulseReadout',
  'enemyPulseReadoutModifiers', 'enemyPulseReadoutSize', 'enemyPulseReadoutOffsetX',
  'enemyPulseReadoutOffsetY', 'allyPulseEnabled', 'allyPulseThreshold', 'allyPulseBpm',
  'allyPulseIntensity', 'allyPulseColorEnabled', 'allyPulseColor',
  'enemyKillMarkerEnabled', 'enemyKillMarkerThreshold', 'enemyKillMarkerWidth',
  'enemyKillMarkerColor'
]);

const DEFAULTS = Object.freeze([
  true, 100, 100, 0, 0, true, true, 'gradient', '#E16161', '#FF7B00', '#00FF00',
  false, false, false, '#5FFF80', '#FFE55B', '#FFFFFF', false, true, 'fixed',
  '#E16161', '#FFED79', '#70F8C1', '#5FFF80', '#504C47', '#FFFFFF', 'follow',
  '#E16161', true, 'hp', 145, 'default', 27, 500, 'bar', 'fixed', '#E16161',
  '#FF7B00', '#FFFFFF', true, false, true, 25, 65, true, 25, 75, 1, false,
  'gradient', '#FF2222', false, false, false, 145, 27, 500, false, 25, 75, 1,
  false, '#FF2222', false, 25, 3, '#FF2222'
]);

const BOOLEAN_INDEXES = new Set([0, 5, 6, 11, 12, 13, 17, 18, 28, 39, 40, 41, 44, 48, 51, 52, 53, 57, 61, 63]);
const COLOR_INDEXES = new Set([8, 9, 10, 14, 15, 16, 20, 21, 22, 23, 24, 25, 27, 36, 37, 38, 50, 62, 66]);
const ENUMS = Object.freeze({
  7: ['fixed', 'gradient'], 19: ['fixed', 'gradient'], 26: ['follow', 'custom'],
  29: ['hp', 'percent', 'current'], 31: ['default', 'oracle', 'pulp'],
  34: ['bar', 'custom'], 35: ['fixed', 'gradient'], 49: ['fixed', 'gradient']
});
const BOUNDS = Object.freeze({
  1: [60, 160], 2: [60, 160], 3: [-300, 300], 4: [-200, 200],
  30: [72, 320], 32: [-405, 405], 33: [-35, 840], 42: [0, 99], 43: [1, 100],
  45: [0, 100], 46: [30, 300], 47: [0, 2], 54: [72, 320], 55: [-405, 405],
  56: [-35, 840], 58: [0, 100], 59: [30, 300], 60: [0, 2], 64: [5, 80], 65: [1, 100]
});
const KEY_INDEX = Object.freeze(Object.fromEntries(REWRITE_KEYS.map((key, index) => [key, index])));

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
  normalized[42] = Math.min(normalized[42], Math.max(0, normalized[43] - 1));
  normalized[43] = Math.max(normalized[43], Math.min(100, normalized[42] + 1));
  return normalized;
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
    values[index] = normalizeRewriteValue(index, pair[1], true);
  }
  return normalizeRewriteValues(values);
}

function validateRule(key, rule) {
  const index = KEY_INDEX[key];
  if (index === undefined || index === 40 || !isPlainObject(rule)) return null;
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

function parsePosition(value) {
  const [x, y] = String(value || '').split(',').map(Number);
  return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

function formatPosition(x, y) {
  return `${Math.round(x)},${Math.round(y)}`;
}

const SIMPLE_MAP = Object.freeze({
  hp_enabled: 'enabled', hp_bg_visible: 'enemyVisible', hp_low_threshold: 'lowThreshold',
  hp_high_threshold: 'highThreshold', hp_team_colors: 'enemyTeamHigh', hp_color_low: 'enemyLow',
  hp_color_mid: 'enemyMid', hp_color_high: 'enemyHigh', hp_heal_color: 'enemyHealing',
  hp_delta_color: 'enemyDelta', hp_bullet_shield_color: 'enemyBulletShield',
  hp_pulse_enabled: 'enemyPulseEnabled', hp_pulse_threshold: 'enemyPulseThreshold',
  hp_pulse_bpm: 'enemyPulseBpm', hp_pulse_intensity: 'enemyPulseIntensity',
  hp_pulse_hide_bar: 'enemyPulseHideBar', hp_pulse_color_enabled: 'enemyPulseColorEnabled',
  hp_pulse_color: 'enemyPulseColor', hp_pulse_text_enabled: 'enemyPulseReadout',
  hp_pulse_text_scale: 'enemyPulseReadoutSize', hp_counter_visible: 'readoutVisible',
  hp_counter_size: 'readoutSize', hp_level_number_visible: 'levelsVisible',
  hp_pip_visible: 'pipsVisible', hp_precise_pips_enabled: 'precisePipsEnabled',
  hp_text_color_low: 'readoutLow', hp_text_color_mid: 'readoutMid', hp_text_color_high: 'readoutHigh',
  hp_friend_enabled: 'allyEnabled', hp_friend_color_low: 'allyLow', hp_friend_color_mid: 'allyMid',
  hp_friend_color_high: 'allyHigh', hp_friend_heal_color: 'allyHealing',
  hp_friend_delta_color: 'allyDelta', hp_friend_bullet_shield_color: 'allyBulletShield',
  hp_friend_pulse_enabled: 'allyPulseEnabled', hp_friend_pulse_threshold: 'allyPulseThreshold',
  hp_friend_pulse_bpm: 'allyPulseBpm', hp_friend_pulse_intensity: 'allyPulseIntensity',
  hp_friend_pulse_color_enabled: 'allyPulseColorEnabled', hp_friend_pulse_color: 'allyPulseColor',
  hp_kill_zone_enabled: 'enemyKillMarkerEnabled', hp_kill_zone_threshold: 'enemyKillMarkerThreshold',
  hp_kill_zone_width: 'enemyKillMarkerWidth', hp_kill_zone_color: 'enemyKillMarkerColor',
  hp_ult_color_custom: 'ultCustom'
});
const REVERSE_SIMPLE_MAP = Object.freeze(Object.fromEntries(Object.entries(SIMPLE_MAP).map(([web, rewrite]) => [rewrite, web])));

function rewriteToWeb(values, base = {}) {
  const web = { ...HP_FIELD_CATALOG.createDefaultState(), ...base };
  for (const [webKey, rewriteKey] of Object.entries(SIMPLE_MAP)) web[webKey] = values[KEY_INDEX[rewriteKey]];
  web.hp_mode = values[7] === 'gradient' ? 1 : 0;
  web.hp_skip_buildings = values[12] && values[13];
  web.hp_ult_color_enabled = values[26] === 'follow';
  web.hp_pulse_color_mode = values[49] === 'gradient' ? 1 : 0;
  web.hp_counter_format = ['hp', 'percent', 'current'].indexOf(values[29]);
  web.hp_text_color_mode = values[34] === 'custom' ? 1 : 0;
  web.hp_counter_position = formatPosition(values[32], values[33]);
  web.hp_pulse_text_position = formatPosition(values[55], values[56]);
  return HP_FIELD_CATALOG.sanitizeState(web);
}

function applyWebToRewrite(values, profile, forceAll = false) {
  const result = normalizeRewriteValues(values);
  const current = HP_FIELD_CATALOG.sanitizeState(profile?.values || {});
  const baseline = profile?.rewrite?.webValues;
  const changed = (key) => forceAll || !baseline || !Object.is(current[key], baseline[key]);
  for (const [webKey, rewriteKey] of Object.entries(SIMPLE_MAP)) {
    if (changed(webKey)) result[KEY_INDEX[rewriteKey]] = normalizeRewriteValue(KEY_INDEX[rewriteKey], current[webKey]);
  }
  if (changed('hp_mode')) result[7] = current.hp_mode === 1 ? 'gradient' : 'fixed';
  if (changed('hp_skip_buildings')) {
    result[12] = Boolean(current.hp_skip_buildings);
    result[13] = Boolean(current.hp_skip_buildings);
  }
  if (changed('hp_ult_color_enabled')) result[26] = current.hp_ult_color_enabled ? 'follow' : 'custom';
  if (changed('hp_pulse_color_mode')) result[49] = current.hp_pulse_color_mode === 1 ? 'gradient' : 'fixed';
  if (changed('hp_counter_format')) result[29] = ['hp', 'percent', 'current'][current.hp_counter_format] || 'hp';
  if (changed('hp_text_color_mode')) result[34] = current.hp_text_color_mode === 1 ? 'custom' : 'bar';
  if (changed('hp_counter_position')) {
    const [x, y] = parsePosition(current.hp_counter_position);
    result[32] = normalizeRewriteValue(32, x);
    result[33] = normalizeRewriteValue(33, y);
  }
  if (changed('hp_pulse_text_position')) {
    const [x, y] = parsePosition(current.hp_pulse_text_position);
    result[55] = normalizeRewriteValue(55, x);
    result[56] = normalizeRewriteValue(56, y);
  }
  return normalizeRewriteValues(result);
}

function rewriteConditionsToWeb(conditions) {
  const overrides = {};
  for (const [rewriteKey, rule] of Object.entries(conditions || {})) {
    const webKey = REVERSE_SIMPLE_MAP[rewriteKey];
    if (webKey) overrides[webKey] = clone(rule);
  }
  return overrides;
}

function webConditionsToRewrite(profile) {
  const conditions = clone(profile?.rewrite?.conditions) || {};
  const baseline = profile?.rewrite?.webOverrides || {};
  const current = profile?.overrides || {};
  for (const [webKey, rewriteKey] of Object.entries(SIMPLE_MAP)) {
    const before = baseline[webKey];
    const after = current[webKey];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (after === undefined) delete conditions[rewriteKey];
    else {
      const rule = validateRule(rewriteKey, after);
      if (!rule) throw new Error(`Invalid condition for ${webKey}.`);
      conditions[rewriteKey] = rule;
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
    values: webValues,
    heroMode: record.mode,
    heroes: record.heroes,
    overrides: webOverrides,
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
    if (id !== 'baked_default' || raw.mode !== 'off' || heroes.length || pairsFor(values).length || conditions) {
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
  const source = profile?.rewrite?.values || DEFAULTS;
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
  if (profile?.rewrite?.kind === 'baked' && !valuePairs.length && !conditions && mode === HP_HERO_SCOPE_ALL) {
    return { id: 'baked_default', kind: 'baked', name, mode: 'off', heroes: [], values: [], conditions: null };
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

export function createRewriteSettingsCode(profile) {
  const values = profileValues(profile);
  const conditions = webConditionsToRewrite(profile);
  const payload = { v: pairsFor(values), c: conditions || {} };
  return `${SETTINGS_PREFIX}${JSON.stringify(payload)}`;
}

export function createRewritePresetCode(profile, index = 0) {
  const record = userRecord(profile, index);
  return `${PRESET_PREFIX}${JSON.stringify({ records: [record], selectedPresetId: record.id })}`;
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
  return `${PRESET_PREFIX}${JSON.stringify({ records, selectedPresetId: records[selectedIndex].id })}`;
}
