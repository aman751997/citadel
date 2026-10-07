import java.util.*;

// Runs every Java solution shown in prefix-sum.mdx against brute-force oracles (plain nested loops over
// every subarray / every cell) on hand-picked edge cases plus thousands of random small inputs.
// It also proves that each "catch the bug" version named in the lesson fails on the input the lesson names.
public class Check {
    static final Random R = new Random(31);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static long rangeSum(int[] a, int l, int r) { long s = 0; for (int i = l; i <= r; i++) s += a[i]; return s; }

    // ---- independent oracles ----
    static int bruteCount(int[] a, java.util.function.LongPredicate ok) {
        int c = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (ok.test(rangeSum(a, i, j))) c++;
        return c;
    }
    static int brutePivot(int[] a) {
        for (int i = 0; i < a.length; i++) if (rangeSum(a, 0, i - 1) == rangeSum(a, i + 1, a.length - 1)) return i;
        return -1;
    }
    static int[] bruteProduct(int[] a) {
        int[] out = new int[a.length];
        for (int i = 0; i < a.length; i++) { int p = 1; for (int j = 0; j < a.length; j++) if (j != i) p *= a[j]; out[i] = p; }
        return out;
    }
    static boolean bruteMultiple(int[] a, int k) {
        for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (rangeSum(a, i, j) % k == 0) return true;
        return false;
    }
    static int bruteLongestBalanced(int[] a) {
        int best = 0;
        for (int i = 0; i < a.length; i++) {
            int ones = 0, zeros = 0;
            for (int j = i; j < a.length; j++) { if (a[j] == 1) ones++; else zeros++; if (ones == zeros) best = Math.max(best, j - i + 1); }
        }
        return best;
    }
    static int bruteOdd(int[] a, int k) {
        int c = 0;
        for (int i = 0; i < a.length; i++) { int odd = 0; for (int j = i; j < a.length; j++) { if (a[j] % 2 != 0) odd++; if (odd == k) c++; } }
        return c;
    }
    static int bruteXor(int[] a, int l, int r) { int x = 0; for (int i = l; i <= r; i++) x ^= a[i]; return x; }

