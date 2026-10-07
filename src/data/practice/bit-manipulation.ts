// Independent practice for the Math & Bit Manipulation lesson. Prompts never name the technique; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  pattern: 'Reason about the exact 32-bit pattern Java stores',
  fold: 'Fold values together so that matching pairs cancel',
  count: 'Count lit bits: position by position, or by clearing the lowest one repeatedly',
  build: 'Build each answer from a smaller answer already computed',
  shift: 'Move bits one at a time with masks and shifts',
  enumerate: 'Let the binary digits of a counter choose the items',
  numbertheory: 'Integer arithmetic: remainders, divisors, repeated squaring, crossing out multiples, overflow checks',
  other: 'Another tool fits better than bit tricks here',
} as const;

export const conceptIds = [
  'twos', 'shifts', 'single', 'missing', 'popcount', 'counting-bits', 'reverse-bits', 'subsets', 'gcd', 'mod-pow',
  'primes', 'single-ii', 'single-iii', 'no-plus', 'power', 'hamming', 'reverse-int', 'duplicate',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const pick = <T>(list: T[], v: number) => list[v % list.length];
// Deterministic shuffle so the same variant always shows the same order.
function shuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = (seed * 2654435761 + 12345) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const ones32 = (x: number) => { let c = 0; for (let u = x >>> 0; u !== 0; u = (u & (u - 1)) >>> 0) c++; return c; };
const reverse32 = (x: number) => { let r = 0; for (let k = 0; k < 32; k++) r = ((r << 1) | ((x >>> k) & 1)) >>> 0; return r; };
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const modPow = (b: number, e: number, m: number) => { let r = 1 % m, base = b % m; for (let k = e; k > 0; k >>= 1) { if (k & 1) r = (r * base) % m; base = (base * base) % m; } return r; };
const primesBelow = (n: number) => { const comp = new Array(Math.max(n, 0)).fill(false); let c = 0; for (let i = 2; i < n; i++) { if (comp[i]) continue; c++; for (let j = i * i; j < n; j += i) comp[j] = true; } return c; };
const reverseDigits = (x: number) => { const sign = x < 0 ? -1 : 1; const r = sign * Number(String(Math.abs(x)).split('').reverse().join('')); return r > 2147483647 || r < -2147483648 ? 0 : r; };

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'twos': {
      const x = pick([5, 1, 8, 12, 100, 2147483648, 7, 64, 255, 1000], v);
      const value = -x;
      const answer = ones32(value | 0);
      return {
        topic: 'How Java stores a negative number', section: 'twos-complement', strategy: 'pattern',
        prompt: `A Java int holds the value ${value}. Written out as all 32 of its binary digits, how many of those digits are 1?`,
        question: 'Enter the number of 1s.', answer,
        hints: ['Java stores −x as “flip every digit of x, then add one”.', `Write ${x === 2147483648 ? 'the magnitude' : x} in binary, flip all 32 digits, then add 1 and watch the carry.`, 'Adding 1 to a flipped row turns the trailing 1s back into 0s and lights the first 0 it meets.'],
        rubric: ['−x == ~x + 1 in a 32-bit int.', 'The leading digits of a small negative number are all 1s.', 'MIN_VALUE is its own negation: one lit digit, the sign.'],
        explanation: `${value} has ${answer} one(s) among its 32 binary digits.`,
      };
    }
    case 'shifts': {
      const x = pick([8, 1, 20, 100, 7, 64], v), s = 1 + (Math.floor(v / 6) % 4);
      const n = -x;
      const answer = [n >> s, n >>> s];
      return {
        topic: 'Signed versus unsigned right shift', section: 'operators', strategy: 'pattern',
        prompt: `In Java, int n = ${n}. Evaluate n >> ${s} and n >>> ${s}, and enter both results in that order.`,
        question: 'Enter both values.', answer,
        hints: ['The two right shifts differ only in what enters at the top.', '>> copies the sign digit in (so a negative stays negative); >>> lets a 0 in.', `n >> ${s} is the floor of n / 2^${s}. For n >>> ${s}, start from n + 2^32 and divide by 2^${s}.`],
        rubric: ['>> is arithmetic: it rounds toward negative infinity and keeps the sign.', '>>> is logical: the result of shifting a negative number is a large positive number.', 'A loop that shifts until n == 0 must use >>> on negative input.'],
        explanation: `n >> ${s} = ${answer[0]} and n >>> ${s} = ${answer[1]}.`,
      };
    }
    case 'single': {
      const sets: [number[], number][] = [[[1, 2], 4], [[3, 9, -2], 5], [[7, 0], 11], [[10, 20, 30], 0], [[-1, 14], 3], [[2, 6, 12], 25]];
      const [pairs, single] = pick(sets, v);
      const a = shuffle([...pairs, ...pairs, single], v);
      return {
        topic: 'One value without a partner', section: 'single-number', strategy: 'fold',
        prompt: `Every number in ${arr(a)} appears exactly twice, except one that appears once. Which one? Aim for O(n) time and O(1) extra space.`,
        question: 'Enter the number.', answer: single,
        hints: ['Is there an operation where a value combined with itself disappears?', 'That operation must also ignore the order in which values are combined.', 'Combine every value into one accumulator that starts at 0.'],
        rubric: ['x ^ x = 0 and x ^ 0 = x.', 'XOR is commutative and associative, so pairs cancel wherever they are.', 'One pass, one integer of memory.'],
        explanation: `The pairs cancel; ${single} is left.`,
      };
    }
    case 'missing': {
      const n = 4 + (v % 6), m = (v * 7) % (n + 1);
      const a = shuffle(Array.from({ length: n + 1 }, (_, i) => i).filter(x => x !== m), v + 3);
      return {
        topic: 'The number that isn’t there', section: 'missing-number', strategy: 'fold',
        prompt: `The list ${arr(a)} holds ${n} distinct numbers taken from 0 to ${n}. Which number from that range is missing? Use O(1) extra space.`,
        question: 'Enter the missing number.', answer: m,
        hints: ['Give every present number a partner so only the missing one stays alone.', `The positions 0..${n - 1}, plus ${n} itself, cover the full range.`, 'Fold positions, n and values together; or subtract the total from n(n + 1) / 2 computed in a wide type.'],
        rubric: ['Each present number appears twice in the fold and cancels.', 'The fold starts at n, the one number no position supplies.', 'The summing version computes n(n + 1) / 2 in long to avoid overflow.'],
        explanation: `${m} is the only number in 0..${n} that is absent.`,
      };
    }
    case 'popcount': {
      const x = pick([11, 128, -1, 255, -8, 1023, -2147483648, 43261596, 7, -100], v);
      const answer = ones32(x);
      return {
        topic: 'Count the lit digits', section: 'number-of-1-bits', strategy: 'count',
        prompt: `How many 1s are in the 32-bit binary form of the Java int ${x}?`,
        question: 'Enter the count.', answer,
        hints: ['For a negative number, remember what the leading digits look like.', 'n & (n − 1) removes exactly one 1: the lowest.', 'Count rounds until n is 0, or count 1s in the low part and add the leading 1s.'],
        rubric: ['Each round of n &= n − 1 removes exactly the lowest lit digit.', 'A shifting loop must use >>> or it never ends on negative input.', 'O(number of 1s) rounds, at most 32.'],
        explanation: `${x} has ${answer} one(s) in its 32-bit pattern.`,
      };
    }
    case 'counting-bits': {
      const n = 4 + (v % 13);
      const answer = Array.from({ length: n + 1 }, (_, i) => ones32(i));
      return {
        topic: 'A table of counts, each from an earlier one', section: 'counting-bits', strategy: 'build',
        prompt: `For every i from 0 to ${n}, count the 1s in i’s binary form. Do it in O(n) total time and enter the whole list.`,
        question: 'Enter the list of counts.', answer,
        hints: ['Every i is a smaller number with one more digit on the end.', 'Dropping the last digit is i >> 1; the dropped digit is i & 1.', 'bits[0] = 0, then bits[i] = bits[i >> 1] + (i & 1).'],
        rubric: ['i >> 1 is smaller than i, so its count is already known.', 'The recurrence adds exactly the dropped digit.', 'O(n) time, O(n) for the output.'],
        explanation: `The counts are ${arr(answer)}.`,
      };
    }
    case 'reverse-bits': {
      const x = pick([1, 43261596, 2, 6, 8, 1024, 255, 3, 2147483647, 13], v);
      const answer = reverse32(x);
      return {
        topic: 'Mirror a fixed-width row', section: 'reverse-bits', strategy: 'shift',
        prompt: `Write ${x} as exactly 32 binary digits, leading zeros included. Reverse the order of the digits and read the result as an unsigned number. What is it?`,
        question: 'Enter the unsigned value.', answer,
        hints: ['The digit in position 0 ends up in position 31.', 'Build the result by shifting it left and dropping in the next low digit of the input.', 'Run exactly 32 rounds; the leading zeros of the input become trailing zeros of the result.'],
        rubric: ['result = (result << 1) | (n & 1), then n >>>= 1.', 'Exactly 32 rounds, never “until n is 0”.', 'Read the final row as unsigned (Integer.toUnsignedString in Java).'],
        explanation: `Reversed, the row is ${answer} as an unsigned number.`,
      };
    }
    case 'subsets': {
      const sets: [number[], number][] = [[[1, 2, 3, 4], 5], [[3, 3, 3], 6], [[1, 1, 2, 2], 3], [[5, 1, 4, 2], 6], [[2, 3, 5, 7], 10], [[1, 2, 4, 8], 0]];
      const [w, base] = pick(sets, v);
      const t = base + (base === 0 ? 0 : Math.floor(v / sets.length) % 2);
      let answer = 0;
      for (let mask = 0; mask < (1 << w.length); mask++) {
        let s = 0;
        for (let i = 0; i < w.length; i++) if ((mask >> i) & 1) s += w[i];
        if (s === t) answer++;
      }
      return {
        topic: 'Every way to choose', section: 'bitmask-sets', strategy: 'enumerate',
        prompt: `Items have weights ${arr(w)} (items with equal weights are still different items). Among all ways to choose some of the items (choosing none counts as a way), how many have a total weight of exactly ${t}?`,
        question: 'Enter the number of choices.', answer,
        hints: ['Each item is either in or out. How many different in/out patterns are there?', 'Count a number from 0 to 2^n − 1; its digit i says whether item i is in.', 'For each pattern, add the weights of the items whose digit is 1, and compare with the target.'],
        rubric: ['2^n patterns, each a different choice, including the empty one.', '((mask >> i) & 1) == 1 means item i is chosen.', 'O(2^n × n) time, fine for small n.'],
        explanation: `${answer} choice(s) weigh exactly ${t}.`,
      };
    }
    case 'gcd': {
      const [a, b] = pick([[48, 18], [84, 36], [17, 5], [100, 75], [0, 9], [270, 192], [13, 13], [1071, 462]], v);
      const answer = gcd(a, b);
      return {
        topic: 'The largest shared divisor', section: 'clock-arithmetic', strategy: 'numbertheory',
        prompt: `What is the largest whole number that divides both ${a} and ${b}?`,
        question: 'Enter the number.', answer,
        hints: ['Anything that divides both a and b also divides a − b.', 'So it also divides a % b, which is much smaller.', 'Replace (a, b) with (b, a % b) until b is 0; then a is the answer.'],
        rubric: ['The pair shrinks while its common divisors stay the same.', 'Stop when b is 0; gcd(a, 0) = a.', 'O(log min(a, b)) steps.'],
        explanation: `The largest common divisor of ${a} and ${b} is ${answer}.`,
      };
    }
    case 'mod-pow': {
      const [b, e, m] = pick([[3, 13, 1000], [2, 10, 1000], [7, 5, 13], [2, 30, 1000], [5, 3, 7], [3, 20, 100], [10, 9, 7], [2, 62, 97]], v);
      const answer = modPow(b, e, m);
      return {
        topic: 'A huge power, kept small', section: 'clock-arithmetic', strategy: 'numbertheory',
        prompt: `What is the remainder when ${b}^${e} is divided by ${m}?`,
        question: 'Enter the remainder.', answer,
        hints: ['You never need the full power: take the remainder after every multiplication.', `Write ${e} in binary. Each 1 digit says which repeated square to multiply in.`, 'Square the base each round, multiply it into the result when the current digit of the exponent is 1.'],
        rubric: ['(a × b) mod m = ((a mod m) × (b mod m)) mod m.', 'Repeated squaring takes O(log e) multiplications.', 'In Java, multiply in long so the product can’t wrap before the %.'],
        explanation: `${b}^${e} mod ${m} = ${answer}.`,
      };
    }
    case 'primes': {
      const n = pick([10, 30, 2, 50, 100, 3, 20, 120], v);
      const answer = primesBelow(n);
      return {
        topic: 'Count the primes below n', section: 'sieve', strategy: 'numbertheory',
        prompt: `How many prime numbers are strictly less than ${n}? Imagine n can be in the millions.`,
        question: 'Enter the count.', answer,
        hints: ['Testing each number on its own repeats work. Let each prime announce its own multiples instead.', 'Keep one flag per number. Walk upward; an unflagged number is prime.', 'For each prime p, flag p × p, p × p + p, … below n.'],
        rubric: ['Each prime crosses out its multiples, starting from p × p.', 'Smaller multiples were already crossed out by smaller primes.', 'O(n log log n) time, O(n) space; compute p × p in long.'],
        explanation: `There are ${answer} primes below ${n}.`,
      };
    }
    case 'single-ii': {
      const sets: [number[], number][] = [[[0, 1], 99], [[2], 3], [[-2, 5], 7], [[4, -1], -6], [[8, 3, 1], 10]];
      const [triples, single] = pick(sets, v);
      const a = shuffle([...triples, ...triples, ...triples, single], v + 11);
      return {
        topic: 'One value among triples', section: 'single-number-ii', strategy: 'count',
        prompt: `Every number in ${arr(a)} appears exactly three times, except one that appears once. Which one? Use O(1) extra space.`,
        question: 'Enter the number.', answer: single,
        hints: ['Combining pairs so they cancel doesn’t help when there are three copies.', 'Look at one digit position at a time and count how many values have a 1 there.', 'Each count is a multiple of 3, plus 1 where the single has a 1.'],
        rubric: ['Per position, the count mod 3 is the single’s digit.', 'Thirty-two counts, or two rows (ones, twos) as a counter mod 3.', 'Negative values work: the sign position is counted like any other.'],
        explanation: `${single} is the value that appears once.`,
      };
    }
    case 'single-iii': {
      const sets: [number[], [number, number]][] = [[[1, 2], [3, 5]], [[0], [-1, 4]], [[7, 9], [2, 12]], [[-3], [6, 10]], [[5, 11, 4], [1, 8]]];
      const [pairs, two] = pick(sets, v);
      const a = shuffle([...pairs, ...pairs, ...two], v + 5);
      const answer = [...two].sort((x, y) => x - y);
      return {
        topic: 'Two values without partners', section: 'single-number-iii', strategy: 'fold',
        prompt: `In ${arr(a)}, exactly two numbers appear once and every other number appears exactly twice. Find the two, in O(n) time and O(1) extra space. Enter them smaller first.`,
        question: 'Enter the two numbers.', answer,
        hints: ['Combining everything so pairs cancel leaves a mix of the two singles. Where do they differ?', 'Any 1 digit in that mix marks a position where the two singles disagree.', 'Split the values by that digit and cancel pairs within each group.'],
        rubric: ['The fold of everything is a ^ b, nonzero because a ≠ b.', 'split = both & −both picks one position where a and b differ.', 'Each group contains whole pairs plus exactly one single.'],
        explanation: `The two singles are ${answer[0]} and ${answer[1]}.`,
      };
    }
    case 'no-plus': {
      const [a, b] = pick([[5, 7], [1, 1], [13, 11], [15, 1], [6, 3], [12, 4], [1, 255], [9, 9]], v);
      let x = a, y = b, rounds = 0;
      while (y !== 0) { const carry = (x & y) << 1; x ^= y; y = carry; rounds++; }
      return {
        topic: 'Adding without a plus sign', section: 'sum-without-plus', strategy: 'shift',
        prompt: `An adder works in rounds. Each round it writes down the binary sum of its two inputs with every carry ignored, and separately the carries alone, moved one place left. Those two numbers are the next round’s inputs. It stops after the first round that produces no carries. Adding ${a} and ${b}, how many rounds run?`,
        question: 'Enter the number of rounds.', answer: rounds,
        hints: ['The sum without carries lights a position when exactly one input has a 1 there.', 'The carries are the positions where both inputs have a 1, moved one place left.', `Write ${a} and ${b} in binary and play the rounds until the carry row is all 0s.`],
        rubric: ['sum = a ^ b, carry = (a & b) << 1.', 'Each round pushes the lowest carry at least one place left, so a 32-bit int needs at most 32 rounds.', `The final sum is ${a + b}.`],
        explanation: `${rounds} round(s); the sum is ${a + b}.`,
      };
    }
    case 'power': {
      const four = v % 2 === 1;
      const x = pick([16, 0, 1, 96, -16, -2147483648, 1024, 6, 64, 2], Math.floor(v / 2));
      let answer = x > 0 && (x & (x - 1)) === 0;
      if (four) answer = answer && (x & 0x55555555) !== 0;
      return {
        topic: 'Exactly one lit digit', section: 'power-of-two', strategy: 'count',
        prompt: `Is the Java int ${x} a power of ${four ? 'four' : 'two'}?`,
        question: 'Enter yes or no.', answer,
        hints: ['What does a power of two look like in binary?', 'Exactly one 1 digit, and not the sign digit: n > 0 and n & (n − 1) == 0.', four ? 'A power of four also has its 1 at an even position: n & 0x55555555 is nonzero.' : 'Watch 0 and the most negative int; both pass the n & (n − 1) test alone.'],
        rubric: ['n > 0 rules out 0 and every negative number, including MIN_VALUE.', 'n & (n − 1) == 0 means at most one digit is 1.', 'Powers of four keep that digit at positions 0, 2, 4, …'],
        explanation: `${x} is ${answer ? '' : 'not '}a power of ${four ? 'four' : 'two'}.`,
      };
    }
    case 'hamming': {
      const [x, y] = pick([[1, 4], [3, 1], [0, -1], [7, 8], [-8, 8], [2147483647, -2147483648], [93, 73], [5, 5]], v);
      const answer = ones32(x ^ y);
      return {
        topic: 'Where two rows disagree', section: 'hamming-distance', strategy: 'count',
        prompt: `Compare the 32-bit Java ints ${x} and ${y}. In how many of the 32 binary positions do they differ?`,
        question: 'Enter the number of positions.', answer,
        hints: ['Is there one operation that marks exactly the positions where two rows differ?', 'x ^ y has a 1 exactly where x and y disagree.', 'Count the 1s of x ^ y.'],
        rubric: ['x ^ y lights the differing positions.', 'Counting with n &= n − 1 takes one round per difference.', 'Negative values just have many leading 1s; nothing special.'],
        explanation: `${x} and ${y} differ in ${answer} position(s).`,
      };
    }
    case 'reverse-int': {
      const x = pick([123, -123, 120, 1534236469, 1463847412, -2147483412, 1000000003, 2147483647, -2147483648, 901000], v);
      const answer = reverseDigits(x);
      return {
        topic: 'Reverse the decimal digits, safely', section: 'reverse-integer', strategy: 'numbertheory',
        prompt: `Reverse the decimal digits of the 32-bit int ${x}, keeping its sign (so -123 becomes -321 and 120 becomes 21). If the result doesn’t fit in a 32-bit signed int, answer 0. You may not use a 64-bit type.`,
        question: 'Enter the result.', answer,
        hints: ['Peel digits off the bottom with % 10 and build the result with × 10 + digit.', 'The × 10 can overflow. Check before multiplying.', 'If rev > MAX / 10 or rev < MIN / 10, the next × 10 would overflow: return 0.'],
        rubric: ['x % 10 keeps x’s sign in Java, so negatives need no special case.', 'The overflow check comes before rev × 10, comparing against MAX / 10 and MIN / 10.', 'O(number of digits).'],
        explanation: answer === 0 && x % 10 !== 0 ? `The reversal of ${x} doesn’t fit in an int, so the answer is 0.` : `The reversal is ${answer}.`,
      };
    }
    case 'duplicate': {
      const lists = [[17, 4, 99, 23, 4, 8], [5, 1, 9, 1], [-3, 12, 40, -3, 7], [100, 250, 31, 77, 250]];
      const a = shuffle(pick(lists, v), v + 7);
      const answer = a.find((x, i) => a.indexOf(x) !== i)!;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Every number in ${arr(a)} appears once, except one that appears twice. The values can be anything. Which number is repeated?`,
        question: 'Enter the repeated number.', answer,
        hints: ['Combining everything so pairs cancel removes exactly the value you want.', 'You need to remember which values you have already seen.', 'A hash set: the first value already in the set is the answer.'],
        rubric: ['Cancelling pairs isolates values WITHOUT a partner; here you want the one WITH a partner.', 'A HashSet finds it in one pass, O(n) expected time and O(n) space.', 'If values were 1..n with n + 1 slots, cycle detection would give O(1) space.'],
        explanation: `${answer} is repeated. Use a hash set; cancellation would erase it.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-bit-manipulation-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
