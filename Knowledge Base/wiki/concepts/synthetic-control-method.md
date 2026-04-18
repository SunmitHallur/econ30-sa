---
title: "Concept: Synthetic Control Method (SCM)"
related:
  - "[[apartheid-era-sanctions]]"
  - "[[sanctions-and-trade]]"
summaries:
  - "[[sanctions-synthetic-control-south-africa]]"
last_updated: 2026-04-17
tags:
  - concept
  - method
  - econometrics
---

## What it is

The **Synthetic Control Method (SCM)** is a comparative case-study technique for estimating the effect of a large-scale policy or shock on a single treated unit (a country, region, or city), introduced by Abadie & Gardeazabal (2003) and generalised by Abadie, Diamond & Hainmueller (2010, 2015).

## The idea

Given:

- One treated unit $j = 1$ affected at time $T_0$ by a policy / shock.
- A donor pool $j = 2, \ldots, J+1$ of units **not** affected by the same shock.
- A vector of pre-period predictors $X_j$ (covariates and outcome lags).

SCM constructs a **synthetic treated unit** as a convex combination of donors,

\[ Y^{\text{synth}}_{1t} = \sum_{j=2}^{J+1} w_j Y_{jt}, \quad w_j \ge 0, \sum_j w_j = 1, \]

with weights $w^*$ chosen to minimise the pre-period distance between $X_1$ and $\sum_j w_j X_j$. The **treatment effect** at $t > T_0$ is the gap $\hat\tau_t = Y_{1t} - Y^{\text{synth}}_{1t}$.

## Why it fits the SA-sanctions question

- SA in 1985 is a single large unit.
- The shock (sanctions) is localised in time and identifiable.
- A rich donor pool of middle-income, non-communist, non-sanctioned economies exists.
- Long pre-period (1960–1984) allows good fit; long post-period (1985–2010) allows detection of hysteresis.

See [[sanctions-synthetic-control-south-africa|Uhuru (2020)]] for the SA application and [[sanctions-impact-south-african-exports|Evenett (2002)]] for the complementary bilateral-trade gravity-equation approach.

## Assumptions

1. **No spillovers** from treated unit to donors.
2. **No unobserved confounders** that differentially affect treated and synthetic after $T_0$.
3. **Convex hull assumption**: the treated unit's pre-treatment features lie inside the convex hull of donor features (otherwise extrapolation).
4. **Sufficient pre-period** to fit $w^*$ reliably.

## Inference

- **Placebo tests**: re-run SCM treating each donor as if it were the treated unit; the distribution of placebo gaps benchmarks the treated unit's gap. A significance measure is the rank of the treated unit's post/pre RMSPE ratio.
- **In-time placebos**: move the treatment date backwards; if gaps appear at the placebo date, identification is compromised.
- **Leave-one-out**: drop one donor at a time to check weight robustness.

## Extensions relevant to the knowledge base

- **Generalised SCM** (Xu 2017) — interactive fixed effects.
- **Augmented SCM** (Ben-Michael, Feller & Rothstein 2021) — ridge / OLS bias correction.
- **SCM with time-varying treatment intensity** — useful when sanctions ramp up or are lifted gradually.

## Canonical references

- Abadie, A. & Gardeazabal, J. (2003). "The economic costs of conflict: A case study of the Basque Country." *AER*.
- Abadie, A., Diamond, A. & Hainmueller, J. (2010). "Synthetic control methods for comparative case studies." *JASA*.
- Abadie, A., Diamond, A. & Hainmueller, J. (2015). "Comparative politics and the synthetic control method." *AJPS*.
- Gharehgozli, O. (2017). "An estimation of the economic cost of recent sanctions on Iran using the synthetic control method." *Economics Letters*.
