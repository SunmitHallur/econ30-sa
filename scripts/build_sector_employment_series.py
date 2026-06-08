#!/usr/bin/env python3
"""Build sector-level employment time series (1999–2025) for the Sector deep-dive.

Reads OHS (1999), LFS (2000–2007) and QLFS (2008–latest) microdata and computes
weighted employment by 1-digit SIC industry per survey wave, then averages
within calendar year. Also pulls manufacturing / industry / agriculture /
services value-added shares of GDP from the World Bank WDI for context.

Output: website_v2/data/sector_employment.json
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "Knowledge Base" / "raw" / "data"
OUT = ROOT / "website_v2" / "data" / "sector_employment.json"

# 1-digit SIC (rev 5) labels used by Stats SA from OHS 1999 onward.
SIC1_LABELS: dict[int, str] = {
    1: "Agriculture, forestry, fishing",
    2: "Mining and quarrying",
    3: "Manufacturing",
    4: "Electricity, gas, water",
    5: "Construction",
    6: "Trade, hospitality",
    7: "Transport, communication",
    8: "Finance, business services",
    9: "Community, social, personal services",
    10: "Private households",
    11: "Other / unspecified",
}
# Tradable (trade-exposed) sectors are agriculture, mining, and manufacturing.
TRADABLE_CODES = {1, 2, 3}
SENTINEL_FLOAT_MAX = 1.79769313486232e308  # Stata missing surrogate in 2025 files


def _clean_codes(series: pd.Series) -> pd.Series:
    """Replace Stata missing surrogate and obvious sentinels with NaN, return ints."""
    cleaned = series.astype(float)
    cleaned = cleaned.where(cleaned < 1e300, np.nan)
    cleaned = cleaned.where(cleaned.between(1, 11, inclusive="both"), np.nan)
    return cleaned


def _weighted_emp_shares(df: pd.DataFrame, ind_col: str, status_col: str, wgt_col: str) -> dict[str, float]:
    employed = df[df[status_col] == 1].copy()
    employed[ind_col] = _clean_codes(employed[ind_col])
    total_w = float(employed[wgt_col].sum())
    if total_w <= 0:
        return {}
    grouped = employed.dropna(subset=[ind_col]).groupby(ind_col)[wgt_col].sum()
    shares = {int(k): float(v) / total_w for k, v in grouped.items()}
    out: dict[str, float] = {
        "total_employed_weighted": total_w,
        "n_obs": int(employed.shape[0]),
    }
    for code in range(1, 12):
        out[f"sic{code}_share"] = shares.get(code, 0.0)
    out["tradable_share"] = sum(shares.get(c, 0.0) for c in TRADABLE_CODES)
    out["nontradable_share"] = 1.0 - out["tradable_share"] - shares.get(11, 0.0)
    return out


def load_ohs_1999() -> dict[int, list[dict]]:
    path = RAW / "ohs_1999_v1.1_csv" / "ohs_1999_v1.1_csv" / "ohs 1999 worker_v1.1.csv"
    df = pd.read_csv(path, usecols=["INDUST", "STATUS1", "WGT4"], low_memory=False)
    df = df.rename(columns={"INDUST": "Indus", "STATUS1": "Status", "WGT4": "Weight"})
    row = _weighted_emp_shares(df, "Indus", "Status", "Weight")
    row.update({"year": 1999, "wave": "OHS1999", "wave_label": "OHS 1999"})
    return {1999: [row]}


def load_lfs_waves() -> dict[int, list[dict]]:
    out: dict[int, list[dict]] = {}
    for folder in sorted((RAW).glob("LFS*")):
        m = re.match(r"LFS(\d{4})(\d{2})", folder.name)
        if not m:
            continue
        year, mon = int(m.group(1)), int(m.group(2))
        worker_files = list(folder.glob("LFS*WORKER.csv")) + list(folder.glob("LFS*WORK.csv"))
        if not worker_files:
            continue
        path = worker_files[0]
        try:
            head = pd.read_csv(path, nrows=2, low_memory=False)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skipping {path}: {exc}", file=sys.stderr)
            continue
        wgt_col = next((c for c in head.columns if c.lower() in {"wgt", "weight", "worker_wgt", "workers_wgt"}), None)
        if wgt_col is None:
            print(f"  ! no weight col in {path}: {list(head.columns)[:10]}", file=sys.stderr)
            continue
        status_col = next((c for c in head.columns if c.lower().startswith("status1")), None)
        ind_col = "Indus" if "Indus" in head.columns else None
        if status_col is None or ind_col is None:
            print(f"  ! missing Indus/Status1 in {path}", file=sys.stderr)
            continue
        df = pd.read_csv(path, usecols=[ind_col, status_col, wgt_col], low_memory=False)
        df = df.rename(columns={ind_col: "Indus", status_col: "Status", wgt_col: "Weight"})
        row = _weighted_emp_shares(df, "Indus", "Status", "Weight")
        row.update({"year": year, "wave": folder.name, "wave_label": f"LFS {year} M{mon:02d}"})
        out.setdefault(year, []).append(row)
    return out


def load_qlfs_waves() -> dict[int, list[dict]]:
    out: dict[int, list[dict]] = {}
    for folder in sorted(RAW.glob("QLFS*")):
        m = re.match(r"QLFS(\d{4})(\d{2})$", folder.name)
        if not m:
            continue
        year, q = int(m.group(1)), int(m.group(2))
        csv_files = list(folder.glob("QLFS*.csv"))
        if not csv_files:
            continue
        path = csv_files[0]
        try:
            head = pd.read_csv(path, nrows=2, low_memory=False)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skipping {path}: {exc}", file=sys.stderr)
            continue
        col_map = {c.lower(): c for c in head.columns}
        ind_col = col_map.get("indus")
        status_col = col_map.get("status")
        weight_col = col_map.get("weight")
        if ind_col is None or status_col is None or weight_col is None:
            print(f"  ! missing cols in {path}: {list(head.columns)[:15]}", file=sys.stderr)
            continue
        df = pd.read_csv(path, usecols=[ind_col, status_col, weight_col], low_memory=False)
        df = df.rename(columns={ind_col: "Indus", status_col: "Status", weight_col: "Weight"})
        df["Status"] = df["Status"].astype(float)
        df["Status"] = df["Status"].where(df["Status"] < 1e300, np.nan)
        df["Weight"] = df["Weight"].astype(float)
        df["Weight"] = df["Weight"].where(df["Weight"] < 1e300, np.nan)
        df = df.dropna(subset=["Status", "Weight"])
        df["Status"] = df["Status"].astype(int)
        row = _weighted_emp_shares(df, "Indus", "Status", "Weight")
        row.update({"year": year, "wave": folder.name, "wave_label": f"QLFS {year} Q{q}"})
        out.setdefault(year, []).append(row)
    return out


def fetch_wdi(code: str, start: int = 1960, end: int = 2024) -> dict[int, float | None]:
    url = (
        f"https://api.worldbank.org/v2/country/ZAF/indicator/{code}"
        f"?format=json&per_page=500&date={start}:{end}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Econ30FinalProject/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode())
    return {int(row["date"]): row["value"] for row in payload[1]}


def aggregate_yearly(waves_by_year: dict[int, list[dict]]) -> list[dict]:
    rows: list[dict] = []
    for year in sorted(waves_by_year):
        waves = waves_by_year[year]
        agg: dict[str, float | int | str] = {"year": year, "n_waves": len(waves)}
        # Average all share-style fields across waves (equal-weight).
        share_keys = [k for k in waves[0] if k.endswith("_share") or k.endswith("share")]
        for key in share_keys:
            vals = [w[key] for w in waves if isinstance(w.get(key), (int, float))]
            agg[key] = float(np.mean(vals)) if vals else None
        # Use the simple mean of weighted employment totals as the annual point.
        emp_vals = [w["total_employed_weighted"] for w in waves if w.get("total_employed_weighted")]
        agg["total_employed_weighted"] = float(np.mean(emp_vals)) if emp_vals else None
        rows.append(agg)
    return rows


def main() -> None:
    print("Loading OHS 1999 ...")
    by_year: dict[int, list[dict]] = {}
    for src in (load_ohs_1999(), load_lfs_waves(), load_qlfs_waves()):
        for y, waves in src.items():
            by_year.setdefault(y, []).extend(waves)

    yearly = aggregate_yearly(by_year)
    print(f"Aggregated {len(yearly)} years from {min(by_year)} to {max(by_year)}")

    print("Fetching WDI sector value-added shares ...")
    wdi_codes = {
        "NV.IND.MANF.ZS": "manuf_va_share_gdp",
        "NV.IND.TOTL.ZS": "industry_va_share_gdp",
        "NV.AGR.TOTL.ZS": "agric_va_share_gdp",
        "NV.SRV.TOTL.ZS": "services_va_share_gdp",
        "NE.TRD.GNFS.ZS": "trade_pct_gdp",
    }
    wdi_series: dict[str, dict[int, float | None]] = {}
    for code, alias in wdi_codes.items():
        try:
            wdi_series[alias] = fetch_wdi(code)
            print(f"  {alias}: {len(wdi_series[alias])} years")
        except Exception as exc:  # noqa: BLE001
            print(f"  ! failed {alias}: {exc}", file=sys.stderr)
            wdi_series[alias] = {}

    # Merge WDI values into yearly rows where the year matches.
    yearly_by_year = {row["year"]: row for row in yearly}
    all_years = sorted(set(yearly_by_year) | set().union(*[set(v) for v in wdi_series.values()] or [set()]))
    merged: list[dict] = []
    for year in all_years:
        row = dict(yearly_by_year.get(year, {"year": year, "n_waves": 0}))
        for alias, series in wdi_series.items():
            row[alias] = series.get(year)
        merged.append(row)

    # Lightweight regression: manufacturing emp share ~ trade openness with HAC(L=2) errors.
    def _ols_with_hac(x: list[float], y: list[float], lags: int = 2) -> dict:
        xa = np.asarray(x, dtype=float)
        ya = np.asarray(y, dtype=float)
        n = len(xa)
        if n < 4:
            return {"n": n}
        X = np.column_stack([np.ones(n), xa])
        beta, *_ = np.linalg.lstsq(X, ya, rcond=None)
        resid = ya - X @ beta
        XtX_inv = np.linalg.inv(X.T @ X)
        ss_tot = float(((ya - ya.mean()) ** 2).sum())
        r2 = 1.0 - float((resid * resid).sum()) / ss_tot if ss_tot else None
        S = np.zeros((2, 2))
        for h in range(0, lags + 1):
            wt = 1.0 - h / (lags + 1) if lags > 0 else 1.0
            for t in range(h, n):
                ui = (X[t] * resid[t]).reshape(2, 1)
                uj = (X[t - h] * resid[t - h]).reshape(2, 1)
                if h == 0:
                    S += wt * (ui @ uj.T)
                else:
                    add = ui @ uj.T
                    S += wt * (add + add.T)
        cov = XtX_inv @ S @ XtX_inv
        se = np.sqrt(np.diag(cov))
        tstat = beta[1] / se[1] if se[1] > 0 else None
        # two-sided p approx via normal CDF
        if tstat is None:
            p_two = None
        else:
            from math import erf, sqrt as msqrt
            z = abs(tstat)
            p_two = float(2.0 * (1.0 - 0.5 * (1.0 + erf(z / msqrt(2.0)))))
        return {
            "n": n,
            "intercept": float(beta[0]),
            "slope": float(beta[1]),
            "slope_se_hac": float(se[1]),
            "t_hac": float(tstat) if tstat is not None else None,
            "p_two_sided_normal": p_two,
            "r_squared": r2,
            "lags": lags,
        }

    regs_inputs = [
        ("manuf_emp_vs_trade", "sic3_share", "trade_pct_gdp"),
        ("tradable_emp_vs_trade", "tradable_share", "trade_pct_gdp"),
        ("manuf_va_vs_trade", "manuf_va_share_gdp", "trade_pct_gdp"),
    ]
    regressions: dict[str, dict] = {}
    for name, ycol, xcol in regs_inputs:
        pairs = [
            (row[xcol], row[ycol])
            for row in merged
            if isinstance(row.get(xcol), (int, float)) and isinstance(row.get(ycol), (int, float))
        ]
        if len(pairs) >= 4:
            xs, ys = zip(*pairs)
            regressions[name] = _ols_with_hac(list(xs), list(ys), lags=2)
            regressions[name]["x"] = xcol
            regressions[name]["y"] = ycol

    payload = {
        "country": "South Africa",
        "definition": {
            "tradable_codes": sorted(TRADABLE_CODES),
            "sic1_labels": SIC1_LABELS,
            "notes": (
                "Shares are weighted employment shares (own person weights) by 1-digit SIC "
                "industry computed from OHS 1999, LFS 2000–2007 and QLFS 2008–latest worker microdata. "
                "Tradable = SIC 1+2+3 (agriculture, mining, manufacturing); non-tradable = 4–10. "
                "Year values are equal-weighted averages across the survey waves available in that year. "
                "Manufacturing VA share of GDP and other value-added shares are sourced from the World Bank WDI."
            ),
        },
        "regressions": regressions,
        "rows": merged,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUT} ({len(merged)} years)")


if __name__ == "__main__":
    main()
