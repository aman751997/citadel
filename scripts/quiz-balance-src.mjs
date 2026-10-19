#!/usr/bin/env node
// Measure answer-length bias straight from the MDX source (no build needed).
//   node scripts/quiz-balance-src.mjs src/lessons/caching.mdx [more files...]   (or a directory)
// Prints, per file and in total: number of questions, the accuracy of the guess 'always pick the longest option'
// (ties broken at random) (a fair 4-option quiz is ~31%), and the mean length ratio correct / other options.
// Targets after a rebalance: longest between ~20% and ~40%, shortest between ~15% and ~40%, ratio 0.9-1.3.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f)));
  else if (p.endsWith('.mdx')) files.push(p);
};
process.argv.slice(2).forEach(walk);

function* quizLiterals(src) {
  let i = 0;
  while ((i = src.indexOf('questions={', i)) !== -1) {
    let j = i + 'questions={'.length, depth = 1, str = null;
    const start = j;
    for (; j < src.length && depth > 0; j++) {
      const c = src[j];
      if (str) { if (c === '\\') j++; else if (c === str) str = null; continue; }
      if (c === "'" || c === '"' || c === '`') str = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    yield src.slice(start, j - 1);
    i = j;
  }
}

let n = 0, longest = 0, shortest = 0, ratioSum = 0, expected = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let fn = 0, fl = 0, fs = 0, fr = 0;
  for (const lit of quizLiterals(src)) {
    let qs;
    try { qs = new Function(`return (${lit});`)(); } catch { continue; }
    if (!Array.isArray(qs)) continue;
    for (const q of qs) {
      const o = q.options; if (!Array.isArray(o) || o.length < 3 || typeof q.answer !== 'number') continue;
      const lens = o.map((x) => String(x).trim().length);
      const a = lens[q.answer], max = Math.max(...lens), min = Math.min(...lens);
      const nMax = lens.filter((x) => x === max).length, nMin = lens.filter((x) => x === min).length;
      const isLongest = a === max ? 1 / nMax : 0; // chance of being right by always picking the longest (ties broken at random)
      const isShortest = a === min ? 1 / nMin : 0;
      const others = (lens.reduce((s, x) => s + x, 0) - a) / (lens.length - 1);
      fn++; fl += isLongest; fs += isShortest; fr += a / Math.max(others, 1); expected += 1 / lens.length;
    }
  }
  if (fn) console.log(`${f.padEnd(62)} n=${String(fn).padStart(3)}  longest ${String(Math.round(100 * fl / fn)).padStart(3)}%  shortest ${String(Math.round(100 * fs / fn)).padStart(3)}%  ratio ${(fr / fn).toFixed(2)}`);
  n += fn; longest += fl; shortest += fs; ratioSum += fr;
}
if (n) console.log(`TOTAL n=${n}  longest ${Math.round(100 * longest / n)}% / shortest ${Math.round(100 * shortest / n)}% (fair ≈ ${Math.round(100 * expected / n)}% each)  mean ratio ${(ratioSum / n).toFixed(2)}`);
