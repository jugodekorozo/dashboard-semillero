# CLAUDE.md

## Scope
Semillero management dashboard (vanilla):
- `index.html`
- `styles/main.css`
- `js/data.js`
- `js/app.js`
- `js/charts.js`
- `js/analytics.js`
- `js/modules.js`

## Objective
Ship low-risk improvements for semillero operations (filters, KPIs, charts, insights, ranking) with maintainable code.

## Non-Negotiables
- Preserve current runtime behavior unless explicitly requested.
- Keep current architecture and file responsibilities.
- No framework migration.
- No full UI redesign by default.

## Working Rules
1. Edit incrementally.
- Prefer small diffs in existing files.
- Extend before replacing.

2. Reuse existing logic.
- Inspect `app/charts/analytics/modules` before adding helpers.
- Remove duplication only when behavior stays identical.

3. Protect contracts.
- Keep DOM IDs/classes used by JS.
- Keep `window.*` exports and callback flow stable.

4. Prioritize low risk.
- Avoid cross-file rewrites for local problems.
- Keep analytics helpers deterministic and readable.

## Delivery Checklist
- Filters still work.
- KPI values still update correctly.
- Charts still render/update correctly.
- Modules (insights/ranking/skills) still render correctly.
- Table output remains consistent.

## Product Priorities
1. Team builder features
2. Strategic KPI enhancements
3. Teacher/advisor integration
