// Independent practice for the Linked Lists lesson. Prompts never name the technique; inputs vary with `variant`.
// Chains are written as "1 → 2 → 3". Answers that are chains are typed as comma-separated values.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  couriers: 'Two walkers at different speeds (one hop vs two)',
  gap: 'Two walkers kept a fixed number of hops apart',
  switch: 'Two walkers that swap chains to equalise their distance',
  reverse: 'Reverse next pointers in place',
  splice: 'Dummy head + tail pointer: splice nodes into a new chain',
  compose: 'Chain several list moves (split at the middle, reverse, weave or merge)',
  clone: 'Clone nodes with an old→new map or interleaved copies',
  cache: 'Hash map + doubly linked list',
  measure: 'Count the length, then walk to a computed position',
  other: 'Use another tool; list pointer moves do not fit',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = ['middle', 'cycle', 'nth-end', 'duplicate', 'reverse', 'reverse-between', 'k-group', 'merge', 'reorder', 'copy-random', 'lru', 'cycle-entrance', 'palindrome', 'intersection', 'add-two', 'rotate', 'sort-list', 'other'] as const;
type ConceptId = typeof conceptIds[number];

// Small deterministic generator so each variant is a different, reproducible input.
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % max; };
}
const chain = (a: number[]) => a.join(' → ');
const arr = (a: number[]) => `[${a.join(', ')}]`;
const ord = (k: number) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? 'th' : k % 10 === 1 ? 'st' : k % 10 === 2 ? 'nd' : k % 10 === 3 ? 'rd' : 'th'}`;
function distinct(r: (m: number) => number, count: number, max: number): number[] {
  const out: number[] = [];
  while (out.length < count) { const x = 1 + r(max); if (!out.includes(x)) out.push(x); }
  return out;
}
const values = (r: (m: number) => number, count: number, max = 9) => Array.from({ length: count }, () => 1 + r(max));
function shuffle<T>(r: (m: number) => number, a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = r(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
// Island 0 starts the trip; islands are visited in a shuffled order; the last one either loops back or ends (-1).
function ferryTable(r: (m: number) => number, n: number, loopTo: number | null): number[] {
  const order = [0, ...shuffle(r, Array.from({ length: n - 1 }, (_, i) => i + 1))];
  const next = Array(n).fill(-1);
  for (let i = 0; i + 1 < n; i++) next[order[i]] = order[i + 1];
  next[order[n - 1]] = loopTo === null ? -1 : order[loopTo];
  return next;
}
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const r = rng(variant * 97 + conceptIds.indexOf(id) * 7919 + 13);
  const listQ = 'Enter the values in order, separated by commas.';
  const base = { id, question: 'Enter only the result.' };
  const make = (c: Omit<Challenge, 'id' | 'question'> & { question?: string; strategy: Strategy }): Challenge => ({ ...base, ...c });
  switch (id) {
    case 'middle': {
      const len = 5 + (variant % 4), a = distinct(r, len, 40), even = len % 2 === 0, which = variant % 8 < 4 ? 'second' : 'first';
      const answer = !even ? a[(len - 1) / 2] : which === 'second' ? a[len / 2] : a[len / 2 - 1];
      return make({ topic: 'The centre in one walk', section: 'find-the-middle', strategy: 'couriers', prompt: `A one-way chain holds ${chain(a)}. Return the value of its centre node${even ? `; with two centre nodes, return the ${which} one` : ''}. Walk it once: you do not know the length in advance.`, answer,
        hints: ['If one walker moves twice as fast, where is the other when it finishes?', 'Both start on the head; the guard is fast != null && fast.next != null.', even && which === 'first' ? 'For the first of two centres, start the fast walker one node ahead.' : 'The slow walker is the answer when the loop stops.'],
        rubric: ['slow moves one node per turn, fast moves two.', 'When fast cannot take two more steps, slow has covered half the distance.', 'Starting fast at head gives the second middle; starting it at head.next gives the first.'],
        explanation: `The centre is ${answer}. One walk, O(1) extra memory.` });
    }
    case 'cycle': {
      const n = 5 + (variant % 3), loops = variant % 2 === 0, next = ferryTable(r, n, loops ? r(n) : null), flag = 1 + r(9);
      return make({ topic: 'Does the trip ever end?', section: 'detect-a-cycle', strategy: 'couriers', prompt: `Island i's only ferry goes to island next[i]; -1 means it leads nowhere. next = ${arr(next)}. Every island flies the same flag, ${flag}. Starting from island 0 and using O(1) extra memory, can a traveller sail forever?`, question: 'Enter yes or no.', answer: loops,
        hints: ['An end means no loop. What would two travellers at different speeds do on a loop?', 'One takes one ferry per turn, the other two. Compare islands, never flags.', 'A meeting proves a loop; the fast one reaching -1 proves an end.'],
        rubric: ['Both start on island 0; compare only after moving.', 'Inside a loop the gap shrinks by exactly one per turn, so they must meet.', 'Every flag is identical, so comparing values would claim a loop on every chain.'],
        explanation: loops ? 'The trip loops: the two travellers meet on the same island.' : 'The trip ends at a -1 ferry, so there is no loop.' });
    }
    case 'nth-end': {
      const len = 4 + (variant % 4), a = values(r, len), n = 1 + ((variant + r(len)) % len);
      const answer = a.filter((_, i) => i !== len - n);
      return make({ topic: 'Count from the far end', section: 'nth-from-end', strategy: 'gap', prompt: `Chain ${chain(a)}. Delete the node that is ${ord(n)} from the end (the last node is 1st) in a single pass, and give the chain that remains.`, question: listQ, answer,
        hints: ['A one-way chain cannot be walked backwards. Can a fixed gap stand in for counting from the end?', 'Start two walkers on a dummy in front of the head.', `Open a gap of n + 1 = ${n + 1} hops, walk both until the leader is null, then re-tie the trailer past its next node.`],
        rubric: ['The dummy covers deleting the head.', 'A gap of n + 1 leaves the trailer one node BEFORE the target.', 'Re-tie trail.next = trail.next.next and return dummy.next.'],
        explanation: `Removing the ${ord(n)} from the end leaves ${chain(answer)}.` });
    }
    case 'duplicate': {
      const n = 4 + (variant % 4), d = 1 + r(n), copies = 2 + (variant % 3 === 2 ? 1 : 0);
      const others = shuffle(r, Array.from({ length: n }, (_, i) => i + 1).filter(x => x !== d)).slice(0, n + 1 - copies);
      const nums = shuffle(r, [...Array(copies).fill(d), ...others]);
      return make({ topic: 'A hidden chain inside an array', section: 'find-the-duplicate', strategy: 'couriers', prompt: `An array of ${n + 1} values, each between 1 and ${n}: ${arr(nums)}. Exactly one value repeats (it may appear more than twice). Find it without modifying the array, using O(1) extra memory.`, answer: d,
        hints: ['Read each value as "the next index to visit". What shape appears?', 'From index 0 the walk enters a loop; the loop\'s entrance has two arrows pointing at it.', 'Race two walkers to a meeting, restart one at 0, then step both singly until they meet.'],
        rubric: ['Index 0 is never a target, so the walk from 0 starts on a tail.', 'Two indexes pointing at one index is the duplicate — that index is the loop\'s entrance.', 'Phase 2 works because head-to-entrance equals meeting-point-to-entrance modulo the loop length.'],
        explanation: `${d} is the value written in two places; it is the entrance of the loop reached from index 0.` });
    }
    case 'reverse': {
      const a = values(r, 4 + (variant % 4));
      return make({ topic: 'Turn every arrow around', section: 'reverse-the-chain', strategy: 'reverse', prompt: `Chain ${chain(a)}. Turn every ferry around in place using O(1) extra memory, and read the chain from its new head.`, question: listQ, answer: [...a].reverse(),
        hints: ['What do you lose the moment you re-tie one node\'s arrow?', 'prev, cur, and a saved next.', 'Save next, flip, advance prev, advance cur. Return prev.'],
        rubric: ['Save cur.next before flipping, or the rest of the chain is lost.', 'prev is always the head of the reversed part.', 'Stop when cur is null; return prev, not cur or head.'],
        explanation: `The new chain is ${chain([...a].reverse())}.` });
    }
    case 'reverse-between': {
      const len = 5 + (variant % 4), a = values(r, len), left = 1 + r(len - 1), right = left + 1 + r(len - left);
      const answer = [...a.slice(0, left - 1), ...a.slice(left - 1, right).reverse(), ...a.slice(right)];
      return make({ topic: 'Flip one stretch', section: 'reverse-a-stretch', strategy: 'reverse', prompt: `Chain ${chain(a)}. Reverse only positions ${left} through ${right} (counting from 1), in place and in one pass.`, question: listQ, answer,
        hints: ['The flip itself is familiar. What is new is where the stretch meets the rest.', 'Stand on the node before position left; remember the stretch\'s first node.', 'Flip right − left + 1 nodes, then re-tie both seams. A dummy covers left = 1.'],
        rubric: ['before stands at position left − 1 (the dummy when left = 1).', 'Seam 1: before.next = the stretch\'s new first node.', 'Seam 2: the stretch\'s old first node points at the node after position right.'],
        explanation: `Result: ${chain(answer)}.` });
    }
    case 'k-group': {
      const len = 5 + (variant % 5), a = values(r, len), k = 2 + (variant % 3);
      const answer: number[] = [];
      for (let i = 0; i < len; i += k) { const block = a.slice(i, i + k); answer.push(...(block.length === k ? block.reverse() : block)); }
      return make({ topic: 'Flip in blocks', section: 'reverse-in-groups', strategy: 'reverse', prompt: `Chain ${chain(a)}. Reverse each consecutive block of ${k} nodes in place; a final block with fewer than ${k} nodes keeps its order.`, question: listQ, answer,
        hints: ['Each block is a stretch reversal. What must you check before flipping one?', 'Probe k nodes ahead from the node before the block.', 'Flip, re-tie both seams, and let the block\'s old first node become the next "before".'],
        rubric: ['Count k nodes before flipping; a short tail stays.', 'Each block re-ties two seams.', 'The old first node of a block is the "before" for the next block.'],
        explanation: `Result: ${chain(answer)}.` });
    }
    case 'merge': {
      const a = sorted(values(r, 2 + r(3), 12)), b = sorted(values(r, 2 + r(3), 12));
      return make({ topic: 'Stitch two ordered chains', section: 'merge-two', strategy: 'splice', prompt: `Two ascending chains: ${chain(a)} and ${chain(b)}. Join them into one ascending chain by re-tying the existing nodes.`, question: listQ, answer: sorted([...a, ...b]),
        hints: ['The first node of the output is a special case — unless something stands in front of it.', 'A dummy and a tail pointer.', 'Splice the smaller head after tail; when one chain runs out, attach the other in one re-tie.'],
        rubric: ['The dummy removes the "first node" special case.', 'Every node from both chains appears exactly once.', 'The leftover chain is already linked and sorted: one re-tie.'],
        explanation: `Merged: ${chain(sorted([...a, ...b]))}.` });
    }
    case 'reorder': {
      const len = 4 + (variant % 5), a = distinct(r, len, 30), answer: number[] = [];
      for (let i = 0, j = len - 1; i <= j; i++, j--) { answer.push(a[i]); if (i !== j) answer.push(a[j]); }
      return make({ topic: 'First, last, second, second-to-last', section: 'reorder', strategy: 'compose', prompt: `Chain ${chain(a)}. Rearrange it in place into first, last, second, second-to-last, third, … order using O(1) extra memory.`, question: listQ, answer,
        hints: ['The back half needs to be read backwards.', 'Find where the first half ends, cut, and reverse the second half.', 'Weave the two halves, saving both nexts before every re-tie.'],
        rubric: ['slow/fast with fast.next && fast.next.next ends the first half.', 'Reverse the cut-off second half.', 'Weave until the second half runs out; the first half may have one extra node.'],
        explanation: `Result: ${chain(answer)}.` });
    }
    case 'copy-random': {
      const n = 4 + (variant % 3), i = r(n), target = r(n);
      return make({ topic: 'Where the copy\'s extra pointer goes', section: 'copy-random', strategy: 'clone', prompt: `A chain of ${n} nodes sits at positions 0 to ${n - 1}. Besides next, node ${i} has an extra pointer to node ${target}. You must build an independent duplicate using O(1) extra memory beyond the new nodes. Midway, every original is immediately followed by its own fresh copy, so the chain holds ${2 * n} nodes. At which 0-based position of that ${2 * n}-node chain is the node the COPY of node ${i} must aim its extra pointer at?`, answer: 2 * target + 1,
        hints: ['The copy must point at a COPY, never at an original.', 'In the long chain, where does the copy of original node X sit?', 'Original X is at position 2X and its copy right after it.'],
        rubric: ['copy.random = original.random.next.', 'Pointing at the original would share nodes: a shallow copy.', 'After wiring, unweave and restore the original chain.'],
        explanation: `Original ${target} sits at ${2 * target}; its copy is at ${2 * target + 1}.` });
    }
    case 'lru': {
      const cap = 2 + (variant % 2), ops: string[] = [], answer: number[] = [], store = new Map<number, number>();
      let gets = 0;
      for (let t = 0; t < 7 || gets < 3; t++) {
        const key = 1 + r(cap + 2);
        if (t > 1 && (r(2) === 0 || (t >= 6 && gets < 3))) {
          ops.push(`get(${key})`); gets++;
          if (store.has(key)) { const val = store.get(key)!; store.delete(key); store.set(key, val); answer.push(val); } else answer.push(-1);
        } else {
          const val = key * 10 + r(10);
          ops.push(`put(${key}, ${val})`);
          if (store.has(key)) store.delete(key); else if (store.size === cap) store.delete(store.keys().next().value!);
          store.set(key, val);
        }
      }
      return make({ topic: 'Evict the stalest', section: 'lru-cache', strategy: 'cache', prompt: `A store keeps at most ${cap} keys. When it is full, adding a NEW key first evicts the key used least recently (a get or a put both count as use; updating an existing key never evicts). Starting empty: ${ops.join(', ')}. Every operation must run in O(1).`, question: 'Enter what each get returns, in order, separated by commas (-1 for a miss).', answer,
        hints: ['You need fast lookup by key AND fast "who is oldest?".', 'A hash map to nodes, plus a doubly linked list ordered by recency.', 'Every hit moves its node to the front; eviction takes the node at the back and deletes its key from the map.'],
        rubric: ['get and put both refresh recency; a miss does not.', 'The map and the list are updated together on every operation.', 'Doubly linked so a known node unlinks in O(1); nodes store their key for eviction.'],
        explanation: `The gets return ${answer.join(', ')}.` });
    }
    case 'cycle-entrance': {
      const n = 5 + (variant % 3), next = ferryTable(r, n, r(n));
      return make({ topic: 'The first island you see twice', section: 'cycle-entrance', strategy: 'couriers', prompt: `Island i's ferry goes to island next[i]: next = ${arr(next)}. Starting at island 0, the trip eventually repeats. Which island is the first one you reach for a second time? Use O(1) extra memory.`, answer: (() => { const seen = new Set<number>(); let at = 0; while (!seen.has(at)) { seen.add(at); at = next[at]; } return at; })(),
        hints: ['First prove there is a loop. Then find where it starts.', 'After two walkers at different speeds meet, compare the distance from island 0 to the entrance with the distance from the meeting point.', 'Restart one walker at island 0; step both one ferry at a time; they meet at the entrance.'],
        rubric: ['Phase 1: slow and fast meet somewhere in the loop.', 'Distance argument: a = (k − 1)L + (L − b), so both walkers reach the entrance together.', 'Phase 2 compares islands, and the meeting island is the answer.'],
        explanation: 'The entrance is the island two different ferries arrive at: one from the tail (or island 0 itself) and one from the loop.' });
    }
    case 'palindrome': {
      const len = 4 + (variant % 4), half = values(r, Math.ceil(len / 2), 5);
      const a = [...half, ...half.slice(0, Math.floor(len / 2)).reverse()];
      if (variant % 2 === 1) { const at = r(Math.floor(len / 2)); a[at] = a[at] === 9 ? 8 : a[at] + 1; }
      const answer = a.join(',') === [...a].reverse().join(',');
      return make({ topic: 'Same from both ends?', section: 'palindrome-list', strategy: 'compose', prompt: `Chain ${chain(a)}. Does it read the same from both ends? O(n) time, O(1) extra memory.`, question: 'Enter yes or no.', answer,
        hints: ['You cannot walk backwards. Can you make the back half walk forwards?', 'Find the middle, reverse the second half.', 'Compare the halves node by node, then reverse the second half back to restore the chain.'],
        rubric: ['slow/fast finds the middle in one walk.', 'Reversing the second half makes the back readable forwards in O(1) space.', 'Compare until the reversed half ends; restore the list before returning.'],
        explanation: answer ? 'Every mirrored pair matches.' : 'At least one mirrored pair differs.' });
    }
    case 'intersection': {
      const ids = distinct(r, 12, 89).map(x => x + 10), a = 1 + r(4), b = 1 + r(4), c = 1 + r(3);
      const shared = ids.slice(0, c), A = [...ids.slice(c, c + a), ...shared], B = [...ids.slice(c + a, c + a + b), ...shared];
      return make({ topic: 'Where two chains join', section: 'intersection', strategy: 'switch', prompt: `Each node carries a unique id. Chain A: ${chain(A)}. Chain B: ${chain(B)}. An id that appears in both chains is the very same node. Return the id of the first node the chains share, in O(m + n) time with O(1) extra memory (no set, no marking nodes).`, answer: shared[0],
        hints: ['The chains have different lengths before they join.', 'How could two walkers cover the same total distance before reaching the join?', 'When a walker runs off its chain, it restarts on the OTHER chain\'s head.'],
        rubric: ['Walker A covers a + c, then b; walker B covers b + c, then a.', 'Equal totals mean they reach the join on the same step.', 'With no join, both reach null together, and the loop ends with null.'],
        explanation: a === b
          ? `Both lead-ins are ${a} node${a === 1 ? '' : 's'} long, so the walkers reach node ${shared[0]} together on their first pass.`
          : `Walker A passes ${a} + ${c} + ${b} nodes and walker B passes ${b} + ${c} + ${a}: equal totals, so both arrive at node ${shared[0]} on the same step.` });
    }
    case 'add-two': {
      const digits = (len: number) => { const d = Array.from({ length: len }, () => (variant % 3 === 0 ? 9 : r(10))); d[len - 1] = 1 + r(9); if (variant % 3 === 0) d[len - 1] = 9; return d; };
      const x = digits(2 + r(3)), y = digits(2 + r(3));
      const sum = (BigInt(x.slice().reverse().join('')) + BigInt(y.slice().reverse().join(''))).toString().split('').reverse().map(Number);
      return make({ topic: 'Digit by digit', section: 'add-two-numbers', strategy: 'splice', prompt: `Two non-negative numbers are stored one digit per node, least significant digit first: ${chain(x)} and ${chain(y)}. Return their sum stored the same way.`, question: listQ, answer: sum,
        hints: ['Least significant first is the order you add by hand.', 'A dummy and a tail for the answer, plus a carry.', 'Keep going while either chain or the carry remains.'],
        rubric: ['Each column adds two digits (or one, or none) plus the carry.', 'Append sum % 10; carry = sum / 10.', 'A final carry creates one more node.'],
        explanation: `The sum, least significant digit first: ${chain(sum)}.` });
    }
    case 'rotate': {
      const len = 3 + (variant % 4), a = distinct(r, len, 30), k = 1 + r(2 * len + 1);
      const s = k % len, answer = [...a.slice(len - s), ...a.slice(0, len - s)];
      return make({ topic: 'The last k to the front', section: 'rotate-list', strategy: 'measure', prompt: `Chain ${chain(a)}. Rotate it to the right by ${k} place${k === 1 ? '' : 's'}: one place moves the last node to the front.`, question: listQ, answer,
        hints: ['Rotating by the length changes nothing.', 'Measure the length n and find the last node; reduce k modulo n.', 'The new tail is node n − k; cut after it and tie the old last node to the old head.'],
        rubric: ['k is reduced modulo the length first.', 'The new head is the (k mod n)th node from the end.', 'One cut and one re-tie: newTail.next = null, last.next = head.'],
        explanation: `${k} mod ${len} = ${s}, so the result is ${chain(answer)}.` });
    }
    case 'sort-list': {
      const a = values(r, 5 + (variant % 4), 20);
      return make({ topic: 'Order a chain', section: 'sort-list', strategy: 'compose', prompt: `Chain ${chain(a)}. Sort it ascending in O(n log n) time by re-tying nodes, not by copying values into an array.`, question: listQ, answer: sorted(a),
        hints: ['Which O(n log n) sort needs only splitting and merging?', 'Split at the first middle so two nodes split 1 + 1.', 'Sort each half recursively, then merge with a dummy and a tail.'],
        rubric: ['Split with slow/fast and cut the rope between halves.', 'fast starts at head.next so a two-node chain does not split 2 + 0 forever.', 'Merging re-ties existing nodes; recursion depth is O(log n).'],
        explanation: `Sorted: ${chain(sorted(a))}.` });
    }
    case 'other': {
      const a = sorted(distinct(r, 6 + (variant % 3), 60)), present = variant % 2 === 0, x = present ? a[r(a.length)] : (() => { let y = 1 + r(60); while (a.includes(y)) y++; return y; })();
      return make({ topic: 'Many questions, one chain', section: 'choose-the-tool', strategy: 'other', prompt: `A sorted chain of 100,000 values will be asked 100,000 membership questions. A tiny version of it: ${chain(a)}. One of the questions: is ${x} in it? You may spend O(n) extra memory once.`, question: 'Enter yes or no.', answer: a.includes(x),
        hints: ['How much does one walk of the chain cost, and how many walks would the questions need?', 'Spend the memory once: copy the values into a structure with fast lookup.', 'An array (then binary search) or a hash set answers each question without walking the chain.'],
        rubric: ['Walking the chain per question costs O(n) each: 10^10 steps in total.', 'One O(n) copy into an array or set makes each question O(log n) or O(1).', 'Pointer tricks help with one pass over a chain, not with repeated random access.'],
        explanation: `${x} is ${a.includes(x) ? '' : 'not '}in the chain. Copying once beats walking 100,000 times.` });
    }
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-linked-lists-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
