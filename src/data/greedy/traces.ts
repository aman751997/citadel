// Decision puzzles for the Greedy lesson. Every number here is re-derived in tests/greedy.test.ts.
import { row, step } from '../../lib/trace.ts';

export const kadane = [
  step('Values [−2, 1, −3, 4, −1, 2, 1, −5, 4]. After index 2 the run (the best total of a stretch ENDING at index 2) is −2: that is 1 + (−3). The next value is 4. Extend the run, or restart here?',
    [row('Values', [-2, 1, -3, 4, -1, 2, 1, -5, 4], { 3: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
      row('run', [-2, 1, -2, '·', '·', '·', '·', '·', '·'], { 2: 'run = −2' })], 1, [
      ['Extend: −2 + 4 = 2', 'Carrying the run costs 2 for nothing. Any stretch that ends at index 3 and includes the −2 run is 2 worse than the same stretch without it.'],
      ['Restart: 4 alone beats −2 + 4 = 2', 'Yes. The run has become a burden (it is negative), so every future total is better without it. The new run starts at index 3 with 4.'],
      ['Restart, because 1 + (−3) contains a negative value', 'Right move, wrong reason. Runs often contain negative values and are still worth keeping. The test is the run’s total: below zero means drop it.'],
    ]),
  step('Later, at index 7, the run is 6 (that is 4 − 1 + 2 + 1) and best is 6. The next value is −5. What now?',
    [row('Values', [-2, 1, -3, 4, -1, 2, 1, -5, 4], { 7: 'NEXT' }, { tones: { 3: 'hot', 4: 'hot', 5: 'hot', 6: 'hot' } }),
      row('run', [-2, 1, -2, 4, 3, 5, 6, '·', '·'], { 6: 'run = 6' })], 1, [
      ['Restart at −5: the run just met a negative value', 'Restarting gives −5; extending gives 6 + (−5) = 1. A run worth +6 is not a burden, whatever comes next. Only the run’s own sign decides.'],
      ['Extend: run = 1. Best stays 6', 'Yes. The run is still positive, so it helps whatever follows. At index 8 it becomes 1 + 4 = 5, which does not beat 6. Final answer: 6, the stretch [4, −1, 2, 1].'],
      ['Stop: nothing after this can beat 6', 'You cannot know that without reading on. If the last value were 10 instead of 4, the run would reach 11.'],
    ]),
  step('Every value is negative: [−3, −1, −2]. A tempting version starts run = best = 0 and resets the run to 0 whenever it dips below zero. What does it return?',
    [row('Values', [-3, -1, -2])], 2, [
      ['−1, the largest single value', 'That is the right answer, but not what this version returns. Its best starts at 0 and nothing ever beats 0.'],
      ['−6, the whole array', 'The whole array is the worst stretch here, not the best.'],
      ['0, the total of an empty stretch, which the problem forbids', 'Yes. The stretch must be non-empty. Starting run and best at nums[0], and restarting at the value itself, returns −1.'],
    ]),
];

export const product = [
  step('Values [−2, 3, −4]. After two values, hi (the largest product of a stretch ending here) is 3 and lo (the smallest) is −6. The next value is −4. What is the new hi?',
    [row('Values', [-2, 3, -4], { 2: 'NEXT' }, { tones: { 0: 'done', 1: 'done' } }),
      row('hi', [-2, 3, '·'], { 1: 'hi = 3' }), row('lo', [-2, -6, '·'], { 1: 'lo = −6' })], 2, [
      ['max(−4, 3 × −4) = −4', 'That forgets lo. A negative value turns the smallest product into the largest: −6 × −4 = 24.'],
      ['12', 'No stretch ending at index 2 has product 12. The candidates are −4 alone, 3 × −4 = −12 and −6 × −4 = 24.'],
      ['max(−4, 3 × −4, −6 × −4) = 24', 'Yes. The whole array [−2, 3, −4] has product 24. A version that tracks only hi answers 3 here.'],
    ]),
  step('Values [2, 3, 0, 4]. At the 0, hi and lo both become 0. At the 4, what are hi and lo?',
    [row('Values', [2, 3, 0, 4], { 3: 'NEXT' }, { tones: { 2: 'hot' } }),
      row('hi', [2, 6, 0, '·']), row('lo', [2, 3, 0, '·'])], 0, [
      ['hi = 4, lo = 0: the 4 starts fresh, because 0 × 4 = 0 is worse', 'Yes. Taking the value alone is always a candidate, so a zero acts as a reset. Best stays 6 from [2, 3].'],
      ['hi = 24, lo = 0: 6 × 4 carries over', '6 was the product ending at index 1. Every stretch ending at index 3 that reaches back past the zero has product 0.'],
      ['hi = 0, lo = 0: a zero ruins the rest of the array', 'A zero only ruins stretches that contain it. The stretch [4] alone has product 4.'],
    ]),
];

export const gas = [
  step('gas [4, 1, 1, 6], cost [1, 2, 5, 1], so each station’s gain is [3, −1, −4, 5]. Starting at 0 the tank reads 3, then 2, then −2 after station 2. Why may you skip stations 1 and 2 as starts?',
    [row('gain', [3, -1, -4, 5], { 0: 'START', 2: 'tank −2' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } })], 1, [
      ['You may not: each needs its own simulation', 'That is the O(n²) brute force. The tank already tells you about them.'],
      ['You reached each of them with a tank of at least 0 and still ran dry at station 2; starting there with 0 is no better', 'Yes. From station 1 with an empty tank: −1, then −5. From station 2: −4. Arriving with something never hurts, so a later start inside a failed stretch fails too. Restart at 3.'],
      ['Stations 1 and 2 have negative gain, so they are never starts', 'A negative-gain station can never be the start, true, but the rule is about every station in the failed stretch, positive ones included.'],
    ]),
  step('gas [2, 3, 4], cost [3, 4, 3]. Gains [−1, −1, 1]. The scan restarts at 1, then at 2, and ends with start = 2 and tank = 1. What is the answer?',
    [row('gain', [-1, -1, 1], { 2: 'start' }, { tones: { 0: 'out', 1: 'out', 2: 'hot' } })], 1, [
      ['2: the tank never went negative after the last restart', 'The scan only checked stations 2 to the end. Total gain is −1 + −1 + 1 = −1, so every lap loses 1 unit and no start can finish.'],
      ['−1: total gas 9 is less than total cost 10', 'Yes. The total check is the other half of the proof. Without it the code returns 2, and a car leaving station 2 runs dry before reaching station 2 again.'],
      ['0: try the first station when unsure', 'Station 0 runs dry immediately: 2 gas against a cost of 3.'],
    ]),
];

export const jump = [
  step('Jump lengths [3, 2, 1, 0, 4]. After stones 0 to 3, far (the farthest stone reachable so far) is 3. You arrive at stone 4. What happens?',
    [row('Lengths', [3, 2, 1, 0, 4], { 3: 'far = 3', 4: 'i = 4' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'out' } })], 0, [
      ['Return false: i = 4 is past far = 3, so stone 4 is unreachable', 'Yes. Every stone reaches stone 3 at most (0 + 3, 1 + 2, 2 + 1, 3 + 0). The 4 on the last stone never matters.'],
      ['Return true: stone 4 has a jump of 4', 'You have to stand on a stone to use its jump. Nothing reaches stone 4.'],
      ['Backtrack and try a shorter jump from stone 0', 'Shorter jumps only reach stones that far already covers. Reachable stones always form one unbroken block from 0 to far.'],
    ]),
  step('Jump lengths [2, 0, 1, 0]. Stone 1 has jump length 0. Are you stuck?',
    [row('Lengths', [2, 0, 1, 0], { 1: 'zero' }, { tones: { 1: 'hot' } })], 1, [
      ['Yes: a 0 before the last stone traps you', 'Only if far cannot pass it. Stone 0 already reaches stone 2.'],
      ['No: far is 2 after stone 0, then 3 after stone 2, which is the last stone', 'Yes. A zero only matters when far stops at it. Here you jump over it.'],
    ]),
];

