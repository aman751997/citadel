import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Exercises every Java block in src/lessons/typeahead.mdx:
//  - TopKTrie against a brute-force oracle ("filter by prefix, sort by score desc then a..z, take k")
//    on thousands of random query sets, every short prefix, the empty prefix and missing prefixes,
//  - the exact lists drawn in the lesson's trie figure (k = 3),
//  - ties, unicode, an ignored empty query, k larger than the matches, k < 1 rejected, immutable results,
//  - the "forgot the node's own query" bug from the lesson, shown failing on the figure's data,
//  - SuggestIndex: readers racing 20,000 swaps only ever see one whole snapshot's answer.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }

    // Written independently of the lesson: the obvious, slow answer.
    static List<String> oracle(Map<String, Long> scores, String prefix, int k) {
        List<String> hits = new ArrayList<>();
        for (String q : scores.keySet()) if (!q.isEmpty() && q.startsWith(prefix)) hits.add(q);
        hits.sort((a, b) -> {
            long sa = scores.get(a), sb = scores.get(b);
            if (sa != sb) return sa > sb ? -1 : 1;
            return a.compareTo(b);
        });
        return hits.subList(0, Math.min(k, hits.size()));
    }

    static B_typeahead.TopKTrie trie(Map<String, Long> m, int k) { return new B_typeahead.TopKTrie(m, k); }

    static Map<String, Long> figure() {
        Map<String, Long> m = new HashMap<>();
        m.put("car", 900L); m.put("cat", 700L); m.put("dog", 600L); m.put("catalog", 500L);
        m.put("card", 400L); m.put("door", 350L); m.put("care", 150L);
        return m;
    }

    public static void main(String[] args) throws Exception {
        figureLists();
        edgeCases();
        randomAgainstOracle();
        forgottenOwnQueryBug();
        swapUnderLoad();
        System.out.println("OK typeahead: " + checks + " checks passed");
    }

    static void figureLists() {
        B_typeahead.TopKTrie t = trie(figure(), 3);
        eq(List.of("car", "cat", "dog"), t.suggest(""), "figure: root");
        eq(List.of("car", "cat", "catalog"), t.suggest("c"), "figure: c");
        eq(List.of("car", "cat", "catalog"), t.suggest("ca"), "figure: ca");
        eq(List.of("car", "card", "care"), t.suggest("car"), "figure: car");
        eq(List.of("cat", "catalog"), t.suggest("cat"), "figure: cat");
        eq(List.of("dog", "door"), t.suggest("d"), "figure: d");
        eq(List.of("dog", "door"), t.suggest("do"), "figure: do");
        eq(List.of("door"), t.suggest("doo"), "figure: doo");
        eq(List.of("catalog"), t.suggest("cata"), "figure: cata (mid-chain)");
        eq(List.of(), t.suggest("cab"), "figure: missing cab");
        eq(List.of(), t.suggest("cars"), "figure: missing cars (past a leaf)");
        eq(List.of(), t.suggest("x"), "figure: missing x");
        // The search-lesson-style check: k = 2 everywhere matches the oracle too.
        B_typeahead.TopKTrie t2 = trie(figure(), 2);
        for (String p : List.of("", "c", "ca", "car", "cat", "d", "do", "dog"))
            eq(oracle(figure(), p, 2), t2.suggest(p), "figure k=2: " + p);
    }

    static void edgeCases() {
        Map<String, Long> ties = new HashMap<>();
        ties.put("b", 5L); ties.put("a", 5L); ties.put("c", 5L); ties.put("ab", 5L);
        eq(List.of("a", "ab"), trie(ties, 2).suggest(""), "ties broken a..z");
        eq(List.of("a", "ab", "b", "c"), trie(ties, 10).suggest(""), "k larger than everything");

        eq(List.of(), trie(new HashMap<>(), 5).suggest(""), "empty index, empty prefix");
        eq(List.of(), trie(new HashMap<>(), 5).suggest("a"), "empty index, any prefix");

        Map<String, Long> withEmpty = new HashMap<>();
        withEmpty.put("", 1_000_000L); withEmpty.put("x", 1L);
        eq(List.of("x"), trie(withEmpty, 3).suggest(""), "empty query is never suggested");

        Map<String, Long> one = Map.of("kestrel", 7L);
        B_typeahead.TopKTrie t1 = trie(one, 1);
        eq(List.of("kestrel"), t1.suggest("k"), "single query, short prefix");
        eq(List.of("kestrel"), t1.suggest("kestrel"), "single query, whole query as prefix");
        eq(List.of(), t1.suggest("kestrels"), "single query, prefix longer than it");

        Map<String, Long> uni = new HashMap<>();
        uni.put("caf\u00e9", 30L); uni.put("cafe", 20L); uni.put("\u5b57\u5178", 50L); uni.put("\u5b57", 10L); uni.put("\u00e7\u0430", 5L);
        B_typeahead.TopKTrie tu = trie(uni, 5);
        eq(List.of("caf\u00e9", "cafe"), tu.suggest("caf"), "unicode: accents are distinct characters");
        eq(List.of("\u5b57\u5178", "\u5b57"), tu.suggest("\u5b57"), "unicode: CJK");
        eq(oracle(uni, "", 5), tu.suggest(""), "unicode: root");

        Map<String, Long> big = new HashMap<>();
        big.put("a", Long.MAX_VALUE); big.put("b", Long.MAX_VALUE - 1); big.put("c", 0L);
        eq(List.of("a", "b", "c"), trie(big, 3).suggest(""), "extreme scores compare without overflow");

        boolean threw = false;
        try { trie(figure(), 0); } catch (IllegalArgumentException e) { threw = true; }
        yes(threw, "k = 0 rejected");

        boolean immutable = false;
        try { trie(figure(), 3).suggest("c").add("hack"); } catch (UnsupportedOperationException e) { immutable = true; }
        yes(immutable, "suggest returns an immutable list");
        B_typeahead.TopKTrie t = trie(figure(), 3);
        try { t.suggest("c").clear(); } catch (UnsupportedOperationException ignored) { }
        eq(List.of("car", "cat", "catalog"), t.suggest("c"), "a caller cannot disturb the stored list");
    }

    static void randomAgainstOracle() {
        Random rnd = new Random(20261008);
        char[] alphabet = {'a', 'b', 'c', '\u00e9'};
        for (int trial = 0; trial < 3000; trial++) {
            int letters = 2 + rnd.nextInt(3);                     // alphabet of 2..4 symbols
            Map<String, Long> scores = new HashMap<>();
            int n = rnd.nextInt(30);                              // 0..29 queries
            for (int i = 0; i < n; i++) {
                int len = 1 + rnd.nextInt(5);
                StringBuilder sb = new StringBuilder();
                for (int j = 0; j < len; j++) sb.append(alphabet[rnd.nextInt(letters)]);
                scores.put(sb.toString(), (long) (1 + rnd.nextInt(6)));   // small scores: many ties
            }
            int k = 1 + rnd.nextInt(6);
            B_typeahead.TopKTrie t = trie(scores, k);
            // every prefix up to length 4 over the alphabet (present or missing), plus a few longer
            List<String> prefixes = new ArrayList<>(List.of(""));
            for (int len = 1; len <= 4; len++) {
                List<String> next = new ArrayList<>();
                for (String p : prefixes) if (p.length() == len - 1) for (int c = 0; c < letters; c++) next.add(p + alphabet[c]);
                prefixes.addAll(next);
            }
            for (int i = 0; i < 5; i++) {
                StringBuilder sb = new StringBuilder();
                int len = 5 + rnd.nextInt(3);
                for (int j = 0; j < len; j++) sb.append(alphabet[rnd.nextInt(alphabet.length)]);
                prefixes.add(sb.toString());
            }
            prefixes.add("z");                                    // a character no query contains
            for (String p : prefixes) eq(oracle(scores, p, k), t.suggest(p), "random trial " + trial + " prefix '" + p + "' k=" + k + " " + scores);
        }
    }

    // The lesson's "catch the bug" version: children's lists merged, the node's own query forgotten.
    static final class ForgetfulTrie {
        static final class Node { Map<Character, Node> kids = new TreeMap<>(); boolean isQuery; List<String> top = new ArrayList<>(); }
        final Node root = new Node();
        final boolean leavesOnly;   // the milder cousin: adds its own query only when it has no children
        ForgetfulTrie(Map<String, Long> scores, int k) { this(scores, k, false); }
        ForgetfulTrie(Map<String, Long> scores, int k, boolean leavesOnly) {
            this.leavesOnly = leavesOnly;
            for (String q : scores.keySet()) {
                Node n = root;
                for (char c : q.toCharArray()) n = n.kids.computeIfAbsent(c, x -> new Node());
                n.isQuery = true;
            }
            index(root, "");
            build(root, k, scores);
        }
        void build(Node n, int k, Map<String, Long> s) {
            List<String> cand = new ArrayList<>();                // BUG: never adds the node's own query...
            if (leavesOnly && n.isQuery && n.kids.isEmpty()) cand.add(pathOf(n));   // ...or only at leaves
            for (Node c : n.kids.values()) { build(c, k, s); cand.addAll(c.top); }
            cand.sort(Comparator.<String>comparingLong(s::get).reversed().thenComparing(Comparator.naturalOrder()));
            n.top = new ArrayList<>(cand.subList(0, Math.min(k, cand.size())));
        }
        final Map<Node, String> paths = new IdentityHashMap<>();
        String pathOf(Node n) { return paths.get(n); }
        void index(Node n, String p) { paths.put(n, p); for (Map.Entry<Character, Node> e : n.kids.entrySet()) index(e.getValue(), p + e.getKey()); }
        List<String> suggest(String p) {
            Node n = root;
            for (char c : p.toCharArray()) { n = n.kids.get(c); if (n == null) return List.of(); }
            return n.top;
        }
    }

    static void forgottenOwnQueryBug() {
        ForgetfulTrie bad = new ForgetfulTrie(figure(), 3);
        eq(List.of(), bad.suggest("car"), "bug: leaves have empty lists, so nothing propagates");
        eq(List.of(), bad.suggest(""), "bug: the root suggests nothing at all");
        eq(List.of("car", "cat", "catalog"), trie(figure(), 3).suggest("c"), "fixed version on the same data");
        ForgetfulTrie cousin = new ForgetfulTrie(figure(), 3, true);
        eq(List.of("card", "care"), cousin.suggest("car"), "cousin: car (900) missing at its own node, card and care remain");
        for (String p : List.of("", "c", "ca", "car"))
            yes(!cousin.suggest(p).contains("car"), "cousin: car missing from the list for '" + p + "'");
    }

    static void swapUnderLoad() throws Exception {
        Map<String, Long> a = figure();
        Map<String, Long> b = new HashMap<>(figure());
        b.put("care", 5_000L); b.put("dot", 9_000L);              // tomorrow's build: different answers
        B_typeahead.TopKTrie ta = trie(a, 3), tb = trie(b, 3);
        List<String> probes = List.of("", "c", "ca", "car", "d", "do", "x");
        Map<String, List<List<String>>> allowed = new HashMap<>();
        for (String p : probes) allowed.put(p, List.of(ta.suggest(p), tb.suggest(p)));
        yes(!ta.suggest("car").equals(tb.suggest("car")), "the two builds really differ");

        B_typeahead.SuggestIndex index = new B_typeahead.SuggestIndex(ta);
        AtomicBoolean stop = new AtomicBoolean(false);
        AtomicInteger reads = new AtomicInteger(), bad = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<?>> readers = new ArrayList<>();
        for (int r = 0; r < 4; r++) readers.add(pool.submit(() -> {
            int i = 0;
            while (!stop.get()) {
                String p = probes.get(i++ % probes.size());
                if (!allowed.get(p).contains(index.suggest(p))) bad.incrementAndGet();
                reads.incrementAndGet();
            }
        }));
        B_typeahead.TopKTrie expectOld = ta;
        for (int s = 0; s < 20_000; s++) {
            B_typeahead.TopKTrie next = (s % 2 == 0) ? tb : ta;
            B_typeahead.TopKTrie old = index.swap(next);
            if (old != expectOld) bad.incrementAndGet();           // swap hands back the snapshot it replaced
            expectOld = next;
        }
        stop.set(true);
        for (Future<?> f : readers) f.get(10, TimeUnit.SECONDS);
        pool.shutdown();
        eq(0, bad.get(), "every read during 20,000 swaps matched one whole snapshot");
        yes(reads.get() > 0, "readers actually ran");
        B_typeahead.TopKTrie rolledBack = index.swap(ta);          // rollback is just another swap
        eq(ta.suggest("car"), index.suggest("car"), "after rollback the old answers are live again");
        yes(rolledBack == ta || rolledBack == tb, "swap returns a real snapshot");
    }
}
