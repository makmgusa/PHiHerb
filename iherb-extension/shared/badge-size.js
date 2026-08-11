// Single source of truth for the product badge size preference.
// Used by Preferences and the content script (object namespace; no instances needed).
const BadgeSize = {
  KEY: "badgeSize",
  SMALL: "small",
  LARGE: "large",
  DEFAULT: "small",
  CLASS_PREFIX: "iherb-badge-size-",

  /**
   * Coerce any stored value to a known size. Unknown values fall back to Small.
   * @param {unknown} value
   * @returns {"small"|"large"}
   */
  normalize(value) {
    let result = BadgeSize.DEFAULT;
    if (value === BadgeSize.LARGE) {
      result = BadgeSize.LARGE;
    }
    return result;
  },

  /**
   * Apply the size class on the document root so inject.css can select Small or Large.
   * @param {unknown} size
   */
  apply(size) {
    const normalized = BadgeSize.normalize(size);
    const root = document.documentElement;
    root.classList.remove(
      BadgeSize.CLASS_PREFIX + BadgeSize.SMALL,
      BadgeSize.CLASS_PREFIX + BadgeSize.LARGE,
    );
    root.classList.add(BadgeSize.CLASS_PREFIX + normalized);
  },

  /**
   * Read the retained preference from browser.storage.local.
   * @returns {Promise<"small"|"large">}
   */
  async load() {
    const stored = await browser.storage.local.get(BadgeSize.KEY);
    return BadgeSize.normalize(stored[BadgeSize.KEY]);
  },

  /**
   * Persist the preference so it survives browser restarts (no Firefox account needed).
   * @param {unknown} size
   * @returns {Promise<"small"|"large">}
   */
  async save(size) {
    const normalized = BadgeSize.normalize(size);
    await browser.storage.local.set({ [BadgeSize.KEY]: normalized });
    return normalized;
  },

  /**
   * Notify when badgeSize changes in local storage (e.g. Preferences while a tab is open).
   * @param {(size: "small"|"large") => void} onChange
   */
  watch(onChange) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[BadgeSize.KEY]) {
        return;
      }
      onChange(BadgeSize.normalize(changes[BadgeSize.KEY].newValue));
    });
  },
};