export const jumpII = [
  step('Jump lengths [2, 3, 1, 1, 4]. From stone 0 you can land on stone 1 or stone 2. A tempting rule: jump as far as you can. Where does that lead?',
    [row('Lengths', [2, 3, 1, 1, 4], { 0: 'HERE' }, { tones: { 1: 'hot', 2: 'hot' } })], 1, [
      ['Stone 2, then the end in one more jump: 2 jumps', 'From stone 2 you reach only stone 3 (2 + 1). Then 3 → 4. That is 0 → 2 → 3 → 4: 3 jumps.'],
      ['0 → 2 → 3 → 4, 3 jumps, but 0 → 1 → 4 takes 2', 'Yes. The landing spot is the wrong thing to be greedy about. What matters is how far the NEXT jump can reach from each stone you could land on: 1 + 3 = 4 beats 2 + 1 = 3.'],
      ['It is optimal, because a longer jump never hurts', 'It hurts here. A long jump to a weak stone loses to a short jump to a strong one.'],
    ]),
  step('Same stones. After 1 jump you can stand anywhere in stones 1..2 (end = 2). Scanning them gives far = max(1 + 3, 2 + 1) = 4. You are at i = 2 = end. What now?',
    [row('Lengths', [2, 3, 1, 1, 4], { 2: 'i = end', 4: 'far' }, { tones: { 0: 'done', 1: 'hot', 2: 'hot' } })], 0, [
      ['jumps = 2, end = far = 4, which covers the last stone: answer 2', 'Yes. Level 2 is every stone from 3 to 4. You never chose which stone to land on; you only counted levels.'],
      ['Keep scanning stone 3 inside the same level', 'Stone 3 is past end = 2: it cannot be reached with 1 jump. Moving past end means taking jump number 2.'],
      ['Answer 3: one jump per stone you scan', 'The scan visits every stone, but a jump is counted only when you cross the edge of a level.'],
    ]),
];

