---
title: "Dataset summary: WID_data_ZA.csv / WID_metadata_ZA.csv (World Inequality Database, South Africa)"
sources:
  - raw/data/WID_data_ZA.csv
  - raw/data/WID_metadata_ZA.csv
  - raw/data/WID_countries.csv
related:
  - "[[world-inequality-database]]"
  - "[[inequality-in-south-africa]]"
  - "[[wealth-distribution-methodology]]"
  - "[[top-income-shares]]"
last_updated: 2026-04-17
tags:
  - data
  - inequality
  - wid
  - dina
---

## Files

- `raw/data/WID_data_ZA.csv` — 1 063 336 observations × 7 columns (~41 MB). The full WID data dump for South Africa.
- `raw/data/WID_metadata_ZA.csv` — 1 660 variable × age × population rows × 19 columns. Variable-level metadata with sources, methods, and extrapolation notes.
- `raw/data/WID_countries.csv` — WID country catalogue (alpha-2, titlename, shortname, region). Useful only for joining to other WID country files.

## Data model

`WID_data_ZA.csv`:

| column | meaning |
|---|---|
| `country` | ISO-2 (`ZA`) |
| `variable` | WID variable code (e.g. `sptinc992j` = share of pre-tax national income, adults, year) |
| `percentile` | e.g. `p0p100`, `p90p100`, `p99p100`, `p0p50` |
| `year` | Calendar year (data go back to 1820 for a few series; most start 1950s–1990s) |
| `value` | The data point (monetary values in ZAR, shares in 0–1) |
| `age` | `992` = adults, `999` = all ages |
| `pop` | `i` = individuals, `j` = equal-split adults, `f` = females |

`WID_metadata_ZA.csv` — for every `variable × age × pop`, provides:

- `simpledes` / `technicaldes` — human-readable description.
- `longtype` — average / share / threshold / total / number / ratio.
- `unit` — e.g. ZAR.
- `source` and `method` — free text describing the fiscal + survey + national-accounts inputs.
- `extrapolation` — year-by-year imputation method, often linking to SA-SARS, OECD SNA, UN SNA, and the DINA guidelines.

## What's in it (subject coverage)

- **Distributional National Accounts (DINA)**: pre-tax and post-tax national income shares and averages by percentile (e.g. top 10%, top 1%, top 0.1% shares).
- **Personal wealth** shares and averages (`hweal` family).
- **National-accounts subcomponents**: consumption of fixed capital, mixed income, compensation of employees, operating surplus, by institutional sector (corporations, government, households) and age cut-off.
- **Demographic and price variables**: population, mortality-adjusted adults, PPP, CPI, GDP deflator.
- **Factor-share estimates** derived from the Dietrich-Nievas-Odersky-Piketty-Somanchi (2025) Technical Note on factor shares.

## Canonical series to extract for the project

For the project's inequality narrative, the following percentile × variable pairs are the most useful:

- `sptinc992j` × `p99p100` — top 1% share of pre-tax national income, adults, equal-split.
- `sptinc992j` × `p90p100` — top 10% share.
- `sptinc992j` × `p0p50` — bottom 50% share.
- `shweal992j` × `p99p100`, `p90p100`, `p0p50` — corresponding wealth shares.
- `aptinc992j` × `pall` — average pre-tax income, adults (for levels).
- `ahweal992j` × `pall` — average wealth.

These underlie the [[wealth-inequality-lab-south-africa|WIL (2021)]] figures and are the **source** for the most-cited South-African inequality statistics (e.g. "top 10% hold ~85% of wealth").

## Caveats

- Pre-1980 estimates are back-extrapolated from fiscal data and should be treated as indicative, not measurement.
- 2019–2024 figures are frequently imputed from trend components (see the `extrapolation` column for every variable × year); for policy claims about the most recent years, prefer Stats SA / SARS microdata where available.
- Distinguish **national accounts** vs **household survey** vs **tax** inputs; for SA, the post-2010 WID rests heavily on SARS PIT microdata (via SA-TIED).
- Currency is **ZAR**, mostly in current-year values; use the WID `inyixx999i` deflator before comparing years.

## Sources

- World Inequality Database (WID.world), accessed April 1, 2026.
- DINA methodology: *Distributional National Accounts Guidelines 2020*, WID.
- Factor-share series: Dietrich, Nievas, Odersky, Piketty & Somanchi (2025), *Extending WID National Accounts Series*.
