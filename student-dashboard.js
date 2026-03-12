(() => {
  const api = window.messDataApi;
  if (!api) return;
  const ROLE_STORAGE_KEY = "messplans_role";
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const authClient =
    window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

  const normalizeRole = (value) => (String(value || "").toLowerCase() === "vendor" ? "vendor" : "student");

  const searchInput = document.getElementById("menuSearchInput");
  const tierSelect = document.getElementById("tierFilterSelect");
  const priceSelect = document.getElementById("priceFilterSelect");
  const vegCheckbox = document.getElementById("vegOnlyToggle");
  const dateInput = document.getElementById("menuDateFilter");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const clearBtn = document.getElementById("clearFiltersBtn");
  const filterForm = document.querySelector(".filter-bar");
  const statusEl = document.getElementById("dashboardStatus");
  const filterToggleBtn = document.getElementById("filterToggleBtn");
  const filterContent = document.getElementById("filterContent");
  const noResultsState = document.getElementById("noResultsState");
  const dashboardLoader = document.getElementById("dashboardLoader");
  const insightCount = document.getElementById("insightCount");
  const insightAvgPrice = document.getElementById("insightAvgPrice");
  const insightTopRated = document.getElementById("insightTopRated");
  const menuModal = document.getElementById("menuModal");
  const menuModalClose = document.getElementById("menuModalClose");
  const menuModalPanel = document.querySelector(".menu-modal-panel");
  const menuModalTitle = document.getElementById("menuModalTitle");
  const menuModalMeta = document.getElementById("menuModalMeta");
  const menuModalItems = document.getElementById("menuModalItems");
  const menuModalDetails = document.getElementById("menuModalDetails");
  const ratingStarsWrap = document.getElementById("ratingStars");
  const submitRatingBtn = document.getElementById("submitRatingBtn");
  const ratingMessage = document.getElementById("ratingMessage");
  const tierChips = Array.from(document.querySelectorAll("[data-tier-chip]"));
  const searchField = document.querySelector(".search-field");
  const tierField = document.querySelector(".tier-field");
  const dateField = document.querySelector(".date-field");
  const priceField = document.querySelector(".price-field");

  let tierSelectUi = null;
  let priceSelectUi = null;
  let currentStudent = null;
  let activeMenuId = "";
  let activeStar = 0;
  let loadSequence = 0;
  let pendingLoads = 0;

  const toneClasses = ["tone-1", "tone-2", "tone-3", "tone-4"];
  const menuByKey = new Map();

  const paintStars = (value) => {
    activeStar = Number(value || 0);
    if (!ratingStarsWrap) return;
    ratingStarsWrap.querySelectorAll(".star-btn").forEach((button) => {
      const starValue = Number(button.dataset.star || 0);
      button.classList.toggle("active", starValue <= activeStar);
    });
  };

  const tierContainers = Array.from(document.querySelectorAll(".tier")).reduce((acc, section) => {
    const label = section.querySelector(".tier-label")?.textContent?.trim().toUpperCase();
    const cards = section.querySelector(".cards");
    const track = section.querySelector(".tier-track");
    if (label && cards && track) {
      cards.classList.add("dynamic-layout");
      track.classList.add("dynamic-track");
      acc[label] = { cards, track, section };
    }
    return acc;
  }, {});

  const mapTier = (value) => {
    const raw = String(value || "").toUpperCase().trim();
    if (raw === "ALL") return "ALL";
    if (raw === "UNLIMITED" || raw === "LIMITED" || raw === "PRO-REACH") return raw;
    if (raw.includes("UNLIMITED")) return "UNLIMITED";
    if (raw.includes("LIMITED")) return "LIMITED";
    if (raw.includes("PRO")) return "PRO-REACH";
    return "ALL";
  };

  const mapPrice = (value) => {
    const raw = String(value || "").toUpperCase().trim();
    if (raw === "UNDER_80" || raw.includes("UNDER")) return { min: 0, max: 79 };
    if (raw === "80_TO_100" || (raw.includes("80") && raw.includes("100"))) return { min: 80, max: 100 };
    if (raw === "ABOVE_100" || raw.includes("ABOVE")) return { min: 101, max: Number.POSITIVE_INFINITY };
    return { min: 0, max: Number.POSITIVE_INFINITY };
  };

  const formatPrice = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

  const createCard = (menu, index) => {
    const article = document.createElement("article");
    article.className = "card";
    article.style.setProperty("--delay", `${index * 80}ms`);
    const key = menu.id || `${menu.mess_name}-${menu.menu_date}-${index}`;
    article.dataset.menuKey = key;
    menuByKey.set(key, menu);

    const displayRating = Number(menu.rating || 0).toFixed(1);
    const ratingCount = Number(menu.rating_count || 0);
    const ratingCountText = ratingCount ? ` (${ratingCount})` : "";

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
          <span class="rating">&#9733; ${displayRating}${ratingCountText}</span>
        </div>
        <ul class="card-list">
          ${menu.menu_items.map((item) => `<li>${item}</li>`).join("")}
          <li>Special: ${menu.special}</li>
        </ul>
        <div class="card-details">${details}</div>
        <button class="btn view-menu-btn" type="button">View Full Menu</button>
      </div>
    `;

    return article;
  };

  const clearTierCards = () => {
    menuByKey.clear();
    Object.values(tierContainers).forEach(({ cards }) => {
      cards.innerHTML = "";
    });
  };

  const openMenuModal = async (menu) => {
    if (!menuModal || !menu) return;
    if (menuModal.parentElement !== document.body) {
      document.body.appendChild(menuModal);
    }
    activeMenuId = menu.id || "";

    if (menuModalTitle) menuModalTitle.textContent = menu.mess_name || "Full Menu";
    if (menuModalMeta) {
      const ratingCount = Number(menu.rating_count || 0);
      const ratingCountText = ratingCount ? ` (${ratingCount})` : "";
      menuModalMeta.textContent = `${String(menu.tier || "").toUpperCase()}  •  Rs ${Number(menu.price || 0).toFixed(0)}  •  ★ ${Number(menu.rating || 0).toFixed(1)}${ratingCountText}`;
    }

    if (menuModalItems) {
      menuModalItems.innerHTML = "";
      (menu.menu_items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        menuModalItems.appendChild(li);
      });
      if (menu.special) {
        const li = document.createElement("li");
        li.textContent = `Special: ${menu.special}`;
        menuModalItems.appendChild(li);
      }
    }

    if (menuModalDetails) {
      menuModalDetails.innerHTML = `
        <p><strong>Timings:</strong> ${menu.timings || "-"}</p>
        <p><strong>Crowd:</strong> ${menu.crowd || "-"}</p>
        <p><strong>Distance:</strong> ${menu.distance || "-"}</p>
        <p><strong>Date:</strong> ${menu.menu_date || "-"}</p>
      `;
    }

    if (typeof menuModal.showModal === "function" && !menuModal.open) {
      menuModal.showModal();
    }
    document.body.style.overflow = "hidden";
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const resetModalScroll = () => {
      menuModal.scrollTop = 0;
      if (menuModalPanel) {
        menuModalPanel.scrollTop = 0;
      }
    };
    resetModalScroll();
    window.requestAnimationFrame(() => {
      resetModalScroll();
      window.requestAnimationFrame(() => {
        resetModalScroll();
      });
    });

    const myScore = currentStudent?.id ? await api.getMyMenuRating(menu.id, currentStudent.id) : null;
    paintStars(myScore || 0);
    if (ratingMessage) ratingMessage.textContent = myScore ? `Your rating: ${myScore}/5` : "";
  };

  const closeMenuModal = () => {
    if (!menuModal) return;
    if (menuModalPanel) {
      menuModalPanel.scrollTop = 0;
    }
    if (typeof menuModal.close === "function") {
      menuModal.close();
    }
    document.body.style.overflow = "";
    activeMenuId = "";
    if (ratingMessage) ratingMessage.textContent = "";
  };

  const renderMenus = (menus) => {
    clearTierCards();

    const grouped = {
      UNLIMITED: [],
      LIMITED: [],
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
      container.section.hidden = !list.length;
      if (!list.length) return;
      list.forEach((menu, idx) => wrap.appendChild(createCard(menu, idx)));
    });

    if (noResultsState) {
      noResultsState.hidden = menus.length !== 0;
    }
  };

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  const setDataLoading = (isLoading) => {
    if (dashboardLoader) dashboardLoader.hidden = !isLoading;
    document.body.classList.toggle("data-loading", Boolean(isLoading));
  };

  const finalizeInitialReveal = () => {
    if (!document.body.classList.contains("page-loaded")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.classList.remove("pre-data");
          document.body.classList.add("page-loaded");
        });
      });
    } else {
      document.body.classList.remove("pre-data");
    }
  };

  const updateInsights = (menus) => {
    const total = menus.length;
    const avgPrice = total
      ? Math.round(menus.reduce((sum, menu) => sum + Number(menu.price || 0), 0) / total)
      : 0;
    const topMenu = total
      ? menus.reduce((best, menu) => (Number(menu.rating || 0) > Number(best.rating || 0) ? menu : best), menus[0])
      : null;
    const topLabel = topMenu ? `${topMenu.mess_name} (${Number(topMenu.rating || 0).toFixed(1)})` : "-";

    if (insightCount) {
      if (typeof window.gsap !== "undefined") {
        const state = { value: Number(insightCount.textContent || 0) };
        window.gsap.to(state, {
          value: total,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
          onUpdate: () => {
            insightCount.textContent = String(Math.round(state.value));
          },
        });
      } else {
        insightCount.textContent = String(total);
      }
    }
    if (insightAvgPrice) insightAvgPrice.textContent = `Rs ${avgPrice}`;
    if (insightTopRated) insightTopRated.textContent = topLabel;
  };

  const setFilterOpen = (open) => {
    if (!filterContent || !filterToggleBtn) return;
    filterContent.hidden = !open;
    filterToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    filterToggleBtn.textContent = open ? "Hide Filters" : "Show Filters";
  };

  const readFilters = () => {
    const tierValue = tierSelectUi ? tierSelectUi.getValue() : tierSelect?.value;
    const priceValue = priceSelectUi ? priceSelectUi.getValue() : priceSelect?.value;
    return {
      date: dateInput?.value || api.toIsoDay(new Date()),
      search: searchInput ? searchInput.value.trim() : "",
      tier: mapTier(tierValue || ""),
      vegetarianOnly: vegCheckbox ? vegCheckbox.checked : false,
      priceRange: mapPrice(priceValue || ""),
    };
  };

  const syncTierChips = () => {
    const tierValue = tierSelectUi ? tierSelectUi.getValue() : tierSelect?.value;
    const tier = mapTier(tierValue || "ALL");
    tierChips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.tierChip === tier);
    });
  };

  const resetFilters = () => {
    const todayIso = api.toIsoDay(new Date());
    if (searchInput) searchInput.value = "";
    if (tierSelectUi) tierSelectUi.setValue("ALL", true);
    else if (tierSelect) tierSelect.value = "ALL";
    if (priceSelectUi) priceSelectUi.setValue("ANY", true);
    else if (priceSelect) priceSelect.value = "ANY";
    if (vegCheckbox) vegCheckbox.checked = false;
    if (dateInput?._flatpickr) dateInput._flatpickr.setDate(todayIso, true);
    else if (dateInput) dateInput.value = todayIso;
    syncTierChips();
    loadMenus();
  };

  const loadMenus = async () => {
    const requestId = ++loadSequence;
    pendingLoads += 1;
    if (pendingLoads === 1) setDataLoading(true);
    const filters = readFilters();
    setStatus("Updating cards...");
    try {
      const { rows, mode } = await api.listMenus(filters);
      if (requestId !== loadSequence) return;
      const filteredByPrice = rows.filter((menu) => {
        const price = Number(menu.price || 0);
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
      renderMenus(filteredByPrice);
      updateInsights(filteredByPrice);
      setStatus(`Showing ${filteredByPrice.length} option(s) for ${filters.date}${mode === "cloud" ? "" : " (offline data)"}.`);
    } catch (error) {
      if (requestId !== loadSequence) return;
      renderMenus([]);
      updateInsights([]);
      setStatus("Could not load menus. Please try again.");
    } finally {
      pendingLoads = Math.max(0, pendingLoads - 1);
      if (pendingLoads === 0) setDataLoading(false);
    }
  };

  const ensureStudentRole = async () => {
    const queryRole = new URLSearchParams(window.location.search).get("role");
    const hintedRole = queryRole ? normalizeRole(queryRole) : "";
    let storedRole = "student";
    try {
      storedRole = normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
    } catch {
      storedRole = "student";
    }

    let accountRole = "";
    let hasVendorMess = false;
    if (authClient) {
      const { data } = await authClient.auth.getUser();
      accountRole = data?.user?.user_metadata?.role ? normalizeRole(data.user.user_metadata.role) : "";
      hasVendorMess = Boolean(String(data?.user?.user_metadata?.mess_name || "").trim());
    }

    const effectiveRole = accountRole || (hasVendorMess ? "vendor" : hintedRole || storedRole);
    if (effectiveRole === "vendor") {
      window.location.href = "vendor-dashboard.html?role=vendor";
      return false;
    }

    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, "student");
    } catch {
      // Ignore storage errors.
    }
    return true;
  };

  if (dateInput) {
    const todayIso = api.toIsoDay(new Date());
    dateInput.value = todayIso;
    if (typeof window.flatpickr === "function") {
      window.flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        defaultDate: todayIso,
        disableMobile: true,
        onChange: () => loadMenus(),
      });
    } else {
      dateInput.addEventListener("change", loadMenus);
    }
  }

  if (applyBtn) applyBtn.addEventListener("click", loadMenus);
  if (clearBtn) clearBtn.addEventListener("click", resetFilters);
  if (filterForm) {
    filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      loadMenus();
    });
  }
  if (vegCheckbox) vegCheckbox.addEventListener("change", loadMenus);
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener("click", () => {
      const isOpen = filterToggleBtn.getAttribute("aria-expanded") === "true";
      setFilterOpen(!isOpen);
    });
  }

  if (typeof window.TomSelect === "function") {
    if (tierSelect) {
      tierSelectUi = new window.TomSelect(tierSelect, {
        create: false,
        controlInput: null,
        allowEmptyOption: false,
        maxOptions: 10,
      });
      tierSelectUi.on("change", () => {
        syncTierChips();
        loadMenus();
      });
    }
    if (priceSelect) {
      priceSelectUi = new window.TomSelect(priceSelect, {
        create: false,
        controlInput: null,
        allowEmptyOption: false,
        maxOptions: 10,
      });
      priceSelectUi.on("change", () => loadMenus());
    }
  } else {
    if (tierSelect) tierSelect.addEventListener("change", loadMenus);
    if (priceSelect) priceSelect.addEventListener("change", loadMenus);
    if (tierSelect) tierSelect.addEventListener("change", syncTierChips);
  }

  const bindFieldClick = (fieldEl, handler) => {
    if (!fieldEl) return;
    fieldEl.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, select, .ts-control, .ts-dropdown")) {
        return;
      }
      handler();
    });
  };

  bindFieldClick(searchField, () => searchInput?.focus());
  bindFieldClick(dateField, () => {
    if (dateInput?._flatpickr) dateInput._flatpickr.open();
    else {
      dateInput?.focus();
      dateInput?.showPicker?.();
    }
  });
  bindFieldClick(tierField, () => {
    if (tierSelectUi) {
      tierSelectUi.focus();
      tierSelectUi.open();
      return;
    }
    tierSelect?.focus();
    tierSelect?.showPicker?.();
  });
  bindFieldClick(priceField, () => {
    if (priceSelectUi) {
      priceSelectUi.focus();
      priceSelectUi.open();
      return;
    }
    priceSelect?.focus();
    priceSelect?.showPicker?.();
  });

  tierChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!tierSelect) return;
      const nextTier = chip.dataset.tierChip || "ALL";
      if (tierSelectUi) tierSelectUi.setValue(nextTier, false);
      else tierSelect.value = nextTier;
      syncTierChips();
      loadMenus();
    });
  });

  if (ratingStarsWrap) {
    ratingStarsWrap.addEventListener("click", (event) => {
      const button = event.target.closest(".star-btn");
      if (!button) return;
      paintStars(Number(button.dataset.star || 0));
    });
  }

  if (submitRatingBtn) {
    submitRatingBtn.addEventListener("click", async () => {
      if (!activeMenuId || !activeStar) {
        if (ratingMessage) ratingMessage.textContent = "Select stars first.";
        return;
      }
      if (!currentStudent?.id) {
        if (ratingMessage) ratingMessage.textContent = "Please login to submit rating.";
        return;
      }
      submitRatingBtn.disabled = true;
      try {
        await api.rateMenu({ menuId: activeMenuId, rating: activeStar, userId: currentStudent.id });
        if (ratingMessage) ratingMessage.textContent = `Thanks! You rated ${activeStar}/5.`;
        await loadMenus();
      } catch (error) {
        if (ratingMessage) ratingMessage.textContent = error.message || "Could not submit rating.";
      } finally {
        submitRatingBtn.disabled = false;
      }
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".view-menu-btn")) {
      event.preventDefault();
      const card = target.closest(".card");
      const key = card?.dataset.menuKey;
      if (!key) return;
      const menu = menuByKey.get(key);
      if (!menu) return;
      openMenuModal(menu);
      return;
    }
    if (target.id === "menuModalClose") {
      closeMenuModal();
    }
  });

  if (menuModalClose) {
    menuModalClose.addEventListener("click", closeMenuModal);
  }

  if (menuModal) {
    menuModal.addEventListener("close", () => {
      document.body.style.overflow = "";
    });
    menuModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeMenuModal();
    });
    menuModal.addEventListener("click", (event) => {
      if (event.target === menuModal) {
        closeMenuModal();
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadMenus();
      }
    });
  }

  const init = async () => {
    const allowed = await ensureStudentRole();
    if (!allowed) return;
    if (menuModal && menuModal.parentElement !== document.body) {
      document.body.appendChild(menuModal);
    }
    currentStudent = await api.getCurrentUser();
    setFilterOpen(true);
    syncTierChips();
    try {
      await loadMenus();
    } finally {
      finalizeInitialReveal();
    }
    window.setInterval(loadMenus, 60000);
  };

  init();
})();
