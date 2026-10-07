// Decision puzzles for the Backtracking lesson. Every number here is re-derived in tests/backtracking.test.ts.
import { row, step } from '../../lib/trace.ts';

export const subsets = [
  step('Subsets of [1, 2, 3], loop-from-start shape. You have just returned from the corridor [1, 2, 3], so the thread holds [1, 2, 3]. The junction at [1, 2] has no doors left; you return to the junction at [1], whose next door is 3. What must have happened to the thread on the way?',
    [row('Items', [1, 2, 3], { 0: 'on', 1: 'on', 2: 'on' }, { tones: { 0: 'hot', 1: 'hot', 2: 'hot' } }),
      row('Thread', [1, 2, 3])], 1, [
      ['Nothing: the next loop iteration overwrites the last item', 'path.add appends; it never overwrites. Without removals the thread keeps growing, and the fifth page reads [1, 2, 3, 3] where [1, 3] belongs.'],
      ['Two un-chooses: 3 is removed when its call returns, then 2, so the thread is [1] again', 'Yes. Each call removes exactly what it added. Back at [1] the thread is [1], and the next door writes [1, 3].'],
      ['Clear the whole thread and rebuild it from the entrance', 'That throws away the 1 you still need, and rebuilding costs time at every junction. Un-choose is one removal per return.'],
    ]),
  step('A junior Scribe records with result.add(path), pinning the thread itself. The search on [1, 2, 3] finishes. What does the book hold?',
    [row('Book (8 entries)', ['?', '?', '?', '?', '?', '?', '?', '?'])], 2, [
      ['The 8 subsets, as usual', 'Each entry is a reference to the same list object, not a snapshot. Later moves change what every entry shows.'],
      ['8 copies of [1, 2, 3], the biggest thread', 'The thread does reach [1, 2, 3], but it keeps changing after that. The entries show the thread’s final state, not any earlier one.'],
      ['8 empty lists: every entry is the one shared thread, and the search ends with it wound back to empty', 'Yes. The fix is result.add(new ArrayList<>(path)) — a snapshot that later moves cannot touch.'],
    ]),
  step('In the loop-from-start shape, how many pages does [1, 2, 3] produce, and where are they written?',
    [row('Items', [1, 2, 3])], 0, [
      ['8, one on arrival at every node, including the empty root', 'Yes. Every node of this tree is a subset: [ ], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]. That is 2³.'],
      ['4, only at the leaves', 'That is the leaf count of this tree: [1, 2, 3], [1, 3], [2, 3], [3]. Recording only there loses [ ], [1], [1, 2] and [2]. Leaves-only recording belongs to the in-or-out shape, whose leaves are all the subsets.'],
      ['7, at every node except the empty root', 'The empty set is a subset too. LeetCode expects [ ] in the answer.'],
    ]),
];

export const subsetsDup = [
  step('Sorted [1, 2, 2]. At the entrance (start = 0) the doors 1 and 2 (index 1) have been walked. Now i = 2 and nums[2] = 2 = nums[1]. Walk this door?',
    [row('Items (sorted)', [1, 2, 2], { 0: 'start', 2: 'i' }, { tones: { 2: 'hot' } }), row('Thread', [])], 1, [
      ['Yes: it is a different index, so a different key', 'Equal values give identical subtrees. Walking it writes [2] and [2, 2] a second time.'],
      ['No: i > start and it equals its left twin, which already opened this exact corridor at this junction', 'Yes. Same value, same junction, same subtree. Skip it.'],
      ['Yes, but only record the subsets that are new', 'That still walks the whole duplicate subtree and needs a set to filter it. The skip rule never walks it at all.'],
    ]),
  step('Now the thread is [1, 2] (the 2 at index 1) and start = 2. The only door is i = 2, and nums[2] == nums[1]. Walk it?',
    [row('Items (sorted)', [1, 2, 2], { 2: 'start = i' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } }), row('Thread', [1, 2])], 0, [
      ['Yes: i == start, so it is the first door at this junction; [1, 2, 2] has never been written', 'Yes. Its twin to the left is on the thread, not a sibling. The rule is i > start, not i > 0.'],
      ['No: it is a twin of nums[1]', 'That is the i > 0 bug. It skips the first door of a junction, and the book ends with 4 pages instead of 6: [1, 2, 2] and [2, 2] are lost.'],
    ]),
  step('Why must the array be sorted before the twin rule works?',
    [row('Unsorted', [2, 1, 2])], 2, [
      ['Sorting makes the output come out in order, which LeetCode requires', 'LeetCode accepts any order. Sorting matters for correctness, not presentation.'],
      ['Sorting is only for speed', 'Without it the answer is wrong, not slow: on [2, 1, 2] the rule never fires and [2] is written twice.'],
      ['The rule compares nums[i] with nums[i − 1]; only sorting puts twins next to each other', 'Yes. On unsorted [2, 1, 2] no two neighbours are equal, the rule never fires, and the book gets 8 pages with [2] twice — and [2, 1] beside [1, 2].'],
    ]),
];

