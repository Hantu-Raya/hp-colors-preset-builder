# HP Colors Preset Builder

HP Colors Preset Builder is a browser-only tool for editing, importing, routing, and packaging HP Colors presets. Minimal and Full packages contain the Source 2 `base_hud.vxml_c` preset store. Rewrite packages contain the hidden preset store in `hud_escape_menu.vxml_c`; the Rewrite + QOLLOCK target uses the composite Escape-menu layout. Downloads use the deterministic filename for their target: `pak96_dir.vpk` for Minimal, Full, and standalone Rewrite, or `pak01_dir.vpk` for Rewrite + QOLLOCK. The builder does not install files into Deadlock.

## Choose the matching target

Select the target that matches the runtime you installed:

- **Minimal** — the lightweight runtime. It reads the shared preset store and supports static hero-targeted routing without the full Anita in-game menu.
- **Full** — the full HP Colors runtime. It provides the Anita in-game menu, multiple profiles, and hero-targeted profiles.
- **Rewrite** — V2 selects this target when profiles contain rewrite data. Its package stores the complete `HPCRP1` bundle, including rewrite-only settings and ability-tier conditions, inside the rewrite Escape-menu XML.
- **Rewrite + QOLLOCK** — an explicit target for the composite runtime. It builds `pak01_dir.vpk` with only `panorama/layout/hud_escape_menu.vxml_c`, and expects the support runtime in `pak02_dir.vpk` plus the pinned QOLLOCK package in `pak03_dir.vpk`.

Do not mix Minimal or Full packages with the other base runtime, or install standalone Rewrite beside Rewrite + QOLLOCK. The selected target is saved in browser storage; V2 still switches to standalone Rewrite automatically when loaded profiles contain rewrite data.

## Install order

1. Exit Deadlock completely.
2. Install the runtime packages that match the target:
   - Minimal or Full: install its matching `pak96_dir.vpk` and `pak97_dir.vpk` pair.
   - Rewrite: install the current `hp_colors_rewrite` `pak01_dir.vpk`.
   - Rewrite + QOLLOCK: install the support runtime as `pak02_dir.vpk`, then the pinned QOLLOCK package as `pak03_dir.vpk`.
3. Use this exact add-on directory (replace `<SteamLibrary>` with the drive that contains Steam):

   ```text
   <SteamLibrary>/steamapps/common/Deadlock/game/citadel/addons
   ```

4. Build the preset and place it in the same directory:
   - Minimal or Full: replace the selected base mod's `pak96_dir.vpk` and keep its matching `pak97_dir.vpk`.
   - Rewrite: install the generated `pak96_dir.vpk` beside the rewrite's `pak01_dir.vpk`. The generated package overrides only `panorama/layout/hud_escape_menu.vxml_c`; do not install another mod that overrides that layout.
   - Rewrite + QOLLOCK: install the generated `pak01_dir.vpk` beside `pak02_dir.vpk` and `pak03_dir.vpk`. It overrides only `panorama/layout/hud_escape_menu.vxml_c`.
5. Restart Deadlock after replacing any VPK. A live Panorama context can retain the previous package.

Keep only one HP Colors runtime and one matching preset package active at a time.

## Preset data contract

The builder's package contract is deliberately narrow and deterministic:

- Minimal and Full profiles contain exactly **56 shared runtime fields**.
- Rewrite profiles map those fields to the rewrite's **67 indexed settings** and retain rewrite-only values and ability-tier conditions.
- `hp_precise_pips_enabled` is serialized for the Minimal runtime so its HP-number parser matches the copied pip convars. Full presets keep using the in-game global setting for this option.
- The current Minimal/Full runtime storage version is **99**. Builder output uses **v1** payloads, and the importer accepts legacy runtime **v97** (and **v25**) input.
- Minimal/Full copied codes use the `[ANITA-v1-hp_colors]:` prefix. Rewrite settings use `HPCR2`; rewrite presets and bundles use `HPCRP1`.

Values are normalized before serialization. A generated Minimal or Full package contains one validated `panorama/layout/base_hud.vxml_c` entry. A generated standalone Rewrite or Rewrite + QOLLOCK package contains one validated `panorama/layout/hud_escape_menu.vxml_c` entry with the hidden `HPCRP1` store. Neither package contains unrelated files.

## Profiles and routing

Profiles are ordered by priority (top profile first). For each profile choose one hero scope:

- **All** — global profile, eligible for every hero.
- **Selected** — eligible only for the selected heroes.
- **Off** — disabled for runtime routing.

Use the profile controls to reorder profiles, and the hero selector to maintain the selected-hero list. Keep a global fallback below more-specific profiles when you want selected heroes to override a common baseline.

