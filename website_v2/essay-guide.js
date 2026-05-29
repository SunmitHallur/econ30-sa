/* =============================================================
  Econ 30 · Essay Guide: guided walkthrough + grounded Q&A
  Works fully client-side; optionally calls /api/chat when available.
  ============================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const STOPWORDS = new Set(
    "a an the and or but in on at to for of is are was were be been being it its that with from as by not no so if than then into who which their there they them we you your our".split(" ")
  );

  const SCORE_THRESHOLD = 1.25;
  const API_TIMEOUT_MS = 12000;
  const INVITE_STORAGE_KEY = "econ30-guide-invite-dismissed-v3";
  const INVITE_DELAY_MS = 900;
  const INVITE_RESHOW_MS = 600;

  let corpus = { chunks: [] };
  let tour = { steps: [] };
  let tourIndex = 0;
  let tourActive = false;
  let tourStarted = false;
  let panelOpen = false;
  let mode = "ask"; // "ask" | "tour"
  let messages = [];
  let apiAvailable = null;
  let inviteVisible = false;
  let inviteTimer = null;

  const sectionOrder = [
    "hero", "question", "from-the-ground", "timeline", "macro", "sectors",
    "inequality", "two-lives", "results", "map", "conclusions", "sources",
  ];

  const tokenize = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const normalizeQuery = (q) =>
    String(q || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const JUNK_SENTENCE =
    /(% of GDP|% of employed|World Bank WDI|OHS \/ LFS|QLFS|BH-significant|Not significant|→|Stat check|How to read|View source|Section \d|Built on WDI|Pick a term)/i;

  const cleanChunkText = (text) =>
    String(text || "")
      .replace(/\s+([,.])/g, "$1")
      .replace(/\b(Start with places|Jump to national charts|see sources)\b[^.]*\.?/gi, "")
      .replace(/Manufacturing, % of[^.]*\.?/gi, "")
      .replace(/Tradable sectors, % of[^.]*\.?/gi, "")
      .replace(/[–-]\s*→\s*[–-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const excerptFromChunk = (chunk) => {
    if (chunk.id?.startsWith("faq-")) return chunk.text;
    const text = cleanChunkText(chunk.text);
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 35 && !JUNK_SENTENCE.test(s));
    const picked = sentences.slice(0, 2).join(" ");
    const body = picked || text.slice(0, 280);
    return body.length > 320 ? `${body.slice(0, 317).trim()}…` : body;
  };

  /** Direct routing for common demo questions before keyword search. */
  const findCuratedChunk = (query) => {
    const q = normalizeQuery(query);
    const rules = [
      { test: () => /\bwhat is this (essay|site|project)\b/.test(q) || q === "what is this essay about", id: "faq-what-is-this-essay-about" },
      { test: () => /\bwhat happened in 1994\b/.test(q) || (q.includes("1994") && q.includes("happened")), id: "faq-what-happened-in-1994" },
      { test: () => /\bwhat happened in 1996\b/.test(q) || (q.includes("1996") && q.includes("happened")), id: "faq-what-happened-in-1996" },
      { test: () => /\bwhat is gear\b/.test(q) || (q.includes("gear") && q.includes("what")), id: "faq-what-is-gear" },
      { test: () => /\bwhat is rdp\b/.test(q), id: "faq-what-is-rdp" },
      { test: () => /\bwhen did trade\b/.test(q) || (q.includes("trade") && (q.includes("rise") || q.includes("increase") || q.includes("grow"))), id: "faq-when-did-trade-rise" },
      { test: () => /\bwhy\b.*\bunemployment\b/.test(q) || /\bunemployment\b.*\b(stay|high|fall)\b/.test(q), id: "faq-why-unemployment" },
      { test: () => q.includes("map") && (q.includes("show") || q.includes("what")), id: "faq-what-does-the-map-show" },
      { test: () => q.includes("one sentence") || q.includes("remember"), id: "faq-remember-one-sentence" },
    ];
    for (const rule of rules) {
      if (!rule.test()) continue;
      const chunk = corpus.chunks.find((c) => c.id === rule.id);
      if (chunk) return { chunk, score: 20 };
    }
    return null;
  };

  const chunkNoisePenalty = (chunk) => {
    const t = chunk.text || "";
    let penalty = 0;
    if ((t.match(/→/g) || []).length >= 2) penalty += 4;
    if (/% of (GDP|employed)/i.test(t)) penalty += 3;
    if (chunk.id?.startsWith("kb-") && !chunk.id.includes("gear") && !chunk.id.includes("rdp")) penalty += 2;
    if (/^##\s/m.test(t)) penalty += 5;
    return penalty;
  };

  const getActiveSectionId = () => {
    const y = window.scrollY + window.innerHeight * 0.45;
    let active = sectionOrder[0];
    for (const id of sectionOrder) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) active = id;
    }
    return active;
  };

  const retrieve = (query, sectionBoostId) => {
    const qNorm = normalizeQuery(query);
    const qTokens = tokenize(query);
    if (!qNorm) return [];

    const scored = corpus.chunks.map((chunk) => {
      const hay = [
        chunk.text,
        chunk.title,
        ...(chunk.keywords || []),
        ...(chunk.kb || []),
      ].join(" ").toLowerCase();
      let score = 0;

      if (chunk.id.startsWith("faq-")) {
        const faqKey = chunk.id.replace("faq-", "").replace(/-/g, " ");
        if (qNorm.includes(faqKey)) score += 12;
        const faqWords = faqKey.split(" ").filter((w) => w.length > 2);
        const matched = faqWords.filter((w) => qNorm.includes(w)).length;
        score += matched * 2.5;
      }

      for (const t of qTokens) {
        if (hay.includes(t)) score += 1;
        if ((chunk.keywords || []).includes(t)) score += 0.5;
      }

      if (/\b(essay|project|site|about)\b/.test(qNorm) && chunk.section === "hero") score += 2;
      if (/\b1994\b/.test(qNorm) && ["timeline", "question", "hero"].includes(chunk.section)) {
        score += 2;
      }
      if (/\b1996\b/.test(qNorm) && ["timeline", "question"].includes(chunk.section)) {
        score += 3;
      }
      if (/\b(trade|openness|exports|imports)\b/.test(qNorm) && chunk.section === "macro") {
        score += 3;
      }
      if (/\b(happened|when|timeline|year)\b/.test(qNorm) && chunk.section === "timeline") {
        score += 2;
      }
      if (sectionBoostId && chunk.section === sectionBoostId) score += 0.5;

      score -= chunkNoisePenalty(chunk);

      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const buildLocalAnswer = (query, hits) => {
    if (!hits.length || hits[0].score < SCORE_THRESHOLD) {
      return {
        html: `<p>I could not find a clear match in this essay. Try asking about trade openness, manufacturing jobs, inequality, GEAR, the map, or the regression results. See <a href="#sources">Sources</a> for papers and data.</p>`,
        anchors: ["#sources"],
        grounded: false,
      };
    }

    const best = hits[0].chunk;
    const excerpt = excerptFromChunk(best);
    const anchor = best.anchor || `#${best.section}`;
    const sectionLabel = best.title || best.section.replace(/-/g, " ");

    let body = `<p><strong>${sectionLabel}.</strong> ${excerpt}</p>`;
    if (best.stats?.length) {
      const statLine = best.stats
        .map((s) => `<strong>${s.label}:</strong> ${s.value}`)
        .join(" · ");
      body += `<p class="essay-guide__stats mono">${statLine}</p>`;
    }
    body += `<p class="essay-guide__cite">Read more: <a href="${anchor}">${anchor.replace("#", "")}</a> · <a href="#sources">Sources</a></p>`;

    return { html: body, anchors: [anchor], grounded: true };
  };

  const tryApiAnswer = async (query, hits) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const context = hits.map((h) => ({
        id: h.chunk.id,
        section: h.chunk.section,
        title: h.chunk.title,
        text: h.chunk.text.slice(0, 800),
        anchor: h.chunk.anchor,
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          section: getActiveSectionId(),
          context,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.answer) return null;
      apiAvailable = true;
      const anchors = data.anchors || hits.map((h) => h.chunk.anchor).filter(Boolean);
      let html = `<p>${data.answer.replace(/\n/g, "</p><p>")}</p>`;
      if (anchors.length) {
        html += `<p class="essay-guide__cite">See: ${anchors
          .map((a) => `<a href="${a}">${a.replace("#", "")}</a>`)
          .join(", ")}</p>`;
      }
      return { html, anchors, grounded: true, viaApi: true };
    } catch {
      clearTimeout(timer);
      apiAvailable = false;
      return null;
    }
  };

  const appendMessage = (role, html) => {
    messages.push({ role, html });
    const log = $("#essay-guide-log");
    if (!log) return;
    const item = document.createElement("div");
    item.className = `essay-guide__msg essay-guide__msg--${role}`;
    item.innerHTML = role === "user"
      ? `<p>${html.replace(/</g, "&lt;")}</p>`
      : html;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  };

  const handleAsk = async (query) => {
    const q = String(query || "").trim();
    if (!q) return;
    appendMessage("user", q);
    const sectionId = getActiveSectionId();
    const curated = findCuratedChunk(q);
    let hits = curated ? [curated] : retrieve(q, sectionId);
    if (!curated && hits.length && hits[0].score < SCORE_THRESHOLD) {
      const retry = retrieve(q, null);
      if (retry[0]?.score > hits[0].score) hits = retry;
    }

    const thinking = document.createElement("div");
    thinking.className = "essay-guide__msg essay-guide__msg--assistant essay-guide__thinking";
    thinking.textContent = "Searching the essay…";
    $("#essay-guide-log")?.appendChild(thinking);

    let answer = null;
    if (apiAvailable !== false) {
      answer = await tryApiAnswer(q, hits);
    }
    thinking.remove();

    if (!answer) {
      answer = buildLocalAnswer(q, hits);
    }
    appendMessage("assistant", answer.html);
    refreshSuggestedChips();
  };

  const scrollToAnchor = (anchor) => {
    const el = document.querySelector(anchor);
    if (!el) return;
    const topbar = $(".topbar");
    const offset = (topbar?.offsetHeight || 64) + 12;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo({ top: y, behavior });
  };

  const setTourHighlight = (selector) => {
    document.body.classList.toggle("essay-guide-tour-active", tourActive);
    $$("main section, main .hero").forEach((sec) => {
      sec.classList.remove("essay-guide-tour-focus");
    });
    if (!tourActive || !selector) return;
    const el = document.querySelector(selector);
    if (el) el.classList.add("essay-guide-tour-focus");
  };

  const renderTourStep = () => {
    const step = tour.steps[tourIndex];
    if (!step) return;

    const titleEl = $("#essay-guide-tour-title");
    const narrEl = $("#essay-guide-tour-narration");
    const progEl = $("#essay-guide-tour-progress");
    const prevBtn = $("#essay-guide-tour-prev");
    const nextBtn = $("#essay-guide-tour-next");

    if (titleEl) titleEl.textContent = step.title;
    if (narrEl) narrEl.textContent = step.narration;
    if (progEl) progEl.textContent = `Step ${tourIndex + 1} of ${tour.steps.length}`;
    if (prevBtn) prevBtn.disabled = tourIndex === 0;
    if (nextBtn) nextBtn.textContent = tourIndex >= tour.steps.length - 1 ? "Finish" : "Next";

    scrollToAnchor(step.anchor);
    setTourHighlight(step.highlight || step.anchor);

    const indicator = $("#section-indicator-text");
    if (indicator) {
      indicator.textContent = `Tour ${tourIndex + 1}/${tour.steps.length} · ${step.title}`;
    }

    refreshSuggestedChips(step.suggestedQuestions);
  };

  const pauseTour = () => {
    tourActive = false;
    setTourHighlight(null);
    document.body.classList.remove("essay-guide-tour-active");
  };

  const resetTour = () => {
    tourStarted = false;
    tourIndex = 0;
    pauseTour();
  };

  const tourNext = () => {
    if (tourIndex >= tour.steps.length - 1) {
      resetTour();
      setModeTab("ask");
      return;
    }
    tourIndex += 1;
    renderTourStep();
  };

  const tourPrev = () => {
    if (tourIndex <= 0) return;
    tourIndex -= 1;
    renderTourStep();
  };

  const refreshSuggestedChips = (overrideQuestions) => {
    const wrap = $("#essay-guide-suggestions");
    if (!wrap) return;
    wrap.innerHTML = "";
    let questions = overrideQuestions;
    if (!questions?.length) {
      const step = tour.steps.find((s) => s.id === getActiveSectionId());
      questions = step?.suggestedQuestions || [
        "What is GEAR?",
        "Why didn't unemployment fall?",
        "What survived the regressions?",
      ];
    }
    questions.slice(0, 4).forEach((q) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "essay-guide__chip";
      btn.textContent = q;
      btn.addEventListener("click", () => {
        setModeTab("ask");
        $("#essay-guide-input")?.focus();
        handleAsk(q);
      });
      wrap.appendChild(btn);
    });
  };

  const setModeTab = (next) => {
    mode = next;
    $$(".essay-guide__tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.mode === next);
      tab.setAttribute("aria-selected", tab.dataset.mode === next ? "true" : "false");
    });
    $("#essay-guide-panel-tour")?.classList.toggle("is-hidden", next !== "tour");
    $("#essay-guide-panel-ask")?.classList.toggle("is-hidden", next !== "ask");
    if (next === "tour") {
      if (!tourStarted) {
        tourStarted = true;
        tourIndex = 0;
      }
      tourActive = true;
      renderTourStep();
    } else if (next === "ask") {
      pauseTour();
      refreshSuggestedChips();
    }
  };

  const inviteDismissed = () => {
    try {
      return Boolean(localStorage.getItem(INVITE_STORAGE_KEY));
    } catch {
      return false;
    }
  };

  const hideInvite = (remember = false) => {
    if (remember) {
      try {
        localStorage.setItem(INVITE_STORAGE_KEY, "1");
      } catch { /* ignore */ }
    }
    inviteVisible = false;
    const invite = $("#essay-guide-invite");
    invite?.classList.remove("is-visible");
    invite?.setAttribute("aria-hidden", "true");
    if (inviteTimer) {
      clearTimeout(inviteTimer);
      inviteTimer = null;
    }
  };

  const showInvite = () => {
    if (panelOpen || inviteDismissed()) return;
    const invite = $("#essay-guide-invite");
    if (!invite) return;
    inviteVisible = true;
    invite.classList.add("is-visible");
    invite.setAttribute("aria-hidden", "false");
  };

  const scheduleInvite = (delayMs = INVITE_DELAY_MS) => {
    if (inviteDismissed() || panelOpen) return;
    if (inviteTimer) clearTimeout(inviteTimer);
    inviteTimer = window.setTimeout(() => {
      inviteTimer = null;
      showInvite();
    }, delayMs);
  };

  const openPanel = (initialMode) => {
    hideInvite(false);
    panelOpen = true;
    document.body.classList.add("essay-guide-panel-open");
    const root = $("#essay-guide");
    root?.classList.add("is-open");
    root?.setAttribute("aria-hidden", "false");
    $("#essay-guide-launcher")?.setAttribute("aria-expanded", "true");
    if (initialMode) setModeTab(initialMode);
    if (initialMode !== "tour") $("#essay-guide-input")?.focus();
  };

  const closePanel = () => {
    panelOpen = false;
    pauseTour();
    document.body.classList.remove("essay-guide-panel-open");
    const root = $("#essay-guide");
    root?.classList.remove("is-open");
    root?.setAttribute("aria-hidden", "true");
    $("#essay-guide-launcher")?.setAttribute("aria-expanded", "false");
    scheduleInvite(INVITE_RESHOW_MS);
  };

  const togglePanel = () => {
    if (panelOpen) closePanel();
    else openPanel("ask");
  };

  const buildUI = () => {
    const wrap = document.createElement("div");
    wrap.id = "essay-guide";
    wrap.className = "essay-guide";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `
      <div class="essay-guide__bar" role="dialog" aria-labelledby="essay-guide-heading" aria-modal="false">
        <div class="essay-guide__bar-head">
          <div class="essay-guide__bar-title-wrap">
            <p class="essay-guide__kicker">Essay Guide</p>
            <h2 id="essay-guide-heading" class="essay-guide__heading">Walkthrough &amp; questions</h2>
          </div>
          <div class="essay-guide__bar-actions">
            <div class="essay-guide__tabs" role="tablist">
              <button type="button" class="essay-guide__tab is-active" data-mode="ask" role="tab" aria-selected="true">Ask</button>
              <button type="button" class="essay-guide__tab" data-mode="tour" role="tab" aria-selected="false">Walkthrough</button>
            </div>
            <button type="button" class="essay-guide__close ghost-btn ghost-btn--icon" aria-label="Close guide"><span class="ghost-btn__text" aria-hidden="true">×</span></button>
          </div>
        </div>
        <div id="essay-guide-panel-ask" class="essay-guide__panel">
          <div id="essay-guide-log" class="essay-guide__log" aria-live="polite" aria-relevant="additions"></div>
          <div id="essay-guide-suggestions" class="essay-guide__suggestions"></div>
          <form class="essay-guide__form" id="essay-guide-form">
            <label class="visually-hidden" for="essay-guide-input">Ask about this essay</label>
            <input id="essay-guide-input" class="essay-guide__input" type="text" placeholder="Ask about this essay…" autocomplete="off" />
            <button type="submit" class="essay-guide__send">Ask</button>
          </form>
          <p class="essay-guide__disclaimer">Answers come from this essay and its data. Not financial or policy advice.</p>
        </div>
        <div id="essay-guide-panel-tour" class="essay-guide__panel is-hidden">
          <p id="essay-guide-tour-progress" class="essay-guide__tour-progress mono"></p>
          <h3 id="essay-guide-tour-title" class="essay-guide__tour-title"></h3>
          <p id="essay-guide-tour-narration" class="essay-guide__tour-narration"></p>
          <div class="essay-guide__tour-nav">
            <button type="button" id="essay-guide-tour-prev" class="essay-guide__tour-btn ghost-btn"><span class="ghost-btn__text">Previous</span></button>
            <button type="button" id="essay-guide-tour-exit" class="essay-guide__tour-btn ghost-btn"><span class="ghost-btn__text">Exit tour</span></button>
            <button type="button" id="essay-guide-tour-next" class="essay-guide__next-btn"><span class="ghost-btn__text">Next</span></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const invite = document.createElement("aside");
    invite.id = "essay-guide-invite";
    invite.className = "essay-guide-invite";
    invite.setAttribute("role", "dialog");
    invite.setAttribute("aria-labelledby", "essay-guide-invite-title");
    invite.setAttribute("aria-live", "polite");
    invite.setAttribute("aria-hidden", "true");
    invite.innerHTML = `
      <button type="button" class="essay-guide-invite__close" aria-label="Dismiss">×</button>
      <p class="essay-guide-invite__kicker">Essay Guide</p>
      <h2 id="essay-guide-invite-title" class="essay-guide-invite__title">Would you like a walkthrough?</h2>
      <p class="essay-guide-invite__lede">Take an 11-step tour of this essay or ask questions grounded in the charts and sources. The guide stays on the right so you can keep reading.</p>
      <div class="essay-guide-invite__actions">
        <button type="button" class="essay-guide-invite__primary" id="essay-guide-invite-tour">Start walkthrough</button>
        <button type="button" class="essay-guide-invite__secondary" id="essay-guide-invite-ask">Ask a question</button>
        <button type="button" class="essay-guide-invite__dismiss" id="essay-guide-invite-dismiss">Not now</button>
      </div>
    `;
    document.body.appendChild(invite);

    invite.querySelector(".essay-guide-invite__close")?.addEventListener("click", () => hideInvite(true));
    $("#essay-guide-invite-dismiss")?.addEventListener("click", () => hideInvite(true));
    $("#essay-guide-invite-tour")?.addEventListener("click", () => openPanel("tour"));
    $("#essay-guide-invite-ask")?.addEventListener("click", () => openPanel("ask"));

    const launcher = document.createElement("button");
    launcher.id = "essay-guide-launcher";
    launcher.type = "button";
    launcher.className = "essay-guide__launcher ghost-btn";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "essay-guide");
    launcher.innerHTML = '<span class="ghost-btn__text">Guide</span>';
    const topbarInner = $(".topbar-inner");
    const themeBtn = $("#theme-toggle");
    if (topbarInner && themeBtn) {
      topbarInner.insertBefore(launcher, themeBtn);
    } else {
      launcher.classList.add("essay-guide__launcher--float");
      document.body.appendChild(launcher);
    }

    launcher.addEventListener("click", togglePanel);
    wrap.querySelector(".essay-guide__close")?.addEventListener("click", closePanel);
    $$(".essay-guide__tab", wrap).forEach((tab) => {
      tab.addEventListener("click", () => setModeTab(tab.dataset.mode));
    });
    $("#essay-guide-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#essay-guide-input");
      const val = input?.value;
      if (input) input.value = "";
      handleAsk(val);
    });
    $("#essay-guide-tour-prev")?.addEventListener("click", tourPrev);
    $("#essay-guide-tour-next")?.addEventListener("click", tourNext);
    $("#essay-guide-tour-exit")?.addEventListener("click", () => {
      resetTour();
      setModeTab("ask");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && inviteVisible) {
        e.preventDefault();
        hideInvite(true);
        return;
      }
      if (e.key === "Escape" && panelOpen) {
        e.preventDefault();
        closePanel();
        return;
      }
      if (!panelOpen || mode !== "tour") return;
      if (e.key === "ArrowRight") tourNext();
      if (e.key === "ArrowLeft") tourPrev();
    });

    let scrollTick = false;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollTick || mode !== "ask" || !panelOpen) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          scrollTick = false;
          if (mode === "ask" && panelOpen) refreshSuggestedChips();
        });
      },
      { passive: true }
    );
  };

  const boot = async () => {
    buildUI();
    scheduleInvite();

    try {
      const [corpusRes, tourRes] = await Promise.all([
        fetch("data/essay_corpus.json"),
        fetch("data/tour.json"),
      ]);
      if (corpusRes.ok) corpus = await corpusRes.json();
      if (tourRes.ok) tour = await tourRes.json();
    } catch (e) {
      console.warn("Essay Guide: could not load data", e);
    }

    appendMessage(
      "assistant",
      `<p>Hi. I can walk you through <strong>The Price of Integration</strong> or answer questions grounded in this essay's text, charts, and sources.</p>
       <p>Try <strong>Walkthrough</strong> for an 11-step tour, or ask anything below.</p>`
    );
    refreshSuggestedChips();

    // Probe API only on deployed hosts (/api/chat is a Vercel function, not static files)
    const isLocal =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "[::1]";
    if (isLocal) {
      apiAvailable = false;
    } else {
      fetch("/api/chat", { method: "HEAD" }).then((r) => {
        apiAvailable = r.ok;
      }).catch(() => {
        apiAvailable = false;
      });
    }

  };

  const onPageReady = () => {
    if (!inviteVisible && !inviteDismissed() && !panelOpen) {
      scheduleInvite(0);
    }
  };

  window.addEventListener("load", onPageReady);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) scheduleInvite(INVITE_RESHOW_MS);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
