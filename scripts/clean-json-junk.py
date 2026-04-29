"""
Clean HTML / CSS junk that leaked into text fields of schools-real.json.

Background:
    One of the upstream sources scraped HTML markup verbatim. Its CSS
    attributes ('font-family: Tajawal,sans-serif; color: #000000; ...')
    bled into the `about` field of ~1,584 schools, and tiny snippets
    bled into the `city` and `district` fields of a couple dozen.

    On the home page this manifested as a horizontal-overflow scrollbar
    because the city dropdown / city-directory grid was rendering a
    197-character "city name" that was actually CSS.

This script normalises in place: strip HTML tags, collapse whitespace,
drop fields that are entirely junk (e.g. a city that is pure CSS).
"""

import json, re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

JSON = Path(r"D:\Projects\fisool\src\lib\data\schools-real.json")

# ---------- Whitelists & normalisations for facets ----------

# Recognised Saudi cities/regions. Any city value not in this set is junk
# (scraped page-text bleeding into the city column) and gets dropped.
# Includes English-only names that map to their Arabic canonical.
KNOWN_CITIES_CANON = {
    "الرياض": "الرياض", "Riyadh": "الرياض",
    "جدة": "جدة", "Jeddah": "جدة", "جدة،": "جدة",
    "الدمام": "الدمام", "Ad Dammam": "الدمام",
    "مكة": "مكة", "Mecca": "مكة",
    "المدينة المنورة": "المدينة المنورة", "Medina": "المدينة المنورة",
    "الخبر": "الخبر", "Al Khobar": "الخبر",
    "الطائف": "الطائف", "At Taef": "الطائف", "الطايف": "الطائف",
    "تبوك": "تبوك", "Tabuk": "تبوك",
    "الأحساء": "الأحساء", "Al-Ahsa": "الأحساء", "بالأحساء": "الأحساء",
    "الجبيل": "الجبيل",
    "الظهران": "الظهران",
    "حائل": "حائل", "Ha'il": "حائل",
    "نجران": "نجران",
    "الخرج": "الخرج",
    "عرعر": "عرعر",
    "القطيف": "القطيف",
    "الجوف": "الجوف", "Al jawf": "الجوف",
    "عسير": "عسير", "Aseer": "عسير",
    "جازان": "جازان",
    "ينبع": "ينبع", "Yanbu": "ينبع",
    "حفر الباطن": "حفر الباطن", "Hafar al-Batin": "حفر الباطن",
    "الدوادمي": "الدوادمي",
    "الباحة": "الباحة",
    "الخفجي": "الخفجي",
    "رابغ": "رابغ",
    "رأس التنورة": "رأس التنورة",
    "سيهات": "سيهات",
    "سكاكا": "سكاكا",
    "وادي الدواسر": "وادي الدواسر",
    "رفحاء": "رفحاء",
    "خيبر": "خيبر",
    "المجمعة": "المجمعة",
    "بريدة - القصيم": "بريدة - القصيم",
    "Buraydah - Qaseem": "بريدة - القصيم",
    "بريدة": "بريدة - القصيم",
    "القصيم": "بريدة - القصيم",  # the region; merge into بريدة - القصيم
}

# Curriculum token canonicalisation.
# Keys are normalised forms (after we lowercase + collapse spaces);
# values are the canonical Arabic display label.
CURRICULUM_CANON = {
    "أهلي": "أهلي",
    "ahli": "أهلي",
    "أمريكي": "أمريكي",
    "american": "أمريكي",
    "بريطاني": "بريطاني",
    "british": "بريطاني",
    "عام": "عام",
    "general": "عام",
    "مصري": "مصري",
    "مصرى": "مصري",                       # ى → ي
    "المسار المصرى": "مصري",
    "المسار المصري": "مصري",
    "egyptian": "مصري",
    "egyptian path": "مصري",
    "الدبلومة الأمريكية": "الدبلومة الأمريكية",
    "الدبلوما الامريكية": "الدبلومة الأمريكية",
    "american diploma": "الدبلومة الأمريكية",
    "البكالوريا الدولية (ib)": "البكالوريا الدولية (IB)",
    "البكالوريا الدولية": "البكالوريا الدولية (IB)",
    "ib": "البكالوريا الدولية (IB)",
    "هندي": "هندي",
    "indian": "هندي",
    "india": "هندي",
    "فرنسي": "فرنسي",
    "french": "فرنسي",
    "فلبيني": "فلبيني",
    "filipino": "فلبيني",
    "باكستاني": "باكستاني",
    "pakistani": "باكستاني",
    "سوداني": "سوداني",
    "مسار سوداني": "سوداني",
    "sudan": "سوداني",
    "sudanese": "سوداني",
    "استرالي": "استرالي",
    "australian": "استرالي",
    "تربية خاصة": "تربية خاصة",
    "تربيه خاصه": "تربية خاصة",
    "special education": "تربية خاصة",
    "دمج (ذوي الهمم)": "دمج (ذوي الهمم)",
    "دمج": "دمج (ذوي الهمم)",
    "سابيس sabis": "سابيس SABIS",
    "sabis": "سابيس SABIS",
    "وطني": "وطني",
    "national": "وطني",
}

