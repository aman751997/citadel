// Dry-run frames for the Two Pointers lesson. Each generator runs the lesson's Java algorithm on a
// small input and records one frame per decision, so the captions can never drift from the algorithm.
// The last frame of every generator has a text variable `answer`.
import { recorder, tvars, type Frame, type ArrayView, type CellTone, type PtrTone, type Predict, type Val } from '../lib/dryrun.ts';

type Ptr = [number, string, PtrTone?];
type Tones = Record<number, CellTone>;
type Region = NonNullable<ArrayView['regions']>[number];

const arr = (name: string, values: Val[], ptrs: Ptr[] = [], tones: Tones = {}, regions: Region[] = []): ArrayView => ({
  kind: 'array', name, values: [...values],
  pointers: ptrs.filter(([at]) => at >= 0 && at < values.length).map(([at, label, tone]) => ({ at, label, tone })),
  tones: { ...tones },
  regions: regions.filter(g => g.from <= g.to),
});
const ask = (question: string, options: string[], answer: number, explain: string): Predict => ({ question, options, answer, explain });
const J = (x: unknown) => JSON.stringify(x);
const fill = (from: number, to: number, tone: CellTone): Tones =>
  Object.fromEntries(Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => [from + k, tone]));

export function palindromeFrames(s: string): Frame[] {
  const r = recorder(), c = [...s];
  const alnum = (ch: string) => /[a-z0-9]/i.test(ch);
  let l = 0, h = c.length - 1;
  const tones: Tones = {};
  const view = () => arr('text', c, [[l, 'left', 'gold'], [h, 'right', 'blue']], tones);
  let askedSkip = false, askedMatch = false;
  r.frame('Two pointers, one at each end. We compare characters that count (letters and digits) and ignore the rest.', [view()]);
  while (l < h) {
    if (!alnum(c[l])) {
      const at = l; tones[l] = 'out'; l++;
      r.frame(`"${c[at]}" is not a letter or digit, so it is not part of the question. Skip it: left moves right with no comparison.`, [view()],
        askedSkip ? undefined : ask(`Left is on "${c[at]}". What now?`, ['Return false: it differs from the right character', 'Skip it and move left right', 'Compare it anyway'], 1, 'Punctuation is ignored in this problem, so it can never cause a mismatch. Skip first, compare after.'));
      askedSkip = true; continue;
    }
    if (!alnum(c[h])) {
      const at = h; tones[h] = 'out'; h--;
      r.frame(`"${c[at]}" is not a letter or digit either. Skip it on the right side.`, [view()]);
      continue;
    }
    if (c[l].toLowerCase() !== c[h].toLowerCase()) {
      tones[l] = 'compared'; tones[h] = 'compared';
      r.frame(`"${c[l]}" and "${c[h]}" are both real characters and they differ. One mismatch is enough: not a palindrome.`, [view(), tvars({ answer: 'false' })]);
      return r.frames;
    }
    const a = l, b = h; tones[l] = 'done'; tones[h] = 'done'; l++; h--;
    r.frame(`"${c[a]}" matches "${c[b]}" (ignoring case). That pair is settled, so both pointers move inward.`, [view()],
      askedMatch ? undefined : ask(`Left "${c[a]}" and right "${c[b]}" are both letters. What happens?`, ['They match: move both pointers', 'Move only left', 'Return false'], 0, 'Equal characters are settled for good. Both ends step in together.'));
    askedMatch = true;
  }
  r.frame('The pointers met or crossed: no unchecked pair is left. A single middle character needs no partner.', [view(), tvars({ answer: 'true' })]);
  return r.frames;
}

