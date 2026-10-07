// Decision puzzles for the Stacks lesson (src/dsa-lessons/stacks.mdx).
// Every number here is re-derived independently in tests/stacks.test.ts.
import { row, step, type TraceStep } from '../../lib/trace.ts';

export const brackets: TraceStep[] = [
  step('Input "([)]". You pushed the closer each opener expects, so the stack holds ) then ] (top). The next character is ). What happens?',
    [row('Input', ['(', '[', ')', ']'], { 2: 'NEXT' }, { tones: { 0: 'done', 1: 'done' } }), row('Stack · bottom → top', [')', ']'], { 1: 'TOP' })], 0, [
      ['Reject: the top expects ], not )', 'Yes. The most recently opened case is [, and it must close before anything outside it. A ) here means the pairs cross, so the string is invalid.'],
      ['Reach under the top and use the ) that is waiting there', 'A stack only lets you touch the top. Matching a lower item would accept "([)]", whose pairs cross each other. Nesting means the newest open thing closes first.'],
      ['Skip the ) and keep reading', 'Skipping a closer pretends it never happened. "(]" would then look fine once the ] matched nothing. Every closer must match the top or the string fails.'],
    ]),
  step('Input "((". Both characters were openers, so the loop pushed ) and ). The loop has ended. What do you return?',
    [row('Input', ['(', '('], {}, { tones: { 0: 'done', 1: 'done' } }), row('Stack · bottom → top', [')', ')'], { 1: 'TOP' })], 1, [
      ['true: no closer ever failed to match', 'No closer failed because no closer arrived. Two cases are still open. This is the most common miss: checking only during the loop.'],
      ['false: leftovers on the stack are unclosed openers', 'Right. Valid means every opener was closed, and the stack is exactly the list of openers still waiting. Return stack.isEmpty().'],
      ['Throw an error: the input is malformed', 'The input is ordinary; it is just not valid. The method must answer false, not crash.'],
    ]),
  step('Input ")(". The very first character is a closer and the stack is empty. What do you do?',
    [row('Input', [')', '('], { 0: 'NEXT' }), row('Stack · bottom → top', [])], 2, [
      ['Call pop() and compare', 'ArrayDeque.pop() on an empty deque throws NoSuchElementException. Check isEmpty() first.'],
      ['Push it and hope a later ( cancels it', 'An opener that comes later cannot close something earlier. ")(" is invalid no matter what follows.'],
      ['Return false: there is no opener for it to close', 'Yes. An empty stack means nothing is open, so a closer has nothing to match. Guard with isEmpty() before popping.'],
    ]),
];

export const minStack: TraceStep[] = [
  step('values holds 5, 3, 7 (top) and mins holds 5, 3, 3, where each entry is the minimum at or below that level. You push 2. What goes onto mins?',
    [row('values · bottom → top', [5, 3, 7], { 2: 'TOP' }), row('mins · bottom → top', [5, 3, 3], { 2: 'TOP' })], 0, [
      ['2, because min(2, 3) = 2', 'Yes. The new level remembers the minimum of everything at or below it: the smaller of the new value and the old minimum.'],
      ['3, the old minimum', 'That would make getMin() answer 3 while 2 sits on the stack. The new level must include the value just pushed.'],
      ['Nothing; 2 is already in values', 'Then values and mins would have different heights, and the next pop would remove the wrong minimum. Push onto both, every time.'],
    ]),
  step('Starting from values 5, 3, 7, 2 and mins 5, 3, 3, 2, you pop twice. What does getMin() return now?',
    [row('values · bottom → top', [5, 3, 7, 2], { 3: 'TOP' }, { tones: { 2: 'out', 3: 'out' } }), row('mins · bottom → top', [5, 3, 3, 2], { 3: 'TOP' }, { tones: { 2: 'out', 3: 'out' } })], 1, [
      ['2', '2 left with its level. A minimum that is no longer on the stack cannot be the answer.'],
      ['3', 'Right. Popping both stacks together restores exactly the minimum that was true when 3 was the top. No searching needed.'],
      ['5', '5 is the minimum of the bottom level only. The level now on top still includes 3.'],
    ]),
  step('Why not keep a single variable min instead of a whole second stack?',
    [row('After push 5, push 3, pop', [5], { 0: 'TOP' })], 2, [
      ['A single variable works if you update it on every push', 'Pushes are fine. Pops are the problem: after push 5, push 3, pop, the variable still says 3, and nothing tells you the minimum went back to 5.'],
      ['Rescan the stack after every pop', 'That gives the right answer in O(n) per pop. The problem asks for O(1) for every operation.'],
      ['A pop must restore the previous minimum, so each level stores its own', 'Yes. The previous minimum has to be remembered somewhere, and the only place that pops in step with values is a parallel stack.'],
    ]),
];

