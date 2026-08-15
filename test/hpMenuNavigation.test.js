import assert from "node:assert/strict";
import test from "node:test";
import { createHpMenuGroups } from "../src/hpMenuNavigation.js";
import { HP_FIELD_CATALOG } from "../src/hpSchema.js";

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
