import { HP_SCHEMA, coerceHpValue } from "./hpSchema.js";
import { buildCategoryGroups, createDefaultFormState, isFieldVisible, sanitizeFormState } from "./hpFormModel.js";

export function renderHpForm({ document, formRoot, previewNode, schema = HP_SCHEMA, state = createDefaultFormState(schema), onChange } = {}) {
  const doc = document || globalThis.document;
  const root = formRoot || doc?.querySelector?.("#builderForm");
  const collapseButton = doc?.querySelector?.("#schemaCollapseBtn");
  const preview = previewNode || doc?.querySelector?.("#preview");
  const groups = buildCategoryGroups(schema);
  const mainGroups = buildMainGroups(groups);
  const currentState = sanitizeFormState(schema, state);
  let activeCategory = groups[0]?.category || null;
  let isCollapsed = false;

  if (!root) throw new Error("Missing #builderForm root");

  const controlsById = new Map();
  root.classList?.add?.("schema-shell");

  collapseButton?.addEventListener?.("click", toggleCollapse);
  render();

  function handleInput(id, value) {
    currentState[id] = coerceHpValue(id, value);
    syncControls();
    syncVisibility();
    syncPreview();
    onChange?.(getState());
  }

  function toggleCollapse(forceState) {
    isCollapsed = typeof forceState === "boolean" ? forceState : !isCollapsed;
    render();
  }

  function render() {
    updateCollapseButton();

    if (isCollapsed) {
      root.hidden = true;
      root.replaceChildren();
      controlsById.clear();
      syncPreview();
      return;
    }

    if (!activeCategory || !groups.some((group) => group.category === activeCategory)) {
      activeCategory = groups[0]?.category || null;
    }

    root.hidden = false;
    controlsById.clear();
    root.replaceChildren(createWorkspace(doc, mainGroups, groups, activeCategory, controlsById, schema, currentState, handleInput, setActiveCategory));
    syncControls();
    syncVisibility();
    syncPreview();
  }

  function setActiveCategory(nextCategory) {
    if (!nextCategory || nextCategory === activeCategory) return;
    activeCategory = nextCategory;
    render();
  }

  function updateCollapseButton() {
    if (!collapseButton) return;
    collapseButton.textContent = isCollapsed ? "Expand" : "Collapse";
    collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
    collapseButton.setAttribute("aria-label", isCollapsed ? "Expand schema controls" : "Collapse schema controls");
  }

  function syncVisibility() {
    for (const [id, entry] of controlsById) {
      const visible = isFieldVisibleDeep(id);
      entry.wrapper.hidden = !visible;
    }
  }

  function syncControls() {
    for (const [id, entry] of controlsById) {
      entry.update?.(currentState[id]);
    }
  }

  function syncPreview() {
    if (preview) preview.textContent = JSON.stringify(getState(), null, 2);
  }

  function getState() {
    return sanitizeFormState(schema, currentState);
  }

  function isFieldVisibleDeep(id, seen = new Set()) {
    const spec = schema[id];
    if (!spec) return false;
    if (!isFieldVisible(spec, currentState)) return false;
    if (!spec.visibleWhen) return true;
    const parentId = spec.visibleWhen.id;
    if (!parentId || seen.has(parentId)) return false;
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    return isFieldVisibleDeep(parentId, nextSeen) && currentState[parentId] === spec.visibleWhen.equals;
  }

  return {
    getState,
    setState(nextState) {
      Object.assign(currentState, sanitizeFormState(schema, nextState));
      render();
    }
  };
}

