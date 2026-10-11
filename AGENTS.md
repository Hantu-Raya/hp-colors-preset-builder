# Repository Guidelines

## Project Overview

HP Colors Preset Builder is a static Astro/Preact site that edits, imports, routes and packages Deadlock HP Colors presets in the browser. It writes preset VPKs for download; it never installs mods or touches the game directory. It does not ship the runtime mods either: users install the matching runtime pak separately.

Keep these domain terms exact: **Minimal**, **Full**, **Rewrite** (the legacy V2 label for Full), **Rewritev2** (HPv2), **ShowRanks**, **QOLLOCK**, **Third Eye**, **profile**, **preset store**, **Convert VPK**, **HPCR2** (settings code) and **HPCRP1** (preset code).

Status: the upstream mod repository deprecated the web builders in Rewrite v2 2.2.1 (2026-10-03). Current upstream Rewritev2 saves presets in game, exports `hpv2` extension `v:2`, and shows `OLD PRESET VPK` when an old builder pak01 is installed. This builder accepts only `hpv2` `v:1` with 41 extension slots (`src/hpv2RewritePresetCodec.js`, `src/hpv2HpSchema.js`). Do not port new upstream settings or claim compatibility with current upstream exports unless the user asks for that work.

The site is read-only. `BUILDER_READ_ONLY` in `src/builderReadOnly.js` makes both islands render the editor `inert` under `src/components/ReadOnlyNotice.jsx`, which links to the GameBanana page. It also disables the target, Presets and Build controls, suppresses the target and build dialogs, and turns off the Ctrl+Enter build shortcut. E2E editor tests use `editorTest`, which is skipped while the flag is `true`. The header, version links and supporter ticker stay live. Setting the flag to `false` restores the editor and those tests.

| Page | Island | Stylesheet |
|---|---|---|
| `/` and `/v2/` | `src/components/PresetBuilderV2Island.jsx` | `src/styles/v2.css` |
| `/hpv2/` | `src/components/PresetBuilderHPV2Island.jsx` | `src/styles/hpv2.css` |

`src/components/PresetBuilderIsland.jsx` and `src/styles/global.css` are the original UI. No page imports them, but static tests still read them. Do not delete or revive them as a side task.

## Architecture & Data Flow

Two parallel stacks share the protocol codecs. HPv2 files use the `hpv2` prefix but export the same API names as their legacy counterparts.

```text
src/pages/{index,v2}.astro -> PresetBuilderV2Island.jsx
  -> presetBuilderSession.js (state)  -> presetBuilderWorkflow.js (async)
src/pages/hpv2.astro       -> PresetBuilderHPV2Island.jsx
  -> hpv2PresetBuilderSession.js      -> hpv2PresetBuilderWorkflow.js

workflow -> packageBuilder.js             Minimal/Full: base_hud + presetStoreXml.js
         -> rewritePackageBuilder.js      legacy Rewrite, ShowRanks, QOLLOCK
         -> hpv2RewritePackageBuilder.js  Rewritev2, ShowRanks, QOLLOCK, Third Eye
         -> source2ResourceCodec.js -> vpkArchive.js (crc32.js)
```

- **Islands** are integration shells. They hold `useState` and update through `setSession(prev => reducePresetBuilderSession(prev, intent, context))`, which is not `useReducer`. Browser effects live here: storage hydration, clipboard, Git refresh and the operation lock. Put domain behavior in the session, workflow or codec modules.
- **Sessions** own profiles, the active profile, menus, the target picker, import/convert status, busy operation, build result and signature-condition editing. Both expose `create/load/select/reducePresetBuilderSession`. Intents are uppercase verbs such as `UPDATE_FIELD`, `MOVE_PROFILE`, `COMMIT_TARGET_MODE`, `ENSURE_REWRITE_PROFILES`, `IMPORT_PROFILES_SUCCEEDED`, `BUILD_STARTED/SUCCEEDED/FAILED` and `CONVERT_*`.
- **Workflows** receive injected template loaders (`baseUrl`, `fetchImpl`), `download`, `digest` and `dispatch`. They dispatch status, success and failure intents. Loader factories cache successful loads and drop failed promises so a later call can retry. Module-level locks block a second concurrent build, Rewrite build or conversion.

