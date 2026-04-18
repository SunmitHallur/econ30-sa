---
title: "Concept: Gravity equation in international trade"
related:
  - "[[sanctions-and-trade]]"
  - "[[trade-liberalisation-south-africa]]"
summaries:
  - "[[sanctions-impact-south-african-exports]]"
last_updated: 2026-04-17
tags:
  - concept
  - method
  - trade
---

## What it is

The **gravity equation** is the workhorse of empirical trade economics. In its basic form, it relates bilateral trade flows to economic mass and bilateral frictions:

\[ T_{ij} = G \frac{Y_i^{\alpha} Y_j^{\beta}}{D_{ij}^{\gamma}} \prod_k e^{\delta_k Z^{(k)}_{ij}} \]

where $T_{ij}$ is bilateral trade from $i$ to $j$; $Y_i, Y_j$ are economic sizes (usually GDP); $D_{ij}$ is bilateral distance; and $Z^{(k)}_{ij}$ are additional frictions (common language, shared border, colonial links, FTA membership, sanctions).

## Why it is relevant to SA sanctions

Sanctions episodes are naturally modelled as **country-pair × time dummies** in a gravity framework:

- For each sending country, introduce a dummy equal to 1 in the sanction period, 0 otherwise.
- Interact with country-pair fixed effects (or importer and exporter FEs).
- The coefficient captures the bilateral trade-flow effect of the sanction policy, conditional on the overall trade-cost structure.

This is the approach of [[sanctions-impact-south-african-exports|Evenett (2002)]] to study the effect of US CAAA and EC sanctions on SA exports.

## Specification choices

- **Structural gravity**: Anderson & van Wincoop (2003) multilateral resistance terms implemented via country-year fixed effects.
- **PPML vs OLS-log**: Silva-Tenreyro (2006) show that log-linear OLS is inconsistent in the presence of heteroskedasticity; PPML handles zeros and heteroskedasticity in one step.
- **Panel vs cross-section**: panel with country-pair FEs absorbs time-invariant bilateral frictions.
- **Outlier robustness**: Evenett flags DFBETAs to identify observations that drive estimated distance and sanction coefficients; these can halve the apparent distance elasticity in North-South samples.

## Canonical references

- Tinbergen, J. (1962). *Shaping the World Economy*. Twentieth Century Fund.
- Anderson, J. E., & van Wincoop, E. (2003). "Gravity with gravitas: a solution to the border puzzle." *AER*.
- Silva, J. S., & Tenreyro, S. (2006). "The log of gravity." *ReStat*.
- Head, K., & Mayer, T. (2014). "Gravity equations: workhorse, toolkit, and cookbook." *Handbook of International Economics*.

## Useful datasets

- **CEPII** (distance, border, language, colony variables).
- **UN Comtrade** (bilateral trade flows).
- **WITS** (for tariff and AVE decomposition).
- **World Bank WDI** for GDP and population anchors.
