# AMO Listing Content

Content for the Firefox Add-ons (addons.mozilla.org) listing.
AMO description, privacy policy, and review replies support Markdown.

Reference: https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/

---

## Listed Release Procedure

Use this procedure for a public AMO release. Version source of truth is `iherb-extension/manifest.json`.

1. Increment and verify release version:
   - Increment the version in `iherb-extension/manifest.json`.
   - Update the XPI file name section in this document.
   - Confirm planned git tags/releases match the `manifest.json` version exactly.

2. Review release documentation:
   - Review `README.md` for current status, install instructions, known issues, privacy text, and feedback/support links.
   - Ensure `README.md` contains a good summary of the changes included in the latest version. Maintain info for the last 2-3 releases in this document.
   - Ensure `CHANGELOG.md` contains all release history (items migrate from `README.md` to `CHANGELOG.md`).
   - Confirm this document's listing fields still match the release behavior.

3. Verify release config:
   - Confirm `manifest.json` name, description, homepage, developer info, and data collection fields are current.
   - Confirm AMO-listed update behavior is correct before building. Review whether `browser_specific_settings.gecko.update_url` should be removed for the listed AMO package.
   - Confirm `config.json` does not expose development behavior for the release build.

4. Build the AMO submission package:
   - Confirm web-ext installation with `web-ext --version`.
   - If web-ext is not installed, install it with `npm install -g web-ext`. Run the version command again to confirm install.
   - From `/home/megagrubby/Code/iHerbDev/iherb-extension`
   - Remove any files in the web-ext-artifacts folder
   - Run `web-ext build`
   - Use the `.zip` file created in the `web-ext-artifacts` directory for AMO upload.

5. Capture release screenshots:
   - Use the final release build so screenshots match the submitted behavior.
   - Use the screenshot list in the Screenshots section below.

6. Submit the extension as listed:
   - Go to https://addons.mozilla.org/en-US/developers/
   - Choose listed distribution.
   - Upload the `.zip` file created by `web-ext build`.
   - Verify AMO validation has no errors or warnings.
   - Select desktop only unless Android support has been verified.
   - Enter the listing fields from this document.
   - Enter the release notes from the Version Details section.
   - Submit for AMO review.
   - Upload screenshots to the Developer Hub
   - Upload 128x128 icon to the Developer Hub

7. Download the XPI for upload with the GitHub release
  - Go to https://addons.mozilla.org/en-US/developers/ and open the extension from My Add-ons.
  - Click **Edit Product Page** > **Manage Status & Versions** > click the version number.
  - In the **Files** row, hover the `.xpi` link and copy the URL. It will look like:
    `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/filename.xpi`
  - Insert `/type:attachment/` after the file number to force a download instead of install:
    `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/type:attachment/filename.xpi`
  - Paste that URL into the address bar and the file will download.
  - Rename the file if desired. See the XPI file name section.

8. Publish the public GitHub release snapshot:
   - Follow `git-publish.md` to copy the final release snapshot from `iHerbDev` to the public `iHerb` repo.
   - Create matching release tags/assets where the procedure calls for them.
   - Verify the public repo matches the exact version submitted to AMO.

9. Publish a release post on /r/PriceHelper.
  - Use the update info from README.md


## If Self Hosting Is Needed

Use this fallback procedure if the extension needs to be signed by AMO for self distribution.

- Submit the extension as **unlisted**:
  - Go to https://addons.mozilla.org/en-US/developers/ and choose self distribution.
  - Upload the `.zip` file created in the `web-ext-artifacts` directory.
  - Verify there are no errors or warnings. Submit for desktop only.
  - Select no code generators.
  - At this point, await the AMO email.
