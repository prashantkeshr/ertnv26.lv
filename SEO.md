# SEO and search visibility

## How pages reach search engines

eport is a single-page app on GitHub Pages. At build time (`npm run build`):

1. `scripts/generate-static.ts` writes a page for every entry in `scripts/seo-pages.ts` (all 250 countries, regions, directory entries, Academy pages), each with its own title, description, canonical URL, robots directive, social tags and JSON-LD. These answer HTTP 200. Unknown URLs get the noindex `404.html`.
2. `scripts/prerender.ts` opens each indexable page in a browser and stores the rendered content as a snapshot in the HTML, so crawlers that do not run JavaScript still read the page. In a browser, `src/main.tsx` removes the snapshot once the live app has drawn its heading.
3. `scripts/check-seo.ts` fails the build on a missing page, duplicate title, wrong canonical, bad JSON-LD, empty snapshot or a sitemap that does not match the indexable pages.

A country page is indexable only if it has trade or indicator data behind it; others are `noindex,follow` and stay out of the sitemap. Sitemap `lastmod` is the date of the data behind the page, never the build date.

Titles and descriptions for country pages come from `src/app/seo-text.ts`, shared by the build and the running app so both say the same thing.

## One-time setup the site owner must do

Search engines only learn about a new site quickly if it is registered with them. These need accounts only the owner can create:

1. **Google Search Console** — add `https://eport.live/` as a property. Verify by DNS TXT record (preferred) or put the token in `SEO_VERIFICATION.google` in `src/app/route-meta.ts`. Submit `https://eport.live/sitemap.xml`, then use URL Inspection on the home page and a few country pages and press "Request indexing".
2. **Bing Webmaster Tools** — add the site (you can import it from Search Console) and submit the sitemap. Token goes in `SEO_VERIFICATION.bing`.
3. **IndexNow** (Bing, Yandex and others) is pinged automatically after each deploy by `.github/workflows/indexnow.yml`; the key file is `public/164bdb02f1b53bb947747b62a779d518.txt`.

## Commands

- `npm run seo:check` — check `dist/` after a build.
- `npm run seo:live` — fetch every sitemap URL on the live site and verify status, h1, canonical and robots.

Environment: locally set `EPORT_E2E_CHANNEL=msedge` for the pre-render; CI installs Playwright's chromium.

## Honest limits

Nothing here can guarantee a ranking or appearing in every search. It makes every page crawlable, unique and correctly described. A new domain still needs time and links from other sites to be trusted. `llms.txt` is an emerging convention, not an established ranking factor.
