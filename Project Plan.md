# Firefox Browser Extension Project Plan: Price Helper for iHerb

## Project Overview
Create a Firefox browser extension that automatically calculates and displays the unit price for relevant items on iherb.com. The extension  identifies which products are in pill/capsule form and only show unit price calculations for those items.

## Goals
- Automatically detect when user is browsing iherb.com
- Identify products that are in pill/capsule/tablet form
- Calculate unit price based on product price and quantity
- Display unit price information clearly on product listing pages
- Note: iherb.com already displays unit price on product detail pages (with some calculation inaccuracies that can be addressed later)
- Provide a seamless, non-intrusive user experience

## Technical Requirements

### 1. Extension Architecture
- **Manifest Version**: Use Manifest V3 (current Firefox standard)
- **Content Scripts**: Inject scripts into iherb.com pages to modify DOM
- **Background Script**: Handle extension lifecycle and potential data storage **not in beta**
- **Options Page**: Optional settings page for user preferences **not in beta**
- **Web page for hosting** Host xpi file and extension updates on mklimp.com
- https://extensionworkshop.com/documentation/publish/add-on-policies/
- https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview
- https://extensionworkshop.com/documentation/manage/updating-your-extension/

### 2. Core Functionality

#### 2.1 Product Data Model
- Use two related objects to separate stable category info from product specific pricing data:
  - `Category` (parent entity containing data common to all products):
    - `name` (from `h1.sub-header-title` on listing pages)
    - `low_price`
    - `high_price`
  - `Product` (child entity that is one observed listing entry):
    - `category` (reference to `Category`)
    - `name`
    - `price`
    - `unit_price`
    - `currency_symbol`
    - `price_tier`
    - `price_label`

#### 2.2 Product Detection
- Detect product listings on:
  - Search results pages
  - Category pages
  - Product detail pages **not in beta**
  - Shopping cart **not in beta**

#### 2.3 Pill/Supplement Identification
- **Heuristics for identifying pill products**:
  - Keywords in product title/description/quantity. Divided into optional prefixes and mandatory suffixes: 
    - prefix examples: "chewable", "liquid", "vegetarian"
    - suffix examples: "pill", "pills", "capsule", "capsules", "tablet", "tablets", "softgel", "softgels", "gelcap", "gelcaps", "caplet", "caplets", "count", "ct"
  - Product category identification
  
#### 2.3.1 Pill Keyword Backlog (for future automation) **not in beta**
- Maintain log of unmatched products for use in automating the addition of new prefixes and suffixes
- Per mozilla, all transmitted data must be encrypted.

#### 2.4 Price and Quantity Extraction
- Extract product price from DOM:
  - Use CSS class selector: `.price`
  - Regular price
  - Sale/discounted price (if applicable)
  - Currency handling
- Extract quantity information:
  - Read the `title` attribute on `a.absolute-link.product-link` within each listing tile (same text drives product name and quantity parsing)
  - Extract number of pills/capsules/tablets per container from that string
  - Parse various formats: "60 ct", "120 tablets", "90 capsules", etc.
  - Use keyword matching to identify quantity values
- Handle edge cases:
  - see in cart **not in beta**

#### 2.5 Unit Price Calculation
- Formula: `unit_price = total_price / quantity`
- Display format: Show currency with appropriate precision (e.g., "$0.15/unit")

#### 2.6 UI Integration
- **Product Listing Pages** (Primary Focus):
  - Add unit price badge/label near product price
  - Use subtle styling that doesn't interfere with site design
  - Position consistently across all products
  
- **Product Detail Pages** (Lower Priority): **not in beta**
  - Note: iherb.com already displays unit price on detail pages
  - Future enhancement: Improve calculation accuracy if needed
  - Show calculation breakdown (price ÷ quantity = unit price)
  - Update dynamically if user changes quantity/options

### 3. Technical Implementation Details

#### 3.1 File Structure
```
iherb-extension/
├── manifest.json
├── config.json
├── background.js (or background.html for service worker) **not in beta**
├── content/
│   ├── content.js (main content script)
├── styles/
│   └── inject.css (styling for price displays)
├── icons/
│   ├── icon-small.svg
│   ├── icon.svg
├── options/ **not in beta**
│   ├── options.html
│   └── options.js
└── README.md
```

#### 3.2 Key Technologies
- **JavaScript**: ES6+ for content scripts
- **CSS**: For styling injected price displays
- **WebExtensions API**: For Firefox extension functionality

