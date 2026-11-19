# Fit Board: how this repo works

Live site: https://albierrto.github.io/fit-board/ (GitHub Pages from `main`, repo root). A push to `main` deploys in about a minute.

The whole site is one file, `index.html`. Edit it directly. There is no build step.

## Where things live in index.html

- **Pattern defs.** A hidden `<svg width="0" height="0">` near the top. Custom prints and knits are `<pattern id="x-...">`. An id that starts with `x-` is used as is. The built-in textures (`cord`, `plaid`, `check`, `rib`, `twill`, `herring`) get light and dark variants automatically. For a new loud print or knit, add a new `x-` pattern and keep it small and simple.
- **`const PR={...}`** is the catalog. Every piece has a key. Examples:
  - New, in-store piece:
    `key:{cat:'top'|'layer'|'bottom'|'shoes', name:'...', brand:'...', store:'...', price:24.99, fit:'oversized', url:'https://...', checked:'Nov 26', draw:{...}}`
  - Secondhand piece: add `used:true` and set `store` to where it is listed (`'eBay'`, `'Depop'`, `'Grailed'`, `'Poshmark'`, ...). The price is landed (item plus shipping).
  - `checked:'Mon D'` is the date stock was last confirmed. The shop button shows it. Older pieces without one fall back to `STOCK_DATE`.
  - `size:'36 waist'` sets the size note on the button. The default is XL.
  - `mine:true` marks pieces he owns. Never remove those.
- **Draw options.**
  - Tops (`draw.t`): `tee`, `ls`, `henley`, `knithen`, `crew`, `camp`, `shirt`. A top with `layerOk:true` can also go under a jacket.
  - Layers (`draw.t`): `shirt`, `overshirt`, `cordzip`, `cardigan`, `bomber`, `harr`, `leather`, `coat`, `worker`, `barn`, `dzip`, `bedford`, `furcoat`.
  - Pants (`draw.fit`): `straight`, `loose`, `wide`, `track`, `barrel`. Pants options: `crease:true`, `cargo:true`, `tie:true`, `sheen:true`, and `stripe:'#hex'` (wide and loose fits only).
  - Shoes: `draw.s` set to `'boot'` or `'loafer'`, or left out for a sneaker. Shoes also take `sole`.
  - Common to all: `c` (main color), `tex` (texture or pattern id), `rib` (cuff and hem color), `dot` (button color).
- **Looks.**
  - `CLOSET_LOOKS`: looks made only from clothes he owns.
  - `NEW_LOOKS`: looks that need something new. Put the newest at the top.
  - `LOOKS_BASE`: older classics.
  - Shape: `{name, added:'YYYY-MM-DD', layer?, top, bottom, shoes, tags:[...], why}`.
  - Tags: `zany`, `cool`, `deal`, `closet`, `everyday`, `date`, `going-out`, `smart`, `cold`, `chill`.
  - A look with an `added` date in the last 21 days shows a "New find" chip and appears under Ideas, "New finds".
- **`const HUNT=[...]`**: saved secondhand searches shown under Ideas, Zany. Shape: `{name, what, range, url}`. Searches should be sorted cheapest first and filtered to his size where the site allows it.
- **UI code** is below `/* ================= Fit Board UI`. You usually don't need to touch it.
- **Wear tab filters:** a Show row (What I own, New ideas, Everything) and an occasion row (Any, Everyday, Date night, Going out, Cozy, Zany). New ideas lists the fresh looks (added in the last 21 days) that still need a piece. The Show choice is remembered per device.

## Rules (from Bort)

- **Stock first.** Never put a piece on the board unless it is in stock in his size, checked that day:
  - Tops and jackets: XL.
  - Pants: XL, or a 36 waist for tailored pants.
  - Secondhand listings must be live, Buy It Now (not an auction), and tagged XL. For vintage, check measurements: about 24 to 27 inches pit to pit.
- **Re-check every run.** Re-check every purchasable piece that appears in a look:
  - Sold out or listing ended: remove the piece and every look that uses it, or swap in a verified replacement.
  - If a store can't be checked this run, leave its pieces alone. Remove any piece whose `checked` date is more than 14 days old.
- **Cheap matters.**
  - Best: one new piece plus his own clothes, under about $60.
  - Something genuinely special can go up to about $100.
  - Two-piece combos: keep the total under about $120.
- **Not jeans-heavy.** No "Jonah Hill fit".
- **No em dashes anywhere.** Casual, plain wording in each `why`.
- **No body descriptions** on the page or in this repo (no height, weight or build words). `tools/check.js` fails if it finds them.
- **Shop widely.** Don't lean on one store. ASOS already carries a lot of the board.
- **Never act on accounts.** Never buy anything, sign in, add to a cart, message a seller, or make an offer.

## Checking stock (methods that worked)

Use the built-in browser on Bort's computer (`mcp__remote-devices__Claude_Browser__*`). Run scripts with `javascript_tool` from a tab on the store's own site.

- **eBay**
  - Fetch `/itm/ID` from an ebay.com tab. Live listings contain "Buy It Now" or "Add to cart".
  - For multi-size listings, `"menuItemMap"` gives `outOfStock` per size and `"variationsMap"` gives the price.
  - Searches: `/sch/i.html?_nkw=...&LH_BIN=1&_sop=15`, then parse `li.s-card` or `li.s-item`.
  - Look at the photos before adding anything: the `computer` zoom action on the image area.
- **ASOS**
  - Fetch `/us/prd/ID` from an asos.com tab.
  - Match `"variantId":(\d+),"size":"([^"]+)"`, then `"id":VID,"isInStock":(true|false)`.
  - The price is `"current":{"value":X` next to that variant id.
- **H&M:** size buttons have aria-labels like "Size XL: Out of stock".
- **Old Navy and Gap**
  - On the product page: `input[name^="buybox-sizeDimension"]` with data-testid `pdp-dimension-instock` or `pdp-dimension-outofstock`.
  - The search API at `https://api.gap.com/commerce/search/products/v2/cc?brand=on&market=us&...` works from an oldnavy tab.
- **Shopify stores** (many indie brands): `/products/<handle>.js` returns variants with `available` true or false. Untested here, but standard.
- **Anything else:** read the size picker. Disabled, crossed-out, "sold out" or "notify me" means no. If you can't tell for sure, don't add it.
- **Target:** product pages 404 and search renders blank. Skip it.

## Test and ship

```
node tools/check.js /tmp/fitboard-shots   # must print OK
```

Look at the screenshots, especially `phone_ideas_new.png`. Make sure the new drawings read as the real piece.

Then commit and push:

```
git add -A && git commit -m "..." && git push origin main
```

To confirm the Pages build:

1. Find the run: `gh api repos/Albierrto/fit-board/actions/runs --jq '.workflow_runs[0] | {id,head_sha,status,conclusion}'`
2. Wait on it: `gh run watch <id> --repo Albierrto/fit-board`
3. curl the live site and grep for a new look name.

Log what you added and removed in `FINDS_LOG.md`. Write style learnings in `STYLEBOOK.md`.
