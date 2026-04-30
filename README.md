# HP Colors Web Builder

Browser-only build path for a deterministic `base_hud`-only `pak96_dir.vpk`.

## What works now

- Starts from the HP Colors default preset and lets you edit values before build.
- Compiles only `base_hud.xml` into a Source 2 `_c` resource.
- Injects an encoded preset store into `base_hud.xml`.
- Packs a VPK v2 `_dir.vpk` with embedded file data.
- Downloads `pak96_dir.vpk`.

## Current limits

- The base HP Colors pack must include the generic Preset reader in `anita_ui_core.js` and Preset tab registration in `hp_registrar.js`.
- Generated DATA-only XML still needs Deadlock validation after engine updates.

## Run

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

## Verify core writers

```powershell
npm test
```
