// Pre-measure every QK.box selector of each scene in a visible standalone page,
// and inject the results so the render never measures a hidden scene.
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "fs";
import path from "path";
import http from "http";

const root = path.dirname(new URL(import.meta.url).pathname);
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(p);
  const types = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".html": "text/html" };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const f of fs.readdirSync(path.join(root, "compositions")).filter((f) => f.endsWith(".html"))) {
  const file = path.join(root, "compositions", f);
  let src = fs.readFileSync(file, "utf8").replace(/<script>window\.__QKM[\s\S]*?<\/script>\n?/, "");
  const inner = src.replace(/^[\s\S]*?<template>/, "").replace(/<\/template>[\s\S]*$/, "");
  const markup = inner.replace(/<script>[\s\S]*?<\/script>/g, "");
  const scripts = [...inner.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const sels = [...new Set([...scripts.matchAll(/(?:\bB|QK\.box)\("([^"]+)"\)/g)].map((m) => m[1]))];
  if (!sels.length) { fs.writeFileSync(file, src); continue; }
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{width:1920px;height:1080px;overflow:hidden}</style></head><body>
<div id="host" data-composition-id="x" style="position:absolute;left:0;top:0;width:1920px;height:1080px">${markup}</div></body></html>`;
  fs.writeFileSync(path.join(root, ".measure.html"), html);
  await page.goto(`http://127.0.0.1:${port}/.measure.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const boxes = await page.evaluate((sels) => {
    const host = document.getElementById("host").getBoundingClientRect();
    const out = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const b = { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
      b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2;
      out[s] = b;
    }
    return out;
  }, sels);
  const inject = `<script>window.__QKM=Object.assign(window.__QKM||{},${JSON.stringify(boxes)});</script>\n`;
  src = src.replace(/(<script>\s*const tl = gsap\.timeline)/, inject + "$1");
  fs.writeFileSync(file, src);
  console.log("measured", f, Object.keys(boxes).length + "/" + sels.length);
}
fs.unlinkSync(path.join(root, ".measure.html"));
await browser.close();
server.close();
