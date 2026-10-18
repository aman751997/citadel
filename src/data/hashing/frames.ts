// Dry-run frames for every problem in src/dsa-lessons/hashing.mdx. Each generator replays the lesson's
// algorithm on a small input and ends with a text view holding `answer` (checked in tests/hashing-frames.test.ts).
import { recorder, tvars, type Frame, type View, type CellTone, type Val } from '../../lib/dryrun.ts';

type Tones = Record<number, CellTone>;
const J = (x: unknown) => JSON.stringify(x);
const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });
const yn = (b: boolean) => (b ? 'true' : 'false');
const chars = (s: string) => [...s];
const sorted = (s: string) => [...s].sort().join('');

// ---- the toy wall: bucket = key mod capacity ---------------------------------------------------------
// Final text var `answer` = whether `lookup` is found.
export function bucketFrames(keys: number[], capacity: number, lookup: number): Frame[] {
  const r = recorder();
  const buckets: number[][] = Array.from({ length: capacity }, () => []);
  const view = (hot?: number): View => ({
    kind: 'array', name: `${capacity} buckets`, values: buckets.map(b => (b.length ? b.join('→') : '·')),
    pointers: hot === undefined ? [] : [{ at: hot, label: 'bucket', tone: 'blue' }],
    tones: Object.fromEntries(buckets.map((b, i) => [i, i === hot ? 'compared' : b.length ? 'done' : 'out'] as [number, CellTone])),
  });
  r.frame(`${capacity} empty buckets. A key goes to bucket (key mod ${capacity}). Equal keys always compute the same bucket, so a lookup only ever needs to open one bucket.`, [view()]);
  for (const k of keys) {
    const b = k % capacity;
    const shared = buckets[b].length > 0;
    buckets[b].push(k);
    r.frame(shared
      ? `${k} mod ${capacity} = ${b}. Bucket ${b} is not empty: a collision. Different keys may share a bucket; the new key joins the chain.`
      : `${k} mod ${capacity} = ${b}. Bucket ${b} is empty, so ${k} starts the chain there.`,
      [view(b), tvars({ key: k, bucket: b })],
      q(`Which bucket does ${k} go to?`, [`${(b + 1) % capacity}`, `${b}`, `${(b + 2) % capacity}`].filter((x, i, a) => a.indexOf(x) === i), 1, `${k} mod ${capacity} = ${b}.`));
  }
  const b = lookup % capacity, found = buckets[b].includes(lookup);
  r.frame(`contains(${lookup}): compute bucket ${lookup} mod ${capacity} = ${b} and open only that bucket. equals compares ${lookup} with the ${buckets[b].length} key(s) there, never the whole table. ${found ? 'One of them matches.' : 'None matches.'}`,
    [view(b), tvars({ lookup, bucket: b, chain: buckets[b].join(', ') || 'empty', answer: yn(found) })]);
  return r.frames;
}

// ---- Contains Duplicate ------------------------------------------------------------------------------
export function containsDuplicateFrames(nums: number[]): Frame[] {
  const r = recorder(), seen: number[] = [];
  const tones: Tones = {};
  const nv = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, pointers: i < nums.length ? [{ at: i, label: 'x', tone: 'blue' }] : [], tones: { ...tones } });
  const sv = (changed: number[] = []): View => ({ kind: 'set', name: 'seen', items: [...seen], changed });
  r.frame('The set starts empty. For each x we call seen.add(x). add returns false when an equal value is already in the set, and that false is the answer.', [nv(0), sv()]);
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i], dup = seen.includes(x);
    const ask = q(`seen = {${seen.join(', ')}}. What does seen.add(${x}) return?`, ['true: it was new', 'false: it was already there'], dup ? 1 : 0, dup ? `${x} is already in the set, so add leaves the set unchanged and returns false.` : `${x} is not in the set yet, so add inserts it and returns true.`);
    if (dup) {
      tones[i] = 'found';
      r.frame(`add(${x}) returns false: ${x} was filed earlier. A value repeats, so stop and return true. Nothing after index ${i} needs reading.`, [nv(i), sv(), tvars({ x, 'add returns': 'false', answer: 'true' })], ask);
      return r.frames;
    }
    seen.push(x); tones[i] = 'visited';
    r.frame(`add(${x}) returns true: ${x} is new, so it is now in the set. The set holds exactly the distinct values before the next index.`, [nv(i), sv([seen.length - 1]), tvars({ x, 'add returns': 'true' })], ask);
  }
  r.frame('Every value was new, so no value repeats. Return false.', [nv(nums.length), sv(), tvars({ answer: 'false' })]);
  return r.frames;
}

