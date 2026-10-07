import java.util.*;

// Runs every Java solution shown in two-pointers.mdx against a brute-force oracle on
// hand-picked edge cases plus thousands of random small inputs. Any mismatch throws.
public class Check {
    static final Random R = new Random(7);
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
    static int[] randArr(int maxLen, int lo, int hi) {
        int[] a = new int[R.nextInt(maxLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static int[] sorted(int[] a) { int[] b = a.clone(); Arrays.sort(b); return b; }
    static String randText(String alphabet, int maxLen) {
        StringBuilder sb = new StringBuilder();
        int n = R.nextInt(maxLen + 1);
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }
    static boolean pal(String s) { return new StringBuilder(s).reverse().toString().equals(s); }

    public static void main(String[] args) {
        // Valid Palindrome
        for (String s : new String[]{"A man, a plan, a canal: Panama", "race a car", " ", ".,", "0P", "a.", "ab_a"})
            eq(pal(s.replaceAll("[^A-Za-z0-9]", "").toLowerCase()), new B_isPalindrome().isPalindrome(s), "isPalindrome " + s);
        for (int t = 0; t < 3000; t++) {
            String s = randText("aAbB0,. ", 8);
            eq(pal(s.replaceAll("[^A-Za-z0-9]", "").toLowerCase()), new B_isPalindrome().isPalindrome(s), "isPalindrome " + s);
        }

        // Two Sum II: any valid 1-based pair is accepted; [-1,-1] only when none exists
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(8, -6, 6));
            int target = R.nextInt(15) - 7;
            boolean exists = false;
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (a[i] + a[j] == target) exists = true;
            int[] got = new B_twoSum().twoSum(a, target);
            if (exists) {
                eq(true, got[0] >= 1 && got[0] < got[1] && got[1] <= a.length && a[got[0] - 1] + a[got[1] - 1] == target, "twoSum valid pair");
            } else eq(true, got[0] == -1 && got[1] == -1, "twoSum none");
        }

        // 3Sum: unique value triplets, any order
        for (int t = 0; t < 2000; t++) {
            int[] a = randArr(9, -4, 4);
            Set<List<Integer>> expect = new HashSet<>();
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) for (int k = j + 1; k < a.length; k++)
                if (a[i] + a[j] + a[k] == 0) { int[] x = {a[i], a[j], a[k]}; Arrays.sort(x); expect.add(List.of(x[0], x[1], x[2])); }
            List<List<Integer>> got = new B_threeSum().threeSum(a.clone());
            eq(expect.size(), got.size(), "threeSum count (no duplicates)");
            Set<List<Integer>> gotSet = new HashSet<>();
            for (List<Integer> g : got) { List<Integer> c = new ArrayList<>(g); Collections.sort(c); gotSet.add(c); }
            eq(expect, gotSet, "threeSum set");
        }

        // Container With Most Water
        eq(49, new B_maxArea().maxArea(new int[]{1, 8, 6, 2, 5, 4, 8, 3, 7}), "maxArea classic");
        for (int t = 0; t < 3000; t++) {
            int[] h = randArr(9, 0, 9);
            if (h.length < 2) continue;
            int best = 0;
            for (int i = 0; i < h.length; i++) for (int j = i + 1; j < h.length; j++) best = Math.max(best, Math.min(h[i], h[j]) * (j - i));
            eq(best, new B_maxArea().maxArea(h), "maxArea " + Arrays.toString(h));
        }

        // Trapping Rain Water
        eq(6, new B_trap().trap(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}), "trap classic figure");
        eq(9, new B_trap().trap(new int[]{4, 1, 0, 2, 5}), "trap lesson trace");
        for (int t = 0; t < 3000; t++) {
            int[] h = randArr(10, 0, 6);
            int water = 0;
            for (int i = 0; i < h.length; i++) {
                int l = 0, r = 0;
                for (int j = 0; j <= i; j++) l = Math.max(l, h[j]);
                for (int j = i; j < h.length; j++) r = Math.max(r, h[j]);
                water += Math.min(l, r) - h[i];
            }
            eq(water, new B_trap().trap(h), "trap " + Arrays.toString(h));
        }

