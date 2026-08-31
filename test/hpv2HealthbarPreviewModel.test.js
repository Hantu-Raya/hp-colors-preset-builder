import test from "node:test";
import assert from "node:assert/strict";
import { REWRITE_FIELD_CATALOG } from "../src/hpv2HpSchema.js";
import { DEFAULT_SCENARIO, createHealthbarPipGeometry, createHealthbarPreviewModel } from "../src/hpv2HealthbarPreviewModel.js";

const defaults = REWRITE_FIELD_CATALOG.createDefaultState();

function state(overrides = {}) {
  return { ...defaults, ...overrides };
}

function scenario(overrides = {}) {
  return { ...DEFAULT_SCENARIO, ...overrides };
}

test("Rewrite defaults use the requested enemy gradient and reference scenario", () => {
  assert.deepEqual(
    {
      mode: defaults.hp_mode,
      low: defaults.hp_color_low,
      mid: defaults.hp_color_mid,
      high: defaults.hp_color_high
    },
    {
      mode: 1,
      low: "#FD4949",
      mid: "#FF7B00",
      high: "#00FF00"
    }
  );
  assert.deepEqual(DEFAULT_SCENARIO, {
    healthPercent: 100,
    relation: "enemy",
    team: "enemy",
    unitKind: "hero",
    maxHealth: 800,
    level: 1,
    healingPercent: 0,
    damagePercent: 0,
    bulletShieldPercent: 0,
    techShieldPercent: 0,
    animationPaused: false
  });

  const model = createHealthbarPreviewModel(defaults, DEFAULT_SCENARIO);
  assert.equal(model.bar.color, "#00ff00");
  assert.equal(model.readout.text, "800 / ");
  assert.equal(model.readout.maxText, "800");
  assert.equal(model.level.value, 1);
  assert.equal(model.ult.color, "#00ff00");
});

test("preview returns the documented stable groups and normalizes without mutation", () => {
  const profile = state({ hp_low_threshold: 98, hp_high_threshold: 2 });
  const input = {
    healthPercent: -4,
    relation: "unknown",
    team: "TEAM2",
    unitKind: "hero",
    maxHealth: "not-a-number",
    level: 999,
    healingPercent: 150,
    damagePercent: -2,
    bulletShieldPercent: 10,
    techShieldPercent: 5,
    animationPaused: "true"
  };
  const original = structuredClone(input);
  const model = createHealthbarPreviewModel(profile, input);

  assert.deepEqual(Object.keys(model), ["scenario", "bar", "readout", "level", "ult", "killMarker", "stamina", "pulse", "stock"]);
  assert.deepEqual(input, original);
  assert.deepEqual(model.scenario, {
    healthPercent: 0,
    relation: "enemy",
    team: "team2",
    unitKind: "hero",
    maxHealth: 800,
    level: 100,
    healingPercent: 100,
    damagePercent: 0,
    bulletShieldPercent: 10,
    techShieldPercent: 5,
    animationPaused: true
  });
});

test("gradient colors use inclusive thresholds and Rewrite's two-segment interpolation", () => {
  const profile = state({
    hp_mode: 1,
    hp_color_low: "#000000",
    hp_color_mid: "#808080",
    hp_color_high: "#FFFFFF",
    hp_low_threshold: 25,
    hp_high_threshold: 65,
    hp_pulse_enabled: false
  });
  const colorAt = (healthPercent) => createHealthbarPreviewModel(profile, scenario({ healthPercent, bulletShieldPercent: 0, techShieldPercent: 0 })).bar.color;

  assert.equal(colorAt(25), "#000000");
  assert.equal(colorAt(45), "#404040");
  assert.equal(colorAt(65), "#808080");
  assert.equal(colorAt(100), "#ffffff");
});

test("fixed colors keep the low, mid, and high boundary buckets", () => {
  const profile = state({
    hp_mode: 0,
    hp_color_low: "#110000",
    hp_color_mid: "#001100",
    hp_color_high: "#000011",
    hp_pulse_enabled: false
  });
  const colorAt = (healthPercent) => createHealthbarPreviewModel(profile, scenario({ healthPercent, bulletShieldPercent: 0, techShieldPercent: 0 })).bar.color;

  assert.equal(colorAt(0), "#110000");
  assert.equal(colorAt(25), "#110000");
  assert.equal(colorAt(26), "#001100");
  assert.equal(colorAt(65), "#001100");
  assert.equal(colorAt(66), "#000011");
});

