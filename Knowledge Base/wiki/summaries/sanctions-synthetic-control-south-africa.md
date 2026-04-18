---
title: "Summary: Evaluating the Impact of Economic Sanctions on South Africa — A Synthetic Control Approach (Uhuru, 2020)"
sources:
  - raw/readings/sanctions_synthetic_control_south_africa.pdf
related:
  - "[[apartheid-era-sanctions]]"
  - "[[synthetic-control-method]]"
  - "[[post-apartheid-transition]]"
  - "[[sanctions-and-trade]]"
last_updated: 2026-04-17
tags:
  - sanctions
  - econometrics
  - synthetic-control
  - apartheid
---

## Bibliographic details

- **Author:** Malebo Uhuru (MLBUHU001), supervisor Dr Grieve Chelwa
- **Institution:** Development Finance Centre (DEFIC), Graduate School of Business, University of Cape Town
- **Year:** February 2020 (MCom dissertation, 70 pages)

## Research question

What are the economic costs that South Africa suffered because of the UN/US/EC sanctions of 1985–1994, measured as the gap between actual and counterfactual GDP per capita?

## Method

- **Synthetic Control Method (SCM)** à la Abadie & Gardeazabal (2003) and Abadie, Diamond & Hainmueller (2010, 2015).
- Treated unit: South Africa (treatment period 1985–1994).
- Counterfactual ("synthetic SA") built as a weighted average of donor countries that did not face comparable sanctions, matched on pre-treatment predictors (GDP per capita, investment, schooling, population, etc.).
- Follows Gharehgozli (2017) on Iran.

## Main results

- **Sanctions reduced SA's GDP per capita by about 30% relative to synthetic SA by 1998** — i.e. four years after sanctions were lifted.
- The treatment effect is **largest after sanctions end**, indicating a substantial **lag effect** (hysteresis).
- Placebo tests: SA's effect is larger than all donor-pool placebos except the Philippines; significant at the 10% threshold.
- Results are robust to donor-pool composition (drop Mexico, Peru, Argentina separately).
- A "false treatment" placebo dated to 1980 does not generate a significant gap — supporting the 1985 identification.

## Why the lag?

The dissertation argues the lag reflects:

- Persistent hysteresis in trade and investment relationships (foreign firms slow to return after divestment).
- Reputational / risk-premium effects on capital inflows.
- Delayed pass-through of supply-side shocks (industries that lost scale during the boycott take time to rebuild).
- Consistent with Evenett's (2002) finding in [[sanctions-impact-south-african-exports|the gravity-equation paper]] that US-CAAA effects persist well after the 1991 repeal.

## Policy implications

- For target nations: sanctions can have **long-lasting** economic consequences that outlive the sanctions regime itself.
- For senders: sanctions are not costless policy tools; they can slow reconstruction for a decade.
- For methodology: SCM is well-suited to single-unit policy shocks with long pre- and post-periods.

## Caveats

- Does not assess the **humanitarian** cost or the **political** contribution of sanctions to ending apartheid (explicitly out of scope — cf. Levy 1999; Crawford & Klotz 1999).
- Treats sanctions as a single binary treatment; does not separate trade vs financial vs arms sanctions.
- Donor pool limited to middle-income non-communist economies.

## How it connects

Pair with [[sanctions-impact-south-african-exports|Evenett (2002)]] for the bilateral-trade-flow channel and with the [[political-economy-of-transition|ILRIG handbook]] for the political-economy narrative of the 1985–1994 crisis.

## Sources

- `raw/readings/sanctions_synthetic_control_south_africa.pdf` — Uhuru, M. (2020). *Evaluating the Impact of Economic Sanctions on South Africa: A Synthetic Control Approach*. MCom dissertation, UCT.
