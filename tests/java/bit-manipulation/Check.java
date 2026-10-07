import java.math.BigInteger;
import java.util.*;

// Runs every Java solution shown in bit-manipulation.mdx against independent oracles: JDK built-ins
// (Integer.bitCount, Integer.reverse, Integer.lowestOneBit), BigInteger arithmetic, HashMap counting,
// trial division and exhaustive search. Inputs cover 0, -1, Integer.MIN_VALUE, Integer.MAX_VALUE and
// random ints across the full 32-bit range. It also proves that each "catch the bug" version named in
// the lesson fails on the input the lesson names.
public class Check {
    static final Random R = new Random(17);
    static int cases = 0;
    static final int MIN = Integer.MIN_VALUE, MAX = Integer.MAX_VALUE;
    static final int[] EDGES = {0, 1, -1, 2, -2, 3, 5, -5, 7, 8, -8, 11, 12, 88, 255, 256, 1 << 30, MAX, MIN, MAX - 1, MIN + 1, 43261596, -3, 0x55555555, 0xAAAAAAAA, 0xF0000000};

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int anyInt() { return R.nextInt(4) == 0 ? EDGES[R.nextInt(EDGES.length)] : R.nextInt(); }
    static List<Integer> sampleInts(int n) { List<Integer> out = new ArrayList<>(); for (int e : EDGES) out.add(e); for (int i = 0; i < n; i++) out.add(R.nextInt()); return out; }
    static BigInteger unsigned(int x) { return BigInteger.valueOf(x & 0xFFFFFFFFL); }
    static int shuffleInPlace(int[] a) { for (int i = a.length - 1; i > 0; i--) { int j = R.nextInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a.length; }
    static int oddOneOut(int[] a, int k) {          // the value whose count is not a multiple of k
        Map<Integer, Integer> c = new HashMap<>();
        for (int x : a) c.merge(x, 1, Integer::sum);
        for (var e : c.entrySet()) if (e.getValue() % k != 0) return e.getKey();
        throw new IllegalStateException("no single");
    }
    static String bits32(int x) {                    // independent: character by character from BigInteger
        BigInteger u = unsigned(x);
        StringBuilder sb = new StringBuilder();
        for (int i = 31; i >= 0; i--) sb.append(u.testBit(i) ? '1' : '0');
        return sb.toString();
    }
    static boolean isPrime(int n) { if (n < 2) return false; for (int d = 2; (long) d * d <= n; d++) if (n % d == 0) return false; return true; }

    // ---- the buggy versions the lesson names ----
    static int popcountSignedShift(int n, int budget) {        // returns -1 if it hasn't stopped within budget
        int count = 0;
        for (int k = 0; n != 0; k++) { if (k == budget) return -1; count += n & 1; n >>= 1; }
        return count;
    }
    static int reverseStopWhenZero(int n) { int r = 0; while (n != 0) { r = (r << 1) | (n & 1); n >>>= 1; } return r; }
    static int reverseTakeThenShift(int n) { int r = 0; for (int i = 0; i < 32; i++) { r |= n & 1; r <<= 1; n >>>= 1; } return r; }
    static int reverseSignedShift32(int n) { int r = 0; for (int i = 0; i < 32; i++) { r = (r << 1) | (n & 1); n >>= 1; } return r; }
    static int missingIntGauss(int[] nums) { int n = nums.length, expected = n * (n + 1) / 2, actual = 0; for (int x : nums) actual += x; return expected - actual; }
    static int missingValuesOnly(int[] nums) { int acc = 0; for (int x : nums) acc ^= x; return acc; }
    static int missingForgetN(int[] nums) { int acc = 0; for (int i = 0; i < nums.length; i++) acc ^= i ^ nums[i]; return acc; }
    static int[] singleIIIEqualsOne(int[] nums) {
        int both = 0; for (int x : nums) both ^= x;
        int split = both & -both, a = 0;
        for (int x : nums) if ((x & split) == 1) a ^= x;
        return new int[]{a, both ^ a};
    }
    static boolean powerOfTwoNoGuard(int n) { return (n & (n - 1)) == 0; }
    static int reverseCheckAfter(int x) {
        int rev = 0;
        while (x != 0) { int d = x % 10; x /= 10; rev = rev * 10 + d; if (rev > Integer.MAX_VALUE || rev < Integer.MIN_VALUE) return 0; }
        return rev;
    }
    static int countPrimesIntSquare(int n) {
        if (n < 3) return 0;
        boolean[] composite = new boolean[n]; int count = 0;
        for (int i = 2; i < n; i++) { if (composite[i]) continue; count++; for (int j = i * i; j < n; j += i) composite[j] = true; }
        return count;
    }
    static int bruteReverseInt(int x) {
        String digits = new StringBuilder(Long.toString(Math.abs((long) x))).reverse().toString();
        BigInteger r = new BigInteger(digits);
        if (x < 0) r = r.negate();
        return r.bitLength() < 32 ? r.intValue() : 0;   // bitLength < 32 <=> fits in a signed int
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: two's complement ----------
        var tw = new B_twos();
        for (int x : sampleInts(20000)) eq(-x, tw.negate(x), "negate " + x);
        eq(MIN, tw.negate(MIN), "negate MIN is MIN");
        eq(MIN, Math.abs(MIN), "Math.abs(MIN)");
        eq(MIN, MAX + 1, "MAX + 1 wraps");
        eq(-6, ~5, "~5 = -6");
        eq("11111111111111111111111111111011", tw.lanterns(-5), "lanterns(-5)");
        eq("00000000000000000000000000000101", tw.lanterns(5), "lanterns(5)");
        eq("1".repeat(32), tw.lanterns(-1), "lanterns(-1)");
        for (int x : sampleInts(5000)) eq(bits32(x), tw.lanterns(x), "lanterns " + x);
        boolean threw = false;
        try { Math.addExact(MAX, 1); } catch (ArithmeticException e) { threw = true; }
        ok(threw, "addExact(MAX, 1) throws");

        // ---------- Chapter 2: operators ----------
        var ops = new B_bitOps();
        for (int t = 0; t < 20000; t++) {
            int x = anyInt(), i = R.nextInt(32);
            BigInteger u = unsigned(x);
            eq(u.testBit(i), ops.isLit(x, i), "isLit");
            eq(u.setBit(i).intValue(), ops.light(x, i), "light");
            eq(u.clearBit(i).intValue(), ops.darken(x, i), "darken");
            eq(u.flipBit(i).intValue(), ops.flip(x, i), "flip");
            eq(Integer.lowestOneBit(x), ops.lowestLit(x), "lowestLit " + x);
            eq(x - Integer.lowestOneBit(x), ops.dropLowest(x), "dropLowest " + x);
            eq(Integer.bitCount(x) - (x == 0 ? 0 : 1), Integer.bitCount(ops.dropLowest(x)), "dropLowest clears exactly one");
        }
        eq(80, ops.dropLowest(88), "88 & 87"); eq(8, ops.lowestLit(88), "88 & -88");
        eq(0, ops.lowestLit(0), "lowestLit(0)"); eq(0, ops.dropLowest(0), "dropLowest(0)");
        eq(MIN, ops.lowestLit(MIN), "lowestLit(MIN)"); eq(0, ops.dropLowest(MIN), "dropLowest(MIN)");
        // shift facts quoted in the lesson
        eq(-4, -8 >> 1, "-8 >> 1"); eq(2147483644, -8 >>> 1, "-8 >>> 1"); eq(-1, -1 >> 1, "-1 >> 1");
        eq(-4, -7 >> 1, "-7 >> 1 floors"); eq(-3, -7 / 2, "-7 / 2 truncates");
        eq(1, 1 << 32, "shift distance is taken mod 32"); eq(MIN, 1 << 31, "1 << 31"); eq(1L << 40, 1099511627776L, "1L << 40");
        eq(-1, popcountSignedShift(-8, 1000), "the >> popcount loop never stops on -8");
        eq(29, Integer.bitCount(-8), "-8 has 29 lit lanterns");
        eq(29, new B_hammingWeight().hammingWeight(-8), "the >>> loop returns 29 for -8");

        // ---------- Chapter 3: Single Number ----------
        eq(4, new B_singleNumber().singleNumber(new int[]{4, 1, 2, 1, 2}), "single LC");
        eq(1, new B_singleNumber().singleNumber(new int[]{1}), "single one value");
        eq(1, new B_singleNumber().singleNumber(new int[]{2, 2, 1}), "single LC 1");
        eq(MIN, new B_singleNumber().singleNumber(new int[]{-1, MIN, -1}), "single MIN");
        for (int t = 0; t < 3000; t++) {
            int pairs = R.nextInt(8);
            Set<Integer> used = new HashSet<>();
            int[] a = new int[2 * pairs + 1];
            for (int p = 0; p < pairs; p++) { int v; do v = anyInt(); while (!used.add(v)); a[2 * p] = v; a[2 * p + 1] = v; }
            int single; do single = anyInt(); while (used.contains(single));
            a[2 * pairs] = single;
            shuffleInPlace(a);
            eq(oddOneOut(a, 2), new B_singleNumber().singleNumber(a), "singleNumber " + Arrays.toString(a));
        }

        // ---------- Chapter 4: Missing Number ----------
        eq(2, new B_missingNumber().missingNumber(new int[]{3, 0, 1}), "missing LC 1");
        eq(8, new B_missingNumber().missingNumber(new int[]{9, 6, 4, 2, 3, 5, 7, 0, 1}), "missing LC 3");
        eq(2, new B_missingNumber().missingNumber(new int[]{4, 0, 1, 3}), "missing trace");
        eq(6, missingValuesOnly(new int[]{4, 0, 1, 3}), "trace: values only gives 6");
        eq(6, missingForgetN(new int[]{4, 0, 1, 3}), "trace: forgetting n gives 6");
        eq(0, new B_missingNumber().missingNumber(new int[]{1}), "missing 0");
        eq(1, new B_missingNumber().missingNumber(new int[]{0}), "missing n");
        for (int t = 0; t < 3000; t++) {
            int n = R.nextInt(40), m = R.nextInt(n + 1);
            int[] a = new int[n];
            for (int v = 0, k = 0; v <= n; v++) if (v != m) a[k++] = v;
            shuffleInPlace(a);
            eq(m, new B_missingNumber().missingNumber(a), "missingNumber");
            eq(m, new B_missingNumberSum().missingNumberSum(a), "missingNumberSum");
        }
        {   // n = 65,536: the int Gauss formula breaks, the long one and the XOR fold don't
            int n = 65536, m = 5;
            int[] a = new int[n];
            for (int v = 0, k = 0; v <= n; v++) if (v != m) a[k++] = v;
            eq(m, new B_missingNumber().missingNumber(a), "missingNumber n=65536");
            eq(m, new B_missingNumberSum().missingNumberSum(a), "missingNumberSum n=65536");
            ok(missingIntGauss(a) != m, "int Gauss breaks at n = 65536 (got " + missingIntGauss(a) + ")");
            eq(-1794917296, 50000 * 50001, "50000 * 50001 wraps");
        }

        // ---------- Chapter 5: Number of 1 Bits ----------
        for (int x : sampleInts(30000)) {
            eq(Integer.bitCount(x), new B_hammingWeight().hammingWeight(x), "hammingWeight " + x);
            eq(Integer.bitCount(x), new B_hammingWeightKernighan().hammingWeightKernighan(x), "kernighan " + x);
        }
        eq(3, new B_hammingWeight().hammingWeight(11), "popcount 11");
        eq(31, new B_hammingWeight().hammingWeight(-3), "popcount -3 (LeetCode's old 'unsigned' example 4294967293)");
        eq(32, new B_hammingWeightKernighan().hammingWeightKernighan(-1), "popcount -1");

        // ---------- Chapter 6: Counting Bits ----------
        eq(new int[]{0}, new B_countBits().countBits(0), "countBits 0");
        eq(new int[]{0, 1, 1}, new B_countBits().countBits(2), "countBits LC 1");
        eq(new int[]{0, 1, 1, 2, 1, 2}, new B_countBits().countBits(5), "countBits LC 2");
        for (int n = 0; n <= 3000; n += (n < 300 ? 1 : 37)) {
            int[] expect = new int[n + 1];
            for (int i = 0; i <= n; i++) expect[i] = Integer.bitCount(i);
            eq(expect, new B_countBits().countBits(n), "countBits " + n);
            eq(expect, new B_countBitsLowest().countBitsLowest(n), "countBitsLowest " + n);
        }
        {
            int n = 100000; int[] a = new B_countBits().countBits(n), b = new B_countBitsLowest().countBitsLowest(n);
            for (int i = 0; i <= n; i++) { if (a[i] != Integer.bitCount(i) || b[i] != a[i]) throw new AssertionError("countBits big " + i); }
            cases++;
        }

        // ---------- Chapter 7: Reverse Bits ----------
        for (int x : sampleInts(30000)) {
            eq(Integer.reverse(x), new B_reverseBits().reverseBits(x), "reverseBits " + x);
            eq(Integer.reverse(x), new B_reverseBitsSwap().reverseBitsSwap(x), "reverseBitsSwap " + x);
            eq(Integer.reverse(x), reverseSignedShift32(x), "fixed 32 rounds with >> also works " + x);
        }
        eq(964176192, new B_reverseBits().reverseBits(43261596), "reverse LC 1");
        eq(-1073741825, new B_reverseBits().reverseBits(-3), "reverse LC 2 (4294967293 -> 3221225471)");
        eq(3221225471L, Integer.toUnsignedLong(-1073741825), "unsigned reading");
        eq(MIN, new B_reverseBits().reverseBits(1), "reverse 1");
        eq(1, reverseStopWhenZero(1), "catch-the-bug: while (n != 0) returns 1 for n = 1");
        eq(0, reverseTakeThenShift(1), "trace: take-then-shift returns 0 for n = 1");
        eq(15, reverseSignedShift32(0xF0000000), "trace: >> with exactly 32 rounds on 0xF0000000");

        // ---------- Chapter 8: Subsets ----------
        for (int n = 0; n <= 10; n++) {
            int[] nums = new int[n];
            Set<Integer> seen = new HashSet<>();
            for (int i = 0; i < n; i++) { int v; do v = R.nextInt(21) - 10; while (!seen.add(v)); nums[i] = v; }
            List<List<Integer>> got = new B_subsets().subsets(nums);
            eq(1 << n, got.size(), "subsets count n=" + n);
            Set<Set<Integer>> distinct = new HashSet<>();
            for (List<Integer> s : got) {
                int at = 0;                                   // each subset keeps nums' order
                for (int v : s) { while (at < n && nums[at] != v) at++; ok(at < n, "subset element from nums, in order"); at++; }
                distinct.add(new HashSet<>(s));
            }
            eq(1 << n, distinct.size(), "subsets all different n=" + n);
        }
        eq(List.of(List.of(), List.of(3), List.of(5), List.of(3, 5), List.of(9), List.of(3, 9), List.of(5, 9), List.of(3, 5, 9)),
            new B_subsets().subsets(new int[]{3, 5, 9}), "subsets in mask order (figure)");

        // ---------- Chapter 9: GCD, modular arithmetic, overflow ----------
        eq(6, new B_gcd().gcd(48, 18), "gcd 48 18"); eq(21, new B_gcd().gcd(1071, 462), "gcd 1071 462");
        eq(0, new B_gcd().gcd(0, 0), "gcd 0 0"); eq(9, new B_gcd().gcd(0, 9), "gcd 0 9"); eq(9, new B_gcd().gcd(9, 0), "gcd 9 0");
        eq(MAX, new B_gcd().gcd(MAX, MAX), "gcd MAX MAX");
        for (int t = 0; t < 20000; t++) {
            int a = R.nextInt(4) == 0 ? R.nextInt(100) : R.nextInt(MAX), b = R.nextInt(4) == 0 ? R.nextInt(100) : R.nextInt(MAX);
            eq(BigInteger.valueOf(a).gcd(BigInteger.valueOf(b)).intValue(), new B_gcd().gcd(a, b), "gcd " + a + " " + b);
        }
        eq(-1, -7 % 3, "-7 % 3"); eq(2, Math.floorMod(-7, 3), "floorMod(-7, 3)"); eq(4, Math.floorMod(-1, 5), "floorMod(-1, 5)");
        eq(323L, new B_modPow().modPow(3, 13, 1000), "3^13 mod 1000");
        eq(0L, new B_modPow().modPow(5, 0, 1), "mod 1");
        eq(1L, new B_modPow().modPow(0, 0, 7), "0^0 = 1 by convention");
        for (int t = 0; t < 20000; t++) {
            long base = R.nextInt(3) == 0 ? R.nextLong() : R.nextInt(2001) - 1000;
            long exp = R.nextInt(3) == 0 ? (R.nextLong() & Long.MAX_VALUE) : R.nextInt(100);
            long mod = R.nextInt(3) == 0 ? 1_000_000_007L : R.nextInt(3) == 0 ? MAX : 1 + R.nextInt(1000);
            long expect = BigInteger.valueOf(base).modPow(BigInteger.valueOf(exp), BigInteger.valueOf(mod)).longValue();
            eq(expect, new B_modPow().modPow(base, exp, mod), "modPow " + base + "^" + exp + " mod " + mod);
        }
        { int a = 999_999_999, b = 999_999_998; long M = 1_000_000_007L;
          ok((a * b) % M != BigInteger.valueOf(a).multiply(BigInteger.valueOf(b)).mod(BigInteger.valueOf(M)).longValue(), "int product wraps before %");
          eq(BigInteger.valueOf(a).multiply(BigInteger.valueOf(b)).mod(BigInteger.valueOf(M)).longValue(), (long) a * b % M, "(long) a * b % M"); }
        var ov = new B_overflow();
        for (int t = 0; t < 5000; t++) {
            int[] a = new int[R.nextInt(8)];
            for (int i = 0; i < a.length; i++) a[i] = R.nextInt(3) == 0 ? anyInt() : R.nextInt(2001) - 1000;
            BigInteger total = BigInteger.ZERO; boolean everOut = false;
            for (int x : a) { total = total.add(BigInteger.valueOf(x)); if (total.bitLength() >= 32) everOut = true; }
            eq(total.longValue(), ov.sumAll(a), "sumAll");
            boolean thrown = false; int got = 0;
            try { got = ov.sumAllStrict(a); } catch (ArithmeticException e) { thrown = true; }
            eq(everOut, thrown, "sumAllStrict throws exactly when a running total leaves int range " + Arrays.toString(a));
            if (!thrown) eq(total.intValue(), got, "sumAllStrict value");
        }
        { boolean thrown = false; try { ov.sumAllStrict(new int[]{MAX, 1, -1}); } catch (ArithmeticException e) { thrown = true; }
          ok(thrown, "addExact throws on a running total even if the final total would fit"); }

        // ---------- Chapter 10: Count Primes ----------
        for (int n = 0; n <= 3000; n++) {
            int expect = 0; for (int k = 0; k < n; k++) if (isPrime(k)) expect++;
            eq(expect, new B_countPrimes().countPrimes(n), "countPrimes " + n);
        }
        eq(10, new B_countPrimes().countPrimes(30), "primes below 30");
        eq(4, new B_countPrimes().countPrimes(10), "LC example");
        eq(78498, new B_countPrimes().countPrimes(1_000_000), "pi(10^6)");
        { int expect = 0; for (int k = 0; k < 200_000; k++) if (isPrime(k)) expect++; eq(expect, new B_countPrimes().countPrimes(200_000), "countPrimes 200000"); }
        eq(348513, new B_countPrimes().countPrimes(5_000_000), "pi(5 * 10^6)");
        ok(isPrime(46349), "46349 is prime");
        for (int p = 46341; p < 46349; p++) ok(!isPrime(p), p + " is not prime");
        eq(-2146737495, 46349 * 46349, "46349^2 wraps");
        { boolean thrown = false; try { countPrimesIntSquare(50_000); } catch (ArrayIndexOutOfBoundsException e) { thrown = true; }
          ok(thrown, "catch-the-bug: int j = i * i throws once i passes 46340"); }

        // ---------- Side quest 1: Single Number II ----------
        eq(3, new B_singleNumberII().singleNumberII(new int[]{2, 2, 3, 2}), "single II LC 1");
        eq(99, new B_singleNumberII().singleNumberII(new int[]{0, 1, 0, 1, 0, 1, 99}), "single II LC 2");
        eq(99, new B_singleNumberIIState().singleNumberIIState(new int[]{0, 1, 0, 1, 0, 1, 99}), "single II state LC 2");
        eq(1, 2 ^ 2 ^ 3 ^ 2, "plain XOR fold fails on [2, 2, 3, 2]");
        for (int t = 0; t < 3000; t++) {
            int triples = R.nextInt(6);
            Set<Integer> used = new HashSet<>();
            int[] a = new int[3 * triples + 1];
            for (int p = 0; p < triples; p++) { int v; do v = anyInt(); while (!used.add(v)); a[3 * p] = a[3 * p + 1] = a[3 * p + 2] = v; }
            int single; do single = anyInt(); while (used.contains(single));
            a[3 * triples] = single;
            shuffleInPlace(a);
            eq(single, new B_singleNumberII().singleNumberII(a), "singleNumberII " + Arrays.toString(a));
            eq(single, new B_singleNumberIIState().singleNumberIIState(a), "singleNumberIIState " + Arrays.toString(a));
        }

        // ---------- Side quest 2: Single Number III ----------
        for (int t = 0; t < 3000; t++) {
            int pairs = R.nextInt(6);
            Set<Integer> used = new HashSet<>();
            int[] a = new int[2 * pairs + 2];
            for (int p = 0; p < pairs; p++) { int v; do v = anyInt(); while (!used.add(v)); a[2 * p] = a[2 * p + 1] = v; }
            int x, y; do x = anyInt(); while (!used.add(x)); do y = anyInt(); while (!used.add(y));
            a[2 * pairs] = x; a[2 * pairs + 1] = y;
            shuffleInPlace(a);
            int[] got = new B_singleNumberIII().singleNumberIII(a.clone());
            eq(2, got.length, "singleNumberIII length");
            int[] want = {Math.min(x, y), Math.max(x, y)}, have = {Math.min(got[0], got[1]), Math.max(got[0], got[1])};
            eq(want, have, "singleNumberIII " + Arrays.toString(a));
        }
        { int[] got = new B_singleNumberIII().singleNumberIII(new int[]{1, 2, 1, 3, 2, 5}); Arrays.sort(got); eq(new int[]{3, 5}, got, "single III LC"); }
        { int[] got = new B_singleNumberIII().singleNumberIII(new int[]{MIN, 0}); Arrays.sort(got); eq(new int[]{MIN, 0}, got, "single III with MIN"); }
        eq(new int[]{0, 6}, singleIIIEqualsOne(new int[]{1, 2, 1, 3, 2, 5}), "catch-the-bug: == 1 instead of != 0");

        // ---------- Side quest 3: Sum of Two Integers ----------
        eq(3, new B_getSum().getSum(1, 2), "getSum LC 1"); eq(5, new B_getSum().getSum(2, 3), "getSum LC 2");
        eq(12, new B_getSum().getSum(5, 7), "getSum figure");
        for (int t = 0; t < 30000; t++) { int a = anyInt(), b = anyInt(); eq(a + b, new B_getSum().getSum(a, b), "getSum " + a + " " + b); }
        for (int a : EDGES) for (int b : EDGES) eq(a + b, new B_getSum().getSum(a, b), "getSum edges " + a + " " + b);
        { // the termination bound: never more than 32 rounds after the first (32 + 1 total iterations of the check)
          int worst = 0;
          for (int t = 0; t < 30000; t++) { int a = anyInt(), b = anyInt(), r = 0; while (b != 0) { int c = (a & b) << 1; a ^= b; b = c; r++; } worst = Math.max(worst, r); }
          int a = -1, b = 1, r = 0; while (b != 0) { int c = (a & b) << 1; a ^= b; b = c; r++; } worst = Math.max(worst, r);
          eq(32, r, "-1 + 1 takes 32 rounds"); ok(worst <= 32, "never more than 32 rounds (worst " + worst + ")"); }

        // ---------- Side quest 4: Power of Two / Four ----------
        Set<Integer> pow2 = new HashSet<>(), pow4 = new HashSet<>();
        for (long p = 1; p <= MAX; p *= 2) pow2.add((int) p);
        for (long p = 1; p <= MAX; p *= 4) pow4.add((int) p);
        var pw = new B_powers();
        for (int x : sampleInts(30000)) { eq(pow2.contains(x), pw.isPowerOfTwo(x), "isPowerOfTwo " + x); eq(pow4.contains(x), pw.isPowerOfFour(x), "isPowerOfFour " + x); }
        for (int p : pow2) for (int d = -2; d <= 2; d++) { int x = p + d; eq(pow2.contains(x), pw.isPowerOfTwo(x), "near power " + x); eq(pow4.contains(x), pw.isPowerOfFour(x), "near power4 " + x); }
        for (int p : pow2) eq(pow4.contains(p), p % 3 == 1, "power of two is a power of four iff it is 1 mod 3: " + p);
        ok(powerOfTwoNoGuard(0) && powerOfTwoNoGuard(MIN), "catch-the-bug: without n > 0, 0 and MIN pass");

        // ---------- Side quest 5: Hamming Distance ----------
        var hd = new B_hammingDistance();
        eq(2, hd.hammingDistance(1, 4), "hamming LC 1"); eq(1, hd.hammingDistance(3, 1), "hamming LC 2");
        eq(32, hd.hammingDistance(0, -1), "hamming 0 -1");
        for (int t = 0; t < 20000; t++) {
            int x = anyInt(), y = anyInt();
            String p = bits32(x), q = bits32(y); int d = 0; for (int i = 0; i < 32; i++) if (p.charAt(i) != q.charAt(i)) d++;
            eq(d, hd.hammingDistance(x, y), "hammingDistance " + x + " " + y);
        }
        eq(6, hd.totalHammingDistance(new int[]{4, 14, 2}), "total LC 1"); eq(4, hd.totalHammingDistance(new int[]{4, 14, 4}), "total LC 2");
        for (int t = 0; t < 2000; t++) {
            int[] a = new int[R.nextInt(9)];
            for (int i = 0; i < a.length; i++) a[i] = R.nextInt(2) == 0 ? R.nextInt(1 << 10) : anyInt();
            int expect = 0;
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) expect += Integer.bitCount(a[i] ^ a[j]);
            eq(expect, hd.totalHammingDistance(a), "totalHammingDistance " + Arrays.toString(a));
        }

        // ---------- Side quest 6: Reverse Integer ----------
        var rv = new B_reverse();
        int[][] known = {{123, 321}, {-123, -321}, {120, 21}, {0, 0}, {1534236469, 0}, {1463847412, 2147483641}, {-1463847412, -2147483641},
            {1563847412, 0}, {-1563847412, 0}, {MAX, 0}, {MIN, 0}, {1000000003, 0}, {-2147483412, -2143847412}, {901000, 109}, {-10, -1}};
        for (int[] k : known) { eq(k[1], rv.reverse(k[0]), "reverse " + k[0]); eq(k[1], bruteReverseInt(k[0]), "oracle " + k[0]); }
        for (int x : sampleInts(60000)) eq(bruteReverseInt(x), rv.reverse(x), "reverse " + x);
        for (int t = 0; t < 60000; t++) {      // 10-digit inputs, where overflow lives
            int x = (int) (1_000_000_000L + (long) (R.nextDouble() * (MAX - 1_000_000_000L)));
            if (R.nextBoolean()) x = -x;
            eq(bruteReverseInt(x), rv.reverse(x), "reverse 10-digit " + x);
        }
        eq(1056389759, reverseCheckAfter(1534236469), "catch-the-bug: checking after the multiply returns 1056389759");

        System.out.println("OK bit-manipulation: " + cases + " checks passed");
    }
}
