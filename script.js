(() => {
const revealPage = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add("page-loaded");
    });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", revealPage);
} else {
  revealPage();
}

document.querySelectorAll("a[data-transition]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || link.target === "_blank") {
      return;
    }
    event.preventDefault();
    document.body.classList.add("page-fade-out");
    setTimeout(() => {
      window.location.href = href;
    }, 400);
  });
});

const hoverBorderTargets = Array.from(document.querySelectorAll("button, a.btn, a.ghost-btn"));
let lastPointer = null;
let prevPointer = null;

document.addEventListener("pointermove", (event) => {
  prevPointer = lastPointer;
  lastPointer = { x: event.clientX, y: event.clientY };
});

const ensureHoverBorder = (el) => {
  if (el.classList.contains("hover-border-target")) {
    return;
  }
  el.classList.add("hover-border-target");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("hover-border");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.shapeRendering = "geometricPrecision";

  const pathForward = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathForward.classList.add("forward");
  const pathBackward = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathBackward.classList.add("backward");
  svg.appendChild(pathForward);
  svg.appendChild(pathBackward);
  el.appendChild(svg);

  let metrics = null;
  let totalLength = 0;
  let lastInside = null;
  const getCurrentDraw = () =>
    parseFloat(window.getComputedStyle(el).getPropertyValue("--draw")) || 0;

  const getTargetDraw = () => {
    const styles = window.getComputedStyle(el);
    const overlap = parseFloat(styles.getPropertyValue("--hover-draw-overlap")) || 0;
    if (!totalLength) {
      return overlap;
    }
    return Math.min(totalLength / 2 + overlap, totalLength);
  };

  let drawAnimation = null;

  const animateDraw = (to, options = {}) => {
    const target = Math.max(to, 0);
    if (drawAnimation && typeof drawAnimation.pause === "function") {
      drawAnimation.pause();
      drawAnimation = null;
    }
    const from = getCurrentDraw();
    const duration = options.duration ?? 520;
    const easing = options.easing ?? "easeOutCubic";

    if (!duration) {
      el.style.setProperty("--draw", `${target}px`);
      if (typeof options.complete === "function") {
        options.complete();
      }
      return;
    }

    const animState = { value: from };
    drawAnimation = anime({
      targets: animState,
      value: target,
      duration,
      easing,
      update: () => {
        el.style.setProperty("--draw", `${animState.value}px`);
      },
      complete: () => {
        drawAnimation = null;
        if (typeof options.complete === "function") {
          options.complete();
        }
      },
    });
  };

  const updateGeometry = () => {
    const bounds = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    const stroke = parseFloat(styles.getPropertyValue("--hover-stroke")) || 2;
    const gap = parseFloat(styles.getPropertyValue("--hover-gap")) || 0;
    const inset = stroke / 2 + gap;

    const x0 = inset;
    const y0 = inset;
    const x1 = Math.max(bounds.width - inset, inset + 1);
    const y1 = Math.max(bounds.height - inset, inset + 1);
    const width = Math.max(x1 - x0, 1);
    const height = Math.max(y1 - y0, 1);

    const baseRadius = parseFloat(styles.borderRadius) || 0;
    const maxRadius = Math.min(width / 2, height / 2);
    const radius = Math.min(baseRadius, maxRadius);

    svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    const r = Math.max(radius - 0, 0);
    const d = [
      `M ${x0 + r} ${y0}`,
      `H ${x1 - r}`,
      `A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
      `V ${y1 - r}`,
      `A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
      `H ${x0 + r}`,
      `A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
      `V ${y0 + r}`,
      `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
      "Z",
    ].join(" ");
    pathForward.setAttribute("d", d);
    pathBackward.setAttribute("d", d);

    try {
      totalLength = pathForward.getTotalLength();
    } catch {
      totalLength = 2 * (width + height);
    }
    el.style.setProperty("--perimeter", `${Math.max(totalLength, 1)}px`);

    metrics = { bounds, x0, y0, x1, y1, width, height, radius: r };
  };

  const lineCircleHits = (p0, p1, cx, cy, r, type) => {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const fx = p0.x - cx;
    const fy = p0.y - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a === 0) {
      return [];
    }
    const sqrt = Math.sqrt(disc);
    return [(-b - sqrt) / (2 * a), (-b + sqrt) / (2 * a)]
      .map((t) => {
        if (t < 0 || t > 1) {
          return null;
        }
        const x = p0.x + t * dx;
        const y = p0.y + t * dy;
        if (type === "tl" && (x > cx || y > cy)) return null;
        if (type === "tr" && (x < cx || y > cy)) return null;
        if (type === "br" && (x < cx || y < cy)) return null;
        if (type === "bl" && (x > cx || y < cy)) return null;
        return { t, x, y, type };
      })
      .filter(Boolean);
  };

  const intersectBorder = (p0, p1, preferLast = false) => {
    if (!metrics) {
      return null;
    }
    const { x0, y0, x1, y1, radius: r } = metrics;
    const hits = [];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const addHit = (t, x, y, type) => {
      if (t >= 0 && t <= 1) {
        hits.push({ t, x, y, type });
      }
    };

    if (dy !== 0) {
      const tTop = (y0 - p0.y) / dy;
      const xTop = p0.x + tTop * dx;
      if (xTop >= x0 + r && xTop <= x1 - r) addHit(tTop, xTop, y0, "top");

      const tBottom = (y1 - p0.y) / dy;
      const xBottom = p0.x + tBottom * dx;
      if (xBottom >= x0 + r && xBottom <= x1 - r) addHit(tBottom, xBottom, y1, "bottom");
    }

    if (dx !== 0) {
      const tRight = (x1 - p0.x) / dx;
      const yRight = p0.y + tRight * dy;
      if (yRight >= y0 + r && yRight <= y1 - r) addHit(tRight, x1, yRight, "right");

      const tLeft = (x0 - p0.x) / dx;
      const yLeft = p0.y + tLeft * dy;
      if (yLeft >= y0 + r && yLeft <= y1 - r) addHit(tLeft, x0, yLeft, "left");
    }

    if (r > 0) {
      hits.push(
        ...lineCircleHits(p0, p1, x0 + r, y0 + r, r, "tl"),
        ...lineCircleHits(p0, p1, x1 - r, y0 + r, r, "tr"),
        ...lineCircleHits(p0, p1, x1 - r, y1 - r, r, "br"),
        ...lineCircleHits(p0, p1, x0 + r, y1 - r, r, "bl"),
      );
    }

    if (!hits.length) {
      return null;
    }
    hits.sort((a, b) => a.t - b.t);
    return preferLast ? hits[hits.length - 1] : hits[0];
  };

  const lengthFromHit = (hit) => {
    if (!metrics || !hit) {
      return 0;
    }
    const { x0, y0, x1, y1, width, height, radius: r } = metrics;
    const topLen = Math.max(width - 2 * r, 0);
    const sideLen = Math.max(height - 2 * r, 0);
    const arcLen = r * (Math.PI / 2);

    const cxTL = x0 + r;
    const cyTL = y0 + r;
    const cxTR = x1 - r;
    const cyTR = y0 + r;
    const cxBR = x1 - r;
    const cyBR = y1 - r;
    const cxBL = x0 + r;
    const cyBL = y1 - r;

    switch (hit.type) {
      case "top":
        return hit.x - (x0 + r);
      case "tr": {
        const angle = Math.atan2(hit.y - cyTR, hit.x - cxTR);
        const t = (angle + Math.PI / 2) / (Math.PI / 2);
        return topLen + arcLen * t;
      }
      case "right":
        return topLen + arcLen + (hit.y - (y0 + r));
      case "br": {
        const angle = Math.atan2(hit.y - cyBR, hit.x - cxBR);
        const t = angle / (Math.PI / 2);
        return topLen + arcLen + sideLen + arcLen * t;
      }
      case "bottom":
        return topLen + arcLen + sideLen + arcLen + ((x1 - r) - hit.x);
      case "bl": {
        const angle = Math.atan2(hit.y - cyBL, hit.x - cxBL);
        const t = (angle - Math.PI / 2) / (Math.PI / 2);
        return topLen + arcLen + sideLen + arcLen + topLen + arcLen * t;
      }
      case "left":
        return topLen + arcLen + sideLen + arcLen + topLen + arcLen + ((y1 - r) - hit.y);
      case "tl": {
        let angle = Math.atan2(hit.y - cyTL, hit.x - cxTL);
        if (angle < 0) {
          angle += Math.PI * 2;
        }
        const t = (angle - Math.PI) / (Math.PI / 2);
        return topLen + arcLen + sideLen + arcLen + topLen + arcLen + sideLen + arcLen * t;
      }
      default:
        return 0;
    }
  };

  const findClosestLength = (x, y) => {
    if (!totalLength || typeof pathForward.getPointAtLength !== "function") {
      return 0;
    }
    const samples = 220;
    let bestLen = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= samples; i++) {
      const len = (i / samples) * totalLength;
      const pt = pathForward.getPointAtLength(len);
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestLen = len;
      }
    }
    return bestLen;
  };

  const getPrevPoint = (event, ...fallbacks) => {
    if (
      typeof event.movementX === "number" &&
      typeof event.movementY === "number" &&
      (event.movementX !== 0 || event.movementY !== 0)
    ) {
      return { x: event.clientX - event.movementX, y: event.clientY - event.movementY };
    }
    for (const fb of fallbacks) {
      if (fb) {
        return fb;
      }
    }
    return { x: event.clientX, y: event.clientY };
  };

  const setStartFromLine = (from, to, preferLast = false) => {
    if (!metrics || !from || !to) {
      return;
    }
    const p0 = { x: from.x - metrics.bounds.left, y: from.y - metrics.bounds.top };
    const p1 = { x: to.x - metrics.bounds.left, y: to.y - metrics.bounds.top };
    const hit = intersectBorder(p0, p1, preferLast);
    const length = hit ? lengthFromHit(hit) : findClosestLength(p1.x, p1.y);
    el.style.setProperty("--start", `${Math.max(length, 0)}px`);
  };

  updateGeometry();
  el.style.setProperty("--draw", "0px");
  el.addEventListener("pointerenter", (event) => {
    updateGeometry();
    el.dataset.hovering = "1";
    const prevPoint = getPrevPoint(event, prevPointer, lastPointer);
    setStartFromLine(prevPoint, { x: event.clientX, y: event.clientY }, false);
    lastInside = { x: event.clientX, y: event.clientY };
    requestAnimationFrame(() => {
      if (el.dataset.hovering === "1") {
        el.classList.add("hover-border-active");
        animateDraw(getTargetDraw(), { duration: 520, easing: "easeOutCubic" });
      }
    });
  });
  el.addEventListener("pointermove", (event) => {
    lastInside = { x: event.clientX, y: event.clientY };
  });
  el.addEventListener("pointerleave", (event) => {
    delete el.dataset.hovering;
    updateGeometry();
    const prevPoint = getPrevPoint(event, prevPointer, lastInside, lastPointer);
    setStartFromLine(prevPoint, { x: event.clientX, y: event.clientY }, true);
    lastInside = null;
    requestAnimationFrame(() => {
      animateDraw(0, {
        duration: 460,
        easing: "easeInCubic",
        complete: () => {
          if (!el.dataset.hovering) {
            el.classList.remove("hover-border-active");
          }
        },
      });
    });
  });
  window.addEventListener("resize", updateGeometry);
};

const initHoverBorders = () => {
  hoverBorderTargets.forEach(ensureHoverBorder);
};

const initScrollReveal = () => {
  const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!revealTargets.length) {
    return;
  }
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
  );

  revealTargets.forEach((el) => observer.observe(el));
};

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(initHoverBorders, { timeout: 1200 });
} else {
  setTimeout(initHoverBorders, 0);
}

initScrollReveal();
})();
