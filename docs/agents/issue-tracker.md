# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `Hantu-Raya/hp-colors-preset-builder`. Use the `gh` CLI for all issue operations.

## Repository

- Git remote: `origin`
- URL: `https://github.com/Hantu-Raya/hp-colors-preset-builder.git`
- Tracker: GitHub Issues

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc or body file for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, including labels and relevant comments.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `gh issue edit <number> --remove-label "..."`.
- **Close an issue**: `gh issue close <number> --comment "..."`.

Infer the repo from `git remote -v` when working inside this clone; `gh` does this automatically.

## Pull requests as a triage surface

**PRs as a request surface: no.**

External pull requests are not pulled into the issue triage queue. `/triage` should process GitHub Issues only, leaving pull requests to normal review workflows unless a user explicitly asks to triage PRs.

If this changes later, set the line above to `yes`; PRs should then run through the same labels and states as issues using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, keeping only external authors such as `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label` / `--remove-label`, and `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either. Resolve with `gh pr view 42` and fall back to `gh issue view 42` if needed.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in this repo.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments` from this repo.
