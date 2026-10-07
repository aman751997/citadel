// Decision puzzles for the Sliding Window lesson. Every number here is re-derived in tests/sliding-window.test.ts.
import { row, step, type TraceStep, type CellTone } from '../../lib/trace.ts';

// Tones for a window [from..to] over n cells: behind Tail = out, in view = hot, ahead of Head = ghost.
export const windowTones = (n: number, from: number, to: number): Record<number, CellTone> => {
  const tones: Record<number, CellTone> = {};
  for (let i = 0; i < n; i++) tones[i] = i < from ? 'out' : i <= to ? 'hot' : 'ghost';
  return tones;
};
const view = (name: string, values: (string | number)[], from: number, to: number, extra: Record<number, string> = {}) => {
  const labels: Record<number, string> = { ...extra };
  if (from <= to) { labels[from] = labels[from] ? `${labels[from]} / TAIL` : 'TAIL'; labels[to] = from === to ? 'TAIL / HEAD' : labels[to] ? `${labels[to]} / HEAD` : 'HEAD'; }
  return row(name, values, labels, { tones: windowTones(values.length, from, to) });
};

// Inputs shared with the tests.
export const fixedInput = { a: [1, 12, -5, -6, 50, 3], k: 4 };
export const negativeInput = { a: [-3, -1, -2], k: 2 };
export const anagramInput = { s1: 'ab', s2: 'eidbaooo' };
export const lampsInput = { a: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k: 2 };
export const fruitInput = [1, 2, 3, 2, 2];
export const repaintInput = { s: 'AABABBA', k: 1 };
export const tollInput = { a: [2, 3, 1, 2, 4, 3], target: 7 };
export const shoppingInput = { s: 'ADOBECODEBANC', t: 'ABC' };
export const mastInput = { a: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 };
export const stockInput = [7, 1, 5, 3, 6, 4];

export const fixedPane: TraceStep[] = [
  step('The first pane [1, 12, −5, −6] sums to 2. Head brings in 50. What is the new window sum, without re-adding?',
    [view('Catch per stall (k = 4)', [1, 12, -5, -6, 50, 3], 0, 4)], 1, [
      ['52: add 50', 'You added 50 but forgot that 1 has left the glass. A pane of k = 4 holds four stalls, and 52 is a five-stall sum.'],
      ['51: add 50, drop 1', 'Yes: 2 + 50 − 1 = 51. The item that leaves is always the one k places behind the newcomer. One addition and one subtraction, however wide the pane.'],
      ['50: just the newcomer', 'That throws away the whole old pane. 12, −5 and −6 are still in view; together they contribute 1, and 1 + 50 = 51.'],
    ]),
  step('The best pane sums to 51, with k = 4. What does the function return?',
    [view('Best pane', [1, 12, -5, -6, 50, 3], 1, 4)], 2, [
      ['12', 'That is integer division: 51 / 4 truncates to 12. Cast to double before dividing.'],
      ['51', 'That is the best sum. The problem asks for the average: divide once, at the end.'],
      ['12.75', 'Right: (double) 51 / 4 = 12.75. Comparing sums inside the loop is safe because every pane has the same width.'],
    ]),
  step('Now every value is negative: [−3, −1, −2], k = 2. You started with best = 0. What goes wrong?',
    [view('All losses', [-3, -1, -2], 0, 1)], 0, [
      ['It returns 0.0, but no pane averages 0', 'Exactly. The panes sum to −4 and −3, so the answer is −3 / 2 = −1.5. Start best at the first pane’s sum, never at 0.'],
      ['Nothing: 0 is a safe starting value', 'Only if some pane is at least 0. Here every pane is negative, so best never moves off 0, and you report an average that no pane has.'],
      ['It crashes on negative numbers', 'Nothing crashes. It quietly returns the wrong answer, which is worse.'],
    ]),
];

