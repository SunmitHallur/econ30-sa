#!/usr/bin/env python3
"""
Exploratory regression battery on the merged SA panel.

Design notes
------------
- Small country-level time series (T <= 35). All results are associational.
- Primary specifications: OLS with HAC (Newey-West) SEs at lag 3.
- Multiple hypothesis testing is acknowledged: we report Bonferroni- and
  Benjamini-Hochberg-adjusted p-values alongside raw p-values.
- Robustness windows: full 1990-2023, drop COVID (>=2020), drop GFC (2008-09).
- Additional tests: Chow break at 1996 (GEAR), Engle-Granger cointegration for
  log GDP pc ~ trade/GDP, bivariate Granger causality for trade <-> unemployment.
- Diagnostics on every spec: Durbin-Watson, Breusch-Pagan p, Ljung-Box Q(4) p.
  VIF is reported for multivariate specs (>=2 regressors).

Outputs
-------
- analysis_v2/outputs/regression_results.json
- analysis_v2/outputs/regression_results.md
"""
from __future__ import annotations

import json
import warnings
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats
from statsmodels.stats.diagnostic import acorr_ljungbox, het_breuschpagan
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.stattools import durbin_watson
from statsmodels.tsa.stattools import adfuller, coint, grangercausalitytests

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs"
PANEL = OUT / "sa_panel_full.csv"

HAC_LAGS = 3
SIG = 0.05

# Variables to combine in the exploratory battery.
CORE_VARS = [
    "log_gdp_pc",
    "wdi_gdp_growth",
    "wdi_trade_gdp",
    "wdi_fdi_gdp",
    "wdi_unemployment",
    "wid_top1_inc",
    "wid_top10_inc",
    "wid_bottom50_inc",
    "wid_top10_wealth",
    "wgi_avg",
]

# Prose-friendly labels for the website.
LABELS = {
    "log_gdp_pc": "log GDP per capita",
    "wdi_gdp_pc_usd": "GDP per capita (USD)",
    "wdi_gdp_growth": "GDP growth (%)",
    "wdi_trade_gdp": "Trade / GDP",
    "wdi_fdi_gdp": "FDI / GDP",
    "wdi_unemployment": "Unemployment (ILO, %)",
    "wid_top1_inc": "Top-1% income share",
    "wid_top10_inc": "Top-10% income share",
    "wid_bottom50_inc": "Bottom-50% income share",
    "wid_top10_disp": "Top-10% disposable income share",
    "wid_top10_wealth": "Top-10% wealth share",
    "wid_top1_wealth": "Top-1% wealth share",
    "wgi_avg": "WGI governance (avg, 0-1)",
    "wgi_va": "WGI voice & accountability",
    "wgi_pv": "WGI political stability",
    "wgi_ge": "WGI government effectiveness",
    "wgi_rq": "WGI regulatory quality",
    "wgi_rl": "WGI rule of law",
    "wgi_cc": "WGI control of corruption",
    "gear_era": "GEAR era (1996+)",
    "year_t": "Year index (years since 1990)",
}


def label(name: str) -> str:
    if name.startswith("d_"):
        return "Δ " + LABELS.get(name[2:], name[2:])
    return LABELS.get(name, name)


# ---------------------------------------------------------------------------
# Estimation helpers
# ---------------------------------------------------------------------------

