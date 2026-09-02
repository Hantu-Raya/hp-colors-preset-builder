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
function createSchemaCoercer(schema) {
  return (key, value) => {
    const spec = schema[key];
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
    if (spec.type === "colorpicker") return normalizeHexColorValue(value, spec.defaultValue);
    if (spec.type === "slider" || spec.type === "cycler") {
      const number = Number(value);
      if (!Number.isFinite(number)) return spec.defaultValue;
      if (spec.type === "cycler") {
        const count = Array.isArray(spec.options) ? spec.options.length : 0;
        let index = Math.round(number);
        if (index < 0) index = 0;
        if (count > 0 && index >= count) {
          const fallback = Number(spec.defaultValue);
          index = Number.isFinite(fallback) && fallback >= 0 && fallback < count ? Math.round(fallback) : 0;
        }
        return index;
      }
      const bounds = spec.bounds || {};
      const min = Number.isFinite(bounds.min) ? bounds.min : -Infinity;
      const max = Number.isFinite(bounds.max) ? bounds.max : Infinity;
      const step = Number(bounds.step);
      const clamped = Math.min(max, Math.max(min, number));
      if (!Number.isFinite(step) || step === 0) return Number.isInteger(step) ? Math.round(clamped) : clamped;
      if (Math.round(step) === step) return Math.round(clamped);
      return Number(clamped.toFixed(2));
    }
    return value;
  };
}

