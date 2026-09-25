import assert from "node:assert/strict";
import test from "node:test";
import { createHpMenuGroups } from "../src/hpv2HpMenuNavigation.js";
import { HP_FIELD_CATALOG, REWRITE_FIELD_CATALOG } from "../src/hpv2HpSchema.js";

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

test("Rewrite dependent controls reference real fields and hide until enabled", () => {
  const schema = REWRITE_FIELD_CATALOG.schema;
  for (const [id, spec] of Object.entries(schema)) {
    if (spec.visibleWhen) assert.ok(schema[spec.visibleWhen.id], `${id} depends on ${spec.visibleWhen.id}`);
  }
  const defaults = REWRITE_FIELD_CATALOG.createDefaultState();
  const visible = (id, state) => REWRITE_FIELD_CATALOG.isFieldVisible(schema[id], state);
  assert.equal(visible("hpv2_friend_readout_color_low", defaults), false);
  assert.equal(visible("hpv2_friend_readout_color_low", { ...defaults, hpv2_friend_readout_color_mode: 1 }), true);
  assert.equal(visible("hp_text_color_low", { ...defaults, hp_text_color_mode: 1 }), true);
  assert.equal(visible("hp_kill_zone_color", defaults), false);
  assert.equal(visible("hpv2_friend_readout_visible", defaults), true);
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
  const retiredCanonicalKeys = ["excludeBuildings", "excludeBosses", "excludeGhouls"];

  assert.equal(fields.length, Object.keys(REWRITE_FIELD_CATALOG.schema).length);
  assert.equal(new Set(fields.map((field) => field.id)).size, fields.length);
  assert.equal(new Set(canonicalKeys).size, fields.length);
  assert.deepEqual(
    canonicalKeys.sort(),
    Object.values(REWRITE_FIELD_CATALOG.schema).map((field) => field.canonicalKey).sort()
  );
  assert.deepEqual(groups.map((group) => group.name), ["OVERVIEW", "ENEMY", "ALLY", "HUD DETAILS"]);
  assert.deepEqual(groups.map((group) => group.children.map((page) => page.name)), [
    ["MASTER", "LAYOUT", "PRESETS"],
    ["BAR", "HEAL & DAMAGE", "SHIELDS", "PULSE", "KILL MARKER"],
    ["BAR", "HEAL & DAMAGE", "SHIELDS", "PULSE", "HP TEXT"],
    ["HP TEXT", "TEXT POSITION", "PIPS & LEVEL", "PICKUPS", "ULTIMATE", "STAMINA"]
  ]);
  assert.equal(fields.some((field) => forbiddenIds.includes(field.id)), false);
  assert.equal(fields.some((field) => field.canonicalKey === "precisePipsEnabled" && field.conditionEligible === false), true);
  const overviewLayout = groups
    .find((group) => group.name === "OVERVIEW")
    .children.find((page) => page.pageId === "overview-layout");
  const widthScale = overviewLayout.fields.find((field) => field.canonicalKey === "widthScale");
  assert.deepEqual(widthScale.bounds, { min: 60, max: 230, step: 1 });
  assert.deepEqual(
    overviewLayout.fields.map((field) => field.canonicalKey),
    ["widthScale", "heightScale", "positionX", "positionY", "accessoryAnchorEnabled"]
  );
  const enemyBar = groups
    .find((group) => group.name === "ENEMY")
    .children.find((page) => page.pageId === "enemy-bar");
  const allyBar = groups
    .find((group) => group.name === "ALLY")
    .children.find((page) => page.pageId === "ally-bar");
  const healthText = groups
    .find((group) => group.name === "HUD DETAILS")
    .children.find((page) => page.pageId === "health-text");
  assert.equal(enemyBar.fields.some((field) => field.canonicalKey === "lowThreshold"), true);
  assert.equal(enemyBar.fields.some((field) => field.canonicalKey === "highThreshold"), true);
  assert.deepEqual(canonicalKeys.filter((key) => retiredCanonicalKeys.includes(key)), []);
  assert.equal(enemyBar.fields.some((field) => field.canonicalKey === "ghoulOpacityEnabled"), true);
  assert.equal(enemyBar.fields.some((field) => field.canonicalKey === "ghoulOpacity"), true);
  assert.equal(allyBar.fields.some((field) => field.canonicalKey === "allyTeamHigh"), true);
  assert.equal(healthText.fields.some((field) => field.canonicalKey === "lowThreshold"), false);
  assert.equal(healthText.fields.some((field) => field.canonicalKey === "highThreshold"), false);
  assert.equal(healthText.fields.some((field) => field.canonicalKey === "readoutMaxTeamColor"), true);
  const indicators = groups
    .find((group) => group.name === "HUD DETAILS")
    .children.find((page) => page.pageId === "health-pips-levels");
  assert.deepEqual(indicators.fields.map((field) => field.canonicalKey), [
    "pipsVisible",
    "precisePipsEnabled",
    "levelsVisible",
    "levelOffsetX",
    "levelOffsetY"
  ]);
  const pickups = groups
    .find((group) => group.name === "HUD DETAILS")
    .children.find((page) => page.pageId === "health-pickups");
  assert.deepEqual(pickups.fields.map((field) => field.canonicalKey), [
    "pickupTimersEnabled",
    "pickupGunColor",
    "pickupMovementColor",
    "pickupSpiritColor",
    "pickupSurvivalColor",
    "pickupBackgroundDarkness",
    "pickupGlyphColor",
    "pickupSize",
    "pickupSpacing",
    "pickupOffsetX",
    "pickupOffsetY"
  ]);
  assert.deepEqual(pickups.fields.map((field) => field.id), [
    "hpv2_pickup_timers_enabled",
    "hpv2_pickup_gun_color",
    "hpv2_pickup_movement_color",
    "hpv2_pickup_spirit_color",
    "hpv2_pickup_survival_color",
    "hpv2_pickup_background_darkness",
    "hpv2_pickup_glyph_color",
    "hpv2_pickup_size",
    "hpv2_pickup_spacing",
    "hpv2_pickup_offset_x",
    "hpv2_pickup_offset_y"
  ]);
  const ultimate = groups
    .find((group) => group.name === "HUD DETAILS")
    .children.find((page) => page.pageId === "health-ultimate");
  assert.deepEqual(ultimate.fields.map((field) => field.canonicalKey), [
    "ultMode",
    "ultCustom",
    "ultimateTimerColorMode",
    "ultimateTimerUnavailableColor",
    "ultimateTimerAvailableColor",
    "ultimateTimerEnabled",
    "ultimateTimerSize",
    "ultimateTimerDarkness",
    "ultOffsetX",
    "ultOffsetY"
  ]);
  assert.deepEqual(
    ultimate.fields
      .filter((field) => field.canonicalKey.startsWith("ultimateTimer"))
      .map((field) => field.id),
    [
      "hpv2_ultimate_timer_color_mode",
      "hpv2_ultimate_timer_unavailable_color",
      "hpv2_ultimate_timer_available_color",
      "hpv2_ultimate_timer_enabled",
      "hpv2_ultimate_timer_size",
      "hpv2_ultimate_timer_darkness"
    ]
  );
  const allyPulse = groups
    .find((group) => group.name === "ALLY")
    .children.find((page) => page.pageId === "ally-pulse");
  assert.deepEqual(allyPulse.fields.map((field) => field.canonicalKey), [
    "allyPulseEnabled",
    "allyPulseThreshold",
    "allyPulseBpm",
    "allyPulseIntensity",
    "allyPulseColorEnabled",
    "allyPulseColor",
    "allyPulseColorMode"
  ]);
  const stamina = groups
    .find((group) => group.name === "HUD DETAILS")
    .children.find((page) => page.pageId === "health-stamina");
  assert.deepEqual(stamina.fields.map((field) => field.canonicalKey), [
    "staminaWidth",
    "staminaHeight",
    "staminaOffsetX",
    "staminaOffsetY",
    "enemyStaminaColorEnabled",
    "enemyStaminaColor"
  ]);
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
