(() => {
  if (window.__messBuddyLoaderReady) return;
  window.__messBuddyLoaderReady = true;

  const PAGE_TRANSITION_MS = 320;
  const MIN_VISIBLE_MS = 700;
  const MAX_WAIT_MS = 5000;
  const LOADER_STYLE_ID = "messbuddy-loader-style";
  const LOADER_ID = "messbuddy-page-loader";
  let loaderShownAt = 0;
  let hideScheduled = false;
  let readyObserver = null;

  const ensureLoaderStyles = () => {
    if (document.getElementById(LOADER_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = LOADER_STYLE_ID;
    style.textContent = `
      .page-loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at top, rgba(255, 253, 249, 0.92) 0%, rgba(255, 243, 232, 0.96) 35%, rgba(245, 239, 230, 0.98) 100%);
        opacity: 1;
        visibility: visible;
        transition: opacity 0.32s ease, visibility 0.32s ease;
      }

      .page-loader.is-hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .page-loader__card {
        --bg-color: #111111;
        background-color: var(--bg-color);
        padding: 1rem 2rem;
        border-radius: 1.25rem;
        box-shadow: 0 24px 60px rgba(16, 14, 13, 0.28);
      }

      .page-loader__content {
        color: rgb(188, 188, 188);
        font-family: "Poppins", "Segoe UI", sans-serif;
        font-weight: 500;
        font-size: 25px;
        box-sizing: content-box;
        height: 40px;
        padding: 10px;
        display: flex;
        border-radius: 8px;
      }

      .page-loader__label {
        margin: 0;
        line-height: 40px;
        color: rgb(188, 188, 188);
      }

      .page-loader__words {
        overflow: hidden;
        position: relative;
        height: 40px;
      }

      .page-loader__words::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          var(--bg-color) 10%,
          transparent 30%,
          transparent 70%,
          var(--bg-color) 90%
        );
        z-index: 1;
        pointer-events: none;
      }

      .page-loader__word-track {
        display: flex;
        flex-direction: column;
        animation: messbuddy-loader-words 4s infinite;
      }

      .page-loader__word {
        display: block;
        height: 40px;
        line-height: 40px;
        padding-left: 6px;
        color: #e1583a;
        font-weight: 700;
      }

      @keyframes messbuddy-loader-words {
        10% {
          transform: translateY(-40px);
        }

        25% {
          transform: translateY(-40px);
        }

        35% {
          transform: translateY(-80px);
        }

        50% {
          transform: translateY(-80px);
        }

        60% {
          transform: translateY(-120px);
        }

        75% {
          transform: translateY(-120px);
        }

        85% {
          transform: translateY(-160px);
        }

        100% {
          transform: translateY(-160px);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .page-loader,
        .page-loader.is-hidden {
          transition: none;
        }

        .page-loader__word-track {
          animation: none;
        }
      }

      body.page.page-loader-active,
      body.page.page-loader-active.page-loaded,
      body.page.page-loader-active.page-fade-out {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  const ensureLoader = () => {
    if (!document.body) return null;
    let loader = document.getElementById(LOADER_ID);
    if (loader) {
      document.body.classList.add("page-loader-active");
      if (!loaderShownAt) {
        loaderShownAt = Date.now();
      }
      return loader;
    }

    loader = document.createElement("div");
    loader.id = LOADER_ID;
    loader.className = "page-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = `
      <div class="page-loader__card">
        <div class="page-loader__content" aria-label="Loading MessBuddy">
          <p class="page-loader__label">loading</p>
          <div class="page-loader__words">
            <div class="page-loader__word-track">
              <span class="page-loader__word">messbuddy</span>
              <span class="page-loader__word">menus</span>
              <span class="page-loader__word">ratings</span>
              <span class="page-loader__word">crowds</span>
              <span class="page-loader__word">messbuddy</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.classList.add("page-loader-active");
    document.body.appendChild(loader);
    loaderShownAt = Date.now();
    return loader;
  };

  const hideLoader = () => {
    if (hideScheduled) return;
    const loader = document.getElementById(LOADER_ID);
    if (!loader) return;
    hideScheduled = true;
    if (readyObserver) {
      readyObserver.disconnect();
      readyObserver = null;
    }
    const elapsed = Date.now() - loaderShownAt;
    const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      window.setTimeout(() => {
        document.body?.classList.remove("page-loader-active");
        loader.remove();
      }, 400);
    }, waitMs);
  };

  const revealPage = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body?.classList.add("page-loaded");
        hideLoader();
      });
    });
  };

  const initReveal = () => {
    if (!document.body?.classList.contains("page")) return;
    ensureLoaderStyles();
    ensureLoader();

    if (document.body.hasAttribute("data-reveal-after-data")) {
      if (document.body.classList.contains("page-loaded")) {
        hideLoader();
        return;
      }

      if ("MutationObserver" in window) {
        readyObserver = new MutationObserver(() => {
          if (document.body?.classList.contains("page-loaded")) {
            hideLoader();
          }
        });
        readyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }

      window.setTimeout(() => {
        if (document.body?.classList.contains("page-loaded")) {
          hideLoader();
          return;
        }
        document.body?.classList.add("page-loaded");
        hideLoader();
      }, MAX_WAIT_MS);
      return;
    }

    revealPage();
  };

  const initTransitions = () => {
    document.querySelectorAll("a[data-transition]").forEach((link) => {
      if (link.dataset.loaderBound === "1") return;
      link.dataset.loaderBound = "1";

      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || link.target === "_blank") {
          return;
        }

        event.preventDefault();
        document.body?.classList.add("page-fade-out");
        ensureLoaderStyles();
        ensureLoader();
        window.setTimeout(() => {
          window.location.href = href;
        }, PAGE_TRANSITION_MS);
      });
    });
  };

  const init = () => {
    initReveal();
    initTransitions();
  };

  ensureLoaderStyles();
  if (document.body) {
    ensureLoader();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        ensureLoader();
      },
      { once: true },
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
