# Architecture

## Principles

1. **Static only.** The deployable artifact is `dist/`. No server, serverless function, proxy or database exists or is assumed.
2. **Data is not code.** Datasets live in `public/data/**` as JSON, are fetched on demand, validated with Zod, and never imported into components.
3. **One schema source.** `src/types/schemas.ts` is used by the browser loader *and* the Node build scripts, so what is validated at build time is exactly what the app accepts.
4. **Honest states.** Every module has a status in `src/app/modules.ts`. Navigation, landing pages, search and the Data Reliability Centre all read that registry, so a feature cannot appear live without being marked so.

## Layout

```
public/data/            published datasets (see catalog.json for the full list, incl. unavailable ones)
  catalog.json          hand-maintained: every dataset, its coverage level and scope
  manifest.json         GENERATED: catalog + counted record numbers
  graph/ search/        GENERATED: knowledge graph and compact search index
  countries/ organizations/ authorities/ sources/ trade/ geo/
scripts/                Node build tooling (tsx)
  build-countries.ts    countries + map geometry from open packages
  fetch-worldbank.ts    World Bank snapshot (the API sends no CORS headers)
  build-indexes.ts      graph, search index, manifest
  validate-data.ts      the data quality gate (fails the build)
  check-links.ts        official-link reachability
  generate-static.ts    per-route HTML shells, 404.html, sitemap.xml
src/
  app/                  router, module registry, route metadata
  components/           common (primitives, badges, provenance), charts, maps, search, navigation, feedback
  features/             one folder per area: home, divisions, countries, directory, search, reliability, info
  services/             data (loader), search (engine), graph, api (http, cache, providers), storage
  i18n/ hooks/ utils/ types/ styles/
tests/                  unit (Vitest), e2e (Playwright + axe)
```

Phase 2+ features add folders under `features/` (`export`, `import`, `documentation`, `trade-navigator`, `maritime`, …) and datasets under `public/data/` without changing existing code: each is registered in `catalog.json` and `modules.ts`.

## Data flow

`public/data/*.json` → (build) `build-indexes.ts` derives graph/search/manifest → `validate-data.ts` gates the build → (browser) `services/data/loader.ts` fetches, Zod-validates and caches per session → pages. A file that fails validation shows an error state rather than unverified content.

## Knowledge graph

Edges are declared once, on the record that owns them (`relations` on organizations, authorities, documents), plus implicit `jurisdiction` / `headquartered-in` edges to countries. `build-indexes.ts` compiles them into `graph/index.json` and fails on any dangling reference. `services/graph/graph.ts` answers "what is connected to this record?" in both directions; `RelatedPanel` renders it as **Connected records**. New entity types (documents, ports, HS codes, agreements) only need nodes and a path in `utils/entities.ts`.

## Search

`public/data/search/index.json` holds titles, identifiers and keywords only. It is loaded on first focus of a search box, never on page load. MiniSearch provides prefix and fuzzy matching; ranking adds boosts for exact identifier/title matches, record quality (source reliability) and the country being viewed. Only modules with a working route are searchable, so planned features never appear as results.

## Live APIs

See API_POLICY.md. Providers sit behind `services/api/`: `http.ts` (timeouts, typed errors, schema validation), `cache.ts` (TTL cache with honest staleness), and one adapter per provider that returns a provider-independent shape.

## Routing and SEO

React Router with lazy route chunks. `generate-static.ts` writes `dist/<route>/index.html` for each real page, each with its own title, description, canonical and Open Graph tags; `404.html` is the SPA shell for any other deep link. The sitemap lists only pages with substantive content — no empty country or product pages are generated (all countries are *reachable*, but only those with published guidance are pre-rendered and sitemapped).

## Internationalisation

`src/i18n` provides locale files, `{variable}` interpolation, English fallback, `dir` handling and locale-aware number/date formatting. Adding a language = a JSON file + one registry line. Identifiers (ISO codes, HS codes, legal names) are never translated.

## Accessibility

Native `<dialog>` for modals, combobox pattern for search, skip link, focus moved to `<main>` after navigation, status never by colour alone, charts have text summaries and data tables, reduced-motion respected. axe (WCAG 2.2 AA tags) runs on every page in CI, desktop and mobile.

## Phases

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Repo, build, schemas, validation, tests, design system | Done |
| 1 | Shell, home, search, country index, directory, indicators, reliability centre | Done |
| 2 | Export/Import Academy, documentation centre + relationships, authorities depth, India datasets | Planned |
| 3 | Trade Navigator, readiness score, risk assessment, generators, HS explorer, cost explorer, reports, Trade Desk (IndexedDB) | Planned |
| 4 | Country-to-country explorer, statistics depth, ports, maritime, maps, approved APIs | Planned |
| 5 | Buyer/seller directories, RFQ, logistics, opportunities | Planned |
| 6 | Production hardening, cross-browser, security review, domain validation | Planned |

A phase is complete only when its features have a working interface, real function, validation, error/loading/empty states, mobile behaviour, provenance and tests.