export const anagram: TraceStep[] = [
  step('s1 = “ab”. How wide should the pane over s2 be?',
    [row('s2', ['e', 'i', 'd', 'b', 'a', 'o', 'o', 'o'])], 0, [
      ['Exactly s1.length() = 2', 'Yes. A permutation has the same letters and the same length. Any other width can’t be a jumble of “ab”.'],
      ['Grow until it holds an a and a b', '“eidba” holds an a and a b, but it is five letters. Extra letters ruin a permutation. That rule belongs to a different problem (“contains all of”).'],
      ['As wide as s2', 'Then you are asking whether s2 is an anagram of s1, a different and much stricter question.'],
    ]),
  step('The pane covers “db” (positions 2–3). Head moves to position 4, an a. Which two slate updates happen?',
    [view('s2', ['e', 'i', 'd', 'b', 'a', 'o', 'o', 'o'], 2, 3)], 1, [
      ['+a, −b', 'The b at position 3 stays in view. The letter that leaves is the one k = 2 places behind the newcomer: position 2, the d.'],
      ['+a, −d', 'Right. The a enters; the d at position 4 − 2 = 2 leaves. The pane is now “ba”.'],
      ['+a only', 'Then the pane would be three letters wide, and a three-letter pane can never be a jumble of a two-letter word.'],
    ]),
  step('The slate now reads b: 1, a: 1, the same counts as s1, so the unbalanced counter is 0. What do you return?',
    [view('s2', ['e', 'i', 'd', 'b', 'a', 'o', 'o', 'o'], 3, 4)], 0, [
      ['true, right now', 'Yes. One matching pane is enough: “ba” is a permutation of “ab”.'],
      ['Keep sliding and count every match', 'Counting matches is a different question (Find All Anagrams). This one asks whether any pane matches, so stop at the first.'],
    ]),
];

export const darkLamps: TraceStep[] = [
  step('The lamplighter may relight at most k = 2 lamps. Turn that into a rule about the window itself.',
    [row('Lamps (1 = lit, 0 = dark)', lampsInput.a)], 1, [
      ['The window must contain exactly 2 zeros', 'Then a row with fewer dark lamps, like [1, 1, 1], would have no legal window at all. Relighting fewer than k is fine.'],
      ['The window may contain at most 2 zeros', 'Yes. Any stretch with two or fewer dark lamps can be fully lit. That turns it into a longest-legal-window problem.'],
      ['The window must start and end with a 1', 'The best stretch here starts and ends on dark lamps (positions 5 and 10). Relighting them is the point.'],
    ]),
  step('Head has just taken the third zero (position 5). The window [0..5] holds 3 zeros, and k = 2. What now?',
    [view('Lamps', lampsInput.a, 0, 5)], 0, [
      ['Shrink while zeros > 2, then record', 'Right. Tail lets go of positions 0, 1, 2 (lit) and then 3 (dark). Now zeros = 2 and the window is legal again. Record after the repair.'],
      ['Record length 6, then shrink', 'Length 6 here would need 3 relights. Logging an illegal window is exactly the record-in-the-wrong-place bug.'],
      ['Start a fresh window at position 6', 'That throws away legal windows that start earlier. The best answer here, positions 5–10, starts at 5.'],
    ]),
  step('Tail has finished shrinking. Where does it stand, and what goes in the log? (The best so far was 5, from positions 0–4.)',
    [view('Lamps', lampsInput.a, 4, 5)], 2, [
      ['Tail at 3; log 3', 'Window [3..5] still holds 3 zeros. Tail has to pass the dark lamp at position 3 before the window is legal.'],
      ['Tail at 6; log 0', 'That is too far. Tail stops as soon as the window is legal again. Shrinking a legal window throws away length for nothing.'],
      ['Tail at 4; log length 2, best stays 5', 'Yes. Window [4..5] holds 2 zeros, so it is legal. Its length, 2, doesn’t beat 5. Later the stretch 5–10 reaches 6.'],
    ]),
];

