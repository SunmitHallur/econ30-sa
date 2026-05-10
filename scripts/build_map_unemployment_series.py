#!/usr/bin/env python3
"""
Aggregate Stats SA household survey CSV extracts into provincial narrow unemployment
(unemployed ÷ (employed + unemployed)), survey-weighted.

Sources (folders under Knowledge Base/raw/data):
  • QLFSYYYYQQ / QLFSYYYYQQ.csv — Quarterly Labour Force Survey (from 2008 Q1 in this repo)
  • LFSYYYYMM — semi-annual Labour Force Survey worker files (2000–2007), joined to PERSON when Prov is absent
  • ohs_* — October Household Survey worker-style files where STATUS1 + PROV + weights are present

OHS/LFS questionnaires differ slightly from QLFS; series are broadly comparable for descriptive maps but
not identical official headline tables. Some OHS vintages (e.g. 1994–1996 layouts) are skipped here.

QLFSPANEL_* is skipped. Migration-module-only folders (*mig) are skipped for QLFS main file detection.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any, Callable

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

PROV_STRING_TO_CANONICAL = {
    "western cape": "Western Cape",
    "eastern cape": "Eastern Cape",
    "northern cape": "Northern Cape",
    "free state": "Free State",
    "kwazulu-natal": "KwaZulu-Natal",
    "kwazulu natal": "KwaZulu-Natal",
    "kzn": "KwaZulu-Natal",
    "north west": "North West",
    "gauteng": "Gauteng",
    "mpumalanga": "Mpumalanga",
    "limpopo": "Limpopo",
    "northern province": "Limpopo",
    "northwest": "North West",
}

# Stats SA QLFS Metro_code — eight metropolitan municipalities (narrow LF unemployment).
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


def normalize_labour_status(val: str | None) -> int | None:
    """Return 1 = employed, 2 = unemployed (narrow), 0 = not in narrow LF; None = unknown."""
    if val is None:
        return None
    s = str(val).strip()
    if s == "":
        return None
    if s in ("1", "1.0"):
        return 1
    if s in ("2", "2.0"):
        return 2
    if s in ("0", "0.0"):
        return 0
    low = s.lower()
    if low == "employed":
        return 1
    if low == "unemployed":
        return 2
    if "not economically" in low:
        return 0
    try:
        v = float(s)
        if v > 1e100:
            return None
        iv = int(v)
        if iv in (0, 1, 2):
            return iv
    except (TypeError, ValueError):
        pass
    return None


def normalize_province(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "":
        return None
    try:
        code = int(float(s))
        if code in PROV_CODE_TO_NAME:
            return PROV_CODE_TO_NAME[code]
    except (TypeError, ValueError):
        pass
    return PROV_STRING_TO_CANONICAL.get(s.lower().strip())


def status_column_qlfs(fieldnames: list[str]) -> str | None:
    if "Lfs_Status" in fieldnames:
        return "Lfs_Status"
    if "Status" in fieldnames:
        return "Status"
    return None


def weight_column(fieldnames: list[str]) -> str | None:
    for c in (
        "workers_wgt",
        "Workers_wgt",
        "Worker_wgt",
        "worker_wgt",
        "Weight",
        "weight",
        "WEIGHT",
        "Wgt",
        "WGT4",
        "PERSWGT",
        "Pers_wgt",
        "newwgt",
        "pweight",
    ):
        if c in fieldnames:
            return c
    # Case-insensitive fallback (some LFS waves vary capitalization).
    lower_map = {name.lower(): name for name in fieldnames}
    for want in (
        "workers_wgt",
        "worker_wgt",
        "pers_wgt",
        "wgt",
        "weight",
    ):
        if want in lower_map:
            return lower_map[want]
    return None


def parse_qlfs_folder(name: str) -> tuple[int, int] | None:
    m = re.match(r"^QLFS(\d{4})(\d{2})$", name)
    if not m:
        return None
    y, q = int(m.group(1)), int(m.group(2))
    if q not in (1, 2, 3, 4):
        return None
    return y, q


def parse_lfs_folder(name: str) -> tuple[int, int] | None:
    m = re.match(r"^LFS(\d{4})(\d{2})$", name)
    if not m:
        return None
    y, mo = int(m.group(1)), int(m.group(2))
    if mo < 1 or mo > 12:
        return None
    q = (mo - 1) // 3 + 1
    return y, q


def parse_ohs_year(folder_name: str) -> int | None:
    m = re.search(r"(19|20)\d{2}", folder_name)
    if not m:
        return None
    return int(m.group(0))


def find_lfs_worker_csv(folder: Path) -> Path | None:
    """Prefer *WORKER*.csv; else LFS*WORK.csv (some waves omit WORKER in the name)."""
    for p in sorted(folder.glob("*.csv")):
        u = p.name.upper()
        if "WORKER" in u:
            return p
    for p in sorted(folder.glob("*.csv")):
        u = p.name.upper()
        if u.endswith("WORK.CSV") and "HOUSE" not in u and "PERSON" not in u:
            return p
    return None


def find_lfs_person_csv(folder: Path) -> Path | None:
    for p in sorted(folder.glob("*.csv")):
        if "PERSON" in p.name.upper():
            return p
    return None


def find_ohs_labour_csv(folder: Path) -> Path | None:
    """Prefer worker CSVs with STATUS1 / Status1-style labour classification."""
    candidates: list[tuple[int, Path]] = []
    for p in folder.rglob("*.csv"):
        n = p.name.lower()
        if "impute" in n or "genpsu" in n or "stratum" in n:
            continue
        try:
            with p.open(newline="", encoding="utf-8", errors="replace") as f:
                header = f.readline()
        except OSError:
            continue
        score = 0
        if "worker" in n:
            score += 20
        if "status1" in header.lower():
            score += 15
        if "prov" in header.lower():
            score += 10
        if "_nw_" in n:
            score -= 5
        if score > 0:
            candidates.append((score, p))
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[0])
    return candidates[0][1]


def load_person_prov_map(person_path: Path) -> dict[tuple[str, str], str]:
    out: dict[tuple[str, str], str] = {}
    with person_path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            uq = row.get("UqNr") or row.get("UQNR") or row.get("uniqnum")
            pn = row.get("PersonNr") or row.get("PERSONNR") or row.get("PERSNO") or row.get("person")
            if uq is None or pn is None:
                continue
            key = (str(uq).strip(), str(pn).strip())
            pv = row.get("Prov") or row.get("PROV") or row.get("prov")
            if pv is not None and str(pv).strip() != "":
                out[key] = str(pv).strip()
    return out


def row_identity(row: dict[str, str]) -> tuple[str, str] | None:
    uq = row.get("UqNr") or row.get("UQNR") or row.get("uniqnum")
    pn = row.get("PersonNr") or row.get("PERSONNR") or row.get("PERSNO") or row.get("person")
    if uq is None or pn is None:
        return None
    return (str(uq).strip(), str(pn).strip())


def aggregate_core_weighted_rows(
    rows: list[dict[str, str]],
    get_prov_code: Callable[[dict[str, str]], str | None],
    status_col: str,
    weight_col: str,
    metro_col: str | None,
) -> tuple[dict[str, float], float | None, dict[str, float], int]:
    by_prov_lf: dict[int, float] = {}
    by_prov_u: dict[int, float] = {}
    by_metro_lf: dict[int, float] = {}
    by_metro_u: dict[int, float] = {}
    nat_lf = nat_u = 0.0
    metro_code_max = 0

    name_to_code = {v: k for k, v in PROV_CODE_TO_NAME.items()}

    for row in rows:
        w = clean_float(row.get(weight_col))
        if w is None or w <= 0:
            continue
        st = normalize_labour_status(row.get(status_col))
        if st is None or st not in (1, 2):
            continue

        raw_p = get_prov_code(row)
        pname = normalize_province(raw_p)
        if pname is None:
            continue
        pv = name_to_code.get(pname)
        if pv is None:
            continue

        by_prov_lf[pv] = by_prov_lf.get(pv, 0.0) + w
        if st == 2:
            by_prov_u[pv] = by_prov_u.get(pv, 0.0) + w
        nat_lf += w
        if st == 2:
            nat_u += w

        if metro_col and metro_col in row:
            try:
                mc = int(float(row.get(metro_col) or ""))
            except (TypeError, ValueError):
                mc = None
            if mc is not None:
                metro_code_max = max(metro_code_max, mc)
                if mc in METRO_CODE_TO_LABEL:
                    by_metro_lf[mc] = by_metro_lf.get(mc, 0.0) + w
                    if st == 2:
                        by_metro_u[mc] = by_metro_u.get(mc, 0.0) + w

    provinces: dict[str, float] = {}
    for code, name in PROV_CODE_TO_NAME.items():
        lf = by_prov_lf.get(code, 0.0)
        u = by_prov_u.get(code, 0.0)
        provinces[name] = round(100.0 * u / lf, 2) if lf > 0 else 0.0

    metros: dict[str, float] = {}
    if metro_code_max <= 17 and by_metro_lf:
        for code, label in METRO_CODE_TO_LABEL.items():
            lf = by_metro_lf.get(code, 0.0)
            u = by_metro_u.get(code, 0.0)
            metros[label] = round(100.0 * u / lf, 2) if lf > 0 else 0.0

    national = round(100.0 * nat_u / nat_lf, 2) if nat_lf > 0 else None
    return provinces, national, metros, metro_code_max


def parse_worker_csv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        fn = list(reader.fieldnames or [])
        rows = list(reader)
    return rows, fn


def aggregate_qlfs_csv(path: Path) -> tuple[dict[str, float], float | None, dict[str, float]]:
    with path.open(newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        scol = status_column_qlfs(list(fieldnames))
        if not scol or "Province" not in fieldnames:
            raise ValueError(f"Missing columns in {path}")
        wcol = weight_column(list(fieldnames))
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
            if st is None or st not in (1, 2):
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
    if metro_code_max <= 17 and by_metro_lf:
        for code, label in METRO_CODE_TO_LABEL.items():
            lf = by_metro_lf.get(code, 0.0)
            u = by_metro_u.get(code, 0.0)
            metros[label] = round(100.0 * u / lf, 2) if lf > 0 else 0.0

    national = round(100.0 * nat_u / nat_lf, 2) if nat_lf > 0 else None
    return provinces, national, metros


def aggregate_lfs_folder(folder: Path) -> tuple[dict[str, float], float | None, dict[str, float]]:
    worker_path = find_lfs_worker_csv(folder)
    if not worker_path:
        raise ValueError("No WORKER csv")
    rows, fn = parse_worker_csv(worker_path)
    status_col = "Status1" if "Status1" in fn else None
    if not status_col:
        raise ValueError("No Status1")
    wcol = weight_column(fn)
    if not wcol:
        raise ValueError("No weight column")
    mcol = "Metro_code" if "Metro_code" in fn else None

    has_prov = any(x in fn for x in ("Prov", "PROV", "Province"))
    prov_map: dict[tuple[str, str], str] = {}
    if not has_prov:
        person_path = find_lfs_person_csv(folder)
        if not person_path:
            raise ValueError("WORKER has no Prov and no PERSON file")
        prov_map = load_person_prov_map(person_path)

    def get_prov(row: dict[str, str]) -> str | None:
        if has_prov:
            return row.get("Prov") or row.get("PROV") or row.get("Province")
        key = row_identity(row)
        if key is None:
            return None
        return prov_map.get(key)

    conv: list[dict[str, str]] = []
    for row in rows:
        st = normalize_labour_status(row.get(status_col))
        if st is None or st not in (1, 2):
            continue
        pv_raw = get_prov(row)
        if pv_raw is None or str(pv_raw).strip() == "":
            continue
        out = {
            "_norm_status": "1" if st == 1 else "2",
            "_pv": str(pv_raw).strip(),
            wcol: row.get(wcol) or "",
        }
        if mcol:
            out[mcol] = row.get(mcol) or ""
        conv.append(out)

    def gp(row: dict[str, str]) -> str | None:
        return row.get("_pv")

    provs, nat, metros, _ = aggregate_core_weighted_rows(conv, gp, "_norm_status", wcol, mcol)
    return provs, nat, metros


def aggregate_ohs_worker_csv(path: Path) -> tuple[dict[str, float], float | None, dict[str, float]]:
    rows, fn = parse_worker_csv(path)
    status_col = "STATUS1" if "STATUS1" in fn else ("Status1" if "Status1" in fn else None)
    if not status_col:
        raise ValueError("No STATUS1/Status1")
    prov_col = next((c for c in ("PROV", "Prov", "prov") if c in fn), None)
    if not prov_col:
        raise ValueError("No PROV")
    wcol = weight_column(fn)
    if not wcol:
        raise ValueError("No weight")

    conv: list[dict[str, str]] = []
    for row in rows:
        st = normalize_labour_status(row.get(status_col))
        if st is None or st not in (1, 2):
            continue
        out = {
            "_norm_status": "1" if st == 1 else "2",
            "_pv": (row.get(prov_col) or "").strip(),
            wcol: row.get(wcol) or "",
        }
        conv.append(out)

    def gp(row: dict[str, str]) -> str | None:
        return row.get("_pv")

    provs, nat, metros, _ = aggregate_core_weighted_rows(conv, gp, "_norm_status", wcol, None)
    return provs, nat, metros


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
            continue

        year = quarter = None
        try:
            if name.startswith("QLFS"):
                parsed = parse_qlfs_folder(name)
                if not parsed:
                    continue
                year, quarter = parsed
                csv_path = d / f"{name}.csv"
                if not csv_path.is_file():
                    continue
                provinces, national, metros = aggregate_qlfs_csv(csv_path)
            elif re.match(r"^LFS\d{6}$", name):
                parsed = parse_lfs_folder(name)
                if not parsed:
                    continue
                year, quarter = parsed
                provinces, national, metros = aggregate_lfs_folder(d)
            elif "ohs" in name.lower():
                year = parse_ohs_year(name)
                if year is None:
                    continue
                quarter = 4
                ocsv = find_ohs_labour_csv(d)
                if not ocsv:
                    print(f"SKIP OHS {name}: no suitable labour csv")
                    continue
                provinces, national, metros = aggregate_ohs_worker_csv(ocsv)
            else:
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
        except Exception as e:
            print(f"SKIP {name}: {e}")
            continue

    waves.sort(key=lambda w: (w["year"], w["quarter"]))

    seen: set[tuple[int, int]] = set()
    deduped: list[dict[str, Any]] = []
    for w in waves:
        key = (w["year"], w["quarter"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(w)
    waves = deduped

    payload = {
        "title": "Provincial narrow unemployment (harmonised survey extracts)",
        "definition": "Stats SA narrow unemployment: unemployed ÷ (employed + unemployed), survey-weighted. "
        "Built from QLFS where available; supplemented with harmonised LFS (2000–2007) and OHS worker files "
        "(selected October surveys) using Status1/STATUS1 employed vs unemployed classification.",
        "source_note": "Household survey microdata; producer Statistics South Africa. Series mixes survey instruments; "
        "interpret long-run comparisons cautiously.",
        "citation_apa": (
            "Statistics South Africa (1994–2025). QLFS / LFS / OHS microdata; provincial narrow unemployment "
            "computed by the author from CSV extracts (not official published tables)."
        ),
        "citation_urls": [
            "https://www.statssa.gov.za/?page_id=1854&PPN=P0211",
            "https://www.statssa.gov.za/",
            "https://datafirst.uct.ac.za/",
        ],
        "citation_link_labels": ["P0211 (QLFS)", "Stats SA", "DataFirst"],
        "method_note": (
            "Survey-weighted narrow LF unemployment by province; instruments change over time—treat long spans as indicative."
        ),
        "method_note_detail": (
            "QLFS: provinces 1–9; Lfs_Status or Status (1=employed, 2=unemployed); weights. "
            "LFS: Status1; province on worker or merged from person file; semi-annual rounds mapped to quarters. "
            "OHS: STATUS1 + province; single annual wave coded as Q4. "
            "Eight metro dots use Metro_code under QLFS from 2015 Q1 onward. Waves without comparable labour fields skipped."
        ),
        "waves": waves,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(waves)} waves to {OUT}")


if __name__ == "__main__":
    main()