export const combinations = [
  step('n = 4, k = 2. At the entrance the thread is empty and needs 2 numbers. What is the last door worth walking?',
    [row('Numbers', [1, 2, 3, 4], {}, { tones: { 3: 'out' } }), row('Thread', [])], 1, [
      ['4: every number may start a hand', 'A hand starting at 4 needs a second number bigger than 4. There is none, so that corridor is a dead end.'],
      ['3 = n − need + 1: after it there must still be room for one more number', 'Yes. With need items left to pick, the first can be at most n − need + 1 = 4 − 2 + 1 = 3.'],
      ['2: half of n', 'Then [3, 4] is never written. The bound depends on how many numbers are still needed, not on n alone.'],
    ]),
  step('The thread is [1, 3], k = 2. What now?',
    [row('Numbers', [1, 2, 3, 4], { 0: 'on', 2: 'on' }, { tones: { 0: 'done', 2: 'done' } }), row('Thread', [1, 3])], 0, [
      ['Record a copy and return: the hand is full', 'Yes. Going deeper can only make hands of 3. Record when path.size() == k, then return.'],
      ['Try 4 as well, then record', 'That records [1, 3, 4], a hand of 3.'],
      ['Record, then keep looping from 4', 'Any door walked from here makes the hand too big. Return right after recording.'],
    ]),
  step('Someone writes the bound as i <= n − need instead of n − need + 1. On n = 4, k = 2, how many pages does the book get?',
    [row('Numbers', [1, 2, 3, 4])], 2, [
      ['6, the bound only affects speed', 'It cuts a door that still has a hand behind it, so it changes the answer.'],
      ['5: only [3, 4] is lost', 'The bound is wrong at every depth. One level down, need = 1 and the loop stops at 3, so [1, 4] and [2, 4] go too.'],
      ['3: [1, 2], [1, 3], [2, 3] — every hand containing 4 is lost', 'Yes. The last door is cut at every junction, and 4 is always the last door. C(4, 2) = 6 hands exist.'],
    ]),
];

export const comboSum = [
  step('Coins [2, 3, 6, 7], target 7. You add a 2 at index 0; 5 is still owed. Where does the child’s loop start?',
    [row('Coins (sorted)', [2, 3, 6, 7], { 0: 'i' }, { tones: { 0: 'hot' } }), row('Thread', [2])], 1, [
      ['At i + 1 = 1: each coin is used once', 'That forbids a second 2, and [2, 2, 3] is lost: the book holds only [7].'],
      ['At i = 0: the same coin may be paid again, but no coin to its left', 'Yes. Equal neighbours are allowed; going left is not. [2, 2, 3] is built once, in non-decreasing order.'],
      ['At 0 always, so every coin is available', 'Here 0 happens to equal i. But the rule “start from 0” lets [3] be followed by a 2, so [2, 2, 3] is also written as [2, 3, 2] and [3, 2, 2].'],
    ]),
  step('Thread [2, 2, 2]; 1 is still owed; the loop starts at index 0 with coin 2. What do the Shears say?',
    [row('Coins (sorted)', [2, 3, 6, 7], { 0: 'i' }, { tones: { 0: 'hot' } }), row('Thread', [2, 2, 2])], 0, [
      ['break: 2 > 1, and every later coin is at least 2', 'Yes. Sorted coins make one overshoot end the whole loop. Wind back and try 3 at [2, 2].'],
      ['continue: maybe 3 fits', 'Correct but wasted: 3, 6 and 7 are all bigger than 2, which already overshoots. With sorted coins, break.'],
      ['Record [2, 2, 2]: it is close enough', 'It sums to 6, not 7. Only owe 0 is recorded.'],
    ]),
  step('Thread [3]; 4 is owed; the loop starts at index 1. Which coins may this corridor offer?',
    [row('Coins (sorted)', [2, 3, 6, 7], { 1: 'start' }, { tones: { 0: 'out' } }), row('Thread', [3])], 1, [
      ['2, 3, 6 and 7', 'A 2 after a 3 rebuilds a handful already found under the 2 corridor: [3, 2, 2] is [2, 2, 3] again.'],
      ['3, 6 and 7 — never 2', 'Yes. Every handful that contains a 2 was written under the 2 corridor. Here 3 fits (owe 1, then a dead end), and 6 > 4 cuts the rest.'],
      ['Only 6 and 7', 'That forbids a second 3; with reuse allowed, [3, 3] must be walked (it dead-ends at owe 1, but it must be tried).'],
    ]),
];

