# Product Name Audit Plan (Historical)

## Status
**This document is historical only.** Forward planning for unmatched product-name collection lives in `Project Plan.md` **Phase 3.66 Unmatched Product Name Capture**.

Do not treat this file as the source of truth for deliverables, phase scope, or next steps.

### Pivot (July 23, 2026)
- Playwright multi-category collection was paused after Cloudflare/security challenges (July 21–22, 2026).
- A temporary separate capture extension is no longer the preferred path.
- Preferred path: add local unmatched logging to Price Helper, then ship AMO builds with a stub module so reviewers do not see active logging code.
- Shared matching prep completed under this experiment remains useful and is reused by Phase 3.66.

## Project Overview
Manual identification of unmatched products is slow. This sub-project tried a standalone Playwright audit tool under `tools/product-name-audit/` to gather Supplements listing titles and report which names the Price Helper quantity pattern does not handle.

## Goals
- Collect a broad, bounded sample of product names from the iHerb Supplements section.
- Reuse the same product-name field contract and quantity matching pattern that the extension uses.
- Tally handled and unhandled product names.
- Group unhandled names into useful patterns so extension parsing improvements are data driven.
- Keep the tool crawler ready without making the first version an automated crawler.

## Relationship To The Extension
- The extension remains focused on in-page unit price display.
- The audit tool lives under `tools/product-name-audit/`.
- Shared product-name and quantity matching data lives in `iherb-extension/shared/product-matching.js`.
- The shared module exports `PRODUCT_LINK_SELECTOR`, `PRODUCT_NAME_ATTRIBUTE`, and `PILL_QUANTITY_PATTERN` for extension and audit tool consumers.
- Quantity pattern build constants stay private inside the shared module so consumers use the same final matching definition.
- Product-specific parsing methods, such as `Product.parseQuantity()`, remain exlusive to the extension.
- The shared module is the single source of truth for the product-name field contract and quantity matching pattern.
- Audit results should feed future updates to the extension quantity matching pattern and Pill Keyword Backlog.

## Scope

### In Scope
- Use browser automation to load hydrated iHerb listing pages.
- Implement the run configurations defined in `Run Configurations`.
- Extract the full product title from rendered listing tiles using the shared selector and attribute constants.
- Match each full product title with the shared quantity pattern to find the count/unit segment inside the larger name.
- Save raw observations and a readable summary report.
- Track URL state so the tool can later evolve into a crawler.

### Out Of Scope For The First Version
- Shipping crawler code inside the Firefox extension.
- Full-site crawling.
- Product detail page crawling.
- Price history, user data collection, or account-specific pages.
- Aggressive parallel crawling.

## Project Files
- This plan is dead. Forward work is `Project Plan.md` Phase 3.66.
- `iherb-extension/shared/product-matching.js` is the shared module for product-name extraction fields and quantity matching.
- Future implementation files should stay under `tools/product-name-audit/`.
- Generated cache and report output should be treated as local, disposable data because audit runs may create noisy file churn.
- `cache/` and `output/` are gitignored, with `.gitkeep` placeholders committed only so the directories exist.
- If a small audit snapshot is worth preserving, save it intentionally outside routine `cache/` or `output/` churn, or force-add the specific reviewed file.

## Environment And Tooling
- Runtime: Node.js, because Playwright's primary automation API is distributed as a Node package.
- Package manager: npm, scoped to `tools/product-name-audit/`. Use npm for project dependencies, not global installs.
- OS packages: use `apt` only if the machine is missing system-level prerequisites such as the Node.js/npm runtime or browser libraries. Do not use `apt` for project dependencies.
- Browser automation: Playwright with Firefox for the audit runner, matching the extension's target browser family.
- Browser fallback: Chromium only if Playwright Firefox has automation-specific issues that block the audit.
- Browser mode: start with headed mode (`headless: false`) so the Supplements mega-menu behavior can be observed while selectors are being developed.
- Network access: no `curl`-based scraping is planned. Use Playwright against the public browser interface.
- Setup steps for Playwright and the firefox browser it will use:
  - `node --version`
  - `npm --version`
  - `npm init -y`
  - `npm install -D playwright`
  - `npx playwright install firefox`

## Hardware Estimates
- Target machine: small Linux VM with 4 vCPUs, 4GB memory and 40GB disk space.
- CPU: 4 vCPUs is enough for the bounded Playwright runs defined in `Run Configurations`.
- Memory: prefer staying at 4 GB. Bump to 8 GB only if headed Firefox causes swapping, browser launches fail, or page loads become unstable.
- Disk: plenty of disk is available. Expect roughly 500 MB to 1 GB for npm dependencies, Playwright browser files, cache, and small reports, with larger retained audit outputs increasing usage.
- Network: follow the limits defined in `Run Configurations`. No bulk downloading, screenshots, video, or tracing by default.
- Failure signal: if the VM swaps heavily, browser launches fail, or page loads become unstable, switch from headed to headless mode before increasing memory.