// nums must be sorted ascending.
export function threeSumFrames(nums: number[]): Frame[] {
  const r = recorder(), n = nums.length, found: number[][] = [];
  const view = (fixed: number, l: number, h: number) => {
    const tones: Tones = { ...fill(0, fixed - 1, 'visited'), ...fill(fixed + 1, l - 1, 'out'), ...fill(h + 1, n - 1, 'out'), [fixed]: 'active' };
    return arr('sorted nums', nums, [[fixed, 'fixed', 'purple'], [l, 'left', 'gold'], [h, 'right', 'blue']], tones);
  };
  const vars = (extra: Record<string, Val> = {}) => tvars({ ...extra, triplets: J(found) });
  r.frame('Sorted input. Plan: fix one number, then run the sorted pair search on everything to its right.', [arr('sorted nums', nums), vars()]);
  let askedMove = false;
  for (let fixed = 0; fixed < n - 2; fixed++) {
    if (fixed > 0 && nums[fixed] === nums[fixed - 1]) {
      r.frame(`nums[${fixed}] = ${nums[fixed]} equals the previous fixed value. Every triplet it could start was already found, so skip it.`,
        [arr('sorted nums', nums, [[fixed, 'fixed', 'purple']], { [fixed]: 'out' }), vars()],
        ask(`Fixed value ${nums[fixed]} was already used as the fixed value at index ${fixed - 1}. What now?`, ['Run the pair search again', 'Skip it: it would repeat the same triplets'], 1, 'The same value as the previous fixed number sees the same remaining numbers (plus fewer), so it can only rediscover old triplets.'));
      continue;
    }
    if (nums[fixed] > 0) {
      r.frame(`nums[${fixed}] = ${nums[fixed]} is positive and the array is sorted, so every remaining number is positive. No triplet can sum to 0. Stop.`, [view(fixed, fixed + 1, n - 1), vars()]);
      break;
    }
    let l = fixed + 1, h = n - 1;
    r.frame(`Fix ${nums[fixed]}. The other two must add up to ${-nums[fixed]}. That is Two Sum II on the part to the right.`, [view(fixed, l, h), vars({ need: -nums[fixed] })]);
    while (l < h) {
      const sum = nums[fixed] + nums[l] + nums[h];
      const used = `${nums[fixed]} + ${nums[l]} + ${nums[h]} = ${sum}`;
      if (sum < 0) {
        l++;
        r.frame(`${used} < 0: too small even with the biggest partner on the right, so the old left value is finished. Left moves right.`, [view(fixed, l, h), vars({ sum })],
          askedMove ? undefined : ask(`${used}. Which pointer moves?`, ['Left moves right', 'Right moves left', 'Record a triplet'], 0, 'The sum is below zero. Only a bigger left value can raise it, because right is already the biggest remaining partner.'));
        askedMove = true;
      } else if (sum > 0) {
        h--;
        r.frame(`${used} > 0: too big even with the smallest partner on the left, so the old right value is finished. Right moves left.`, [view(fixed, l, h), vars({ sum })]);
      } else {
        found.push([nums[fixed], nums[l], nums[h]]);
        const hit = view(fixed, l, h); hit.tones = { ...hit.tones, [l]: 'found', [h]: 'found' };
        r.frame(`${used}: a triplet. Record ${J([nums[fixed], nums[l], nums[h]])}.`, [hit, vars({ sum })]);
        l++; h--;
        const before = [l, h];
        while (l < h && nums[l] === nums[l - 1]) l++;
        while (l < h && nums[h] === nums[h + 1]) h--;
        r.frame(`Move both pointers inward${l !== before[0] || h !== before[1] ? ', then skip repeated values so the same triplet is not recorded twice' : ''}. Moving only one would find the same answer again.`, [view(fixed, l, h), vars({ sum })]);
      }
    }
  }
  r.frame('Every fixed position has been tried. The recorded triplets are the answer.', [arr('sorted nums', nums, [], fill(0, n - 1, 'visited')), vars({ answer: J(found) })]);
  return r.frames;
}

