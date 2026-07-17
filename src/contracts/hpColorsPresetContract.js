const HP_SCHEMA_DEFINITION = {
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
  hp_heal_color: { type: "colorpicker", label: "Healing bar color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#5fff80" },
  hp_delta_color: { type: "colorpicker", label: "Damage delta color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#ffe55b" },
  hp_bullet_shield_color: { type: "colorpicker", label: "Enemy bullet shield color", category: "HEALTH BARS|Enemy Colors", defaultValue: "#ffffff" },

  hp_pulse_enabled: { type: "toggle", label: "Pulse at low HP", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: true },
  hp_pulse_threshold: { type: "slider", label: "Pulse starts below %", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 25, bounds: { min: 0, max: 100, step: 1 }, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_bpm: { type: "slider", label: "Pulse speed", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 75, bounds: { min: 30, max: 300, step: 1 }, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_intensity: { type: "cycler", label: "Pulse strength", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 1, options: ["Subtle", "Medium", "Intense"], visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_hide_bar: { type: "toggle", label: "Hide bar while pulsing", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: false, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_color_enabled: { type: "toggle", label: "Use custom pulse color", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: false, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_color_mode: { type: "cycler", label: "Pulse color behavior", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 0, options: ["Fixed", "Gradient"], visibleWhen: { id: "hp_pulse_color_enabled", equals: true } },
  hp_pulse_color: { type: "colorpicker", label: "Pulse color", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: "#FF2222", visibleWhen: { id: "hp_pulse_color_enabled", equals: true } },
  hp_pulse_text_enabled: { type: "toggle", label: "Pulse HP number", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: false, visibleWhen: { id: "hp_pulse_enabled", equals: true } },
  hp_pulse_text_scale: { type: "slider", label: "Pulsing number size", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: 120, bounds: { min: 72, max: 320, step: 1 }, visibleWhen: { id: "hp_pulse_text_enabled", equals: true } },
  hp_pulse_text_position: { type: "positionpicker", label: "Pulsing number position", category: "VISUAL EFFECTS|Low HP Pulse", defaultValue: "20,196", visibleWhen: { id: "hp_pulse_text_enabled", equals: true } },

  hp_counter_visible: { type: "toggle", label: "Show HP number", category: "HEALTH BARS|Number Overlay", defaultValue: true },
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
  hp_friend_heal_color: { type: "colorpicker", label: "Ally healing bar color", category: "HEALTH BARS|Ally Colors", defaultValue: "#5fff80", visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_delta_color: { type: "colorpicker", label: "Ally damage delta color", category: "HEALTH BARS|Ally Colors", defaultValue: "#504c47", visibleWhen: { id: "hp_friend_enabled", equals: true } },
  hp_friend_bullet_shield_color: { type: "colorpicker", label: "Ally bullet shield color", category: "HEALTH BARS|Ally Colors", defaultValue: "#FFFFFF", visibleWhen: { id: "hp_friend_enabled", equals: true } },
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

const HP_PERSISTENCE_ALIASES = {
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
};

const HP_LEGACY_PERSISTENCE_ALIASES = { kzs: "hp_kill_zone_color" };

const HP_HERO_CATALOG_DEFINITION = [
  { id: "hero_inferno", name: "Infernus", aliases: ["inferno", "infernus", "hero_infernus"] },
  { id: "hero_gigawatt", name: "Seven", aliases: ["gigawatt", "seven", "hero_seven"] },
  { id: "hero_hornet", name: "Vindicta", aliases: ["hornet", "vindicta", "hero_vindicta"] },
  { id: "hero_ghost", name: "Lady Geist", aliases: ["ghost", "geist", "lady_geist", "ladygeist", "hero_lady_geist"] },
  { id: "hero_atlas", name: "Abrams", aliases: ["atlas", "abrams", "bull", "hero_abrams"] },
  { id: "hero_wraith", name: "Wraith", aliases: ["wraith"] },
  { id: "hero_forge", name: "McGinnis", aliases: ["forge", "mcginnis", "mc_ginnis", "engineer", "hero_mcginnis"] },
  { id: "hero_chrono", name: "Paradox", aliases: ["chrono", "paradox", "hero_paradox"] },
  { id: "hero_dynamo", name: "Dynamo", aliases: ["dynamo", "sumo"] },
  { id: "hero_kelvin", name: "Kelvin", aliases: ["kelvin"] },
  { id: "hero_haze", name: "Haze", aliases: ["haze"] },
  { id: "hero_astro", name: "Ivy", aliases: ["astro", "ivy", "hero_ivy"] },
  { id: "hero_bebop", name: "Bebop", aliases: ["bebop"] },
  { id: "hero_nano", name: "Nano", aliases: ["nano"] },
  { id: "hero_orion", name: "Grey Talon", aliases: ["orion", "archer", "grey_talon", "gray_talon", "greytalon", "hero_grey_talon"] },
  { id: "hero_krill", name: "Mo & Krill", aliases: ["krill", "digger", "mo_and_krill", "mo_krill", "mo & krill", "hero_mo_and_krill"] },
  { id: "hero_shiv", name: "Shiv", aliases: ["shiv"] },
  { id: "hero_tengu", name: "Tengu", aliases: ["tengu"] },
  { id: "hero_warden", name: "Warden", aliases: ["warden"] },
  { id: "hero_yamato", name: "Yamato", aliases: ["yamato"] },
  { id: "hero_lash", name: "Lash", aliases: ["lash"] },
  { id: "hero_viscous", name: "Viscous", aliases: ["viscous"] },
  { id: "hero_synth", name: "Pocket", aliases: ["synth", "pocket", "hero_pocket"] },
  { id: "hero_mirage", name: "Mirage", aliases: ["mirage"] },
  { id: "hero_viper", name: "Vyper", aliases: ["viper", "vyper", "hero_vyper"] },
  { id: "hero_magician", name: "Magician", aliases: ["magician", "sinclair", "hero_sinclair"] },
  { id: "hero_vampirebat", name: "Mina", aliases: ["vampirebat", "vampire_bat", "mina", "hero_mina"] },
  { id: "hero_drifter", name: "Drifter", aliases: ["drifter"] },
  { id: "hero_priest", name: "Priest", aliases: ["priest"] },
  { id: "hero_frank", name: "Frank", aliases: ["frank"] },
  { id: "hero_bookworm", name: "Bookworm", aliases: ["bookworm", "paige", "hero_paige"] },
  { id: "hero_doorman", name: "Doorman", aliases: ["doorman", "door_man"] },
  { id: "hero_punkgoat", name: "Billy", aliases: ["punkgoat", "punk_goat", "billy", "hero_billy"] },
  { id: "hero_necro", name: "Necro", aliases: ["necro"] },
  { id: "hero_fencer", name: "Apollo", aliases: ["fencer", "apollo", "hero_apollo"] },
  { id: "hero_familiar", name: "Familiar", aliases: ["familiar"] },
  { id: "hero_werewolf", name: "Werewolf", aliases: ["werewolf"] },
  { id: "hero_unicorn", name: "Unicorn", aliases: ["unicorn"] }
];

export const HP_PRESET_SCHEMA = Object.freeze(HP_SCHEMA_DEFINITION);
export const HP_SCHEMA = HP_PRESET_SCHEMA;
export const HP_PRESET_FIELD_IDS = Object.freeze(Object.keys(HP_SCHEMA_DEFINITION));
export const HP_PRESET_SUPPORTED_FIELD_IDS = HP_PRESET_FIELD_IDS;
export const HP_PERSIST_ALIASES = Object.freeze(HP_PERSISTENCE_ALIASES);
export const HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS = Object.freeze(HP_LEGACY_PERSISTENCE_ALIASES);
export const HP_FULL_ONLY_EXCLUDED_FIELD_IDS = Object.freeze(["hp_precise_pips_enabled"]);
export const HP_FULL_RUNTIME_FIELD_IDS = Object.freeze([
  ...HP_PRESET_FIELD_IDS,
  ...HP_FULL_ONLY_EXCLUDED_FIELD_IDS
]);
export const HP_FULL_RUNTIME_FIELD_COUNT = HP_FULL_RUNTIME_FIELD_IDS.length;
export const HP_PRESET_FIELD_COUNT = HP_PRESET_FIELD_IDS.length;
export const HP_PRESET_PAYLOAD_VERSION = 1;
export const HP_RUNTIME_STORAGE_VERSION = 99;
export const HP_RUNTIME_LEGACY_STORAGE_VERSIONS = Object.freeze([97, 25]);
export const HP_ACCEPTED_INPUT_VERSIONS = Object.freeze([1, HP_RUNTIME_STORAGE_VERSION, ...HP_RUNTIME_LEGACY_STORAGE_VERSIONS]);
export const HP_PRESET_INPUT_VERSIONS = HP_ACCEPTED_INPUT_VERSIONS;
export const HP_ACCEPTED_INPUT_SHAPES = Object.freeze(["verbose", "compact", "minimal", "legacy-tuple"]);
export const HP_HERO_CATALOG = Object.freeze(HP_HERO_CATALOG_DEFINITION.map((hero) => Object.freeze({ ...hero, aliases: Object.freeze([...hero.aliases]) })));
export const HP_PRESET_FIELD_DEFINITIONS = HP_PRESET_SCHEMA;
export const HP_PRESET_FIELDS = HP_PRESET_SCHEMA;
export const HP_PRESET_DEFAULTS = Object.freeze(Object.fromEntries(
  HP_PRESET_FIELD_IDS.map((id) => [id, HP_PRESET_SCHEMA[id].defaultValue])
));
export const HP_PRESET_ALIASES = HP_PERSIST_ALIASES;
export const HP_PRESET_EXCLUDED_FIELD_IDS = HP_FULL_ONLY_EXCLUDED_FIELD_IDS;
export const HP_FULL_ONLY_FIELD_IDS = HP_FULL_ONLY_EXCLUDED_FIELD_IDS;
export const HP_PAYLOAD_OUTPUT_VERSION = HP_PRESET_PAYLOAD_VERSION;

export const HP_COLORS_PRESET_CONTRACT = Object.freeze({
  fieldIds: HP_PRESET_FIELD_IDS,
  supportedFieldIds: HP_PRESET_FIELD_IDS,
  fieldCount: HP_PRESET_FIELD_COUNT,
  fullRuntimeFieldIds: HP_FULL_RUNTIME_FIELD_IDS,
  fullRuntimeFieldCount: HP_FULL_RUNTIME_FIELD_COUNT,
  fields: HP_PRESET_SCHEMA,
  fieldDefinitions: HP_PRESET_SCHEMA,
  defaults: HP_PRESET_DEFAULTS,
  schema: HP_PRESET_SCHEMA,
  persistenceAliases: HP_PERSIST_ALIASES,
  aliases: HP_PERSIST_ALIASES,
  legacyPersistenceAliases: HP_LEGACY_FIELD_ID_BY_PERSIST_ALIAS,
  fullOnlyExcludedFieldIds: HP_FULL_ONLY_EXCLUDED_FIELD_IDS,
  excludedFieldIds: HP_FULL_ONLY_EXCLUDED_FIELD_IDS,
  payload: Object.freeze({
    version: HP_PRESET_PAYLOAD_VERSION,
    outputVersion: HP_PRESET_PAYLOAD_VERSION,
    acceptedInputVersions: HP_ACCEPTED_INPUT_VERSIONS,
    acceptedInputShapes: HP_ACCEPTED_INPUT_SHAPES
  }),
  heroes: HP_HERO_CATALOG
});
