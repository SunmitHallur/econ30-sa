---
title: "Dataset summary: WIID-29APR2025.xlsx (UNU-WIDER World Income Inequality Database, April 2025 release)"
sources:
  - raw/data/WIID-29APR2025.xlsx
related:
  - "[[inequality-in-south-africa]]"
  - "[[gini-coefficient]]"
  - "[[wiid]]"
  - "[[top-income-shares]]"
last_updated: 2026-04-17
tags:
  - data
  - inequality
  - wider
  - cross-country
---

## File

`raw/data/WIID-29APR2025.xlsx` — one sheet (`Sheet1`), 80 columns. A cross-country panel of income-distribution statistics maintained by UNU-WIDER. The 29 April 2025 release is the most recent as of the project's cut-off.

## Key columns (by group)

**Identification / geography:**

- `id`, `country`, `c3` (ISO-3), `c2` (ISO-2), `year`
- `region_un`, `region_un_sub`, `region_wb`, `eu`, `oecd`, `incomegroup`

**Headline distribution metrics:**

- `gini` — Gini coefficient (0–100 scale in WIID).
- `palma` — Palma ratio (top 10% / bottom 40%).
- `ratio_top20bottom20` — 80/20 ratio.
- `ge0`, `ge1`, `ge2` — generalised entropy indices (MLD, Theil T, Theil T squared).
- `a025`, `a050`, `a075`, `a1`, `a2` — Atkinson indices at aversion parameters ε = 0.25, 0.50, 0.75, 1.0, 2.0.

**Quantile shares:**

- `q1 … q5` — quintile shares.
- `d1 … d10` — decile shares.
- `bottom40`, `bottom5`, `top5` — auxiliary.

**Survey metadata (very rich):**

- `resource`, `resource_detailed` — income concept (market, disposable, consumption, earnings).
- `scale`, `scale_detailed` — equivalised, per capita, household total.
- `sharing_unit`, `reference_unit` — household vs individual.
- `areacovr`, `popcovr` — geographic and population coverage.
- `source`, `source_detailed`, `source_comments`, `survey`, `link`.
- `quality`, `quality_score`, `revision` — WIDER's quality grading.

**Macro anchors:**

- `mean`, `median` — in local currency; plus `mean_usd`, `median_usd`.
- `currency`, `reference_period`, `exchangerate`.
- `gdp`, `population`.

**Decomposition (for multi-observation countries):**

- `pop_share`, `inc_share`.
- `w_ge0` … `w_a1`, `b_ge0` … `b_a1` — within/between group GE and Atkinson.
- `wiidcompanion` — flag for WIID Companion inequality series.

## South African coverage

WIID contains multiple income-distribution observations per year for SA, with variation by source (IES, LCS, NIDS) and concept (market, disposable, consumption, per capita vs equivalised). This is the right data source to **reconcile different SA Gini estimates** (e.g. 0.63 vs 0.67 vs 0.68) because the database carries the conceptual metadata needed to explain the gap.

## Usage

- Cross-country benchmarking of SA inequality against comparators.
- Methodological reconciliation of Gini estimates across surveys / concepts.
- Cross-validation against WID percentile shares and World Bank Poverty and Inequality Platform (PIP).

## Caveats

- WIID is **a harmonised catalogue, not a harmonised series**. Each observation preserves its original source concept; users must filter on `resource`, `scale`, and `sharing_unit` before comparing across countries or years.
- The `quality_score` (1–5) should be used as a filter; SA observations vary in quality.
- Population-weighted regional averages that ignore these filters produce misleading headlines.

## Sources

- UNU-WIDER, *World Income Inequality Database (WIID)*, version 29 April 2025, https://www.wider.unu.edu/database/wiid.
