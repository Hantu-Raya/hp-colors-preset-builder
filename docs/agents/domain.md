# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo is configured as a **single-context** repo.

Single-context means the repo has one shared project context at the root, with repo-wide ADRs under `docs/adr/` if and when architectural decisions are recorded.

Expected layout:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── src/
```

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if it exists.
- **`docs/adr/`**, if it exists. Read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence and don't suggest creating them upfront. Domain-modeling skills create them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept, such as in an issue title, refactor proposal, debugging hypothesis, or test name, use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, either you're inventing language the project doesn't use or there's a real gap. Reconsider first; if the gap is real, note it for domain modeling.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because..._
