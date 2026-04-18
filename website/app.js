/**
 * South Africa integration project — map + charts
 * National series: World Bank WDI (ZAF). Provincial stats: indicative QLFS-style levels for teaching; verify against Stats SA for publication.
 * Country outline: GeoJSON from https://github.com/johan/world.geo.json (ZAF), embedded for file:// use.
 */
(function () {
  const ZAF_OUTLINE = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "ZAF",
        properties: { name: "South Africa" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [31.521001, -29.257387],
              [31.325561, -29.401978],
              [30.901763, -29.909957],
              [30.622813, -30.423776],
              [30.055716, -31.140269],
              [28.925553, -32.172041],
              [28.219756, -32.771953],
              [27.464608, -33.226964],
              [26.419452, -33.61495],
              [25.909664, -33.66704],
              [25.780628, -33.944646],
              [25.172862, -33.796851],
              [24.677853, -33.987176],
              [23.594043, -33.794474],
              [22.988189, -33.916431],
              [22.574157, -33.864083],
              [21.542799, -34.258839],
              [20.689053, -34.417175],
              [20.071261, -34.795137],
              [19.616405, -34.819166],
              [19.193278, -34.462599],
              [18.855315, -34.444306],
              [18.424643, -33.997873],
              [18.377411, -34.136521],
              [18.244499, -33.867752],
              [18.25008, -33.281431],
              [17.92519, -32.611291],
              [18.24791, -32.429131],
              [18.221762, -31.661633],
              [17.566918, -30.725721],
              [17.064416, -29.878641],
              [17.062918, -29.875954],
              [16.344977, -28.576705],
              [16.824017, -28.082162],
              [17.218929, -28.355943],
              [17.387497, -28.783514],
              [17.836152, -28.856378],
              [18.464899, -29.045462],
              [19.002127, -28.972443],
              [19.894734, -28.461105],
              [19.895768, -24.76779],
              [20.165726, -24.917962],
              [20.758609, -25.868136],
              [20.66647, -26.477453],
              [20.889609, -26.828543],
              [21.605896, -26.726534],
              [22.105969, -26.280256],
              [22.579532, -25.979448],
              [22.824271, -25.500459],
              [23.312097, -25.26869],
              [23.73357, -25.390129],
              [24.211267, -25.670216],
              [25.025171, -25.71967],
              [25.664666, -25.486816],
              [25.765849, -25.174845],
              [25.941652, -24.696373],
              [26.485753, -24.616327],
              [26.786407, -24.240691],
              [27.11941, -23.574323],
              [28.017236, -22.827754],
              [29.432188, -22.091313],
              [29.839037, -22.102216],
              [30.322883, -22.271612],
              [30.659865, -22.151567],
              [31.191409, -22.25151],
              [31.670398, -23.658969],
              [31.930589, -24.369417],
              [31.752408, -25.484284],
              [31.837778, -25.843332],
              [31.333158, -25.660191],
              [31.04408, -25.731452],
              [30.949667, -26.022649],
              [30.676609, -26.398078],
              [30.685962, -26.743845],
              [31.282773, -27.285879],
              [31.86806, -27.177927],
              [32.071665, -26.73382],
              [32.83012, -26.742192],
              [32.580265, -27.470158],
              [32.462133, -28.301011],
              [32.203389, -28.752405],
              [31.521001, -29.257387],
            ],
            [
              [28.978263, -28.955597],
              [28.5417, -28.647502],
              [28.074338, -28.851469],
              [27.532511, -29.242711],
              [26.999262, -29.875954],
              [27.749397, -30.645106],
              [28.107205, -30.545732],
              [28.291069, -30.226217],
              [28.8484, -30.070051],
              [29.018415, -29.743766],
              [29.325166, -29.257387],
              [28.978263, -28.955597],
            ],
          ],
        },
      },
    ],
  };
  const NATIONAL = [
    { y: 1990, gdpPc: 4544, trade: 38.21, fdi: -0.06, unemp: null, gini: null },
    { y: 1991, gdpPc: 4396, trade: 34.88, fdi: 0.19, unemp: 23.14, gini: null },
    { y: 1992, gdpPc: 4226, trade: 34.32, fdi: 0.0, unemp: 23.46, gini: null },
    { y: 1993, gdpPc: 4194, trade: 35.7, fdi: 0.01, unemp: 23.36, gini: 59.3 },
    { y: 1994, gdpPc: 4258, trade: 37.11, fdi: 0.24, unemp: 23.07, gini: null },
    { y: 1995, gdpPc: 4337, trade: 39.48, fdi: 0.73, unemp: 22.7, gini: null },
    { y: 1996, gdpPc: 4466, trade: 42.2, fdi: 0.5, unemp: 22.5, gini: null },
    { y: 1997, gdpPc: 4527, trade: 42.3, fdi: 2.26, unemp: 22.55, gini: null },
    { y: 1998, gdpPc: 4495, trade: 44.04, fdi: 0.36, unemp: 22.74, gini: null },
    { y: 1999, gdpPc: 4553, trade: 42.26, fdi: 0.99, unemp: 22.88, gini: null },
    { y: 2000, gdpPc: 4701, trade: 46.22, fdi: 0.64, unemp: 22.79, gini: 57.8 },
    { y: 2001, gdpPc: 4786, trade: 49.17, fdi: 5.37, unemp: 22.65, gini: null },
    { y: 2002, gdpPc: 4917, trade: 53.47, fdi: 1.15, unemp: 22.58, gini: null },
    { y: 2003, gdpPc: 5012, trade: 45.72, fdi: 0.4, unemp: 22.68, gini: null },
    { y: 2004, gdpPc: 5187, trade: 45.64, fdi: 0.27, unemp: 22.57, gini: null },
    { y: 2005, gdpPc: 5406, trade: 47.43, fdi: 2.26, unemp: 22.47, gini: 65.0 },
    { y: 2006, gdpPc: 5651, trade: 53.77, fdi: 0.21, unemp: 22.3, gini: null },
    { y: 2007, gdpPc: 5891, trade: 57.13, fdi: 1.98, unemp: 22.26, gini: null },
    { y: 2008, gdpPc: 6010, trade: 65.97, fdi: 3.13, unemp: 22.41, gini: 62.5 },
    { y: 2009, gdpPc: 5847, trade: 49.59, fdi: 2.31, unemp: 23.52, gini: null },
    { y: 2010, gdpPc: 5954, trade: 50.41, fdi: 0.88, unemp: 24.68, gini: 60.9 },
    { y: 2011, gdpPc: 6067, trade: 54.64, fdi: 0.9, unemp: 24.64, gini: null },
    { y: 2012, gdpPc: 6122, trade: 55.58, fdi: 1.06, unemp: 24.73, gini: null },
    { y: 2013, gdpPc: 6171, trade: 58.88, fdi: 2.05, unemp: 24.56, gini: null },
    { y: 2014, gdpPc: 6155, trade: 59.5, fdi: 1.52, unemp: 24.89, gini: 59.6 },
    { y: 2015, gdpPc: 6112, trade: 56.73, fdi: 0.44, unemp: 25.15, gini: null },
    { y: 2016, gdpPc: 6095, trade: 55.86, fdi: 0.68, unemp: 26.54, gini: null },
    { y: 2017, gdpPc: 6126, trade: 53.54, fdi: 0.54, unemp: 27.04, gini: null },
    { y: 2018, gdpPc: 6117, trade: 54.49, fdi: 1.37, unemp: 26.91, gini: null },
    { y: 2019, gdpPc: 6033, trade: 53.9, fdi: 1.31, unemp: 28.47, gini: null },
    { y: 2020, gdpPc: 5570, trade: 50.76, fdi: 0.93, unemp: 29.22, gini: null },
    { y: 2021, gdpPc: 5751, trade: 56.16, fdi: 9.68, unemp: 34.01, gini: null },
    { y: 2022, gdpPc: 5787, trade: 64.95, fdi: 2.27, unemp: 33.27, gini: 54.1 },
    { y: 2023, gdpPc: 5757, trade: 65.68, fdi: 1.01, unemp: 32.1, gini: null },
  ];

  const PROVINCES = {
    WC: {
      name: "Western Cape",
      lat: -33.96,
      lon: 18.66,
      unemp2023: 20.1,
      gdpShare: 14,
      popM: 7.4,
      note: "Services and agriculture hub; historically lower broad unemployment than former homeland regions.",
    },
    EC: {
      name: "Eastern Cape",
      lat: -32.29,
      lon: 26.42,
      unemp2023: 39.2,
      gdpShare: 8,
      popM: 6.9,
      note: "Legacy of apartheid spatial inequality; industry and ports link to global trade but job absorption remains weak.",
    },
    NC: {
      name: "Northern Cape",
      lat: -28.74,
      lon: 22.15,
      unemp2023: 19.4,
      gdpShare: 3,
      popM: 1.3,
      note: "Mining-intensive, sparse population; exposure to commodity cycles tied to global capital flows.",
    },
    FS: {
      name: "Free State",
      lat: -29.12,
      lon: 26.23,
      unemp2023: 31.8,
      gdpShare: 5,
      popM: 2.9,
      note: "Agriculture and gold-dependent history; manufacturing felt tariff liberalization in the 1990s.",
    },
    KZN: {
      name: "KwaZulu-Natal",
      lat: -28.53,
      lon: 30.75,
      unemp2023: 32.3,
      gdpShare: 16,
      popM: 11.5,
      note: "Durban container port and manufacturing; integration raised import competition in several sectors.",
    },
    NW: {
      name: "North West",
      lat: -26.66,
      lon: 25.29,
      unemp2023: 40.5,
      gdpShare: 6,
      popM: 4.1,
      note: "Platinum and mining belt; volatile employment linked to global metal demand.",
    },
    GP: {
      name: "Gauteng",
      lat: -26.27,
      lon: 28.12,
      unemp2023: 33.1,
      gdpShare: 35,
      popM: 15.8,
      note: "Financial and corporate core; largest FDI destination but also acute inequality within metros.",
    },
    MP: {
      name: "Mpumalanga",
      lat: -25.43,
      lon: 30.59,
      unemp2023: 38.4,
      gdpShare: 8,
      popM: 4.7,
      note: "Coal, power, and transport corridors; early post-apartheid restructuring of heavy industry.",
    },
    LP: {
      name: "Limpopo",
      lat: -23.88,
      lon: 29.42,
      unemp2023: 37.2,
      gdpShare: 7,
      popM: 6.0,
      note: "Mining and agriculture; peripheral to port access; high structural unemployment.",
    },
  };

  const COLORS = {
    WC: "#3d9cf5",
    EC: "#5ce0a8",
    NC: "#f0b429",
    FS: "#c084fc",
    KZN: "#f472b6",
    NW: "#94a3b8",
    GP: "#38bdf8",
    MP: "#a3e635",
    LP: "#fb923c",
  };

  let map;
  let chartNational;
  let chartProv;
  let chartCompare;
  let selectedId = null;

  function el(id) {
    return document.getElementById(id);
  }

  function renderPanel(id) {
    const p = PROVINCES[id];
    const panel = el("detail-panel");
    if (!p) return;
    const nat = NATIONAL.find((r) => r.y === 2023);
    panel.innerHTML = `
      <h3>${p.name}</h3>
      <p class="panel-lead">${p.note}</p>
      <dl>
        <dt>Official unemployment, strict def. (approx. Q4 2023, %)</dt><dd><strong>${p.unemp2023}%</strong> (national ILO-modelled ~${nat && nat.unemp != null ? nat.unemp.toFixed(1) : "—"}% in WDI for 2023)</dd>
        <dt>Share of national GDP (approx.)</dt><dd>${p.gdpShare}%</dd>
        <dt>Population (approx. mil.)</dt><dd>${p.popM}</dd>
      </dl>
      <p class="panel-foot">Provincial rates are rounded to match QLFS Q4 2023 strict unemployment <em>patterns</em>; national sidebar uses World Bank WDI (ILO modelled)—two different concepts. Use Stats SA P0211 for exact provincial figures.</p>
    `;
    document.querySelectorAll(".province-pills button").forEach((b) => {
      b.classList.toggle("active", b.dataset.prov === id);
    });
    selectedId = id;
    drawProvChart(id);
  }

  function drawNationalChart(zoomTransition) {
    const ctx = el("chart-national");
    if (!ctx || typeof Chart === "undefined") return;
    let rows = NATIONAL;
    if (zoomTransition) {
      rows = NATIONAL.filter((r) => r.y >= 1990 && r.y <= 2005);
    }
    const labels = rows.map((r) => r.y);
    const gdp = rows.map((r) => r.gdpPc);
    const trade = rows.map((r) => r.trade);
    if (chartNational) chartNational.destroy();
    chartNational = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Real GDP per capita (const. US$)",
            data: gdp,
            borderColor: "#3d9cf5",
            backgroundColor: "rgba(61,156,245,0.1)",
            yAxisID: "y",
            tension: 0.15,
          },
          {
            label: "Trade (% of GDP)",
            data: trade,
            borderColor: "#5ce0a8",
            yAxisID: "y1",
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "#8b9cb3" } },
          title: {
            display: zoomTransition,
            text: "Zoom: first democratic decade — integration window (1990–2005)",
            color: "#f0b429",
            font: { size: 12 },
          },
        },
        scales: {
          x: { ticks: { color: "#8b9cb3", maxRotation: 45 } },
          y: {
            type: "linear",
            position: "left",
            ticks: { color: "#8b9cb3" },
            title: { display: true, text: "GDP pc", color: "#8b9cb3" },
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { color: "#8b9cb3" },
            title: { display: true, text: "Trade %", color: "#8b9cb3" },
          },
        },
      },
    });
  }

  function drawProvChart(selected) {
    const ctx = el("chart-provincial");
    if (!ctx || typeof Chart === "undefined") return;
    const ids = Object.keys(PROVINCES);
    const SHORT = {
      WC: "W. Cape",
      EC: "E. Cape",
      NC: "N. Cape",
      FS: "Free State",
      KZN: "KZN",
      NW: "N. West",
      GP: "Gauteng",
      MP: "Mpumalanga",
      LP: "Limpopo",
    };
    const labels = ids.map((k) => SHORT[k]);
    const data = ids.map((k) => PROVINCES[k].unemp2023);
    const bg = ids.map((k) =>
      k === selected ? COLORS[k] : "rgba(139,156,179,0.35)"
    );
    if (chartProv) chartProv.destroy();
    chartProv = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Unemployment strict % (approx., Q4 2023 QLFS pattern)",
            data,
            backgroundColor: bg,
            borderColor: ids.map((k) => COLORS[k]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Provincial strict unemployment — selected province highlighted",
            color: "#8b9cb3",
            font: { size: 12 },
          },
        },
        scales: {
          x: { ticks: { color: "#8b9cb3", maxRotation: 60 } },
          y: {
            beginAtZero: true,
            max: 50,
            ticks: { color: "#8b9cb3" },
            title: { display: true, text: "%", color: "#8b9cb3" },
          },
        },
      },
    });
  }

  function drawCompareChart() {
    const ctx = el("chart-compare");
    if (!ctx || typeof Chart === "undefined") return;
    const y1990 = NATIONAL.find((r) => r.y === 1990);
    const y2000 = NATIONAL.find((r) => r.y === 2000);
    if (chartCompare) chartCompare.destroy();
    chartCompare = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1990", "2000"],
        datasets: [
          {
            label: "Trade (% GDP)",
            data: [y1990.trade, y2000.trade],
            backgroundColor: "#5ce0a8",
          },
          {
            label: "FDI net inflows (% GDP)",
            data: [y1990.fdi, y2000.fdi],
            backgroundColor: "#3d9cf5",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#8b9cb3" } },
          title: {
            display: true,
            text: "1990 FDI is slightly negative in WDI; unemployment ~22.8% in 2000 vs ~23.1% in 1991 (ILO series)",
            color: "#8b9cb3",
            font: { size: 11 },
          },
        },
        scales: {
          x: { ticks: { color: "#8b9cb3" } },
          y: {
            ticks: { color: "#8b9cb3" },
            beginAtZero: false,
            suggestedMin: Math.min(y1990.fdi, y2000.fdi, 0) - 0.5,
          },
        },
      },
    });
  }

  function initMap() {
    map = L.map("map", { scrollWheelZoom: true }).setView([-28.8, 25.0], 5.2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    L.geoJSON(ZAF_OUTLINE, {
      style: {
        color: "#3d9cf5",
        weight: 2,
        fillColor: "#1a2332",
        fillOpacity: 0.15,
      },
    }).addTo(map);

    Object.keys(PROVINCES).forEach((id) => {
      const p = PROVINCES[id];
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 11,
        color: "#0c0f14",
        weight: 2,
        fillColor: COLORS[id],
        fillOpacity: 0.92,
      });
      marker.bindTooltip(p.name, { permanent: false, direction: "top" });
      marker.on("click", () => renderPanel(id));
      marker.addTo(map);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
    window.addEventListener("resize", () => {
      map.invalidateSize();
    });
  }

  function initPills() {
    const wrap = el("province-pills");
    if (!wrap) return;
    Object.keys(PROVINCES).forEach((id) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = PROVINCES[id].name.replace("KwaZulu-Natal", "KZN");
      b.dataset.prov = id;
      b.addEventListener("click", () => renderPanel(id));
      wrap.appendChild(b);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Chart !== "undefined") {
      Chart.defaults.color = "#8b9cb3";
      Chart.defaults.borderColor = "#2d3a50";
    }
    const btnZoom = el("btn-compare-90-00");
    const btnFull = el("btn-reset-chart");
    function setChartMode(zoomed) {
      drawNationalChart(zoomed);
      btnZoom?.setAttribute("aria-pressed", zoomed ? "true" : "false");
      btnFull?.setAttribute("aria-pressed", zoomed ? "false" : "true");
      btnZoom?.classList.toggle("is-active", zoomed);
      btnFull?.classList.toggle("is-active", !zoomed);
    }

    initMap();
    const mapSection = el("interactive");
    if (mapSection && map && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) map.invalidateSize();
          });
        },
        { threshold: 0.15 }
      );
      io.observe(mapSection);
    }
    initPills();
    setChartMode(false);
    drawProvChart(null);
    drawCompareChart();

    btnZoom?.addEventListener("click", () => setChartMode(true));
    btnFull?.addEventListener("click", () => setChartMode(false));

    const yr = el("year-scrubber");
    if (yr) {
      yr.addEventListener("input", () => {
        const y = parseInt(yr.value, 10);
        const yl = el("year-label");
        if (yl) yl.textContent = y;
        yr.setAttribute("aria-valuenow", String(y));
        const row = NATIONAL.find((r) => r.y === y);
        const box = el("year-readout");
        if (row && box) {
          box.innerHTML = `<strong>${y}</strong> — GDP per capita (const. US$): ${row.gdpPc.toLocaleString()}; trade: ${row.trade.toFixed(2)}% of GDP; FDI net inflows: ${row.fdi.toFixed(2)}% of GDP; unemployment (ILO modelled, WDI): ${
            row.unemp != null ? row.unemp.toFixed(2) + "%" : "—"
          }; Gini (WDI, sparse): ${row.gini != null ? row.gini : "—"}`;
        }
      });
    }

    renderPanel("GP");
    yr?.dispatchEvent(new Event("input"));
  });
})();
