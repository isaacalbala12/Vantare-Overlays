# Alpha 0.1 Release Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare Vantare Overlays v2 for the first GitHub alpha release `v0.1.0-alpha.1`.

**Architecture:** Treat this as a release hardening pass, not a feature phase. Keep product code stable, document the current alpha capabilities/limitations, verify the app with automated tests, stage only intentional source/docs/evidence files, then create Git commit/tag/push only after the working tree has been audited.

**Tech Stack:** Go/Wails v3, React 19, TypeScript, pnpm, Git/GitHub.

---

## Scope

- Update alpha release documentation.
- Add release notes/changelog for `v0.1.0-alpha.1`.
- Ensure local-only generated files are ignored or left unstaged.
- Run required verification:
  - `go test ./...`
  - `pnpm --dir frontend test`
  - `pnpm --dir frontend build`
- Prepare a clean Git commit and tag for GitHub if verification passes.

## Do Not Include

- `apps/desktop/` legacy Electron changes.
- Local dumps: `lmu-floats.csv`, `lmu-online-dump.csv`.
- Local release package folders.
- Temporary Codex/session files.
- Built executables.
- Supabase temp state.

## Acceptance Criteria

- Docs state alpha status clearly.
- Known limitations include real `deltaBest`/Delta data not connected yet.
- Tests/build pass.
- Commit contains only intentional v2 source/docs/assets.
- Tag is `v0.1.0-alpha.1`.
- Push only after staging audit.

## Checklist

- [ ] Audit `git status`.
- [ ] Update `.gitignore` for local-only generated artifacts.
- [ ] Add `CHANGELOG.md` or release notes section.
- [ ] Update project docs to alpha state.
- [ ] Run automated verification.
- [ ] Stage intentional files only.
- [ ] Review staged diff.
- [ ] Commit.
- [ ] Tag `v0.1.0-alpha.1`.
- [ ] Push branch and tag to origin.