function createHpFieldCatalog(schema = HP_SCHEMA, {
  coerceValue: customCoerceValue = null,
  variant = "shared",
  bindings = []
} = {}) {
  const source = schema && typeof schema === "object" ? schema : {};
  const coerce = customCoerceValue || createSchemaCoercer(source);
  const createDefault = () => Object.fromEntries(
    Object.entries(source).map(([id, spec]) => [id, coerce(id, spec?.defaultValue)])
  );
  const sanitize = (state = {}) => Object.fromEntries(
    Object.entries(source).map(([id, spec]) => [id, coerce(id, state?.[id] ?? spec?.defaultValue)])
  );
  const splitGroups = () => {
    const rootGroups = [];
    for (const [id, spec] of Object.entries(source)) {
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
  };
  const visible = (spec, state) => {
    if (!spec?.visibleWhen) return true;
    const { id, equals } = spec.visibleWhen;
    return state?.[id] === equals;
  };
  const count = (values, defaultState = createDefault()) => Object.keys(source)
    .reduce((total, id) => total + (Object.is(values?.[id], defaultState[id]) ? 0 : 1), 0);
  return Object.freeze({
    schema: source,
    variant,
    bindings: Object.freeze([...bindings]),
    coerceValue: coerce,
    createDefaultState: createDefault,
    sanitizeState: sanitize,
    splitCategoryGroups: splitGroups,
    isFieldVisible: visible,
    getCategoryKey,
    getCategoryPathLabel,
    countOverrides: count
  });
}

const REWRITE_BINDING_DATA = [
  ["enabled", "hp_enabled", "toggle", "Enable enemy HP colors", "OVERVIEW|MASTER", true],
  ["widthScale", "hp_width_scale", "slider", "Healthbar width", "OVERVIEW|LAYOUT", 100, { min: 60, max: 230, step: 1 }],
  ["heightScale", "hp_height_scale", "slider", "Healthbar height", "OVERVIEW|LAYOUT", 100, { min: 60, max: 160, step: 1 }],
  ["positionX", "hp_bar_offset_x", "slider", "Healthbar horizontal offset", "OVERVIEW|LAYOUT", 0, { min: -300, max: 300, step: 1 }],
  ["positionY", "hp_bar_offset_y", "slider", "Healthbar vertical offset", "OVERVIEW|LAYOUT", 0, { min: -200, max: 200, step: 1 }],
  ["enemyEnabled", "hp_enemy_enabled", "toggle", "Color enemy HP bars", "ENEMY|BAR", true],
  ["enemyVisible", "hp_enemy_visible", "toggle", "Show enemy HP bars", "ENEMY|BAR", true, null, null, "hp_bg_visible"],
  ["enemyMode", "hp_mode", "cycler", "Enemy color behavior", "ENEMY|BAR", "gradient", null, ["fixed", "gradient"]],
  ["enemyLow", "hp_color_low", "colorpicker", "Low HP bar color", "ENEMY|BAR", "#E16161", null, null, null, "#FD4949"],
  ["enemyMid", "hp_color_mid", "colorpicker", "Mid HP bar color", "ENEMY|BAR", "#FF7B00"],
  ["enemyHigh", "hp_color_high", "colorpicker", "High HP bar color", "ENEMY|BAR", "#00FF00"],
  ["enemyTeamHigh", "hp_team_colors", "toggle", "Use team color at high HP", "ENEMY|BAR", false],
  ["enemyHealing", "hp_heal_color", "colorpicker", "Healing bar color", "ENEMY|HEAL & DAMAGE", "#5FFF80"],
  ["enemyDelta", "hp_delta_color", "colorpicker", "Damage delta color", "ENEMY|HEAL & DAMAGE", "#FFE55B"],
  ["enemyBulletShield", "hp_bullet_shield_color", "colorpicker", "Enemy bullet shield color", "ENEMY|SHIELDS", "#FFFFFF"],
  ["allyEnabled", "hp_friend_enabled", "toggle", "Color ally HP bars", "ALLY|BAR", false],
  ["allyVisible", "hp_friend_visible", "toggle", "Show ally HP bars", "ALLY|BAR", true],
  ["allyMode", "hp_friend_mode", "cycler", "Ally color behavior", "ALLY|BAR", "fixed", null, ["fixed", "gradient"]],
  ["allyLow", "hp_friend_color_low", "colorpicker", "Ally low HP color", "ALLY|BAR", "#E16161", null, null, null, "#FFEFD7"],
  ["allyMid", "hp_friend_color_mid", "colorpicker", "Ally mid HP color", "ALLY|BAR", "#FFED79", null, null, null, "#FFEFD7"],
  ["allyHigh", "hp_friend_color_high", "colorpicker", "Ally high HP color", "ALLY|BAR", "#70F8C1", null, null, null, "#FFEFD7"],
  ["allyHealing", "hp_friend_heal_color", "colorpicker", "Ally healing bar color", "ALLY|HEAL & DAMAGE", "#5FFF80"],
  ["allyDelta", "hp_friend_delta_color", "colorpicker", "Ally damage delta color", "ALLY|HEAL & DAMAGE", "#504C47"],
  ["allyBulletShield", "hp_friend_bullet_shield_color", "colorpicker", "Ally bullet shield color", "ALLY|SHIELDS", "#FFFFFF"],
  ["ultMode", "hp_ult_color_enabled", "toggle", "Color ult icon", "HEALTH INFO|INDICATORS", "follow", null, ["follow", "custom"]],
  ["ultCustom", "hp_ult_color_custom", "colorpicker", "Ult icon custom color", "HEALTH INFO|INDICATORS", "#E16161"],
  ["readoutVisible", "hp_counter_visible", "toggle", "Show HP number", "HEALTH INFO|HP TEXT", true],
  ["readoutFormat", "hp_counter_format", "cycler", "HP number format", "HEALTH INFO|HP TEXT", "hp", null, ["hp", "percent", "current"]],
  ["readoutSize", "hp_counter_size", "slider", "HP number size", "HEALTH INFO|HP TEXT", 145, { min: 72, max: 320, step: 1 }],
  ["readoutFont", "hp_readout_font", "cycler", "HP number font", "HEALTH INFO|HP TEXT", "default", null, ["default", "oracle", "pulp"]],
  ["readoutOffsetX", "hp_readout_offset_x", "slider", "HP number horizontal offset", "HEALTH INFO|TEXT POSITION", 27, { min: -405, max: 405, step: 1 }, null, { id: "hp_counter_position", axis: "x" }, -30],
  ["readoutOffsetY", "hp_readout_offset_y", "slider", "HP number vertical offset", "HEALTH INFO|TEXT POSITION", 500, { min: -35, max: 840, step: 1 }, null, { id: "hp_counter_position", axis: "y" }, 434],
  ["readoutColorMode", "hp_text_color_mode", "cycler", "HP number color source", "HEALTH INFO|HP TEXT", "bar", null, ["bar", "custom"]],
  ["readoutMode", "hp_readout_mode", "cycler", "HP number color behavior", "HEALTH INFO|HP TEXT", "fixed", null, ["fixed", "gradient"]],
  ["readoutLow", "hp_text_color_low", "colorpicker", "Low HP number color", "HEALTH INFO|HP TEXT", "#E16161"],
  ["readoutMid", "hp_text_color_mid", "colorpicker", "Mid HP number color", "HEALTH INFO|HP TEXT", "#FF7B00"],
  ["readoutHigh", "hp_text_color_high", "colorpicker", "High HP number color", "HEALTH INFO|HP TEXT", "#FFFFFF"],
  ["pipsVisible", "hp_pip_visible", "toggle", "Show pip HP segments", "HEALTH INFO|INDICATORS", true],
  ["precisePipsEnabled", "hp_precise_pips_enabled", "toggle", "More Precise HP Pips", "HEALTH INFO|INDICATORS", false],
  ["levelsVisible", "hp_level_number_visible", "toggle", "Show level number", "HEALTH INFO|INDICATORS", true],
  ["lowThreshold", "hp_low_threshold", "slider", "Low HP starts at %", "ENEMY|BAR", 25, { min: 0, max: 99, step: 1 }],
  ["highThreshold", "hp_high_threshold", "slider", "High HP starts at %", "ENEMY|BAR", 65, { min: 1, max: 100, step: 1 }],
  ["enemyPulseEnabled", "hp_pulse_enabled", "toggle", "Pulse enemy bars at low HP", "ENEMY|PULSE", true],
  ["enemyPulseThreshold", "hp_pulse_threshold", "slider", "Enemy pulse starts below %", "ENEMY|PULSE", 25, { min: 0, max: 100, step: 1 }],
  ["enemyPulseBpm", "hp_pulse_bpm", "slider", "Enemy pulse speed", "ENEMY|PULSE", 75, { min: 30, max: 300, step: 1 }],
  ["enemyPulseIntensity", "hp_pulse_intensity", "slider", "Enemy pulse strength", "ENEMY|PULSE", 1, { min: 0, max: 2, step: 1 }],
  ["enemyPulseColorEnabled", "hp_pulse_color_enabled", "toggle", "Use custom enemy pulse color", "ENEMY|PULSE", false],
  ["enemyPulseColorMode", "hp_pulse_color_mode", "cycler", "Enemy pulse color behavior", "ENEMY|PULSE", "gradient", null, ["fixed", "gradient"]],
  ["enemyPulseColor", "hp_pulse_color", "colorpicker", "Enemy pulse color", "ENEMY|PULSE", "#FF2222"],
  ["enemyPulseHideBar", "hp_pulse_hide_bar", "toggle", "Hide bar while enemy pulse runs", "ENEMY|PULSE", false],
  ["enemyPulseReadout", "hp_pulse_text_enabled", "toggle", "Pulse enemy HP number", "ENEMY|PULSE", false],
  ["enemyPulseReadoutModifiers", "hp_pulse_readout_modifiers", "toggle", "Use pulse number modifiers", "ENEMY|PULSE", false],
  ["enemyPulseReadoutSize", "hp_pulse_text_scale", "slider", "Pulsing number size", "ENEMY|PULSE", 145, { min: 72, max: 320, step: 1 }],
  ["enemyPulseReadoutOffsetX", "hp_pulse_readout_offset_x", "slider", "Pulsing number horizontal offset", "ENEMY|PULSE", 27, { min: -405, max: 405, step: 1 }, null, { id: "hp_pulse_text_position", axis: "x" }],
  ["enemyPulseReadoutOffsetY", "hp_pulse_readout_offset_y", "slider", "Pulsing number vertical offset", "ENEMY|PULSE", 500, { min: -35, max: 840, step: 1 }, null, { id: "hp_pulse_text_position", axis: "y" }],
  ["allyPulseEnabled", "hp_friend_pulse_enabled", "toggle", "Pulse ally bars at low HP", "ALLY|PULSE", false],
  ["allyPulseThreshold", "hp_friend_pulse_threshold", "slider", "Ally pulse starts below %", "ALLY|PULSE", 25, { min: 0, max: 100, step: 1 }],
  ["allyPulseBpm", "hp_friend_pulse_bpm", "slider", "Ally pulse speed", "ALLY|PULSE", 75, { min: 30, max: 300, step: 1 }],
  ["allyPulseIntensity", "hp_friend_pulse_intensity", "slider", "Ally pulse strength", "ALLY|PULSE", 1, { min: 0, max: 2, step: 1 }],
  ["allyPulseColorEnabled", "hp_friend_pulse_color_enabled", "toggle", "Use custom ally pulse color", "ALLY|PULSE", false],
  ["allyPulseColor", "hp_friend_pulse_color", "colorpicker", "Ally pulse color", "ALLY|PULSE", "#FF2222"],
  ["enemyKillMarkerEnabled", "hp_kill_zone_enabled", "toggle", "Show kill marker", "ENEMY|KILL MARKER", false],
  ["enemyKillMarkerThreshold", "hp_kill_zone_threshold", "slider", "Marker position %", "ENEMY|KILL MARKER", 25, { min: 5, max: 80, step: 1 }],
  ["enemyKillMarkerWidth", "hp_kill_zone_width", "slider", "Marker width", "ENEMY|KILL MARKER", 3, { min: 1, max: 100, step: 1 }],
  ["enemyKillMarkerColor", "hp_kill_zone_color", "colorpicker", "Marker color", "ENEMY|KILL MARKER", "#FF2222"],
  ["ghoulOpacityEnabled", "hp_ghoul_opacity_enabled", "toggle", "Use custom ghoul opacity", "ENEMY|BAR", false],
  ["ghoulOpacity", "hp_ghoul_opacity", "slider", "Ghoul HUD opacity", "ENEMY|BAR", 100, { min: 0, max: 100, step: 1 }],
  ["readoutMaxTeamColor", "hp_readout_max_team_color", "toggle", "Team color max HP", "HEALTH INFO|HP TEXT", false],
  ["allyTeamHigh", "hp_friend_team_colors", "toggle", "Use team color at high HP", "ALLY|BAR", false],
  ["staminaWidth", "hpv2_stamina_width", "slider", "Stamina box width", "HEALTH INFO|STAMINA", 110, { min: 40, max: 220, step: 1 }],
  ["staminaHeight", "hpv2_stamina_height", "slider", "Stamina box height", "HEALTH INFO|STAMINA", 44.8, { min: 16, max: 90, step: 0.1 }],
  ["staminaOffsetX", "hpv2_stamina_offset_x", "slider", "Stamina horizontal offset", "HEALTH INFO|STAMINA", 0, { min: -300, max: 300, step: 1 }],
  ["staminaOffsetY", "hpv2_stamina_offset_y", "slider", "Stamina vertical offset", "HEALTH INFO|STAMINA", 0, { min: -200, max: 200, step: 1 }],
  ["enemyStaminaColorEnabled", "hpv2_enemy_stamina_color_enabled", "toggle", "Use custom enemy stamina color", "HEALTH INFO|STAMINA", false],
  ["enemyStaminaColor", "hpv2_enemy_stamina_color", "colorpicker", "Enemy stamina color", "HEALTH INFO|STAMINA", "#FD4949"],
  ["allyPulseColorMode", "hpv2_friend_pulse_color_mode", "cycler", "Ally pulse color behavior", "ALLY|PULSE", "fixed", null, ["fixed", "gradient"]],
  ["accessoryAnchorEnabled", "hpv2_accessory_anchor_enabled", "toggle", "Anchor indicators to healthbar", "HEALTH INFO|INDICATORS", true],
  ["ultOffsetX", "hpv2_ult_offset_x", "slider", "Ultimate horizontal position", "HEALTH INFO|INDICATORS", 0, { min: -300, max: 300, step: 1 }],
  ["ultOffsetY", "hpv2_ult_offset_y", "slider", "Ultimate vertical position", "HEALTH INFO|INDICATORS", 0, { min: -200, max: 200, step: 1 }],
  ["levelOffsetX", "hpv2_level_offset_x", "slider", "Level horizontal position", "HEALTH INFO|INDICATORS", 0, { min: -300, max: 300, step: 1 }],
  ["levelOffsetY", "hpv2_level_offset_y", "slider", "Level vertical position", "HEALTH INFO|INDICATORS", 0, { min: -200, max: 200, step: 1 }]
];

function freezeRewriteBinding(data) {
  const [canonicalKey, webId, webType, label, category, defaultValue, bounds = null, options = null, sharedSource = null, webDefaultOverride] = data;
  const canonicalType = webType === "colorpicker"
    ? "color"
    : webType === "toggle" && options
      ? "enum-toggle"
      : webType === "toggle"
        ? "boolean"
        : webType === "cycler"
          ? "enum"
          : "number";
  const webCanonicalDefault = webDefaultOverride ?? defaultValue;
  const webDefault = canonicalType === "enum"
    ? options.indexOf(webCanonicalDefault)
    : canonicalType === "enum-toggle"
      ? webCanonicalDefault === "follow"
      : webCanonicalDefault;
  return Object.freeze({
    canonicalKey,
    webId,
    webType,
    label,
    category,
    defaultValue,
    canonicalType,
    canonicalOptions: options ? Object.freeze([...options]) : Object.freeze([]),
    webCanonicalDefault,
    webDefault,
    bounds: bounds ? Object.freeze({ ...bounds }) : null,
    sharedSource: sharedSource && typeof sharedSource === "object"
      ? Object.freeze({ ...sharedSource })
      : sharedSource,
    conditionEligible: canonicalKey !== "precisePipsEnabled"
  });

}

export const REWRITE_FIELD_BINDINGS = Object.freeze(REWRITE_BINDING_DATA.map(freezeRewriteBinding));
const REWRITE_CODEC_KEYS = Object.freeze([
  "enabled",
  "widthScale",
  "heightScale",
  "positionX",
  "positionY",
  "enemyEnabled",
  "enemyVisible",
  "enemyMode",
  "enemyLow",
  "enemyMid",
  "enemyHigh",
  "enemyTeamHigh",
  "excludeBuildings",
  "excludeBosses",
  "enemyHealing",
  "enemyDelta",
  "enemyBulletShield",
  "allyEnabled",
  "allyVisible",
  "allyMode",
  "allyLow",
  "allyMid",
  "allyHigh",
  "allyHealing",
  "allyDelta",
  "allyBulletShield",
  "ultMode",
  "ultCustom",
  "readoutVisible",
  "readoutFormat",
  "readoutSize",
  "readoutFont",
  "readoutOffsetX",
  "readoutOffsetY",
  "readoutColorMode",
  "readoutMode",
  "readoutLow",
  "readoutMid",
  "readoutHigh",
  "pipsVisible",
  "precisePipsEnabled",
  "levelsVisible",
  "lowThreshold",
  "highThreshold",
  "enemyPulseEnabled",
  "enemyPulseThreshold",
  "enemyPulseBpm",
  "enemyPulseIntensity",
  "enemyPulseColorEnabled",
  "enemyPulseColorMode",
  "enemyPulseColor",
  "enemyPulseHideBar",
  "enemyPulseReadout",
  "enemyPulseReadoutModifiers",
  "enemyPulseReadoutSize",
  "enemyPulseReadoutOffsetX",
  "enemyPulseReadoutOffsetY",
  "allyPulseEnabled",
  "allyPulseThreshold",
  "allyPulseBpm",
  "allyPulseIntensity",
  "allyPulseColorEnabled",
  "allyPulseColor",
  "enemyKillMarkerEnabled",
  "enemyKillMarkerThreshold",
  "enemyKillMarkerWidth",
  "enemyKillMarkerColor",
  "excludeGhouls",
  "ghoulOpacityEnabled",
  "ghoulOpacity",
  "readoutMaxTeamColor",
  "allyTeamHigh"
]);
const HPV2_EXTENSION_KEYS = Object.freeze([
  "staminaWidth",
  "staminaHeight",
  "staminaOffsetX",
  "staminaOffsetY",
  "enemyStaminaColorEnabled",
  "enemyStaminaColor",
  "allyPulseColorMode",
  "accessoryAnchorEnabled",
  "ultOffsetX",
  "ultOffsetY",
  "levelOffsetX",
  "levelOffsetY"
]);
function retiredRewriteBinding(key) {
  return Object.freeze({
    ...freezeRewriteBinding([key, null, "toggle", "", "", false]),
    conditionEligible: false
  });
}
const RETIRED_REWRITE_CODEC_BINDINGS = [
  retiredRewriteBinding("excludeBuildings"),
  retiredRewriteBinding("excludeBosses"),
  retiredRewriteBinding("excludeGhouls")
];
const REWRITE_BINDING_BY_KEY = new Map(
  [...REWRITE_FIELD_BINDINGS, ...RETIRED_REWRITE_CODEC_BINDINGS]
    .map((binding) => [binding.canonicalKey, binding])
);
const REWRITE_WIRE_KEYS = [...REWRITE_CODEC_KEYS, ...HPV2_EXTENSION_KEYS];
if (
  new Set(REWRITE_WIRE_KEYS).size !== REWRITE_WIRE_KEYS.length ||
  REWRITE_WIRE_KEYS.length !== REWRITE_BINDING_BY_KEY.size
) {
  throw new Error("Invalid Rewrite wire slot declarations");
}
function bindingsForWireKeys(keys) {
  return Object.freeze(keys.map((key) => {
    const binding = REWRITE_BINDING_BY_KEY.get(key);
    if (!binding) throw new Error(`Missing Rewrite wire binding: ${key}`);
    return binding;
  }));
}
export const REWRITE_CODEC_FIELD_BINDINGS = bindingsForWireKeys(REWRITE_CODEC_KEYS);
export const HPV2_EXTENSION_FIELD_BINDINGS = bindingsForWireKeys(HPV2_EXTENSION_KEYS);
const REWRITE_SCHEMA = Object.freeze(Object.fromEntries(REWRITE_FIELD_BINDINGS.map((binding) => {
  const schemaEntry = {
    type: binding.webType,
    label: binding.label,
    category: binding.category,
    defaultValue: binding.webDefault,
    canonicalKey: binding.canonicalKey,
    canonicalDefault: binding.webCanonicalDefault,
    conditionEligible: binding.conditionEligible
  };
  if (binding.bounds) schemaEntry.bounds = binding.bounds;
  if (binding.canonicalKey === "enemyStaminaColor") {
    schemaEntry.visibleWhen = {
      id: "hpv2_enemy_stamina_color_enabled",
      equals: true
    };
  }
  if (binding.canonicalKey === "allyPulseColorMode") {
    schemaEntry.visibleWhen = {
      id: "hp_friend_pulse_color_enabled",
      equals: true
    };
  }
  if (binding.canonicalOptions.length && binding.canonicalType === "enum") {
    schemaEntry.options = binding.canonicalOptions.map((option) => (
      option === "percent"
        ? "%"
        : option === "current"
          ? "Current HP"
          : option[0].toUpperCase() + option.slice(1)
    ));
  }
  return [binding.webId, Object.freeze(schemaEntry)];
})));

export const REWRITE_FIELD_CATALOG = createHpFieldCatalog(REWRITE_SCHEMA, {
  variant: "rewrite",
  bindings: REWRITE_FIELD_BINDINGS
});
