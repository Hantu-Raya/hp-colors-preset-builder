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

export function isFieldVisible(spec, state) {
  if (!spec?.visibleWhen) return true;
  const { id, equals } = spec.visibleWhen;
  return state?.[id] === equals;
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
