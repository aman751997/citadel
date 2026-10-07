import java.util.*;

// Runs every Java solution shown in backtracking.mdx against independent oracles — bitmask enumeration
// (subsets, combinations, partitions, IP cuts), Heap's algorithm and next-permutation (orderings),
// multiplicity odometers (reusable coins), BFS over (cell, visited-mask) states (word search), brute-force
// bucket assignment (k equal shares) and permutation brute force (N-Queens) — on hand-picked edge cases plus
// thousands of random small inputs. Result families are compared as SETS (order-insensitive) and must hold
// no duplicates. It also proves every "catch the bug" claim and every call count quoted in the lesson.
public class Check {
    static final Random R = new Random(13);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but got " + actual);
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }

    // ---------- set comparison helpers ----------
    static String key(List<?> list, boolean sortInside) {
        List<String> parts = new ArrayList<>();
        for (Object o : list) parts.add(String.valueOf(o));
        if (sortInside) {
            List<Object> copy = new ArrayList<>(list);
            copy.sort((a, b) -> a instanceof Integer x && b instanceof Integer y ? Integer.compare(x, y) : String.valueOf(a).compareTo(String.valueOf(b)));
            parts.clear();
            for (Object o : copy) parts.add(String.valueOf(o));
        }
        return String.join(",", parts);
    }
    // actual must have no duplicate answers and exactly the expected set of answers.
    static <T> void sameFamily(Set<String> expected, List<? extends List<T>> actual, boolean sortInside, String what) {
        Set<String> seen = new HashSet<>();
        for (List<T> l : actual) ok(seen.add(key(l, sortInside)), what + ": duplicate answer " + l + " in " + actual);
        eq(new TreeSet<>(expected), new TreeSet<>(seen), what);
    }
    static void sameStrings(Set<String> expected, List<String> actual, String what) {
        ok(new HashSet<>(actual).size() == actual.size(), what + ": duplicate string in " + actual);
        eq(new TreeSet<>(expected), new TreeSet<>(actual), what);
    }

    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static int[] randDistinct(int len, int lo, int hi) {
        List<Integer> pool = new ArrayList<>();
        for (int v = lo; v <= hi; v++) pool.add(v);
        Collections.shuffle(pool, R);
        int[] a = new int[len];
        for (int i = 0; i < len; i++) a[i] = pool.get(i);
        return a;
    }

    // ---------- independent oracles ----------
    static Set<String> bitmaskSubsets(int[] a) {             // every index mask; values sorted inside
        Set<String> out = new HashSet<>();
        for (int m = 0; m < (1 << a.length); m++) {
            List<Integer> s = new ArrayList<>();
            for (int i = 0; i < a.length; i++) if ((m >> i & 1) == 1) s.add(a[i]);
            out.add(key(s, true));
        }
        return out;
    }
    static Set<String> bitmaskCombine(int n, int k) {
        Set<String> out = new HashSet<>();
        for (int m = 0; m < (1 << n); m++) if (Integer.bitCount(m) == k) {
            List<Integer> s = new ArrayList<>();
            for (int i = 0; i < n; i++) if ((m >> i & 1) == 1) s.add(i + 1);
            out.add(key(s, true));
        }
        return out;
    }
    static Set<String> odometerCombos(int[] distinct, int target) {   // count of each coin: 0..target/coin
        Set<String> out = new HashSet<>();
        int[] cnt = new int[distinct.length];
        while (true) {
            int sum = 0;
            for (int i = 0; i < distinct.length; i++) sum += cnt[i] * distinct[i];
            if (sum == target) {
                List<Integer> s = new ArrayList<>();
                for (int i = 0; i < distinct.length; i++) for (int c = 0; c < cnt[i]; c++) s.add(distinct[i]);
                out.add(key(s, true));
            }
            int p = 0;
            while (p < distinct.length && cnt[p] == target / distinct[p]) { cnt[p] = 0; p++; }
            if (p == distinct.length) break;
            cnt[p]++;
        }
        return out;
    }
    static Set<String> heapPermutations(int[] a) {           // Heap's algorithm, iterative
        int[] x = a.clone();
        int n = x.length;
        Set<String> out = new HashSet<>();
        List<Integer> first = new ArrayList<>();
        for (int v : x) first.add(v);
        out.add(key(first, false));
        int[] c = new int[n];
        int i = 1;
        while (i < n) {
            if (c[i] < i) {
                int j = i % 2 == 0 ? 0 : c[i];
                int t = x[j]; x[j] = x[i]; x[i] = t;
                List<Integer> p = new ArrayList<>();
                for (int v : x) p.add(v);
                out.add(key(p, false));
                c[i]++;
                i = 1;
            } else { c[i] = 0; i++; }
        }
        return out;
    }
    static List<List<Integer>> heapPermutationsAsLists(int[] a) {   // distinct orderings from Heap's walk
        List<List<Integer>> out = new ArrayList<>();
        for (String k : heapPermutations(a)) {
            List<Integer> l = new ArrayList<>();
            if (!k.isEmpty()) for (String p : k.split(",")) l.add(Integer.parseInt(p));
            out.add(l);
        }
        return out;
    }
    static boolean nextPermutation(int[] x) {
        int i = x.length - 2;
        while (i >= 0 && x[i] >= x[i + 1]) i--;
        if (i < 0) return false;
        int j = x.length - 1;
        while (x[j] <= x[i]) j--;
        int t = x[i]; x[i] = x[j]; x[j] = t;
        for (int l = i + 1, r = x.length - 1; l < r; l++, r--) { t = x[l]; x[l] = x[r]; x[r] = t; }
        return true;
    }
    static Set<String> nextPermDistinct(int[] a) {          // lexicographic walk from sorted: distinct orderings
        int[] x = a.clone();
        Arrays.sort(x);
        Set<String> out = new HashSet<>();
        int count = 0;
        do {
            List<Integer> p = new ArrayList<>();
            for (int v : x) p.add(v);
            out.add(key(p, false));
            count++;
        } while (nextPermutation(x));
        eq(out.size(), count, "next-permutation visits each distinct ordering once");
        return out;
    }
    static boolean bfsWordSearch(char[][] b, String w) {     // states (cell, visited mask), one layer per letter
        int rows = b.length, cols = b[0].length;
        Set<Long> layer = new HashSet<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++)
            if (b[r][c] == w.charAt(0)) { int cell = r * cols + c; layer.add(((long) (1 << cell) << 5) | cell); }
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int k = 1; k < w.length() && !layer.isEmpty(); k++) {
            Set<Long> next = new HashSet<>();
            for (long st : layer) {
                int cell = (int) (st & 31);
                long mask = st >> 5;
                int r = cell / cols, c = cell % cols;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
                    int nb = nr * cols + nc;
                    if ((mask >> nb & 1) == 1 || b[nr][nc] != w.charAt(k)) continue;
                    next.add(((mask | (1L << nb)) << 5) | nb);
                }
            }
            layer = next;
        }
        return !layer.isEmpty();
    }
    static boolean isPal(String s) { return new StringBuilder(s).reverse().toString().equals(s); }
    static Set<String> gapPartitions(String s) {             // every subset of the n − 1 gaps
        Set<String> out = new HashSet<>();
        if (s.isEmpty()) return out;
        int gaps = s.length() - 1;
        for (int m = 0; m < (1 << gaps); m++) {
            List<String> pieces = new ArrayList<>();
            int from = 0;
            for (int g = 0; g < gaps; g++) if ((m >> g & 1) == 1) { pieces.add(s.substring(from, g + 1)); from = g + 1; }
            pieces.add(s.substring(from));
            boolean allPal = true;
            for (String p : pieces) allPal &= isPal(p);
            if (allPal) out.add(String.join(",", pieces));
        }
        return out;
    }
    static List<int[]> bruteQueens(int n) {                  // every column order, keep the ones with no shared diagonal
        int[] x = new int[n];
        for (int i = 0; i < n; i++) x[i] = i;
        List<int[]> out = new ArrayList<>();
        if (n == 0) return out;
        do {
            boolean good = true;
            for (int a = 0; a < n && good; a++) for (int b = a + 1; b < n && good; b++)
                if (Math.abs(a - b) == Math.abs(x[a] - x[b])) good = false;
            if (good) out.add(x.clone());
        } while (nextPermutation(x));
        return out;
    }
    static String boardKey(int[] cols) {
        StringBuilder sb = new StringBuilder();
        for (int c : cols) { char[] row = new char[cols.length]; Arrays.fill(row, '.'); row[c] = 'Q'; sb.append(new String(row)).append('/'); }
        return sb.toString();
    }
    static Set<String> bruteParens(int n) {
        Set<String> out = new HashSet<>();
        for (int m = 0; m < (1 << (2 * n)); m++) {
            StringBuilder sb = new StringBuilder();
            int bal = 0;
            boolean good = true;
            for (int i = 0; i < 2 * n; i++) {
                boolean open = (m >> i & 1) == 1;
                sb.append(open ? '(' : ')');
                bal += open ? 1 : -1;
                if (bal < 0) good = false;
            }
            if (good && bal == 0) out.add(sb.toString());
        }
        return out;
    }
    static int maxDepth(String p) { int d = 0, best = 0; for (char ch : p.toCharArray()) { d += ch == '(' ? 1 : -1; best = Math.max(best, d); } return best; }
    static Set<String> bruteIps(String s) {                  // every placement of three dots
        Set<String> out = new HashSet<>();
        int n = s.length();
        for (int i = 1; i < n; i++) for (int j = i + 1; j < n; j++) for (int l = j + 1; l < n; l++) {
            String[] parts = {s.substring(0, i), s.substring(i, j), s.substring(j, l), s.substring(l)};
            boolean good = true;
            for (String p : parts) {
                if (p.length() > 3) { good = false; break; }
                int v = Integer.parseInt(p);
                if (v > 255 || !String.valueOf(v).equals(p)) good = false;   // canonical form: no leading zero
            }
            if (good) out.add(String.join(".", parts));
        }
        return out;
    }
    static boolean bruteKPartition(int[] a, int k) {         // try every assignment of items to k buckets
        int total = 1;
        for (int i = 0; i < a.length; i++) total *= k;
        for (int code = 0; code < total; code++) {
            int[] sums = new int[k];
            int c = code;
            for (int x : a) { sums[c % k] += x; c /= k; }
            boolean equal = true;
            for (int s : sums) equal &= s == sums[0];
            if (equal) return true;
        }
        return false;
    }

    // ---------- the buggy versions the lesson names, and instrumented copies for call counts ----------
    static List<List<Integer>> subsetsNoUnchoose(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        noUnchoose(nums, 0, new ArrayList<>(), res);
        return res;
    }
    static void noUnchoose(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
        res.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) { path.add(nums[i]); noUnchoose(nums, i + 1, path, res); }
    }
    static List<List<Integer>> subsetsAlias(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        alias(nums, 0, new ArrayList<>(), res);
        return res;
    }
    static void alias(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
        res.add(path);
        for (int i = start; i < nums.length; i++) { path.add(nums[i]); alias(nums, i + 1, path, res); path.remove(path.size() - 1); }
    }
    static void removeByValue(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
        res.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) { path.add(nums[i]); removeByValue(nums, i + 1, path, res); path.remove(nums[i]); }
    }
    static int dupCalls;
    static List<List<Integer>> subsetsDupRule(int[] nums, boolean sort, boolean iGtZero, boolean skip) {
        int[] a = nums.clone();
        if (sort) Arrays.sort(a);
        List<List<Integer>> res = new ArrayList<>();
        dupCalls = 0;
        dupRule(a, 0, new ArrayList<>(), res, iGtZero, skip);
        return res;
    }
    static void dupRule(int[] a, int start, List<Integer> path, List<List<Integer>> res, boolean iGtZero, boolean skip) {
        dupCalls++;
        res.add(new ArrayList<>(path));
        for (int i = start; i < a.length; i++) {
            if (skip && i > (iGtZero ? 0 : start) && a[i] == a[i - 1]) continue;
            path.add(a[i]); dupRule(a, i + 1, path, res, iGtZero, skip); path.remove(path.size() - 1);
        }
    }
    static List<List<Integer>> combineShortBound(int n, int k) {
        List<List<Integer>> res = new ArrayList<>();
        shortBound(n, k, 1, new ArrayList<>(), res);
        return res;
    }
    static void shortBound(int n, int k, int start, List<Integer> path, List<List<Integer>> res) {
        if (path.size() == k) { res.add(new ArrayList<>(path)); return; }
        int need = k - path.size();
        for (int i = start; i <= n - need; i++) { path.add(i); shortBound(n, k, i + 1, path, res); path.remove(path.size() - 1); }
    }
    // childStart: 0 = restart from 0, 1 = i, 2 = i + 1
    static List<List<Integer>> comboSumVariant(int[] cands, int target, boolean sort, int childStart) {
        int[] c = cands.clone();
        if (sort) Arrays.sort(c);
        List<List<Integer>> res = new ArrayList<>();
        csv(c, target, 0, new ArrayList<>(), res, childStart);
        return res;
    }
    static void csv(int[] c, int remain, int start, List<Integer> path, List<List<Integer>> res, int childStart) {
        if (remain == 0) { res.add(new ArrayList<>(path)); return; }
        for (int i = start; i < c.length; i++) {
            if (c[i] > remain) break;
            path.add(c[i]);
            csv(c, remain - c[i], childStart == 0 ? 0 : childStart == 1 ? i : i + 1, path, res, childStart);
            path.remove(path.size() - 1);
        }
    }
    static final String[] KEYS = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
    static List<String> lettersNoEmptyCheck(String digits) {
        List<String> res = new ArrayList<>();
        lettersRec(digits, 0, new StringBuilder(), res);
        return res;
    }
    static void lettersRec(String d, int pos, StringBuilder sb, List<String> res) {
        if (pos == d.length()) { res.add(sb.toString()); return; }
        for (char ch : KEYS[d.charAt(pos) - '0'].toCharArray()) { sb.append(ch); lettersRec(d, pos + 1, sb, res); sb.deleteCharAt(sb.length() - 1); }
    }
    static List<String> cartesian(String digits) {          // independent: iterative expansion, one digit at a time
        List<String> cur = new ArrayList<>(List.of(""));
        if (digits.isEmpty()) return new ArrayList<>();
        for (char d : digits.toCharArray()) {
            List<String> next = new ArrayList<>();
            for (String p : cur) for (char ch : KEYS[d - '0'].toCharArray()) next.add(p + ch);
            cur = next;
        }
        return cur;
    }
    static List<List<Integer>> permuteNoBellReset(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        noBell(nums, new boolean[nums.length], new ArrayList<>(), res);
        return res;
    }
    static void noBell(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> res) {
        if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
        for (int i = 0; i < nums.length; i++) { if (used[i]) continue; used[i] = true; path.add(nums[i]); noBell(nums, used, path, res); path.remove(path.size() - 1); }
    }
    static List<List<Integer>> permuteWithStart(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        withStart(nums, 0, new ArrayList<>(), res);
        return res;
    }
    static void withStart(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
        if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
        for (int i = start; i < nums.length; i++) { path.add(nums[i]); withStart(nums, i + 1, path, res); path.remove(path.size() - 1); }
    }
    static int permCalls;
    // rule: "not" = !used[i-1] (lesson), "used" = used[i-1], "any" = twin skip with no bell check, "none" = no twin skip
    static List<List<Integer>> permDupRule(int[] nums, String rule) {
        int[] a = nums.clone();
        Arrays.sort(a);
        List<List<Integer>> res = new ArrayList<>();
        permCalls = 0;
        pdr(a, new boolean[a.length], new ArrayList<>(), res, rule);
        return res;
    }
    static void pdr(int[] a, boolean[] used, List<Integer> path, List<List<Integer>> res, String rule) {
        permCalls++;
        if (path.size() == a.length) { res.add(new ArrayList<>(path)); return; }
        for (int i = 0; i < a.length; i++) {
            if (used[i]) continue;
            boolean twin = i > 0 && a[i] == a[i - 1];
            if (twin && (rule.equals("not") && !used[i - 1] || rule.equals("used") && used[i - 1] || rule.equals("any"))) continue;
            used[i] = true; path.add(a[i]); pdr(a, used, path, res, rule); path.remove(path.size() - 1); used[i] = false;
        }
    }
    static boolean existNoRestore(char[][] board, String word) {
        char[][] b = new char[board.length][];
        for (int i = 0; i < board.length; i++) b[i] = board[i].clone();
        for (int r = 0; r < b.length; r++) for (int c = 0; c < b[0].length; c++) if (dfsNoRestore(b, word, r, c, 0)) return true;
        return false;
    }
    static boolean dfsNoRestore(char[][] b, String w, int r, int c, int k) {
        if (k == w.length()) return true;
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(k)) return false;
        b[r][c] = '#';
        return dfsNoRestore(b, w, r + 1, c, k + 1) || dfsNoRestore(b, w, r - 1, c, k + 1) || dfsNoRestore(b, w, r, c + 1, k + 1) || dfsNoRestore(b, w, r, c - 1, k + 1);
    }
    static boolean existNoMark(char[][] b, String word) {
        for (int r = 0; r < b.length; r++) for (int c = 0; c < b[0].length; c++) if (dfsNoMark(b, word, r, c, 0)) return true;
        return false;
    }
    static boolean dfsNoMark(char[][] b, String w, int r, int c, int k) {
        if (k == w.length()) return true;
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(k)) return false;
        return dfsNoMark(b, w, r + 1, c, k + 1) || dfsNoMark(b, w, r - 1, c, k + 1) || dfsNoMark(b, w, r, c + 1, k + 1) || dfsNoMark(b, w, r, c - 1, k + 1);
    }
    static List<List<String>> partitionStartPlusOne(String s) {
        List<List<String>> res = new ArrayList<>();
        pso(s, 0, new ArrayList<>(), res);
        return res;
    }
    static void pso(String s, int start, List<String> path, List<List<String>> res) {
        if (start == s.length()) { res.add(new ArrayList<>(path)); return; }
        for (int end = start; end < s.length(); end++) {
            if (!isPal(s.substring(start, end + 1))) continue;
            path.add(s.substring(start, end + 1)); pso(s, start + 1, path, res); path.remove(path.size() - 1);
        }
    }
    static int queenCalls;
    // mode: "ok" = lesson, "noOffset" = diag[r - c], "colsOnly" = clear only cols[c] on the way back
    static int queens(int n, String mode) {
        queenCalls = 0;
        return qPlace(0, n, new boolean[n], new boolean[2 * Math.max(n, 1) - 1], new boolean[2 * Math.max(n, 1) - 1], mode);
    }
    static int qPlace(int r, int n, boolean[] cols, boolean[] diag, boolean[] anti, String mode) {
        queenCalls++;
        if (r == n) return 1;
        int found = 0;
        for (int c = 0; c < n; c++) {
            int d = mode.equals("noOffset") ? r - c : r - c + n - 1;
            if (cols[c] || diag[d] || anti[r + c]) continue;
            cols[c] = diag[d] = anti[r + c] = true;
            found += qPlace(r + 1, n, cols, diag, anti, mode);
            cols[c] = false;
            if (!mode.equals("colsOnly")) diag[d] = anti[r + c] = false;
        }
        return found;
    }
    static List<List<Integer>> comboSum2NoTwinSkip(int[] cands, int target) {
        int[] c = cands.clone();
        Arrays.sort(c);
        List<List<Integer>> res = new ArrayList<>();
        cs2nts(c, target, 0, new ArrayList<>(), res);
        return res;
    }
    static void cs2nts(int[] c, int remain, int start, List<Integer> path, List<List<Integer>> res) {
        if (remain == 0) { res.add(new ArrayList<>(path)); return; }
        for (int i = start; i < c.length; i++) {
            if (c[i] > remain) break;
            path.add(c[i]); cs2nts(c, remain - c[i], i + 1, path, res); path.remove(path.size() - 1);
        }
    }
    static int kCalls;
    // order: true = biggest first (lesson), false = smallest first; emptyBreak as in the lesson
    static boolean kPartition(int[] nums, int k, boolean biggestFirst, boolean emptyBreak) {
        int total = 0;
        for (int x : nums) total += x;
        kCalls = 0;
        if (total % k != 0) return false;
        int side = total / k;
        int[] a = nums.clone();
        Arrays.sort(a);
        if (a[a.length - 1] > side) return false;
        if (!biggestFirst) for (int l = 0, r = a.length - 1; l < r; l++, r--) { int t = a[l]; a[l] = a[r]; a[r] = t; }
        return kFill(a, a.length - 1, new int[k], side, emptyBreak);
    }
    static boolean kFill(int[] a, int i, int[] bucket, int side, boolean emptyBreak) {
        kCalls++;
        if (i < 0) return true;
        for (int b = 0; b < bucket.length; b++) {
            if (bucket[b] + a[i] > side) continue;
            bucket[b] += a[i];
            if (kFill(a, i - 1, bucket, side, emptyBreak)) return true;
            bucket[b] -= a[i];
            if (emptyBreak && bucket[b] == 0) break;
        }
        return false;
    }

    static List<List<Integer>> asLists(int[][] rows) {
        List<List<Integer>> out = new ArrayList<>();
        for (int[] r : rows) { List<Integer> l = new ArrayList<>(); for (int v : r) l.add(v); out.add(l); }
        return out;
    }
    static char[][] grid(String... rows) {
        char[][] g = new char[rows.length][];
        for (int i = 0; i < rows.length; i++) g[i] = rows[i].toCharArray();
        return g;
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: Subsets (both shapes) ----------
        eq(asLists(new int[][]{{}, {1}, {1, 2}, {1, 2, 3}, {1, 3}, {2}, {2, 3}, {3}}), new B_subsets().subsets(new int[]{1, 2, 3}), "prologue figure: exact recording order");
        eq(asLists(new int[][]{{1, 2}, {1}, {2}, {}}), new B_subsetsInOut().subsets(new int[]{1, 2}), "shape 1 figure: leaves in order");
        eq(asLists(new int[][]{{}}), new B_subsets().subsets(new int[]{}), "subsets of nothing");
        eq(asLists(new int[][]{{}}), new B_subsetsInOut().subsets(new int[]{}), "in/out of nothing");
        eq(asLists(new int[][]{{}, {0}}), new B_subsets().subsets(new int[]{0}), "LC example 2");
        for (int t = 0; t < 1500; t++) {
            int[] a = randDistinct(R.nextInt(8), -10, 10);
            var s1 = new B_subsets().subsets(a.clone());
            var s2 = new B_subsetsInOut().subsets(a.clone());
            eq(1 << a.length, s1.size(), "subsets count 2^n");
            sameFamily(bitmaskSubsets(a), s1, true, "subsets " + Arrays.toString(a));
            sameFamily(bitmaskSubsets(a), s2, true, "subsetsInOut " + Arrays.toString(a));
        }
        {
            var bug = subsetsNoUnchoose(new int[]{1, 2, 3});
            eq(List.of(1, 2, 3, 3), bug.get(4), "catch-the-bug: fifth page without un-choose");
            eq(List.of(1, 3), new B_subsets().subsets(new int[]{1, 2, 3}).get(4), "fifth page with un-choose");
            var al = subsetsAlias(new int[]{1, 2, 3});
            eq(8, al.size(), "aliasing: 8 entries");
            for (var page : al) eq(List.of(), page, "aliasing: every entry empty");
            boolean threw = false;
            try { removeByValue(new int[]{1, 2, 3}, 0, new ArrayList<>(), new ArrayList<>()); }
            catch (IndexOutOfBoundsException e) { threw = true; }
            eq(true, threw, "path.remove(nums[i]) throws on [1,2,3]");
            // n · 2^(n-1) items in total over all subsets
            for (int n = 0; n <= 8; n++) {
                int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = i;
                int items = 0; for (var s : new B_subsets().subsets(a)) items += s.size();
                eq(n == 0 ? 0 : n * (1 << (n - 1)), items, "total items n·2^(n-1), n=" + n);
            }
        }

        // ---------- Chapter 2: Subsets II ----------
        eq(asLists(new int[][]{{}, {1}, {1, 2}, {1, 2, 2}, {2}, {2, 2}}), new B_subsetsWithDup().subsetsWithDup(new int[]{1, 2, 2}), "figure [1,2,2] exact");
        eq(asLists(new int[][]{{}, {0}}), new B_subsetsWithDup().subsetsWithDup(new int[]{0}), "LC example 2");
        eq(asLists(new int[][]{{}}), new B_subsetsWithDup().subsetsWithDup(new int[]{}), "empty");
        eq(asLists(new int[][]{{}, {5}, {5, 5}, {5, 5, 5}}), new B_subsetsWithDup().subsetsWithDup(new int[]{5, 5, 5}), "all equal");
        {
            var bug = subsetsDupRule(new int[]{1, 2, 2}, true, true, true);
            eq(asLists(new int[][]{{}, {1}, {1, 2}, {2}}), bug, "catch-the-bug: i > 0 loses [1,2,2] and [2,2]");
            var unsorted = subsetsDupRule(new int[]{2, 1, 2}, false, false, true);
            eq(8, unsorted.size(), "no sort: 8 pages");
            int twos = 0; for (var p : unsorted) if (p.equals(List.of(2))) twos++;
            eq(2, twos, "no sort: [2] written twice");
            ok(unsorted.contains(List.of(2, 1)) && unsorted.contains(List.of(1, 2)), "no sort: [2,1] beside [1,2]");
            int[] tens = new int[10]; Arrays.fill(tens, 7);
            subsetsDupRule(tens, true, false, false);
            eq(1024, dupCalls, "10 equal values without the skip: 1,024 nodes");
            subsetsDupRule(tens, true, false, true);
            eq(11, dupCalls, "10 equal values with the skip: 11 nodes");
        }
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(0, 8, -2, 3);
            sameFamily(bitmaskSubsets(a), new B_subsetsWithDup().subsetsWithDup(a.clone()), true, "subsetsWithDup " + Arrays.toString(a));
        }

        // ---------- Chapter 3: Combinations ----------
        eq(asLists(new int[][]{{1, 2}, {1, 3}, {1, 4}, {2, 3}, {2, 4}, {3, 4}}), new B_combine().combine(4, 2), "figure n=4 k=2 exact");
        eq(asLists(new int[][]{{1}}), new B_combine().combine(1, 1), "n=1 k=1");
        eq(asLists(new int[][]{{1, 2, 3}}), new B_combine().combine(3, 3), "k = n");
        eq(asLists(new int[][]{{1, 2}, {1, 3}, {2, 3}}), combineShortBound(4, 2), "catch-the-bug: n − need bound loses every hand with 4");
        for (int n = 1; n <= 10; n++) for (int k = 1; k <= n; k++)
            sameFamily(bitmaskCombine(n, k), new B_combine().combine(n, k), true, "combine " + n + "," + k);

        // ---------- Chapter 4: Combination Sum ----------
        eq(asLists(new int[][]{{2, 2, 3}, {7}}), new B_combinationSum().combinationSum(new int[]{2, 3, 6, 7}, 7), "figure [2,3,6,7] 7 exact");
        sameFamily(Set.of("2,2,2,2", "2,3,3", "3,5"), new B_combinationSum().combinationSum(new int[]{2, 3, 5}, 8), true, "LC example 2");
        eq(asLists(new int[][]{}), new B_combinationSum().combinationSum(new int[]{2}, 1), "no answer");
        eq(asLists(new int[][]{{7}}), comboSumVariant(new int[]{2, 3, 6, 7}, 7, true, 2), "catch-the-bug: i + 1 forbids reuse");
        eq(asLists(new int[][]{{2, 2, 3}, {2, 3, 2}, {3, 2, 2}, {7}}), comboSumVariant(new int[]{2, 3, 6, 7}, 7, true, 0), "reveal: child at 0 writes every order");
        eq(asLists(new int[][]{{7}}), comboSumVariant(new int[]{2, 7, 3}, 7, false, 1), "catch-the-bug: break without sorting loses [2,2,3]");
        for (int t = 0; t < 2000; t++) {
            int[] c = randDistinct(1 + R.nextInt(5), 1, 12);
            int target = 1 + R.nextInt(20);
            int[] d = c.clone();
            sameFamily(odometerCombos(d, target), new B_combinationSum().combinationSum(c.clone(), target), true, "combinationSum " + Arrays.toString(c) + " t=" + target);
        }

        // ---------- Chapter 5: Letter Combinations ----------
        eq(List.of("ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"), new B_letterCombinations().letterCombinations("23"), "figure \"23\" exact order");
        eq(List.of(), new B_letterCombinations().letterCombinations(""), "empty digits → []");
        eq(List.of(""), lettersNoEmptyCheck(""), "catch-the-bug: no check returns [\"\"]");
        eq(List.of("a", "b", "c"), new B_letterCombinations().letterCombinations("2"), "single digit");
        eq(16, new B_letterCombinations().letterCombinations("79").size(), "two 4-letter digits");
        for (int t = 0; t < 1500; t++) {
            StringBuilder d = new StringBuilder();
            int len = R.nextInt(5);
            for (int i = 0; i < len; i++) d.append((char) ('2' + R.nextInt(8)));
            var got = new B_letterCombinations().letterCombinations(d.toString());
            sameStrings(new HashSet<>(cartesian(d.toString())), got, "letters " + d);
            eq(cartesian(d.toString()), got, "letters order " + d);
        }

        // ---------- Chapter 6: Permutations ----------
        eq(asLists(new int[][]{{1, 2, 3}, {1, 3, 2}, {2, 1, 3}, {2, 3, 1}, {3, 1, 2}, {3, 2, 1}}), new B_permute().permute(new int[]{1, 2, 3}), "figure exact order");
        eq(asLists(new int[][]{{1}}), new B_permute().permute(new int[]{1}), "single");
        eq(asLists(new int[][]{{1, 2, 3}}), permuteNoBellReset(new int[]{1, 2, 3}), "catch-the-bug: no bell reset → one page");
        eq(asLists(new int[][]{{1, 2, 3}}), permuteWithStart(new int[]{1, 2, 3}), "catch-the-bug: start instead of used[] → one page");
        {   // 1 + 3 + 6 + 6 = 16 nodes for n = 3; fewer than e·n! for every n
            for (int n = 1; n <= 8; n++) {
                long nodes = 0, fact = 1;
                for (int i = 1; i <= n; i++) fact *= i;
                for (int d = 0; d <= n; d++) { long p = 1; for (int i = 0; i < d; i++) p *= (n - i); nodes += p; }
                if (n == 3) eq(16L, nodes, "16 nodes for n = 3");
                ok(nodes < Math.E * fact, "nodes < e·n! for n=" + n);
            }
        }
        for (int t = 0; t < 1200; t++) {
            int[] a = randDistinct(R.nextInt(7), -10, 10);
            var got = new B_permute().permute(a.clone());
            long fact = 1; for (int i = 2; i <= a.length; i++) fact *= i;
            eq((int) fact, got.size(), "n! orderings");
            sameFamily(heapPermutations(a), got, false, "permute " + Arrays.toString(a));
        }

        // ---------- Chapter 7: Word Search ----------
        {
            char[][] lc = grid("ABCE", "SFCS", "ADEE");
            eq(true, new B_exist().exist(lc, "ABCCED"), "LC 1");
            eq(true, new B_exist().exist(lc, "SEE"), "LC 2");
            eq(false, new B_exist().exist(lc, "ABCB"), "LC 3");
            eq("ABCE/SFCS/ADEE", String.join("/", new String(lc[0]), new String(lc[1]), new String(lc[2])), "board restored after search");
            eq(true, new B_exist().exist(grid("AB", "AA"), "AAB"), "figure: AAB found");
            eq(false, existNoRestore(grid("AB", "AA"), "AAB"), "catch-the-bug: no restore → false");
            eq(false, new B_exist().exist(grid("AB"), "ABA"), "ABA on [[A,B]] is false");
            eq(true, existNoMark(grid("AB"), "ABA"), "catch-the-bug: no mark → true");
            eq(true, new B_exist().exist(grid("A"), "A"), "1x1");
            eq(false, new B_exist().exist(grid("A"), "AA"), "1x1 reuse");
            for (int t = 0; t < 4000; t++) {
                int rows = 1 + R.nextInt(3), cols = 1 + R.nextInt(4);
                char[][] b = new char[rows][cols];
                for (char[] row : b) for (int c = 0; c < cols; c++) row[c] = (char) ('A' + R.nextInt(3));
                StringBuilder w = new StringBuilder();
                int len = 1 + R.nextInt(Math.min(7, rows * cols + 1));
                for (int i = 0; i < len; i++) w.append((char) ('A' + R.nextInt(3)));
                char[][] copy = new char[rows][];
                for (int i = 0; i < rows; i++) copy[i] = b[i].clone();
                eq(bfsWordSearch(b, w.toString()), new B_exist().exist(b, w.toString()), "exist " + Arrays.deepToString(b) + " " + w);
                eq(Arrays.deepToString(copy), Arrays.deepToString(b), "board unchanged");
            }
        }

        // ---------- Chapter 8: Palindrome Partitioning ----------
        {
            List<List<String>> aab = new ArrayList<>();
            aab.add(List.of("a", "a", "b")); aab.add(List.of("aa", "b"));
            eq(aab, new B_partition().partition("aab"), "figure aab exact");
            eq(List.of(List.of("a")), new B_partition().partition("a"), "single letter");
            var bug = partitionStartPlusOne("aab");
            ok(bug.contains(List.of("aa", "a", "b")), "catch-the-bug: start + 1 writes [aa, a, b]");
            eq(1 << 4, new B_partition().partition("aaaaa").size(), "n equal letters: 2^(n-1)");
            for (int t = 0; t < 3000; t++) {
                StringBuilder s = new StringBuilder();
                int len = 1 + R.nextInt(9);
                for (int i = 0; i < len; i++) s.append((char) ('a' + R.nextInt(2 + R.nextInt(2))));
                var got = new B_partition().partition(s.toString());
                Set<String> keys = new HashSet<>();
                for (var p : got) ok(keys.add(String.join(",", p)), "duplicate partition");
                eq(new TreeSet<>(gapPartitions(s.toString())), new TreeSet<>(keys), "partition " + s);
            }
        }

        // ---------- Chapter 9: N-Queens ----------
        {
            int[] known = {1, 0, 0, 2, 10, 4, 40, 92, 352};
            for (int n = 1; n <= 9; n++) {
                var brute = bruteQueens(n);
                eq(known[n - 1], brute.size(), "brute force count n=" + n);
                var got = new B_solveNQueens().solveNQueens(n);
                eq(known[n - 1], got.size(), "lesson count n=" + n);
                Set<String> want = new HashSet<>();
                for (int[] b : brute) want.add(boardKey(b));
                Set<String> have = new HashSet<>();
                for (var board : got) { eq(n, board.size(), "board rows"); ok(have.add(String.join("/", board) + "/"), "duplicate board"); }
                eq(new TreeSet<>(want), new TreeSet<>(have), "boards n=" + n);
                eq(known[n - 1], queens(n, "ok"), "counting copy n=" + n);
            }
            eq(List.of(List.of(".Q..", "...Q", "Q...", "..Q."), List.of("..Q.", "Q...", "...Q", ".Q..")), new B_solveNQueens().solveNQueens(4), "figure: the two 4x4 boards, in order");
            eq(List.of(List.of("Q")), new B_solveNQueens().solveNQueens(1), "n = 1");
            queens(8, "ok");
            eq(2057, queenCalls, "8 queens: 2,057 calls");
            eq(16777216L, (long) Math.pow(8, 8), "8^8");
            eq(40320, 8 * 7 * 6 * 5 * 4 * 3 * 2, "8!");
            boolean threw = false;
            try { queens(4, "noOffset"); } catch (ArrayIndexOutOfBoundsException e) { threw = true; }
            eq(true, threw, "catch-the-bug: diag[r - c] throws");
            for (int n = 4; n <= 8; n++) ok(queens(n, "colsOnly") < known[n - 1], "catch-the-bug: stale diagonals lose boards n=" + n);
        }

        // ---------- Side quest 1: Combination Sum II ----------
        sameFamily(Set.of("1,1,6", "1,2,5", "1,7", "2,6"), new B_combinationSum2().combinationSum2(new int[]{10, 1, 2, 7, 6, 1, 5}, 8), true, "LC example 1");
        sameFamily(Set.of("1,2,2", "5"), new B_combinationSum2().combinationSum2(new int[]{2, 5, 2, 1, 2}, 5), true, "LC example 2");
        {
            var bug = comboSum2NoTwinSkip(new int[]{10, 1, 2, 7, 6, 1, 5}, 8);
            eq(6, bug.size(), "transfer test: no twin skip → 6 pages");
            Map<String, Integer> cnt = new HashMap<>();
            for (var p : bug) cnt.merge(key(p, true), 1, Integer::sum);
            eq(Map.of("1,1,6", 1, "1,2,5", 2, "1,7", 2, "2,6", 1), cnt, "transfer test: which pages repeat");
        }
        for (int t = 0; t < 3000; t++) {
            int[] c = randArr(1, 9, 1, 6);
            int target = 1 + R.nextInt(14);
            Set<String> want = new HashSet<>();
            for (int m = 0; m < (1 << c.length); m++) {
                int sum = 0; List<Integer> s = new ArrayList<>();
                for (int i = 0; i < c.length; i++) if ((m >> i & 1) == 1) { sum += c[i]; s.add(c[i]); }
                if (sum == target) want.add(key(s, true));
            }
            sameFamily(want, new B_combinationSum2().combinationSum2(c.clone(), target), true, "combinationSum2 " + Arrays.toString(c) + " t=" + target);
        }

        // ---------- Side quest 2: Permutations II ----------
        eq(asLists(new int[][]{{1, 1, 2}, {1, 2, 1}, {2, 1, 1}}), new B_permuteUnique().permuteUnique(new int[]{1, 1, 2}), "LC example 1");
        eq(6, new B_permuteUnique().permuteUnique(new int[]{1, 1, 2, 2}).size(), "transfer test: [1,1,2,2] → 6");
        {
            permDupRule(new int[]{1, 1, 1, 1}, "not");
            eq(5, permCalls, "!used on [1,1,1,1]: 5 calls");
            var withUsed = permDupRule(new int[]{1, 1, 1, 1}, "used");
            eq(23, permCalls, "used on [1,1,1,1]: 23 calls");
            eq(asLists(new int[][]{{1, 1, 1, 1}}), withUsed, "used rule still correct on [1,1,1,1]");
            eq(asLists(new int[][]{}), permDupRule(new int[]{1, 1, 2}, "any"), "no bell check: empty book");
            var none = permDupRule(new int[]{1, 1, 2}, "none");
            eq(6, none.size(), "no skip: 6 pages");
            eq(3, new HashSet<>(none).size(), "no skip: 3 distinct");
        }
        for (int t = 0; t < 1500; t++) {
            int[] a = randArr(0, 6, 1, 3);
            Set<String> want = nextPermDistinct(a);
            sameFamily(want, new B_permuteUnique().permuteUnique(a.clone()), false, "permuteUnique " + Arrays.toString(a));
            sameFamily(want, permDupRule(a, "used"), false, "used[i-1] variant also correct " + Arrays.toString(a));
            sameFamily(want, permDupRule(a, "not"), false, "counting copy " + Arrays.toString(a));
            sameFamily(want, new ArrayList<>(heapPermutationsAsLists(a)), false, "Heap's algorithm agrees " + Arrays.toString(a));
        }

        // ---------- Side quest 3: Generate Parentheses ----------
        int[] catalan = {1, 1, 2, 5, 14, 42, 132, 429};
        for (int n = 1; n <= 7; n++) {
            var got = new B_generateParenthesis().generateParenthesis(n);
            eq(catalan[n], got.size(), "Catalan n=" + n);
            sameStrings(bruteParens(n), got, "parens n=" + n);
        }
        eq(List.of("(())", "()()"), new B_generateParenthesis().generateParenthesis(2), "figure n=2 order");
        {
            int shallow = 0;
            for (String p : bruteParens(3)) if (maxDepth(p) <= 2) shallow++;
            eq(4, shallow, "transfer test: n=3, depth ≤ 2 → 4");
        }

        // ---------- Side quest 4: Combination Sum III ----------
        eq(asLists(new int[][]{{1, 2, 4}}), new B_combinationSum3().combinationSum3(3, 7), "LC example 1");
        eq(asLists(new int[][]{{1, 2, 6}, {1, 3, 5}, {2, 3, 4}}), new B_combinationSum3().combinationSum3(3, 9), "LC example 2 (lesson)");
        eq(asLists(new int[][]{}), new B_combinationSum3().combinationSum3(4, 1), "LC example 3");
        for (int k = 1; k <= 9; k++) for (int n = 1; n <= 60; n++) {
            Set<String> want = new HashSet<>();
            for (int m = 0; m < 512; m++) if (Integer.bitCount(m) == k) {
                int sum = 0; List<Integer> s = new ArrayList<>();
                for (int d = 0; d < 9; d++) if ((m >> d & 1) == 1) { sum += d + 1; s.add(d + 1); }
                if (sum == n) want.add(key(s, true));
            }
            sameFamily(want, new B_combinationSum3().combinationSum3(k, n), true, "combinationSum3 " + k + "," + n);
        }
        eq(126, bitmaskCombine(9, 4).size(), "C(9, 4) = 126 is the largest C(9, k)");

        // ---------- Side quest 5: Restore IP Addresses ----------
        sameStrings(Set.of("255.255.11.135", "255.255.111.35"), new B_restoreIpAddresses().restoreIpAddresses("25525511135"), "LC 1");
        sameStrings(Set.of("0.0.0.0"), new B_restoreIpAddresses().restoreIpAddresses("0000"), "LC 2");
        sameStrings(Set.of("1.0.10.23", "1.0.102.3", "10.1.0.23", "10.10.2.3", "101.0.2.3"), new B_restoreIpAddresses().restoreIpAddresses("101023"), "LC 3");
        eq(List.of(), new B_restoreIpAddresses().restoreIpAddresses("1234567890123"), "13 digits: none");
        eq(List.of(), new B_restoreIpAddresses().restoreIpAddresses("123"), "3 digits: none");
        for (int t = 0; t < 4000; t++) {
            StringBuilder s = new StringBuilder();
            int len = 1 + R.nextInt(14);
            for (int i = 0; i < len; i++) s.append(R.nextInt(4) == 0 ? '0' : (char) ('0' + R.nextInt(10)));
            sameStrings(bruteIps(s.toString()), new B_restoreIpAddresses().restoreIpAddresses(s.toString()), "restoreIp " + s);
        }

        // ---------- Side quest 6: Partition to K Equal Sum Subsets ----------
        eq(true, new B_canPartitionKSubsets().canPartitionKSubsets(new int[]{4, 3, 2, 3, 5, 2, 1}, 4), "LC 1");
        eq(false, new B_canPartitionKSubsets().canPartitionKSubsets(new int[]{1, 2, 3, 4}, 3), "LC 2");
        eq(false, new B_canPartitionKSubsets().canPartitionKSubsets(new int[]{2, 2, 2, 2, 3, 4, 5}, 4), "reveal instance is false");
        eq(true, new B_canPartitionKSubsets().canPartitionKSubsets(new int[]{5}, 1), "k = 1");
        {
            int[] inst = {2, 2, 2, 2, 3, 4, 5};
            kPartition(inst, 4, true, true);   eq(12, kCalls, "biggest first + empty-bucket break: 12 calls");
            kPartition(inst, 4, true, false);  eq(233, kCalls, "biggest first alone: 233 calls");
            kPartition(inst, 4, false, false); eq(1245, kCalls, "smallest first, no break: 1,245 calls");
            int[] heavy = new int[16]; Arrays.fill(heavy, 2); heavy[15] = 3;
            eq(false, kPartition(heavy, 3, true, true), "fifteen 2s and a 3, k = 3: false");
            eq(405870, kCalls, "fully pruned: 405,870 calls");
        }
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 8, 1, 9);
            int k = 1 + R.nextInt(Math.min(4, a.length));
            eq(bruteKPartition(a, k), new B_canPartitionKSubsets().canPartitionKSubsets(a.clone(), k), "kPartition " + Arrays.toString(a) + " k=" + k);
        }

        System.out.println("OK backtracking: " + cases + " checks passed");
    }
}