export function containerFrames(height: number[]): Frame[] {
  const r = recorder(), n = height.length;
  let l = 0, h = n - 1, best = 0, asked = false;
  const view = (hit?: [number, number]) => {
    const tones: Tones = { ...fill(0, l - 1, 'out'), ...fill(h + 1, n - 1, 'out') };
    if (hit) { tones[hit[0]] = 'found'; tones[hit[1]] = 'found'; }
    return arr('heights', height, [[l, 'left', 'gold'], [h, 'right', 'blue']], tones);
  };
  r.frame('Start with the widest container: left and right at the two ends. Width is the biggest it will ever be.', [view(), tvars({ best })]);
  while (l < h) {
    const area = Math.min(height[l], height[h]) * (h - l);
    const was: [number, number] = [l, h];
    const improved = area > best;
    best = Math.max(best, area);
    const shortLeft = height[l] <= height[h];
    const caption = `Area = min(${height[l]}, ${height[h]}) x ${h - l} = ${area}${improved ? ', a new best' : ', not better than best'} (best = ${best}). `;
    const reason = shortLeft
      ? `The left wall (${height[l]}) is the short one. Any pair that keeps it and moves right inward is narrower and still capped at ${height[l]}, so it cannot beat ${area}. Move left.`
      : `The right wall (${height[h]}) is the short one. Any pair that keeps it and moves left inward is narrower and still capped at ${height[h]}, so it cannot beat ${area}. Move right.`;
    if (shortLeft) l++; else h--;
    const v = view(); v.tones = { ...v.tones, [shortLeft ? was[0] : was[1]]: 'out' };
    r.frame(caption + reason, [v, tvars({ area, best })],
      asked ? undefined : ask(`Heights ${height[was[0]]} (left) and ${height[was[1]]} (right). Which pointer moves?`, ['The taller wall', 'The shorter wall', 'Always left'], 1, 'Always the shorter wall. The taller wall may still be useful with a different partner; the short wall never can be.'));
    asked = true;
  }
  r.frame('The pointers met. Every pair we skipped was provably no better than the best we measured.', [view(), tvars({ answer: best })]);
  return r.frames;
}

export function rainFrames(height: number[]): Frame[] {
  const r = recorder(), n = height.length;
  let l = 0, h = n - 1, lm = height[l], rm = height[h], water = 0, asked = false;
  const settled: Tones = { 0: 'visited', [n - 1]: 'visited' };
  const view = () => arr('heights', height, [[l, 'left', 'gold'], [h, 'right', 'blue']], settled);
  const vars = () => tvars({ leftMax: lm, rightMax: rm, water });
  r.frame(`leftMax = ${lm} and rightMax = ${rm}: the tallest wall seen from each end so far. The two end bars hold no water.`, [view(), vars()]);
  while (l < h) {
    const fromLeft = lm <= rm;
    const ask1 = asked ? undefined : ask(`leftMax = ${lm}, rightMax = ${rm}. Which side can we settle next?`, ['The left side (smaller max)', 'The right side (larger max)', 'Either one'], fromLeft ? 0 : 1, 'The side with the smaller max. The other side already has a wall at least that tall, so the water above the next bar there is decided by the smaller max alone.');
    asked = true;
    if (fromLeft) {
      l++; lm = Math.max(lm, height[l]); const add = lm - height[l]; water += add; settled[l] = add > 0 ? 'found' : 'visited';
      r.frame(`leftMax ${lm} <= rightMax ${rm}, so the left side is settled. Bar ${l} (height ${height[l]}) holds ${lm} - ${height[l]} = ${add}. Total water = ${water}.`, [view(), vars()], ask1);
    } else {
      h--; rm = Math.max(rm, height[h]); const add = rm - height[h]; water += add; settled[h] = add > 0 ? 'found' : 'visited';
      r.frame(`rightMax ${rm} < leftMax ${lm}, so the right side is settled. Bar ${h} (height ${height[h]}) holds ${rm} - ${height[h]} = ${add}. Total water = ${water}.`, [view(), vars()], ask1);
    }
  }
  r.frame('The pointers met, so every bar has a final water amount.', [view(), tvars({ answer: water })]);
  return r.frames;
}

export function moveZeroesFrames(nums: number[]): Frame[] {
  const r = recorder(), a = [...nums], n = a.length;
  let write = 0, asked = false;
  const view = (read: number, tones: Tones = {}) => arr('nums', a, [[write, 'write', 'gold'], [read, 'read', 'blue']], { ...fill(0, write - 1, 'done'), ...tones }, [
    { from: 0, to: write - 1, label: 'kept', tone: 'green' }, { from: read + 1, to: n - 1, label: 'unread', tone: 'blue' }]);
  r.frame('write marks where the next nonzero value belongs. read looks at every value once.', [view(0)]);
  for (let read = 0; read < n; read++) {
    if (a[read] !== 0) {
      const v = a[read], same = read === write;
      [a[write], a[read]] = [a[read], a[write]];
      const wrote = write; write++;
      r.frame(`${v} is nonzero, so it belongs at write (${wrote}). ${same ? 'It is already there, so the swap changes nothing' : `Swap index ${wrote} and ${read}: the value moves forward and a zero goes back`}. write moves to ${write}.`,
        [view(read, { [wrote]: 'swapped' })],
        asked ? undefined : ask(`read is on ${v}, write is at ${wrote}. What happens?`, ['Swap into write, then write++', 'Only read moves', 'Move every zero to the end'], 0, 'A nonzero value is kept: put it at write and advance write. Zeroes just stay behind.'));
      asked = true;
    } else {
      r.frame(`read sees 0. Nothing to keep, so only read moves. write stays: that slot is still waiting for a nonzero.`, [view(read, { [read]: 'compared' })]);
    }
  }
  r.frame('read has seen everything. The first write values are the nonzero values in their original order; the rest are zeroes.', [arr('nums', a, [], fill(0, write - 1, 'done')), tvars({ answer: J(a) })]);
  return r.frames;
}

