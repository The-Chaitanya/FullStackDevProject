(() => {
  const PAGE_TRANSITION_MS = 320;
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const ROLE_STORAGE_KEY = "messplans_role";

  const revealPage = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add("page-loaded");
      });
    });
  };

  if (document.body.classList.contains("page")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", revealPage);
    } else {
      revealPage();
    }
  }

  const client =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

  const getDashboardRoute = (role) =>
    normalizeRole(role) === "vendor" ? "vendor-dashboard.html?role=vendor" : "student-dashboard.html?role=student";

  const warmDashboardRoute = (role) => {
    // Fire-and-forget warmup so dashboard assets start loading during fade-out.
    try {
      const normalizedRole = normalizeRole(role);
      const htmlPath =
        normalizedRole === "vendor" ? "vendor-dashboard.html" : "student-dashboard.html";
      const assetPaths =
        normalizedRole === "vendor"
          ? ["vendor-dashboard.css", "menu-data.js", "vendor-dashboard.js", "assets/vendor-image.png"]
          : ["style.css", "menu-data.js", "student-dashboard.js", "assets/food-thali.webp", "assets/food-burger.webp"];
      fetch(htmlPath, { cache: "force-cache" }).catch(() => {});
      assetPaths.forEach((path) => fetch(path, { cache: "force-cache" }).catch(() => {}));
    } catch {
      // Ignore warmup errors.
    }
  };

  const emailEl = document.getElementById("email");
  const nameEl = document.getElementById("fullName");
  const avatarEl = document.getElementById("avatar");
  const roleEl = document.getElementById("roleValue");
  const statusEl = document.getElementById("status");
  const lastSignInEl = document.getElementById("lastSignIn");
  const logoutBtn = document.getElementById("logoutBtn");
  const backLinkEl = document.getElementById("backToDashboardLink");
  const pageTitleEl = document.getElementById("profilePageTitle");

  // Safety guard: avoid runtime errors if script loads on a different page.
  if (!emailEl || !nameEl || !avatarEl || !statusEl || !lastSignInEl) {
    return;
  }

  const normalizeRole = (value) => {
    const role = String(value || "").toLowerCase();
    return role === "vendor" ? "vendor" : "student";
  };

  const readRoleHint = () => {
    const queryRole = new URLSearchParams(window.location.search).get("role");
    if (queryRole) return normalizeRole(queryRole);
    try {
      return normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
    } catch {
      return "student";
    }
  };

  const persistRole = (role) => {
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, normalizeRole(role));
    } catch {
      // Ignore storage errors.
    }
  };

  const applyRoleUi = (role) => {
    const normalizedRole = normalizeRole(role);
    if (backLinkEl) {
      backLinkEl.href = getDashboardRoute(normalizedRole);
    }
    if (pageTitleEl) {
      pageTitleEl.textContent = `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} Profile`;
    }
    document.title =
      normalizedRole === "vendor" ? "Vendor Profile | MessBuddy" : "Student Profile | MessBuddy";
  };

  const setGuest = () => {
    emailEl.textContent = "Not signed in";
    nameEl.textContent = "Student";
    avatarEl.textContent = "S";
    if (roleEl) roleEl.textContent = "Guest";
    statusEl.textContent = "Guest";
    lastSignInEl.textContent = "-";
    applyRoleUi("student");
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const loadUser = async () => {
    if (!client) {
      setGuest();
      return;
    }

    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) {
      setGuest();
      return;
    }

    const user = data.user;
    const email = user.email || "No email";
    const role = normalizeRole(user.user_metadata?.role || readRoleHint());
    persistRole(role);
    applyRoleUi(role);

    const rawName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split("@")[0] ||
      (role === "vendor" ? "Vendor" : "Student");

    nameEl.textContent = rawName;
    emailEl.textContent = email;
    avatarEl.textContent = rawName.charAt(0).toUpperCase();
    if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    statusEl.textContent = "Active";
    lastSignInEl.textContent = formatDate(user.last_sign_in_at);
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (client) {
        await client.auth.signOut();
      }
      try {
        window.localStorage.removeItem(ROLE_STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }
      window.location.href = "login.html";
    });
  }

  document.querySelectorAll("a[data-transition]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;
      event.preventDefault();
      if (href.includes("student-dashboard.html") || href.includes("vendor-dashboard.html")) {
        warmDashboardRoute(readRoleHint());
      }
      document.body.classList.add("page-fade-out");
      window.setTimeout(() => {
        window.location.href = href;
      }, PAGE_TRANSITION_MS);
    });
  });

  applyRoleUi(readRoleHint());
  loadUser();
})();