        // Move Zeroes (stable)
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(8, -2, 3);
            List<Integer> expect = new ArrayList<>();
            for (int v : a) if (v != 0) expect.add(v);
            while (expect.size() < a.length) expect.add(0);
            int[] got = a.clone();
            new B_moveZeroes().moveZeroes(got);
            eq(expect.stream().mapToInt(Integer::intValue).toArray(), got, "moveZeroes");
        }

        // Remove Duplicates I and II
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(9, 0, 4));
            for (int k = 1; k <= 2; k++) {
                List<Integer> expect = new ArrayList<>();
                Map<Integer, Integer> seen = new HashMap<>();
                for (int v : a) if (seen.merge(v, 1, Integer::sum) <= k) expect.add(v);
                int[] work = a.clone();
                int len = k == 1 ? new B_removeDuplicates().removeDuplicates(work) : new B_removeDuplicates().removeDuplicatesII(work);
                eq(expect.stream().mapToInt(Integer::intValue).toArray(), Arrays.copyOf(work, len), "removeDuplicates k=" + k);
            }
        }

        // Sort Colors
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(9, 0, 2), got = a.clone();
            new B_sortColors().sortColors(got);
            eq(sorted(a), got, "sortColors " + Arrays.toString(a));
        }

        // Merge Sorted Array
        for (int t = 0; t < 3000; t++) {
            int[] x = sorted(randArr(5, -3, 3)), y = sorted(randArr(5, -3, 3));
            int[] nums1 = Arrays.copyOf(x, x.length + y.length);
            new B_merge().merge(nums1, x.length, y.clone(), y.length);
            int[] all = Arrays.copyOf(x, x.length + y.length);
            System.arraycopy(y, 0, all, x.length, y.length);
            eq(sorted(all), nums1, "merge");
        }

        // Append Characters
        for (int t = 0; t < 3000; t++) {
            String s = randText("abc", 7), target = randText("abc", 5);
            int best = target.length();
            for (int keep = 0; keep <= target.length(); keep++) {
                String prefix = target.substring(0, keep);
                int m = 0;
                for (char c : s.toCharArray()) if (m < prefix.length() && c == prefix.charAt(m)) m++;
                if (m == prefix.length()) best = Math.min(best, target.length() - keep);
            }
            eq(best, new B_appendCharacters().appendCharacters(s, target), "appendCharacters " + s + " " + target);
        }

        // Squares of a Sorted Array
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(8, -9, 9));
            int[] expect = Arrays.stream(a).map(v -> v * v).sorted().toArray();
            eq(expect, new B_sortedSquares().sortedSquares(a), "sortedSquares");
        }

        // One deletion palindrome
        for (String s : new String[]{"abca", "abc", "cbbcc", "deeee", "", "a"}) checkOneDeletion(s);
        for (int t = 0; t < 3000; t++) checkOneDeletion(randText("abc", 8));

        // Count pairs (positions) summing to target, and count pairs below target
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(9, -3, 4));
            int target = R.nextInt(11) - 5;
            long eqCount = 0, lessCount = 0;
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) {
                if (a[i] + a[j] == target) eqCount++;
                if (a[i] + a[j] < target) lessCount++;
            }
            eq(eqCount, new B_countPairs().countPairs(a, target), "countPairs " + Arrays.toString(a) + " t=" + target);
            eq(lessCount, new B_countPairsBelow().countPairsBelow(a, target), "countPairsBelow");
        }

        // Two-way partition: boundary returned, prefix all < pivot, suffix all >= pivot, same multiset
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(9, 0, 6), got = a.clone();
            int pivot = R.nextInt(7);
            int boundary = new B_partitionLess().partitionLess(got, pivot);
            eq((int) Arrays.stream(a).filter(v -> v < pivot).count(), boundary, "partition boundary");
            for (int i = 0; i < got.length; i++) eq(i < boundary, got[i] < pivot, "partition side");
            eq(sorted(a), sorted(got), "partition keeps values");
        }

        // Target difference
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(8, -5, 6));
            int target = R.nextInt(9) - 1;
            boolean expect = false;
            for (int i = 0; i < a.length; i++) for (int j = 0; j < a.length; j++) if (target >= 0 && i != j && a[j] - a[i] == target) expect = true; // larger minus smaller
            eq(expect, new B_hasPairDifference().hasPairDifference(a, target), "hasPairDifference " + Arrays.toString(a) + " d=" + target);
        }

        // Unique intersection
        for (int t = 0; t < 3000; t++) {
            int[] a = sorted(randArr(7, 0, 5)), b = sorted(randArr(7, 0, 5));
            TreeSet<Integer> expect = new TreeSet<>();
            for (int x : a) for (int y : b) if (x == y) expect.add(x);
            eq(new ArrayList<>(expect), new B_intersectionUnique().intersectionUnique(a, b), "intersection");
        }

        System.out.println("OK two-pointers: " + cases + " checks passed");
    }

    static void checkOneDeletion(String s) {
        boolean expect = pal(s);
        for (int i = 0; i < s.length() && !expect; i++) expect = pal(s.substring(0, i) + s.substring(i + 1));
        eq(expect, new B_validPalindromeOneDeletion().validPalindromeOneDeletion(s), "oneDeletion " + s);
    }
}