export function dedupeFrames(nums: number[], k: number): Frame[] {
  const r = recorder(), a = [...nums], n = a.length;
  let write = 0, asked = false;
  const view = (read: number, tones: Tones = {}) => arr('nums', a, [[write, 'write', 'gold'], [read, 'read', 'blue']], { ...fill(0, write - 1, 'done'), ...tones },
    [{ from: 0, to: write - 1, label: 'kept', tone: 'green' }]);
  r.frame(`Keep at most ${k} copy(ies) of each value. write is the length of the kept prefix; read visits every value.`, [view(0), tvars({ write })]);
  for (let read = 0; read < n; read++) {
    const v = a[read];
    if (write < k || v !== a[write - k]) {
      a[write] = v; const at = write; write++;
      r.frame(write <= k && at < k
        ? `The kept prefix has fewer than ${k} values, so ${v} is kept automatically.`
        : `${v} differs from nums[write - ${k}] = ${a[at - k]}, so the kept prefix does not already hold ${k} copies of ${v}. Keep it at index ${at}.`,
        [view(read, { [at]: 'swapped' }), tvars({ write })]);
    } else {
      r.frame(`${v} equals nums[write - ${k}] = ${a[write - k]}. Because the input is sorted, the kept prefix already ends with ${k} copies of ${v}. Skip this one: only read moves.`,
        [view(read, { [read]: 'compared', [write - k]: 'compared' }), tvars({ write })],
        asked ? undefined : ask(`read is on ${v}; the value ${k} slots back in the kept prefix is ${a[write - k]}. Keep or skip?`, ['Keep it', 'Skip it'], 1, `The kept prefix already holds ${k} copies of ${v}. Another one would break the limit.`));
      asked = true;
    }
  }
  r.frame(`Done. The answer is the length ${write}; the first ${write} slots are the result and the tail is ignored.`, [arr('nums', a, [], fill(0, write - 1, 'done'), [{ from: write, to: n - 1, label: 'ignored', tone: 'dim' }]), tvars({ answer: write })]);
  return r.frames;
}

export function colorsFrames(nums: number[]): Frame[] {
  const r = recorder(), a = [...nums], n = a.length;
  let low = 0, mid = 0, high = n - 1, askedHigh = false;
  const view = (tones: Tones = {}) => arr('nums', a, [[low, 'low', 'red'], [mid, 'mid', 'gold'], [high, 'high', 'blue']], tones, [
    { from: 0, to: low - 1, label: '0s', tone: 'red' }, { from: low, to: mid - 1, label: '1s', tone: 'dim' },
    { from: mid, to: high, label: 'unknown', tone: 'gold' }, { from: high + 1, to: n - 1, label: '2s', tone: 'blue' }]);
  r.frame('Four zones: 0s before low, 1s from low to mid, unknown from mid to high, 2s after high. The unknown zone is all we still have to look at.', [view()]);
  while (mid <= high) {
    const v = a[mid];
    if (v === 0) {
      const same = low === mid;
      [a[low], a[mid]] = [a[mid], a[low]]; const at = low; low++; mid++;
      r.frame(`nums[mid] is 0. Swap it with nums[low] (index ${at})${same ? ': same cell, so nothing moves' : ': low held a known 1, which lands at mid'}. The 0 is placed, so low and mid both advance.`, [view({ [at]: 'swapped' })]);
    } else if (v === 1) {
      mid++;
      r.frame('nums[mid] is 1. It already belongs in the middle zone: just advance mid.', [view({ [mid - 1]: 'done' })]);
    } else {
      [a[high], a[mid]] = [a[mid], a[high]]; const at = high; high--;
      r.frame(`nums[mid] is 2. Swap it with nums[high] (index ${at}). The 2 is placed and high moves left. mid stays: the value that arrived from high was never inspected.`, [view({ [at]: 'swapped', [mid]: 'active' })],
        askedHigh ? undefined : ask('mid just swapped with high. Does mid advance?', ['Yes, like after a 0 swap', 'No: inspect the new nums[mid] first'], 1, 'The value from high came from the unknown zone. It could be 0, 1 or 2. Skipping it would leave it unchecked.'));
      askedHigh = true;
    }
  }
  r.frame('mid passed high: the unknown zone is empty. The array is sorted.', [arr('nums', a, [], fill(0, n - 1, 'done')), tvars({ answer: J(a) })]);
  return r.frames;
}