    // ---- the buggy versions the lesson names ----
    static int subarraySumNoSeed(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>(); int p = 0, c = 0;
        for (int x : nums) { p += x; c += seen.getOrDefault(p - k, 0); seen.merge(p, 1, Integer::sum); }
        return c;
    }
    static int subarraySumRecordFirst(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>(); seen.put(0, 1); int p = 0, c = 0;
        for (int x : nums) { p += x; seen.merge(p, 1, Integer::sum); c += seen.getOrDefault(p - k, 0); }
        return c;
    }
    static boolean checkSubarraySumLatestIndex(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>(); seen.put(0, -1); long rem = 0;
        for (int i = 0; i < nums.length; i++) {
            rem = (rem + nums[i]) % k; Integer f = seen.get((int) rem);
            if (f != null && i - f >= 2) return true;
            seen.put((int) rem, i);
        }
        return false;
    }
    static int divByKNaiveMap(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>(); seen.put(0, 1); int rem = 0, c = 0;
        for (int x : nums) { rem = (rem + x) % k; c += seen.getOrDefault(rem, 0); seen.merge(rem, 1, Integer::sum); }
        return c;
    }
    static int pivotUpdateFirst(int[] nums) {
        int total = 0; for (int x : nums) total += x; int left = 0;
        for (int i = 0; i < nums.length; i++) { left += nums[i]; if (left == total - left - nums[i]) return i; }
        return -1;
    }
    static int pivotForgetSelf(int[] nums) {
        int total = 0; for (int x : nums) total += x; int left = 0;
        for (int i = 0; i < nums.length; i++) { if (left == total - left) return i; left += nums[i]; }
        return -1;
    }
    static int[] productSuffixFirst(int[] nums) {
        int n = nums.length; int[] ans = new int[n]; ans[0] = 1;
        for (int i = 1; i < n; i++) ans[i] = ans[i - 1] * nums[i - 1];
        int s = 1; for (int i = n - 1; i >= 0; i--) { s *= nums[i]; ans[i] *= s; }
        return ans;
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: Range Sum Query — Immutable ----------
        {
            var na = new B_NumArray().new NumArray(new int[]{-2, 0, 3, -5, 2, -1});
            eq(1, na.sumRange(0, 2), "figure sumRange(0,2)");
            eq(-1, na.sumRange(2, 5), "figure sumRange(2,5)");
            eq(-3, na.sumRange(0, 5), "figure sumRange(0,5)");
            var p = new B_NumArray().new NumArray(new int[]{3, 1, 4, 1, 5});
            eq(6, p.sumRange(1, 3), "prologue sum(1..3)");
            eq(8, p.sumRange(0, 2), "trace sum(0..2)");
            // the bug named in the lesson: prefix[right] - prefix[left] on sumRange(0, 2)
            int[] pre = {0, -2, -2, 1, -4, -2, -3};
            eq(-2, pre[2] - pre[0], "catch-the-bug value");
            for (int t = 0; t < 2000; t++) {
                int[] a = randArr(1, 9, -9, 9);
                var obj = new B_NumArray().new NumArray(a.clone());
                for (int l = 0; l < a.length; l++) for (int r = l; r < a.length; r++)
                    eq((int) rangeSum(a, l, r), obj.sumRange(l, r), "sumRange " + Arrays.toString(a) + " " + l + ".." + r);
            }
        }

        // ---------- Chapter 2: Find Pivot Index ----------
        eq(3, new B_pivotIndex().pivotIndex(new int[]{1, 7, 3, 6, 5, 6}), "pivot classic");
        eq(-1, new B_pivotIndex().pivotIndex(new int[]{1, 2, 3}), "pivot none");
        eq(0, new B_pivotIndex().pivotIndex(new int[]{2, 1, -1}), "pivot at 0");
        eq(0, new B_pivotIndex().pivotIndex(new int[]{5}), "pivot single");
        eq(0, new B_pivotIndex().pivotIndex(new int[]{0, 0, 0}), "pivot all zeros -> leftmost");
        eq(-1, pivotUpdateFirst(new int[]{1, 7, 3, 6, 5, 6}), "reveal: updating leftSum first misses index 3");
        eq(-1, pivotForgetSelf(new int[]{2, 1, -1}), "catch-the-bug: forgetting nums[i] misses index 0");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 8, -3, 3);
            eq(brutePivot(a), new B_pivotIndex().pivotIndex(a), "pivot " + Arrays.toString(a));
        }

        // ---------- Chapter 3: Product of Array Except Self ----------
        eq(new int[]{24, 12, 8, 6}, new B_productExceptSelf().productExceptSelf(new int[]{1, 2, 3, 4}), "product classic");
        eq(new int[]{0, 0, 9, 0, 0}, new B_productExceptSelf().productExceptSelf(new int[]{-1, 1, 0, -3, 3}), "product with zero");
        eq(new int[]{0, 0, 0}, new B_productExceptSelf().productExceptSelf(new int[]{0, 0, 5}), "product two zeros");
        eq(new int[]{24, 24, 24, 24}, productSuffixFirst(new int[]{1, 2, 3, 4}), "catch-the-bug: suffix first gives all 24");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(2, 8, -3, 3);
            eq(bruteProduct(a), new B_productExceptSelf().productExceptSelf(a), "product " + Arrays.toString(a));
        }

        // ---------- Chapter 4: Subarray Sum Equals K ----------
        eq(3, new B_subarraySum().subarraySum(new int[]{3, 4, 7, -2, 2}, 7), "count figure");
        eq(2, new B_subarraySum().subarraySum(new int[]{1, 2, 3}, 3), "count [1,2,3] k=3");
        eq(2, new B_subarraySum().subarraySum(new int[]{1, 1, 1}, 2), "count LC example");
        eq(4, new B_subarraySum().subarraySum(new int[]{1, -1, 1, -1}, 0), "count reveal tally");
        eq(0, new B_subarraySum().subarraySum(new int[]{1}, 0), "count [1] k=0");
        eq(1, subarraySumNoSeed(new int[]{1, 2, 3}, 3), "catch-the-bug: no seed returns 1");
        eq(1, subarraySumRecordFirst(new int[]{1}, 0), "catch-the-bug: record-first returns 1");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(0, 9, -4, 4);
            int k = R.nextInt(11) - 5;
            eq(bruteCount(a, s -> s == k), new B_subarraySum().subarraySum(a, k), "subarraySum " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Chapter 5: Continuous Subarray Sum ----------
        eq(true, new B_checkSubarraySum().checkSubarraySum(new int[]{23, 2, 4, 6, 7}, 6), "multiple figure");
        eq(true, new B_checkSubarraySum().checkSubarraySum(new int[]{23, 2, 6, 4, 7}, 6), "multiple LC 2");
        eq(false, new B_checkSubarraySum().checkSubarraySum(new int[]{23, 2, 6, 4, 7}, 13), "multiple LC 3");
        eq(true, new B_checkSubarraySum().checkSubarraySum(new int[]{5, 0, 0}, 3), "multiple [5,0,0]");
        eq(false, checkSubarraySumLatestIndex(new int[]{5, 0, 0}, 3), "catch-the-bug: latest index misses [0,0]");
        eq(true, new B_checkSubarraySum().checkSubarraySum(new int[]{0, 0}, 7), "multiple [0,0]");
        eq(false, new B_checkSubarraySum().checkSubarraySum(new int[]{0}, 1), "multiple [0] too short");
        eq(true, new B_checkSubarraySum().checkSubarraySum(new int[]{1000000000, 1000000000}, 2000000000), "multiple big k");
        for (int k : new int[]{Integer.MAX_VALUE, Integer.MAX_VALUE - 1, 1999999999, 1000000007}) {
            int[] big = {1000000000, 1000000000, 1000000000, 7, 1000000000};
            eq(bruteMultiple(big, k), new B_checkSubarraySum().checkSubarraySum(big, k), "multiple big values k=" + k);
        }
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 8, 0, 9);
            int k = 1 + R.nextInt(9);
            eq(bruteMultiple(a, k), new B_checkSubarraySum().checkSubarraySum(a, k), "checkSubarraySum " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 1: Contiguous Array ----------
        eq(6, new B_findMaxLength().findMaxLength(new int[]{0, 1, 1, 1, 1, 1, 0, 0, 0}), "contiguous figure");
        eq(2, new B_findMaxLength().findMaxLength(new int[]{0, 1}), "contiguous [0,1]");
        eq(2, new B_findMaxLength().findMaxLength(new int[]{0, 1, 0}), "contiguous [0,1,0]");
        eq(0, new B_findMaxLength().findMaxLength(new int[]{1, 1, 1}), "contiguous none");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 10, 0, 1);
            eq(bruteLongestBalanced(a), new B_findMaxLength().findMaxLength(a), "findMaxLength " + Arrays.toString(a));
        }

        // ---------- Side quest 2: Subarray Sums Divisible by K ----------
        eq(7, new B_subarraysDivByK().subarraysDivByK(new int[]{4, 5, 0, -2, -3, 1}, 5), "divisible LC example");
        eq(1, new B_subarraysDivByK().subarraysDivByK(new int[]{-1, 5}, 5), "divisible reveal");
        eq(0, divByKNaiveMap(new int[]{-1, 5}, 5), "catch-the-bug: naive % with a map returns 0");
        boolean threw = false;
        try {
            int[] seen = new int[5]; seen[0] = 1; int rem = 0;
            for (int x : new int[]{-1, 5}) { rem = (rem + x) % 5; seen[rem]++; }
        } catch (ArrayIndexOutOfBoundsException e) { threw = true; }
        eq(true, threw, "catch-the-bug: naive % with int[k] throws");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 9, -9, 9);
            int k = 2 + R.nextInt(6);
            eq(bruteCount(a, s -> s % k == 0), new B_subarraysDivByK().subarraysDivByK(a, k), "subarraysDivByK " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 3: Count Number of Nice Subarrays ----------
        eq(2, new B_numberOfSubarrays().numberOfSubarrays(new int[]{1, 1, 2, 1, 1}, 3), "nice LC 1");
        eq(0, new B_numberOfSubarrays().numberOfSubarrays(new int[]{2, 4, 6}, 1), "nice LC 2");
        eq(16, new B_numberOfSubarrays().numberOfSubarrays(new int[]{2, 2, 2, 1, 2, 2, 1, 2, 2, 2}, 2), "nice figure");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 9, -5, 9);
            int k = R.nextInt(a.length + 1);       // includes k = 0, as in the Binary Subarrays transfer test
            eq(bruteOdd(a, k), new B_numberOfSubarrays().numberOfSubarrays(a, k), "numberOfSubarrays " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 4: prefix XOR ----------
        eq(new int[]{2, 7, 14, 8}, new B_xorQueries().xorQueries(new int[]{1, 3, 4, 8}, new int[][]{{0, 1}, {1, 2}, {0, 3}, {3, 3}}), "xor LC example");
        eq(new int[]{8, 0, 4, 4}, new B_xorQueries().xorQueries(new int[]{4, 8, 2, 10}, new int[][]{{2, 3}, {1, 3}, {0, 0}, {0, 3}}), "xor LC example 2");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 8, 0, 15);
            int[][] qs = new int[5][];
            int[] expect = new int[5];
            for (int q = 0; q < 5; q++) { int l = R.nextInt(a.length), r = l + R.nextInt(a.length - l); qs[q] = new int[]{l, r}; expect[q] = bruteXor(a, l, r); }
            eq(expect, new B_xorQueries().xorQueries(a, qs), "xorQueries " + Arrays.toString(a));
            int k = R.nextInt(16);
            long c = 0;
            for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (bruteXor(a, i, j) == k) c++;
            eq(c, new B_xorQueries().countXorK(a, k), "countXorK " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 5: Range Sum Query 2D ----------
        {
            int[][] lc = {{3, 0, 1, 4, 2}, {5, 6, 3, 2, 1}, {1, 2, 0, 1, 5}, {4, 1, 0, 1, 7}, {1, 0, 3, 0, 5}};
            var nm = new B_NumMatrix().new NumMatrix(lc);
            eq(8, nm.sumRegion(2, 1, 4, 3), "2D LC 1");
            eq(11, nm.sumRegion(1, 1, 2, 2), "2D LC 2");
            eq(12, nm.sumRegion(1, 2, 2, 4), "2D LC 3");
            var fig = new B_NumMatrix().new NumMatrix(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}});
            eq(28, fig.sumRegion(1, 1, 2, 2), "2D figure");
            for (int t = 0; t < 1500; t++) {
                int rows = 1 + R.nextInt(5), cols = 1 + R.nextInt(5);
                int[][] m = new int[rows][cols];
                for (int[] row : m) for (int c = 0; c < cols; c++) row[c] = R.nextInt(19) - 9;
                var obj = new B_NumMatrix().new NumMatrix(m);
                for (int q = 0; q < 6; q++) {
                    int r1 = R.nextInt(rows), r2 = r1 + R.nextInt(rows - r1), c1 = R.nextInt(cols), c2 = c1 + R.nextInt(cols - c1);
                    int s = 0;
                    for (int r = r1; r <= r2; r++) for (int c = c1; c <= c2; c++) s += m[r][c];
                    eq(s, obj.sumRegion(r1, c1, r2, c2), "sumRegion");
                }
            }
        }

        // ---------- Side quest 6: Corporate Flight Bookings ----------
        eq(new int[]{10, 55, 45, 25, 25}, new B_corpFlightBookings().corpFlightBookings(new int[][]{{1, 2, 10}, {2, 3, 20}, {2, 5, 25}}, 5), "flights LC 1");
        eq(new int[]{10, 25}, new B_corpFlightBookings().corpFlightBookings(new int[][]{{1, 2, 10}, {2, 2, 15}}, 2), "flights LC 2");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(7), m = R.nextInt(6);
            int[][] bookings = new int[m][];
            int[] expect = new int[n];
            for (int b = 0; b < m; b++) {
                int first = 1 + R.nextInt(n), last = first + R.nextInt(n - first + 1), seats = 1 + R.nextInt(9);
                bookings[b] = new int[]{first, last, seats};
                for (int f = first; f <= last; f++) expect[f - 1] += seats;
            }
            eq(expect, new B_corpFlightBookings().corpFlightBookings(bookings, n), "corpFlightBookings");
        }

        System.out.println("OK prefix-sum: " + cases + " checks passed");
    }
}
