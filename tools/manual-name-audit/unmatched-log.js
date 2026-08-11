// Phase 3.66 TEMPORARY developer-only unmatched product-name capture.
// Records quantity-parse misses (and matched counts) during manual browsing.
// Local JSON export only. No network transmission of product names.
//
// Survives full page loads in the same tab via sessionStorage (content scripts
// reinject and would otherwise wipe in-memory Sets/Maps).
//
// Export: press Alt+Shift+U (download + clipboard). Output JSON shape:
// - matchedCount: unique matched product names
// - unmatchedCount: unique unmatched product names (not out-of-scope)
// - unmatched: [{ pillDescription, count }, ...]  (unique products per description)
// - outOfScopeNoQuantity: [productName, ...]
//
// Cleanup commit must:
// 1. Move this file out of iherb-extension/ (e.g. tools/product-name-audit/).
// 2. Remove it from manifest.json content_scripts.
// 3. Remove the flagged UnmatchedLog call sites in content.js.

// Classification helpers ported from tools/product-name-audit/audit-runner.js.
const WEIGHT_VOLUME_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:fl\s*oz|fluid\s*ounces?|ounces?|oz|lbs?|pounds?|kg|g|mg|mcg|l|ml)\b/gi;
const PARENTHETICAL_TEXT_PATTERN = /\([^)]*\)/g;
const COUNT_LED_SEGMENT_PATTERN = /^\s*\d[\d,]*(?:\.\d+)?\s+(.+?)\s*$/;
const NUMBER_PATTERN = /\d/;
const SESSION_KEY = "iherb-unmatched-log";

/** @type {Set<string>} */
const matchedNames = new Set();
/** @type {Set<string>} product names already counted as a miss */
const seenMissNames = new Set();
/** @type {number} unique unmatched product names (excludes out-of-scope) */
let unmatchedCount = 0;
/** @type {Map<string, number>} pillDescription -> unique product count */
const unmatchedByPillDescription = new Map();
/** @type {string[]} unique out-of-scope product names */
const outOfScopeNoQuantity = [];

/**
 * Temporary capture API used by content.js.
 * Pattern: facade over session-backed observation maps.
 */
const UnmatchedLog = {
  /**
   * Count a successful quantity match (unique by product name).
   * @param {string} productName
   */
  recordMatch(productName) {
    const key = productName.trim();
    if (!key || matchedNames.has(key)) {
      return;
    }
    matchedNames.add(key);
    persistToSession();
  },

  /**
   * Classify a quantity-parse miss. Unmatched entries with a pillDescription
   * are aggregated by that description; out-of-scope is a name list.
   * @param {string} productName
   */
  recordMiss(productName) {
    const key = productName.trim();
    if (!key || seenMissNames.has(key)) {
      return;
    }
    seenMissNames.add(key);

    if (isOutOfScopeNoQuantity(key)) {
      outOfScopeNoQuantity.push(key);
      persistToSession();
      return;
    }

    unmatchedCount += 1;
    const pillDescription = extractPillDescription(key);
    if (pillDescription) {
      unmatchedByPillDescription.set(
        pillDescription,
        (unmatchedByPillDescription.get(pillDescription) || 0) + 1,
      );
    }
    persistToSession();
  },

  /**
   * Download session results as JSON and copy the same payload to the clipboard.
   * Shortcut: Alt+Shift+U.
   */
  exportJson() {
    const payload = buildExport();
    const text = JSON.stringify(payload, null, 2);
    const stamp = payload.generatedAt.replace(/[:.]/g, "-");
    downloadText(text, `unmatched-log-${stamp}.json`);
    copyText(text);
    console.log("[Price Helper unmatched-log] Exported:", {
      matchedCount: payload.matchedCount,
      unmatchedCount: payload.unmatchedCount,
      outOfScopeNoQuantity: payload.outOfScopeNoQuantity.length,
    });
  },
};

/**
 * @param {string} productName
 * @returns {boolean}
 */
function isOutOfScopeNoQuantity(productName) {
  const nameWithoutWeightVolume = productName.replace(WEIGHT_VOLUME_PATTERN, "");
  return (
    nameWithoutWeightVolume !== productName &&
    !NUMBER_PATTERN.test(nameWithoutWeightVolume)
  );
}

/**
 * Strip trailing aggregate parentheticals, take the last comma segment, and
 * keep the text after a leading count when present.
 * @param {string} productName
 * @returns {string|null}
 */
function extractPillDescription(productName) {
  const searchableName = productName
    .replace(PARENTHETICAL_TEXT_PATTERN, "")
    .replace(/\s+/g, " ");
  const segments = searchableName.split(",").map((segment) => segment.trim());
  const lastSegment = segments[segments.length - 1] || "";
  const match = lastSegment.match(COUNT_LED_SEGMENT_PATTERN);
  if (!match) {
    return null;
  }
  return match[1].replace(/\s+/g, " ").trim() || null;
}

/**
 * @returns {object}
 */
function buildExport() {
  const unmatched = [];
  for (const [pillDescription, count] of unmatchedByPillDescription) {
    unmatched.push({ pillDescription, count });
  }

  return {
    generatedAt: new Date().toISOString(),
    matchedCount: matchedNames.size,
    unmatchedCount,
    unmatched,
    outOfScopeNoQuantity,
  };
}

/** Restore prior tab-session observations after content-script reinject. */
function restoreFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    for (const name of parsed.matchedNames || []) {
      matchedNames.add(name);
    }
    for (const name of parsed.seenMissNames || []) {
      seenMissNames.add(name);
    }
    unmatchedCount = Number(parsed.unmatchedCount) || 0;
    for (const [pillDescription, count] of Object.entries(
      parsed.unmatchedByPillDescription || {},
    )) {
      unmatchedByPillDescription.set(pillDescription, Number(count) || 0);
    }
    outOfScopeNoQuantity.push(...(parsed.outOfScopeNoQuantity || []));
  } catch {
    // sessionStorage unavailable or corrupt - keep empty in-memory state.
  }
}

/** Persist observations so full page loads in this tab do not drop the scan. */
function persistToSession() {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        matchedNames: Array.from(matchedNames),
        seenMissNames: Array.from(seenMissNames),
        unmatchedCount,
        unmatchedByPillDescription: Object.fromEntries(
          unmatchedByPillDescription,
        ),
        outOfScopeNoQuantity,
      }),
    );
  } catch {
    // Quota or privacy mode - continue with in-memory only.
  }
}

/**
 * @param {string} text
 * @param {string} filename
 */
function downloadText(text, filename) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {string} text
 */
function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    return;
  }
  navigator.clipboard.writeText(text).catch(() => {
    // Clipboard may be denied; download still succeeded.
  });
}

restoreFromSession();

// Alt+Shift+U exports because page DevTools cannot see content-script globals.
document.addEventListener(
  "keydown",
  (event) => {
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "u") {
      event.preventDefault();
      UnmatchedLog.exportJson();
    }
  },
  true,
);

console.log(
  "[Price Helper unmatched-log] Temporary capture active. Press Alt+Shift+U to export JSON.",
  {
    matchedCount: matchedNames.size,
    unmatchedCount,
    outOfScopeNoQuantity: outOfScopeNoQuantity.length,
  },
);