export function mergeFrames(first: number[], m: number, second: number[], n: number): Frame[] {
  const r = recorder(), a = [...first], b = [...second];
  let i = m - 1, j = n - 1, write = m + n - 1, asked = false;
  const views = (tones: Tones = {}) => [
    arr('nums1', a, [[i, 'i', 'gold'], [write, 'write', 'green']], tones, [{ from: write + 1, to: a.length - 1, label: 'final', tone: 'green' }]),
    arr('nums2', b, [[j, 'j', 'purple']]),
  ];
  r.frame('Fill nums1 from the back. The back slots are free, so writing there can never overwrite a value we still need.', [...views()]);
  while (j >= 0) {
    const fromFirst = i >= 0 && a[i] > b[j];
    const x = fromFirst ? a[i] : b[j];
    const at = write;
    const exhausted = i < 0;
    const question = `Last unread values: nums1 ${i >= 0 ? `= ${a[i]}` : 'is used up'}, nums2 = ${b[j]}. Which one is written to index ${at}?`;
    a[write--] = x; if (fromFirst) i--; else j--;
    r.frame(exhausted
      ? `nums1 has nothing unread, so the rest of nums2 is copied: ${x} goes to index ${at}.`
      : `${x} is the larger of the two unread tails, so it goes to index ${at}, the largest slot still empty.`,
      [...views({ [at]: 'swapped' })],
      asked ? undefined : ask(question, ['The nums1 value', 'The nums2 value'], fromFirst ? 0 : 1, 'The bigger one: the output is built from the largest value down, so the larger tail is the next largest of everything unread.'));
    asked = true;
  }
  r.frame('nums2 is used up. Whatever is left at the front of nums1 is already in its final place.', [...views(), tvars({ answer: J(a) })]);
  return r.frames;
}

export function subsequenceFrames(source: string, target: string): Frame[] {
  const r = recorder(), s = [...source], t = [...target];
  let needed = 0, asked = false;
  const views = (read: number, tones: Tones = {}) => [
    arr('source', s, [[read, 'read', 'blue']], tones),
    arr('target', t, [[needed, 'needed', 'purple']], { ...fill(0, needed - 1, 'done') }),
  ];
  r.frame('read scans the source once. needed points at the next target character we are still waiting for.', [...views(-1)]);
  for (let read = 0; read < s.length && needed < t.length; read++) {
    if (s[read] === t[needed]) {
      needed++;
      r.frame(`"${s[read]}" is exactly the character we need, so match it: needed moves to ${needed}. Taking the earliest match leaves the most source for later characters.`, [...views(read, { [read]: 'found' })],
        asked ? undefined : ask(`read is on "${s[read]}", needed is "${t[needed - 1]}". What happens?`, ['needed advances', 'Only read advances', 'Both advance whatever they hold'], 0, 'A match moves the target pointer. The read pointer always moves.'));
      asked = true;
    } else {
      r.frame(`"${s[read]}" is not "${t[needed]}", the character we need. Skip it: only read moves.`, [...views(read, { [read]: 'out' })]);
    }
  }
  r.frame(`The source is finished. ${t.length - needed} target character(s) never matched (${J(t.slice(needed).join(''))}), so that many must be appended.`, [...views(s.length), tvars({ answer: t.length - needed })]);
  return r.frames;
}

