/* =============================================================
   Econ 30 · SA integration — website_v2 / app.js
   Chart.js + Leaflet + regression-table renderer + theme toggle.
   ============================================================= */

(() => {
  "use strict";

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const fmt = {
    p: v => (v == null ? "–" : (v < 1e-4 ? "<0.0001" : v.toFixed(4))),
    p3: v => (v == null ? "–" : (v < 1e-3 ? "<0.001" : v.toFixed(3))),
    n: v => (v == null ? "–" : v.toString()),
    r2: v => (v == null ? "–" : v.toFixed(3)),
    dw: v => (v == null ? "–" : v.toFixed(2)),
    sig: v => (v == null ? "" : (v.toFixed(3))),
    coef: v => (v == null ? "–" : v.toLocaleString(undefined, { maximumSignificantDigits: 4 })),
  };

  const fetchJSON = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  });

  // ------------------------------------------------------------
  // Theme toggle (light ↔ dark, persisted)
  // ------------------------------------------------------------
  const themeKey = "econ30-theme";
  const applyTheme = t => {
    document.documentElement.dataset.theme = t;
    const btn = $("#theme-toggle .theme-icon");
    if (btn) btn.textContent = t === "dark" ? "◑" : "◐";
  };
  const initialTheme = () => {
    const saved = localStorage.getItem(themeKey);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  applyTheme(initialTheme());
  $("#theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(themeKey, cur);
    applyTheme(cur);
    // Chart.js does not auto-update; rebuild charts on theme flip.
    Chart.helpers?.each?.(Chart.instances ?? {}, c => c.update());
  });

  // ------------------------------------------------------------
  // Chart.js defaults keyed to CSS variables
  // ------------------------------------------------------------
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const palette = () => ({
    fg: cssVar("--fg"),
    muted: cssVar("--fg-muted"),
    rule: cssVar("--rule"),
    accent: cssVar("--accent"),
    wdi: cssVar("--c-wdi"),
    wid: cssVar("--c-wid"),
    wiid: cssVar("--c-wiid"),
    wgi: cssVar("--c-wgi"),
    qlfs: cssVar("--c-qlfs"),
    danger: cssVar("--danger"),
    warn: cssVar("--warn"),
  });

  const setChartDefaults = () => {
    const p = palette();
    Chart.defaults.font.family = "Inter, -apple-system, system-ui, sans-serif";
    Chart.defaults.color = p.muted;
    Chart.defaults.borderColor = p.rule;
    Chart.defaults.plugins.legend.labels.color = p.fg;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.92)";
    Chart.defaults.plugins.tooltip.titleColor = "#fff";
    Chart.defaults.plugins.tooltip.bodyColor = "#fff";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.08)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.boxPadding = 6;
    Chart.defaults.plugins.tooltip.padding = 8;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
  };
  setChartDefaults();

  const makeLineChart = (canvas, { labels, datasets, yTitle, xTitle, xAxisType = "linear", yAxisType = "linear" }) => {
    const p = palette();
    const yScale = {
      type: yAxisType,
      title: yTitle ? { display: true, text: yTitle, color: p.muted } : { display: false },
      grid: { color: p.rule, drawBorder: false },
      ticks: { color: p.muted },
    };
    if (yAxisType === "logarithmic") {
      yScale.ticks.callback = function (value) {
        if (value === 50 || value === 75 || value === 100 || value === 150 || value === 200 ||
            value === 300 || value === 500 || value === 1000) {
          return value;
        }
        return null;
      };
    }
    return new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            type: xAxisType,
            title: xTitle ? { display: true, text: xTitle, color: p.muted } : { display: false },
            grid: { color: p.rule, drawBorder: false },
            ticks: { color: p.muted, maxRotation: 0 },
          },
          y: yScale,
        },
        elements: {
          line: { tension: 0.25, borderWidth: 2 },
          point: { radius: 2, hoverRadius: 4 },
        },
      },
    });
  };

  // ------------------------------------------------------------
  // Macro / inequality / governance / hero charts
  // ------------------------------------------------------------
  const datasetFrom = (years, series, color, style = {}) => ({
    label: series.label,
    data: series.values.map((v, i) => ({ x: years[i], y: v })),
    borderColor: color,
    backgroundColor: color + "33",
    pointBackgroundColor: color,
    spanGaps: true,
    ...style,
  });

  const buildHeroChart = (inequality, timeseries) => {
    const canvas = $("#chart-hero");
    if (!canvas) return;
    const p = palette();
    const years = inequality.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, inequality.series.top10_inc, p.wid, { borderWidth: 2.5 }),
        datasetFrom(timeseries.years, { label: "Trade / GDP (rescaled)", values: timeseries.series.trade_gdp.values.map(v => v == null ? null : v / 100) }, p.wdi, { borderDash: [4, 4] }),
      ],
      yTitle: "share (0–1)",
      xTitle: "Year",
    });
  };

  const buildIndexedChart = (ts) => {
    const canvas = $("#chart-indexed");
    if (!canvas) return;
    const p = palette();
    const years = ts.indexed.years;
    const ds = [];
    const colors = { gdp_pc_usd: p.wdi, trade_gdp: p.accent, fdi_gdp: p.wgi };
    Object.entries(ts.indexed.series).forEach(([key, s]) => {
      ds.push(datasetFrom(years, s, colors[key] ?? p.fg, { borderWidth: 2.2 }));
    });
    makeLineChart(canvas, {
      labels: years,
      datasets: ds,
      yTitle: "Index (1990 = 100, log scale)",
      xTitle: "Year",
      yAxisType: "logarithmic",
    });
  };

  const buildUnemploymentChart = (ts) => {
    const canvas = $("#chart-unemployment");
    if (!canvas) return;
    const p = palette();
    const years = ts.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [datasetFrom(years, ts.series.unemployment, p.danger, { borderWidth: 2.5 })],
      yTitle: "% labour force",
      xTitle: "Year",
    });
  };

  const buildIncomeChart = (ineq) => {
    const canvas = $("#chart-income-shares");
    if (!canvas) return;
    const p = palette();
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.top10_inc, p.wid),
        datasetFrom(years, ineq.series.top1_inc, p.danger),
        datasetFrom(years, ineq.series.bottom50_inc, p.wgi),
      ],
      yTitle: "Share of pre-tax income",
      xTitle: "Year",
    });
  };

  const buildWealthChart = (ineq) => {
    const canvas = $("#chart-wealth-shares");
    if (!canvas) return;
    const p = palette();
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.top10_wealth, p.wid),
        datasetFrom(years, ineq.series.top1_wealth, p.danger),
      ],
      yTitle: "Share of wealth",
      xTitle: "Year",
    });
  };

  const buildGiniChart = (ineq) => {
    const canvas = $("#chart-gini");
    if (!canvas) return;
    const p = palette();
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.wiid_gini, p.wiid, { pointRadius: 4 }),
        datasetFrom(years, ineq.series.wdi_gini, p.wdi, { pointRadius: 4, borderDash: [4, 4] }),
      ],
      yTitle: "Gini",
      xTitle: "Year",
    });
  };

  const buildScatterTop10Trade = (panel) => {
    const canvas = $("#chart-scatter-top10-trade");
    if (!canvas) return;
    const p = palette();
    const points = panel
      .filter(r => r.wdi_trade_gdp != null && r.wid_top10_inc != null)
      .map(r => ({ x: r.wdi_trade_gdp, y: r.wid_top10_inc, year: r.year }));
    // OLS fit
    const n = points.length;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
    const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const slope = num / den;
    const intercept = my - slope * mx;
    const xmin = Math.min(...points.map(p => p.x));
    const xmax = Math.max(...points.map(p => p.x));
    const line = [{ x: xmin, y: intercept + slope * xmin }, { x: xmax, y: intercept + slope * xmax }];
    new Chart(canvas, {
      data: {
        datasets: [
          {
            type: "scatter",
            label: "Year",
            data: points,
            backgroundColor: p.wid,
            borderColor: p.wid,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            type: "line",
            label: `OLS fit (β=${slope.toFixed(4)})`,
            data: line,
            borderColor: p.danger,
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pt = ctx.raw;
                if (pt.year != null) return `${pt.year}: trade=${pt.x}, top10=${(pt.y * 100).toFixed(1)}%`;
                return `${ctx.dataset.label}`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "Trade / GDP (%)" }, grid: { color: p.rule } },
          y: { title: { display: true, text: "Top-10% share" }, grid: { color: p.rule } },
        },
      },
    });
  };

  const buildWGIChart = (gov) => {
    const canvas = $("#chart-wgi");
    if (!canvas) return;
    const p = palette();
    const years = gov.years;
    const colors = { va: p.wdi, pv: p.wid, ge: p.wgi, rq: p.wiid, rl: p.accent, cc: p.danger };
    const ds = [];
    ["va", "pv", "ge", "rq", "rl", "cc"].forEach(k => {
      ds.push(datasetFrom(years, gov.series[k], colors[k], { borderWidth: 1.5 }));
    });
    ds.push(datasetFrom(years, gov.series.avg, p.fg, { borderWidth: 3 }));
    makeLineChart(canvas, { labels: years, datasets: ds, yTitle: "Normalised (0–1)", xTitle: "Year" });
  };

  // ------------------------------------------------------------
  // Timeline
  // ------------------------------------------------------------
  const TIMELINE = [
    { year: "1989–93", title: "Apartheid sanctions unravel", kb: "apartheid-era-sanctions",
      body: "Trade and financial sanctions lifted gradually as CODESA negotiations progressed." },
    { year: "1994", title: "Democratic elections · RDP", kb: "reconstruction-and-development-programme",
      body: "RDP launched as a redistributive development programme; tariffs still high." },
    { year: "1995", title: "WTO accession", kb: "state-of-trade-policy-south-africa",
      body: "Binding commitments lock in large tariff reductions through 2005." },
    { year: "1996", title: "GEAR adopted", kb: "gear-strategy",
      body: "Fiscal consolidation, liberalisation, partial privatisation and inflation targeting." },
    { year: "2000s", title: "Commodity supercycle", kb: "minerals-energy-complex",
      body: "Resource prices and FDI flows surge; non-mineral manufacturing stagnates." },
    { year: "2008–09", title: "Global financial crisis", kb: "trade-liberalization-sa-manufacturing",
      body: "Manufacturing contracts sharply; unemployment ratchets up." },
    { year: "2009–18", title: "Zuma era — state capture", kb: "political-economy-of-transition",
      body: "Governance indicators slide; rule of law and control of corruption decline." },
    { year: "2020–22", title: "COVID-19 shock", kb: "building-back-better-covid-jobs",
      body: "Largest single-year employment loss on record; partial rebound 2021–22." },
    { year: "2024–25", title: "QLFS Q1 2025: u = 32.9%", kb: "stats-sa-qlfs-p0211-2025q1",
      body: "Expanded unemployment at 43.1%; youth unemployment at 46.1%." },
  ];
  // wiki links: map slugs to their sub-folder
  const KB_FOLDER = {
    "apartheid-era-sanctions": "concepts",
    "reconstruction-and-development-programme": "concepts",
    "gear-strategy": "concepts",
    "state-of-trade-policy-south-africa": "summaries",
    "minerals-energy-complex": "concepts",
    "trade-liberalization-sa-manufacturing": "summaries",
    "political-economy-of-transition": "concepts",
    "building-back-better-covid-jobs": "summaries",
    "stats-sa-qlfs-p0211-2025q1": "summaries",
  };
  const renderTimeline = () => {
    const list = $("#timeline-list");
    if (!list) return;
    TIMELINE.forEach(item => {
      const folder = KB_FOLDER[item.kb] ?? "concepts";
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="year">${item.year}</span>
        <h4>${item.title}</h4>
        <p>${item.body}</p>
        <a class="kb-link" href="../Knowledge Base/wiki/${folder}/${item.kb}.md" data-kb="${item.kb}">View source →</a>`;
      list.appendChild(li);
    });
  };

  // ------------------------------------------------------------
  // Regression tables
  // ------------------------------------------------------------
  const dwClass = v => v == null ? "" : (v < 1.2 || v > 2.8 ? "dw-bad" : (v < 1.5 || v > 2.5 ? "" : "dw-ok"));
  const pClass = v => v == null ? "" : (v < 0.05 ? "p-sig" : "p-notsig");

  const tierFor = (r) => {
    const bh = r.min_p_bh, bf = r.min_p_bonf, raw = r.min_p_raw;
    if (bh != null && bh < 0.05) return { cls: "tier-bh", label: "BH", title: "Survives Benjamini-Hochberg" };
    if (bf != null && bf < 0.05) return { cls: "tier-bonf", label: "Bonf", title: "Survives Bonferroni" };
    if (raw != null && raw < 0.05) return { cls: "tier-raw", label: "Raw", title: "Significant at raw 5% only" };
    return { cls: "tier-ns", label: "n/s", title: "Not significant at 5%" };
  };
  const tierPill = (r) => {
    const t = tierFor(r);
    return `<span class="tier-pill ${t.cls}" title="${t.title}">${t.label}</span>`;
  };

  const makeRow = (r, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.specId = r.spec_id;
    tr.dataset.dw = r.diagnostics.dw ?? "";
    tr.innerHTML = `
      <td class="num">${idx}</td>
      <td><span class="outcome-cell">${tierPill(r)}${r.y_label}</span></td>
      <td>${r.x_labels.join(" + ")}</td>
      <td>${r.sample}</td>
      <td class="num">${fmt.n(r.n)}</td>
      <td class="num">${fmt.r2(r.r2)}</td>
      <td class="num ${pClass(r.min_p_raw)}">${fmt.p(r.min_p_raw)}</td>
      <td class="num ${pClass(r.min_p_bonf)}">${fmt.p3(r.min_p_bonf)}</td>
      <td class="num ${pClass(r.min_p_bh)}">${fmt.p3(r.min_p_bh)}</td>
      <td class="num ${dwClass(r.diagnostics.dw)}">${fmt.dw(r.diagnostics.dw)}</td>
      <td class="num">${fmt.p3(r.diagnostics.bp_pvalue)}</td>
      <td class="num">${fmt.p3(r.diagnostics.lb_pvalue)}</td>
    `;
    tr.addEventListener("click", () => toggleExpand(tr, r));
    return tr;
  };

  const makeRowAll = (r) => {
    const tr = document.createElement("tr");
    tr.dataset.dw = r.diagnostics.dw ?? "";
    tr.innerHTML = `
      <td><span class="outcome-cell">${tierPill(r)}${r.y_label}</span></td>
      <td>${r.x_labels.join(" + ")}</td>
      <td>${r.sample}</td>
      <td class="num">${fmt.n(r.n)}</td>
      <td class="num">${fmt.r2(r.r2)}</td>
      <td class="num ${pClass(r.min_p_raw)}">${fmt.p(r.min_p_raw)}</td>
      <td class="num ${pClass(r.min_p_bonf)}">${fmt.p3(r.min_p_bonf)}</td>
      <td class="num ${pClass(r.min_p_bh)}">${fmt.p3(r.min_p_bh)}</td>
      <td class="num ${dwClass(r.diagnostics.dw)}">${fmt.dw(r.diagnostics.dw)}</td>
      <td class="num">${fmt.p3(r.diagnostics.bp_pvalue)}</td>
      <td class="num">${fmt.p3(r.diagnostics.lb_pvalue)}</td>
    `;
    return tr;
  };

  const toggleExpand = (tr, r) => {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains("row-expander") && next.dataset.specId === r.spec_id) {
      next.remove();
      tr.classList.remove("row-open");
      window.refreshResultsScrolly?.();
      return;
    }
    // remove any other expander in this table
    $$("tr.row-expander", tr.parentElement).forEach(n => n.remove());
    $$("tr.row-open", tr.parentElement).forEach(n => n.classList.remove("row-open"));
    tr.classList.add("row-open");
    const ex = document.createElement("tr");
    ex.classList.add("row-expander");
    ex.dataset.specId = r.spec_id;
    const td = document.createElement("td");
    td.colSpan = 12;
    const coefRows = r.coefficients.map(c => `
      <span class="var">${c.label}</span>
      <span class="c">β = ${fmt.coef(c.coef)}</span>
      <span class="s">SE = ${fmt.coef(c.se)}</span>
      <span class="c">t = ${c.t.toFixed(2)}</span>
      <span class="p ${c.p < 0.05 ? "" : "notsig"}">p = ${fmt.p(c.p)}</span>
    `).join("");
    const vif = r.diagnostics.vif
      ? Object.entries(r.diagnostics.vif).map(([k, v]) => `${k}=${v == null ? "–" : v.toFixed(2)}`).join(" · ")
      : "n/a (univariate)";
    td.innerHTML = `
      <div class="coef-grid">
        <span class="h">Variable</span><span class="h">Coef</span><span class="h">SE</span><span class="h">t</span><span class="h">p</span>
        ${coefRows}
      </div>
      <div style="margin-top:10px;color:var(--fg-muted);">
        HAC lags = ${r.hac_lags} · F-test p = ${fmt.p(r.f_pvalue)} · VIF: ${vif}
      </div>`;
    ex.appendChild(td);
    tr.after(ex);
    window.refreshResultsScrolly?.();
  };

  const renderRegressionTables = (payload) => {
    const meta = payload.meta;
    $("#m-total").textContent = meta.n_specs;
    $("#m-raw").textContent = meta.n_sig_raw;
    $("#m-bonf").textContent = meta.n_sig_bonf;
    $("#m-bh").textContent = meta.n_sig_bh;
    $("#spec-count").textContent = meta.n_specs.toLocaleString();
    $("#m-total-inline").textContent = meta.n_specs.toLocaleString();
    $("#all-count").textContent = meta.n_specs;

    const headlineBody = $("#headline-table tbody");
    payload.headline.forEach((r, i) => headlineBody.appendChild(makeRow(r, i + 1)));

    const allBody = $("#all-table tbody");
    payload.all_specs.slice(0, 400).forEach(r => allBody.appendChild(makeRowAll(r)));

    // Chow
    const chowBody = $("#chow-table tbody");
    payload.chow.filter(r => r.status === "ok").forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.y_label}</td>
        <td>${r.x_labels.join(" + ")}</td>
        <td class="num">${r.n}</td>
        <td class="num">${r.F.toFixed(3)}</td>
        <td class="num ${pClass(r.p)}">${fmt.p(r.p)}</td>`;
      chowBody.appendChild(tr);
    });

    // Cointegration
    const coiBody = $("#coint-table tbody");
    payload.cointegration.filter(r => r.status === "ok").forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.y_label}</td>
        <td>${r.x_label}</td>
        <td class="num">${r.n}</td>
        <td class="num">${fmt.p3(r.adf_y_p)}</td>
        <td class="num">${fmt.p3(r.adf_x_p)}</td>
        <td class="num">${r.eg_stat.toFixed(3)}</td>
        <td class="num ${pClass(r.eg_p)}">${fmt.p(r.eg_p)}</td>`;
      coiBody.appendChild(tr);
    });
    const egGdpTrade = payload.cointegration.find(r => r.y === "log_gdp_pc" && r.x === "wdi_trade_gdp");
    if (egGdpTrade && egGdpTrade.status === "ok") {
      const el = $("#coint-gdp-trade");
      if (el) el.textContent = `p ≈ ${egGdpTrade.eg_p.toFixed(2)}`;
    }

    // Granger
    const grBody = $("#granger-table tbody");
    payload.granger.filter(r => r.status === "ok").forEach(r => {
      const p = r.p_by_lag;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.description}</td>
        <td class="num">${r.n}</td>
        <td class="num ${pClass(p["1"])}">${fmt.p3(p["1"])}</td>
        <td class="num ${pClass(p["2"])}">${fmt.p3(p["2"])}</td>
        <td class="num ${pClass(p["3"])}">${fmt.p3(p["3"])}</td>`;
      grBody.appendChild(tr);
    });

    // Glossary dropdown
    const glossarySel = $("#glossary-select");
    const glossaryDef = $("#glossary-def");
    if (glossarySel && glossaryDef) {
      glossarySel.addEventListener("change", () => {
        const opt = glossarySel.selectedOptions[0];
        glossaryDef.textContent = opt?.dataset?.def ?? "";
      });
    }

    // DW filter
    $("#dw-filter")?.addEventListener("change", e => {
      const hide = e.target.checked;
      $$("tr[data-dw]", document).forEach(tr => {
        const dw = parseFloat(tr.dataset.dw);
        tr.style.display = (hide && !Number.isNaN(dw) && dw < 1.5) ? "none" : "";
      });
    });
  };

  // ------------------------------------------------------------
  // Leaflet map — country outline + province centroid bubbles
  // ------------------------------------------------------------
  const provColor = r => r < 25 ? "#c7e7d7" : r < 32 ? "#83ccae" : r < 37 ? "#3a9a78" : "#134e3a";
  const PROV_COORDS = {
    "Western Cape":   { lat: -33.20, lon: 21.90 },
    "Eastern Cape":   { lat: -32.20, lon: 26.50 },
    "Northern Cape":  { lat: -29.80, lon: 21.50 },
    "Free State":     { lat: -28.50, lon: 27.00 },
    "KwaZulu-Natal":  { lat: -29.00, lon: 30.90 },
    "North West":     { lat: -26.60, lon: 25.50 },
    "Gauteng":        { lat: -26.20, lon: 28.10 },
    "Mpumalanga":     { lat: -25.80, lon: 30.60 },
    "Limpopo":        { lat: -23.90, lon: 29.40 },
  };
  const buildMap = async (qlfs) => {
    const el = $("#za-map");
    if (!el || typeof L === "undefined") return;
    const gj = await fetchJSON("zaf-outline.geojson");
    const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      .setView([-28.8, 25.0], 5.2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      attribution: "© OpenStreetMap",
      opacity: 0.35,
    }).addTo(map);
    const layer = L.geoJSON(gj, {
      style: { weight: 1.4, color: "#1f2937", fillColor: "#e8eef2", fillOpacity: 0.35 },
    }).addTo(map);

    // Province centroid bubbles sized by labour force, coloured by unemployment
    Object.entries(qlfs.provinces).forEach(([name, info]) => {
      const coord = PROV_COORDS[name];
      if (!coord) return;
      const rate = info.unemployment_rate;
      const marker = L.circleMarker([coord.lat, coord.lon], {
        radius: 10 + Math.min(14, rate / 3),
        color: "#1f2937",
        weight: 1.2,
        fillColor: provColor(rate),
        fillOpacity: 0.9,
      });
      marker.bindTooltip(
        `<strong>${name}</strong><br>Unemployment: ${rate.toFixed(1)}%`,
        { sticky: true, direction: "top", offset: [0, -4] }
      );
      marker.on("mouseover", () => marker.setStyle({ weight: 2.2, color: "#0f5f46" }));
      marker.on("mouseout", () => marker.setStyle({ weight: 1.2, color: "#1f2937" }));
      marker.addTo(map);
    });

    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) map.invalidateSize(); });
    }, { threshold: 0.15 });
    obs.observe(el);
    window.addEventListener("resize", () => map.invalidateSize());
  };

  // ------------------------------------------------------------
  // TOC highlight via IntersectionObserver
  // ------------------------------------------------------------
  const wireTOC = () => {
    const links = $$(".topnav a");
    if (!links.length) return;
    const byId = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const id = en.target.id;
          links.forEach(l => l.classList.remove("active"));
          byId.get(id)?.classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
    ["question", "timeline", "macro", "inequality", "governance", "results", "map", "conclusions", "sources"]
      .forEach(id => { const sec = document.getElementById(id); if (sec) obs.observe(sec); });
  };

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  const boot = async () => {
    renderTimeline();
    wireTOC();
    try {
      const [ts, ineq, gov, panel, reg, qlfs] = await Promise.all([
        fetchJSON("data/timeseries.json"),
        fetchJSON("data/inequality.json"),
        fetchJSON("data/governance.json"),
        fetchJSON("data/panel.json"),
        fetchJSON("data/regressions.json"),
        fetchJSON("data/qlfs_2025q1.json"),
      ]);
      buildHeroChart(ineq, ts);
      buildIndexedChart(ts);
      buildUnemploymentChart(ts);
      buildIncomeChart(ineq);
      buildWealthChart(ineq);
      buildGiniChart(ineq);
      buildScatterTop10Trade(panel);
      buildWGIChart(gov);
      renderRegressionTables(reg);
      window.refreshResultsScrolly?.();
      buildMap(qlfs);
    } catch (err) {
      console.error("website_v2 load failed", err);
      const warn = document.createElement("div");
      warn.style.cssText = "padding:16px;background:#fde68a;color:#713f12;margin:16px;border-radius:8px;font-family:system-ui;";
      warn.textContent = `Data load failed: ${err.message}. Run website_v2 from a local HTTP server (e.g. python -m http.server 8000).`;
      document.body.prepend(warn);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
