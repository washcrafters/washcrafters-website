#!/usr/bin/env python3
"""
Stamp js/main.js and css/styles.css references on every page with a
content-hash cache-buster ("?v=<10-char sha256 prefix>"), so a change to
either file is guaranteed to bust every visitor's cache immediately --
both files are served with a 30-day Cache-Control header
(see .htaccess), so without this, anyone who last visited before a
given deploy keeps running the *old* JS/CSS against the *new* HTML
until their cache naturally expires.

Run from the repo root (site/) any time js/main.js or css/styles.css
changes: python scripts/bump_asset_versions.py
"""
import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

ASSETS = {
    "js/main.js": REPO_ROOT / "js" / "main.js",
    "css/styles.css": REPO_ROOT / "css" / "styles.css",
}


def content_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def main():
    versions = {name: content_hash(path) for name, path in ASSETS.items()}
    for name, v in versions.items():
        print(f"{name}: v={v}")

    files = []
    files += list(REPO_ROOT.glob("*.html"))
    files += list((REPO_ROOT / "services").glob("*.html"))
    files += list((REPO_ROOT / "locations").glob("*.html"))
    files += list((REPO_ROOT / "blog").glob("*.html"))

    # Matches src="[../]js/main.js[?v=...]" and href="[../]css/styles.css[?v=...]",
    # rewriting (or adding) the ?v= query string to the current content hash.
    patterns = [
        (re.compile(r'(src=")((?:\.\./)?js/main\.js)(?:\?v=[0-9a-f]+)?(")'), versions["js/main.js"]),
        (re.compile(r'(href=")((?:\.\./)?css/styles\.css)(?:\?v=[0-9a-f]+)?(")'), versions["css/styles.css"]),
    ]

    changed = []
    for f in files:
        text = f.read_text(encoding="utf-8")
        original = text
        for pat, v in patterns:
            text = pat.sub(rf"\g<1>\g<2>?v={v}\g<3>", text)
        if text == original:
            continue
        if text.count("</head>") != 1 or text.count("</html>") != 1:
            print(f"STRUCTURAL CHECK FAILED, skipping write: {f}", file=sys.stderr)
            continue
        f.write_text(text, encoding="utf-8")
        changed.append(str(f.relative_to(REPO_ROOT)))

    if changed:
        print(f"\nUpdated {len(changed)} file(s):")
        for c in changed:
            print(" ", c)
    else:
        print("\nNo changes needed -- all references already match current content hashes.")


if __name__ == "__main__":
    main()
