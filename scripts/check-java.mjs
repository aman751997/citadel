#!/usr/bin/env node
// Compiles every ```java block in the lessons and runs each lesson's Java checker, so the code a
// lesson shows is exactly the code that was tested.
//
//   node scripts/check-java.mjs                 all lessons in all wings
//   node scripts/check-java.mjs sliding-window  one lesson (matches by slug in any wing)
//
// Fence meta controls extraction:
//   ```java                     compiled on its own, wrapped in class B<n>
//   ```java id=minWindow        wrapped in class B_minWindow (checkers call new B_minWindow().minWindow(...))
//   ```java id=lru group=lru    blocks sharing a group are concatenated into one wrapper, B_<group>
//   ```java fragment            illustration only (template, partial code); not compiled
// Imports inside a block are hoisted. ListNode and TreeNode (LeetCode shapes) are provided.
// Checker: tests/java/<slug>/*.java with a class `Check` whose main throws on any mismatch.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const wings = { dsa: 'src/dsa-lessons', sd: 'src/lessons', lld: 'src/lld-lessons' };
const only = process.argv.slice(2);
const prelude = `import java.util.*;
import java.util.function.*;
import java.util.stream.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.locks.*;
class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }
class TreeNode { int val; TreeNode left, right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }
`;

function extract(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(\s*)```java\b(.*)$/);
    if (!open) continue;
    const indent = open[1].length, meta = open[2];
    const start = i + 1;
    let end = start;
    while (end < lines.length && !/^\s*```\s*$/.test(lines[end])) end++;
    const code = lines.slice(start, end).map(line => line.slice(Math.min(indent, line.length - line.trimStart().length)));
    i = end;
    if (/\bfragment\b/.test(meta)) continue;
    blocks.push({ line: start + 1, code, id: meta.match(/\bid=([A-Za-z0-9_]+)/)?.[1], group: meta.match(/\bgroup=([A-Za-z0-9_]+)/)?.[1] });
  }
  return blocks;
}

function build(wing, file) {
  const slug = basename(file, '.mdx');
  const blocks = extract(file);
  const checkerDir = join(root, 'tests/java', slug);
  if (!blocks.length && !existsSync(checkerDir)) return { slug, wing, blocks: 0, status: 'no java' };
  const out = join(root, 'node_modules/.cache/check-java', `${wing}-${slug}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'classes'), { recursive: true });
  const imports = new Set();
  const wrappers = new Map(); // name -> { parts, lines }
  blocks.forEach((block, n) => {
    const name = block.group ? `B_${block.group}` : block.id ? `B_${block.id}` : `B${n + 1}`;
    const body = block.code.filter(line => {
      if (/^\s*import\s+[\w.*]+\s*;\s*$/.test(line)) { imports.add(line.trim()); return false; }
      return !/^\s*package\s/.test(line);
    });
    const entry = wrappers.get(name) || { parts: [], lines: [] };
    entry.parts.push(`// ${wing}/${slug}.mdx line ${block.line}`, ...body);
    entry.lines.push(block.line);
    wrappers.set(name, entry);
  });
  const source = [...imports, prelude, ...[...wrappers].map(([name, w]) => `@SuppressWarnings("all")\nclass ${name} {\n${w.parts.join('\n')}\n}`)].join('\n');
  writeFileSync(join(out, 'Blocks.java'), source);
  const sources = [join(out, 'Blocks.java')];
  if (existsSync(checkerDir)) for (const f of readdirSync(checkerDir)) if (f.endsWith('.java')) sources.push(join(checkerDir, f));
  try {
    execFileSync('javac', ['-nowarn', '-Xlint:none', '-d', join(out, 'classes'), ...sources], { stdio: 'pipe' });
  } catch (error) {
    return { slug, wing, blocks: blocks.length, status: 'COMPILE FAIL', detail: String(error.stderr || error.message).split('\n').slice(0, 40).join('\n') + `\n(generated source: ${join(out, 'Blocks.java')})` };
  }
  if (!existsSync(checkerDir)) return { slug, wing, blocks: blocks.length, status: 'compiled (no checker)' };
  try {
    const stdout = execFileSync('java', ['-ea', '-cp', join(out, 'classes'), 'Check'], { stdio: 'pipe', timeout: 120000 }).toString().trim();
    return { slug, wing, blocks: blocks.length, status: 'PASS', detail: stdout.split('\n').slice(-3).join(' | ') };
  } catch (error) {
    return { slug, wing, blocks: blocks.length, status: 'CHECK FAIL', detail: String(error.stdout || '') + String(error.stderr || error.message) };
  }
}

const results = [];
for (const [wing, dir] of Object.entries(wings)) {
  for (const f of readdirSync(join(root, dir)).filter(f => f.endsWith('.mdx')).sort()) {
    if (only.length && !only.includes(basename(f, '.mdx'))) continue;
    results.push(build(wing, join(root, dir, f)));
  }
}
let failed = 0;
for (const r of results) {
  const bad = r.status.includes('FAIL');
  if (bad) failed++;
  console.log(`${bad ? '✖' : '✔'} ${r.wing}/${r.slug}: ${r.status} (${r.blocks} blocks)${r.detail && (bad || r.status === 'PASS') ? `\n  ${r.detail.replace(/\n/g, '\n  ')}` : ''}`);
}
if (only.length && !results.length) { console.error(`No lesson matches: ${only.join(', ')}`); process.exit(1); }
process.exit(failed ? 1 : 0);