## Effort Estimate
- First usable audit run (phase 1-3): 7 to 11 hours.
- Crawler-ready version through Phase 4: 9 to 15 hours.
- Phase 1 shared matching preparation: 1 to 2 hours.
- Phase 2 bounded audit runner: 4 to 6 hours.
- Phase 3 unhandled name reporting: 2 to 3 hours.
- Phase 4 crawler-ready state: 2 to 4 hours.
- Main risk: rapid navigation or automation timing may expose hydration, pagination, or menu-open issues that the extension's normal in-page scanning does not hit.

## Architecture
The first version should stay simple: product collection, quantity parsing, URL state, and reporting should be separate enough to avoid rewrites later, but not abstracted beyond the immediate audit needs.

### Source
Owns category URL discovery and saved URL-list input.

### Navigator
Owns Playwright browser lifecycle, page navigation, menu reveal behavior, hydration waits, and conservative delays.

### Extractor
Owns DOM selectors for mega-menu category links and pagination links. Product-title extraction should import `PRODUCT_LINK_SELECTOR` and `PRODUCT_NAME_ATTRIBUTE` from `iherb-extension/shared/product-matching.js` so the audit tool reads the same full listing title as the extension.

### Parser
Owns quantity matching. This should import `PILL_QUANTITY_PATTERN` from `iherb-extension/shared/product-matching.js`, while consumer-specific parsing methods remain in the extension or audit runner.

The parser should receive the full product title, not a pre-trimmed pill-name fragment. For example, `California Gold Nutrition, Omega-3 Premium Fish Oil, 100 Fish Gelatin Softgels (1,100 mg per Softgel)` should be preserved as the observed title. For unmatched products, the audit output should extract the pill description phrase without the quantity number, such as `Fish Gelatin Softgels`, so parser gaps can be reviewed without losing the full observed title.

Smoke-test pill description extraction should stay simple until observed misses justify more rules:
- Strip parenthetical text from the full observed title.
- Normalize repeated whitespace.
- Take the final comma-separated phrase.
- If the final phrase starts with a number, remove that leading number and use the remaining text as `pillDescription`.
- If the final phrase does not start with a number, leave `pillDescription` unset.

### Queue And State
Owns the saved category URL list, pending URLs, visited URLs, run caps, retry counts, and resume data.

### Reporter
Owns raw observations plus grouped summaries:
- total products scanned
- handled count
- unhandled count
- all unmatched products with full observed title, source category, and page
- per-product unmatched pill description, when one can be extracted from the full observed title
- aggregated unmatched pill descriptions with occurrence counts
- all listed data is desired. Multiple reports are acceptable if that is the simplest solution.
- A compact structured activity record is deferred until after raw observations and summaries work. It should capture the configuration filename, start and end timestamps, visited URLs, product count, warnings, and stop reason.

## Run Configurations
All product scanning should run from a saved URL list. A configuration with `inputPaths.categoryUrlList` set to `null` decodes and saves the menu list. A configuration with a category-list path reuses that list for bounded category visits.

## Run Specification Files
- Store JSON run specifications under `tools/product-name-audit/configs/`.
- Select a configuration with its filename: `npm run audit -- --config configs/menu-decode.json`.
- A run specification must include `headless` and `inputPaths.categoryUrlList`. Set the latter to `null` to decode the menu or to a saved-list path to visit categories.
- Run limits, delays, input paths, and output paths belong in the run specification as those capabilities are added.
- The JSON file is the source of truth for run limits. The runner may accept only operational CLI overrides, such as `--headless`, that cannot increase a configured limit.

### Menu Decode
- One browser page.
- Reveal the rendered Supplements mega menu.
- Extract visible category labels and URLs.
- When `outputOptions.randomizeCategoryUrlList` is true, randomize the decoded category URL list before saving it to `tools/product-name-audit/cache/` so smoke runs do not repeatedly start with the same ordered categories. Default to preserving menu order unless the option is enabled.
- For early manual runs, manually pruning broad or irrelevant categories from the saved list is acceptable. Add persistent configuration filters before relying on exclusions across repeated menu decodes.

