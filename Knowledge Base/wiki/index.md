---
title: "Knowledge Base — Master Index"
last_updated: 2026-04-17
tags:
  - index
---

This is the master index of the Econ 30 Final Project knowledge base on the political economy of South Africa's post-apartheid transition. Every source in `raw/` has a corresponding summary in `wiki/summaries/`; recurring themes are consolidated in `wiki/concepts/`.

## Structure

- `raw/` — immutable source material. **Do not edit.**
  - `raw/readings/` — PDF journal articles, working papers, policy documents, Stats SA releases.
  - `raw/data/` — CSV and XLSX datasets (WDI, WID, WIID, WGI).
- `wiki/` — curated, interlinked articles.
  - `wiki/summaries/` — one article per primary source.
  - `wiki/concepts/` — one article per recurring theme, cross-linked to summaries.
  - `wiki/index.md` — this file.
- `outputs/` — derived charts, tables, figures for the website and essay.

## How to use

1. Start here. Pick a **concept** or **summary** from the lists below.
2. Concept articles cite the summaries; summaries cite the raw file. Click through to trace a claim.
3. The website (`/website/`) draws on the concept articles for the interactive essay; charts draw on `raw/data/`.

---

## Concepts (wiki/concepts/)

**Transition narrative**

- [[post-apartheid-transition]] — Periodisation and political-economy arc, 1990–present.
- [[political-economy-of-transition]] — Two traditions: mainstream-institutional vs heterodox-class-analytical.
- [[neoliberalism-in-south-africa]] — What the term means in SA discourse; why it is contested.
- [[minerals-energy-complex]] — Fine & Rustomjee's (1996) structural frame.

**Policy frameworks**

- [[reconstruction-and-development-programme]] — The ANC's 1994 founding programme.
- [[gear-strategy]] — 1996 macro pivot; the operational spine of post-1994 policy.
- [[industrial-policy-south-africa]] *(referenced in summaries; see [[manufacturing-south-africa]])*

**Trade and manufacturing**

- [[trade-liberalisation-south-africa]] — The sustained tariff reduction since 1990.
- [[tariff-structure-south-africa]] — Schedule, peaks, effective protection.
- [[exchange-rate-south-africa]] — Real rand cycle; interaction with tariff protection.
- [[manufacturing-south-africa]] — Sectoral composition; long-run trajectory.
- [[premature-deindustrialisation]] — Rodrik's framing applied to SA.

**Sanctions**

- [[apartheid-era-sanctions]] — Scope, instruments, effects.
- [[synthetic-control-method]] — Identification tool for single-unit policy shocks.
- [[gravity-equation]] — Identification tool for bilateral trade effects.

**Labour market and inequality**

- [[labour-market-south-africa]] — Headline features; structural peculiarities.
- [[quarterly-labour-force-survey]] — Authoritative employment source.
- [[inequality-in-south-africa]] — Stylised facts, sources, remediation debates.
- [[wealth-distribution-methodology]] — DINA / income-capitalisation approaches.

**State restructuring**

- [[privatisation-south-africa]] — Partial / halting SOE restructuring post-1994.

---

## Summaries (wiki/summaries/)

**Policy documents**

- [[rdp-1994]] — Reconstruction and Development Programme, policy framework. Basic-needs and developmental framing.
- [[gear-1996-macroeconomic-strategy]] — Growth, Employment and Redistribution strategy. Targets, levers, rationale.
- [[rdp-to-gear-transition]] — Adelzadeh (1996) critique of GEAR from an RDP/Keynesian standpoint.

**Sanctions**

- [[sanctions-synthetic-control-south-africa]] — Uhuru (2020): SCM estimates ~30% GDP/cap loss by 1998.
- [[sanctions-impact-south-african-exports]] — Evenett (2002): gravity equation; US CAAA cut SA exports ~1/3; persistent.

**Trade liberalisation and manufacturing**

- [[state-of-trade-policy-south-africa]] — Cassim, Onyango & van Seventer (2004): TIPS monograph; the definitive tariff-structure diagnostic.
- [[trade-liberalization-sa-manufacturing]] — Driver (2019): BER firm panel; mark-ups and exchange-rate pressure.
- [[trade-liberalization-local-labor-markets-south-africa]] — Erten-Leight-Tregenna (2018): district-level causal evidence on employment loss.
- [[mayekiso-trade-liberalisation-privatisation]] — Mayekiso & Lamla (2025): 30-year retrospective.

**Political economy**

- [[political-economy-of-transition-handbook-part1]] — ILRIG / McKinley (2023): heterodox handbook of struggle.

