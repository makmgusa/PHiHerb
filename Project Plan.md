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

## Important Documents and Lifecycle
- `Project Plan.md` is the source of truth for planned project deliverables and phase scope.
- `Task List.md` holds project-related topics that do not have a clear deliverable, potential project items, investigations, and cross-project items until they can be added to the appropriate project plan.
  - When a `Task List.md` item becomes defined enough to have a deliverable, it moves to `Project Plan.md` and is marked complete on `Task List.md`.
- `README.md` describes the current development state and keeps recent update notes for the latest 2-3 releases.
- `CHANGELOG.md` contains completed release history. After a release is complete, finalized update notes are copied from `README.md` to `CHANGELOG.md`.
- `Extension Listing.md` contains Chrome Web Store and Firefox Add-ons listing copy, submission procedures, screenshots, privacy text, and store specific release checklist items.
- `git-publish.md` contains the procedure for publishing the final release snapshot to the public GitHub repository. This moves all resources from the iHerbDev repo to the iHerb repo.
- `tools/product-name-audit/Product Name Audit Plan.md` is a historical record of the Playwright audit experiment only. Do not use it for forward planning. Unmatched product-name collection is Phase 3.66 in this document.

## Technical Requirements

### 1. Extension Architecture
- **Manifest Version**: Use Manifest V3 (current Firefox standard)
- **Content Scripts**: Inject scripts into iherb.com pages to modify DOM
- **Background Script**: Handle extension lifecycle and potential data storage **not in beta**
- **Preferences Page**: User preferences via Firefox `options_ui` (labeled Preferences). Started in Phase 3.65 with badge size; expand later in Phase 8. Preferences UI uses system colors so it follows Firefox light/dark mode.
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
- Maintain a log of unmatched products for use in adding new quantity prefixes and suffixes.
- Phase 3.66 collects unmatched names inside Price Helper during manual browsing (local export only).
- Per Mozilla, all transmitted data must be encrypted. Phase 3.66 does not transmit product names.

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

#### 3.1 Key Technologies
- **JavaScript**: ES6+ for content scripts
- **CSS**: For styling injected price displays
- **WebExtensions API**: For Firefox extension functionality

#### 3.2 Versioning Policy
- **Format**: `0.{phase}.{stage}` during pre-release development.
- **Minor version** tracks the current project phase: Phase 1 = `0.1.x`, Phase 2 = `0.2.x`, Phase 3 = `0.3.x`, etc.
- **Patch version** tracks the stage within that phase: Stage 1 = `x.x.1`, Stage 2 = `x.x.2`, etc.
- **Beta releases** encode the beta iteration as a 4th integer: e.g. `0.3.5.1` for beta 1. Firefox's `manifest.json` `version` field only accepts up to 4 dot-separated integers and does not support semver prerelease suffixes.
- `manifest.json` is the single source of truth. `content.js` reads it at runtime via `browser.runtime.getManifest().version`.
- After the public `1.0.0` release, decouple versioning from the original phase structure.
- Firefox and Chrome share one version. Do not maintain per-store version numbers unless a store-specific hotfix requires a temporary split, then resync on the next release.

#### 3.3 Content Script Strategy
- Debounce/throttle DOM queries for performance
- Cache parsed product data to avoid redundant calculations
- **SPA navigation**: iHerb navigates between categories and pages without a full page reload. The URL changes but the content script does not re-inject. Two signals trigger a rescan:
  - **Category switch** (e.g. CoQ10 → Vitamin B): detected by the `h1.sub-header-title` text changing.
  - **Pagination within a category** (e.g. page 1 → page 2): detected by `location.href` changing while the h1 stays the same.
  - Both checks run inside a single MutationObserver callback on `document.body` (subtree, childList, characterData). The URL comparison piggybacks on DOM mutations that iHerb triggers during navigation.
  - **Navigation hydration scans**: iHerb can update the URL/header before catalog tiles finish hydrating. Firefox Developer Edition testing showed that Back does produce a URL/category navigation mutation, but the first scan can run before badges can be applied to all normal listing tiles. After a navigation mutation, schedule a short scan series at 300ms, 800ms, and 1300ms. Cancel any pending delayed scans when a newer navigation mutation arrives. This keeps badges in sync for Back, category switches, and pagination without observing every tile mutation.
  - **bfcache fallback**: Keep a `pageshow` listener for `event.persisted === true` and call `scanProducts()` after a short delay. This covers true bfcache restores where no useful navigation mutation fires.
  - **Future alternative - tile-level mutation detection**: If iHerb introduces content changes that don't alter the URL (e.g. infinite scroll), a scoped MutationObserver on the product grid container or a tile-identity fingerprint (tile count + first title) could detect new tiles directly. This is noisier and more fragile to DOM structure changes, so URL/category based detection plus hydration scans is preferred while it covers current navigation patterns.

#### 3.4 Shared Product Name And Quantity Contract
Shared matching constants live in `iherb-extension/shared/product-matching.js` so Price Helper and any leftover audit tooling use the same product-name field contract and quantity pattern.
- Keep the shared module as the single source of truth for listing selectors, the product-name attribute, and `PILL_QUANTITY_PATTERN`.
- Keep object-specific behavior, such as `Product.parseQuantity()`, in the consumer that owns the product object unless it is rewritten as a pure helper.
- Quantity matching model (agreed after Phase 3.66 audit review):
  1. Require a count number.
  2. In `Product.parseQuantity()`, strip parenthetical text, then search only the final comma-separated phrase (the usual pill-count clause).
  3. In that phrase: optional single-word prefix from the known prefix list, ignore any middle words, mandatory unit term from the known unit list.
  4. Allow one optional trailing character (`.?`) after a prefix or unit word so trademark marks do not need special-casing.
  5. Do not encode multi-word prefix phrases; middle words between the first modifier and the unit are skipped by the pattern.
