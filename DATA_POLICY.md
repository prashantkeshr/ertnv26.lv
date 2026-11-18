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

## Country guides and videos

`countries/guides.json` and `videos/index.json` are validated on every build: a guide's step ids are unique, every authority it names exists in the directory, its sources exist, and it can never be marked `officially-verified` without a review record. Videos need unique 11-character ids, a known source organization and a recorded verification date; `npm run data:videos` re-verifies them against YouTube.

## Trade partner snapshot

Partner and sector files under `public/data/trade/` all use **one reference year (currently 2023)**. A later year is never mixed in for a country that lacks 2023: a country with no report shows an explicit "no report" state and, where its partners reported, a clearly labelled mirror figure. Each side's own export report is used as the primary figure for a flow; the partner's import report is shown beside it, with the gap and the usual reasons (freight and insurance valuation, timing, re-exports, classification). Bilateral balances use only the two export reports. Totals for a region include only countries that reported — others are not estimated. Partners that are not single countries (unspecified, regional groupings) are excluded from shares. `trade/regions.json` is derived by `scripts/build-regions.ts` and is never hand-edited; `npm run data:validate` checks every file against the shared schema and that every partner code exists in the country dataset.

## Learning centre (Incoterms, documents, glossary, worldwide guide)

`learning/incoterms.json`, `learning/documents.json`, `learning/glossary.json` and `guides/global.json` are eport editorial content, all marked **needs review** until compared line by line with official sources. They are written in eport's own words — the Incoterms® rules and ICC publications are copyrighted by the ICC and are not reproduced, and each page links to the official source. They state general frameworks, never a country's legal requirements. `npm run data:validate` enforces structure and the facts that hold for every Incoterms rule (for example, only EXW leaves export clearance to the buyer and only DDP puts import clearance on the seller), rejects dependency cycles between documents, and rejects unknown cross-references. Nothing here may be marked `officially-verified` without an editorial-review record.
