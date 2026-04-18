---
title: "Concept: Wealth distribution methodology (DINA / income-capitalisation)"
related:
  - "[[inequality-in-south-africa]]"
  - "[[top-income-shares]]"
  - "[[world-inequality-database]]"
summaries:
  - "[[wealth-inequality-lab-south-africa]]"
  - "[[dataset-wid-south-africa]]"
last_updated: 2026-04-17
tags:
  - concept
  - method
  - inequality
---

## Three data-combination approaches

1. **Survey-based**: use household wealth surveys (e.g. HFCS, SA NIDS Wave 5 wealth module).
   - Pros: granular, covers liabilities.
   - Cons: severe top-end under-coverage; households hide financial wealth; non-response correlated with wealth.

2. **Estate-based / inheritance tax microdata**: Piketty-Postel-Vinay-Rosenthal (2006) style.
   - Pros: good for top-wealth-share time series.
   - Cons: SA has no estate-tax microdata of similar scope.

3. **Income-capitalisation**: Saez-Zucman (2016) and Garbinti-Goupille-Lebret-Piketty (2018).
   - Capitalise observed income flows (interest, dividends, rents, capital gains) onto asset classes using asset-class-specific rates of return from macro balance sheets.
   - Separately rescale non-income-yielding assets (owner-occupied housing, currency) using survey distributions and macro totals.
   - Pros: leverages rich tax microdata; pins down the top.
   - Cons: assumes homogeneous rates of return within asset classes; sensitive to the capitalisation-rate estimate.

[[wealth-inequality-lab-south-africa|Chatterjee-Czajka-Gethin (2021)]] follow the **income-capitalisation approach** and document that the three methods disagree most strongly at the top: capitalisation gives a top-10% share of ~85%, while surveys alone give ~70%.

## DINA (Distributional National Accounts) framework

- Anchors **all** distributional estimates to macro totals from national accounts.
- Decomposes macro totals by institutional sector (households, government, corporations).
- Applies distributional weights from microdata (surveys, tax) to match totals.
- Handles both income and wealth distributions in a unified framework.
- Guidelines: *DINA Guidelines* (WID, 2020), https://wid.world/document/distributional-national-accounts-guidelines-2020.

## Implementation steps (South Africa, per WIL 2021)

1. Build yearly totals for each asset class from SARB household-sector balance sheets (housing, pensions & life insurance, bonds, equity, currency; mortgage and other debt).
2. Collect income flows from SARS PIT microdata (IRP5 + ITR12), 2010–2017.
3. Estimate capitalisation rates per asset class.
4. Capitalise flows to stock; rescale non-income-yielding assets.
5. Harmonise across seven income surveys (1993–2015) and 54 QLFS quarters (2000–).
6. Produce percentile × year × variable matrix in ZAR.

## Caveats

- **Rate-of-return heterogeneity** within asset classes biases the top downward (Fagereng et al. 2020 show that rates of return rise with wealth).
- **Offshore wealth** (tax havens) is not directly observable; macro-total reconciliation with Zucman (2013) suggests 10–15% of SA financial wealth is offshore.
- **Housing wealth** requires reliable market-value estimates; SA deeds data are strong but property-transaction prices diverge from imputed values.

## Why it matters

Wealth inequality is the **stock counterpart** to the **flow** (income) inequality measures. SA's extreme wealth concentration — described in [[inequality-in-south-africa]] — is only visible once capitalisation is applied; surveys alone systematically under-state it.

## Sources

- `raw/readings/wealth_inequality_lab_south_africa.pdf` — Chatterjee, Czajka & Gethin (2021).
- WID *DINA Guidelines* (2020).
- Saez & Zucman (2016, QJE); Garbinti, Goupille-Lebret & Piketty (2018, JPubE).
