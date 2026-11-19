#!/usr/bin/env python3
"""Expand {{QUALI:prefix}} markers in src/*.html into compositions/*.html."""
import re, pathlib
root = pathlib.Path(__file__).parent
svg = (root / "src/quali.svg.html").read_text()
for f in sorted((root / "src").glob("*.html")):
    if f.name.startswith("quali"): continue
    s = f.read_text()
    s = re.sub(r"\{\{QUALI:([\w-]+)\}\}", lambda m: svg.replace('id="P-', f'id="{m.group(1)}-'), s)
    (root / "compositions" / f.name).write_text(s)
    print("built", f.name)
