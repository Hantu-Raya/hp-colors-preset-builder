# Third-party notices

This repository contains original code by **Hantu-Raya** and bundled third-party components.

## Bundled runtime and libraries

- **.NET runtime / BCL WASM files** in `vendor/deadmod/_framework/` — Microsoft / .NET Foundation, MIT
- **ValvePak** in `vendor/deadmod/_framework/` — Rick Gibbed and ValveResourceFormat contributors, MIT
- **Astro, React, Tailwind, Playwright, and npm dependencies** — see each package's license in `package-lock.json` and upstream repositories

## Generated artifacts

The repository should not commit Astro build output. Regenerate it with `npm run build` when needed.
