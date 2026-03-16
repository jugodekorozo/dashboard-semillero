# AGENTS.md

## Repo Snapshot
Vanilla dashboard for semillero management using HTML/CSS/JS + Chart.js.

Key files:
- `js/app.js`: filters, KPIs, table orchestration
- `js/charts.js`: chart rendering
- `js/analytics.js`: scoring/insights/helpers
- `js/modules.js`: intelligence UI modules

## Codex Rules
1. Inspect first, edit second.
- Read target file + integration points before changing code.

2. Preserve architecture and behavior.
- Keep current file roles, selectors, and `window.*` contracts.
- Do not migrate to frameworks.

3. Prefer minimal diffs.
- Add/extend logic incrementally.
- Avoid broad rewrites when local edits solve it.

4. Avoid duplication.
- Reuse helpers before creating new ones.
- Refactor only if behavior remains unchanged.

5. Keep concerns separated.
- Strategy: architecture/roadmap.
- Analytics: `js/analytics.js`.
- UI: `index.html` + `styles/main.css`.
- Refactor: low-risk cleanup only.

## Priority Workstreams
1. Team builder
2. Strategic KPIs
3. Teacher/advisor integration