export const noRepeats: TraceStep[] = [
  step('“pwwkew”: the window is “pw” and Head brings in a second w. Using counts, what does Tail do?',
    [view('s', ['p', 'w', 'w', 'k', 'e', 'w'], 0, 2)], 1, [
      ['Shrink once, then record', 'One step removes p, but “ww” still repeats. An if where you need a while leaves the window illegal.'],
      ['Shrink while count[w] > 1, then record', 'Right. Tail passes p and the first w. The window is “w”, length 1. Only the newcomer can be repeated, because the window was legal before it arrived.'],
      ['Record length 3, then shrink', '“pww” has a repeat. In a longest problem you record after the repair, never before it.'],
    ]),
  step('“abba”: Tail is at 2, Head is on the second a (position 3), and lastSeen[a] = 0. Where does Tail go?',
    [view('s', ['a', 'b', 'b', 'a'], 2, 3, { 0: 'lastSeen[a]' })], 0, [
      ['Stays at 2: max(2, 0 + 1) = 2', 'Yes. The old a at position 0 is already behind Tail, so it isn’t a repeat inside the window. The guard never lets Tail move backwards.'],
      ['Back to 1: lastSeen[a] + 1', 'That moves Tail backwards. The window becomes “bba” with two b’s, and the log records 3. The right answer for “abba” is 2.'],
      ['Up to 3, past both a’s', 'The window “ba” is legal. Jumping to 3 throws away length for nothing.'],
    ]),
  step('Tail passes letters but never clears their lastSeen entries. Why is that safe?', [], 2, [
    ['Because lastSeen is reset at every step', 'Nothing is reset. Stale entries stay in the table.'],
    ['Because each letter appears at most twice', '“aaaa” has four a’s. Safety can’t depend on that.'],
    ['Because Math.max ignores any stale position behind Tail', 'Exactly. A stale entry gives lastSeen + 1 ≤ left, and max(left, …) keeps left. That is the whole job of the guard.'],
  ]),
];

export const baskets: TraceStep[] = [
  step('Two baskets, one kind of fruit each. Turn that into a window rule.',
    [row('Fruit types', fruitInput)], 0, [
      ['At most 2 distinct types in view', 'Yes. Any stretch with two kinds or fewer fits in the baskets. It is the longest-legal-window rhythm again.'],
      ['Exactly 2 distinct types', '[1, 1, 1] fills one basket with 3 fruits. One kind is fine.'],
      ['The two most common types in the whole row', 'The picking must be contiguous. The most common types overall may never stand next to each other.'],
    ]),
  step('Window [0..2] holds types 1, 2, 3, which is three kinds. Tail drops the 1, and its count hits 0. What happens to its key?',
    [view('Fruit types', fruitInput, 0, 2)], 1, [
      ['Leave it in the map at 0', 'Then map.size() still says 3. The while keeps shrinking: Tail passes the 2 and the 3, runs past Head and off the end of the array.'],
      ['Remove the key', 'Right. The keys must be exactly the kinds in view. Now size() is 2 and the window [1..2] is legal.'],
    ]),
  step('Window [1..2] holds 2, 3. Head takes the 2 at position 3, then the 2 at position 4. What is the best length?',
    [view('Fruit types', fruitInput, 1, 4)], 2, [
      ['5', 'That includes the 1 at position 0, a third kind. It left the window when the 3 arrived.'],
      ['3', 'That stops too early. Positions 1–4 are 2, 3, 2, 2: only two kinds.'],
      ['4', 'Yes: positions 1–4, two kinds, four fruits.'],
    ]),
];