**Build.** A legacy build dynamically imports `packageBuilder.js`/`packageArtifacts.js`. `createHpColorsPackagePlan` normalizes profiles and patches includes and preset-store XML; `buildHpColorsPackageFromPlan` compiles, archives, rereads, extracts and revalidates. A Rewrite build calls `createRewritePresetBundle`, loads the target template(s), stores the HPCRP1 code as UTF-16 hex in `HPColorsRewritePreset_001` inside `HPColorsRewritePresetStore`, then runs the same round trip and compares the decoded code. Rewrite builders and codecs are imported statically.

**Import.** The modern islands first call their stack's `decodeRewriteTransfer` on pasted text. HPCR2/HPCRP1 dispatch profiles directly. Any other text falls back to `runPresetImportWorkflow`, which dynamically imports `hpImportCode.js` for Anita tokens, base64url JSON and plain JSON. A one-profile import replaces the active profile. A multi-profile import appends with collision-free IDs, up to 128 profiles.

**Convert VPK** handles only legacy Minimal↔Full. It accepts one `.vpk` of at most 4 MiB, reads its `base_hud` preset store, rebuilds for the other variant and downloads `pak96_dir.vpk`. It does not load profiles into the editor or convert Rewrite/HPv2 packages. The preview's "Convert" button is a separate in-memory change of target to Rewrite.

### Targets and package shapes

`src/hpModVariants.js` defines only `minimal`, `full`, `rewrite_qollock` and `rewrite_thirdeye`. Rewrite is `full` in the V2 stacks, and ShowRanks is a boolean stored next to `full`. Minimal is disabled in both modern pickers. Third Eye appears only in HPv2.

| Target | Builder | Download | Archive entries |
|---|---|---|---|
| Minimal / Full | `packageBuilder.js` | `pak96_dir.vpk` | `panorama/layout/base_hud.vxml_c` |
| Legacy Rewrite | `rewritePackageBuilder.js` | `pak96_dir.vpk` | `hud_escape_menu.vxml_c` |
| Legacy ShowRanks / QOLLOCK | `rewritePackageBuilder.js` | `pak01_dir.vpk` | `hud_escape_menu.vxml_c` |
| Rewritev2 / Third Eye | `hpv2RewritePackageBuilder.js` | `pak01_dir.vpk` | `hud_escape_menu.vxml_c` |
| Rewritev2 ShowRanks / QOLLOCK | `hpv2RewritePackageBuilder.js` | `pak01_dir.vpk` | `hud_escape_menu.vxml_c` + `citadel_hud_top_bar.vxml_c` |

Filenames come from `src/presetVpkFileName.js` and `src/hpv2PresetVpkFileName.js`. Runtime install combinations live in `PresetBuilderHPV2Island.jsx` (around line 105): pak02 runtime for every Rewritev2 target, plus showrank_barebones pak03 for ShowRanks, QOLLOCK 4.0 `pak60_dir.vpk` for QOLLOCK, or an unchanged Third Eye pak47 (or another pak03+ slot) for Third Eye. Legacy QOLLOCK uses an older pak03. When code and `README.md` disagree on filenames, the source is correct. README says every Rewrite download is pak01, but legacy standalone Rewrite produces pak96.

### Schemas and wire slots

- **Legacy, 56 fields:** `src/contracts/hpColorsPresetContract.js` + `HP_FIELD_CATALOG` in `src/hpSchema.js`. Normalize through `normalizeHpPresetPayload`/`normalizeHpPresetValues` in `src/hpPresetPayload.js`, which accepts compact keys (`n`, `vs`, `hm`, `hs`, `o`) and rejects unknown keys. Blank names survive only with `preserveBlankName: true`, which `createProfile` sets on purpose.
- **Legacy Rewrite, 72 controls:** `REWRITE_FIELD_CATALOG`/`REWRITE_FIELD_BINDINGS` in `src/hpSchema.js`, transferred by `src/rewritePresetCodec.js`.
- **HPv2, 110 controls:** `src/hpv2HpSchema.js`. The wire format is 72 legacy slots plus 41 extension slots. `excludeBuildings`, `excludeBosses` and `excludeGhouls` are retired slots with no editor control; import ignores them. Never renumber slots to match UI order; append new slots only.
- Profiles carry legacy values plus opaque `rewrite` metadata (canonical values, `webValues`, conditions, `webOverrides`). `profileStore.js` clones that metadata without interpreting it, and session edits rebuild it through the matching codec. `normalizeHpPresetPayload` cannot represent Rewrite values, so do not route them through it.
- Each catalog owns defaults, coercion, visibility, categories and override counts. Navigation and preview modules take the catalog as an argument; keep that seam and do not copy schema rules into UI code.

