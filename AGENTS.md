# Repository Guidelines

## Project Overview

HP Colors Preset Builder is a browser-only Astro/Preact app for editing, importing, routing, and packaging Deadlock HP Colors presets. It deterministically builds `pak96_dir.vpk` with a compiled Source 2 `panorama/layout/base_hud.vxml_c`; it does not install mods. Preserve the domain terms **Minimal**, **Full**, **profile**, **preset store**, and **Convert VPK**.

## Architecture & Data Flow

The app uses layered, browser-first JavaScript:

1. `src/pages/index.astro` renders the page and hydrates `PresetBuilderIsland` with `client:load`.
2. `src/components/PresetBuilderIsland.jsx` connects browser effects and events to reducer intents and workflow functions. Keep it as an integration shell; put domain behavior below the UI layer.
3. `src/presetBuilderSession.js` owns immutable session state, selectors, derived values, and transitions.
4. `src/presetBuilderWorkflow.js` orchestrates async import/build/convert operations through injected loaders, downloaders, digests, and dispatch functions.
5. `src/contracts/hpColorsPresetContract.js`, `src/hpSchema.js`, and `src/hpPresetPayload.js` define the 56-field schema and canonical payload normalization.
6. `src/packageBuilder.js` writes preset-store XML, compiles the Source 2 resource, creates the VPK, then rereads and validates the result before returning it.
7. `src/presetStoreXml.js`, `src/source2ResourceCodec.js`, and `src/vpkArchive.js` own the XML, Source 2 resource, and VPK protocol boundaries.

Import and conversion follow the reverse path: validate bytes/token limits, decode the archive/resource/XML, normalize profiles, then dispatch session intents. Do not bypass boundary validation or duplicate schema rules in UI code.

## Key Directories

- `src/components/` — Preact island and accessible schema controls.
- `src/contracts/` — canonical preset contract, metadata, versions, and field definitions.
- `src/pages/` — Astro page and JSON endpoints.
- `src/styles/` — global layout and responsive contracts.
- `test/` — Node unit/integration and static source-contract tests.
- `e2e/` — Playwright desktop and 390×844 mobile workflows.
- `public/templates/` — source assets used to build target-specific packages.
- `public/heroes/` — static hero imagery; redistribution permission is not established.
- `scripts/` — deterministic generated-artifact verification.
- `docs/agents/` — issue-tracker, triage-label, and domain-document guidance.
- `docs/superpowers/` — historical plans/specs, not current architecture authority.

## Development Commands

Use npm from the repository root:

```bash
npm ci
npm run dev
npm run build
npm run preview
npm test
npm run verify:artifact
npm run test:e2e
```

`npm run dev` serves the app under `/hp-colors-preset-builder/`. Playwright starts it on `127.0.0.1:4321` automatically. CI also runs `npm audit --omit=dev --audit-level=moderate` and installs Chromium with `npx playwright install --with-deps chromium`.

There are no configured lint, format, typecheck, or coverage commands. Do not invent them. `dist/`, `.astro/`, Playwright output, and generated VPKs are build artifacts and must not be committed.

### Rewrite v2 XML sync gate

`F:\Users\FoxOS_User\Desktop\Deadlock-mods-collection\hp_colors_rewrite_v2\panorama\layout\hud_escape_menu.xml` is the canonical Rewrite v2 layout. `public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml` must be an exact mirror so generated preset VPKs remain compatible with the installed Rewrite v2 runtime.

Whenever the canonical layout changes:

1. Copy it over the web-builder template without modifying the hidden store label.
2. If script/style includes, required panels, or menu lifecycle attributes changed, update `src/rewritePackageBuilder.js` and `test/rewritePackageBuilder.test.js` in the same commit.
3. Run `npm test` and `npm run build`.
4. Require `diff -u public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite_v2/panorama/layout/hud_escape_menu.xml` to produce no output.

The legacy QOLLOCK preset template must exactly mirror
`F:\Users\FoxOS_User\Desktop\Deadlock-mods-collection\hp_colors_rewrite_qollock\panorama\layout\hud_escape_menu.xml`. The HPv2 QOLLOCK template must exactly mirror `F:\Users\FoxOS_User\Desktop\Deadlock-mods-collection\hp_colors_rewrite_v2_qollock\panorama\layout\hud_escape_menu.xml`.
Sync the matching template after every compatibility refresh so generated `pak01` presets preserve that runtime's QOLLOCK menu hierarchy, settings, and includes.