export const repaint: TraceStep[] = [
  step('Window “AABA”, k = 1. Is it legal?',
    [view('Doors', ['A', 'A', 'B', 'A', 'B', 'B', 'A'], 0, 3)], 0, [
      ['Yes: 4 − 3 = 1 repaint, and k = 1', 'Right. Keep the most common letter (A, 3 times) and repaint the rest: length − maxFreq = 1 ≤ k.'],
      ['No: it has two different letters', 'Two letters are fine, as long as the minority fits in k repaints.'],
      ['Only if the B is at an end', 'Position doesn’t matter. One repaint turns the B into an A wherever it is.'],
    ]),
  step('Head takes B (position 4): length 5, A = 3, B = 2. 5 − 3 = 2 > 1, so Tail drops the A at position 0. The window is “ABAB”, but the slate still says maxFreq = 3. Do you recompute it?',
    [view('Doors', ['A', 'A', 'B', 'A', 'B', 'B', 'A'], 1, 4)], 1, [
      ['Yes, or the answer will be too big', 'The window keeps length 4, and 4 was already reached legally by “AABA”. A stale maxFreq can’t create a new record. To grow past 4 you need a count that really beats 3.'],
      ['No: a stale maxFreq only holds the window at a length already proven', 'Exactly. Length never decreases, and it only grows when a real count beats every earlier one. Then the grown window is genuinely legal. AABABBA with k = 1 answers 4.'],
      ['Yes, otherwise the loop never ends', 'The loop ends either way. With a stale maxFreq it runs at most once per step.'],
    ]),
];

export const toll: TraceStep[] = [
  step('Window [2, 3, 1, 2] sums to 8, and the toll is 7. What first?',
    [view('Coins per stall', tollInput.a, 0, 3)], 1, [
      ['Shrink first to look for something shorter', 'Then [2, 3, 1, 2] is never logged. If it were the only qualifying window, you would report “no answer”.'],
      ['Record length 4, then shrink', 'Right. The window qualifies right now, so log it before Tail moves. Shortest problems record inside the loop.'],
      ['Grow: more coins are better', 'Growing a qualifying window only makes it longer. Shortest wants squeezing.'],
    ]),
  step('Tail dropped the 2. The window [3, 1, 2] sums to 6. Still inside the loop?',
    [view('Coins per stall', tollInput.a, 1, 3)], 0, [
      ['No: 6 < 7, so exit and let Head grow', 'Yes. The loop runs only while the window qualifies. [3, 1, 2] doesn’t, so it must not be logged.'],
      ['Yes: record length 3', 'That is the record-after-the-loop bug. [3, 1, 2] pays only 6, so a 3 in the log is a lie.'],
    ]),
  step('Head brings in 4: window [3, 1, 2, 4], sum 10. How many records does the loop make before it exits?',
    [view('Coins per stall', tollInput.a, 1, 4)], 2, [
      ['One: length 4', 'An if would stop there. The while keeps going: after dropping the 3, the window [1, 2, 4] still sums to 7.'],
      ['Three: lengths 4, 3 and 2', 'After lengths 4 and 3, the window is [2, 4], which sums to 6. It doesn’t qualify and isn’t logged.'],
      ['Two: lengths 4 and 3, ending at [2, 4]', 'Right. Log 4, drop 3 (sum 7); log 3, drop 1 (sum 6); stop. Then Head brings in 3: log 3, log 2. Answer: 2.'],
    ]),
];

export const shoppingList: TraceStep[] = [
  step('Head reaches the C at position 5. The window “ADOBEC” covers A, B and C, so missing = 0. What now?',
    [view('Stalls', shoppingInput.s.split(''), 0, 5)], 1, [
      ['Return “ADOBEC”', 'It is the first covering window, not the shortest. “BANC” comes later, at length 4.'],
      ['Record “ADOBEC” (length 6), then let Tail go', 'Right. Shortest rhythm: log inside the loop, then squeeze.'],
      ['Grow until the window is longer', 'Longer is never better for a shortest problem.'],
    ]),
  step('Tail lets the A at position 0 go. need[A] goes from 0 to 1. What happens to missing?',
    [view('Stalls', shoppingInput.s.split(''), 1, 5)], 0, [
      ['It rises to 1, and the loop ends', 'Yes. The window “DOBEC” no longer has an A. Head must find the next one, at position 10.'],
      ['It stays 0: there is another A later', 'The A at position 10 isn’t in view yet. missing describes the window, not the whole string.'],
      ['Record “DOBEC”', '“DOBEC” has no A, so it doesn’t qualify. Recording it would be a lie in the log.'],
    ]),
  step('A new search: s = “aa”, t = “ab”. Head takes the second a, and need[a] is already 0. Does missing drop?',
    [view('s', ['a', 'a'], 0, 1)], 0, [
      ['No: this a is surplus, so need[a] goes to −1', 'Right. missing drops only when need[c] > 0 before the decrement. The window still lacks a b, and the answer is “”.'],
      ['Yes: a is in t', 'Then missing hits 0 and “aa” is reported as covering “ab”. Surplus copies must not count.'],
    ]),
];