// ---- Two Sum -----------------------------------------------------------------------------------------
// Final var `answer` = JSON [j, i] or [].
export function twoSumFrames(nums: number[], target: number): Frame[] {
  const r = recorder(), seen = new Map<number, number>();
  const tones: Tones = {};
  const nv = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, pointers: i < nums.length ? [{ at: i, label: 'x', tone: 'blue' }] : [], tones: { ...tones } });
  const mv = (changed: number[] = []): View => ({ kind: 'map', name: 'seen (value → index)', entries: [...seen.entries()], changed });
  r.frame(`Looking for two positions whose values add to ${target}. For each x we need exactly ${target} − x. Ask the map first, then file x.`, [nv(0), mv()]);
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i], need = target - x, j = seen.get(need);
    const ask = q(`x = ${x}. Is ${need} (= ${target} − ${x}) already in the map?`, ['Yes: return the pair', 'No: file x and move on'], j !== undefined ? 0 : 1, j !== undefined ? `${need} was filed at index ${j}, an earlier position, so [${j}, ${i}] is a valid pair.` : `${need} has not appeared at an earlier position.`);
    if (j !== undefined) {
      tones[i] = 'found'; tones[j] = 'found';
      r.frame(`Ask for ${target} − ${x} = ${need}: it is on file at index ${j}. The map only holds earlier positions, so j ≠ i. Answer [${j}, ${i}].`, [nv(i), mv(), tvars({ x, need, answer: J([j, i]) })], ask);
      return r.frames;
    }
    seen.set(x, i); tones[i] = 'visited';
    r.frame(`Ask for ${target} − ${x} = ${need}: not on file. Now file ${x} → ${i} so later values can find it. (Asking first is what stops x from pairing with itself.)`, [nv(i), mv([seen.size - 1]), tvars({ x, need })], ask);
  }
  r.frame('No position found a partner.', [nv(nums.length), mv(), tvars({ answer: '[]' })]);
  return r.frames;
}

// ---- Path Crossing -----------------------------------------------------------------------------------
export function pathCrossingFrames(path: string): Frame[] {
  const r = recorder(), visited: string[] = ['(0,0)'];
  let x = 0, y = 0;
  const pv = (i: number): View => ({ kind: 'array', name: 'path', values: chars(path), pointers: i < path.length ? [{ at: i, label: 'move', tone: 'blue' }] : [], tones: Object.fromEntries(chars(path).map((_, k) => [k, k < i ? 'visited' : k === i ? 'compared' : 'out'] as [number, CellTone])) });
  const sv = (changed: number[] = []): View => ({ kind: 'set', name: 'visited corners', items: [...visited], changed });
  r.frame('Start at (0,0) and file it: the start counts as visited. Each move makes a new corner; add returns false if the corner is already filed.', [pv(0), sv([0]), tvars({ x, y })]);
  for (let i = 0; i < path.length; i++) {
    const m = path[i], px = x, py = y;
    if (m === 'N') y++; else if (m === 'S') y--; else if (m === 'E') x++; else x--;
    const key = `(${x},${y})`, dup = visited.includes(key);
    const ask = q(`At (${px},${py}) the move is ${m}. visited = {${visited.join(' ')}}. Does add(${key}) return false?`, ['No: a new corner', 'Yes: seen before'], dup ? 1 : 0, dup ? `${key} is already filed.` : `${key} has not been reached.`);
    if (dup) {
      r.frame(`${m} takes us to ${key}, which is already in the set. The path crosses itself. Return true.`, [pv(i), sv(), tvars({ x, y, answer: 'true' }, { x: px, y: py })], ask);
      return r.frames;
    }
    visited.push(key);
    r.frame(`${m} takes us to ${key}: a new corner, so file it. The key is the pair (x, y), so Point needs equals AND hashCode (a record gives both).`, [pv(i), sv([visited.length - 1]), tvars({ x, y }, { x: px, y: py })], ask);
  }
  r.frame('Every corner was new, so the path never crosses itself.', [pv(path.length), sv(), tvars({ answer: 'false' })]);
  return r.frames;
}