## Code Conventions & Common Patterns

- Use ESM JavaScript and JSX with Preact. Components use PascalCase; modules/functions use existing lower-camel naming.
- Treat `HP_FIELD_CATALOG` and the preset contract as the single source for defaults, coercion, visibility, categories, and override counts.
- Normalize external and stored data through `normalizeHpPresetPayload`/`normalizeHpPresetValues`. Blank profile names are preserved only when `preserveBlankName: true` is intentional.
- Use reducer intents and immutable updates for UI state. Workflows dispatch status, success, and failure intents instead of mutating component state.
- Keep domain modules browser-independent. Inject side effects such as `fetch`, downloads, digests, storage, and dispatch where tests need control; keep DOM/clipboard APIs in browser adapters such as `src/download.js`.
- Validate untrusted tokens, XML, Source 2 resources, archive paths, UTF-8, sizes, and CRCs at boundaries. Preserve exact user-facing and protocol error strings unless the contract intentionally changes.
- Prefer dynamic imports for expensive build/convert paths, as in `src/presetBuilderWorkflow.js`.
- Preserve round-trip package validation: write, compile, archive, reread, extract, and validate.
- Match nearby formatting and avoid parallel helper layers or generic schema arguments when an existing canonical seam already exists.

## Important Files

- `package.json` — scripts and direct dependencies.
- `astro.config.mjs` — Astro/Preact setup and GitHub Pages `site`/`base` contract.
- `playwright.config.js` — Chromium projects, serial execution, timeouts, retries, and local server.
- `src/components/PresetBuilderIsland.jsx` — browser/UI integration point.
- `src/presetBuilderSession.js` — session model and reducer.
- `src/presetBuilderWorkflow.js` — async orchestration.
- `src/contracts/hpColorsPresetContract.js` — canonical field and payload contract.
- `src/packageBuilder.js` — package plan/build API.
- `scripts/verify-generated-artifact.js` — deterministic artifact and 56-field contract check.
- `.github/workflows/ci.yml` — reusable test/build gate.
- `.github/workflows/deploy.yml` — `master`-only GitHub Pages build and deployment.
- `README.md` — product, installation, rebuild, and manual in-game verification contract.

## Runtime/Tooling Preferences

Use Node 22.12+ and npm; CI runs Node 22, and `package-lock.json` lockfile v3 is authoritative. The stack is Astro 7 with Preact, not React/Tailwind/shadcn despite dated documents under `docs/superpowers/`.

GitHub Pages uploads only `dist/` and requires assets to retain the `/hp-colors-preset-builder/` base. A successful build is not a release: deployment waits for the reusable CI workflow. Before pushing, run the tests and build commands relevant to the changed surface. Use a short commit title, put behavior/implementation/verification details in the body, and push the tracking branch unless the user requests otherwise.

Issues live in `Hantu-Raya/hp-colors-preset-builder` GitHub Issues. Use the canonical labels from `docs/agents/triage-labels.md`: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. External PRs are not the default triage surface.

## Testing & QA

- `npm test` uses `node:test` with `node:assert/strict`. Tests mix focused module contracts with real XML/resource/VPK round trips.
- Keep unit tests deterministic and local. Existing tests inject storage, `fetchImpl`, download, digest, and dispatch adapters rather than relying on globals.
- Assert observable contracts: exact errors/statuses, canonical paths and filenames, normalized payloads, deterministic bytes, CRC/corruption rejection, reducer transitions, and round-trip results.
- Static source/CSS tests protect architectural and responsive markers; update them deliberately when the underlying contract changes.
- `npm run test:e2e` uses Playwright Chromium with one worker. Desktop tests cover import/export, persistence, target-specific UI, downloads, VPK decoding, and browser errors. Mobile tests cover overflow, sticky navigation, touch target sizes, profile reordering, and builds.
- `npm run verify:artifact` builds the default Minimal fixture twice and verifies byte identity, archive shape, Source 2/XML validity, one global profile, and all 56 fields.
- Packaging or release changes require the README’s manual Deadlock gate: test the matching Minimal/Full target, global/selected/off routing, priority, and import/export round trip.
