# Data Pipeline

See [workflow.svg](./workflow.svg) for the visual version.

Data flows through 6 stages: **4 scrapers → unify → export → clean → git push → auto-deploy**.

## Stage 1 — Scraping

**Location:** `D:\Projects\web-reading\` (separate repo, on the maintainer's laptop only)

Four Python scrapers, one per source, each writing its own SQLite DB:

| Source | Output DB | What it gives |
|---|---|---|
| yaschools.com | `yaschools.db` | Base 1,838 schools with rich data (ratings, sub-ratings, per-grade fees, photo logos) |
| parents.madares.sa | `madares.db` | Additional schools, districts, per-grade fees |
| saudischoolsguide.com | `ssg.db` | Coordinates and English names |
| mdares.ai | `mdaresai.db` | Phone/mobile/email/website (the fields yaschools didn't have) |

Uses `requests` + `BeautifulSoup` + a shared `http_session` with rate limits.

## Stage 2 — Unification

**Script:** `D:\Projects\web-reading\unify.py`

Merges the 4 DBs into `data/unified.db` (~37 MB, 3,377 rows).

**Dedup logic** (a school is considered the same across sources if any of these match):
- GPS distance < 50 m
- Name similarity (Levenshtein) > 80%
- Same phone or email

**Where the unified DB lives:** `D:\Projects\fisool\data\unified.db` (project-local, gitignored).
The DB stays out of git — it's easy to rebuild and 37 MB would balloon the repo.

## Stage 3 — Export to JSON

**Script:** [`scripts/export-from-unified.py`](../scripts/export-from-unified.py)

Reads `data/unified.db` and writes `src/lib/data/schools-real.json` (~34 MB).

What it does:
- Flattens the multi-table SQLite into one row per school with nested arrays.
- Aggregates per-track × per-grade × per-gender fee schedules (30,763 fee rows in source).
- Extracts photos, reviews, sub-ratings, social links, accreditations, services, discounts.
- Translates track and grade tokens to Saudi Arabic:
  - `KG1` → روضة 1 · `KG2` → روضة 2 · `KG3` → تمهيدي
  - `GRADE 1` → الأول الابتدائي · `GRADE 7` → الأول المتوسط · `GRADE 12` → الثالث الثانوي
  - `General` → المسار العام · `Global American` → أمريكي عالمي · etc.
- Extracts a source-attribution URL from the Facebook share link
  (`facebook.com/sharer/sharer.php?u=<source>`) — this becomes the
  "المصدر الأصلي" link on the detail page.

## Stage 4 — Facet normalization

**Script:** [`scripts/clean-json-junk.py`](../scripts/clean-json-junk.py)

**Idempotent** — safe to re-run. Rewrites `schools-real.json` in place.

Operations:

- **Strip HTML/CSS junk** from every text field. One upstream source
  leaked `<span style="font-family: Tajawal,sans-serif; color: #000000; ...">`
  markup into descriptions, city names, and district names. The stripper
  removes tags, collapses whitespace, and drops fields that are pure CSS.

- **Length caps** per field (city ≤ 40, district ≤ 50, type ≤ 60, address ≤ 200).
  Values longer than the cap are scraped page-content that ended up in the
  wrong column.

- **City whitelist** — 33 legitimate Saudi cities. Anything else is dropped.
  Maps English-only values (`Riyadh` → `الرياض`, `Buraydah - Qaseem` → `بريدة - القصيم`).

- **City inference from coords** — for schools whose scraped city was junk
  but lat/lng is present, uses bounding boxes for 30 major cities to
  assign a city. Recovers ~860 out of the ~1000 originally-junk cases.

- **Curriculum dedup** — canonicalises spelling variants:
  - `مصرى` / `المسار المصرى` / `Egyptian path` → `مصري`
  - `البكالوريا الدولية (ib)` / `البكالوريا الدولية` / `IB` → `البكالوريا الدولية (IB)`
  - `Ahli` → `أهلي`
  - `الدبلوما الامريكية` → `الدبلومة الأمريكية`

- **Gender dedup** — `مشتركة` and `بنين و بنات` mean the same thing;
  merged into `بنين و بنات`.

- **Stage dedup** — `حضانة` (nursery) and `روضة` (KG) overlap heavily
  and inconsistently in the source data. Merged into `روضة` so the
  parent-facing filter is coherent. Final stages: 4, in canonical order —
  روضة, ابتدائي, متوسط, ثانوي.

## Stage 5 — Commit + push

```bash
git add src/lib/data/schools-real.json
git commit -m "Refresh data from unified sources"
git push origin main
```

## Stage 6 — Hostinger auto-deploy

Push triggers webhook → Hostinger pulls, builds, restarts. Live in 3-5 minutes.
See [deployment.md](./deployment.md) for details.

---

## Full refresh command (copy-paste)

```bash
# 1. Rebuild the unified DB from the 4 sources
cd D:\Projects\web-reading
python unify.py

# 2. Regenerate the JSON in the fisool repo
cd D:\Projects\fisool
python scripts/export-from-unified.py
python scripts/clean-json-junk.py

# 3. Push
git add src/lib/data/schools-real.json
git commit -m "Refresh school data"
git push origin main

# 4. Watch the deploy on Hostinger hPanel (or just wait 5 min and check the site)
```

## Adding a new scraper source

1. Write the scraper under `D:\Projects\web-reading\` with its own SQLite output.
2. Extend `unify.py`'s dedup logic to merge the new DB.
3. Re-run the refresh command above.
4. If the new source has fields the schema doesn't cover:
   - Add them to `export-from-unified.py`'s output shape.
   - Add them to `src/lib/types.ts` on the `School` interface.
   - Use them in the components — in that order (schema first, then UI).

## Adding a new UI-facing field

**Always add in this order** to avoid runtime errors:
1. Update the export script to emit the field.
2. Update `src/lib/types.ts` to type it (as `optional` unless every row will have it).
3. Update the components that display it.

## Why not use a database in production?

At 3,375 schools and 34 MB, importing the JSON directly into the Next.js runtime is
faster than round-tripping through a DB. Next.js turns the JSON into an in-memory
JavaScript object at build time; queries are `.filter()` on the array, which is
plenty fast for this scale.

A DB layer becomes worthwhile when:
- The dataset grows past ~100 MB, or
- Schools claim their listings and edit data live (needs a write path), or
- Reviews are added user-generated (needs user accounts + moderation).
