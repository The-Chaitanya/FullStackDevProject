(() => {
const vendor = document.getElementById("vendorCard");
const student = document.getElementById("studentCard");
const buttons = document.querySelectorAll(".ghost-btn");
const container = document.querySelector(".container");
const oauthPop = document.querySelector(".oauth-pop");
const ropeLayer = document.querySelector(".rope-layer");
let activeCard = null;
let ropeAnchorCard = null;
let ropeTargetCard = null;
let followRaf = null;
let visibilityAnim = null;
let popAnim = null;
let showTimer = null;
let frontTimer = null;
let ropeRaf = null;
let ropeVelLength = 0;
let ropeVelAngle = 0;
const vendorForm = document.getElementById("vendorForm");
const studentForm = document.getElementById("studentForm");
const oauthBtn = oauthPop ? oauthPop.querySelector(".oauth-btn") : null;

const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
const REDIRECT_URL = "https://full-stack-dev-project.vercel.app/index.html";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const formState = new WeakMap();

const getFormState = (form) => {
  if (!form) return null;
  if (!formState.has(form)) {
    const submit = form.querySelector('button[type="submit"]');
    formState.set(form, {
      label: submit ? submit.textContent : "Login",
      busy: false,
    });
  }
  return formState.get(form);
};

const getFormMessage = (form) => {
  if (!form) return null;
  let message = form.querySelector(".form-message");
  if (!message) {
    message = document.createElement("p");
    message.className = "form-message";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    form.appendChild(message);
  }
  return message;
};

const setFormMessage = (form, text = "", type = "") => {
  const message = getFormMessage(form);
  if (!message) return;
  message.textContent = text;
  message.classList.remove("error", "success", "info");
  if (type) {
    message.classList.add(type);
  }
};

const setFormBusy = (form, busy) => {
  const state = getFormState(form);
  if (!state) return;
  const submit = form.querySelector('button[type="submit"]');
  state.busy = busy;
  if (!submit) return;
  if (busy) {
    submit.disabled = true;
    submit.textContent = "Signing in...";
  } else {
    submit.disabled = false;
    submit.textContent = state.label;
  }
};

const getActiveForm = () => {
  const card = activeCard || document.querySelector(".login-card.active");
  if (card) {
    return card.querySelector("form");
  }
  return vendorForm || studentForm;
};

const handlePasswordLogin = async (form) => {
  if (!form) return;
  if (!supabaseClient) {
    setFormMessage(form, "Supabase client not available. Check the CDN link.", "error");
    return;
  }
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    setFormMessage(form, "Enter both email and password.", "error");
    return;
  }

  setFormBusy(form, true);
  setFormMessage(form, "Signing in...", "info");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setFormMessage(form, error.message || "Login failed.", "error");
      setFormBusy(form, false);
      return;
    }
    if (data?.session) {
      setFormMessage(form, "Signed in. Redirecting...", "success");
      window.location.href = REDIRECT_URL;
    } else {
      setFormMessage(form, "Check your email to confirm sign-in.", "info");
      setFormBusy(form, false);
    }
  } catch (err) {
    setFormMessage(form, "Login failed. Try again.", "error");
    setFormBusy(form, false);
  }
};

const handleGoogleLogin = async () => {
  if (!supabaseClient) {
    const form = getActiveForm();
    setFormMessage(form, "Supabase client not available. Check the CDN link.", "error");
    return;
  }
  if (oauthBtn) {
    oauthBtn.disabled = true;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URL,
    },
  });
  if (error) {
    if (oauthBtn) {
      oauthBtn.disabled = false;
    }
    const form = getActiveForm();
    setFormMessage(form, error.message || "Google sign-in failed.", "error");
  }
};

const bindForm = (form) => {
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handlePasswordLogin(form);
  });
  form.addEventListener("input", () => {
    const state = getFormState(form);
    if (!state || !state.busy) {
      setFormMessage(form, "");
    }
  });
};

const popState = {
  x: 0,
  y: 0,
  opacity: 0,
  scale: 0.94,
  blur: 0,
  ropeLength: 0,
  ropeAngle: 0,
  ropeOpacity: 1,
  ropeBlur: 0.5,
  ropeScale: 1.1,
};

const popTarget = {
  x: 0,
  y: 0,
  ropeLength: 0,
  ropeAngle: 0,
};

