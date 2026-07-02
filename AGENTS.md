# Agent Notes

## Commit And Push

- Use a short, one-shot-readable commit title.
- Put the detailed explanation in the commit body, not the title.
- The commit body should summarize the user-facing behavior, implementation details, and verification performed.
- Before pushing, run the relevant tests and build commands for the changed surface.
- Push the current tracking branch after the commit succeeds unless the user asks for a different branch.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `Hantu-Raya/hp-colors-preset-builder`; external PRs are not treated as a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain doc layout. See `docs/agents/domain.md`.