export const letters = [
  step('digits = "23". How deep is the tree, and how many words does it record?',
    [row('Dial 2', ['a', 'b', 'c'], {}, {}), row('Dial 3', ['d', 'e', 'f'])], 2, [
      ['Depth 6, one level per letter; 6 words', 'The levels are the digits, not the letters. Each level picks one letter from that digit’s menu.'],
      ['Depth 2; 6 words (3 + 3)', 'Choices multiply along a path: 3 first letters, each followed by 3 second letters.'],
      ['Depth 2, one level per digit; 3 × 3 = 9 words', 'Yes: ad, ae, af, bd, be, bf, cd, ce, cf.'],
    ]),
  step('digits = "". What should the function return?',
    [row('Digits', [])], 0, [
      ['An empty list', 'Yes. LeetCode expects [] for no digits, so this needs an explicit check before the recursion.'],
      ['A list holding the empty string', 'That is what the bare recursion produces: at depth 0, pos == length, so it records "". The problem wants [].'],
    ]),
  step('In the order the tree is walked, what is the 4th word recorded for "23"?',
    [row('Dial 2', ['a', 'b', 'c']), row('Dial 3', ['d', 'e', 'f'])], 1, [
      ['ae', 'That is the 2nd: ad, ae, af all come first.'],
      ['bd', 'Yes. The a-corridor records ad, ae, af; then the b-corridor starts with bd.'],
      ['cd', 'That is the 7th: ad, ae, af, bd, be, bf come first.'],
    ]),
];

export const permutations = [
  step('Orderings of [1, 2, 3]. The thread is [2]; its bell rings. Which doors are open at this junction?',
    [row('Items', [1, 2, 3], { 1: 'used' }, { tones: { 1: 'done' } }), row('Thread', [2])], 1, [
      ['Only 3: doors to the right of the last item', 'That is the combination rule. [2, 1, 3] would never be written, and the book would hold only [1, 2, 3].'],
      ['1 and 3: every item whose bell is silent', 'Yes. In an ordering, a smaller item may come later. The loop runs from 0 and skips only rung bells.'],
      ['1, 2 and 3', '2 is already on the thread. Placing it again makes [2, 2], which is not an ordering of [1, 2, 3].'],
    ]),
  step('Someone forgets used[i] = false in the un-choose. What does the book hold for [1, 2, 3]?',
    [row('Bells after the first walk', ['ring', 'ring', 'ring'])], 0, [
      ['One page, [1, 2, 3]: after the first walk every bell rings forever', 'Yes. The thread is wound back, but the bells are not, so every later door looks occupied.'],
      ['All 6 pages, because the thread is still wound back', 'The loop checks the bells, not the thread. With every bell ringing, no later door opens.'],
      ['6 pages, with duplicates', 'Nothing is placed twice; nothing new is placed at all after the first walk.'],
    ]),
  step('How many nodes does the full tree for [1, 2, 3] have, counting the root?',
    [row('Items', [1, 2, 3])], 2, [
      ['6, one per ordering', 'Those are only the leaves. Partial orderings are nodes too.'],
      ['8, like the subsets of 3 items', 'Subsets of 3 items make 8 nodes; orderings make more, because order matters.'],
      ['16: 1 + 3 + 6 + 6', 'Yes. Depth d has 3!/(3 − d)! nodes: 1, 3, 6, 6. The total stays below e · n!.'],
    ]),
];

