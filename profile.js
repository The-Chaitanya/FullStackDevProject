(() => {
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";

  const client =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

  const emailEl = document.getElementById("email");
  const nameEl = document.getElementById("fullName");
  const avatarEl = document.getElementById("avatar");
  const statusEl = document.getElementById("status");
  const lastSignInEl = document.getElementById("lastSignIn");
  const logoutBtn = document.getElementById("logoutBtn");

  const setGuest = () => {
    emailEl.textContent = "Not signed in";
    nameEl.textContent = "Student";
    avatarEl.textContent = "S";
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
    const rawName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split("@")[0] ||
      "Student";

    nameEl.textContent = rawName;
    emailEl.textContent = email;
    avatarEl.textContent = rawName.charAt(0).toUpperCase();
    statusEl.textContent = "Active";
    lastSignInEl.textContent = formatDate(user.last_sign_in_at);
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (client) {
        await client.auth.signOut();
      }
      window.location.href = "login.html";
    });
  }

  loadUser();
})();