// ---- Valid Anagram -----------------------------------------------------------------------------------
export function anagramFrames(s: string, t: string): Frame[] {
  const r = recorder();
  const sv = (i: number): View => ({ kind: 'array', name: 's', values: chars(s), pointers: i < s.length ? [{ at: i, label: 'i', tone: 'blue' }] : [], tones: Object.fromEntries(chars(s).map((_, k) => [k, k <= i ? 'visited' : 'out'] as [number, CellTone])) });
  const tv = (i: number): View => ({ kind: 'array', name: 't', values: chars(t), pointers: i < t.length ? [{ at: i, label: 'i', tone: 'gold' }] : [], tones: Object.fromEntries(chars(t).map((_, k) => [k, k <= i ? 'visited' : 'out'] as [number, CellTone])) });
  if (s.length !== t.length) {
    r.frame(`Lengths differ (${s.length} vs ${t.length}). Different lengths can never be anagrams, so return false before counting anything.`, [sv(-1), tv(-1), tvars({ answer: 'false' })]);
    return r.frames;
  }
  const count = new Map<string, number>();
  const mv = (changed: string[] = []): View => {
    const e = [...count.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return { kind: 'map', name: 'count', entries: e, changed: e.map(([k], idx) => (changed.includes(k) ? idx : -1)).filter(idx => idx >= 0) };
  };
  r.frame('Equal lengths, so one loop can cover both strings. Count letters: +1 for each letter of s, −1 for each letter of t. Position does not matter, only how many of each.', [sv(-1), tv(-1), mv()]);
  for (let i = 0; i < s.length; i++) {
    count.set(s[i], (count.get(s[i]) ?? 0) + 1);
    count.set(t[i], (count.get(t[i]) ?? 0) - 1);
    const same = s[i] === t[i];
    r.frame(same ? `s[${i}] = ${s[i]} adds 1 and t[${i}] = ${t[i]} removes 1: the same letter, so its count is unchanged.` : `s[${i}] = ${s[i]} adds 1 to ${s[i]}; t[${i}] = ${t[i]} subtracts 1 from ${t[i]}. These two counts are now off by one until a later letter cancels them.`,
      [sv(i), tv(i), mv([s[i], t[i]])],
      q(`After s[${i}] = ${s[i]} and t[${i}] = ${t[i]}, what is count[${s[i]}]?`, [String((count.get(s[i]) ?? 0) + 1), String(count.get(s[i])), String((count.get(s[i]) ?? 0) - 1)], 1, `count[${s[i]}] is the number of ${s[i]}s in s so far minus the number in t so far.`));
  }
  const ok = [...count.values()].every(c => c === 0);
  r.frame(ok ? 'Every count is 0: each letter was added exactly as often as it was removed. They are anagrams.' : `Some counts are not 0 (${[...count.entries()].filter(([, c]) => c !== 0).map(([k, c]) => `${k}: ${c}`).join(', ')}), so the letters differ.`, [mv(), tvars({ answer: yn(ok) })]);
  return r.frames;
}

// ---- Group Anagrams ----------------------------------------------------------------------------------
// Final var `answer` = JSON array of groups (words in input order, groups in first-seen order).
export function groupAnagramsFrames(strs: string[]): Frame[] {
  const r = recorder(), groups = new Map<string, string[]>();
  const wv = (i: number): View => ({ kind: 'array', name: 'words', values: strs.map(w => w || '""'), pointers: i < strs.length ? [{ at: i, label: 'word', tone: 'blue' }] : [], tones: Object.fromEntries(strs.map((_, k) => [k, k < i ? 'visited' : k === i ? 'compared' : 'out'] as [number, CellTone])) });
  const mv = (changed: string[] = []): View => {
    const e: [Val, Val][] = [...groups.entries()].map(([k, v]) => [k || '""', `[${v.join(', ')}]`]);
    return { kind: 'map', name: 'groups (key → words)', entries: e, changed: [...groups.keys()].map((k, idx) => (changed.includes(k) ? idx : -1)).filter(idx => idx >= 0) };
  };
  r.frame('Give every word a key that is equal exactly when two words are anagrams: its letters sorted. The map then does the grouping for us.', [wv(0), mv()]);
  strs.forEach((w, i) => {
    const key = sorted(w), existing = groups.has(key);
    groups.set(key, [...(groups.get(key) ?? []), w]);
    r.frame(`"${w}" sorts to "${key}". ${existing ? 'That key already exists, so computeIfAbsent returns the existing list and the word joins it.' : 'No such key yet, so computeIfAbsent creates a new empty list for it.'}`,
      [wv(i), mv([key])],
      key !== w ? q(`What key does "${w}" get?`, [`"${key}": its letters sorted`, `"${w}": its own spelling`], 0, `Every rearrangement sorts to the same string; keying by spelling would keep "eat" and "tea" apart.`) : undefined);
  });
  const out = [...groups.values()];
  r.frame(`All words are filed. ${out.length} group(s): each list holds exactly the words that share a key.`, [mv(), tvars({ groups: out.length, answer: J(out) })]);
  return r.frames;
}

// ---- Longest Consecutive Sequence --------------------------------------------------------------------
// Walks the distinct values in first-appearance order (a Java HashSet's order is arbitrary). answer = best length.
export function longestConsecutiveFrames(nums: number[]): Frame[] {
  const set = [...new Set(nums)], has = new Set(set), r = recorder();
  const tones: Tones = {};
  let best = 0;
  const av = (i: number): View => ({ kind: 'array', name: 'the set (distinct values)', values: set, indices: false, pointers: i < set.length ? [{ at: i, label: 'x', tone: 'blue' }] : [], tones: { ...tones } });
  r.frame('File every number in a set. Then look at each x. If x − 1 is in the set, x is mid-run and its run start will walk past it. Only a number with x − 1 absent starts a walk.', [av(0), tvars({ best })]);
  for (let i = 0; i < set.length; i++) {
    const x = set[i], was = best;
    if (has.has(x - 1)) {
      tones[i] = 'out';
      r.frame(`x = ${x}: ${x - 1} is in the set, so ${x} is in the middle of a run. Skip it: the walk from the run's start will step on it.`, [av(i), tvars({ x, 'x − 1 in set': 'yes', best })],
        q(`x = ${x}. Is ${x - 1} in the set?`, ['Yes: skip x', 'No: start walking from x'], 0, `${x - 1} is present, so x is not the start of its run.`));
      continue;
    }
    let cur = x;
    const stepped = [x];
    while (has.has(cur + 1)) { cur++; stepped.push(cur); }
    best = Math.max(best, cur - x + 1);
    stepped.forEach(v => (tones[set.indexOf(v)] = 'found'));
    r.frame(`x = ${x}: ${x - 1} is absent, so ${x} starts a run. Walk up while the next number is present: ${stepped.join(' → ')}. The walk stops because ${cur + 1} is absent, so the run is ${x}..${cur}, length ${cur} − ${x} + 1 = ${cur - x + 1}. best = ${best}.`,
      [av(i), tvars({ x, 'x − 1 in set': 'no', cur, best }, { x, 'x − 1 in set': 'yes', cur: x, best: was })],
      q(`x = ${x}. Is ${x - 1} in the set?`, ['Yes: skip x', 'No: start walking from x'], 1, `${x - 1} is absent, so ${x} is the smallest number of its run.`));
  }
  r.frame(`Every number was either skipped or walked exactly once, so the whole pass is O(n). The longest run has length ${best}.`, [av(set.length), tvars({ answer: best })]);
  return r.frames;
}

// ---- Encode and Decode Strings -----------------------------------------------------------------------
// Final var `answer` = JSON of the decoded list (equals the input).
export function codecFrames(strs: string[]): Frame[] {
  const r = recorder();
  const lv = (i: number): View => ({ kind: 'array', name: 'strs', values: strs.map(w => (w === '' ? '""' : w)), pointers: i < strs.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones: Object.fromEntries(strs.map((_, k) => [k, k < i ? 'done' : 'out'] as [number, CellTone])) });
  let encoded = '';
  r.frame('Encode: for each string write its length, then #, then the string itself. The decoder will count characters instead of searching for a delimiter.', [lv(0), tvars({ encoded: '""' })]);
  strs.forEach((s, i) => {
    const part = `${s.length}#${s}`;
    encoded += part;
    r.frame(`Append "${part}": the length ${s.length}, a #, and the ${s.length} characters of "${s}". Whatever the string contains, the header says exactly how long it is.`, [lv(i + 1), tvars({ encoded: JSON.stringify(encoded) })]);
  });
  const out: string[] = [];
  let i = 0;
  const cv = (a: number, b: number, c: number, d: number): View => {
    const regions: { from: number; to: number; label?: string; tone?: 'gold' | 'blue' }[] = [];
    if (b >= 0) regions.push({ from: a, to: b, label: 'header', tone: 'blue' });
    if (d >= c) regions.push({ from: c, to: d, label: 'body', tone: 'gold' });
    return { kind: 'array', name: 'encoded', values: chars(encoded), regions, pointers: a < encoded.length ? [{ at: a, label: 'i', tone: 'blue' }] : [] };
  };
  r.frame(`Decode: i = 0 points at the start of a header. Read digits up to the first #, parse the length, then take exactly that many characters.`, [cv(0, -1, 0, -1), tvars({ i: 0, decoded: J(out) })]);
  while (i < encoded.length) {
    const hash = encoded.indexOf('#', i), len = Number(encoded.slice(i, hash));
    const body = encoded.slice(hash + 1, hash + 1 + len), was = i;
    out.push(body);
    i = hash + 1 + len;
    r.frame(`Header "${encoded.slice(was, hash + 1)}" says length ${len}. Take the next ${len} character(s): ${JSON.stringify(body)}, without looking at what they are (a # or a digit inside is just data). Next header starts at ${i}.`,
      [cv(was, hash, hash + 1, hash + len), tvars({ i, length: len, decoded: J(out) }, { i: was, length: -1, decoded: J(out.slice(0, -1)) })],
      q(`i = ${was}. The header reads "${encoded.slice(was, hash)}". How many characters belong to this string?`, [`${len}`, `${len + 1}`, 'Until the next #'], 0, `The length says how many; searching for the next # would break when the data contains a #.`));
  }
  r.frame('i reached the end of the encoded text. The decoded list equals the input, for any contents.', [tvars({ decoded: J(out), answer: J(out) })]);
  return r.frames;
}

// ---- Isomorphic Strings ------------------------------------------------------------------------------
export function isomorphicFrames(s: string, t: string): Frame[] {
  const r = recorder(), fwd = new Map<string, string>(), bwd = new Map<string, string>();
  const row = (name: string, v: string, i: number, tone: 'blue' | 'gold'): View => ({ kind: 'array', name, values: chars(v), pointers: i < v.length ? [{ at: i, label: 'i', tone }] : [], tones: Object.fromEntries(chars(v).map((_, k) => [k, k < i ? 'visited' : k === i ? 'compared' : 'out'] as [number, CellTone])) });
  const mv = (name: string, m: Map<string, string>, changed: string[] = []): View => ({ kind: 'map', name, entries: [...m.entries()], changed: [...m.keys()].map((k, idx) => (changed.includes(k) ? idx : -1)).filter(idx => idx >= 0) });
  r.frame('Two promises: each letter of s always becomes the same letter of t (forward map), and no two letters of s become the same letter of t (backward map). A conflict in either direction means false.', [row('s', s, 0, 'blue'), row('t', t, 0, 'gold'), mv('forward s → t', fwd), mv('backward t → s', bwd)]);
  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = t[i], toB = fwd.get(a), toA = bwd.get(b);
    const views = (): View[] => [row('s', s, i, 'blue'), row('t', t, i, 'gold'), mv('forward s → t', fwd, [a]), mv('backward t → s', bwd, [b])];
    if (toB !== undefined && toB !== b) {
      r.frame(`${a} already maps to ${toB}, but t[${i}] is ${b}. The same letter would become two different letters. Return false.`, [...views(), tvars({ answer: 'false' })], q(`${a} → ${b}, but forward already has ${a} → ${toB}. Result?`, ['Fine, overwrite it', 'Conflict: return false'], 1, 'A letter must always be replaced the same way.'));
      return r.frames;
    }
    if (toA !== undefined && toA !== a) {
      r.frame(`${b} is already the image of ${toA}, but s[${i}] is ${a}. Two different letters would become ${b}. The forward map cannot see this; the backward map does. Return false.`, [...views(), tvars({ answer: 'false' })], q(`${a} → ${b}, forward has no conflict. Backward has ${b} → ${toA}. Result?`, ['Fine, the forward map is consistent', 'Conflict: return false'], 1, 'Two different letters may not share an image.'));
      return r.frames;
    }
    const fresh = toB === undefined;
    fwd.set(a, b); bwd.set(b, a);
    r.frame(fresh ? `${a} → ${b} is new in both maps: record it in both directions.` : `${a} → ${b} matches both maps, so the promise holds.`, views());
  }
  r.frame('No letter broke either promise. Return true.', [mv('forward s → t', fwd), mv('backward t → s', bwd), tvars({ answer: 'true' })]);
  return r.frames;
}

