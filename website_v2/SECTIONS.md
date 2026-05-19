# `index.html` section map (post-redesign)

Use this map for targeted edits after the visual-essay redesign.

## Shell and global UI

| Block | Notes |
|---|---|
| `<head>` | SEO/social tags (`og:*`, `twitter:card`), JSON-LD, `print.css` |
| Top bar | `.topbar`, `.topnav`, `.topnav-more`, `#theme-toggle` |
| Argument trail | `.arg-breadcrumb` (sticky step chips) |
| Floating indicator | `.section-indicator` fallback |

## Narrative structure (`<main id="main">`)

| Order | Section `id` | Main hooks |
|---|---|---|
| 0 | `hero` | `.hero-photo-card`, `.hero-thesis-pull`, `.hero-data-note` (photo-only after Spring 2026 feedback) |
| 0.4 | n/a | `.argument-context` (1994 background block) |
| 0.5 | n/a | `.argument-summary` (thesis anchor card, sector-focused) |
| 1 | `question` | `.question-big`, JSE 1893 figure |
| 2 | `from-the-ground` | `.ground-sequence`, `.inline-voice` |
| 3 | `timeline` | `#timeline-shell`, `#timeline-scroll`, `#timeline-list` |
| 4 | `macro` | `#chart-indexed` (now 3 distinct hues), `#chart-unemployment` |
| 5 | `sectors` | `.sector-stats-card`, `#chart-sector-shares`, `#chart-manuf-decline`, `#chart-scatter-manuf-trade` |
| 6 | `inequality` | `#chart-income-shares`, `#chart-wealth-shares`, `#chart-top10-trade-time`, `#chart-scatter-top10-trade`, `#chart-gini` |
| 7 | `governance` | `#chart-wgi`, `#wgi-show-context` |
| 8 | `results` | `.results-summary-card`, `.results-detail-toggle`, `.result-chips`, `#headline-table` |
| 9 | `map` | `#za-map` |
| 10 | `conclusions` | `.conclusion-grid`, `#quote-orbit` |
| 11 | `sources` | dataset/policy/causal cards, `.citation-card` |

## Transition cards

Between every major section: `.section-bridge` (`.section-bridge__from`, `.section-bridge__to`).

## Related files

| Task | File(s) |
|---|---|
| Chart rendering + annotation bands/labels | `app.js` (`annotationPlugin`, chart builders) |
| Timeline and autoplay | `app.js` (`TIMELINE`, `renderTimeline`, `wireTimelineAutoscroll`) |
| Results scrolly behavior | `scrolly-results.js` |
| TOC + breadcrumb active step | `app.js` (`wireTOC`, `updateArgumentBreadcrumb`) |
| Page-level design and responsive behavior | `styles.css` |
| Print output | `print.css` |
