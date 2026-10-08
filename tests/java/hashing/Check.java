import java.util.*;
import java.util.stream.*;

// Runs every Java solution shown in hashing.mdx against independent oracles (O(n^2) pair checks,
// sorting-based checks, plain simulation) on hand-picked edge cases plus thousands of random inputs.
// It also proves each "catch the bug" version the lesson names fails on the input the lesson names.
public class Check {
    static final Random R = new Random(19);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void eq(Object expected, Object actual) { eq(expected, actual, "edge case"); }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) { return o instanceof int[] a ? Arrays.toString(a) : String.valueOf(o); }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static String randStr(int maxLen, String alphabet) {
        int n = R.nextInt(maxLen + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }

    // ---------- oracles ----------
    static boolean bruteDup(int[] a) { for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (a[i] == a[j]) return true; return false; }
    static boolean sortedEq(String s, String t) { char[] a = s.toCharArray(), b = t.toCharArray(); Arrays.sort(a); Arrays.sort(b); return Arrays.equals(a, b); }
    static boolean sortedCodePointsEq(String s, String t) { return Arrays.equals(s.codePoints().sorted().toArray(), t.codePoints().sorted().toArray()); }
    static int bruteLongest(int[] a) {
        int[] d = Arrays.stream(a).distinct().sorted().toArray();
        int best = d.length > 0 ? 1 : 0, run = 1;
        for (int i = 1; i < d.length; i++) { run = d[i] == d[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
        return best;
    }
    static boolean brutePath(String p) {
        List<int[]> pts = new ArrayList<>(); pts.add(new int[]{0, 0}); int x = 0, y = 0;
        for (char c : p.toCharArray()) {
            if (c == 'N') y++; else if (c == 'S') y--; else if (c == 'E') x++; else x--;
            for (int[] q : pts) if (q[0] == x && q[1] == y) return true;
            pts.add(new int[]{x, y});
        }
        return false;
    }
    static boolean bruteIso(String s, String t) {   // definition: s[i]==s[j] iff t[i]==t[j]
        if (s.length() != t.length()) return false;
        for (int i = 0; i < s.length(); i++) for (int j = 0; j < s.length(); j++)
            if ((s.charAt(i) == s.charAt(j)) != (t.charAt(i) == t.charAt(j))) return false;
        return true;
    }
    static boolean bruteWordPattern(String p, String s) {
        String[] w = s.split(" ");
        if (w.length != p.length()) return false;
        for (int i = 0; i < w.length; i++) for (int j = 0; j < w.length; j++)
            if ((p.charAt(i) == p.charAt(j)) != w[i].equals(w[j])) return false;
        return true;
    }
    static boolean bruteNearby(int[] a, int k) { for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length && j - i <= k; j++) if (a[i] == a[j]) return true; return false; }
    static boolean bruteSudoku(char[][] b) {
        for (int r1 = 0; r1 < 9; r1++) for (int c1 = 0; c1 < 9; c1++) for (int r2 = 0; r2 < 9; r2++) for (int c2 = 0; c2 < 9; c2++) {
            if ((r1 == r2 && c1 == c2) || b[r1][c1] == '.' || b[r1][c1] != b[r2][c2]) continue;
            if (r1 == r2 || c1 == c2 || (r1 / 3 == r2 / 3 && c1 / 3 == c2 / 3)) return false;
        }
        return true;
    }
    static int digitSq(int n) { int s = 0; while (n > 0) { s += (n % 10) * (n % 10); n /= 10; } return s; }
    static boolean bruteHappy(int n) { for (int i = 0; i < 1000; i++) n = digitSq(n); return n == 1; }
    static int bruteFirstUnique(String s) {
        for (int i = 0; i < s.length(); i++) { int c = 0; for (int j = 0; j < s.length(); j++) if (s.charAt(j) == s.charAt(i)) c++; if (c == 1) return i; }
        return -1;
    }
    static void checkGroups(String[] in, List<List<String>> out, String what) {
        List<String> all = new ArrayList<>();
        for (List<String> g : out) {
            ok(!g.isEmpty(), what + ": empty group");
            for (String w : g) ok(sortedEq(w, g.get(0)), what + ": non-anagrams grouped " + g);
            all.addAll(g);
        }
        for (int i = 0; i < out.size(); i++) for (int j = i + 1; j < out.size(); j++)
            ok(!sortedEq(out.get(i).get(0), out.get(j).get(0)), what + ": anagrams split");
        List<String> a = new ArrayList<>(all), b = new ArrayList<>(Arrays.asList(in));
        Collections.sort(a); Collections.sort(b);
        eq(b, a, what + ": words lost or duplicated");
    }

    // ---------- buggy versions the lesson names ----------
    static int[] twoSumFileFirst(int[] nums, int target) {
        Map<Integer, Integer> m = new HashMap<>();
        for (int i = 0; i < nums.length; i++) { m.put(nums[i], i); Integer j = m.get(target - nums[i]); if (j != null) return new int[]{j, i}; }
        return new int[0];
    }
    static boolean pathNoSeparator(String path) {
        Set<String> v = new HashSet<>(); int x = 0, y = 0; v.add(x + "" + y);
        for (char c : path.toCharArray()) {
            if (c == 'N') y++; else if (c == 'S') y--; else if (c == 'E') x++; else x--;
            if (!v.add(x + "" + y)) return true;
        }
        return false;
    }
    static boolean anagramNoLength(String s, String t) {
        int[] c = new int[26];
        for (int i = 0; i < s.length(); i++) { c[s.charAt(i) - 'a']++; c[t.charAt(i) - 'a']--; }
        for (int x : c) if (x != 0) return false;
        return true;
    }
    static int groupsNoSeparator(String[] strs) {
        Set<String> keys = new HashSet<>();
        for (String s : strs) { int[] c = new int[26]; for (char ch : s.toCharArray()) c[ch - 'a']++; StringBuilder k = new StringBuilder(); for (int x : c) k.append(x); keys.add(k.toString()); }
        return keys.size();
    }
    static long lookups;
    static int longestCounting(int[] nums, boolean startCheck, boolean overSet) {
        Set<Integer> set = new HashSet<>(); for (int x : nums) set.add(x);
        int best = 0;
        Iterable<Integer> it = overSet ? set : Arrays.stream(nums).boxed().collect(Collectors.toList());
        for (int x : it) {
            if (startCheck) { lookups++; if (set.contains(x - 1)) continue; }
            int cur = x;
            while (true) { lookups++; if (!set.contains(cur + 1)) break; cur++; }
            best = Math.max(best, cur - x + 1);
        }
        return best;
    }
    static List<String> decodeOneDigit(String str) {
        List<String> out = new ArrayList<>(); int i = 0;
        while (i < str.length()) { int len = str.charAt(i) - '0'; out.add(str.substring(i + 2, i + 2 + len)); i += 2 + len; }
        return out;
    }
    static boolean isoIntegerCompare(String s, String t) {
        Map<Character, Integer> a = new HashMap<>(), b = new HashMap<>();
        for (int i = 0; i < s.length(); i++) if (a.put(s.charAt(i), i) != b.put(t.charAt(i), i)) return false;
        return true;
    }
    static boolean isoForwardOnly(String s, String t) {
        Map<Character, Character> f = new HashMap<>();
        for (int i = 0; i < s.length(); i++) { Character p = f.putIfAbsent(s.charAt(i), t.charAt(i)); if (p != null && p != t.charAt(i)) return false; }
        return true;
    }
    static boolean sudokuWrongBox(char[][] board) {
        boolean[][] row = new boolean[9][9], col = new boolean[9][9], box = new boolean[9][9];
        for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') continue;
            int d = board[r][c] - '1', b = r / 3 + c / 3;
            if (row[r][d] || col[c][d] || box[b][d]) return false;
            row[r][d] = col[c][d] = box[b][d] = true;
        }
        return true;
    }
    static int firstUniqueAlphabetical(String s) {
        int[] c = new int[26]; for (char ch : s.toCharArray()) c[ch - 'a']++;
        for (int l = 0; l < 26; l++) if (c[l] == 1) return s.indexOf((char) ('a' + l));
        return -1;
    }
    static class BrokenPoint {
        final int x, y; BrokenPoint(int x, int y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) { return o instanceof BrokenPoint p && p.x == x && p.y == y; }
    }
    static class HashOnlyPoint {
        final int x, y; HashOnlyPoint(int x, int y) { this.x = x; this.y = y; }
        @Override public int hashCode() { return 31 * x + y; }
    }
    static char[][] emptyBoard() { char[][] b = new char[9][9]; for (char[] r : b) Arrays.fill(r, '.'); return b; }

    public static void main(String[] args) {
        // ---------- Chapter 1: Contains Duplicate + the wall ----------
        var cd = new B_containsDuplicate();
        eq(true, cd.containsDuplicate(new int[]{1, 2, 3, 1}), "dup LC1");
        eq(false, cd.containsDuplicate(new int[]{1, 2, 3, 4}), "dup LC2");
        eq(true, cd.containsDuplicate(new int[]{1, 1, 1, 3, 3, 4, 3, 2, 4, 2}), "dup LC3");
        eq(false, cd.containsDuplicate(new int[]{}), "dup empty");
        eq(false, cd.containsDuplicate(new int[]{7}), "dup single");
        eq(true, cd.containsDuplicate(new int[]{Integer.MIN_VALUE, Integer.MAX_VALUE, Integer.MIN_VALUE}), "dup extremes");
        eq(true, cd.containsDuplicateSorted(new int[]{1, 2, 3, 1}), "dupSorted LC1");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(0, 9, -6, 6);
            eq(bruteDup(a), cd.containsDuplicate(a.clone()), "containsDuplicate " + Arrays.toString(a));
            eq(bruteDup(a), cd.containsDuplicateSorted(a.clone()), "containsDuplicateSorted " + Arrays.toString(a));
        }
        {   // catch the bug: Arrays.asList(int[]) makes a set of one array
            int[] nums = {1, 2};
            eq(true, nums.length != new HashSet<>(Arrays.asList(nums)).size(), "asList bug reports [1, 2] as a duplicate");
            eq(false, nums.length != Arrays.stream(nums).boxed().collect(Collectors.toSet()).size(), "boxed fix");
            eq(2112, "Aa".hashCode(), "Aa hash"); eq(2112, "BB".hashCode(), "BB hash");
            for (int x : new int[]{3, 11, 19}) { int h = Integer.valueOf(x).hashCode(); eq(3, (h ^ (h >>> 16)) & 7, "toy wall hole of " + x); }
        }

        // ---------- Chapter 2: Two Sum ----------
        var ts = new B_twoSum();
        eq(new int[]{0, 1}, ts.twoSum(new int[]{2, 7, 11, 15}, 9), "twoSum LC1");
        eq(new int[]{1, 2}, ts.twoSum(new int[]{3, 2, 4}, 6), "twoSum LC2");
        eq(new int[]{0, 1}, ts.twoSum(new int[]{3, 3}, 6), "twoSum LC3");
        eq(new int[]{0, 1}, ts.twoSum(new int[]{1000000000, -1000000000}, 0), "twoSum bounds");
        eq(new int[]{0, 0}, twoSumFileFirst(new int[]{3, 2, 4}, 6), "catch-the-bug: file first gives [0, 0]");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(0, 8, -5, 5); int target = R.nextInt(13) - 6;
            boolean any = false;
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (a[i] + a[j] == target) any = true;
            int[] got = ts.twoSum(a, target);
            if (!any) eq(0, got.length, "twoSum none " + Arrays.toString(a));
            else ok(got.length == 2 && got[0] != got[1] && got[0] >= 0 && got[1] < a.length && a[got[0]] + a[got[1]] == target, "twoSum " + Arrays.toString(a) + " t=" + target + " got " + Arrays.toString(got));
        }

        // ---------- Chapter 3: Path Crossing + keys ----------
        var pc = new B_pathCrossing(); var pm = new B_pathCrossingManual();
        String longRoute = "E" + "N".repeat(11) + "E".repeat(10) + "S".repeat(10);
        eq(32, longRoute.length(), "route length");
        for (String[] c : new String[][]{{"NES", "false"}, {"NESWW", "true"}, {"NESW", "true"}, {"", "false"}, {longRoute, "false"}}) {
            eq(Boolean.parseBoolean(c[1]), pc.isPathCrossing(c[0]), "path " + c[0]);
            eq(Boolean.parseBoolean(c[1]), pm.isPathCrossing(c[0]), "manual path " + c[0]);
        }
        eq(true, pathNoSeparator(longRoute), "catch-the-bug: no separator reports a crossing");
        for (int t = 0; t < 3000; t++) {
            String p = randStr(12, "NSEW");
            eq(brutePath(p), pc.isPathCrossing(p), "path " + p);
            eq(brutePath(p), pm.isPathCrossing(p), "manual path " + p);
        }
        {
            Set<Long> packed = new HashSet<>(); Set<String> pairs = new HashSet<>();
            int[] vals = {Integer.MIN_VALUE, -1, 0, 1, 31, Integer.MAX_VALUE};
            for (int x : vals) for (int y : vals) { packed.add(B_pathCrossingManual.pack(x, y)); pairs.add(x + "," + y); }
            for (int t = 0; t < 3000; t++) { int x = R.nextInt(), y = R.nextInt(); packed.add(B_pathCrossingManual.pack(x, y)); pairs.add(x + "," + y); }
            eq(pairs.size(), packed.size(), "pack is collision-free");
            int broken = 0;
            for (int t = 0; t < 1000; t++) { Set<BrokenPoint> s = new HashSet<>(); s.add(new BrokenPoint(0, 0)); s.add(new BrokenPoint(0, 0)); if (s.size() == 2) broken++; }
            ok(broken > 800, "equals without hashCode usually keeps both: " + broken + "/1000");
            Set<HashOnlyPoint> h = new HashSet<>(); h.add(new HashOnlyPoint(0, 0)); h.add(new HashOnlyPoint(0, 0));
            eq(2, h.size(), "hashCode without equals always keeps both");
            Set<List<Integer>> set = new HashSet<>(); List<Integer> list = new ArrayList<>(List.of(1, 2)); set.add(list);
            eq(994, List.of(1, 2).hashCode(), "hash [1,2]"); eq(30817, List.of(1, 2, 3).hashCode(), "hash [1,2,3]");
            list.add(3);
            eq(false, set.contains(list), "mutated key: contains(list)");
            eq(false, set.contains(List.of(1, 2)), "mutated key: contains([1, 2])");
            Integer a = 127, b = 127, c = 1000, d = 1000;
            eq(true, a == b, "Integer cache 127"); eq(false, c == d, "Integer 1000 ==");
            eq(true, c.equals(d), "Integer equals");
        }

        // ---------- Chapter 4: Valid Anagram ----------
        var an = new B_isAnagram();
        eq(true, an.isAnagram("anagram", "nagaram"), "anagram LC1"); eq(false, an.isAnagram("rat", "car"), "anagram LC2");
        eq(true, an.isAnagram("", ""), "anagram empty"); eq(false, an.isAnagram("ab", "abx"), "anagram length");
        eq(true, anagramNoLength("ab", "abx"), "catch-the-bug: no length check says true");
        eq(true, an.isAnagramUnicode("héllo😀", "😀olléh"), "unicode anagram");
        eq(false, an.isAnagramUnicode("é", "e"), "unicode not anagram");
        for (int t = 0; t < 4000; t++) {
            String s = randStr(6, "abc"), u = randStr(6, "abc");
            String tt = R.nextBoolean() ? new StringBuilder(s).reverse().toString() : u;
            eq(sortedEq(s, tt), an.isAnagram(s, tt), "isAnagram " + s + " " + tt);
            String us = randStr(5, "aé😀b"), ut = R.nextBoolean() ? new StringBuilder(us).reverse().toString() : randStr(5, "aé😀b");
            eq(sortedCodePointsEq(us, ut), an.isAnagramUnicode(us, ut), "isAnagramUnicode");
        }

        // ---------- Chapter 5: Group Anagrams ----------
        var ga = new B_groupAnagrams();
        String[] lc = {"eat", "tea", "tan", "ate", "nat", "bat"};
        checkGroups(lc, ga.groupAnagrams(lc), "group LC1"); eq(3, ga.groupAnagrams(lc).size(), "group LC1 size");
        checkGroups(lc, ga.groupAnagramsByCount(lc), "groupByCount LC1");
        checkGroups(new String[]{""}, ga.groupAnagrams(new String[]{""}), "group empty string");
        checkGroups(new String[]{"", "", "a"}, ga.groupAnagramsByCount(new String[]{"", "", "a"}), "groupByCount empties");
        String w1 = "a" + "b".repeat(12), w2 = "a".repeat(11) + "bb";
        eq(1, groupsNoSeparator(new String[]{w1, w2}), "catch-the-bug: no separator merges non-anagrams");
        checkGroups(new String[]{w1, w2}, ga.groupAnagramsByCount(new String[]{w1, w2}), "separator keeps them apart");
        eq(2, ga.groupAnagramsByCount(new String[]{w1, w2}).size(), "two groups");
        { Map<int[], Integer> m = new HashMap<>(); m.put(new int[]{1, 2}, 1); m.put(new int[]{1, 2}, 2); eq(2, m.size(), "int[] keys use identity"); }
        for (int t = 0; t < 2000; t++) {
            String[] in = new String[R.nextInt(8)];
            for (int i = 0; i < in.length; i++) in[i] = randStr(4, "abc");
            checkGroups(in, ga.groupAnagrams(in.clone()), "groupAnagrams");
            checkGroups(in, ga.groupAnagramsByCount(in.clone()), "groupAnagramsByCount");
        }

        // ---------- Chapter 6: Longest Consecutive ----------
        var lcs = new B_longestConsecutive();
        eq(4, lcs.longestConsecutive(new int[]{100, 4, 200, 1, 3, 2}), "lcs LC1");
        eq(9, lcs.longestConsecutive(new int[]{0, 3, 7, 2, 5, 8, 4, 6, 0, 1}), "lcs LC2");
        eq(3, lcs.longestConsecutive(new int[]{1, 0, 1, 2}), "lcs LC3");
        eq(0, lcs.longestConsecutive(new int[]{}), "lcs empty");
        eq(1, lcs.longestConsecutive(new int[]{-1000000000, 1000000000}), "lcs bounds");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(0, 12, -8, 8);
            eq(bruteLongest(a), lcs.longestConsecutive(a), "longestConsecutive " + Arrays.toString(a));
        }
        {   // performance claims: 2m lookups; the buggy variants go quadratic on the named inputs
            int n = 2000; int[] dupStart = new int[2 * n - 1];
            for (int i = 0; i < n; i++) dupStart[i] = 1;
            for (int i = 0; i < n - 1; i++) dupStart[n + i] = i + 2;
            lookups = 0; eq(n, longestCounting(dupStart, true, true), "counted, set"); long good = lookups;
            eq(2L * n, good, "exactly two lookups per distinct number");
            lookups = 0; longestCounting(dupStart, true, false); ok(lookups > 100 * good, "looping over nums with duplicate starts is quadratic: " + lookups);
            int[] line = IntStream.rangeClosed(1, n).toArray();
            lookups = 0; longestCounting(line, false, true); ok(lookups >= (long) n * (n + 1) / 2, "no start check is quadratic: " + lookups);
            int[] big = new int[400000];
            for (int i = 0; i < 200000; i++) big[i] = 1;
            for (int i = 0; i < 200000; i++) big[200000 + i] = i + 2;
            long t0 = System.nanoTime(); eq(200001, lcs.longestConsecutive(big), "big run");
            ok(System.nanoTime() - t0 < 3_000_000_000L, "longestConsecutive is fast on duplicate starts");
        }

        // ---------- Chapter 7: Encode and Decode Strings ----------
        var co = new B_codec(); var ce = new B_codecEscaped();
        eq("3#a#b0#1#c", co.encode(List.of("a#b", "", "c")), "figure encoding");
        eq(List.of("a#b", ""), co.decode("3#a#b0#"), "trace decode");
        eq("", co.encode(List.of())); eq("0#", co.encode(List.of("")), "[\"\"] encoding");
        eq(List.of(), co.decode("")); eq(List.of(""), co.decode("0#"), "decode 0#");
        eq(String.join(",", List.of("a,b")), String.join(",", List.of("a", "b")), "comma join collides");
        eq("", ce.encodeEscaped(List.of())); eq(";", ce.encodeEscaped(List.of("")), "escaped [\"\"]");
        eq("12#hello world!", co.encode(List.of("hello world!")), "12-char header");
        boolean threw = false;
        try { decodeOneDigit("12#hello world!"); } catch (StringIndexOutOfBoundsException e) { threw = true; }
        eq(true, threw, "catch-the-bug: one-digit header throws");
        String alpha = "ab#,;/0123456789 é😀\n";
        for (int t = 0; t < 4000; t++) {
            List<String> in = new ArrayList<>();
            int m = R.nextInt(6);
            for (int i = 0; i < m; i++) in.add(R.nextInt(4) == 0 ? "" : randStr(R.nextInt(5) == 0 ? 14 : 4, alpha));
            eq(in, co.decode(co.encode(in)), "codec round trip " + in);
            eq(in, ce.decodeEscaped(ce.encodeEscaped(in)), "escaped round trip " + in);
        }

        // ---------- Side quest 1: Isomorphic Strings + Word Pattern ----------
        var iso = new B_isIsomorphic();
        eq(true, iso.isIsomorphic("egg", "add"), "iso LC1"); eq(false, iso.isIsomorphic("foo", "bar"), "iso LC2");
        eq(true, iso.isIsomorphic("paper", "title"), "iso LC3"); eq(false, iso.isIsomorphic("badc", "baba"), "iso badc");
        eq(true, isoForwardOnly("badc", "baba"), "catch-the-bug: forward-only says true");
        String ab = "ab".repeat(100), cd2 = "cd".repeat(100);
        eq(true, iso.isIsomorphic(ab, cd2), "iso long"); eq(false, isoIntegerCompare(ab, cd2), "reveal: Integer != fails on long strings");
        eq(true, isoIntegerCompare("abab", "cdcd"), "Integer != fine on short strings");
        eq(true, iso.wordPattern("abba", "dog cat cat dog"), "wp LC1"); eq(false, iso.wordPattern("abba", "dog cat cat fish"), "wp LC2");
        eq(false, iso.wordPattern("aaaa", "dog cat cat dog"), "wp LC3"); eq(false, iso.wordPattern("abba", "dog dog dog dog"), "wp two-way");
        eq(false, iso.wordPattern("aaa", "dog dog"), "wp length");
        for (int t = 0; t < 4000; t++) {
            int n = R.nextInt(7); String s = "", u = "";
            for (int i = 0; i < n; i++) { s += "abc".charAt(R.nextInt(3)); u += "xyz".charAt(R.nextInt(3)); }
            eq(bruteIso(s, u), iso.isIsomorphic(s, u), "isIsomorphic " + s + " " + u);
            String p = randStr(5, "ab"); int wc = Math.max(1, p.length() + R.nextInt(3) - 1);
            String[] ws = new String[wc]; for (int i = 0; i < wc; i++) ws[i] = new String[]{"dog", "cat", "fish"}[R.nextInt(3)];
            String sent = String.join(" ", ws);
            if (!p.isEmpty()) eq(bruteWordPattern(p, sent), iso.wordPattern(p, sent), "wordPattern " + p + " / " + sent);
        }

        // ---------- Side quest 2: Contains Duplicate II ----------
        var nb = new B_containsNearbyDuplicate();
        eq(true, nb.containsNearbyDuplicate(new int[]{1, 2, 3, 1}, 3), "nearby LC1");
        eq(false, nb.containsNearbyDuplicate(new int[]{1, 2, 3, 1}, 2), "nearby figure k=2");
        eq(true, nb.containsNearbyDuplicate(new int[]{1, 0, 1, 1}, 1), "nearby LC2");
        eq(false, nb.containsNearbyDuplicate(new int[]{1, 2, 3, 1, 2, 3}, 2), "nearby LC3");
        eq(false, nb.containsNearbyDuplicate(new int[]{4, 4}, 0), "nearby k=0");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(0, 9, 0, 4); int k = R.nextInt(a.length + 2);
            eq(bruteNearby(a, k), nb.containsNearbyDuplicate(a, k), "nearby " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 3: Top K Frequent ----------
        var tk = new B_topKFrequent();
        {
            int[] got = tk.topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2); Arrays.sort(got); eq(new int[]{1, 2}, got, "topK LC1");
            eq(new int[]{1}, tk.topKFrequent(new int[]{1}, 1), "topK LC2");
        }
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 12, -3, 4);
            Map<Integer, Integer> f = new HashMap<>(); for (int x : a) f.merge(x, 1, Integer::sum);
            int k = 1 + R.nextInt(f.size());
            int[] got = tk.topKFrequent(a, k);
            eq(k, got.length, "topK length");
            Set<Integer> chosen = new HashSet<>(); for (int x : got) chosen.add(x);
            eq(k, chosen.size(), "topK distinct");
            for (int x : chosen) ok(f.containsKey(x), "topK value present");
            for (int x : chosen) for (int y : f.keySet()) if (!chosen.contains(y)) ok(f.get(x) >= f.get(y), "topK " + Arrays.toString(a) + " k=" + k);
        }

        // ---------- Side quest 4: Valid Sudoku ----------
        var vs = new B_isValidSudoku();
        String[] solved = {"534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "345286179"};
        {
            char[][] full = new char[9][]; for (int r = 0; r < 9; r++) full[r] = solved[r].toCharArray();
            eq(true, vs.isValidSudoku(full), "solved board valid"); eq(true, bruteSudoku(full), "oracle agrees");
            char[][] b = emptyBoard(); b[0][3] = '5'; b[3][0] = '5';
            eq(true, vs.isValidSudoku(b), "(0,3) and (3,0) valid"); eq(false, sudokuWrongBox(b), "catch-the-bug: r/3 + c/3 rejects it");
            char[][] same = emptyBoard(); same[0][0] = '5'; same[1][1] = '5'; eq(false, vs.isValidSudoku(same), "same box");
            eq(true, vs.isValidSudoku(emptyBoard()), "empty board");
        }
        for (int t = 0; t < 3000; t++) {
            char[][] b = emptyBoard();
            if (R.nextBoolean()) { for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) if (R.nextInt(3) == 0) b[r][c] = solved[r].charAt(c); if (R.nextInt(3) == 0) b[R.nextInt(9)][R.nextInt(9)] = (char) ('1' + R.nextInt(9)); }
            else { int fills = R.nextInt(12); for (int i = 0; i < fills; i++) b[R.nextInt(9)][R.nextInt(9)] = (char) ('1' + R.nextInt(9)); }
            eq(bruteSudoku(b), vs.isValidSudoku(b), "isValidSudoku random");
        }

        // ---------- Side quest 5: Happy Number ----------
        var hp = new B_isHappy();
        int[] happy = {1, 7, 10, 13, 19, 23, 28, 31, 32, 44, 49, 68, 70, 79, 82, 86, 91, 94, 97, 100};
        Set<Integer> happySet = new HashSet<>(); for (int h : happy) happySet.add(h);
        for (int n = 1; n <= 100; n++) { eq(happySet.contains(n), hp.isHappy(n), "isHappy " + n); eq(happySet.contains(n), hp.isHappyFloyd(n), "isHappyFloyd " + n); }
        eq(false, hp.isHappy(2), "happy LC2"); eq(true, hp.isHappy(19), "happy LC1");
        eq(bruteHappy(Integer.MAX_VALUE), hp.isHappy(Integer.MAX_VALUE), "happy max"); eq(bruteHappy(Integer.MAX_VALUE), hp.isHappyFloyd(Integer.MAX_VALUE), "floyd max");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(t < 1500 ? 5000 : Integer.MAX_VALUE);
            eq(bruteHappy(n), hp.isHappy(n), "isHappy " + n); eq(bruteHappy(n), hp.isHappyFloyd(n), "isHappyFloyd " + n);
        }

        // ---------- Side quest 6: First Unique Character ----------
        var fu = new B_firstUniqChar();
        eq(0, fu.firstUniqChar("leetcode"), "fu LC1"); eq(2, fu.firstUniqChar("loveleetcode"), "fu LC2"); eq(-1, fu.firstUniqChar("aabb"), "fu LC3");
        eq(8, firstUniqueAlphabetical("loveleetcode"), "catch-the-bug: alphabetical scan returns 8");
        for (int t = 0; t < 4000; t++) { String s = randStr(9, "abcd"); eq(bruteFirstUnique(s), fu.firstUniqChar(s), "firstUniqChar " + s); }

        System.out.println("OK hashing: " + cases + " checks passed");
    }
}
