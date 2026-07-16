## Price Helper for iHerb Beta

A Firefox WebExtension that calculates and displays unit prices for pill like supplements on https://www.iherb.com. 

### Current Status: Public Beta

The extension works on listing and search pages with data storage keeping history for the entirety of the tab duration.

### What It Does

- Detects product listings on https://www.iherb.com supplement and search pages.
- Identifies pill like supplements (capsules, tablets, softgels, gummies, lozenges, etc.) by keyword matching in the product title.
- Extracts price from `.price` and quantity from the product link `title` attribute.
- Calculates `unitPrice = price / quantity` and injects a badge (e.g. `$0.15/unit`) near each qualifying product's price.
- Color codes each badge with a dot based on where the unit price falls within the category's observed range:
  - **Green** - lower ~25% of the range (best value).
  - **Yellow** - middle ~50%.
  - **Red** - upper ~25% (most expensive).
- Category price ranges (low price to high price) accumulate as you browse and persist across page reloads within the browser tab life.
- Price ranges are tracked per product or search. So Vitamin A will have a different price range than Vitamin D.

### Known Issues

- **Detection gaps**: Some supplement forms may not be recognized if the product title uses uncommon phrasing. Powders, liquids, and creams are intentionally skipped.
- **Single-tab session scope**: Category price ranges are per tab. Opening the same category in a new tab starts fresh.
- **USD only**: No multi-currency support yet (planned in a later phase).
- **Listing/search pages only**: Product detail pages are not yet supported (planned in a later phase).
- **"See in cart" prices skipped**: Price Helper info does not show for "see in cart" products.

### File Overview

- `iherb-extension/manifest.json` - WebExtension manifest (Manifest V3, Firefox).
- `iherb-extension/config.json` - Runtime flags.
- `iherb-extension/content/content.js` - Content script: tile scanning, price parsing, unit price calculation, badge rendering, SPA navigation detection.
- `iherb-extension/styles/inject.css` - Styling for unit price badges, color-coded dots, and the beta marker.
- `iherb-extension/icons/` - Extension icons used by Firefox.

### Installation
Install the extension from the Firefox Extensions and Themes menu. If you are having problems finding it, go to https://mklimp.com/phiherb and click the install link.

### Privacy
- This extension collects no data. It reads product, price and quantity information from the iHerb site and then adds Price Helper info near that price.
- Firefox labels the https://www.iherb.com content permission as accessing "your" data. This is standard boilerplate for any extension that reads a site's page content. No personal data is accessed or transmitted. The full source is available on GitHub.

### Feedback

Post feedback or report issues at [r/PriceHelper](https://www.reddit.com/r/PriceHelper/).
