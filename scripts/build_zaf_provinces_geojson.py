#!/usr/bin/env python3
"""
Download GADM South Africa admin level 1 (provinces), normalize names to match
QLFS Province labels, round coordinates, and write website_v2/zaf-provinces.geojson.

GADM is used for boundary geometry only; labour statistics remain author-derived
from QLFS extracts elsewhere.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "website_v2" / "zaf-provinces.geojson"

GADM_URL = "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ZAF_1.json"

# GADM NAME_1 → label used in map_unemployment_series.json / QLFS Province names
NAME_MAP = {
    "EasternCape": "Eastern Cape",
    "FreeState": "Free State",
    "Gauteng": "Gauteng",
    "KwaZulu-Natal": "KwaZulu-Natal",
    "Limpopo": "Limpopo",
    "Mpumalanga": "Mpumalanga",
    "NorthWest": "North West",
    "NorthernCape": "Northern Cape",
    "WesternCape": "Western Cape",
}


def round_geom(obj: object, nd: int = 4) -> object:
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, list):
        return [round_geom(x, nd) for x in obj]
    return obj


def main() -> None:
    with urllib.request.urlopen(GADM_URL, timeout=120) as r:
        raw = json.load(r)

    features = []
    for feat in raw.get("features", []):
        props = feat.get("properties") or {}
        n1 = props.get("NAME_1")
        if not n1 or n1 not in NAME_MAP:
            continue
        geom = feat.get("geometry")
        if not geom:
            continue
        geom["coordinates"] = round_geom(geom["coordinates"])
        features.append(
            {
                "type": "Feature",
                "properties": {"province": NAME_MAP[n1]},
                "geometry": geom,
            }
        )

    out = {"type": "FeatureCollection", "features": features}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out), encoding="utf-8")
    print(f"Wrote {len(features)} provinces to {OUT}")


if __name__ == "__main__":
    main()
