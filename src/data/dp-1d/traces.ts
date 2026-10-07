// Decision puzzles for the 1-D Dynamic Programming lesson. Every number here is re-derived in tests/dp-1d.test.ts.
import { row, step } from '../../lib/trace.ts';

export const stairs = [
  step('Scrolls 0 to 4 hold 1, 1, 2, 3, 5. What goes on scroll 5?',
    [row('ways', [1, 1, 2, 3, 5, '?'], { 3: 'i − 2', 4: 'i − 1', 5: 'i' }, { tones: { 3: 'hot', 4: 'hot', 5: 'ghost' } })], 1, [
      ['5 × 2 = 10: from step 4 you can take one step or two', 'A double step from step 4 lands on 6, not 5. Group climbs by their LAST move: a single from 4 (5 climbs) or a double from 3 (3 climbs).'],
      ['ways[4] + ways[3] = 5 + 3 = 8', 'Yes. Every climb to 5 ends with a single step from 4 or a double step from 3, never both, so the two groups add.'],
      ['ways[4] + 1 = 6: one more climb than step 4', 'Each of the 5 climbs to step 4 extends by one step, but the 3 climbs to step 3 also extend, by a double step. They are new climbs, not one.'],
    ]),
  step('Why is scroll 0, the empty climb, set to 1?',
    [row('ways', [1, 1, 2], { 0: 'ways[0]', 2: 'ways[2]' }, { tones: { 0: 'hot' } })], 0, [
      ['ways[2] = ways[1] + ways[0] must be 2 (1+1, or 2), so ways[0] = 1: the one way to do nothing', 'Yes. The double step straight from the ground extends the empty climb. Counting problems almost always start with empty = 1.'],
      ['It should be 0: no steps, no climbs', 'Then ways[2] = 1 + 0 = 1, and every scroll above is wrong: the rack would read 0, 1, 1, 2, 3, 5, so ways[5] = 5 instead of 8.'],
      ['It doesn’t matter: scroll 0 is never read', 'ways[2] reads it. Change it and every later scroll changes.'],
    ]),
  step('Brother Recur answers climb(5) with no rack: 15 calls, climb(2) alone three times. Sister Memo keeps a rack. How many calls does climb(5) make now?',
    [row('asked without a rack', [3, 5, 3, 2, 1, 1], { 0: 'climb(0)', 1: 'climb(1)', 2: 'climb(2)', 3: 'climb(3)', 4: 'climb(4)', 5: 'climb(5)' })], 1, [
      ['15: the rack only saves memory', 'The rack saves calls. The second climb(3) and the second climb(2) become lookups, and their whole subtrees disappear.'],
      ['9 = 2n − 1: each of steps 2..5 is solved once and makes two calls, plus the first call', 'Yes. Six repeated calls are cut: the subtrees under the second climb(3) and the second climb(2). For n = 30 that is 59 calls instead of 2,692,537.'],
      ['6: one call per step 0..5', 'Each solved step still asks its two smaller questions; the answer to the second one is a lookup, but it is still a call. 2n − 1 = 9.'],
    ]),
];

export const minCost = [
  step('cost = [10, 15, 20]. dp[0] = dp[1] = 0 (free starts). dp[i] is the cheapest way to ARRIVE at position i. What is dp[2]?',
    [row('cost', [10, 15, 20]), row('dp', [0, 0, '?', '·'], { 2: 'i' }, { tones: { 0: 'done', 1: 'done', 3: 'ghost' } })], 0, [
      ['min(dp[1] + 15, dp[0] + 10) = min(15, 10) = 10', 'Yes. Arriving at 2 from step 1 pays step 1’s toll; from step 0 pays step 0’s toll. Stand on step 0 and double-step: 10.'],
      ['cost[2] = 20: you pay the step you arrive on', 'In this state you pay for the step you leave from. Step 2’s toll is paid only if you climb on from it.'],
      ['min(10, 15) + 20 = 30', 'That pays for step 2 as well, but dp[2] only counts what was paid to arrive there.'],
    ]),
  step('dp = [0, 0, 10]. The top is position 3, past the last step. Which number is the answer?',
    [row('cost', [10, 15, 20]), row('dp', [0, 0, 10, '?'], { 3: 'top' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } })], 1, [
      ['dp[2] = 10', 'That is the price of arriving on the last step without paying its toll or stepping off. The top is position 3.'],
      ['dp[3] = min(dp[2] + 20, dp[1] + 15) = min(30, 15) = 15', 'Yes. Start on step 1, pay 15, and double-step to the top.'],
      ['min(dp[1], dp[2]) = 0', 'Reaching step 1 is free, but you still have to climb off it, and that costs its toll of 15.'],
    ]),
];