- When the email arrives, download the signed `.xpi`:
  - Go to https://addons.mozilla.org/en-US/developers/ and open the extension from My Add-ons.
  - Click **Edit Product Page** > **Manage Status & Versions** > click the version number.
  - In the **Files** row, hover the `.xpi` link and copy the URL. It will look like:
    `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/filename.xpi`
  - Insert `/type:attachment/` after the file number to force a download instead of install:
    `https://addons.mozilla.org/firefox/downloads/file/XXXXXXX/type:attachment/filename.xpi`
  - Paste that URL into the address bar and the file will download.
  - Rename the file if desired. See the XPI file name section.
  - Upload the signed `.xpi` to `https://mklimp.com/phiherb/`.
  - Update `updates.json` to point to the new hosted URL. The file number changes with each release. More details in the site repo.

## AMO Listing Field Status

Fields that must be set on the AMO Developer Hub before or at public release.

- [ ] **Add-on URL slug** - Set to `price-helper-for-iherb` (currently AMO-assigned hash URL)
- [ ] **Summary** - Enter the text from the Summary section below (AMO currently shows the manifest description)
- [ ] **Description** - Enter the text from the Description section below (currently "None" on AMO)
- [ ] **Icon** - Upload the 128px PNG listing icon from the Icons section below
- [ ] **Tags** - Enter the tags from the Tags section below (currently "None" on AMO)

## Name

Price Helper for iHerb

## XPI file name
price_helper_iherb_1.0.0.xpi

## Add-on URL (slug)

`price-helper-for-iherb`

## Summary (250 chars max)
Automatically calculates and displays unit prices for supplements on iHerb.com. Includes color-coded badges so you can spot the best value at a glance.

## Description 

**The unit price, right where you need it.**

Price Helper for iHerb adds a small unit price badge next to every qualifying product on iHerb.com listing and search pages. If a bottle of 120 capsules costs $18.00, you'll see **$0.15/unit** right on the tile - no clicking into the product page required.

**Color coded value indicators**

Each badge includes a colored dot that shows how a product's unit price compares to others in the same category:

- **Green** - among the lowest-priced per unit in its category
- **Yellow** - mid-range
- **Red** - among the highest-priced per unit in its category

The range improves as you browse: visiting more pages in the same category adds all the prices browsed to the price comparison.

**What it detects**

The extension identifies pill and capsule like products. Products that aren't sold by count (powders, liquids, creams) are left untouched.

**Lightweight and private**

- Runs only on iherb.com - no background activity on other sites
- Collects and transmits zero data
- No accounts, no analytics, no tracking
- [Open source](https://github.com/makmgusa/iHerb)

## Categories

1. Shopping
2. (leave second slot empty unless a better fit exists)

## Tags / Keywords

AMO tags are a fixed checkbox list (not free-form). Select from the available options:

- [x] shopping

## Icons

AMO listing icons are separate store metadata. Upload the 128px PNG `PH` icon and let AMO resize it for the smaller listing placements.

- Primary upload: `amo-icons/amo-icon-ph-128.png`
- Generated alternates if AMO asks for explicit sizes:
  - 32px: `amo-icons/amo-icon-32.png`
  - 64px: `amo-icons/amo-icon-64.png`
  - 128px: `amo-icons/amo-icon-128.png`

## Screenshots

<!-- Upload actual screenshots during AMO submission for full release -->
<!-- Recommended size: 1280×800 or similar 1.6:1 ratio. -->
Screenshot in root directory. amo-screenshot-1280x800.png

1. **Category page with badges** - A supplement category page showing several products with green, yellow, and red price badges visible. Include an excluded product.
   - Caption: "Price Helper badges appear automatically on listing pages."

## Web URL

https://mklimp.com/phiherb

## Support Email - optional

empty for now. May add one later.

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

<!-- Updated each release. This populates the Releases section on AMO. Pull from README.md -->

### Usage Notes

This extension injects Price Helper info on iherb.com pages only. It reads publicly visible product names and prices from the page, calculates a unit price, and displays Price Helper info near each qualifying product tile. No network requests are made by the extension. No data is collected or transmitted.

To use: visit any iHerb supplement page (e.g. https://www.iherb.com/c/coq10) and confirm that Price Helper badges appear on products sold by count (capsules, tablets, etc.).
