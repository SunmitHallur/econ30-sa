---
title: "Dataset summary: sa_wdi_panel.csv (World Bank WDI extract for South Africa, 1990–2023)"
sources:
  - raw/data/sa_wdi_panel.csv
related:
  - "[[world-bank-wdi]]"
  - "[[south-africa-macro-panel]]"
  - "[[inequality-in-south-africa]]"
  - "[[labour-market-south-africa]]"
  - "[[trade-liberalisation-south-africa]]"
last_updated: 2026-04-17
tags:
  - data
  - wdi
  - panel
  - macro
---

## File

`raw/data/sa_wdi_panel.csv` — 34 rows × 7 columns, 1990 → 2023, one row per calendar year.

## Columns

| column | meaning | WDI code (source) |
|---|---|---|
| `year` | Calendar year | — |
| `gini` | Gini index (survey years only) | `SI.POV.GINI` |
| `gdp_pc_constant_usd` | GDP per capita, constant 2015 USD | `NY.GDP.PCAP.KD` |
| `gdp_growth_pct` | Real GDP growth, % | `NY.GDP.MKTP.KD.ZG` |
| `trade_pct_gdp` | Trade (exports + imports) as % of GDP | `NE.TRD.GNFS.ZS` |
| `fdi_net_inflows_pct_gdp` | FDI net inflows, BoP, % of GDP | `BX.KLT.DINV.WD.GD.ZS` |
| `unemployment_ilo_pct` | Unemployment, ILO-modelled, % of labour force (15+) | `SL.UEM.TOTL.ZS` |

## Key stylised facts visible in the panel

- **Trade openness** roughly doubled over 1990–2008: 38% → 66% of GDP, then fluctuated 50–65% post-GFC.
- **FDI is volatile** — mostly 0–3% of GDP, with a single spike to 9.7% in 2021 (Prosus/Naspers unbundling).
- **Unemployment** rose from ~22% in the mid-1990s to ~34% in 2021, with a pandemic-driven jump in 2020–21.
- **GDP per capita** grew from about USD 4 500 (1990) to a peak of USD 6 170 (2013), then stagnated.
- **Gini** is only available in survey years (1993, 2000, 2005, 2008, 2010, 2014, 2022); values hover around 0.60–0.65 and are consistent with the top-decile income shares reported in the WID data and in [[wealth-inequality-lab-south-africa|Chatterjee-Czajka-Gethin (2021)]].

## Usage in the project

- Drives the **national time-series chart** on the website (gdp_pc, unemployment, trade, FDI).
- Provides the national-level benchmark against which provincial Stats SA QLFS numbers are compared in the interactive map.
- Serves as the reconciliation set for cross-checks against WID and Stats SA series.

## Caveats

- Unemployment is the **ILO-modelled** (WDI) series, which applies ILO harmonisation to national QLFS inputs; it therefore differs **in definition** from the **strict (official) unemployment rate** published by Stats SA in the [[stats-sa-qlfs-p0211-2023q3|QLFS Q3 2023]] and [[stats-sa-qlfs-p0211-2025q1|QLFS Q1 2025]] releases. Do not compare the two definitions without explicit alignment.
- Gini has gaps; do not interpolate without documenting the imputation.
- Trade openness is nominal — real openness trends (accounting for terms-of-trade effects) require deflated series from SARB Quarterly Bulletin.

## Sources

- World Bank, *World Development Indicators* (WDI), via api.worldbank.org.
- Snapshot taken April 10, 2026 — see the file's mtime for the exact timestamp.
