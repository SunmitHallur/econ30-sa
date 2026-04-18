---
title: "Summary: Stats SA Quarterly Labour Force Survey, Q3 2023 (P0211)"
sources:
  - raw/readings/stats_sa_qlfs_p0211_2023q3.pdf
related:
  - "[[quarterly-labour-force-survey]]"
  - "[[labour-market-south-africa]]"
  - "[[unemployment-definitions-south-africa]]"
last_updated: 2026-04-17
tags:
  - statistics
  - labour-market
  - stats-sa
  - primary-source
---

## Bibliographic details

- **Publisher:** Statistics South Africa (Stats SA), ISIbalo House, Pretoria
- **Release:** 14 November 2023
- **Series:** P0211, Quarterly Labour Force Survey, Quarter 3 2023 (Jul–Sep)
- **Format:** Statistical release + tables + sampling-variability tables (~133 pages)

## Why it matters

The QLFS is the **authoritative** household-based labour-force measurement in South Africa, covering persons 15–64. It provides the **strict (official)** and **expanded** unemployment definitions and is the source for employment-by-industry, occupation, province, and education counts. It is what Stats SA feeds into World Bank WDI, ILO, and SARB.

## Key labour-market indicators, Q3 2023

| Indicator | Jul–Sep 2022 | Apr–Jun 2023 | Jul–Sep 2023 |
|---|---|---|---|
| Population 15–64 (000s) | 40 322 | 40 746 | 40 886 |
| Labour force (000s) | 23 491 | 24 268 | 24 594 |
| Employed (000s) | 15 765 | 16 346 | **16 745** |
| — Formal (non-agric) | 10 835 | 11 329 | 11 616 |
| — Informal (non-agric) | 2 971 | 3 029 | 3 058 |
| — Agriculture | 873 | 894 | 956 |
| — Private households | 1 088 | 1 093 | 1 116 |
| Unemployed (000s) | 7 725 | 7 921 | **7 849** |
| Not economically active | 16 831 | 16 478 | 16 292 |
| — Discouraged work-seekers | 3 514 | 3 182 | 3 156 |
| **Unemployment rate (%)** | 32.9 | 32.6 | **31.9** |
| Absorption ratio (%) | 39.1 | 40.1 | 41.0 |
| Labour-force participation (%) | 58.3 | 59.6 | 60.2 |

## Highlights from the release

- Employment **increased by 399 000** q/q and by 979 000 y/y — the eighth consecutive q/q increase since Q4 2021.
- Unemployment rate **fell by 0.7 pp to 31.9%** — primarily driven by movements from "not economically active" and "unemployed" into "employed".
- Formal-sector gains (+287 000 q/q) concentrated in **Finance (+230 000), Construction (+122 000), and Community & social services (+101 000)**.
- Formal-sector losses in **Manufacturing (−70 000)**, Transport, Mining, Trade, Utilities.
- Informal-sector gains in Trade, Transport, and Manufacturing.
- Year-on-year, Manufacturing lost **123 000** jobs; Utilities lost 3 000; all other major industries grew.

## Methodology notes

- Sample: rotating panel of dwelling units, 15 000 across the country; response rate ~80%.
- **Strict (official) unemployment:** persons 15–64 who (i) did not work in the reference week, (ii) actively searched, (iii) available to start.
- **Expanded unemployment:** includes discouraged work-seekers (no longer actively searching but available). The Q3 2023 expanded rate is substantially higher than the 31.9% strict rate.
- Estimates are calibrated to post-Census 2011 mid-year population estimates; revisions apply when population weights are updated.

## Use in the project

- Source for the **national unemployment time series** in `raw/data/sa_wdi_panel.csv` and in the project website's charts.
- Benchmark for **provincial unemployment** in the interactive map (the tooltip values are approximations of the Q4 2023 strict rates; the P0211 Appendix 1 Table 2.3 and 2.7 contain the authoritative provincial splits).

## Sources

- `raw/readings/stats_sa_qlfs_p0211_2023q3.pdf` — Statistics South Africa (2023). *Quarterly Labour Force Survey, Quarter 3: 2023.* Statistical Release P0211, Pretoria.