#### 3.3 Versioning Policy
- **Format**: `0.{phase}.{stage}` during pre-release development.
- **Minor version** tracks the current project phase: Phase 1 = `0.1.x`, Phase 2 = `0.2.x`, Phase 3 = `0.3.x`, etc.
- **Patch version** tracks the stage within that phase: Stage 1 = `x.x.1`, Stage 2 = `x.x.2`, etc.
- **Beta releases** encode the beta iteration as a 4th integer: e.g. `0.3.5.1` for beta 1. Firefox's `manifest.json` `version` field only accepts up to 4 dot-separated integers and does not support semver prerelease suffixes.
- `manifest.json` is the single source of truth. `content.js` reads it at runtime via `browser.runtime.getManifest().version`.
- After Phase 9 (public release), reset to `1.0.0` and decouple versioning from the phase structure.

#### 3.4 Content Script Strategy
- Debounce/throttle DOM queries for performance
- Cache parsed product data to avoid redundant calculations
- **SPA navigation**: iHerb navigates between categories and pages without a full page reload. The URL changes but the content script does not re-inject. Two signals trigger a rescan:
  - **Category switch** (e.g. CoQ10 → Vitamin B): detected by the `h1.sub-header-title` text changing.
  - **Pagination within a category** (e.g. page 1 → page 2): detected by `location.href` changing while the h1 stays the same.
  - Both checks run inside a single MutationObserver callback on `document.body` (subtree, childList, characterData). The URL comparison piggybacks on DOM mutations that iHerb triggers when replacing product tiles after navigation. A 300ms debounce prevents redundant scans.
  - **Future alternative - tile-level mutation detection**: If iHerb introduces content changes that don't alter the URL (e.g. infinite scroll), a scoped MutationObserver on the product grid container or a tile-identity fingerprint (tile count + first title) could detect new tiles directly. This is noisier and more fragile to DOM structure changes, so URL-based detection is preferred while it covers all current navigation patterns.
  - **Known gap - back button / bfcache**: When the user hits the browser back button, iHerb listing pages are often restored from the Back/Forward Cache (bfcache). bfcache is a snapshot restore: `DOMContentLoaded` does not fire, the content script is not re-injected, and no DOM mutations are emitted. The existing MutationObserver never fires, so `scanProducts()` is never called and badges are absent. Two fixes are deferred to Phase 6: (1) listen for `pageshow` with `event.persisted === true` and call `scanProducts()` directly; (2) extend the observer to also trigger on new product tile nodes being added to the DOM. The second fix must be designed carefully to avoid re-introducing the race condition that the current URL/category-change guard was put in place to prevent.

## Resources Needed
- Firefox Developer Edition for testing
- WebExtensions API documentation
- Access to iherb.com for testing various product types
- Icon design assets

### UX Considerations
1. **Non-intrusive**: Don't break existing iherb.com functionality
2. **Clear Display**: Make unit price easy to read and understand
3. **Consistent**: Same display style across all pages
4. **Accessible**: Ensure displays are readable and don't interfere with screen readers

### Legal/Privacy Considerations
1. **No Data Collection**: Extension should not collect or transmit user data
2. **Respect Site Terms**: Ensure extension complies with iHerb.com's Terms of Use including...
   - **Non-interference**: Extension must not interfere with normal site operation or infringe on others' use of the site
   - **Interface Compliance**: Extension works WITH the provided interface (adds information display), not as an alternative means of access
   - **No Framing/Redirecting**: Extension does not frame, redirect, or display site content outside of the normal browser interface
   - **No Unauthorized Access**: Extension only reads publicly displayed DOM elements (price, quantity) and does not bypass any site protections
   - **User Responsibility**: Users must be 18+ years old to use iHerb.com (as per Terms of Use)
   - **No Site Modification**: Extension only adds display elements, does not modify core site functionality or data

## Implementation Phases

Guiding constraint for implementation scope:
- **Phases 1-4 (including 3.5)**: Do not introduce external network requests or server-managed data dependencies. Keep all logic and data local to the page, browser session, or extension storage.
- **Phase 5 and later**: External aggregation or other server-backed storage may be introduced if needed for a more robust price distribution strategy, provided privacy, reliability, and iHerb terms are respected.

### Phase 1: Proof of Concept - Placeholder Display
**Done**
- [x] Set up basic Firefox extension structure
- [x] Create manifest.json with proper permissions
- [x] Implement basic content script injection on iherb.com
- [x] Detect product elements on product listing pages
- [x] Capture `Category.name` from `h1.sub-header-title` so page products are grouped under the shared listing category context
- [x] Add a placeholder element for each product on listing pages that displays the first three characters of the product title, derived from the `title` attribute of the `a.absolute-link.product-link` element
- [x] Verify extension can successfully inject these dynamic placeholders without breaking site functionality