test("shield-relative sampling drives bar color, percent text, and raw fill width", () => {
  const profile = state({
    hp_mode: 0,
    hp_color_low: "#101010",
    hp_color_mid: "#202020",
    hp_color_high: "#303030",
    hp_low_threshold: 20,
    hp_high_threshold: 90,
    hp_counter_format: 1,
    hp_pulse_enabled: false
  });
  const model = createHealthbarPreviewModel(profile, scenario({
    healthPercent: 72,
    bulletShieldPercent: 18,
    techShieldPercent: 6
  }));

  assert.equal(model.bar.healthParentPercent, 76);
  assert.equal(model.bar.layers.fill.width, 72);
  assert.equal(model.bar.color, "#303030");
  assert.equal(model.readout.text, "94%");
});

test("pulse threshold uses sampled health percent with shields", () => {
  const profile = state({
    hp_pulse_enabled: true,
    hp_pulse_threshold: 25,
    hp_pulse_color_enabled: false
  });
  const rawThreshold = createHealthbarPreviewModel(profile, scenario({
    healthPercent: 25,
    bulletShieldPercent: 18,
    techShieldPercent: 6
  }));
  const sampledThreshold = createHealthbarPreviewModel(profile, scenario({
    healthPercent: 19,
    bulletShieldPercent: 18,
    techShieldPercent: 6
  }));

  assert.equal(rawThreshold.pulse.active, false);
  assert.equal(sampledThreshold.pulse.active, true);
  assert.equal(sampledThreshold.pulse.overlayVisible, true);
  assert.equal(sampledThreshold.pulse.overlayWidth, 19);
  assert.equal(sampledThreshold.pulse.overlayColor, sampledThreshold.bar.color);
});

test("kill marker requires a positive parent and unowned ghoul bars stay stock", () => {
  const profile = state({
    hp_kill_zone_enabled: true,
    hp_kill_zone_width: 100,
    hp_ghoul_opacity_enabled: true,
    hp_ghoul_opacity: 50,
    hp_pulse_enabled: false
  });
  const noParent = createHealthbarPreviewModel(profile, scenario({
    healthPercent: 0,
    bulletShieldPercent: 100,
    techShieldPercent: 0
  }));

  assert.equal(noParent.bar.healthParentPercent, 0);
  assert.equal(noParent.killMarker.visible, false);
  assert.equal(noParent.killMarker.widthPx, 0);

  for (const [relation, team, color] of [
    ["neutral", "neutral", "#5BEFB5"],
    ["other", "team1", "#E7B659"]
  ]) {
    const model = createHealthbarPreviewModel(profile, scenario({
      relation,
      team,
      unitKind: "ghoul",
      healthPercent: 50,
      bulletShieldPercent: 0,
      techShieldPercent: 0
    }));
    assert.equal(model.bar.visible, true);
    assert.equal(model.bar.opacity, 1);
    assert.equal(model.bar.color, color);
  }
});

test("ally bars use independent enablement, colors, and layers without HP readout", () => {
  const profile = state({
    hp_friend_enabled: true,
    hp_friend_mode: 0,
    hp_friend_color_low: "#101010",
    hp_friend_color_mid: "#202020",
    hp_friend_color_high: "#303030",
    hp_friend_heal_color: "#AABBCC",
    hp_friend_delta_color: "#DDEEFF",
    hp_friend_bullet_shield_color: "#123456",
    hp_pulse_enabled: false,
    hp_friend_pulse_enabled: false
  });
  const model = createHealthbarPreviewModel(profile, scenario({ relation: "ally", team: "ally", healthPercent: 30 }));

  assert.equal(model.bar.color, "#202020");
  assert.equal(model.bar.layers.healing.color, "#AABBCC");
  assert.equal(model.bar.layers.damage.color, "#DDEEFF");
  assert.equal(model.bar.layers.bulletShield.color, "#123456");
  assert.equal(model.readout.visible, false);
  assert.equal(model.level.visible, false);
});

