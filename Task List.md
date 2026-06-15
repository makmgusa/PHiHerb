# Task List for Price Helper for iHerb extension

## Next
- [ ] Clean up user viewable info to use Price Helper info in place of unit price where appropriate
- [ ] figure out some git features. See if we can keep dev to this point private while cutting a release for a beta.

## Consider
- [ ] Research container options
- [ ] consider loading all product pages in the background to perfect price range
- [ ] consider price tiering that dampens one- or two-off high/low prices
- [ ] consider showing X cheapest products by category on demand. Possibly then open those product detail pages on demand.

## Complete
- [x] vegetarian gummies, vegetarian lozenges, chewable tablets, lozenges, nuggets, vegan capsules, patches, veg capsules,
veggie capsules, gummies
- [x] create icon for the add on
- [x] Create a URL for add on updates. This needs to be included with the extension. URL must be HTTPS. https://mklimp.com/phiherb/
- [x] Create add on name
- [x] Choose a web host. Digital Ocean
- [x] create mklimp.com landing page
- [x] ensure the extension works for search results
- [x] related but having no "code" solution. Determine if any kind of business structure should be formalized. Propietorship and partnership can be pretty informal but leaves all liability at the personal level. You can insulate the liability by creating a corporation but this requires registering with the state, a name search, corporation structure (documented) which is a lot of additional complexity. Web sites say you can do it in minutes but that is probably not thorough.
- [x] determine what's needed to be a "AMO developer" (web page for privacy policy ,etc.) - no separate privacy policy URL needed; privacy info can be included with the extension itself
- [x] experimental addon, beta via github, self distributed (unlisted and signed - recommended for beta) or loaded into developer version (unsigned). Self distributed seems to the the correct option (no need for firefox dev)
- [x] create URL
- [x] create two step autenticator
- [x] create AMO developer account
- [x] For debug purposes, display Category.name, Category.lowPrice and Category.highPrice on the page somewhere near the header. Also low range, mid range and high range.
- [x] define Stage 3 for Phase 3
- [x] update setPriceTier to use Category.lowPrice and Category.highPrice
- [x] fix setting badge color
