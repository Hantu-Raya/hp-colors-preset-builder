import assert from "node:assert/strict";
import test from "node:test";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { createHealthbarPreviewModel } from "../src/healthbarPreviewModel.js";

test("preview model sanitizes values and exposes every healthbar layer", () => {
  const defaults = HP_FIELD_CATALOG.createDefaultState();
  const model = createHealthbarPreviewModel({
    ...defaults,
    hp_healthbar_height: 230,
    hp_info_health_margin_top: 100,
    hp_heal_color: "#123456",
    hp_delta_color: "#654321",
    hp_bullet_shield_color: "#abcdef",
    hp_kill_zone_enabled: true,
    hp_kill_zone_threshold: 30,
    hp_kill_zone_width: 5
  });
  const lowEnemy = model.teams[0].samples[0];

  assert.equal(model.barHeightScale, 230 / 130);
  assert.equal(model.topOffsetScale, 1);
  assert.equal(lowEnemy.healingColor, "#123456");
  assert.equal(lowEnemy.damageColor, "#654321");
  assert.equal(lowEnemy.shieldColor, "#ABCDEF");
  assert.deepEqual(lowEnemy.killMarker, { visible: true, positionPercent: 30, color: "#FF2222", width: 5 });
  assert.equal(lowEnemy.counterVisible, true);
  assert.equal(lowEnemy.pipsVisible, true);
  assert.equal(lowEnemy.pulse, true);
});

test("preview model interpolates low, mid, and high samples and honors team colors", () => {
  const defaults = HP_FIELD_CATALOG.createDefaultState();
  const gradient = createHealthbarPreviewModel({
    ...defaults,
    hp_low_threshold: 20,
    hp_high_threshold: 80,
    hp_color_low: "#000000",
    hp_color_mid: "#808080",
    hp_color_high: "#FFFFFF",
    hp_friend_enabled: true,
    hp_team_colors: false
  });
  const [low, mid, high] = gradient.teams[0].samples;

  assert.equal(low.fillColor, "#000000");
  assert.notEqual(mid.fillColor, low.fillColor);
  assert.notEqual(mid.fillColor, high.fillColor);
  assert.equal(high.fillColor, "#FFFFFF");

  const teamColors = createHealthbarPreviewModel({ ...defaults, hp_team_colors: true, hp_friend_enabled: true });
  assert.equal(teamColors.teams[0].samples[2].fillColor, "#D96565");
  assert.equal(teamColors.teams[1].samples[2].fillColor, "#68A8D6");
});
