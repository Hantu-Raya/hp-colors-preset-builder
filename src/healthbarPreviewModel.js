import { REWRITE_FIELD_CATALOG } from "./hpSchema.js";

const STOCK = Object.freeze({
  team1: "#E7B659",
  team2: "#5B79E6",
  neutral: "#5BEFB5",
  enemy: "#FD4949",
  ally: "#FFEFD7",
  healing: "#5FFF80",
  deltaTeam: "#FFEDB8",
  deltaNeutral: "#F24D4D",
  deltaEnemy: "#FFE55B",
  deltaAlly: "#504C47",
  shieldTeam1: "#E9E76A",
  shieldTeam2: "#6A75E9",
  shieldEnemy: "#B95F5F",
  shieldAlly: "#ACCA91",
  shieldDefault: "#FFFFFF"
});

const DEFAULT_SCENARIO = Object.freeze({
  healthPercent: 100,
  relation: "enemy",
  team: "enemy",
  unitKind: "hero",
  maxHealth: 800,
  level: 1,
  healingPercent: 0,
  damagePercent: 0,
  bulletShieldPercent: 0,
  techShieldPercent: 0,
  animationPaused: false
});

const LEVEL_TIERS = Object.freeze([
  Object.freeze({ tier: 2, minimum: 11, className: "level_tier2", color: "#f0d000" }),
  Object.freeze({ tier: 3, minimum: 19, className: "level_tier3", color: "#ff8c00" }),
  Object.freeze({ tier: 4, minimum: 27, className: "level_tier4", color: "#e53935" }),
  Object.freeze({ tier: 5, minimum: 35, className: "level_tier5", color: "#8b0000" })
]);

const FONT_FAMILIES = Object.freeze({
  default: "Retail Demo, Noto Sans, sans-serif",
  oracle: "VALVEOracle, Reaver, sans-serif",
  pulp: "VALVEPulp, Noto Sans, sans-serif"
});

const RELATIONS = new Set(["enemy", "ally", "neutral", "other"]);
const TEAMS = new Set(["team1", "team2", "enemy", "ally", "neutral", ""]);
const UNIT_KINDS = new Set(["hero", "player", "trooper", "building", "boss", "sentry", "ghoul", "creature", "vertical", "other"]);

function isObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizePercent(value, fallback) {
  return normalizeNumber(value, fallback, 0, 100);
}

