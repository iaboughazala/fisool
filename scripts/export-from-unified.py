"""
Export the unified.db (built by web-reading/unify.py) into the JSON file
that fisool's Next.js app consumes.

Reads:  D:\\Projects\\fisool\\data\\unified.db
Writes: D:\\Projects\\fisool\\src\\lib\\data\\schools-real.json

The output schema is a SUPERSET of the previous one (existing fields kept
for backward-compat; new fields added for phone/email/website/services/
facilities/PDF profile/etc).

Normalisation rules from the previous export are preserved:
  - Arabic spelling variants collapsed (ى↔ي, ة↔ه, …) per facet
  - English-only city/type/gender values mapped to Arabic canon
  - Stages parsed into the 5 canonical Saudi stages
  - Curriculum tokens split, fixed, deduped

Run after every unified.db rebuild:
    python scripts\\export-from-unified.py
"""
from __future__ import annotations

import io
import json
import re
import sqlite3
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB  = Path(r"D:\Projects\fisool\data\unified.db")
OUT = Path(r"D:\Projects\fisool\src\lib\data\schools-real.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

# ----------------------- normalisation maps -----------------------

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
    "KG1": "روضة 1", "KG2": "روضة 2", "KG3": "تمهيدي",
    "GRADE 1": "الأول الابتدائي", "GRADE 2": "الثاني الابتدائي",
    "GRADE 3": "الثالث الابتدائي", "GRADE 4": "الرابع الابتدائي",
    "GRADE 5": "الخامس الابتدائي", "GRADE 6": "السادس الابتدائي",
    "GRADE 7": "الأول المتوسط", "GRADE 8": "الثاني المتوسط",
    "GRADE 9": "الثالث المتوسط",
    "GRADE 10": "الأول الثانوي", "GRADE 11": "الثاني الثانوي",
    "GRADE 12": "الثالث الثانوي",
}
GRADE_ORDER = {g: i for i, g in enumerate(GRADE_AR.keys())}
GENDER_AR = {"Boys": "بنين", "Girls": "بنات"}

CITY_FALLBACK_EN_TO_AR = {
    "Riyadh": "الرياض", "Buraydah - Qaseem": "بريدة - القصيم",
    "Jeddah": "جدة", "Ad Dammam": "الدمام",
    "Mecca": "مكة", "Medina": "المدينة المنورة",
    "Aseer": "عسير", "Al Khobar": "الخبر",
    "Tabuk": "تبوك", "At Taef": "الطائف", "Al-Ahsa": "الأحساء",
    "Al jawf": "الجوف", "Hafar al-Batin": "حفر الباطن",
    "Ha'il": "حائل", "Yanbu": "ينبع",
}

TYPE_FALLBACK_EN_TO_AR = {
    "International": "عالمية", "National": "أهلية",
}

TYPE_MERGES = {
    "دولية": "عالمية",
    "أهلي": "أهلية",          # madares uses "أهلي" (educationPath); align with school_type
    "حكومي": "حكومية",
    "عالمي": "عالمية",         # masculine variant
    "عالمية واجنبية": "عالمية",
    "International": "عالمية",
    "National": "أهلية",
}

GENDER_FALLBACK_EN_TO_AR = {
    "Boys and Girls": "بنين و بنات",
    "Boys": "بنين", "Girls": "بنات",
    "بنين وبنات": "بنين و بنات",
    "بنين و بنات": "بنين و بنات",
}

CURRICULUM_FIXES = {
    "مصرى": "مصري",
    "تربيه خاصه": "تربية خاصة",
    "البكالوريا الدولية (ib)": "البكالوريا الدولية (IB)",
    "الدبلوما الامريكية": "الدبلومة الأمريكية",
}

STAGE_CANON = "حضانة"
STAGE_KG = "روضة"
STAGE_PRIMARY = "ابتدائي"
STAGE_INTERMEDIATE = "متوسط"
STAGE_SECONDARY = "ثانوي"
ALL_STAGES = [STAGE_CANON, STAGE_KG, STAGE_PRIMARY, STAGE_INTERMEDIATE, STAGE_SECONDARY]

