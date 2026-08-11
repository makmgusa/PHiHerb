// Main content script for the Price Helper for iHerb extension.
// Calculates unit prices for pill/supplement products on listing pages
// and displays color-coded badges indicating relative price within the category.

// Shared matching constants are loaded before this content script.
// Read version from manifest.json.
const VERSION = browser.runtime.getManifest().version;

// Runtime flags populated from config.json before any scan runs.
// Defaults keep the extension working if config loading fails.
let debug = false;
let beta = false;

// Debug telemetry for the optional panel shown when config.json enables debug.
const debugScanTelemetry = {
  nextScanReason: "direct",
  lastScanReason: "not run",
  lastScanAt: "n/a",
  scanCount: 0,
  bodyMutationBatches: 0,
  navigationMutationBatches: 0,
  pageshowCount: 0,
  pageshowPersistedCount: 0,
  lastEventDeltas: {
    bodyMutationBatches: 0,
    navigationMutationBatches: 0,
    pageshowCount: 0,
    pageshowPersistedCount: 0,
  },
  previousEventTotals: {
    bodyMutationBatches: 0,
    navigationMutationBatches: 0,
    pageshowCount: 0,
    pageshowPersistedCount: 0,
  },
};

/**
 * Category is the parent for all products. Name is the key.
 * Maintains high and low price points.
 */
class Category {
  // Reuse existing instances so price ranges accumulate across rescans.
  static registry = new Map();

  /**
   * @param {{ name: string, lowPrice?: number|null, highPrice?: number|null }} args
   */
  constructor({ name, lowPrice = null, highPrice = null }) {
    /** @type {string} */
    this.name = name;
    /** @type {number|null} */
    this.lowPrice = lowPrice;
    /** @type {number|null} */
    this.highPrice = highPrice;
  }

  /**
   * Create a Category from raw page text, normalizing the name.
   * @param {string} rawName
   * @returns {Category|null}
   */
  static setCategory(rawName) {
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      return null;
    }
    const normalizedName = trimmedName.toLowerCase().replace(/\s+/g, " ");
    if (Category.registry.has(normalizedName)) {
      return Category.registry.get(normalizedName);
    }
    const category = new Category({ name: normalizedName });
    Category.registry.set(normalizedName, category);
    return category;
  }

  /**
   * Update this category's high and low prices
   * @param {number} unitPrice
   */
  recordObservedUnitPrice(unitPrice) {
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return;
    }
    if (this.lowPrice === null || unitPrice < this.lowPrice) {
      this.lowPrice = unitPrice;
    }
    if (this.highPrice === null || unitPrice > this.highPrice) {
      this.highPrice = unitPrice;
    }
  }

  /** @type {string} sessionStorage key for the serialized registry */
  static SESSION_KEY = "iherb-upc-category-registry";

  /**
   * Hydrate the in memory registry from sessionStorage so category price
   * ranges survive full page reloads within the same browser tab.
   */
  static restoreFromSession() {
    try {
      const raw = sessionStorage.getItem(Category.SESSION_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      for (const [name, data] of Object.entries(parsed)) {
        if (Category.registry.has(name)) {
          continue;
        }
        const low = data.lowPrice;
        const high = data.highPrice;
        // Accept positive finite numbers or null; skip anything else.
        const validLow =
          low === null || (Number.isFinite(low) && low > 0) ? low : null;
        const validHigh =
          high === null || (Number.isFinite(high) && high > 0) ? high : null;
        const category = new Category({
          name,
          lowPrice: validLow,
          highPrice: validHigh,
        });
        Category.registry.set(name, category);
      }
    } catch {
      // sessionStorage unavailable or corrupt data - start with empty registry.
    }
  }

  /**
   * Persist the current in memory registry to sessionStorage so it can be
   * restored after a full page reload.
   */
  static persistToSession() {
    try {
      const serialized = {};
      for (const [name, category] of Category.registry) {
        serialized[name] = {
          lowPrice: category.lowPrice,
          highPrice: category.highPrice,
        };
      }
      sessionStorage.setItem(Category.SESSION_KEY, JSON.stringify(serialized));
    } catch {
      // sessionStorage full or unavailable - silently skip.
    }
  }
}