const applyPopState = () => {
  if (!oauthPop) return;
  oauthPop.style.setProperty("--pop-x", `${popState.x}px`);
  oauthPop.style.setProperty("--pop-y", `${popState.y}px`);
  oauthPop.style.setProperty("--pop-scale", `${popState.scale}`);
  oauthPop.style.setProperty("--pop-opacity", `${popState.opacity}`);
  oauthPop.style.setProperty("--pop-blur", `${popState.blur}px`);
  if (ropeLayer) {
    const popSize = getPopSize();
    ropeLayer.style.setProperty("--rope-length", `${popState.ropeLength}px`);
    ropeLayer.style.setProperty("--rope-rotate", `${popState.ropeAngle}deg`);
    ropeLayer.style.setProperty("--rope-opacity", `${popState.ropeOpacity}`);
    ropeLayer.style.setProperty("--rope-blur", `${popState.ropeBlur}px`);
    ropeLayer.style.setProperty("--rope-scale", `${popState.ropeScale}`);
    const anchor = getRopeAnchor(popSize);
    ropeLayer.style.setProperty("--rope-x", `${anchor.x}px`);
    ropeLayer.style.setProperty("--rope-y", `${anchor.y}px`);
  }
};

const getPopSize = () => {
  const btn = oauthPop ? oauthPop.querySelector(".oauth-btn") : null;
  const width = btn ? btn.offsetWidth : oauthPop?.offsetWidth || 160;
  const height = btn ? btn.offsetHeight : oauthPop?.offsetHeight || 30;
  return { width, height };
};

const computeTargets = (selectedCard) => {
  if (!selectedCard || !oauthPop || !container) return null;
  const targetCard = selectedCard === vendor ? student : vendor;
  if (!targetCard) return null;

  const containerRect = container.getBoundingClientRect();
  const targetRect = targetCard.getBoundingClientRect();
  const popSize = getPopSize();

  const x = targetRect.left - containerRect.left + targetRect.width / 2 - popSize.width / 2;
  const y = targetRect.bottom - containerRect.top + 10;

  const fromRect = selectedCard.getBoundingClientRect();
  const fromCenter = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height / 2,
  };
  const popCenter = {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.bottom + 10 + popSize.height / 2,
  };
  const dx = fromCenter.x - popCenter.x;
  const dy = fromCenter.y - popCenter.y;
  const ropeLength = Math.min(Math.hypot(dx, dy), 320);
  const ropeAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return { x, y, ropeLength, ropeAngle };
};

const computeStartFromActive = (selectedCard) => {
  if (!selectedCard || !container || !oauthPop) return null;
  const containerRect = container.getBoundingClientRect();
  const activeRect = selectedCard.getBoundingClientRect();
  const popSize = getPopSize();
  const x =
    activeRect.left - containerRect.left + activeRect.width / 2 - popSize.width / 2;
  const y = activeRect.bottom - containerRect.top + 12;
  return { x, y };
};

const getRopeAnchor = (popSize = getPopSize()) => {
  if (!ropeAnchorCard || !container) {
    return { x: popState.x + popSize.width / 2, y: popState.y + popSize.height / 2 };
  }
  const containerRect = container.getBoundingClientRect();
  const anchorRect = ropeAnchorCard.getBoundingClientRect();
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const targetCenter = ropeTargetCard
    ? ropeTargetCard.getBoundingClientRect().left + ropeTargetCard.getBoundingClientRect().width / 2
    : anchorCenter;
  const edgeOffset = 8;
  const anchorX =
    targetCenter >= anchorCenter
      ? anchorRect.right - containerRect.left - edgeOffset
      : anchorRect.left - containerRect.left + edgeOffset;
  const anchorY = anchorRect.top - containerRect.top + anchorRect.height * 0.55;
  return { x: anchorX, y: anchorY };
};

const setPopState = (values = {}) => {
  if (typeof values.x === "number") popState.x = values.x;
  if (typeof values.y === "number") popState.y = values.y;
  if (typeof values.opacity === "number") popState.opacity = values.opacity;
  if (typeof values.scale === "number") popState.scale = values.scale;
  if (typeof values.blur === "number") popState.blur = values.blur;
  if (typeof values.ropeLength === "number") popState.ropeLength = values.ropeLength;
  if (typeof values.ropeAngle === "number") popState.ropeAngle = values.ropeAngle;
  if (typeof values.ropeOpacity === "number") popState.ropeOpacity = values.ropeOpacity;
  if (typeof values.ropeBlur === "number") popState.ropeBlur = values.ropeBlur;
  if (typeof values.ropeScale === "number") popState.ropeScale = values.ropeScale;
  applyPopState();
};