export const robber = [
  step('Purses [2, 7, 9, 3, 1]. dp[0..2] = 0, 2, 7. dp[3] is the best of the first 3 houses: knock at house 2 (purse 9) or skip it?',
    [row('nums', [2, 7, 9, 3, 1], { 2: 'house i − 1' }, { tones: { 2: 'hot' } }), row('dp', [0, 2, 7, '?', '·', '·'], { 1: 'i − 2', 2: 'i − 1', 3: 'i' }, { tones: { 4: 'ghost', 5: 'ghost' } })], 0, [
      ['Knock: 9 + dp[1] = 9 + 2 = 11', 'Yes. 11 beats skipping (dp[2] = 7). House 1 is off-limits, so the rest comes from the first house alone.'],
      ['Skip: dp[2] = 7', '7 is the best without house 2; 11 is the best with it. The scroll holds the larger.'],
      ['Knock: 9 + dp[2] = 16', 'dp[2] may use house 1 (here it does: 7), which is next door to house 2. Knocking means reading dp[i − 2].'],
    ]),
  step('dp[0..3] = 0, 2, 7, 11. House 3 holds 3. What is dp[4]?',
    [row('nums', [2, 7, 9, 3, 1], { 3: 'house i − 1' }, { tones: { 3: 'hot' } }), row('dp', [0, 2, 7, 11, '?', '·'], { 2: 'i − 2', 3: 'i − 1', 4: 'i' }, { tones: { 5: 'ghost' } })], 1, [
      ['Knock: 3 + dp[2] = 3 + 7 = 10', 'Knocking at house 3 means giving up house 2’s 9. Skipping keeps 11, which is more.'],
      ['Skip: dp[3] = 11', 'Yes. dp[4] = max(10, 11) = 11. The scroll records the best for the first 4 houses, whether or not house 3 is used.'],
      ['dp[3] + 3 = 14', 'That knocks at houses 2 and 3, which are neighbours.'],
    ]),
  step('Purses [2, 1, 1, 2]. Knocking at every other door collects 3 either way. What does the table say?',
    [row('nums', [2, 1, 1, 2]), row('dp', [0, 2, 2, 3, 4])], 2, [
      ['3: alternating is always best', 'Alternating forbids skipping two doors in a row. Here the best plan skips both middle houses.'],
      ['2: one big purse', 'Houses 0 and 3 aren’t neighbours, so both 2s can be collected.'],
      ['4: houses 0 and 3', 'Yes. dp = 0, 2, 2, 3, 4. At dp[4] knocking gives 2 + dp[2] = 4, beating dp[3] = 3.'],
    ]),
];