/**
 * Product is the child for all categories. Name is the key
 * Maintains price, unit price, price tier, product name and currency symbol
 */

class Product {
  /**
   * @param {{ category: Category, name: string, price: number, currencySymbol: string }} args
   */
  constructor({ category, name, price, currencySymbol }) {
    /** @type {Category} */
    this.category = category;
    /** @type {string} */
    this.name = name;
    /** @type {number} */
    this.price = price;
    /** @type {string} */
    this.currencySymbol = currencySymbol;
    /** @type {number|null} */
    this.unitPrice = null;
    /** @type {string} */
    this.priceTier = "mid";
    /** @type {string} */
    this.priceLabel = "mid price";
  }

  /**
   * Parse quantity from this product's title, matching count-based units.
   * @returns {{ quantity: number }|null}
   */
  parseQuantity() {
    const quantityMatch = this.name.match(PILL_QUANTITY_PATTERN);
    if (!quantityMatch) {
      return null;
    }
    const quantity = Number.parseInt(quantityMatch[1], 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }
    return { quantity };
  }

  /**
   * Compute unit price from this product's price and parsed quantity.
   * Updates the category's observed range on success.
   * @returns {boolean}
   */
  computeUnitPrice() {
    const parsed = this.parseQuantity();
    if (!parsed) {
      // Phase 3.66 temporary: quantity miss -> unmatched-log classification.
      // Cleanup: remove this call with unmatched-log.js / manifest entry.
      UnmatchedLog.recordMiss(this.name);
      return false;
    }
    const unitPrice = this.price / parsed.quantity;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return false;
    }
    this.unitPrice = unitPrice;
    this.category.recordObservedUnitPrice(unitPrice);
    // Phase 3.66 temporary: matched count only (coverage %).
    // Cleanup: remove this call with unmatched-log.js / manifest entry.
    UnmatchedLog.recordMatch(this.name);
    return true;
  }

  /**
   * Parse the displayed price text into numeric value and symbol.
   * @param {HTMLElement} rootElement
   * @returns {{ value: number, currencySymbol: string }|null}
   */
  static parsePrice(rootElement) {
    const priceElement = rootElement.querySelector(".price");
    const rawPriceText = (priceElement?.textContent || "").trim();
    if (!rawPriceText) {
      return null;
    }
    const numericPart = rawPriceText.replace(/[^0-9.,]/g, "");
    const normalizedNumber = numericPart.replace(/,/g, "");
    const value = Number.parseFloat(normalizedNumber);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    const symbolMatch = rawPriceText.match(/[^0-9.,\s]/);
    const currencySymbol = symbolMatch ? symbolMatch[0] : "$";
    return { value, currencySymbol };
  }

  /**
   * Parse one product tile into a Product.
   * @param {HTMLElement} rootElement
   * @param {Category} category
   * @returns {Product|null}
   */
  static scanTile(rootElement, category) {
    try {
      /** @type {HTMLAnchorElement | null} */
      const linkElement = rootElement.querySelector(
        PRODUCT_LINK_SELECTOR,
      );

      const name = (
        linkElement?.getAttribute(PRODUCT_NAME_ATTRIBUTE) || ""
      ).trim();
      if (!name) {
        return null;
      }

      const parsedPrice = Product.parsePrice(rootElement);
      if (!parsedPrice) {
        return null;
      }

      const product = new Product({
        category,
        name,
        price: parsedPrice.value,
        currencySymbol: parsedPrice.currencySymbol,
      });

      if (!product.computeUnitPrice()) {
        return null;
      }
      return product;
    } catch (err) {
      if (debug) {
        console.error("[iHerb UnitPrice] scanTile failed:", err);
      }
      return null;
    }
  }

  /**
   * Set tier from where this product's unit price sits in the category's
   * observed min/max range.
   */
  setPriceTier() {
    const low = this.category.lowPrice;
    const high = this.category.highPrice;
    let tier = "mid";
    if (
      low != null &&
      high != null &&
      high > low &&
      Number.isFinite(this.unitPrice)
    ) {
      const rel = (this.unitPrice - low) / (high - low);
      if (rel < 0.25) {
        tier = "low";
      } else if (rel > 0.75) {
        tier = "high";
      }
    }
    this.priceTier = tier;
    this.priceLabel = `${tier} price`;
  }

  /**
   * Render this product into a product tile as a unit price badge (see inject.css).
   * @param {HTMLElement} rootElement
   */
  renderBadge(rootElement) {
    let badgeNode = rootElement.querySelector(".iherb-unit-price-badge");
    if (!(badgeNode instanceof HTMLSpanElement)) {
      badgeNode?.remove();
      badgeNode = document.createElement("span");
    }
    badgeNode.className = `iherb-unit-price-badge iherb-dot-`+this.priceTier;

    // Rebuild the badge contents so repeat scans can refresh the page-relative
    // color without accumulating duplicate indicator nodes.
    badgeNode.replaceChildren();

    const valueNode = document.createElement("span");
    valueNode.className = "iherb-unit-price-text";
    valueNode.textContent =
      `${this.currencySymbol}${this.unitPrice.toFixed(2)}/unit`;
    badgeNode.title = `Price Helper: ${this.priceLabel}`;
    badgeNode.setAttribute(
      "aria-label",
      `${valueNode.textContent}; ${this.priceLabel}.`,
    );
    badgeNode.append(valueNode);

    // Show a subtle marker while running as a beta build.
    if (beta) {
      const betaMarker = document.createElement("span");
      betaMarker.className = "iherb-beta-marker";
      betaMarker.textContent = "beta";
      betaMarker.setAttribute("aria-hidden", "true");
      badgeNode.append(betaMarker);
    }

    /** @type {HTMLElement | null} */
    const priceElement = rootElement.querySelector(".price");
    if (priceElement?.parentElement) {
      if (!badgeNode.parentElement) {
        priceElement.parentElement.appendChild(badgeNode);
      }
      return;
    }

    if (!badgeNode.parentElement) {
      rootElement.appendChild(badgeNode);
    }
  }
}