- Prefix and unit lists stay curated in `product-matching.js`. Broaden them from audit exports when needed; do not rebuild contiguous multi-word prefix phrases.

## Resources Needed
- Firefox Developer Edition for testing
- Chrome-family desktop browser for Phase 4 testing (chosen during that phase)
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
3. **Unmatched product-name collection (Phase 3.66)**: Collect unmatched titles only in a local, developer-facing module.
   - Do not transmit product names or other browsing data.
   - Temporary capture lives in the extension. After capture, a cleanup commit removes it from `iherb-extension/` so AMO packages stay clean.
   - Keep exported unmatched-name files internal and disposable unless a small snapshot is intentionally reviewed.
   - The earlier Playwright audit under `tools/product-name-audit/` is paused. Do not resume automated multi-category navigation without an explicit decision and a fresh terms review.

### Loading the Extension in Firefox (Development)
1. Open Firefox and navigate to URL about:debugging
2. Click This Firefox on the left
3. Click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file in the `iherb-extension/` directory.
5. Visit an iHerb category or search page (e.g. https://www.iherb.com/c/coq10).
6. Confirm that pill-form products display a unit price badge (colored dot + `$0.XX/unit`) near the listed price.

### Loading the Extension in Chrome (Development)
Use Google Chrome Stable for first-pass Chrome testing because it is the closest local match for Chrome Web Store users. Launch Chrome with a dedicated user data directory whenever testing the extension:

```bash
nohup google-chrome --user-data-dir="$HOME/.config/iherb-chrome-test" >/dev/null 2>&1 &
```
devchrome alias created for this command

This is a development procedure, not a one-time system setting. The command opens Chrome against an isolated test profile, detaches it from the terminal, and discards Chrome diagnostic output. Extension installs, cookies, settings, and cache persist in `~/.config/iherb-chrome-test`, but Chrome only uses that profile when launched with the `--user-data-dir` flag.

1. Launch Chrome with the dedicated profile command above.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click **"Load unpacked"**.
5. Select the `iherb-extension/` directory.
6. After source changes, return to `chrome://extensions` and click the extension reload button.

## Implementation Phases

Guiding constraint for implementation scope:
- **Phases 1-4 (including 3.5)**: Do not introduce external network requests or server-managed data dependencies. Keep all logic and data local to the page, browser session, or extension storage.
- **Phase 9 and later**: External aggregation or other server-backed storage may be introduced if needed for a more robust price distribution strategy, provided privacy, reliability, and iHerb terms are respected.

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
- [x] Host the signed `.xpi` at `https://mklimp.com/phiherb/` after receiving the signed file from AMO. Update `updates.json` to point to it.
- [x] Include known issues at `https://mklimp.com/phiherb/` (see readme.md)
- [x] Update the "Install the Beta" section on the phiherb page: replace the "Beta release coming soon" placeholder with the direct `.xpi` download.
- [x] Add a privacy statement on `https://mklimp.com/phiherb/`. See readme.md for content.
- [x] Point the website to the iHerb repository once it is populated.

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
- [x] Create a `release` branch in `iHerbDev` for staging releases before pushing to `iHerb`. Keep `main` as the active development branch.
  - `release` is a publication snapshot only. It is updated once per release by merging from `main` and tagging. No development happens on this branch.
  - Releases are manual: decide when to cut, run `web-ext build`, tag, and push to `iHerb`.
  - Version source of truth is `manifest.json` `version`. The git tag must match it exactly (e.g. `v0.3.5.1`). No other file tracks the version.
- [x] Tag the first beta release `v0.3.5.1`. Align `manifest.json` `version` to the tag and include "Beta" in `name` so testers see it in `about:addons`.
- [x] Add `update_url` to the beta `manifest.json` pointing to `https://mklimp.com/phiherb/updates.json` (web site item 16 must be live first). 
- [x] Submit the extension to AMO. Follow the steps in `Extension Listing.md`
- [x] AMO auto signs the unlisted extension. 
- [x] Once the .xpi is downloaded (see `Extension Listing.md`), go to the site repos and publish it.

**Feedback & sharing**
Begin this phase once the XPI is available at mklimp.com
- [ ] Share beta via r/supplements. Ask mods first before posting (promotional/beta post requires approval).
  - [x] Some thoughts on the post since most of reddit dislikes iHerb. Focus on saving money. Be clear no affiliation or benefit outside of learning how to code a Firefox extension and create a personal website. If this is useful I am open to expanding it to other sites.
- [x] Feedback channel: create a Price Helper subreddit. Created https://old.reddit.com/r/PriceHelper/
  - [x] Add feedback info to the extension
  - [x] Update README.md feedback section

**Explicitly out of scope for this phase:**
- Options page or enable/disable toggle (Phase 8).
- Keyword config file loading and promotion flow (Phase 6).
- Detailed console logging and scan summary (Phase 6).
- Code quality audit of `scanTile` return paths and OO cleanup (Phase 6).
- Screenshots (not required for unlisted distribution).
- Server-side aggregation or external data (Phase 9).
- Product detail pages (Phase 7).
- Localization or multi-currency support (Phase 8).

### Phase 3.6 AMO Listed Beta Submission
AMO has pretty loose guidelines for extension submission. With a few small fixes/enhancements, this extension will be ready for a listed AMO beta release.
- [x] Fix back button not displaying badges (see section 3.4 known gap for design notes).
  - Beware the current design was created to avoid a race condition encountered during development. Documentation of this decision is lacking.
  - Verified Back produces a URL/category navigation mutation, but iHerb hydrates catalog tiles asynchronously after the first mutation.
  - Schedule hydration scans at 300ms, 1000ms, and 2000ms after URL/category navigation. Cancel pending delayed scans if a newer navigation mutation arrives.
  - Keep bfcache restoration fallback by listening for `pageshow` with `event.persisted === true` and calling `scanProducts()` after a short delay.
  - [x] Add debug panel information to aid development of the back button solution
- [x] Exclude the newly added iHerb Live section from analysis/badges.
  - Live products use `.product.live-item` and should not be treated as standard listing tiles.
  - The section title area uses `div.title-container` with `span.live-title`; keep this as supporting DOM context if `.product.live-item` changes.
  - Live section updates may explain why some badges appeared during Back testing: its own live mutations can wake the page observer while the normal listing remains partially hydrated.
- [x] Beta flag should be part of the app so non developers can't change it.
- [x] Keep self-hosting notes available only as a fallback procedure in `listing/Extension Listing.md`.
- [x] AMO listing for a public beta release
  - [x] Capture screenshots from the final release build. See `listing/Extension Listing.md`.
  - [x] Increment the release version in `manifest.json`.
  - [x] Review and update `README.md`: current status, install instructions, known issues, privacy text, and feedback/support links.
  - [x] Verify `manifest.json` listing fields are correct
  - [x] Update `Extension Listing.md` with listed beta version details.
  - [x] Verify `config.json` has debug set to `off`
  - [x] Build the AMO submission package with `web-ext` and confirm AMO validation has no errors or warnings.
  - [x] Submit the extension to AMO as a listed beta
- [x] Update mklimp.com for listed AMO release
- [x] Publish the release snapshot to the public GitHub repo using `git-publish.md`, including release tags/assets as applicable.

### Phase 3.65 Beta Quick Wins
- [x] Price range summary by the Category name
  - Label: `Price Helper range: $0.08-$0.31/unit` or similar. Prefer "range" over "price range" to keep the wording short while still tying the data to Price Helper.
  - Place to the right of the category/search title on desktop so it reads as contextual metadata instead of taking over the page header. Allow it to wrap below the title only on narrow layouts.
  - Use a subtle rounded font treatment that feels compatible with iHerb's UI. Consider green `Price Helper` text or a small green accent, but avoid a full graphic/icon for the beta unless branding work becomes a priority.
  - Do not show low/mid/high boundary ranges in the public header for now. Keep those in debug/dev views; the product badge colors already communicate low, mid, and high.
  - Hide the range until the current category has at least two valid observed unit prices.
- [x] Shared product-name matching prep (completed before the Playwright audit pause)
  - Known misses motivating collection: Fish Gelatin Softgels, Mini Softgels, Enteric Coated Softgels.
  - [x] Create `tools/product-name-audit/` and a historical audit plan document.
  - [x] Extract the listing product link selector, product-name attribute, `PILL_QUANTITY_PATTERN`, and its build constants from `iherb-extension/content/content.js` into a shared module.
  - [x] Update the extension to use the shared field constants and quantity pattern without changing current behavior.
- [x] Badge size option
  - Values: `small` | `large` only. Default `small` (current product badge styling in `inject.css`).
  - Scope for now: product unit-price badges (`.iherb-unit-price-badge`) only. Consider applying the same preference to the category price range badge later.
  - UI: Preferences page (`options_ui`), labeled Preferences. One control labeled **Text Size** with Small / Large radios. Include `<meta name="color-scheme" content="light dark">` plus system colors / dark fallback so the embedded page matches Firefox light/dark mode.
  - Persistence: `browser.storage.local` key `badgeSize`. Survives restarts without a Firefox account. (`storage.sync` later if needed.)
  - Apply: content script reads the preference, sets `iherb-badge-size-small` or `iherb-badge-size-large` on `document.documentElement`, and listens for `storage.onChanged`. CSS selects the active size; badge markup stays the same.
  - Large is a scaled-up variant of Small (~1.3–1.5× font, dot, padding), not a second design.
  - Shared constants/helpers in `shared/badge-size.js` so Preferences and the content script share one source of truth.
  - Manifest: add `storage` permission and `options_ui` pointing at the Preferences page.
- [x] Filtering decision: category price range remains based on all eligible products observed in the page session, not the currently visible subset after iHerb checkbox filters.
- [x] Remove Beta. The next release is a 1.0.0 soft launch.
  Rationale: the listing-page product is useful enough for public use, and keeping "Beta" in the add-on name or badge may deter installs. Remaining roadmap work is feature expansion and polish, not a blocker for the current core experience.
  - [x] Update `iherb-extension/manifest.json`: set version to `1.0.0` and remove `beta` from name
  - [x] Turn off the beta flag in `content.js`.
  - [x] Update `README.md` from Public Beta to 1.0.0 soft launch / public release language.
  - [x] Update `Extension Listing.md`: change the primary procedure from listed beta release to listed public release, remove beta wording, update the XPI file name, and update the 1.0.0 release notes.
  - [x] Update `git-publish.md`: use `v1.0.0` examples and remove beta prerelease instructions for this release.
  - [x] Updated image for AMO listing without beta badges.
  - [x] Build and submit the 1.0.0 AMO package following `Extension Listing.md`
  - [x] Publish the matching release snapshot to the public `iHerb` repo following git-publish.md
  - [x] Web site placeholder: update the separate mklimp.com site project for the 1.0.0 soft launch. Remove beta wording from the project page, support page, install/update page, and release download text. Update site image to match AMO listing.

### Phase 3.66 Unmatched Product Name Capture
Collect unmatched product names while browsing iHerb so quantity matching can be improved with real misses. This replaces the paused Playwright audit and the temporary separate-extension idea. `Project Plan.md` is the only forward planning document for this work.

**Why this phase exists**
- Manual copy/paste of misses is slow.
- Playwright multi-category collection hit Cloudflare/security challenges and is paused.
- Price Helper already has product capture, SPA navigation, hydration rescans, Back stability, and shared quantity matching. Reuse that path instead of building another collector.

**Lifecycle (two commits)**
1. **Capture stage commit**: Temporarily enable unmatched collection inside Price Helper. Implement `unmatched-log.js`, add it to `manifest.json` content scripts, capture names, promote useful patterns, then commit this stage.
2. **Cleanup commit**: Move `unmatched-log.js` out of `iherb-extension/` (for example under `tools/product-name-audit/` or a sibling archive path). Remove `unmatched-log.js` from `manifest.json` content scripts and remove the flagged call sites from the extension. In that same commit, keep a short note with the moved module (in the file header and/or a matching `.md`) that explains what was deleted from the extension to enable unmatched capture. The git repo is the only source of that history; AMO packages never include the collector.

**Design**
- Quantity matching stays in `content.js` / shared `product-matching.js`. Do not move match logic into the unmatched logger.
- Put miss processing in its own file, `unmatched-log.js`, separate from `content.js`. Do not leave collection code in the extension for AMO.
- Add `unmatched-log.js` to `manifest.json` content scripts for the capture stage; remove that entry in the cleanup commit.
- Call `unmatched-log.js` only from the quantity path in `content.js` (`computeUnitPrice`):
  - On `parseQuantity()` failure, call `UnmatchedLog.recordMiss(name)` to classify the miss.
  - On success, call `UnmatchedLog.recordMatch(name)` for a matched count only. Matching itself never leaves `content.js`.
- Classify misses into:
  - `outOfScopeNoQuantity`: weight/volume packaging and no other quantity number.
  - `unmatched`: everything else (parser/keyword candidates).
- Dedupe by unique product name within the tab session (hydration rescans must not inflate counts).
- For `unmatched` titles, extract `pillDescription` from the full observed name:
  - Strip parenthetical text at the end of the description. This is usually some aggregate product info.
  - Take the final comma-separated phrase.
  - If that phrase starts with a number, remove the leading number and keep the rest as `pillDescription`.
  - If it does not start with a number, leave `pillDescription` unset (still counted in `unmatchedCount`, but omitted from the `unmatched` list).
  - Example: full title `California Gold Nutrition, Omega-3 Premium Fish Oil, 100 Fish Gelatin Softgels (1,100 mg per Softgel)` stays intact as the observed name; `pillDescription` is `Fish Gelatin Softgels`.
- Aggregate `unmatched` export rows by `pillDescription` with a unique-product `count`.
- If results are not satisfactory, refer to `audit-runner.js`. That miss classification and pill-description extraction was working.
- Store observations in `sessionStorage` for the tab session so full page loads (content-script reinject) do not drop earlier misses. Export with Alt+Shift+U (download JSON + clipboard). No network transmission of product names.
- Export JSON shape:
  - `matchedCount`: unique matched product names
  - `unmatchedCount`: unique unmatched product names (excludes out-of-scope)
  - `unmatched`: `[{ pillDescription, count }, ...]`
  - `outOfScopeNoQuantity`: `[productName, ...]`
- Optional later: feed exported JSON into local reporting under `tools/product-name-audit/` for aggregation.
- Do not resume Playwright category navigation tuning, and do not build a separate temporary capture extension, unless this phase fails to produce usable samples.

**Completed before this phase**
- [x] Shared matching module in `iherb-extension/shared/product-matching.js`.
- [x] Menu-decode and single-category Playwright smoke work under `tools/product-name-audit/` (historical; navigation expansion paused July 22, 2026).

**Tasks**
- [x] Define a small unmatched-log API (`recordMatch`, `recordMiss`, `exportJson`).
- [x] In `unmatched-log.js`, classify misses into `outOfScopeNoQuantity` or `unmatched`; for `unmatched`, extract `pillDescription` per the rules in the design section above.
- [x] Implement `unmatched-log.js`: unique-name dedupe, `pillDescription` aggregation with counts, out-of-scope name list, local JSON export (Alt+Shift+U).
- [x] Include comments that clearly explain the temporary, developer-only purpose of the module and the call-site wiring.
- [x] Manually browse Supplements categories and export results.
- [x] Commit the capture stage (collector in the extension, `manifest.json` content-script include, documented as temporary).
- [x] Cleanup: move `unmatched-log.js` to `tools/manual-name-audit/`; archive capture-stage `content.js` and `manifest.json` beside it for restore; remove collector from live extension (`manifest.json` content scripts and `UnmatchedLog` call sites). Documented in the archived module header. Extension tree is AMO-clean.
- [x] Decide quantity matching from the audit: last comma segment; require quantity; optional single-word prefix; ignore middle words; mandatory unit term; optional trailing `.?` for marks. Documented in section 3.4.
- [x] Implement the section 3.4 quantity matching model in `product-matching.js` and `Product.parseQuantity()`.
**Summary**
Ran out of API and had to use Grok for this. Grok continually overcomplicates and overreaches on code changes. For instance, even though we were only changing product matching (the .js file), it decided to move the pill quantity function into this module. We never discussed this, it was completely out of scope for the change and was a terrible idea.
I quickly had a clean design and was able to wrestle Grok to implement the proper changes. Matching is nearly 100% now. Overall, still a net positive experience. Thankfully Grok is abundant. Otherwise, the wasted resources would be maddening.

## Post-1.0 Roadmap

Testing and distribution are not standalone phases after `1.0.0`. Each roadmap phase owns its own smoke testing, release notes, documentation updates, and distribution tasks when they are needed.

The pre-1.0 phase constraints above are historical and do not govern these post-1.0 phase numbers.

### Phase 4: Chrome Desktop Port
Goal: get the product onto Chrome as quickly as possible. Do not expand product scope in this phase.

Ship as `1.1.0` on both Firefox and Chrome so the stores stay on one shared version. Firefox `1.0.0` is already tagged and published; the Chrome-ready source is a new snapshot, so bump the minor version rather than reusing `1.0.0`.

Do Chrome Web Store account/admin work in a normal browser profile or a dedicated publisher profile signed into Google, not in the isolated Chrome extension test profile.

**Rationale:**
- Chrome is the largest extension market by far, with public 2026 estimates ranging from roughly 220k-330k listed extensions and roughly 1.7B-2B+ aggregate extension installs/users across the Chrome Web Store.
- Publishing the Chrome version early makes Price Helper available where many iHerb shoppers already use extensions.
- The practical goal is to establish the listing, name, screenshots, support links, release process, and basic user trust under the original project.

**Similar extension note (2026-08-20):**
- Chrome Web Store has a similar extension, `Unit Price for iHerb / Smart Value Comparison` (`jbkndfaofddjidfepdmgmbphleegebjf`). The public listing shows version `1.0.9`, 10 users, no ratings, and last updated `August 9, 2026`. The public store page does not expose the original create date.
- That extension reports broader product coverage than Price Helper currently targets: supplement dose units, solids, liquids, capsule/tablet pricing, protein pricing, package option comparison, currency detection, and Chinese/Cantonese localization.
- Treat the other extension as related market context. Keep Price Helper's public positioning focused on its own value: listing-page pill/capsule/tablet pricing, category range context, color value indicators, no data collection, and a browser neutral listing.
- Do not expand the `1.1.0` Chrome scope just because another extension exists. The priority remains getting a trustworthy Chrome listing live quickly, then deciding which post-Chrome improvements are worth building from actual usage and feedback.

**Scope:**
- Keep the first Chrome release as close as possible to the Firefox 1.0.0 feature set. The `1.1.0` bump is for cross-browser packaging, not new product features.
- One source tree. Keep writing `browser.*`. Chrome now supports that namespace, so do not add `webextension-polyfill` unless testing finds a real compatibility gap. No bundler.
- Keep one `manifest.json` at first. Do not assume Chrome accepts Firefox fields; split manifests only if Chrome Web Store validation requires it.
- Branch in code only when a real Firefox/Chrome behavior difference appears. Preferences UI is the likely case.

**Chrome Web Store Setup (do first - blocks publishing)**
- [x] Create a Chrome Web Store developer account. Use an email that will remain available; the account email cannot be changed later. Used Proton dev account for Price Helper Google developer account.
- [x] Enable 2-step verification on the Google account. Info in Proton Pass.
- [x] Mail setup saved to mklimp site project. Complete this before finalizing the Chrome Web Store account.
- [x] Pay the one time Chrome Web Store developer registration fee.
- [x] Declare Trader vs Non-Trader in the developer dashboard. Non-Trader is the usual fit for a free hobby extension with no commercial activity; confirm at setup rather than assuming.

**Dev Environment**
- [x] Choose the Linux Chrome-family browser for local work: Google Chrome Stable. This is the closest local match for Chrome Web Store users. Use Chromium only as an optional secondary sanity check, and avoid Chrome Dev/Canary for first-pass validation because they are less representative of normal users.
- [x] Install Google Chrome Stable.
- [x] Follow the Chrome development loading procedure above: launch with the dedicated profile, keep it unsigned-in when practical, load `iherb-extension/`, reload after changes, open Preferences, and inspect the content-script console on an iHerb tab.

**AMO Listing update**
- [x] Rename AMO Listing.md to Extension listing.md so one document supports both environments.
- [x] Add the support email to the AMO listing.

**Chrome source updates**
- [x] Update version to 1.1.0. Update README.md
- [x] Update `manifest.json` for Chrome Web Store submission: check `name`, `version`, `icons`, and `description`; keep `description` at 132 characters or fewer; remove Firefox-only wording; and keep the existing `storage`, content script, and options page behavior.
- [x] Add a 128x128 PNG extension icon to the package for Chrome. For a square icon, use 96x96 artwork with 16 pixels of transparent padding on each side. Keep SVG manifest icons only if Chrome Web Store validation accepts them.

**Chrome verification**
- [x] Load the unpacked `1.1.0` extension in the chosen Chrome-family browser.
- [x] In Chrome, confirm category pages, search pages, SPA category switches, pagination, Back, Preferences / badge size, and that Live tiles stay excluded.
- [x] Confirm the Chrome content script and Preferences page console output are clean enough for submission.
- [x] Fix Chrome-only source issues found during local loading, while keeping one source tree and one `manifest.json` unless validation forces a split.
  - [x] On the extension page, the extension does not have an icon
  - [x] Warning that manifest key Developer is not recognized: No way to fix this without a separate manifest.json. For now, will hope it works without changes.
  - [x] The extension Details page does not show an option for changing the text size: options are there but behind a line on the details page. Only changes after a reload. Works fine afterwords.
  - [x] There is a lot of info in the extension Details page. Thoroughly review this content.

**Firefox regression verification**
- [x] Load the same `1.1.0` source as a temporary add-on in Firefox.
- [x] In Firefox, repeat the Chrome smoke checks so the Chrome port does not regress the already published browser.
- [x] Confirm any Chrome fixes did not change the Firefox Preferences experience or AMO ready manifest behavior.

**Chrome listing, docs, and screenshots**
- [x] Confirm the hosted privacy policy URL on mklimp.com meets Chrome Web Store requirements (CWS requires a public URL, not only extension text): IMO "no data" is all encompassing. No changes.
- [x] Consolidate shared Firefox and Chrome listing copy in `Extension Listing.md`, with Chrome-specific category, single purpose, permission, privacy, and screenshot fields called out separately.
- [x] Review the shared listing copy before submission so it stays browser neutral
- [x] Add colored dots to Chrome extension description
- [x] Add the required 440x280 small promotional image for Chrome Web Store: `listing/chrome-small-promo-440x280.png`.
- [x] Update `README.md` for two-browser install, current status, and `1.1.0` release notes.
- [x] Update `git-publish.md` for the shared `1.1.0` snapshot (Firefox and Chrome packages from the same source).

**Shared release package and submissions**
- [x] Build the store zip (`web-ext build`) from the smoke-tested `1.1.0` source.
- [x] Submit `1.1.0` to the Chrome Web Store.
- [x] Submit the same `1.1.0` package to AMO so Firefox stays in sync.
- [x] Publish the `v1.1.0` snapshot to the public GitHub repo using `git-publish.md`.

**Site update (after the Chrome listing is live)**
- [x] add #privacy tag to phiherb page for privacy statement submission.
- [x] Update mklimp.com for two-browser install: Chrome Web Store link, remove Firefox-only wording where it would be misleading, and match the `1.1.0` listing.
- [x] Update mklimp.com to include price range info
- [x] Update mklimp.com privacy section to match the info in `Extension Listing.md`

**Explicitly out of scope for this phase:**
- Microsoft Edge Add-ons (Phase 4.1).
- International support, multi-currency, and locale-specific quantity matching (Phase 7).
- Firefox Android (Phase 13).
- Compatibility testing with similar Chrome extensions installed at the same time (Phase 4.1).
- Visual redesign or new product features.
- Distribution/feedback campaign beyond the listing, README, git-publish, and site updates above.

### Phase 4.05: Rename Public GitHub Repo to PHiHerb
Goal: rename the public release repo from `iHerb` to `PHiHerb` so the GitHub name matches `mklimp.com/phiherb` and the Price Helper name.

GitHub keeps releases, tags, and history. Old `https://github.com/makmgusa/iHerb` URLs redirect after the rename.

- [x] Rename `makmgusa/iHerb` to `makmgusa/PHiHerb` on GitHub.
- [x] Rename `/home/megagrubby/Code/iHerb` to `/home/megagrubby/Code/PHiHerb`.
- [x] Set `origin` to `git@github.com:makmgusa/PHiHerb.git`.
- [x] Update `git-publish.md` repo names, folder paths, and workspace name.
- [x] Update the two GitHub URLs in `listing/Extension Listing.md`.
- [x] Update the mklimp site GitHub link in `phiherb.astro`.
- [x] Refresh CWS and AMO listing text if those listings already show the old GitHub URL.

**Explicitly out of scope for this phase:**
- Renaming `iHerbDev`.
- Changing the extension id `price-helper-for-iherb@mklimp.com`.
- Rewriting completed history that still says `iHerb` as the old public repo name.

### Phase 4.06 Exclude Outliers
- [ ] Exclude high priced outliers for the price range. This provides a better range. Possibly use a histogram of some type.


### Phase 4.1: Microsoft Edge Add-ons
Goal: list the Chromium-compatible build on Microsoft Edge Add-ons after the Chrome listing is stable. Do not expand product scope.

Edge is Chromium, so the Phase 4 package should load as-is. This phase is a separate store submission, not a second codebase.

Start this phase only after the Chrome listing is live and the `1.1.0` package has been smoke tested. Use the current shared version; bump only if Edge requires package changes.

Uptake in Chrome and Firefox is gradual. As expected. This phase will only be executed if installations hit a significant number.

**Edge Add-ons Setup (do first - blocks publishing)**
- [ ] Create a Microsoft Partner Center / Edge Add-ons publisher account.
- [ ] Complete any required publisher verification before the first submission.

**Dev Environment**
- [ ] Install desktop Edge on Linux if it is not already available, or confirm an existing Edge install.
- [ ] Document Load unpacked steps for Edge next to the Firefox and Chrome loading sections.

**Smoke test**
- [ ] Load the current shared package unpacked in desktop Edge.
- [ ] Repeat the Phase 4 smoke checks: category pages, search pages, SPA category switches, pagination, Back, Preferences / badge size, and Live tiles excluded.
- [ ] Note any Edge-only listing or options-UI differences. Branch in code only if a real difference blocks listing.
- [ ] In Chrome, test Price Helper with similar iHerb unit-price extensions installed in the same profile, especially `Unit Price for iHerb / Smart Value Comparison`, and confirm badge placement, selectors, MutationObserver behavior, and CSS remain isolated.

**Edge listing (README and git-publish are required if this release changes user-facing docs or the published snapshot)**
- [ ] Add Edge listing content to `Extension Listing.md` using the Chrome Web Store and Firefox listing sections. Adjust store specific fields, screenshot sizes, and permission text.
- [ ] Capture Edge screenshots from the submitted build.
- [ ] Update `README.md` for Edge install alongside Firefox and Chrome.
- [ ] Submit the package to Microsoft Edge Add-ons.
- [ ] If the published snapshot or version changed, follow `git-publish.md`. If only store listing copy changed, record that in README and skip a redundant snapshot.

**Site update (after the Edge listing is live)**
- [ ] Update mklimp.com with the Edge Add-ons install link.

**Explicitly out of scope for this phase:**
- New product features, visual redesign, international support, or Firefox Android.
- Re-doing the Chrome port or introducing an Edge-specific source tree.

### Phase 5: Git Publish Automation
Quite often a GIThub change causes a revision to the publish procedure. Until GIT is less dynamic this phase is on hold. The manual publish only takes about 15 minutes.
- [ ] Convert git-publish.md to git commands.

### Phase 6: Linear Setup
Changed from Jira to Linear. Because of this, some terminology below requires updates. The initial Jira attempt occurred after a Jira site update and was problematic. Some recent news included new Linear features so I explored that application. Linear has a lot of good "getting started" information and the small project overview aligned well with this project.

- Phases become Epics.
- Checklist items become Tasks.
- Earn/burn tracking becomes estimate + time spent + % complete.
- Weekly planning becomes a Sprint.
- Lessons learned become a Retro.
- Your project plan stays the strategic source of truth.
- [ ] Create Linear account and Scrum project for Price Helper for iHerb.
- [ ] Create board columns: Backlog, Selected, In Progress, Review/Test, Done.
- [ ] Create epics for the active near-term phases.
- [ ] Convert Phase 4 Chrome Desktop Port tasks into Linear issues.
- [ ] Convert Phase 5 Git Publish Automation tasks into Linear issues.
- [ ] Configure time tracking fields for estimate, time spent, and remaining work.
- [ ] Add or choose a % complete tracking method for earn/burn reporting.
- [ ] Complete one small task using Linear from backlog to Done.
- [ ] Review estimate vs actual time after the first Linear-managed task.
- [ ] Decide how `Project Plan.md` and Linear stay in sync.

### Phase 7: International Audience Research
Research international iHerb support separately from the Chrome port. The Chrome phase should stay focused on fast publication of the current working product.

**Research notes:**
- Australia is the best first international pilot because the site is English, uses the same product title patterns, and mostly needs host matching plus `AU$` currency handling.
- After Australia, evaluate other English-friendly iHerb markets before full localization work. Best candidates are New Zealand (`NZ$`), Singapore (`S$`), the United Kingdom (`£`), and Ireland (`€`).
- Keep three support surfaces separate: `manifest.json` host matches control where the extension runs, Chrome Web Store country distribution controls where Chrome users can install, and store listing locales control language only.
- Chrome Web Store does not automatically translate listing text. It supports localized listing metadata and localized screenshots per locale.
- AMO does not have a Chrome-style country distribution setting. AMO supports localized listing text and screenshot captions, but screenshot images are one shared set.
- Use README, the project site, and store listing text to explain supported iHerb sites because host permissions are technical enforcement, not a clear user support matrix.
- Firefox is not an English-only audience, but it is not the largest browser audience in most international consumer markets.
- Asian supplement YouTube activity may indicate a real international audience for iHerb shopping tools.
- Do not translate the extension UI first. The UI has little text, and translation does not help if parsing fails.
- International readiness depends on whether localized iHerb pages change product titles, quantity words, price formats, currency symbols, decimal separators, or DOM selectors.
- If localized titles remain mostly English, multi-currency support may be the first useful international feature.
- If localized titles are translated, add locale-specific quantity terms before investing in UI translation.

**Tasks:**
- [ ] English speaking localization
  - [x] Update version to 1.1.1
  - [x] Add `au.iherb.com` to every required `manifest.json` match section, then verify Chrome extension site access allows the new host.
  - [x] Update currency parsing so `AU$` displays as `AU$0.16/unit` instead of `A0.16/unit`, while preserving current `$` behavior.
  - [x] Smoke test Australian listing/search pages with AU currency and US currency selected.
      Test complete. Price range maintained but the products display in a different order so the range is technically inaccurate.
  - [x] Extend currency display rules only as each market is verified (`NZ$`, `SG$`, `£`,`CA$`) so unsupported formats do not silently look correct. Also update manifest.json.
    EU prices are separated by commas so the price calculation does not work. Adding as a later work item.
  - [x] Release the application for the newly enabled currencies.
  - [ ] Update mklimp.com to include support for the new sites.
  - [ ] Upload screenshots for 2 other currencies to AMO (UK and Canada)
  - [ ] Update the Extension Listing procedure to support the new sites. Consider automating this in the future so updates are not time consuming.
  - [ ] Make a design decision about currency/country/language switches
  - [ ] Decide whether unsupported currencies should keep the old fallback behavior, fail closed, or show a debug-only signal.
  - [ ] Decide how category range badges should handle currency, including the current hardcoded `$` display and whether ranges should reset or split by currency.
- [ ] Add support for comma separated currencies including the EU
- [ ] Smoke test Japanese, Korean, and Chinese iHerb listing/search pages.
- [ ] Record whether selectors, quantity parsing, currency parsing, badge layout, SPA navigation, and lazy loading still work per locale.

### Phase 8: Low-Priority Detection Backlog
Enhanced detection is partially complete. Keep the remaining items as low-priority backlog work unless user feedback shows one of these gaps is blocking real use.

- [ ] Handle multiple quantity options on listing pages (products with +More Options)
- [ ] Improve quantity parsing (handle various formats)
- [ ] Optimize performance for listing pages with many products
- [ ] Handle edge cases (missing data, parsing errors)
- [ ] Continue the Pill Keyword Backlog from Phase 3.66 exports by promoting recurring unmatched terms into the quantity pattern or keyword list
 
### Phase 9: Unit price by product Robust Solution
- [ ] Define a long-term strategy for maintaining and applying price distributions (potentially including storing aggregated price data on a web server or other persistent storage, while respecting privacy and iHerb terms).
- [ ] Enhance the solution accounting for failure modes, rate limiting, and graceful degradation when external data is unavailable.

### Phase 10: Robustness
- [ ] Enhance error handling and fallbacks
- [ ] Optimize performance (reduce DOM queries, use caching)
- [ ] Test across different iherb.com page types
- [ ] If criteria are selected from the left panel, use the price range for the criteria results (url does change for additional criteria)
- [ ] Handle edge cases (missing data, parsing errors)
- [ ] Implement keyword configuration loading and promotion flow (candidate -> approved -> active) so pill matching is no longer hardcoded
- [ ] calculate unit price for "see in cart" items. The price is crossed out in product listing pages. Different field than the extension currently uses.
- [ ] Scan summary debug info.

### Phase 11: Product Detail Pages (Optional - Lower Priority)
- [ ] Extract price and quantity from product detail pages
- [ ] Calculate and display unit price on detail pages
- [ ] Show price tier
- [ ] Improve calculation accuracy (address known inaccuracies in iherb.com's serving calculation)
- [ ] Show calculation breakdown (price / quantity = unit price)
- [ ] Update dynamically if user changes quantity/options

### Phase 12: Polish & Features
- [ ] Expand Preferences page beyond the Phase 3.65 badge size control
- [ ] Optionally apply badge size preference to the category price range badge
- [ ] Support for different currencies
- [ ] Improve visual design, extension description and UX
- [ ] Add keyboard shortcuts (optional)
- [ ] Support for shopping cart page (optional)
- [ ] Clean up Price Range badge. Price Helper text rounded like iHerb. The remaining text matches the product badges.

### Phase 13: Android Beta
Firefox Android is likely a niche market and may not be worth the effort. A Chrome desktop version helps a much larger audience, so Android stays lowest priority unless a clear tester or personal use case appears.

**Target browser: Firefox Nightly for Android** (Gecko MV3 support matches desktop Firefox 142+; no code or manifest changes required).

**Design decisions:**
- No manifest or code changes expected; the existing MV3/Gecko manifest targets Firefox 142+ which aligns with Nightly.
- Install method: sideload signed `.xpi` via "Install Extension from File" (Settings > About Firefox > tap logo 5x to unlock hidden menu). The `.xpi` must be Mozilla-signed; AMO unlisted signing satisfies this. Ref: https://extensionworkshop.com/documentation/publish/install-self-distributed/ (see "Install add-on from file on Android" section)
- Badge layout risk: iherb.com mobile CSS may shift tile layout; badge positioning may need adjustment. If so, fix via media queries in `inject.css` - no JS changes needed.
- If iherb.com serves different DOM on mobile, `content.js` selectors may need mobile-specific branches. Prefer selectors that handle both over UA/width detection. The smoke test will reveal whether the DOM differs or just re-flows.
- Lazy-load behavior on mobile scroll may differ from desktop MutationObserver assumptions.

**Effort estimate:** 2-4 hrs (low end if badges render cleanly; high end if layout fixes are needed).

- [ ] Install Firefox Nightly on Android device
- [ ] Test Option 1: browse directly to the hosted .xpi URL in Firefox Nightly - Firefox may prompt to install automatically
- [ ] If Option 1 fails, use "Install Extension from File" (Settings > About Firefox > tap logo 5x) to install manually
- [ ] Smoke test: browse iherb.com listing pages, confirm badges render
- [ ] Note any layout or badge positioning issues (mobile CSS may differ from desktop)
- [ ] Note any lazy-load/scroll behavior differences
- [ ] If debugging needed: enable remote debugging (Settings > About Firefox > tap logo 5x), then open `about:debugging` on desktop Firefox
  - Option A: USB cable - may be complicated from a VM (USB passthrough required)
  - Option B: WiFi - no cable, but phone and VM must be on the same network
- [ ] Document findings and follow-up tasks

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

## Historical Timeline Estimate
This estimate reflects the original pre-1.0 implementation plan. Post-1.0 roadmap phases should be estimated inside their own phase sections as they become active.

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