function normalizeBoolean(value, fallback) {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function normalizeToken(value, fallback, allowed) {
  const token = value?.trim?.().toLowerCase?.() ?? "";
  return allowed.has(token) ? token : fallback;
}

function normalizeScenario(input) {
  const source = isObject(input) ? input : {};
  const relation = normalizeToken(source.relation, DEFAULT_SCENARIO.relation, RELATIONS);
  const team = normalizeToken(source.team, DEFAULT_SCENARIO.team, TEAMS);
  const unitKind = normalizeToken(source.unitKind, DEFAULT_SCENARIO.unitKind, UNIT_KINDS);
  return {
    healthPercent: normalizePercent(source.healthPercent, DEFAULT_SCENARIO.healthPercent),
    relation,
    team,
    unitKind,
    maxHealth: normalizeNumber(source.maxHealth, DEFAULT_SCENARIO.maxHealth, 0, 1000000000),
    level: normalizeNumber(source.level, DEFAULT_SCENARIO.level, 0, 100),
    healingPercent: normalizePercent(source.healingPercent, DEFAULT_SCENARIO.healingPercent),
    damagePercent: normalizePercent(source.damagePercent, DEFAULT_SCENARIO.damagePercent),
    bulletShieldPercent: normalizePercent(source.bulletShieldPercent, DEFAULT_SCENARIO.bulletShieldPercent),
    techShieldPercent: normalizePercent(source.techShieldPercent, DEFAULT_SCENARIO.techShieldPercent),
    animationPaused: normalizeBoolean(source.animationPaused, DEFAULT_SCENARIO.animationPaused)
  };
}

function normalizeProfileState(input) {
  const state = REWRITE_FIELD_CATALOG.sanitizeState(isObject(input) ? input : {});
  let lowThreshold = normalizeNumber(state.hp_low_threshold, 25, 0, 99);
  let highThreshold = normalizeNumber(state.hp_high_threshold, 65, 1, 100);
  lowThreshold = Math.min(lowThreshold, Math.max(0, highThreshold - 1));
  highThreshold = Math.max(highThreshold, Math.min(100, lowThreshold + 1));
  return { ...state, hp_low_threshold: lowThreshold, hp_high_threshold: highThreshold };
}

function enumValue(state, key, values, fallback) {
  const index = Number(state[key]);
  return Number.isInteger(index) && index >= 0 && index < values.length ? values[index] : fallback;
}

function interpolateHex(left, right, amount) {
  const leftInt = parseInt(left.slice(1), 16);
  const rightInt = parseInt(right.slice(1), 16);
  const t = Math.max(0, Math.min(1, amount));
  const red = (((leftInt >> 16) & 255) + (((rightInt >> 16) & 255) - ((leftInt >> 16) & 255)) * t) | 0;
  const green = (((leftInt >> 8) & 255) + (((rightInt >> 8) & 255) - ((leftInt >> 8) & 255)) * t) | 0;
  const blue = ((leftInt & 255) + ((rightInt & 255) - (leftInt & 255)) * t) | 0;
  return `#${((1 << 24) | (red << 16) | (green << 8) | blue).toString(16).slice(1)}`;
}

function thresholdColor(percent, low, mid, high, mode, lowThreshold, highThreshold) {
  if (percent <= lowThreshold) return low;
  if (mode === "fixed") return percent <= highThreshold ? mid : high;
  if (percent <= highThreshold) {
    return interpolateHex(low, mid, (percent - lowThreshold) / Math.max(1, highThreshold - lowThreshold));
  }
  return interpolateHex(mid, high, (percent - highThreshold) / Math.max(1, 100 - highThreshold));
}

function stockUnitColor(relation, team) {
  if (relation === "neutral") return STOCK.neutral;
  if (relation === "enemy") return STOCK.enemy;
  if (relation === "ally") return STOCK.ally;
  if (team === "team1") return STOCK.team1;
  if (team === "team2") return STOCK.team2;
  return "";
}

function stockDeltaColor(relation, team) {
  if (relation === "neutral") return STOCK.deltaNeutral;
  if (relation === "enemy") return STOCK.deltaEnemy;
  if (relation === "ally") return STOCK.deltaAlly;
  if (team === "team1" || team === "team2") return STOCK.deltaTeam;
  return "";
}

function stockShieldColor(relation, team) {
  if (relation === "enemy") return STOCK.shieldEnemy;
  if (relation === "ally") return STOCK.shieldAlly;
  if (team === "team1") return STOCK.shieldTeam1;
  if (team === "team2") return STOCK.shieldTeam2;
  return STOCK.shieldDefault;
}

function tierForLevel(level) {
  let result = null;
  for (const tier of LEVEL_TIERS) {
    if (level >= tier.minimum) result = tier;
  }
  return result;
}

function stockDimensions(unitKind) {
  if (unitKind === "sentry") return { width: 600, height: 80 };
  if (unitKind === "boss") return { width: 1400, height: 170 };
  if (unitKind === "vertical") return { width: 700, height: 140 };
  return { width: 900, height: 130 };
}

function rewriteDimensions(unitKind) {
  if (unitKind === "sentry" || unitKind === "trooper") return { width: 500, height: 70 };
  return { width: 750, height: 120 };
}

function rawAmount(maxHealth, percent) {
  return Math.round((maxHealth * percent) / 100);
}

function createLayer({ percent, maxHealth, color, visible = percent > 0 }) {
  return {
    visible: !!visible,
    width: percent,
    percent,
    rawValue: rawAmount(maxHealth, percent),
    color
  };
}

function createHealthbarPipGeometry(pips, maxHealth, renderWidth) {
  const maximum = Math.max(1, Number(maxHealth) || 1);
  const width = Math.max(1, Number(renderWidth) || 1);
  const baseMinorHealth = Math.max(1, Number(pips?.minorHealth) || 100);
  const baseMinorCount = Math.floor(maximum / baseMinorHealth);
  const intervalScale = Math.max(1, Math.ceil((baseMinorCount * 4) / width));
  const minorHealth = baseMinorHealth * intervalScale;
  const majorHealth = minorHealth * 5;

  return {
    minorHealth,
    majorHealth,
    minorCount: Math.floor(maximum / minorHealth),
    majorCount: Math.floor(maximum / majorHealth),
    minorStepPercent: Math.min(100, (minorHealth / maximum) * 100),
    majorStepPercent: Math.min(100, (majorHealth / maximum) * 100)
  };
}

/**
 * Resolve a sanitized Rewrite web profile and preview-only scenario into a
 * browser-friendly, side-effect-free healthbar model. `bar.layers` widths are
 * percentages of max HP; each layer also exposes its computed `rawValue`.
 */
function createHealthbarPreviewModel(profileState, scenario, options = {}) {
  const state = normalizeProfileState(profileState);
  const normalizedScenario = normalizeScenario(scenario);
  const stock = isObject(options) && options.stock === true;
  const { relation, team, unitKind } = normalizedScenario;
  const roleOwned = relation === "enemy" || relation === "ally";
  const isPlayer = unitKind === "hero" || unitKind === "player";
  const isBuilding = unitKind === "building" || unitKind === "sentry";
  const isBoss = unitKind === "boss";
  const isGhoul = unitKind === "ghoul" || unitKind === "trooper" || unitKind === "creature";
  const globalEnabled = !!state.hp_enabled;
  const enemyRole = relation === "enemy";
  const roleEnabled = enemyRole ? !!state.hp_enemy_enabled : !!state.hp_friend_enabled;
  const colorsEnabled = globalEnabled && roleOwned && roleEnabled && !stock;
  const lowThreshold = state.hp_low_threshold;
  const highThreshold = state.hp_high_threshold;
  const enemyMode = enumValue(state, "hp_mode", ["fixed", "gradient"], "gradient");
  const allyMode = enumValue(state, "hp_friend_mode", ["fixed", "gradient"], "fixed");
  const mode = enemyRole ? enemyMode : allyMode;
  let low = enemyRole ? state.hp_color_low : state.hp_friend_color_low;
  let mid = enemyRole ? state.hp_color_mid : state.hp_friend_color_mid;
  let high = enemyRole ? state.hp_color_high : state.hp_friend_color_high;
  const teamHighEnabled = roleOwned && (enemyRole ? state.hp_team_colors : state.hp_friend_team_colors);
  if (teamHighEnabled && (team === "team1" || team === "team2")) {
    high = team === "team1" ? STOCK.team1 : STOCK.team2;
  }

  const stockColor = stockUnitColor(relation, team);
  const shieldTotalPercent = Math.min(100, normalizedScenario.bulletShieldPercent + normalizedScenario.techShieldPercent);
  const healthParentPercent = Math.max(normalizedScenario.healthPercent, 100 - shieldTotalPercent);
  const sampledPercent = healthParentPercent > 0
    ? Math.max(0, Math.min(100, Math.floor((normalizedScenario.healthPercent / healthParentPercent) * 100)))
    : 0;
  const normalColor = colorsEnabled
    ? thresholdColor(sampledPercent, low, mid, high, mode, lowThreshold, highThreshold)
    : stockColor;
  const pulseEnabled = colorsEnabled && (enemyRole ? !!state.hp_pulse_enabled : !!state.hp_friend_pulse_enabled);
  const pulseThreshold = enemyRole ? state.hp_pulse_threshold : state.hp_friend_pulse_threshold;
  const pulseActive = pulseEnabled && sampledPercent <= pulseThreshold;
  const pulseIntensity = enemyRole ? state.hp_pulse_intensity : state.hp_friend_pulse_intensity;
  const pulseBpm = enemyRole ? state.hp_pulse_bpm : state.hp_friend_pulse_bpm;
  const pulseColorEnabled = enemyRole ? !!state.hp_pulse_color_enabled : !!state.hp_friend_pulse_color_enabled;
  const pulseColorMode = enemyRole
    ? enumValue(state, "hp_pulse_color_mode", ["fixed", "gradient"], "gradient")
    : "fixed";
  const configuredPulseColor = enemyRole ? state.hp_pulse_color : state.hp_friend_pulse_color;
  let barColor = normalColor;
  if (pulseActive && pulseColorEnabled && (pulseColorMode === "fixed" || !enemyRole)) barColor = configuredPulseColor;

  const readoutMaximum = rawAmount(normalizedScenario.maxHealth, healthParentPercent);
  const ratio = healthParentPercent > 0
    ? Math.max(0, Math.min(1, normalizedScenario.healthPercent / healthParentPercent))
    : 0;
  const readoutCurrent = readoutMaximum <= 0
    ? 0
    : Math.max(0, Math.min(readoutMaximum, ratio >= 0.97 ? readoutMaximum : Math.round(readoutMaximum * ratio)));

  const readoutFormat = enumValue(state, "hp_counter_format", ["hp", "percent", "current"], "hp");
  const readoutEnabled = !stock && globalEnabled && enemyRole && !!state.hp_counter_visible;
  const readoutHasMaximum = readoutEnabled && readoutFormat === "hp" && readoutMaximum > 0;
  const readoutText = readoutEnabled
    ? readoutFormat === "percent"
      ? `${sampledPercent}%`
      : readoutMaximum <= 0
        ? ""
        : readoutFormat === "current"
          ? String(readoutCurrent)
          : `${readoutCurrent} / `
    : "";
  const readoutMaxText = readoutHasMaximum ? String(readoutMaximum) : "";
  const readoutColorMode = enumValue(state, "hp_text_color_mode", ["bar", "custom"], "bar");
  const readoutMode = readoutColorMode === "custom"
    ? enumValue(state, "hp_readout_mode", ["fixed", "gradient"], "fixed")
    : mode;
  const readoutLow = readoutColorMode === "custom" ? state.hp_text_color_low : low;
  const readoutMid = readoutColorMode === "custom" ? state.hp_text_color_mid : mid;
  const readoutHigh = readoutColorMode === "custom" ? state.hp_text_color_high : high;
  const readoutColor = readoutEnabled && readoutText
    ? thresholdColor(sampledPercent, readoutLow, readoutMid, readoutHigh, readoutMode, lowThreshold, highThreshold)
    : "";
  const readoutMaxColor = readoutMaxText && !!state.hp_readout_max_team_color
    ? team === "team1"
      ? STOCK.team1
      : team === "team2"
        ? STOCK.team2
        : readoutColor
    : readoutColor;
  const readoutFont = enumValue(state, "hp_readout_font", ["default", "oracle", "pulp"], "default");
  const readoutModifiers = pulseActive && enemyRole && !!state.hp_pulse_readout_modifiers && readoutEnabled;
  const readoutSize = readoutModifiers ? state.hp_pulse_text_scale : state.hp_counter_size;
  const readoutOffsetX = readoutModifiers ? state.hp_pulse_readout_offset_x : state.hp_readout_offset_x;
  const readoutOffsetY = readoutModifiers ? state.hp_pulse_readout_offset_y : state.hp_readout_offset_y;

  const customGeometry = !stock && globalEnabled && roleOwned;
  const dimensions = customGeometry ? rewriteDimensions(unitKind) : stockDimensions(unitKind);
  const widthScalePercent = customGeometry ? state.hp_width_scale : 100;
  const heightScalePercent = customGeometry ? state.hp_height_scale : 100;
  const widthPx = Math.round((dimensions.width * widthScalePercent) / 100);
  const heightPx = Math.round((dimensions.height * heightScalePercent) / 100);
  const offsetX = customGeometry ? state.hp_bar_offset_x : 0;
  const offsetY = customGeometry ? state.hp_bar_offset_y : 0;
  const transform = offsetX === 0 && offsetY === 0 ? "" : `translateX(${offsetX}px) translateY(${offsetY}px)`;
  const visibleSetting = enemyRole ? !!state.hp_enemy_visible : !!state.hp_friend_visible;
  const ghoulOpacity = isGhoul && globalEnabled && roleOwned && !!state.hp_ghoul_opacity_enabled
    ? state.hp_ghoul_opacity <= 1 ? 0.01 : state.hp_ghoul_opacity / 100
    : null;
  const hideBar = pulseActive && enemyRole && !!state.hp_pulse_hide_bar;
  const visible = ghoulOpacity !== null
    ? ghoulOpacity > 0.01
    : !colorsEnabled || (visibleSetting && !hideBar);
  const opacity = ghoulOpacity !== null
    ? ghoulOpacity
    : colorsEnabled && (!visibleSetting || hideBar)
      ? 0.01
      : 1;

  const healingColor = colorsEnabled ? (enemyRole ? state.hp_heal_color : state.hp_friend_heal_color) : STOCK.healing;
  const deltaColor = colorsEnabled ? (enemyRole ? state.hp_delta_color : state.hp_friend_delta_color) : stockDeltaColor(relation, team);
  const bulletShieldColor = colorsEnabled ? (enemyRole ? state.hp_bullet_shield_color : state.hp_friend_bullet_shield_color) : stockShieldColor(relation, team);
  const layers = {
    fill: createLayer({ percent: normalizedScenario.healthPercent, maxHealth: normalizedScenario.maxHealth, color: barColor }),
    missing: createLayer({ percent: Math.max(0, 100 - normalizedScenario.healthPercent), maxHealth: normalizedScenario.maxHealth, color: "" }),
    healing: createLayer({ percent: normalizedScenario.healingPercent, maxHealth: normalizedScenario.maxHealth, color: healingColor }),
    damage: createLayer({ percent: normalizedScenario.damagePercent, maxHealth: normalizedScenario.maxHealth, color: deltaColor }),
    bulletShield: createLayer({ percent: normalizedScenario.bulletShieldPercent, maxHealth: normalizedScenario.maxHealth, color: bulletShieldColor }),
    techShield: createLayer({ percent: normalizedScenario.techShieldPercent, maxHealth: normalizedScenario.maxHealth, color: "" })
  };

  const precisePips = !!state.hp_precise_pips_enabled;
  const pipMinorHealth = precisePips ? 10 : 100;
  const pipMajorHealth = pipMinorHealth * 5;
  const pips = {
    visible: globalEnabled && enemyRole && !!state.hp_pip_visible,
    precise: precisePips,
    minorHealth: pipMinorHealth,
    majorHealth: pipMajorHealth,
    minorCount: Math.floor(normalizedScenario.maxHealth / pipMinorHealth),
    majorCount: Math.floor(normalizedScenario.maxHealth / pipMajorHealth)
  };

  const levelTier = tierForLevel(normalizedScenario.level);
  const levelEligible = !stock && globalEnabled && enemyRole && isPlayer && !isBuilding && !isBoss;
  const levelVisible = levelEligible && !!state.hp_level_number_visible && normalizedScenario.level > 0;
  const ultMode = state.hp_ult_color_enabled ? "follow" : "custom";
  let ultColor = stockColor;
  if (!stock && globalEnabled && roleOwned) {
    if (ultMode === "custom") ultColor = state.hp_ult_color_custom;
    else if (colorsEnabled) ultColor = barColor;
  }
  if (!stock && pulseActive && ultMode !== "custom") ultColor = barColor;

  const markerParentWidth = (widthPx * healthParentPercent) / 100;
  const markerEnabled = markerParentWidth > 0 && !stock && globalEnabled && enemyRole && !!state.hp_enemy_enabled && !!state.hp_enemy_visible && !!state.hp_kill_zone_enabled && isPlayer && !isBuilding && !isBoss && !hideBar;
  const markerWidth = markerEnabled ? Math.min(state.hp_kill_zone_width, markerParentWidth) : 0;
  const markerLeft = markerEnabled
    ? Math.max(0, Math.min(markerParentWidth - markerWidth, Math.round((markerParentWidth * state.hp_kill_zone_threshold) / 100 - markerWidth / 2)))
    : 0;

  const pulseDuration = pulseActive ? `${(60 / pulseBpm).toFixed(3)}s` : "";
  const pulseClassName = pulseActive ? pulseIntensity === 0 ? "subtle" : pulseIntensity === 2 ? "intense" : "medium" : "";
  const pulseColor = pulseActive ? (pulseColorEnabled ? configuredPulseColor : barColor) : "";
  const pulse = {
    active: pulseActive,
    paused: pulseActive && normalizedScenario.animationPaused,
    intensity: pulseIntensity,
    className: pulseClassName,
    bpm: pulseBpm,
    duration: pulseDuration,
    color: pulseColor,
    colorMode: pulseColorMode,
    hideBar,
    readoutActive: pulseActive && enemyRole && !!state.hp_pulse_text_enabled && readoutEnabled,
    readoutModifiers,
    overlayVisible: pulseActive,
    overlayWidth: pulseActive ? normalizedScenario.healthPercent : 0,
    overlayColor: pulseColor
  };
  const marker = {
    visible: markerEnabled,
    thresholdPercent: state.hp_kill_zone_threshold,
    widthPx: markerWidth,
    leftPx: markerLeft,
    color: markerEnabled ? state.hp_kill_zone_color : ""
  };

  return {
    scenario: normalizedScenario,
    bar: {
      visible,
      opacity,
      widthPx,
      heightPx,
      widthScalePercent,
      heightScalePercent,
      baseWidthPx: dimensions.width,
      baseHeightPx: dimensions.height,
      offsetX,
      offsetY,
      transform,
      color: barColor,
      healthParentPercent,
      pips,
      layers
    },
    readout: {
      visible: !!readoutText,
      text: readoutText,
      color: readoutColor,
      maxText: readoutMaxText,
      maxColor: readoutMaxColor,
      fontFamily: FONT_FAMILIES[readoutFont],
      fontSize: readoutText ? readoutSize : 0,
      offsetX: readoutText ? readoutOffsetX : 0,
      offsetY: readoutText ? readoutOffsetY : 0
    },
    level: {
      visible: levelVisible,
      value: normalizedScenario.level,
      tier: levelTier ? levelTier.tier : null,
      className: levelVisible && levelTier ? levelTier.className : "",
      color: levelVisible && levelTier ? levelTier.color : ""
    },
    ult: {
      visible: roleOwned,
      color: ultColor
    },
    killMarker: marker,
    pulse,
    stock
  };
}

export { createHealthbarPipGeometry, createHealthbarPreviewModel, DEFAULT_SCENARIO };
