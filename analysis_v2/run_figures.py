#!/usr/bin/env python3
"""
Produce figures (PNG) and website JSON fixtures from the merged SA panel.

Outputs
-------
- analysis_v2/outputs/fig_*.png  (static backups)
- website_v2/data/timeseries.json
- website_v2/data/inequality.json
- website_v2/data/governance.json
- website_v2/data/regressions.json   (copy of the headline results payload)
- website_v2/data/panel.json         (long-form panel, for client-side scatter)
- website_v2/data/qlfs_2025q1.json   (snapshot for the interactive map)
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "outputs"
SITE_DATA = ROOT.parent / "website_v2" / "data"
PANEL_CSV = OUT / "sa_panel_full.csv"
REG_JSON = OUT / "regression_results.json"


def _fig_style() -> None:
    plt.rcParams.update(
        {
            "figure.figsize": (8.0, 4.5),
            "figure.dpi": 150,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.titlesize": 12,
            "axes.titleweight": "600",
            "axes.labelsize": 10,
            "axes.grid": True,
            "grid.color": "#e6e9ef",
            "grid.linewidth": 0.8,
            "font.family": "DejaVu Sans",
        }
    )


def _nan_to_none(xs):
    return [None if (x is None or (isinstance(x, float) and np.isnan(x))) else float(x) for x in xs]


def _series(df: pd.DataFrame, col: str) -> list:
    return _nan_to_none(df[col].tolist())


def write_timeseries(df: pd.DataFrame) -> None:
    payload = {
        "years": df["year"].tolist(),
        "series": {
            "gdp_pc_usd": {
                "label": "GDP per capita (constant USD)",
                "source": "WDI",
                "values": _series(df, "wdi_gdp_pc_usd"),
            },
            "gdp_growth": {
                "label": "GDP growth (%)",
                "source": "WDI",
                "values": _series(df, "wdi_gdp_growth"),
            },
            "trade_gdp": {
                "label": "Trade / GDP (%)",
                "source": "WDI",
                "values": _series(df, "wdi_trade_gdp"),
            },
            "fdi_gdp": {
                "label": "FDI / GDP (%)",
                "source": "WDI",
                "values": _series(df, "wdi_fdi_gdp"),
            },
            "unemployment": {
                "label": "Unemployment (ILO, %)",
                "source": "WDI",
                "values": _series(df, "wdi_unemployment"),
            },
        },
        "indexed": _build_indexed(df),
    }
    (SITE_DATA / "timeseries.json").write_text(json.dumps(payload, indent=2))


def _build_indexed(df: pd.DataFrame) -> dict:
    """Rebase all macro series to 100 at 1990 so they share an axis."""
    base_year = 1990
    series_cols = {
        "gdp_pc_usd": "GDP per capita",
        "trade_gdp": "Trade / GDP",
        "fdi_gdp": "FDI / GDP",
    }
    col_map = {
        "gdp_pc_usd": "wdi_gdp_pc_usd",
        "trade_gdp": "wdi_trade_gdp",
        "fdi_gdp": "wdi_fdi_gdp",
    }
    out = {"years": df["year"].tolist(), "series": {}}
    for key, label in series_cols.items():
        base = df.loc[df.year == base_year, col_map[key]]
        if base.empty or pd.isna(base.iloc[0]):
            continue
        base_val = float(base.iloc[0])
        scaled = (df[col_map[key]] / base_val) * 100
        out["series"][key] = {
            "label": f"{label} (1990=100)",
            "values": _nan_to_none(scaled.tolist()),
        }
    return out


def write_inequality(df: pd.DataFrame) -> None:
    payload = {
        "years": df["year"].tolist(),
        "series": {
            "top1_inc": {
                "label": "Top-1% pre-tax income share",
                "source": "WID",
                "values": _series(df, "wid_top1_inc"),
            },
            "top10_inc": {
                "label": "Top-10% pre-tax income share",
                "source": "WID",
                "values": _series(df, "wid_top10_inc"),
            },
            "bottom50_inc": {
                "label": "Bottom-50% pre-tax income share",
                "source": "WID",
                "values": _series(df, "wid_bottom50_inc"),
            },
            "top10_wealth": {
                "label": "Top-10% wealth share",
                "source": "WID",
                "values": _series(df, "wid_top10_wealth"),
            },
            "top1_wealth": {
                "label": "Top-1% wealth share",
                "source": "WID",
                "values": _series(df, "wid_top1_wealth"),
            },
            "wiid_gini": {
                "label": "Gini (WIID best-quality)",
                "source": "WIID",
                "values": _series(df, "wiid_gini"),
            },
            "wdi_gini": {
                "label": "Gini (World Bank WDI)",
                "source": "WDI",
                "values": _series(df, "wdi_gini"),
            },
        },
    }
    (SITE_DATA / "inequality.json").write_text(json.dumps(payload, indent=2))


def write_governance(df: pd.DataFrame) -> None:
    payload = {
        "years": df["year"].tolist(),
        "series": {
            key: {
                "label": name,
                "source": "WGI",
                "values": _series(df, f"wgi_{key}"),
            }
            for key, name in {
                "va": "Voice & accountability",
                "pv": "Political stability",
                "ge": "Government effectiveness",
                "rq": "Regulatory quality",
                "rl": "Rule of law",
                "cc": "Control of corruption",
            }.items()
        }
        | {
            "avg": {
                "label": "WGI average (0–1)",
                "source": "WGI",
                "values": _series(df, "wgi_avg"),
            }
        },
    }
    (SITE_DATA / "governance.json").write_text(json.dumps(payload, indent=2))


def write_panel(df: pd.DataFrame) -> None:
    # Long-form panel keeps the JSON small enough for a direct download.
    keep = [
        "year",
        "wdi_gdp_pc_usd",
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
    rows = []
    for _, row in df[keep].iterrows():
        rows.append({k: (None if pd.isna(v) else (int(v) if k == "year" else float(v))) for k, v in row.items()})
    (SITE_DATA / "panel.json").write_text(json.dumps(rows, indent=2))


def copy_regression_payload() -> None:
    dest = SITE_DATA / "regressions.json"
    shutil.copy(REG_JSON, dest)


def write_qlfs_snapshot() -> None:
    # Figures drawn from Knowledge Base/wiki/summaries/stats-sa-qlfs-p0211-2025q1.md
    payload = {
        "quarter": "2025Q1",
        "source": "Stats SA QLFS, P0211",
        "national": {
            "unemployment_rate": 32.9,
            "expanded_unemployment_rate": 43.1,
            "youth_unemployment_rate": 46.1,
            "labour_force_millions": 25.3,
        },
        "provinces": {
            "Western Cape": {"unemployment_rate": 20.9},
            "Eastern Cape": {"unemployment_rate": 39.8},
            "Northern Cape": {"unemployment_rate": 26.4},
            "Free State": {"unemployment_rate": 36.6},
            "KwaZulu-Natal": {"unemployment_rate": 29.2},
            "North West": {"unemployment_rate": 34.2},
            "Gauteng": {"unemployment_rate": 33.9},
            "Mpumalanga": {"unemployment_rate": 35.3},
            "Limpopo": {"unemployment_rate": 34.0},
        },
    }
    (SITE_DATA / "qlfs_2025q1.json").write_text(json.dumps(payload, indent=2))


# ---------------------------------------------------------------------------
# Static PNGs (backup / report-quality)
# ---------------------------------------------------------------------------

def _save(fig: plt.Figure, name: str) -> None:
    fig.tight_layout()
    fig.savefig(OUT / name, bbox_inches="tight")
    plt.close(fig)


def fig_indexed(df: pd.DataFrame) -> None:
    cols = {
        "wdi_gdp_pc_usd": "GDP per capita",
        "wdi_trade_gdp": "Trade / GDP",
        "wdi_fdi_gdp": "FDI / GDP",
    }
    fig, ax = plt.subplots()
    base = df[df.year == 1990].iloc[0]
    for col, label in cols.items():
        base_val = base[col]
        if pd.isna(base_val):
            continue
        ax.plot(df.year, df[col] / base_val * 100, label=label, linewidth=2)
    ax.axvline(1996, color="#555", linestyle="--", linewidth=0.8, alpha=0.6)
    ax.text(1996.2, ax.get_ylim()[1] * 0.95, "GEAR 1996", fontsize=8, color="#555")
    ax.set_title("Indexed macro indicators, 1990 = 100")
    ax.set_ylabel("Index (1990=100)")
    ax.set_xlabel("Year")
    ax.legend(frameon=False, loc="upper left")
    _save(fig, "fig_indexed.png")


def fig_inequality(df: pd.DataFrame) -> None:
    fig, ax = plt.subplots()
    ax.plot(df.year, df["wid_top10_inc"], label="Top 10% income", linewidth=2)
    ax.plot(df.year, df["wid_top1_inc"], label="Top 1% income", linewidth=2)
    ax.plot(df.year, df["wid_bottom50_inc"], label="Bottom 50% income", linewidth=2)
    ax.set_title("Pre-tax national income shares, South Africa (WID)")
    ax.set_ylabel("Share of national income")
    ax.set_xlabel("Year")
    ax.legend(frameon=False)
    _save(fig, "fig_inequality_income.png")

    fig2, ax2 = plt.subplots()
    ax2.plot(df.year, df["wid_top10_wealth"], label="Top 10% wealth", linewidth=2)
    ax2.plot(df.year, df["wid_top1_wealth"], label="Top 1% wealth", linewidth=2)
    ax2.set_title("Wealth shares, South Africa (WID)")
    ax2.set_ylabel("Share of household wealth")
    ax2.set_xlabel("Year")
    ax2.legend(frameon=False)
    _save(fig2, "fig_inequality_wealth.png")


def fig_governance(df: pd.DataFrame) -> None:
    cols = {
        "wgi_va": "Voice & accountability",
        "wgi_pv": "Political stability",
        "wgi_ge": "Gov effectiveness",
        "wgi_rq": "Regulatory quality",
        "wgi_rl": "Rule of law",
        "wgi_cc": "Control of corruption",
    }
    fig, ax = plt.subplots()
    for col, label in cols.items():
        ax.plot(df.year, df[col], label=label, linewidth=1.5)
    ax.plot(df.year, df["wgi_avg"], label="Average", color="black", linewidth=2.2)
    ax.set_title("WGI pillars, South Africa (normalised 0–1)")
    ax.set_ylabel("Normalised score")
    ax.set_xlabel("Year")
    ax.legend(frameon=False, fontsize=8, ncol=2)
    _save(fig, "fig_wgi.png")


def fig_scatter_headline(df: pd.DataFrame) -> None:
    # Top-10% income share vs trade/GDP and vs FDI/GDP
    for x, title, name in [
        ("wdi_trade_gdp", "Top-10% income share vs Trade/GDP", "fig_scatter_top10_trade.png"),
        ("wdi_fdi_gdp", "Top-10% income share vs FDI/GDP", "fig_scatter_top10_fdi.png"),
        ("wdi_unemployment", "Top-10% income share vs unemployment", "fig_scatter_top10_unemp.png"),
    ]:
        sub = df[[x, "wid_top10_inc", "year"]].dropna()
        if sub.empty:
            continue
        fig, ax = plt.subplots()
        ax.scatter(sub[x], sub["wid_top10_inc"], c=sub["year"], cmap="viridis")
        if len(sub) > 2:
            coef = np.polyfit(sub[x], sub["wid_top10_inc"], 1)
            xs = np.linspace(sub[x].min(), sub[x].max(), 50)
            ax.plot(xs, np.polyval(coef, xs), color="#c0392b", linewidth=1.5, linestyle="--")
        ax.set_title(title)
        ax.set_xlabel(x)
        ax.set_ylabel("Top-10% income share")
        _save(fig, name)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    SITE_DATA.mkdir(parents=True, exist_ok=True)
    _fig_style()
    df = pd.read_csv(PANEL_CSV)

    write_timeseries(df)
    write_inequality(df)
    write_governance(df)
    write_panel(df)
    write_qlfs_snapshot()
    copy_regression_payload()

    fig_indexed(df)
    fig_inequality(df)
    fig_governance(df)
    fig_scatter_headline(df)

    print(f"Wrote fixtures to {SITE_DATA}")
    print(f"Wrote PNGs to {OUT}")


if __name__ == "__main__":
    main()
