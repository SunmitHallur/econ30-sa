#!/usr/bin/env python3
"""Download South Africa WDI-style series from the World Bank API → CSV."""
from __future__ import annotations

import csv
import json
import urllib.request
from pathlib import Path

USER_AGENT = "Econ30FinalProject/1.0 (academic research)"
OUT = Path(__file__).resolve().parent / "data" / "sa_wdi_panel.csv"

INDICATORS = {
    "SI.POV.GINI": "gini",
    "NY.GDP.PCAP.KD": "gdp_pc_constant_usd",
    "NY.GDP.MKTP.KD.ZG": "gdp_growth_pct",
    "NE.TRD.GNFS.ZS": "trade_pct_gdp",
    "BX.KLT.DINV.WD.GD.ZS": "fdi_net_inflows_pct_gdp",
    "SL.UEM.TOTL.ZS": "unemployment_ilo_pct",
}


def fetch_indicator(wb_code: str) -> dict[int, float | None]:
    url = (
        f"https://api.worldbank.org/v2/country/ZAF/indicator/{wb_code}"
        f"?format=json&per_page=500&date=1990:2023"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode())
    out: dict[int, float | None] = {}
    for row in payload[1]:
        y = int(row["date"])
        out[y] = row["value"]
    return out


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    years = range(1990, 2024)
    cols = {alias: fetch_indicator(code) for code, alias in INDICATORS.items()}
    fieldnames = ["year"] + list(INDICATORS.values())
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for year in years:
            w.writerow({"year": year, **{c: cols[c].get(year) for c in cols}})
    print(f"Wrote {OUT} ({len(list(years))} rows)")


if __name__ == "__main__":
    main()
