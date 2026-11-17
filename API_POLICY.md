# API policy

eport has no backend, so an external service can be used only if it can be used safely from a static site.

## Evaluation (recorded in `public/data/sources/api-providers.json`)

For each provider: documentation, authentication, **an actual cross-origin request from a browser**, rate limits, coverage, freshness, attribution, licence/commercial rights and failure behaviour. Browser access is never assumed — it is `verified`, `failed` or `not-tested`, with the date tested.

## Outcomes

| Outcome | When | Example |
| --- | --- | --- |
| `integrated` | No credentials, browser access verified | Frankfurter |
| `build-time-snapshot` | Licence permits redistribution, but the API blocks browsers | World Bank (tested 2026-11-17: no CORS headers) |
| `approved-planned` | Passed evaluation, not yet used | Digitraffic Marine (Finland coverage only) |
| `coming-soon-secure-layer` | Needs a secret key, membership or proxy | UN Comtrade, AISHub |

For the last category eport does **not** embed keys, bypass the restriction, or simulate a result. The UI says "Coming Soon — requires a secure integration layer" and links to the official site.

## Runtime rules

- `services/api/http.ts`: timeout, no credentials, no referrer, every failure becomes a typed `ApiError` (`timeout`, `network`, `rate-limited`, `not-found`, `http`, `invalid-response`); responses are Zod-validated and rejected if they do not match.
- `services/api/cache.ts`: TTL cache; if a refresh fails the old value is returned flagged **stale** and the UI says so.
- Adapters return a provider-independent shape; the UI never depends on a provider's raw response.
- Privacy: a request reveals only the parameters needed (e.g. two currency codes) and, as with any request, the visitor's IP address. This is disclosed on `/privacy`.
- Reference exchange rates are indicative only — never bank, card or customs valuation rates.

## Secrets

No secret keys, tokens or credentials in JavaScript, HTML, public JSON or build-time environment variables exposed to the browser. Build-time fetching scripts use only unauthenticated endpoints.

## Adding a provider

1. Test a real browser request; record the result and date in the registry.
2. Write an adapter in `services/api/providers/` with a Zod response schema and unit tests (success, malformed, rate-limited, offline).
3. Set `integrationStatus`; `validate-data.ts` rejects `integrated` without verified browser access or with `auth` other than `none`.

## Live web results (search page and News page)

Two providers are called directly by the visitor's browser when live web results are on (the default; a switch on the search page turns them off and the choice is remembered locally):

| Provider | Used for | Browser access | Notes |
| --- | --- | --- | --- |
| Wikipedia (MediaWiki Action API) | Encyclopedia articles beside search results | Verified 2026-11-17 (`origin=*`) | CC BY-SA 4.0; every result links to its article |
| GDELT DOC 2.0 | Live news headlines | Verified 2026-11-17 (CORS `*`) | ~1 request per 5 s; eport spaces calls, caches 30 minutes and explains HTTP 429 |

Rules: results are labelled "Unverified web content", shown in a separate panel from eport's own records, never used as the basis of a trade requirement, and carry their attribution. Only headlines/titles, short extracts, publisher domains and dates are displayed — no images, no article text. The visitor's search words are sent to these services (disclosed on `/privacy` and beside the switch).

## Official news feeds (build-time)

Headlines from the WTO, ITC, European Commission, ICC and UN News are fetched by `scripts/fetch-news.ts` (daily via `.github/workflows/refresh-news.yml`), because RSS feeds are not offered for cross-origin browser requests. Only the publisher's headline, a short abstract, date and link are stored — never article bodies. Items are English-only, de-duplicated and, for general-interest feeds, filtered for trade relevance. A failing feed keeps its previous items and is flagged on the News page and in the Data Reliability Centre.