STAGE_VARIANTS: dict[str, str] = {}
for s in ["حضانة", "حضانه", "الحضانة", "الحضانه"]:
    STAGE_VARIANTS[s] = STAGE_CANON
for s in ["روضة", "روضه", "الروضة", "الروضه", "رياض الأطفال", "رياض الاطفال"]:
    STAGE_VARIANTS[s] = STAGE_KG
for s in ["ابتدائي", "ابتدائى", "ابتدائية", "إبتدائي", "إبتدائية",
          "الابتدائية", "الابتدائي", "الإبتدائية", "الإبتدائي"]:
    STAGE_VARIANTS[s] = STAGE_PRIMARY
for s in ["متوسط", "متوسطة", "متوسطه", "المتوسط", "المتوسطة", "المتوسطه"]:
    STAGE_VARIANTS[s] = STAGE_INTERMEDIATE
for s in ["ثانوي", "ثانوية", "ثانويه", "الثانوي", "الثانوية", "الثانويه"]:
    STAGE_VARIANTS[s] = STAGE_SECONDARY


def parse_stages(raw: str | None) -> list[str]:
    if not raw:
        return []
    raw = raw.strip()
    if "جميع المراحل" in raw or raw.lower() in ("all grades", "all stages"):
        return ALL_STAGES.copy()
    en_low = raw.lower()
    en_stages = []
    if "kindergarten" in en_low or "kg" in en_low or "nursery" in en_low:
        en_stages.append(STAGE_KG)
    if "elementry" in en_low or "elementary" in en_low or "primary" in en_low:
        en_stages.append(STAGE_PRIMARY)
    if "middle" in en_low or "intermediate" in en_low:
        en_stages.append(STAGE_INTERMEDIATE)
    if "secondary" in en_low or "high school" in en_low:
        en_stages.append(STAGE_SECONDARY)
    if en_stages:
        return [s for s in ALL_STAGES if s in en_stages]
    tokens = re.split(r"\s*[,،\-]\s*|\s+و\s+", raw)
    seen: set[str] = set()
    for t in tokens:
        t = t.strip()
        canon = STAGE_VARIANTS.get(t)
        if canon:
            seen.add(canon)
    return [s for s in ALL_STAGES if s in seen]


def normalize_for_compare(s: str) -> str:
    if not s:
        return s
    s = s.strip()
    s = s.replace("ى", "ي").replace("ة", "ه")
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    s = re.sub(r"\s+", " ", s)
    return s


def pick_canonical(variants: list[tuple[str, int]]) -> str:
    if len(variants) == 1:
        return variants[0][0]

    def score(v: str) -> tuple[int, int]:
        return (v.count("ة"), v.count("ي"))

    sorted_v = sorted(variants, key=lambda x: (-score(x[0])[0], -score(x[0])[1], -x[1], x[0]))
    return sorted_v[0][0]


def build_canonical_map(values: list[str]) -> dict[str, str]:
    counts = Counter(values)
    groups: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for v, c in counts.items():
        groups[normalize_for_compare(v)].append((v, c))
    canon_for_norm = {k: pick_canonical(vs) for k, vs in groups.items()}
    return {v: canon_for_norm[normalize_for_compare(v)] for v in counts.keys()}