// ---- Contains Duplicate II ---------------------------------------------------------------------------
export function nearbyDuplicateFrames(nums: number[], k: number): Frame[] {
  const r = recorder(), win: number[] = [];
  const nv = (i: number): View => ({
    kind: 'array', name: 'nums', values: nums, pointers: i < nums.length ? [{ at: i, label: 'i', tone: 'blue' }] : [],
    regions: win.length ? [{ from: i - win.length + 1, to: i, label: 'window', tone: 'gold' as const }] : [],
    tones: Object.fromEntries(nums.map((_, j) => [j, j === i ? 'compared' : j < i ? 'visited' : 'out'] as [number, CellTone])),
  });
  const sv = (changed: number[] = [], removed: Val[] = []): View => ({ kind: 'set', name: `window (at most ${k} values)`, items: [...win], changed, removed });
  r.frame(`A repeat only counts if the two positions are at most ${k} apart. So the set keeps just the last ${k} values and forgets anything older.`, [nv(0), sv()]);
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i], before = [...win];
    if (win.includes(x)) {
      r.frame(`add(${x}) returns false: ${x} is among the last ${k} values, so its twin is at most ${k} positions back. Return true.`, [nv(i), sv(), tvars({ i, answer: 'true' })],
        q(`window = {${win.join(', ')}}. Does add(${x}) succeed?`, ['Yes: new', 'No: a twin within k'], 1, `${x} is in the window, which only holds the last ${k} positions.`));
      return r.frames;
    }
    win.push(x);
    let dropped: Val[] = [];
    if (win.length > k) { dropped = [nums[i - k]]; win.splice(win.indexOf(nums[i - k]), 1); }
    r.frame(dropped.length ? `add(${x}) succeeds. The set now holds more than ${k} values, so remove nums[${i} − ${k}] = ${dropped[0]}: it is too far back to match position ${i + 1}.` : `add(${x}) succeeds. The set holds at most ${k} values, so nothing is removed yet.`,
      [nv(i), sv(win.includes(x) ? [win.indexOf(x)] : [], dropped), tvars({ i, size: win.length })],
      q(`window = {${before.join(', ')}}. Does add(${x}) succeed?`, ['Yes: new', 'No: a twin within k'], 0, `${x} is not among the last ${k} values.`));
  }
  r.frame('No value repeated within the window. Return false.', [nv(nums.length), sv(), tvars({ answer: 'false' })]);
  return r.frames;
}

