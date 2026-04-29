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

    stats = {"about_cleaned": 0, "about_dropped": 0, "city_dropped": 0, "district_dropped": 0, "too_long_dropped": 0}

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
        for f in LONG_TEXT:
            if f in s:
                before = s[f]
                # For long text we DON'T drop entirely if junk — instead try to
                # extract the visible portion. If after stripping nothing
                # readable remains, drop.
                after = clean_field(before, allow_drop_if_junk=False)
                if after is None or len(after) < 10:
                    s.pop(f, None)
                    stats["about_dropped"] += 1
                elif after != before:
                    s[f] = after
                    stats["about_cleaned"] += 1
        for f in SHORT_LIST:
            if f in s:
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