export const tallestMast: TraceStep[] = [
  step('k = 3. The queue holds indices 1, 2 (values 3, −1). Head brings −3 at index 3. What happens?',
    [view('Masts', mastInput.a, 1, 3), row('Queue (index: value)', ['1: 3', '2: −1'], { 0: 'FRONT' })], 0, [
      ['−3 joins the back; the queue is 3, −1, −3 and the front, 3, is the max', 'Yes. −3 is shorter than everything ahead of it, so it waits its turn. Index 1 is still inside the window (1 > 3 − 3 = 0).'],
      ['Pop −1, because it is negative', 'The rule compares heights, not signs. −1 is taller than −3, so it stays.'],
      ['Clear the queue and start over', 'Then you lose 3, the current maximum.'],
    ]),
  step('Head brings 5 at index 4. Which masts leave the back of the queue?',
    [view('Masts', mastInput.a, 2, 4), row('Queue (index: value)', ['1: 3', '2: −1', '3: −3'], { 0: 'FRONT', 2: 'BACK' })], 2, [
      ['Only −3', 'The back pop is a while: keep popping as long as the back is no taller than 5.'],
      ['None: the queue is already decreasing', 'It is decreasing, but 5 is taller than all of them. Every one is older and shorter than 5, so none can be the max again.'],
      ['All three: 3, −1 and −3', 'Right. They will leave the glass before 5 does, and none of them is taller than 5. (Index 1 had also just expired from the front.) The queue is now 5.'],
    ]),
  step('New input [5, 1, 1], k = 2. At index 2 the queue holds indices 0, 2. Should index 0 go?',
    [view('Masts', [5, 1, 1], 1, 2), row('Queue (index: value)', ['0: 5', '2: 1'], { 0: 'FRONT' })], 0, [
      ['Yes: 0 ≤ right − k = 0, so it has left the window', 'Right. Pop the front, and the answer for window [1, 1] is 1. Comparing with < instead of <= is the off-by-one that reports 5 here.'],
      ['No: it is still the biggest', 'Being big doesn’t keep you in view. The window is positions 1–2 now.'],
    ]),
];

export const buyLow: TraceStep[] = [
  step('Day 1 the price is 1, below the lowest so far (7). What changes?',
    [row('Price per day', stockInput, { 0: 'LOW SO FAR', 1: 'TODAY' })], 1, [
      ['Sell today', 'You can only sell above your purchase price. A sale today against 7 loses money.'],
      ['The low-water mark moves to 1 (Tail jumps to day 1)', 'Yes. Any later sale does better buying at 1 than at 7.'],
      ['Nothing: keep 7 as the buy day', 'Then every later profit is measured against 7, and the best (6 − 1 = 5) is missed.'],
    ]),
  step('Day 4 the price is 6, and the lowest so far is 1. What is the best profit so far?',
    [row('Price per day', stockInput, { 1: 'LOW SO FAR', 4: 'TODAY' })], 0, [
      ['5: sell at 6, bought at 1', 'Right. The other candidates were 5 − 1 = 4 and 3 − 1 = 2. The final answer for this week is 5.'],
      ['6: 7 − 1', 'Day 0 (price 7) comes before day 1. You can’t sell before you buy.'],
      ['3: 6 − 3', 'Day 3’s 3 isn’t the lowest so far. 1 on day 1 is cheaper.'],
    ]),
];