test("stock mode preserves the scenario but restores stock colors and geometry", () => {
  const profile = state({
    hp_width_scale: 160,
    hp_height_scale: 60,
    hp_bar_offset_x: 100,
    hp_bar_offset_y: -100,
    hp_color_low: "#123456",
    hp_heal_color: "#123456",
    hp_enemy_enabled: true,
    hp_pulse_enabled: true,
    hp_counter_visible: true
  });
  const model = createHealthbarPreviewModel(profile, scenario({ healthPercent: 10 }), { stock: true });

  assert.equal(model.stock, true);
  assert.equal(model.scenario.healthPercent, 10);
  assert.deepEqual(
    { widthPx: model.bar.widthPx, heightPx: model.bar.heightPx, offsetX: model.bar.offsetX, offsetY: model.bar.offsetY },
    { widthPx: 900, heightPx: 130, offsetX: 0, offsetY: 0 }
  );
  assert.equal(model.bar.color, "#FD4949");
  assert.equal(model.bar.layers.healing.color, "#5FFF80");
  assert.equal(model.readout.visible, false);
  assert.equal(model.pulse.active, false);
});

test("geometry follows Rewrite V2 dimensions, scale, and translation", () => {
  const profile = state({
    hp_width_scale: 230,
    hp_height_scale: 80,
    hp_bar_offset_x: 42,
    hp_bar_offset_y: -17,
    hp_pulse_enabled: false
  });
  const model = createHealthbarPreviewModel(profile, scenario({ unitKind: "boss", relation: "enemy" }));

  assert.deepEqual(
    {
      baseWidthPx: model.bar.baseWidthPx,
      baseHeightPx: model.bar.baseHeightPx,
      widthPx: model.bar.widthPx,
      heightPx: model.bar.heightPx,
      widthScalePercent: model.bar.widthScalePercent,
      heightScalePercent: model.bar.heightScalePercent
    },
    { baseWidthPx: 750, baseHeightPx: 120, widthPx: 1725, heightPx: 96, widthScalePercent: 230, heightScalePercent: 80 }
  );
  assert.equal(model.bar.transform, "translateX(42px) translateY(-17px)");
});

test("readout formats current HP, percent, color, font, and shield-adjusted maximum", () => {
  const profile = state({
    hp_counter_format: 0,
    hp_readout_font: 1,
    hp_counter_size: 180,
    hp_readout_offset_x: 31,
    hp_readout_offset_y: 420,
    hp_text_color_mode: 1,
    hp_text_color_low: "#111111",
    hp_text_color_mid: "#222222",
    hp_text_color_high: "#333333",
    hp_readout_mode: 0,
    hp_pulse_enabled: false
  });
  const baseScenario = scenario({ healthPercent: 72, maxHealth: 1000, bulletShieldPercent: 18, techShieldPercent: 6 });
  const hp = createHealthbarPreviewModel(profile, baseScenario);

  assert.equal(hp.readout.text, "720 / ");
  assert.equal(hp.readout.maxText, "760");
  assert.equal(hp.readout.color, "#333333");
  assert.equal(hp.readout.maxColor, "#333333");
  assert.equal(hp.readout.fontFamily, "VALVEOracle, Reaver, sans-serif");
  assert.equal(hp.readout.fontSize, 180);
  assert.deepEqual({ x: hp.readout.offsetX, y: hp.readout.offsetY }, { x: 31, y: 420 });

  assert.equal(createHealthbarPreviewModel({ ...profile, hp_counter_format: 1 }, baseScenario).readout.text, "94%");
  assert.equal(createHealthbarPreviewModel({ ...profile, hp_counter_format: 2 }, baseScenario).readout.text, "720");
});

test("maximum HP preview uses team color without recoloring current HP", () => {
  const model = createHealthbarPreviewModel(
    state({
      hp_counter_format: 0,
      hp_readout_max_team_color: true,
      hp_text_color_mode: 1,
      hp_readout_mode: 0,
      hp_text_color_low: "#111111",
      hp_text_color_mid: "#222222",
      hp_text_color_high: "#333333",
      hp_pulse_enabled: false
    }),
    scenario({ healthPercent: 50, team: "team2", maxHealth: 1000, bulletShieldPercent: 18, techShieldPercent: 6 })
  );

  assert.equal(model.readout.text, "500 / ");
  assert.equal(model.readout.maxText, "760");
  assert.equal(model.readout.color, "#222222");
  assert.equal(model.readout.maxColor, "#5B79E6");
});

