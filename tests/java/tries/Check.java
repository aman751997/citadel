import java.util.*;

// Runs every Java solution shown in tries.mdx against independent oracles: a HashSet / HashMap model
// with linear scans for the design problems, a plain per-word grid search for Word Search II, an O(n²)
// pair loop for Maximum XOR, and sort-then-filter for the suggestion problems. Hand-picked edge cases
// first, then thousands of random small inputs. It also proves that each "catch the bug" version the
// lesson names fails on the input the lesson names.
public class Check {
    static final Random R = new Random(16);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but got " + actual);
    }
    static String randWord(int minLen, int maxLen, int letters) {
        int len = minLen + R.nextInt(maxLen - minLen + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < len; i++) sb.append((char) ('a' + R.nextInt(letters)));
        return sb.toString();
    }
    static boolean matches(String word, String pattern) {
        if (word.length() != pattern.length()) return false;
        for (int i = 0; i < word.length(); i++) if (pattern.charAt(i) != '.' && pattern.charAt(i) != word.charAt(i)) return false;
        return true;
    }
    static List<String> sorted(List<String> xs) { List<String> c = new ArrayList<>(xs); Collections.sort(c); return c; }

    // ---- plain per-word grid search (the method Word Search II replaces) ----
    static boolean traceable(char[][] b, String w) {
        boolean[][] used = new boolean[b.length][b[0].length];
        for (int r = 0; r < b.length; r++) for (int c = 0; c < b[0].length; c++) if (trace(b, used, r, c, w, 0)) return true;
        return false;
    }
    static boolean trace(char[][] b, boolean[][] used, int r, int c, String w, int i) {
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || used[r][c] || b[r][c] != w.charAt(i)) return false;
        if (i == w.length() - 1) return true;
        used[r][c] = true;
        boolean ok = trace(b, used, r + 1, c, w, i + 1) || trace(b, used, r - 1, c, w, i + 1) || trace(b, used, r, c + 1, w, i + 1) || trace(b, used, r, c - 1, w, i + 1);
        used[r][c] = false;
        return ok;
    }
    static char[][] grid(String... rows) { char[][] g = new char[rows.length][]; for (int i = 0; i < rows.length; i++) g[i] = rows[i].toCharArray(); return g; }
    static char[][] copy(char[][] g) { char[][] c = new char[g.length][]; for (int i = 0; i < g.length; i++) c[i] = g[i].clone(); return c; }

    // ---- the buggy versions the lesson names ----
    static boolean searchForgetsFlag(List<String> inserted, String word) {      // returns "walk finished"
        for (String w : inserted) if (w.startsWith(word)) return true;
        return false;
    }
    static class BugDict {                                                       // returns after the first child
        BugDict[] children = new BugDict[26]; boolean isEnd;
        void add(String w) { BugDict n = this; for (char c : w.toCharArray()) { if (n.children[c - 'a'] == null) n.children[c - 'a'] = new BugDict(); n = n.children[c - 'a']; } n.isEnd = true; }
        boolean search(String w, int i) {
            if (i == w.length()) return isEnd;
            char c = w.charAt(i);
            if (c != '.') { BugDict n = children[c - 'a']; return n != null && n.search(w, i + 1); }
            for (BugDict n : children) if (n != null) return n.search(w, i + 1);
            return false;
        }
    }
    static class BugNode { BugNode[] children = new BugNode[26]; int childCount; String word; }
    static List<String> findWordsNoNull(char[][] board, String[] words) {         // forgets node.word = null
        BugNode root = new BugNode();
        for (String w : words) { BugNode n = root; for (char c : w.toCharArray()) { int i = c - 'a'; if (n.children[i] == null) { n.children[i] = new BugNode(); n.childCount++; } n = n.children[i]; } n.word = w; }
        List<String> found = new ArrayList<>();
        for (int r = 0; r < board.length; r++) for (int c = 0; c < board[0].length; c++) bugDfs(board, r, c, root, found);
        return found;
    }
    static void bugDfs(char[][] b, int r, int c, BugNode parent, List<String> found) {
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] == '#') return;
        char ch = b[r][c]; BugNode node = parent.children[ch - 'a'];
        if (node == null) return;
        if (node.word != null) found.add(node.word);
        b[r][c] = '#';
        bugDfs(b, r + 1, c, node, found); bugDfs(b, r - 1, c, node, found); bugDfs(b, r, c + 1, node, found); bugDfs(b, r, c - 1, node, found);
        b[r][c] = ch;
        if (node.childCount == 0 && node.word == null) { parent.children[ch - 'a'] = null; parent.childCount--; }
    }
    static class BugCounts {                                                     // erase forgets pass--
        BugCounts[] children = new BugCounts[26]; int pass, end;
        void insert(String w) { BugCounts n = this; for (char c : w.toCharArray()) { if (n.children[c - 'a'] == null) n.children[c - 'a'] = new BugCounts(); n = n.children[c - 'a']; n.pass++; } n.end++; }
        void erase(String w) { BugCounts n = this; for (char c : w.toCharArray()) n = n.children[c - 'a']; n.end--; }
        int countWordsStartingWith(String p) { BugCounts n = this; for (char c : p.toCharArray()) { n = n.children[c - 'a']; if (n == null) return 0; } return n.pass; }
    }
    static String longestRootBug(List<String> roots, String word) {              // keeps walking past the first bloom
        String best = word; boolean any = false;
        for (int i = 1; i <= word.length(); i++) if (roots.contains(word.substring(0, i))) { best = word.substring(0, i); any = true; }
        return any ? best : word;
    }
    static String longestIgnoringChain(String[] words) {                          // forgets "every prefix is a word"
        String best = "";
        for (String w : words) if (w.length() > best.length() || (w.length() == best.length() && w.compareTo(best) < 0)) best = w;
        return best;
    }
    static List<String> firstThreeUnsorted(String[] products, String prefix) {    // inserts without sorting first
        List<String> out = new ArrayList<>();
        for (String p : products) if (p.startsWith(prefix) && out.size() < 3) out.add(p);
        return out;
    }
    static int maxXorLowBitFirst(int[] nums) {                                    // walks bit 0 first
        int[][] ch = new int[nums.length * 32 + 2][2]; int cnt = 1, best = 0;
        for (int x : nums) {
            int n = 0;
            for (int b = 0; b <= 30; b++) { int bit = (x >> b) & 1; if (ch[n][bit] == 0) ch[n][bit] = cnt++; n = ch[n][bit]; }
            n = 0; int xor = 0;
            for (int b = 0; b <= 30; b++) { int bit = (x >> b) & 1; if (ch[n][bit ^ 1] != 0) { xor |= 1 << b; n = ch[n][bit ^ 1]; } else n = ch[n][bit]; }
            best = Math.max(best, xor);
        }
        return best;
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: Implement Trie ----------
        {
            var t = new B_Trie().new Trie();
            t.insert("apple");
            eq(true, t.search("apple"), "LC: search apple");
            eq(false, t.search("app"), "LC: search app before insert");
            eq(true, t.startsWith("app"), "LC: startsWith app");
            t.insert("app");
            eq(true, t.search("app"), "LC: search app after insert");
            eq(false, t.search("appl"), "prefix only");
            eq(false, t.startsWith("b"), "missing branch");
            eq(false, t.search("apples"), "longer than any word");
            eq(true, searchForgetsFlag(List.of("apple"), "app"), "catch-the-bug: search without isEnd says app is stored");
            for (int trial = 0; trial < 1500; trial++) {
                var trie = new B_Trie().new Trie();
                var map = new B_MapTrie().new MapTrie();
                Set<String> model = new HashSet<>();
                for (int op = 0; op < 30; op++) {
                    String w = randWord(1, 5, 3);
                    switch (R.nextInt(3)) {
                        case 0 -> { trie.insert(w); map.insert(w); model.add(w); }
                        case 1 -> { eq(model.contains(w), trie.search(w), "Trie.search " + w); eq(model.contains(w), map.search(w), "MapTrie.search " + w); }
                        default -> {
                            boolean any = false; for (String m : model) if (m.startsWith(w)) any = true;
                            eq(any, trie.startsWith(w), "Trie.startsWith " + w); eq(any, map.startsWith(w), "MapTrie.startsWith " + w);
                        }
                    }
                }
            }
            // the map version takes any characters, not just a..z
            var uni = new B_MapTrie().new MapTrie();
            uni.insert("café"); uni.insert("中文"); uni.insert("Ωmega");
            eq(true, uni.search("café"), "unicode search");
            eq(false, uni.search("caf"), "unicode prefix is not a word");
            eq(true, uni.startsWith("中"), "unicode startsWith");
            eq(false, uni.startsWith("ω"), "unicode case matters");
        }

        // ---------- Chapter 2: Design Add and Search Words ----------
        {
            var d = new B_WordDictionary().new WordDictionary();
            d.addWord("bad"); d.addWord("dad"); d.addWord("mad");
            eq(false, d.search("pad"), "LC: pad");
            eq(true, d.search("bad"), "LC: bad");
            eq(true, d.search(".ad"), "LC: .ad");
            eq(true, d.search("b.."), "LC: b..");
            eq(false, d.search(".."), "trace: .. has no two-letter word");
            eq(false, d.search("...."), "too long");
            var d2 = new B_WordDictionary().new WordDictionary();
            d2.addWord("ax"); d2.addWord("by");
            eq(true, d2.search(".y"), ".y finds by");
            BugDict bug = new BugDict(); bug.add("ax"); bug.add("by");
            eq(false, bug.search(".y", 0), "catch-the-bug: returning after the first child misses by");
            for (int trial = 0; trial < 1500; trial++) {
                var dict = new B_WordDictionary().new WordDictionary();
                List<String> model = new ArrayList<>();
                for (int op = 0; op < 25; op++) {
                    if (R.nextInt(3) == 0) { String w = randWord(1, 4, 3); dict.addWord(w); model.add(w); }
                    else {
                        StringBuilder p = new StringBuilder(randWord(1, 4, 3));
                        for (int i = 0; i < p.length(); i++) if (R.nextInt(3) == 0) p.setCharAt(i, '.');
                        boolean any = false; for (String m : model) if (matches(m, p.toString())) any = true;
                        eq(any, dict.search(p.toString()), "WordDictionary.search " + p + " in " + model);
                    }
                }
            }
        }

        // ---------- Chapter 3: Word Search II ----------
        {
            char[][] lc = grid("oaan", "etae", "ihkr", "iflv");
            char[][] before = copy(lc);
            eq(List.of("eat", "oath"), sorted(new B_findWords().findWords(lc, new String[]{"oath", "pea", "eat", "rain"})), "LC example 1");
            eq(true, Arrays.deepEquals(before, lc), "board restored after the search");
            eq(List.of(), new B_findWords().findWords(grid("ab", "cd"), new String[]{"abcb"}), "LC example 2");
            eq(List.of("a"), new B_findWords().findWords(grid("aa"), new String[]{"a"}), "one report per word");
            eq(List.of("a", "a"), findWordsNoNull(grid("aa"), new String[]{"a"}), "catch-the-bug: no nulling reports a twice");
            eq(List.of("oa", "oaa"), sorted(new B_findWords().findWords(grid("oaa"), new String[]{"oa", "oaa"})), "a word inside a longer word");
            for (int trial = 0; trial < 2500; trial++) {
                int rows = 1 + R.nextInt(4), cols = 1 + R.nextInt(4);
                char[][] b = new char[rows][cols];
                for (char[] row : b) for (int c = 0; c < cols; c++) row[c] = (char) ('a' + R.nextInt(3));
                Set<String> uniq = new LinkedHashSet<>();
                int n = 1 + R.nextInt(8);
                while (uniq.size() < n) uniq.add(randWord(1, 6, 3));
                String[] words = uniq.toArray(new String[0]);
                List<String> expect = new ArrayList<>();
                for (String w : words) if (traceable(b, w)) expect.add(w);
                char[][] snapshot = copy(b);
                eq(sorted(expect), sorted(new B_findWords().findWords(b, words)), "findWords " + Arrays.deepToString(snapshot) + " " + Arrays.toString(words));
                eq(true, Arrays.deepEquals(snapshot, b), "board restored");
            }
        }

        // ---------- Side quest 1: counts per node, erase ----------
        {
            var t = new B_TrieII().new Trie();
            t.insert("apple"); t.insert("apple");
            eq(2, t.countWordsEqualTo("apple"), "LC: two apples");
            eq(2, t.countWordsStartingWith("app"), "LC: two start with app");
            t.erase("apple");
            eq(1, t.countWordsEqualTo("apple"), "LC: one apple after erase");
            eq(1, t.countWordsStartingWith("app"), "LC: one starts with app");
            t.erase("apple");
            eq(0, t.countWordsStartingWith("app"), "LC: branch cut");
            eq(0, t.countWordsEqualTo("apple"), "LC: none left");
            BugCounts bug = new BugCounts(); bug.insert("apple"); bug.erase("apple");
            eq(1, bug.countWordsStartingWith("app"), "catch-the-bug: forgetting pass-- leaves countWordsStartingWith(app) at 1");
            for (int trial = 0; trial < 1500; trial++) {
                var trie = new B_TrieII().new Trie();
                Map<String, Integer> bag = new HashMap<>();
                for (int op = 0; op < 40; op++) {
                    int kind = R.nextInt(4);
                    String w = randWord(1, 4, 3);
                    if (kind == 0) { trie.insert(w); bag.merge(w, 1, Integer::sum); }
                    else if (kind == 1) eq(bag.getOrDefault(w, 0), trie.countWordsEqualTo(w), "countWordsEqualTo " + w);
                    else if (kind == 2) {
                        int c = 0; for (var e : bag.entrySet()) if (e.getKey().startsWith(w)) c += e.getValue();
                        eq(c, trie.countWordsStartingWith(w), "countWordsStartingWith " + w + " " + bag);
                    } else if (!bag.isEmpty()) {
                        List<String> keys = new ArrayList<>(bag.keySet()); Collections.sort(keys);
                        String x = keys.get(R.nextInt(keys.size()));
                        trie.erase(x);
                        if (bag.merge(x, -1, Integer::sum) == 0) bag.remove(x);
                    }
                }
            }
        }

        // ---------- Side quest 2: Replace Words ----------
        {
            var s = new B_replaceWords();
            eq("the cat was rat by the bat", s.replaceWords(List.of("cat", "bat", "rat"), "the cattle was rattled by the battery"), "LC 1");
            eq("a a b c", s.replaceWords(List.of("a", "b", "c"), "aadsfasf absbs bbab cadsfafs"), "LC 2");
            eq("a", s.replaceWords(List.of("a", "aa", "aaa"), "aaaa"), "shortest root wins");
            eq("aaa", longestRootBug(List.of("a", "aa", "aaa"), "aaaa"), "catch-the-bug: walking past the first bloom gives aaa");
            eq("ca do do ca crab", s.replaceWords(List.of("ca", "cat", "do"), "cattle dog dodge cabin crab"), "practice example");
            for (int trial = 0; trial < 3000; trial++) {
                List<String> roots = new ArrayList<>();
                for (int i = 0, n = 1 + R.nextInt(5); i < n; i++) roots.add(randWord(1, 3, 3));
                List<String> words = new ArrayList<>(), expect = new ArrayList<>();
                for (int i = 0, n = 1 + R.nextInt(5); i < n; i++) {
                    String w = randWord(1, 5, 3); words.add(w);
                    String best = null;
                    for (String r : roots) if (w.startsWith(r) && (best == null || r.length() < best.length())) best = r;
                    expect.add(best == null ? w : best);
                }
                eq(String.join(" ", expect), s.replaceWords(roots, String.join(" ", words)), "replaceWords " + roots + " " + words);
            }
        }

        // ---------- Side quest 3: Longest Word in Dictionary ----------
        {
            eq("world", new B_longestWord().longestWord(new String[]{"w", "wo", "wor", "worl", "world"}), "LC 1");
            String[] lc2 = {"a", "banana", "app", "appl", "ap", "apply", "apple"};
            eq("apple", new B_longestWord().longestWord(lc2), "LC 2");
            eq("banana", longestIgnoringChain(lc2), "catch-the-bug: ignoring the chain rule returns banana");
            eq("", new B_longestWord().longestWord(new String[]{"ab", "bc"}), "no buildable word");
            eq("mild", new B_longestWord().longestWord(new String[]{"m", "mo", "moo", "mood", "mi", "mil", "mild", "milk"}), "three-way tie");
            var reuse = new B_longestWord();
            eq("world", reuse.longestWord(new String[]{"w", "wo", "wor", "worl", "world"}), "first call");
            eq("a", reuse.longestWord(new String[]{"a", "bc"}), "second call on the same object resets best");
            for (int trial = 0; trial < 3000; trial++) {
                Set<String> set = new LinkedHashSet<>();
                for (int i = 0, n = 1 + R.nextInt(10); i < n; i++) set.add(randWord(1, 4, 3));
                String[] words = set.toArray(new String[0]);
                String best = "";
                for (String w : words) {
                    boolean ok = true;
                    for (int i = 1; i < w.length(); i++) if (!set.contains(w.substring(0, i))) ok = false;
                    if (ok && (w.length() > best.length() || (w.length() == best.length() && w.compareTo(best) < 0))) best = w;
                }
                eq(best, new B_longestWord().longestWord(words), "longestWord " + set);
            }
        }

        // ---------- Side quest 4: Search Suggestions System ----------
        {
            String[] products = {"mobile", "mouse", "moneypot", "monitor", "mousepad"};
            List<List<String>> lc1 = List.of(List.of("mobile", "moneypot", "monitor"), List.of("mobile", "moneypot", "monitor"), List.of("mouse", "mousepad"), List.of("mouse", "mousepad"), List.of("mouse", "mousepad"));
            eq(lc1, new B_suggestedProducts().suggestedProducts(products, "mouse"), "LC 1 (trie)");
            eq(lc1, new B_suggestedProducts().suggestedProductsSorted(products, "mouse"), "LC 1 (binary search)");
            eq(List.of("mobile", "mouse", "moneypot"), firstThreeUnsorted(products, "m"), "catch-the-bug: no sort shows insertion order");
            List<List<String>> lc2 = List.of(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
            eq(lc2, new B_suggestedProducts().suggestedProducts(new String[]{"havana"}, "tatiana"), "LC: nothing matches");
            for (int trial = 0; trial < 3000; trial++) {
                String[] ps = new String[1 + R.nextInt(8)];
                for (int i = 0; i < ps.length; i++) ps[i] = randWord(1, 4, 3);
                String word = randWord(1, 4, 3);
                String[] sortedPs = ps.clone(); Arrays.sort(sortedPs);
                List<List<String>> expect = new ArrayList<>();
                for (int k = 1; k <= word.length(); k++) {
                    List<String> three = new ArrayList<>();
                    for (String p : sortedPs) if (p.startsWith(word.substring(0, k)) && three.size() < 3) three.add(p);
                    expect.add(three);
                }
                String[] before = ps.clone();
                eq(expect, new B_suggestedProducts().suggestedProducts(ps, word), "suggestedProducts " + Arrays.toString(ps) + " " + word);
                eq(expect, new B_suggestedProducts().suggestedProductsSorted(ps, word), "suggestedProductsSorted " + Arrays.toString(ps) + " " + word);
                eq(true, Arrays.equals(before, ps), "input array left untouched");
            }
        }

        // ---------- Side quest 5: Maximum XOR of Two Numbers ----------
        {
            var s = new B_findMaximumXOR();
            eq(28, s.findMaximumXOR(new int[]{3, 10, 5, 25, 2, 8}), "LC 1");
            eq(127, s.findMaximumXOR(new int[]{14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70}), "LC 2");
            eq(0, s.findMaximumXOR(new int[]{7}), "single number");
            eq(7, s.findMaximumXOR(new int[]{2, 3, 5}), "non-neighbours in sorted order");
            eq(Integer.MAX_VALUE, s.findMaximumXOR(new int[]{0, Integer.MAX_VALUE}), "extremes");
            eq(19, maxXorLowBitFirst(new int[]{3, 10, 5, 25, 2, 8}), "catch-the-bug: low bit first gives 19");
            for (int trial = 0; trial < 3000; trial++) {
                int[] a = new int[1 + R.nextInt(9)];
                boolean big = R.nextBoolean();
                for (int i = 0; i < a.length; i++) a[i] = big ? R.nextInt(Integer.MAX_VALUE) + (R.nextInt(50) == 0 ? 1 : 0) : R.nextInt(64);
                int expect = 0;
                for (int x : a) for (int y : a) expect = Math.max(expect, x ^ y);
                eq(expect, s.findMaximumXOR(a), "findMaximumXOR " + Arrays.toString(a));
            }
        }

        // ---------- Side quest 6: top-K typeahead ----------
        {
            var t = new B_Typeahead().new Typeahead(2);
            for (String q : new String[]{"car", "car", "cat", "cart", "cat", "car", "cat", "cat", "car", "dog"}) t.record(q);
            eq(List.of("car", "cat"), t.suggest("ca"), "tie on 4 searches, alphabetical");
            eq(List.of("car", "cart"), t.suggest("car"), "car subtree");
            eq(List.of(), t.suggest("x"), "missing branch");
            eq(List.of("car", "cat"), t.suggest(""), "the empty prefix reads the root's list");
            for (int i = 0; i < 4; i++) t.record("cart");
            eq(List.of("cart", "car"), t.suggest("ca"), "cart overtakes with 5 searches");
            for (int trial = 0; trial < 1500; trial++) {
                int k = 1 + R.nextInt(3);
                var ta = new B_Typeahead().new Typeahead(k);
                Map<String, Integer> count = new HashMap<>();
                for (int op = 0; op < 40; op++) {
                    if (R.nextInt(3) > 0) { String w = randWord(1, 4, 3); ta.record(w); count.merge(w, 1, Integer::sum); }
                    else {
                        String p = randWord(0, 3, 3);
                        List<String> all = new ArrayList<>();
                        for (String w : count.keySet()) if (w.startsWith(p)) all.add(w);
                        all.sort((x, y) -> !count.get(x).equals(count.get(y)) ? count.get(y) - count.get(x) : x.compareTo(y));
                        eq(all.subList(0, Math.min(k, all.size())), ta.suggest(p), "suggest " + p + " k=" + k + " " + count);
                    }
                }
            }
        }

        System.out.println("OK tries: " + cases + " checks passed");
    }
}