def _diagnostics(model, y, X) -> dict:
    resid = model.resid
    out = {"dw": float(durbin_watson(resid))}
    try:
        bp = het_breuschpagan(resid, X)
        out["bp_pvalue"] = float(bp[1])
    except Exception:
        out["bp_pvalue"] = None
    try:
        lb = acorr_ljungbox(resid, lags=[min(4, max(1, len(resid) // 4))], return_df=True)
        out["lb_pvalue"] = float(lb["lb_pvalue"].iloc[0])
    except Exception:
        out["lb_pvalue"] = None
    # VIF for multivariate specs (skip constant column)
    if X.shape[1] > 2:
        vif = {}
        Xv = X.values
        for i, col in enumerate(X.columns):
            if col == "const":
                continue
            try:
                vif[col] = float(variance_inflation_factor(Xv, i))
            except Exception:
                vif[col] = None
        out["vif"] = vif
    return out


def fit_hac(df: pd.DataFrame, y_name: str, x_names: list[str], lags: int = HAC_LAGS) -> dict:
    sub = df[[y_name, *x_names]].dropna()
    if len(sub) < max(10, len(x_names) + 3):
        return {"status": "insufficient", "n": len(sub)}
    y = sub[y_name]
    X = sm.add_constant(sub[x_names])
    model = sm.OLS(y, X).fit(cov_type="HAC", cov_kwds={"maxlags": lags})
    coef = []
    for name in X.columns:
        coef.append(
            {
                "var": name,
                "label": label(name) if name != "const" else "(intercept)",
                "coef": float(model.params[name]),
                "se": float(model.bse[name]),
                "t": float(model.tvalues[name]),
                "p": float(model.pvalues[name]),
            }
        )
    diag = _diagnostics(model, y, X)
    return {
        "status": "ok",
        "y": y_name,
        "y_label": label(y_name),
        "x": x_names,
        "x_labels": [label(x) for x in x_names],
        "n": int(model.nobs),
        "r2": float(model.rsquared),
        "r2_adj": float(model.rsquared_adj),
        "cov_type": "HAC",
        "hac_lags": lags,
        "coefficients": coef,
        "diagnostics": diag,
        "f_pvalue": float(model.f_pvalue) if model.f_pvalue is not None else None,
    }


# ---------------------------------------------------------------------------
# Exploratory battery
# ---------------------------------------------------------------------------

def _all_specs() -> list[tuple[str, list[str], str]]:
    """Enumerate (y, [x], sample_tag) triples to estimate."""
    specs: list[tuple[str, list[str], str]] = []
    tags = ["full", "no_covid", "no_gfc"]
    for y in CORE_VARS:
        others = [v for v in CORE_VARS if v != y]
        # pairwise
        for x in others:
            for tag in tags:
                specs.append((y, [x], tag))
        # bivariate x-combinations (controls)
        for xs in combinations(others, 2):
            specs.append((y, list(xs), "full"))
    return specs


def sample_mask(df: pd.DataFrame, tag: str) -> pd.Series:
    if tag == "full":
        return pd.Series(True, index=df.index)
    if tag == "no_covid":
        return df["year"] < 2020
    if tag == "no_gfc":
        return ~df["year"].isin([2008, 2009])
    raise ValueError(tag)


def run_ols_battery(df: pd.DataFrame) -> list[dict]:
    results = []
    for y, xs, tag in _all_specs():
        sub = df.loc[sample_mask(df, tag)]
        res = fit_hac(sub, y, xs)
        if res.get("status") != "ok":
            continue
        res["sample"] = tag
        res["spec_id"] = f"{y}~{'+'.join(xs)}|{tag}"
        results.append(res)
    return results


def min_pvalue_of_interest(r: dict) -> float:
    """Smallest p across non-intercept coefficients."""
    ps = [c["p"] for c in r["coefficients"] if c["var"] != "const"]
    return min(ps) if ps else 1.0


# ---------------------------------------------------------------------------
# Specialist tests
# ---------------------------------------------------------------------------

def chow_break(df: pd.DataFrame, y: str, xs: list[str], break_year: int = 1996) -> dict:
    sub = df[[*xs, y, "year"]].dropna()
    if len(sub) < 15:
        return {"status": "insufficient", "n": len(sub)}
    pre = sub[sub.year < break_year]
    post = sub[sub.year >= break_year]
    if len(pre) < 5 or len(post) < 5:
        return {"status": "insufficient", "n_pre": len(pre), "n_post": len(post)}
    X_full = sm.add_constant(sub[xs])
    y_full = sub[y]
    m_full = sm.OLS(y_full, X_full).fit()
    X_pre = sm.add_constant(pre[xs])
    m_pre = sm.OLS(pre[y], X_pre).fit()
    X_post = sm.add_constant(post[xs])
    m_post = sm.OLS(post[y], X_post).fit()
    k = X_full.shape[1]
    ssr_p = m_pre.ssr + m_post.ssr
    f_num = (m_full.ssr - ssr_p) / k
    f_den = ssr_p / (len(sub) - 2 * k)
    if f_den <= 0:
        return {"status": "degenerate"}
    F = f_num / f_den
    p = 1 - stats.f.cdf(F, k, len(sub) - 2 * k)
    return {
        "status": "ok",
        "y": y,
        "y_label": label(y),
        "x": xs,
        "x_labels": [label(x) for x in xs],
        "break_year": break_year,
        "n": len(sub),
        "n_pre": len(pre),
        "n_post": len(post),
        "F": float(F),
        "p": float(p),
    }


def cointegration_check(df: pd.DataFrame, y: str, x: str) -> dict:
    sub = df[[y, x]].dropna()
    if len(sub) < 15:
        return {"status": "insufficient", "n": len(sub)}
    try:
        adf_y = adfuller(sub[y], autolag="AIC")
        adf_x = adfuller(sub[x], autolag="AIC")
        t_stat, p_val, _ = coint(sub[y], sub[x])
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": str(exc)}
    return {
        "status": "ok",
        "y": y,
        "y_label": label(y),
        "x": x,
        "x_label": label(x),
        "n": len(sub),
        "adf_y_p": float(adf_y[1]),
        "adf_x_p": float(adf_x[1]),
        "eg_stat": float(t_stat),
        "eg_p": float(p_val),
    }


def granger(df: pd.DataFrame, y: str, x: str, max_lag: int = 3) -> dict:
    sub = df[[y, x]].dropna()
    if len(sub) < 15:
        return {"status": "insufficient", "n": len(sub)}
    try:
        out = grangercausalitytests(sub[[y, x]], maxlag=max_lag, verbose=False)
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "error": str(exc)}
    p_by_lag = {str(lag): float(out[lag][0]["ssr_ftest"][1]) for lag in out}
    return {
        "status": "ok",
        "y": y,
        "y_label": label(y),
        "x": x,
        "x_label": label(x),
        "description": f"Does {label(x)} Granger-cause {label(y)}?",
        "n": len(sub),
        "p_by_lag": p_by_lag,
    }


# ---------------------------------------------------------------------------
# Multiple-testing corrections
# ---------------------------------------------------------------------------

def adjust_pvalues(specs: list[dict]) -> None:
    # Flatten: per-spec min p among non-intercept regressors.
    ps = np.array([min_pvalue_of_interest(r) for r in specs])
    m = len(ps)
    if m == 0:
        return
    # Bonferroni
    bonf = np.minimum(ps * m, 1.0)
    # Benjamini-Hochberg step-up
    order = np.argsort(ps)
    ranked = ps[order]
    bh = np.empty_like(ranked)
    prev = 1.0
    for i in range(m - 1, -1, -1):
        raw = ranked[i] * m / (i + 1)
        prev = min(prev, raw, 1.0)
        bh[i] = prev
    bh_full = np.empty_like(bh)
    bh_full[order] = bh
    for r, b, h in zip(specs, bonf, bh_full):
        r["min_p_raw"] = float(min_pvalue_of_interest(r))
        r["min_p_bonf"] = float(b)
        r["min_p_bh"] = float(h)


# ---------------------------------------------------------------------------
# Markdown renderer
# ---------------------------------------------------------------------------

def to_markdown(payload: dict) -> str:
    lines: list[str] = []
    lines.append("# SA integration regression battery\n")
    lines.append(
        f"- Specifications estimated: **{payload['meta']['n_specs']}**\n"
        f"- Specifications with at least one coefficient significant at 5% (raw): **{payload['meta']['n_sig_raw']}**\n"
        f"- Specifications still significant after Bonferroni: **{payload['meta']['n_sig_bonf']}**\n"
        f"- Specifications still significant after Benjamini-Hochberg (q=0.05): **{payload['meta']['n_sig_bh']}**\n"
    )
    lines.append(
        "\n> **Caveats.** n ≤ 35 annual observations, single country. All OLS estimates use"
        " Newey-West HAC SEs (lag 3). Adjusted p-values account for multiple testing across"
        " every spec in the battery. None of these specifications identify causal effects;"
        " they correlate policy, macro, inequality and governance series over the post-apartheid"
        " period. Causal claims in the essay still rely on the Knowledge Base papers.\n"
    )
    lines.append("\n## Headline results (raw p < 0.05, sorted by adjusted p)\n")
    headline = payload["headline"]
    lines.append("| # | Outcome | Regressors | n | R² | DW | min p (raw) | p (Bonf) | p (BH) | Sample |")
    lines.append("|---|---------|------------|---|----|----|-------------|----------|--------|--------|")
    for i, r in enumerate(headline, 1):
        xs = ", ".join(r["x_labels"])
        lines.append(
            f"| {i} | {r['y_label']} | {xs} | {r['n']} | {r['r2']:.3f} | "
            f"{r['diagnostics']['dw']:.2f} | {r['min_p_raw']:.4f} | {r['min_p_bonf']:.3f} | "
            f"{r['min_p_bh']:.3f} | {r['sample']} |"
        )
    lines.append("\n## Chow tests for structural break at 1996 (GEAR)\n")
    lines.append("| Outcome | Regressors | n | F | p |")
    lines.append("|---------|------------|---|---|---|")
    for r in payload["chow"]:
        if r.get("status") != "ok":
            continue
        lines.append(
            f"| {r['y_label']} | {', '.join(r['x_labels'])} | {r['n']} | {r['F']:.3f} | {r['p']:.4f} |"
        )
    lines.append("\n## Engle-Granger cointegration\n")
    lines.append("| y | x | n | ADF y p | ADF x p | EG t | EG p |")
    lines.append("|---|---|---|---------|---------|------|------|")
    for r in payload["cointegration"]:
        if r.get("status") != "ok":
            continue
        lines.append(
            f"| {r['y_label']} | {r['x_label']} | {r['n']} | {r['adf_y_p']:.3f} | "
            f"{r['adf_x_p']:.3f} | {r['eg_stat']:.3f} | {r['eg_p']:.4f} |"
        )
    lines.append("\n## Granger causality (p by lag)\n")
    lines.append("| Direction | n | lag 1 | lag 2 | lag 3 |")
    lines.append("|-----------|---|-------|-------|-------|")
    for r in payload["granger"]:
        if r.get("status") != "ok":
            continue
        p = r["p_by_lag"]
        lines.append(
            f"| {r['description']} | {r['n']} | {p.get('1', float('nan')):.3f} | "
            f"{p.get('2', float('nan')):.3f} | {p.get('3', float('nan')):.3f} |"
        )
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    df = pd.read_csv(PANEL)
    ols = run_ols_battery(df)
    adjust_pvalues(ols)
    ols_sorted = sorted(ols, key=lambda r: r["min_p_raw"])
    headline = [r for r in ols_sorted if r["min_p_raw"] < SIG]

    chow_targets = [
        ("wdi_unemployment", ["wdi_trade_gdp"]),
        ("wdi_gdp_growth", ["wdi_trade_gdp"]),
        ("wid_top10_inc", ["wdi_trade_gdp"]),
        ("wid_top10_inc", ["wdi_fdi_gdp"]),
        ("log_gdp_pc", ["wdi_trade_gdp"]),
    ]
    chow = [chow_break(df, y, xs) for y, xs in chow_targets]

    coint_pairs = [
        ("log_gdp_pc", "wdi_trade_gdp"),
        ("wid_top10_inc", "wdi_trade_gdp"),
        ("wdi_unemployment", "wdi_trade_gdp"),
        ("wid_top10_wealth", "wdi_fdi_gdp"),
    ]
    coints = [cointegration_check(df, y, x) for y, x in coint_pairs]

    gr_pairs = [
        ("wdi_unemployment", "wdi_trade_gdp"),
        ("wdi_trade_gdp", "wdi_unemployment"),
        ("wid_top10_inc", "wdi_trade_gdp"),
        ("wdi_trade_gdp", "wid_top10_inc"),
        ("wdi_gdp_growth", "wdi_fdi_gdp"),
        ("wgi_avg", "wid_top10_inc"),
    ]
    grangers = [granger(df, y, x) for y, x in gr_pairs]

    n_sig_raw = sum(1 for r in ols if r["min_p_raw"] < SIG)
    n_sig_bonf = sum(1 for r in ols if r["min_p_bonf"] < SIG)
    n_sig_bh = sum(1 for r in ols if r["min_p_bh"] < SIG)

    payload = {
        "meta": {
            "n_specs": len(ols),
            "n_sig_raw": n_sig_raw,
            "n_sig_bonf": n_sig_bonf,
            "n_sig_bh": n_sig_bh,
            "sig_threshold": SIG,
            "hac_lags": HAC_LAGS,
            "panel_rows": int(len(df)),
            "panel_year_min": int(df.year.min()),
            "panel_year_max": int(df.year.max()),
        },
        "headline": headline[:40],
        "all_specs": ols_sorted,
        "chow": chow,
        "cointegration": coints,
        "granger": grangers,
        "labels": LABELS,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "regression_results.json").open("w") as f:
        json.dump(payload, f, indent=2, default=float)
    (OUT / "regression_results.md").write_text(to_markdown(payload))
    print(
        f"Ran {len(ols)} specs | {n_sig_raw} sig raw | {n_sig_bonf} Bonf | "
        f"{n_sig_bh} BH | headline shown: {len(payload['headline'])}"
    )


if __name__ == "__main__":
    main()
