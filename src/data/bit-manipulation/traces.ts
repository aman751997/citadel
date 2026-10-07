// Decision puzzles for the Math & Bit Manipulation lesson. Every number here is re-derived in
// tests/bit-manipulation.test.ts, using string-based binary helpers that share no code with this file.
import { row, step, type CellTone } from '../../lib/trace.ts';

// Rows of lanterns. bits8 shows the low 8 lanterns (position 7 on the left, position 0 on the right);
// bytes32 shows all 32 lanterns of a Java int as four groups of eight.
export const bits8 = (x: number) => (x & 0xff).toString(2).padStart(8, '0').split('');
export const bytes32 = (x: number) => (x >>> 0).toString(2).padStart(32, '0').match(/.{8}/g)!;
const litTones = (cells: string[]) => Object.fromEntries(cells.flatMap((c, i) => (c === '1' ? [[i, 'hot' as CellTone]] : []))) as Record<number, CellTone>;
const lanterns = (name: string, x: number, labels: Record<number, string> = {}) => row(name, bits8(x), labels, { tones: litTones(bits8(x)) });
const wide = (name: string, x: number) => row(name, bytes32(x), { 0: '31–24', 1: '23–16', 2: '15–8', 3: '7–0' });
const positions = row('Lantern', [7, 6, 5, 4, 3, 2, 1, 0], {}, { tones: { 0: 'ghost', 1: 'ghost', 2: 'ghost', 3: 'ghost', 4: 'ghost', 5: 'ghost', 6: 'ghost', 7: 'ghost' } });

export const twos = [
  step('A Java int is a row of 32 lanterns. The row for 5 is shown. Which row does −5 show?',
    [wide('5', 5)], 1, [
      ['10000000 00000000 00000000 00000101', 'That is sign-and-magnitude: a sign lantern stuck onto 5. Java doesn’t store negatives that way. Add this row to 5 in plain binary and you don’t get 0.'],
      ['11111111 11111111 11111111 11111011', 'Yes. Flip every lantern of 5 (…11111010), then add one (…11111011). Add that row to 5 and every column carries until the carry falls off the top: 0.'],
      ['11111111 11111111 11111111 11111010', 'That is ~5, every lantern flipped, and it means −6. Two’s complement adds one after flipping: −x == ~x + 1.'],
    ]),
  step('Integer.MAX_VALUE is shown. What does Integer.MAX_VALUE + 1 evaluate to in Java?',
    [wide('MAX_VALUE', 0x7fffffff)], 2, [
      ['2147483648', 'That needs a 32nd magnitude lantern, and lantern 31 is the sign. An int has no room for it, and Java doesn’t widen to long by itself.'],
      ['It throws an ArithmeticException', 'Plain + never throws in Java. Only Math.addExact and its siblings check for overflow.'],
      ['−2147483648, which is Integer.MIN_VALUE', 'Yes. The carry runs into lantern 31, the sign lantern, giving 10000000 00000000 00000000 00000000. Integer arithmetic silently wraps around.'],
    ]),
  step('What does Math.abs(Integer.MIN_VALUE) return?',
    [wide('MIN_VALUE', 0x80000000 | 0)], 1, [
      ['2147483648', 'There is no int 2147483648. The largest int is 2147483647.'],
      ['−2147483648: MIN_VALUE again', 'Yes. Negating means ~x + 1: 01111111 … 1 plus one is 10000000 … 0, which is MIN_VALUE again. There is one more negative int than positive ints, so the most negative one has no positive partner.'],
      ['0', 'Nothing here makes the row dark. Flipping MIN_VALUE gives 01111111 … 1, and adding one carries all the way back up to lantern 31.'],
    ]),
];