test("bar-sourced readout color follows the active bar gradient mode", () => {
  const profile = state({
    hp_mode: 1,
    hp_color_low: "#000000",
    hp_color_mid: "#0000FF",
    hp_color_high: "#FFFFFF",
    hp_low_threshold: 25,
    hp_high_threshold: 65,
    hp_text_color_mode: 0,
    hp_readout_mode: 0,
    hp_counter_format: 1,
    hp_pulse_enabled: false
  });
  const model = createHealthbarPreviewModel(profile, scenario({
    healthPercent: 40,
    bulletShieldPercent: 18,
    techShieldPercent: 6
  }));

  assert.equal(model.bar.color, "#0000ac");
  assert.equal(model.readout.color, "#0000ac");
});

test("level tiers and ult colors follow Rewrite boundaries", () => {
  const profile = state({ hp_pulse_enabled: false, hp_ult_color_enabled: false, hp_ult_color_custom: "#ABCDEF" });
  const at = (level) => createHealthbarPreviewModel(profile, scenario({ level })).level;

  assert.equal(at(10).tier, null);
  assert.equal(at(11).className, "level_tier2");
  assert.equal(at(19).color, "#ff8c00");
  assert.equal(at(35).className, "level_tier5");
  assert.equal(createHealthbarPreviewModel(profile, scenario()).ult.color, "#ABCDEF");
});

test("kill marker clamps to the health-parent width and uses configured color", () => {
  const profile = state({
    hp_pulse_enabled: false,
    hp_kill_zone_enabled: true,
    hp_kill_zone_threshold: 5,
    hp_kill_zone_width: 100,
    hp_kill_zone_color: "#ABCDEF"
  });
  const model = createHealthbarPreviewModel(profile, scenario({ healthPercent: 80, bulletShieldPercent: 20, techShieldPercent: 10 }));

  assert.equal(model.killMarker.visible, true);
  assert.equal(model.killMarker.widthPx, 100);
  assert.equal(model.killMarker.leftPx, 0);
  assert.equal(model.killMarker.thresholdPercent, 5);
  assert.equal(model.killMarker.color, "#ABCDEF");
});

test("pulse honors threshold inclusivity, duration, color mode, hide-bar, and pause", () => {
  const profile = state({
    hp_pulse_enabled: true,
    hp_pulse_threshold: 25,
    hp_pulse_bpm: 75,
    hp_pulse_intensity: 2,
    hp_pulse_color_enabled: true,
    hp_pulse_color_mode: 0,
    hp_pulse_color: "#ABCDEF",
    hp_pulse_hide_bar: true,
    hp_pulse_text_enabled: true,
    hp_pulse_readout_modifiers: true,
    hp_pulse_text_scale: 220,
    hp_pulse_readout_offset_x: 4,
    hp_pulse_readout_offset_y: 8,
    hp_kill_zone_enabled: true
  });
  const active = createHealthbarPreviewModel(profile, scenario({ healthPercent: 25, bulletShieldPercent: 0, techShieldPercent: 0 }));
  const paused = createHealthbarPreviewModel(profile, scenario({ healthPercent: 25, bulletShieldPercent: 0, techShieldPercent: 0, animationPaused: true }));

  assert.equal(active.pulse.active, true);
  assert.equal(active.pulse.color, "#ABCDEF");
  assert.equal(active.pulse.hideBar, true);
  assert.equal(active.pulse.readoutActive, true);
  assert.equal(active.readout.fontSize, 220);
  assert.equal(active.bar.opacity, 0.01);
  assert.equal(active.killMarker.visible, false);
  assert.equal(paused.pulse.active, true);
  assert.equal(paused.pulse.paused, true);
  assert.equal(paused.bar.opacity, 0.01);
});