### Templates and generated files

All templates are under `public/templates/`:

| File | Status |
|---|---|
| `hp_colors/panorama/layout/base_hud.xml` | Shared by Minimal and Full; includes are patched per variant |
| `hp_colors_rewrite/…/hud_escape_menu.xml` | Legacy snapshot; ShowRanks hooks are added during packaging |
| `hp_colors_rewrite_qollock/…/hud_escape_menu.xml` | Legacy snapshot; byte-identical to the upstream `hp_colors_rewrite_qollock` layout |
| `hpv2_hp_colors_rewrite/…/hud_escape_menu.xml` | **Canonical** HPv2 layout for normal, ShowRanks and QOLLOCK |
| `hpv2_hp_colors_rewrite_qollock/…/hud_escape_menu.xml` | **Generated** by `scripts/sync-hpv2-templates.js`; never edit |
| `hpv2_hp_colors_rewrite_{showranks,qollock}/…/citadel_hud_top_bar.xml` | Hand-maintained merged topbars; sync does not touch them |
| `hpv2_hp_colors_rewrite_thirdeye/…/hud_escape_menu.xml` | Composed upstream and hash-pinned; sync does not touch it |

`npm run dev`, `npm test` and `npm run build` run `sync:hpv2` first, so they can rewrite the generated QOLLOCK file. The source is `--source <file>` if given, otherwise `HPV2_LAYOUT_SOURCE`, otherwise the checked-in canonical file. A missing or duplicate insertion target fails generation. When includes, required panels or lifecycle attributes change, update the matching contracts in `src/hpv2RewritePackageBuilder.js` and the focused package tests, run `npm run verify:hpv2-templates`, and commit the canonical and generated files together.

The documented upstream source is `F:\Users\FoxOS_User\Desktop\Deadlock-mods-collection\hp_colors_rewrite_v2\panorama\layout\hud_escape_menu.xml`. It has drifted: it now ships `citadel_ui_color_picker.vcss_c` and `HPColorsV2Store` where the builder validator expects the preset-store contract. Do not set `HPV2_LAYOUT_SOURCE` or run `--source` against it without first reviewing the diff and agreeing on the scope with the user. To refresh Third Eye, run `build_hp_colors_rewrite_v2_thirdeye.ps1 -SkipDeploy` in the mods repository (it still writes upstream build output) and copy `hp_colors_rewrite_v2_thirdeye/panorama/layout/hud_escape_menu.xml` over the template. The checked-in hash (`666967f1…`) currently differs from upstream's (`a5dce674…`).

## Key Directories

- `src/` — domain modules, codecs, sessions and workflows; `hpv2*` files form the HPv2 stack.
- `src/components/` — the three islands, the two healthbar previews, `KofiLeaderboardTicker.jsx`, and shared accessible controls (`schema-field.jsx`, `schema-tree*.jsx`, `schema-control-utils.js`).
- `src/contracts/` — the legacy 56-field contract, aliases and versions.
- `src/pages/` — the three builder pages, `supporters-strip.astro`, and `commit-info.json.js`, the only JSON endpoint.
- `src/fixtures/` — pinned Rewrite wire manifest and malformed corpus. They cover the first 12 extension slots only and are used by tests, not at runtime.
- `src/styles/` — per-page stylesheets (`v2.css`, `hpv2.css`, `supporters-strip.css`, legacy `global.css`); none uses `@import`.
- `public/templates/` — package sources (see the table above).
- `public/heroes/` — 38 game-extracted hero PNGs with no established redistribution permission (`NOTICE`).
- `public/data/supporters.csv` — public supporter list, validated at build time by `src/supportersData.js`.
- `test/` — `node:test` suites; `e2e/` — the Playwright spec `v2.spec.js`.
- `scripts/` — template sync, Minimal artifact verifier and post-deploy smoke check.
- `tools/oxlint/anti-slop/` — vendored Oxlint plugin; not application code.
- `docs/agents/` — issue-tracker, triage-label and domain-doc conventions. `docs/superpowers/` holds historical plans that assume React/Tailwind/Astro 5; do not treat them as current architecture.
- `.agents/` — vendored generic skill bundle; it does not describe this app.

