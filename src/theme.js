/** Device-level appearance; learning/account state stays untouched. */
export const THEME_STORAGE_KEY = "wort-theme";
const THEMES = new Set(["light", "dark"]);
const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
const moon = '<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>';
let activeTheme = "light";
let explicitPreference = null;
let initialized = false;
let media;

export function resolveTheme(preference, systemDark = false) {
  return THEMES.has(preference) ? preference : systemDark ? "dark" : "light";
}

function storedPreference() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function currentTheme() {
  if (typeof document !== "undefined") {
    const theme = document.documentElement.dataset.theme;
    if (THEMES.has(theme)) return theme;
  }
  return activeTheme;
}

export function themeLabel() {
  return currentTheme() === "dark" ? "Activar tema claro" : "Activar tema oscuro";
}

function iconMarkup(theme = currentTheme()) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${theme === "dark" ? sun : moon}</svg>`;
}

export function themeButtonMarkup() {
  const label = themeLabel();
  return `<button class="theme-toggle" id="toggle-theme" data-theme-toggle type="button" aria-label="${label}" title="${label}" aria-pressed="${currentTheme() === "dark"}">${iconMarkup()}</button>`;
}

function updateControls() {
  document.querySelectorAll("#toggle-theme,[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", themeLabel());
    button.setAttribute("title", themeLabel());
    button.setAttribute("aria-pressed", String(activeTheme === "dark"));
    button.innerHTML = iconMarkup(activeTheme);
  });
  const select = document.querySelector("#theme-preference");
  if (select) select.value = explicitPreference || "system";
}

function applyTheme(theme) {
  activeTheme = theme;
  if (typeof document === "undefined") return theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", theme === "dark" ? "#18151f" : "#5940c6",
  );
  updateControls();
  return theme;
}

export function setTheme(preference) {
  explicitPreference = THEMES.has(preference) ? preference : null;
  try {
    if (explicitPreference) localStorage.setItem(THEME_STORAGE_KEY, explicitPreference);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // The choice still applies to this page when storage is unavailable.
  }
  return applyTheme(resolveTheme(explicitPreference, media?.matches));
}

export function toggleTheme() {
  return setTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  if (typeof document === "undefined") return activeTheme;
  if (!initialized) {
    initialized = true;
    media = window.matchMedia?.("(prefers-color-scheme: dark)");
    explicitPreference = storedPreference();
    media?.addEventListener("change", () => {
      if (!explicitPreference) applyTheme(resolveTheme(null, media.matches));
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      explicitPreference = storedPreference();
      applyTheme(resolveTheme(explicitPreference, media?.matches));
    });
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#toggle-theme,[data-theme-toggle]")) toggleTheme();
    });
    document.addEventListener("change", (event) => {
      if (event.target?.id === "theme-preference") setTheme(event.target.value);
    });
  }
  return applyTheme(resolveTheme(explicitPreference, media?.matches));
}
