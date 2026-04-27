"""
Export all schools from D:\\Projects\\web-reading\\schools.db to a single JSON file
that the Next.js app can import directly.

- One row per school, with aggregated related-table data folded in:
    * fees: min / max / median / count, broken down by gender
    * subcategory_ratings: dict of category -> rating
    * photos: first photo's original_url + local_path
    * social: dict of platform -> url
    * review_count and overall_rating come from the schools row directly

- Cleans / normalises:
    * Empty strings -> None
    * Trims whitespace
    * Drops schools without a name AND coordinates (unusable on the map)
"""

import sqlite3, json, sys, io, os, statistics
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB = Path(r"D:\Projects\web-reading\schools.db")
OUT = Path(r"D:\Projects\fisool\src\lib\data\schools-real.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row

def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v if v else None
    return v

# Pre-load all related rows once, indexed by school_id
print("Loading fees…")
fees_by_school: dict[int, list[dict]] = {}
for r in con.execute("SELECT school_id, gender, amount FROM fees"):
    fees_by_school.setdefault(r["school_id"], []).append({"gender": r["gender"], "amount": r["amount"]})

print("Loading subcategory ratings…")
subratings_by_school: dict[int, dict] = {}
for r in con.execute("SELECT school_id, category, category_ar, rating FROM subcategory_ratings"):
    sid = r["school_id"]
    cat_ar = clean(r["category_ar"])
    if not cat_ar:
        continue
    subratings_by_school.setdefault(sid, {})[cat_ar] = r["rating"]

print("Loading photos…")
photos_by_school: dict[int, list[dict]] = {}
for r in con.execute("SELECT school_id, local_path, original_url FROM photos ORDER BY school_id, id"):
    photos_by_school.setdefault(r["school_id"], []).append({
        "localPath": clean(r["local_path"]),
        "originalUrl": clean(r["original_url"]),
    })

print("Loading social links…")
social_by_school: dict[int, dict] = {}
for r in con.execute("SELECT school_id, platform, url FROM social_links"):
    p = clean(r["platform"])
    u = clean(r["url"])
    if not p or not u:
        continue
    # filter out garbage URLs
    if u in ("#", "javascript:void(0)", "javascript:;"):
        continue
    social_by_school.setdefault(r["school_id"], {})[p] = u

print("Loading review counts (already on schools row)…")

print("Loading schools…")
schools_out = []
city_counts: dict[str, int] = {}
type_counts: dict[str, int] = {}
gender_counts: dict[str, int] = {}

for r in con.execute("SELECT * FROM schools ORDER BY id"):
    sid = r["id"]
    name_ar = clean(r["name_ar"])
    name_en = clean(r["name_en"])
    name = name_ar or name_en
    if not name:
        continue
    lat, lng = r["latitude"], r["longitude"]
    if lat is None or lng is None:
        # Skip schools without coords — they can't be mapped or filtered geographically.
        # We'll keep them only if they otherwise have rich data.
        # For now: drop.
        continue

    fees = fees_by_school.get(sid, [])
    fee_amounts = [f["amount"] for f in fees if f["amount"] is not None]
    fee_amounts_b = [f["amount"] for f in fees if f["gender"] == "Boys" and f["amount"] is not None]
    fee_amounts_g = [f["amount"] for f in fees if f["gender"] == "Girls" and f["amount"] is not None]

    fees_summary = None
    if fee_amounts:
        fees_summary = {
            "min": int(min(fee_amounts)),
            "max": int(max(fee_amounts)),
            "median": int(statistics.median(fee_amounts)),
            "count": len(fee_amounts),
            "boysMin": int(min(fee_amounts_b)) if fee_amounts_b else None,
            "boysMax": int(max(fee_amounts_b)) if fee_amounts_b else None,
            "girlsMin": int(min(fee_amounts_g)) if fee_amounts_g else None,
            "girlsMax": int(max(fee_amounts_g)) if fee_amounts_g else None,
        }

    photos = photos_by_school.get(sid, [])
    primary_photo = photos[0] if photos else None

    social = social_by_school.get(sid, {})

    sub = subratings_by_school.get(sid, {})

    school = {
        "id": sid,
        "slug": clean(r["slug"]),
        "name": name,
        "nameAr": name_ar,
        "nameEn": name_en,
        "city": clean(r["city_ar"]) or clean(r["city"]),
        "cityEn": clean(r["city"]),
        "district": clean(r["district_ar"]) or clean(r["district"]),
        "districtEn": clean(r["district"]),
        "lat": lat,
        "lng": lng,
        "type": clean(r["school_type_ar"]) or clean(r["school_type"]),
        "curriculum": clean(r["curriculum_ar"]) or clean(r["curriculum"]),
        "gender": clean(r["gender_ar"]) or clean(r["gender"]),
        "gradeLevels": clean(r["grade_levels_ar"]) or clean(r["grade_levels"]),
        "foundedYear": r["founded_year"],
        "about": clean(r["about_ar"]) or clean(r["about"]),
        "rating": r["overall_rating"],
        "reviewCount": r["review_count"],
        "startingFee": int(r["starting_fee"]) if r["starting_fee"] else None,
        "fees": fees_summary,
        "photo": primary_photo,
        "social": social if social else None,
        "subRatings": sub if sub else None,
    }

    # Drop None values to keep JSON small
    school = {k: v for k, v in school.items() if v not in (None, "", {}, [])}

    schools_out.append(school)
    if school.get("city"):
        city_counts[school["city"]] = city_counts.get(school["city"], 0) + 1
    if school.get("type"):
        type_counts[school["type"]] = type_counts.get(school["type"], 0) + 1
    if school.get("gender"):
        gender_counts[school["gender"]] = gender_counts.get(school["gender"], 0) + 1

print(f"\nExported: {len(schools_out)} schools")

# Cities by count
print("\nTop cities:")
for k, v in sorted(city_counts.items(), key=lambda x: -x[1])[:25]:
    print(f"  {v:>5}  {k}")

print("\nTypes:")
for k, v in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {v:>5}  {k}")

print("\nGenders:")
for k, v in sorted(gender_counts.items(), key=lambda x: -x[1]):
    print(f"  {v:>5}  {k}")

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(schools_out, f, ensure_ascii=False)

print(f"\nWrote {OUT} ({OUT.stat().st_size / 1024 / 1024:.2f} MB)")
