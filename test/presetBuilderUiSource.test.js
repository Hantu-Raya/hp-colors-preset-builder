import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const islandPath = new URL("../src/components/PresetBuilderIsland.jsx", import.meta.url);
const fieldPath = new URL("../src/components/schema-field.jsx", import.meta.url);
const treePath = new URL("../src/components/schema-tree.jsx", import.meta.url);
const cssPath = new URL("../src/styles/global.css", import.meta.url);

test("transient UI state routes through reducer intents", async () => {
  const source = await readFile(islandPath, "utf8");
  assert.doesNotMatch(source, /setSession\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev/);
  assert.match(source, /TOGGLE_PROFILE_MENU/);
  assert.match(source, /TOGGLE_HERO_MENU/);
  assert.match(source, /BUILD_STARTED|runPresetBuildWorkflow/);
  assert.match(source, /if \(busy \|\| operationLockRef\.current\) return/);
});

test("dialogs trap focus, close on Escape, and restore focus", async () => {
  const source = await readFile(islandPath, "utf8");
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /previousFocusRef\.current\?\.focus/);
  assert.match(source, /ref=\{buildDialogRef\}/);
  assert.match(source, /ref=\{targetDialogRef\}/);
});

test("profile, hero, and schema listboxes expose keyboard navigation and reorder fallback", async () => {
  const [island, tree] = await Promise.all([readFile(islandPath, "utf8"), readFile(treePath, "utf8")]);
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
    assert.match(`${island}\n${tree}`, new RegExp(key));
  }
  assert.match(island, /MOVE_PROFILE/);
  assert.match(island, /Move \$\{label\} up/);
  assert.match(island, /tabIndex=\{active \? 0 : -1\}/);
  assert.match(tree, /role="listbox"/);
});

test("toggle text and responsive sticky navigation remain explicit", async () => {
  const [field, css] = await Promise.all([readFile(fieldPath, "utf8"), readFile(cssPath, "utf8")]);
  assert.match(field, /checked \? 'On' : 'Off'/);
  assert.match(css, /\.mobile-workspace-nav\s*\{/);
  assert.match(css, /position: sticky/);
  assert.match(css, /\.anita-toggle-state/);
  assert.match(css, /\.field-condition-button/);
  assert.match(css, /\.operation-feedback/);
});

test("full and minimal targets expose precise pips configuration", async () => {
  const source = await readFile(islandPath, "utf8");
  assert.match(source, /More Precise HP Pips/);
  assert.match(source, /HP Colors cannot apply or verify these game settings/);
  assert.match(source, /citadel_unit_status_health_per_minor_pip/);
  assert.match(source, /copyText\(command\)/);
  assert.match(source, /currentGroup\?\.name === 'Number Overlay'/);
  assert.match(source, /persistMode=\{!fullTargetMode\}/);
  assert.match(source, /updateField\('hp_precise_pips_enabled', enabled\)/);
  assert.match(source, /showConditionButton=\{fullTargetMode\}/);
});
