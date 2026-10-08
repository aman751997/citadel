#!/usr/bin/env node
// Visual-defect audit in real headless Chrome (DevTools protocol, no dependencies).
//   npx astro preview --port 4330   (then)
//   node scripts/check-layout.mjs http://localhost:4330/citadel [distDir] [--width=1100,400]
// Per page and width it reports: horizontal page overflow, text clipped or overflowing its box
// (buttons, cells, chips, figure labels), sibling text boxes overlapping each other, broken images,
// failed Mermaid diagrams, and console/runtime errors.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const origin = args[0] || 'http://localhost:4321/citadel';
const dist = args[1] || 'dist';
const widths = (process.argv.find(a => a.startsWith('--width=')) || '--width=1100,400').slice(8).split(',').map(Number);
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const pages = [];
const walk = dir => readdirSync(dir).forEach(name => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) walk(path); else if (name === 'index.html') pages.push('/' + relative(dist, path).replace(/index\.html$/, ''));
});
walk(dist);
const targets = pages.filter(p => /lessons\/|framework|bank|\/dsa\/$|\/sd\/$|\/lld\/$/.test(p) && (!only || p.includes(only)));

const port = 9333;
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => proc.kill());
let version;
for (let i = 0; i < 50 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
if (!version) throw new Error('Chrome did not start');

const probe = `(() => {
  const issues = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 2) issues.push('page overflows horizontally by ' + (doc.scrollWidth - doc.clientWidth) + 'px');
  const label = el => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ':"' + (el.textContent || '').trim().slice(0, 40) + '"';
  const scrollable = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  // text that spills outside its own box
  document.querySelectorAll('button, .cell strong, .trace-cell strong, .chip, .badge, .session-button, .family a, summary').forEach(el => {
    if (scrollable(el)) return;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).display !== 'inline') issues.push('text overflows its box: ' + label(el));
  });
  // overlapping sibling text boxes in boards and rows
  document.querySelectorAll('.trace-cells, .cells, .cast dl, .routes, .families').forEach(row => {
    const kids = [...row.children].filter(k => k.getBoundingClientRect().width > 0);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 3 && oy > 3) { issues.push('overlap: ' + label(kids[i]) + ' / ' + label(kids[j])); return; }
    }
  });
  // svg text running outside its svg
  document.querySelectorAll('svg').forEach(svg => {
    const box = svg.getBoundingClientRect(); if (!box.width) return;
    let bad = 0;
    svg.querySelectorAll('text').forEach(t => { const r = t.getBoundingClientRect(); if (r.width && (r.left < box.left - 4 || r.right > box.right + 4)) bad++; });
    if (bad) issues.push('svg text outside its frame (' + bad + ' labels): ' + (svg.getAttribute('aria-label') || svg.parentElement.className || 'svg').toString().slice(0, 50));
  });
  document.querySelectorAll('img').forEach(i => { if (!i.complete || i.naturalWidth === 0) issues.push('broken image ' + i.src); });
  document.querySelectorAll('.mermaid-error, pre.mermaid:not([data-rendered])').forEach(m => issues.push('mermaid not rendered'));
  document.querySelectorAll('pre.mermaid.mermaid-error').forEach(m => issues.push('mermaid error: ' + m.textContent.slice(0, 80)));
  if (/undefined|NaN|\\[object Object\\]/.test(document.body.innerText)) issues.push('page text contains undefined/NaN/[object Object]');
  return issues;
})()`;

async function audit(path, width) {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const waits = new Map(); const errors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || '').slice(0, 100));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  await send('Page.navigate', { url: origin + path });
  await sleep(1500);
  for (let i = 0; i < 20; i++) { // wait for Mermaid to finish rendering
    const r = await send('Runtime.evaluate', { expression: `document.querySelectorAll('pre.mermaid:not([data-rendered])').length === 0 && document.readyState === 'complete'`, returnByValue: true });
    if (r.result?.result?.value) break; await sleep(500);
  }
  await sleep(400);
  const r = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${webSocketDebuggerUrl.split('/').pop()}`).catch(() => {});
  return [...(r.result?.result?.value || ['probe failed']), ...errors.map(e => 'runtime error: ' + e)];
}

let bad = 0;
for (const path of targets) for (const width of widths) {
  const issues = [...new Set(await audit(path, width))];
  if (issues.length) { bad++; console.log(`✖ ${path} @${width}px\n   ${issues.slice(0, 8).join('\n   ')}${issues.length > 8 ? `\n   … +${issues.length - 8} more` : ''}`); }
}
console.log(`${targets.length} pages × ${widths.length} widths audited, ${bad} with issues`);
proc.kill();
process.exit(bad ? 1 : 0);
