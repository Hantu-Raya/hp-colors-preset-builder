import { normalizeHeroScope } from "./hpHeroData.js";
import { HP_FIELD_CATALOG } from "./hpSchema.js";

export const DEFAULT_HP_PRESET_NAME = "Web Builder Preset";
export const HP_PRESET_PAYLOAD_VERSION = 1;

export const HP_PERSIST_ALIASES = Object.freeze({
  hp_enabled: "e",
  hp_mode: "m",
  hp_low_threshold: "l",
  hp_high_threshold: "h",
  hp_bg_visible: "b",
  hp_team_colors: "t",
  hp_info_health_margin_top: "ihmt",
  hp_healthbar_height: "hbh",
  hp_color_low: "cl",
  hp_color_mid: "cm",
  hp_color_high: "ch",
  hp_heal_color: "ehc",
  hp_delta_color: "edc",
  hp_bullet_shield_color: "ebsc",
  hp_counter_visible: "cv",
  hp_counter_size: "s",
  hp_counter_position: "p",
  hp_text_color_mode: "tm",
  hp_level_number_visible: "lnv",
  hp_pip_visible: "plv",
  hp_ult_color_enabled: "uce",
  hp_ult_color_custom: "ucc",
  hp_text_color_low: "tl",
  hp_text_color_mid: "ti",
  hp_text_color_high: "th",
  hp_pulse_bpm: "bp",
  hp_pulse_intensity: "pi",
  hp_pulse_enabled: "pe",
  hp_pulse_text_enabled: "pte",
  hp_pulse_text_scale: "pts",
  hp_pulse_text_position: "ptp",
  hp_pulse_hide_bar: "phb",
  hp_pulse_color_enabled: "pce",
  hp_pulse_color: "pc",
  hp_pulse_color_mode: "pcm",
  hp_skip_buildings: "sb",
  hp_pulse_threshold: "pt",
  hp_friend_enabled: "fe",
  hp_friend_pulse_enabled: "fpe",
  hp_friend_pulse_bpm: "fpb",
  hp_friend_pulse_intensity: "fpi",
  hp_friend_pulse_threshold: "fpt",
  hp_friend_color_low: "fcl",
  hp_friend_color_mid: "fcm",
  hp_friend_color_high: "fch",
  hp_friend_heal_color: "fhc",
  hp_friend_delta_color: "fdc",
  hp_friend_bullet_shield_color: "fbsc",
  hp_friend_pulse_color_enabled: "fpce",
  hp_friend_pulse_color: "fpc",
  hp_kill_zone_enabled: "kze",
  hp_kill_zone_threshold: "kzt",
  hp_kill_zone_color: "kzc",
  hp_kill_zone_width: "kzw",
  hp_counter_format: "cf"
});

const HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS = Object.freeze({
  kzs: "hp_kill_zone_color"
});


export const HP_FIELD_ID_BY_PERSIST_ALIAS = Object.freeze({
  ...Object.fromEntries(Object.entries(HP_PERSIST_ALIASES).map(([id, alias]) => [alias, id])),
  ...HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

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
  const name = preserveBlankName && typeof rawName === "string" && rawName.trim() === ""
    ? ""
    : cleanHpPresetName(rawName, index, fallbackName);
  const values = normalizeHpPresetValues(rawValues, { requireObject: requireValues });
  const scope = normalizeHeroScope(rawHeroMode, rawHeroes || []);

  return {
    name,
    version: HP_PRESET_PAYLOAD_VERSION,
    values,
    heroMode: scope.heroMode,
    heroes: scope.heroes
  };
}