### Smoke Test
- Status: single-category verification succeeded. Multi-category Playwright navigation is unreliable: direct category navigation triggered security after repeated visits, and menu-driven category selection triggered security on the first category click.
- Read the saved category URL list.
- Do not expand Playwright category visits further without an explicit decision to resume that approach.
- Scan 1 listing page per category.
- Stop immediately if a security response, challenge page, or other unwanted-automation signal appears.
- Save matched/unmatched audit output to a timestamped file based on the configured summary path.

## Implementation Increments

### Increment 1: Smoke Audit Output
- Honor configured category, listing-page, browser-page, and runtime limits.
- Detect known challenge, security-response, and error-page signals, then stop the run.
- Reproduce the extension's proven page-readiness and load-sequencing technique where applicable; do not rely on navigation completion alone before extracting hydrated listing content.
- Extract product names using the shared listing selector and attribute constants.
- Match product names with the shared quantity pattern.
- Classify unmatched product names with weight/volume packaging and no other possible quantity number as `outOfScopeNoQuantity`; keep ambiguous names in `unmatched`.
- For unmatched products, attempt to extract a pill description phrase from the full observed title without the leading quantity number. See Parser section for further detail.
- Save total product count, matched count, unmatched count, out-of-scope no-quantity count, unmatched products, and out-of-scope no-quantity products with category, listing-page number, product name, and extracted pill description when available.
- Re-run the one-category smoke configuration manually before increasing any configured category limit.

### Increment 1B: Multi-Category Smoke Pacing
- [x] Replace exact repeated category timing with configured minimum and maximum delay ranges.
- [x] Apply dwell delay after product extraction and a separate between-category delay before the next category navigation.
- [x] Log the selected randomized delays so runs are auditable.
- [x] Route browser interactions through one logged pacing helper so no visible web action happens immediately.
- [x] Replace the current simple scroll pass with incremental scrolls: choose a small configured/randomized step count, scroll by modest row-like distances, and wait a jittered delay between steps.
- [ ] Consider a final near-bottom scroll only when the workflow needs pagination access.
- [x] Prefer visible site interactions where practical: open the relevant menu and click the category link instead of repeatedly navigating directly to category URLs.
- [ ] For future pagination work, click the visible next-page control instead of constructing or navigating directly to a next-page URL.
- Keep the run single-browser-page and non-parallel.
- Do not retry, bypass, or continue if Cloudflare, a security inquiry, a challenge page, or another unwanted-automation signal appears.
- Result: this approach did not make multi-category Playwright collection reliable. On July 22, 2026, direct category navigation reached a Cloudflare security inquiry after repeated visits, and menu-driven category selection reached a challenge on the first category click. Pause further Playwright navigation tuning.

### Increment 2: Name Reporting
- Aggregate repeated unmatched pill descriptions to identify parser candidates.
- Add any additional readable report format needed after the smoke JSON output is useful.

### Early Audit
- Read the saved category URL list.
- Supplements section only.
- Scan the first 3 pages per category.
- Keep one browser context, one page, and no parallelism.
- Run the pre-run terms and robots guidance review before any networked scan.

## Future Expansion
Expanded crawler behavior requires explicit approval before implementation or use.

- Persistent queue state.
- URL dedupe.
- Retry and backoff.
- Resume support.
- Clear limits for depth, category count, page count, and runtime.

Do not add parallel crawling, scheduled crawling, private API calls, authenticated account access, or bypass behavior without a fresh terms review.

## Guardrails
- Run limits must be defined in `Run Configurations`, not repeated in other sections.
- Resume from saved state instead of restarting large runs.
- Cache fetched/rendered page observations where useful.
- Avoid account pages, carts, checkout pages, and personalized areas.

### Temporary Manual Extension Option
- Preferred next collection path. Do not spend more time tuning Playwright navigation against Cloudflare.
- Build a temporary separate extension whose only purpose is to collect undetected product names from the current page the user manually navigated to.
- Reuse the same full-title extraction and unmatched-product logic created for the Playwright audit runner.
- Provide a simple user-triggered capture action, such as a button, that scans the current listing page and stores or downloads the missing-name observations.
- The user manually navigates to the next category or page, then triggers capture again.
- Keep the temporary extension separate from the production price-helper behavior unless and until the audit workflow proves useful enough to integrate.
- This approach avoids automated navigation will likely avoid any bot-like behavior. Probably the quickest path with the least effort.

