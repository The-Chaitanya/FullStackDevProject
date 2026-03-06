(() => {
  const api = window.messDataApi;
  if (!api) return;
  const ROLE_STORAGE_KEY = "messplans_role";
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, "student");
  } catch (_) {
    // Ignore storage errors.
  }

  const searchInput = document.querySelector('.filter-bar input[type="search"]');
  const tierSelect = document.querySelector('.filter-bar select:nth-of-type(1)');
  const priceSelect = document.querySelector('.filter-bar select:nth-of-type(2)');
  const vegCheckbox = document.querySelector('.filter-toggle input[type="checkbox"]');
  const dateInput = document.getElementById("menuDateFilter");
  const applyBtn = document.querySelector('.filter-cta');
  const statusEl = document.getElementById("dashboardStatus");

  const toneClasses = ["tone-1", "tone-2", "tone-3", "tone-4"];

  const tierContainers = Array.from(document.querySelectorAll(".tier")).reduce((acc, section) => {
    const label = section.querySelector(".tier-label")?.textContent?.trim().toUpperCase();
    const cards = section.querySelector(".cards");
    const track = section.querySelector(".tier-track");
    if (label && cards && track) {
      cards.classList.add("dynamic-layout");
      track.classList.add("dynamic-track");
      acc[label] = { cards, track };
    }
    return acc;
  }, {});

  const mapTier = (value) => {
    const raw = String(value || "").toUpperCase();
    if (raw.includes("UNLIMITED")) return "UNLIMITED";
    if (raw.includes("LIMITED")) return "LIMITED";
    if (raw.includes("PRO")) return "PRO-REACH";
    return "ALL";
  };

  const mapPrice = (value) => {
    const raw = String(value || "").toUpperCase();
    if (raw.includes("UNDER")) return { min: 0, max: 79 };
    if (raw.includes("80") && raw.includes("100")) return { min: 80, max: 100 };
    if (raw.includes("ABOVE")) return { min: 101, max: Number.POSITIVE_INFINITY };
    return { min: 0, max: Number.POSITIVE_INFINITY };
  };

  const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

  const createCard = (menu, index) => {
    const article = document.createElement("article");
    article.className = "card";
    article.style.setProperty("--delay", `${index * 80}ms`);

    const tone = toneClasses[index % toneClasses.length];
    const details = `
      <p><span class="label">Timings:</span> ${menu.timings}</p>
      <p><span class="label">Crowd:</span> ${menu.crowd}</p>
      <p><span class="label">Distance:</span> ${menu.distance}</p>
    `;

    article.innerHTML = `
      <div class="card-media ${tone}">
        <div class="price-tag">${formatPrice(menu.price)}</div>
      </div>
      <div class="card-body">
        <div class="card-title">
          <h3>${menu.mess_name}</h3>
          <span class="rating">&#9733; ${Number(menu.rating || 0).toFixed(1)}</span>
        </div>
        <ul class="card-list">
          ${menu.menu_items.map((item) => `<li>${item}</li>`).join("")}
          <li>Special: ${menu.special}</li>
        </ul>
        <div class="card-details">${details}</div>
        <button class="btn" type="button">View Full Menu</button>
      </div>
    `;

    return article;
  };

  const clearTierCards = () => {
    Object.values(tierContainers).forEach(({ cards }) => {
      cards.innerHTML = "";
    });
  };

  const renderMenus = (menus) => {
    clearTierCards();

    const grouped = {
      "UNLIMITED": [],
      "LIMITED": [],
      "PRO-REACH": [],
    };

    menus.forEach((menu) => {
      const tier = String(menu.tier || "").toUpperCase();
      if (grouped[tier]) grouped[tier].push(menu);
    });

    Object.entries(grouped).forEach(([tier, list]) => {
      const container = tierContainers[tier];
      if (!container) return;
      const wrap = container.cards;

      if (!list.length) {
        wrap.innerHTML = `<article class="card"><div class="card-body"><h3>No menu yet</h3><p class="page-subtitle">No vendor card for this tier on selected date.</p></div></article>`;
        return;
      }

      list.forEach((menu, idx) => wrap.appendChild(createCard(menu, idx)));
    });
  };

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  const readFilters = () => {
    const tier = mapTier(tierSelect ? tierSelect.value : "");
    const priceRange = mapPrice(priceSelect ? priceSelect.value : "");
    return {
      date: dateInput?.value || api.toIsoDay(new Date()),
      search: searchInput ? searchInput.value.trim() : "",
      tier,
      vegetarianOnly: vegCheckbox ? vegCheckbox.checked : false,
      priceRange,
    };
  };

  const loadMenus = async () => {
    const filters = readFilters();
    setStatus("Updating cards...");

    const { rows, mode } = await api.listMenus(filters);
    const filteredByPrice = rows.filter((menu) => {
      const price = Number(menu.price || 0);
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });

    renderMenus(filteredByPrice);
    setStatus(
      `Showing ${filteredByPrice.length} card(s) for ${filters.date}. Storage mode: ${mode === "cloud" ? "Supabase" : "Local fallback"}.`,
    );
  };

  if (dateInput) {
    dateInput.value = api.toIsoDay(new Date());
    dateInput.addEventListener("change", loadMenus);
  }

  if (applyBtn) applyBtn.addEventListener("click", loadMenus);
  if (tierSelect) tierSelect.addEventListener("change", loadMenus);
  if (priceSelect) priceSelect.addEventListener("change", loadMenus);
  if (vegCheckbox) vegCheckbox.addEventListener("change", loadMenus);

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadMenus();
      }
    });
  }

  loadMenus();
  window.setInterval(loadMenus, 60000);
})();

