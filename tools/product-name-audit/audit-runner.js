// Playwright lifecycle wrapper for bounded, manual audit runs.
const fs = require("node:fs/promises");
const path = require("node:path");
const { firefox } = require("playwright");
const {
  PRODUCT_LINK_SELECTOR,
  PRODUCT_NAME_ATTRIBUTE,
  PILL_QUANTITY_PATTERN,
} = require("../../iherb-extension/shared/product-matching.js");

const DEFAULT_TIMEOUT_MS = 30_000;
const WELCOME_MODAL_TIMEOUT_MS = 5_000;
const SUPPLEMENTS_START_URL = "https://www.iherb.com/c/supplements";
const SUPPLEMENTS_MENU_SELECTOR = ".mega-menu-Supplements";
const SUPPLEMENTS_TRIGGER_SELECTOR =
  'a.link-bar-item[href="https://www.iherb.com/c/supplements"]';
const WELCOME_MODAL_SELECTOR = "div.welcome-modal-container";
const WELCOME_MODAL_CLOSE_SELECTOR = "div.close-button";
const CATEGORY_LINK_SELECTOR =
  'a.menu-link[href*="/c/"]:not(.brand-pill-wrapper)';
const PRODUCT_TILE_SELECTOR = ".product-cell, .product-inner, .product";
const EXCLUDED_PRODUCT_TILE_SELECTOR = ".product.live-item";
const HYDRATION_SCAN_DELAYS_MS = [300, 800, 1300];
const STOP_SIGNAL_PATTERNS = [
  { label: "access denied", pattern: /access denied/i },
  { label: "blocked request", pattern: /\bblocked\b/i },
  { label: "captcha challenge", pattern: /captcha/i },
  { label: "security response", pattern: /security response/i },
  { label: "unusual traffic", pattern: /unusual traffic/i },
  { label: "verification challenge", pattern: /verify you are human/i },
];
const WEIGHT_VOLUME_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:fl\s*oz|fluid\s*ounces?|ounces?|oz|lbs?|pounds?|kg|g|mg|mcg|l|ml)\b/gi;
const PARENTHETICAL_TEXT_PATTERN = /\([^)]*\)/g;
const COUNT_LED_SEGMENT_PATTERN = /^\s*\d[\d,]*(?:\.\d+)?\s+(.+?)\s*$/;
const NUMBER_PATTERN = /\d/;

