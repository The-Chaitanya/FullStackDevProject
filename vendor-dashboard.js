(() => {
  const api = window.messDataApi;
  if (!api) return;
  const ROLE_STORAGE_KEY = "messplans_role";
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, "vendor");
  } catch (_) {
    // Ignore storage errors.
  }

  const form = document.getElementById("vendorMenuForm");
  const formMessage = document.getElementById("formMessage");
  const cardsWrap = document.getElementById("vendorCards");
  const storageMode = document.getElementById("storageMode");
  const refreshBtn = document.getElementById("refreshBtn");
  const resetBtn = document.getElementById("resetBtn");
  const submitBtn = document.getElementById("submitBtn");
  const formTitle = document.getElementById("formTitle");
  const logoutBtn = document.getElementById("logoutBtn");

  const fields = {
    menuId: document.getElementById("menuId"),
    messName: document.getElementById("messName"),
    tier: document.getElementById("tier"),
    menuDate: document.getElementById("menuDate"),
    price: document.getElementById("price"),
    rating: document.getElementById("rating"),
    timings: document.getElementById("timings"),
    crowd: document.getElementById("crowd"),
    distance: document.getElementById("distance"),
    menuItems: document.getElementById("menuItems"),
    special: document.getElementById("special"),
    vegetarianOnly: document.getElementById("vegetarianOnly"),
  };

  let currentUser = null;

  const setMessage = (text, type = "") => {
    formMessage.textContent = text;
    formMessage.className = "message";
    if (type) formMessage.classList.add(type);
  };

  const setStorageMode = (mode) => {
    storageMode.textContent = `Storage: ${mode === "cloud" ? "Supabase" : "Local fallback"}`;
  };

  const resetForm = () => {
    form.reset();
    fields.menuId.value = "";
    fields.menuDate.value = api.toIsoDay(new Date());
    fields.rating.value = "4.5";
    fields.tier.value = "UNLIMITED";
    formTitle.textContent = "Create Daily Menu Card";
    submitBtn.textContent = "Save Menu Card";
    setMessage("");
  };

  const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

  const createCard = (menu) => {
    const card = document.createElement("article");
    card.className = "vendor-card";
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
      <p class="row"><strong>Crowd:</strong> ${menu.crowd} | <strong>Distance:</strong> ${menu.distance}</p>
      <div class="card-actions">
        <button type="button" data-action="edit" data-id="${menu.id}" class="ghost-btn">Edit</button>
        <button type="button" data-action="delete" data-id="${menu.id}" class="danger-btn">Delete</button>
      </div>
    `;
    return card;
  };

  const fillForm = (menu) => {
    fields.menuId.value = menu.id;
    fields.messName.value = menu.mess_name;
    fields.tier.value = menu.tier;
    fields.menuDate.value = menu.menu_date;
    fields.price.value = menu.price;
    fields.rating.value = menu.rating;
    fields.timings.value = menu.timings;
    fields.crowd.value = menu.crowd;
    fields.distance.value = menu.distance;
    fields.menuItems.value = menu.menu_items.join("\n");
    fields.special.value = menu.special;
    fields.vegetarianOnly.checked = Boolean(menu.vegetarian_only);
    formTitle.textContent = "Edit Daily Menu Card";
    submitBtn.textContent = "Update Menu Card";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const readForm = () => ({
    id: fields.menuId.value || undefined,
    mess_name: fields.messName.value.trim(),
    tier: fields.tier.value,
    menu_date: fields.menuDate.value,
    price: Number(fields.price.value || 0),
    rating: Number(fields.rating.value || 0),
    timings: fields.timings.value.trim(),
    crowd: fields.crowd.value.trim(),
    distance: fields.distance.value.trim(),
    menu_items: fields.menuItems.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    special: fields.special.value.trim(),
    vegetarian_only: fields.vegetarianOnly.checked,
  });

  const validate = (payload) => {
    if (!payload.mess_name) return "Mess name is required.";
    if (!payload.menu_date) return "Menu date is required.";
    if (!payload.menu_items.length) return "Add at least one menu item.";
    if (payload.price <= 0) return "Price must be greater than 0.";
    if (payload.rating < 1 || payload.rating > 5) return "Rating must be between 1 and 5.";
    return "";
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
      setMessage("Menu card saved successfully.", "success");
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
      if (window.supabase && typeof window.supabase.createClient === "function") {
        const client = window.supabase.createClient(
          "https://pdhqcqjyhkptoxlbkiif.supabase.co",
          "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w",
        );
        await client.auth.signOut();
      }
      window.location.href = "login.html";
    });
  }

  const init = async () => {
    currentUser = await api.getCurrentUser();
    fields.menuDate.value = api.toIsoDay(new Date());
    await loadCards();
  };

  init();
})();

