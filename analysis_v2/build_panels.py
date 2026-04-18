#!/usr/bin/env python3
"""
Build the merged South Africa panel from WDI, WID, WIID, and WGI raw sources.

Reads only from `Knowledge Base/raw/data/` (treated as immutable).
Writes `analysis_v2/outputs/sa_panel_full.csv` keyed on year.

The panel combines the following series:

- From WDI (sa_wdi_panel.csv): GDP pc (constant USD), GDP growth, trade/GDP,
  FDI/GDP, ILO-modelled unemployment, Gini.
- From WID (WID_data_ZA.csv): top-1%, top-10%, bottom-50% shares of pre-tax
  national income; top-10% and top-1% shares of household wealth.
- From WIID (WIID-29APR2025.xlsx): best-quality Gini and Palma ratio per year
  for ZAF, filtered to disposable income equivalised households.
- From WGI (raw_underlying_sources_1996_2024.xlsx): per-dimension mean of
  normalised source scores for ZAF, year by year, covering the six WGI pillars
  (VA, PV, GE, RQ, RL, CC). Also a composite `wgi_avg` mean across pillars.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
KB = ROOT.parent / "Knowledge Base" / "raw" / "data"
OUT = ROOT / "outputs"

WDI_PATH = KB / "sa_wdi_panel.csv"
WID_PATH = KB / "WID_data_ZA.csv"
WIID_PATH = KB / "WIID-29APR2025.xlsx"
WGI_PATH = KB / "raw_underlying_sources_1996_2024.xlsx"

YEAR_MIN, YEAR_MAX = 1990, 2024


# ---------------------------------------------------------------------------
# Sub-panel loaders
# ---------------------------------------------------------------------------

def load_wdi() -> pd.DataFrame:
    df = pd.read_csv(WDI_PATH)
    df = df.rename(
        columns={
            "gdp_pc_constant_usd": "wdi_gdp_pc_usd",
            "gdp_growth_pct": "wdi_gdp_growth",
            "trade_pct_gdp": "wdi_trade_gdp",
            "fdi_net_inflows_pct_gdp": "wdi_fdi_gdp",
            "unemployment_ilo_pct": "wdi_unemployment",
            "gini": "wdi_gini",
        }
    )
    return df.loc[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)].copy()


def _wid_series(df_wid: pd.DataFrame, variable: str, percentile: str) -> pd.DataFrame:
    sub = df_wid[(df_wid.variable == variable) & (df_wid.percentile == percentile)]
    return sub[["year", "value"]].dropna()


def load_wid() -> pd.DataFrame:
    df = pd.read_csv(WID_PATH, sep=";")
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)].copy()
    series = {
        # Pre-tax national income, equal-split adults (j=equal-split, 992=adults)
        "wid_top1_inc": _wid_series(df, "sptincj992", "p99p100"),
        "wid_top10_inc": _wid_series(df, "sptincj992", "p90p100"),
        "wid_bottom50_inc": _wid_series(df, "sptincj992", "p0p50"),
        # Post-tax national income (distributes taxes and transfers)
        "wid_top10_disp": _wid_series(df, "sdiincj992", "p90p100"),
        "wid_bottom50_disp": _wid_series(df, "sdiincj992", "p0p50"),
        # Household wealth shares
        "wid_top10_wealth": _wid_series(df, "shwealj992", "p90p100"),
        "wid_top1_wealth": _wid_series(df, "shwealj992", "p99p100"),
    }
    out = None
    for name, sub in series.items():
        sub = sub.rename(columns={"value": name})
        out = sub if out is None else out.merge(sub, on="year", how="outer")
    assert out is not None
    return out.sort_values("year").reset_index(drop=True)


def load_wiid() -> pd.DataFrame:
    df = pd.read_excel(WIID_PATH, sheet_name="Sheet1")
    df = df[df["c3"] == "ZAF"].copy()
    df = df[(df.year >= YEAR_MIN) & (df.year <= YEAR_MAX)]
    # Prefer disposable-income, equivalised household-scale observations
    pref = df[
        (df["resource"].str.lower().str.contains("disposable", na=False))
        & (df["scale"].str.lower().str.contains("equivalised|per capita", na=False))
    ]
    pool = pref if len(pref) else df
    # Keep the highest quality_score per year, tiebreak on larger sample (gdp proxy)
    pool = pool.sort_values(
        ["year", "quality_score"], ascending=[True, False]
    ).drop_duplicates("year", keep="first")
    out = pool[["year", "gini", "palma", "top5"]].rename(
        columns={
            "gini": "wiid_gini",
            "palma": "wiid_palma",
            "top5": "wiid_top5",
        }
    )
    return out.sort_values("year").reset_index(drop=True)


def _normalise(series: pd.Series, lo: pd.Series, hi: pd.Series) -> pd.Series:
    """Rescale an underlying WGI source value to [0,1] using its min/max."""
    span = hi - lo
    return (series - lo) / span.replace(0, np.nan)


def load_wgi() -> pd.DataFrame:
    xl = pd.ExcelFile(WGI_PATH)
    dims = ["VA", "PV", "GE", "RQ", "RL", "CC"]
    frames = []
    for d in dims:
        sh = pd.read_excel(WGI_PATH, sheet_name=d)
        sh = sh[sh["econ_code"] == "ZAF"].copy()
        sh = sh[(sh["production_year"] >= YEAR_MIN) & (sh["production_year"] <= YEAR_MAX)]
        sh["norm_value"] = _normalise(sh["value"], sh["minimum"], sh["maximum"])
        # Respect orientation: higher is better when orientation==1
        sh["norm_value"] = np.where(sh["orientation"] == -1, 1 - sh["norm_value"], sh["norm_value"])
        agg = (
            sh.groupby("production_year", as_index=False)
            .agg(norm_value=("norm_value", "mean"), n_sources=("norm_value", "count"))
            .rename(columns={"production_year": "year"})
        )
        agg = agg.rename(columns={"norm_value": f"wgi_{d.lower()}"})
        frames.append(agg.drop(columns="n_sources"))
    out = frames[0]
    for f in frames[1:]:
        out = out.merge(f, on="year", how="outer")
    wgi_cols = [c for c in out.columns if c.startswith("wgi_")]
    out["wgi_avg"] = out[wgi_cols].mean(axis=1)
    return out.sort_values("year").reset_index(drop=True)


# ---------------------------------------------------------------------------
# Merge and derive
# ---------------------------------------------------------------------------

def build() -> pd.DataFrame:
    years = pd.DataFrame({"year": range(YEAR_MIN, YEAR_MAX + 1)})
    wdi = load_wdi()
    wid = load_wid()
    wiid = load_wiid()
    wgi = load_wgi()
    panel = (
        years.merge(wdi, on="year", how="left")
        .merge(wid, on="year", how="left")
        .merge(wiid, on="year", how="left")
        .merge(wgi, on="year", how="left")
    )
    # Derived convenience variables
    panel["log_gdp_pc"] = np.log(panel["wdi_gdp_pc_usd"])
    panel["year_t"] = panel["year"] - YEAR_MIN
    # GEAR dummy: 1 for years >= 1996
    panel["gear_era"] = (panel["year"] >= 1996).astype(int)
    # First differences on the headline series (Δ log GDP pc = growth)
    for col in [
        "wdi_trade_gdp",
        "wdi_fdi_gdp",
        "wdi_unemployment",
        "wid_top1_inc",
        "wid_top10_inc",
        "wid_top10_wealth",
        "wgi_avg",
    ]:
        panel[f"d_{col}"] = panel[col].diff()
    return panel


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    panel = build()
    dest = OUT / "sa_panel_full.csv"
    panel.to_csv(dest, index=False)
    # Brief coverage report
    coverage = (
        pd.DataFrame(
            {
                "column": panel.columns,
                "n_nonnull": panel.notna().sum().values,
                "first_year": [
                    panel.loc[panel[c].notna(), "year"].min() if panel[c].notna().any() else None
                    for c in panel.columns
                ],
                "last_year": [
                    panel.loc[panel[c].notna(), "year"].max() if panel[c].notna().any() else None
                    for c in panel.columns
                ],
            }
        )
        .sort_values("n_nonnull", ascending=False)
        .reset_index(drop=True)
    )
    coverage.to_csv(OUT / "sa_panel_coverage.csv", index=False)
    print(f"Wrote {dest} with shape={panel.shape}.")
    print(f"Wrote {OUT / 'sa_panel_coverage.csv'}")
    print(coverage.to_string(index=False))


if __name__ == "__main__":
    main()