// ---- Top K Frequent Elements -------------------------------------------------------------------------
// Final var `answer` = JSON array of k values, most frequent first.
export function topKFrames(nums: number[], k: number): Frame[] {
  const r = recorder(), freq = new Map<number, number>();
  const nv = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, pointers: i < nums.length ? [{ at: i, label: 'x', tone: 'blue' }] : [], tones: Object.fromEntries(nums.map((_, j) => [j, j <= i ? 'visited' : 'out'] as [number, CellTone])) });
  const fv = (changed: number[] = []): View => ({ kind: 'map', name: 'freq (value → count)', entries: [...freq.entries()], changed });
  r.frame(`Step 1: count each value. Step 2: bucket the values by count, because no count can exceed n = ${nums.length}. Step 3: walk the buckets from the highest count and take ${k} values.`, [nv(-1), fv()]);
  nums.forEach((x, i) => {
    freq.set(x, (freq.get(x) ?? 0) + 1);
    r.frame(`merge(${x}, 1): ${x} has now appeared ${freq.get(x)} time(s).`, [nv(i), fv([[...freq.keys()].indexOf(x)])]);
  });
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [v, f] of freq) buckets[f].push(v);
  const bv = (hot = -1): View => ({
    kind: 'array', name: 'bucket f = values seen exactly f times', values: buckets.map(b => (b.length ? b.join(',') : '·')),
    pointers: hot >= 0 ? [{ at: hot, label: 'f', tone: 'blue' }] : [],
    tones: Object.fromEntries(buckets.map((b, f) => [f, f === hot ? 'compared' : b.length ? 'done' : 'out'] as [number, CellTone])),
  });
  r.frame('Put every value into the bucket numbered by its count. The array index IS the frequency, so the buckets are already sorted by it.', [bv(), fv()]);
  const out: number[] = [];
  for (let f = nums.length; f >= 1 && out.length < k; f--) {
    if (!buckets[f].length) continue;
    for (const x of buckets[f]) if (out.length < k) out.push(x);
    r.frame(`Bucket ${f} holds ${buckets[f].join(', ')}: those appear most often among what is left. Take ${buckets[f].length > 1 ? 'them' : 'it'} until ${k} are chosen. Answer so far: [${out.join(', ')}].`,
      [bv(f), tvars({ f, taken: out.length, 'k': k })]);
  }
  r.frame(`${k} values chosen, highest counts first.`, [tvars({ answer: J(out) })]);
  return r.frames;
}

