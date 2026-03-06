(() => {
  const api = window.messDataApi;
  if (!api) return;

  const cardsWrap = document.getElementById("liveMenuCards");
  const statusEl = document.getElementById("liveMenuStatus");
  const dateInput = document.getElementById("liveMenuDate");
  const refreshBtn = document.getElementById("refreshLiveMenus");

  const searchInput = document.querySelector('.filter-bar input[type="search"]');
  const tierSelect = document.querySelector('.filter-bar select:nth-of-type(1)');
  const vegCheckbox = document.querySelector('.filter-toggle input[type="checkbox"]');
  const applyBtn = document.querySelector('.filter-cta');

  const mapTier = (value) => {
    const raw = String(value || "").toUpperCase();
    if (raw.includes("UNLIMITED")) return "UNLIMITED";
    if (raw.includes("LIMITED")) return "LIMITED";
    if (raw.includes("PRO")) return "PRO-REACH";
    return "ALL";
  };

  const buildCard = (menu) => {
    const card = document.createElement("article");
    card.className = "live-card";
    card.innerHTML = `
      <div class="head">
        <h3>${menu.mess_name}</h3>
        <span class="rating">${Number(menu.rating || 0).toFixed(1)}★</span>
      </div>
      <div class="live-meta">
        <span>${menu.tier}</span>
        <span>Rs ${Number(menu.price || 0).toFixed(0)}</span>
        <span>${menu.menu_date}</span>
        ${menu.vegetarian_only ? "<span>Veg</span>" : ""}
      </div>
      <ul>${menu.menu_items.map((item) => `<li>${item}</li>`).join("")}</ul>
      <p><strong>Special:</strong> ${menu.special}</p>
      <p><strong>Timings:</strong> ${menu.timings}</p>
      <p><strong>Crowd:</strong> ${menu.crowd} | <strong>Distance:</strong> ${menu.distance}</p>
    `;
    return card;
  };

  const setStatus = (text) => {
    statusEl.textContent = text;
  };

  const readFilters = () => ({
    date: dateInput.value,
    search: searchInput ? searchInput.value.trim() : "",
    tier: mapTier(tierSelect ? tierSelect.value : ""),
    vegetarianOnly: vegCheckbox ? vegCheckbox.checked : false,
  });

  const loadLiveMenus = async () => {
    setStatus("Loading live menus...");
    const filters = readFilters();
    const { rows, mode } = await api.listMenus(filters);

    cardsWrap.innerHTML = "";
    if (!rows.length) {
      cardsWrap.innerHTML = '<p class="live-status">No vendor cards found for this date.</p>';
      setStatus(`No cards found. Storage mode: ${mode === "cloud" ? "Supabase" : "Local fallback"}.`);
      return;
    }

    rows.forEach((menu) => cardsWrap.appendChild(buildCard(menu)));
    setStatus(`Showing ${rows.length} card(s). Storage mode: ${mode === "cloud" ? "Supabase" : "Local fallback"}.`);
  };

  dateInput.value = api.toIsoDay(new Date());

  if (refreshBtn) refreshBtn.addEventListener("click", loadLiveMenus);
  if (applyBtn) applyBtn.addEventListener("click", loadLiveMenus);
  if (dateInput) dateInput.addEventListener("change", loadLiveMenus);
  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadLiveMenus();
      }
    });
  }

  loadLiveMenus();
  window.setInterval(loadLiveMenus, 60000);
})();
