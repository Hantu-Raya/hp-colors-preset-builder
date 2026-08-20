import assert from "node:assert/strict";
import test from "node:test";
import { createHpMenuGroups } from "../src/hpMenuNavigation.js";
import { HP_FIELD_CATALOG, REWRITE_FIELD_CATALOG } from "../src/hpSchema.js";

test("web navigation mirrors the in-game HP Colors menu", () => {
  const groups = createHpMenuGroups(HP_FIELD_CATALOG.schema);

  assert.deepEqual(groups.map((group) => group.name), [
    "OVERVIEW",
    "ENEMY",
    "ALLY",
    "HEALTH INFO"
  ]);
  assert.deepEqual(groups.map((group) => group.children.map((page) => page.name)), [
    ["MASTER", "LAYOUT", "PRESETS"],
    ["BAR", "HEAL & DAMAGE", "SHIELDS & ICONS", "PULSE", "KILL MARKER"],
    ["BAR", "HEAL & DAMAGE", "SHIELDS", "PULSE"],
    ["HP TEXT", "TEXT POSITION", "PIPS & LEVELS"]
  ]);

  const pages = groups.flatMap((group) => group.children);
  const assignedFieldIds = pages.flatMap((page) => page.fields.map((field) => field.id));
  assert.equal(pages.length, 15);
  assert.equal(new Set(assignedFieldIds).size, assignedFieldIds.length);
  assert.deepEqual(assignedFieldIds.sort(), Object.keys(HP_FIELD_CATALOG.schema).sort());
});

test("Rewrite navigation exposes every canonical setting exactly once", () => {
  const groups = createHpMenuGroups(REWRITE_FIELD_CATALOG);
  const fields = groups.flatMap((group) => group.children).flatMap((page) => page.fields);
  const canonicalKeys = fields.map((field) => field.canonicalKey);
  const forbiddenIds = [
    "hp_info_health_margin_top",
    "hp_healthbar_height",
    "hp_skip_buildings",
    "hp_counter_position",
    "hp_pulse_text_position"
  ];

  assert.equal(fields.length, 67);
  assert.equal(new Set(fields.map((field) => field.id)).size, 67);
  assert.equal(new Set(canonicalKeys).size, 67);
  assert.deepEqual(canonicalKeys.sort(), REWRITE_FIELD_CATALOG.bindings.map((binding) => binding.canonicalKey).sort());
  assert.equal(fields.some((field) => forbiddenIds.includes(field.id)), false);
  assert.equal(fields.some((field) => field.canonicalKey === "precisePipsEnabled" && field.conditionEligible === false), true);
});

test("reset boundaries keep pulse and kill-marker settings on separate pages", () => {
  const groups = createHpMenuGroups(HP_FIELD_CATALOG.schema);
  const enemyPages = groups.find((group) => group.name === "ENEMY").children;
  const pulse = enemyPages.find((page) => page.pageId === "enemy-pulse");
  const killMarker = enemyPages.find((page) => page.pageId === "enemy-kill-marker");

  assert.ok(pulse.fields.every((field) => field.id.startsWith("hp_pulse_")));
  assert.deepEqual(killMarker.fields.map((field) => field.id), [
    "hp_kill_zone_enabled",
    "hp_kill_zone_threshold",
    "hp_kill_zone_width",
    "hp_kill_zone_color"
  ]);
});
