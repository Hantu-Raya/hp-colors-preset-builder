const HERO_ICON_BASE = `${(import.meta.env?.BASE_URL || "/hp-colors-preset-builder/").replace(/\/?$/, "/")}heroes/`;

function heroIcon(id) {
  return `${HERO_ICON_BASE}${id}.png`;
}

export const HP_HEROES = Object.freeze([
  { id: "hero_inferno", name: "Infernus", aliases: ["inferno", "infernus", "hero_infernus"], icon: { src: heroIcon("hero_inferno") } },
  { id: "hero_gigawatt", name: "Seven", aliases: ["gigawatt", "seven", "hero_seven"], icon: { src: heroIcon("hero_gigawatt") } },
  { id: "hero_hornet", name: "Vindicta", aliases: ["hornet", "vindicta", "hero_vindicta"], icon: { src: heroIcon("hero_hornet") } },
  { id: "hero_ghost", name: "Lady Geist", aliases: ["ghost", "geist", "lady_geist", "ladygeist", "hero_lady_geist"], icon: { src: heroIcon("hero_ghost") } },
  { id: "hero_atlas", name: "Abrams", aliases: ["atlas", "abrams", "bull", "hero_abrams"], icon: { src: heroIcon("hero_atlas") } },
  { id: "hero_wraith", name: "Wraith", aliases: ["wraith"], icon: { src: heroIcon("hero_wraith") } },
  { id: "hero_forge", name: "McGinnis", aliases: ["forge", "mcginnis", "mc_ginnis", "engineer", "hero_mcginnis"], icon: { src: heroIcon("hero_forge") } },
  { id: "hero_chrono", name: "Paradox", aliases: ["chrono", "paradox", "hero_paradox"], icon: { src: heroIcon("hero_chrono") } },
  { id: "hero_dynamo", name: "Dynamo", aliases: ["dynamo", "sumo"], icon: { src: heroIcon("hero_dynamo") } },
  { id: "hero_kelvin", name: "Kelvin", aliases: ["kelvin"], icon: { src: heroIcon("hero_kelvin") } },
  { id: "hero_haze", name: "Haze", aliases: ["haze"], icon: { src: heroIcon("hero_haze") } },
  { id: "hero_astro", name: "Ivy", aliases: ["astro", "ivy", "hero_ivy"], icon: { src: heroIcon("hero_astro") } },
  { id: "hero_bebop", name: "Bebop", aliases: ["bebop"], icon: { src: heroIcon("hero_bebop") } },
  { id: "hero_nano", name: "Nano", aliases: ["nano"], icon: { src: heroIcon("hero_nano") } },
  { id: "hero_orion", name: "Grey Talon", aliases: ["orion", "archer", "grey_talon", "gray_talon", "greytalon", "hero_grey_talon"], icon: { src: heroIcon("hero_orion") } },
  { id: "hero_krill", name: "Mo & Krill", aliases: ["krill", "digger", "mo_and_krill", "mo_krill", "mo & krill", "hero_mo_and_krill"], icon: { src: heroIcon("hero_krill") } },
  { id: "hero_shiv", name: "Shiv", aliases: ["shiv"], icon: { src: heroIcon("hero_shiv") } },
  { id: "hero_tengu", name: "Tengu", aliases: ["tengu"], icon: { src: heroIcon("hero_tengu") } },
  { id: "hero_warden", name: "Warden", aliases: ["warden"], icon: { src: heroIcon("hero_warden") } },
  { id: "hero_yamato", name: "Yamato", aliases: ["yamato"], icon: { src: heroIcon("hero_yamato") } },
  { id: "hero_lash", name: "Lash", aliases: ["lash"], icon: { src: heroIcon("hero_lash") } },
  { id: "hero_viscous", name: "Viscous", aliases: ["viscous"], icon: { src: heroIcon("hero_viscous") } },
  { id: "hero_synth", name: "Pocket", aliases: ["synth", "pocket", "hero_pocket"], icon: { src: heroIcon("hero_synth") } },
  { id: "hero_mirage", name: "Mirage", aliases: ["mirage"], icon: { src: heroIcon("hero_mirage") } },
  { id: "hero_viper", name: "Vyper", aliases: ["viper", "vyper", "hero_vyper"], icon: { src: heroIcon("hero_viper") } },
  { id: "hero_magician", name: "Magician", aliases: ["magician", "sinclair", "hero_sinclair"], icon: { src: heroIcon("hero_magician") } },
  { id: "hero_vampirebat", name: "Mina", aliases: ["vampirebat", "vampire_bat", "mina", "hero_mina"], icon: { src: heroIcon("hero_vampirebat") } },
  { id: "hero_drifter", name: "Drifter", aliases: ["drifter"], icon: { src: heroIcon("hero_drifter") } },
  { id: "hero_priest", name: "Priest", aliases: ["priest"], icon: { src: heroIcon("hero_priest") } },
  { id: "hero_frank", name: "Frank", aliases: ["frank"], icon: { src: heroIcon("hero_frank") } },
  { id: "hero_bookworm", name: "Bookworm", aliases: ["bookworm", "paige", "hero_paige"], icon: { src: heroIcon("hero_bookworm") } },
  { id: "hero_doorman", name: "Doorman", aliases: ["doorman", "door_man"], icon: { src: heroIcon("hero_doorman") } },
  { id: "hero_punkgoat", name: "Billy", aliases: ["punkgoat", "punk_goat", "billy", "hero_billy"], icon: { src: heroIcon("hero_punkgoat") } },
  { id: "hero_necro", name: "Necro", aliases: ["necro"], icon: { src: heroIcon("hero_necro") } },
  { id: "hero_fencer", name: "Apollo", aliases: ["fencer", "apollo", "hero_apollo"], icon: { src: heroIcon("hero_fencer") } },
  { id: "hero_familiar", name: "Familiar", aliases: ["familiar"], icon: { src: heroIcon("hero_familiar") } },
  { id: "hero_werewolf", name: "Werewolf", aliases: ["werewolf"], icon: { src: heroIcon("hero_werewolf") } },
  { id: "hero_unicorn", name: "Unicorn", aliases: ["unicorn"], icon: { src: heroIcon("hero_unicorn") } }
]);