export const partition = [
  step('“ababcbacadefegdehijhklij”. The first letter is a, and the last a sits at index 8. Can the first piece end after index 5, where the last b is?',
    [row('Letters', [...'ababcbacadefegdehijhklij'], { 0: 'a', 5: 'last b', 8: 'last a' }, { tones: { 0: 'hot', 2: 'hot', 6: 'hot', 8: 'hot' } })], 1, [
      ['Yes: every b is inside 0..5', 'The a at index 0 is in the piece, and more a’s follow at 6 and 8. A letter may live in only one piece.'],
      ['No: the piece holds an a, so it must reach index 8, and c’s last copy at 7 is inside that too', 'Yes. end = max(last of every letter seen) = 8. At i = 8 nothing inside needs to go further: cut. First piece: 9 letters.'],
      ['No: the piece must run to the end of the string', 'Only if some letter in it appears at the very end. After index 8, no a, b or c ever appears again.'],
    ]),
  step('A second string, “abba”. A shortcut: cut wherever the CURRENT letter makes its last appearance. What does that produce?',
    [row('Letters', [...'abba'], { 2: 'last b' }, { tones: { 2: 'hot' } })], 2, [
      ['[4], the right answer', 'The shortcut cuts at index 2, because the b there is the last b. It forgets that the a from index 0 still has a copy at 3.'],
      ['[2, 2]', 'Nothing cuts after index 1: neither a (last at 3) nor b (last at 2) has finished there.'],
      ['[3, 1], an illegal split: a appears in both pieces', 'Yes. The cut must wait for the farthest last-appearance of EVERY letter in the piece, which is why end takes a max.'],
    ]),
];

export const straights = [
  step('Cards [1, 2, 3, 6, 2, 3, 4, 7, 8], groups of 3 consecutive values. The smallest card is 1. Which group must it join?',
    [row('Counts (value ×count)', ['1 ×1', '2 ×2', '3 ×2', '4 ×1', '6 ×1', '7 ×1', '8 ×1'], { 0: 'smallest' }, { tones: { 0: 'hot' } })], 0, [
      ['1, 2, 3: nothing is smaller than 1, so 1 must start its group', 'Yes. A group containing 1 cannot start below 1, so it is exactly 1, 2, 3. There is no choice, so there is nothing to regret. Then 2, 3, 4 and 6, 7, 8.'],
      ['Any group that contains a 1; try them all', 'There is only one: 1, 2, 3. A group starting at 0 or −1 would need cards that do not exist.'],
      ['Start with the most common card, 2', 'A group 2, 3, 4 first is fine here by luck, but a rule “not the smallest” can strand a small card: try [2, 1, 3, 4, 5, 6] starting from 2.'],
    ]),
  step('Cards [1, 1, 2, 2, 3, 4], groups of 3. You have formed 1, 2, 3. Left: 1, 2, 4. What now?',
    [row('Counts left', ['1 ×1', '2 ×1', '4 ×1'], { 0: 'smallest' }, { tones: { 0: 'hot' } })], 1, [
      ['Start at 2 instead: 2, 3, 4', 'The 3 is gone, and the 1 would be stranded anyway: it can only ever start a group.'],
      ['The smallest is 1, so the group must be 1, 2, 3. There is no 3 left: return false', 'Yes. Because each step is forced, a hole means no arrangement exists at all, not merely that this one failed.'],
      ['Undo the first group and search again', 'The first group was forced too. Any arrangement must contain 1, 2, 3, so backtracking cannot help.'],
    ]),
];