### Phase 2: Unit Price Calculation on Listing Pages
**Done**
- [x] Replace placeholders with actual unit price values and rename any placeholder-related fields to `unitPrice`
- [x] Extract price and quantity from product listing pages (extract price from the `.price` element; extract quantity from the `title` attribute on `a.absolute-link.product-link`)
- [x] Calculate unit price for each product
- [x] Basic pill identification using simple keyword matching
- [x] Add visual styling for unit price displays on listings

### Phase 3: Unit Price Color Indicator
- [x] Add a small dot at the start of the unit price display for each qualifying product.
- [x] Ensure the dot styling is subtle, accessible, and consistent with existing unit price UI.

- [x] **Stage 1 (Per-page only)**: Compute distribution of `unitPrice` values using only products loaded on the current page, and color-code the dot based on relative `unitPrice`:
   - Green: cheapest 25% of products.
   - Red: most expensive 25% of products.
   - Yellow: all remaining products (middle 50%).

- [x] **Stage 2 (Session category range)**: Key the color calculation by normalized `Category.name` from `h1.sub-header-title` (with the same fallbacks as elsewhere if the header is missing). Resolve the  `Category` for that key and update `low_price` / `high_price` from every qualifying `unitPrice` seen (including on earlier pages in the same session) so the dot’s range is wider than the current page when the user has revisited that category. When the key changes, create or activate the relevant `Category` instance.

- [x] **Stage 3 (Session-backed Category registry)**: Keep the same `Category` model and the same page-processing flow. Improve Category lifetime by moving from a temporary per-scan `Category` registry to a session-backed `Category` registry. This allowws categories to survive full page reloads within the browser tab session. Use normalized `Category.name` as the stable identifier for lookup and storage.

### Phase 3.5: Beta Release
Package the Stage 3 feature set as a unlisted signed Firefox xpi for closed beta testers.

**AMO Setup (do early - blocks signing)**
- [x] Create an AMO developer account and accept the Developer Agreement. 
- [x] Set up 2-step authenticator for the developer account. 
- [x] Create icon assets. AMO requires icons for signing. 
- [x] Bundle a minimal privacy policy ("this extension collects no data") inside the extension.
- [x] Obtain web host. Selected Digital Ocean. 
- [x] Create a basic landing page for mklimp.com. (two other github repos created for site and server)

**Error Hardening**
- [x] Confirm the extension works on search results pages (different DOM structure from category pages).
- [x] Wrap `scanProducts` and `scanTile` in try/catch that logs and returns silently. A content script crash that breaks iHerb is worse than a missing badge. 
- [x] Make every DOM selector miss a silent skip, not a throw. Missing `.price`, missing `a.absolute-link.product-link`, or empty link `title` skips the tile. 
- [x] Expand the hardcoded pill keyword list with terms already observed in testing: `gummies`, `lozenges`, `chewable tablets`, `nuggets`, `vegan capsules`, `veggie capsules`, `veg capsules`, `patches`, `vegetarian gummies`, `vegetarian lozenges`. Keep matching hardcoded for now (keyword config file is Phase 6).

**Debug Mode**
- [x] Move the debug flag out of `content.js` into `config.json` in the extension root. Load it at startup. Swap to `false` for the beta build.
- [x] Gate all debug features behind this single flag: the existing debug panel, console logging, and the scan summary. 

**Beta UX**
- [x] Add a subtle "beta" text marker near the unit price badge so testers know this is not the final UX. 
- [x] Add a startup console log (e.g. `[iHerb UnitPrice Beta v0.3.5.1]`) so devtools screenshots from testers are identifiable. 
- [x] Update the extension info so details are up to date when you look at it in extensions. 
    - `id`: `price-helper-for-iherb@mklimp.com` - permanent, must be set before first AMO submission.
    - `homepage_url`: `https://mklimp.com/phiherb/`
    - `developer`: `{ "name": "Mark Klimp", "url": "https://mklimp.com/phiherb" }`
    - `description`: deferred to UX phase.
- [x] Clean up user viewable info to use "Price Helper info" in place of "unit price" where appropriate

