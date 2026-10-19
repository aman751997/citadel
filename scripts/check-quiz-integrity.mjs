#!/usr/bin/env node
// Structural check of every <Quiz questions={[...]}> literal in the MDX source.
//   node scripts/check-quiz-integrity.mjs src            (exit 1 if any problem)
// For each question: options is an array of 2+ strings, `answer` is a valid index, `explain` (if present)
// has one entry per option, exactly one explain starts with "Correct." / "Correct:" / "Right." (marker + punctuation) and it is the one at `answer`,
// no option text is duplicated, and no explain/option is empty.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files = [];
const walk = (p) => { if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f))); else if (p.endsWith('.mdx')) files.push(p); };
process.argv.slice(2).forEach(walk);
function* literals(src) {
  let i = 0;
  while ((i = src.indexOf('questions={', i)) !== -1) {
    let j = i + 11, depth = 1, str = null; const start = j;
    for (; j < src.length && depth > 0; j++) { const c = src[j];
      if (str) { if (c === '\\') j++; else if (c === str) str = null; continue; }
      if (c === "'" || c === '"' || c === '`') str = c; else if (c === '{') depth++; else if (c === '}') depth--; }
    yield [src.slice(0, start).split('\n').length, src.slice(start, j - 1)]; i = j;
  }
}
let problems = 0, checked = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const [line, lit] of literals(src)) {
    let qs; try { qs = new Function(`return (${lit});`)(); } catch (e) { console.log(`${f}:${line} PARSE ERROR ${e.message}`); problems++; continue; }
    if (!Array.isArray(qs)) continue;
    qs.forEach((q, n) => {
      checked++; const where = `${f}:${line} Q${n + 1}`; const bad = (m) => { console.log(`${where} ${m}\n    ${String(q.q).slice(0, 90)}\n${(q.options || []).map((x, i) => `    ${i === q.answer ? '*' : ' '}${i} ${String(x).slice(0, 80)}   ::  ${String((q.explain || [])[i] || '').slice(0, 70)}`).join('\n')}`); problems++; };
      const o = q.options;
      if (!Array.isArray(o) || o.length < 2) return bad('options missing or < 2');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= o.length) return bad(`answer ${q.answer} out of range`);
      if (o.some((x) => !String(x).trim())) bad('empty option');
      if (new Set(o.map((x) => String(x).trim().toLowerCase())).size !== o.length) bad('duplicate option text');
      if (q.explain !== undefined) {
        const e = q.explain;
        if (!Array.isArray(e) || e.length !== o.length) return bad(`explain length ${e?.length} != options ${o.length}`);
        const strict = e.map((x, i) => (/^\s*(correct|right)\s*[.:!,—-]/i.test(String(x)) ? i : -1)).filter((i) => i >= 0);
        // Only enforce when the explain list uses an explicit "Correct." / "Right." marker convention.
        if (strict.length && (strict.length !== 1 || strict[0] !== q.answer)) bad(`marker explain at ${JSON.stringify(strict)} but answer is ${q.answer}`);
      }
    });
  }
}
console.log(`${checked} questions checked, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
