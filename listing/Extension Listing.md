# Extension Listing Content

Content for the Chrome Web Store and Firefox Add-ons listings.
Use the Shared Listing Information section for copy used in both stores.

---

## Shared Listing Information

Use this section for fields that should stay the same across Chrome Web Store and AMO unless a store limit requires different wording.

### Name

Price Helper for iHerb

### Summary

Automatically calculates and displays unit prices for supplements on iHerb.com. Includes color coded badges so you can spot the best value at a glance.

### Description

**The unit price, right where you need it.**

Price Helper for iHerb adds a small unit price badge next to every qualifying product on iHerb.com listing and search pages. If a bottle of 120 capsules costs $18.00, you'll see **$0.15/unit** right on the tile, without clicking into the product page.

Near the category label, Price Helper also shows the unit price range for the current category or search.

**Color coded value indicators**

Each badge includes a colored dot that shows how a product's unit price compares to others in the same category:

- **Green** - among the lowest priced per unit in its category
- **Yellow** - middle range
- **Red** - among the highest priced per unit in its category

The range improves as you browse: visiting more pages in the same category adds all the prices browsed to the price comparison.

**What it detects**

The extension identifies pill and capsule like products. Products that aren't sold by count (powders, liquids, creams) are left untouched.

**Lightweight and private**

