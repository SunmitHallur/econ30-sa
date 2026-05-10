#!/usr/bin/env python3
"""
Aggregate Stats SA QLFS household CSV extracts into provincial narrow unemployment
(unemployed / (employed + unemployed)), survey-weighted.

Expects folders under Knowledge Base/raw/data named QLFSYYYYQQ with QLFSYYYYQQ.csv
inside. Older QLFS uses Status; newer uses Lfs_Status — both mapped to codes 1=employed,
2=unemployed (narrow).

Outputs website_v2/data/map_unemployment_series.json for the leaflet map animation.

LFS (2000–2007) and OHS (1994–1999) use different schemas; extend this script when
those extracts are harmonised. QLFSPANEL_* is skipped (panel layout).
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "Knowledge Base" / "raw" / "data"
OUT = ROOT / "website_v2" / "data" / "map_unemployment_series.json"

PROV_CODE_TO_NAME = {
    1: "Western Cape",
    2: "Eastern Cape",
    3: "Northern Cape",
    4: "Free State",
    5: "KwaZulu-Natal",
    6: "North West",
    7: "Gauteng",
    8: "Mpumalanga",
    9: "Limpopo",
}

# Stats SA QLFS Metro_code — eight metropolitan municipalities (narrow LF unemployment).
# See QLFS metadata: Metro/non-metro (Metro_code), derived from stratum.
METRO_CODE_TO_LABEL = {
    2: "City of Cape Town",
    4: "Buffalo City",
    5: "Nelson Mandela Bay",
    8: "Mangaung",
    10: "eThekwini",
    13: "Ekurhuleni",
    14: "City of Johannesburg",
    15: "City of Tshwane",
}


def clean_float(x: str | None) -> float | None:
    if x is None or x == "":
        return None
    try:
        v = float(x)
        if v != v or v > 1e100:
            return None
        return v
    except (TypeError, ValueError):
        return None


def clean_status(val: str | None) -> int | None:
    if val is None or val == "":
        return None
    try:
        v = float(val)
        if v > 1e100:
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def status_column(fieldnames: list[str]) -> str | None:
    if "Lfs_Status" in fieldnames:
        return "Lfs_Status"
    if "Status" in fieldnames:
        return "Status"
    return None


def parse_qlfs_folder(name: str) -> tuple[int, int] | None:
    m = re.match(r"^QLFS(\d{4})(\d{2})$", name)
    if not m:
        return None
    y, q = int(m.group(1)), int(m.group(2))
    if q not in (1, 2, 3, 4):
        return None
    return y, q


def aggregate_csv(path: Path) -> tuple[dict[str, float], float | None, dict[str, float]]:
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        scol = status_column(list(fieldnames))
        if not scol or "Province" not in fieldnames:
            raise ValueError(f"Missing columns in {path}")
        wcol = next(
            (c for c in ("Weight", "weight", "WEIGHT") if c in fieldnames),
            None,
        )
        if not wcol:
            raise ValueError(f"No Weight column in {path}")
        mcol = "Metro_code" if "Metro_code" in fieldnames else None

        by_prov_lf: dict[int, float] = {}
        by_prov_u: dict[int, float] = {}
        by_metro_lf: dict[int, float] = {}
        by_metro_u: dict[int, float] = {}
        nat_lf = nat_u = 0.0
        metro_code_max = 0

        for row in reader:
            w = clean_float(row.get(wcol))
            if w is None or w <= 0:
                continue
            st = clean_status(row.get(scol))
            if st is None:
                continue
            if st not in (1, 2):
                continue
            try:
                pv = int(float(row["Province"]))
            except (TypeError, ValueError, KeyError):
                continue
            if pv not in PROV_CODE_TO_NAME:
                continue
            by_prov_lf[pv] = by_prov_lf.get(pv, 0.0) + w
            if st == 2:
                by_prov_u[pv] = by_prov_u.get(pv, 0.0) + w
            nat_lf += w
            if st == 2:
                nat_u += w

            if mcol:
                try:
                    mc = int(float(row.get(mcol) or ""))
                except (TypeError, ValueError):
                    mc = None
                if mc is not None:
                    metro_code_max = max(metro_code_max, mc)
                    # Current scheme 1–17 (Stats SA); older extracts used 71–76 etc.
                    if mc in METRO_CODE_TO_LABEL:
                        by_metro_lf[mc] = by_metro_lf.get(mc, 0.0) + w
                        if st == 2:
                            by_metro_u[mc] = by_metro_u.get(mc, 0.0) + w

    provinces: dict[str, float] = {}
    for code, pname in PROV_CODE_TO_NAME.items():
        lf = by_prov_lf.get(code, 0.0)
        u = by_prov_u.get(code, 0.0)
        provinces[pname] = round(100.0 * u / lf, 2) if lf > 0 else 0.0

    metros: dict[str, float] = {}
    # Legacy Metro_code values (>17) appear until 2014; do not emit misleading zeros.
    if metro_code_max <= 17 and by_metro_lf:
        for code, label in METRO_CODE_TO_LABEL.items():
            lf = by_metro_lf.get(code, 0.0)
            u = by_metro_u.get(code, 0.0)
            metros[label] = round(100.0 * u / lf, 2) if lf > 0 else 0.0

    national = round(100.0 * nat_u / nat_lf, 2) if nat_lf > 0 else None
    return provinces, national, metros


def main() -> None:
    waves: list[dict[str, Any]] = []

    if not RAW.is_dir():
        raise SystemExit(f"Raw data folder not found: {RAW}")

    dirs = sorted(p for p in RAW.iterdir() if p.is_dir())
    for d in dirs:
        name = d.name
        if name.startswith("QLFSPANEL"):
            continue
        if name.endswith("mig"):
            # Migration module — same labour columns as main QLFS file
            pass
        parsed = parse_qlfs_folder(name)
        if not parsed:
            continue
        year, quarter = parsed
        csv_path = d / f"{name}.csv"
        if not csv_path.is_file():
            continue
        try:
            provinces, national, metros = aggregate_csv(csv_path)
        except Exception as e:
            print(f"SKIP {name}: {e}")
            continue
        wid = f"{year}-Q{quarter}"
        waves.append(
            {
                "id": wid,
                "year": year,
                "quarter": quarter,
                "label": f"{year} Q{quarter}",
                "national": national,
                "provinces": provinces,
                "metros": metros,
            }
        )

    waves.sort(key=lambda w: (w["year"], w["quarter"]))

    payload = {
        "title": "Provincial narrow unemployment (QLFS microdata extracts)",
        "definition": "Stats SA narrow unemployment: unemployed ÷ (employed + unemployed), "
        "survey-weighted. Derived from downloaded QLFS CSV extracts.",
        "source_note": "Household survey microdata; producer Statistics South Africa.",
        "citation_apa": (
            "Statistics South Africa. (2008–2025). Quarterly Labour Force Survey microdata "
            "(P0211 series), provincial aggregates computed by the author from CSV extracts; "
            "see Statistical release P0211 and ISIbalo portal."
        ),
        "citation_urls": [
            "https://www.statssa.gov.za/?page_id=1854&PPN=P0211",
            "https://www.statssa.gov.za/",
        ],
        "method_note": (
            "Codes: Province 1–9 (Stats SA); Lfs_Status or Status with 1=employed, 2=unemployed (narrow); "
            "Weight / weight for expansion. Eight metropolitan unemployment rates use Stats SA Metro_code "
            "(metropolitan municipalities only) under the current 1–17 coding from 2015 Q1; earlier QLFS extracts "
            "used different Metro_code values and metro breakdown is omitted there. "
            "Metro marker positions are approximate city centres for display. "
            "Pre-2008 LFS/OHS extracts require separate harmonisation."
        ),
        "waves": waves,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(waves)} waves to {OUT}")


if __name__ == "__main__":
    main()