export const operators = [
  step('n = −8. This loop is meant to count lit lanterns: while (n != 0) { count += n & 1; n >>= 1; }. What happens?',
    [wide('n = −8', -8)], 1, [
      ['It returns 29', '29 is the true number of lit lanterns in −8, but this loop never gets there. Look at what >> lets in at the top.'],
      ['It never stops: n goes −8, −4, −2, −1, −1, −1, …', 'Yes. >> is the signed crank: it copies the sign lantern into the empty top position, so a negative row stays negative. −1 >> 1 is still −1, and n never reaches 0.'],
      ['It returns 3 after 3 rounds', 'Three rounds is what it takes to slide out the three dark lanterns at the bottom. The lit lanterns above them are never cleared.'],
    ]),
  step('Same loop, but the crank is n >>>= 1 (the plain crank). How many rounds before n is 0?',
    [wide('n = −8', -8)], 2, [
      ['3', 'After 3 rounds the low lanterns are gone, but 29 lit lanterns remain above them.'],
      ['29', '29 is the count the loop returns, not the number of rounds. The dark lanterns at the bottom take rounds too.'],
      ['32', 'Yes. The highest lit lantern is lantern 31. Each logical shift moves it down one and lets a dark lantern in at the top, so it takes 32 rounds to leave. The loop returns 29.'],
    ]),
  step('x = 88. Which row is x & (x − 1)?',
    [positions, lanterns('x = 88', 88, { 3: 'LOW' }), lanterns('x − 1 = 87', 87)], 1, [
      ['01010111 (87)', 'That is x − 1 alone. Subtracting put out the lowest lit lantern, but it lit the three dark lanterns below it.'],
      ['01010000 (80)', 'Yes. Subtracting 1 puts out the lowest lit lantern and lights everything below it; AND with x puts those back out. Exactly one lantern changed.'],
      ['00001000 (8)', 'That is x & −x. It keeps ONLY the lowest lit lantern instead of putting it out.'],
    ]),
  step('Which Java expression asks “is lantern 3 of x lit?”', [], 0, [
    ['(x & (1 << 3)) != 0', 'Yes. 1 << 3 is a stencil with one hole at lantern 3. The AND is 8 if that lantern is lit and 0 if not.'],
    ['(x & (1 << 3)) == 1', 'When lantern 3 is lit, x & 8 is 8, not 1. This is always false. Compare with != 0, or shift first: ((x >> 3) & 1) == 1.'],
    ['x & 1 << 3 != 0', 'This doesn’t compile in Java. != binds tighter than &, so it reads x & ((1 << 3) != 0): an int AND a boolean. Put brackets around every bit test.'],
  ]),
];