def clean(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v if v else None
    return v


def stage_for_grade(g: str) -> str:
    if not g:
        return "أخرى"
    if g.startswith("KG"):
        return "روضة"
    m = re.match(r"GRADE\s+(\d+)", g)
    if m:
        n = int(m.group(1))
        if n <= 6: return "ابتدائي"
        if n <= 9: return "متوسط"
        return "ثانوي"
    # Arabic grade label
    if any(k in g for k in ("روضة", "روضه", "تمهيدي", "كي جي")):
        return "روضة"
    if any(k in g for k in ("ابتدائ", "إبتدائ")):
        return "ابتدائي"
    if "متوسط" in g:
        return "متوسط"
    if "ثانوي" in g:
        return "ثانوي"
    return "أخرى"


# ------------------------- load DB -------------------------

print(f"Reading {DB}…")
con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row

# all schools
schools_rows = con.execute("SELECT * FROM schools ORDER BY id").fetchall()
print(f"  schools rows: {len(schools_rows)}")

# index related tables by school_id
print("  loading fees…")
fees_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM fees"):
    fees_by_school[r["school_id"]].append(dict(r))

print("  loading services…")
services_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM services"):
    services_by_school[r["school_id"]].append(dict(r))

print("  loading facilities…")
facilities_by_school: dict[int, set[str]] = defaultdict(set)
for r in con.execute("SELECT school_id, label FROM facilities"):
    if r["label"]:
        facilities_by_school[r["school_id"]].add(r["label"].strip())

print("  loading photos…")
photos_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM photos ORDER BY id"):
    photos_by_school[r["school_id"]].append(dict(r))

print("  loading reviews…")
reviews_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM reviews ORDER BY id"):
    reviews_by_school[r["school_id"]].append(dict(r))

print("  loading discounts…")
discounts_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM discounts"):
    discounts_by_school[r["school_id"]].append(dict(r))

print("  loading social links / accreditations…")
social_by_school: dict[int, list[dict]] = defaultdict(list)
for r in con.execute("SELECT * FROM social_links"):
    social_by_school[r["school_id"]].append(dict(r))
accred_by_school: dict[int, set[str]] = defaultdict(set)
for r in con.execute("SELECT school_id, name FROM accreditations"):
    if r["name"]:
        accred_by_school[r["school_id"]].add(r["name"].strip())

# subratings — already in schools.rating_* columns (no separate table needed)

# ------------- build canonical maps for facets -------------

print("Building canonical maps…")
all_cities = []
all_districts = []
all_types = []
all_genders = []
all_curric_tokens = []

for r in schools_rows:
    city = clean(r["city"]) or CITY_FALLBACK_EN_TO_AR.get(clean(r["city_en"]) or "", clean(r["city_en"]))
    district = clean(r["district"])
    typ = clean(r["school_type"]) or TYPE_FALLBACK_EN_TO_AR.get(clean(r["school_type_en"]) or "", clean(r["school_type_en"]))
    if typ in TYPE_MERGES:
        typ = TYPE_MERGES[typ]
    gen = GENDER_FALLBACK_EN_TO_AR.get(clean(r["gender"]) or "", clean(r["gender"]))
    curr = clean(r["curriculum"]) or ""
    tokens = []
    for t in re.split(r"[,،]", curr):
        t = t.strip()
        if t:
            t = CURRICULUM_FIXES.get(t.lower(), t)
            tokens.append(t)

    if city: all_cities.append(city)
    if district: all_districts.append(district)
    if typ: all_types.append(typ)
    if gen: all_genders.append(gen)
    all_curric_tokens.extend(tokens)

city_canon = build_canonical_map(all_cities)
district_canon = build_canonical_map(all_districts)
type_canon = build_canonical_map(all_types)
gender_canon = build_canonical_map(all_genders)
curric_canon = build_canonical_map(all_curric_tokens)


def report_merges(name, mp):
    merges = defaultdict(set)
    for orig, canon in mp.items():
        if orig != canon:
            merges[canon].add(orig)
    if merges:
        print(f"  {name}: {sum(len(v) for v in merges.values())} variants merged into {len(merges)} canonical")


for n, m in (("CITY", city_canon), ("TYPE", type_canon),
             ("GENDER", gender_canon), ("CURRICULUM", curric_canon)):
    report_merges(n, m)

# ------------- emit each school -------------

print("\nEmitting JSON…")
out: list[dict] = []
city_counts = Counter()
type_counts = Counter()
n_with_coords = 0

for r in schools_rows:
    sid = r["id"]

    name_ar = clean(r["name_ar"])
    name_en = clean(r["name_en"])
    name = name_ar or name_en
    if not name:
        continue

    raw_city = clean(r["city"]) or CITY_FALLBACK_EN_TO_AR.get(clean(r["city_en"]) or "", clean(r["city_en"]))
    city = city_canon.get(raw_city, raw_city) if raw_city else None
    raw_district = clean(r["district"])
    district = district_canon.get(raw_district, raw_district) if raw_district else None
    raw_typ = clean(r["school_type"]) or TYPE_FALLBACK_EN_TO_AR.get(clean(r["school_type_en"]) or "", clean(r["school_type_en"]))
    if raw_typ in TYPE_MERGES:
        raw_typ = TYPE_MERGES[raw_typ]
    typ = type_canon.get(raw_typ, raw_typ) if raw_typ else None
    raw_gen = GENDER_FALLBACK_EN_TO_AR.get(clean(r["gender"]) or "", clean(r["gender"]))
    gen = gender_canon.get(raw_gen, raw_gen) if raw_gen else None

    curr_raw = clean(r["curriculum"]) or ""
    curric_tokens: list[str] = []
    for t in re.split(r"[,،]", curr_raw):
        t = t.strip()
        if t:
            t = CURRICULUM_FIXES.get(t.lower(), t)
            t = curric_canon.get(t, t)
            if t not in curric_tokens:
                curric_tokens.append(t)

    stages = parse_stages(clean(r["grade_levels"]))
    # also try to derive stages from grade fees if grade_levels was empty
    if not stages:
        seen_st: set[str] = set()
        for f in fees_by_school.get(sid, []):
            st = stage_for_grade(f.get("grade") or f.get("grade_ar") or "")
            if st in ALL_STAGES:
                seen_st.add(st)
        stages = [s for s in ALL_STAGES if s in seen_st]

    # ---- fees: preserve every row from every source ----
    raw_fees = fees_by_school.get(sid, [])
    grade_fees = []
    for f in raw_fees:
        g = (f.get("grade") or "").strip()
        amount = f.get("amount")
        if amount is None or amount <= 0:
            continue
        grade_fees.append({
            "source": f.get("source"),
            "track": f.get("track"),
            "trackAr": TRACK_AR.get(f.get("track") or "", f.get("track")),
            "grade": g,
            "gradeAr": GRADE_AR.get(g, f.get("grade_ar") or g),
            "stage": stage_for_grade(g),
            "gender": f.get("gender"),
            "genderAr": GENDER_AR.get(f.get("gender") or "", f.get("gender")),
            "amount": int(amount),
        })
    grade_fees.sort(key=lambda x: (
        x.get("track") or "",
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

    # ---- photos ----
    raw_photos = photos_by_school.get(sid, [])
    photos_out = []
    seen_urls: set[str] = set()
    for p in raw_photos:
        url = p.get("original_url") or p.get("local_path")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        photos_out.append({
            "source": p.get("source"),
            "originalUrl": p.get("original_url"),
            "localPath": p.get("local_path"),
        })
    primary_photo = photos_out[0] if photos_out else None

    # ---- services / facilities / discounts / accreditations ----
    services_out = []
    for s in services_by_school.get(sid, []):
        services_out.append({
            "source": s.get("source"),
            "label": s.get("label"),
            "amount": s.get("amount"),
            "isOptional": bool(s.get("is_optional")),
            "oneTime": bool(s.get("one_time")),
        })
    facilities_out = sorted(facilities_by_school.get(sid, set()))
    discounts_out = []
    for d in discounts_by_school.get(sid, []):
        discounts_out.append({
            "source": d.get("source"),
            "label": d.get("label"),
            "pct": d.get("pct"),
            "amount": d.get("amount"),
        })
    accreditations_out = sorted(accred_by_school.get(sid, set()))
    socials_out = []
    for sl in social_by_school.get(sid, []):
        if sl.get("url"):
            socials_out.append({
                "source": sl.get("source"),
                "platform": sl.get("platform"),
                "url": sl.get("url"),
            })

    # ---- reviews ----
    reviews_out = []
    for rv in reviews_by_school.get(sid, []):
        reviews_out.append({
            "source": rv.get("source"),
            "author": rv.get("author"),
            "rating": rv.get("rating"),
            "comment": rv.get("comment"),
            "date": rv.get("review_date"),
        })

    # ---- subRatings (from columns) ----
    sub_ratings = {}
    for col, label in [
        ("rating_academic", "المستوى الأكاديمي للمدرسة"),
        ("rating_communication", "التواصل مع المدرسة"),
        ("rating_facilities", "مرافق المدرسة"),
        ("rating_safety", "السلامة والنظافة"),
        ("rating_activities", "الأنشطة الترفيهية"),
    ]:
        if r[col] is not None:
            sub_ratings[label] = r[col]

    # ---- canonical sourceUrl (prefer yaschools, then mdaresai, then ssg, then madares) ----
    source_url = (clean(r["yaschools_url"])
                  or clean(r["mdaresai_url"])
                  or clean(r["ssg_url"])
                  or clean(r["madares_url"]))

    # foundation
    foundation_year = r["foundation_year"]
    foundation_date = clean(r["foundation_date"])
    if not foundation_year and foundation_date:
        m = re.match(r"(\d{4})", foundation_date)
        if m:
            foundation_year = int(m.group(1))

    sources_list = [s for s in (clean(r["sources"]) or "").split(",") if s]

    school = {
        # --- legacy keys (kept for back-compat) ---
        "id": sid,
        "slug": clean(r["canonical_slug"]) or f"school-{sid}",
        "name": name,
        "nameAr": name_ar,
        "nameEn": name_en,
        "city": city,
        "cityEn": clean(r["city_en"]),
        "district": district,
        "districtEn": clean(r["district_en"]),
        "lat": r["latitude"],
        "lng": r["longitude"],
        "type": typ,
        "curriculum": curric_tokens or None,
        "gender": gen,
        "gradeLevels": stages or None,
        "gradeLevelsRaw": clean(r["grade_levels"]),
        "foundedYear": foundation_year,
        "about": clean(r["about_ar"]) or clean(r["about_en"]),
        "rating": r["overall_rating"],
        "reviewCount": r["review_count"],
        "startingFee": int(r["starting_fee"]) if r["starting_fee"] else None,
        "fees": fees_summary,
        "gradeFees": grade_fees or None,
        "photo": primary_photo,
        "subRatings": sub_ratings or None,
        "sourceUrl": source_url,

        # --- NEW fields ---
        "phone": clean(r["phone"]),
        "mobile": clean(r["mobile"]),
        "whatsapp": clean(r["whatsapp"]),
        "email": clean(r["email"]),
        "website": clean(r["website"]),
        "address": clean(r["address"]),
        "studentCount": r["student_count"],
        "foundationDate": foundation_date,
        "profilePdfUrl": clean(r["profile_pdf_url"]),
        "profilePdfLocalPath": clean(r["profile_pdf_local_path"]),
        "videoUrl": clean(r["video_url"]),
        "logoUrl": clean(r["logo_url"]),
        "facilities": facilities_out or None,
        "services": services_out or None,
        "discounts": discounts_out or None,
        "accreditations": accreditations_out or None,
        "photos": photos_out or None,           # full gallery
        "reviewsList": reviews_out or None,     # full reviews (avoid clash with reviewCount)
        "socialLinks": socials_out or None,
        "sources": sources_list or None,
        "sourcesCount": r["sources_count"],
    }
    school = {k: v for k, v in school.items() if v not in (None, "", [], {})}

    out.append(school)
    if r["latitude"] is not None and r["longitude"] is not None:
        n_with_coords += 1
    if school.get("city"):
        city_counts[school["city"]] += 1
    if school.get("type"):
        type_counts[school["type"]] += 1

print(f"\nExported {len(out)} schools ({n_with_coords} with coords)")
print("\nTop cities:")
for k, v in city_counts.most_common(10):
    print(f"  {v:>5}  {k}")
print("\nTypes:")
for k, v in type_counts.most_common():
    print(f"  {v:>5}  {k}")

with OUT.open("w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)
print(f"\nWrote {OUT} ({OUT.stat().st_size / 1024 / 1024:.2f} MB)")