## Import, export, convert, and recovery

- **Import:** paste `COPY ALL` from the in-game HP Colors menu, or paste one or more individual HP Colors codes. Bundles become separate profiles for the selected target. JSON and the accepted legacy payload shapes are normalized on import.
- **Export:** copy the current profile code, copy all profile codes, or download all profiles as JSON. Export a backup before clearing browser data or changing machines.
- **Convert VPK:** select a generated HP Colors preset VPK and choose **To Full** or **To Minimal**. Conversion rebuilds the package for the other base runtime; it does not convert arbitrary VPKs.
- **Recovery:** profiles and the selected target are saved in browser storage after edits. If saved data cannot be read, the builder starts from defaults and reports the error instead of using corrupted values. Import a previously exported code/JSON backup to recover the profiles.

## Rebuilds and game updates

When Deadlock or a runtime changes, install the matching updated packages and rebuild before testing. Treat an old generated package as stale after a template or runtime update. Re-run the target build, replace only its generated VPK, and retain the runtime packages: `pak97_dir.vpk` for Minimal/Full, standalone Rewrite's `pak01_dir.vpk`, or Rewrite + QOLLOCK's `pak02_dir.vpk` and `pak03_dir.vpk`. Never hand-edit a generated VPK.

## Supported browsers

Use a current Chromium (Chrome or Edge), Firefox, or Safari release on desktop or mobile. The browser must provide ES modules, Web Crypto, `TextEncoder`/`TextDecoder`, File/Blob downloads, and clipboard access (where offered). Internet Explorer and obsolete browser versions are not supported. CI exercises the browser flow in Playwright Chromium at desktop and mobile viewports.

## Supporter ticker maintenance

V2 and the in-game Rewrite strip use `public/data/supporters.csv`. The file contains public display names and donation amounts only. Astro validates it during the build and embeds the same rows in both pages. Neither page fetches Ko-fi or the CSV in the browser.

1. Keep the exact `display_name,total_usd` header.
2. Include every donation row. Use the approved public display name when Ko-fi provides one. Keep Ko-fi's `Ko-fi Supporter` label for anonymous donations.
3. Keep every anonymous transaction as a separate `Ko-fi Supporter` row with its own amount. Never merge anonymous donations.
4. Sort by `total_usd` from highest to lowest, then alphabetically when totals match.
5. Use positive USD totals with at most two decimal places. The UI computes leaderboard ranks from row order. Do not add a rank column, email addresses, dates, transaction IDs, or other private fields.
6. Run `npm test` and `npm run build` before publishing.

The V2 ticker links to the public Ko-fi leaderboard. The in-game strip has no links or input handling.

## Run locally

```powershell
npm ci
npm run dev
```

Create a production build with:

```powershell
npm run build
```

The build output is written to `dist/` and should not be committed.

## Code health checks

`npm run lint` runs Oxlint with the repository-local anti-slop plugin in `tools/oxlint/anti-slop/`. `npx fallow dead-code` checks the application graph for unused files, exports, dependencies, and import cycles. Both tools exclude `tmp/` and the vendored anti-slop source from application cleanup.

Run focused tests after a cleanup, then run `npm test`, `npm run test:e2e`, and `npm run build` before release.

## Deterministic verification and release gates

Run the artifact verifier from the repository root:

```powershell
node scripts/verify-generated-artifact.js
```

It rebuilds the canonical fixture, checks the exact package contents and 56-field Minimal contract, and verifies byte-for-byte determinism. A successful run exits `0` and prints the verified `pak96_dir.vpk` result.

CI runs the Node test suite, a moderate production-dependency audit, the Astro build, this verifier, and Playwright desktop/mobile end-to-end checks. GitHub Pages upload and deployment are blocked until that same check workflow succeeds.

Before calling a release complete, manually gate it in Deadlock:

1. Restart the game after installing the selected pair and generated `pak96_dir.vpk`.
2. Confirm the selected target is the runtime actually installed (Full menu versus Minimal runtime).
3. Confirm a global profile, a selected-hero profile, and an Off profile route as expected; verify profile priority after reordering.
4. Exercise in-game import/export where the target provides it, then return to the builder and confirm round-trip data.
5. After any Deadlock or base-mod update, repeat the restart and routing checks with a freshly rebuilt package.

Automated checks prove package and browser behavior; they do not replace this in-game verification.

## License and notices

Source terms are in [LICENSE](LICENSE). Factual third-party and asset notes are in [NOTICE](NOTICE). This is an unofficial fan tool and is not affiliated with Valve.
