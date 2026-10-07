// Independent practice for the Hashing & Sets lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  seen: 'Remember what you have already met; ask before you record',
  count: 'Count each value or letter, then compare or scan the counts',
  key: 'Give equivalent items one shared key, and group by it',
  runs: 'Store everything for instant membership; begin only where nothing comes before',
  frame: 'Say how long each piece is before the piece itself',
  twoWay: 'Keep a pairing in both directions',
  other: 'Another tool fits better than a lookup table here',
} as const;

export const conceptIds = [
  'duplicate', 'two-sum', 'path', 'anagram', 'group', 'streak', 'frames',
  'isomorphic', 'nearby', 'top-k', 'sudoku', 'happy', 'first-unique', 'sorted-pair', 'ordered',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const words = (ws: string[]) => `[${ws.map(w => `"${w}"`).join(', ')}]`;
const rotate = <T,>(a: T[], by: number): T[] => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);
const rotateText = (s: string, by: number) => rotate([...s], by).join('');
const sortedKey = (w: string) => [...w].sort().join('');

// Small, deliberately plain helpers (the tests recompute every answer independently).
const pairOf = (a: number[], t: number): [number, number] => {
  for (let j = 0; j < a.length; j++) for (let i = 0; i < j; i++) if (a[i] + a[j] === t) return [i, j];
  return [-1, -1];
};
const walk = (path: string) => {
  const seen = ['0,0'];
  let x = 0, y = 0;
  for (const c of path) {
    if (c === 'N') y++; else if (c === 'S') y--; else if (c === 'E') x++; else x--;
    if (seen.includes(`${x},${y}`)) return true;
    seen.push(`${x},${y}`);
  }
  return false;
};
const digitSquares = (n: number) => String(n).split('').reduce((s, d) => s + Number(d) ** 2, 0);
const happy = (n: number) => { const seen: number[] = []; while (n !== 1 && !seen.includes(n)) { seen.push(n); n = digitSquares(n); } return n === 1; };
const pack = (list: string[]) => list.map(s => `${s.length}#${s}`).join('');

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'duplicate': {
      const bases = [[1, 2, 3, 1], [1, 2, 3, 4], [1, 1, 1, 3, 3, 4, 3, 2, 4, 2], [7], [-2, 5, 9, -2], [4, 8, 15, 16, 23, 42]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length).map(x => x + 10 * (v % 3));
      const answer = new Set(a).size < a.length;
      return {
        topic: 'Has anything appeared before?', section: 'contains-duplicate', strategy: 'seen',
        prompt: `Does ${arr(a)} contain any value more than once? Aim for one pass.`,
        question: 'Enter yes or no.', answer,
        hints: ['Comparing every pair is O(n²). What could you keep as you read?', 'Keep the values you have met so far in a structure with O(1) expected membership.', 'Before keeping a value, ask whether it is already kept; the first “yes” ends the search.'],
        rubric: ['One pass; each value is checked against everything earlier in O(1) expected time.', 'The add-and-check is a single step: add returns false on a repeat.', 'O(n) expected time, O(n) space. Sorting and comparing neighbours is the O(n log n), low-memory alternative.'],
        explanation: answer ? 'At least one value repeats.' : 'Every value is distinct.',
      };
    }
    case 'two-sum': {
      const bases: [number[], number][] = [[[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0], [[5, 1, 9, 12, 4], 21], [[10, -7, 3, 8], 1]];
      const [base, t] = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = pairOf(a, t);
      return {
        topic: 'A partner that already passed by', section: 'two-sum', strategy: 'seen',
        prompt: `In ${arr(a)}, exactly two positions hold values that add up to ${t}. The values are in no particular order. Return the two positions (counting from 0), smaller first, in one pass.`,
        question: 'Enter the two positions.', answer,
        hints: ['Holding x, which value would complete the pair?', 'Remember every value you have read, with its position.', 'At each position, first look for target − x among the remembered values, then remember x.'],
        rubric: ['Each value’s partner is target − x; one lookup per position.', 'Look up before recording, so a value never pairs with itself.', 'O(n) expected time, O(n) space; positions are preserved, which sorting would lose.'],
        explanation: `Positions ${answer[0]} and ${answer[1]}: ${a[answer[0]]} + ${a[answer[1]]} = ${t}.`,
      };
    }
    case 'path': {
      const bases = ['NES', 'NESWW', 'NNSS', 'EENNWWS', 'NEESSWWN', 'ENWNES', 'EEEE', 'NESWNESW'];
      const turn: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };
      let p = bases[v % bases.length];
      for (let r = 0; r < Math.floor(v / bases.length) % 4; r++) p = [...p].map(c => turn[c]).join('');
      const answer = walk(p);
      return {
        topic: 'Remembering pairs of numbers', section: 'custom-keys', strategy: 'seen',
        prompt: `A courier starts at (0, 0) and follows the moves "${p}": N, S, E and W each move one block. Does she ever stand on a corner she has already visited, including the start?`,
        question: 'Enter yes or no.', answer,
        hints: ['Each corner is a pair (x, y). What would you need to remember, and how would you look it up quickly?', 'Store every visited corner, starting with (0, 0). The stored thing must compare and fingerprint by both coordinates.', 'After each move, try to store the new corner; if it was already stored, the answer is yes.'],
        rubric: ['The start corner is stored before the first move.', 'The corner key uses both x and y for equality and for its fingerprint (a record, or a string with a separator).', 'O(n) expected time and space for n moves.'],
        explanation: answer ? 'Some corner is visited twice.' : 'Every corner on the route is new.',
      };
    }
    case 'anagram': {
      const bases: [string, string][] = [['anagram', 'nagaram'], ['rat', 'car'], ['ab', 'abb'], ['listen', 'silent'], ['aabbcc', 'abcabc'], ['aab', 'abb'], ['night', 'thing'], ['ab', 'abx']];
      const [s, t0] = bases[v % bases.length];
      const t = rotateText(t0, Math.floor(v / bases.length) % t0.length);
      const answer = sortedKey(s) === sortedKey(t);
      return {
        topic: 'Same letters, any order', section: 'valid-anagram', strategy: 'count',
        prompt: `Are "${s}" and "${t}" made of exactly the same letters, each used the same number of times? Only lowercase letters a–z appear.`,
        question: 'Enter yes or no.', answer,
        hints: ['Positions don’t matter, only how many of each letter.', 'Different lengths can never match. With 26 possible letters, a small array can count them.', 'Add 1 for each letter of the first word and subtract 1 for each letter of the second; check that everything ends at 0.'],
        rubric: ['A length check first.', 'A 26-slot count array: +1 for one word, −1 for the other, all zero at the end.', 'O(n) time, O(1) extra space; for any Unicode text, a map keyed by code point.'],
        explanation: answer ? 'Every letter count matches.' : 'Some letter count differs.',
      };
    }
    case 'group': {
      const bases = [['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], ['', '', 'a'], ['abc', 'bca', 'cab', 'xyz', 'zyx', 'yxz', 'abd'], ['a'], ['ab', 'ba', 'abc', 'cab', 'bca', 'b'], ['stop', 'pots', 'tops', 'spot', 'post', 'opts']];
      const base = bases[v % bases.length];
      const ws = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = new Set(ws.map(sortedKey)).size;
      return {
        topic: 'Which ones belong together?', section: 'group-anagrams', strategy: 'key',
        prompt: `Words: ${words(ws)}. Two words belong to the same group exactly when one is a rearrangement of the other’s letters. How many groups are there?`,
        question: 'Enter the number of groups.', answer,
        hints: ['What does every rearrangement of a word have in common that no other word has?', 'Sorting a word’s letters gives the same result for all of its rearrangements.', 'Group words by that sorted form; the number of distinct forms is the answer.'],
        rubric: ['Each word maps to a key that is equal exactly for rearrangements (sorted letters, or counts with separators).', 'One pass builds the groups with computeIfAbsent.', 'O(n · k log k) with sorted keys, O(n · (k + 26)) with count keys.'],
        explanation: `There are ${answer} group(s).`,
      };
    }
    case 'streak': {
      const bases = [[100, 4, 200, 1, 3, 2], [0, 3, 7, 2, 5, 8, 4, 6, 0, 1], [1, 2, 0, 1], [9, -1, 0, -2, 10], [5], [10, 30, 20]];
      const base = bases[v % bases.length];
      const shift = 3 * (Math.floor(v / bases.length) % 5) - 4;
      const a = rotate(base, v % base.length).map(x => x + shift);
      const distinct = [...new Set(a)].sort((x, y) => x - y);
      let answer = distinct.length ? 1 : 0;
      for (let i = 1, run = 1; i < distinct.length; i++) { run = distinct[i] === distinct[i - 1] + 1 ? run + 1 : 1; answer = Math.max(answer, run); }
      return {
        topic: 'Unbroken runs in unsorted data', section: 'longest-consecutive', strategy: 'runs',
        prompt: `The integers ${arr(a)} are in no particular order. How long is the longest run of consecutive integers (like 4, 5, 6, 7) whose values all appear? Aim for O(n).`,
        question: 'Enter the length.', answer,
        hints: ['Sorting is O(n log n). Which yes/no question about x − 1 tells you that x begins a run?', 'Put every value where membership costs O(1). A run begins at x exactly when x − 1 is missing.', 'From each run beginning, step x + 1, x + 2, … while present; the longest walk is the answer.'],
        rubric: ['All values stored for O(1) expected membership; duplicates collapse.', 'Walks start only where x − 1 is absent, so each value is walked exactly once.', 'O(n) expected time and space; the length is cur − start + 1 when the walk stops.'],
        explanation: `The longest run has length ${answer}.`,
      };
    }
    case 'frames': {
      const pool = [['ab'], ['a#b', '', 'c'], ['', ''], ['12', '#', '3#4'], ['hello world', '#'], ['x', '', '', 'yz#'], ['', '9#9#', 'q'], ['##']];
      const list = rotate(pool[v % pool.length], Math.floor(v / pool.length) % Math.max(1, pool[v % pool.length].length));
      const packed = pack(list);
      return {
        topic: 'Packing many strings into one', section: 'encode-decode', strategy: 'frame',
        prompt: `A sender packs a list of strings into one string so the receiver can unpack the list exactly. The strings may contain any characters, including # and digits, and may be empty. Two packed examples: ["ab"] → "2#ab", and ["", "x#"] → "0#2#x#". The receiver gets "${packed}". How many strings were in the list?`,
        question: 'Enter the number of strings.', answer: list.length,
        hints: ['Look at the examples: what does the number before each # tell the receiver?', 'It is a count of characters. After reading it, the receiver takes exactly that many characters, whatever they are.', 'Repeat: read digits up to the next #, take that many characters, continue from there. Count the strings.'],
        rubric: ['The number before # is the length of the next string, not a separator position.', 'Characters inside a string are never inspected, so # and digits in the data are harmless.', 'An empty string is “0#”; an empty list is the empty string. Linear time in the packed length.'],
        explanation: `Unpacked, the list holds ${list.length} string(s): ${words(list)}. Splitting on # would get it wrong.`,
      };
    }
    case 'isomorphic': {
      const bases: [string, string][] = [['egg', 'add'], ['foo', 'bar'], ['paper', 'title'], ['badc', 'baba'], ['ab', 'aa'], ['abcabc', 'xyzxyz'], ['aa', 'ab'], ['abba', 'cddc']];
      const [s0, t0] = bases[v % bases.length];
      const r = Math.floor(v / bases.length) % s0.length;
      const s = rotateText(s0, r), t = rotateText(t0, r);
      let answer = true;
      for (let i = 0; i < s.length; i++) for (let j = 0; j < s.length; j++) if ((s[i] === s[j]) !== (t[i] === t[j])) answer = false;
      return {
        topic: 'A consistent replacement', section: 'isomorphic', strategy: 'twoWay',
        prompt: `Can "${s}" be turned into "${t}" by replacing letters, where every occurrence of a letter is replaced by the same letter, and no two different letters are replaced by the same letter? (A letter may stay itself.)`,
        question: 'Enter yes or no.', answer,
        hints: ['Checking that each letter of the first word is always replaced the same way is only half the rule.', 'Two different letters of the first word must not end up as the same letter of the second.', 'Keep the pairing in both directions; any conflict in either direction means no.'],
        rubric: ['Forward: each letter of s always becomes the same letter of t.', 'Backward: each letter of t comes from only one letter of s.', 'O(n) time; compare boxed Characters with equals, not ==.'],
        explanation: answer ? 'The pairing is consistent both ways.' : 'Some pairing conflicts in one direction.',
      };
    }
    case 'nearby': {
      const bases: [number[], number][] = [[[1, 2, 3, 1], 3], [[1, 0, 1, 1], 1], [[1, 2, 3, 1, 2, 3], 2], [[5, 6, 5], 1], [[9], 0], [[4, 4], 0], [[7, 3, 8, 3], 2], [[2, 9, 6, 2], 2]];
      const [base, k] = bases[v % bases.length];
      const a = Math.floor(v / bases.length) % 2 ? [...base].reverse() : base;
      let answer = false;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] === a[j] && j - i <= k) answer = true;
      return {
        topic: 'Twins that are close together', section: 'nearby-duplicate', strategy: 'seen',
        prompt: `In ${arr(a)}, are there two different positions i and j holding equal values with |i − j| ≤ ${k}?`,
        question: 'Enter yes or no.', answer,
        hints: ['Which earlier positions could still hold a twin of the value at position i?', `Only the last ${k} positions. Remember just those values.`, 'Add each value; if it is already among the remembered ones, answer yes; then forget the value that is now too far back.'],
        rubric: ['Only the last k values are kept, so any repeat found is within distance k.', 'Check-and-add first, then evict nums[i − k] once more than k values are kept.', 'O(n) expected time, O(min(n, k)) space.'],
        explanation: answer ? 'A twin lies within distance k.' : 'No twins lie within distance k.',
      };
    }
    case 'top-k': {
      const bases: [number[], number][] = [[[1, 1, 1, 2, 2, 3], 2], [[1], 1], [[4, 4, 4, 6, 6, 9, 9, 9, 9, 2], 2], [[5, -1, 5, -1, 5, 7, -1, -1], 1], [[3, 0, 3, 8, 0, 3, 8, 1], 3], [[6, 6, 2, 2, 2, 9], 2]];
      const [base, k] = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const freq = new Map<number, number>();
      for (const x of a) freq.set(x, (freq.get(x) ?? 0) + 1);
      const answer = [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, k).map(([x]) => x).sort((x, y) => x - y);
      return {
        topic: 'The most frequent values', section: 'top-k', strategy: 'count',
        prompt: `Return the ${k} value(s) that occur most often in ${arr(a)}, in increasing order. (The answer is unique.) Aim for better than O(n log n).`,
        question: 'Enter the values.', answer,
        hints: ['First count how often each value appears.', 'No count can be larger than n. Could the counts index an array?', 'Place each value in a bucket numbered by its count, then read buckets from n down until you have k values.'],
        rubric: ['One counting pass with a map.', 'Buckets indexed 0..n by frequency avoid sorting the counts.', 'O(n) expected time overall; a heap of size k gives O(n log k).'],
        explanation: `The ${k} most frequent value(s): ${arr(answer)}.`,
      };
    }
    case 'sudoku': {
      const bases: [number, number, number][][] = [
        [[0, 3, 5], [3, 0, 5], [4, 4, 7]],
        [[0, 0, 5], [1, 1, 5]],
        [[2, 2, 3], [2, 7, 3]],
        [[1, 4, 9], [4, 1, 9], [7, 7, 9]],
        [[0, 0, 1], [8, 0, 1]],
        [[3, 3, 6], [5, 5, 6], [4, 0, 6]],
        [[6, 2, 8], [7, 4, 8], [8, 6, 8]],
        [[0, 8, 2], [2, 6, 2], [8, 8, 4]],
      ];
      const base = bases[v % bases.length];
      const cells = Math.floor(v / bases.length) % 2 ? base.map(([r, c, d]) => [c, r, d] as [number, number, number]) : base;
      let answer = true;
      for (const [r1, c1, d1] of cells) for (const [r2, c2, d2] of cells) {
        if ((r1 !== r2 || c1 !== c2) && d1 === d2 && (r1 === r2 || c1 === c2 || (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3)))) answer = false;
      }
      return {
        topic: 'Many small no-repeat rules at once', section: 'sudoku', strategy: 'seen',
        prompt: `A 9 × 9 grid (rows and columns 0..8, split into nine 3 × 3 boxes) has only these filled cells, written (row, column, digit): ${cells.map(([r, c, d]) => `(${r}, ${c}, ${d})`).join(', ')}. Is it valid, with no digit repeated in any row, any column or any 3 × 3 box? (It does not have to be solvable.)`,
        question: 'Enter yes or no.', answer,
        hints: ['Every filled cell belongs to one row, one column and one box.', 'Keep a record of the digits seen in each of the 27 groups. Number the boxes (r / 3) * 3 + c / 3.', 'For each cell, if its digit is already in its row, column or box record, the grid is invalid; otherwise add it to all three.'],
        rubric: ['Three records per cell: row r, column c, box (r / 3) * 3 + c / 3.', 'The box number must separate boxes: r / 3 + c / 3 would merge different boxes.', 'Constant work for a 9 × 9 board; only filled cells are checked.'],
        explanation: answer ? 'No row, column or box repeats a digit.' : 'Some row, column or box repeats a digit.',
      };
    }
    case 'happy': {
      const starts = [19, 2, 7, 20, 100, 116, 1, 44, 89, 97, 145, 13, 4, 68];
      const n = starts[v % starts.length];
      const answer = happy(n);
      return {
        topic: 'A sequence that might loop forever', section: 'happy-number', strategy: 'seen',
        prompt: `Start from ${n}. Repeatedly replace the number by the sum of the squares of its digits. Does it ever reach 1?`,
        question: 'Enter yes or no.', answer,
        hints: ['If it never reaches 1, the numbers must start repeating. Why?', 'Numbers with four or more digits always shrink, so only a few hundred values are possible. Remember every value you have met.', 'Stop when you reach 1 (yes) or meet a value you have already seen (no).'],
        rubric: ['The sequence is trapped among finitely many values, so it reaches 1 or repeats.', 'A record of seen values detects the repeat; Floyd’s slow/fast walkers do it in O(1) space.', 'The only other cycle is 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4.'],
        explanation: answer ? `${n} reaches 1.` : `${n} falls into the cycle through 4 and never reaches 1.`,
      };
    }
    case 'first-unique': {
      const bases = ['leetcode', 'loveleetcode', 'aabb', 'z', 'abcabd', 'xxyzzy', 'stress'];
      const base = bases[v % bases.length];
      const s = rotateText(base, Math.floor(v / bases.length) % base.length);
      let answer = -1;
      for (let i = 0; i < s.length && answer < 0; i++) if (s.split('').filter(c => c === s[i]).length === 1) answer = i;
      return {
        topic: 'First of its kind', section: 'first-unique', strategy: 'count',
        prompt: `In "${s}", what is the position (counting from 0) of the first character that appears exactly once? Answer −1 if there is none.`,
        question: 'Enter the position.', answer,
        hints: ['Counting finds the characters that appear once, but which of them comes first?', 'Count every letter in one pass; the string itself still holds the order.', 'In a second pass over the string, return the first position whose letter has count 1.'],
        rubric: ['One pass to count into a 26-slot array.', 'The second pass walks the string, not the counts, so the first unique position wins.', 'O(n) time, O(1) extra space.'],
        explanation: answer >= 0 ? `Position ${answer}, “${s[answer]}”.` : 'Every character repeats.',
      };
    }
    case 'sorted-pair': {
      const bases: [number[], number][] = [[[1, 3, 4, 6, 8, 11], 10], [[2, 7, 11, 15], 9], [[-5, -2, 0, 3, 9], 7], [[1, 2, 5, 9, 14], 23], [[-3, 1, 4, 6, 12], 7]];
      const [base, t] = bases[v % bases.length];
      const shift = Math.floor(v / bases.length) % 4;
      const a = base.map(x => x + shift), target = t + 2 * shift;
      const answer = pairOf(a, target);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `The values ${arr(a)} are sorted in increasing order. Exactly two positions hold values that add up to ${target}. Return the two positions (counting from 0), smaller first, using O(1) extra space.`,
        question: 'Enter the two positions.', answer,
        hints: ['The input is sorted, and you may not use extra memory. What does a sum that is too small tell you?', 'Start one marker at each end.', 'If the sum is too small, move the left marker right; too big, move the right marker left; stop when it matches.'],
        rubric: ['Sorted input plus an O(1) space limit rules out remembering values.', 'Each comparison discards one end value for good.', 'O(n) time, O(1) space.'],
        explanation: `Positions ${answer[0]} and ${answer[1]}: ${a[answer[0]]} + ${a[answer[1]]} = ${target}. Sorted input and O(1) space call for two markers from the ends.`,
      };
    }
    case 'ordered': {
      const bases: [number[], number][] = [[[50, 20, 80, 35, 65], 40], [[7, 3, 9, 1], 4], [[12, 5, 30, 18], 18], [[-4, 10, 2, -9], -5], [[6, 2, 4], 6]];
      const [base, x] = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const above = a.filter(y => y > x);
      const answer = above.length ? Math.min(...above) : -1;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Numbers arrive one at a time: ${arr(a)}. Queries like “what is the smallest number so far that is strictly greater than x?” interleave with the arrivals, 100,000 of each, so every operation must take O(log n). After all of these numbers have arrived, answer the query for x = ${x} (or −1 if there is none).`,
        question: 'Enter the number.', answer,
        hints: ['The question is about order: the next value above x.', 'A structure that keeps its values sorted as they arrive can answer “next above x” directly.', 'A balanced search tree (TreeSet in Java) gives higher(x) in O(log n) per query and per insert.'],
        rubric: ['Membership alone can’t answer “next above x”; order is needed.', 'TreeSet.add and TreeSet.higher are O(log n) each.', 'Re-sorting after every arrival would cost O(n log n) per operation.'],
        explanation: answer === -1 ? `No stored number is above ${x}.` : `The smallest stored number above ${x} is ${answer}. Order questions call for a TreeSet, not a HashSet.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-hashing-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
