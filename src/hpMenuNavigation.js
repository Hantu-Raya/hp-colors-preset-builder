const MENU_DEFINITION = Object.freeze([
  {
    name: "OVERVIEW",
    pages: [
      {
        name: "MASTER",
        title: "MASTER SWITCH",
        description: "Turn HP Colors on or off for this preset.",
        pageId: "overview-master",
        fieldIds: ["hp_enabled"]
      },
      {
        name: "LAYOUT",
        title: "BAR LAYOUT",
        description: "Adjust the healthbar height and its spacing from the unit information above it.",
        pageId: "overview-layout",
        fieldIds: ["hp_info_health_margin_top", "hp_healthbar_height"]
      },
      {
        name: "PRESETS",
        title: "PRESET LIBRARY",
        description: "Manage profiles, hero routing, imports, exports, and VPK tools.",
        pageId: "overview-presets",
        fieldIds: []
      }
    ]
  },
  {
    name: "ENEMY",
    pages: [
      {
        name: "BAR",
        title: "ENEMY BAR",
        description: "Choose fixed low, mid, and high colors or blend between them. Neutral units keep their default bars.",
        pageId: "enemy-bar",
        fieldIds: [
          "hp_bg_visible",
          "hp_mode",
          "hp_color_low",
          "hp_color_mid",
          "hp_color_high",
          "hp_low_threshold",
          "hp_high_threshold",
          "hp_team_colors",
          "hp_skip_buildings"
        ]
      },
      {
        name: "HEAL & DAMAGE",
        title: "HEAL & DAMAGE",
        description: "Choose the colors for healing and recent damage on enemy bars.",
        pageId: "enemy-feedback",
        fieldIds: ["hp_heal_color", "hp_delta_color"]
      },
      {
        name: "SHIELDS & ICONS",
        title: "SHIELDS & ICONS",
        description: "Choose colors for enemy bullet shields and ultimate-ready icons. Their visibility stays the same.",
        pageId: "enemy-shields",
        fieldIds: ["hp_bullet_shield_color", "hp_ult_color_enabled", "hp_ult_color_custom"]
      },
      {
        name: "PULSE",
        title: "ENEMY PULSE",
        description: "Make enemy bars pulse when their health reaches the threshold.",
        pageId: "enemy-pulse",
        fieldIds: [
          "hp_pulse_enabled",
          "hp_pulse_threshold",
          "hp_pulse_bpm",
          "hp_pulse_intensity",
          "hp_pulse_hide_bar",
          "hp_pulse_color_enabled",
          "hp_pulse_color_mode",
          "hp_pulse_color",
          "hp_pulse_text_enabled",
          "hp_pulse_text_scale",
          "hp_pulse_text_position"
        ]
      },
      {
        name: "KILL MARKER",
        title: "ENEMY KILL MARKER",
        description: "Show a marker on enemy player healthbars at your chosen health threshold.",
        pageId: "enemy-kill-marker",
        fieldIds: ["hp_kill_zone_enabled", "hp_kill_zone_threshold", "hp_kill_zone_width", "hp_kill_zone_color"]
      }
    ]
  },
  {
    name: "ALLY",
    pages: [
      {
        name: "BAR",
        title: "ALLY BAR",
        description: "Choose low, mid, and high ally colors using the shared health thresholds.",
        pageId: "ally-bar",
        fieldIds: ["hp_friend_enabled", "hp_friend_color_low", "hp_friend_color_mid", "hp_friend_color_high"]
      },
      {
        name: "HEAL & DAMAGE",
        title: "HEAL & DAMAGE",
        description: "Choose the colors for healing and recent damage on ally bars.",
        pageId: "ally-feedback",
        fieldIds: ["hp_friend_heal_color", "hp_friend_delta_color"]
      },
      {
        name: "SHIELDS",
        title: "ALLY SHIELDS",
        description: "Choose the color for ally bullet shields.",
        pageId: "ally-shields",
        fieldIds: ["hp_friend_bullet_shield_color"]
      },
      {
        name: "PULSE",
        title: "ALLY PULSE",
        description: "Make ally bars pulse when their health reaches the threshold.",
        pageId: "ally-pulse",
        fieldIds: [
          "hp_friend_pulse_enabled",
          "hp_friend_pulse_threshold",
          "hp_friend_pulse_bpm",
          "hp_friend_pulse_intensity",
          "hp_friend_pulse_color_enabled",
          "hp_friend_pulse_color"
        ]
      }
    ]
  },
  {
    name: "HEALTH INFO",
    pages: [
      {
        name: "HP TEXT",
        title: "HP TEXT",
        description: "Choose how enemy HP appears and how its colors follow the healthbar.",
        pageId: "health-text",
        fieldIds: [
          "hp_counter_visible",
          "hp_counter_format",
          "hp_counter_size",
          "hp_text_color_mode",
          "hp_text_color_low",
          "hp_text_color_mid",
          "hp_text_color_high"
        ]
      },
      {
        name: "TEXT POSITION",
        title: "TEXT POSITION",
        description: "Move the HP text without moving the healthbar or unit icon.",
        pageId: "health-text-position",
        fieldIds: ["hp_counter_position"]
      },
      {
        name: "PIPS & LEVELS",
        title: "PIPS & LEVELS",
        description: "Show or hide health pips and player levels. Precise pip counts require the shown config commands.",
        pageId: "health-pips-levels",
        fieldIds: ["hp_level_number_visible", "hp_pip_visible", "hp_precise_pips_enabled"]
      }
    ]
  }
]);

export function createHpMenuGroups(schema) {
  const usedFieldIds = new Set();
  const groups = MENU_DEFINITION.map((category) => {
    const path = [category.name];
    const children = category.pages.map((page) => {
      const fields = page.fieldIds.map((fieldId) => {
        const spec = schema[fieldId];
        if (!spec) throw new Error(`HP menu page ${page.pageId} references unknown field ${fieldId}.`);
        if (usedFieldIds.has(fieldId)) throw new Error(`HP menu field ${fieldId} is assigned more than once.`);
        usedFieldIds.add(fieldId);
        return { id: fieldId, ...spec };
      });
      return {
        name: page.name,
        title: page.title,
        description: page.description,
        pageId: page.pageId,
        path: [...path, page.name],
        fields,
        children: []
      };
    });
    return { name: category.name, path, fields: [], children };
  });

  const schemaFieldIds = Object.keys(schema);
  const missingFieldIds = schemaFieldIds.filter((fieldId) => !usedFieldIds.has(fieldId));
  if (missingFieldIds.length) {
    throw new Error(`HP menu is missing fields: ${missingFieldIds.join(", ")}.`);
  }
  return groups;
}
