const THEME_STORAGE_KEY = 'skilearn-theme'

export function getThemePreference() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = nextTheme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  } catch {
    // Theme changes still apply for this page when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('skilearn-theme-change', { detail: nextTheme }))
}