class AuditRunner {
  constructor({ headless }) {
    this.headless = headless;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async start() {
    this.browser = await firefox.launch({ headless: this.headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  }

  async visit(url, pacing, label = `navigate to ${url}`) {
    return runPacedAction(this, pacing, label, async () => {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });

      return {
        title: await this.page.title(),
        url: this.page.url(),
      };
    });
  }

  async wait(delayMs) {
    await this.page.waitForTimeout(delayMs);
  }

  async scrollByViewportRatio(viewportRatio, pacing, label) {
    await runPacedAction(this, pacing, label, async () => {
      await this.page.evaluate((ratio) => {
        const scrollDistance = Math.floor(window.innerHeight * ratio);

        window.scrollBy(0, scrollDistance);
      }, viewportRatio);
    });
  }

  // Detects obvious unwanted automation or error responses before extraction.
  async detectStopSignal() {
    const title = await this.page.title();
    const url = this.page.url();
    let bodyText = "";

    try {
      bodyText = await this.page.locator("body").innerText({ timeout: 2_000 });
    } catch (error) {
      bodyText = "";
    }

    const searchableText = `${title}\n${url}\n${bodyText}`;

    for (const signal of STOP_SIGNAL_PATTERNS) {
      if (signal.pattern.test(searchableText)) {
        return signal.label;
      }
    }

    return null;
  }

  // Mirrors the extension's delayed post-navigation reads for hydrated listings.
  async extractProductNames() {
    const productLinks = this.page.locator(PRODUCT_LINK_SELECTOR);
    let productNames = [];

    await productLinks.first().waitFor({ state: "attached" });

    for (const delay of HYDRATION_SCAN_DELAYS_MS) {
      await this.wait(delay);
      productNames = await productLinks.evaluateAll(
        (
          links,
          { excludedProductTileSelector, nameAttribute, productTileSelector },
        ) =>
          links
            .filter((link) => {
              const productTile = link.closest(productTileSelector);

              return (
                productTile &&
                !productTile.closest(excludedProductTileSelector)
              );
            })
            .map((link) => link.getAttribute(nameAttribute)?.trim() || "")
            .filter(Boolean),
        {
          excludedProductTileSelector: EXCLUDED_PRODUCT_TILE_SELECTOR,
          nameAttribute: PRODUCT_NAME_ATTRIBUTE,
          productTileSelector: PRODUCT_TILE_SELECTOR,
        },
      );
    }

    return productNames;
  }

  // Dismisses the known public welcome overlay when it blocks menu access.
  async dismissWelcomeModal(pacing) {
    const welcomeModal = this.page.locator(WELCOME_MODAL_SELECTOR);
    let isVisible = false;

    try {
      await welcomeModal.waitFor({
        state: "visible",
        timeout: WELCOME_MODAL_TIMEOUT_MS,
      });
      isVisible = true;
    } catch (error) {
      if (error.name !== "TimeoutError") {
        throw error;
      }
    }

    if (isVisible) {
      await runPacedAction(this, pacing, "close welcome modal", async () => {
        await welcomeModal.locator(WELCOME_MODAL_CLOSE_SELECTOR).click();
      });
      await welcomeModal.waitFor({ state: "hidden" });
    }
  }

  // Decodes rendered category links from iHerb's Supplements mega menu.
  async decodeSupplementsMenu(navigationDelayMs, pacing) {
    const trigger = this.page.locator(SUPPLEMENTS_TRIGGER_SELECTOR);
    const menu = this.page.locator(SUPPLEMENTS_MENU_SELECTOR);

    await this.dismissWelcomeModal(pacing);
    await runPacedAction(this, pacing, "hover supplements menu", async () => {
      await trigger.hover();
    });
    await menu.waitFor({ state: "visible" });
    await this.page.waitForTimeout(navigationDelayMs);

    return menu.locator(CATEGORY_LINK_SELECTOR).evaluateAll((links) => {
      const categoriesByUrl = new Map();

      for (const link of links) {
        const label = link.textContent.trim().replace(/\s+/g, " ");
        const url = link.href;

        if (label && url) {
          categoriesByUrl.set(url, { label, url });
        }
      }

      return [...categoriesByUrl.values()];
    });
  }

  async selectSupplementsCategory(category, pacing) {
    const trigger = this.page.locator(SUPPLEMENTS_TRIGGER_SELECTOR);
    const menu = this.page.locator(SUPPLEMENTS_MENU_SELECTOR);
    const categoryText = new RegExp(`^\\s*${escapeRegExp(category.label)}\\s*$`);

    await this.dismissWelcomeModal(pacing);
    await runPacedAction(this, pacing, "hover supplements menu", async () => {
      await trigger.hover();
    });
    await menu.waitFor({ state: "visible" });
    await runPacedAction(this, pacing, `click category ${category.label}`, async () => {
      await menu
        .locator(CATEGORY_LINK_SELECTOR)
        .filter({ hasText: categoryText })
        .first()
        .click();
    });
    await this.page.waitForLoadState("domcontentloaded");

    return {
      title: await this.page.title(),
      url: this.page.url(),
    };
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

function parseOptions(argumentsList) {
  const configIndex = argumentsList.indexOf("--config");
  const hasConfigValue = configIndex !== -1 && argumentsList[configIndex + 1];
  const headless = argumentsList.includes("--headless");

  if (!hasConfigValue) {
    throw new Error(
      "A JSON run spec is required. Example: npm run audit -- --config configs/menu-decode.json",
    );
  }

  return {
    configPath: path.resolve(argumentsList[configIndex + 1]),
    headless,
  };
}

function validateRunSpec(configPath, runSpec) {
  if (!runSpec || Array.isArray(runSpec) || typeof runSpec !== "object") {
    throw new Error(`Run spec must be a JSON object: ${configPath}`);
  }

  const categoryUrlListInputPath = runSpec.inputPaths?.categoryUrlList;

  if (
    categoryUrlListInputPath !== null &&
    typeof categoryUrlListInputPath !== "string"
  ) {
    throw new Error(
      `Run spec requires inputPaths.categoryUrlList to be null or a path: ${configPath}`,
    );
  }

  let startUrl;

  if (categoryUrlListInputPath === null) {
    if (typeof runSpec.startUrl !== "string") {
      throw new Error(`Menu decoding requires a public startUrl: ${configPath}`);
    }

    startUrl = new URL(runSpec.startUrl);

    if (!["http:", "https:"].includes(startUrl.protocol)) {
      throw new Error(
        `Menu decoding startUrl must use HTTP or HTTPS: ${configPath}`,
      );
    }
  }

  if (typeof runSpec.headless !== "boolean") {
    throw new Error(`Run spec requires a boolean headless value: ${configPath}`);
  }

  if (
    runSpec.navigationDelayMs !== undefined &&
    (!Number.isInteger(runSpec.navigationDelayMs) ||
      runSpec.navigationDelayMs < 0)
  ) {
    throw new Error(
      `Run spec navigationDelayMs must be a non-negative integer: ${configPath}`,
    );
  }

  if (runSpec.pacing?.actionDelayMsRange !== undefined) {
    validateDelayRange(
      configPath,
      runSpec.pacing.actionDelayMsRange,
      "pacing.actionDelayMsRange",
    );
  }

  if (
    categoryUrlListInputPath === null &&
    typeof runSpec.outputPaths?.categoryUrlList !== "string"
  ) {
    throw new Error(
      `Menu decoding requires outputPaths.categoryUrlList: ${configPath}`,
    );
  }

  if (
    categoryUrlListInputPath === null &&
    runSpec.outputOptions?.randomizeCategoryUrlList !== undefined &&
    typeof runSpec.outputOptions.randomizeCategoryUrlList !== "boolean"
  ) {
    throw new Error(
      `Menu decoding outputOptions.randomizeCategoryUrlList must be a boolean: ${configPath}`,
    );
  }

  if (
    typeof categoryUrlListInputPath === "string" &&
    (!Number.isInteger(runSpec.limits?.categories) ||
      runSpec.limits.categories < 1)
  ) {
    throw new Error(
      `Category visiting requires a positive limits.categories value: ${configPath}`,
    );
  }

  if (typeof categoryUrlListInputPath === "string") {
    const { actionDelayMsRange, pageDwellMsRange, betweenCategoryDelayMsRange } =
      runSpec.pacing ?? {};
    const { scrollStepDelayMsRange, scrollStepsRange } = runSpec.pacing ?? {};

    validateDelayRange(
      configPath,
      actionDelayMsRange,
      "pacing.actionDelayMsRange",
    );
    validateDelayRange(configPath, pageDwellMsRange, "pacing.pageDwellMsRange");
    validateDelayRange(
      configPath,
      betweenCategoryDelayMsRange,
      "pacing.betweenCategoryDelayMsRange",
    );
    validateDelayRange(
      configPath,
      scrollStepDelayMsRange,
      "pacing.scrollStepDelayMsRange",
    );
    validateIntegerRange(
      configPath,
      scrollStepsRange,
      "pacing.scrollStepsRange",
    );

    if (typeof runSpec.outputPaths?.summary !== "string") {
      throw new Error(
        `Category visiting requires outputPaths.summary: ${configPath}`,
      );
    }
  }

  return {
    ...runSpec,
    navigationDelayMs: runSpec.navigationDelayMs ?? 0,
    outputOptions: {
      ...runSpec.outputOptions,
      randomizeCategoryUrlList:
        runSpec.outputOptions?.randomizeCategoryUrlList ?? false,
    },
    startUrl: startUrl?.toString(),
  };
}

function validateDelayRange(configPath, range, name) {
  if (
    !range ||
    typeof range !== "object" ||
    Array.isArray(range) ||
    !Number.isInteger(range.minMs) ||
    !Number.isInteger(range.maxMs) ||
    range.minMs < 0 ||
    range.maxMs < range.minMs
  ) {
    throw new Error(
      `${name} requires non-negative integer minMs and maxMs values: ${configPath}`,
    );
  }
}

function validateIntegerRange(configPath, range, name) {
  if (
    !range ||
    typeof range !== "object" ||
    Array.isArray(range) ||
    !Number.isInteger(range.min) ||
    !Number.isInteger(range.max) ||
    range.min < 1 ||
    range.max < range.min
  ) {
    throw new Error(
      `${name} requires positive integer min and max values: ${configPath}`,
    );
  }
}

async function loadRunSpec(configPath) {
  let contents;

  try {
    contents = await fs.readFile(configPath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read run spec ${configPath}: ${error.message}`);
  }

  try {
    return validateRunSpec(configPath, JSON.parse(contents));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Run spec contains invalid JSON: ${configPath}`);
    }

    throw error;
  }
}

async function saveCategories(outputPath, categories, { randomize = false } = {}) {
  const absoluteOutputPath = path.resolve(__dirname, outputPath);
  const outputCategories = randomize ? shuffle(categories) : categories;

  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(
    absoluteOutputPath,
    `${JSON.stringify(outputCategories, null, 2)}\n`,
  );

  return absoluteOutputPath;
}

function shuffle(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffledItems[index];

    shuffledItems[index] = shuffledItems[randomIndex];
    shuffledItems[randomIndex] = currentItem;
  }

  return shuffledItems;
}

async function saveJson(outputPath, contents) {
  const absoluteOutputPath = path.resolve(__dirname, outputPath);

  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(
    absoluteOutputPath,
    `${JSON.stringify(contents, null, 2)}\n`,
  );

  return absoluteOutputPath;
}

async function saveTimestampedJson(outputPath, contents) {
  const parsedPath = path.parse(outputPath);
  const generatedAt = contents.generatedAt || new Date().toISOString();
  const timestamp = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const timestampedOutputPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-${timestamp}${parsedPath.ext}`,
  );

  return saveJson(timestampedOutputPath, contents);
}

async function loadCategories(inputPath) {
  const absoluteInputPath = path.resolve(__dirname, inputPath);
  const contents = await fs.readFile(absoluteInputPath, "utf8");
  const categories = JSON.parse(contents);

  if (!Array.isArray(categories)) {
    throw new Error(`Category URL list must be a JSON array: ${inputPath}`);
  }

  for (const category of categories) {
    if (
      !category ||
      typeof category.label !== "string" ||
      typeof category.url !== "string"
    ) {
      throw new Error(`Category URL list contains an invalid entry: ${inputPath}`);
    }
  }

  return categories;
}

function buildSummary(configName, products, stopReason) {
  const unmatched = [];
  const outOfScopeNoQuantity = [];
  const totalProducts = products.length;
  let matchedProducts = 0;

  for (const product of products) {
    if (PILL_QUANTITY_PATTERN.test(product.productName)) {
      matchedProducts += 1;
      continue;
    }

    const summaryProduct = {
      category: product.category,
      page: product.page,
      productName: product.productName,
    };
    const nameWithoutWeightVolume = product.productName.replace(
      WEIGHT_VOLUME_PATTERN,
      "",
    );

    if (
      nameWithoutWeightVolume !== product.productName &&
      !NUMBER_PATTERN.test(nameWithoutWeightVolume)
    ) {
      outOfScopeNoQuantity.push(summaryProduct);
      continue;
    }

    const pillDescription = extractPillDescription(product.productName);

    if (pillDescription) {
      summaryProduct.pillDescription = pillDescription;
    }

    unmatched.push(summaryProduct);
  }

  const unmatchedProducts = unmatched.length;
  const outOfScopeNoQuantityProducts = outOfScopeNoQuantity.length;

  return {
    configuration: configName,
    generatedAt: new Date().toISOString(),
    stopReason,
    totals: {
      totalProducts,
      matchedProducts,
      unmatchedProducts,
      outOfScopeNoQuantityProducts,
    },
    unmatched,
    outOfScopeNoQuantity,
  };
}

function extractPillDescription(productName) {
  const searchableName = productName
    .replace(PARENTHETICAL_TEXT_PATTERN, "")
    .replace(/\s+/g, " ");
  const segments = searchableName.split(",").map((segment) => segment.trim());
  const lastSegment = segments[segments.length - 1] || "";
  const match = lastSegment.match(COUNT_LED_SEGMENT_PATTERN);
  const pillDescription = match ? match[1].replace(/\s+/g, " ").trim() : null;

  return pillDescription;
}

function pickDelayMs(delayRange) {
  const spreadMs = delayRange.maxMs - delayRange.minMs;

  return delayRange.minMs + Math.floor(Math.random() * (spreadMs + 1));
}

function pickInteger(integerRange) {
  const spread = integerRange.max - integerRange.min;

  return integerRange.min + Math.floor(Math.random() * (spread + 1));
}

function formatDelay(delayMs) {
  return `${(delayMs / 1000).toFixed(1)}s`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function runPacedAction(runner, pacing, label, action) {
  if (pacing?.actionDelayMsRange) {
    const delayMs = pickDelayMs(pacing.actionDelayMsRange);

    console.log(`Pacing before ${label}: ${formatDelay(delayMs)}`);
    await runner.wait(delayMs);
  }

  return action();
}

async function runListingScrollPass(runner, pacing) {
  const scrollSteps = pickInteger(pacing.scrollStepsRange);

  for (let step = 1; step <= scrollSteps; step += 1) {
    const viewportRatio = 0.35 + Math.random() * 0.4;
    const scrollDelayMs = pickDelayMs(pacing.scrollStepDelayMsRange);

    await runner.scrollByViewportRatio(
      viewportRatio,
      pacing,
      `scroll step ${step}/${scrollSteps}`,
    );
    console.log(
      `Scroll step ${step}/${scrollSteps}: ${viewportRatio.toFixed(2)} viewport, ${formatDelay(scrollDelayMs)}`,
    );
    await runner.wait(scrollDelayMs);
  }
}

async function runCategoryVisit(runner, configPath, runSpec) {
  const configName = path.basename(configPath);
  const categories = await loadCategories(runSpec.inputPaths.categoryUrlList);
  const selectedCategories = categories.slice(0, runSpec.limits.categories);
  const products = [];
  let stopReason = "completed";
  const landingObservation = await runner.visit(
    SUPPLEMENTS_START_URL,
    runSpec.pacing,
    "navigate to supplements landing",
  );

  console.log(`Loaded landing: ${landingObservation.title || "(untitled)"}`);
  console.log(`Landing URL: ${landingObservation.url}`);

  for (const [categoryIndex, category] of selectedCategories.entries()) {
    if (categoryIndex > 0) {
      const betweenCategoryDelayMs = pickDelayMs(
        runSpec.pacing.betweenCategoryDelayMsRange,
      );

      console.log(
        `Between-category delay: ${formatDelay(betweenCategoryDelayMs)}`,
      );
      await runner.wait(betweenCategoryDelayMs);
    }

    const observation = await runner.selectSupplementsCategory(
      category,
      runSpec.pacing,
    );
    const stopSignal = await runner.detectStopSignal();

    console.log(`Category: ${category.label}`);
    console.log(`Loaded: ${observation.title || "(untitled)"}`);
    console.log(`URL: ${observation.url}`);

    if (stopSignal) {
      stopReason = stopSignal;
      break;
    }

    await runListingScrollPass(runner, runSpec.pacing);

    const productNames = await runPacedAction(
      runner,
      runSpec.pacing,
      "extract product names",
      async () => runner.extractProductNames(),
    );

    for (const productName of productNames) {
      products.push({
        category: category.label,
        page: 1,
        productName,
      });
    }

    console.log(`Products: ${productNames.length}`);

    const pageDwellMs = pickDelayMs(runSpec.pacing.pageDwellMsRange);

    console.log(`Page dwell delay: ${formatDelay(pageDwellMs)}`);
    await runner.wait(pageDwellMs);
  }

  const summary = buildSummary(configName, products, stopReason);
  const outputPath = await saveTimestampedJson(
    runSpec.outputPaths.summary,
    summary,
  );

  console.log(`Matched: ${summary.totals.matchedProducts}`);
  console.log(`Unmatched: ${summary.totals.unmatchedProducts}`);
  console.log(
    `Out of scope no quantity: ${summary.totals.outOfScopeNoQuantityProducts}`,
  );
  console.log(`Saved: ${outputPath}`);
}

async function main() {
  const { configPath, headless: headlessOverride } = parseOptions(
    process.argv.slice(2),
  );
  const runSpec = await loadRunSpec(configPath);
  let runner;

  runner = new AuditRunner({
    headless: headlessOverride || runSpec.headless,
  });

  try {
    await runner.start();
    console.log(`Configuration: ${path.basename(configPath)}`);

    if (runSpec.inputPaths.categoryUrlList === null) {
      const observation = await runner.visit(
        runSpec.startUrl,
        runSpec.pacing,
        "navigate to menu decode start",
      );
      const categories = await runner.decodeSupplementsMenu(
        runSpec.navigationDelayMs,
        runSpec.pacing,
      );
      const outputPath = await saveCategories(
        runSpec.outputPaths.categoryUrlList,
        categories,
        { randomize: runSpec.outputOptions.randomizeCategoryUrlList },
      );

      console.log(`Loaded: ${observation.title || "(untitled)"}`);
      console.log(`URL: ${observation.url}`);
      console.log(`Categories: ${categories.length}`);
      console.log(`Saved: ${outputPath}`);
    }

    if (typeof runSpec.inputPaths.categoryUrlList === "string") {
      await runCategoryVisit(runner, configPath, runSpec);
    }
  } finally {
    await runner.stop();
  }
}

main().catch((error) => {
  console.error(`Audit runner failed: ${error.message}`);
  process.exitCode = 1;
});
