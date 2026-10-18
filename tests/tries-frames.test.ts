import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { buildFrames, searchFrames, wildcardFrames, wordSearchFrames, countEraseFrames, replaceFrames, longestWordFrames, suggestFrames, maxXorFrames, typeaheadFrames } from '../src/data/tries/frames.ts';

let seed = 4242;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const word = (min: number, max: number, letters = 3) => Array.from({ length: min + rnd(max - min + 1) }, () => 'abcdefg'[rnd(letters)]).join('');
const words = (n: number, min = 1, max = 4, letters = 3) => Array.from({ length: 1 + rnd(n) }, () => word(min, max, letters));
const answer = (f: Frame[]) => lastVar(f, 'answer')!;
const run = (n: number, body: () => void) => { for (let t = 0; t < n; t++) body(); };

function wellFormed(f: Frame[]) {
  assert.ok(f.length >= 2);
  for (const fr of f) {
    assert.ok(fr.caption.length > 10 && fr.views.length > 0);
    for (const v of fr.views) if (v.kind === 'graph') {
      const ids = new Set(v.nodes.map(n => n.id));
      assert.equal(ids.size, v.nodes.length, 'node ids are unique');
      for (const e of v.edges) assert.ok(ids.has(e.from) && ids.has(e.to), 'edge ends exist');
    }
    if (fr.predict) {
      assert.ok(fr.predict.options.length >= 2);
      assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.predict.question);
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
    }
  }
}

test('insert: node count equals the number of distinct non-empty prefixes', () => {
  run(200, () => {
    const ws = words(6);
    const prefixes = new Set<string>();
    for (const w of ws) for (let i = 1; i <= w.length; i++) prefixes.add(w.slice(0, i));
    const f = buildFrames(ws); wellFormed(f);
    assert.equal(answer(f), String(prefixes.size), ws.join());
  });
  assert.equal(answer(buildFrames(['apple', 'app', 'apt', 'bat'])), '9');
  assert.equal(answer(buildFrames(['a'])), '1');
  assert.equal(answer(buildFrames(['app', 'app'])), '3');   // a duplicate grows nothing
});

test('search and startsWith match a plain scan of the word list', () => {
  run(400, () => {
    const ws = words(6), qy = word(1, 5);
    const a = searchFrames(ws, qy, 'search'); wellFormed(a);
    assert.equal(answer(a), String(ws.includes(qy)), `${ws.join()} / ${qy}`);
    const b = searchFrames(ws, qy, 'startsWith'); wellFormed(b);
    assert.equal(answer(b), String(ws.some(w => w.startsWith(qy))), `${ws.join()} / ${qy}`);
  });
  assert.equal(answer(searchFrames(['apple'], 'app', 'search')), 'false');
  assert.equal(answer(searchFrames(['apple'], 'app', 'startsWith')), 'true');
  assert.equal(answer(searchFrames(['apple'], 'apple', 'search')), 'true');
  assert.equal(answer(searchFrames(['apple'], 'apples', 'startsWith')), 'false');
});

test('wildcard search matches every word against the pattern', () => {
  const fits = (w: string, p: string) => w.length === p.length && [...p].every((c, i) => c === '.' || c === w[i]);
  run(500, () => {
    const ws = words(6, 1, 4);
    const pat = Array.from({ length: 1 + rnd(4) }, () => (rnd(3) === 0 ? '.' : 'abc'[rnd(3)])).join('');
    const f = wildcardFrames(ws, pat); wellFormed(f);
    assert.equal(answer(f), String(ws.some(w => fits(w, pat))), `${ws.join()} / ${pat}`);
  });
  assert.equal(answer(wildcardFrames(['ax', 'by'], '.y')), 'true');   // the first child fails, the second succeeds
  assert.equal(answer(wildcardFrames(['bad', 'dad', 'mad'], '..')), 'false');
  assert.equal(answer(wildcardFrames(['a'], '.')), 'true');
  assert.equal(answer(wildcardFrames(['a'], '..')), 'false');
});

function onBoard(board: string[][], w: string) {
  const R = board.length, C = board[0].length, seen = new Set<string>();
  const go = (r: number, c: number, i: number): boolean => {
    if (r < 0 || c < 0 || r >= R || c >= C || seen.has(`${r},${c}`) || board[r][c] !== w[i]) return false;
    if (i === w.length - 1) return true;
    seen.add(`${r},${c}`);
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => go(r + a, c + b, i + 1));
    seen.delete(`${r},${c}`);
    return ok;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}

test('Word Search II finds exactly the words a per-word search finds, each once', () => {
  run(250, () => {
    const R = 1 + rnd(3), C = 1 + rnd(3);
    const board = Array.from({ length: R }, () => Array.from({ length: C }, () => 'abc'[rnd(3)]));
    const ws = [...new Set(words(5, 1, 4))];
    const f = wordSearchFrames(board, ws); wellFormed(f);
    assert.deepEqual(JSON.parse(answer(f)), ws.filter(w => onBoard(board, w)).sort(), `${JSON.stringify(board)} ${ws.join()}`);
  });
  assert.deepEqual(JSON.parse(answer(wordSearchFrames([['a', 'a']], ['a']))), ['a']);   // reported once, not once per path
  assert.deepEqual(JSON.parse(answer(wordSearchFrames([['o', 'a'], ['e', 't'], ['i', 'h']], ['oath', 'oaf', 'pea']))), ['oath']);
  assert.deepEqual(JSON.parse(answer(wordSearchFrames([['a', 'b']], ['aba']))), []);    // a cell cannot be reused
});

