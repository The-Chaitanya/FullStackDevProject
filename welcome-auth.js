(() => {
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const ROLE_STORAGE_KEY = "messplans_role";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    return;
  }

  const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const normalizeRole = (value) => (String(value || "").toLowerCase() === "vendor" ? "vendor" : "student");
  const getRedirectForRole = (role) =>
    normalizeRole(role) === "vendor" ? "vendor-dashboard.html?role=vendor" : "student-dashboard.html?role=student";

  const readStoredRole = () => {
    try {
      return normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
    } catch (_) {
      return "student";
    }
  };

  const resolveRoleFromUser = (user, fallbackRole = "") => {
    const roleRaw = user?.user_metadata?.role;
    const hasVendorMess = Boolean(String(user?.user_metadata?.mess_name || "").trim());
    if (roleRaw) return normalizeRole(roleRaw);
    if (hasVendorMess) return "vendor";
    if (fallbackRole) return normalizeRole(fallbackRole);
    return "";
  };

  const redirectIfLoggedIn = (user) => {
    if (!user) return;
    const queryRole = new URLSearchParams(window.location.search).get("role") || "";
    const role = resolveRoleFromUser(user, queryRole || readStoredRole());
    if (!role) return;
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch (_) {
      // Ignore storage errors.
    }
    window.location.replace(getRedirectForRole(role));
  };

  authClient.auth.getUser().then(({ data }) => {
    redirectIfLoggedIn(data?.user);
  });

  authClient.auth.onAuthStateChange((_event, session) => {
    redirectIfLoggedIn(session?.user);
  });
})();