export const mixedReview = [
  step('Coins {1, 3, 4}. Make 6 with the fewest coins. “Always take the largest coin that fits”: trust it?', [], 2, [
    ['Yes: it works for real money', 'It works for coin systems like {1, 5, 10, 25}, which happen to be designed for it. Here it takes 4 + 1 + 1 = 3 coins.'],
    ['Yes, after sorting the coins first', 'Sorting changes nothing. The largest-first rule still picks 4 and gets stuck with 1 + 1.'],
    ['No: 4 + 1 + 1 uses 3 coins, but 3 + 3 uses 2. Use DP over amounts', 'Yes. One tiny counterexample kills the rule. The fix is to try every last coin with memory: best[a] = 1 + min over coins c of best[a − c].'],
  ]),
  step('Maximum subarray sum. When does the running sum restart?', [], 1, [
    ['When the next value is negative', 'A negative value is often worth crossing: [5, −2, 5] has best 8.'],
    ['When the run itself drops below zero: it can only make later totals smaller', 'Yes. A negative run is a burden; drop it. That one exchange argument is the whole algorithm.'],
    ['Never; add everything and subtract the minimum', 'The whole array minus its smallest value is not a contiguous stretch.'],
  ]),
  step('Maximum product subarray. Why carry the smallest product too?', [], 0, [
    ['A negative value turns the smallest product into the largest, as in [−2, 3, −4] → 24', 'Yes. The best product ending here is the value alone, hi × value, or lo × value. Drop lo and you answer 3 on that input.'],
    ['To handle zeros', 'Zeros are handled by letting the value start fresh. lo exists for negatives.'],
    ['It is an optimisation; hi alone is enough', 'hi alone is wrong on [−2, 3, −4].'],
  ]),
  step('Fewest jumps to the last stone. After k jumps, the window of reachable stones ends at end. Which proof style says the window approach is optimal?', [], 1, [
    ['Exchange argument: swap one jump of the best path for the greedy jump', 'You could argue that way, but the window approach never picks a stone to swap. Its argument compares how far each method has got.'],
    ['Stays ahead: after k jumps, no path of k jumps can stand beyond end', 'Yes. Induction on k: any path’s k-th stone lies inside the window, so its next landing is at most the next window’s end. The greedy is never behind.'],
    ['No proof needed: it is breadth-first search', 'It is breadth-first search by levels, and that is a proof: BFS levels are shortest distances. Saying why the window equals a level is the part to explain.'],
  ]),
  step('Gas Station. Total gas ≥ total cost. Is a valid start guaranteed?', [], 0, [
    ['Yes: start just after the lowest point of the running tank; from there it never dips below its starting level', 'Yes. Every partial total from that start is at least 0, and the wrap-around adds the lap total, which is ≥ 0.'],
    ['No: the stations may be in an unlucky order', 'Order cannot defeat it. Some point of the running total is the lowest, and starting after it works.'],
    ['Only if every station has gas ≥ cost', 'Then every start works. The claim is much stronger: the totals alone decide.'],
  ]),
  step('Groups of consecutive cards. Why take the smallest remaining card first?', [], 1, [
    ['It is fastest with a TreeMap', 'Speed is not the reason. The reason is that the choice is forced.'],
    ['Nothing smaller is left, so it can only START a group: that group is fixed', 'Yes. A forced move cannot be regretted. (The largest card is forced too, as an end.)'],
    ['Smaller cards are rarer', 'Rarity has nothing to do with it.'],
  ]),
  step('0/1 knapsack, capacity 50: items (weight 10, value 60), (20, 100), (30, 120). “Take the best value per weight first.” Result?', [], 2, [
    ['220, optimal', 'The ratio rule takes 60 and 100 (weight 30), then 120 does not fit: 160.'],
    ['160, optimal: nothing else fits', '20 + 30 = 50 fits exactly, for 100 + 120 = 220.'],
    ['160, but 220 is possible: whole items break the ratio argument. Use DP over capacity', 'Yes. With fractions allowed the ratio rule is optimal; with whole items it is not. The exchange argument needs items you can split.'],
  ]),
  step('Split a string so each letter appears in one piece, as many pieces as possible. When is it safe to cut after index i?', [], 1, [
    ['When the letter at i makes its last appearance there', 'The other letters in the piece might continue: “abba” would be cut after index 2.'],
    ['When i equals the farthest last-appearance of every letter in the current piece', 'Yes. Then no letter crosses the cut. Cutting at every safe point gives the most pieces.'],
    ['After every 26 letters', 'The alphabet size has nothing to do with where letters repeat.'],
  ]),
  step('Before coding a greedy rule, what is the cheapest test?', [], 0, [
    ['Hunt for a counterexample on three tiny inputs: an edge case, a trap where an early good-looking pick blocks a better one, and a tie', 'Yes. Two minutes of hunting either kills the rule or tells you what the proof must say.'],
    ['Run it on the sample input', 'The sample is chosen to be friendly. Coin change {1, 5, 10} passes every sample a greedy writer would try.'],
    ['Check that it runs in O(n log n)', 'A fast wrong answer is still wrong. Correctness comes first.'],
  ]),
];
