import sys
out=sys.argv[1]
scenes=[("acceso",13.8),("inicio",26.0),("busqueda",5.1),("proceso",15.7),("diagrama",9.3),("favoritos",11.2),("portal",7.8),("cierre",8.6)]
start={};t=0
for c,du in scenes: start[c]=round(t,3); t+=du
total=round(t,3)
d=1/30
# scene, local time, file, dur, vol, lane, media_start, picture-aligned(+1 frame)
S=[("acceso",2.45,"whoosh.mp3",.57,.7,3,0,0),("acceso",4.0,"typing.mp3",.85,.6,3,0,1),("acceso",5.7,"click-soft.mp3",.36,1,2,0,1),
("acceso",8.5,"click.mp3",.36,1,2,0,1),("acceso",8.55,"pop.mp3",.7,.7,4,0,1),("acceso",12.9,"click-soft.mp3",.36,1,2,0,1),
("acceso",13.2,"whoosh-short.mp3",.57,.7,3,0,0),
("inicio",12.7,"pop.mp3",.7,.8,2,0,1),("inicio",23.3,"click.mp3",.36,1,2,0,1),("inicio",23.6,"typing.mp3",.85,.6,3,0,1),
("inicio",25.3,"click-soft.mp3",.36,1,2,0,1),("busqueda",4.6,"click.mp3",.36,1,2,0,1),
("proceso",15.1,"whoosh-short.mp3",.57,.6,3,0,0),("diagrama",4.0,"whoosh.mp3",.57,.6,3,0,0),
("favoritos",1.7,"click-soft.mp3",.36,1,2,0,1),("favoritos",1.75,"pop.mp3",.7,.7,4,0,1),
("cierre",.25,"whoosh-short.mp3",.57,.6,3,0,0),("cierre",4.2-2.47,"riser.mp3",2.5,.45,3,1.0,0),("cierre",4.2,"impact-bass-1.mp3",2.1,.8,2,0,1)]
hosts="\n".join(f'      <div id="{c}" data-composition-id="{c}" data-composition-src="compositions/{c}.html" data-start="{start[c]}" data-duration="{du}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>' for c,du in scenes)
aud=[];n={}
for c,lt,f,du,v,l,m,al in S:
  k=f.split('.')[0];n[k]=n.get(k,0)+1
  st=round(start[c]+lt+(d if al else 0),3)
  ms=f' data-media-start="{m}"' if m else ''
  aud.append(f'      <audio id="sfx-{k}-{n[k]}" class="clip" src="assets/sfx/{f}" data-start="{st}" data-duration="{du}" data-volume="{v}" data-track-index="{l}"{ms}></audio>')
html=f'''<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: #e9ecf1; --ink: #1e2833; --accent: #ce003a; --font-display: "Outfit", sans-serif; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ width: 100%; height: 100%; font-family: var(--font-display); background: var(--ground); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{hosts}
{chr(10).join(aud)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
'''
open(out,'w').write(html);print(start,total)
