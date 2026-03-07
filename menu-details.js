(() => {
  const api = window.messDataApi;
  if (!api) return;

  const titleEl = document.getElementById("title");
  const metaEl = document.getElementById("meta");
  const itemsEl = document.getElementById("items");
  const detailsEl = document.getElementById("details");
  const starsWrap = document.getElementById("stars");
  const submitBtn = document.getElementById("submitRating");
  const messageEl = document.getElementById("message");

  let currentMenu = null;
  let selectedStar = 0;
  let currentUser = null;

  const paintStars = (value) => {
    selectedStar = Number(value || 0);
    starsWrap?.querySelectorAll("button").forEach((btn) => {
      const star = Number(btn.dataset.star || 0);
      btn.classList.toggle("active", star <= selectedStar);
    });
  };

  const render = (menu) => {
    if (!menu) {
      titleEl.textContent = "Menu not found";
      return;
    }
    titleEl.textContent = menu.mess_name || "Menu";
    const ratingCount = Number(menu.rating_count || 0);
    metaEl.textContent = `${menu.tier}  •  Rs ${Number(menu.price || 0).toFixed(0)}  •  ★ ${Number(menu.rating || 0).toFixed(1)}${ratingCount ? ` (${ratingCount})` : ""}`;
    itemsEl.innerHTML = "";
    (menu.menu_items || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      itemsEl.appendChild(li);
    });
    if (menu.special) {
      const li = document.createElement("li");
      li.textContent = `Special: ${menu.special}`;
      itemsEl.appendChild(li);
    }
    detailsEl.innerHTML = `
      <p><strong>Timings:</strong> ${menu.timings || "-"}</p>
      <p><strong>Crowd:</strong> ${menu.crowd || "-"}</p>
      <p><strong>Distance:</strong> ${menu.distance || "-"}</p>
      <p><strong>Date:</strong> ${menu.menu_date || "-"}</p>
    `;
  };

  const init = async () => {
    const id = new URLSearchParams(window.location.search).get("id");
    currentUser = await api.getCurrentUser();
    currentMenu = await api.getMenuById(id);
    render(currentMenu);

    if (currentMenu && currentUser?.id) {
      const myRating = await api.getMyMenuRating(currentMenu.id, currentUser.id);
      if (myRating) {
        paintStars(myRating);
        messageEl.textContent = `Your rating: ${myRating}/5`;
      }
    }
  };

  starsWrap?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-star]");
    if (!btn) return;
    paintStars(btn.dataset.star);
  });

  submitBtn?.addEventListener("click", async () => {
    if (!currentMenu?.id || !selectedStar) {
      messageEl.textContent = "Select stars first.";
      return;
    }
    if (!currentUser?.id) {
      messageEl.textContent = "Please login first.";
      return;
    }
    submitBtn.disabled = true;
    try {
      await api.rateMenu({ menuId: currentMenu.id, rating: selectedStar, userId: currentUser.id });
      messageEl.textContent = `Thanks! You rated ${selectedStar}/5.`;
      currentMenu = await api.getMenuById(currentMenu.id);
      render(currentMenu);
    } catch (error) {
      messageEl.textContent = error.message || "Could not submit rating.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  init();
})();
