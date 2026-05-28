/* Two Lives — interactive perspective engine.
 * Self-contained: reads data/two-lives.json, runs intro → 5 beats → dual endings.
 * No dependency on app.js or Chart.js. */
(function () {
  "use strict";

  const root = document.getElementById("two-lives-app");
  const stage = document.getElementById("tl-stage");
  if (!root || !stage) return;

  const src = root.dataset.src || "data/two-lives.json";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CHARS = ["pieter", "sipho"];

  // -- tiny DOM helper ------------------------------------------------------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2), attrs[k]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (Array.isArray(children) ? children : children != null ? [children] : [])
      .forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function focusFirst() {
    const target = stage.querySelector("[data-autofocus]") || stage.querySelector("h3, button");
    if (target) {
      target.setAttribute("tabindex", target.tabIndex < 0 ? "-1" : target.getAttribute("tabindex") || "-1");
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }

  // -- engine state ---------------------------------------------------------
  let data = null;
  let state = null;

  function freshState() {
    return {
      phase: "intro",
      beat: 0,
      scores: { pieter: data.characters.pieter.start, sipho: data.characters.sipho.start },
      reacted: false,
      lastReact: null,
    };
  }

  function bandFor(score) {
    for (const b of data.bands) if (score <= b.max) return b.key;
    return data.bands[data.bands.length - 1].key;
  }

  // -- render: progress -----------------------------------------------------
  function renderProgress() {
    const total = data.beats.length;
    const dots = el("div", { class: "tl-progress", "aria-hidden": "true" });
    for (let i = 0; i < total; i++) {
      let cls = "tl-progress__dot";
      if (state.phase === "ending") cls += " is-done";
      else if (i < state.beat) cls += " is-done";
      else if (i === state.beat && state.phase === "beat") cls += " is-active";
      dots.appendChild(el("span", { class: cls }));
    }
    const label =
      state.phase === "ending"
        ? "Outcome"
        : state.phase === "beat"
        ? `Decision ${state.beat + 1} of ${total}`
        : "Start";
    return el("div", { class: "tl-progress-row" }, [
      el("p", { class: "tl-progress-label", text: label }),
      dots,
    ]);
  }

  // -- render: character chip ----------------------------------------------
  function charChip(key) {
    const c = data.characters[key];
    return el("div", { class: `tl-chip tl-chip--${key}` }, [
      el("span", { class: "tl-chip__name", text: c.name }),
      el("span", { class: "tl-chip__tag", text: c.tagline }),
    ]);
  }

  // -- render: intro --------------------------------------------------------
  function renderIntro() {
    const i = data.intro;
    const card = el("div", { class: "tl-card tl-card--intro" }, [
      el("p", { class: "tl-kicker", text: i.kicker }),
      el("h3", { class: "tl-card__title", "data-autofocus": "", tabindex: "-1", text: "Meet two South Africans" }),
      el("p", { class: "tl-lede", text: i.lede }),
      el("div", { class: "tl-cast" }, CHARS.map((k) => {
        const c = data.characters[k];
        return el("div", { class: `tl-cast__member tl-cast__member--${k}` }, [
          el("p", { class: "tl-cast__name", text: c.name }),
          el("p", { class: "tl-cast__tagline", text: c.tagline }),
          el("p", { class: "tl-cast__blurb", text: c.blurb }),
        ]);
      })),
      el("button", {
        class: "tl-btn tl-btn--primary",
        type: "button",
        onclick: () => { state.phase = "beat"; render(); },
      }, i.start_button),
    ]);
    return card;
  }

  // -- render: a beat -------------------------------------------------------
  function renderBeat() {
    const beat = data.beats[state.beat];
    const wrap = el("div", { class: "tl-card tl-card--beat" });
    wrap.appendChild(el("p", { class: "tl-kicker", text: `${beat.year} · ${beat.title}` }));
    wrap.appendChild(el("h3", { class: "tl-card__title", "data-autofocus": "", tabindex: "-1", text: beat.prompt }));
    wrap.appendChild(el("p", { class: "tl-scene", text: beat.scene }));

    if (!state.reacted) {
      const opts = el("div", { class: "tl-options", role: "group", "aria-label": "Choose what happens next" });
      beat.options.forEach((opt, idx) => {
        opts.appendChild(el("button", {
          class: "tl-option",
          type: "button",
          onclick: () => choose(idx),
        }, [
          el("span", { class: "tl-option__num", text: String(idx + 1), "aria-hidden": "true" }),
          el("span", { class: "tl-option__label", text: opt.label }),
        ]));
      });
      wrap.appendChild(opts);
    } else {
      const r = state.lastReact;
      wrap.appendChild(el("p", { class: "tl-chose", html: `You chose: <strong>${escapeHtml(r.label)}</strong>` }));
      wrap.appendChild(el("div", { class: "tl-react" }, CHARS.map((k) =>
        el("div", { class: `tl-react__col tl-react__col--${k}` }, [
          el("p", { class: "tl-react__name", text: data.characters[k].name }),
          el("p", { class: "tl-react__text", text: r.react[k] }),
        ])
      )));
      const isLast = state.beat >= data.beats.length - 1;
      wrap.appendChild(el("button", {
        class: "tl-btn tl-btn--primary",
        type: "button",
        "data-autofocus": "",
        onclick: advance,
      }, isLast ? "See where they ended up →" : "Next, the years pass →"));
    }
    return wrap;
  }

  // -- render: endings + epilogue ------------------------------------------
  function renderEnding() {
    const wrap = el("div", { class: "tl-card tl-card--ending" });
    wrap.appendChild(el("p", { class: "tl-kicker", text: "2025 · where they landed" }));
    wrap.appendChild(el("h3", { class: "tl-card__title", "data-autofocus": "", tabindex: "-1", text: data.epilogue.lede }));

    wrap.appendChild(el("div", { class: "tl-endings" }, CHARS.map((k) => {
      const band = bandFor(state.scores[k]);
      const e = data.endings[k][band];
      const stat = e.stat
        ? (e.statHref
            ? el("p", { class: "tl-ending__stat" }, [el("a", { href: e.statHref, text: e.stat })])
            : el("p", { class: "tl-ending__stat", text: e.stat }))
        : null;
      return el("div", { class: `tl-ending tl-ending--${k}` }, [
        el("p", { class: "tl-ending__name", text: data.characters[k].name }),
        el("p", { class: "tl-ending__tag", text: e.tag }),
        el("h4", { class: "tl-ending__title", text: e.title }),
        el("p", { class: "tl-ending__body", text: e.body }),
        stat,
      ].filter(Boolean));
    })));

    wrap.appendChild(el("p", { class: "tl-epilogue", text: data.epilogue.body }));

    const actions = el("div", { class: "tl-actions" }, [
      el("button", {
        class: "tl-btn tl-btn--ghost",
        type: "button",
        onclick: () => { state = freshState(); render(); },
      }, data.epilogue.restart),
      el("a", { class: "tl-btn tl-btn--link", href: data.epilogue.cta.href }, data.epilogue.cta.label),
    ]);
    wrap.appendChild(actions);
    return wrap;
  }

  // -- actions --------------------------------------------------------------
  function choose(optIdx) {
    const beat = data.beats[state.beat];
    const opt = beat.options[optIdx];
    CHARS.forEach((k) => { state.scores[k] += opt.effects[k] || 0; });
    state.reacted = true;
    state.lastReact = opt;
    render();
  }

  function advance() {
    state.reacted = false;
    state.lastReact = null;
    if (state.beat >= data.beats.length - 1) {
      state.phase = "ending";
    } else {
      state.beat += 1;
    }
    render();
  }

  // -- main render ----------------------------------------------------------
  function render() {
    clear(stage);
    if (reduceMotion) stage.classList.add("tl-reduce");
    stage.appendChild(renderProgress());
    if (state.phase === "intro") stage.appendChild(renderIntro());
    else if (state.phase === "beat") stage.appendChild(renderBeat());
    else stage.appendChild(renderEnding());
    if (state.phase !== "intro" || state.beat > 0) focusFirst();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // -- boot -----------------------------------------------------------------
  function showError() {
    clear(stage);
    stage.appendChild(el("p", { class: "tl-error", text: "The interactive could not load. Try refreshing the page." }));
  }

  fetch(src)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((json) => {
      data = json;
      state = freshState();
      render();
    })
    .catch((err) => { console.error("two-lives: failed to load", err); showError(); });
})();