function createWorkspace(doc, mainGroups, groups, activeCategory, controlsById, schema, state, onInput, onPickCategory) {
  const workspace = doc.createElement("div");
  workspace.className = "schema-workspace";

  const activeGroup = groups.find((group) => group.category === activeCategory) || groups[0] || null;
  const { main: activeMain } = splitCategory(activeCategory || activeGroup?.category || "");

  const tree = doc.createElement("aside");
  tree.className = "schema-tree";
  tree.setAttribute("aria-label", "Schema categories");

  for (const mainGroup of mainGroups) {
    const isMainActive = mainGroup.main === activeMain;
    const mainButton = createTreeButton(doc, "main", mainGroup.main, mainGroup.main, String(mainGroup.fields.length), isMainActive, () => {
      onPickCategory(mainGroup.categories[0]?.category || activeCategory);
    });
    tree.appendChild(mainButton);

    if (!isMainActive) continue;

    const subList = doc.createElement("div");
    subList.className = "schema-sublist";
    for (const group of mainGroup.categories) {
      const isActive = group.category === activeCategory;
      const { sub } = splitCategory(group.category);
      const count = String(group.fields.length);
      subList.appendChild(createTreeButton(doc, "sub", group.category, sub, count, isActive, () => onPickCategory(group.category)));
    }
    tree.appendChild(subList);
  }

  const detail = doc.createElement("section");
  detail.className = "schema-detail";

  const detailHeader = doc.createElement("div");
  detailHeader.className = "schema-detail-header";

  const headerCopy = doc.createElement("div");
  const detailKicker = doc.createElement("div");
  detailKicker.className = "schema-detail-kicker";
  detailKicker.textContent = "Active group";
  headerCopy.appendChild(detailKicker);

  const detailTitle = doc.createElement("h3");
  detailTitle.textContent = (activeGroup?.category || "").replace("|", " — ");
  headerCopy.appendChild(detailTitle);

  const detailCount = doc.createElement("span");
  detailCount.className = "schema-detail-count";
  detailCount.textContent = `${countVisibleFields(activeGroup?.fields || [], schema, state)} fields`;

  detailHeader.appendChild(headerCopy);
  detailHeader.appendChild(detailCount);
  detail.appendChild(detailHeader);

  const detailHint = doc.createElement("p");
  detailHint.className = "schema-detail-hint";
  detailHint.textContent = "Only the active group stays open. Switch groups from the tree.";
  detail.appendChild(detailHint);

  const fieldList = doc.createElement("div");
  fieldList.className = "schema-fields";

  const visibleFields = (activeGroup?.fields || []).filter((field) => isFieldVisibleDeep(field.id, schema, state));
  if (visibleFields.length === 0) {
    const emptyState = doc.createElement("div");
    emptyState.className = "schema-empty-state";
    emptyState.textContent = "No visible controls in this group right now.";
    fieldList.appendChild(emptyState);
  } else {
    for (const field of visibleFields) {
      const fieldNode = createFieldControl(doc, field, state[field.id], onInput);
      controlsById.set(field.id, fieldNode);
      fieldList.appendChild(fieldNode.wrapper);
    }
  }

  detail.appendChild(fieldList);
  workspace.appendChild(tree);
  workspace.appendChild(detail);
  return workspace;
}

function createTreeButton(doc, kind, categoryKey, label, count, active, onActivate) {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = `${kind === "main" ? "schema-main-btn" : "schema-sub-btn"}${active ? " is-active" : ""}`;
  btn.setAttribute("data-category", categoryKey);

  const glyph = doc.createElement("span");
  glyph.className = "schema-tree-glyph";
  glyph.textContent = active ? "◆" : "◇";

  const text = doc.createElement("span");
  text.className = "schema-tree-label";
  text.textContent = label;

  const badge = doc.createElement("span");
  badge.className = "schema-tree-count";
  badge.textContent = count;

  btn.appendChild(glyph);
  btn.appendChild(text);
  btn.appendChild(badge);
  btn.addEventListener("click", onActivate);
  return btn;
}

