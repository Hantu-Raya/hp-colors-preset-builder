import { HP_HERO_CATALOG } from "./contracts/hpColorsPresetContract.js";

const HERO_ICON_BASE = `${(import.meta.env?.BASE_URL || "/hp-colors-preset-builder/").replace(/\/?$/, "/")}heroes/`;

function heroIcon(id) {
  return `${HERO_ICON_BASE}${id}.png`;
}


export const HP_HEROES = Object.freeze(HP_HERO_CATALOG.map((hero) => ({
  ...hero,
  icon: { src: heroIcon(hero.id) }
})));

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
