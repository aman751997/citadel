import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { parenFrames, minStackFrames, rpnFrames, tempsFrames, circularFrames, fleetFrames, histFrames, nextGreaterMapFrames, spanFrames, asteroidFrames, removeKFrames, rainFrames, subMinsFrames } from '../src/data/stacks/frames.ts';
import type { MinOp } from '../src/data/stacks/frames.ts';

let seed = 12345;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const list = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + rnd(hi - lo + 1));
const answer = (f: Frame[]) => lastVar(f, 'answer')!;

function wellFormed(f: Frame[]) {
  assert.ok(f.length >= 2);
  for (const fr of f) {
    assert.ok(fr.caption.length > 10 && fr.views.length > 0);
    if (fr.predict) {
      assert.ok(fr.predict.options.length >= 2);
      assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.predict.question);
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
    }
  }
}
const run = (n: number, body: () => void) => { for (let t = 0; t < n; t++) body(); };

test('brackets', () => {
  const valid = (s: string) => { let t = s, p = ''; while (t !== p) { p = t; t = t.replace('()', '').replace('[]', '').replace('{}', ''); } return t === ''; };
  run(300, () => {
    const s = Array.from({ length: rnd(9) }, () => '()[]{}'[rnd(6)]).join('');
    const f = parenFrames(s); wellFormed(f);
    assert.equal(answer(f), String(valid(s)), s);
  });
  assert.equal(answer(parenFrames('([{}])')), 'true');
});

test('min stack outputs', () => {
  run(200, () => {
    const ops: MinOp[] = [], ref: number[] = [], out: number[] = [];
    for (let k = 0; k < 8; k++) {
      const c = ref.length === 0 ? 0 : rnd(4);
      if (c === 0) { const v = rnd(7) - 3; ops.push(['push', v]); ref.push(v); }
      else if (c === 1) { ops.push(['pop']); ref.pop(); }
      else if (c === 2) { ops.push(['top']); out.push(ref[ref.length - 1]); }
      else { ops.push(['getMin']); out.push(Math.min(...ref)); }
    }
    const f = minStackFrames(ops); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(out));
  });
});

test('reverse polish notation', () => {
  const build = (d: number): string[] => {
    if (d === 0 || rnd(3) === 0) return [String(rnd(9) + 1)];
    const l = build(d - 1), r = build(d - 1);
    return [...l, ...r, '+-*/'[rnd(4)]];
  };
  const evalTree = (t: string[]): number => { // recursive descent from the right: no stack
    let pos = t.length - 1;
    const go = (): number => {
      const x = t[pos--];
      if ('+-*/'.includes(x) && x.length === 1) { const b = go(), a = go(); return x === '+' ? a + b : x === '-' ? a - b : x === '*' ? a * b : Math.trunc(a / b); }
      return Number(x);
    };
    return go();
  };
  run(200, () => {
    const t = build(3);
    const hasZeroDiv = (() => { let pos = t.length - 1; let bad = false; const go = (): number => { const x = t[pos--]; if (x.length === 1 && '+-*/'.includes(x)) { const b = go(), a = go(); if (x === '/' && b === 0) { bad = true; return 1; } return x === '+' ? a + b : x === '-' ? a - b : x === '*' ? a * b : Math.trunc(a / b); } return Number(x); }; go(); return bad; })();
    if (hasZeroDiv) return;
    const f = rpnFrames(t); wellFormed(f);
    assert.equal(answer(f), String(evalTree(t)), t.join(' '));
  });
  assert.equal(answer(rpnFrames(['5', '3', '-'])), '2');
});

test('daily temperatures', () => {
  run(300, () => {
    const a = list(rnd(9) + 1, 60, 66);
    const brute = a.map((v, i) => { for (let j = i + 1; j < a.length; j++) if (a[j] > v) return j - i; return 0; });
    const f = tempsFrames(a); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(brute), a.join());
  });
});

test('next greater element II', () => {
  run(300, () => {
    const a = list(rnd(6) + 1, 1, 5);
    const brute = a.map((v, i) => { for (let k = 1; k < a.length; k++) { const w = a[(i + k) % a.length]; if (w > v) return w; } return -1; });
    const f = circularFrames(a); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(brute), a.join());
  });
  assert.equal(answer(circularFrames([1, 2, 1])), '[2,-1,2]');
});

