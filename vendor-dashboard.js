(() => {
  const api = window.messDataApi;
  if (!api) return;
  const ROLE_STORAGE_KEY = "messplans_role";
  const MESS_NAME_KEY_PREFIX = "messplans_vendor_mess_name_";
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org";
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
  const mapMessage = document.getElementById("mapMessage");
  const useCurrentLocationBtn = document.getElementById("useCurrentLocationBtn");
  const openMapsBtn = document.getElementById("openMapsBtn");
  const findAddressBtn = document.getElementById("findAddressBtn");
  const setMapLocationBtn = document.getElementById("setMapLocationBtn");
  const vendorLocationMap = document.getElementById("vendorLocationMap");
  const vendorMapPreview = document.getElementById("vendorMapPreview");
  const mapsLink = document.getElementById("mapsLink");

  const fields = {
    menuId: document.getElementById("menuId"),
    tier: document.getElementById("tier"),
    menuDate: document.getElementById("menuDate"),
    price: document.getElementById("price"),
    timings: document.getElementById("timings"),
    crowd: document.getElementById("crowd"),
    distance: document.getElementById("distance"),
    messCoords: document.getElementById("messCoords"),
    mapsLink: document.getElementById("mapsLink"),
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

  const parseMapsUrlCoords = (urlLike) => {
    const text = String(urlLike || "").trim();
    if (!text) return null;
    try {
      const url = new URL(text);
      const directAt = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (directAt) return parseCoordsInput(`${directAt[1]},${directAt[2]}`);
      const hashMarker = url.hash.match(/map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
      if (hashMarker) return parseCoordsInput(`${hashMarker[1]},${hashMarker[2]}`);
      const q = url.searchParams.get("q") || url.searchParams.get("query");
      const ll = url.searchParams.get("ll");
      const daddr = url.searchParams.get("daddr");
      const dest = url.searchParams.get("destination");
      const mlat = url.searchParams.get("mlat");
      const mlon = url.searchParams.get("mlon");
      if (mlat && mlon) {
        const parsed = parseCoordsInput(`${mlat},${mlon}`);
        if (parsed) return parsed;
      }
      const maybeCoords = q || ll || daddr || dest;
      if (maybeCoords) {
        const parsed = parseCoordsInput(maybeCoords);
        if (parsed) return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const geocodeAddress = async (rawAddress) => {
    const address = String(rawAddress || "").trim();
    if (!address) return null;
    const response = await fetch(
      `${NOMINATIM_ENDPOINT}/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      throw new Error("Address lookup is unavailable right now. Please try again.");
    }
    const results = await response.json();
    if (!Array.isArray(results) || !results.length) {
      return null;
    }
    const top = results[0];
    return {
      lat: Number(top.lat),
      lng: Number(top.lon),
      formattedAddress: String(top.display_name || address).trim(),
    };
  };

  const reverseGeocodeCoords = async (coords) => {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return "";
    const response = await fetch(
      `${NOMINATIM_ENDPOINT}/reverse?format=jsonv2&lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      return "";
    }
    const result = await response.json();
    return String(result?.display_name || "").trim();
  };

  const ensureLeaflet = () => {
    if (window.L && vendorLocationMap) return window.L;
    throw new Error("Map library could not load.");
  };

  const formatMapBounds = (coords, delta = 0.008) => {
    const minLng = coords.lng - delta;
    const maxLng = coords.lng + delta;
    const minLat = coords.lat - delta;
    const maxLat = coords.lat + delta;
    return `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
  };

  const openStreetMapLink = (coords) =>
    `https://www.openstreetmap.org/?mlat=${encodeURIComponent(coords.lat)}&mlon=${encodeURIComponent(coords.lng)}#map=16/${encodeURIComponent(coords.lat)}/${encodeURIComponent(coords.lng)}`;

  const updateMapPreview = (coords) => {
    if (!vendorMapPreview) return;
    if (!coords) {
      vendorMapPreview.removeAttribute("src");
      vendorMapPreview.hidden = true;
      return;
    }
    vendorMapPreview.src =
      `https://www.openstreetmap.org/export/embed.html?bbox=${formatMapBounds(coords)}` +
      `&layer=mapnik&marker=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`;
    vendorMapPreview.hidden = false;
  };

  const initLocationMap = async () => {
    if (locationMap || !vendorLocationMap) return locationMap;
    const L = ensureLeaflet();
    locationMap = L.map(vendorLocationMap, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([18.5204, 73.8567], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(locationMap);

    locationMap.on("click", (event) => {
      const coords = {
        lat: Number(event.latlng.lat),
        lng: Number(event.latlng.lng),
      };
      pendingMapCoords = coords;
      setMapMarker(coords);
      setMapMessage(`Selected on map: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, "success");
    });
    setTimeout(() => locationMap.invalidateSize(), 50);
    return locationMap;
  };

  const withGeoMeta = (distance, coordsRaw) => {
    const cleanDistance = String(distance || "").trim();
    const coords = parseCoordsInput(coordsRaw);
    if (!coords) return cleanDistance;
    return `${cleanDistance} [geo:${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}]`;
  };

  const applyResolvedLocation = async (coords, options = {}) => {
    const { formattedAddress = "", persist = false, message = "" } = options;
    pendingMapCoords = coords;
    if (formattedAddress && fields.distance) {
      fields.distance.value = formattedAddress;
    }
    if (fields.messCoords) {
      fields.messCoords.value = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    }
    try {
      await initLocationMap();
      setMapMarker(coords);
    } catch {
      setMapMessage("Map picker could not load.", "error");
    }
    updateMapPreview(coords);
    if (persist && fields.messCoords.value.trim()) {
      await persistCoords(fields.messCoords.value.trim());
    }
    if (message) {
      setMapMessage(message, "success");
    }
  };

  const setMapMessage = (text, type = "") => {
    if (!mapMessage) return;
    mapMessage.textContent = text;
    mapMessage.className = "message";
    if (type) mapMessage.classList.add(type);
  };

  const setMapMarker = (coords) => {
    if (!locationMap || !coords) return;
    const L = ensureLeaflet();
    if (!locationMarker) {
      locationMarker = L.marker([coords.lat, coords.lng]).addTo(locationMap);
    } else {
      locationMarker.setLatLng([coords.lat, coords.lng]);
    }
    locationMap.setView([coords.lat, coords.lng], Math.max(locationMap.getZoom() || 13, 15));
  };

  const maybeFillAddressFromCoords = async (coords) => {
    if (!fields.distance) return;
    if (fields.distance.value.trim()) return;
    const address = await reverseGeocodeCoords(coords);
    if (address) {
      fields.distance.value = address;
    }
  };

  let currentUser = null;
  let vendorMenusAll = [];
  let lockedMessName = "";
  let lockedMessCoords = "";
  let locationMap = null;
  let locationMarker = null;
  let pendingMapCoords = null;

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

  const persistCoords = async (coordsText) => {
    const value = String(coordsText || "").trim();
    lockedMessCoords = value;
    const parsed = parseCoordsInput(value);
    if (currentUser?.id && parsed) {
      try {
        await api.saveUserLocation({
          userId: currentUser.id,
          role: "vendor",
          latitude: parsed.lat,
          longitude: parsed.lng,
        });
      } catch {
        // Ignore save errors here; validation/UX handled elsewhere.
      }
    }
    if (authClient && currentUser && value) {
      try {
        await authClient.auth.updateUser({ data: { mess_coords: value } });
      } catch {
        // Ignore profile update errors.
      }
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
    fields.tier.value = "UNLIMITED";
    if (fields.messCoords) fields.messCoords.value = lockedMessCoords || "";
    if (fields.mapsLink) fields.mapsLink.value = "";
    const parsed = parseCoordsInput(lockedMessCoords || "");
    pendingMapCoords = parsed;
    updateMapPreview(parsed);
    setMapMarker(parsed);
    setMapMessage("");
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
      </div>
      <ul class="vendor-menu">
        ${menu.menu_items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <p class="row"><strong>Special:</strong> ${menu.special}</p>
      <p class="row"><strong>Timings:</strong> ${menu.timings}</p>
      <p class="row"><strong>Crowd:</strong> ${menu.crowd} | <strong>Address:</strong> ${parsedGeo.display}</p>
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
    fields.timings.value = menu.timings;
    fields.crowd.value = menu.crowd;
    fields.distance.value = parsedGeo.display;
    fields.messCoords.value =
      parsedGeo.lat !== null && parsedGeo.lng !== null ? `${parsedGeo.lat},${parsedGeo.lng}` : lockedMessCoords;
    if (fields.mapsLink) fields.mapsLink.value = "";
    const coords = parsedGeo.lat !== null && parsedGeo.lng !== null ? { lat: parsedGeo.lat, lng: parsedGeo.lng } : null;
    pendingMapCoords = coords;
    updateMapPreview(coords);
    initLocationMap().then(() => setMapMarker(coords)).catch(() => {
      setMapMessage("Map picker could not load.", "error");
    });
    fields.menuItems.value = menu.menu_items.join("\n");
    fields.special.value = menu.special;
    fields.vegetarianOnly.checked = Boolean(menu.vegetarian_only);
    formTitle.textContent = "Edit Daily Menu Card";
    submitBtn.textContent = "Update Menu Card";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const readForm = () => {
    if (!fields.messCoords.value.trim() && lockedMessCoords) {
      fields.messCoords.value = lockedMessCoords;
    }
    if (!fields.messCoords.value.trim()) {
      const parsedFromLink = parseMapsUrlCoords(fields.mapsLink?.value || "");
      if (parsedFromLink) {
        fields.messCoords.value = `${parsedFromLink.lat.toFixed(6)},${parsedFromLink.lng.toFixed(6)}`;
        pendingMapCoords = parsedFromLink;
        initLocationMap().then(() => setMapMarker(parsedFromLink)).catch(() => {
          setMapMessage("Map picker could not load.", "error");
        });
        updateMapPreview(parsedFromLink);
        setMapMessage("Coordinates extracted from map link.", "success");
      }
    }

    return {
      id: fields.menuId.value || undefined,
      mess_name: lockedMessName,
      tier: fields.tier.value,
      menu_date: fields.menuDate.value,
      price: Number(fields.price.value || 0),
      timings: fields.timings.value.trim(),
      crowd: fields.crowd.value.trim(),
      distance: withGeoMeta(fields.distance.value.trim(), fields.messCoords.value.trim()),
      menu_items: fields.menuItems.value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      special: fields.special.value.trim(),
      vegetarian_only: fields.vegetarianOnly.checked,
    };
  };

  const validate = (payload) => {
    if (!payload.mess_name) return "Set your mess name first.";
    if (!payload.menu_date) return "Menu date is required.";
    if (!payload.menu_items.length) return "Add at least one menu item.";
    if (payload.price <= 0) return "Price must be greater than 0.";
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
      await persistCoords(fields.messCoords.value.trim());
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

  if (openMapsBtn) {
    openMapsBtn.addEventListener("click", async () => {
      try {
        await initLocationMap();
      } catch {
        setMapMessage("Map picker could not load. Check your connection and retry.", "error");
        return;
      }
      vendorLocationMap?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (pendingMapCoords) setMapMarker(pendingMapCoords);
      setTimeout(() => locationMap?.invalidateSize(), 150);
    });
  }

  if (findAddressBtn) {
    findAddressBtn.addEventListener("click", async () => {
      const address = fields.distance?.value || "";
      if (!String(address).trim()) {
        setMapMessage("Enter an address first.", "error");
        return;
      }
      findAddressBtn.disabled = true;
      setMapMessage("Finding address on map...");
      try {
        const resolved = await geocodeAddress(address);
        if (!resolved) {
          setMapMessage("Could not find that address. Try a more complete address.", "error");
          return;
        }
        await applyResolvedLocation(
          { lat: resolved.lat, lng: resolved.lng },
          {
            formattedAddress: resolved.formattedAddress,
            persist: true,
            message: "Address found and coordinates updated.",
          },
        );
      } catch (error) {
        setMapMessage(error.message || "Could not find that address.", "error");
      } finally {
        findAddressBtn.disabled = false;
      }
    });
  }

  if (setMapLocationBtn) {
    setMapLocationBtn.addEventListener("click", async () => {
      if (!pendingMapCoords) {
        setMapMessage("Pick a point on map first.", "error");
        return;
      }
      try {
        const inferredAddress = await reverseGeocodeCoords(pendingMapCoords);
        await applyResolvedLocation(pendingMapCoords, {
          formattedAddress: inferredAddress,
          persist: true,
          message: "Location set from map selection.",
        });
      } catch {
        await applyResolvedLocation(pendingMapCoords, {
          persist: true,
          message: "Location set from map selection.",
        });
      }
    });
  }

  if (useCurrentLocationBtn) {
    useCurrentLocationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setMapMessage("Geolocation is not supported in this browser.", "error");
        return;
      }
      useCurrentLocationBtn.disabled = true;
      setMapMessage("Getting current location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
          };
          try {
            const inferredAddress = await reverseGeocodeCoords(coords);
            await applyResolvedLocation(coords, {
              formattedAddress: inferredAddress,
              persist: true,
              message: "Location set from current position.",
            });
          } catch {
            await applyResolvedLocation(coords, {
              persist: true,
              message: "Location set from current position.",
            });
          }
          useCurrentLocationBtn.disabled = false;
        },
        () => {
          setMapMessage("Could not get location. Allow location permission and retry.", "error");
          useCurrentLocationBtn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  if (mapsLink) {
    const resolveFromLink = () => {
      const parsed = parseMapsUrlCoords(mapsLink.value);
      if (!parsed) {
        if (mapsLink.value.trim()) setMapMessage("Could not read coordinates from this map link.", "error");
        return;
      }
      fields.messCoords.value = `${parsed.lat.toFixed(6)},${parsed.lng.toFixed(6)}`;
      pendingMapCoords = parsed;
      updateMapPreview(parsed);
      initLocationMap()
        .then(() => {
          setMapMarker(parsed);
          return persistCoords(fields.messCoords.value.trim());
        })
        .then(() => {
          return maybeFillAddressFromCoords(parsed);
        })
        .then(() => {
          setMapMessage("Coordinates extracted from map link.", "success");
        })
        .catch(() => {
          setMapMessage("Map picker could not load.", "error");
        });
    };
    mapsLink.addEventListener("change", resolveFromLink);
    mapsLink.addEventListener("blur", resolveFromLink);
  }

  if (fields.distance) {
    fields.distance.addEventListener("blur", async () => {
      const address = fields.distance.value.trim();
      if (!address || fields.messCoords.value.trim()) return;
      try {
        const resolved = await geocodeAddress(address);
        if (!resolved) return;
        await applyResolvedLocation(
          { lat: resolved.lat, lng: resolved.lng },
          {
            formattedAddress: resolved.formattedAddress,
            persist: true,
            message: "Address matched and coordinates filled.",
          },
        );
      } catch {
        // Keep blur geocoding quiet to avoid noisy UX.
      }
    });
  }

  if (fields.messCoords) {
    fields.messCoords.addEventListener("change", () => {
      const parsed = parseCoordsInput(fields.messCoords.value);
      if (!parsed) {
        if (fields.messCoords.value.trim()) {
          setMapMessage("Coordinates must be in format: lat,lng", "error");
        } else {
          setMapMessage("");
        }
        updateMapPreview(null);
        return;
      }
      pendingMapCoords = parsed;
      updateMapPreview(parsed);
      initLocationMap()
        .then(() => {
          setMapMarker(parsed);
          return persistCoords(fields.messCoords.value.trim());
        })
        .then(() => maybeFillAddressFromCoords(parsed))
        .then(() => {
          setMapMessage("Coordinates set.", "success");
        })
        .catch(() => {
          setMapMessage("Map picker could not load.", "error");
        });
    });
  }

  const init = async () => {
    const allowed = await ensureVendorRole();
    if (!allowed) return;
    currentUser = await api.getCurrentUser();
    const storedVendorLocation = currentUser?.id ? await api.getUserLocation(currentUser.id, "vendor") : null;
    lockedMessCoords =
      storedVendorLocation && Number.isFinite(storedVendorLocation.latitude) && Number.isFinite(storedVendorLocation.longitude)
        ? `${storedVendorLocation.latitude},${storedVendorLocation.longitude}`
        : String(currentUser?.user_metadata?.mess_coords || "").trim();
    fields.menuDate.value = api.toIsoDay(new Date());
    try {
      await initLocationMap();
    } catch {
      setMapMessage("Map picker could not load. Check your connection and retry.", "error");
    }
    if (fields.messCoords) fields.messCoords.value = lockedMessCoords;
    const startupCoords = parseCoordsInput(lockedMessCoords || "");
    pendingMapCoords = startupCoords;
    updateMapPreview(startupCoords);
    setMapMarker(startupCoords);
    await refreshVendorMenusAll();
    if (lockedMessName) {
      setMessage(`Mess locked as "${lockedMessName}". You can update daily menu only.`, "success");
    }
    await loadCards();
  };

  init();
})();
