#!/usr/bin/env python3
"""Expand {{QUALI:prefix}} and {{FORM:builder:prefix[:json]}} markers in src/*.html into compositions/*.html."""
import re, pathlib, json, sys
root = pathlib.Path(__file__).parent
sys.path.insert(0, str(root))
import forms
svg = (root / "src/quali.svg.html").read_text()
WIN = ('<div class="win" id="{p}-win" style="left:210px;top:40px;width:1500px">'
       '<div class="win-bar"><div class="tabdot"></div>QIM<div class="url">Quality Issue · QQ3 - Internal Complaint</div></div>'
       '<div class="win-body" style="height:824px"><div class="screen" style="transform:scale(0.78575)">{form}</div></div></div>')
def form(m):
    b, p = m.group(1), m.group(2)
    kw = json.loads(m.group(3)) if m.group(3) else {}
    return WIN.replace("{p}", p).replace("{form}", getattr(forms, b)(p, **kw))
for f in sorted((root / "src").glob("*.html")):
    if f.name.startswith("quali"): continue
    s = f.read_text()
    s = re.sub(r"\{\{QUALI:([\w-]+)\}\}", lambda m: svg.replace('id="P-', f'id="{m.group(1)}-'), s)
    s = re.sub(r"\{\{RAW:(\w+):([\w-]+)\}\}", lambda m: getattr(forms, m.group(1))(m.group(2)), s)
    s = re.sub(r"\{\{FORM:(\w+):([\w-]+)(?::(\{.*?\}))?\}\}", form, s)
    (root / "compositions" / f.name).write_text(s)
    print("built", f.name)
