#!/usr/bin/env python3
"""
Fetch WashCrafters' current Google rating + review count via the Places API
(New) Text Search endpoint, then update every page that displays it.

Requires the GOOGLE_PLACES_API_KEY environment variable (a Places API key,
restricted to the Places API, stored as a GitHub Actions secret).

Run from the repo root (site/): python scripts/update_review_count.py
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
QUERY = "WashCrafters Exterior Home Solutions Inc, Bedford, Nova Scotia"
# Both of these must check out before any data from a search result is
# trusted. Text Search is fuzzy and can return an unrelated competitor as
# the top (or only) hit -- an earlier version of this script trusted that
# blindly and put a different business's review count live on the site.
EXPECTED_NAME = "washcrafters exterior home solutions"
EXPECTED_PHONE_DIGITS = "9023339929"  # (902) 333-9929
REPO_ROOT = Path(__file__).resolve().parent.parent


def _digits_only(s):
    return re.sub(r"\D", "", s or "")


def fetch_rating_and_count():
    url = "https://places.googleapis.com/v1/places:searchText"
    body = json.dumps({"textQuery": QUERY}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-Goog-Api-Key", API_KEY)
    req.add_header(
        "X-Goog-FieldMask",
        "places.id,places.displayName,places.rating,places.userRatingCount,"
        "places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Places API HTTP {e.code}: {e.read().decode('utf-8', 'replace')}") from e

    places = data.get("places", [])
    if not places:
        raise RuntimeError(f"No places found for query: {QUERY!r}")

    # Require BOTH the business name and phone number to match. Fail loudly
    # (no files touched, non-zero exit) rather than guess if that's not
    # exactly one result -- a wrong silent guess is worse than no update.
    matches = []
    for p in places:
        name = p.get("displayName", {}).get("text", "")
        phone = p.get("nationalPhoneNumber") or p.get("internationalPhoneNumber") or ""
        if EXPECTED_NAME in name.lower() and EXPECTED_PHONE_DIGITS in _digits_only(phone):
            matches.append(p)

    if len(matches) != 1:
        candidates = "\n".join(
            f"  - name={p.get('displayName', {}).get('text')!r} "
            f"phone={p.get('nationalPhoneNumber')!r} id={p.get('id')!r}"
            for p in places
        )
        raise RuntimeError(
            f"Could not confidently identify WashCrafters among {len(places)} result(s) "
            f"for query {QUERY!r} (need exactly 1 name+phone match, got {len(matches)}).\n"
            f"Candidates:\n{candidates}"
        )

    place = matches[0]
    if "rating" not in place or "userRatingCount" not in place:
        raise RuntimeError(f"Matched place is missing rating/userRatingCount: {place!r}")
    return place["rating"], place["userRatingCount"]


def fmt_rating(r):
    return f"{r:.1f}"


# Regexes are structural (they match "whatever number is currently there"),
# so this script needs no memory of the previous value -- safe to run any time.
BADGE_RE = re.compile(r"<strong>[\d.]+</strong> \(\d+ Google reviews\)")
BASED_ON_RE = re.compile(r"<strong>[\d.]+</strong> out of 5 &mdash; based on \d+ Google reviews")
READ_ALL_RE = re.compile(r"Read all \d+ reviews")
REVIEW_STAT_RE = re.compile(
    r'(<div class="stat-number">)\d+\+(</div>\s*<div class="stat-label">Five-Star Reviews</div>)'
)
RATING_STAT_RE = re.compile(
    r'(<div class="stat-number">)[\d.]+(</div>\s*<div class="stat-label">Google Rating</div>)'
)


def update_files(rating, count):
    rating_str = fmt_rating(rating)

    files = []
    files += list(REPO_ROOT.glob("*.html"))
    files += list((REPO_ROOT / "services").glob("*.html"))
    files += list((REPO_ROOT / "locations").glob("*.html"))
    files += list((REPO_ROOT / "blog").glob("*.html"))

    changed = []
    for f in files:
        text = f.read_text(encoding="utf-8")
        original = text

        text = BADGE_RE.sub(f"<strong>{rating_str}</strong> ({count} Google reviews)", text)
        text = BASED_ON_RE.sub(
            f"<strong>{rating_str}</strong> out of 5 &mdash; based on {count} Google reviews", text
        )
        text = READ_ALL_RE.sub(f"Read all {count} reviews", text)
        text = REVIEW_STAT_RE.sub(rf"\g<1>{count}+\g<2>", text)
        text = RATING_STAT_RE.sub(rf"\g<1>{rating_str}\g<2>", text)

        if text == original:
            continue

        if text.count("</head>") != 1 or text.count("</html>") != 1:
            print(f"STRUCTURAL CHECK FAILED, skipping write: {f}", file=sys.stderr)
            continue

        f.write_text(text, encoding="utf-8")
        changed.append(str(f.relative_to(REPO_ROOT)))

    return changed


def main():
    if not API_KEY:
        print("GOOGLE_PLACES_API_KEY is not set.", file=sys.stderr)
        sys.exit(1)

    rating, count = fetch_rating_and_count()
    print(f"Fetched from Google: rating={rating}, review count={count}")

    changed = update_files(rating, count)
    if changed:
        print(f"Updated {len(changed)} file(s):")
        for c in changed:
            print(" ", c)
    else:
        print("No changes needed -- site already reflects the current rating/count.")


if __name__ == "__main__":
    main()