export const wordSearch = [
  step('Board [[A, B], [A, A]], word AAB. You matched A at (0, 0) and stepped down to the A at (1, 0). Its right neighbour (1, 1) holds A, not B. Can you step back up to (0, 0)?',
    [row('row 0', ['#', 'B'], { 0: 'on path' }, { tones: { 0: 'done' } }), row('row 1', ['#', 'A'], { 0: 'HERE' }, { tones: { 0: 'hot' } })], 1, [
      ['Yes: it holds an A', 'It held an A. It is marked #: it is already on this path, and a tile can’t be stood on twice. Besides, the next letter needed is B.'],
      ['No: (0, 0) is marked as on the path; this walk is a dead end', 'Yes. Every neighbour fails, so this call returns false — and on the way back it must restore (1, 0), then (0, 0).'],
    ]),
  step('Both walks from (0, 0) failed. As you leave (0, 0), do you restore its A?',
    [row('row 0', ['#', 'B'], { 0: 'leaving' }, { tones: { 0: 'hot' } }), row('row 1', ['A', 'A'])], 0, [
      ['Yes: a later walk, (1, 0) → (0, 0) → (0, 1), needs it', 'Yes. The mark only means “on the current path”. Restored, the walk from (1, 0) spells A, A, B and the answer is true.'],
      ['No: it failed once, so it will always fail', 'It failed as the FIRST letter. As the second letter, after (1, 0), it succeeds. Leave the mark and the answer flips to false.'],
    ]),
  step('Board [[A, B]], word ABA. A version that never marks cells returns what?',
    [row('row 0', ['A', 'B'])], 1, [
      ['false, correctly', 'Without marks, nothing stops the walk from returning to (0, 0).'],
      ['true, wrongly: A → B → the same A again', 'Yes. The word needs two different A tiles and the board has one. Marking is what forbids reuse.'],
    ]),
];

export const palindrome = [
  step('s = "aab". At position 0, which first pieces are doors you actually walk?',
    [row('s', ['a', 'a', 'b'], { 0: 'start' }, { tones: { 0: 'hot' } })], 1, [
      ['a, aa and aab', 'aab reversed is baa. The Shears cut it before it is walked.'],
      ['a and aa', 'Yes. Both read the same backwards; aab does not.'],
      ['Only a: pieces are one letter long', 'Pieces can be any length, as long as they are palindromes. aa is a valid first piece.'],
    ]),
  step('The thread is [aa], so start = 2. The only piece left is b. After walking it, start = 3. What now?',
    [row('s', ['a', 'a', 'b'], { 2: 'start' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } }), row('Thread', ['aa'])], 0, [
      ['start == length: the ribbon is fully cut; record [aa, b]', 'Yes. Recording happens only when every letter belongs to a piece.'],
      ['Keep looping from 3', 'There are no letters at position 3 or later. The loop would not run; the record must happen first.'],
    ]),
  step('How many pages does "aab" produce?',
    [row('s', ['a', 'a', 'b'])], 1, [
      ['1', 'There are two ways: [a, a, b] and [aa, b].'],
      ['2', 'Yes: [a, a, b] and [aa, b].'],
      ['4 = 2²', 'There are 4 ways to cut a 3-letter string, but [a, ab] and [aab] contain non-palindromes.'],
    ]),
];