// ---- Valid Sudoku ------------------------------------------------------------------------------------
// `rows` are 9 strings of 9 chars, '.' for empty. Frames only for filled cells, so use a sparse board.
export function sudokuFrames(rows: string[]): Frame[] {
  const r = recorder();
  const rowS: Set<string>[] = Array.from({ length: 9 }, () => new Set()), colS: Set<string>[] = Array.from({ length: 9 }, () => new Set()), boxS: Set<string>[] = Array.from({ length: 9 }, () => new Set());
  const cells = rows.map(row => chars(row).map(c => (c === '.' ? null : c)));
  const done: { r: number; c: number; tone: CellTone }[] = [];
  const gv = (extra?: { r: number; c: number; tone: CellTone }): View => ({
    kind: 'grid', name: 'board (box = (r / 3) * 3 + c / 3)', cells, rowLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8], colLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    tones: extra ? [...done, extra] : [...done],
  });
  const fmt = (s: Set<string>) => [...s].sort().join(' ') || 'none';
  r.frame('Every row, every column and every 3 × 3 box gets its own small set of digits. For each filled cell: check its digit against the three sets it belongs to, then add it to all three.', [gv()]);
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
    const d = cells[i][j];
    if (d === null) continue;
    const b = Math.floor(i / 3) * 3 + Math.floor(j / 3);
    const clash = rowS[i].has(d) ? `row ${i}` : colS[j].has(d) ? `column ${j}` : boxS[b].has(d) ? `box ${b}` : '';
    if (clash) {
      r.frame(`Cell (${i},${j}) holds ${d}, and ${clash} already has a ${d}. A digit repeats, so the board is invalid.`, [gv({ r: i, c: j, tone: 'swapped' }), tvars({ cell: `(${i},${j})`, digit: d, [`row ${i}`]: fmt(rowS[i]), [`col ${j}`]: fmt(colS[j]), [`box ${b}`]: fmt(boxS[b]), answer: 'false' })],
        q(`Cell (${i},${j}) = ${d}. Row ${i} has {${fmt(rowS[i])}}, column ${j} has {${fmt(colS[j])}}, box ${b} has {${fmt(boxS[b])}}. Valid so far?`, ['Yes', 'No: a repeat'], 1, `${d} is already in ${clash}.`));
      return r.frames;
    }
    const before = { row: fmt(rowS[i]), col: fmt(colS[j]), box: fmt(boxS[b]) };
    rowS[i].add(d); colS[j].add(d); boxS[b].add(d);
    done.push({ r: i, c: j, tone: 'visited' });
    r.frame(`Cell (${i},${j}) holds ${d}. It belongs to row ${i}, column ${j} and box ${b} = (${i} / 3) * 3 + ${j} / 3. None of the three sets has a ${d}, so add it to all three.`,
      [gv({ r: i, c: j, tone: 'compared' }), tvars({ cell: `(${i},${j})`, digit: d, box: b, [`row ${i}`]: fmt(rowS[i]), [`col ${j}`]: fmt(colS[j]), [`box ${b}`]: fmt(boxS[b]) }, { cell: '', digit: '', box: -1, [`row ${i}`]: before.row, [`col ${j}`]: before.col, [`box ${b}`]: before.box })],
      q(`Which box number does cell (${i},${j}) belong to?`, [`${b}`, `${Math.floor(i / 3) + Math.floor(j / 3)}`, `${i + j}`].filter((x, k, a) => a.indexOf(x) === k), 0, `(${i} / 3) * 3 + ${j} / 3 = ${b}. Adding the two quotients without the * 3 would give boxes that collide.`));
  }
  r.frame('Every filled cell passed all three checks. The board is valid (it need not be solvable).', [gv(), tvars({ answer: 'true' })]);
  return r.frames;
}

