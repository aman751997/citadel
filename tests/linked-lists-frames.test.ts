import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { middleFrames, cycleFrames, nthFrames, duplicateFrames, reverseFrames, reverseBugFrames, reverseBetweenFrames, kGroupFrames, mergeListsFrames, reorderFrames, copyRandomFrames, lruFrames, cycleEntranceFrames, palindromeFrames, intersectionFrames, addTwoFrames, rotateFrames, sortListFrames } from '../src/data/linked-lists/frames.ts';
import type { LruOp } from '../src/data/linked-lists/frames.ts';

let seed = 4242;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const list = (len: number, hi = 9) => Array.from({ length: len }, () => rnd(hi + 1));
const answer = (f: Frame[]) => lastVar(f, 'answer')!;
const text = (a: number[]) => a.join(' → ') || 'empty';
const run = (n: number, body: () => void) => { for (let t = 0; t < n; t++) body(); };

function wellFormed(f: Frame[]) {
  assert.ok(!/undefined|NaN|\[object/.test(JSON.stringify(f)), "frames contain undefined");
  assert.ok(f.length >= 1);
  for (const fr of f) {
    assert.ok(fr.caption.length > 10 && fr.views.length > 0);
    if (fr.predict) {
      assert.ok(fr.predict.options.length >= 2, fr.predict.question);
      assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.predict.question);
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
    }
  }
}
const check = (f: Frame[], expected: string, label: string) => { wellFormed(f); assert.equal(answer(f), expected, label); };

test('middle node (second middle on even length)', () => {
  run(200, () => { const a = list(rnd(9)); check(middleFrames(a), a.length ? String(a[Math.floor(a.length / 2)]) : 'null', String(a)); });
  assert.equal(answer(middleFrames([1, 2, 3, 4, 5])), '3');
  assert.equal(answer(middleFrames([1, 2, 3, 4, 5, 6])), '4');
});

test('cycle detection compares nodes, not values', () => {
  const brute = (n: number, loopTo: number | null) => loopTo !== null && n > 0;
  run(300, () => {
    const a = list(rnd(8), 2), loopTo = rnd(3) === 0 ? null : rnd(Math.max(1, a.length));
    check(cycleFrames(a, loopTo), String(brute(a.length, loopTo)), `${a} ${loopTo}`);
  });
  assert.equal(answer(cycleFrames([1, 2, 2, 3], null)), 'false'); // equal values, no loop
  assert.equal(answer(cycleFrames([5], 0)), 'true');               // single node pointing at itself
  assert.equal(answer(cycleFrames([], 0)), 'false');
});

test('remove nth from end', () => {
  run(250, () => {
    const a = list(1 + rnd(8)), n = 1 + rnd(a.length);
    check(nthFrames(a, n), text(a.filter((_, i) => i !== a.length - n)), `${a} ${n}`);
  });
  assert.equal(answer(nthFrames([1], 1)), 'empty');
  assert.equal(answer(nthFrames([1, 2], 2)), '2');
});

test('find the duplicate with Floyd', () => {
  run(300, () => {
    const n = 2 + rnd(8), d = 1 + rnd(n), copies = 2 + rnd(Math.min(3, n - 1));
    const others = Array.from({ length: n }, (_, i) => i + 1).filter(x => x !== d).sort(() => rnd(3) - 1).slice(0, n + 1 - copies);
    const arr = [...Array(copies).fill(d), ...others].sort(() => rnd(3) - 1);
    assert.equal(arr.length, n + 1);
    check(duplicateFrames(arr), String(d), String(arr));
  });
  assert.equal(answer(duplicateFrames([1, 3, 4, 2, 2])), '2');
  assert.equal(answer(duplicateFrames([3, 1, 3, 4, 2])), '3');
  assert.equal(answer(duplicateFrames([2, 2, 2, 2, 2])), '2');
});

test('reverse a list', () => {
  run(150, () => { const a = list(rnd(8)); check(reverseFrames(a), text([...a].reverse()), String(a)); });
  assert.equal(answer(reverseFrames([])), 'empty');
});

test('the wrong order of lines 1 and 2 loses everything past the second node', () => {
  run(100, () => { const a = list(3 + rnd(5)); check(reverseBugFrames(a), text(a.slice(2)), String(a)); });
});

test('reverse positions left..right', () => {
  run(250, () => {
    const a = list(1 + rnd(8)), left = 1 + rnd(a.length), right = left + rnd(a.length - left + 1);
    const want = [...a.slice(0, left - 1), ...a.slice(left - 1, right).reverse(), ...a.slice(right)];
    check(reverseBetweenFrames(a, left, right), text(want), `${a} ${left} ${right}`);
  });
  assert.equal(answer(reverseBetweenFrames([1, 2, 3, 4, 5], 2, 4)), '1 → 4 → 3 → 2 → 5');
  assert.equal(answer(reverseBetweenFrames([5], 1, 1)), '5');
});

test('reverse in groups of k', () => {
  const brute = (a: number[], k: number) => { const out: number[] = []; let i = 0; for (; i + k <= a.length; i += k) out.push(...a.slice(i, i + k).reverse()); return [...out, ...a.slice(i)]; };
  run(200, () => {
    const a = list(rnd(9)), k = 1 + rnd(4);
    check(kGroupFrames(a, k), text(brute(a, k)), `${a} ${k}`);
  });
  assert.equal(answer(kGroupFrames([1, 2, 3, 4, 5], 2)), '2 → 1 → 4 → 3 → 5');
});

