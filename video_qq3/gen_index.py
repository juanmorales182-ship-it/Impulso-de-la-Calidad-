#!/usr/bin/env python3
"""Write index.html from the scene list (id, file, duration)."""
import pathlib, json
SCENES = json.loads((pathlib.Path(__file__).parent / "scenes.json").read_text())
t = 0; hosts = []
for i, (sid, f, d) in enumerate(SCENES):
    hosts.append(f'  <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{f}" data-start="{t:g}" data-duration="{d:g}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
    t += d
html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="assets/lib/gsap.min.js"></script>
<script src="assets/js/kit.js"></script>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1920px;height:1080px;overflow:hidden;background:#E8EDF4}}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{t:g}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}
</div>
<script>window.__timelines["main"] = gsap.timeline({{ paused: true }});</script>
</body>
</html>
'''
(pathlib.Path(__file__).parent / "index.html").write_text(html)
print("total", t)
