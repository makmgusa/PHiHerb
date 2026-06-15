# AMO Listing Content

Content for the Firefox Add-ons (addons.mozilla.org) listing.
AMO description, privacy policy, and review replies support Markdown.
Summary is plain text, 250 character max.

Reference: https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/

---

## Use `web-ext build` to produce an `.xpi` for extension submission

AMO's developer UI triggers installation when you click the .xpi link and offers no right-click save option. Use the `/type:attachment` URL trick below to force a download.

- confirm web-ext installation with `web-ext --version`
- If web-ext is not installed, install it with `npm install -g web-ext`. Run the version command again to confirm install.
- From iherb iherb-extension directory `/home/megagrubby/Code/iHerbDev/iHerbDev` run `web-ext build`

## Submit the Extension to AMO
- Submit the extension as **unlisted**
   - Go to https://addons.mozilla.org/en-US/developers/ and choose self distribution.
   - upload the zip file created in the web-ext build step. It is in the `web-ext-artifacts` directory
      - Verify there are no errors or warnings. Submit for desktop only.
   - Next step, no code generators.
   - At this point, we are "done" and await an email from AMO.
   - When the email arrives, follow these steps to download the signed `.xpi`:
      - Go to https://addons.mozilla.org/en-US/developers/ and open the extension from My Add-ons.
      - Click **Edit Product Page** > **Manage Status & Versions** > click the version number.
      - In the **Files** row, hover the `.xpi` link and copy the URL. It will look like:
        `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/filename.xpi`
      - Insert `/type:attachment/` after the file number to force a download instead of install:
        `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/type:attachment/filename.xpi`
      - Paste that URL into the address bar and the file will download.
      - Rename the file if desired (see XPI file name section) and upload to `https://mklimp.com/phiherb/`.
      - Update `updates.json` to point to the new hosted URL. The file number changes with each release.

   - Since we are self hosting for beta, none of the content in the remainder of this document is needed. All of this information is for public release.

## AMO Listing Field Status

Fields that must be set on the AMO Developer Hub before or at public release.

- [ ] **Add-on URL slug** - Set to `price-helper-for-iherb` (currently AMO-assigned hash URL)
- [ ] **Summary** - Enter the text from the Summary section below (AMO currently shows the manifest description)
- [ ] **Description** - Enter the text from the Description section below (currently "None" on AMO)
- [ ] **Tags** - Enter the tags from the Tags section below (currently "None" on AMO)

## Name

Price Helper for iHerb

## XPI file name
price_helper_iherb_beta_0.3.5.1.xpi

## Add-on URL (slug)

`price-helper-for-iherb`

## Summary (250 chars max)

Automatically calculates and displays unit prices for supplements on iHerb.com. Includes color-coded badges so you can spot the best value at a glance.

## Description

**The unit price, right where you need it.**

Price Helper for iHerb adds a small unit price badge next to every qualifying product on iHerb.com listing and search pages. If a bottle of 120 capsules costs $18.00, you'll see **$0.15/unit** right on the tile - no clicking into the product page required.

**Color-coded value indicators**

Each badge includes a colored dot that shows how a product's unit price compares to others in the same category:

- **Green** - among the lowest-priced per unit in its category
- **Yellow** - mid-range
- **Red** - among the highest-priced per unit in its category

The range improves as you browse: visiting more pages in the same category adds all the prices browsed to the price comparison.

**What it detects**

The extension identifies pill-like products. Products that aren't sold by count (powders, liquids, creams) are left untouched.

**Lightweight and private**

- Runs only on iherb.com - no background activity on other sites
- Collects and transmits zero data
- No accounts, no analytics, no tracking
- Open source

## Categories

1. Shopping
2. (leave second slot empty unless a better fit exists)

## Tags / Keywords

AMO tags are a fixed checkbox list (not free-form). Select from the available options:

- [x] shopping
- [ ] privacy (optional - extension collects no data, but this tag may mislead users expecting a privacy/tracker tool)

## Screenshots

<!-- Upload actual screenshots during AMO submission for full release -->
<!-- Recommended size: 1280×800 or similar 1.6:1 ratio. -->

1. **Category page with badges** - A supplement category page showing several products with green, yellow, and red price badges visible.
   - Caption: "Price Helper badges appear automatically on listing pages."

2. **Search results with badges** - A search results page showing badges on qualifying products, with non-pill products left untouched.
   - Caption: "Only pill-form supplements get badges. Powders and liquids are skipped."

3. **Close-up of badge** - Cropped view showing the badge format: colored dot + "$0.15/unit".
   - Caption: "Color-coded dots show relative value within the supplement."

## Homepage

https://mklimp.com/phiherb

## Support Email - optional

empty for Beta. May add one later.

## Support Website

https://mklimp.com/phiherb

## License

MIT License

## Privacy Policy

<!-- Paste this text into the Privacy Policy field on the AMO submission form. AMO does not require a hosted URL; this file is the single source of truth. -->

This extension collects no data. It reads product, price and quantity information from the iHerb site and then adds Price Helper info near that price.

Firefox labels the iherb.com content permission as accessing "your" data. This is standard boilerplate for any extension that reads a site's page content. No personal data is accessed or transmitted. The full source is available on GitHub.

<!-- Fill in once mail is decided (Phase 3.5 item 7) -->
If you have questions about this policy, contact support@mklimp.com.

## Version Details (Release Notes)

<!-- Updated each release. This populates the Releases section on AMO. -->

### v0.3.5.1

Initial beta release.

- Per-unit price badges on iHerb listing and search pages
- Color-coded dots (green / yellow / red) based on category price range
- Session-backed category ranges that accumulate as you browse
- Detects capsules, tablets, softgels, gummies, lozenges, and similar forms

### Notes for Beta Participants

This extension injects Price Helper info on iherb.com pages only. It reads publicly visible product names and prices from the page, calculates a unit price, and displays Price Helper info near each qualifying product tile. No network requests are made by the extension. No data is collected or transmitted.

To use: visit any iHerb supplement page (e.g. https://www.iherb.com/c/coq10) and confirm that Price Helper badges appear on products sold by count (capsules, tablets, etc.).
