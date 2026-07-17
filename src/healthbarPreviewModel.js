import { normalizeHpPresetValues } from "./hpPresetPayload.js";

const SAMPLE_HEALTH = Object.freeze([
  Object.freeze({ id: "low", label: "Low", percent: 18, maxHp: 1000 }),
  Object.freeze({ id: "mid", label: "Mid", percent: 48, maxHp: 1000 }),
  Object.freeze({ id: "high", label: "High", percent: 82, maxHp: 1000 })
]);
const TEAM_COLORS = Object.freeze({ enemy: "#D96565", ally: "#68A8D6" });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));
}

function parseHex(color) {
  const value = String(color || "").replace("#", "");
  if (!/^[0-9A-F]{6}$/i.test(value)) return [255, 255, 255];
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function mixHex(from, to, amount) {
  const start = parseHex(from);
  const end = parseHex(to);
  const ratio = clamp(amount, 0, 1);
  return `#${start.map((channel, index) => Math.round(channel + ((end[index] - channel) * ratio)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function healthColor(percent, low, mid, high, lowThreshold, highThreshold, gradient) {
  if (!gradient) {
    if (percent <= lowThreshold) return low;
    if (percent < highThreshold) return mid;
    return high;
  }
  if (percent <= lowThreshold) return low;
  if (percent >= highThreshold) return high;
  const midpoint = lowThreshold + ((highThreshold - lowThreshold) / 2);
  if (percent <= midpoint) return mixHex(low, mid, (percent - lowThreshold) / Math.max(1, midpoint - lowThreshold));
  return mixHex(mid, high, (percent - midpoint) / Math.max(1, highThreshold - midpoint));
}

function formatCounter(format, currentHp, percent) {
  if (format === 1) return `${percent}%`;
  if (format === 2) return String(currentHp);
  return `${currentHp} HP`;
}

function makeSample(values, team, sample) {
  const ally = team === "ally";
  const prefix = ally ? "hp_friend_" : "hp_";
  const enabled = ally ? values.hp_friend_enabled : values.hp_enabled;
  const low = values[`${prefix}color_low`];
  const mid = values[`${prefix}color_mid`];
  const configuredHigh = values[`${prefix}color_high`];
  const high = values.hp_team_colors ? TEAM_COLORS[team] : configuredHigh;
  const fillColor = healthColor(
    sample.percent,
    low,
    mid,
    high,
    clamp(values.hp_low_threshold, 0, 100),
    clamp(values.hp_high_threshold, 0, 100),
    values.hp_mode === 1
  );
  const pulseEnabled = ally ? values.hp_friend_pulse_enabled : values.hp_pulse_enabled;
  const pulseThreshold = ally ? values.hp_friend_pulse_threshold : values.hp_pulse_threshold;
  const pulseBpm = ally ? values.hp_friend_pulse_bpm : values.hp_pulse_bpm;
  const pulseIntensity = ally ? values.hp_friend_pulse_intensity : values.hp_pulse_intensity;
  const customPulse = ally ? values.hp_friend_pulse_color_enabled : values.hp_pulse_color_enabled;
  const pulseColor = customPulse ? values[`${prefix}pulse_color`] : fillColor;
  const currentHp = Math.round(sample.maxHp * (sample.percent / 100));
  const counterColor = values.hp_text_color_mode === 1
    ? healthColor(sample.percent, values.hp_text_color_low, values.hp_text_color_mid, values.hp_text_color_high, values.hp_low_threshold, values.hp_high_threshold, values.hp_mode === 1)
    : fillColor;

  return Object.freeze({
    id: `${team}-${sample.id}`,
    team,
    label: sample.label,
    enabled: Boolean(enabled),
    healthPercent: sample.percent,
    currentHp,
    fillColor,
    healingColor: values[`${prefix}heal_color`],
    damageColor: values[`${prefix}delta_color`],
    shieldColor: values[`${prefix}bullet_shield_color`],
    counterVisible: Boolean(values.hp_counter_visible),
    counterText: formatCounter(values.hp_counter_format, currentHp, sample.percent),
    counterColor,
    levelVisible: Boolean(values.hp_level_number_visible),
    pipsVisible: Boolean(values.hp_pip_visible),
    pulse: Boolean(pulseEnabled && sample.percent <= pulseThreshold),
    pulseColor,
    pulseDurationMs: Math.round(60000 / clamp(pulseBpm, 30, 300)),
    pulseScale: [1.025, 1.055, 1.09][clamp(pulseIntensity, 0, 2)],
    hideBarWhilePulsing: Boolean(!ally && values.hp_pulse_hide_bar),
    killMarker: Object.freeze({
      visible: Boolean(values.hp_kill_zone_enabled),
      positionPercent: clamp(values.hp_kill_zone_threshold, 5, 80),
      color: values.hp_kill_zone_color,
      width: clamp(values.hp_kill_zone_width, 1, 100)
    })
  });
}

export function createHealthbarPreviewModel(inputValues) {
  const values = normalizeHpPresetValues(inputValues);
  const teams = ["enemy", "ally"].map((team) => Object.freeze({
    id: team,
    label: team === "enemy" ? "Enemy" : "Ally",
    enabled: team === "enemy" ? Boolean(values.hp_enabled) : Boolean(values.hp_friend_enabled),
    samples: Object.freeze(SAMPLE_HEALTH.map((sample) => makeSample(values, team, sample)))
  }));

  return Object.freeze({
    teams: Object.freeze(teams),
    barHeightScale: clamp(values.hp_healthbar_height, 0, 230) / 130,
    topOffsetScale: clamp(values.hp_info_health_margin_top, 0, 100) / 100,
    teamColorsEnabled: Boolean(values.hp_team_colors)
  });
}