export const mixedReview: TraceStep[] = [
  step('“Shortest subarray with sum ≥ target” (positive values). Where does the record line go, and what is the while condition?', [], 1, [
    ['After the while; while (sum < target)', 'That while would never run in the right place: you grow with the for loop, and you squeeze while the window still qualifies.'],
    ['Inside the while; while (sum >= target)', 'Right: your logged edge. Record each still-qualifying size, then shrink to hunt for a shorter one. When the loop exits, the window no longer qualifies.'],
    ['After the while; while (sum >= target)', 'This records a window that has already stopped qualifying: the exact bug that passes examples and fails hidden tests. On [2, 3, 1, 2, 4, 3] with target 7 it returns 1.'],
    ['Before adding nums[right]', 'Then the newest item is never part of a recorded window.'],
  ]),
  step('“abba”, no-repeat window, Head on the second a. lastSeen[a] = 0, left = 2. Without the Math.max guard, what happens?', [], 1, [
    ['Nothing: left stays 2 either way', 'Without the guard, left = lastSeen[a] + 1 = 1, which is backwards.'],
    ['left becomes 1, dragging the window back over the “bb” repeat', 'Right. The guard keeps left = max(2, 1) = 2. That trace is in your bestiary. Own it cold.'],
    ['An index out of bounds', 'Every index stays in range. The bug is silent, which is why it is dangerous.'],
    ['The second a is skipped', 'Head still takes it. The damage is to Tail.'],
  ]),
  step('Longest Repeating Character Replacement: the window shrinks and maxFreq is now stale (too high). Why is not fixing it still correct?', [], 1, [
    ['maxFreq never actually goes stale', 'It does: in “AABAB” after dropping the first A, the slate says 3 but the window holds at most 2 of any letter.'],
    ['A stale maxFreq only keeps the window at a length already achieved legally; growing past it needs a genuinely higher count', 'Right. best only cares about the largest length ever seen, and a stale value can’t raise it.'],
    ['It is a known bug that the tests don’t catch', 'It is provably correct, and the argument is the interview credit.'],
    ['The while loop recomputes it implicitly', 'Nothing recomputes it. That is the point of the argument.'],
  ]),
  step('New problem: “longest subarray of 1s after you must delete exactly one element.” First move?', [], 1, [
    ['DP over delete/keep states', 'That works, but it overbuilds. There is a one-pass reframe.'],
    ['A window with at most one zero; answer = window length − 1', 'Yes: the k-budget disguise with k = 1, plus an off-by-one for the mandatory deletion. [1, 1, 1] answers 2.'],
    ['Two pointers from opposite ends', 'Nothing here makes the ends special. The answer can sit anywhere.'],
    ['Prefix sums of zero counts', 'Possible, but you would still need a search per end. The window does it in one pass.'],
  ]),
  step('“Count subarrays whose sum is exactly k; values may be negative.” Which tool?', [], 2, [
    ['Shortest-qualifying window', 'With negatives, growing can lower the sum and shrinking can raise it. Tail has no safe rule.'],
    ['Fixed window of width k', 'k is a target sum, not a width.'],
    ['Prefix sums with a hash map of seen prefixes', 'Right. For each prefix p, add how many earlier prefixes equal p − k. [1, −1, 1] with k = 1 gives 3.'],
  ]),
  step('“The maximum of every window of size k.” What keeps each step amortised O(1)?', [], 0, [
    ['A deque of indices with decreasing values', 'Yes. Each index is pushed once and popped at most once. The front is the max; expired indices leave the front.'],
    ['A running max, updated by subtraction', 'You can’t subtract from a max. When the max leaves, you need the runner-up.'],
    ['Re-scan each window', 'That is O(nk), the brute force you are replacing.'],
  ]),
  step('“Count subarrays with exactly K distinct values.” Why not one window?', [], 1, [
    ['Because counting requires sorting', 'No sorting is involved. The problem is the shrink rule.'],
    ['“Exactly K” isn’t monotone; count atMost(K) − atMost(K − 1)', 'Right. “At most K” is monotone, and each right end adds right − left + 1. [1, 2, 1, 2, 3] with K = 2 gives 12 − 5 = 7.'],
    ['Because a hash map can’t count distinct values', 'map.size() counts them, as long as zero-count keys are removed.'],
  ]),
];
