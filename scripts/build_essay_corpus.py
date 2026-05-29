#!/usr/bin/env python3
"""Build grounded Q&A corpus for the Essay Guide agent.

Output: website_v2/data/essay_corpus.json
"""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "website_v2" / "index.html"
KB_DIR = ROOT / "Knowledge Base" / "wiki" / "summaries"
DATA = ROOT / "website_v2" / "data"
OUT = DATA / "essay_corpus.json"

SECTION_TITLES = {
    "hero": "The Price of Integration",
    "question": "The Question",
    "from-the-ground": "From the Ground",
    "timeline": "Timeline",
    "macro": "National Economy",
    "sectors": "Sectors",
    "inequality": "Inequality",
    "two-lives": "Two Lives",
    "results": "Evidence",
    "map": "Map",
    "conclusions": "Conclusions",
    "sources": "Sources",
}

STOPWORDS = frozenset(
    "a an the and or but in on at to for of is are was were be been being "
    "it its this that with from as by not no so if than then into about "
    "what when how why who which their there they them we you your our".split()
)


def strip_html(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    text = unescape(html)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def neutralize_em_dash(text: str) -> str:
    """Replace em dashes in reader-facing strings (keep en-dashes in year ranges)."""
    return re.sub(r"\s*—\s*", ", ", text).replace(" ,", ",")


def clean_ui_noise(text: str) -> str:
    """Drop nav labels and figure credits pulled in from HTML stripping."""
    patterns = [
        r"Start with places\s*↓?",
        r"Jump to national charts\s*→?",
        r"see sources\.?",
        r"Built on WDI.*?QLFS data\s*—?",
        r"Final Project\s*·\s*Economics 30\s*·\s*Spring 2026",
        r"Section \d+",
        r"Source\s*$",
        r"Johannesburg from Braamfontein.*?(?=Trade openness|$)",
        r"Manufacturing, % of GDP\s*[–-]\s*→[^.]*\.?",
        r"Manufacturing, % of employed\s*[–-]\s*→[^.]*\.?",
        r"Tradable sectors, % of employed\s*[–-]\s*→[^.]*\.?",
        r"Agriculture \+ mining \+ manufacturing\s*",
        r"World Bank WDI\s*",
        r"OHS / LFS / QLFS\s*",
        r"Goods · Capital · Norms\s*",
        r"BH-significant\s*",
        r"Not significant\s*",
    ]
    for pat in patterns:
        text = re.sub(pat, " ", text, flags=re.I)
    text = re.sub(r"\s+([,.])", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_sections(html: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for m in re.finditer(
        r'<section\s+id="([^"]+)"[^>]*>([\s\S]*?)</section>',
        html,
        flags=re.I,
    ):
        sid, body = m.group(1), m.group(2)
        parts[sid] = strip_html(body)
    return parts


def slug_from_kb_path(path: Path) -> str:
    name = path.stem
    # Map common filename stems to data-kb slugs used on the site
    aliases = {
        "gear-1996-macroeconomic-strategy": "gear-strategy",
        "rdp-1994": "reconstruction-and-development-programme",
        "rdp-to-gear-transition": "rdp-to-gear-transition",
    }
    return aliases.get(name, name)


def load_kb_chunks() -> list[dict]:
    chunks = []
    if not KB_DIR.is_dir():
        return chunks
    for path in sorted(KB_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        # Drop YAML front matter
        if raw.startswith("---"):
            end = raw.find("---", 3)
            if end != -1:
                raw = raw[end + 3 :]
        text = neutralize_em_dash(strip_html(raw))
        if len(text) < 80:
            continue
        slug = slug_from_kb_path(path)
        chunks.append(
            {
                "id": f"kb-{slug}",
                "section": "sources",
                "title": path.stem.replace("-", " ").title(),
                "anchor": "#sources",
                "text": text[:4000],
                "stats": [],
                "kb": [slug],
                "keywords": tokenize(text)[:40],
            }
        )
    return chunks


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]


def load_regression_stats() -> list[dict]:
    reg_path = DATA / "regressions.json"
    if not reg_path.is_file():
        return []
    reg = json.loads(reg_path.read_text(encoding="utf-8"))
    meta = reg.get("meta", {})
    chunks = [
        {
            "id": "stats-meta",
            "section": "results",
            "title": "Regression battery overview",
            "anchor": "#results",
            "text": (
                f"The project ran {meta.get('n_specs', '?')} regression specifications on a "
                f"national panel from {meta.get('panel_year_min', '?')} to {meta.get('panel_year_max', '?')}. "
                f"At the basic 5% cutoff, {meta.get('n_sig_raw', '?')} were significant; "
                f"{meta.get('n_sig_bonf', '?')} survived Bonferroni; "
                f"{meta.get('n_sig_bh', '?')} survived Benjamini–Hochberg (BH). "
                "HAC standard errors use 3 lags. These are associations, not proof of causation."
            ),
            "stats": [
                {"label": "Tests run", "value": str(meta.get("n_specs"))},
                {"label": "BH-significant", "value": str(meta.get("n_sig_bh"))},
            ],
            "kb": [],
            "keywords": ["regression", "benjamini", "hochberg", "bonferroni", "hac", "significant"],
        },
        {
            "id": "stats-headline-trade",
            "section": "results",
            "title": "Trade and employment / inequality",
            "anchor": "#results",
            "text": (
                "Two conclusions survive strict BH corrections. First, trade openness lines up with "
                "decline in trade-exposed sectors: manufacturing employment share and tradable employment "
                "share both fall as trade openness rises (HAC t roughly -2.5 and -3.8 over 26 years). "
                "Second, trade openness tracks the rise of the top 1% income share. The Chow test does "
                "not find a clean structural break at the 1996 GEAR pivot. Trade does not robustly "
                "explain unemployment levels on its own."
            ),
            "stats": [],
            "kb": ["trade-liberalization-local-labor-markets-south-africa"],
            "keywords": ["trade", "openness", "manufacturing", "tradable", "unemployment", "gear", "top 1"],
        },
    ]
    return chunks


def load_two_lives_chunk() -> dict | None:
    path = DATA / "two-lives.json"
    if not path.is_file():
        return None
    tl = json.loads(path.read_text(encoding="utf-8"))
    intro = tl.get("intro", {})
    chars = tl.get("characters", {})
    pieter = chars.get("pieter", {})
    sipho = chars.get("sipho", {})
    beats_text = " ".join(
        f"{b.get('year', '')}: {b.get('title', '')} {b.get('scene', '')}"
        for b in tl.get("beats", [])[:6]
    )
    return {
        "id": "two-lives-overview",
        "section": "two-lives",
        "title": "Two Lives interactive",
        "anchor": "#two-lives",
        "text": (
            f"{intro.get('lede', '')} "
            f"Pieter: {pieter.get('tagline', '')} {pieter.get('blurb', '')} "
            f"Sipho: {sipho.get('tagline', '')} {sipho.get('blurb', '')} "
            f"Key beats: {beats_text}"
        )[:3500],
        "stats": [],
        "kb": [],
        "keywords": ["pieter", "sipho", "township", "johannesburg", "interactive", "choices"],
    }


def load_timeseries_chunk() -> dict | None:
    path = DATA / "timeseries.json"
    if not path.is_file():
        return None
    ts = json.loads(path.read_text(encoding="utf-8"))
    years = ts.get("years") or ts.get("year") or []
    if not years:
        return None
    last = years[-1] if isinstance(years, list) else None
    note = (
        "National time series cover trade openness (exports plus imports over GDP), "
        "GDP per capita indexed to 1990, and broad unemployment from WDI and labour surveys. "
        "After 1994 trade openness rose much faster than income per person while unemployment stayed high."
    )
    return {
        "id": "macro-timeseries",
        "section": "macro",
        "title": "Macro charts data",
        "anchor": "#macro",
        "text": note,
        "stats": [{"label": "Latest year in panel", "value": str(last)}] if last else [],
        "kb": ["dataset-sa-wdi-panel"],
        "keywords": ["trade", "gdp", "unemployment", "openness", "indexed", "1990"],
    }


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    sections = extract_sections(html)
    chunks: list[dict] = []

    for sid, text in sections.items():
        if len(text) < 40:
            continue
        # Split long sections into sub-chunks (~1200 chars) for retrieval
        paras = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text) if len(p.strip()) > 30]
        buf = ""
        part = 0
        for para in paras:
            if len(buf) + len(para) > 1200 and buf:
                chunks.append(_section_chunk(sid, buf, part))
                part += 1
                buf = para
            else:
                buf = f"{buf} {para}".strip() if buf else para
        if buf:
            chunks.append(_section_chunk(sid, buf, part))

    chunks.extend(load_kb_chunks())
    chunks.extend(load_regression_stats())
    for extra in (load_two_lives_chunk(), load_timeseries_chunk()):
        if extra:
            chunks.append(extra)

    # FAQ-style curated answers for common demo questions
    faqs = [
        (
            "what is this essay about",
            "The Price of Integration is an Economics 30 capstone about South Africa after apartheid. "
            "It asks whether opening the economy after 1994 spread opportunity to most people. "
            "The data show trade and GDP per capita rose, but unemployment stayed high, tradable sectors "
            "(especially manufacturing) lost jobs and output share, and income concentrated at the top.",
            "hero",
            "#hero",
            ["essay", "about", "project", "capstone", "integration", "south africa"],
        ),
        (
            "what happened in 1994",
            "In April 1994 South Africa held its first democratic elections after apartheid. Sanctions lifted, "
            "the rand could float, and the country rejoined global trade and finance. The new government launched "
            "the RDP (redistribution and services); policy shifted toward GEAR by 1996.",
            "timeline",
            "#timeline",
            ["1994", "elections", "apartheid", "sanctions", "democracy"],
        ),
        (
            "what happened in 1996",
            "In June 1996 the government adopted GEAR (Growth, Employment and Redistribution): tighter fiscal targets, "
            "lower import tariffs, inflation targeting, and more capital-account openness. It marked a shift away from "
            "the RDP's redistribution-first emphasis. The essay's regressions do not find a clean structural break "
            "exactly at 1996, but GEAR names the policy turn toward orthodox macro stabilisation.",
            "timeline",
            "#timeline",
            ["1996", "gear", "policy", "happened", "rdp"],
        ),
        (
            "when did trade rise",
            "Trade openness (exports plus imports as a share of GDP) climbed steadily after apartheid ended and "
            "sanctions lifted. On the site's macro charts it rises much faster than income per person from the "
            "mid-1990s onward (roughly 37% of GDP toward the mid-60s by the 2010s). That is correlation in national "
            "data, not proof trade alone caused every other trend.",
            "macro",
            "#macro",
            ["trade", "rise", "openness", "exports", "imports", "when"],
        ),
        (
            "what is gear",
            "GEAR (Growth, Employment and Redistribution) was South Africa's 1996 macro strategy: "
            "tighter fiscal policy, lower import tariffs, inflation targets, and capital-account liberalisation. "
            "It replaced the earlier RDP emphasis on redistribution and public investment. The essay does not "
            "treat GEAR as the sole villain; the Chow test does not find a clean break exactly at 1996.",
            "question",
            "#question",
            ["gear", "rdp", "1996", "policy"],
        ),
        (
            "what is rdp",
            "The Reconstruction and Development Programme (RDP, 1994) promised housing, services, and "
            "redistribution as part of growth. By 1996 policy shifted toward GEAR. The site maps both as "
            "context for the post-1994 opening, not as a full policy history.",
            "question",
            "#question",
            ["rdp", "reconstruction", "1994"],
        ),
        (
            "why unemployment",
            "National unemployment stayed very high after 1994 even as trade openness and GDP per capita rose. "
            "Tradable sectors (agriculture, mining, manufacturing) shed employment share while services did not "
            "fully absorb displaced workers. Trade alone does not robustly explain unemployment in the regression "
            "battery; the sector story is the sharper lens.",
            "macro",
            "#macro",
            ["unemployment", "jobs", "labour"],
        ),
        (
            "what does the map show",
            "The map colours South Africa's nine provinces by unemployment using the same colour scale every year "
            "so you can compare over time. Poorer eastern provinces and former homeland regions tend to stay darker "
            "(higher unemployment); Gauteng is somewhat lighter on average but far from full employment.",
            "map",
            "#map",
            ["map", "provinces", "unemployment", "geography"],
        ),
        (
            "remember one sentence",
            "South Africa reconnected to the world faster than it shared the benefits. Integration raised trade "
            "and average income but left unemployment high and income concentrated at the top.",
            "conclusions",
            "#conclusions",
            ["takeaway", "conclusion", "one sentence"],
        ),
    ]
    for fid, text, section, anchor, kws in faqs:
        chunks.append(
            {
                "id": f"faq-{fid.replace(' ', '-')}",
                "section": section,
                "title": f"FAQ: {fid}",
                "anchor": anchor,
                "text": neutralize_em_dash(text),
                "stats": [],
                "kb": [],
                "keywords": kws,
            }
        )

    for c in chunks:
        if c.get("text"):
            c["text"] = neutralize_em_dash(c["text"])
        if "keywords" not in c or not c["keywords"]:
            c["keywords"] = tokenize(c.get("text", ""))[:50]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"version": 1, "chunks": chunks}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(chunks)} chunks -> {OUT}")


def _section_chunk(sid: str, text: str, part: int) -> dict:
    title = SECTION_TITLES.get(sid, sid.replace("-", " ").title())
    text = neutralize_em_dash(clean_ui_noise(text))
    return {
        "id": f"{sid}-{part}" if part else sid,
        "section": sid,
        "title": title,
        "anchor": f"#{sid}",
        "text": text[:2000],
        "stats": [],
        "kb": [],
        "keywords": tokenize(text)[:50],
    }


if __name__ == "__main__":
    main()