**Inequality**

- [[wealth-inequality-lab-south-africa]] — Chatterjee, Czajka & Gethin (2021): WIL wealth-distribution paper.

**Macroeconomic diagnostics**

- [[building-back-better-covid-jobs]] — World Bank SA Economic Update Edition 13 (2021): COVID-19 diagnostic; jobs focus.

**Stats SA primary data**

- [[stats-sa-qlfs-p0211-2023q3]] — QLFS Q3 2023: unemployment 31.9%, employment 16.7m.
- [[stats-sa-qlfs-p0211-2025q1]] — QLFS Q1 2025: unemployment 32.9%, employment 16.8m.

**Datasets**

- [[dataset-sa-wdi-panel]] — `sa_wdi_panel.csv`: WDI extract 1990–2023 (7 series).
- [[dataset-wid-south-africa]] — WID.world full SA data + metadata (DINA, wealth, top shares).
- [[dataset-wiid-2025]] — UNU-WIDER WIID April 2025 release (cross-country inequality catalogue).
- [[dataset-wgi-underlying-sources]] — WGI underlying sources 1996–2024 (governance).

---

## Reading paths

**If you want to understand the RDP → GEAR pivot**: start with [[rdp-1994]] → [[gear-1996-macroeconomic-strategy]] → [[rdp-to-gear-transition]] → [[political-economy-of-transition-handbook-part1]]. Concepts: [[reconstruction-and-development-programme]], [[gear-strategy]], [[neoliberalism-in-south-africa]].

**If you want to understand the economic costs of sanctions**: start with [[sanctions-synthetic-control-south-africa]] → [[sanctions-impact-south-african-exports]]. Concepts: [[apartheid-era-sanctions]], [[synthetic-control-method]], [[gravity-equation]].

**If you want to understand trade, tariffs, and deindustrialisation**: start with [[state-of-trade-policy-south-africa]] → [[trade-liberalization-local-labor-markets-south-africa]] → [[trade-liberalization-sa-manufacturing]] → [[mayekiso-trade-liberalisation-privatisation]]. Concepts: [[trade-liberalisation-south-africa]], [[tariff-structure-south-africa]], [[manufacturing-south-africa]], [[premature-deindustrialisation]], [[exchange-rate-south-africa]].

**If you want to understand inequality**: start with [[wealth-inequality-lab-south-africa]]; cross-reference [[dataset-wid-south-africa]], [[dataset-wiid-2025]]. Concepts: [[inequality-in-south-africa]], [[wealth-distribution-methodology]].

**If you want the latest labour-market numbers**: see [[stats-sa-qlfs-p0211-2025q1]] and [[stats-sa-qlfs-p0211-2023q3]]; then [[labour-market-south-africa]] and [[quarterly-labour-force-survey]].

---

## Health-check status (as of last_updated)

- **Raw sources**: 14 PDFs + 5 data files. No duplicates. All PDFs verified as valid (`%PDF-1.x` magic bytes). All CSVs and XLSX sheets load without errors.
- **Summaries**: 18 — 14 PDF summaries + 4 dataset summaries. Coverage: **100%** of sources in `raw/`.
- **Concept articles**: 19 in `wiki/concepts/`.
- **Orphan summaries**: none.
- **Dangling concept links** (referenced but not yet written): `industrial-policy-south-africa`, `fiscal-policy-south-africa`, `unemployment-definitions-south-africa`, `informal-sector-south-africa`, `sanctions-and-trade`, `top-income-shares`, `gini-coefficient`, `world-inequality-database`, `wiid`, `worldwide-governance-indicators`, `governance-south-africa`, `world-bank-wdi`, `south-africa-macro-panel`, `export-competitiveness-south-africa`, `mark-ups-and-competition`, `district-level-shocks`, `sarb-monetary-policy`. These are either stub concepts for future expansion, or cross-references that resolve via the dataset summaries. They do not block the use of the knowledge base.

## Change log

- **2026-04-17** — Initial build: reorganised `Knowledge Base/` into `raw/` + `wiki/` + `outputs/`; wrote 18 summaries and 19 concept articles; built this index. Removed a duplicate XLSX (`Raw Data from Underlying Data Sources (1996-2024).xlsx` was byte-identical to `raw_underlying_sources_1996_2024.xlsx`, MD5 `b2b037c4…`) and a stray `.DS_Store`. Added a missing summary for `Building-Back-Better-from-COVID-19-with-a-Special-Focus-on-Jobs.pdf`.