# Gender canonicalisation. "مشتركة" and "بنين و بنات" mean the same.
GENDER_CANON = {
    "بنين و بنات": "بنين و بنات",
    "مشتركة": "بنين و بنات",       # MERGE
    "Boys and Girls": "بنين و بنات",
    "بنات": "بنات",
    "Girls": "بنات",
    "بنين": "بنين",
    "Boys": "بنين",
}

# Stages: merge حضانة into روضة so the canonical Saudi 4 stages are clean.
STAGE_CANON_MAP = {
    "حضانة": "روضة",
    "روضة": "روضة",
    "ابتدائي": "ابتدائي",
    "متوسط": "متوسط",
    "ثانوي": "ثانوي",
}
STAGE_ORDER = ["روضة", "ابتدائي", "متوسط", "ثانوي"]


def normalise_curriculum_token(t: str) -> str | None:
    if not t:
        return None
    key = t.strip().lower()
    key = re.sub(r"\s+", " ", key)
    return CURRICULUM_CANON.get(key, t.strip() if t.strip() else None)


def normalise_city(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip().rstrip("،,").strip()
    return KNOWN_CITIES_CANON.get(v)  # returns None if not in whitelist


# Bounding boxes for the major Saudi cities. Used to infer the city when the
# scraped value was junk (we'd dropped it) but coordinates are present.
# Tuples are (lat_min, lat_max, lng_min, lng_max, canonical_name).
# Order matters — the first match wins, so put more specific boxes first.
CITY_BBOXES = [
    # Eastern Province (overlapping cities — order matters)
    (26.85, 27.20, 49.45, 49.80, "الجبيل"),
    (26.45, 26.65, 49.85, 50.15, "القطيف"),
    (26.20, 26.35, 49.95, 50.10, "الظهران"),
    (26.18, 26.40, 50.10, 50.30, "الخبر"),
    (26.30, 26.55, 49.90, 50.20, "الدمام"),
    (25.20, 25.65, 49.40, 50.00, "الأحساء"),
    (28.35, 28.55, 45.90, 46.20, "حفر الباطن"),
    (28.35, 28.50, 48.45, 48.65, "الخفجي"),
    # Central
    (24.40, 25.20, 46.30, 47.30, "الرياض"),
    (24.05, 24.30, 47.20, 47.50, "الخرج"),
    (25.80, 26.05, 45.20, 45.55, "المجمعة"),
    (24.45, 24.60, 44.30, 44.55, "الدوادمي"),
    (26.25, 26.45, 43.85, 44.20, "بريدة - القصيم"),
    # Western (Hejaz)
    (21.30, 21.95, 38.95, 39.50, "جدة"),
    (21.20, 21.60, 39.55, 40.15, "مكة"),
    (24.20, 24.65, 39.40, 39.85, "المدينة المنورة"),
    (21.15, 21.45, 40.30, 40.60, "الطائف"),
    (24.00, 24.20, 37.90, 38.25, "ينبع"),
    (22.70, 22.85, 39.00, 39.20, "رابغ"),
    (25.90, 26.10, 39.25, 39.60, "خيبر"),
    # North
    (28.30, 28.55, 36.45, 36.75, "تبوك"),
    (27.45, 27.70, 41.60, 41.85, "حائل"),
    (29.90, 30.15, 40.10, 40.30, "سكاكا"),
    (29.85, 30.05, 39.95, 40.20, "الجوف"),
    (30.90, 31.05, 40.95, 41.20, "عرعر"),
    (29.60, 29.80, 43.45, 43.65, "رفحاء"),
    # South
    (18.10, 18.40, 42.60, 42.85, "عسير"),
    (16.80, 17.00, 42.45, 42.75, "جازان"),
    (17.40, 17.70, 44.10, 44.30, "نجران"),
    (20.00, 20.20, 41.45, 41.65, "الباحة"),
    (20.45, 20.80, 44.40, 45.40, "وادي الدواسر"),
]


def infer_city_from_coords(lat: float, lng: float) -> str | None:
    for la_min, la_max, lng_min, lng_max, name in CITY_BBOXES:
        if la_min <= lat <= la_max and lng_min <= lng <= lng_max:
            return name
    return None


def normalise_gender(value: str | None) -> str | None:
    if not value:
        return None
    return GENDER_CANON.get(value.strip())


def normalise_stages(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    seen = set()
    for v in values:
        c = STAGE_CANON_MAP.get((v or "").strip())
        if c:
            seen.add(c)
    if not seen:
        return None
    return [s for s in STAGE_ORDER if s in seen]

# Strip HTML tags and any orphan CSS-like declaration runs (key: value; key: value).
TAG_RE = re.compile(r"<[^>]+>")
CSS_RUN_RE = re.compile(
    r"(?:[a-zA-Z\-]+\s*:\s*[^;<>\"]+;\s*){2,}"
)
LEADING_CSS_RE = re.compile(r'^[^"]*">\s*')

# Tokens that on their own indicate a field is pure junk and should be dropped.
JUNK_MARKERS = (
    "sans-serif", "font-family", "color:#", "background-color",
    "font-weight:", "white-space:", "vertical-align",
)


def looks_like_pure_junk(s: str) -> bool:
    if not s:
        return False
    s_low = s.lower()
    junk_hits = sum(1 for m in JUNK_MARKERS if m in s_low)
    return junk_hits >= 2


def strip_html(s: str) -> str:
    if not s:
        return s
    # Anything that comes between a quote-gt-pattern and end is the visible text.
    # The leak pattern is: '...style="font-family: ...">VISIBLE'.
    # First strip CSS runs that lack any visible text after them (rare, but happens).
    s = CSS_RUN_RE.sub(" ", s)
    s = TAG_RE.sub(" ", s)
    # If the field still starts with leftover CSS like '...; white-space: pre;">',
    # drop everything up to the first '">'.
    while True:
        m = re.search(r'[a-zA-Z\-]+\s*:\s*[a-zA-Z0-9#,\.\s\-]+;\s*[a-zA-Z\-]+\s*:', s)
        if not m:
            break
        # Find next '">' or '"' followed by visible chars
        end = s.find('">', m.start())
        if end == -1 or end - m.start() > 600:
            break
        s = s[:m.start()] + " " + s[end + 2:]
    # Decode common HTML entities
    s = (
        s.replace("&nbsp;", " ")
         .replace("&amp;", "&")
         .replace("&lt;", "<")
         .replace("&gt;", ">")
         .replace("&quot;", '"')
         .replace("&#39;", "'")
    )
    # Collapse any runs of whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_field(value, allow_drop_if_junk: bool, max_len: int | None = None):
    if value is None:
        return None
    if isinstance(value, str):
        if allow_drop_if_junk and looks_like_pure_junk(value):
            return None
        cleaned = strip_html(value)
        if not cleaned:
            return None
        if allow_drop_if_junk and looks_like_pure_junk(cleaned):
            return None
        if max_len is not None and len(cleaned) > max_len:
            return None
        return cleaned
    if isinstance(value, list):
        out = []
        for v in value:
            cv = clean_field(v, allow_drop_if_junk, max_len)
            if cv is not None and cv != "":
                out.append(cv)
        return out if out else None
    return value


def main():
    data = json.loads(JSON.read_text(encoding="utf-8"))
    print(f"Loaded {len(data)} schools")

    # Fields and whether to drop the field entirely if its value is pure junk
    # Maximum allowed length per field — anything longer is almost
    # certainly scraped page content (nav menus, descriptions) that
    # ended up in the wrong column.
    MAX_LEN = {
        "city": 40,
        "cityEn": 40,
        "district": 50,        # longest real Saudi district ≈ 20 chars
        "districtEn": 50,
        "type": 60,
        "gender": 30,
        "address": 200,
        "name": 200,
        "nameAr": 200,
        "nameEn": 200,
    }
    SHORT_TEXT = list(MAX_LEN.keys())
    LONG_TEXT = ["about"]
    SHORT_LIST = ["facilities", "accreditations", "curriculum", "gradeLevels"]

    stats = {
        "about_cleaned": 0, "about_dropped": 0,
        "city_normalised": 0, "city_dropped": 0,
        "district_dropped": 0, "too_long_dropped": 0,
        "curric_dedupe": 0, "gender_normalised": 0,
        "stages_merged": 0,
    }

    for s in data:
        for f in SHORT_TEXT:
            if f in s:
                before = s[f]
                after = clean_field(before, allow_drop_if_junk=True, max_len=MAX_LEN.get(f))
                if after is None:
                    if f == "city": stats["city_dropped"] += 1
                    if f == "district": stats["district_dropped"] += 1
                    if isinstance(before, str) and MAX_LEN.get(f) and len(before) > MAX_LEN[f]:
                        stats["too_long_dropped"] += 1
                    s.pop(f, None)
                elif after != before:
                    s[f] = after

        # City: enforce whitelist
        if "city" in s:
            normalised = normalise_city(s["city"])
            if normalised is None:
                s.pop("city", None)
                stats["city_dropped"] += 1
            elif normalised != s["city"]:
                s["city"] = normalised
                stats["city_normalised"] += 1

        # If the city is still missing but we have coords, infer it.
        if "city" not in s and s.get("lat") is not None and s.get("lng") is not None:
            inferred = infer_city_from_coords(s["lat"], s["lng"])
            if inferred:
                s["city"] = inferred
                stats.setdefault("city_inferred", 0)
                stats["city_inferred"] += 1

        # Gender: collapse مشتركة → بنين و بنات
        if "gender" in s:
            normalised = normalise_gender(s["gender"])
            if normalised and normalised != s["gender"]:
                s["gender"] = normalised
                stats["gender_normalised"] += 1
            elif not normalised:
                s.pop("gender", None)

        # Curriculum: dedupe + normalise tokens
        if "curriculum" in s and isinstance(s["curriculum"], list):
            new_tokens: list[str] = []
            seen: set[str] = set()
            for t in s["curriculum"]:
                norm = normalise_curriculum_token(t)
                if norm and norm not in seen:
                    seen.add(norm)
                    new_tokens.append(norm)
            if new_tokens != s["curriculum"]:
                stats["curric_dedupe"] += 1
            s["curriculum"] = new_tokens if new_tokens else None
            if not new_tokens:
                s.pop("curriculum", None)

        # Stages: merge حضانة → روضة, output canonical 4-stage list
        if "gradeLevels" in s:
            normalised = normalise_stages(s["gradeLevels"])
            if normalised != s.get("gradeLevels"):
                stats["stages_merged"] += 1
            if normalised is None:
                s.pop("gradeLevels", None)
            else:
                s["gradeLevels"] = normalised

        for f in LONG_TEXT:
            if f in s:
                before = s[f]
                after = clean_field(before, allow_drop_if_junk=False)
                if after is None or len(after) < 10:
                    s.pop(f, None)
                    stats["about_dropped"] += 1
                elif after != before:
                    s[f] = after
                    stats["about_cleaned"] += 1
        for f in SHORT_LIST:
            if f in s and f not in ("curriculum", "gradeLevels"):
                cleaned = clean_field(s[f], allow_drop_if_junk=True)
                if cleaned is None:
                    s.pop(f, None)
                else:
                    s[f] = cleaned

    print(f"\nStats: {stats}")

    JSON.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    new_size = JSON.stat().st_size / 1024 / 1024
    print(f"\nWrote {JSON} ({new_size:.2f} MB)")


if __name__ == "__main__":
    main()
