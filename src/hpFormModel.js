import { HP_SCHEMA, coerceHpValue } from "./hpSchema.js";

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

export function splitCategoryGroups(schema = HP_SCHEMA) {
  const rootGroups = [];
  for (const [id, spec] of Object.entries(schema || {})) {
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

export function createDefaultFormState(schema = HP_SCHEMA) {
  const state = {};
  for (const [id, spec] of Object.entries(schema || {})) {
    state[id] = coerceHpValue(id, spec?.defaultValue);
  }
  return state;
}

export function buildCategoryGroups(schema = HP_SCHEMA) {
  const groups = [];
  const byCategory = new Map();
  for (const [id, spec] of Object.entries(schema || {})) {
    if (!spec || !spec.category) continue;
    let group = byCategory.get(spec.category);
    if (!group) {
      group = { category: spec.category, fields: [] };
      byCategory.set(spec.category, group);
      groups.push(group);
    }
    group.fields.push({ id, ...spec });
  }
  return groups;
}

export function isFieldVisible(spec, state) {
  if (!spec?.visibleWhen) return true;
  const { id, equals } = spec.visibleWhen;
  return state?.[id] === equals;
}

export function countVisibleFields(fields = [], state = {}) {
  return fields.reduce((count, field) => count + (isFieldVisible(field, state) ? 1 : 0), 0);
}

export function countVisibleGroupFields(group, state = {}) {
  const own = countVisibleFields(group?.fields || [], state);
  const child = (group?.children || []).reduce((count, entry) => count + countVisibleGroupFields(entry, state), 0);
  return own + child;
}

export function flattenCategoryTree(groups = []) {
  const entries = [];
  const walk = (group) => {
    entries.push(group);
    for (const child of group.children || []) walk(child);
  };
  for (const group of groups || []) walk(group);
  return entries;
}

export function getCategoryPathLabel(group) {
  return (group?.path || []).join(" / ");
}

export function getCategoryKey(group) {
  return (group?.path || [group?.name || ""]).join("|");
}

export function sanitizeFormState(schema = HP_SCHEMA, state = {}) {
  const next = {};
  for (const [id, spec] of Object.entries(schema || {})) {
    next[id] = coerceHpValue(id, state?.[id] ?? spec?.defaultValue);
  }
  return next;
}
