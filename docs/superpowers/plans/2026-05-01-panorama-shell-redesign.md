# Panorama Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the HP Colors preset builder UI into a premium Panorama-inspired shell while preserving existing schema, import, and VPK build behavior.

**Architecture:** Keep Astro and the React island. Add tested pure helpers for new controls, then update schema controls, tree navigation, island layout, and active CSS in focused steps.

**Tech Stack:** Astro 5, React 19 JSX, Tailwind CSS 4, shadcn-style local primitives, Node.js native test runner.

---

## File Structure

- Create `src/components/schema-control-utils.js`: pure helpers for hex normalization, position parsing/formatting, numeric clamping, and default comparison.
- Create `test/schemaControlUtils.test.js`: Node tests for the helper module.
- Modify `src/components/schema-field.jsx`: Panorama-style controls behind the existing `SchemaField({ field, value, onChange })` API.
- Modify `src/components/schema-tree.jsx`: Anita-style category tree, counts, active border, modified dot.
- Modify `src/components/PresetBuilderIsland.jsx`: Panorama shell, two-pane workspace, collapsible import/preview, inline status, improved warning dialog.
- Modify `src/styles/global.css`: dark technical palette, shell, topbar, tree, detail pane, controls, responsive CSS.
- Keep `src/pages/index.astro`, `src/hpSchema.js`, and build/import modules unchanged.

## Task 1: Add Tested Control Helpers

**Files:**
- Create: `src/components/schema-control-utils.js`
- Create: `test/schemaControlUtils.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/schemaControlUtils.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { clampNumber, formatPositionValue, isDefaultValue, normalizeHexColor, parsePositionValue } from '../src/components/schema-control-utils.js';

test('normalizeHexColor returns uppercase six-digit hex colors', () => {
  assert.equal(normalizeHexColor('#e16161', '#FFFFFF'), '#E16161');
  assert.equal(normalizeHexColor('66cc99', '#FFFFFF'), '#66CC99');
  assert.equal(normalizeHexColor('#abc', '#FFFFFF'), '#AABBCC');
});

test('normalizeHexColor falls back for invalid colors', () => {
  assert.equal(normalizeHexColor('not-a-color', '#112233'), '#112233');
  assert.equal(normalizeHexColor('', '#112233'), '#112233');
});

test('parsePositionValue reads strings, arrays, and objects', () => {
  assert.deepEqual(parsePositionValue('27,20'), { x: 27, y: 20 });
  assert.deepEqual(parsePositionValue([12, 34]), { x: 12, y: 34 });
  assert.deepEqual(parsePositionValue({ x: '7', y: '9' }), { x: 7, y: 9 });
});

test('parsePositionValue uses safe defaults for invalid input', () => {
  assert.deepEqual(parsePositionValue('bad'), { x: 0, y: 200 });
  assert.deepEqual(parsePositionValue(null), { x: 0, y: 200 });
});

test('formatPositionValue rounds and joins x and y', () => {
  assert.equal(formatPositionValue({ x: 20.4, y: 196.6 }), '20,197');
});

test('clampNumber respects min, max, and fallback', () => {
  assert.equal(clampNumber(150, 0, 100, 25), 100);
  assert.equal(clampNumber(-5, 0, 100, 25), 0);
  assert.equal(clampNumber('bad', 0, 100, 25), 25);
});

test('isDefaultValue compares values by string form', () => {
  assert.equal(isDefaultValue(25, '25'), true);
  assert.equal(isDefaultValue('#E16161', '#e16161'), false);
});
```

- [ ] **Step 2: Verify red test**

Run: `npm test -- test/schemaControlUtils.test.js`

Expected: FAIL because `src/components/schema-control-utils.js` does not exist.

- [ ] **Step 3: Implement helper module**

Create `src/components/schema-control-utils.js`:

```js
export function normalizeHexColor(value, fallback = '#FFFFFF') {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const short = /^#([0-9a-fA-F]{3})$/.exec(withHash);
  if (short) return `#${short[1].split('').map((part) => part + part).join('').toUpperCase()}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toUpperCase();
  return fallback;
}

export function parsePositionValue(value) {
  let x = 0;
  let y = 200;
  if (Array.isArray(value)) {
    x = Number(value[0]);
    y = Number(value[1]);
  } else if (value && typeof value === 'object') {
    x = Number(value.x);
    y = Number(value.y);
  } else if (typeof value === 'string') {
    const parts = value.match(/-?\d+(?:\.\d+)?/g);
    if (parts?.length) {
      x = Number(parts[0]);
      y = parts.length > 1 ? Number(parts[1]) : y;
    }
  }
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 200 };
}

export function formatPositionValue(position) {
  const { x, y } = parsePositionValue(position);
  return `${Math.round(x)},${Math.round(y)}`;
}

export function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

