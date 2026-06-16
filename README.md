## Price Helper for iHerb Beta

A Firefox WebExtension that calculates and displays unit prices for pill like supplements on https://www.iherb.com.

### Current Status: Phase 3.5 (Beta Release) - In Progress

Phases 1–3 (Stage 3) are complete. The extension works on listing and search pages with session-backed data storage keeping history for the entirety of the tab duration. Upon completion of Phase 3.5 the extension will be released in beta form on https://mklimp.com/phiherb.

### What It Does

- Detects product listing tiles on https://www.iherb.com supplement and search pages.
- Identifies pill like supplements (capsules, tablets, softgels, gummies, lozenges, etc.) by keyword matching in the product title.
- Extracts price from `.price` and quantity from the product link `title` attribute.
- Calculates `unitPrice = price / quantity` and injects a badge (e.g. `$0.15/unit`) near each qualifying product's price.
- Color-codes each badge with a dot based on where the unit price falls within the category's observed range:
  - **Green** - lower ~25% of the range (best value).
  - **Yellow** - middle ~50%.
  - **Red** - upper ~25% (most expensive).
- Category price ranges (`lowPrice` / `highPrice`) accumulate as you browse and persist across page reloads within the browser tab session via `sessionStorage`.
- A `MutationObserver` detects SPA navigation (category switches and pagination) and triggers a debounced rescan.

### Known Issues

- **Detection gaps**: Some supplement forms may not be recognized if the product title uses uncommon phrasing. Powders, liquids, and creams are intentionally skipped.
- **Single-tab session scope**: Category price ranges are per-tab. Opening the same category in a new tab starts fresh.
- **USD only**: No multi-currency support yet (planned for Phase 8).
- **Listing/search pages only**: Product detail pages are not yet supported (planned for Phase 7).
- **Back button not supported**: Pressing the back button does not display any Price Helper info. Session info is still maintained and Price Helper info will return upon browsing via the iHerb pages.
- **"See in cart" prices skipped**: Price Helper info does not show for "see in cart" products.

### Debug and Beta Flags

Runtime behavior is controlled by `iherb-extension/config.json`:

```json
{ "debug": false, "beta": false }
```
- `debug: true` - shows a floating category/range panel near the page header and enables logging.
- `beta: true` - appends a small `beta` marker to each badge and prints a startup log to the console.

### File Overview

- `manifest.json` - WebExtension manifest (Manifest V3, Firefox).
- `config.json` - Runtime flags (`debug`, `beta`). Single source of truth for build-time behavior toggles.
- `content/content.js` - Content script: tile scanning, price parsing, unit price calculation, badge rendering, SPA navigation detection.
- `styles/inject.css` - Styling for unit price badges, color-coded dots, and the beta marker.
- `icons/two icon svg files` - the icons that display when looking at the extension in Firefox extension menu 

### Loading the beta extension into Firefox
Navigate to https://mklimp.com/phiherb and click on the install link.

### Loading the Extension in Firefox (Development)
1. Open Firefox and navigate to URL about:debugging
2. Click This Firefox on the left
3. Click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file in the `iherb-extension/` directory.
5. Visit an iHerb category or search page (e.g. https://www.iherb.com/c/coq10).
6. Confirm that pill-form products display a unit price badge (colored dot + `$0.XX/unit`) near the listed price.

### Privacy
- This extension collects no data. It reads product, price and quantity information from the iHerb site and then adds Price Helper info near that price.
- Firefox labels the https://www.iherb.com content permission as accessing "your" data. This is standard boilerplate for any extension that reads a site's page content. No personal data is accessed or transmitted. The full source is available on GitHub.

### Feedback

Post feedback or report issues at [r/PriceHelper](https://www.reddit.com/r/PriceHelper/).