- Runs only on iherb.com
- No background activity on other sites
- Collects and transmits zero data
- No accounts, analytics, or tracking
- [Open source](https://github.com/makmgusa/iHerb)

### Category

Shopping

### Web URL

https://mklimp.com/phiherb

### Support Email

Email available.

### Support Website

https://mklimp.com/phiherb

### License

MIT License

### Privacy Policy

<!-- Use this text for each store privacy field unless the store requires a URL or different format. -->

This extension collects no data. It reads product, price and quantity information from the iHerb site and then adds Price Helper info near that price.

<!-- Use the project homepage as the public contact path. -->
If you have questions about this policy, contact the extension maintainer through the project homepage.

### Version Details

<!-- Updated each release. Pull from README.md. -->

#### Usage Notes

This extension injects Price Helper info on iherb.com pages only. It reads publicly visible product names and prices from the page, calculates a unit price, and displays Price Helper info near each qualifying product tile. No network requests are made by the extension. No data is collected or transmitted.

To use: visit any iHerb supplement page (e.g. https://www.iherb.com/c/coq10) and confirm that Price Helper badges appear on products sold by count (capsules, tablets, etc.).

### Shared Screenshot Plan

1. **Category page with badges** - A supplement category page showing several products with green, yellow, and red price badges visible. Include an excluded product.
   - Caption: "Price Helper badges appear automatically on listing pages."

### Shared Release Package

Use one `web-ext` package for store submission unless a store reports a blocking validation issue. Version source of truth is `iherb-extension/manifest.json`.

1. Confirm web-ext installation:
   - Run `web-ext --version`.
   - If web-ext is not installed, install it with `npm install -g web-ext`.
   - Run `web-ext --version` again to confirm the install.

2. Build the submission package:
   - From `/home/megagrubby/Code/iHerbDev/iherb-extension`
   - Remove any files in the `web-ext-artifacts` folder.
   - Run `web-ext build`.
   - Use the `.zip` file created in `web-ext-artifacts` for AMO upload.
   - Use the same `.zip` file for Chrome Web Store upload unless Chrome blocks the package.

3. Known manifest warning:
   - The Chrome warning for the Firefox `developer` manifest field is accepted for now.
   - Revisit only if Chrome Web Store treats the warning as a blocking upload issue.

---

## Firefox Add-ons (AMO)

AMO description, privacy policy, and review replies support Markdown.

Reference: https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/

### AMO Listed Release Procedure

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
   - Confirm AMO listed update behavior is correct before building. Review whether `browser_specific_settings.gecko.update_url` should be removed for the listed AMO package.
   - Confirm `config.json` does not expose development behavior for the release build.

4. Build the AMO submission package:
   - Follow the Shared Release Package section.
   - Upload the `.zip` file created by `web-ext build`.

5. Capture release screenshots:
   - Use the final release build so screenshots match the submitted behavior.
   - Use the screenshot list in the Shared Screenshot Plan section.

6. Submit the extension as listed:
   - Go to https://addons.mozilla.org/en-US/developers/
   - Choose listed distribution.
   - Upload the `.zip` file created by `web-ext build`.
   - Verify AMO validation has no errors or warnings.
   - Select desktop only unless Android support has been verified.
   - Enter the listing fields from this document.
   - Enter the release notes from the Version Details section.
   - Submit for AMO review.
   - Upload screenshots to the Developer Hub.
   - Upload 128x128 icon to the Developer Hub.

7. Download the XPI for upload with the GitHub release:
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
   - Use the update info from README.md.

### AMO Self Hosting Fallback

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

### AMO Listing Field Status

Fields that must be set on the AMO Developer Hub before or at public release.

- **Add-on URL slug** - Set to `price-helper-for-iherb` (currently AMO assigned hash URL)
- **Summary** - Enter the text from the Shared Summary section (AMO currently shows the manifest description)
- **Description** - Enter the text from the Shared Description section (currently "None" on AMO)
- **Icon** - Upload the 128px PNG listing icon from the AMO Icons section
- **Tags** - Enter the tags from the AMO Tags section (currently "None" on AMO)

### AMO XPI File Name

price_helper_iherb_X.X.X.xpi

### AMO Add-on URL Slug

`price-helper-for-iherb`

### AMO Tags

AMO tags are a fixed checkbox list. Select from the available options:

- [x] shopping

### AMO Icons

AMO listing icons are separate store metadata. Upload the 128px PNG `PH` icon and let AMO resize it for the smaller listing placements.

- Primary upload: `listing/amo-icon-ph-128.png`
- Generated alternates if AMO asks for explicit sizes:
  - 32px: `listing/amo-icon-32.png`
  - 64px: `listing/amo-icon-64.png`
  - 128px: `listing/amo-icon-128.png`

### AMO Screenshots

<!-- Upload actual screenshots during AMO submission for full release. -->
<!-- Recommended size: 1280x800 or similar 1.6:1 ratio. -->

Screenshot asset: `listing/screenshot-1280x800.png`

---

## Chrome Web Store

Use the shared listing data above, but use Chrome plain text fields because Chrome Web Store does not render Markdown.

### Chrome Plain Text Description

Use this plain text description in Chrome Web Store:

```text
The unit price, right where you need it.

Price Helper for iHerb adds a small unit price badge next to every qualifying product on iHerb.com listing and search pages. If a bottle of 120 capsules costs $18.00, you'll see $0.15/unit right on the tile, without clicking into the product page.

Near the category label, Price Helper also shows the unit price range for the current category or search.

Color coded value indicators

Each badge includes a colored dot that shows how a product's unit price compares to others in the same category:

Green - among the lowest priced per unit in its category
Yellow - middle range
Red - among the highest priced per unit in its category

The range improves as you browse: visiting more pages in the same category adds all the prices browsed to the price comparison.

What it detects

The extension identifies pill and capsule like products. Products that aren't sold by count (powders, liquids, creams) are left untouched.

Lightweight and private

Runs only on iherb.com
No background activity on other sites
Collects and transmits zero data
No accounts, analytics, or tracking
Open source: https://github.com/makmgusa/iHerb
```

### Chrome Badge Color Lines

Use these three lines in place of the shared description's plain color bullets:

- 🟢 Green - among the lowest priced per unit in its category
- 🟡 Yellow - middle price range
- 🔴 Red - among the highest priced per unit in its category

### Initial Store Setup
- Account registered with Price Helper Google Profile.
- Account setup as Google Developer
- Account registered to Proton Development account.
- Once the Google Account is created, a Chrome Web Store account needs creating
- Set it up as a non-Trader account. Learning project. No monetary goals.
- Provide and verify Price Helper email.
- Leave address blank


### Chrome Web Store Listing Field Status

- **Name** - Enter the text from the Shared Name section.
- **Summary** - Enter the text from the Shared Summary section.
- **Description** - Enter the text from the Chrome Plain Text Description section.
- **Category** - Use Shopping unless Chrome requires a better match.
- **Icon** - Upload a 128px PNG icon.
- **Small promotional image** - Upload `listing/chrome-small-promo-440x280.png`.
- **Screenshots** - Upload Chrome screenshots at 1280x800.
- **Single purpose justification** - Explain that the extension calculates and displays unit prices on iHerb listing and search pages.

### Privacy Section
- **Single Purpose** - enter Summary from the shared info section
- **Storage Justification** - Storage is used for your text size preference.
- **Host Permission Justification** - The extension needs access to www.iherb.com so it can read visible product names, prices, and quantity text on iHerb listing and search pages. It uses that page content to calculate and display unit price badges directly on the page.
- **Data Usage** - all "collect" items are unchecked. All "disclosures" are checked because we do not collect data.
- **Privacy Policy** - https://mklimp.com/phiherb/#privacy

### Distribution
 - **Payments** - Free of charge
 - **Visibility** - Public
 - **Distribution** - US, Canada and Puerto Rico

### Chrome Web Store Release Procedure

Use this procedure for a public Chrome Web Store release. Version source of truth is `iherb-extension/manifest.json`.

1. Increment and verify release version:
   - Increment the version in `iherb-extension/manifest.json`.
   - Confirm planned git tags/releases match the `manifest.json` version exactly.

2. Review release documentation:
   - Review `README.md` for current status, install instructions, known issues, privacy text, and feedback/support links.
   - Ensure `CHANGELOG.md` contains all completed release history.
   - Confirm the shared listing fields still match the release behavior.

3. Verify release config:
   - Confirm `manifest.json` name, description, homepage, developer info, and data collection fields are current.
   - Confirm Chrome does not receive Firefox only manifest fields that block upload.
   - Confirm `config.json` does not expose development behavior for the release build.

4. Build the Chrome submission package:
   - Follow the Shared Release Package section.
   - Upload the `.zip` file created by `web-ext build`.

5. Capture release screenshots:
   - Use the final release build so screenshots match the submitted behavior.
   - Use the screenshot list in the Shared Screenshot Plan section.

6. Submit the extension to Chrome Web Store:
   - Go to the Chrome Web Store Developer Dashboard.
   - Upload the `.zip` file created by `web-ext build`.
   - Enter the shared listing fields and Chrome specific justifications from this document.
   - Submit for Chrome review.