test('car fleet', () => {
  run(300, () => {
    const n = rnd(6) + 1, target = 12 + rnd(10);
    const position = [...new Set(list(n, 0, target - 1))], speed = position.map(() => rnd(5) + 1);
    // a car leads a fleet iff it is strictly slower (later arrival) than every car ahead of it; compare fractions by cross-multiplying
    const brute = position.filter((p, i) => position.every((q, j) => q <= p || (target - p) * speed[j] > (target - q) * speed[i])).length;
    const f = fleetFrames(target, position, speed); wellFormed(f);
    assert.equal(answer(f), String(brute), `${target} ${position} ${speed}`);
  });
  assert.equal(answer(fleetFrames(12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3])), '3');
  assert.equal(answer(fleetFrames(10, [0, 5], [2, 1])), '1');
});

test('largest rectangle in histogram', () => {
  run(300, () => {
    const h = list(rnd(8) + 1, 0, 6);
    let best = 0;
    for (let i = 0; i < h.length; i++) { let low = Infinity; for (let j = i; j < h.length; j++) { low = Math.min(low, h[j]); best = Math.max(best, low * (j - i + 1)); } }
    const f = histFrames(h); wellFormed(f);
    assert.equal(answer(f), String(best), h.join());
  });
  assert.equal(answer(histFrames([2, 1, 5, 6, 2, 3])), '10');
});

test('next greater element I', () => {
  run(200, () => {
    const nums2 = [...new Set(list(rnd(7) + 1, 0, 9))];
    const nums1 = nums2.filter(() => rnd(2) === 0);
    const brute = nums1.map(x => { for (let j = nums2.indexOf(x) + 1; j < nums2.length; j++) if (nums2[j] > x) return nums2[j]; return -1; });
    const f = nextGreaterMapFrames(nums1, nums2); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(brute));
  });
});

test('stock span', () => {
  run(300, () => {
    const p = list(rnd(9) + 1, 1, 6);
    const brute = p.map((v, i) => { let s = 0; for (let j = i; j >= 0 && p[j] <= v; j--) s++; return s; });
    const f = spanFrames(p); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(brute), p.join());
  });
});

test('asteroid collision', () => {
  run(300, () => {
    const rocks = list(rnd(8) + 1, 1, 6).map(v => (rnd(2) ? v : -v));
    const a = [...rocks];
    for (;;) { // resolve the leftmost collision until none is left
      const i = a.findIndex((v, k) => k + 1 < a.length && v > 0 && a[k + 1] < 0);
      if (i < 0) break;
      const l = a[i], r = -a[i + 1];
      if (l === r) a.splice(i, 2); else if (l > r) a.splice(i + 1, 1); else a.splice(i, 1);
    }
    const f = asteroidFrames(rocks); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(a), rocks.join());
  });
});

test('remove k digits', () => {
  run(300, () => {
    const num = list(rnd(6) + 1, 0, 9).join(''), k = rnd(num.length + 1);
    let best: string | null = null;
    for (let mask = 0; mask < 1 << num.length; mask++) {
      let bits = 0, s = '';
      for (let b = 0; b < num.length; b++) { if (mask >> b & 1) bits++; else s += num[b]; }
      if (bits !== k) continue;
      s = s.replace(/^0+/, '') || '0';
      if (best === null || s.length < best.length || (s.length === best.length && s < best)) best = s;
    }
    const f = removeKFrames(num, k); wellFormed(f);
    assert.equal(answer(f), best, `${num} ${k}`);
  });
});

test('trapping rain water (stack)', () => {
  run(300, () => {
    const h = list(rnd(9) + 1, 0, 5);
    const brute = h.reduce((s, v, i) => s + Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - v, 0);
    const f = rainFrames(h); wellFormed(f);
    assert.equal(answer(f), String(brute), h.join());
  });
  assert.equal(answer(rainFrames([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])), '6');
});

test('sum of subarray minimums', () => {
  run(300, () => {
    const a = list(rnd(8) + 1, 1, 5);
    let sum = 0;
    for (let i = 0; i < a.length; i++) { let m = Infinity; for (let j = i; j < a.length; j++) { m = Math.min(m, a[j]); sum += m; } }
    const f = subMinsFrames(a); wellFormed(f);
    assert.equal(answer(f), String(sum), a.join());
  });
  assert.equal(answer(subMinsFrames([3, 1, 2, 4])), '17');
});