export const circle = [
  step('The purses [2, 7, 9, 3, 1] now stand in a ring. The straight-street answer, 12, uses houses 0, 2 and 4. Is that allowed?',
    [row('ring', [2, 7, 9, 3, 1], { 0: 'first', 4: 'last' }, { tones: { 0: 'hot', 2: 'hot', 4: 'hot' } })], 1, [
      ['Yes: no two of 0, 2, 4 are next to each other', 'On a ring, house 4 and house 0 share a wall. That pair is forbidden.'],
      ['No: houses 0 and 4 are neighbours on the ring', 'Right. So at least one end must be skipped in every valid plan.'],
    ]),
  step('Without house 4 the best is 11; without house 0 it is 10. What is the ring’s answer?',
    [row('skip last', [2, 7, 9, 3, '·'], {}, { tones: { 4: 'ghost' } }), row('skip first', ['·', 7, 9, 3, 1], {}, { tones: { 0: 'ghost' } })], 0, [
      ['max(11, 10) = 11', 'Yes. Every valid ring plan lives on one of the two streets, and every plan on either street is valid on the ring.'],
      ['10: the smaller, to be safe', 'Both are valid ring plans. Take the better one.'],
      ['12: the straight answer minus nothing', '12 needs both ends. It isn’t a valid plan on the ring.'],
    ]),
  step('A ring with a single cottage holding 7. Your code computes max(street 0..−1, street 1..0). What should it return?',
    [row('ring', [7])], 1, [
      ['0: both streets are empty', 'That is the bug: one cottage has no neighbour, so nothing forbids it. Handle n = 1 before splitting.'],
      ['7: a lone cottage has no neighbour', 'Yes. Return nums[0] when n = 1; the two-street split only makes sense with two or more houses.'],
    ]),
];

export const decode = [
  step('“226”. dp[0..2] = 1, 1, 2. At i = 3 the last digit is 6 and the last two are 26. What is dp[3]?',
    [row('digits', ['2', '2', '6'], { 2: 'one' }, { tones: { 1: 'hot', 2: 'hot' } }), row('dp', [1, 1, 2, '?'], { 3: 'i' })], 2, [
      ['dp[2] = 2: only the one-digit letter', '26 is Z, a valid two-digit letter. Leaving it out loses dp[1] = 1 reading (2, Z).'],
      ['dp[1] = 1: only the two-digit letter', '6 is F on its own. Leaving it out loses the 2 readings that end in F.'],
      ['dp[2] + dp[1] = 2 + 1 = 3', 'Yes: B-B-F, V-F (22, 6), B-Z (2, 26). The last letter is either one digit or two, never both, so the groups add.'],
    ]),
  step('“11106”. dp[0..3] = 1, 1, 2, 3. At i = 4 the digit is 0 and the last two are 10. What is dp[4]?',
    [row('digits', ['1', '1', '1', '0', '6'], { 3: 'one' }, { tones: { 2: 'hot', 3: 'hot' } }), row('dp', [1, 1, 2, 3, '?', '·'], { 4: 'i' })], 1, [
      ['dp[3] + dp[2] = 3 + 2 = 5', 'The 0 can’t be a letter on its own, so the one-digit case adds nothing.'],
      ['dp[2] = 2: only 10 (J) can end here', 'Yes. A 0 can only end a 10 or a 20. dp[4] = dp[2] = 2.'],
      ['0: a zero kills the message', 'Only a zero that can’t join the digit before it. Here 10 is J.'],
    ]),
  step('Still “11106”, i = 5: the digit is 6 and the last two are 06. What is dp[5]?',
    [row('digits', ['1', '1', '1', '0', '6'], { 4: 'one' }, { tones: { 3: 'hot', 4: 'hot' } }), row('dp', [1, 1, 2, 3, 2, '?'], { 5: 'i' })], 0, [
      ['dp[4] = 2: 6 alone; 06 is no letter', 'Yes. Two-digit letters run 10..26, which rules out a leading zero. The answer is 2: A-A-J-F and K-J-F.'],
      ['dp[4] + dp[3] = 2 + 3 = 5: 06 is F', '06 is not F. Parsing it as the number 6 is the classic bug; the check must be 10 ≤ value ≤ 26.'],
      ['0: the earlier zero spoils everything', 'The zero was absorbed into 10 (J). dp[4] = 2 already accounts for it.'],
    ]),
];

