---
title: "Dataset summary: raw_underlying_sources_1996_2024.xlsx (World Bank WGI underlying data sources, 1996–2024)"
sources:
  - raw/data/raw_underlying_sources_1996_2024.xlsx
  - raw/data/Raw Data from Underlying Data Sources (1996-2024).xlsx
related:
  - "[[worldwide-governance-indicators]]"
  - "[[institutional-quality]]"
  - "[[governance-south-africa]]"
last_updated: 2026-04-17
tags:
  - data
  - governance
  - wgi
  - cross-country
---

## File

`raw/data/raw_underlying_sources_1996_2024.xlsx` — six worksheets corresponding to the six Worldwide Governance Indicators (WGI) dimensions. ~24 MB. The variant `raw/data/Raw Data from Underlying Data Sources (1996-2024).xlsx` appears to be a duplicate; only one needs to be kept in the raw corpus.

## Sheets (one per WGI dimension)

| Sheet | Dimension | Meaning |
|---|---|---|
| `VA` | Voice and Accountability | Perceptions of citizens' ability to participate in government |
| `PV` | Political Stability & Absence of Violence | Likelihood of political instability / politically motivated violence |
| `GE` | Government Effectiveness | Quality of public services, civil service, policy formulation |
| `RQ` | Regulatory Quality | Ability of government to formulate and implement sound regulation |
| `RL` | Rule of Law | Confidence in rules of society; enforcement of contracts, property |
| `CC` | Control of Corruption | Extent to which public power is exercised for private gain |

## Columns (shared schema across all six sheets)

| Column | Meaning |
|---|---|
| `DataSourceCode` | Short code for the underlying survey / index (e.g. AFR = Afrobarometer; ADB = African Development Bank CPIA) |
| `Organization` | Publisher of the underlying source |
| `DataSource` | Name of the underlying instrument |
| `indicator` | Specific question / sub-indicator from the underlying source |
| `econ_code` | ISO-3 country code |
| `econ_name` | Country name |
| `region` | WB region |
| `income_class` | WB income class |
| `production_year` | Year the observation pertains to |
| `wgi_dimension` | Dimension code (`va`, `pv`, `ge`, `rq`, `rl`, `cc`) |
| `value` | The underlying source's raw value |
| `minimum`, `maximum` | Raw scale bounds for `value` |
| `orientation` | +1 = higher is better; −1 = higher is worse (used for sign alignment in WGI aggregation) |

## What makes this file valuable

The public WGI **aggregate** series (e.g. "Control of Corruption, percentile rank") hides the underlying disagreement among sources. This file contains the **full raw inputs** — all 30+ source × indicator × country × year combinations that Kaufmann & Kraay aggregate into each WGI dimension. Analysts can:

- Drill from the aggregate back to the source-level observation (e.g. which Afrobarometer question changed SA's VA score between 2015 and 2020).
- Reconstruct aggregate scores using alternative weightings or subsets (e.g. drop Afrobarometer; keep only business surveys).
- Quantify measurement uncertainty by computing the dispersion across sources for a given country-year.
- Run cross-country governance analyses matched to inequality / trade / growth data in the same panel.

## Usage in the project

- Provides the **institutional-quality** covariates for any synthetic-control or gravity-equation extension (à la [[sanctions-synthetic-control-south-africa|Uhuru 2020]] or [[sanctions-impact-south-african-exports|Evenett 2002]]).
- Anchors the narrative that SA's governance scores **eroded** over the 2010s, especially CC (Control of Corruption) and GE (Government Effectiveness) — relevant to the [[political-economy-of-transition|political-economy]] account of state capture.
- Source of record for the governance dimension of the underlying Python panel used in the website.

## Caveats

- Raw source scales are heterogeneous; comparisons across `DataSourceCode` require rescaling using `minimum`, `maximum`, and `orientation`.
- Some country-year cells are missing for some sources; WGI's aggregation uses an unobserved-components model to handle this.
- The file is labelled 1996–2024 but individual sources have narrower coverage.
- The identical file with a different name suggests an upload duplicate; consolidate before distribution.

## Sources

- World Bank, *Worldwide Governance Indicators* (Kaufmann, Kraay & Mastruzzi), 2024 update, https://www.worldbank.org/en/publication/worldwide-governance-indicators.
