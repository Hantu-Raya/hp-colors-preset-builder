# Panorama Shell Redesign Design

## Goal

Remake the HP Colors preset builder UI into a more pleasing, premium, minimalist web app while keeping the schema control layout aligned with the Panorama Anita settings UI in `F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors/panorama`.

## Current Context

The active app is a single Astro page at `src/pages/index.astro` that renders `src/components/PresetBuilderIsland.jsx` as a React island. The app already uses Tailwind CSS 4, React 19, shadcn-style primitives, and `components.json` configured for JSX components.

The active UI is concentrated in these files:

- `src/components/PresetBuilderIsland.jsx` controls app state, layout, import, preview, build flow, and modal state.
- `src/components/schema-field.jsx` renders schema controls.
- `src/components/schema-tree.jsx` renders the category tree.
- `src/styles/global.css` defines the active dark theme and builder layout.
- `src/components/ui/*.jsx` contains shadcn-style primitives.

The requested shadcn preset URL decodes to a Lyra/neutral style: sharp, monochrome, technical, and zero-radius oriented. The redesign will use that sharp technical direction but retain the Panorama mint accent `#66cc99` because it is the established in-mod active color.

## Reference Layout

The schema editor should follow the Panorama Anita settings UI, primarily from `panorama/styles/anita_ui.css`:

- Top-level shell: centered dark HUD window over a deep radial backdrop.
- Top nav: compact horizontal strip with active states and a close/build/action zone.
- Left rail: fixed category tree around 240-280px wide.
- Detail pane: scrollable settings body with section header, hint text, and field list.
- Controls: square toggles, sliders with value readouts, segmented cyclers, swatch-first color pickers, X/Y position pickers.

The web app should not copy game overlay constraints literally. It should translate them into a clean web UI that feels faithful, usable, and premium.

## Design Approach

Use the approved **Panorama-shell premium** approach.

### Page Shell

The page becomes a dark, immersive builder workspace:

- Background uses an off-black radial gradient with a subtle green lift near the upper center.
- Main app shell is centered, max-width constrained, and styled like a refined HUD window.
- Corners and component shapes follow Lyra/sharp styling rather than rounded dashboard cards.
- A subtle border and inner highlight define the shell instead of heavy shadows.
- Do not add a noise layer in the first implementation pass; use gradients and borders for depth.

### App Header

The current header becomes a Panorama-inspired top nav strip:

- Left side: app name and compact status/utility label.
- Center/right: preset name input.
- Right side: primary build action.
- Build stays visible without forcing the user to scroll.
- The import and preview controls move out of the primary editing path.

### Main Layout

The editor uses a two-pane layout:

- Left pane: schema category tree, fixed at roughly 260px on desktop.
- Right pane: active category detail editor, scrollable.

The previous always-visible third preview/import rail is removed from the main layout. Import and preview become secondary panels because they are not part of every edit.

Responsive behavior:

- Desktop: left tree + right detail panes.
- Tablet: retain two panes as long as practical, with smaller left rail and tighter spacing.
- Mobile: collapse categories into a top selector/drawer and keep the detail editor full-width.

### Category Tree

The tree should feel like `AnitaTreePanel`, not a stack of generic buttons:

- Top label uses small uppercase text such as `CATEGORIES`.
- Main categories get stronger labels.
- Subcategories are indented with a slim active left border.
- Field counts sit on the right in compact muted badges.
- Active item uses the mint accent, not a large filled button.
- Hover nudges and color shifts should be subtle.
- Modified indicators should be shown by comparing current field values to the default state.

### Detail Pane

The detail pane should feel like `AnitaDetailPanel` and `AnitaSettingsList`:

- Header row shows the active category path and a short usage hint.
- Section heading uses the mint accent with a thin divider.
- Field rows align labels and controls consistently.
- Controls should not force long mouse drags when typing is more precise.
- Conditional fields should animate in/out with opacity and height/transform changes rather than snapping.

### Control Mapping

Every schema control keeps existing behavior but gets a Panorama-aligned layout.

#### Toggle

Use a square checkbox-style control:

- 22-24px box.
- Mint border/fill when checked.
- Checkmark or inner mark appears with a short scale/fade.
- Label and helper text remain readable.

#### Slider

Use a horizontal slider plus value entry/readout:

- Track is slim and dark.
- Progress uses `#355c46` to `#66cc99` gradient.
- Thumb is small, high-contrast, and easier to hit than the current native control.
- A numeric input or monospace readout sits beside the slider.
- Users can type exact values to reduce drag.

#### Cycler

Replace dropdowns with segmented controls:

- Each option is a compact segment.
- Active segment uses mint fill or mint border with strong contrast.
- Keyboard/focus state remains visible.

#### Color Picker

Use a swatch-first control:

- Larger swatch than current tiny color input.
- Hex input is visible or available in the expanded panel.
- Keep the native color input inside the control for browser color-picker support.
- The control must support paste/edit workflows for hex values.

#### Position Picker

Replace raw comma-separated text entry with X/Y controls:

- Two rows labeled `X` and `Y`.
- Each row has a slider and value readout/input.
- Internal value remains compatible with existing schema strings such as `20,196`.

### Import, Preview, and Build Flow

Import and preview move into secondary affordances:

- Import lives in a collapsible section in the detail pane footer.
- JSON preview lives in a collapsible panel with a copy action.
- Status feedback uses a persistent inline status area with success and error styling.
- Build warning should use a proper dialog-style presentation with focusable controls and keyboard-friendly behavior.

The underlying build/import behavior must remain unchanged:

- Import still parses Anita-v1 codes through `parseHpImportCode`.
- Build still generates `pak96_dir.vpk` through the existing package builder and download utilities.

## Visual System

### Palette

Use a dark technical palette:

- Base: `#0a0c0d` or similar off-black.
- Surface: `#111315`, `#131618`, `#1a1e20`.
- Accent: `#66cc99`.
- Accent shadow: `rgba(102, 204, 153, 0.20-0.35)`.
- Text primary: near-white gray such as `#e8edee`.
- Text secondary: muted gray such as `#8a9496`.
- Borders: low-alpha white plus mint for active/focus states.

Avoid purple/blue AI gradients and pure black.

### Typography

Use a more technical, premium type system than the current default stack:

- Display/header: technical sans such as Space Grotesk or Geist.
- Body/UI: clean sans with strong small-size readability.
- Values, hex codes, JSON preview, numeric controls: JetBrains Mono or equivalent monospace.

Headings should use tight tracking and controlled size. Labels and values should remain compact and legible.

### Motion

Motion should be restrained and useful:

- Shell entrance: fade and slight scale.
- Pane/category changes: short fade/translate.
- Field reveal: height/opacity transition.
- Control feedback: hover/active transform using `transform` and `opacity` only.
- Standard durations: 120-200ms.

Do not animate layout with `top`, `left`, `width`, or `height` except controlled CSS expansion where unavoidable. Prefer transform/opacity for interactive feedback.

## Accessibility

The redesign must keep or improve accessibility:

- Controls have visible focus styles.
- Toggle and segmented controls use proper button/input semantics.
- Dialog controls are keyboard reachable.
- Color picker provides text input for exact values.
- Slider values can be changed without drag.
- Mobile hit targets should be at least 36px for interactive controls.

## Testing and Verification

Because the existing tests focus on logic, implementation should verify UI-sensitive behavior with a mix of tests and build checks:

- Existing Node tests must continue to pass.
- Astro build must complete.
- Component behavior should be covered where practical for parsing/formatting helpers introduced for new controls, especially position parsing and hex normalization.
- Manual browser verification should cover desktop and mobile layouts, import flow, build warning, and a sample field of each control type.

## Non-Goals

This redesign will not change the schema itself unless required to preserve existing controls.

This redesign will not rewrite the VPK/build pipeline.

This redesign will not migrate the app away from Astro, React, Tailwind 4, or shadcn-style primitives.

This redesign will not remove legacy unused files unless the implementation plan explicitly scopes cleanup.

## Implementation Notes

Likely implementation units:

- Apply or manually align with shadcn preset `buFywKm` while preserving project-specific CSS variables and JSX configuration.
- Refactor `PresetBuilderIsland.jsx` into smaller components only where it directly supports the redesign.
- Replace `schema-field.jsx` internals with Panorama-aligned control renderers.
- Update `schema-tree.jsx` styling/structure to match Anita tree navigation.
- Rewrite active builder styles in `src/styles/global.css`.
- Preserve current app state shape and import/build behavior to avoid risky data changes.