export function squaresFrames(nums: number[]): Frame[] {
  const r = recorder(), n = nums.length, out: Val[] = Array(n).fill('.');
  let l = 0, h = n - 1, asked = false;
  const views = (tones: Tones = {}) => [
    arr('nums', nums, [[l, 'left', 'gold'], [h, 'right', 'blue']], { ...fill(0, l - 1, 'out'), ...fill(h + 1, n - 1, 'out') }),
    arr('result', out, [], tones),
  ];
  r.frame('The input is sorted but squares are not. The biggest square is at one of the two ends, so fill the result from the back.', [...views()]);
  for (let w = n - 1; w >= 0; w--) {
    const ls = nums[l] * nums[l], rs = nums[h] * nums[h], fromLeft = ls > rs;
    const x = fromLeft ? ls : rs;
    r.frame(`${nums[l]} squared is ${ls}, ${nums[h]} squared is ${rs}. The larger is ${x}, so it goes at result[${w}] and the ${fromLeft ? 'left' : 'right'} pointer moves in.`,
      (() => { out[w] = x; if (fromLeft) l++; else h--; return [...views({ [w]: 'swapped' })]; })(),
      asked ? undefined : ask(`Squares at the ends: ${ls} (left) and ${rs} (right). Which goes at result[${w}] and which pointer moves?`, ['Left square, left moves', 'Right square, right moves'], fromLeft ? 0 : 1, 'The larger square is next from the back. Whichever end produced it has been used up.'));
    asked = true;
  }
  r.frame('Every input value has been squared and placed. The result is sorted.', [...views(fill(0, n - 1, 'done')), tvars({ answer: J(out) })]);
  return r.frames;
}

export function oneDeletionFrames(s: string): Frame[] {
  const r = recorder(), c = [...s];
  const pal = (a: number, b: number) => { while (a < b) if (c[a++] !== c[b--]) return false; return true; };
  let l = 0, h = c.length - 1;
  const view = (tones: Tones = {}, regions: Region[] = []) => arr('text', c, [[l, 'left', 'gold'], [h, 'right', 'blue']], tones, regions);
  r.frame('Compare from both ends as in a normal palindrome check. We may spend one deletion, but only at the first mismatch.', [view()]);
  while (l < h) {
    if (c[l] !== c[h]) {
      r.frame(`"${c[l]}" and "${c[h]}" differ. A deletion must remove one of these two: deleting something inside leaves this pair facing each other.`, [view({ [l]: 'compared', [h]: 'compared' })]);
      const skipLeft = pal(l + 1, h), skipRight = pal(l, h - 1);
      r.frame(`Branch A, delete the left "${c[l]}": is "${c.slice(l + 1, h + 1).join('')}" a plain palindrome? ${skipLeft ? 'Yes.' : 'No.'}`,
        [view({ [l]: 'out' }, [{ from: l + 1, to: h, label: skipLeft ? 'palindrome' : 'not a palindrome', tone: skipLeft ? 'green' : 'red' }])],
        ask(`Delete the left "${c[l]}". Is "${c.slice(l + 1, h + 1).join('')}" a palindrome?`, ['Yes', 'No'], skipLeft ? 0 : 1, 'Check the remaining range as an ordinary palindrome. No deletions are left to spend.'));
      r.frame(`Branch B, delete the right "${c[h]}": is "${c.slice(l, h).join('')}" a plain palindrome? ${skipRight ? 'Yes.' : 'No.'}`,
        [view({ [h]: 'out' }, [{ from: l, to: h - 1, label: skipRight ? 'palindrome' : 'not a palindrome', tone: skipRight ? 'green' : 'red' }])]);
      r.frame(`Answer is A or B: ${skipLeft || skipRight}. You cannot pick one branch by guessing; both must be tried.`, [view(), tvars({ answer: String(skipLeft || skipRight) })]);
      return r.frames;
    }
    const a = l, b = h; l++; h--;
    r.frame(`"${c[a]}" matches "${c[b]}". Move both pointers inward.`, [view({ ...fill(0, l - 1, 'done'), ...fill(h + 1, c.length - 1, 'done') })]);
  }
  r.frame('No mismatch at all: it is already a palindrome, so zero deletions are needed.', [view(), tvars({ answer: 'true' })]);
  return r.frames;
}

