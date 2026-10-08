#!/usr/bin/env node
// Renders every lesson page in headless Chrome and reports Mermaid diagrams that failed to render.
// Needs a running preview of the built site:  npx astro preview --port 4321   (then)
//   node scripts/check-mermaid.mjs http://localhost:4321/citadel [distDir]
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const origin = process.argv[2] || 'http://localhost:4321/citadel';
const dist = process.argv[3] || 'dist';
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const pages = [];
const walk = dir => readdirSync(dir).forEach(name => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) walk(path);
  else if (name === 'index.html' && readFileSync(path, 'utf8').includes('class="mermaid"')) pages.push(path);
});
walk(dist);

let failed = 0, diagrams = 0;
const check = async page => {
  const url = `${origin}/${relative(dist, page).replace(/index\.html$/, '')}`;
  const expected = (readFileSync(page, 'utf8').match(/class="mermaid"/g) || []).length;
  const { stdout } = await run(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', url], { maxBuffer: 64 << 20 });
  const rendered = (stdout.match(/id="citadel-mermaid-\d+"/g) || []).length;
  const errors = [...stdout.matchAll(/Diagram failed to render: ([^<]*)/g)].map(m => m[1].slice(0, 160));
  diagrams += expected;
  if (errors.length || rendered < expected) {
    failed++;
    console.log(`✖ ${url}: ${rendered}/${expected} rendered${errors.length ? `\n    ${errors.join('\n    ')}` : ''}`);
  }
};
for (let i = 0; i < pages.length; i += 4) await Promise.all(pages.slice(i, i + 4).map(check));
console.log(`${pages.length} pages, ${diagrams} diagrams, ${failed} pages with failures`);
process.exit(failed ? 1 : 0);
