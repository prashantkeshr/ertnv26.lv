# eport — Global Trade & Maritime Intelligence

**https://eport.live** · independent, frontend-only, hosted on GitHub Pages.

eport is an information platform for international trade. It is **not** a government, customs, port or regulatory service and issues no licences, certificates or clearances. There is no backend, no database and no accounts: everything runs in the visitor's browser over static, validated data files.

## Status

Phase 0 (foundation) and Phase 1 (platform shell) are complete and tested. Later phases are planned and shown honestly on the site — see the in-app **Data Reliability Centre** (`/data-reliability`), which is generated from the published data.

| Area | State |
| --- | --- |
| Design system, layouts, accessible components | Done |
| Home, six division pages, country explorer + 250 country profiles | Done |
| Directory: 10 international organizations, 16 Indian national authorities (seed) | Done — partial coverage |
| Trade indicators (World Bank snapshot, 213 economies) with charts | Done |
| Live reference exchange rates (Frankfurter) | Done |
| Unified search (fuzzy, typo-tolerant, recent searches) | Done |
| Trade Knowledge Graph ("Connected records") | Foundation — countries, authorities, organizations |
| Data Reliability Centre | Done |
| Static route shells, sitemap, robots, CNAME, deploy workflows | Done |
| Academy, documents, Trade Navigator, generators, Trade Desk, ports, maritime, directories of businesses | Not built yet (Phases 2–5) — listed as "In development" |
| UN Comtrade, AIS tracking, carrier tracking | **Coming Soon — requires a secure integration layer** |

## Commands

```bash
npm install
npm run dev            # http://localhost:5400 (builds search/graph/manifest first)
npm test               # unit tests (Vitest)
npm run build          # data build + validation, typecheck, Vite build, static route generation
npm run preview        # serve dist/ on :5401
npm run test:e2e       # Playwright + axe accessibility checks against the production build
```

Local e2e without downloading browsers: `EPORT_E2E_CHANNEL=msedge npm run test:e2e` (or `chrome`). In CI, run `npx playwright install --with-deps chromium` first.

Data maintenance:

```bash
npm run data:countries   # regenerate countries + map geometry from world-countries / world-atlas
npm run data:worldbank   # refresh the World Bank indicator snapshot
npm run data:links       # check every official link; add -- --apply to stamp records
npm run data:validate    # schema, duplicate-id, reference, date and honesty-rule checks
```

## Deploying

1. Push to `main` of the GitHub repository.
2. In **Settings → Pages**, set *Source* to **GitHub Actions**.
3. `public/CNAME` already contains `eport.live`. At the DNS provider, point the apex to GitHub Pages (four `A` records, `185.199.108–111.153`) and/or `www` via `CNAME` to `<user>.github.io`, then enable **Enforce HTTPS**.
4. `.github/workflows/deploy.yml` runs tests, builds and publishes `dist/`. `validate-data.yml` validates data on pull requests and re-checks official links weekly.

To preview under a sub-path (project page), build with `EPORT_BASE=/<repo>/`.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — structure, data flow, routes, phases
- [DATA_POLICY.md](DATA_POLICY.md) — sources, verification and requirement statuses
- [API_POLICY.md](API_POLICY.md) — how external services are evaluated and used
- [CONTENT_POLICY.md](CONTENT_POLICY.md) — editorial rules and what eport never does

## Licences of included data

Country reference data © mledoze/countries contributors (ODbL 1.0). Map geometry: Natural Earth (public domain) via `world-atlas`. Economic indicators: World Bank, World Development Indicators (CC BY 4.0). Exchange rates via Frankfurter.