**Web site**
Much of the work for this phase happens in the mklimp-site repo. Tracking high level details here. The phiherb page at `https://mklimp.com/phiherb/` already exists with content derived from this project plan.
- [x] Create and host `updates.json` at `https://mklimp.com/phiherb/updates.json`. **Must be live before AMO submission** because `manifest.json` references this URL via `update_url`. A skeleton file with the correct structure is enough initially; update it with the signed `.xpi` URL after signing. 
- [ ] Host the signed `.xpi` at `https://mklimp.com/phiherb/` after receiving the signed file from AMO. Update `updates.json` to point to it.
- [x] Include known issues at `https://mklimp.com/phiherb/` (see readme.md)
- [ ] Update the "Install the Beta" section on the phiherb page: replace the "Beta release coming soon" placeholder with the direct `.xpi` download.
- [x] Add a privacy statement on `https://mklimp.com/phiherb/`. See readme.md for content.
- [ ] Point the website to the iHerb repository once it is populated.

**Packaging & git workflow**
- [x] Copyright. Github enough or in each file?
- [x] Two-repo strategy for source visibility:
  - **`iHerbDev`** (private): all development, full commit history, unrestricted commit messages. This is the working repo.
  - **`iHerb`** (public): release snapshots only. One clean commit per release (e.g. `Release v0.3.5.1`). No development history exposed.
  - At release time: copy release files into `iHerb`, commit with a clean message, and tag. A release script will automate this when releases become frequent.
  - [x] Rename current repo to `iHerbDev` on GitHub.
    - [x] Rename repo on github site
    - [x] update the remote url for the local repo with `git remote set-url origin https://github.com/makmgusa/iHerbDev`. Verify with `git remote -v` from code/iHerb/iHerb directory
    - [x] Close Cursor then run `mv /home/megagrubby/Code/iHerb/iHerb /home/megagrubby/Code/iHerb/iHerbDev` and `mv /home/megagrubby/Code/iHerb /home/megagrubby/Code/iHerbDev`
  - [x] Create public `iHerb` repo on GitHub.
- [ ] Create a `release/beta` branch in `iHerbDev` for staging releases before pushing to `iHerb`. Keep `main` as the active development branch.
  - `release/beta` is a publication snapshot only. It is updated once per release by merging from `main` and tagging. No development happens on this branch.
  - Releases are manual: decide when to cut, run `web-ext build`, tag, and push to `iHerb`.
  - Version source of truth is `manifest.json` `version`. The git tag must match it exactly (e.g. `v0.3.5.1`). No other file tracks the version.
- [x] Tag the first beta release `v0.3.5.1`. Align `manifest.json` `version` to the tag and include "Beta" in `name` so testers see it in `about:addons`.
- [x] Add `update_url` to the beta `manifest.json` pointing to `https://mklimp.com/phiherb/updates.json` (web site item 16 must be live first). 
- [x] Submit the extension to AMO. Follow the steps in AMO Listing.md
- [x] AMO auto signs the unlisted extension. 
- [ ] Provide download link to site. We are not hosting the .xpi file. There is a nice dashboard where we can see stats.
  https://addons.mozilla.org/firefox/downloads/file/4832336/4fb4d1bb2a594911a9e4-0.3.5.1.xpi

**Feedback & sharing**
Begin this phase once the XPI is available at mklimp.com
- [ ] Share beta via r/supplements. Ask mods first before posting (promotional/beta post requires approval).
  - [ ] Some thoughts on the post since most of reddit dislikes iHerb. Focus on saving money. Be clear no affiliation or benefit outside of learning how to code a Firefox extension and create a personal website. If this is useful I am open to expanding it to other sites.
- [x] Feedback channel: create a Price Helper subreddit. Created https://old.reddit.com/r/PriceHelper/
  - [ ] Add feedback info to the extension
  - [ ] Update README.md feedback section

**Explicitly out of scope for this phase:**
- Options page or enable/disable toggle (Phase 8).
- Keyword config file loading and promotion flow (Phase 6).
- Detailed console logging and scan summary (Phase 6).
- Code quality audit of `scanTile` return paths and OO cleanup (Phase 6).
- Screenshots (not required for unlisted distribution).
- Server-side aggregation or external data (Phase 5).
- Product detail pages (Phase 7).
- Localization or multi-currency support (Phase 8).

### Phase 3.6 Beta Quick Wins
- [ ] Test and release the extension for Android
- [ ] TBD

### Phase 4: Enhanced Detection
- [ ] Handle multiple quantity options on listing pages (products with +More Options)
- [ ] Improve quantity parsing (handle various formats)
- [ ] Optimize performance for listing pages with many products
- [ ] Handle edge cases (missing data, parsing errors)
- [ ] Start maintaining the Pill Keyword Backlog by logging newly observed terms
 