test("ally pulse fixed and gradient modes match Rewrite V2", () => {
  const common = {
    hp_friend_enabled: true,
    hp_friend_color_low: "#123456",
    hp_friend_color_mid: "#123456",
    hp_friend_color_high: "#123456",
    hp_friend_pulse_enabled: true,
    hp_friend_pulse_threshold: 100,
    hp_friend_pulse_color_enabled: true,
    hp_friend_pulse_color: "#ABCDEF"
  };
  const ally = scenario({
    relation: "ally",
    team: "ally",
    healthPercent: 50
  });
  const fixed = createHealthbarPreviewModel(
    state({ ...common, hpv2_friend_pulse_color_mode: 0 }),
    ally
  );
  const gradient = createHealthbarPreviewModel(
    state({ ...common, hpv2_friend_pulse_color_mode: 1 }),
    ally
  );

  assert.equal(fixed.pulse.colorMode, "fixed");
  assert.equal(fixed.bar.color, "#ABCDEF");
  assert.equal(gradient.pulse.colorMode, "gradient");
  assert.equal(gradient.bar.color, "#123456");
  assert.equal(gradient.pulse.overlayColor, "#ABCDEF");
});

test("health pips use stock 100-health minors and 500-health majors", () => {
  const normal = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false, hp_precise_pips_enabled: false }),
    scenario({ maxHealth: 1000 })
  );
  const precise = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false, hp_precise_pips_enabled: true }),
    scenario({ maxHealth: 1000 })
  );

  assert.deepEqual(normal.bar.pips, {
    visible: true,
    precise: false,
    minorHealth: 100,
    majorHealth: 500,
    minorCount: 10,
    majorCount: 2
  });
  assert.deepEqual(precise.bar.pips, {
    visible: true,
    precise: true,
    minorHealth: 10,
    majorHealth: 50,
    minorCount: 100,
    majorCount: 20
  });
});

test("pip geometry preserves stock groups without collapsing below four pixels", () => {
  const pips = {
    visible: true,
    precise: false,
    minorHealth: 100,
    majorHealth: 500,
    minorCount: 327,
    majorCount: 65
  };

  assert.deepEqual(createHealthbarPipGeometry(pips, 1000, 126), {
    minorHealth: 100,
    majorHealth: 500,
    minorCount: 10,
    majorCount: 2,
    minorStepPercent: 10,
    majorStepPercent: 50
  });

  const dense = createHealthbarPipGeometry(pips, 32700, 126);
  assert.deepEqual(
    {
      minorHealth: dense.minorHealth,
      majorHealth: dense.majorHealth,
      minorCount: dense.minorCount,
      majorCount: dense.majorCount
    },
    {
      minorHealth: 1100,
      majorHealth: 5500,
      minorCount: 29,
      majorCount: 5
    }
  );
  assert.ok(Math.abs(dense.minorStepPercent - 1100 / 327) < 1e-12);
  assert.ok(Math.abs(dense.majorStepPercent - 5500 / 327) < 1e-12);
  assert.ok((dense.minorStepPercent / 100) * 126 >= 4);
});

test("team colors override the high HP bucket only for team1 and team2 scenarios", () => {
  const team1 = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false, hp_team_colors: true }),
    scenario({ healthPercent: 100, team: "team1" })
  );
  const team2 = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false, hp_team_colors: true }),
    scenario({ healthPercent: 100, team: "team2" })
  );
  const toggleOff = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false }),
    scenario({ healthPercent: 100, team: "team1" })
  );
  const nonTeam = createHealthbarPreviewModel(
    state({ hp_pulse_enabled: false, hp_team_colors: true }),
    scenario({ healthPercent: 100 })
  );
  const allyTeam1 = createHealthbarPreviewModel(
    state({
      hp_friend_enabled: true,
      hp_friend_team_colors: true,
      hp_friend_pulse_enabled: false
    }),
    scenario({ relation: "ally", healthPercent: 100, team: "team1" })
  );
  const allyTeam2 = createHealthbarPreviewModel(
    state({
      hp_friend_enabled: true,
      hp_friend_team_colors: true,
      hp_friend_pulse_enabled: false
    }),
    scenario({ relation: "ally", healthPercent: 100, team: "team2" })
  );
  const allyUnknown = createHealthbarPreviewModel(
    state({
      hp_friend_enabled: true,
      hp_friend_team_colors: true,
      hp_friend_color_high: "#ABCDEF",
      hp_friend_pulse_enabled: false
    }),
    scenario({ relation: "ally", healthPercent: 100 })
  );
  const neutralTeam = createHealthbarPreviewModel(
    state({
      hp_friend_team_colors: true,
      hp_friend_pulse_enabled: false
    }),
    scenario({ relation: "neutral", healthPercent: 100, team: "team1" })
  );

  assert.equal(team1.bar.color, "#e7b659");
  assert.equal(team1.readout.color, "#e7b659");
  assert.equal(team2.bar.color, "#5b79e6");
  assert.equal(toggleOff.bar.color, nonTeam.bar.color);
  assert.equal(allyTeam1.bar.color, "#E7B659");
  assert.equal(allyTeam2.bar.color, "#5B79E6");
  assert.equal(allyUnknown.bar.color, "#ABCDEF");
  assert.equal(neutralTeam.bar.color, "#5BEFB5");
});

