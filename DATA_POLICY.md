# Data policy

Accuracy matters more than the appearance of completeness.

## Source priority

1. Official government authority
2. Official international organization
3. Official port, carrier or regulator
4. Recognized statutory organization
5. Licensed authoritative data provider
6. Reputable research organization
7. Secondary publications — context only, never the basis of a requirement

Every record cites sources by id from `public/data/sources/sources.json`. `validate-data.ts` fails the build on an unknown source id.

## Required fields for regulatory statements (Phase 2 onward)

Publisher, official URL, jurisdiction, applicable products, applicable direction (export/import), effective date, publication date, last-checked date, source type, verification status.

## Verification status

| Status | Meaning | How it can be set |
| --- | --- | --- |
| `officially-verified` | An editor compared the content with the official source | Only with `method: "editorial-review"` — enforced by validation |
| `source-referenced` | Cites an official source; link confirmed reachable | `check-links --apply` |
| `needs-review` | Something could not be confirmed (e.g. link failed) | `check-links --apply`, or an editor |
| `outdated` | Source changed or review date passed | Editor |

A working link never produces `officially-verified`.

## Requirement status

`mandatory`, `conditional`, `optional`, `unknown`. **`unknown` is never treated as "not required"**; pages state that the absence of a record is not evidence that no requirement exists.

## Statistics

Each figure carries source, observation year, unit, the publisher's own update date and eport's retrieval date. Historical, estimated, forecast and live data are labelled separately. Missing observations stay missing — no interpolation, estimation or carry-forward. `fetch-worldbank.ts` refuses to overwrite the snapshot if fewer than 100 areas return.

## Coverage

`catalog.json` lists every dataset, including unpublished ones, as `verified`, `partial`, `seed` or `unavailable`. Counts shown on the site come from the generated manifest, not from hand-typed numbers.

## Never

Invent laws, fees, tariffs, official forms, authority contacts, API results or vessel positions; assume every certificate applies; assume a missing requirement does not exist; present outdated information as current; give a legal guarantee.

## Identifiers

ISO 3166-1 (alpha-2 is the primary key for countries), ISO 4217 currencies, UN/LOCODE for ports. International HS (6-digit) is kept separate from national tariff extensions.

## News snapshot

`public/data/news/latest.json` is validated on every build: unique ids and URLs, HTTPS links, known publisher source ids, no future dates, English language items only. The manifest shows the snapshot's own retrieval date. A snapshot older than 14 days prints a warning in `npm run data:validate`.
