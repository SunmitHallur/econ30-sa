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
| 0 | `hero` | `#chart-hero`, `.hero-thesis-pull`, `.hero-data-note` |
| 0.5 | n/a | `.argument-summary` (new thesis anchor card) |
| 1 | `question` | `#hand-scroll-ink`, `.question-big` |
| 2 | `from-the-ground` | `.ground-sequence`, `.inline-voice` |
| 3 | `timeline` | `#timeline-shell`, `#timeline-scroll`, `#timeline-list` |
| 4 | `macro` | `#chart-indexed`, `#chart-unemployment` |
| 5 | `inequality` | `#chart-income-shares`, `#chart-wealth-shares`, `#chart-gini`, `#chart-scatter-top10-trade` |
| 6 | `governance` | `#chart-wgi`, `#wgi-show-context` |
| 7 | `results` | `.result-chips`, `#headline-table`, `#all-table`, `#dw-filter` |
| 8 | `map` | `#za-map` |
| 9 | `conclusions` | `.conclusion-grid`, `#quote-orbit` |
| 10 | `sources` | dataset/policy/causal cards, `.citation-card` |

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
