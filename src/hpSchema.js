export const HP_SCHEMA = {
  hp_enabled: { type: "toggle", label: "Enable enemy HP colors", category: "GENERAL|Core Behavior", defaultValue: true },
  hp_bg_visible: { type: "toggle", label: "Show enemy HP background", category: "GENERAL|Core Behavior", defaultValue: true },
  hp_mode: { type: "cycler", label: "Enemy color behavior", category: "GENERAL|Core Behavior", defaultValue: 1, options: ["Fixed", "Gradient"] },
  hp_low_threshold: { type: "slider", label: "Low HP starts at %", category: "GENERAL|Core Behavior", defaultValue: 25, bounds: { min: 0, max: 100, step: 1 } },
  hp_high_threshold: { type: "slider", label: "High HP starts at %", category: "GENERAL|Core Behavior", defaultValue: 65, bounds: { min: 0, max: 100, step: 1 } },
  hp_team_colors: { type: "toggle", label: "Use team color at high HP", category: "GENERAL|Core Behavior", defaultValue: false },
  hp_skip_buildings: { type: "toggle", label: "Ignore buildings and bosses", category: "GENERAL|Core Behavior", defaultValue: false },
  hp_info_health_margin_top: { type: "slider", label: "HP container top offset", category: "GENERAL|Core Behavior", defaultValue: 23, bounds: { min: 0, max: 100, step: 1 } },
  hp_healthbar_height: { type: "slider", label: "HP bar height", category: "GENERAL|Core Behavior", defaultValue: 130, bounds: { min: 0, max: 230, step: 1 } },

  hp_ult_color_enabled: { type: "toggle", label: "Color ult icon", category: "HEALTH BARS|Enemy Colors", defaultValue: true },
  hp_ult_color_custom: { type: "colorpicker", label: "Ult icon custom color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#E16161", visibleWhen: { id: "hp_ult_color_enabled", equals: false } },
  hp_color_low: { type: "colorpicker", label: "Low HP bar color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#E16161" },
  hp_color_mid: { type: "colorpicker", label: "Mid HP bar color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#FF7B00" },
  hp_color_high: { type: "colorpicker", label: "High HP bar color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#00FF00" },

  hp_pulse_enabled: { type: "toggle", label: "Pulse at low HP", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: true },
  hp_pulse_threshold: { type: "slider", label: "Pulse starts below %", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 25, bounds: { min: 0, max: 100, step: 1 }, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_bpm: { type: "slider", label: "Pulse speed", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 75, bounds: { min: 30, max: 300, step: 1 }, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_intensity: { type: "cycler", label: "Pulse strength", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 1, options: ["Subtle", "Medium", "Intense"], visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_hide_bar: { type: "toggle", label: "Hide bar while pulsing", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: false, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_text_enabled: { type: "toggle", label: "Pulse HP number", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: false, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_text_scale: { type: "slider", label: "Pulsing number size", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 120, bounds: { min: 72, max: 320, step: 1 }, visibleWhen: { id: "hp_pulse_text_enabled", equals: true } },
  hp_pulse_text_position: { type: "positionpicker", label: "Pulsing number position", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: "20,196", visibleWhen: { id: "hp_pulse_text_enabled", equals: true } },

  hp_counter_size: { type: "slider", label: "HP number size", category: "HEALTH BARS|Number Overlay", defaultValue: 145, bounds: { min: 72, max: 320, step: 1 } },
  hp_counter_position: { type: "positionpicker", label: "HP number position", category: "HEALTH BARS|Number Overlay", defaultValue: "27,20" },
  hp_counter_format: { type: "cycler", label: "HP number format", category: "HEALTH BARS|Number Overlay", defaultValue: 0, options: ["HP", "%", "Current HP"] },
  hp_text_color_mode: { type: "cycler", label: "HP number color source", category: "HEALTH BARS|Number Overlay", defaultValue: 0, options: ["Bar color", "Custom"] },
  hp_level_number_visible: { type: "toggle", label: "Show level number", category: "HEALTH BARS|Number Overlay", defaultValue: true },
  hp_pip_visible: { type: "toggle", label: "Show pip HP segments", category: "HEALTH BARS|Number Overlay", defaultValue: true },
  hp_text_color_low: { type: "colorpicker", label: "Low HP number color", category: "HEALTH BARS|Number Overlay", defaultValue: "#E16161", visibleWhen: { id: "hp_text_color_mode", equals: 1 } },
  hp_text_color_mid: { type: "colorpicker", label: "Mid HP number color", category: "HEALTH BARS|Number Overlay", defaultValue: "#FF7B00", visibleWhen: { id: "hp_text_color_mode", equals: 1 } },
  hp_text_color_high: { type: "colorpicker", label: "High HP number color", category: "HEALTH BARS|Number Overlay", defaultValue: "#FFFFFF", visibleWhen: { id: "hp_text_color_mode", equals: 1 } },

  hp_friend_enabled: { type: "toggle", label: "Color ally HP bars", category: "HEALTH BARS|Ally Colors", defaultValue: false },
  hp_friend_color_low: { type: "colorpicker", label: "Ally low HP color", category: "HEALTH BARS|Ally Colors", defaultValue: "#E16161", visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_color_mid: { type: "colorpicker", label: "Ally mid HP color", category: "HEALTH BARS|Ally Colors", defaultValue: "#FF7B00", visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_color_high: { type: "colorpicker", label: "Ally high HP color", category: "HEALTH BARS|Ally Colors", defaultValue: "#00FF00", visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_pulse_enabled: { type: "toggle", label: "Pulse ally bars", category: "HEALTH BARS|Ally Colors", defaultValue: false, visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_pulse_threshold: { type: "slider", label: "Ally pulse starts below %", category: "HEALTH BARS|Ally Colors", defaultValue: 25, bounds: { min: 0, max: 100, step: 1 }, visibleWhen: { id: "hp_friend_pulse_enabled", equals: true } },
  hp_friend_pulse_bpm: { type: "slider", label: "Ally pulse speed", category: "HEALTH BARS|Ally Colors", defaultValue: 75, bounds: { min: 30, max: 300, step: 1 }, visibleWhen: { id: "hp_friend_pulse_enabled", equals: true } },
  hp_friend_pulse_intensity: { type: "cycler", label: "Ally pulse strength", category: "HEALTH BARS|Ally Colors", defaultValue: 1, options: ["Subtle", "Medium", "Intense"], visibleWhen: { id: "hp_friend_pulse_enabled", equals: true } },
  hp_friend_pulse_color_enabled: { type: "toggle", label: "Use custom ally pulse color", category: "HEALTH BARS|Ally Colors", defaultValue: false, visibleWhen: { id: "hp_friend_pulse_enabled", equals: true } },
  hp_friend_pulse_color: { type: "colorpicker", label: "Ally pulse color", category: "HEALTH BARS|Ally Colors", defaultValue: "#FF2222", visibleWhen: { id: "hp_friend_pulse_color_enabled", equals: true } },

  hp_kill_zone_enabled: { type: "toggle", label: "Show kill marker", category: "VISUAL EFFECTS|Kill Marker", defaultValue: false },
  hp_kill_zone_threshold: { type: "slider", label: "Marker position %", category: "VISUAL EFFECTS|Kill Marker", defaultValue: 25, bounds: { min: 5, max: 80, step: 1 }, visibleWhen: { id: "hp_kill_zone_enabled", equals: true } },
  hp_kill_zone_color: { type: "colorpicker", label: "Marker color", category: "VISUAL EFFECTS|Kill Marker", defaultValue: "#FF2222", visibleWhen: { id: "hp_kill_zone_enabled", equals: true } },
  hp_kill_zone_width: { type: "slider", label: "Marker width", category: "VISUAL EFFECTS|Kill Marker", defaultValue: 3, bounds: { min: 1, max: 100, step: 1 }, visibleWhen: { id: "hp_kill_zone_enabled", equals: true } }
};

export function coerceHpValue(key, value) {
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
    if (typeof value === "string" && value.length > 0) return value;
    return (typeof spec.defaultValue === "string" && spec.defaultValue.length > 0) ? spec.defaultValue : "#FFFFFF";
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