## Development Commands

Run from the repository root:

```bash
npm ci
npm run dev                     # sync:hpv2, then astro dev at /hp-colors-preset-builder/
npm run build                   # sync:hpv2, then static build to dist/
npm run preview
npm test                        # sync:hpv2, then node --test (all test/*.test.js)
node --test test/vpkArchive.test.js   # one suite; skips the sync hook
npm run test:e2e                # Playwright; starts or reuses dev on 127.0.0.1:4321
npm run verify:artifact         # Minimal-only determinism check
npm run verify:hpv2-templates   # read-only sync drift check
npm run sync:hpv2 -- --source "<hud_escape_menu.xml>"
npm run lint                    # oxlint + local anti-slop plugin
npx fallow dead-code            # optional; not a dependency or CI step
node scripts/verify-deployed-hpv2.js  # post-deploy only; live site must match local HEAD
```

No format, typecheck or coverage commands exist; do not invent them. Restart `npm run dev` after editing template XML, because sync only runs at startup. `scripts/verify-deployed-hpv2.js` loads the live `/hpv2/` page, requires `commit-info.json` to equal local `HEAD`, and round-trips HPCR2/HPCRP1 through the clipboard. It downloads no VPK.

## Code Conventions & Common Patterns

- **Naming.** ESM `.js` modules and functions use lowerCamel. Islands and previews use PascalCase `.jsx`, constants use SCREAMING_SNAKE, and older shared controls and fixtures use kebab-case filenames. Function names start with concrete verbs: `create/load/save/normalize/parse/decode/read/write/compile/extract/validate/build/run/reduce/select/commit`. Workflows are `run*Workflow`. A new HPv2 counterpart is `src/hpv2<Name>.js` and keeps the legacy export names.
- **State.** Change UI state only through reducer intents with immutable updates. Workflows dispatch results and never mutate island state.
- **Side effects.** Keep domain modules free of DOM access, and inject `fetchImpl`, storage, download, digest, clipboard and dispatch. DOM and clipboard code belongs in `src/download.js` and the islands. `src/gitCommitInfo.js` and `src/supportersData.js` run in Node at Astro build time; the browser refreshes Git metadata through `src/gitCommitInfoRefresh.js` with `cache: 'no-store'`.
- **Lazy loading.** Only `hpImportCode`, `packageBuilder`/`packageArtifacts` and `vpkConverter` are dynamically imported. New expensive legacy paths should follow that pattern; Rewrite builders are imported statically.
- **Boundaries.** Validate untrusted input where it enters. Limits: VPK 4 MiB, Source 2 resource/XML 2 MiB, encoded legacy preset and HPCRP1 64 KiB, import token/payload/text 16384/8192/32768 characters, 1–128 profiles, 128 heroes, 96-character names. Also enforce safe archive paths, case-folded duplicate rejection, CRC checks and fatal UTF-8 decoding.
- **Error strings are contracts.** Keep exact messages; tests assert them. Transfer errors are uppercase (`'INVALID HPCRP1 CODE'`, `'INVALID HPV2 PRESET EXTENSION'`). Package errors are sentence case (`'Invalid HPCRP1 code'`, `'Rewrite QOLLOCK preset package requires topbarTemplateText'`). Workflow errors read like `'A rewrite preset build is already in progress.'` and `'Selected VPK exceeds the 4 MiB limit.'`. Protocol errors include `'VPK entry CRC mismatch'`. Change a string only when the contract change is intended, and update its test in the same change.
- **Round trip.** Every builder writes, compiles, archives, rereads, extracts and validates before returning bytes. Keep that, and keep output deterministic for identical input.
- **XML ownership.** `presetStoreXml.js` owns only the legacy `base_hud` preset store, with strict validation for generated stores and loose reading for imports. Each Rewrite builder owns its target's include, panel and lifecycle checks, and leaves bytes outside the store label untouched.
- **Persistence.** V2 and HPv2 share storage keys, so a change on one page appears on the other.

  | Key | Purpose |
  |---|---|
  | `hp_colors_preset_builder_profiles_v1` / `_v2` | Profiles (original UI / V2 and HPv2) |
  | `hp_colors_preset_builder_target_mode_v1` / `_v2` | Target selection |
  | `hp_colors_preset_builder_showranks_compatible_v1` | ShowRanks flag |
  | `hpv2-whats-new-acknowledged` | HPv2 notice; value `2026-09-ally-hp-text` |
  | `hp_colors_healthbar_preview_v1` (sessionStorage) | Preview scenario; never localStorage |

  Store failures surface as `'… could not be read/saved: …'` statuses rather than crashes.