export const coins = [
  step('Coins [1, 3, 4], amount 6. dp[0..5] = 0, 1, 2, 1, 1, 2. Which coin should go last in the best way to make 6?',
    [row('dp', [0, 1, 2, 1, 1, 2, '?'], { 2: '6 − 4', 3: '6 − 3', 5: '6 − 1', 6: 'a' })], 1, [
      ['4: 1 + dp[2] = 1 + 2 = 3', 'That is the shop’s greedy answer: 4 + 1 + 1. Another last coin does better.'],
      ['3: 1 + dp[3] = 1 + 1 = 2', 'Yes: 3 + 3. dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2.'],
      ['1: 1 + dp[5] = 1 + 2 = 3', 'Three coins (e.g. 4 + 1 + 1). The last coin 3 gives two.'],
    ]),
  step('Coins [2], amount 3. The sentinel is amount + 1 = 4, and dp = [0, 4, 1]. What happens at a = 3?',
    [row('dp', [0, '∞', 1, '?'], { 1: '3 − 2', 3: 'a' })], 0, [
      ['1 + dp[1] = 5 is not below dp[3] = 4, so dp[3] stays 4: unreachable, answer −1', 'Yes. An unreachable amount plus one coin is still unreachable, and the sentinel arithmetic can’t overflow.'],
      ['dp[3] = 1 + dp[1] = 2: one 2-coin plus whatever makes 1', 'Nothing makes 1. The sentinel stands for “impossible”, and impossible plus a coin is still impossible.'],
      ['dp[3] = 0', '0 coins make only 0. Three can’t be made from 2s at all.'],
    ]),
  step('Why amount + 1 as the sentinel, not Integer.MAX_VALUE?', [], 1, [
    ['MAX_VALUE uses more memory', 'An int is an int. The problem is arithmetic, not memory.'],
    ['MAX_VALUE + 1 overflows to −2147483648, which then wins every min. amount + 1 is already more coins than any answer needs', 'Yes. On coins [2], amount 3 the overflowed version returns −2147483648 instead of −1.'],
    ['It makes no difference', 'It does as soon as an unreachable cell is read with + 1.'],
  ]),
];

export const words = [
  step('“praysong” with words pray, prays, song. dp[4] (pray) and dp[5] (prays) are true. Which j makes dp[8] true?',
    [row('s', ['p', 'r', 'a', 'y', 's', 'o', 'n', 'g']), row('dp', ['T', 'F', 'F', 'F', 'T', 'T', 'F', 'F', '?'], { 4: 'j?', 5: 'j?', 8: 'i' })], 0, [
      ['j = 4: dp[4] is true and s[4..8) = song is a word', 'Yes. pray + song. The table kept the cut at 4 alive even though a longer word ended at 5.'],
      ['j = 5: dp[5] is true and s[5..8) = ong', '“ong” isn’t a word. This is exactly where greedy-longest got stuck.'],
      ['j = 0: the whole string', '“praysong” isn’t in the list, so the last word can’t start at 0.'],
    ]),
  step('What should dp[0] be?',
    [row('dp', ['?', '·', '·'], { 0: 'empty' })], 1, [
      ['false: no words have been read', 'Then dp[4] = dp[0] AND “pray” is a word would be false, and nothing could ever become true.'],
      ['true: the empty prefix needs no words', 'Yes. It lets the first word start at position 0. Feasibility tables start with empty = true.'],
    ]),
];