export const rpn: TraceStep[] = [
  step('Tokens 4 13 5 / +. You have pushed 4, 13 and 5. The next token is /. You pop twice: first 5, then 13. What do you push?',
    [row('Tokens', [4, 13, 5, '/', '+'], { 3: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } }), row('Stack · bottom → top', [4, 13, 5], { 2: 'TOP' })], 1, [
      ['0, from 5 / 13', 'The first pop is the right-hand operand. 5 was written last, so it is the divisor: the expression is 13 / 5.'],
      ['2, from 13 / 5 with truncation', 'Yes. Second pop / first pop = 13 / 5 = 2.6, and integer division truncates to 2. The stack becomes 4, 2.'],
      ['2.6', 'The problem uses integer division that truncates toward zero. Java int division already does this.'],
    ]),
  step('The stack is now 4, 2 and the last token is +. What is the final answer?',
    [row('Tokens', [4, 13, 5, '/', '+'], { 4: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done' } }), row('Stack · bottom → top', [4, 2], { 1: 'TOP' })], 0, [
      ['6', 'Right: 4 + 2 = 6. The stack ends with exactly one value, the answer.'],
      ['22', 'That adds every number in the tokens. Each operator consumes only the two most recent results.'],
      ['2', 'The 4 is still on the stack waiting for an operator. + combines it with 2.'],
    ]),
  step('Tokens -7 2 /. What value does the stack hold at the end?',
    [row('Tokens', [-7, 2, '/'], { 2: 'NEXT' }), row('Stack · bottom → top', [-7, 2], { 1: 'TOP' })], 2, [
      ['-4, rounding down', 'Rounding down (floor) is what Python’s // does. The problem says truncate toward zero, so -3.5 becomes -3.'],
      ['-3.5', 'The result must be an integer, truncated toward zero.'],
      ['-3, truncating toward zero', 'Yes. Java’s / on ints truncates toward zero, which matches the problem exactly: -7 / 2 = -3.'],
    ]),
];

const temps = [73, 74, 75, 71, 69, 72, 76, 73];
export const dailyTemperatures: TraceStep[] = [
  step('Today is day 5 (72°). Days 2, 3 and 4 (75°, 71°, 69°) are still waiting, with day 4 on top. What happens first?',
    [row('Temperatures', temps, { 5: 'TODAY' }, { tones: { 0: 'done', 1: 'done', 2: 'hot', 3: 'hot', 4: 'hot' } }), row('Waiting · bottom → top', ['d2 · 75', 'd3 · 71', 'd4 · 69'], { 2: 'TOP' })], 0, [
      ['Pop day 4: 72 > 69, so its answer is 5 − 4 = 1', 'Yes. Today is warmer than the day on top, so today is that day’s answer. Record the distance and look at the new top.'],
      ['Pop day 2 first: it has waited the longest', 'You can only reach the top. And 72 does not beat 75, so day 2 is not answered today anyway.'],
      ['Push day 5 on top straight away', 'Then day 4 (69°) would sit under a warmer day and keep waiting for an answer that has already arrived. Answer the top first, then wait.'],
    ]),
  step('Day 4 got 1 and day 3 (71°) got 5 − 3 = 2. Now day 2 (75°) is on top, and today is still 72°. What next?',
    [row('Temperatures', temps, { 5: 'TODAY' }, { tones: { 0: 'done', 1: 'done', 2: 'hot', 3: 'done', 4: 'done' } }), row('Waiting · bottom → top', ['d2 · 75'], { 0: 'TOP' })], 1, [
      ['Keep popping to check the days under 75°', 'There is nothing under it here, and in general there is no need to look: every waiting day below the top is at least as warm as the top. If 72 can’t beat the top, it can’t beat anyone below.'],
      ['Stop popping and push day 5: 72 does not beat 75', 'Right. The stack now reads 75, 72 from bottom to top. Temperatures on the stack never increase from bottom to top, which is exactly why stopping early is safe.'],
      ['Pop day 2 with answer 0', '0 means “no warmer day ever comes”. Day 6 (76°) will answer day 2 tomorrow with 4.'],
    ]),
  step('The loop is over. Days 6 (76°) and 7 (73°) are still on the stack. What are their answers?',
    [row('Temperatures', temps, {}, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done', 6: 'hot', 7: 'hot' } }), row('Answers', [1, 1, 4, 2, 1, 1, '?', '?'])], 2, [
      ['1 and 0: day 7 is the next day after day 6', 'Day 7 is colder (73° < 76°), so it does not answer day 6.'],
      ['The distance to the end of the array', 'The problem says 0 when no warmer day exists. Leftovers never found one.'],
      ['0 and 0: leftovers never met a warmer day', 'Yes. The answer array starts as zeros, so leftovers need no extra work.'],
    ]),
];

export const circular: TraceStep[] = [
  step('nums = [1, 2, 1], circular. One pass left index 1 (value 2) and index 2 (value 1) on the stack. Answers so far: [2, −1, −1]. What now?',
    [row('nums', [1, 2, 1], {}, { tones: { 0: 'done', 1: 'hot', 2: 'hot' } }), row('Waiting · bottom → top', ['i1 · 2', 'i2 · 1'], { 1: 'TOP' })], 1, [
      ['Return: leftovers get −1', 'In a circular array, index 2’s search wraps around to index 0 and index 1. Value 2 at index 1 is greater, so −1 would be wrong.'],
      ['Sweep a second lap, i = 3 to 5, reading nums[i % n]; answer, but do not push', 'Yes. The second lap lets every leftover see the elements before it. Nobody new needs to wait: every index already had its turn on the stack.'],
      ['Sort the leftovers and match them up', 'Sorting loses positions, and the answer depends on which greater value comes first going around.'],
    ]),
  step('Second lap, i = 4 reads nums[1] = 2. The stack holds index 1 (value 2) and index 2 (value 1). Who gets answered?',
    [row('Lap two reads', [1, 2, 1], { 1: 'NOW' }, { tones: { 0: 'ghost', 1: 'ghost', 2: 'ghost' } }), row('Waiting · bottom → top', ['i1 · 2', 'i2 · 1'], { 1: 'TOP' })], 0, [
      ['Index 2 gets 2; index 1 keeps waiting', 'Right. 2 > 1 answers index 2. Then 2 is not greater than 2, so index 1 stays. Nothing larger than 2 exists, so it finishes with −1. Final: [2, −1, 2].'],
      ['Both get 2', 'Index 1 would be answered by its own value. Next greater means strictly greater, so the pop condition is >, not >=.'],
      ['Neither: lap two only reads, it never answers', 'Lap two exists precisely to answer. It just doesn’t push.'],
    ]),
];

export const fleet: TraceStep[] = [
  step('target = 12. Cars at positions 10, 8, 0, 5, 3 with speeds 2, 4, 1, 1, 3. In which order do you look at them?',
    [row('Position', [10, 8, 0, 5, 3]), row('Speed', [2, 4, 1, 1, 3])], 0, [
      ['From the car closest to the target backwards: 10, 8, 5, 3, 0', 'Yes. A car is only ever slowed by cars ahead of it, so settle the front first. Then each car only needs the arrival time of the fleet directly ahead.'],
      ['Fastest first', 'Speed alone doesn’t tell you who blocks whom. A fast car far back can still be stuck behind a slow car ahead.'],
      ['From position 0 forwards', 'From the back you don’t yet know when the car ahead really arrives: it might itself be held up by someone further ahead.'],
    ]),
  step('Solo arrival times, front first: 10 → 1 hour, 8 → 1 hour. The car at 8 has the same time as the fleet ahead. New fleet or same fleet?',
    [row('Car (front first)', ['p10', 'p8', 'p5', 'p3', 'p0']), row('Solo time', [1, 1, 7, 3, 12], { 1: 'NOW' }, { tones: { 0: 'done' } })], 1, [
      ['New fleet: equal is not catching up', 'The problem counts catching up at the destination as joining. Equal arrival times mean they arrive together, as one fleet.'],
      ['Same fleet: it arrives exactly when the car ahead does', 'Right. A new fleet starts only when a car is strictly slower to arrive than the fleet ahead. 1 is not more than 1.'],
      ['Skip it: it is faster, so it passes', 'Nobody passes on this road. A faster car that catches up slows to the speed of the car ahead.'],
    ]),
  step('The fleet led by the car at 5 arrives at 7. The car at 3 has solo time 3. What happens to it?',
    [row('Car (front first)', ['p10', 'p8', 'p5', 'p3', 'p0']), row('Solo time', [1, 1, 7, 3, 12], { 3: 'NOW' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } })], 2, [
      ['It forms a new fleet arriving at 3', 'It would have to pass the car at 5 to arrive at 3. Passing isn’t allowed.'],
      ['The fleet ahead speeds up to arrive at 3', 'A car behind never speeds up the car in front. The slower car sets the pace.'],
      ['It joins the fleet ahead and arrives at 7', 'Yes. 3 ≤ 7, so it catches up and is absorbed. Then the car at 0 (time 12 > 7) starts the third and last fleet.'],
    ]),
];

const bars = [2, 1, 5, 6, 2, 3];
export const histogram: TraceStep[] = [
  step('Heights [2, 1, 5, 6, 2, 3]. At i = 1 (height 1), you pop index 0 (height 2) and the stack is now empty. How wide is index 0’s rectangle?',
    [row('Heights', bars, { 0: 'POPPED', 1: 'i' }), row('Stack after the pop', [])], 0, [
      ['i = 1: nothing shorter on its left, so it reaches back to the start', 'Yes. An empty stack means no shorter bar exists on the left. The rectangle spans indices 0 to i − 1: width i, area 2 × 1 = 2.'],
      ['i − stack.peek() − 1', 'peek() on an empty ArrayDeque returns null, and unboxing it throws a NullPointerException. The empty case needs its own width: i.'],
      ['Width 0: it has no neighbours yet', 'The bar itself has width 1. The rectangle always includes the popped bar.'],
    ]),
  step('The sentinel (height 0) arrives at i = 6. You pop index 4 (height 2). The new top is index 1 (height 1). How wide is index 4’s rectangle?',
    [row('Heights + sentinel', [...bars, 0], { 1: 'NEW TOP', 4: 'POPPED', 6: 'i' }, { tones: { 2: 'done', 3: 'done', 5: 'done' } }), row('Stack · bottom → top', ['i1 · 1'], { 0: 'TOP' })], 1, [
      ['2, from i − 4', 'That forgets indices 2 and 3. They were taller (5 and 6) and already popped, but they still stand. A height-2 rectangle runs right through them: area 4 instead of 8.'],
      ['4: indices 2 to 5, since i − 1 − 1 = 4', 'Yes. The new top is the nearest shorter bar on the left, and i is where it stops on the right. Width = i − top − 1 = 4, area 2 × 4 = 8. The best overall is still 10, from heights 5 and 6.'],
      ['6: the whole histogram', 'Index 1 has height 1, which is shorter than 2. A height-2 rectangle cannot pass through it.'],
    ]),
  step('Heights [3, 4]. Both bars were pushed, the loop over real bars has ended, and best is still 0. What is missing?',
    [row('Heights', [3, 4]), row('Stack · bottom → top', ['i0 · 3', 'i1 · 4'], { 1: 'TOP' })], 2, [
      ['Nothing: return 0', 'Both bars are standing; the area can’t be 0. Bars still on the stack were never finalized.'],
      ['Return the tallest bar, 4', 'Height 3 across both bars gives 3 × 2 = 6, which beats 4.'],
      ['A height-0 sentinel at i = 2 that pops and finalizes both: 4 × 1, then 3 × 2 = 6', 'Right. The sentinel is shorter than everything, so it flushes the stack: index 1 gets width 2 − 0 − 1 = 1, then index 0 gets width 2 (empty stack). Answer 6.'],
    ]),
];

export const mixedReview: TraceStep[] = [
  step('In Daily Temperatures, what does a day sitting ON the stack represent?', [], 1, [
    ['A local maximum', 'Days on the stack can be anything that hasn’t been beaten yet, including a dip like 69°. Being on the stack means “unanswered”, not “a peak”.'],
    ['A day still waiting for its answer: no warmer day has come yet. Arrivals answer everyone they beat, then wait themselves.', 'Yes. This framing also gives you the stack’s order and the pop condition, so you don’t have to memorize “decreasing stack for next greater”.'],
    ['A day warmer than today', 'Some days on the stack are warmer than today and some are not. Today pops exactly the ones it beats.'],
    ['The running window of K days', 'There is no K. Days wait as long as needed. A fixed-size window is a different pattern.'],
  ]),
  step('The interviewer says: "A while loop nested inside a for loop. Isn’t that O(n²)?" What do you say?', [], 1, [
    ['Yes, but it is fast in practice', 'That gives away a correct O(n) solution. The bound really is linear.'],
    ['No. Each index is pushed exactly once and popped at most once, so all the while loops together do at most n pops: O(n) total, amortized.', 'Right. Count the total work across the whole run, not the worst single iteration. Have these two sentences ready for every monotonic stack.'],
    ['The while loop runs at most log n times', 'A single while loop can pop almost everything (one warm day after a long cold spell). It’s the total over the whole run that is bounded.'],
    ['The stack size is bounded by a constant', 'A strictly cooling week leaves every day on the stack: size n.'],
  ]),
  step('Histogram: a height-6 bar is popped when a height-2 bar arrives at index i. How wide is its rectangle?', [], 1, [
    ['i minus the popped bar’s own index', 'That ignores taller bars to the left that were already popped. They still stand, and the rectangle extends over them.'],
    ['From just after the new stack top (the nearest shorter bar on its left) to just before i: i − stack.peek() − 1, or i if the stack is empty', 'Yes. Both edges are the nearest shorter bars, and the empty-stack case means nothing shorter on the left. Get this one line right and the Hard problem is done.'],
    ['Always 1, because bars are unit width', 'The rectangle uses the popped bar’s height, but it can be as wide as the run of bars at least that tall.'],
    ['The number of pops so far', 'The pop count says nothing about where the shorter bars are.'],
  ]),
  step('"For each element, find the nearest SMALLER element to its right." Reading the stack from bottom to top, how are the values ordered?', [], 0, [
    ['Increasing from bottom to top (equal values may sit together)', 'Right. A smaller arrival answers and pops every waiting value bigger than it, so whatever survives under it is no bigger. Work it out from who gets answered.'],
    ['Decreasing from bottom to top', 'That is the next-greater stack. Here a smaller arrival pops the larger values, which leaves the smaller ones underneath.'],
    ['Sorted in any order: only the top matters', 'The order is what makes stopping safe. If the top survives, everything below it survives too.'],
  ]),
  step('"Return the warmest temperature anywhere after each day." Which tool fits best?', [], 2, [
    ['A monotonic stack, the same as Daily Temperatures', 'It works, but it’s more machinery than you need. Every day wants the same thing: the maximum of the suffix after it.'],
    ['A min-heap of future days', 'Heaps are for repeated best-so-far queries where items keep arriving and leaving. A single backward pass is enough here.'],
    ['One backward pass keeping a running maximum', 'Yes. The question asks for the warmest, not the nearest warmer. Since it’s a plain suffix maximum, one variable does the job.'],
  ]),
  step('RPN tokens 5 3 −. You pop a, then b. Which expression do you push?', [], 0, [
    ['b − a = 2', 'Right. a was popped first, so it was written second: the right-hand operand. 5 − 3 = 2.'],
    ['a − b = −2', 'That is the operand-order bug. It passes on + and * and fails on − and /.'],
    ['|a − b|', 'Subtraction has a direction; an absolute value hides the bug on this input and fails on others.'],
  ]),
  step('Daily Temperatures: why push indexes rather than temperatures?', [], 1, [
    ['Indexes use less memory', 'Both are ints. That isn’t the reason.'],
    ['The answer is a distance (today − day), and you can read the temperature from an index but not the index from a temperature', 'Yes. Push indexes, compare temperatures[stack.peek()]. Duplicated temperatures make a value-only stack ambiguous too.'],
    ['Temperatures may repeat, so they can’t be pushed', 'Repeats can be pushed. You just couldn’t tell which day they came from or how far away it is.'],
  ]),
  step('Next Greater Element II wraps around. How do you visit every element’s circular successors in O(n)?', [], 2, [
    ['Run the linear algorithm once per starting point', 'That is n separate passes: O(n²).'],
    ['Concatenate the array with itself and push all 2n indexes', 'Copying works, but pushing lap-two indexes means some positions wait twice. Using i % n and pushing only in lap one avoids both the copy and the duplicates.'],
    ['Loop i from 0 to 2n − 1 reading nums[i % n]; push only while i < n', 'Right. The second lap gives every leftover a chance to see the elements before it, without adding new waiters.'],
  ]),
];
