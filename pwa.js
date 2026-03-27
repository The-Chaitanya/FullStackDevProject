(() => {
  let deferredInstallPrompt = null;
  let helpToastTimer = null;

  const installTargets = () => Array.from(document.querySelectorAll("[data-pwa-install]"));
  const installHelpTarget = () => document.querySelector("[data-pwa-install-help]");

  const setInstallVisibility = (visible) => {
    installTargets().forEach((element) => {
      element.hidden = !visible;
    });
  };

  const showInstallHelp = () => {
    const toast = installHelpTarget();
    if (!toast) return;
    toast.hidden = false;
    window.clearTimeout(helpToastTimer);
    helpToastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  };

  const wireInstallButtons = () => {
    installTargets().forEach((element) => {
      if (element.dataset.pwaBound === "true") return;
      element.dataset.pwaBound = "true";
      element.addEventListener("click", async () => {
        if (!deferredInstallPrompt) {
          showInstallHelp();
          return;
        }
        deferredInstallPrompt.prompt();
        try {
          await deferredInstallPrompt.userChoice;
        } catch {
          // Ignore prompt cancellation.
        }
        deferredInstallPrompt = null;
        setInstallVisibility(false);
      });
    });
  };

  if (!("serviceWorker" in navigator)) return;

  const register = async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch {
      // Service worker registration failure should not break the site.
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", register, { once: true });
  } else {
    register();
  }

  const setupInstallPrompt = () => {
    wireInstallButtons();
    setInstallVisibility(false);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      setInstallVisibility(true);
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      setInstallVisibility(false);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInstallPrompt, { once: true });
  } else {
    setupInstallPrompt();
  }
})();
