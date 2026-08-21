# Live healthbar viewer research

## Verdict

A live viewer is technically feasible. The first release should support every target currently available in V2 and should call itself a browser preview, not an exact game renderer.

The current V2 targets are Rewrite and Rewrite + QOLLOCK. They share the same Rewrite healthbar renderer and field catalog, so they do not need separate preview adapters. Minimal is marked unavailable in V2. A legacy Full or Minimal adapter would add code without serving a selectable V2 target.

The strongest approach is a DOM and CSS renderer driven by a pure preview model. The builder already exposes the active profile as a sanitized state object, and every field update flows through one reducer. A preview can consume that state without adding another store or changing preset generation. It will render a dummy healthbar in the browser and will not connect to a running game.

The CS:GO source is useful as a behavior reference, but none of it can be reused in the web app. Deadlock's tracked Panorama layout, Rewrite renderer, and extracted textures are the useful sources.

## Evidence

### Builder integration

`PresetBuilderV2Island.jsx` derives `state` from the active profile and renders every visible setting from that same object. `updateField` dispatches `UPDATE_FIELD`, so a preview that receives `state` as a prop updates in the same Preact render.

Sources:

- `src/components/PresetBuilderV2Island.jsx:320-421`
- `src/components/PresetBuilderV2Island.jsx:536-538`
- `src/components/PresetBuilderV2Island.jsx:1013-1023`
- `src/presetBuilderSession.js:218-266`
- `src/presetBuilderSession.js:447-458`

The existing page body already supports a settings panel plus a right rail. The preview can use that second column on settings pages. The Presets page can keep its current tools rail.

Sources:

- `src/styles/v2.css:1176-1183`
- `src/styles/v2.css:1185-1253`
- `src/components/PresetBuilderV2Island.jsx:947-1070`


### V2 target coverage

`targetModeStore.js` exposes three stored target IDs, but Minimal is explicitly unavailable in V2. The Full ID is presented as Rewrite in V2, and Rewrite + QOLLOCK changes the package layout rather than healthbar paint behavior. Both selectable V2 targets use Rewrite profiles and `REWRITE_FIELD_CATALOG`.

The viewer should therefore select behavior from the active profile catalog, not from the package filename or pak order. It should reject or omit a preview for an unconverted legacy profile instead of silently rendering it with Rewrite rules.

Sources:

- `src/targetModeStore.js:5-44`
- `src/components/PresetBuilderV2Island.jsx:304-327`
- `src/components/PresetBuilderV2Island.jsx:423-426`
- `src/hpSchema.js:277-385`

The Full and Minimal source lanes were checked for future work. Their `unit_status_overlay.xml` files are equivalent after whitespace normalization. Their healthbar runtimes share the same main setting contract and threshold paint behavior. The Full stylesheet adds container stacking rules, hides two stock indicators, and gives the kill marker 0.95 opacity; Minimal leaves those details to stock styles. Those are small but real differences, so a future classic adapter should not pretend the two lanes are identical.

Sources:

- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors/panorama/layout/unit_status_overlay.xml`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_minimal/panorama/layout/unit_status_overlay.xml`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors/panorama/scripts/healthbar_logic.js:3439-3579`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors/panorama/styles/unit_status.css:377-802`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_minimal/panorama/styles/unit_status.css:377-784`

### Rewrite renderer

Rewrite already defines the behavior the preview must copy:

- Fixed colors switch at the configured low and high thresholds.
- Gradient colors interpolate low to mid, then mid to high.
- Width and height scale from the stock bar dimensions.
- X and Y offsets apply to the bar container.
- HP text has its own format, size, font, position, and color rules.
- Healing, damage delta, bullet shield, pulse, level badge, and kill marker are separate layers.
- Hidden bars use low opacity instead of removal because the game must keep updating their widths.

Sources:

- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite/panorama/scripts/healthbar_probe.js:529-581`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite/panorama/scripts/healthbar_probe.js:1275-1538`
- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite/panorama/styles/hp_colors_unit_status.css:1-177`

The Rewrite layout adds the HP counter, pulse layer, level badge, and kill marker to Valve's unit-status panel. This layout is the right DOM blueprint for the web preview.

Source:

- `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite/panorama/layout/unit_status_overlay.xml:44-74`

### Stock Deadlock layout

The current tracked stock layout nests the health layers in this order:

1. Healthbar background
2. Missing-health region
3. Active fill parent
4. Lagging health fill
5. Pip label
6. Healing layer
7. Damage delta layer
8. Bullet shield
9. Tech shield
10. Border

Primary sources:

- [Stock unit-status layout](https://github.com/SteamTracking/GameTracking-Deadlock/blob/master/game/citadel/pak01_dir/panorama/layout/unit_status_overlay.xml)
- [Stock unit-status styles](https://github.com/SteamTracking/GameTracking-Deadlock/blob/master/game/citadel/pak01_dir/panorama/styles/unit_status.css)


Approved preview asset hashes:

| Texture | SHA-256 |
| --- | --- |
| `hero_healthbar_bg_psd.png` | `d42a9fc18a2590c7f1e25d9eef1a0df157e6d63e6d2fa1b96e379b07d7721d6a` |
| `hero_healthbar_fill_center_psd.png` | `d71e477160c13d4fb5383bc9fa898e6f66224cc16610d66c2b17dff3100a87fa` |
| `hero_healthbar_fill_shield_psd.png` | `af6b989402d2ea55ed5a6d25950cf9d3fe47c0d81d9054930c1d46d358416962` |
| `hero_healthbar_missing_psd.png` | `cfd94c5db195de04c320643402e44ba7d164e0341a27d445c57a8bbc72d531ba` |

The stock player unit bar is 900 by 130 Panorama pixels. The background uses a 28 percent border slice. The fill texture is authored at 1024 by 128 and the CSS applies it to the lagging, healing, and delta layers.

### Extracted assets

I extracted and decoded the healthbar texture family from:

`G:/SteamLibrary/steamapps/common/Deadlock/game/citadel/pak01_dir.vpk`

The decoded files are in the temporary research directory:

`D:/temp/deadlock-healthbar-research/decoded/panorama/images/hud/world_space/`

Measured output:

| Texture | Size | Current overlay use |
| --- | ---: | --- |
| `hero_healthbar_bg_psd.png` | 390 x 430 | Border-image frame |
| `hero_healthbar_fill_center_psd.png` | 1024 x 128 | Health, healing, delta, and Rewrite color pulse |
| `hero_healthbar_fill_shield_psd.png` | 1024 x 128 | Tech shield |
| `hero_healthbar_missing_psd.png` | 128 x 128 | Missing-health region |
| `hero_healthbar_fg_psd.png` | 128 x 128 | Defined by stock CSS, but absent from the current overlay XML |
| `hero_healthbar_fill_center_darker_psd.png` | 1024 x 128 | Not referenced by the current overlay CSS |

Source 2 Viewer 20.0 decoded the textures. The downloaded Windows CLI matched its published SHA-256 digest:

`d32ab327b8bbb42a2528866afb03bb582bdb779d0005488da32b90292afd3ff5`

Sources:

- [Source 2 Viewer](https://github.com/ValveResourceFormat/ValveResourceFormat)
- [Source 2 Viewer 20.0](https://github.com/ValveResourceFormat/ValveResourceFormat/releases/tag/20.0)

The README's requested attribution is recorded in the repository asset record below.

### Repository asset record

- Extraction date: `2026-08-22`.
- Source VPK: `G:/SteamLibrary/steamapps/common/Deadlock/game/citadel/pak01_dir.vpk`.
- Decoder: Source 2 Viewer 20.0.
- Repository destinations:
  - `public/healthbar-preview/hero_healthbar_bg_psd.png`
  - `public/healthbar-preview/hero_healthbar_fill_center_psd.png`
  - `public/healthbar-preview/hero_healthbar_fill_shield_psd.png`
  - `public/healthbar-preview/hero_healthbar_missing_psd.png`
- Published asset URLs use the Astro base path: `/hp-colors-preset-builder/healthbar-preview/<filename>`.
- Powered by [Source 2 Viewer](https://s2v.app) ([ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat)).


### CS:GO reference

The CS:GO Panorama health code reads the current player state, compares it with cached state, writes changed values, and toggles classes for damage and critical health. That supports keeping preview scenario state separate from preset state and applying visual classes from a derived model.

It does not contain Deadlock's unit-status hierarchy, textures, shield layers, pip data, or Rewrite settings. Treat it as a design reference only.

Source:

- `G:/csgo_partner/src/game/client/cstrike15/panorama/hud/csgo_hudhealtharmor.cpp:103-209`

## Recommended module design

### Pure preview model

Add a pure module with one interface:

```js
createHealthbarPreviewModel(profileState, scenario)
```

It should return resolved colors, dimensions, layer widths, text, visibility, marker position, and CSS classes. It must not touch Preact, the DOM, storage, or preset generation.

`profileState` is the active sanitized Rewrite state. `scenario` contains preview-only facts such as health percentage, relation, team, maximum HP, shield amount, healing amount, damage delta, player level, and unit kind. Healing, damage, and shield inputs use percentages of maximum HP and show their computed raw values.

This module owns the browser translation of Rewrite behavior. Unit tests can compare its results with fixed examples from `healthbar_probe.js`. Package targets do not belong in this interface because the two selectable V2 targets paint the same healthbar. Unconverted legacy Full or Minimal profiles get a clear conversion-required state instead of a misleading Rewrite preview.

### Preview renderer

Add a small Preact renderer that receives the model and builds the Rewrite healthbar hierarchy. Use CSS custom properties for values that change while dragging controls:

- Health percentage
- Bar color
- Healing and damage colors
- Shield color
- Width and height scale
- Position
- Readout position and size
- Kill marker position and width
- Pulse duration and intensity

Use the decoded PNGs for the frame, fill, shield, and missing-health layers. The project owner accepted the asset redistribution risk for this implementation. Record their source and extraction details in the repository, and add the attribution requested by Source 2 Viewer.

Browser CSS supports `border-image`, but Panorama's `wash-color` has no direct browser equivalent. A blend layer or generated tint must reproduce the fill shading. This needs a screenshot comparison against the game before claiming close visual parity.

### Preview panel

On normal healthbar settings pages, use the existing desktop right rail for a sticky preview panel. Keep the current Presets tools rail unchanged and hide the preview on the Presets page.

The preview uses a flat neutral field with enough unit-status context to judge the healthbar, relation label, level badge, and ult indicator. It should not grow into a fake gameplay HUD or ship another game screenshot.

Keep health percentage and enemy or ally relation visible. Put the rest of the preview-only controls in an expandable `Scenario` section:

- Team
- Unit kind
- Maximum HP and level
- Healing, damage delta, bullet shield, and tech shield percentages
- Pause or resume animation

The amount controls show both their percentage and computed raw HP value. These values must never enter profile storage or generated VPKs.

Preview scenario values live in session storage. They survive page, profile, and target switches in the current tab, never enter persistent profile storage, and have a visible Reset button. Profile hero scope does not change the scenario because scope controls routing rather than paint behavior.

The canvas fits the complete unit-status view by default and offers a 2x inspection toggle. Magnification is preview-only. A press-and-hold `Show stock` control temporarily renders the same scenario with stock colors and geometry. Keyboard users must get equivalent press and release behavior.

### Responsive behavior

Desktop keeps the preview beside the settings. Narrow layouts move it above the field list in a collapsible panel. It starts expanded so users notice it, then remembers the collapsed state for the current browser session only. A floating overlay would obscure controls and create more keyboard and mobile problems than it solves.

### Accuracy label

Label the panel `Browser preview`. Do not say `In-game preview` or `Pixel perfect`.

The browser cannot reproduce world-panel projection, game UI scaling, Panorama font rendering, or Source 2 `wash-color` exactly. It can reproduce the layer order, dimensions, thresholds, colors, visibility, text, marker placement, and pulse timing.

## Asset-use decision

The project owner chose the exact extracted textures for the first implementation and accepted the redistribution risk. The files came from the locally installed Deadlock VPK and were decoded with Source 2 Viewer 20.0.

Keep the imported set narrow. Ship only the frame, normal fill, shield fill, and missing-health textures used by the preview. Do not copy the unused foreground or darker-fill files.

Primary license source:

- [Steam Subscriber Agreement, sections 2.D, 2.F, and 2.G](https://store.steampowered.com/subscriber_agreement/)

## Implementation order

1. Add the four approved texture files with source, extraction date, hashes, and Source 2 Viewer attribution.
2. Add `createHealthbarPreviewModel` with tests for threshold colors, gradient colors, geometry, visibility, readout text, pulse state, and marker placement.
3. Add the Preact renderer using the Rewrite layer hierarchy and extracted textures.
4. Add the right-rail panel, preview-only scenario controls, fit and 2x inspection modes, and press-and-hold stock comparison.
5. Add scenario and narrow-panel state in session storage.
6. Compare browser screenshots with in-game captures at fixed settings.
7. Add Playwright checks for live updates, profile switches, target switches, stock comparison, reduced motion, keyboard use, and mobile layout.

## Acceptance criteria

- Changing any supported Rewrite field updates the preview in the same render cycle.
- Both selectable V2 targets render the same Rewrite behavior without target-specific forks.
- Switching profiles updates the preview without stale values.
- Preview scenario controls never change profile data or generated artifacts.
- Fixed and gradient colors match the runtime formulas at boundary values.
- Width, height, offsets, HP text, marker, visibility, and pulse rules match Rewrite behavior.
- Fit and 2x inspection modes do not change preset geometry.
- Pressing or holding `Show stock` switches to the stock rendering for the same scenario and restores the preset rendering on release.
- Scenario values survive navigation in the current tab, reset on request, and never enter persistent profile storage.
- The preview is hidden on the Presets page.
- The preview remains usable at 390, 740, 1180, 1568, and 1920 pixel viewport widths.
- The narrow preview starts expanded and remembers its collapsed state for the browser session.
- Low-health pulse animation starts automatically, honors reduced-motion preferences, and has a Pause control.
- The UI calls the result a browser preview until screenshot comparisons support a stronger claim.

## Confidence
Technical planning confidence is 9.5 out of 10. The renderer path, target coverage, asset set, placement, scene, controls, persistence, comparison behavior, and responsive behavior are settled. The remaining half point is visual calibration. Browser blending must be compared with a fixed in-game screenshot before the preview can claim close color or texture parity.