export const lis = [
  step('[10, 9, 2, 5, 3, 7, 101, 18]. dp[0..4] = 1, 1, 1, 2, 2 (each the longest run ENDING there). What is dp[5], for the 7?',
    [row('nums', [10, 9, 2, 5, 3, 7, 101, 18], { 5: 'i' }, { tones: { 5: 'hot' } }), row('dp', [1, 1, 1, 2, 2, '?', '·', '·'])], 1, [
      ['4: 2, 5 and 3 are all smaller than 7', 'They can’t all be in one run: 3 comes after 5 but is smaller. Extend the single best run that ends below 7.'],
      ['3: 1 + max(dp[2], dp[3], dp[4]) = 1 + 2', 'Yes, e.g. 2, 5, 7 or 2, 3, 7. Only earlier elements smaller than 7 count: 2, 5 and 3.'],
      ['2: 1 + dp[4], the element just before', 'The run can extend any earlier smaller element, not just the previous one.'],
    ]),
  step('The shelves are [2, 3, 7, 101]. The next value is 18. What do the shelves become?',
    [row('tails', [2, 3, 7, 101], { 3: 'first ≥ 18' }, { tones: { 3: 'hot' } })], 0, [
      ['[2, 3, 7, 18]: 18 replaces 101, the first tail ≥ 18', 'Yes. 18 extends the length-3 run ending at 7, and 18 is a better (smaller) ending for length 4 than 101.'],
      ['[2, 3, 7, 101, 18]: append it', 'Append only when x is bigger than every tail. 18 < 101, so it can’t extend the length-4 run.'],
      ['[2, 3, 18, 101]: replace the 7', '7 < 18, so 18 can follow 7. Replacing the 7 would forget the better length-3 ending.'],
    ]),
  step('[3, 4, 1]: the shelves end as [1, 4]. The LIS has length 2. Is [1, 4] itself an increasing subsequence?',
    [row('nums', [3, 4, 1]), row('tails', [1, 4])], 1, [
      ['Yes: the shelves are the answer', 'In the input, 1 comes after 4. The shelves mix endings from different runs.'],
      ['No: 1 comes after 4 in the input. Only the LENGTH is right; the real LIS is [3, 4]', 'Yes. To recover a subsequence, store a parent pointer for each element.'],
    ]),
  step('[1, 3, 2, 0]: dp = [1, 2, 2, 1]. What is the answer?',
    [row('nums', [1, 3, 2, 0]), row('dp', [1, 2, 2, 1])], 0, [
      ['2: the maximum over all dp[i]', 'Yes. The longest run (1, 3 or 1, 2) ends before the last element.'],
      ['1: dp[n − 1]', 'dp[n − 1] is the longest run that ends at the 0. The longest run can end anywhere.'],
    ]),
];

export const palindromes = [
  step('“cbbd”. Which centre finds “bb”?',
    [row('s', ['c', 'b', 'b', 'd'], {}, { tones: { 1: 'hot', 2: 'hot' } })], 2, [
      ['The letter at index 1', 'From index 1 the window is “b”, then compares c with b and stops.'],
      ['The letter at index 2', 'From index 2 it compares b with d and stops at “b”.'],
      ['The gap between index 1 and index 2', 'Yes. Even-length palindromes centre on a gap. Forget the gaps and “cbbd” returns “c”.'],
    ]),
  step('How many centres does a string of length 5 have?', [], 1, [
    ['5: one per letter', 'That finds only odd-length palindromes.'],
    ['9: 5 letters and 4 gaps (2n − 1)', 'Yes. Each costs at most O(n) to widen, so the whole search is O(n²) time and O(1) space.'],
    ['10: two per letter', 'The gap after the last letter has no right-hand side; it can never hold a palindrome.'],
  ]),
];

export const countPal = [
  step('“aaa”, centre on the letter at index 1. How many palindromes does the widening find?',
    [row('s', ['a', 'a', 'a'], { 1: 'centre' }, { tones: { 1: 'hot' } })], 1, [
      ['1: “a”', 'After “a” it compares index 0 with index 2: a = a, so “aaa” is found too.'],
      ['2: “a” and “aaa”', 'Yes. Every successful widening is a new palindrome. Over all five centres: 1 + 2 + 1 + 1 + 1 = 6.'],
      ['3: every substring through the centre', '“aa” stretches through index 1 too, but its centre is a gap, and the gaps count it.'],
    ]),
  step('Table version on “abba”, filled with i going UP from 0. pal[0][3] reads pal[1][2]. What does it find there?',
    [row('s', ['a', 'b', 'b', 'a'], { 0: 'i', 3: 'j' })], 1, [
      ['true: “bb” is a palindrome', 'It is, but row 1 hasn’t been filled yet when row 0 is computed.'],
      ['false: row 1 isn’t written yet, so “abba” is missed and the count is 5, not 6', 'Yes. pal[i][j] reads a row below it, so i must run from n − 1 down to 0.'],
    ]),
];