const stopPopAnim = () => {
  if (popAnim && typeof popAnim.pause === "function") {
    popAnim.pause();
  }
  popAnim = null;
  if (frontTimer) {
    clearTimeout(frontTimer);
    frontTimer = null;
  }
  if (visibilityAnim && typeof visibilityAnim.pause === "function") {
    visibilityAnim.pause();
  }
  visibilityAnim = null;
};

const stopRopePhysics = () => {
  if (ropeRaf) {
    cancelAnimationFrame(ropeRaf);
    ropeRaf = null;
  }
  ropeVelLength = 0;
  ropeVelAngle = 0;
};

const shortestAngleDiff = (from, to) => {
  let diff = ((to - from + 540) % 360) - 180;
  if (Number.isNaN(diff)) diff = 0;
  return diff;
};

const startRopePhysics = () => {
  if (!ropeLayer) return;
  if (ropeRaf) return;
  const stiffness = 0.12;
  const angleStiffness = 0.1;
  const damping = 0.62;
  const angleDamping = 0.6;
  const maxStretch = 0.4;
  const step = () => {
    if (!ropeAnchorCard || !container) {
      ropeRaf = requestAnimationFrame(step);
      return;
    }
    const popSize = getPopSize();
    const anchor = getRopeAnchor(popSize);
    const popCenter = {
      x: popState.x + popSize.width / 2,
      y: popState.y + popSize.height / 2,
    };
    const dx = popCenter.x - anchor.x;
    const dy = popCenter.y - anchor.y;
    const lengthTarget = Math.min(Math.hypot(dx, dy), 360);
    const angleTarget = (Math.atan2(dy, dx) * 180) / Math.PI;

    ropeVelLength += (lengthTarget - popState.ropeLength) * stiffness;
    ropeVelLength *= damping;
    popState.ropeLength += ropeVelLength;

    const angleDiff = shortestAngleDiff(popState.ropeAngle, angleTarget);
    ropeVelAngle += angleDiff * angleStiffness;
    ropeVelAngle *= angleDamping;
    popState.ropeAngle += ropeVelAngle;

    const speed = Math.abs(ropeVelLength) + Math.abs(ropeVelAngle);
    popState.ropeOpacity = 1;
    popState.ropeBlur = Math.max(0, 1.2 - speed * 0.03);
    popState.ropeScale = 1 + Math.min(maxStretch, Math.abs(ropeVelLength) * 0.015);

    applyPopState();

    const settled =
      Math.abs(lengthTarget - popState.ropeLength) < 0.5 &&
      Math.abs(angleDiff) < 0.5 &&
      speed < 0.05;
    if (!settled || activeCard) {
      ropeRaf = requestAnimationFrame(step);
    } else {
      ropeRaf = null;
    }
  };
  ropeRaf = requestAnimationFrame(step);
};

const startFollow = (selectedCard) => {
  if (!selectedCard) return;
  if (followRaf) cancelAnimationFrame(followRaf);
  const endTime = performance.now() + 650;
  const ease = 0.25;

  const tick = (now) => {
    const targets = computeTargets(selectedCard);
    if (targets) {
      popTarget.x = targets.x;
      popTarget.y = targets.y;
      popTarget.ropeLength = targets.ropeLength;
      popTarget.ropeAngle = targets.ropeAngle;

      popState.x += (popTarget.x - popState.x) * ease;
      popState.y += (popTarget.y - popState.y) * ease;
      applyPopState();
    }

    if (now < endTime) {
      followRaf = requestAnimationFrame(tick);
    } else {
      followRaf = null;
    }
  };

  followRaf = requestAnimationFrame(tick);
};

const animateVisibility = (show) => {
  if (!oauthPop) return;
  if (visibilityAnim && typeof visibilityAnim.pause === "function") {
    visibilityAnim.pause();
    visibilityAnim = null;
  }
  const from = { opacity: popState.opacity, scale: popState.scale };
  const toOpacity = show ? 1 : 0;
  const toScale = show ? 1 : 0.94;
  if (typeof anime === "function") {
    visibilityAnim = anime({
      targets: from,
      opacity: toOpacity,
      scale: toScale,
      duration: show ? 320 : 220,
      easing: show ? "easeOutCubic" : "easeInCubic",
      update: () => {
        popState.opacity = from.opacity;
        popState.scale = from.scale;
        applyPopState();
      },
      complete: () => {
        visibilityAnim = null;
      },
    });
  } else {
    popState.opacity = toOpacity;
    popState.scale = toScale;
    applyPopState();
  }
};