test('count and erase agree with a multiset', () => {
  run(300, () => {
    const pool = words(4, 1, 3), ms: string[] = [], ops: ['insert' | 'erase', string][] = [];
    for (let k = 0; k < 8; k++) {
      if (ms.length && rnd(3) === 0) { const w = ms[rnd(ms.length)]; ms.splice(ms.indexOf(w), 1); ops.push(['erase', w]); }
      else { const w = pool[rnd(pool.length)]; ms.push(w); ops.push(['insert', w]); }
    }
    const eq = pool[rnd(pool.length)], pre = word(1, 2);
    const f = countEraseFrames(ops, eq, pre); wellFormed(f);
    assert.equal(answer(f), JSON.stringify([ms.filter(w => w === eq).length, ms.filter(w => w.startsWith(pre)).length]), JSON.stringify(ops));
  });
  assert.equal(answer(countEraseFrames([['insert', 'apple'], ['erase', 'apple']], 'apple', 'app')), '[0,0]');   // stale pass counts would say 1
  assert.equal(answer(countEraseFrames([['insert', 'apt'], ['erase', 'apt'], ['insert', 'apt']], 'apt', 'ap')), '[1,1]');
});

test('replace words picks the shortest root that is a prefix', () => {
  run(300, () => {
    const roots = [...new Set(words(4, 1, 3))];
    const sentence = words(4, 1, 5).join(' ');
    const expected = sentence.split(' ').map(w => roots.filter(r => w.startsWith(r)).sort((a, b) => a.length - b.length)[0] ?? w).join(' ');
    const f = replaceFrames(roots, sentence); wellFormed(f);
    assert.equal(answer(f), expected, `${roots.join()} / ${sentence}`);
  });
  assert.equal(answer(replaceFrames(['cat', 'bat', 'rat'], 'the cattle was rattled by the battery')), 'the cat was rat by the bat');
  assert.equal(answer(replaceFrames(['a', 'aa', 'aaa'], 'aaaa')), 'a');   // the longest root would be the classic bug
});

test('longest buildable word matches a set check', () => {
  run(400, () => {
    const ws = [...new Set(words(8, 1, 4, 2))];
    const set = new Set(ws);
    const ok = ws.filter(w => [...w].every((_, i) => set.has(w.slice(0, i + 1))));
    ok.sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
    const f = longestWordFrames(ws); wellFormed(f);
    assert.equal(answer(f), ok[0] ?? '', ws.join());
  });
  assert.equal(answer(longestWordFrames(['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple'])), 'apple');
  assert.equal(answer(longestWordFrames(['banana'])), '');
});

test('suggestions equal sort + filter, three per letter', () => {
  run(300, () => {
    const ps = words(7, 1, 5, 3), w = word(1, 5);
    const expected = [...w].map((_, i) => [...ps].sort().filter(p => p.startsWith(w.slice(0, i + 1))).slice(0, 3));
    const f = suggestFrames(ps, w); wellFormed(f);
    assert.deepEqual(JSON.parse(answer(f)), expected, `${ps.join()} / ${w}`);
  });
  assert.deepEqual(JSON.parse(answer(suggestFrames(['mobile', 'mouse', 'moneypot', 'monitor', 'mousepad'], 'mou'))), [['mobile', 'moneypot', 'monitor'], ['mobile', 'moneypot', 'monitor'], ['mouse', 'mousepad']]);
});

test('maximum XOR matches the O(n^2) pair loop', () => {
  run(400, () => {
    const nums = Array.from({ length: 1 + rnd(7) }, () => rnd(40));
    let best = 0;
    for (const a of nums) for (const b of nums) best = Math.max(best, a ^ b);
    const f = maxXorFrames(nums); wellFormed(f);
    assert.equal(answer(f), String(best), nums.join());
  });
  assert.equal(answer(maxXorFrames([3, 10, 5, 25])), '28');
  assert.equal(answer(maxXorFrames([7])), '0');
  assert.equal(answer(maxXorFrames([0, 0])), '0');
});

test('typeahead top-k equals sort by count then alphabet', () => {
  run(300, () => {
    const pool = words(4, 1, 4), qs = Array.from({ length: 1 + rnd(8) }, () => pool[rnd(pool.length)]);
    const k = 1 + rnd(3), pre = word(0, 2);
    const count = new Map<string, number>();
    for (const w of qs) count.set(w, (count.get(w) ?? 0) + 1);
    const expected = [...count.keys()].filter(w => w.startsWith(pre)).sort((a, b) => count.get(b)! - count.get(a)! || (a < b ? -1 : 1)).slice(0, k);
    const f = typeaheadFrames(qs, k, pre); wellFormed(f);
    assert.deepEqual(JSON.parse(answer(f)), expected, `${qs.join()} k=${k} ${pre}`);
  });
  assert.deepEqual(JSON.parse(answer(typeaheadFrames(['car', 'cat', 'cart', 'car', 'cat', 'dog'], 2, 'ca'))), ['car', 'cat']);
  assert.deepEqual(JSON.parse(answer(typeaheadFrames(['car'], 2, 'zz'))), []);
});