export const mixedReview = [
  step('A question asks only whether some target can be reached. How do you combine the cases?', [], 2, [
    ['Sum them', 'Sums count ways. Here you need yes or no, and a count would be wasted (and might overflow).'],
    ['Take the min', 'On booleans, min is AND: it would demand that EVERY last decision works, when one is enough.'],
    ['OR them: possible if any last decision leads to a possible smaller problem', 'Yes. Feasibility tables OR their cases, and start with empty = true.'],
  ]),
  step('Counting ways needs one thing that min, max and OR don’t. What?', [], 0, [
    ['Cases that don’t overlap: a solution in two cases would be counted twice', 'Yes. The last decision must split solutions into disjoint groups. Min, max and OR forgive seeing a candidate twice.'],
    ['A sentinel for impossible', 'Counting uses 0 for impossible; no sentinel needed.'],
    ['Rolling variables', 'Space saving is optional in every flavour.'],
  ]),
  step('Brute-force recursion for Climbing Stairs takes 2.7 million calls for n = 30. Why does a memo help, when it doesn’t help merge sort?', [], 1, [
    ['Merge sort has no recursion', 'It recurses on two halves. They just never repeat.'],
    ['Climbing Stairs has overlapping subproblems (climb(3) is asked 317,811 times); merge sort’s halves never repeat', 'Yes. A memo only pays when the same question comes back. Optimal substructure plus overlap is the signal.'],
    ['Memos only work on integers', 'Memos work on any state you can use as a key.'],
  ]),
  step('Positions hold jump lengths; can you reach the last position? Interviewer wants O(1) space.', [], 1, [
    ['A boolean table: reachable[i] = OR over earlier j that can jump to i', 'Correct, but O(n²) time and O(n) space. One number holds the same information.'],
    ['Carry the farthest reachable index; fail when the walk passes it', 'Yes. Every index up to the reach is reachable, so the reach summarises the whole table. O(n), O(1).'],
    ['Backtrack over every jump sequence', 'Exponential, and you only need yes or no.'],
  ]),
  step('Print every way to read a digit message as letters.', [], 2, [
    ['The counting table, then print dp[n]', 'dp[n] counts readings; it doesn’t list them.'],
    ['Rolling variables', 'They keep two numbers, not readings.'],
    ['Backtracking: choose a 1- or 2-digit letter, recurse, undo', 'Yes. The output can be exponential, so no table makes listing faster. A table can prune dead ends.'],
  ]),
  step('You’ve filled dp[i] = longest increasing run ENDING at i. Where is the answer?', [], 1, [
    ['dp[n − 1]', 'Only if the longest run ends at the last element. On [1, 3, 2, 0] that gives 1, not 2.'],
    ['The maximum over every dp[i]', 'Yes. When the state says “ending at i”, the answer can end anywhere.'],
    ['dp[0]', 'dp[0] is always 1: the first element on its own. It says nothing about longer runs.'],
  ]),
  step('One-row boolean table for “can a subset sum to target?”, each number used at most once. Which way does the inner loop run?', [], 1, [
    ['Upward, s from x to target', 'Upward lets can[s − x] already include this x, so one number is used many times. [1, 2, 5] with target 4 wrongly says true.'],
    ['Downward, s from target to x', 'Yes. can[s − x] is then still last round’s value: reachable without this number.'],
    ['Either', 'Only for unlimited copies (upward) or one copy (downward). They answer different questions.'],
  ]),
  step('Pick a value x, earn x, and every x − 1 and x + 1 is destroyed. Which book chapter is this in disguise?', [], 0, [
    ['House Robber over value buckets: earn[v] = v × count(v), no two adjacent values', 'Yes. Taking one x means taking them all, and destroying x ± 1 is “no two neighbours”.'],
    ['Coin change', 'There is no target amount; the constraint is about neighbours.'],
    ['Longest increasing subsequence', 'Order in the input doesn’t matter here; only which values are taken.'],
  ]),
];