test('merge two sorted lists', () => {
  run(250, () => {
    const a = list(rnd(6)).sort((x, y) => x - y), b = list(rnd(6)).sort((x, y) => x - y);
    check(mergeListsFrames(a, b), text([...a, ...b].sort((x, y) => x - y)), `${a} ${b}`);
  });
  assert.equal(answer(mergeListsFrames([], [])), 'empty');
  assert.equal(answer(mergeListsFrames([1, 2, 4], [1, 3, 4])), '1 → 1 → 2 → 3 → 4 → 4');
});

test('reorder list', () => {
  run(150, () => {
    const a = list(rnd(9)), want: number[] = [];
    for (let i = 0, j = a.length - 1; i <= j; i++, j--) { want.push(a[i]); if (i !== j) want.push(a[j]); }
    check(reorderFrames(a), text(want), String(a));
  });
  assert.equal(answer(reorderFrames([1, 2, 3, 4, 5, 6])), '1 → 6 → 2 → 5 → 3 → 4');
});

test('copy list with random pointer: clone shape is right and the original is restored', () => {
  run(150, () => {
    const n = rnd(6), r = Array.from({ length: n }, () => (rnd(3) === 0 ? null : rnd(n)));
    const L = (i: number) => String.fromCharCode(65 + i);
    const want = r.map((x, i) => `${L(i)}′>${x === null ? 'null' : `${L(x)}`}`).join(',');
    const f = copyRandomFrames(r); wellFormed(f);
    assert.equal(answer(f), n ? r.map((x, i) => `${L(i)}′>${x === null ? 'null' : L(x) + '′'}`).join(',') : '', want);
    if (n) assert.equal(lastVar(f, 'restored'), 'true');
  });
  assert.equal(answer(copyRandomFrames([2, 0, null])), 'A′>C′,B′>A′,C′>null');
});

test('LRU cache outputs', () => {
  run(250, () => {
    const cap = 1 + rnd(3), ops: LruOp[] = [], cache = new Map<number, number>(), out: number[] = [];
    for (let i = 0; i < 10; i++) {
      const k = rnd(4);
      if (rnd(2)) {
        const v = rnd(9); ops.push(['put', k, v]);
        if (cache.has(k)) cache.delete(k); else if (cache.size === cap) cache.delete(cache.keys().next().value!);
        cache.set(k, v);
      } else {
        ops.push(['get', k]);
        if (cache.has(k)) { const v = cache.get(k)!; cache.delete(k); cache.set(k, v); out.push(v); } else out.push(-1);
      }
    }
    check(lruFrames(cap, ops), JSON.stringify(out), `${cap} ${JSON.stringify(ops)}`);
  });
  assert.equal(answer(lruFrames(2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['get', 3]])), '[1,-1,3]');
});

test('cycle entrance', () => {
  run(300, () => {
    const a = list(rnd(8)), loopTo = rnd(3) === 0 ? null : rnd(Math.max(1, a.length));
    check(cycleEntranceFrames(a, loopTo), a.length && loopTo !== null ? String(loopTo) : 'none', `${a} ${loopTo}`);
  });
  assert.equal(answer(cycleEntranceFrames([3, 2, 0, -4], 1)), '1');
  assert.equal(answer(cycleEntranceFrames([1, 2, 3], 0)), '0'); // the tail loops back to the head
});

test('palindrome list restores the list', () => {
  run(300, () => {
    const half = list(rnd(5), 2), mid = rnd(2) ? [rnd(3)] : [];
    const a = rnd(2) ? [...half, ...mid, ...[...half].reverse()] : list(rnd(8), 2);
    check(palindromeFrames(a), String(a.join() === [...a].reverse().join()), String(a));
    const f = palindromeFrames(a);
    if (a.length) assert.ok(f[f.length - 1].caption.includes(text(a)), 'list restored');
  });
});

test('intersection of two lists', () => {
  run(250, () => {
    const na = rnd(5), nb = rnd(5), nc = rnd(4);
    const a = Array.from({ length: na }, (_, i) => 10 + i), b = Array.from({ length: nb }, (_, i) => 20 + i), c = Array.from({ length: nc }, (_, i) => 30 + i);
    check(intersectionFrames(a, b, c), nc ? '30' : 'null', `${na} ${nb} ${nc}`);
  });
  const dupValues = intersectionFrames([4, 1], [5, 6, 1], [8, 4, 5]); // the two 1s are different nodes
  assert.equal(answer(dupValues), '8');
});

test('add two numbers', () => {
  const digits = () => { const d = list(1 + rnd(5)); if (d.length > 1 && d[d.length - 1] === 0) d[d.length - 1] = 1; return d; };
  const toBig = (d: number[]) => BigInt([...d].reverse().join(''));
  run(300, () => {
    const a = digits(), b = digits();
    check(addTwoFrames(a, b), [...String(toBig(a) + toBig(b))].reverse().join(','), `${a} ${b}`);
  });
  assert.equal(answer(addTwoFrames([2, 4, 3], [5, 6, 4])), '7,0,8');
  assert.equal(answer(addTwoFrames([5], [5])), '0,1');
});

test('rotate right by k', () => {
  run(250, () => {
    const a = list(rnd(8)), k = rnd(40);
    const n = a.length, kk = n ? k % n : 0;
    const want = n ? [...a.slice(n - kk), ...a.slice(0, n - kk)] : [];
    check(rotateFrames(a, k), text(want), `${a} ${k}`);
  });
  assert.equal(answer(rotateFrames([1, 2, 3, 4, 5], 2)), '4 → 5 → 1 → 2 → 3');
  assert.equal(answer(rotateFrames([1, 2, 3], 2000000000)), '2 → 3 → 1');
});

test('sort list by split and merge', () => {
  run(250, () => { const a = list(rnd(9)); check(sortListFrames(a), [...a].sort((x, y) => x - y).join(','), String(a)); });
  assert.equal(answer(sortListFrames([4, 2, 1, 3])), '1,2,3,4');
});
