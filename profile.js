(() => {
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const ROLE_STORAGE_KEY = "messplans_role";

  const client =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

  const emailEl = document.getElementById("email");
  const nameEl = document.getElementById("fullName");
  const avatarEl = document.getElementById("avatar");
  const roleEl = document.getElementById("roleValue");
  const statusEl = document.getElementById("status");
  const lastSignInEl = document.getElementById("lastSignIn");
  const logoutBtn = document.getElementById("logoutBtn");

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

  const setGuest = () => {
    emailEl.textContent = "Not signed in";
    nameEl.textContent = "Student";
    avatarEl.textContent = "S";
    if (roleEl) roleEl.textContent = "Guest";
    statusEl.textContent = "Guest";
    lastSignInEl.textContent = "-";
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

    const rawName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split("@")[0] ||
      "Student";

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

  loadUser();
})();
