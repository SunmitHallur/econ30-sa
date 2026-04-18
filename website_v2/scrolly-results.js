/* =============================================================
   Econometric results — GSAP ScrollTrigger scrolly panels
   ============================================================= */

(() => {
  "use strict";

  function refreshResultsScrolly() {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }

  function setRailActive(step) {
    const rail = document.querySelector(".results-scrolly-rail");
    if (!rail) return;
    const s = String(step);
    rail.querySelectorAll("[data-step]").forEach((el) => {
      el.classList.toggle("is-active", el.getAttribute("data-step") === s);
    });
  }

  function init() {
    const root = document.querySelector(".results-scrolly");
    if (!root || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("results-scrolly--reduced");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const panels = gsap.utils.toArray(".results-scrolly-panel");
    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      panels.forEach((panel) => {
        const reveal = panel.querySelector(".results-scrolly-reveal");
        if (!reveal) return;

        gsap.set(reveal, { opacity: 0, y: 56, scale: 0.985 });

        gsap.fromTo(
          reveal,
          { opacity: 0, y: 56, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top 82%",
              end: "top 38%",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          }
        );

        const step = panel.dataset.step ?? "0";
        ScrollTrigger.create({
          trigger: panel,
          start: "top 40%",
          end: "bottom 40%",
          onEnter: () => setRailActive(step),
          onEnterBack: () => setRailActive(step),
          invalidateOnRefresh: true,
        });
      });

      return () => {};
    });

    mm.add("(max-width: 899px)", () => {
      panels.forEach((panel) => {
        const reveal = panel.querySelector(".results-scrolly-reveal");
        if (!reveal) return;

        gsap.set(reveal, { opacity: 0, y: 40 });

        gsap.fromTo(
          reveal,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top 88%",
              end: "top 50%",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          }
        );
      });

      return () => {};
    });

    document.querySelector("#results details")?.addEventListener("toggle", refreshResultsScrolly);

    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(refreshResultsScrolly, 120);
    });

    requestAnimationFrame(refreshResultsScrolly);
  }

  window.refreshResultsScrolly = refreshResultsScrolly;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
