/* =============================================================
  Econ 30 · SA integration - website_v2 / app.js
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
  const mapThemeRefreshers = [];
  const applyTheme = t => {
    document.documentElement.dataset.theme = t;
    const icon = $("#theme-toggle .theme-icon");
    const btn = $("#theme-toggle");
    if (icon) icon.textContent = t === "dark" ? "◑" : "◐";
    if (btn) {
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
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
    // Chart.js snapshots palette at construction; v4 has no reliable global instances iterator.
    refreshAllChartsForTheme();
    mapThemeRefreshers.forEach(fn => fn());
  });

  // ------------------------------------------------------------
  // Chart.js defaults keyed to CSS variables
  // ------------------------------------------------------------
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const palette = () => ({
    bg: cssVar("--bg"),
    bgElev: cssVar("--bg-elev"),
    bgSunken: cssVar("--bg-sunken"),
    fg: cssVar("--fg"),
    muted: cssVar("--fg-muted"),
    rule: cssVar("--rule"),
    accent: cssVar("--accent"),
    accentSoft: cssVar("--accent-soft"),
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

  /** Chart.js merges defaults at build time; theme flip must push fresh CSS-derived colors into each instance. */
  const applyPaletteToChart = chart => {
    const p = palette();
    const o = chart.options;
    if (o.plugins?.legend?.labels) o.plugins.legend.labels.color = p.fg;
    if (o.color !== undefined) o.color = p.muted;
    chart.data.datasets.forEach(ds => {
      if (!ds.paletteKey || !p[ds.paletteKey]) return;
      const color = p[ds.paletteKey];
      const border = `${color}${ds.colorAlpha ?? ""}`;
      ds.borderColor = border;
      ds.backgroundColor = `${color}${ds.backgroundAlpha ?? "33"}`;
      ds.pointBackgroundColor = border;
    });
    Object.values(o.scales || {}).forEach(scale => {
      if (!scale || typeof scale !== "object") return;
      if (scale.ticks) scale.ticks.color = p.muted;
      if (scale.grid) scale.grid.color = p.rule;
      if (scale.title?.display) scale.title.color = p.muted;
    });
    chart.update();
  };

  const refreshAllChartsForTheme = () => {
    setChartDefaults();
    document.querySelectorAll("canvas").forEach(canvas => {
      const c = typeof Chart !== "undefined" && Chart.getChart ? Chart.getChart(canvas) : null;
      if (c) applyPaletteToChart(c);
    });
  };

  /** Axis & tooltip numbers without locale grouping (years read as 1990 not 1,990). */
  const formatChartTickPlain = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (Number.isInteger(n)) return String(n);
    const r = Math.round(n);
    if (Math.abs(n - r) < 1e-9) return String(r);
    return n.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 8 });
  };

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
          return formatChartTickPlain(value);
        }
        return null;
      };
    } else {
      yScale.ticks.callback = formatChartTickPlain;
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
          tooltip: {
            enabled: true,
            callbacks: {
              title(items) {
                if (!items.length) return "";
                const x = items[0].parsed?.x;
                if (x != null && Number.isFinite(x)) return formatChartTickPlain(x);
                return items[0].label ?? "";
              },
              label(ctx) {
                const name = ctx.dataset.label ?? "";
                const y = ctx.parsed?.y;
                if (y == null || !Number.isFinite(y)) return name;
                const v = formatChartTickPlain(y);
                return name ? `${name}: ${v}` : v;
              },
            },
          },
        },
        scales: {
          x: {
            type: xAxisType,
            title: xTitle ? { display: true, text: xTitle, color: p.muted } : { display: false },
            grid: { color: p.rule, drawBorder: false },
            ticks: { color: p.muted, maxRotation: 0, callback: formatChartTickPlain },
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
  const colorFrom = keyOrColor => palette()[keyOrColor] ?? keyOrColor;
  const datasetFrom = (years, series, colorKey, style = {}) => {
    const color = colorFrom(colorKey);
    const paletteKey = palette()[colorKey] ? colorKey : style.paletteKey;
    const border = `${color}${style.colorAlpha ?? ""}`;
    return {
      label: series.label,
      data: series.values.map((v, i) => ({ x: years[i], y: v })),
      borderColor: border,
      backgroundColor: `${color}${style.backgroundAlpha ?? "33"}`,
      pointBackgroundColor: border,
      spanGaps: true,
      paletteKey,
      ...style,
    };
  };

  const buildHeroChart = (inequality, timeseries) => {
    const canvas = $("#chart-hero");
    if (!canvas) return;
    const years = inequality.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, inequality.series.top10_inc, "wid", { borderWidth: 2.5 }),
        datasetFrom(timeseries.years, { label: "Trade / GDP (scaled to match income axis)", values: timeseries.series.trade_gdp.values.map(v => v == null ? null : v / 100) }, "wdi", { borderDash: [4, 4] }),
      ],
      yTitle: "Share of income (0–1)",
      xTitle: "Year",
    });
  };

  const buildIndexedChart = (ts) => {
    const canvas = $("#chart-indexed");
    if (!canvas) return;
    const years = ts.indexed.years;
    const ds = [];
    const colors = { gdp_pc_usd: "wdi", trade_gdp: "accent", fdi_gdp: "wgi" };
    Object.entries(ts.indexed.series).forEach(([key, s]) => {
      ds.push(datasetFrom(years, s, colors[key] ?? "fg", { borderWidth: 2.2 }));
    });
    makeLineChart(canvas, {
      labels: years,
      datasets: ds,
      yTitle: "Index, 1990 = 100 (log axis)",
      xTitle: "Year",
      yAxisType: "logarithmic",
    });
  };

  const buildUnemploymentChart = (ts) => {
    const canvas = $("#chart-unemployment");
    if (!canvas) return;
    const years = ts.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [datasetFrom(years, ts.series.unemployment, "danger", { borderWidth: 2.5 })],
      yTitle: "% of labour force",
      xTitle: "Year",
    });
  };

  const buildIncomeChart = (ineq) => {
    const canvas = $("#chart-income-shares");
    if (!canvas) return;
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.top10_inc, "wid"),
        datasetFrom(years, ineq.series.top1_inc, "danger"),
        datasetFrom(years, ineq.series.bottom50_inc, "wgi"),
      ],
      yTitle: "Share of national income (pre-tax)",
      xTitle: "Year",
    });
  };

  const buildWealthChart = (ineq) => {
    const canvas = $("#chart-wealth-shares");
    if (!canvas) return;
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.top10_wealth, "wid"),
        datasetFrom(years, ineq.series.top1_wealth, "danger"),
      ],
      yTitle: "Share of household wealth",
      xTitle: "Year",
    });
  };

  const buildGiniChart = (ineq) => {
    const canvas = $("#chart-gini");
    if (!canvas) return;
    const years = ineq.years;
    makeLineChart(canvas, {
      labels: years,
      datasets: [
        datasetFrom(years, ineq.series.wiid_gini, "wiid", { pointRadius: 4 }),
        datasetFrom(years, ineq.series.wdi_gini, "wdi", { pointRadius: 4, borderDash: [4, 4] }),
      ],
      yTitle: "Gini index (higher = more unequal)",
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
    if (points.length < 2) return;
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
            label: "Years (each dot)",
            data: points,
            backgroundColor: p.wid,
            borderColor: p.wid,
            pointBackgroundColor: p.wid,
            paletteKey: "wid",
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            type: "line",
            label: `Best-fit line (slope=${slope.toFixed(4)})`,
            data: line,
            borderColor: p.danger,
            backgroundColor: `${p.danger}33`,
            pointBackgroundColor: p.danger,
            paletteKey: "danger",
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
          legend: { position: "bottom", labels: { color: p.fg } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pt = ctx.raw;
                if (pt.year != null) {
                  const yr = pt.year != null && Number.isFinite(Number(pt.year))
                    ? formatChartTickPlain(pt.year)
                    : String(pt.year);
                  const x = formatChartTickPlain(pt.x);
                  return `${yr}: trade=${x}, top10=${(pt.y * 100).toFixed(1)}%`;
                }
                return `${ctx.dataset.label}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Trade / GDP (%)", color: p.muted },
            grid: { color: p.rule },
            ticks: { color: p.muted, callback: formatChartTickPlain },
          },
          y: {
            title: { display: true, text: "Top-10% share", color: p.muted },
            grid: { color: p.rule },
            ticks: { color: p.muted, callback: formatChartTickPlain },
          },
        },
      },
    });
  };

  const buildWGIChart = (gov) => {
    const canvas = $("#chart-wgi");
    if (!canvas) return;
    const years = gov.years;
    const colors = { va: "wdi", pv: "wid", ge: "wgi", rq: "wiid", rl: "accent", cc: "danger" };
    const labels = {
      va: "Voice & accountability (context)",
      pv: "Political stability (context)",
      ge: "Government effectiveness (context)",
      rq: "Regulatory quality (context)",
      rl: "Courts/rules reliability",
      cc: "Corruption control",
    };
    const ds = [];
    ["va", "pv", "ge", "rq"].forEach(k => {
      ds.push(datasetFrom(years, { ...gov.series[k], label: labels[k] }, colors[k], {
        borderWidth: 1,
        colorAlpha: "44",
        backgroundAlpha: "18",
        pointRadius: 0,
        borderDash: [3, 4],
        hidden: true,
      }));
    });
    ds.push(datasetFrom(years, { ...gov.series.rl, label: labels.rl }, "accent", { borderWidth: 2.4 }));
    ds.push(datasetFrom(years, { ...gov.series.cc, label: labels.cc }, "danger", { borderWidth: 2.4 }));
    ds.push(datasetFrom(years, { ...gov.series.avg, label: "Average governance" }, "fg", { borderWidth: 3.2 }));
    const chart = makeLineChart(canvas, { labels: years, datasets: ds, yTitle: "Score (0 = weak, 1 = strong)", xTitle: "Year" });
    const contextToggle = $("#wgi-show-context");
    if (contextToggle) {
      const contextLabels = new Set([
        labels.va,
        labels.pv,
        labels.ge,
        labels.rq,
      ]);
      contextToggle.checked = false;
      contextToggle.addEventListener("change", () => {
        const show = contextToggle.checked;
        chart.data.datasets.forEach((set) => {
          if (contextLabels.has(set.label)) {
            set.hidden = !show;
          }
        });
        chart.update();
      });
    }
  };

  // ------------------------------------------------------------
  // Timeline
  // ------------------------------------------------------------
  const TIMELINE = [
    { year: "1989–93", title: "Apartheid sanctions unravel", kb: "apartheid-era-sanctions",
      body: "Trade and banking sanctions eased step by step while multiparty talks (CODESA) moved forward." },
    { year: "1994", title: "Democratic elections · RDP", kb: "reconstruction-and-development-programme",
      body: "RDP emphasised redistribution and basic services; import taxes (tariffs) were still relatively high." },
    { year: "1995", title: "Joining the WTO", kb: "state-of-trade-policy-south-africa",
      body: "Membership committed South Africa to phase down import taxes through about 2005." },
    { year: "1996", title: "GEAR adopted", kb: "gear-strategy",
      body: "Tighter budgets, lower trade barriers, some privatisation, and inflation targets became the main macro recipe." },
    { year: "2000s", title: "Commodity boom years", kb: "minerals-energy-complex",
      body: "Resource prices and foreign investment jumped; factory jobs outside mining often struggled." },
    { year: "2008–09", title: "Global financial crisis", kb: "trade-liberalization-sa-manufacturing",
      body: "Manufacturing shrank sharply; unemployment stepped up." },
    { year: "2009–18", title: "Zuma era: state capture", kb: "political-economy-of-transition",
      body: "Outside ratings of rule of law and corruption control weakened." },
    { year: "2017", title: "Sovereign rating downgrades", kb: "trade-liberalisation-south-africa",
      body: "Credit-rating agencies moved South Africa below top investment grades; borrowing became costlier." },
    { year: "2020–22", title: "COVID-19 shock", kb: "building-back-better-covid-jobs",
      body: "Record single-year job losses; only partial recovery through 2021–22." },
    { year: "2024–25", title: "QLFS Q1 2025: narrow u = 32.9%", kb: "stats-sa-qlfs-p0211-2025q1",
      body: "Broader unemployment (including discouraged seekers) at 43.1%; youth unemployment at 46.1%." },
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
    "trade-liberalization-local-labor-markets-south-africa": "summaries",
    "quarterly-labour-force-survey": "concepts",
    "labour-market-south-africa": "concepts",
    "trade-liberalisation-south-africa": "concepts",
    "wealth-inequality-lab-south-africa": "summaries",
    "dataset-wiid-2025": "summaries",
    "inequality-in-south-africa": "concepts",
    "dataset-wgi-underlying-sources": "summaries",
  };
  const KB_BASE = "https://github.com/SunmitHallur/econ30-sa/blob/main/Knowledge%20Base/wiki";
  const kbHref = (slug) => {
    const folder = KB_FOLDER[slug] ?? "concepts";
    return `${KB_BASE}/${folder}/${slug}.md`;
  };
  const renderTimeline = () => {
    const list = $("#timeline-list");
    if (!list) return;
    TIMELINE.forEach((item, idx) => {
      const li = document.createElement("li");
      const above = idx % 2 === 0;
      li.className = `timeline-node ${above ? "timeline-node--above" : "timeline-node--below"}`;
      const cardInner = `
          <span class="timeline-idx">${String(idx + 1).padStart(2, "0")}</span>
          <span class="year">${item.year}</span>
          <h4>${item.title}</h4>
          <p>${item.body}</p>
          <a class="kb-link" href="${kbHref(item.kb)}" target="_blank" rel="noopener noreferrer" data-kb="${item.kb}">View source →</a>`;
      li.innerHTML = above
        ? `<div class="timeline-card">${cardInner}</div>
        <div class="timeline-axis-slot" aria-hidden="true">
          <span class="timeline-stem timeline-stem--up"></span>
          <span class="timeline-dot"></span>
        </div>
        <div class="timeline-fill" aria-hidden="true"></div>`
        : `<div class="timeline-fill" aria-hidden="true"></div>
        <div class="timeline-axis-slot" aria-hidden="true">
          <span class="timeline-dot"></span>
          <span class="timeline-stem timeline-stem--down"></span>
        </div>
        <div class="timeline-card">${cardInner}</div>`;
      list.appendChild(li);
    });
  };

  const wireTimelineAutoscroll = () => {
    const scrollEl = $("#timeline-scroll");
    const shell = $("#timeline-shell");
    const listEl = $("#timeline-list");
    const sectionEl = document.getElementById("timeline");
    const playToggleBtn = $("#timeline-play-toggle");
    const restartBtn = $("#timeline-restart");
    if (!scrollEl || !shell) return;

    const mqVerticalRail = window.matchMedia("(max-width: 860px)");

    /* Autoplay unless explicitly opted out (attribute missing = on, matching original behaviour). */
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let autoplay = !reduceMotion && scrollEl.dataset.autoplay === "true";
    let sectionVisible = false;
    let rafId = 0;
    /* Visible drift at ~27px/s @ 60fps; small values were easy to dismiss as “not moving”. */
    const speed = 0.45;
    const ioTarget = sectionEl || shell;

    const syncChrome = () => {
      scrollEl.classList.toggle("is-autoplay-paused", !autoplay);
      if (!playToggleBtn) return;
      playToggleBtn.setAttribute("aria-pressed", autoplay ? "true" : "false");
      const text = playToggleBtn.querySelector(".ghost-btn__text");
      if (text) text.textContent = autoplay ? "Pause timeline" : "Play timeline";
    };

    const applyTimelineLayoutMode = () => {
      const stacked = mqVerticalRail.matches;
      scrollEl.classList.toggle("timeline-h-scroll--stacked", stacked);
      [playToggleBtn, restartBtn].forEach((btn) => {
        if (!btn) return;
        if (stacked) {
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
        } else {
          btn.disabled = false;
          btn.removeAttribute("aria-disabled");
        }
      });
      if (stacked) {
        autoplay = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        playToggleBtn?.setAttribute(
          "title",
          "Autoplay applies to the horizontal timeline on wider screens."
        );
        restartBtn?.setAttribute(
          "title",
          "Restart applies to the horizontal timeline on wider screens."
        );
      } else {
        playToggleBtn?.removeAttribute("title");
        restartBtn?.removeAttribute("title");
      }
      syncChrome();
    };

    const tick = () => {
      if (!autoplay || !sectionVisible) {
        rafId = 0;
        return;
      }
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 0) {
        /* Do not RAF-spin: wait for ResizeObserver/fonts when rail width catches up with layout. */
        rafId = 0;
        return;
      }
      if (scrollEl.scrollLeft >= max - 0.5) {
        scrollEl.scrollLeft = max;
        rafId = 0;
        return;
      }
      scrollEl.scrollLeft = Math.min(max, scrollEl.scrollLeft + speed);
      rafId = requestAnimationFrame(tick);
    };

    const startIfNeeded = () => {
      if (!autoplay || !sectionVisible) return;
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max > 0 && scrollEl.scrollLeft >= max - 0.5) {
        /* If user re-enters after reaching the end, restart autoplay from the beginning. */
        scrollEl.scrollLeft = 0;
      }
      if (rafId) return;
      rafId = requestAnimationFrame(tick);
    };
    const toggleAutoplay = () => {
      if (playToggleBtn?.disabled) return;
      autoplay = !autoplay;
      if (!autoplay && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      syncChrome();
      startIfNeeded();
    };
    const restartTimeline = () => {
      if (restartBtn?.disabled) return;
      scrollEl.scrollLeft = 0;
      startIfNeeded();
    };

    window.addEventListener("resize", () => {
      if (sectionVisible) startIfNeeded();
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (sectionVisible) startIfNeeded();
      });
      ro.observe(scrollEl);
      if (listEl) ro.observe(listEl);
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (sectionVisible) startIfNeeded();
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          sectionVisible = en.isIntersecting;
          if (sectionVisible) {
            startIfNeeded();
          } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
          }
        });
      },
      /* Whole section covers the hero→rail span; threshold 0 matches “any overlap”. */
      { root: null, threshold: 0 }
    );
    io.observe(ioTarget);
    playToggleBtn?.addEventListener("click", toggleAutoplay);
    restartBtn?.addEventListener("click", restartTimeline);

    mqVerticalRail.addEventListener("change", () => {
      applyTimelineLayoutMode();
      requestAnimationFrame(() => startIfNeeded());
    });
    applyTimelineLayoutMode();

    syncChrome();
    const wr = ioTarget.getBoundingClientRect();
    if (wr.top < window.innerHeight && wr.bottom > 0) {
      sectionVisible = true;
      requestAnimationFrame(() => startIfNeeded());
    }

    /* After charts + ScrollTrigger.refresh(), layout can shift; production CDNs also cache JS. */
    window.refreshTimelineAutoplay = () => {
      requestAnimationFrame(() => startIfNeeded());
    };
    window.addEventListener("load", () => {
      window.refreshTimelineAutoplay();
    });
  };

  const wireKBLinks = () => {
    $$("a.kb-link[data-kb]").forEach(link => {
      const slug = link.dataset.kb;
      if (!slug) return;
      if (link.getAttribute("href") === "#sources") {
        link.setAttribute("href", kbHref(slug));
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  };

  // ------------------------------------------------------------
  // Regression tables
  // ------------------------------------------------------------
  const dwClass = v => v == null ? "" : (v < 1.2 || v > 2.8 ? "dw-bad" : (v < 1.5 || v > 2.5 ? "" : "dw-ok"));
  const pClass = v => v == null ? "" : (v < 0.05 ? "p-sig" : "p-notsig");

  const tierFor = (r) => {
    const bh = r.min_p_bh, bf = r.min_p_bonf, raw = r.min_p_raw;
    if (bh != null && bh < 0.05) return { cls: "tier-bh", label: "BH", title: "Passes strict BH many-test check" };
    if (bf != null && bf < 0.05) return { cls: "tier-bonf", label: "Bonf", title: "Passes very harsh Bonferroni check" };
    if (raw != null && raw < 0.05) return { cls: "tier-raw", label: "Raw", title: "Passes basic 5% bar only" };
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
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.setAttribute("aria-expanded", "false");
    tr.setAttribute("aria-label", `Expand estimates for ${r.y_label}`);
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
    tr.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggleExpand(tr, r);
    });
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
      tr.setAttribute("aria-expanded", "false");
      window.refreshResultsScrolly?.();
      return;
    }
    // remove any other expander in this table
    $$("tr.row-expander", tr.parentElement).forEach(n => n.remove());
    $$("tr.row-open", tr.parentElement).forEach(n => {
      n.classList.remove("row-open");
      n.setAttribute("aria-expanded", "false");
    });
    tr.classList.add("row-open");
    tr.setAttribute("aria-expanded", "true");
    const ex = document.createElement("tr");
    ex.classList.add("row-expander");
    ex.dataset.specId = r.spec_id;
    const td = document.createElement("td");
    td.colSpan = 12;
    const coefRows = r.coefficients.map(c => `
      <span class="var">${c.label}</span>
      <span class="c">Estimate = ${fmt.coef(c.coef)}</span>
      <span class="s">SE = ${fmt.coef(c.se)}</span>
      <span class="c">t = ${c.t.toFixed(2)}</span>
      <span class="p ${c.p < 0.05 ? "" : "notsig"}">p = ${fmt.p(c.p)}</span>
    `).join("");
    const vif = r.diagnostics.vif
      ? Object.entries(r.diagnostics.vif).map(([k, v]) => `${k}=${v == null ? "–" : v.toFixed(2)}`).join(" · ")
      : "n/a (univariate)";
    td.innerHTML = `
      <div class="coef-grid">
        <span class="h">Variable</span><span class="h">Estimate</span><span class="h">SE</span><span class="h">t</span><span class="h">p</span>
        ${coefRows}
      </div>
      <div class="expander-meta">
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
  // Leaflet map - country outline + province centroid bubbles
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
    const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      attribution: "© OpenStreetMap",
      opacity: 0.35,
    }).addTo(map);
    const layer = L.geoJSON(gj, {
      style: { weight: 1.4, color: palette().fg, fillColor: palette().bgSunken, fillOpacity: 0.35 },
    }).addTo(map);
    const markerEntries = [];
    const applyMarkerStyle = entry => {
      const p = palette();
      entry.marker.setStyle({
        radius: 10 + Math.min(14, entry.rate / 3),
        color: entry.hover ? p.accent : p.fg,
        weight: entry.hover ? 2.2 : 1.2,
        fillColor: provColor(entry.rate),
        fillOpacity: 0.9,
      });
    };
    const applyMapTheme = () => {
      const p = palette();
      const dark = document.documentElement.dataset.theme === "dark";
      tile.setOpacity(dark ? 0.22 : 0.35);
      layer.setStyle({
        weight: 1.4,
        color: p.fg,
        fillColor: p.bgSunken,
        fillOpacity: dark ? 0.28 : 0.36,
      });
      markerEntries.forEach(applyMarkerStyle);
    };

    // Province centroid bubbles sized by labour force, coloured by unemployment
    Object.entries(qlfs.provinces).forEach(([name, info]) => {
      const coord = PROV_COORDS[name];
      if (!coord) return;
      const rate = info.unemployment_rate;
      const marker = L.circleMarker([coord.lat, coord.lon], {
        radius: 10 + Math.min(14, rate / 3),
        color: palette().fg,
        weight: 1.2,
        fillColor: provColor(rate),
        fillOpacity: 0.9,
      });
      const entry = { marker, rate, hover: false };
      markerEntries.push(entry);
      marker.bindTooltip(
        `<strong>${name}</strong><br>Narrow unemployment: ${rate.toFixed(1)}%`,
        { sticky: true, direction: "top", offset: [0, -4] }
      );
      marker.on("mouseover", () => {
        entry.hover = true;
        applyMarkerStyle(entry);
      });
      marker.on("mouseout", () => {
        entry.hover = false;
        applyMarkerStyle(entry);
      });
      marker.addTo(map);
    });
    mapThemeRefreshers.push(applyMapTheme);
    applyMapTheme();

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


  /** Build Gini + scatter charts for the always-visible inequality subsection. */
  const wireLazyInequalityCharts = (ineq, panel) => {
    buildGiniChart(ineq);
    buildScatterTop10Trade(panel);
    requestAnimationFrame(() => {
      Chart.getChart(document.getElementById("chart-gini"))?.resize();
      Chart.getChart(document.getElementById("chart-scatter-top10-trade"))?.resize();
    });
  };
  const wireTOC = () => {
    const links = $$(".topnav a");
    const progressFill = document.getElementById("top-progress-fill");
    const indicatorText = document.getElementById("section-indicator-text");
    if (!links.length) return;
    const sectionOrder = ["question", "from-the-ground", "timeline", "macro", "inequality", "governance", "results", "map", "conclusions", "sources"];
    const spyIds = ["hero", ...sectionOrder];
    const spySections = spyIds.map(id => document.getElementById(id)).filter(Boolean);
    const sectionLabelById = new Map(sectionOrder.map((id, idx) => {
      const h = document.querySelector(`#${id} h2`);
      const title = h ? h.textContent.replace(/^\d+\s*[·.-]\s*/, "").trim() : id;
      return [id, `${idx + 1}/${sectionOrder.length} · ${title}`];
    }));

    const readingLineY = () => window.scrollY + window.innerHeight * 0.55;

    const syncProgress = () => {
      if (!progressFill) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      progressFill.style.width = `${pct.toFixed(2)}%`;
    };

    const syncActiveNav = () => {
      const doc = document.documentElement;
      const nearBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 6;
      const y = readingLineY();
      let activeId = spySections[0]?.id ?? "hero";
      if (nearBottom && spySections.length) {
        activeId = spySections[spySections.length - 1].id;
      } else {
        for (const sec of spySections) {
          const rect = sec.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const bottom = top + rect.height;
          if (top <= y && bottom > y) {
            activeId = sec.id;
            break;
          }
          if (top <= y) activeId = sec.id;
        }
      }

      links.forEach((l) => {
        const href = l.getAttribute("href");
        l.classList.toggle("active", href === `#${activeId}` && activeId !== "hero");
      });

      if (indicatorText) {
        indicatorText.textContent =
          activeId === "hero"
            ? "Intro"
            : sectionLabelById.get(activeId) ?? activeId;
      }
    };

    const onScroll = () => {
      syncProgress();
      syncActiveNav();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  };

  /**
   * Collect section children for staggered reveals: unwrap grids and quote tiles
   * so motion feels intentional instead of one heavy block.
   */
  const flattenSectionBlocks = (section) => {
    const acc = [];
    for (const el of section.children) {
      if (!el || el.nodeType !== 1) continue;
      if (el.matches(".grid-2, .grid-3")) {
        acc.push(...el.children);
      } else if (el.matches(".chart-mockup")) {
        const copy = el.querySelector(".chart-mockup__copy");
        const charts = el.querySelector(".chart-mockup__charts");
        if (copy) acc.push(copy);
        if (charts) acc.push(charts);
        if (!copy && !charts) acc.push(el);
      } else if (el.matches(".chart-more")) {
        const inner = el.querySelector(".chart-more-inner");
        if (inner) acc.push(...inner.children);
        else acc.push(el);
      } else if (el.classList.contains("card") && el.querySelector(":scope > .quote-orbit")) {
        acc.push(el.querySelector(".quote-orbit"));
      } else if (el.classList.contains("card") && el.querySelector(":scope > .quote-grid")) {
        const tiles = el.querySelectorAll(".quote-tile");
        if (tiles.length) acc.push(...tiles);
        else acc.push(el);
      } else {
        acc.push(el);
      }
    }
    return acc.filter(Boolean);
  };

  /**
   * Kokonut-style hand-drawn SVG loop (vanilla port of framer-motion pathLength).
   * Fires once when #hand-scroll-ink enters the viewport; loop fades out after a short beat.
   */
  const wireHandScrollInk = () => {
    const root = document.getElementById("hand-scroll-ink");
    const path = root?.querySelector?.(".hand-scroll-ink__path");
    if (!root || !path) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = path.getTotalLength?.() ?? 0;
    if (len > 0) {
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    }

    const INK_HOLD_MS = 850;
    const scheduleFadeOut = () => {
      window.setTimeout(() => {
        root.classList.add("hand-scroll-ink--fade-out");
      }, INK_HOLD_MS);
    };

    const finish = () => {
      scheduleFadeOut();
    };

    if (reduce) {
      path.style.strokeDashoffset = "0";
      root.classList.add("hand-scroll-ink--fade-out");
      return;
    }

    const play = () => {
      if (root.dataset.inkPlayed === "1") return;
      root.dataset.inkPlayed = "1";
      if (len <= 0) {
        path.style.strokeDashoffset = "0";
        finish();
        return;
      }
      if (typeof gsap !== "undefined") {
        if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 2.5,
          ease: "power2.inOut",
          onComplete: finish,
        });
        return;
      }
      path.style.transition =
        "stroke-dashoffset 2.5s cubic-bezier(0.43, 0.13, 0.23, 0.96)";
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = "0";
        path.addEventListener("transitionend", finish, { once: true });
      });
    };

    if (typeof ScrollTrigger !== "undefined" && typeof gsap !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        once: true,
        onEnter: play,
      });
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          play();
        },
        { root: null, rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
      );
      io.observe(root);
    }
  };

  const wireGlobalScrollMotion = () => {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("reduce-motion");
      return;
    }

    document.documentElement.classList.add("motion-ready");

    const easeOut = "power3.out";
    const easeSoft = "power2.out";

    // Hero: short load timeline (no scroll scrub).
    const heroTargets = gsap.utils.toArray(".hero-inner > *, .hero .hero-figure");
    if (heroTargets.length) {
      gsap.set(heroTargets, { opacity: 0, y: 16 });
      gsap
        .timeline({ defaults: { ease: easeOut } })
        .to(heroTargets, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: { each: 0.08, amount: 0.34 },
          onComplete: () => {
            gsap.set(heroTargets, { clearProps: "transform" });
          },
        }, 0.12);
    }

    const heroPhoto = document.querySelector(".hero-photo");
    if (heroPhoto) {
      gsap.to(heroPhoto, {
        yPercent: 4,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.25,
          invalidateOnRefresh: true,
        },
      });
    }

    gsap.utils.toArray("main#main > section.section").forEach((section) => {
      const blocks = flattenSectionBlocks(section);
      if (!blocks.length) return;
      gsap.set(blocks, { opacity: 0, y: 20 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.to(blocks, {
            opacity: 1,
            y: 0,
            duration: 0.52,
            ease: easeOut,
            stagger: { each: 0.05, amount: 0.28 },
            onComplete: () => {
              gsap.set(blocks, { clearProps: "transform" });
            },
          });
        },
      });
    });

    const footer = document.querySelector("footer.footer");
    if (footer) {
      gsap.set(footer, { opacity: 0, y: 20 });
      ScrollTrigger.create({
        trigger: footer,
        start: "top 94%",
        once: true,
        onEnter: () => {
          gsap.to(footer, {
            opacity: 1,
            y: 0,
            duration: 0.58,
            ease: easeSoft,
            onComplete: () => {
              gsap.set(footer, { clearProps: "transform" });
            },
          });
        },
      });
    }
  };

  /** Chart.js bitmap must match CSS box size; call after layout settles (esp. after wrapper CSS fix). */
  const resizeRegisteredCharts = () => {
    if (typeof Chart === "undefined") return;
    [
      "chart-hero",
      "chart-indexed",
      "chart-unemployment",
      "chart-income-shares",
      "chart-wealth-shares",
      "chart-gini",
      "chart-scatter-top10-trade",
      "chart-wgi",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const c = Chart.getChart(el);
      if (c) c.resize();
    });
  };

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Conclusions: circular quote carousel (theme-matched vanilla port)
  // ------------------------------------------------------------
  const QUOTE_ORBIT_SLIDES = [
    {
      quote:
        "Districts with larger tariff cuts experienced significant declines in both formal and informal employment, driven primarily by manufacturing job losses.",
      name: "Erten, Leight & Tregenna",
      designation: "2018 · tariff cuts and local labour markets",
    },
    {
      quote:
        "No wage effects for those who remain employed; wages are too rigid to absorb the shock.",
      name: "Erten, Leight & Tregenna",
      designation: "2018 · same study (wages did not flex enough)",
    },
    {
      quote:
        "The top 10% of wealth holders own 85–86% of household wealth … [and] no decline in wealth inequality since the end of apartheid.",
      name: "Chatterjee, Czajka & Gethin",
      designation: "2021 · WIL wealth inequality for South Africa",
    },
    {
      quote: "Growth and redistribution are parts of a single process.",
      name: "ANC",
      designation: "1994 · Reconstruction and Development Programme",
    },
  ];

  /** Horizontal offset for side faces; scales down on narrow rings (fixed 60px used to stack all slides). */
  const quoteOrbitCalcGap = width => {
    const minW = 420;
    const maxW = 1456;
    const minGap = 20;
    const maxGap = 86;
    const w = Math.max(0, width);
    if (w <= minW) return minGap;
    if (w >= maxW) return Math.max(minGap, maxGap + 0.06018 * (w - maxW));
    const t = (w - minW) / (maxW - minW);
    return minGap + (maxGap - minGap) * t;
  };

  const wireQuoteOrbit = () => {
    const root = document.getElementById("quote-orbit");
    const ring = document.getElementById("quote-orbit-ring");
    if (!root || !ring) return;

    const faces = [...root.querySelectorAll(".quote-orbit__face")];
    const n = faces.length;
    if (n !== QUOTE_ORBIT_SLIDES.length) return;

    const nameEl = document.getElementById("quote-orbit-name");
    const desigEl = document.getElementById("quote-orbit-designation");
    const quoteEl = document.getElementById("quote-orbit-quote");
    const dotsEl = document.getElementById("quote-orbit-dots");
    const btnPrev = document.getElementById("quote-orbit-prev");
    const btnNext = document.getElementById("quote-orbit-next");
    if (!nameEl || !desigEl || !quoteEl || !dotsEl || !btnPrev || !btnNext) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const autoplayOn = root.dataset.autoplay === "true" && !reduce;

    let active = 0;
    let timer = null;

    const clearTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      if (!autoplayOn) return;
      timer = setInterval(() => {
        active = (active + 1) % n;
        render();
      }, 5000);
    };

    const applyFaceStyles = () => {
      const rw = ring.offsetWidth || 400;
      const gap = quoteOrbitCalcGap(rw);
      /* Upward offset spilled over the section title on small stages; keep flat below ~720px. */
      const maxStickUp =
        rw >= 720 ? Math.min(gap * 0.5, rw * 0.045) : 0;
      const singleSlide = rw < 420;
      const rot = reduce ? 0 : 15;
      const ease = "all 0.55s cubic-bezier(0.22, 1, 0.36, 1)";

      for (let i = 0; i < n; i++) {
        const el = faces[i];
        const isActive = i === active;
        const isLeft = (active - 1 + n) % n === i;
        const isRight = (active + 1) % n === i;

        if (isActive) {
          el.style.zIndex = "30";
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          /* translateZ last: moves along post-rotate local Z so center sits in front in 3D. */
          el.style.transform =
            "translateX(0) translateY(0) scale(1) rotateY(0deg) translateZ(72px)";
        } else if (singleSlide) {
          el.style.zIndex = "1";
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          el.style.transform = "translateX(0) translateY(8px) scale(0.92) rotateY(0deg)";
        } else if (isLeft) {
          el.style.zIndex = "4";
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          el.style.transform = `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(${rot}deg) translateZ(-40px)`;
        } else if (isRight) {
          el.style.zIndex = "4";
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          el.style.transform = `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(-${rot}deg) translateZ(-40px)`;
        } else {
          el.style.zIndex = "1";
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          el.style.transform = "translateX(0) translateY(12px) scale(0.75) rotateY(0deg)";
        }
        el.style.transition = reduce ? "none" : ease;
      }
    };

    const render = () => {
      const s = QUOTE_ORBIT_SLIDES[active];
      nameEl.textContent = s.name;
      desigEl.textContent = s.designation;
      quoteEl.textContent = `“${s.quote}”`;

      dotsEl.querySelectorAll(".quote-orbit__dot").forEach((dot, i) => {
        const on = i === active;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-pressed", on ? "true" : "false");
      });

      root.setAttribute("aria-label", `Voices from the record, slide ${active + 1} of ${n}: ${s.name}`);
      applyFaceStyles();
    };

    dotsEl.innerHTML = "";
    QUOTE_ORBIT_SLIDES.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quote-orbit__dot";
      b.setAttribute("aria-label", `Show quotation ${i + 1}`);
      b.addEventListener("click", () => {
        active = i;
        clearTimer();
        render();
        startTimer();
      });
      dotsEl.appendChild(b);
    });

    const go = delta => {
      active = (active + delta + n) % n;
      clearTimer();
      render();
      startTimer();
    };

    btnPrev.addEventListener("click", () => go(-1));
    btnNext.addEventListener("click", () => go(1));

    root.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    });

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => applyFaceStyles());
      ro.observe(ring);
    }
    window.addEventListener("resize", applyFaceStyles);

    render();
    startTimer();
  };

  const boot = async () => {
    renderTimeline();
    wireTimelineAutoscroll();
    wireKBLinks();
    wireTOC();
    wireQuoteOrbit();
    wireHandScrollInk();
    wireGlobalScrollMotion();
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
      wireLazyInequalityCharts(ineq, panel);
      buildWGIChart(gov);
      renderRegressionTables(reg);
      window.refreshResultsScrolly?.();
      buildMap(qlfs);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resizeRegisteredCharts();
          if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
          window.refreshTimelineAutoplay?.();
        });
      });
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
