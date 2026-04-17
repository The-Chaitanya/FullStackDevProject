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
  const presetPanel = document.getElementById("presetPanel");
  const presetMenuSelect = document.getElementById("presetMenuSelect");
  const applyPresetBtn = document.getElementById("applyPresetBtn");
  const mapMessage = document.getElementById("mapMessage");
  const statTotalMenus = document.getElementById("statTotalMenus");
  const statLatestDate = document.getElementById("statLatestDate");
  const statPresetCount = document.getElementById("statPresetCount");
  const useCurrentLocationBtn = document.getElementById("useCurrentLocationBtn");
  const openMapsBtn = document.getElementById("openMapsBtn");
  const setMapLocationBtn = document.getElementById("setMapLocationBtn");
  const vendorLocationMap = document.getElementById("vendorLocationMap");
  const vendorMapPreview = document.getElementById("vendorMapPreview");
  const mapsLink = document.getElementById("mapsLink");
  const addressSuggestions = document.getElementById("addressSuggestions");

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

  const dismissSharedPageLoader = () => {
    const loader = document.getElementById("messbuddy-page-loader");
    if (!loader) {
      document.body.classList.remove("page-loader-active");
      return;
    }
    loader.classList.add("is-hidden");
    window.setTimeout(() => {
      document.body.classList.remove("page-loader-active");
      loader.remove();
    }, 400);
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

  const searchAddressSuggestions = async (rawAddress) => {
    const address = String(rawAddress || "").trim();
    if (address.length < 3) return [];
    const response = await fetch(
      `${NOMINATIM_ENDPOINT}/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      throw new Error("Address suggestions are unavailable right now. Please try again.");
    }
    const results = await response.json();
    if (!Array.isArray(results)) return [];
    return results
      .map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        formattedAddress: String(item.display_name || "").trim(),
      }))
      .filter((item) => item.formattedAddress && Number.isFinite(item.lat) && Number.isFinite(item.lng));
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

  const initHoverBorders = () => {
    const targets = Array.from(document.querySelectorAll("button, .ghost-link"));
    let lastPointer = null;
    let prevPointer = null;
    document.addEventListener("pointermove", (event) => {
      prevPointer = lastPointer;
      lastPointer = { x: event.clientX, y: event.clientY };
    });

    const tweenNumber = ({ from, to, duration, onUpdate, onComplete }) => {
      if (!duration) {
        onUpdate(to);
        onComplete?.();
        return null;
      }
      const start = performance.now();
      let frame = 0;
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
        onUpdate(from + (to - from) * eased);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          onComplete?.();
        }
      };
      frame = requestAnimationFrame(tick);
      return {
        stop() {
          cancelAnimationFrame(frame);
        },
      };
    };

    const ensureHoverBorder = (el) => {
      if (el.classList.contains("hover-border-target")) return;
      el.classList.add("hover-border-target");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("hover-border");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");

      const pathForward = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathForward.classList.add("forward");
      const pathBackward = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathBackward.classList.add("backward");
      svg.appendChild(pathForward);
      svg.appendChild(pathBackward);
      el.appendChild(svg);

      let metrics = null;
      let totalLength = 0;
      let lastInside = null;
      let drawAnimation = null;

      const getCurrentDraw = () => parseFloat(window.getComputedStyle(el).getPropertyValue("--draw")) || 0;
      const getTargetDraw = () => {
        const styles = window.getComputedStyle(el);
        const overlap = parseFloat(styles.getPropertyValue("--hover-draw-overlap")) || 0;
        return Math.min(totalLength / 2 + overlap, totalLength || overlap);
      };

      const animateDraw = (to, duration = 520) => {
        drawAnimation?.stop?.();
        const from = getCurrentDraw();
        drawAnimation = tweenNumber({
          from,
          to,
          duration,
          onUpdate: (value) => el.style.setProperty("--draw", `${value}px`),
          onComplete: () => {
            drawAnimation = null;
          },
        });
      };

      const updateGeometry = () => {
        const bounds = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const stroke = parseFloat(styles.getPropertyValue("--hover-stroke")) || 2;
        const gap = parseFloat(styles.getPropertyValue("--hover-gap")) || 0;
        const inset = stroke / 2 + gap;
        const x0 = inset;
        const y0 = inset;
        const x1 = Math.max(bounds.width - inset, inset + 1);
        const y1 = Math.max(bounds.height - inset, inset + 1);
        const width = Math.max(x1 - x0, 1);
        const height = Math.max(y1 - y0, 1);
        const baseRadius = parseFloat(styles.borderRadius) || 0;
        const radius = Math.min(baseRadius, width / 2, height / 2);

        svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
        const d = [
          `M ${x0 + radius} ${y0}`,
          `H ${x1 - radius}`,
          `A ${radius} ${radius} 0 0 1 ${x1} ${y0 + radius}`,
          `V ${y1 - radius}`,
          `A ${radius} ${radius} 0 0 1 ${x1 - radius} ${y1}`,
          `H ${x0 + radius}`,
          `A ${radius} ${radius} 0 0 1 ${x0} ${y1 - radius}`,
          `V ${y0 + radius}`,
          `A ${radius} ${radius} 0 0 1 ${x0 + radius} ${y0}`,
          "Z",
        ].join(" ");
        pathForward.setAttribute("d", d);
        pathBackward.setAttribute("d", d);

        try {
          totalLength = pathForward.getTotalLength();
        } catch {
          totalLength = 2 * (width + height);
        }
        el.style.setProperty("--perimeter", `${Math.max(totalLength, 1)}px`);
        metrics = { bounds };
      };

      const findClosestLength = (x, y) => {
        if (!totalLength || typeof pathForward.getPointAtLength !== "function") {
          return 0;
        }
        const samples = 160;
        let bestLen = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i <= samples; i += 1) {
          const len = (i / samples) * totalLength;
          const pt = pathForward.getPointAtLength(len);
          const dx = pt.x - x;
          const dy = pt.y - y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestLen = len;
          }
        }
        return bestLen;
      };

      const setStartFromPoint = (clientX, clientY) => {
        if (!metrics) return;
        const localX = clientX - metrics.bounds.left;
        const localY = clientY - metrics.bounds.top;
        const length = findClosestLength(localX, localY);
        el.style.setProperty("--start", `${Math.max(length, 0)}px`);
      };

      updateGeometry();
      el.style.setProperty("--draw", "0px");

      el.addEventListener("pointerenter", (event) => {
        updateGeometry();
        const ref = prevPointer || lastPointer || { x: event.clientX, y: event.clientY };
        setStartFromPoint(ref.x, ref.y);
        lastInside = { x: event.clientX, y: event.clientY };
        el.classList.add("hover-border-active");
        animateDraw(getTargetDraw(), 520);
      });

      el.addEventListener("pointermove", (event) => {
        lastInside = { x: event.clientX, y: event.clientY };
      });

      el.addEventListener("pointerleave", (event) => {
        const ref = lastInside || prevPointer || lastPointer || { x: event.clientX, y: event.clientY };
        setStartFromPoint(ref.x, ref.y);
        lastInside = null;
        animateDraw(0, 420);
        window.setTimeout(() => {
          if ((parseFloat(window.getComputedStyle(el).getPropertyValue("--draw")) || 0) <= 0.5) {
            el.classList.remove("hover-border-active");
          }
        }, 430);
      });

      window.addEventListener("resize", updateGeometry);
      if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(updateGeometry);
        observer.observe(el);
      }
    };

    targets.forEach(ensureHoverBorder);
  };

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
      setMapMessage("");
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
      lastResolvedAddress = formattedAddress;
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
    if (text && type === "error") {
      mapMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const clearAddressSuggestions = () => {
    if (!addressSuggestions) return;
    addressSuggestions.innerHTML = "";
    addressSuggestions.hidden = true;
  };

  const renderAddressSuggestions = (items) => {
    if (!addressSuggestions) return;
    addressSuggestions.innerHTML = "";
    if (!Array.isArray(items) || !items.length) {
      addressSuggestions.hidden = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "address-suggestion-item";
      button.textContent = item.formattedAddress;
      button.addEventListener("mousedown", () => {
        selectingSuggestion = true;
      });
      button.addEventListener("click", async () => {
        lastResolvedAddress = item.formattedAddress;
        clearAddressSuggestions();
        await applyResolvedLocation(
          { lat: item.lat, lng: item.lng },
          {
            formattedAddress: item.formattedAddress,
            persist: true,
            message: "Address selected and location updated.",
          },
        );
        window.setTimeout(() => {
          selectingSuggestion = false;
        }, 0);
      });
      fragment.appendChild(button);
    });
    addressSuggestions.appendChild(fragment);
    addressSuggestions.hidden = false;
  };

  const handleNoAddressMatch = () => {
    clearAddressSuggestions();
    setMapMessage("Address not found. Drop a pin with Map Picker to set your mess location.", "error");
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
      lastResolvedAddress = address;
    }
  };

  let currentUser = null;
  let vendorMenusAll = [];
  let lockedMessName = "";
  let lockedMessCoords = "";
  let locationMap = null;
  let locationMarker = null;
  let pendingMapCoords = null;
  let addressSuggestTimer = null;
  let addressSuggestRequestId = 0;
  let lastResolvedAddress = "";
  let selectingSuggestion = false;

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

  const formatPresetLabel = (menu) => {
    const dishPreview = Array.isArray(menu.menu_items) && menu.menu_items.length ? menu.menu_items.slice(0, 2).join(", ") : "Menu";
    return `${menu.menu_date} - ${menu.tier} - ${dishPreview}`;
  };

  const renderPresetOptions = () => {
    if (!presetPanel || !presetMenuSelect) return;
    const rows = Array.isArray(vendorMenusAll) ? [...vendorMenusAll] : [];
    const usableRows = rows
      .filter((menu) => menu && menu.id)
      .sort((a, b) => String(b.menu_date).localeCompare(String(a.menu_date)));

    presetMenuSelect.innerHTML = '<option value="">Choose a previous menu</option>';
    usableRows.forEach((menu) => {
      const option = document.createElement("option");
      option.value = menu.id;
      option.textContent = formatPresetLabel(menu);
      presetMenuSelect.appendChild(option);
    });
    presetPanel.hidden = usableRows.length === 0;
  };

  const renderDashboardStats = () => {
    const rows = Array.isArray(vendorMenusAll) ? vendorMenusAll : [];
    if (statTotalMenus) {
      statTotalMenus.textContent = String(rows.length);
    }
    if (statLatestDate) {
      const latest = rows
        .map((menu) => String(menu.menu_date || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))[0];
      statLatestDate.textContent = latest || "-";
    }
    if (statPresetCount) {
      statPresetCount.textContent = String(rows.filter((menu) => menu && menu.id).length);
    }
  };

  const resetForm = () => {
    form.reset();
    fields.menuId.value = "";
    fields.menuDate.value = api.toIsoDay(new Date());
    fields.tier.value = "UNLIMITED";
    if (fields.messCoords) fields.messCoords.value = lockedMessCoords || "";
    if (fields.mapsLink) fields.mapsLink.value = "";
    clearAddressSuggestions();
    lastResolvedAddress = "";
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

  const fillForm = (menu, options = {}) => {
    const { mode = "edit" } = options;
    const parsedGeo = parseGeoMeta(menu.distance);
    const activeDate = fields.menuDate.value || api.toIsoDay(new Date());
    fields.menuId.value = mode === "edit" ? menu.id : "";
    fields.tier.value = menu.tier;
    fields.menuDate.value = mode === "edit" ? menu.menu_date : activeDate;
    fields.price.value = menu.price;
    fields.timings.value = menu.timings;
    fields.crowd.value = menu.crowd;
    fields.distance.value = parsedGeo.display;
    lastResolvedAddress = parsedGeo.display;
    fields.messCoords.value =
      parsedGeo.lat !== null && parsedGeo.lng !== null ? `${parsedGeo.lat},${parsedGeo.lng}` : lockedMessCoords;
    if (fields.mapsLink) fields.mapsLink.value = "";
    clearAddressSuggestions();
    const coords = parsedGeo.lat !== null && parsedGeo.lng !== null ? { lat: parsedGeo.lat, lng: parsedGeo.lng } : null;
    pendingMapCoords = coords;
    updateMapPreview(coords);
    initLocationMap().then(() => setMapMarker(coords)).catch(() => {
      setMapMessage("Map picker could not load.", "error");
    });
    fields.menuItems.value = menu.menu_items.join("\n");
    fields.special.value = menu.special;
    fields.vegetarianOnly.checked = Boolean(menu.vegetarian_only);
    formTitle.textContent = mode === "edit" ? "Edit Daily Menu Card" : "Create Daily Menu Card";
    submitBtn.textContent = mode === "edit" ? "Update Menu Card" : "Save Menu Card";
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
    if (!payload.distance || !fields.messCoords?.value.trim()) {
      return "Select a valid address from suggestions, map, or current location.";
    }
    if (fields.distance.value.trim() !== lastResolvedAddress.trim()) {
      return "Please choose an address from the suggestions first.";
    }
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
    renderPresetOptions();
    renderDashboardStats();
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
      fillForm(row, { mode: "edit" });
      setMessage("Editing selected card.");
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadCards());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetForm);
  }

  if (applyPresetBtn) {
    applyPresetBtn.addEventListener("click", () => {
      const selectedId = String(presetMenuSelect?.value || "").trim();
      if (!selectedId) {
        setMessage("Choose a previous menu first.", "error");
        return;
      }
      const selectedMenu = vendorMenusAll.find((menu) => menu.id === selectedId);
      if (!selectedMenu) {
        setMessage("That preset is no longer available. Refresh and try again.", "error");
        return;
      }
      fillForm(selectedMenu, { mode: "preset" });
      setMessage("Preset loaded. Review the menu and save it for the selected date.", "success");
    });
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
        clearAddressSuggestions();
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
            clearAddressSuggestions();
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
          lastResolvedAddress = fields.distance.value.trim();
          clearAddressSuggestions();
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
    fields.distance.addEventListener("input", () => {
      const query = fields.distance.value.trim();
      if (query !== lastResolvedAddress) {
        fields.messCoords.value = "";
      }
      if (addressSuggestTimer) {
        window.clearTimeout(addressSuggestTimer);
      }
      if (query.length < 3) {
        clearAddressSuggestions();
        return;
      }
      const requestId = ++addressSuggestRequestId;
      addressSuggestTimer = window.setTimeout(async () => {
        try {
          const items = await searchAddressSuggestions(query);
          if (requestId !== addressSuggestRequestId) return;
          if (!items.length) {
            handleNoAddressMatch();
            return;
          }
          renderAddressSuggestions(items);
        } catch {
          if (requestId !== addressSuggestRequestId) return;
          clearAddressSuggestions();
        }
      }, 260);
    });

    fields.distance.addEventListener("blur", () => {
      if (selectingSuggestion) return;
      window.setTimeout(() => {
        clearAddressSuggestions();
      }, 180);
      const address = fields.distance.value.trim();
      if (!address || fields.messCoords.value.trim() || address === lastResolvedAddress) return;
      handleNoAddressMatch();
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
          lastResolvedAddress = fields.distance.value.trim();
          clearAddressSuggestions();
          setMapMessage("Coordinates set.", "success");
        })
        .catch(() => {
          setMapMessage("Map picker could not load.", "error");
        });
    });
  }

  document.addEventListener("click", (event) => {
    if (!addressSuggestions || !fields.distance) return;
    const target = event.target;
    if (
      target === fields.distance ||
      addressSuggestions.contains(target)
    ) {
      return;
    }
    clearAddressSuggestions();
  });

  const init = async () => {
    const allowed = await ensureVendorRole();
    if (!allowed) return;
    initHoverBorders();
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
    lastResolvedAddress = fields.distance?.value.trim() || "";
    updateMapPreview(startupCoords);
    setMapMarker(startupCoords);
    await refreshVendorMenusAll();
    if (lockedMessName) {
      setMessage(`Mess locked as "${lockedMessName}". You can update daily menu only.`, "success");
    }
    await loadCards();
    document.body.classList.add("page-loaded");
    dismissSharedPageLoader();
  };

  init();
})();
