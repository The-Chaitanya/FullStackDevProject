(() => {
  const SUPABASE_URL = "https://pdhqcqjyhkptoxlbkiif.supabase.co";
  const SUPABASE_KEY = "sb_publishable_1jt0-lflaREyfVHv2iLahw_Mm9gms5w";
  const TABLE_NAME = "vendor_mess_cards";
  const RATINGS_TABLE = "menu_ratings";
  const USER_LOCATIONS_TABLE = "user_locations";
  const STORAGE_KEY = "messplans_vendor_menus_v1";

  const toIsoDay = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const day = String(safeDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeMenu = (record = {}) => {
    const list = Array.isArray(record.menu_items)
      ? record.menu_items
      : String(record.menu_items || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

    return {
      id: record.id,
      owner_id: record.owner_id || "",
      mess_name: String(record.mess_name || "").trim(),
      tier: String(record.tier || "LIMITED").trim().toUpperCase(),
      price: Number(record.price || 0),
      rating: Number(record.rating || 4.5),
      timings: String(record.timings || "12:00 PM - 3:00 PM").trim(),
      crowd: String(record.crowd || "Medium wait").trim(),
      distance: String(record.distance || "Near campus").trim(),
      special: String(record.special || "Chef special").trim(),
      menu_items: list,
      vegetarian_only: Boolean(record.vegetarian_only),
      menu_date: toIsoDay(record.menu_date),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  };

  const readLocal = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeMenu);
    } catch {
      return [];
    }
  };

  const writeLocal = (rows) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  };

  const createSupabaseClient = () => {
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  };

  const client = createSupabaseClient();

  const fetchRatingSummaryMap = async (menuIds = []) => {
    const ids = Array.from(new Set((menuIds || []).filter(Boolean)));
    if (!client || !ids.length) return {};
    try {
      const { data, error } = await client
        .from(RATINGS_TABLE)
        .select("menu_id, rating")
        .in("menu_id", ids);
      if (error) throw error;
      return (data || []).reduce((acc, row) => {
        const key = row.menu_id;
        const value = Number(row.rating || 0);
        if (!key || !value) return acc;
        if (!acc[key]) acc[key] = { sum: 0, count: 0 };
        acc[key].sum += value;
        acc[key].count += 1;
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const applyRatingsToMenus = async (rows = []) => {
    const map = await fetchRatingSummaryMap(rows.map((row) => row.id));
    return rows.map((row) => {
      const summary = map[row.id];
      if (!summary || !summary.count) {
        return { ...row, rating_count: 0 };
      }
      const avg = summary.sum / summary.count;
      return {
        ...row,
        rating: Number(avg.toFixed(1)),
        rating_count: summary.count,
      };
    });
  };

  const listLocalMenus = ({ date, tier, search, vegetarianOnly } = {}) => {
    const day = toIsoDay(date || new Date());
    return readLocal()
      .filter((menu) => menu.menu_date === day)
      .filter((menu) => (tier && tier !== "ALL" ? menu.tier === tier : true))
      .filter((menu) =>
        vegetarianOnly ? menu.vegetarian_only || menu.menu_items.every((item) => !/chicken|egg|mutton|fish/i.test(item)) : true,
      )
      .filter((menu) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          menu.mess_name.toLowerCase().includes(q) ||
          menu.special.toLowerCase().includes(q) ||
          menu.menu_items.some((item) => item.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  };

  const listMenus = async ({ date, tier = "ALL", search = "", vegetarianOnly = false } = {}) => {
    const day = toIsoDay(date || new Date());
    if (!client) {
      return { rows: listLocalMenus({ date: day, tier, search, vegetarianOnly }), mode: "local" };
    }

    try {
      let query = client
        .from(TABLE_NAME)
        .select("id, owner_id, mess_name, tier, price, rating, timings, crowd, distance, special, menu_items, vegetarian_only, menu_date, updated_at")
        .eq("menu_date", day)
        .order("updated_at", { ascending: false });

      if (tier && tier !== "ALL") query = query.eq("tier", tier);
      if (vegetarianOnly) query = query.eq("vegetarian_only", true);

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data || []).map(normalizeMenu);
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (menu) =>
            menu.mess_name.toLowerCase().includes(q) ||
            menu.special.toLowerCase().includes(q) ||
            menu.menu_items.some((item) => item.toLowerCase().includes(q)),
        );
      }
      rows = await applyRatingsToMenus(rows);
      return { rows, mode: "cloud" };
    } catch {
      return { rows: listLocalMenus({ date: day, tier, search, vegetarianOnly }), mode: "local" };
    }
  };

  const listVendorMenus = async ({ ownerId, date } = {}) => {
    const hasDate = typeof date !== "undefined" && date !== null && String(date).trim() !== "";
    const day = hasDate ? toIsoDay(date) : null;
    if (!client) {
      return {
        rows: readLocal().filter(
          (menu) => (!hasDate || menu.menu_date === day) && (!ownerId || menu.owner_id === ownerId),
        ),
        mode: "local",
      };
    }

    try {
      let query = client
        .from(TABLE_NAME)
        .select("id, owner_id, mess_name, tier, price, rating, timings, crowd, distance, special, menu_items, vegetarian_only, menu_date, updated_at")
        .order("updated_at", { ascending: false });
      if (hasDate) query = query.eq("menu_date", day);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = await applyRatingsToMenus((data || []).map(normalizeMenu));
      return { rows, mode: "cloud" };
    } catch {
      return {
        rows: readLocal().filter(
          (menu) => (!hasDate || menu.menu_date === day) && (!ownerId || menu.owner_id === ownerId),
        ),
        mode: "local",
      };
    }
  };

  const getMenuById = async (id) => {
    const menuId = String(id || "").trim();
    if (!menuId) return null;
    if (!client) {
      return readLocal().find((row) => row.id === menuId) || null;
    }
    try {
      const { data, error } = await client
        .from(TABLE_NAME)
        .select("id, owner_id, mess_name, tier, price, rating, timings, crowd, distance, special, menu_items, vegetarian_only, menu_date, updated_at")
        .eq("id", menuId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [row] = await applyRatingsToMenus([normalizeMenu(data)]);
      return row || null;
    } catch {
      return readLocal().find((row) => row.id === menuId) || null;
    }
  };

  const upsertMenu = async (payload, ownerId) => {
    const safe = normalizeMenu({
      ...payload,
      owner_id: ownerId || payload.owner_id || "",
      id:
        payload.id ||
        (window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`),
      updated_at: new Date().toISOString(),
    });

    if (!safe.mess_name || !safe.menu_items.length) {
      throw new Error("Mess name and at least one menu item are required.");
    }

    if (!client) {
      const all = readLocal();
      const next = [safe, ...all.filter((item) => item.id !== safe.id)];
      writeLocal(next);
      return { row: safe, mode: "local" };
    }

    try {
      const { data, error } = await client.from(TABLE_NAME).upsert(safe, { onConflict: "id" }).select().single();
      if (error) throw error;
      return { row: normalizeMenu(data), mode: "cloud" };
    } catch {
      const all = readLocal();
      const next = [safe, ...all.filter((item) => item.id !== safe.id)];
      writeLocal(next);
      return { row: safe, mode: "local" };
    }
  };

  const deleteMenu = async (id, ownerId) => {
    if (!id) return { mode: "local" };

    if (!client) {
      writeLocal(readLocal().filter((menu) => menu.id !== id));
      return { mode: "local" };
    }

    try {
      let query = client.from(TABLE_NAME).delete().eq("id", id);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const { error } = await query;
      if (error) throw error;
      return { mode: "cloud" };
    } catch {
      writeLocal(readLocal().filter((menu) => menu.id !== id));
      return { mode: "local" };
    }
  };

  const getCurrentUser = async () => {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data?.user || null;
  };

  const getMyMenuRating = async (menuId, userId = "") => {
    if (!client || !menuId) return null;
    const uid = String(userId || "").trim();
    if (!uid) return null;
    try {
      const { data, error } = await client
        .from(RATINGS_TABLE)
        .select("rating")
        .eq("menu_id", menuId)
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data?.rating ? Number(data.rating) : null;
    } catch {
      return null;
    }
  };

  const rateMenu = async ({ menuId, rating, userId = "" } = {}) => {
    if (!client || !menuId) {
      throw new Error("Rating service unavailable.");
    }
    const value = Number(rating || 0);
    if (value < 1 || value > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }
    const uid = String(userId || "").trim();
    if (!uid) {
      throw new Error("Please login to rate.");
    }
    const payload = {
      menu_id: menuId,
      user_id: uid,
      rating: value,
    };
    const { error } = await client.from(RATINGS_TABLE).upsert(payload, { onConflict: "menu_id,user_id" });
    if (error) throw error;
    return true;
  };

  const getUserLocation = async (userId = "", role = "") => {
    if (!client) return null;
    const uid = String(userId || "").trim();
    if (!uid) return null;
    try {
      let query = client
        .from(USER_LOCATIONS_TABLE)
        .select("user_id, role, latitude, longitude, updated_at")
        .eq("user_id", uid);
      if (role) query = query.eq("role", String(role).toLowerCase());
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        user_id: data.user_id,
        role: String(data.role || "").toLowerCase(),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        updated_at: data.updated_at || "",
      };
    } catch {
      return null;
    }
  };

  const saveUserLocation = async ({ userId = "", role = "", latitude, longitude } = {}) => {
    if (!client) throw new Error("Location service unavailable.");
    const uid = String(userId || "").trim();
    const normalizedRole = String(role || "").toLowerCase();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!uid) throw new Error("Missing user id.");
    if (!(normalizedRole === "student" || normalizedRole === "vendor")) {
      throw new Error("Invalid role.");
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid latitude.");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Invalid longitude.");

    const payload = {
      user_id: uid,
      role: normalizedRole,
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from(USER_LOCATIONS_TABLE).upsert(payload, { onConflict: "user_id,role" });
    if (error) throw error;
    return true;
  };

  window.messDataApi = {
    toIsoDay,
    listMenus,
    listVendorMenus,
    getMenuById,
    upsertMenu,
    deleteMenu,
    getCurrentUser,
    getMyMenuRating,
    rateMenu,
    getUserLocation,
    saveUserLocation,
  };
})();