const showOauth = (selectedCard) => {
  if (!oauthPop) return;
  const targets = computeTargets(selectedCard);
  if (targets) {
    ropeAnchorCard = selectedCard;
    ropeTargetCard = selectedCard === vendor ? student : vendor;
    const start = computeStartFromActive(selectedCard) || targets;
    popTarget.x = targets.x;
    popTarget.y = targets.y;
    popTarget.ropeLength = targets.ropeLength;
    popTarget.ropeAngle = targets.ropeAngle;
    setPopState({
      x: start.x,
      y: start.y,
      opacity: 0,
      scale: 0.94,
      blur: 8,
      ropeLength: 0,
      ropeAngle: targets.ropeAngle,
      ropeOpacity: 1,
      ropeBlur: 0.5,
      ropeScale: 1.35,
    });
  }
  oauthPop.dataset.visible = "1";
  oauthPop.setAttribute("aria-hidden", "false");
  oauthPop.style.pointerEvents = "auto";

  oauthPop.classList.remove("pop-front");
  oauthPop.classList.add("pop-behind");
  stopRopePhysics();
  startRopePhysics();

  if (typeof anime === "function" && targets) {
    stopPopAnim();
    const animState = {
      x: popState.x,
      y: popState.y,
      opacity: popState.opacity,
      scale: popState.scale,
      blur: popState.blur,
    };
    const duration = 1100;
    const frontDelay = Math.round(duration * 0.6);
    frontTimer = setTimeout(() => {
      if (oauthPop) {
        oauthPop.classList.add("pop-front");
        oauthPop.classList.remove("pop-behind");
      }
    }, frontDelay);
    popAnim = anime({
      targets: animState,
      x: targets.x,
      y: targets.y,
      opacity: 1,
      scale: 1,
      blur: 0,
      duration,
      easing: "easeOutCubic",
      update: () => {
        setPopState(animState);
      },
      complete: () => {
        popAnim = null;
        if (oauthPop) {
          oauthPop.classList.add("pop-front");
          oauthPop.classList.remove("pop-behind");
        }
        startFollow(selectedCard);
      },
    });
  } else {
    setPopState({
      x: targets?.x ?? popState.x,
      y: targets?.y ?? popState.y,
      opacity: 1,
      scale: 1,
      blur: 0,
    });
    startFollow(selectedCard);
  }
};

const hideOauth = () => {
  if (!oauthPop) return;
  stopPopAnim();
  stopRopePhysics();
  ropeAnchorCard = null;
  ropeTargetCard = null;
  oauthPop.dataset.visible = "0";
  oauthPop.setAttribute("aria-hidden", "true");
  oauthPop.style.pointerEvents = "none";
  oauthPop.classList.remove("pop-front");
  oauthPop.classList.add("pop-behind");
  setPopState({
    opacity: 0,
    scale: 0.94,
    blur: 8,
    ropeLength: 0,
    ropeOpacity: 0,
    ropeBlur: 0.5,
    ropeScale: 1.35,
  });
};

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

bindForm(vendorForm);
bindForm(studentForm);

if (oauthBtn) {
  oauthBtn.addEventListener("click", (event) => {
    event.preventDefault();
    handleGoogleLogin();
  });
}

if (!supabaseClient) {
  setFormMessage(vendorForm, "Supabase is not initialized yet.", "error");
  setFormMessage(studentForm, "Supabase is not initialized yet.", "error");
  if (oauthBtn) {
    oauthBtn.disabled = true;
  }
}

buttons.forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const card = btn.closest(".login-card");
    if (card === vendor) {
      vendor.classList.add("active");
      student.classList.remove("active");
      activeCard = vendor;
      if (showTimer) clearTimeout(showTimer);
      hideOauth();
      showTimer = setTimeout(() => {
        showOauth(vendor);
      }, 480);
    } else if (card === student) {
      student.classList.add("active");
      vendor.classList.remove("active");
      activeCard = student;
      if (showTimer) clearTimeout(showTimer);
      hideOauth();
      showTimer = setTimeout(() => {
        showOauth(student);
      }, 480);
    }
  });
});

window.addEventListener("resize", () => {
  if (activeCard) {
    if (showTimer) clearTimeout(showTimer);
    showOauth(activeCard);
  }
});
})();

