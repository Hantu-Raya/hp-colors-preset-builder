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
        rewriteKeys: ["widthScale", "heightScale", "positionX", "positionY", "accessoryAnchorEnabled"]
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
          "lowThreshold",
          "highThreshold",
          "enemyTeamHigh",
          "ghoulOpacityEnabled",
          "ghoulOpacity"
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
        rewriteName: "SHIELDS",
        title: "SHIELDS & ICONS",
        rewriteTitle: "SHIELDS",
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
        rewriteKeys: ["allyEnabled", "allyVisible", "allyMode", "allyLow", "allyMid", "allyHigh", "allyTeamHigh"]
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
          "allyPulseColor",
          "allyPulseColorMode"
        ]
      }
    ]
  },
  {
    name: "HEALTH INFO",
    rewriteName: "HUD DETAILS",
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
          "readoutLow",
          "readoutMid",
          "readoutHigh",
          "readoutMaxTeamColor"
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
        description: "Control health pips, level visibility, ultimate color, and both indicators' positions.",
        pageId: "health-pips-levels",
        fieldIds: ["hp_level_number_visible", "hp_pip_visible", "hp_precise_pips_enabled"],
        rewriteKeys: [
          "pipsVisible",
          "precisePipsEnabled",
          "levelsVisible",
          "ultMode",
          "ultCustom",
          "accessoryAnchorEnabled",
          "ultOffsetX",
          "ultOffsetY",
          "levelOffsetX",
          "levelOffsetY"
        ]
      },
      {
        name: "STAMINA",
        title: "ENEMY STAMINA",
        description: "Resize, move, and recolor enemy stamina pips.",
        pageId: "health-stamina",
        rewriteOnly: true,
        fieldIds: [],
        rewriteKeys: [
          "staminaWidth",
          "staminaHeight",
          "staminaOffsetX",
          "staminaOffsetY",
          "enemyStaminaColorEnabled",
          "enemyStaminaColor"
        ]
      }
    ],
    rewritePages: [
      {
        name: "HP TEXT",
        title: "HP TEXT",
        description: "Choose how enemy HP appears: current and maximum, percentage, or current only.",
        pageId: "health-text",
        rewriteKeys: [
          "readoutVisible",
          "readoutFormat",
          "readoutSize",
          "readoutFont",
          "readoutColorMode",
          "readoutMode",
          "readoutLow",
          "readoutMid",
          "readoutHigh",
          "readoutMaxTeamColor"
        ]
      },
      {
        name: "TEXT POSITION",
        title: "TEXT POSITION",
        description: "Move the HP text without moving the healthbar or unit icon.",
        pageId: "health-text-position",
        rewriteKeys: ["readoutOffsetX", "readoutOffsetY"]
      },
      {
        name: "PIPS & LEVEL",
        title: "HEALTH PIPS & PLAYER LEVEL",
        description: "Set health pips, level visibility, and level badge position.",
        pageId: "health-pips-levels",
        rewriteKeys: [
          "pipsVisible",
          "precisePipsEnabled",
          "levelsVisible",
          "levelOffsetX",
          "levelOffsetY"
        ]
      },
      {
        name: "PICKUPS",
        title: "TOPBAR PICKUP TIMERS",
        description: "Show and style gun, movement, spirit, and survival timers beside the topbar ultimate icons.",
        pageId: "health-pickups",
        rewriteKeys: [
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
        ]
      },
      {
        name: "ULTIMATE",
        title: "ULTIMATE ICON & TIMER",
        description: "Set the base icon color, progress override, position, and cooldown visibility.",
        pageId: "health-ultimate",
        rewriteKeys: [
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
        ]
      },
      {
        name: "STAMINA",
        title: "ENEMY STAMINA",
        description: "Resize, move, and recolor enemy stamina pips without changing ally or neutral indicators.",
        pageId: "health-stamina",
        rewriteKeys: [
          "staminaWidth",
          "staminaHeight",
          "staminaOffsetX",
          "staminaOffsetY",
          "enemyStaminaColorEnabled",
          "enemyStaminaColor"
        ]
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
    const categoryName = rewrite ? category.rewriteName || category.name : category.name;
    const path = [categoryName];
    const pages = rewrite ? category.rewritePages || category.pages : category.pages;
    const children = pages.filter((page) => rewrite || !page.rewriteOnly).map((page) => {
      const pageName = rewrite ? page.rewriteName || page.name : page.name;
      const pageTitle = rewrite ? page.rewriteTitle || page.title : page.title;
      const pageDescription = rewrite ? page.rewriteDescription || page.description : page.description;
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
        name: pageName,
        title: pageTitle,
        description: pageDescription,
        pageId: page.pageId,
        path: [...path, pageName],
        fields,
        children: []
      };
    });
    return { name: categoryName, path, fields: [], children };
  });

  const schemaFieldIds = Object.keys(schema);
  const missingFieldIds = schemaFieldIds.filter((fieldId) => !usedFieldIds.has(fieldId));
  if (missingFieldIds.length) {
    throw new Error(`HP menu is missing fields: ${missingFieldIds.join(", ")}.`);
  }
  return groups;
}