export function isDefaultValue(value, defaultValue) {
  return String(value) === String(defaultValue);
}
```

- [ ] **Step 4: Verify green test**

Run: `npm test -- test/schemaControlUtils.test.js`

Expected: PASS.

- [ ] **Step 5: Verify full suite**

Run: `npm test`

Expected: PASS.

## Task 2: Rebuild Schema Controls

**Files:**
- Modify: `src/components/schema-field.jsx`

- [ ] **Step 1: Replace generic field controls**

Replace `src/components/schema-field.jsx` with a component that preserves the exported `SchemaField` signature and implements these internal controls:

- `ToggleControl`: `button` with `role="checkbox"`, classes `anita-toggle` and `is-checked`, toggles boolean value.
- `SliderControl`: existing `Slider` plus numeric `Input`, using `clampNumber`, classes `anita-slider-group` and `anita-value-input`.
- `CyclerControl`: segmented `button` group with `role="radiogroup"`, classes `anita-cycler`, `anita-cycler-segment`, and `is-active`.
- `ColorControl`: swatch label containing native `input type="color"` plus hex `Input`, using `normalizeHexColor`, classes `anita-color-group`, `anita-color-swatch`, and `anita-hex-input`.
- `PositionControl`: two axis rows for `x` and `y`, each with `Slider` plus number `Input`, using `parsePositionValue` and `formatPositionValue`, classes `anita-position-group`, `anita-position-axis`, `anita-axis-label`, and `anita-position-value`.
- Field row wrapper: class `schema-field-row`; metadata wrapper: `schema-field-meta`; control wrapper: `schema-field-control`; label class: `schema-field-label`.

- [ ] **Step 2: Verify tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Astro build exits 0.

## Task 3: Rework Schema Tree

**Files:**
- Modify: `src/components/schema-tree.jsx`

- [ ] **Step 1: Replace button-heavy tree**

Replace `SchemaTree` internals with Anita-style markup:

- Keep exported signature, extending it to `SchemaTree({ groups, activeKey, state, defaultState = {}, onSelect })`.
- Render outer `aside.anita-tree` with `aria-label="Schema categories"`.
- Render header `div.anita-tree-header` with text `Categories`.
- Render each group as `button.anita-tree-item`, adding `anita-tree-item--main` for depth 0, `anita-tree-item--sub` for children, `is-active` for active key, and `is-modified` when any descendant field differs from `defaultState`.
- Show group name in `span.anita-tree-label`.
- Show modified dot in `span.anita-mod-dot` and visible count in `span.anita-count`.
- Keep recursive children inside `div.anita-tree-children`.

- [ ] **Step 2: Add local recursive modified helper**

Inside `schema-tree.jsx`, add:

```jsx
function groupHasModifiedFields(group, state, defaultState) {
  const ownModified = (group.fields || []).some((field) => String(state?.[field.id]) !== String(defaultState?.[field.id]));
  if (ownModified) return true;
  return (group.children || []).some((child) => groupHasModifiedFields(child, state, defaultState));
}
```

- [ ] **Step 3: Verify tests**

Run: `npm test`

Expected: PASS.

## Task 4: Rebuild React Island Shell

**Files:**
- Modify: `src/components/PresetBuilderIsland.jsx`

- [ ] **Step 1: Adjust imports and state**

Remove `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, and `Separator` imports.

Add default state memo and disclosure state:

```jsx
const defaultState = useMemo(() => createDefaultFormState(HP_SCHEMA), []);
const [state, setState] = useState(() => defaultState);
const [importOpen, setImportOpen] = useState(false);
const [previewOpen, setPreviewOpen] = useState(false);
```

Do not keep the older `const [state, setState] = useState(() => createDefaultFormState(HP_SCHEMA));` line.

- [ ] **Step 2: Replace the three-card layout**

Replace the return tree with:

- `div.panorama-page`
- `div.panorama-shell` with `role="application"` and `aria-label="HP Colors preset builder"`
- `header.panorama-topbar` containing brand, preset name input, and build button
- `div.panorama-workspace` containing `SchemaTree` and `section.anita-detail-panel`
- `SchemaTree` receives `defaultState={defaultState}`
- detail panel contains active title, hint, `ScrollArea.detail-scroll`, `div.schema-field-list`, collapsible import panel, collapsible JSON preview, and `p.status-text`
- warning modal keeps existing text and actions, with backdrop changed to a button so clicking outside cancels
- footer remains outside the shell inside `panorama-page`

- [ ] **Step 3: Add disclosure component**

Add below `PresetBuilderIsland`:

```jsx
function DisclosurePanel({ title, open, onOpenChange, children }) {
  return (
    <section className={open ? 'disclosure-panel is-open' : 'disclosure-panel'}>
      <button type="button" className="disclosure-trigger" onClick={() => onOpenChange(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span aria-hidden="true">{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="disclosure-body">{children}</div> : null}
    </section>
  );
}
```

- [ ] **Step 4: Verify tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: Astro build exits 0.

## Task 5: Rewrite Builder CSS

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Update theme variables**

In both `:root` and `.dark`, set:

```css
--radius: 0rem;
--background: #0a0c0d;
--foreground: #e8edee;
--card: #111315;
--card-foreground: #e8edee;
--popover: #131618;
--popover-foreground: #e8edee;
--primary: #66cc99;
--primary-foreground: #0a0c0d;
--secondary: #1a1e20;
--secondary-foreground: #e8edee;
--muted: #131618;
--muted-foreground: #8a9496;
--accent: #20382d;
--accent-foreground: #e8edee;
--destructive: #bf4f4f;
--destructive-foreground: #fefefe;
--border: rgba(255, 255, 255, 0.06);
--input: rgba(255, 255, 255, 0.075);
--ring: rgba(102, 204, 153, 0.55);
```

- [ ] **Step 2: Replace custom builder styles**

Replace current `.shell`, `.builder-*`, `.rail-card`, `.field-*`, `.preview-box`, `.status-text`, `.tree-*`, modal, footer, and media-query CSS with selectors required by Tasks 2-4:

- Page/shell: `.shell`, `.panorama-page`, `.panorama-shell`, `.panorama-topbar`, `.panorama-brand`, `.panorama-kicker`, `.panorama-header-actions`, `.preset-name-control`, `.build-action`, `.panorama-workspace`.
- Tree: `.anita-tree`, `.anita-tree-header`, `.tree-scroll`, `.anita-tree-list`, `.anita-tree-node`, `.anita-tree-children`, `.anita-tree-item`, `.anita-tree-item--main`, `.anita-tree-item--sub`, `.anita-tree-label`, `.anita-tree-meta`, `.anita-count`, `.anita-mod-dot`.
- Detail: `.anita-detail-panel`, `.anita-detail-header-row`, `.anita-detail-eyebrow`, `.anita-detail-hint`, `.visible-count`, `.detail-scroll`, `.schema-field-list`.
- Fields: `.schema-field-row`, `.schema-field-meta`, `.schema-field-label`, `.schema-field-hint`, `.schema-field-control`.
- Controls: `.anita-toggle`, `.anita-toggle-mark`, `.anita-slider-group`, `.anita-value-input`, `.anita-cycler`, `.anita-cycler-segment`, `.anita-color-group`, `.anita-color-swatch`, `.anita-hex-input`, `.anita-position-group`, `.anita-position-axis`, `.anita-axis-label`, `.anita-position-value`.
- Secondary panels: `.secondary-panels`, `.disclosure-panel`, `.disclosure-trigger`, `.disclosure-body`, `.import-panel-body`, `.preview-box`.
- Status/modal/footer: `.status-text`, `.status-text.is-error`, `.build-warning-modal`, `.build-warning-backdrop`, `.build-warning-panel`, `.build-warning-badge`, `.build-warning-actions`, `.page-footer`, `.sr-only`.
- Motion/responsive: `@keyframes shell-in`, `@media (max-width: 980px)`, and `@media (max-width: 760px)`.

Use only CSS properties and plain selectors. Do not add new dependencies.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Astro build exits 0.

## Task 6: Apply shadcn Preset and Reconcile

**Files:**
- Modify: `components.json`
- Possibly modify: `src/styles/global.css`
- Possibly modify: `src/components/ui/*.jsx`

- [ ] **Step 1: Resolve current preset**

Run: `npx shadcn@latest preset resolve`

Expected: CLI prints current project preset/config.

- [ ] **Step 2: Apply requested preset**

Run: `npx shadcn@latest apply --preset buFywKm`

Expected: CLI updates shadcn config/theme toward Lyra/neutral.

- [ ] **Step 3: Reconcile local project requirements**

Open `components.json` and ensure JSX mode remains enabled with `"tsx": false`. Keep `aliases.components` pointing at `src/components` and `aliases.utils` pointing at `src/lib/utils`.

Open `src/styles/global.css` and restore project-specific Panorama values from Task 5 if the preset overwrote them. Keep `@import "tailwindcss";` and `@import "tw-animate-css";` at the top.

- [ ] **Step 4: Verify tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: Astro build exits 0.

## Task 7: Manual Browser Verification

**Files:**
- No planned code changes unless verification finds a defect.

- [ ] **Step 1: Start dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Astro dev server starts and prints a local URL.

- [ ] **Step 2: Verify desktop UI**

Open the local URL and verify:

- Topbar brand, preset input, and build button are visible.
- Left tree matches Anita-style categories with counts and active border.
- Detail pane shows active category controls.
- Toggle, slider, cycler, color, and position controls are usable.
- Import panel opens, accepts text, and reports parse errors inline for invalid text.
- Preview panel opens and shows JSON.
- Build warning dialog opens and cancel closes it.

- [ ] **Step 3: Verify mobile layout**

Resize below 760px and verify:

- Workspace stacks into one column.
- Tree is not wider than viewport.
- Field controls remain usable without horizontal scrolling.

- [ ] **Step 4: Final verification commands**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: Astro build exits 0.

## Self-Review Checklist

- Spec coverage: shell, topbar, two-pane layout, tree, all schema control types, secondary import/preview, status, warning dialog, palette, motion, accessibility, tests, and no build/schema changes are covered.
- Placeholder scan target: no forbidden placeholder instructions should remain.
- Type consistency: helper names are `normalizeHexColor`, `parsePositionValue`, `formatPositionValue`, `clampNumber`, `isDefaultValue`; CSS classes match task descriptions.