/**
 * CSS selector that roughly matches product tiles on iHerb listing pages.
 * Using `.product-cell` as a general container works for many layouts and
 * can be updated in later phases if the DOM structure changes.
 */
const productTileSelector = ".product-cell, .product-inner, .product";
const excludedProductTileSelector = ".product.live-item";
const navigationHydrationScanDelaysMs = [300, 800, 1300];

/**
 * Identify product-looking cards that belong to non-listing widgets.
 * iHerb Live cards share `.product` but should not affect listing ranges.
 * @param {HTMLElement} productTile
 * @returns {boolean}
 */
function isExcludedProductTile(productTile) {
  let excluded = false;

  if (productTile.closest(excludedProductTileSelector)) {
    excluded = true;
  }

  return excluded;
}

/**
 * Return only product tile roots that should participate in listing scans.
 * @returns {HTMLElement[]}
 */
function getScannableProductTiles() {
  const tiles = [];

  for (const productTile of document.querySelectorAll(productTileSelector)) {
    if (
      productTile instanceof HTMLElement &&
      !isExcludedProductTile(productTile)
    ) {
      tiles.push(productTile);
    }
  }

  return tiles;
}

/**
 * Note why the next scanProducts() call is expected for debug-panel telemetry.
 * @param {string} reason
 */
function noteNextScanReason(reason) {
  debugScanTelemetry.nextScanReason = reason;
}

/**
 * Record scan timing for the debug panel without changing scan behavior.
 */
