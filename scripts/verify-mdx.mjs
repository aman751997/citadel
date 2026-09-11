#!/usr/bin/env node
/**
 * Round-trip check for the Confluence → MDX sync.
 *
 * Reverses every transform confluence-to-mdx.mjs applies and diffs the result
 * against the raw Confluence export. A clean run proves no prose, table row,
 * code line, link or diagram was dropped or mangled in conversion.
 *
 * Usage:
 *   node scripts/verify-mdx.mjs <rawDir> <projectSlug> [--out src/mastery]
 */

import fs from 'node:fs';
import path from 'node:path';
import { readMeta, assignSlugs } from './confluence-to-mdx.mjs';

/** Confluence side: collapse inline macros and unwrap mermaid fences. */
function normalizeRaw(raw) {
  return raw
    .replace(/<custom\b[^>]*>([\s\S]*?)<\/custom>/g, '$1')
    .replace(/```mermaid\n([\s\S]*?)\n```/g, '$1')
    .trimEnd();
}

/** MDX side: drop frontmatter + imports, undo escaping, unwrap components. */
function normalizeMdx(mdx) {
  let body = mdx.replace(/^---\n[\s\S]*?\n---\n/, '');
  body = body.replace(/^\s*(?:import .*\n)+/, '');

  // <Mermaid code={`…`} /> → the diagram source it was built from
  body = body.replace(/<Mermaid code=\{`([\s\S]*?)`\} \/>/g, (_, code) =>
    code.replace(/\\\$\{/g, '${').replace(/\\`/g, '`').replace(/\\\\/g, '\\')
  );

  // <Status …>Label</Status> → Label
  body = body.replace(/<Status(?:\s[^>]*)?>([\s\S]*?)<\/Status>/g, '$1');

  return body.replace(/&#123;/g, '{').replace(/&#125;/g, '}').replace(/&lt;/g, '<').trim();
}

/** First differing line, with a little context. */
function firstDiff(a, b) {
  const A = a.split('\n');
  const B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (A[i] !== B[i]) {
      return [
        `  line ${i + 1}`,
        `    raw: ${JSON.stringify(A[i] ?? '<missing>')}`,
        `    mdx: ${JSON.stringify(B[i] ?? '<missing>')}`,
      ].join('\n');
    }
  }
  return '  (identical line-by-line; lengths differ)';
}

function main() {
  const [rawDir, project, ...rest] = process.argv.slice(2);
  if (!rawDir || !project) {
    console.error('usage: node scripts/verify-mdx.mjs <rawDir> <projectSlug> [--out src/mastery]');
    process.exit(1);
  }
  const outFlag = rest.indexOf('--out');
  const outRoot = outFlag !== -1 ? rest[outFlag + 1] : 'src/mastery';

  const pages = assignSlugs(readMeta(rawDir));
  let failures = 0;

  for (const meta of pages) {
    const raw = fs.readFileSync(path.join(rawDir, meta.file || `${meta.order}-${meta.id}.md`), 'utf8');
    const mdxPath = path.join(outRoot, project, `${meta.slug}.mdx`);
    const mdx = fs.readFileSync(mdxPath, 'utf8');

    const want = normalizeRaw(raw).trim();
    const got = normalizeMdx(mdx);

    if (want === got) {
      console.log(`  ok   ${meta.slug}.mdx`);
    } else {
      failures++;
      console.log(`  FAIL ${meta.slug}.mdx  (raw ${want.length} B vs mdx ${got.length} B)`);
      console.log(firstDiff(want, got));
    }
  }

  console.log(`\n${pages.length - failures}/${pages.length} pages round-trip clean`);
  if (failures) process.exit(1);
}

main();
