(() => {
  const api = window.messDataApi;
  if (!api) return;
  const ROLE_STORAGE_KEY = "messplans_role";
  const MESS_NAME_KEY_PREFIX = "messplans_vendor_mess_name_";
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const normalizeRole = (value) => (String(value || "").toLowerCase() === "vendor" ? "vendor" : "student");

  const form = document.getElementById("vendorMenuForm");
  const formMessage = document.getElementById("formMessage");
  const cardsWrap = document.getElementById("vendorCards");
  const storageMode = document.getElementById("storageMode");
  const refreshBtn = document.getElementById("refreshBtn");
  const resetBtn = document.getElementById("resetBtn");
  const submitBtn = document.getElementById("submitBtn");
  const formTitle = document.getElementById("formTitle");
  const logoutBtn = document.getElementById("logoutBtn");
  const messSetup = document.getElementById("messSetup");
  const messPropertyName = document.getElementById("messPropertyName");
  const messSetupMessage = document.getElementById("messSetupMessage");
  const saveMessNameBtn = document.getElementById("saveMessNameBtn");
  const messIdentity = document.getElementById("messIdentity");

  const fields = {
    menuId: document.getElementById("menuId"),
    tier: document.getElementById("tier"),
    menuDate: document.getElementById("menuDate"),
    price: document.getElementById("price"),
    rating: document.getElementById("rating"),
    timings: document.getElementById("timings"),
    crowd: document.getElementById("crowd"),
    distance: document.getElementById("distance"),
    messCoords: document.getElementById("messCoords"),
    menuItems: document.getElementById("menuItems"),
    special: document.getElementById("special"),
    vegetarianOnly: document.getElementById("vegetarianOnly"),
  };

  const parseGeoMeta = (rawDistance) => {
    const value = String(rawDistance || "").trim();
    const match = value.match(/\s*\[geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*$/i);
    if (!match) return { display: value, lat: null, lng: null };
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    const display = value.replace(match[0], "").trim();
    return {
      display,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  };

  const parseCoordsInput = (raw) => {
    const parts = String(raw || "")
      .split(",")
      .map((value) => Number(value.trim()));
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    const [lat, lng] = parts;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const withGeoMeta = (distance, coordsRaw) => {
    const cleanDistance = String(distance || "").trim();
    const coords = parseCoordsInput(coordsRaw);
    if (!coords) return cleanDistance;
    return `${cleanDistance} [geo:${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}]`;
  };

  let currentUser = null;
  let vendorMenusAll = [];
  let lockedMessName = "";

  const authClient =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

  const ensureVendorRole = async () => {
    const hintedRole = normalizeRole(
      new URLSearchParams(window.location.search).get("role") ||
        (() => {
          try {
            return window.localStorage.getItem(ROLE_STORAGE_KEY);
          } catch {
            return "vendor";
          }
        })(),
    );

    let accountRole = "";
    if (authClient) {
      const { data } = await authClient.auth.getUser();
      accountRole = data?.user?.user_metadata?.role ? normalizeRole(data.user.user_metadata.role) : "";
    }

    const effectiveRole = accountRole || hintedRole;
    if (effectiveRole !== "vendor") {
      window.location.href = "student-dashboard.html?role=student";
      return false;
    }

    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, "vendor");
    } catch {
      // Ignore storage errors.
    }

    return true;
  };

  const getMessStorageKey = () => `${MESS_NAME_KEY_PREFIX}${currentUser?.id || "anonymous"}`;
  const readPersistedMessName = () => {
    try {
      return String(window.localStorage.getItem(getMessStorageKey()) || "").trim();
    } catch {
      return "";
    }
  };
  const persistMessName = (name) => {
    try {
      window.localStorage.setItem(getMessStorageKey(), String(name || "").trim());
    } catch {
      // Ignore storage errors.
    }
  };

  const setMessage = (text, type = "") => {
    formMessage.textContent = text;
    formMessage.className = "message";
    if (type) formMessage.classList.add(type);
  };

  const setSetupMessage = (text, type = "") => {
    if (!messSetupMessage) return;
    messSetupMessage.textContent = text;
    messSetupMessage.className = "message";
    if (type) messSetupMessage.classList.add(type);
  };

  const setStorageMode = (mode) => {
    storageMode.textContent = `Storage: ${mode === "cloud" ? "Supabase" : "Local fallback"}`;
  };

  const setMessLock = () => {
    const isLocked = Boolean(lockedMessName);
    if (messSetup) {
      messSetup.style.display = isLocked ? "none" : "block";
    }
    if (messIdentity) {
      messIdentity.textContent = isLocked
        ? `Mess: ${lockedMessName} (fixed for this vendor account)`
        : "Set your mess name first, then publish daily menus.";
    }
    submitBtn.disabled = !isLocked;
  };

  const resetForm = () => {
    form.reset();
    fields.menuId.value = "";
    fields.menuDate.value = api.toIsoDay(new Date());
    fields.rating.value = "4.5";
    fields.tier.value = "UNLIMITED";
    if (fields.messCoords) fields.messCoords.value = "";
    formTitle.textContent = "Create Daily Menu Card";
    submitBtn.textContent = "Save Menu Card";
    setMessage("");
  };

  const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

  const createCard = (menu) => {
    const card = document.createElement("article");
    card.className = "vendor-card";
    const parsedGeo = parseGeoMeta(menu.distance);
    card.innerHTML = `
      <h3>${menu.mess_name}</h3>
      <div class="vendor-meta">
        <span>${menu.tier}</span>
        <span>${menu.menu_date}</span>
        <span>${formatPrice(menu.price)}</span>
        <span>Rating ${Number(menu.rating).toFixed(1)}</span>
      </div>
      <ul class="vendor-menu">
        ${menu.menu_items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <p class="row"><strong>Special:</strong> ${menu.special}</p>
      <p class="row"><strong>Timings:</strong> ${menu.timings}</p>
      <p class="row"><strong>Crowd:</strong> ${menu.crowd} | <strong>Distance:</strong> ${parsedGeo.display}</p>
      <div class="card-actions">
        <button type="button" data-action="edit" data-id="${menu.id}" class="ghost-btn">Edit</button>
        <button type="button" data-action="delete" data-id="${menu.id}" class="danger-btn">Delete</button>
      </div>
    `;
    return card;
  };

  const fillForm = (menu) => {
    const parsedGeo = parseGeoMeta(menu.distance);
    fields.menuId.value = menu.id;
    fields.tier.value = menu.tier;
    fields.menuDate.value = menu.menu_date;
    fields.price.value = menu.price;
    fields.rating.value = menu.rating;
    fields.timings.value = menu.timings;
    fields.crowd.value = menu.crowd;
    fields.distance.value = parsedGeo.display;
    fields.messCoords.value =
      parsedGeo.lat !== null && parsedGeo.lng !== null ? `${parsedGeo.lat},${parsedGeo.lng}` : "";
    fields.menuItems.value = menu.menu_items.join("\n");
    fields.special.value = menu.special;
    fields.vegetarianOnly.checked = Boolean(menu.vegetarian_only);
    formTitle.textContent = "Edit Daily Menu Card";
    submitBtn.textContent = "Update Menu Card";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const readForm = () => ({
    id: fields.menuId.value || undefined,
    mess_name: lockedMessName,
    tier: fields.tier.value,
    menu_date: fields.menuDate.value,
    price: Number(fields.price.value || 0),
    rating: Number(fields.rating.value || 0),
    timings: fields.timings.value.trim(),
    crowd: fields.crowd.value.trim(),
    distance: withGeoMeta(fields.distance.value.trim(), fields.messCoords.value.trim()),
    menu_items: fields.menuItems.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    special: fields.special.value.trim(),
    vegetarian_only: fields.vegetarianOnly.checked,
  });

  const validate = (payload) => {
    if (!payload.mess_name) return "Set your mess name first.";
    if (!payload.menu_date) return "Menu date is required.";
    if (!payload.menu_items.length) return "Add at least one menu item.";
    if (payload.price <= 0) return "Price must be greater than 0.";
    if (payload.rating < 1 || payload.rating > 5) return "Rating must be between 1 and 5.";
    if (fields.messCoords?.value.trim() && !parseCoordsInput(fields.messCoords.value.trim())) {
      return "Coordinates must be in format: lat,lng";
    }
    return "";
  };

  const refreshVendorMenusAll = async () => {
    const { rows, mode } = await api.listVendorMenus({ ownerId: currentUser?.id });
    vendorMenusAll = rows;
    setStorageMode(mode);
    lockedMessName =
      vendorMenusAll[0]?.mess_name ||
      String(currentUser?.user_metadata?.mess_name || "").trim() ||
      readPersistedMessName();
    if (lockedMessName) {
      persistMessName(lockedMessName);
    }
    setMessLock();
  };

  const loadCards = async () => {
    const date = fields.menuDate.value || api.toIsoDay(new Date());
    const { rows, mode } = await api.listVendorMenus({ ownerId: currentUser?.id, date });
    setStorageMode(mode);
    cardsWrap.innerHTML = "";

    if (!rows.length) {
      cardsWrap.innerHTML = `<p class="muted">No cards for ${date}. Create one from the form.</p>`;
      return;
    }

    rows.forEach((menu) => cardsWrap.appendChild(createCard(menu)));
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = readForm();

    const existingForDay = vendorMenusAll.find((menu) => menu.menu_date === payload.menu_date);
    if (existingForDay && !payload.id) {
      payload.id = existingForDay.id;
    }

    const problem = validate(payload);
    if (problem) {
      setMessage(problem, "error");
      return;
    }

    submitBtn.disabled = true;
    setMessage("Saving menu card...");

    try {
      const { mode } = await api.upsertMenu(payload, currentUser?.id || "");
      setStorageMode(mode);
      setMessage(existingForDay ? "Daily menu updated successfully." : "Menu card saved successfully.", "success");
      await refreshVendorMenusAll();
      await loadCards();
      resetForm();
    } catch (error) {
      setMessage(error.message || "Could not save menu card.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  cardsWrap.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!id) return;

    if (action === "delete") {
      const ok = window.confirm("Delete this menu card?");
      if (!ok) return;
      await api.deleteMenu(id, currentUser?.id || "");
      await refreshVendorMenusAll();
      await loadCards();
      setMessage("Menu card deleted.", "success");
      return;
    }

    if (action === "edit") {
      const { rows } = await api.listVendorMenus({ ownerId: currentUser?.id, date: fields.menuDate.value });
      const row = rows.find((item) => item.id === id);
      if (!row) return;
      fillForm(row);
      setMessage("Editing selected card.");
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadCards());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetForm);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (authClient) {
        await authClient.auth.signOut();
      }
      window.location.href = "login.html";
    });
  }

  if (saveMessNameBtn) {
    saveMessNameBtn.addEventListener("click", async () => {
      const value = String(messPropertyName?.value || "").trim();
      if (!value) {
        setSetupMessage("Enter a mess name.", "error");
        return;
      }
      lockedMessName = value;
      persistMessName(lockedMessName);
      if (authClient) {
        await authClient.auth.updateUser({ data: { mess_name: lockedMessName } });
      }
      setMessLock();
      setSetupMessage("");
      setMessage("Mess name saved. You can now update daily menu.", "success");
    });
  }

  const init = async () => {
    const allowed = await ensureVendorRole();
    if (!allowed) return;
    currentUser = await api.getCurrentUser();
    fields.menuDate.value = api.toIsoDay(new Date());
    await refreshVendorMenusAll();
    if (lockedMessName) {
      setMessage(`Mess locked as "${lockedMessName}". You can update daily menu only.`, "success");
    }
    await loadCards();
  };

  init();
})();
