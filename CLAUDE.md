# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static multi-file interactive dashboard for analyzing research semillero (seedbed) applicants at Fundación Universitaria del Área Andina. No build system or package manager. Chart.js is loaded via CDN.

## Running the App

Open `index.html` directly in a browser. No server or build step required.

## File Structure

```
index.html          — HTML structure only, links to CSS and JS
styles/main.css     — all styles
js/data.js          — RAW dataset (53 records), PALETTE; exports window.DashboardData
js/charts.js        — chart rendering functions; exports window.DashboardCharts
js/app.js           — filters, KPIs, table, init; exports window.applyFilters / resetFilters
```

Scripts load in this order (dependency chain): Chart.js CDN → data.js → charts.js → app.js.

## Architecture

Each JS file is an IIFE to avoid polluting the global scope. They communicate via `window` namespaces:

- `data.js` exposes `window.DashboardData = { RAW, PALETTE }`
- `charts.js` exposes `window.DashboardCharts = { updateCharts }`
- `app.js` consumes both and exposes `window.applyFilters` / `window.resetFilters` for inline HTML handlers

**Rendering pipeline**: `applyFilters()` → `updateKPIs()` + `window.DashboardCharts.updateCharts(filtered, PALETTE, filtered.length)` + `updateTable()`. Charts are fully destroyed and re-created on each filter change via `makeChart()` (to avoid Chart.js canvas reuse errors).

## Key Functions

| File | Function | Purpose |
|---|---|---|
| `app.js` | `applyFilters()` | Reads 5 selects, filters RAW → `filtered`, calls all update functions |
| `charts.js` | `makeChart(id, type, labels, values, colors, filteredLength, opts)` | Destroy + create Chart.js instance |
| `charts.js` | `updateCharts(data, palette, filteredLength)` | Calls makeChart × 8 for all canvases |
| `charts.js` | `count(arr, key)` | Aggregates values including array-valued fields (`lines`, `topics`, `skills`) |
| `app.js` | `populateFilters()` | Builds `<select>` options from RAW on load |
| `app.js` | `pillClass(val)` | Maps `'Sí'/'No'/other` → CSS class for colored badges |

## Design System

CSS custom properties in `:root` (`styles/main.css`):
- `--accent`: `#6c63ff` (purple) — primary
- `--accent2`: `#00d4aa` (teal) — secondary
- `--accent3`: `#ff6b6b` (red) — tertiary
- `--bg`: `#0f1117` — page background
- `--card`: `#1a1d27` — card/panel background

Responsive breakpoints: 1200px (tablet) and 700px (mobile).

## Data Notes

- All content is in Spanish.
- Multi-value fields (`lines`, `topics`, `skills`, `goals`) are stored as arrays per record.
- `semester` uses string values `"1"`–`"8"` and `"Egresado"` for alumni.
- Filter dropdowns for `lines`, `time`, `previous`, and `willing` map to specific field values — check `populateFilters()` in [js/app.js](js/app.js) when adding new filter dimensions.