### Phase 5: Unit price by product Robust Solution
- [ ] Define a long-term strategy for maintaining and applying price distributions (potentially including storing aggregated price data on a web server or other persistent storage, while respecting privacy and iHerb terms).
- [ ] Enhance the solution accounting for failure modes, rate limiting, and graceful degradation when external data is unavailable.

### Phase 6: Robustness
- [ ] Enhance error handling and fallbacks
- [ ] Optimize performance (reduce DOM queries, use caching)
- [ ] Test across different iherb.com page types
- [ ] Handle edge cases (missing data, parsing errors)
- [ ] Implement keyword configuration loading and promotion flow (candidate -> approved -> active) so pill matching is no longer hardcoded
- [ ] calculate unit price for "see in cart" items. The price is crossed out in product listing pages. Different field than the extension currently uses.
- [ ] Fix back button not displaying badges (see section 3.4 known gap for design notes).
  - Beware the current design was created to avoid a race condition encountered during development. Documentation of this decision is lacking.
  - Handle bfcache restoration by listening for `pageshow` with `event.persisted === true` and calling `scanProducts()`.
  - Extend the observer to also trigger when new product tiles are added to the DOM, without re-introducing the race condition the current URL/category-change guard prevents.
- [ ] Scan summary debug info.
- [ ] Beta flag should be part of the app so non developers can't change it.

### Phase 7: Product Detail Pages (Optional - Lower Priority)
- [ ] Extract price and quantity from product detail pages
- [ ] Calculate and display unit price on detail pages
- [ ] Show price tier
- [ ] Improve calculation accuracy (address known inaccuracies in iherb.com's serving calculation)
- [ ] Show calculation breakdown (price / quantity = unit price)
- [ ] Update dynamically if user changes quantity/options

### Phase 8: Polish & Features
- [ ] Add options page for user preferences
- [ ] Support for different currencies
- [ ] Improve visual design, extension description and UX
- [ ] Add keyboard shortcuts (optional)
- [ ] Support for shopping cart page (optional)

### Phase 9: Testing & Distribution
- [ ] Comprehensive testing across different products
- [ ] Test with various pill formats and edge cases
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Prepare for Firefox Add-ons store submission
  - [ ] Update AMO Listing.md with final version details
  - [ ] Capture screenshots. See AMO Listing.md
- [ ] Create documentation
- [ ] Update extension version to 1.0.0
- [ ] Consider email for full release. Not used during beta.
- [ ] Submit extension to AMO
- [ ] Update all relevant mklimp.com web pages
  - [ ] Update web page to remove Beta from the name
  - [ ] The project page, support page and extension update page

## Testing Strategy

### Test Cases
1. **Product Types**:
   - Pills/capsules/tablets (should show unit price)
   - Non-pill products (should not show calculation)
   - Products with ambiguous descriptions

2. **Quantity Formats**:
   - "60 ct"
   - "120 tablets"
   - "90 capsules"
   - "30 softgels"
   - Edge cases: missing quantity, invalid formats

3. **Price Scenarios**:
   - Regular price
   - Sale price
   - Multiple quantity options
   - Out of stock items

4. **Page Types**:
   - Search results
   - Category pages
   - Product detail pages
   - Shopping cart (if implemented)

## Potential Future Enhancements
- Unit prices for non-pill products (liquids, creams, etc.)
- Historical price tracking
- Support for other supplement retailers
- Price alerts

## Timeline Estimate
- Phase 1 (Proof of Concept - Placeholder): 2-3 days
- Phase 2 (Unit Price Calculation): 1-2 weeks
- Phase 3 (Unit Price Color Indicator): 2-4 days
- Phase 3.5 (Beta Release): 3-5 days
- Phase 4 (Enhanced Detection): 1 week
- Phase 5 (Robustness): 1 week
- Phase 6 (Product Detail Pages): 1 week (lower priority, can be deferred)
- Phase 7 (Polish & Features): 1 week
- Phase 8 (Testing & Distribution): 1 week
- **Total**: 6-7.5 weeks for core implementation (listing pages focus)

## Clarifying the role of Task List versus Project Plan
- Project Plan is the only document where project deliverables are listed
- Task list is for: 
  - Project related topics that do not have a clear deliverable
  - Potential project items
  - Investigations that require researching before something can be added to or started on the Project Plan
  - Since this is the main project that also spawned mklimp-server and mklimp-site repos, some task items may span projects until they can be added to the appropriate Project Plan.
- When a Task List item becomes defined enough to have a deliverable, it moves to the Project Plan and is marked complete on the Task List
- Some completed Task List items were done prior to this clarification
