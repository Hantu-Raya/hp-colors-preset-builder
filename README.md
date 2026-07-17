# HP Colors Preset Builder

HP Colors Preset Builder is a browser-only tool for editing, importing, routing, and packaging HP Colors presets. It emits a deterministic `pak96_dir.vpk` containing the Source 2 `base_hud.vxml_c` preset store. It does not install files into Deadlock for you.

## Choose the matching target

Select the target that matches the base HP Colors runtime you installed:

- **Minimal** — the lightweight runtime. It reads the shared preset store and supports static hero-targeted routing without the full Anita in-game menu.
- **Full** — the full HP Colors runtime. It provides the Anita in-game menu, multiple profiles, and hero-targeted profiles.

Do not mix a Full preset package with the Minimal runtime (or vice versa). The target selector is saved in browser storage and can be changed from the top bar.

## Install order

1. Exit Deadlock completely.
2. Install one matching HP Colors base-mod pair: its `pak96_dir.vpk` first, then its matching `pak97_dir.vpk`.
3. Use this exact add-on directory (replace `<SteamLibrary>` with the drive that contains Steam):

   ```text
   <SteamLibrary>/steamapps/common/Deadlock/game/citadel/addons
   ```

4. Build a preset for the same target. The download is always named `pak96_dir.vpk`; replace the selected base mod's `pak96_dir.vpk` with this generated file. Keep the matching `pak97_dir.vpk` in place and do not rename either file.
5. Start Deadlock only after both files are in the directory. Restart Deadlock after replacing either VPK; a live Panorama context can retain the old package.

Keep only one selected HP Colors target installed at a time. If you change targets, replace the complete pair before testing.

## Preset data contract

The builder's package contract is deliberately narrow and deterministic:

- Each profile contains exactly **55 shared fields**.
- The Full runtime has **56 settings**; `hp_precise_pips_enabled` is Full-only and is not serialized by this builder. The Minimal and Full package targets therefore both consume the same 55-field preset store.
- The current runtime storage version is **99**. Builder output uses **v1** payloads, and the importer accepts legacy runtime **v97** (and **v25**) input.
- Builder exports use payload **version 1**. Copied codes use the `[ANITA-v1-hp_colors]:` prefix, and downloaded profile JSON is a `version: 1` document.

Values are normalized before serialization. A generated package contains one validated `panorama/layout/base_hud.vxml_c` entry and no unrelated files.

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

When Deadlock or the HP Colors base mod changes, install the matching updated base pair and rebuild the preset package before testing. Treat an old generated `pak96_dir.vpk` as stale after a template/runtime update. Re-run the build and replace only `pak96_dir.vpk`; retain the matching `pak97_dir.vpk`. Never hand-edit the generated VPK.

## Supported browsers

Use a current Chromium (Chrome or Edge), Firefox, or Safari release on desktop or mobile. The browser must provide ES modules, Web Crypto, `TextEncoder`/`TextDecoder`, File/Blob downloads, and clipboard access (where offered). Internet Explorer and obsolete browser versions are not supported. CI exercises the browser flow in Playwright Chromium at desktop and mobile viewports.

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

## Deterministic verification and release gates

Run the artifact verifier from the repository root:

```powershell
node scripts/verify-generated-artifact.js
```

It rebuilds the canonical fixture, checks the exact package contents and 55-field Minimal contract, and verifies byte-for-byte determinism. A successful run exits `0` and prints the verified `pak96_dir.vpk` result.

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