// ---- Happy Number ------------------------------------------------------------------------------------
export function happyFrames(n0: number): Frame[] {
  const r = recorder(), seen: number[] = [];
  const digits = (n: number) => String(n).split('').map(Number);
  const next = (n: number) => digits(n).reduce((a, d) => a + d * d, 0);
  const sv = (changed: number[] = []): View => ({ kind: 'set', name: 'seen', items: [...seen], changed });
  let n = n0;
  r.frame(`Replace n by the sum of the squares of its digits, again and again. If it reaches 1 it is happy. If it ever repeats a value it is in a cycle and never reaches 1, so a set of seen values detects that.`, [sv(), tvars({ n })]);
  while (n !== 1) {
    if (seen.includes(n)) {
      r.frame(`${n} is already in the set: the sequence has looped without reaching 1. Return false.`, [sv(), tvars({ n, answer: 'false' })]);
      return r.frames;
    }
    seen.push(n);
    const nx = next(n);
    r.frame(`${n} is new, so file it. Next value: ${digits(n).map(d => `${d}²`).join(' + ')} = ${digits(n).map(d => d * d).join(' + ')} = ${nx}.`,
      [sv([seen.length - 1]), tvars({ n: nx }, { n })],
      q(`n = ${n}. What is the sum of the squares of its digits?`, [String(nx), String(nx + 1), String(nx + 2)], 0, `${digits(n).map(d => `${d}²`).join(' + ')} = ${nx}.`));
    n = nx;
  }
  r.frame('n reached 1, which maps to itself. Return true.', [sv(), tvars({ n, answer: 'true' })]);
  return r.frames;
}