export function countPairsFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let l = 0, h = nums.length - 1, count = 0, asked = false;
  const view = (tones: Tones = {}) => arr('sorted nums', nums, [[l, 'left', 'gold'], [h, 'right', 'blue']], tones);
  r.frame(`Count pairs of positions (i < j) with sum ${target}. Same pointer moves as Two Sum II; the new part is what to do on a match.`, [view(), tvars({ count })]);
  while (l < h) {
    const sum = nums[l] + nums[h];
    if (sum < target) { l++; r.frame(`${sum} < ${target}: left moves right.`, [view(), tvars({ count })]); }
    else if (sum > target) { h--; r.frame(`${sum} > ${target}: right moves left.`, [view(), tvars({ count })]); }
    else if (nums[l] === nums[h]) {
      const size = h - l + 1, add = size * (size - 1) / 2; count += add;
      r.frame(`${nums[l]} + ${nums[h]} = ${target} and both ends hold the same value, so everything between is equal too. ${size} equal values give ${size} x ${size - 1} / 2 = ${add} pairs. Stop.`, [view(fill(l, h, 'found')), tvars({ count })],
        ask(`Left and right both hold ${nums[l]}, ${size} equal values in range. How many pairs?`, [String(size * size), String(add), String(size)], 1, 'Choose any 2 of the equal positions: size x (size - 1) / 2.'));
      l = h; break;
    } else {
      const lv = nums[l], hv = nums[h]; let lc = 0, hc = 0; const lo = l, hi = h;
      while (l <= h && nums[l] === lv) { lc++; l++; }
      while (h >= l && nums[h] === hv) { hc++; h--; }
      count += lc * hc;
      r.frame(`${lv} + ${hv} = ${target}. There are ${lc} copies of ${lv} and ${hc} copies of ${hv}, and every copy of one pairs with every copy of the other: ${lc} x ${hc} = ${lc * hc}. Skip both runs.`, [view({ ...fill(lo, lo + lc - 1, 'found'), ...fill(hi - hc + 1, hi, 'found') }), tvars({ count })],
        asked ? undefined : ask(`${lc} copies of ${lv} meet ${hc} copies of ${hv}. How many pairs?`, [String(lc + hc), String(lc * hc), '1'], 1, 'Every left copy pairs with every right copy: multiply the run lengths.'));
      asked = true;
    }
  }
  r.frame('Pointers met. Every matching pair of positions has been counted exactly once.', [view(), tvars({ answer: count })]);
  return r.frames;
}

export function countBelowFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let l = 0, h = nums.length - 1, count = 0, asked = false;
  const view = (tones: Tones = {}) => arr('sorted nums', nums, [[l, 'left', 'gold'], [h, 'right', 'blue']], tones);
  r.frame(`Count pairs with sum strictly below ${target}.`, [view(), tvars({ count })]);
  while (l < h) {
    const sum = nums[l] + nums[h];
    if (sum < target) {
      const add = h - l; count += add; const from = l; l++;
      r.frame(`${nums[from]} + ${nums[h]} = ${sum} < ${target}. ${nums[h]} is the biggest partner left for ${nums[from]}, so every partner from index ${from + 1} to ${h} works too: ${add} pairs in one decision. Left is finished, so it moves.`, [view(fill(from + 1, h, 'found')), tvars({ count })],
        asked ? undefined : ask(`${nums[from]} + ${nums[h]} = ${sum} is below ${target}. How many pairs does left (${nums[from]}) make?`, ['1', String(add), String(nums.length - 1 - from)], 1, 'Everything between left and right is no bigger than the right value, so all of them also pair with left: right - left pairs.'));
      asked = true;
    } else {
      h--;
      r.frame(`${sum} is not below ${target}: right is too big for every remaining left value. Move right.`, [view(), tvars({ count })]);
    }
  }
  r.frame('Pointers met. Each left position had all its qualifying partners counted once.', [view(), tvars({ answer: count })]);
  return r.frames;
}