function recordDebugScanStart() {
  debugScanTelemetry.lastEventDeltas.bodyMutationBatches =
    debugScanTelemetry.bodyMutationBatches -
    debugScanTelemetry.previousEventTotals.bodyMutationBatches;
  debugScanTelemetry.lastEventDeltas.navigationMutationBatches =
    debugScanTelemetry.navigationMutationBatches -
    debugScanTelemetry.previousEventTotals.navigationMutationBatches;
  debugScanTelemetry.lastEventDeltas.pageshowCount =
    debugScanTelemetry.pageshowCount -
    debugScanTelemetry.previousEventTotals.pageshowCount;
  debugScanTelemetry.lastEventDeltas.pageshowPersistedCount =
    debugScanTelemetry.pageshowPersistedCount -
    debugScanTelemetry.previousEventTotals.pageshowPersistedCount;
  debugScanTelemetry.previousEventTotals.bodyMutationBatches =
    debugScanTelemetry.bodyMutationBatches;
  debugScanTelemetry.previousEventTotals.navigationMutationBatches =
    debugScanTelemetry.navigationMutationBatches;
  debugScanTelemetry.previousEventTotals.pageshowCount =
    debugScanTelemetry.pageshowCount;
  debugScanTelemetry.previousEventTotals.pageshowPersistedCount =
    debugScanTelemetry.pageshowPersistedCount;
  debugScanTelemetry.lastScanReason = debugScanTelemetry.nextScanReason;
  debugScanTelemetry.lastScanAt = new Date().toLocaleTimeString();
  debugScanTelemetry.scanCount += 1;
  debugScanTelemetry.nextScanReason = "direct";
}

/**
 * Clear pending delayed scans from a superseded navigation.
 * @param {number[]} scanTimeouts
 */
function clearScheduledScans(scanTimeouts) {
  for (const scanTimeout of scanTimeouts) {
    clearTimeout(scanTimeout);
  }

  scanTimeouts.length = 0;
}

/**
 * iHerb can update URL/header before catalog tiles finish hydrating.
 * Follow-up scans keep badges in sync without observing every tile mutation.
 * @param {number[]} scanTimeouts
 * @param {string} reasonPrefix
 */
function scheduleNavigationHydrationScans(scanTimeouts, reasonPrefix) {
  clearScheduledScans(scanTimeouts);

  for (const delay of navigationHydrationScanDelaysMs) {
    const scanTimeout = setTimeout(() => {
      noteNextScanReason(`${reasonPrefix} ${delay}ms`);
      scanProducts();
    }, delay);
    scanTimeouts.push(scanTimeout);
  }
}

/**
 * Return the page element that labels the current listing.
 * Category pages use h1.sub-header-title; search results pages use
 * .sub-sort-title.display-items. Falls back to null if neither is present.
 * @returns {HTMLElement|null}
 */
function getHeaderNode() {
  return (
    document.querySelector("h1.sub-header-title") ??
    document.querySelector(".sub-sort-title.display-items")
  );
}

/**
 * Extract a category name from the header node
 * On search pages the node contains a child span with the quoted search term
 * (e.g. \u201CC\u201D); strip the curly quotes to get a clean key.
 * On category pages the node's full textContent is already the category name.
 * @param {HTMLElement} headerNode
 * @returns {string}
 */