const HERO_ID_LOOKUP = new Map();

function normalizeHeroKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^npc_dota_hero_/, "")
    .replace(/^citadel_hero_/, "")
    .replace(/^hero_/, "")
    .replace(/['.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

for (const hero of HP_HEROES) {
  const keys = new Set([hero.id, hero.name, ...(hero.aliases || [])]);
  for (const key of keys) {
    const normalized = normalizeHeroKey(key);
    if (normalized) HERO_ID_LOOKUP.set(normalized, hero.id);
  }
}

export function getHpHeroById(id) {
  const normalized = normalizeHeroId(id);
  return HP_HEROES.find((hero) => hero.id === normalized) || null;
}

export function normalizeHeroId(value) {
  const normalized = normalizeHeroKey(value);
  if (!normalized) return null;
  return HERO_ID_LOOKUP.get(normalized) || HERO_ID_LOOKUP.get(`hero_${normalized}`) || null;
}

export function normalizeHeroIds(values) {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const heroes = [];
  for (const value of source) {
    const id = normalizeHeroId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    heroes.push(id);
  }
  return heroes;
}

export const HP_HERO_SCOPE_OFF = "off";
export const HP_HERO_SCOPE_ALL = "all";
export const HP_HERO_SCOPE_SELECTED = "selected";

export function normalizeHeroScopeMode(mode, heroes = []) {
  const selected = normalizeHeroIds(heroes);
  const value = String(mode || "").trim().toLowerCase();
  if (value === HP_HERO_SCOPE_OFF) return HP_HERO_SCOPE_OFF;
  if (value === HP_HERO_SCOPE_ALL) return HP_HERO_SCOPE_ALL;
  if (value === HP_HERO_SCOPE_SELECTED) return selected.length ? HP_HERO_SCOPE_SELECTED : HP_HERO_SCOPE_OFF;
  return selected.length ? HP_HERO_SCOPE_SELECTED : HP_HERO_SCOPE_OFF;
}

export function normalizeHeroScope(mode, heroes = []) {
  const selected = normalizeHeroIds(heroes);
  const heroMode = normalizeHeroScopeMode(mode, selected);
  return {
    heroMode,
    heroes: heroMode === HP_HERO_SCOPE_SELECTED ? selected : []
  };
}