## Terms And Compliance Guardrails
- This plan is an engineering compliance checklist, not legal advice.
- Reviewed terms on July 20, 2026. They emphasize lawful use, not interfering with normal site operation, and accessing the Site only through the interface iHerb provides. This application is designed to comply with those constraints.
- Use Playwright only as a browser automation layer over publicly visible pages. Do not call private APIs, bypass access controls, avoid rate limits, solve challenges, or use authenticated account areas.
- Keep the first version small and manual-run only. Do not schedule recurring crawls or run unattended expansion until terms, robots guidance, and site behavior have been reviewed again.
- Do not publish, redistribute, or sell raw iHerb product data. Generated output should be used internally to improve quantity matching and should be treated as disposable unless a small audit snapshot is intentionally reviewed.
- Do not use iHerb logos, page designs, screenshots, or branding in the audit tool. Keep project naming descriptive and include no affiliation claim.
- Stop a run if iHerb shows blocking, challenge pages, error spikes, degraded behavior, or any signal that automation is unwanted.
- A July 21, 2026 Smoke Test triggered an iHerb security response after rapid sequential navigations. On July 22, revised jittered pacing and menu-driven navigation still did not make multi-category collection reliable. Do not continue Playwright navigation tuning unless explicitly approved.
- Keep crawler-ready architecture, but require an explicit approval checkpoint before enabling broader discovery, higher page limits, parallelism, or scheduled operation.

## Phase 1: Shared Matching Preparation
- [x] Identify the product-name selector, product-name attribute, and quantity matching constants currently embedded in `iherb-extension/content/content.js`.
- [x] Move the product-name field constants and `PILL_QUANTITY_PATTERN` build constants into `iherb-extension/shared/product-matching.js`.
- [x] Update the extension to use the shared field constants and quantity pattern without changing behavior.

## Phase 2: Bounded Audit Runner
The goal of this phase is to be able to complete the menu decode and smoke test run configurations.
- [x] Create a local Node/npm project under `tools/product-name-audit/`.
- [x] Ensure environment has all required software - see Environment and Tooling
- [x] Create a Playwright-based standalone runner.
- [x] Implement the necessary components for the menu decode run configuration
  - npm run audit -- --config configs/menu-decode.json
- [ ] Implement Increment 1 smoke audit output for the smoke test run configuration
  - npm run audit -- --config configs/smoke-test.json

## Phase 3: Unhandled Name Reporting
- [ ] Implement Increment 2 name reporting.
- [ ] Produce a readable summary of handled and unhandled names.
- [ ] Aggregate extracted unmatched pill descriptions with occurrence counts.
- [ ] Preserve source URL, category, page number, and product name for each miss.
- [ ] Convert recurring misses into extension parser candidates.
- [ ] Write a compact structured activity record after raw observation and summary reporting work.

## Phase 4: Crawler-Ready State
- [ ] Add persistent URL queue state.
- [ ] Add visited URL tracking and dedupe.
- [ ] Add retry and backoff rules.
- [ ] Add resumable runs.
- [ ] Add an approval checkpoint before any expanded crawl mode can run.
- [ ] Document safe run configurations for any future medium or expanded audits.

## Open Questions
- Closed. See `Project Plan.md` Phase 3.66.

## Project Summary
The goal was quick and dirty collection of unmatched product names so we can update the extension and know it matches a large percentage of products. Also learning a scraping technique (sidenote, Scrapy seems intriguing compared to Playwright).

Was using GPT 5.5 but API was consuming pretty quickly. Switched to GPT-5.6 Terra which is supposed to have half the cost and better results. Both models on medium reasoning and 272k context.

Similar to other dev experiences. It can crank out a ton of code and designs quickly but it tends to be slop. For instance, config files were part of the design from the beginning. AI hard coded functionality based on development phases even though the Project Plan and config file structure supported those features without hard coding. Another example is that description of the Project Phases was scattered everywhere. We have Rules for this but they are only sometimes taken into account.

Condsiering we can create 500 lines of mostly correct output in 4 or 5 hours the issues seem worth the end result. That is, if the implementer (aka me) knows good code structure, how to design and how to test.

One other frustration was that we are trying to quickly gather unrecognized product names. AI created a script and we kept getting bot challenges. AI was not smart enough to work through this problem without being told exacltly what to change every step of the way. For instance, a Playwright session had nothing that looked like human activity. Navigation from one url to the next. I had to direct it to navigate through the site menu. Scroll products like a person, etc. I also had to come up with all the design alternatives (e.g. temporary dev extension for product name capture.)

In the end, AI wasted the large part of 10 hours of dev time by proposing an inadequate solution. Some parts will translate to the extension but the extension would have been done by now if it was the intial design (including gathering all collection results).

Upon further thought, pivoting to an unmatched module in the Price Helper module is probably easiest. Because we are only using this as a short term fix for product names, it will be stubbed for AMO submission so we continue to honor our "no data collection" policy.

AI was asked to move the important info from this document to the main project plan. The only two important pieces are identifying unmatched product names and categorization of products in the output. Both were not included. I fixed this.