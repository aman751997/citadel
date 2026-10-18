// Three-step hint ladders for every <HintLadder> in bit-manipulation.mdx.
export const hints: Record<string, [string, string, string]> = {
  twos: [
    'To negate, you want a row that sums with x to a row of 32 clear bits, letting the final carry fall off the top.',
    'x + ~x is all 32 bits set, which is −1. So x + (~x + 1) is 0.',
    'negate returns ~x + 1. For the picture, Integer.toBinaryString(x) drops leading zeros, so pad it to 32 characters with zeros.',
  ],
  bitOps: [
    'Every single-bit operation uses the same mask: 1 << i, a row with one hole at bit i.',
    'AND with the mask reads, OR sets, AND with the inverted mask ~(1 << i) clears, XOR flips.',
    'For the lowest set bit: x & (x − 1) puts it out, and x & −x keeps only it. Both are 0 when x is 0.',
  ],
  single: [
    'Is there an operation where a value combined with itself disappears, and the order of combining doesn’t matter?',
    'x ^ x = 0, x ^ 0 = x, and XOR can be reordered freely. Fold every value into one accumulator.',
    'acc starts at 0. For each value, acc ^= value. At loop exit, acc is the value with no partner.',
  ],
  missing: [
    'Give every present number a partner, so that only the missing one is left alone.',
    'The indexes 0..n − 1 plus n itself are exactly the full range 0..n. Fold them in alongside the values.',
    'acc = n; for each i, acc ^= i ^ nums[i]. Or, by summing: n(n + 1) / 2 minus the total, computed in long.',
  ],
  popcount: [
    'You can read bit 0 with n & 1. How do you bring every other bit to position 0 in turn, without letting copies of the sign bit in?',
    'Shift with >>>, the logical shift, so a clear bit enters at the top and the loop ends after at most 32 rounds.',
    'Faster: n &= n − 1 clears the lowest set bit. Count the rounds until n is 0, one per set bit.',
  ],
  countBits: [
    'Every number i is a smaller number with one more bit on the end. Which smaller number, and which bit?',
    'i >> 1 drops the last bit; i & 1 says whether that dropped bit was set. i >> 1 is smaller than i, so it was filled earlier.',
    'bits[0] = 0; for i from 1 to n, bits[i] = bits[i >> 1] + (i & 1). Or bits[i] = bits[i & (i − 1)] + 1.',
  ],
  reverse: [
    'Bit 0 of n must end up at bit 31 of the result. If you read n from the bottom, where should each bit you read go in the result?',
    'Build the result like reading digits into a number: shift it left to make room, then drop the new bit into position 0.',
    'Exactly 32 rounds: result = (result << 1) | (n & 1); then n >>>= 1. Never stop early when n reaches 0.',
  ],
  subsets: [
    'Each item is either in or out: one bit per item. How many different rows of n bits are there?',
    'Count mask from 0 to (1 << n) − 1. Each mask is a different subset.',
    'For each mask, add nums[i] for every i where ((mask >> i) & 1) == 1.',
  ],
  clock: [
    'Anything that divides both a and b also divides a − b, and so a % b. The pair shrinks, and the divisors stay the same.',
    'gcd: replace (a, b) with (b, a % b) until b is 0. Powers: the exponent’s set bits say which squares to multiply in.',
    'Reduce after every multiply, in long. For a negative value use Math.floorMod. To catch overflow, Math.addExact throws instead of wrapping.',
  ],
  sieve: [
    'Instead of testing each number for primality, let each prime cross out its own multiples.',
    'A boolean array composite[0..n − 1]. Walk i upward; an unmarked i is prime.',
    'For each prime i, cross out i × i, i × i + i, … below n, with j kept in a long so i × i can’t wrap.',
  ],
  singleII: [
    'Look at one bit position at a time. How many of the values set it, if every triple sets it three times?',
    'The count at each position is 3k, or 3k + 1 when the single sets it. Count mod 3.',
    'For bit 0..31: count the values with that bit set; if the count % 3 is 1, set that bit of the result. Or keep two rows, ones and twos, as a per-bit counter mod 3.',
  ],
  singleIII: [
    'Folding everything gives a ^ b. Since a ≠ b, at least one bit of a ^ b is set. What does a set bit there tell you?',
    'At a set bit of a ^ b, a and b disagree. Pick one, say the lowest: split = both & −both.',
    'Fold only the values whose split bit is set: pairs still cancel inside that group, leaving one of the singles. The other is both ^ that one.',
  ],
  getSum: [
    'Add two binary numbers by hand. What happens at a column where both bits are set, and at a column where exactly one is?',
    'a ^ b is the sum without carries; (a & b) << 1 is the carries, moved to the next column.',
    'Repeat: carry = (a & b) << 1; a = a ^ b; b = carry; until b is 0. Return a.',
  ],
  powers: [
    'What does a power of two look like as a row of bits?',
    'Exactly one set bit. n & (n − 1) clears the lowest set one, so a power of two becomes 0. Guard against 0 and MIN_VALUE with n > 0.',
    'Power of four: also require the set bit to sit at an even position: (n & 0x55555555) != 0.',
  ],
  hamming: [
    'Where do two rows of bits disagree? Is there one operation that sets exactly those positions?',
    'x ^ y sets exactly the positions that differ. Now count its set bits.',
    'diff = x ^ y; while (diff != 0) { diff &= diff − 1; count++; }. For all pairs: per bit, set × clear.',
  ],
  reverseInt: [
    'Peel digits off the bottom with % 10 and push them onto the result with × 10. Which step can overflow?',
    'rev × 10 + digit can pass 2³¹ − 1. Check BEFORE multiplying: compare rev with Integer.MAX_VALUE / 10 and Integer.MIN_VALUE / 10.',
    'Loop while x != 0: digit = x % 10 (it keeps x’s sign); x /= 10; if rev is beyond MAX / 10 or MIN / 10, return 0; rev = rev × 10 + digit.',
  ],
};
