const STORAGE_KEY = "medical-harness-theme";
function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function currentTheme() {
  return (["light", "dark"].includes(getStoredTheme()) ? getStoredTheme() : null) || (systemPrefersDark() ? "dark" : "light");
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#111214" : "#ffffff");
}
function initTheme() {
  applyTheme(currentTheme());
}
function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
  }
  applyTheme(next);
  return next;
}
export {
  applyTheme,
  currentTheme,
  getStoredTheme,
  initTheme,
  toggleTheme
};
