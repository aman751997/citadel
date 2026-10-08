import java.util.*;

// Exercises every Java block in src/lessons/pattern-partitioning.mdx:
//  - ConsistentHashRing against a brute-force oracle (sorted token list, linear scan) on random rings,
//  - the lesson's claims: adding a node moves ~K/(N+1) keys and only TO the new node; removing a node
//    remaps only that node's keys; with one token per node they all land on one neighbour, with vnodes on many;
//    load spread (max/mean) shrinks as vnodes grow,
//  - Rendezvous against an independent max-score oracle, with the same add/remove properties,
//  - the hash-mod-N movement percentages the lesson quotes,
//  - VersionVector on the lesson's worked example and random vectors against an oracle,
//  - MerkleTree diff against a bucket-by-bucket oracle, and the 1 + 2·depth comparison count.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }

    public static void main(String[] args) {
        ringOracle();
        ringAddRemove();
        ringLoadSpread();
        preferenceLists();
        rendezvous();
        modN();
        versionVectors();
        merkle();
        System.out.println("OK pattern-partitioning: " + checks + " checks passed");
    }

    // ---------- ring vs oracle ----------
    static String oracleOwner(Map<String, Integer> live, String key) {
        // Every token of every live node, sorted by signed value (the ring's order); first >= h, else wrap to the smallest.
        List<long[]> tokens = new ArrayList<>();
        List<String> owners = new ArrayList<>();
        for (Map.Entry<String, Integer> e : live.entrySet())
            for (int i = 0; i < e.getValue(); i++) { tokens.add(new long[]{B_partitioning.hash64(e.getKey() + "#" + i), owners.size()}); owners.add(e.getKey()); }
        long h = B_partitioning.hash64(key);
        long[] best = null, smallest = null;
        for (long[] t : tokens) {
            if (smallest == null || t[0] < smallest[0]) smallest = t;
            if (t[0] >= h && (best == null || t[0] < best[0])) best = t;
        }
        return owners.get((int) (best != null ? best : smallest)[1]);
    }

    static void ringOracle() {
        Random rnd = new Random(7);
        boolean threw = false;
        try { new B_partitioning.ConsistentHashRing(4).nodeFor("x"); } catch (IllegalStateException e) { threw = true; }
        yes(threw, "empty ring throws");
        B_partitioning.ConsistentHashRing one = new B_partitioning.ConsistentHashRing(3);
        one.addNode("solo");
        for (int k = 0; k < 200; k++) eq("solo", one.nodeFor("k" + k), "single node owns everything");

        for (int trial = 0; trial < 300; trial++) {
            int v = 1 + rnd.nextInt(40);
            B_partitioning.ConsistentHashRing ring = new B_partitioning.ConsistentHashRing(v);
            Map<String, Integer> live = new HashMap<>();
            int ops = 1 + rnd.nextInt(15);
            for (int o = 0; o < ops; o++) {
                String node = "n" + rnd.nextInt(10);
                if (rnd.nextInt(3) == 0) { ring.removeNode(node); live.remove(node); }
                else { ring.addNode(node); live.put(node, v); }
            }
            if (live.isEmpty()) { ring.addNode("n0"); live.put("n0", v); }
            for (int k = 0; k < 20; k++) {
                String key = "key-" + rnd.nextInt(1_000_000);
                eq(oracleOwner(live, key), ring.nodeFor(key), "ring owner matches oracle (trial " + trial + ")");
            }
            // Stability: a ring built from the same nodes in another order answers identically.
            List<String> shuffled = new ArrayList<>(live.keySet());
            Collections.shuffle(shuffled, rnd);
            B_partitioning.ConsistentHashRing again = new B_partitioning.ConsistentHashRing(v);
            shuffled.forEach(again::addNode);
            for (int k = 0; k < 10; k++) { String key = "s" + rnd.nextInt(); eq(ring.nodeFor(key), again.nodeFor(key), "insertion order does not matter"); }
        }
    }

    // ---------- add / remove ----------
    static final int K = 100_000;

    static B_partitioning.ConsistentHashRing ring(int nodes, int vnodes) {
        B_partitioning.ConsistentHashRing r = new B_partitioning.ConsistentHashRing(vnodes);
        for (int i = 0; i < nodes; i++) r.addNode("node-" + i);
        return r;
    }

    static void ringAddRemove() {
        String[] keys = new String[K];
        for (int i = 0; i < K; i++) keys[i] = "user:" + i;

        // Add node 11 to a 10-node ring with 256 vnodes each: ~K/11 = 9.1% move, all of them to the new node.
        B_partitioning.ConsistentHashRing r = ring(10, 256);
        String[] before = new String[K];
        for (int i = 0; i < K; i++) before[i] = r.nodeFor(keys[i]);
        r.addNode("node-10");
        int moved = 0;
        for (int i = 0; i < K; i++) {
            String now = r.nodeFor(keys[i]);
            if (!now.equals(before[i])) { moved++; if (!now.equals("node-10")) eq("node-10", now, "a moved key moves only to the new node"); }
        }
        checks++;
        double frac = moved / (double) K;
        System.out.printf("  add 11th node (256 vnodes): %.2f%% of keys moved (ideal 1/11 = 9.09%%)%n", 100 * frac);
        yes(frac > 0.07 && frac < 0.115, "adding a node moves about K/(N+1) keys");

        // Remove node-3: keys it did not own never move; its keys scatter across the survivors.
        String[] mid = new String[K];
        for (int i = 0; i < K; i++) mid[i] = r.nodeFor(keys[i]);
        r.removeNode("node-3");
        Set<String> receivers = new HashSet<>();
        int orphaned = 0;
        for (int i = 0; i < K; i++) {
            String now = r.nodeFor(keys[i]);
            if (!mid[i].equals("node-3")) { if (!now.equals(mid[i])) eq(mid[i], now, "removal must not move other nodes' keys"); }
            else { orphaned++; receivers.add(now); }
        }
        checks++;
        System.out.printf("  remove node-3 (256 vnodes): its %d keys went to %d of 10 survivors%n", orphaned, receivers.size());
        eq(10, receivers.size(), "with vnodes every survivor takes a share of the dead node's keys");

        // One token per node: the dead node's whole arc goes to exactly one neighbour.
        B_partitioning.ConsistentHashRing single = ring(10, 1);
        String[] b1 = new String[K];
        for (int i = 0; i < K; i++) b1[i] = single.nodeFor(keys[i]);
        single.removeNode("node-3");
        Set<String> got = new HashSet<>();
        for (int i = 0; i < K; i++) if (b1[i].equals("node-3")) got.add(single.nodeFor(keys[i]));
        eq(1, got.size(), "without vnodes one neighbour inherits the entire arc");

        // Removing a node that isn't there, or adding one twice, changes nothing.
        B_partitioning.ConsistentHashRing r2 = ring(5, 16);
        String[] b2 = new String[2000];
        for (int i = 0; i < 2000; i++) b2[i] = r2.nodeFor(keys[i]);
        r2.removeNode("ghost"); r2.addNode("node-2");
        for (int i = 0; i < 2000; i++) eq(b2[i], r2.nodeFor(keys[i]), "idempotent add/remove");
    }

    // ---------- load spread, exactly from arc lengths ----------
    static double[] shares(B_partitioning.ConsistentHashRing r, int nodes, int vnodes, String prefix) {
        TreeMap<Long, Integer> tokens = new TreeMap<>();
        for (int n = 0; n < nodes; n++) for (int i = 0; i < vnodes; i++) tokens.putIfAbsent(B_partitioning.hash64(prefix + n + "#" + i), n);
        double[] s = new double[nodes];
        Long prev = tokens.lastKey();
        for (Map.Entry<Long, Integer> e : tokens.entrySet()) {
            long len = e.getKey() - prev;                       // mod 2^64 = clockwise distance
            double d = len >= 0 ? len : len + 0x1p64;
            if (tokens.size() == 1) d = 0x1p64;
            s[e.getValue()] += d / 0x1p64;
            prev = e.getKey();
        }
        return s;
    }

    static double avgMaxOverMean(int nodes, int vnodes, int rings) {
        double total = 0;
        for (int t = 0; t < rings; t++) {
            double[] s = shares(null, nodes, vnodes, "ring" + t + "-node-");
            double max = Arrays.stream(s).max().getAsDouble();
            double sum = Arrays.stream(s).sum();
            if (Math.abs(sum - 1) > 1e-9) eq(1.0, sum, "arc shares sum to the whole ring");
            total += max / (1.0 / nodes);
        }
        return total / rings;
    }

    static void ringLoadSpread() {
        double v1 = avgMaxOverMean(10, 1, 2000), v10 = avgMaxOverMean(10, 10, 500), v100 = avgMaxOverMean(10, 100, 300), v256 = avgMaxOverMean(10, 256, 200);
        System.out.printf("  busiest node / fair share, 10 nodes: 1 token %.2f, 10 vnodes %.2f, 100 vnodes %.2f, 256 vnodes %.2f%n", v1, v10, v100, v256);
        // Theory: with one random token each, the largest of N arcs averages H_N / N, i.e. H_10 = 2.93x the fair share.
        double h10 = 0; for (int i = 1; i <= 10; i++) h10 += 1.0 / i;
        yes(Math.abs(v1 - h10) < 0.15, "1 token per node: busiest node ≈ H_N × fair share");
        yes(v10 > 1.3 && v10 < 1.7, "10 vnodes: busiest ≈ 1.5× fair share");
        yes(v100 > 1.1 && v100 < 1.22, "100 vnodes: busiest ≈ 1.15× fair share");
        yes(v256 > 1.05 && v256 < 1.14, "256 vnodes: busiest ≈ 1.1× fair share");

        // The keys agree with the arcs: count keys on a 256-vnode ring and compare to the computed shares.
        B_partitioning.ConsistentHashRing r = new B_partitioning.ConsistentHashRing(256);
        for (int n = 0; n < 10; n++) r.addNode("ringK-node-" + n);
        double[] s = shares(null, 10, 256, "ringK-node-");
        int[] count = new int[10];
        for (int i = 0; i < K; i++) count[Integer.parseInt(r.nodeFor("item:" + i).substring("ringK-node-".length()))]++;
        for (int n = 0; n < 10; n++) yes(Math.abs(count[n] / (double) K - s[n]) < 0.006, "key counts follow arc lengths (node " + n + ")");
    }

    // ---------- preference lists ----------
    static void preferenceLists() {
        Random rnd = new Random(11);
        for (int trial = 0; trial < 200; trial++) {
            int nodes = 1 + rnd.nextInt(8), v = 1 + rnd.nextInt(20);
            B_partitioning.ConsistentHashRing r = ring(nodes, v);
            Map<String, Integer> live = new HashMap<>();
            for (int i = 0; i < nodes; i++) live.put("node-" + i, v);
            for (int k = 0; k < 10; k++) {
                String key = "p" + rnd.nextInt();
                int n = 1 + rnd.nextInt(5);
                List<String> pl = r.preferenceList(key, n);
                eq(Math.min(n, nodes), pl.size(), "preference list size");
                eq(pl.size(), new HashSet<>(pl).size(), "preference list holds distinct physical nodes");
                eq(r.nodeFor(key), pl.get(0), "first in the preference list is the owner");
                // Oracle: removing the first k owners, the next owner is the (k+1)-th entry.
                Map<String, Integer> rest = new HashMap<>(live);
                for (int i = 0; i < pl.size(); i++) {
                    eq(oracleOwner(rest, key), pl.get(i), "entry " + i + " is the next distinct node clockwise");
                    rest.remove(pl.get(i));
                }
            }
        }
    }

    // ---------- rendezvous ----------
    static void rendezvous() {
        Random rnd = new Random(3);
        for (int trial = 0; trial < 300; trial++) {
            B_partitioning.Rendezvous h = new B_partitioning.Rendezvous();
            List<String> nodes = new ArrayList<>();
            int n = 1 + rnd.nextInt(12);
            for (int i = 0; i < n; i++) { h.addNode("n" + i); nodes.add("n" + i); }
            for (int k = 0; k < 10; k++) {
                String key = "r" + rnd.nextInt();
                String oracle = nodes.stream().max(Comparator.comparingLong((String x) -> B_partitioning.hash64(x + "|" + key)).thenComparing(Comparator.reverseOrder())).get();
                eq(oracle, h.nodeFor(key), "rendezvous owner = highest score");
            }
        }
        String[] keys = new String[K];
        for (int i = 0; i < K; i++) keys[i] = "user:" + i;
        B_partitioning.Rendezvous h = new B_partitioning.Rendezvous();
        for (int i = 0; i < 10; i++) h.addNode("node-" + i);
        String[] before = new String[K];
        for (int i = 0; i < K; i++) before[i] = h.nodeFor(keys[i]);
        h.addNode("node-10");
        int moved = 0;
        for (int i = 0; i < K; i++) { String now = h.nodeFor(keys[i]); if (!now.equals(before[i])) { moved++; if (!now.equals("node-10")) eq("node-10", now, "rendezvous: moved keys go to the new node"); } }
        checks++;
        double frac = moved / (double) K;
        System.out.printf("  rendezvous add 11th node: %.2f%% moved%n", 100 * frac);
        yes(Math.abs(frac - 1.0 / 11) < 0.01, "rendezvous moves 1/(N+1)");
        String[] mid = new String[K];
        for (int i = 0; i < K; i++) mid[i] = h.nodeFor(keys[i]);
        h.removeNode("node-3");
        Map<String, Integer> got = new TreeMap<>();
        for (int i = 0; i < K; i++) {
            String now = h.nodeFor(keys[i]);
            if (!mid[i].equals("node-3")) { if (!now.equals(mid[i])) eq(mid[i], now, "rendezvous removal moves only the dead node's keys"); }
            else got.merge(now, 1, Integer::sum);
        }
        int orphans = got.values().stream().mapToInt(Integer::intValue).sum();
        eq(10, got.size(), "rendezvous spreads the dead node's keys over every survivor");
        for (int c : got.values()) yes(Math.abs(c - orphans / 10.0) < orphans * 0.04, "rendezvous spread is even");
    }

    // ---------- hash mod N ----------
    static double movedModN(int from, int to) {
        long lcm = (long) from * to / gcd(from, to);
        long stay = 0;
        for (long h = 0; h < lcm; h++) if (h % from == h % to) stay++;
        return 1 - stay / (double) lcm;
    }
    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }

    static void modN() {
        yes(Math.abs(movedModN(10, 11) - 10.0 / 11) < 1e-12, "10 -> 11: 10/11 ≈ 90.9% move");
        yes(Math.abs(movedModN(4, 5) - 0.8) < 1e-12, "4 -> 5: 80% move");
        yes(Math.abs(movedModN(16, 17) - 16.0 / 17) < 1e-12, "16 -> 17: 94.1% move");
        yes(Math.abs(movedModN(10, 20) - 0.5) < 1e-12, "10 -> 20 (doubling): 50% move");
        yes(Math.abs(movedModN(10, 9) - 0.9) < 1e-12, "10 -> 9 (one node dies): 90% move");
        // Empirically with real hashes, too.
        int moved = 0;
        for (int i = 0; i < K; i++) { long hh = B_partitioning.hash64("user:" + i); if (Long.remainderUnsigned(hh, 10) != Long.remainderUnsigned(hh, 11)) moved++; }
        yes(Math.abs(moved / (double) K - 10.0 / 11) < 0.01, "hashed keys: about 91% move");
    }

    // ---------- version vectors ----------
    static void versionVectors() {
        B_partitioning.VersionVector v0 = new B_partitioning.VersionVector();
        // The lesson's cart: A coordinates two writes, then B and C each coordinate a write on top of v2, concurrently.
        B_partitioning.VersionVector v1 = v0.increment("A");
        B_partitioning.VersionVector v2 = v1.increment("A");
        B_partitioning.VersionVector v3 = v2.increment("B");
        B_partitioning.VersionVector v4 = v2.increment("C");
        eq("{A=2}", v2.toString(), "v2");
        eq("{A=2, B=1}", v3.toString(), "v3");
        eq("{A=2, C=1}", v4.toString(), "v4");
        eq(B_partitioning.Order.BEFORE, v1.compare(v2), "v1 before v2");
        eq(B_partitioning.Order.AFTER, v3.compare(v2), "v3 descends from v2");
        eq(B_partitioning.Order.CONCURRENT, v3.compare(v4), "v3 and v4 are siblings");
        B_partitioning.VersionVector v5 = v3.merge(v4).increment("A");
        eq("{A=3, B=1, C=1}", v5.toString(), "v5 after the client merges and A coordinates");
        eq(B_partitioning.Order.AFTER, v5.compare(v3), "v5 supersedes v3");
        eq(B_partitioning.Order.AFTER, v5.compare(v4), "v5 supersedes v4");
        eq(B_partitioning.Order.EQUAL, v2.compare(v1.increment("A")), "equal vectors");

        Random rnd = new Random(5);
        String[] reps = {"A", "B", "C"};
        for (int t = 0; t < 3000; t++) {
            B_partitioning.VersionVector a = new B_partitioning.VersionVector(), b = new B_partitioning.VersionVector();
            long[] x = new long[3], y = new long[3];
            for (int i = 0; i < 3; i++) {
                x[i] = rnd.nextInt(3); y[i] = rnd.nextInt(3);
                for (int j = 0; j < x[i]; j++) a = a.increment(reps[i]);
                for (int j = 0; j < y[i]; j++) b = b.increment(reps[i]);
            }
            boolean allLe = true, allGe = true;
            for (int i = 0; i < 3; i++) { allLe &= x[i] <= y[i]; allGe &= x[i] >= y[i]; }
            B_partitioning.Order expect = allLe && allGe ? B_partitioning.Order.EQUAL : allLe ? B_partitioning.Order.BEFORE : allGe ? B_partitioning.Order.AFTER : B_partitioning.Order.CONCURRENT;
            eq(expect, a.compare(b), "vector compare vs oracle");
            B_partitioning.VersionVector m = a.merge(b);
            for (int i = 0; i < 3; i++) eq(Math.max(x[i], y[i]), m.get(reps[i]), "merge = element-wise max");
            yes(m.compare(a) != B_partitioning.Order.BEFORE && m.compare(a) != B_partitioning.Order.CONCURRENT, "merge dominates a");
        }
    }

    // ---------- Merkle ----------
    static void merkle() {
        // Worked example: 8 buckets, replicas differ in one key -> 7 comparisons (1 + 2 × 3 levels), one bucket exchanged.
        Map<String, String> a = new HashMap<>();
        for (int i = 0; i < 40; i++) a.put("k" + i, "v" + i);
        Map<String, String> b = new HashMap<>(a);
        b.put("k17", "v17-new");
        int[] cmp = {0};
        List<Integer> d = new B_partitioning.MerkleTree(a, 8).diff(new B_partitioning.MerkleTree(b, 8), cmp);
        eq(List.of(B_partitioning.MerkleTree.bucketOf("k17", 8)), d, "only k17's bucket differs");
        eq(7, cmp[0], "8 buckets, one difference: 7 hash comparisons");
        cmp[0] = 0;
        eq(List.of(), new B_partitioning.MerkleTree(a, 8).diff(new B_partitioning.MerkleTree(new HashMap<>(a), 8), cmp), "identical replicas");
        eq(1, cmp[0], "identical replicas: one root comparison");

        // 2^20 buckets, one differing key: 1 + 2 × 20 = 41 comparisons instead of 1,048,576.
        Map<String, String> big = new HashMap<>();
        for (int i = 0; i < 2000; i++) big.put("key" + i, "x");
        Map<String, String> big2 = new HashMap<>(big);
        big2.remove("key1234");                                  // a missed write (a delete would be a tombstone value in practice)
        cmp[0] = 0;
        List<Integer> d2 = new B_partitioning.MerkleTree(big, 1 << 20).diff(new B_partitioning.MerkleTree(big2, 1 << 20), cmp);
        eq(1, d2.size(), "one bucket differs");
        eq(41, cmp[0], "2^20 buckets: 41 comparisons");

        Random rnd = new Random(9);
        for (int t = 0; t < 1000; t++) {
            int buckets = 1 << rnd.nextInt(6);
            Map<String, String> x = new HashMap<>(), y;
            int n = rnd.nextInt(30);
            for (int i = 0; i < n; i++) x.put("k" + rnd.nextInt(50), "v" + rnd.nextInt(3));
            y = new HashMap<>(x);
            int edits = rnd.nextInt(4);
            for (int e = 0; e < edits; e++) {
                String k = "k" + rnd.nextInt(50);
                if (rnd.nextBoolean()) y.put(k, "v" + rnd.nextInt(3)); else y.remove(k);
            }
            // Oracle: bucket-by-bucket comparison of the actual contents.
            TreeSet<Integer> expect = new TreeSet<>();
            Set<String> allKeys = new HashSet<>(x.keySet()); allKeys.addAll(y.keySet());
            for (String k : allKeys) if (!Objects.equals(x.get(k), y.get(k))) expect.add(B_partitioning.MerkleTree.bucketOf(k, buckets));
            int[] c = {0};
            eq(new ArrayList<>(expect), new B_partitioning.MerkleTree(x, buckets).diff(new B_partitioning.MerkleTree(y, buckets), c), "Merkle diff vs oracle");
            yes(c[0] <= 2 * buckets - 1, "never more comparisons than tree nodes");
        }
    }
}