function getCategoryName(headerNode) {
  const cleanHeaderNode = headerNode.cloneNode(true);
  cleanHeaderNode.querySelector("#iherb-category-range-badge")?.remove();

  const spanText = cleanHeaderNode.querySelector("span")?.textContent;
  if (spanText) {
    return spanText.replace(/["\u201C\u201D]/g, "").trim();
  }
  return cleanHeaderNode.textContent.trim();
}

/**
 * Render the observed category range beside the category header.
 * @param {Category} category
 * @param {HTMLElement|null} headerNode
 */
function renderCategoryRangeBadge(category, headerNode) {
  const BADGE_ID = "iherb-category-range-badge";
  let badgeNode = document.getElementById(BADGE_ID);
  const low = category.lowPrice;
  const high = category.highPrice;
  const hasRange = low != null && high != null && high > low;
  const searchLinkNode = document.querySelector(".sub-header-link.modernized");
  const isSearchHeader = headerNode?.matches(".sub-sort-title.display-items");

  if (!headerNode || !hasRange) {
    badgeNode?.remove();
    return;
  }

  if (!(badgeNode instanceof HTMLSpanElement)) {
    badgeNode?.remove();
    badgeNode = document.createElement("span");
    badgeNode.id = BADGE_ID;
  }

  if (isSearchHeader) {
    searchLinkNode.after(badgeNode);
  } else {
    headerNode.append(badgeNode);
  }

  badgeNode.className = "iherb-category-range-badge";
  badgeNode.textContent = `Price Helper range: $${low.toFixed(2)}-$${high.toFixed(2)}/unit`;
  badgeNode.title = "Price Helper observed category range";
}

/**
 * DEBUG: Render a floating panel near the page header showing the current
 * Category state and the computed tier boundaries so we can visually verify
 * that category detection and price range tracking are working. Also shows version number.
 * @param {Category} category
 */
function renderDebugPanel(category) {
  const PANEL_ID = "iherb-debug-panel";
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    const headerNode = getHeaderNode();
    if (headerNode?.parentElement) {
      headerNode.parentElement.insertBefore(panel, headerNode.nextSibling);
    } else {
      document.body.prepend(panel);
    }
  }

  const low = category.lowPrice;
  const high = category.highPrice;
  const hasRange = low != null && high != null && high > low;

  // Tier boundaries mirror setPriceTier(): low < 25%, mid 25-75%, high > 75%.
  const rangeSpan = hasRange ? high - low : 0;
  const lowCeil = hasRange ? (low + rangeSpan * 0.25).toFixed(4) : "-";
  const highFloor = hasRange ? (low + rangeSpan * 0.75).toFixed(4) : "-";

  const fmt = (v) => (v != null ? v.toFixed(4) : "null");
  const productLinks = document.querySelectorAll(
    PRODUCT_LINK_SELECTOR,
  ).length;
  const tiles = document.querySelectorAll(productTileSelector).length;
  const scannableTiles = getScannableProductTiles().length;
  const badges = document.querySelectorAll(".iherb-unit-price-badge").length;
  const liveExcluded = document.querySelectorAll(
    excludedProductTileSelector,
  ).length;

  panel.textContent = [
    `v${VERSION}`,
    `Category: "${category.name}"`,
    `lowPrice: ${fmt(low)}  |  highPrice: ${fmt(high)}`,
    `Low range: ≤ ${lowCeil}  |  Mid range: ${lowCeil} – ${highFloor}  |  High range: ≥ ${highFloor}`,
    `Scan: ${debugScanTelemetry.lastScanReason} @ ${debugScanTelemetry.lastScanAt} (#${debugScanTelemetry.scanCount})`,
    `Counts: links ${productLinks} | tiles ${tiles} | scannable ${scannableTiles} | badges ${badges} | live excluded ${liveExcluded}`,
    `Events total: body mutations ${debugScanTelemetry.bodyMutationBatches} | nav mutations ${debugScanTelemetry.navigationMutationBatches} | pageshow ${debugScanTelemetry.pageshowCount} | persisted ${debugScanTelemetry.pageshowPersistedCount}`,
    `Events latest: body mutations +${debugScanTelemetry.lastEventDeltas.bodyMutationBatches} | nav mutations +${debugScanTelemetry.lastEventDeltas.navigationMutationBatches} | pageshow +${debugScanTelemetry.lastEventDeltas.pageshowCount} | persisted +${debugScanTelemetry.lastEventDeltas.pageshowPersistedCount}`,
  ].join("  ·  ");
}

/**
 * Scan listing tiles and inject unit prices where data is valid.
 * Safe to call repeatedly because each pass rebuilds page-local badge state.
 */
function scanProducts() {
  try {
    recordDebugScanStart();

    const headerNode = getHeaderNode();
    const rawCategoryName = headerNode
      ? getCategoryName(headerNode)
      : "All Products";
    const category = Category.setCategory(rawCategoryName);
    if (!category) {
      return;
    }
    
    // Pass 1: build products for each qualifying tile.
    const pageEntries = [];
    for (const productTile of getScannableProductTiles()) {
      const tileProduct = Product.scanTile(productTile, category);
      if (!tileProduct) {
        productTile.querySelector(".iherb-unit-price-badge")?.remove();
        continue;
      }
      pageEntries.push({ productTile, tileProduct });
    }

    // Pass 2: color tiers from category low/high range (set in pass 1).
    for (const entry of pageEntries) {
      entry.tileProduct.setPriceTier();
      entry.tileProduct.renderBadge(entry.productTile);
    }

    // Persist updated category ranges so they survive full page reloads.
    Category.persistToSession();
    renderCategoryRangeBadge(category, headerNode);

    if (debug) {
      renderDebugPanel(category);
    }
  } catch (err) {
    if (debug) {
      console.error("[iHerb UnitPrice] scanProducts failed:", err);
    }
  }
}

/**
 * Watch for SPA navigations and re-scan when the page changes.
 * Detects two kinds of navigation that don't re-inject the content script:
 *  - Category switch: h1 title text changes (e.g. CoQ10 → Vitamin B).
 *  - Pagination: URL changes while h1 stays the same (e.g. page 1 → 2).
 * Both checks piggyback on DOM mutations that iHerb triggers during navigation.
 * iHerb can hydrate catalog tiles after the first mutation, so scans are
 * scheduled in a short series rather than as a single debounce.
 */
function observePageChanges() {
  let lastCategoryText = (getHeaderNode()?.textContent || "").trim();
  let lastUrl = location.href;
  const hydrationScanTimeouts = [];

  const observer = new MutationObserver(() => {
    debugScanTelemetry.bodyMutationBatches += 1;

    const currentText = (getHeaderNode()?.textContent || "").trim();
    const currentUrl = location.href;

    const categoryChanged = currentText && currentText !== lastCategoryText;
    const urlChanged = currentUrl !== lastUrl;

    if (categoryChanged) {
      lastCategoryText = currentText;
    }
    if (urlChanged) {
      lastUrl = currentUrl;
    }

    if (!categoryChanged && !urlChanged) {
      return;
    }

    debugScanTelemetry.navigationMutationBatches += 1;
    scheduleNavigationHydrationScans(
      hydrationScanTimeouts,
      "mutation url/category",
    );
  });

  if (!document.body) {
    return;
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Re-scan when browser back/forward restores the page from bfcache.
 * DOMContentLoaded and MutationObserver callbacks do not reliably fire then.
 */
function observeBackForwardCacheRestores() {
  let restoreTimeout;

  window.addEventListener("pageshow", (event) => {
    debugScanTelemetry.pageshowCount += 1;

    if (!event.persisted) {
      return;
    }

    debugScanTelemetry.pageshowPersistedCount += 1;
    noteNextScanReason("pageshow persisted");
    clearTimeout(restoreTimeout);
    restoreTimeout = setTimeout(scanProducts, 300);
  });
}

/**
 * Fetch runtime configuration from config.json bundled with the extension.
 * Returns an empty object if the file is missing or unreadable so callers
 * can safely fall back to module-level defaults.
 * @returns {Promise<object>}
 */
async function loadConfig() {
  try {
    const response = await fetch(browser.runtime.getURL("config.json"));
    if (!response.ok) {
      console.warn(`[iHerb UnitPrice] config.json fetch failed: ${response.status}`);
      return {};
    }
    return await response.json();
  } catch (err) {
    console.warn("[iHerb UnitPrice] config.json could not be loaded:", err);
    return {};
  }
}

/**
 * Load config, then initialize scanning and page-change observation.
 * Waits for DOMContentLoaded if the page is still loading when config resolves.
 */
async function init() {
  const config = await loadConfig();
  debug = config.debug === true;
  // previously in config.json. Moved to code so developers absolutely control the beta flag
  beta = true; // TODO: Remove this before release.

  if (beta) {
    console.log(`[iHerb UnitPrice Beta v${VERSION}]`);
  }

  // Wait for the DOM if it is not yet ready.
  if (document.readyState === "loading") {
    await new Promise((resolve) =>
      document.addEventListener("DOMContentLoaded", resolve, { once: true }),
    );
  }

  Category.restoreFromSession();
  noteNextScanReason("init");
  scanProducts();
  observePageChanges();
  observeBackForwardCacheRestores();
}

init();