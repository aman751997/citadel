#!/usr/bin/env node
// Checks every internal link in a built site: the target page exists and any #anchor exists on it.
//   node scripts/check-links.mjs [distDir]      (default: dist)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const dist = process.argv[2] || 'dist';
const base = '/citadel';
const pages = [];
const walk = dir => readdirSync(dir).forEach(name => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) walk(path); else if (name.endsWith('.html')) pages.push(path);
});
walk(dist);

const ids = new Map();
const idsOf = file => {
  if (!ids.has(file)) ids.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  return ids.get(file);
};
const resolve = (from, href) => {
  const [path, anchor] = href.split('#');
  let target;
  if (!path) target = from;
  else if (path.startsWith(base)) {
    const rest = path.slice(base.length).replace(/^\//, '');
    target = join(dist, rest, rest === '' || rest.endsWith('/') ? 'index.html' : '');
    if (!target.endsWith('.html')) target = existsSync(target + '.html') ? target + '.html' : join(target, 'index.html');
  } else return null; // external or relative-to-asset links are not checked
  return { target, anchor };
};

let broken = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const r = resolve(page, href.replace(/&amp;/g, '&'));
    if (!r) continue;
    if (!existsSync(r.target)) { broken++; console.log(`✖ ${relative(dist, page)} → ${href} (missing page)`); continue; }
    if (r.anchor && !idsOf(r.target).has(decodeURIComponent(r.anchor))) { broken++; console.log(`✖ ${relative(dist, page)} → ${href} (missing #${r.anchor})`); }
  }
}
console.log(`${pages.length} pages checked, ${broken} broken internal links`);
process.exit(broken ? 1 : 0);
