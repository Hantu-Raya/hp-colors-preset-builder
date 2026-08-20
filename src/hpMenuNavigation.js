const MENU_DEFINITION = Object.freeze([
  {
    name: "OVERVIEW",
    pages: [
      {
        name: "MASTER",
        title: "MASTER SWITCH",
        description: "Turn HP Colors on or off for this preset.",
        pageId: "overview-master",
        fieldIds: ["hp_enabled"],
        rewriteKeys: ["enabled"]
      },
      {
        name: "LAYOUT",
        title: "BAR LAYOUT",
        description: "Adjust the healthbar height and its spacing from the unit information above it.",
        pageId: "overview-layout",
        fieldIds: ["hp_info_health_margin_top", "hp_healthbar_height"],
        rewriteKeys: ["widthScale", "heightScale", "positionX", "positionY"]
      },
      {
        name: "PRESETS",
        title: "PRESET LIBRARY",
        description: "Manage profiles, hero routing, imports, exports, and VPK tools.",
        pageId: "overview-presets",
        fieldIds: [],
        rewriteKeys: []
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
        ],
        rewriteKeys: [
          "enemyEnabled",
          "enemyVisible",
          "enemyMode",
          "enemyLow",
          "enemyMid",
          "enemyHigh",
          "enemyTeamHigh",
          "excludeBuildings",
          "excludeBosses"
        ]
      },
      {
        name: "HEAL & DAMAGE",
        title: "HEAL & DAMAGE",
        description: "Choose the colors for healing and recent damage on enemy bars.",
        pageId: "enemy-feedback",
        fieldIds: ["hp_heal_color", "hp_delta_color"],
        rewriteKeys: ["enemyHealing", "enemyDelta"]
      },
      {
        name: "SHIELDS & ICONS",
        title: "SHIELDS & ICONS",
        description: "Choose colors for enemy bullet shields and ultimate-ready icons. Their visibility stays the same.",
        pageId: "enemy-shields",
        fieldIds: ["hp_bullet_shield_color", "hp_ult_color_enabled", "hp_ult_color_custom"],
        rewriteKeys: ["enemyBulletShield"]
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
        ],
        rewriteKeys: [
          "enemyPulseEnabled",
          "enemyPulseThreshold",
          "enemyPulseBpm",
          "enemyPulseIntensity",
          "enemyPulseColorEnabled",
          "enemyPulseColorMode",
          "enemyPulseColor",
          "enemyPulseHideBar",
          "enemyPulseReadout",
          "enemyPulseReadoutModifiers",
          "enemyPulseReadoutSize",
          "enemyPulseReadoutOffsetX",
          "enemyPulseReadoutOffsetY"
        ]
      },
      {
        name: "KILL MARKER",
        title: "ENEMY KILL MARKER",
        description: "Show a marker on enemy player healthbars at your chosen health threshold.",
        pageId: "enemy-kill-marker",
        fieldIds: ["hp_kill_zone_enabled", "hp_kill_zone_threshold", "hp_kill_zone_width", "hp_kill_zone_color"],
        rewriteKeys: ["enemyKillMarkerEnabled", "enemyKillMarkerThreshold", "enemyKillMarkerWidth", "enemyKillMarkerColor"]
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
        fieldIds: ["hp_friend_enabled", "hp_friend_color_low", "hp_friend_color_mid", "hp_friend_color_high"],
        rewriteKeys: ["allyEnabled", "allyVisible", "allyMode", "allyLow", "allyMid", "allyHigh"]
      },
      {
        name: "HEAL & DAMAGE",
        title: "HEAL & DAMAGE",
        description: "Choose the colors for healing and recent damage on ally bars.",
        pageId: "ally-feedback",
        fieldIds: ["hp_friend_heal_color", "hp_friend_delta_color"],
        rewriteKeys: ["allyHealing", "allyDelta"]
      },
      {
        name: "SHIELDS",
        title: "ALLY SHIELDS",
        description: "Choose the color for ally bullet shields.",
        pageId: "ally-shields",
        fieldIds: ["hp_friend_bullet_shield_color"],
        rewriteKeys: ["allyBulletShield"]
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
        ],
        rewriteKeys: [
          "allyPulseEnabled",
          "allyPulseThreshold",
          "allyPulseBpm",
          "allyPulseIntensity",
          "allyPulseColorEnabled",
          "allyPulseColor"
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
        ],
        rewriteKeys: [
          "readoutVisible",
          "readoutFormat",
          "readoutSize",
          "readoutFont",
          "readoutColorMode",
          "readoutMode",
          "lowThreshold",
          "highThreshold",
          "readoutLow",
          "readoutMid",
          "readoutHigh"
        ]
      },
      {
        name: "TEXT POSITION",
        title: "TEXT POSITION",
        description: "Move the HP text without moving the healthbar or unit icon.",
        pageId: "health-text-position",
        fieldIds: ["hp_counter_position"],
        rewriteKeys: ["readoutOffsetX", "readoutOffsetY"]
      },
      {
        name: "PIPS & LEVELS",
        title: "PIPS & LEVELS",
        description: "Show or hide health pips and player levels. Precise pip counts require the shown config commands.",
        pageId: "health-pips-levels",
        fieldIds: ["hp_level_number_visible", "hp_pip_visible", "hp_precise_pips_enabled"],
        rewriteKeys: ["pipsVisible", "precisePipsEnabled", "levelsVisible", "ultMode", "ultCustom"]
      }
    ]
  }
]);

export function createHpMenuGroups(catalogOrSchema) {
  const catalog = catalogOrSchema?.schema ? catalogOrSchema : null;
  const schema = catalog?.schema || catalogOrSchema || {};
  const rewrite = catalog?.variant === "rewrite";
  const usedFieldIds = new Set();
  const groups = MENU_DEFINITION.map((category) => {
    const path = [category.name];
    const children = category.pages.map((page) => {
      const ids = rewrite
        ? page.rewriteKeys
        : page.fieldIds;
      const fields = ids.map((fieldId) => {
        const entry = rewrite
          ? Object.entries(schema).find(([, candidate]) => candidate.canonicalKey === fieldId)
          : [fieldId, schema[fieldId]];
        const spec = entry?.[1];
        const resolvedId = entry?.[0];
        if (!spec || !resolvedId) throw new Error(`HP menu page ${page.pageId} references unknown field ${fieldId}.`);
        if (usedFieldIds.has(resolvedId)) throw new Error(`HP menu field ${resolvedId} is assigned more than once.`);
        usedFieldIds.add(resolvedId);
        return { id: resolvedId, ...spec };
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