function createFieldControl(doc, field, value, onInput) {
  const wrapper = doc.createElement("label");
  wrapper.setAttribute("class", `field field--${field.type}`);
  wrapper.setAttribute("data-field-id", field.id);
  wrapper.setAttribute("data-field-type", field.type);
  if (field.category) wrapper.setAttribute("data-category", field.category);

  const caption = doc.createElement("span");
  caption.setAttribute("class", "field-label");
  caption.textContent = field.label;
  wrapper.appendChild(caption);

  const controls = doc.createElement("div");
  controls.className = "field-controls";

  if (field.type === "toggle") {
    const input = doc.createElement("input");
    input.type = "checkbox";
    input.checked = !!value;
    input.addEventListener("change", () => onInput(field.id, input.checked));
    wrapper.appendChild(input);
    return { wrapper, update(nextValue) { input.checked = !!nextValue; } };
  }

  if (field.type === "slider") {
    const input = doc.createElement("input");
    input.type = "range";
    input.min = field.bounds?.min ?? 0;
    input.max = field.bounds?.max ?? 100;
    input.step = field.bounds?.step ?? 1;
    input.value = String(value);
    const output = doc.createElement("output");
    output.className = "field-output";
    output.textContent = String(value);
    input.addEventListener("input", () => { output.textContent = input.value; onInput(field.id, input.value); });
    controls.className = "field-controls field-controls--slider";
    controls.appendChild(input);
    controls.appendChild(output);
    wrapper.appendChild(controls);
    return { wrapper, update(nextValue) { input.value = String(nextValue); output.textContent = String(nextValue); } };
  }

  if (field.type === "colorpicker") {
    const input = doc.createElement("input"); input.type = "color";
    const text = doc.createElement("input"); text.type = "text";
    const normalize = (candidate, fallbackValue = field.defaultValue) => {
      const next = String(candidate || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(next)) return next.toUpperCase();
      const fallback = String(fallbackValue || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(fallback)) return fallback.toUpperCase();
      return "#FFFFFF";
    };
    const applyValue = (nextValue) => {
      const normalized = normalize(nextValue, value);
      input.value = normalized;
      text.value = normalized;
      return normalized;
    };
    applyValue(value);
    input.addEventListener("input", () => { const normalized = normalize(input.value, text.value); applyValue(normalized); onInput(field.id, normalized); });
    text.addEventListener("change", () => { const normalized = applyValue(text.value); onInput(field.id, normalized); });
    controls.className = "field-controls field-controls--color";
    controls.appendChild(input);
    controls.appendChild(text);
    wrapper.appendChild(controls);
    return { wrapper, update(nextValue) { applyValue(nextValue); } };
  }

  if (field.type === "cycler") {
    const select = doc.createElement("select");
    (field.options || []).forEach((opt, index) => { const option = doc.createElement("option"); option.value = String(index); option.textContent = opt; select.appendChild(option); });
    select.value = String(value);
    select.addEventListener("change", () => onInput(field.id, select.value));
    controls.appendChild(select);
    wrapper.appendChild(controls);
    return { wrapper, update(nextValue) { select.value = String(nextValue); } };
  }

  if (field.type === "positionpicker") {
    const input = doc.createElement("input"); input.type = "text"; input.value = value;
    input.addEventListener("change", () => onInput(field.id, input.value));
    controls.appendChild(input);
    wrapper.appendChild(controls);
    return { wrapper, update(nextValue) { input.value = String(nextValue); } };
  }

  const fallback = doc.createElement("input"); fallback.type = "text"; fallback.value = String(value ?? "");
  fallback.addEventListener("change", () => onInput(field.id, fallback.value));
  controls.appendChild(fallback);
  wrapper.appendChild(controls);
  return { wrapper, update(nextValue) { fallback.value = String(nextValue ?? ""); } };
}

function buildMainGroups(groups) {
  const byMain = new Map();
  const ordered = [];

  for (const group of groups) {
    const { main } = splitCategory(group.category || "");
    let mainGroup = byMain.get(main);
    if (!mainGroup) {
      mainGroup = { main, categories: [], fields: [] };
      byMain.set(main, mainGroup);
      ordered.push(mainGroup);
    }
    mainGroup.categories.push(group);
    mainGroup.fields.push(...group.fields);
  }

  return ordered;
}

function splitCategory(category) {
  const [main = "General", sub = main] = String(category || "").split("|");
  return { main, sub };
}

function countVisibleFields(fields, schema, state) {
  let count = 0;
  for (const field of fields || []) {
    if (isFieldVisibleDeep(field.id, schema, state)) count += 1;
  }
  return count;
}

function isFieldVisibleDeep(id, schema, state, seen = new Set()) {
  const spec = schema[id];
  if (!spec) return false;
  if (!isFieldVisible(spec, state)) return false;
  if (!spec.visibleWhen) return true;
  const parentId = spec.visibleWhen.id;
  if (!parentId || seen.has(parentId)) return false;
  const nextSeen = new Set(seen);
  nextSeen.add(id);
  return isFieldVisibleDeep(parentId, schema, state, nextSeen) && state[parentId] === spec.visibleWhen.equals;
}
