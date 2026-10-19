## Price Helper for iHerb

An extension that adds unit price badges to iHerb.com listing and search pages so you can compare supplement prices at a glance.

### Latest Updates

**Version 1.1.1**
- Renamed the public repository to PHiHerb for name consistency 
- The extension now works with iherb sites for the United Kingdom, Canada, Australia, Singapore and New Zealand

See `CHANGELOG.md` for complete release history.

### What It Does

- Detects product listings on https://www.iherb.com supplement and search pages.
- Identifies pill like supplements (capsules, tablets, softgels, gummies, lozenges, etc.) by keyword matching in the product title. Powders, liquids and creaams are intentionally skipped.
- Extracts price from `.price` and quantity from the product link `title` attribute.
- Calculates `unitPrice = price / quantity` and injects a badge (e.g. `$0.15/unit`) near each qualifying product's price.
- Color codes each badge with a dot based on where the unit price falls within the category's observed range:
  - Green - among the lowest price range
  - Yellow - middle price range
  - Red - among the highest price range
- Category price ranges (low price to high price) accumulate as you browse and persist across page reloads within the browser tab life.
- Price ranges are tracked per product or search. So Vitamin A will have a different price range than Vitamin D.

### Known Issues

- **Country and Currency switches**: browsing then changing Country or Curreny via the iHerb picker may cause inaccuracies in the Price Helper range data. It is best to start a new tab once either option is changed.
- **Single-tab session scope**: Category price ranges are per tab. Opening the same category in a new tab starts fresh.
- **USD only**: No multi-currency support yet
- **Listing/search pages only**: Product detail pages are not yet supported since they already show a unit price (which is sometimes inaccurate)
- **"See in cart" prices skipped**: Price Helper info does not show for "see in cart" products.

### File Overview

- `iherb-extension/manifest.json` - WebExtension manifest.
- `iherb-extension/config.json` - Developer debug setting for local troubleshooting.
- `iherb-extension/content/content.js` - Content script for page scanning, price parsing, unit price calculation, badge rendering, and navigation handling.
- `iherb-extension/shared/product-matching.js` - Shared product quantity and supplement form matching rules.
- `iherb-extension/shared/badge-size.js` - Shared badge size preference defaults and storage helpers.
- `iherb-extension/preferences/preferences.css` - Extension preferences page for badge text size.
- `iherb-extension/styles/inject.css` - Styling for unit price badges, color-coded dots, category range badges, and badge sizes.
- `iherb-extension/icons/` - Extension icons

### Supported Sites
- US - www.iherb.com
- United Kingdom - uk.iherb.com
- Canada - ca.iherb.com
- Australia - au.iherb.com
- Singapore - sg.iherb.com
- New Zealand - nz.iherb.com

### Installation
Install the extension from the Chrome Extension Web store or Firefox Extensions and Themes menu. If you are having problems finding it, go to https://mklimp.com/phiherb and click the install link.

### Privacy
- This extension collects no data. It reads product, price and quantity information from the iHerb site and then adds Price Helper info near that price.

### Feedback

Post feedback or report issues at [r/PriceHelper](https://www.reddit.com/r/PriceHelper/).