export const single = [
  step('[4, 1, 2, 1, 2]. Xor has folded 4, 1 and 2, so acc = 7. The next value is 1. What does acc become?',
    [row('Values', [4, 1, 2, 1, 2], { 3: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } }), positions, lanterns('acc = 7', 7), lanterns('next = 1', 1)], 0, [
      ['6: the 1 meets its partner and goes out', 'Yes. 7 ^ 1 = 6 = 0110, which is exactly 4 ^ 2. The two 1s cancelled, wherever they stood.'],
      ['8: 7 + 1', 'Addition carries, and a pair added twice leaves 2 × 1 behind instead of vanishing.'],
      ['7: 7 | 1', 'OR can light a lantern but never put one out, so the second 1 can’t cancel the first.'],
    ]),
  step('acc = 6. The last value, 2, arrives and the values run out. What do you return?',
    [row('Values', [4, 1, 2, 1, 2], { 4: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done' } }), positions, lanterns('acc = 6', 6), lanterns('next = 2', 2)], 0, [
      ['4: acc ^ 2 = 4, and with no values left, acc is the single', 'Yes. At loop exit every pair has met its partner and cancelled; the one value without a partner is all that is left lit.'],
      ['Build a count map first to be sure', 'That is correct but costs O(n) space. The fold is already exact: x ^ x = 0 and x ^ 0 = x.'],
      ['2: the last value read must be the single', 'Order says nothing about which value is single. The 2 here met its partner.'],
    ]),
  step('The same values arrive as [1, 2, 4, 2, 1]. Does the answer change?', [], 0, [
    ['No: XOR is commutative and associative, so the fold equals (1 ^ 1) ^ (2 ^ 2) ^ 4 = 4', 'Yes. You may regroup and reorder the fold freely, so every pair cancels no matter where its two halves stand.'],
    ['Yes: the pairs aren’t next to each other, so they can’t cancel', 'Cancellation doesn’t need neighbours. Each lantern position just counts whether it was flipped an even or odd number of times.'],
  ]),
];

export const missing = [
  step('nums = [4, 0, 1, 3] holds four distinct numbers from 0..4, and one is missing. Which numbers go into the fold?',
    [row('index', [0, 1, 2, 3]), row('nums', [4, 0, 1, 3])], 2, [
      ['Only the values: 4 ^ 0 ^ 1 ^ 3 = 6', 'Every value appears once and has no partner, so nothing cancels. 6 is not the answer.'],
      ['The values and the indexes 0..3: 0 ^ 1 ^ 2 ^ 3 ^ 6 = 6', 'Close. The indexes stop at 3, but the full range runs to n = 4. The 4 among the values has no partner, so the result is wrong. Start acc at n.'],
      ['The values, the indexes 0..3, and n = 4: 4 ^ 0 ^ 6 = 2', 'Yes. Every number in 0..4 that is present appears twice (once as an index or n, once as a value) and cancels. The missing 2 appears once.'],
    ]),
  step('The summing version: expected = n(n + 1) / 2. n = 50,000, and the total 1,250,025,000 fits in an int. Is int expected = n * (n + 1) / 2 safe?', [], 1, [
    ['Yes: the result fits, so the expression is fine', 'The product n(n + 1) = 2,500,050,000 is computed first, and it passes 2,147,483,647. It wraps negative before the division happens.'],
    ['No: n * (n + 1) overflows before the division. Compute it in long, or use the XOR fold', 'Yes. The intermediate product is the danger, not the result. A long product avoids it, and XOR never carries, so the fold can’t overflow at all.'],
    ['No: the division by 2 rounds the wrong way', 'n(n + 1) is always even, so the division is exact. The trouble is the product.'],
  ]),
];

export const popcount = [
  step('n = 12. One round of n &= n − 1. What is n now?',
    [positions, lanterns('n = 12', 12, { 4: 'LOW' }), lanterns('n − 1 = 11', 11)], 1, [
      ['00001011 (11), which is n − 1', 'Subtracting alone put out lantern 2 but lit lanterns 1 and 0. The AND with n is what puts them back out.'],
      ['00001000 (8)', 'Yes. The lowest lit lantern, lantern 2, went out and nothing else changed. One round, one lantern.'],
      ['00000110 (6), which is n shifted right', 'That is n >>> 1. A shift moves every lantern; this move puts out exactly one.'],
    ]),
  step('n = −1: all 32 lanterns lit. How many rounds of n &= n − 1 until n is 0?',
    [wide('n = −1', -1)], 1, [
      ['1', 'Each round puts out exactly one lantern, the lowest lit one. 32 are lit.'],
      ['32', 'Yes. One round per lit lantern, whatever the sign. The last round is MIN_VALUE & MAX_VALUE = 0.'],
      ['It never stops, because −1 is negative', 'n & (n − 1) never shifts, so no sign copies come in. The sign lantern is put out like any other, last.'],
    ]),
  step('n = Integer.MIN_VALUE: only lantern 31 is lit. The >>> loop and the n &= n − 1 loop both return 1. How many rounds does each take?',
    [wide('n = MIN_VALUE', 0x80000000 | 0)], 1, [
      ['32 each', 'The clearing loop takes one round per LIT lantern, and only one is lit.'],
      ['The >>> loop takes 32; the clearing loop takes 1', 'Yes. The shift loop pays for every position up to the highest lit lantern; the clearing loop pays only for lit lanterns.'],
      ['The >>> loop takes 1; the clearing loop takes 32', 'Backwards. The lit lantern sits at the top, so the shift loop needs 32 slides to reach it.'],
    ]),
];

export const countingBits = [
  step('bits[0..7] is filled. You need bits[8], and 8 is 1000. Which recurrence gives it?',
    [row('i', [0, 1, 2, 3, 4, 5, 6, 7]), row('bits[i]', [0, 1, 1, 2, 1, 2, 2, 3])], 1, [
      ['bits[7] + 1 = 4: the row before, plus one', '7 is 0111 and 8 is 1000. Adding one carried through three lanterns and put them out. bits[i − 1] + 1 is only right when i is odd.'],
      ['bits[8 >> 1] + (8 & 1) = bits[4] + 0 = 1', 'Yes. 8 >> 1 = 4 is 8 with its last lantern dropped (100). That dropped lantern was dark, so you add 0.'],
      ['bits[8 >> 1] + 1 = 2', 'You add back the dropped lantern itself, 8 & 1, which is 0 here.'],
    ]),
  step('You fill bits from left to right. Why is bits[i >> 1] always ready when you reach i?', [], 0, [
    ['Because i >> 1 is smaller than i for every i ≥ 1', 'Yes. Halving makes the index smaller, so that entry was filled earlier. bits[0] = 0 is the only base case.'],
    ['Because the table is filled from the right end', 'It is filled from 0 upward. Smaller indexes are the ones already filled.'],
    ['It isn’t ready; you need recursion with a memo', 'A plain loop is enough, because every entry depends only on a smaller one.'],
  ]),
  step('The other recurrence: bits[i] = bits[i & (i − 1)] + 1. For i = 12 (1100), which entry does it read?',
    [row('i', [6, 8, 11, 12]), row('bits[i]', [2, 1, 3, 2])], 0, [
      ['bits[8] + 1 = 2', 'Yes. 12 & 11 = 8 is 12 with its lowest lit lantern put out. 8 has one fewer lit lantern than 12, so add 1.'],
      ['bits[11] + 1 = 4', 'That is the row before. 12 − 1 = 11 changes three lanterns, not one.'],
      ['bits[6] + 1 = 3', '6 = 12 >> 1 belongs to the other recurrence, which adds 12 & 1 = 0, not 1.'],
    ]),
];

export const reverse = [
  step('n = 1 (only lantern 0 lit). You write while (n != 0) { result = (result << 1) | (n & 1); n >>>= 1; }. What happens?',
    [wide('n = 1', 1)], 0, [
      ['It returns 1, but the answer is 10000000 … 0 (−2147483648)', 'Yes. After one round n is 0 and the loop stops, before the lantern has travelled to position 31. Dark lanterns count too: always run exactly 32 rounds.'],
      ['It returns −2147483648, correctly', 'That would need 31 more shifts of result. The loop stopped when n ran out of lit lanterns.'],
      ['It never stops', '>>> lets dark lanterns in, so n reaches 0 after one round. The endless loop belongs to >> on a negative n.'],
    ]),
  step('Round order. You write result |= n & 1; result <<= 1; (take, then make room) for 32 rounds on n = 1. What comes back?',
    [wide('n = 1', 1)], 0, [
      ['0: the lantern taken in round 1 is shifted 32 times and falls off the top', 'Yes. Taking first means the last round shifts once too often. Make room first, then take: result = (result << 1) | (n & 1).'],
      ['−2147483648, correctly', 'It would be correct after 31 shifts. This order shifts 32 times.'],
      ['1', 'The result is shifted after every take, including the last one.'],
    ]),
  step('n = 0xF0000000 (lanterns 31–28 lit, so n is negative). The loop runs exactly 32 rounds but slides with n >>= 1 (the signed crank). Is the result right?',
    [wide('n', 0xf0000000 | 0)], 1, [
      ['No: copies of the sign lantern pour in and get reversed into the low end', 'They pour in at the top, but a copy that enters at position 31 in round k would need 31 more rounds to reach lantern 0, and the loop ends first. Only original lanterns are ever read.'],
      ['Yes, by luck: in exactly 32 rounds no copy reaches lantern 0. Write >>> anyway', 'Yes, the result is 00000000 … 00001111 = 15. >>> says what you mean (unsigned), and it is the only safe crank for loops that stop when n reaches 0.'],
      ['It never stops', 'The loop counts 32 rounds; it doesn’t wait for n to reach 0. The endless loop belongs to while (n != 0) with >>.'],
    ]),
];

export const masks = [
  step('nums = [3, 5, 9]. Lantern i stands for nums[i]. The row shows mask = 6. Which subset is it?',
    [row('Lantern', [2, 1, 0], {}, { tones: { 0: 'ghost', 1: 'ghost', 2: 'ghost' } }), row('mask = 6', ['1', '1', '0'], {}, { tones: { 0: 'hot', 1: 'hot' } }), row('stands for', ['nums[2] = 9', 'nums[1] = 5', 'nums[0] = 3'])], 1, [
      ['{3, 5}', 'That reads the row left to right as nums[0], nums[1], nums[2]. Lantern 0 is on the RIGHT, and it is dark.'],
      ['{5, 9}', 'Yes. Lanterns 1 and 2 are lit, so nums[1] = 5 and nums[2] = 9 are in.'],
      ['{6}', 'The mask is a choice of positions, not a value to put in the set.'],
    ]),
  step('n = 3 items. Which masks does the loop for (mask = 0; mask < (1 << n); mask++) visit?', [], 0, [
    ['0 through 7: 2³ = 8 subsets, from nobody (0) to everybody (7)', 'Yes. Every row of 3 lanterns appears exactly once, and every row is a different subset.'],
    ['1 through 7, because the empty set isn’t a subset', 'The empty set is a subset, and LeetCode’s Subsets expects [] in the answer. Mask 0 produces it.'],
    ['0 through 3', 'That covers only the rows where lantern 2 is dark: half the subsets.'],
  ]),
  step('mask = 13 (1101). Remove item 2. Which expression does it?', [], 0, [
    ['13 & ~(1 << 2) = 9 (1001)', 'Yes. ~(1 << 2) is a stencil with every hole open except lantern 2; AND keeps everything else.'],
    ['13 − 2 = 11 (1011)', 'That subtracts the number 2, lantern 1’s value. Lantern 1 is dark, so the subtraction borrows: lantern 2 goes out but lantern 1 lights up. You get items {0, 1, 3} instead of {0, 3}.'],
    ['13 & (1 << 2) = 4 (0100)', 'That keeps ONLY item 2. It is the membership test, not removal.'],
  ]),
];

export const clock = [
  step('gcd(48, 18). One step of Euclid replaces (a, b) with…', [row('a, b', ['48, 18'])], 0, [
    ['(18, 12), because 48 % 18 = 12', 'Yes. Anything that divides 48 and 18 also divides 48 − 2 × 18 = 12, and the other way round. Then (12, 6), then (6, 0): the answer is 6.'],
    ['(30, 18), because 48 − 18 = 30', 'That is the slow subtraction version. It is correct, but gcd(1,000,000,000, 1) would take a billion steps. % does all the subtractions at once.'],
    ['(18, 2), because 48 / 18 = 2', 'Euclid keeps the remainder, not the quotient.'],
  ]),
  step('In Java, what is −7 % 3?', [], 1, [
    ['2', 'That is the mathematical remainder, which Math.floorMod(−7, 3) gives. Java’s % keeps the sign of the left operand.'],
    ['−1', 'Yes: −7 = (−2) × 3 − 1. Java divides toward zero, so the remainder takes the dividend’s sign. Use Math.floorMod when you need 0..m − 1.'],
    ['1', 'Neither Java’s % (−1) nor floorMod (2) gives 1.'],
  ]),
  step('3¹³ mod 1000 by repeated squaring. 13 is 1101 in binary. Which powers of 3 are multiplied into the result?',
    [row('exponent bits', ['1', '1', '0', '1'], { 0: '8', 1: '4', 2: '2', 3: '1' }, { tones: { 0: 'hot', 1: 'hot', 3: 'hot' } })], 0, [
      ['3¹, 3⁴ and 3⁸, because 1 + 4 + 8 = 13', 'Yes. Each lit lantern of the exponent takes the current square. 3¹³ mod 1000 = 323.'],
      ['3¹, 3², 3⁴ and 3⁸', 'Those multiply to 3¹⁵. Lantern 1 of 13 is dark, so 3² is squared on but never taken.'],
      ['Compute 3¹³ in full, then take mod 1000', 'Fine for 3¹³ = 1,594,323, but for an exponent like 10⁹ the full power has millions of digits. Reduce after every multiply.'],
    ]),
  step('You need (a × b) % 1,000,000,007, where a and b are ints just below 1,000,000,007. What goes wrong with (a * b) % MOD?', [], 1, [
    ['Nothing: the % brings it back into range', 'The % runs after the multiplication, and the int product has already wrapped. The remainder of a wrong number is a wrong number.'],
    ['The int product overflows before the %. Write (long) a * b % MOD', 'Yes. Both factors are below 2³⁰, so the product is below 2⁶⁰ and fits in a long. The cast must come before the multiply.'],
    ['Use Math.floorMod instead', 'floorMod fixes a negative remainder. It can’t undo a product that has already wrapped.'],
  ]),
];

export const sieve = [
  step('Count primes below 30. You reach i = 5, still unmarked, so 5 is prime. Where does crossing out start?',
    [row('Numbers', [2, 3, 4, 5, 6, 7, 8, 9, 10], { 3: 'i' }, { tones: { 2: 'out', 4: 'out', 6: 'out', 7: 'out', 8: 'out', 3: 'hot' } })], 1, [
      ['At 10 = 2 × 5', '10, 15 and 20 have a smaller prime factor (2 or 3) and are already crossed out. Starting there is correct, just wasted work.'],
      ['At 25 = 5 × 5', 'Yes. Every smaller multiple of 5 is 5 × k with k < 5, and k’s own prime factor crossed it out earlier.'],
      ['At 5 itself', 'Crossing out 5 would mark a prime as composite.'],
    ]),
  step('n = 5,000,000. The outer loop reaches i = 46,349, a prime. The inner loop starts with int j = i * i. What happens?', [], 0, [
    ['46,349² = 2,148,229,801 passes 2³¹ − 1, so j wraps negative, j < n holds, and composite[j] throws', 'Yes. Start the inner loop with a long, (long) i * i, or stop the outer crossing once i * i ≥ n.'],
    ['j = 2,148,229,801 is at least n, so the inner loop just skips', 'An int can’t hold 2,148,229,801. The product wraps to −2,146,737,495, which is less than n.'],
    ['Nothing: Java promotes the product to long', 'Java multiplies two ints as an int. It never widens on its own.'],
  ]),
];

export const mixedReview = [
  step('Every value appears exactly twice except one. Find it in O(n) time and O(1) extra space.', [], 1, [
    ['Sort, then compare neighbours', 'That is O(n log n) time, and sorting in place changes the input.'],
    ['Fold every value into one XOR: pairs cancel, the single remains', 'Yes. x ^ x = 0 and x ^ 0 = x, in any order.'],
    ['A HashMap of counts', 'Correct, but O(n) space. The constraint rules it out.'],
  ]),
  step('Every value appears exactly THREE times except one. Why does the plain XOR fold fail?', [], 0, [
    ['Three copies fold to x ^ x ^ x = x, so the triples don’t cancel', 'Yes. Count each lantern position mod 3 instead, or run the ones/twos state machine.'],
    ['XOR can’t handle negative numbers', 'XOR works on any row of lanterns, negative or not. The problem is odd counts.'],
    ['It works: the fold still returns the single', 'Try [2, 2, 3, 2]: the fold gives 2 ^ 3 = 1, not 3.'],
  ]),
  step('Count the 1 bits of every number from 0 to n, in O(n) total.', [], 2, [
    ['Run Integer.bitCount on each number', 'Fine in practice, but the follow-up asks you to build each answer from earlier ones, not call a built-in n times.'],
    ['Shift each number down to 0 and count', 'That is O(n log n): about log n rounds per number.'],
    ['bits[i] = bits[i >> 1] + (i & 1), filled from 0 upward', 'Yes. i >> 1 is smaller than i, so its count is already known.'],
  ]),
  step('Every value appears once except one that appears twice, and the values are arbitrary (not 0..n). Find the repeated value.', [], 1, [
    ['XOR everything together', 'The pair cancels and every single remains, so you get the XOR of all the singles: the one thing you didn’t want.'],
    ['A HashSet: the first value already in the set is the answer', 'Yes. XOR finds what has NO partner. Finding the value that does have one is a lookup problem.'],
    ['Count bits position by position', 'Bit counts mix every single value together; nothing isolates the repeated one.'],
  ]),
  step('n is an int that the problem says to treat as unsigned, and it may be negative. You count its 1s by shifting. Which shift?', [], 0, [
    ['>>>, the logical shift: a dark lantern enters at the top', 'Yes. The loop ends after at most 32 rounds.'],
    ['>>, the arithmetic shift', 'On a negative n it copies the sign lantern in forever. −1 >> 1 is −1, so while (n != 0) never ends.'],
    ['Either; they are the same in Java', 'They differ exactly on negative numbers: −8 >> 1 = −4, but −8 >>> 1 = 2147483644.'],
  ]),
  step('Generate every subset of 12 distinct items.', [], 0, [
    ['Count a mask from 0 to 2¹² − 1; lantern i lit means item i is in', 'Yes. 4,096 masks, each a different subset. Backtracking (choose, explore, un-choose) is the other standard answer.'],
    ['Pick the items one by one with a greedy rule', 'There is nothing to optimise; the task is to list all 4,096 subsets.'],
    ['XOR the items together', 'That combines values. A subset is a choice of positions.'],
  ]),
  step('Is n a power of two? n is any int.', [], 1, [
    ['(n & (n − 1)) == 0', 'Two ints get through wrongly: 0 (0 & −1 = 0) and Integer.MIN_VALUE (MIN & MAX = 0). Both are rejected by also requiring n > 0.'],
    ['n > 0 && (n & (n − 1)) == 0', 'Yes. Exactly one lit lantern, and it isn’t the sign lantern.'],
    ['Integer.bitCount(n) == 1', 'MIN_VALUE has exactly one lit lantern but is negative. Add n > 0.'],
  ]),
  step('The answer must be returned mod 1,000,000,007 and you multiply two residues.', [], 2, [
    ['Multiply as ints, then take %', 'Two residues near 10⁹ multiply to about 10¹⁸, far beyond an int. It wraps before the % runs.'],
    ['Take Math.floorMod after multiplying', 'floorMod repairs a negative remainder, not an overflowed product.'],
    ['Cast to long before multiplying, then take %', 'Yes. Below 2⁶⁰, so the long product is exact.'],
  ]),
  step('n distinct numbers from 0..n, one missing. O(1) extra space, no overflow worries.', [], 0, [
    ['Fold the indexes, n and the values into one XOR', 'Yes. Every present number appears twice and cancels. XOR never carries, so it never overflows.'],
    ['Sort and scan for the gap', 'O(n log n), and it rewrites the input.'],
    ['Sum 0..n in an int, minus the sum of values', 'Right idea, but n(n + 1) passes 2³¹ − 1 once n passes 46,340. Sum in long, or use the XOR fold.'],
  ]),
];