export function partitionFrames(nums: number[], pivot: number): Frame[] {
  const r = recorder(), a = [...nums], n = a.length;
  let write = 0, asked = false;
  const view = (read: number, tones: Tones = {}) => arr('nums', a, [[write, 'write', 'gold'], [read, 'read', 'blue']], { ...fill(0, write - 1, 'done'), ...tones },
    [{ from: 0, to: write - 1, label: `< ${pivot}`, tone: 'green' }, { from: read + 1, to: n - 1, label: 'unread', tone: 'blue' }]);
  r.frame(`Put every value below ${pivot} first. Order inside each group does not matter.`, [view(0), tvars({ write })]);
  for (let read = 0; read < n; read++) {
    if (a[read] < pivot) {
      const v = a[read], at = write;
      [a[write], a[read]] = [a[read], a[write]]; write++;
      r.frame(`${v} < ${pivot}: swap it into write (index ${at}) and advance write.`, [view(read, { [at]: 'swapped' }), tvars({ write })],
        asked ? undefined : ask(`read is on ${v}, pivot is ${pivot}. What happens?`, ['Swap into write, write++', 'Only read moves'], 0, 'Values below the pivot belong in the front group, which ends at write.'));
      asked = true;
    } else {
      r.frame(`${a[read]} is not below ${pivot}. Leave it; only read moves.`, [view(read, { [read]: 'compared' }), tvars({ write })]);
    }
  }
  r.frame(`The first ${write} values are below the pivot; the rest are not. Return ${write}.`, [arr('nums', a, [], fill(0, write - 1, 'done')), tvars({ answer: write })]);
  return r.frames;
}

export function differenceFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let l = 0, h = 1, asked = false;
  const view = (tones: Tones = {}) => arr('sorted nums', nums, [[l, 'smaller', 'gold'], [h, 'larger', 'blue']], tones);
  r.frame(`Find two positions where larger minus smaller is ${target}. Both pointers start on the left and only move right.`, [view()]);
  while (h < nums.length) {
    if (l === h) { h++; r.frame('Both readers are on the same position, which is not allowed. Move the larger reader ahead.', [view()]); continue; }
    const diff = nums[h] - nums[l];
    if (diff === target) { r.frame(`${nums[h]} - ${nums[l]} = ${diff}, exactly the target. Found.`, [view({ [l]: 'found', [h]: 'found' }), tvars({ answer: 'true' })]); return r.frames; }
    const small = diff < target;
    if (small) h++; else l++;
    r.frame(small
      ? `${nums[h - 1]} - ${nums[l]} = ${diff} is too small. Keeping the smaller value, only a bigger larger value can help, so the larger reader moves right.`
      : `${nums[h]} - ${nums[l - 1]} = ${diff} is too big. Keeping the larger value, only a bigger smaller value can shrink it, so the smaller reader moves right.`,
      [view(), tvars({ diff })],
      asked ? undefined : ask(`Difference ${diff}, target ${target}. Which reader moves right?`, ['The larger reader', 'The smaller reader'], small ? 0 : 1, small ? 'To grow the difference, raise the larger value.' : 'To shrink the difference, raise the smaller value.'));
    asked = true;
  }
  r.frame('The larger reader ran off the end: no pair has this difference.', [view(), tvars({ answer: 'false' })]);
  return r.frames;
}

export function intersectionFrames(a: number[], b: number[]): Frame[] {
  const r = recorder(), out: number[] = [];
  let i = 0, j = 0, asked = false;
  const views = () => [arr('a', a, [[i, 'i', 'gold']], fill(0, i - 1, 'out')), arr('b', b, [[j, 'j', 'blue']], fill(0, j - 1, 'out')), tvars({ result: J(out) })];
  r.frame('Both inputs are sorted. A smaller current value can never match anything later in the other input, so it is safe to drop.', views());
  while (i < a.length && j < b.length) {
    if (a[i] < b[j]) {
      const x = a[i]; i++;
      r.frame(`${x} < ${b[j]}: everything left in b is at least ${b[j]}, so ${x} has no partner. Advance i.`, views(),
        asked ? undefined : ask(`a[i] = ${x}, b[j] = ${b[j]}. Which pointer moves?`, ['i (the smaller)', 'j (the larger)', 'Both'], 0, 'The smaller value cannot match anything in the rest of the other array.'));
      asked = true;
    } else if (a[i] > b[j]) {
      const x = b[j]; j++;
      r.frame(`${a[i]} > ${x}: ${x} has no partner in the rest of a. Advance j.`, views());
    } else {
      const x = a[i]; if (out.length === 0 || out[out.length - 1] !== x) out.push(x);
      i++; j++;
      r.frame(`${x} is in both. Add it to the result (once), then advance both pointers.`, views());
    }
  }
  r.frame('One input ran out, so nothing more can match.', [...views().slice(0, 2), tvars({ answer: J(out) })]);
  return r.frames;
}
