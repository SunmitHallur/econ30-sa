# `index.html` section map (post-redesign)

Use this map for targeted edits after the visual-essay redesign.

## Shell and global UI

| Block | Notes |
|---|---|
| `<head>` | SEO/social tags (`og:*`, `twitter:card`), JSON-LD, `print.css` |
| Top bar | `.topbar`, `.topnav` (5 grouped links), `#theme-toggle`, `#essay-guide-launcher` |
| Argument trail | `.arg-breadcrumb` (sticky step chips) |
| Floating indicator | `.section-indicator` fallback |

## Narrative structure (`<main id="main">`)

| Order | Section `id` | Main hooks |
|---|---|---|
| 0 | `hero` | `.hero-photo-card`, `.hero-thesis-pull`, `.hero-data-note` (photo-only after Spring 2026 feedback) |
| 1 | `question` | `.question-big`, JSE 1893 figure |
| 2 | `from-the-ground` | `.ground-compare` (inner vs outer city photos) |
| 3 | `timeline` | `#timeline-shell`, `#timeline-scroll`, `#timeline-list` |
| 4 | `macro` | `#chart-indexed` (now 3 distinct hues), `#chart-unemployment` |
| 5 | `sectors` | `.sector-stats-card`, `#chart-sector-shares`, `#chart-manuf-decline` |
| 6 | `inequality` | `#chart-income-shares`, `#chart-wealth-shares` |
| 7 | `two-lives` | `#two-lives-app`, `#tl-stage` — interactive perspective engine (`two-lives.js` + `data/two-lives.json`) |
| 8 | `results` | `.results-summary-card`, `.results-detail-toggle`, `.result-chips`, `#headline-table` |
| 9 | `map` | `.map-spread-insight`, `#chart-prov-spread`, `#za-map` |
| 10 | `conclusions` | `.conclusion-grid`, `#quote-orbit` |
| 11 | `sources` | dataset/policy/causal cards, `.citation-card` |

## Transition cards

Between every major section: `.section-bridge` (`.section-bridge__from`, `.section-bridge__to`).

## Related files

| Task | File(s) |
|---|---|
| Chart rendering + annotation bands/labels | `app.js` (`annotationPlugin`, chart builders) |
| Timeline and autoplay | `app.js` (`TIMELINE`, `renderTimeline`, `wireTimelineAutoscroll`) |
| Two Lives interactive | `two-lives.js` (engine), `data/two-lives.json` (content) |
| Results scrolly behavior | `scrolly-results.js` |
| TOC + breadcrumb active step | `app.js` (`wireTOC`, `updateArgumentBreadcrumb`) |
| Essay Guide (walkthrough + Q&A) | `essay-guide.js`, `data/tour.json`, `data/essay_corpus.json` (built by `scripts/build_essay_corpus.py`) |
| Optional LLM answers | `api/chat.ts` at repo root (falls back to client retrieval if no API key) |
| Page-level design and responsive behavior | `styles.css` |
| Print output | `print.css` |
