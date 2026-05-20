const HERO_ICON_BASE = `${(import.meta.env?.BASE_URL || "/hp-colors-preset-builder/").replace(/\/?$/, "/")}heroes/`;

function heroIcon(id) {
  return `${HERO_ICON_BASE}${id}.png`;
}

export const HP_HEROES = Object.freeze([
  { id: "hero_inferno", name: "Infernus", aliases: ["inferno", "infernus", "hero_infernus"], icon: { src: heroIcon("hero_inferno"), initials: "IN", colors: ["#A3312B", "#FF994D"] } },
  { id: "hero_gigawatt", name: "Seven", aliases: ["gigawatt", "seven", "hero_seven"], icon: { src: heroIcon("hero_gigawatt"), initials: "S7", colors: ["#2F5A9E", "#79C7FF"] } },
  { id: "hero_hornet", name: "Vindicta", aliases: ["hornet", "vindicta", "hero_vindicta"], icon: { src: heroIcon("hero_hornet"), initials: "VD", colors: ["#354B78", "#8EB8F0"] } },
  { id: "hero_ghost", name: "Lady Geist", aliases: ["ghost", "geist", "lady_geist", "ladygeist", "hero_lady_geist"], icon: { src: heroIcon("hero_ghost"), initials: "LG", colors: ["#61355C", "#E29AD4"] } },
  { id: "hero_atlas", name: "Abrams", aliases: ["atlas", "abrams", "bull", "hero_abrams"], icon: { src: heroIcon("hero_atlas"), initials: "AB", colors: ["#8D6B4F", "#D6A35E"] } },
  { id: "hero_wraith", name: "Wraith", aliases: ["wraith"], icon: { src: heroIcon("hero_wraith"), initials: "WR", colors: ["#463870", "#B19AF2"] } },
  { id: "hero_forge", name: "McGinnis", aliases: ["forge", "mcginnis", "mc_ginnis", "engineer", "hero_mcginnis"], icon: { src: heroIcon("hero_forge"), initials: "MG", colors: ["#5E6148", "#D3CF7A"] } },
  { id: "hero_chrono", name: "Paradox", aliases: ["chrono", "paradox", "hero_paradox"], icon: { src: heroIcon("hero_chrono"), initials: "PX", colors: ["#3D516E", "#87AAE7"] } },
  { id: "hero_dynamo", name: "Dynamo", aliases: ["dynamo", "sumo"], icon: { src: heroIcon("hero_dynamo"), initials: "DY", colors: ["#5A4A9D", "#A998FF"] } },
  { id: "hero_kelvin", name: "Kelvin", aliases: ["kelvin"], icon: { src: heroIcon("hero_kelvin"), initials: "KE", colors: ["#2E6E83", "#94E4F5"] } },
  { id: "hero_haze", name: "Haze", aliases: ["haze"], icon: { src: heroIcon("hero_haze"), initials: "HA", colors: ["#4E3E8F", "#C5A4FF"] } },
  { id: "hero_astro", name: "Ivy", aliases: ["astro", "ivy", "hero_ivy"], icon: { src: heroIcon("hero_astro"), initials: "IV", colors: ["#3F6B57", "#96D28B"] } },
  { id: "hero_bebop", name: "Bebop", aliases: ["bebop"], icon: { src: heroIcon("hero_bebop"), initials: "BE", colors: ["#B88A35", "#F3D06A"] } },
  { id: "hero_nano", name: "Nano", aliases: ["nano"], icon: { src: heroIcon("hero_nano"), initials: "NA", colors: ["#4D556A", "#B9C2D6"] } },
  { id: "hero_orion", name: "Grey Talon", aliases: ["orion", "archer", "grey_talon", "gray_talon", "greytalon", "hero_grey_talon"], icon: { src: heroIcon("hero_orion"), initials: "GT", colors: ["#56606B", "#D4E1EA"] } },
  { id: "hero_krill", name: "Mo & Krill", aliases: ["krill", "digger", "mo_and_krill", "mo_krill", "mo & krill", "hero_mo_and_krill"], icon: { src: heroIcon("hero_krill"), initials: "MK", colors: ["#5A4B3C", "#C9A47E"] } },
  { id: "hero_shiv", name: "Shiv", aliases: ["shiv"], icon: { src: heroIcon("hero_shiv"), initials: "SH", colors: ["#7D2E2B", "#E16161"] } },
  { id: "hero_tengu", name: "Tengu", aliases: ["tengu"], icon: { src: heroIcon("hero_tengu"), initials: "TE", colors: ["#53623A", "#B6D66F"] } },
  { id: "hero_warden", name: "Warden", aliases: ["warden"], icon: { src: heroIcon("hero_warden"), initials: "WA", colors: ["#3B4A58", "#A5B9CE"] } },
  { id: "hero_yamato", name: "Yamato", aliases: ["yamato"], icon: { src: heroIcon("hero_yamato"), initials: "YA", colors: ["#684036", "#D88B76"] } },
  { id: "hero_lash", name: "Lash", aliases: ["lash"], icon: { src: heroIcon("hero_lash"), initials: "LA", colors: ["#7A4530", "#D99556"] } },
  { id: "hero_viscous", name: "Viscous", aliases: ["viscous"], icon: { src: heroIcon("hero_viscous"), initials: "VS", colors: ["#3D7A61", "#7DE1AF"] } },
  { id: "hero_synth", name: "Pocket", aliases: ["synth", "pocket", "hero_pocket"], icon: { src: heroIcon("hero_synth"), initials: "PO", colors: ["#53623A", "#B6D66F"] } },
  { id: "hero_mirage", name: "Mirage", aliases: ["mirage"], icon: { src: heroIcon("hero_mirage"), initials: "MR", colors: ["#856B36", "#E7CB79"] } },
  { id: "hero_viper", name: "Vyper", aliases: ["viper", "vyper", "hero_vyper"], icon: { src: heroIcon("hero_viper"), initials: "VY", colors: ["#376A45", "#8DE078"] } },
  { id: "hero_magician", name: "Magician", aliases: ["magician", "sinclair", "hero_sinclair"], icon: { src: heroIcon("hero_magician"), initials: "MA", colors: ["#51406C", "#BFA1E8"] } },
  { id: "hero_vampirebat", name: "Mina", aliases: ["vampirebat", "vampire_bat", "mina", "hero_mina"], icon: { src: heroIcon("hero_vampirebat"), initials: "MI", colors: ["#7E2F62", "#E876B8"] } },
  { id: "hero_drifter", name: "Drifter", aliases: ["drifter"], icon: { src: heroIcon("hero_drifter"), initials: "DR", colors: ["#5B354F", "#D27C94"] } },
  { id: "hero_priest", name: "Priest", aliases: ["priest"], icon: { src: heroIcon("hero_priest"), initials: "PR", colors: ["#4D556A", "#B9C2D6"] } },
  { id: "hero_frank", name: "Frank", aliases: ["frank"], icon: { src: heroIcon("hero_frank"), initials: "FR", colors: ["#5E3F35", "#D29272"] } },
  { id: "hero_bookworm", name: "Bookworm", aliases: ["bookworm", "paige", "hero_paige"], icon: { src: heroIcon("hero_bookworm"), initials: "BW", colors: ["#4E6D7D", "#B5D9EA"] } },
  { id: "hero_doorman", name: "Doorman", aliases: ["doorman", "door_man"], icon: { src: heroIcon("hero_doorman"), initials: "DO", colors: ["#5D4C3C", "#D6A66C"] } },
  { id: "hero_punkgoat", name: "Billy", aliases: ["punkgoat", "punk_goat", "billy", "hero_billy"], icon: { src: heroIcon("hero_punkgoat"), initials: "BI", colors: ["#8F2F36", "#E86B55"] } },
  { id: "hero_necro", name: "Necro", aliases: ["necro"], icon: { src: heroIcon("hero_necro"), initials: "NE", colors: ["#343B43", "#9EA7B3"] } },
  { id: "hero_fencer", name: "Apollo", aliases: ["fencer", "apollo", "hero_apollo"], icon: { src: heroIcon("hero_fencer"), initials: "AP", colors: ["#8264D9", "#D5B9FF"] } },
  { id: "hero_familiar", name: "Familiar", aliases: ["familiar"], icon: { src: heroIcon("hero_familiar"), initials: "FA", colors: ["#4D556A", "#B9C2D6"] } },
  { id: "hero_werewolf", name: "Werewolf", aliases: ["werewolf"], icon: { src: heroIcon("hero_werewolf"), initials: "WE", colors: ["#465A41", "#A6C982"] } },
  { id: "hero_unicorn", name: "Unicorn", aliases: ["unicorn"], icon: { src: heroIcon("hero_unicorn"), initials: "UN", colors: ["#6B7379", "#DAE5EA"] } }
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