export const queens = [
  step('4 × 4. A queen stands at (0, 1). In row 1, which columns are safe?',
    [row('row 0', ['·', 'Q', '·', '·'], {}, { tones: { 1: 'done' } }), row('row 1', ['?', '?', '?', '?'], {}, { tones: { 0: 'hot', 1: 'hot', 2: 'hot', 3: 'hot' } })], 2, [
      ['0 and 3', '(1, 0) has r + c = 1, the same as (0, 1): the anti-diagonal is watched.'],
      ['0, 2 and 3', '(1, 2) has r − c = −1, the same as (0, 1), and (1, 0) shares r + c = 1. Both are watched.'],
      ['Only 3', 'Yes. Column 1 is taken; (1, 0) shares r + c = 1; (1, 2) shares r − c = −1. (1, 3) has column 3, r − c = −2, r + c = 4: all free.'],
    ]),
  step('Why is the diagonal stored at index r − c + n − 1?',
    [row('r − c on a 4 × 4 board', [-3, -2, -1, 0, 1, 2, 3])], 0, [
      ['r − c runs from −(n − 1) to n − 1; adding n − 1 shifts it into 0 … 2n − 2', 'Yes. 2n − 1 diagonals, all with non-negative indexes. Without the shift, diag[r − c] throws on the first square right of the main diagonal.'],
      ['It is the anti-diagonal formula', 'The anti-diagonal is r + c, which is never negative. r − c needs the shift.'],
      ['It numbers the squares row by row', 'That would be r · n + c, which is one index per square, not per diagonal.'],
    ]),
  step('Queens at (0, 0) and (1, 2). Row 2: column 0 is taken; (2, 1) shares r + c = 3 with (1, 2); column 2 is taken; (2, 3) shares r − c = −1 with (1, 2). Next move?',
    [row('row 0', ['Q', '·', '·', '·'], {}, { tones: { 0: 'done' } }), row('row 1', ['·', '·', 'Q', '·'], {}, { tones: { 2: 'done' } }), row('row 2', ['×', '×', '×', '×'], {}, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out' } })], 1, [
      ['Skip row 2 and try row 3', 'Every row needs exactly one queen. A board with an empty row has 3 queens, not 4.'],
      ['Backtrack: lift the row-1 queen, clear its column and diagonals, and try (1, 3)', 'Yes. Row 2 has no door, so this corridor is dead. Wind back to row 1 and try its next column.'],
      ['Restart from an empty board', 'The queen at (0, 0) may still lead somewhere through (1, 3). Backtracking undoes one choice, not all of them.'],
    ]),
];

export const permDup = [
  step('Sorted [1, 1, 2], copies named 1a (index 0) and 1b (index 1). The thread is empty; 1a was just tried at position 0 and un-chosen. Now i = 1 (1b): used[0] is false. Walk it?',
    [row('Items', ['1a', '1b', '2'], { 1: 'i' }, { tones: { 1: 'hot' } }), row('Thread', [])], 1, [
      ['Yes: 1b is a different index', 'A 1 at position 0 was just explored with 1a. 1b would grow an identical subtree: [1, 1, 2] and [1, 2, 1] again.'],
      ['No: its left twin 1a is not on the thread, so 1b would go before it — out of order', 'Yes. !used[i − 1] catches exactly this: equal values must be placed left copy first.'],
    ]),
  step('The thread is [1a]. Now i = 1 (1b): used[0] is true. Walk it?',
    [row('Items', ['1a', '1b', '2'], { 0: 'on', 1: 'i' }, { tones: { 0: 'done', 1: 'hot' } }), row('Thread', ['1a'])], 0, [
      ['Yes: 1a is already on the thread, so the copies are going in order', 'Yes. This is the only branch that builds [1, 1, 2] — 1a, then 1b, then 2.'],
      ['No: it is a twin of nums[0]', 'Skipping twins regardless of the bells means 1b can never be placed, and the book ends empty: no ordering uses both 1s.'],
    ]),
  step('Replace !used[i − 1] with used[i − 1]. On [1, 1, 1, 1], what happens?',
    [row('Items', [1, 1, 1, 1])], 2, [
      ['Wrong answer: duplicates appear', 'Each distinct ordering still has exactly one branch: the copies are forced into reverse index order instead.'],
      ['Wrong answer: the book is empty', 'That happens when the bell check is dropped entirely. used[i − 1] still allows the right-most copy first.'],
      ['Same single page, but 23 calls instead of 5: dead branches are found later', 'Yes. Both rules are correct; !used[i − 1] prunes earlier. Starting with the wrong copy only dies deeper in the tree.'],
    ]),
];

export const mixedReview = [
  step('“Return all possible subsets. The input may contain duplicates; the answer must not.”', [], 1, [
    ['Generate all subsets, then remove duplicates with a HashSet of lists', 'It works only if every subset is sorted first, and it walks every duplicate subtree before discarding it.'],
    ['Sort; loop from start; skip nums[i] when i > start and it equals nums[i − 1]', 'Yes. Siblings at a junction carry distinct values, so no subtree is walked twice.'],
    ['Sort; skip nums[i] when i > 0 and it equals nums[i − 1]', 'i > 0 also skips the first door of a junction, so subsets with repeated values like [2, 2] are lost.'],
  ]),
  step('“How many different ways can you climb 40 stairs taking 1 or 2 steps at a time?”', [], 2, [
    ['Backtracking: walk every way and count the pages', 'There are 165,580,141 ways. Walking each one is hopeless; the count needs no pages at all.'],
    ['Permutations of a list of 1s and 2s', 'Still one page per way: 165,580,141 of them.'],
    ['DP: ways(n) = ways(n − 1) + ways(n − 2)', 'Yes. Only the count is asked. About 40 additions give 165,580,141.'],
  ]),
  step('“Return every ordering of these distinct numbers.”', [], 0, [
    ['Loop from 0 at every depth, skip items whose used[i] is true; record at full length', 'Yes. Order matters, so every unused item is a door at every depth. O(n · n!).'],
    ['Loop from start, child at i + 1', 'That builds each GROUP once, in increasing order. It returns one ordering, not n!.'],
    ['Sort, then reverse repeatedly', 'Reversing gives at most two orders. To get all of them you need every choice at every position.'],
  ]),
  step('“Every combination of candidates summing to target; candidates may repeat in the input; each may be used once.”', [], 1, [
    ['Child at i, sorted break', 'Child at i reuses a candidate: [1, 1] from a single 1.'],
    ['Sort; skip twins with i > start; child at i + 1; break when a candidate exceeds what is left', 'Yes. Combination Sum II: no reuse is i + 1, duplicates are the Subsets II skip, and sorted input allows the break.'],
    ['Child at 0, record into a set', 'Child at 0 writes each handful once per order, then the set throws them away. Exponentially more work for the same answer.'],
  ]),
  step('You record with result.add(path) and every page comes out empty. Why?', [], 0, [
    ['Every entry is a reference to the one shared thread, which ends empty; record new ArrayList<>(path)', 'Yes. A snapshot copy is the only thing later moves cannot change.'],
    ['The recursion never reaches the base case', 'Then there would be no entries. There are the right number of entries; they all show the same final state.'],
    ['ArrayList is not thread-safe', 'There is one thread of execution here. The problem is aliasing, not concurrency.'],
  ]),
  step('Word Search lifts its visited mark when a cell is left; Number of Islands never does. Why the difference?', [], 1, [
    ['Word Search is on a smaller board', 'Board size changes nothing. The two marks answer different questions.'],
    ['Islands asks about reachability (once seen, done); Word Search asks about paths (a cell may serve a different path later)', 'Yes. A backtracking mark means “on the current path”, so it must be lifted when the path leaves.'],
    ['Lifting the mark is an optimisation', 'It is a correctness requirement: without it, [[A, B], [A, A]] with AAB returns false.'],
  ]),
  step('What is the time for listing every subset of n distinct items?', [], 2, [
    ['O(2ⁿ)', 'There are 2ⁿ subsets, but each costs up to n to copy onto its page.'],
    ['O(n²)', 'The output alone has 2ⁿ entries. Nothing polynomial can write it.'],
    ['O(n · 2ⁿ): 2ⁿ pages, each copied in up to n steps', 'Yes. The output is that big, so this is optimal. Extra space is O(n) besides the output.'],
  ]),
  step('“Is there any subset of these 200 numbers (each between 1 and 100) that sums to exactly T?”', [], 1, [
    ['Backtracking with sorted pruning', '2²⁰⁰ subsets. Pruning helps, but nothing bounds the worst case.'],
    ['DP over reachable sums: at most 200 × 100 = 20,000 of them', 'Yes. Only yes/no is asked and the sums are small, so track which sums are reachable.'],
    ['Greedy: take the largest numbers first', 'Greedy can overshoot and never come back. With 6, 5, 5 and T = 10, taking 6 first fails although 5 + 5 works.'],
  ]),
  step('In Java, path.remove(nums[i]) is used to un-choose. What happens on [1, 2, 3]?', [], 0, [
    ['It removes by position, not by value: winding back from [1, 2, 3] it tries index 3 and throws', 'Yes. An int argument picks remove(int index). Write path.remove(path.size() − 1).'],
    ['It removes the value nums[i], which is correct', 'That is remove(Object), which needs an Integer. An int argument picks the index version.'],
    ['It removes the first item of the thread', 'It removes whatever is at position nums[i], and here that position does not exist.'],
  ]),
  step('“Find the minimum number of moves for a knight to reach a square.”', [], 2, [
    ['Backtracking over every knight path, keeping the shortest', 'Every path, of every length, before you can be sure of the shortest. Far too many.'],
    ['Backtracking that stops at the first path found', 'The first path found depth-first is rarely the shortest.'],
    ['BFS from the start square', 'Yes. Shortest number of moves in an unweighted graph is exactly what BFS gives, in one sweep.'],
  ]),
];