// ---- First Unique Character --------------------------------------------------------------------------
// Final var `answer` = index or -1.
export function firstUniqueFrames(s: string): Frame[] {
  const r = recorder(), count = new Map<string, number>();
  const sv = (i: number, tone: CellTone = 'visited', hit = -1): View => ({
    kind: 'array', name: 's', values: chars(s), pointers: i >= 0 && i < s.length ? [{ at: i, label: 'i', tone: 'blue' }] : [],
    tones: Object.fromEntries(chars(s).map((_, k) => [k, k === hit ? 'found' : k === i ? 'compared' : k < i ? tone : 'out'] as [number, CellTone])),
  });
  const cv = (changed: string[] = []): View => {
    const e = [...count.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return { kind: 'map', name: 'count', entries: e, changed: e.map(([k], idx) => (changed.includes(k) ? idx : -1)).filter(idx => idx >= 0) };
  };
  r.frame('Pass 1 counts every letter. Counts alone have forgotten the order, so pass 2 walks the string again and returns the first index whose count is 1.', [sv(-1), cv()]);
  chars(s).forEach((c, i) => {
    count.set(c, (count.get(c) ?? 0) + 1);
    r.frame(`Pass 1: ${c} has now been seen ${count.get(c)} time(s).`, [sv(i), cv([c])]);
  });
  for (let i = 0; i < s.length; i++) {
    const c = s[i], once = count.get(c) === 1;
    if (once) {
      r.frame(`Pass 2: count[${c}] = 1, so ${c} appears exactly once. It is the first such letter in string order: index ${i}.`, [sv(i, 'visited', i), cv([c]), tvars({ answer: i })],
        q(`Pass 2 at index ${i}, letter ${c}. count[${c}] = 1. What now?`, ['Return this index', 'Keep scanning'], 0, 'The string is scanned in order, so the first count of 1 is the first unique letter.'));
      return r.frames;
    }
    r.frame(`Pass 2: count[${c}] = ${count.get(c)}, so ${c} repeats. Not unique; keep walking the string (not the counts: they are in alphabetical order, not string order).`, [sv(i), cv([c])],
      q(`Pass 2 at index ${i}, letter ${c}. count[${c}] = ${count.get(c)}. What now?`, ['Return this index', 'Keep scanning'], 1, `${c} appears ${count.get(c)} times, so it is not unique.`));
  }
  r.frame('Every letter repeats, so there is no unique character. Return −1.', [cv(), tvars({ answer: -1 })]);
  return r.frames;
}
