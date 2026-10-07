import java.util.*;

// Runs every Java solution shown in binary-search.mdx against independent oracles (linear scans,
// merge-and-pick, exhaustive partitions / placements) on hand-picked edge cases plus thousands of
// random small inputs. It also replays the lesson's "catch the bug" versions on the inputs the
// lesson names and asserts that they really fail. Any mismatch throws.
public class Check {
    static final Random R = new Random(6);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean condition, String what) {
        cases++;
        if (!condition) throw new AssertionError(what);
    }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        if (o instanceof int[][] g) return Arrays.deepToString(g);
        return String.valueOf(o);
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static int[] sorted(int[] a) { int[] b = a.clone(); Arrays.sort(b); return b; }
    static int[] distinctSorted(int minLen, int maxLen, int lo, int hi) {
        TreeSet<Integer> set = new TreeSet<>();
        int want = minLen + R.nextInt(maxLen - minLen + 1);
        while (set.size() < want) set.add(lo + R.nextInt(hi - lo + 1));
        return set.stream().mapToInt(Integer::intValue).toArray();
    }
    static int[] rotate(int[] a, int r) {
        int n = a.length; int[] b = new int[n];
        for (int i = 0; i < n; i++) b[i] = a[(i + r) % n];
        return b;
    }
    static int indexOf(int[] a, int t) { for (int i = 0; i < a.length; i++) if (a[i] == t) return i; return -1; }
    static int lastIndexOf(int[] a, int t) { for (int i = a.length - 1; i >= 0; i--) if (a[i] == t) return i; return -1; }

    // Oracle for Ship / Split: smallest possible largest group-sum when cutting `a` into at most
    // `groups` contiguous non-empty groups, by exhaustive DP over every cut position (no greedy).
    static long bestMaxGroup(int[] a, int groups) {
        int n = a.length;
        long[][] dp = new long[groups + 1][n + 1];
        for (long[] row : dp) Arrays.fill(row, Long.MAX_VALUE);
        dp[0][0] = 0;
        for (int g = 1; g <= groups; g++)
            for (int i = 1; i <= n; i++)
                for (int j = 0; j < i; j++) {
                    if (dp[g - 1][j] == Long.MAX_VALUE) continue;
                    long s = 0; for (int x = j; x < i; x++) s += a[x];
                    dp[g][i] = Math.min(dp[g][i], Math.max(dp[g - 1][j], s));
                }
        long best = Long.MAX_VALUE;
        for (int g = 1; g <= groups; g++) best = Math.min(best, dp[g][n]);
        return best;
    }
    static long exactGroups(int[] a, int groups) { // exactly `groups` non-empty pieces
        int n = a.length;
        long[][] dp = new long[groups + 1][n + 1];
        for (long[] row : dp) Arrays.fill(row, Long.MAX_VALUE);
        dp[0][0] = 0;
        for (int g = 1; g <= groups; g++)
            for (int i = 1; i <= n; i++)
                for (int j = 0; j < i; j++) {
                    if (dp[g - 1][j] == Long.MAX_VALUE) continue;
                    long s = 0; for (int x = j; x < i; x++) s += a[x];
                    dp[g][i] = Math.min(dp[g][i], Math.max(dp[g - 1][j], s));
                }
        return dp[groups][n];
    }
    static double mergeMedian(int[] a, int[] b) {
        int[] all = new int[a.length + b.length];
        System.arraycopy(a, 0, all, 0, a.length);
        System.arraycopy(b, 0, all, a.length, b.length);
        Arrays.sort(all);
        int t = all.length;
        return t % 2 == 1 ? all[t / 2] : ((double) all[t / 2 - 1] + all[t / 2]) / 2;
    }
    static int bestPlacement(int[] pos, int m) { // exhaustive: every subset of size m
        int n = pos.length, best = -1;
        int[] p = sorted(pos);
        for (int mask = 0; mask < (1 << n); mask++) {
            if (Integer.bitCount(mask) != m) continue;
            int last = Integer.MIN_VALUE, gap = Integer.MAX_VALUE;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) {
                if (last != Integer.MIN_VALUE) gap = Math.min(gap, p[i] - last);
                last = p[i];
            }
            best = Math.max(best, gap);
        }
        return best;
    }

    public static void main(String[] args) {
        // ---- Chapter 1 · Binary Search (first index with nums[i] >= target, then check)
        eq(4, new B_search().search(new int[]{-1, 0, 3, 5, 9, 12}, 9), "search classic");
        eq(-1, new B_search().search(new int[]{-1, 0, 3, 5, 9, 12}, 2), "search absent");
        eq(-1, new B_search().search(new int[]{}, 3), "search empty");
        eq(0, new B_search().search(new int[]{5}, 5), "search single");
        eq(-1, new B_search().search(new int[]{5}, 6), "search past the end");
        eq(1, new B_search().search(new int[]{Integer.MIN_VALUE, Integer.MAX_VALUE}, Integer.MAX_VALUE), "search int extremes");
        for (int t = 0; t < 4000; t++) {
            int[] a = sorted(randArr(0, 9, -6, 6));
            int target = R.nextInt(15) - 7;
            eq(indexOf(a, target), new B_search().search(a, target), "search " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Chapter 2 · First and Last Position (two boundary runs)
        eq(new int[]{3, 4}, new B_searchRange().searchRange(new int[]{5, 7, 7, 8, 8, 10}, 8), "range classic");
        eq(new int[]{-1, -1}, new B_searchRange().searchRange(new int[]{5, 7, 7, 8, 8, 10}, 6), "range absent");
        eq(new int[]{-1, -1}, new B_searchRange().searchRange(new int[]{}, 0), "range empty");
        eq(new int[]{0, 3}, new B_searchRange().searchRange(new int[]{2, 2, 2, 2}, 2), "range all equal");
        eq(new int[]{1, 1}, new B_searchRange().searchRange(new int[]{0, Integer.MAX_VALUE}, Integer.MAX_VALUE), "range at MAX_VALUE (no target + 1 overflow)");
        for (int t = 0; t < 4000; t++) {
            int[] a = sorted(randArr(0, 10, -3, 3));
            int target = R.nextInt(9) - 4;
            eq(new int[]{indexOf(a, target), lastIndexOf(a, target)}, new B_searchRange().searchRange(a, target), "range " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Chapter 3 · Search a 2D Matrix (a sorted 1D array in a coat)
        int[][] grid = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
        eq(true, new B_searchMatrix().searchMatrix(grid, 3), "matrix classic hit");
        eq(false, new B_searchMatrix().searchMatrix(grid, 13), "matrix classic miss");
        eq(true, new B_searchMatrix().searchMatrix(grid, 60), "matrix last cell");
        eq(false, new B_searchMatrix().searchMatrix(grid, 61), "matrix past the end");
        eq(false, new B_searchMatrix().searchMatrix(new int[][]{{1}}, 2), "matrix 1x1 miss");
        for (int t = 0; t < 3000; t++) {
            int rows = 1 + R.nextInt(4), cols = 1 + R.nextInt(4);
            int[] flat = distinctSorted(rows * cols, rows * cols, -20, 20);
            int[][] m = new int[rows][cols];
            for (int i = 0; i < flat.length; i++) m[i / cols][i % cols] = flat[i];
            int target = R.nextInt(45) - 22;
            eq(indexOf(flat, target) >= 0, new B_searchMatrix().searchMatrix(m, target), "matrix " + Arrays.deepToString(m) + " t=" + target);
        }

        // ---- Chapter 4 · Find Minimum in Rotated Sorted Array
        eq(0, new B_findMin().findMin(new int[]{4, 5, 6, 7, 0, 1, 2}), "findMin classic");
        eq(1, new B_findMin().findMin(new int[]{1, 2, 3}), "findMin unrotated");
        eq(1, new B_findMin().findMin(new int[]{2, 1}), "findMin two");
        eq(9, new B_findMin().findMin(new int[]{9}), "findMin single");
        for (int t = 0; t < 4000; t++) {
            int[] base = distinctSorted(1, 9, -20, 20);
            int[] a = rotate(base, R.nextInt(base.length));
            eq(base[0], new B_findMin().findMin(a), "findMin " + Arrays.toString(a));
        }

        // ---- Chapter 5 · Search in Rotated Sorted Array (one pass + the two-phase route)
        eq(4, new B_searchRotated().search(new int[]{4, 5, 6, 7, 0, 1, 2}, 0), "rotated classic");
        eq(-1, new B_searchRotated().search(new int[]{4, 5, 6, 7, 0, 1, 2}, 3), "rotated absent");
        eq(-1, new B_searchRotated().search(new int[]{1}, 0), "rotated single miss");
        eq(1, new B_searchRotated().search(new int[]{3, 1}, 1), "rotated two");
        for (int t = 0; t < 5000; t++) {
            int[] base = distinctSorted(1, 9, -20, 20);
            int[] a = rotate(base, R.nextInt(base.length));
            int target = R.nextInt(45) - 22;
            eq(indexOf(a, target), new B_searchRotated().search(a, target), "rotated " + Arrays.toString(a) + " t=" + target);
            eq(indexOf(a, target), new B_searchTwoPhase().searchTwoPhase(a, target), "twoPhase " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Chapter 6 · Koko Eating Bananas
        eq(4, new B_minEatingSpeed().minEatingSpeed(new int[]{3, 6, 7, 11}, 8), "koko classic");
        eq(30, new B_minEatingSpeed().minEatingSpeed(new int[]{30, 11, 23, 4, 20}, 5), "koko h = n");
        eq(23, new B_minEatingSpeed().minEatingSpeed(new int[]{30, 11, 23, 4, 20}, 6), "koko h = n + 1");
        eq(5, new B_minEatingSpeed().minEatingSpeed(new int[]{2, 9, 4, 7}, 6), "koko lab case");
        eq(1, new B_minEatingSpeed().minEatingSpeed(new int[]{9}, 9), "koko one pile, slow is fine");
        eq(500000000, new B_minEatingSpeed().minEatingSpeed(new int[]{1000000000}, 2), "koko huge pile");
        eq(5, new B_minEatingSpeed().minEatingSpeed(new int[]{1000000000, 1000000000, 1000000000, 1000000000, 1000000000}, 1000000000), "koko hours beyond int");
        for (int t = 0; t < 3000; t++) {
            int[] piles = randArr(1, 6, 1, 15);
            int total = Arrays.stream(piles).sum();
            int h = piles.length + R.nextInt(total - piles.length + 3);
            int k = 1;
            while (true) { long hours = 0; for (int p : piles) hours += (p + k - 1) / k; if (hours <= h) break; k++; }
            eq(k, new B_minEatingSpeed().minEatingSpeed(piles, h), "koko " + Arrays.toString(piles) + " h=" + h);
        }

        // ---- Chapter 7 · Capacity To Ship Packages Within D Days
        eq(15, new B_shipWithinDays().shipWithinDays(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 5), "ship classic");
        eq(6, new B_shipWithinDays().shipWithinDays(new int[]{3, 2, 2, 4, 1, 4}, 3), "ship example 2");
        eq(3, new B_shipWithinDays().shipWithinDays(new int[]{1, 2, 3, 1, 1}, 4), "ship bug input");
        eq(10, new B_shipWithinDays().shipWithinDays(new int[]{10}, 3), "ship single parcel");
        for (int t = 0; t < 2500; t++) {
            int[] w = randArr(1, 7, 1, 9);
            int days = 1 + R.nextInt(w.length + 1);
            eq((int) bestMaxGroup(w, days), new B_shipWithinDays().shipWithinDays(w, days), "ship " + Arrays.toString(w) + " d=" + days);
        }

        // ---- Chapter 8 · Split Array Largest Sum (exactly k non-empty pieces)
        eq(18, new B_splitArray().splitArray(new int[]{7, 2, 5, 10, 8}, 2), "split classic");
        eq(9, new B_splitArray().splitArray(new int[]{1, 2, 3, 4, 5}, 2), "split example 2");
        eq(0, new B_splitArray().splitArray(new int[]{0, 0, 0}, 3), "split zeros");
        eq(10, new B_splitArray().splitArray(new int[]{1, 10, 1}, 3), "split k = n");
        for (int t = 0; t < 2500; t++) {
            int[] a = randArr(1, 7, 0, 9);
            int k = 1 + R.nextInt(a.length);
            eq((int) exactGroups(a, k), new B_splitArray().splitArray(a, k), "split " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Chapter 9 · Time Based Key-Value Store
        {
            B_timeMap outer = new B_timeMap();
            B_timeMap.TimeMap tm = outer.new TimeMap();
            tm.set("foo", "bar", 1);
            eq("bar", tm.get("foo", 1), "timemap exact");
            eq("bar", tm.get("foo", 3), "timemap after");
            tm.set("foo", "bar2", 4);
            eq("bar2", tm.get("foo", 4), "timemap newer");
            eq("bar2", tm.get("foo", 5), "timemap newest");
            eq("", tm.get("foo", 0), "timemap before first");
            eq("", tm.get("nope", 9), "timemap unknown key");
            B_timeMap.TimeMap lamp = outer.new TimeMap();
            lamp.set("lamp", "dim", 1); lamp.set("lamp", "bright", 4); lamp.set("lamp", "off", 7); lamp.set("lamp", "bright", 10);
            eq("off", lamp.get("lamp", 8), "timemap figure t=8");
            eq("", lamp.get("lamp", 0), "timemap figure t=0");
            eq("bright", lamp.get("lamp", 10), "timemap figure t=10");
        }
        for (int t = 0; t < 1500; t++) {
            B_timeMap.TimeMap tm = new B_timeMap().new TimeMap();
            String[] keys = {"a", "b", "c"};
            Map<String, List<int[]>> log = new HashMap<>(); // key -> (time, valueId)
            int time = 0;
            for (int op = 0; op < 12; op++) {
                String key = keys[R.nextInt(3)];
                if (R.nextBoolean()) {
                    time += 1 + R.nextInt(3);
                    int valueId = R.nextInt(100);
                    tm.set(key, "v" + valueId, time);
                    log.computeIfAbsent(key, x -> new ArrayList<>()).add(new int[]{time, valueId});
                } else {
                    int q = R.nextInt(time + 3);
                    String expect = "";
                    int bestTime = -1;
                    for (int[] e : log.getOrDefault(key, List.of())) if (e[0] <= q && e[0] > bestTime) { bestTime = e[0]; expect = "v" + e[1]; }
                    eq(expect, tm.get(key, q), "timemap random get " + key + "@" + q);
                }
            }
        }

        // ---- Chapter 10 · Median of Two Sorted Arrays (partition search) vs merge-and-pick
        eq(2.0, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{1, 3}, new int[]{2}), "median odd");
        eq(2.5, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{1, 2}, new int[]{3, 4}), "median even");
        eq(11.0, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{1, 3, 8, 9, 15}, new int[]{7, 11, 18, 19, 21, 25}), "median figure");
        eq(3.0, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{}, new int[]{3}), "median one empty");
        eq(2.5, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{1, 2, 3, 4}, new int[]{}), "median other empty");
        eq(1.0, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{1, 1}, new int[]{1, 1}), "median all equal");
        eq(-0.5, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{Integer.MIN_VALUE}, new int[]{Integer.MAX_VALUE}), "median extremes average: (-2^31 + 2^31 - 1) / 2");
        eq((double) Integer.MAX_VALUE, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{Integer.MAX_VALUE}, new int[]{Integer.MAX_VALUE}), "median no overflow");
        eq((double) Integer.MIN_VALUE, new B_findMedianSortedArrays().findMedianSortedArrays(new int[]{Integer.MIN_VALUE, Integer.MIN_VALUE}, new int[]{Integer.MIN_VALUE}), "median sentinels never leak");
        for (int t = 0; t < 8000; t++) {
            int[] a = sorted(randArr(0, 7, -6, 6)), b = sorted(randArr(0, 7, -6, 6));
            if (a.length + b.length == 0) continue;
            eq(mergeMedian(a, b), new B_findMedianSortedArrays().findMedianSortedArrays(a, b), "median " + Arrays.toString(a) + " " + Arrays.toString(b));
        }

        // ---- Side quest · Search Insert Position
        for (int t = 0; t < 3000; t++) {
            int[] a = distinctSorted(0, 8, -9, 9);
            int target = R.nextInt(23) - 11;
            int expect = 0; while (expect < a.length && a[expect] < target) expect++;
            eq(expect, new B_searchInsert().searchInsert(a, target), "insert " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Side quest · Find Peak Element (any peak is valid; check validity)
        for (int[] a : new int[][]{{1, 2, 3, 1}, {1, 2, 1, 3, 5, 6, 4}, {1}, {2, 1}, {1, 2}, {3, 2, 1}, {1, 2, 3}}) checkPeak(a);
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 9, 0, 6);
            boolean neighboursDiffer = true;
            for (int i = 0; i + 1 < a.length; i++) if (a[i] == a[i + 1]) neighboursDiffer = false;
            if (neighboursDiffer) checkPeak(a);
        }

        // ---- Side quest · sqrt(x)
        for (int x : new int[]{0, 1, 2, 3, 4, 8, 9, 15, 16, 17, 2147395599, 2147395600, Integer.MAX_VALUE})
            eq((int) Math.floor(Math.sqrt(x)), new B_mySqrt().mySqrt(x), "sqrt " + x);
        for (int t = 0; t < 4000; t++) {
            int x = t < 2000 ? R.nextInt(500) : R.nextInt(Integer.MAX_VALUE);
            long r = 0; while ((r + 1) * (r + 1) <= x) r++;
            if (t >= 2000) { r = (long) Math.sqrt(x); while (r * r > x) r--; while ((r + 1) * (r + 1) <= x) r++; }
            eq((int) r, new B_mySqrt().mySqrt(x), "sqrt " + x);
        }

        // ---- Side quest · Search in Rotated Sorted Array II (duplicates)
        eq(true, new B_searchRotatedII().search(new int[]{2, 5, 6, 0, 0, 1, 2}, 0), "rotII classic");
        eq(false, new B_searchRotatedII().search(new int[]{2, 5, 6, 0, 0, 1, 2}, 3), "rotII absent");
        eq(true, new B_searchRotatedII().search(new int[]{1, 0, 1, 1, 1}, 0), "rotII hidden dip");
        eq(true, new B_searchRotatedII().search(new int[]{1, 1, 1, 1, 1, 2, 1, 1}, 2), "rotII figure");
        for (int t = 0; t < 6000; t++) {
            int[] base = sorted(randArr(1, 9, 0, 4));
            int[] a = rotate(base, R.nextInt(base.length));
            int target = R.nextInt(7) - 1;
            eq(indexOf(a, target) >= 0, new B_searchRotatedII().search(a, target), "rotII " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Side quest · Magnetic force (maximize the minimum gap)
        eq(3, new B_maxDistance().maxDistance(new int[]{1, 2, 3, 4, 7}, 3), "magnetic classic");
        eq(999999999, new B_maxDistance().maxDistance(new int[]{5, 4, 3, 2, 1, 1000000000}, 2), "magnetic example 2");
        for (int t = 0; t < 2500; t++) {
            int[] pos = distinctSorted(2, 8, 0, 30);
            int[] shuffled = rotate(pos, R.nextInt(pos.length));
            int m = 2 + R.nextInt(pos.length - 1);
            eq(bestPlacement(pos, m), new B_maxDistance().maxDistance(shuffled.clone(), m), "magnetic " + Arrays.toString(pos) + " m=" + m);
        }

        // ---- Side quest · Kth smallest in a sorted matrix (search the value space)
        eq(13, new B_kthSmallest().kthSmallest(new int[][]{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}, 8), "kth classic");
        eq(-5, new B_kthSmallest().kthSmallest(new int[][]{{-5}}, 1), "kth single");
        for (int t = 0; t < 2500; t++) {
            int n = 1 + R.nextInt(4);
            int[][] m = new int[n][n];
            for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
                int base = Math.max(i > 0 ? m[i - 1][j] : -8, j > 0 ? m[i][j - 1] : -8);
                m[i][j] = base + R.nextInt(3);
            }
            int[] flat = Arrays.stream(m).flatMapToInt(Arrays::stream).sorted().toArray();
            int k = 1 + R.nextInt(n * n);
            eq(flat[k - 1], new B_kthSmallest().kthSmallest(m, k), "kth " + Arrays.deepToString(m) + " k=" + k);
        }

        // ---- The lesson's "catch the bug" versions really fail on the inputs it names
        eq(-1, bugHiMinusOne(new int[]{1, 5}, 5), "bug: hi = mid - 1 skips the answer on [1, 5], target 5");
        eq(1, new B_search().search(new int[]{1, 5}, 5), "fixed template finds it");
        ok(!terminatesLoMid(new int[]{1, 3}, 3), "bug: lo = mid inside while (lo < hi) never ends on [1, 3], target 3");
        eq(3, bugFindMinVsLo(new int[]{1, 2, 3}), "bug: comparing with nums[lo] walks away from the min of [1, 2, 3]");
        eq(2, bugShipLoOne(new int[]{1, 2, 3, 1, 1}, 4), "bug: ship lo = 1 returns an impossible capacity");
        eq(true, bugCanFinishIntHours(new int[]{1000000000, 1000000000, 1000000000, 1000000000, 1000000000}, 2, 1000000000), "bug: int hours overflow says speed 2 is fast enough");
        eq(false, canFinishLong(new int[]{1000000000, 1000000000, 1000000000, 1000000000, 1000000000}, 2, 1000000000), "long hours: speed 2 is too slow");
        eq(-1, bugRotatedHalfNoBounds(new int[]{4, 5, 6, 7, 0, 1, 2}, 0), "bug: one-sided range check loses target 0 (really at index 4)");

        System.out.println("OK binary-search: " + cases + " checks passed");
    }

    static void checkPeak(int[] a) {
        int p = new B_findPeakElement().findPeakElement(a);
        boolean leftOk = p == 0 || a[p] > a[p - 1], rightOk = p == a.length - 1 || a[p] > a[p + 1];
        ok(p >= 0 && p < a.length && leftOk && rightOk, "peak " + Arrays.toString(a) + " got " + p);
    }

    // --- Buggy versions, copied from the lesson's fragments ---
    static int bugHiMinusOne(int[] nums, int target) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] >= target) hi = mid - 1;
            else lo = mid + 1;
        }
        return lo < nums.length && nums[lo] == target ? lo : -1;
    }
    static boolean terminatesLoMid(int[] nums, int target) { // "last index with nums[i] <= target", lo = mid
        int lo = 0, hi = nums.length - 1, budget = 1000;
        while (lo < hi) {
            if (budget-- == 0) return false;
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] <= target) lo = mid;
            else hi = mid - 1;
        }
        return true;
    }
    static int bugFindMinVsLo(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] >= nums[lo]) lo = mid + 1;
            else hi = mid;
        }
        return nums[lo];
    }
    static int bugShipLoOne(int[] weights, int days) {
        int lo = 1, hi = 0;
        for (int w : weights) hi += w;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            int needed = 1, load = 0;
            for (int w : weights) { if (load + w > mid) { needed++; load = 0; } load += w; }
            if (needed <= days) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
    static boolean bugCanFinishIntHours(int[] piles, int k, int h) {
        int hours = 0;
        for (int p : piles) hours += (p + k - 1) / k;
        return hours <= h;
    }
    static boolean canFinishLong(int[] piles, int k, int h) {
        long hours = 0;
        for (int p : piles) hours += (p + (long) k - 1) / k;
        return hours <= h;
    }
    static int bugRotatedHalfNoBounds(int[] nums, int target) { // checks only "target <= nums[mid]"
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < nums[hi]) {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid;
            } else {
                if (target <= nums[mid]) hi = mid;
                else lo = mid + 1;
            }
        }
        return nums[lo] == target ? lo : -1;
    }
}