- **Typeof guards.** In JavaScript, `typeof` checks at runtime boundaries are deliberate. The anti-slop `no-runtime-typeof` rule applies only to TypeScript files; do not remove JS guards to please a linter.
- Match nearby formatting. Extend existing seams (catalog arguments, the `hpv2*` parallel modules, injected loaders) instead of adding parallel helper layers.

## Important Files

- `package.json` — scripts, sync lifecycle hooks and dependency ranges. It has no `engines` field.
- `astro.config.mjs` — Preact integration, `site: https://hantu-raya.github.io`, `base: /hp-colors-preset-builder/`, and JSX runtime aliases pointing React to Preact.
- `playwright.config.js` — one Chromium Desktop Chrome configuration, one worker, and the `PLAYWRIGHT_BASE_URL`/`PLAYWRIGHT_REUSE_SERVER` overrides.
- `src/components/PresetBuilderV2Island.jsx`, `src/components/PresetBuilderHPV2Island.jsx` — UI integration and target install text.
- `src/presetBuilderSession.js`, `src/hpv2PresetBuilderSession.js` — session reducers; HPv2 migrates old minimal+ShowRanks state to `full`.
- `src/presetBuilderWorkflow.js`, `src/hpv2PresetBuilderWorkflow.js` — loaders, locks, build and convert orchestration.
- `src/hpSchema.js`, `src/hpv2HpSchema.js`, `src/contracts/hpColorsPresetContract.js` — catalogs and wire slots.
- `src/rewritePresetCodec.js`, `src/hpv2RewritePresetCodec.js` — HPCR2/HPCRP1 codecs and `hpv2` extension validation.
- `src/packageBuilder.js`, `src/rewritePackageBuilder.js`, `src/hpv2RewritePackageBuilder.js` — package contracts per target.
- `src/source2ResourceCodec.js`, `src/vpkArchive.js`, `src/presetStoreXml.js` — protocol boundaries.
- `src/profileStore.js`, `src/targetModeStore.js`, `src/showranksCompatibleStore.js` — persistence and V1→V2 profile isolation.
- `scripts/sync-hpv2-templates.js`, `scripts/verify-generated-artifact.js`, `scripts/verify-deployed-hpv2.js` — template and artifact gates.
- `.oxlintrc.json`, `.fallowrc.json` — lint rules and dead-code exemptions; Fallow exempts all exports of four legacy modules.
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` — CI and Pages deployment.
- `README.md` — targets, install combinations, sync instructions and the manual Deadlock gate. Its pak filenames and gate steps are partly stale.
- `NOTICE`, `LICENSE` — Apache-2.0 source license, kept separate from game-asset rights.

## Runtime/Tooling Preferences

- Node 22 (CI). Installed Astro 7 and `@astrojs/preact` 6 require Node ≥ 22.12 and npm ≥ 9.6.5. Use npm only; `package-lock.json` (lockfile v3) is authoritative. The stack is Astro 7 + Preact 10 + `lucide-preact`, not React, Tailwind or shadcn.
- `ci.yml` runs on every push and PR: `npm ci`, `npm audit --omit=dev --audit-level=moderate`, `npm test`, `npm run build`, the artifact verifier, `npx playwright install --with-deps chromium`, then `npm run test:e2e`. It does **not** run lint, Fallow or `verify:hpv2-templates`, and it does not fail when sync regenerates a template, so run those yourself when they apply.
- `deploy.yml` deploys on a push to `master` or a manual dispatch, after the reusable CI passes. It uploads only `dist/`, so assets must keep the `/hp-colors-preset-builder/` base. A green build is not a release.
- Git hygiene: `*.png` and `*.vpk` are ignored everywhere except `public/heroes/` and `public/healthbar-preview/`, and `dist/`, `.astro/`, `test-results/` and `.playwright-cli/` are ignored. `tmp/`, `.validation-backups/` and the empty root `hp_colors/` are not ignored as directories. `.dev-server.*.log`, `tmp/island-check.js` and `.unlazy/*/GATES.md` are tracked; do not delete them as clutter.
- Commits: short title, with behavior, implementation and verification in the body. Push the tracking branch unless the user says otherwise. Committing, pushing and deploying require a user request.
- Issues live in `Hantu-Raya/hp-colors-preset-builder` GitHub Issues. Use the labels in `docs/agents/triage-labels.md`: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. PRs are not the default triage surface. `CONTEXT.md` and `docs/adr/` are optional and currently absent; do not create them just to satisfy `docs/agents/domain.md`.

## Testing & QA

Choose evidence that can catch the change. Documentation needs consistency and path checks. Domain code needs the focused `test/<module>.test.js` and then `npm test`. UI changes need the running app through e2e or a manual check. Packaging changes need the package tests, `npm run build` and the manual Deadlock gate.

- **Runner.** `node --test` with `node:assert/strict`, using `equal`, `deepEqual`, `match`, `throws` and `rejects` with exact `{ message }` objects for stable errors. Pair `test/<module>.test.js` with `src/<module>.js`, including `hpv2*` counterparts. Grouped exceptions: `*UiSource`, `presetBuilderIslandMinimalTarget`, `topbarResponsiveCss`, `hpv2TemplateSync`, `hpv2RewriteThirdEye`.
- **Adapters, not globals.** Tests use Map-backed storage doubles, `fetchImpl` stubs returning `{ ok, status, text }`, fixed digests and dispatch collectors:

  ```js
  const load = createBaseHudXmlLoader({ baseUrl: '/base/', fetchImpl: async url => { calls.push(url); return { ok: true, text: async () => '<root />' }; } });
  await load(); await load();
  assert.deepEqual(calls, [`/base/${BASE_HUD_TEMPLATE_PATH}`]);
  ```

- **Package tests** build from the checked-in templates and decode the result:

  ```js
  const built = buildRewritePresetPackage({ templateText, presetCode: PRESET_CODE });
  const archive = readVpkArchive(built.vpkBytes);
  assert.deepEqual(archive.files.map(file => file.path), [REWRITE_PRESET_ARCHIVE_PATH]);
  ```

  Each target suite asserts the exact archive entries, include order (for example QOLLOCK 4.0 places `ui/window` before the bridge), lifecycle hooks, and rejection of stale or substituted templates and topbars.
- **Wire contracts.** `test/hpv2RewritePresetCodec.test.js` pins SHA-256 hashes of the `src/fixtures/` corpus and runs each malformed case as a subtest. Changing a wire slot breaks these tests by design. `test/fixtures/source2RealBaseHud.js` is not imported by any test.
- **Static source/CSS tests** (`presetBuilder*UiSource`, `browserBuildPath`, `topbarResponsiveCss`) read source files and assert markers: accessibility (focus trap, listbox keys), no codec imports in islands, base-aware links, sessionStorage-only preview, a static settings tree, breakpoints and supporter-ticker animation. Update them deliberately when that contract changes.
- **Template sync.** `test/hpv2TemplateSync.test.js` checks that a shared edit reaches normal, ShowRanks and QOLLOCK output and that CRLF line endings survive. `verify:hpv2-templates` provides the byte check against the checked-in generated file. Third Eye is outside both checks.
- **E2E** (`e2e/v2.spec.js`, mostly `/hpv2/`) runs one Desktop Chrome configuration at 1280×720 and resizes to 1460, 1133, 390 and 320 widths without mobile or touch emulation. It covers routes, every Rewrite field, preset add/remove/import/export, preview controls, overflow, reload persistence, the target matrix at 1460×900 and 390×900 with decoded pak01 archive shapes, and a Third Eye download. It does not check console errors, touch-target sizes, sticky navigation or profile reordering (reordering has reducer tests), and it does not run legacy Minimal/Full builds.
- **`verify:artifact`** builds the default Minimal fixture twice and checks byte identity, one `base_hud` entry, one global v1 profile and 56 ordered fields. It does not cover Rewrite or HPv2 targets.
- **Manual Deadlock gate** for packaging or release changes: restart Deadlock with the exact runtime and preset pair for the target (see the install table above; README steps 1–2 still describe only pak96 Minimal/Full). Then confirm global, selected-hero and Off routing, profile priority after reordering, and an in-game import/export round trip. Repeat after any game or runtime update. Automated checks do not replace this gate, and reported results should say which target was tested in game.