test("healing, damage, bullet shield, and tech shield remain independent layers", () => {
  const model = createHealthbarPreviewModel(state({ hp_pulse_enabled: false }), scenario({
    healthPercent: 72,
    maxHealth: 2000,
    healingPercent: 12,
    damagePercent: 34,
    bulletShieldPercent: 5,
    techShieldPercent: 27
  }));

  assert.deepEqual(
    Object.fromEntries(Object.entries(model.bar.layers).map(([name, layer]) => [name, { width: layer.width, rawValue: layer.rawValue }])),
    {
      fill: { width: 72, rawValue: 1440 },
      missing: { width: 28, rawValue: 560 },
      healing: { width: 12, rawValue: 240 },
      damage: { width: 34, rawValue: 680 },
      bulletShield: { width: 5, rawValue: 100 },
      techShield: { width: 27, rawValue: 540 }
    }
  );
});

test("retired exclusion values do not disable Rewrite paint", () => {
  const profile = state({
    hp_exclude_buildings: true,
    hp_width_scale: 120,
    hp_color_low: "#010101",
    hp_heal_color: "#020202",
    hp_pulse_enabled: true
  });
  const model = createHealthbarPreviewModel(profile, scenario({ unitKind: "building", healthPercent: 10 }));

  assert.equal(model.bar.color, "#010101");
  assert.equal(model.bar.layers.healing.color, "#020202");
  assert.equal(model.bar.widthPx, 900);
  assert.equal(model.readout.visible, true);
  assert.equal(model.pulse.active, true);
});

test("enemy stamina preview follows HPv2 geometry, color, and stock fallback", () => {
  const customized = createHealthbarPreviewModel(
    state({
      hpv2_stamina_width: 150,
      hpv2_stamina_height: 52.5,
      hpv2_stamina_offset_x: 24,
      hpv2_stamina_offset_y: -18,
      hpv2_enemy_stamina_color_enabled: true,
      hpv2_enemy_stamina_color: "#123456",
    }),
    scenario({ relation: "enemy" }),
  );
  assert.deepEqual(customized.stamina, {
    visible: true,
    customized: true,
    widthPx: 150,
    heightPx: 52.5,
    offsetX: 24,
    offsetY: -18,
    color: "#123456",
    pips: [{ empty: false }, { empty: false }, { empty: true }],
  });

  const fallbackColor = createHealthbarPreviewModel(
    state({
      hpv2_enemy_stamina_color_enabled: false,
      hpv2_enemy_stamina_color: "#123456",
    }),
    scenario({ relation: "enemy" }),
  );
  assert.equal(fallbackColor.stamina.color, "#FFFFFF");

  const stock = createHealthbarPreviewModel(
    state({
      hpv2_stamina_width: 150,
      hpv2_enemy_stamina_color_enabled: true,
      hpv2_enemy_stamina_color: "#123456",
    }),
    scenario({ relation: "enemy" }),
    { stock: true },
  );
  assert.deepEqual(stock.stamina, {
    visible: true,
    customized: false,
    widthPx: 110,
    heightPx: 44.8,
    offsetX: 0,
    offsetY: 0,
    color: "#FFFFFF",
    pips: [{ empty: false }, { empty: false }, { empty: true }],
  });

  const ally = createHealthbarPreviewModel(
    state(),
    scenario({ relation: "ally" }),
  );
  assert.equal(ally.stamina.visible, false);
});
