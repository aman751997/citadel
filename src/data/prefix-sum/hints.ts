// Three-step hint ladders for every <HintLadder> in prefix-sum.mdx.
export const hints: Record<string, [string, string, string]> = {
  rangeSum: [
    'Every question re-adds values someone already added. What could you write down once so the shared beginning of any two ranges cancels?',
    'prefix has n + 1 lines: prefix[0] = 0 and prefix[i + 1] = prefix[i] + nums[i]. Line i is the total of everything before index i.',
    'Build once in the constructor. sumRange(left, right) returns prefix[right + 1] − prefix[left]: through right, minus everything before left.',
  ],
  pivot: [
    'The left side, the pivot and the right side always add up to the same grand total.',
    'Compute total once. Carry leftSum, the total of everything strictly before i.',
    'At each i, compare leftSum with total − leftSum − nums[i]; return the first match. Only after the comparison add nums[i] to leftSum. Return −1 if none.',
  ],
  product: [
    'Everything except position i is everything left of i times everything right of i.',
    'Pass 1 writes the running product of nums[0..i − 1] into answer[i], starting with the empty product 1. Pass 2 carries one number, suffix, from the back.',
    'In pass 2, for i from n − 1 down to 0: answer[i] *= suffix first, then suffix *= nums[i]. No division anywhere.',
  ],
  countK: [
    'Don’t search for the run. Stand at its end: which earlier running total would make the run between them equal k?',
    'Keep a running total and a map from total to how many times it has appeared. Seed it with total 0, seen once: the empty prefix.',
    'For each value: add it to the running total, add map[running − k] to the count, then record the running total. Count before recording.',
  ],
  multipleK: [
    'If two running totals leave the same remainder mod k, what do you know about the stretch between them?',
    'Store remainder → the FIRST index where it appeared. Seed remainder 0 at index −1, the empty prefix just before index 0.',
    'At index i with remainder r: if r was seen at index f and i − f ≥ 2, return true; if r is new, store i; never overwrite. Keep the running remainder in a long.',
  ],
  contiguous: [
    'Can you turn “equally many 0s and 1s” into “this stretch sums to something”?',
    'Count 0 as −1 and 1 as +1. A balanced stretch sums to 0, so two equal running balances bracket one.',
    'Map balance → first index, seeded 0 → −1. At each i, if the balance was seen at f, the stretch has length i − f; otherwise store i. Track the best.',
  ],
  divisible: [
    'Equal remainders of two running totals mean the stretch between them is divisible by k. Now you need every pair, not just one.',
    'Remainders live in 0..k − 1, so an int[k] of tallies works. Seed remainder 0 with one tally for the empty prefix.',
    'For each value: rem = ((rem + x) % k + k) % k, because Java’s % can be negative. Add seen[rem] to the count, then increment seen[rem].',
  ],
  nice: [
    'Only whether a value is odd matters. What if each value were replaced by 1 (odd) or 0 (even)?',
    'Then “exactly k odd numbers” means “the 0/1 values sum to k”. The running odd-count never exceeds n, so an int[n + 1] of tallies replaces the map.',
    'Seed seen[0] = 1. For each value: odd += x & 1; if odd ≥ k add seen[odd − k]; then seen[odd]++.',
  ],
  xor: [
    'The ledger works because the shared beginning cancels. What cancels itself under XOR?',
    'x ^ x = 0, so a ledger of running XORs px (with px[0] = 0) works like a ledger of sums.',
    'xor(l..r) = px[r + 1] ^ px[l]. To count stretches with XOR k, seed a tally map with 0 → 1 and look up px ^ k before recording px.',
  ],
  grid: [
    'Write the 1-D ledger idea in both directions: one number per cell that summarises the whole block above and to the left of it.',
    'P has (rows + 1) × (cols + 1) entries, with a zero row and a zero column. P[r + 1][c + 1] is the block from (0, 0) to (r, c).',
    'Build with P[r+1][c+1] = m[r][c] + P[r][c+1] + P[r+1][c] − P[r][c]. Answer with the big block minus the strip above, minus the strip to the left, plus the corner removed twice.',
  ],
  flights: [
    'Many writes, one read at the end. Could each booking touch only the places where something changes?',
    'A board diff with n + 1 slots: +seats where a booking starts, −seats just after it ends. A running total over diff rebuilds every flight.',
    'Flights are 1-indexed: diff[first − 1] += seats and diff[last] −= seats. Then sweep i from 0 to n − 1, carrying running += diff[i] into answer[i].',
  ],
};
