// Moved product matching patterns to this file so it can be shared between applications.
// This was used for a temporary manual name audit. That application is now archived.
// Shared product-name field matching pattern.
const PRODUCT_LINK_SELECTOR = "a.absolute-link.product-link";
const PRODUCT_NAME_ATTRIBUTE = "title";

// Optional single-word prefix after the count. .? allows one trailing mark.
const PILL_UNIT_PREFIXES =
  "(?:(?:veg(?:gie|gies|etable)?|vegetarian|vegan|chewable|liquid|bisected|" +
  "coated|organic|mini|marine|fish|micro|enteric|delayed|quick|slow|fast-acting|" +
  "easy|instant|time|targeted-delivery|individually|gelatin|soft|pectin|fiber|" +
  "meltaway|probiotic|effervescent|bilayer|small|chew|tiny|once|pure|heart-shaped|" +
  "animal-shaped|ultrazorbe|enteripure|caplique|microlingual|veg\\.)\\.?\\s+)?";

// Middle words between the optional prefix and the unit are ignored.
const PILL_UNIT_MIDDLES = "(?:\\S+\\s+)*";

// Mandatory unit terms. .? allows one trailing mark after the term.
const PILL_UNIT_TERMS =
  "ct|capsules?|caps?|tablets?|mini-?tabs?|tabs?|soft-?gels?|soft\\s+gels?|pills?|count|caplets?|" +
  "gel\\s*caps?|gelcaps?|vegi-?caps?|vegicaps?|vegcaps?|vegancaps?|licaps?|drcaps?|" +
  "maxicaps?|plantcaps?|vcaps?|phyto-?caps?|stick\\s+packs?|soft\\s+chews?|chews?|chewables?|" +
  "gumm(?:y|ies)|lozenges?|nuggets?|patch(?:es)?|tabscules?";

// Combined source: optional prefix + ignored middles + unit term + optional mark.
const PILL_UNIT_PATTERN_SOURCE =
  PILL_UNIT_PREFIXES + PILL_UNIT_MIDDLES + "(" + PILL_UNIT_TERMS + ").?\\b";

const PILL_QUANTITY_PATTERN = new RegExp(
  `\\b(\\d+)\\s*${PILL_UNIT_PATTERN_SOURCE}`,
  "i",
);

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PRODUCT_LINK_SELECTOR,
    PRODUCT_NAME_ATTRIBUTE,
    PILL_QUANTITY_PATTERN,
  };
}
