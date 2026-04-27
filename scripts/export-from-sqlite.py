"""
Export all schools from D:\\Projects\\web-reading\\schools.db to a single JSON file
that the Next.js app can import directly.

Includes:
    * gradeFees: full per-grade × per-track × per-gender fee schedule
    * fees: derived min/max/median (kept for filtering and card display)
    * subRatings: 5 sub-ratings keyed by Arabic category
    * photo: first photo's original URL
    * sourceUrl: extracted from the source share-link

Normalisation:
    * Arabic spelling variants (ى↔ي, ة↔ه) are collapsed using a two-pass
      auto-dedupe: collect all variants, then pick the canonical form
      (preferring ة, ي).
    * English-only city / district / type / gender values are mapped to
      their Arabic canonical equivalents via explicit overrides — this
      keeps facets like CITIES from listing both "Riyadh" and "الرياض".
"""

import sqlite3, json, sys, io, statistics, re
from pathlib import Path
from urllib.parse import unquote
from collections import Counter, defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB = Path(r"D:\Projects\web-reading\schools.db")
OUT = Path(r"D:\Projects\fisool\src\lib\data\schools-real.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

# ---------- Translations & overrides ----------

TRACK_AR = {
    "General": "المسار العام",
    "Global American": "أمريكي عالمي",
    "Global British": "بريطاني عالمي",
    "American Diploma": "الدبلومة الأمريكية",
    "Egyptian Arabic Path": "المسار المصري - عربي",
    "Egyptian Languages Path": "المسار المصري - لغات",
    "Learning Difficulties": "صعوبات التعلّم",
    "Autism": "التوحد",
    "Physical and Health Disability": "إعاقة جسدية وصحية",
    "Intellectual Disability": "إعاقة ذهنية",
    "Hyperactivity and Attention Deficit": "فرط الحركة وتشتت الانتباه",
    "International Baccalaureate IB": "البكالوريا الدولية (IB)",
    "Memorization": "تحفيظ القرآن",
    "Global Frensh": "فرنسي عالمي",
    "Bilingual": "ثنائي اللغة",
    "Montessori": "مونتيسوري",
    "sudan": "المسار السوداني",
    "India": "المسار الهندي",
}

GRADE_AR = {
    "KG1": "روضة 1",
    "KG2": "روضة 2",
    "KG3": "تمهيدي",
    "GRADE 1": "الأول الابتدائي",
    "GRADE 2": "الثاني الابتدائي",
    "GRADE 3": "الثالث الابتدائي",
    "GRADE 4": "الرابع الابتدائي",
    "GRADE 5": "الخامس الابتدائي",
    "GRADE 6": "السادس الابتدائي",
    "GRADE 7": "الأول المتوسط",
    "GRADE 8": "الثاني المتوسط",
    "GRADE 9": "الثالث المتوسط",
    "GRADE 10": "الأول الثانوي",
    "GRADE 11": "الثاني الثانوي",
    "GRADE 12": "الثالث الثانوي",
}

GRADE_ORDER = {g: i for i, g in enumerate(GRADE_AR.keys())}
GENDER_AR = {"Boys": "بنين", "Girls": "بنات"}

# English-only fallbacks for the schools.<col> when <col>_ar is empty.
CITY_FALLBACK_EN_TO_AR = {
    "Riyadh": "الرياض",
    "Buraydah - Qaseem": "بريدة - القصيم",
    "Jeddah": "جدة",
    "Ad Dammam": "الدمام",
    "Mecca": "مكة",
    "Medina": "المدينة المنورة",
    "Aseer": "عسير",
    "Al Khobar": "الخبر",
    "Tabuk": "تبوك",
    "At Taef": "الطائف",
    "Al-Ahsa": "الأحساء",
    "Al jawf": "الجوف",
    "Hafar al-Batin": "حفر الباطن",
    "Ha'il": "حائل",
    "Yanbu": "ينبع",
}

DISTRICT_FALLBACK_EN_TO_AR = {
    "Namar": "نمار",
    "Al Bishr": "البشر",
}

TYPE_FALLBACK_EN_TO_AR = {
    "International": "عالمية",
    "National": "أهلية",
}

GENDER_FALLBACK_EN_TO_AR = {
    "Boys and Girls": "بنين و بنات",
    "Boys": "بنين",
    "Girls": "بنات",
}

# Curriculum spelling fixes (canonical forms).
CURRICULUM_FIXES = {
    "مصرى": "مصري",
    "تربيه خاصه": "تربية خاصة",
    "البكالوريا الدولية (ib)": "البكالوريا الدولية (IB)",
    "الدبلوما الامريكية": "الدبلومة الأمريكية",
    "أهلي": "أهلي",  # keep as-is
}


# ---------- Arabic normalisation utilities ----------

def normalize_for_compare(s: str) -> str:
    """Aggressive normalisation for equality comparison only — not display."""
    if not s:
        return s
    s = s.strip()
    s = s.replace("ى", "ي")
    s = s.replace("ة", "ه")
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    s = re.sub(r"\s+", " ", s)
    return s


def pick_canonical(variants: list[tuple[str, int]]) -> str:
    """Given a list of (spelling, count) variants for the same logical value,
    pick the canonical display form. Prefer ة over ه (feminine ending),
    prefer ي over ى, then prefer the most common variant."""
    if len(variants) == 1:
        return variants[0][0]

    def score(v: str) -> tuple[int, int]:
        # primary: contains ة (canonical feminine) — bigger is better
        ta = v.count("ة")
        # secondary: contains ي (preferred over ى) — bigger is better
        ya = v.count("ي")
        return (ta, ya)

    # Sort by (canonical-form score desc, frequency desc)
    sorted_v = sorted(
        variants,
        key=lambda x: (-score(x[0])[0], -score(x[0])[1], -x[1], x[0]),
    )
    return sorted_v[0][0]


def build_canonical_map(values: list[str]) -> dict[str, str]:
    """For a list of values, group by their normalised key and pick a
    canonical display form for each group. Returns map from EVERY input
    value to its canonical form."""
    counts = Counter(values)
    groups: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for v, c in counts.items():
        groups[normalize_for_compare(v)].append((v, c))
    canon_for_norm: dict[str, str] = {}
    for k, vs in groups.items():
        canon_for_norm[k] = pick_canonical(vs)
    return {v: canon_for_norm[normalize_for_compare(v)] for v in counts.keys()}


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v if v else None
    return v


# ---------- Load DB ----------

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row

print("Loading fees…")
fees_by_school: dict[int, list[dict]] = {}
for r in con.execute(
    "SELECT school_id, track, grade, gender, amount FROM fees ORDER BY school_id"
):
    fees_by_school.setdefault(r["school_id"], []).append({
        "track": r["track"],
        "grade": r["grade"],
        "gender": r["gender"],
        "amount": float(r["amount"]),
    })

print("Loading subcategory ratings…")
subratings_by_school: dict[int, dict] = {}
for r in con.execute(
    "SELECT school_id, category_ar, rating FROM subcategory_ratings"
):
    sid = r["school_id"]
    cat_ar = clean(r["category_ar"])
    if not cat_ar or r["rating"] is None:
        continue
    subratings_by_school.setdefault(sid, {})[cat_ar] = r["rating"]

print("Loading photos…")
photos_by_school: dict[int, dict] = {}
for r in con.execute(
    "SELECT school_id, original_url FROM photos ORDER BY school_id, id"
):
    if r["school_id"] not in photos_by_school:
        photos_by_school[r["school_id"]] = {"originalUrl": clean(r["original_url"])}

print("Loading source URLs…")
source_url_by_school: dict[int, str] = {}
for r in con.execute(
    "SELECT school_id, url FROM social_links WHERE platform='facebook'"
):
    raw = r["url"] or ""
    if "?u=" in raw:
        encoded = raw.split("?u=", 1)[1].split("&", 1)[0]
        source = unquote(encoded).strip()
        if source.startswith("http") and "yaschools.com" in source:
            source_url_by_school[r["school_id"]] = source

# ---------- Pass 1: collect raw values for normalisation ----------

print("Pass 1: collecting values for normalisation…")
raw_rows = []
all_cities = []
all_districts = []
all_types = []
all_genders = []
all_curric_tokens = []

for r in con.execute("SELECT * FROM schools ORDER BY id"):
    name_ar = clean(r["name_ar"])
    name_en = clean(r["name_en"])
    name = name_ar or name_en
    if not name:
        continue

    # City: prefer Arabic, fall back to English-mapped Arabic
    city_ar = clean(r["city_ar"])
    city_en = clean(r["city"])
    city = city_ar or CITY_FALLBACK_EN_TO_AR.get(city_en or "", city_en)

    district_ar = clean(r["district_ar"])
    district_en = clean(r["district"])
    district = district_ar or DISTRICT_FALLBACK_EN_TO_AR.get(district_en or "", district_en)

    type_ar = clean(r["school_type_ar"])
    type_en = clean(r["school_type"])
    typ = type_ar or TYPE_FALLBACK_EN_TO_AR.get(type_en or "", type_en)

    gender_ar = clean(r["gender_ar"])
    gender_en = clean(r["gender"])
    gen = gender_ar or GENDER_FALLBACK_EN_TO_AR.get(gender_en or "", gender_en)

    curr_ar = clean(r["curriculum_ar"])
    tokens = []
    if curr_ar:
        for t in re.split(r"[,،]", curr_ar):
            t = t.strip()
            if t:
                t = CURRICULUM_FIXES.get(t.lower(), t)
                # Apply the lowercase-key fix in case of mixed case
                if t.lower() in CURRICULUM_FIXES:
                    t = CURRICULUM_FIXES[t.lower()]
                tokens.append(t)

    raw_rows.append({
        "row": r,
        "name": name,
        "city": city,
        "district": district,
        "type": typ,
        "gender": gen,
        "curric_tokens": tokens,
    })
    if city: all_cities.append(city)
    if district: all_districts.append(district)
    if typ: all_types.append(typ)
    if gen: all_genders.append(gen)
    all_curric_tokens.extend(tokens)

# Build canonical maps
print("Building canonical-spelling maps…")
city_canon = build_canonical_map(all_cities)
district_canon = build_canonical_map(all_districts)
type_canon = build_canonical_map(all_types)
gender_canon = build_canonical_map(all_genders)
curric_canon = build_canonical_map(all_curric_tokens)

# Report any merges
def report_merges(name, mp):
    merges = defaultdict(set)
    for orig, canon in mp.items():
        if orig != canon:
            merges[canon].add(orig)
    if merges:
        print(f"  {name}: {sum(len(v) for v in merges.values())} variants merged into {len(merges)} canonical")
        for canon, origs in list(merges.items())[:6]:
            print(f"    {canon}  ←  {sorted(origs)}")

report_merges("CITY", city_canon)
report_merges("DISTRICT", district_canon)
report_merges("TYPE", type_canon)
report_merges("GENDER", gender_canon)
report_merges("CURRICULUM", curric_canon)

# ---------- Pass 2: emit normalised rows ----------

schools_out = []
city_counts = Counter()
type_counts = Counter()
n_with_coords = 0
n_without_coords = 0

for entry in raw_rows:
    r = entry["row"]
    sid = r["id"]
    name_ar = clean(r["name_ar"])
    name_en = clean(r["name_en"])
    name = name_ar or name_en

    lat = r["latitude"]
    lng = r["longitude"]

    city = city_canon.get(entry["city"], entry["city"]) if entry["city"] else None
    district = district_canon.get(entry["district"], entry["district"]) if entry["district"] else None
    typ = type_canon.get(entry["type"], entry["type"]) if entry["type"] else None
    gen = gender_canon.get(entry["gender"], entry["gender"]) if entry["gender"] else None
    tokens = [curric_canon.get(t, t) for t in entry["curric_tokens"]]
    # dedupe within a school after normalisation
    seen = set()
    tokens_clean = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            tokens_clean.append(t)
    curriculum = "، ".join(tokens_clean) if tokens_clean else None

    # Per-grade fees
    raw_fees = fees_by_school.get(sid, [])
    grade_fees = []
    for f in raw_fees:
        g = (f["grade"] or "").strip()
        grade_fees.append({
            "track": f["track"],
            "trackAr": TRACK_AR.get(f["track"], f["track"]),
            "grade": g,
            "gradeAr": GRADE_AR.get(g, g),
            "stage": (
                "روضة" if g.startswith("KG")
                else "ابتدائي" if g.startswith("GRADE ") and int(g.split()[1]) <= 6
                else "متوسط" if g.startswith("GRADE ") and int(g.split()[1]) <= 9
                else "ثانوي" if g.startswith("GRADE ")
                else "أخرى"
            ),
            "gender": f["gender"],
            "genderAr": GENDER_AR.get(f["gender"], f["gender"]),
            "amount": int(f["amount"]),
        })
    grade_fees.sort(key=lambda x: (
        x["track"] or "",
        GRADE_ORDER.get(x["grade"], 99),
        0 if x["gender"] == "Boys" else 1,
    ))

    fee_amounts = [gf["amount"] for gf in grade_fees]
    fees_summary = None
    if fee_amounts:
        boys = [gf["amount"] for gf in grade_fees if gf["gender"] == "Boys"]
        girls = [gf["amount"] for gf in grade_fees if gf["gender"] == "Girls"]
        fees_summary = {
            "min": min(fee_amounts),
            "max": max(fee_amounts),
            "median": int(statistics.median(fee_amounts)),
            "count": len(fee_amounts),
            "boysMin": min(boys) if boys else None,
            "boysMax": max(boys) if boys else None,
            "girlsMin": min(girls) if girls else None,
            "girlsMax": max(girls) if girls else None,
        }

    school = {
        "id": sid,
        "slug": clean(r["slug"]),
        "name": name,
        "nameAr": name_ar,
        "nameEn": name_en,
        "city": city,
        "cityEn": clean(r["city"]),
        "district": district,
        "districtEn": clean(r["district"]),
        "lat": lat,
        "lng": lng,
        "type": typ,
        "curriculum": curriculum,
        "gender": gen,
        "gradeLevels": clean(r["grade_levels_ar"]) or clean(r["grade_levels"]),
        "foundedYear": r["founded_year"],
        "about": clean(r["about_ar"]) or clean(r["about"]),
        "rating": r["overall_rating"],
        "reviewCount": r["review_count"],
        "startingFee": int(r["starting_fee"]) if r["starting_fee"] else None,
        "fees": fees_summary,
        "gradeFees": grade_fees if grade_fees else None,
        "photo": photos_by_school.get(sid),
        "subRatings": subratings_by_school.get(sid) or None,
        "sourceUrl": source_url_by_school.get(sid),
    }
    school = {k: v for k, v in school.items() if v not in (None, "", {}, [])}

    schools_out.append(school)
    if lat is not None and lng is not None:
        n_with_coords += 1
    else:
        n_without_coords += 1
    if school.get("city"):
        city_counts[school["city"]] += 1
    if school.get("type"):
        type_counts[school["type"]] += 1

print(f"\nExported: {len(schools_out)} schools "
      f"({n_with_coords} with coords, {n_without_coords} without)")

print("\nFinal cities (top 12):")
for k, v in city_counts.most_common(12):
    print(f"  {v:>5}  {k}")

print("\nFinal types:")
for k, v in type_counts.most_common():
    print(f"  {v:>5}  {k}")

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(schools_out, f, ensure_ascii=False)
print(f"\nWrote {OUT} ({OUT.stat().st_size / 1024 / 1024:.2f} MB)")
