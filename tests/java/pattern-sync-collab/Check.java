import java.util.*;

// Exercises every compiled block in src/lessons/pattern-sync-collab.mdx:
//  - Chunker: fixed and content-defined boundaries against independent oracles, partition validity,
//    and the lesson's claim that one inserted byte changes every fixed chunk after it but only
//    one or two content-defined chunks;
//  - OT: the worked "cat" example, convergence (apply A then T(B,A) equals B then T(A,B)) exhaustively
//    on small documents and on thousands of random pairs, intent preservation, and the no-tie-break bug
//    diverging on the input the lesson names;
//  - DocSession: three clients editing concurrently through one sequencer over random message timings,
//    all converging to the server's text;
//  - Rga: replicas receiving the same ops in different orders (and twice) converging, and the tombstone count.
public class Check {
    static final Random R = new Random(11);
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }

    public static void main(String[] args) {
        chunkingOracles();
        chunkingInsertion();
        otWorkedExample();
        otExhaustive();
        otRandom();
        otTieBreakBug();
        sessionSimulation();
        rgaExamples();
        rgaRandom();
        System.out.println("OK pattern-sync-collab: " + checks + " checks passed");
    }

    // ---------- chunking ----------

    static byte[] randomBytes(int n) { byte[] b = new byte[n]; R.nextBytes(b); return b; }

    static List<Integer> fixedOracle(int n, int size) {
        List<Integer> ends = new ArrayList<>();
        int pos = 0;
        while (pos < n) { pos = Math.min(n, pos + size); ends.add(pos); }
        return ends;
    }

    /** Recomputes the gear hash of the last 64 bytes from scratch at every position. */
    static List<Integer> cdcOracle(byte[] d, int min, int bits, int max) {
        List<Integer> ends = new ArrayList<>();
        int start = 0;
        for (int i = 0; i < d.length; i++) {
            long h = 0;
            for (int j = Math.max(0, i - 63); j <= i; j++) h += B_chunking.Chunker.GEAR[d[j] & 0xff] << (i - j);
            boolean cut = (h >>> (64 - bits)) == 0;
            int len = i - start + 1;
            if ((len >= min && cut) || len >= max) { ends.add(i + 1); start = i + 1; }
        }
        if (start < d.length) ends.add(d.length);
        return ends;
    }

    static void validPartition(List<Integer> ends, int n, int min, int max, String what) {
        if (n == 0) { eq(0, ends.size(), what + " empty"); return; }
        eq(n, ends.get(ends.size() - 1), what + " last end");
        int prev = 0;
        for (int k = 0; k < ends.size(); k++) {
            int len = ends.get(k) - prev;
            yes(len >= 1 && len <= max, what + " chunk size within max");
            if (k < ends.size() - 1) yes(len >= min, what + " chunk size at least min");
            prev = ends.get(k);
        }
    }

    static void chunkingOracles() {
        for (int n : new int[]{0, 1, 7, 8, 9, 64, 1000}) {
            eq(fixedOracle(n, 8), B_chunking.Chunker.fixed(new byte[n], 8), "fixed n=" + n);
        }
        for (int t = 0; t < 300; t++) {
            int n = R.nextInt(3000);
            byte[] d = randomBytes(n);
            int size = 1 + R.nextInt(300);
            eq(fixedOracle(n, size), B_chunking.Chunker.fixed(d, size), "fixed random");
            int min = 1 + R.nextInt(64), bits = 3 + R.nextInt(6), max = min + 1 + R.nextInt(400);
            List<Integer> cdc = B_chunking.Chunker.contentDefined(d, min, bits, max);
            eq(cdcOracle(d, min, bits, max), cdc, "cdc vs oracle");
            validPartition(cdc, n, min, max, "cdc");
            eq(cdc, B_chunking.Chunker.contentDefined(d.clone(), min, bits, max), "cdc deterministic");
        }
        // All-zero input never matches the pattern by luck in a useful way: max must still cap chunks.
        validPartition(B_chunking.Chunker.contentDefined(new byte[100_000], 2048, 13, 65_536), 100_000, 2048, 65_536, "cdc zeros");
    }

    static Set<String> chunkSet(byte[] d, List<Integer> ends) {
        Set<String> set = new HashSet<>();
        int prev = 0;
        for (int e : ends) { set.add(Arrays.toString(Arrays.copyOfRange(d, prev, e))); prev = e; }
        return set;
    }

    static int newChunks(byte[] before, List<Integer> eb, byte[] after, List<Integer> ea) {
        Set<String> old = chunkSet(before, eb);
        int fresh = 0, prev = 0;
        for (int e : ea) { if (!old.contains(Arrays.toString(Arrays.copyOfRange(after, prev, e)))) fresh++; prev = e; }
        return fresh;
    }

    static byte[] insertAt(byte[] d, int pos, byte b) {
        byte[] out = new byte[d.length + 1];
        System.arraycopy(d, 0, out, 0, pos);
        out[pos] = b;
        System.arraycopy(d, pos, out, pos + 1, d.length - pos);
        return out;
    }

    // Scaled-down version of the lesson's 200 MB / 4 MB example: ~50 chunks, average ≈ 10 KB.
    static void chunkingInsertion() {
        final int MIN = 2048, BITS = 13, MAX = 65_536, FIXED = 10_240, N = 50 * FIXED;
        int trials = 60, cdcWorst = 0, cdcTotal = 0, fixedFrontMin = Integer.MAX_VALUE, cdcChunksTotal = 0;
        for (int t = 0; t < trials; t++) {
            byte[] d = randomBytes(N);
            List<Integer> fb = B_chunking.Chunker.fixed(d, FIXED), cb = B_chunking.Chunker.contentDefined(d, MIN, BITS, MAX);
            cdcChunksTotal += cb.size();
            // Insert one byte at the very front.
            byte[] front = insertAt(d, 0, (byte) R.nextInt(256));
            int fixedFresh = newChunks(d, fb, front, B_chunking.Chunker.fixed(front, FIXED));
            fixedFrontMin = Math.min(fixedFrontMin, fixedFresh);
            int cdcFresh = newChunks(d, cb, front, B_chunking.Chunker.contentDefined(front, MIN, BITS, MAX));
            cdcWorst = Math.max(cdcWorst, cdcFresh);
            cdcTotal += cdcFresh;
            // Insert one byte in the middle: fixed chunks from that point on all change.
            int pos = R.nextInt(N);
            byte[] mid = insertAt(d, pos, (byte) R.nextInt(256));
            int fixedMid = newChunks(d, fb, mid, B_chunking.Chunker.fixed(mid, FIXED));
            yes(fixedMid >= 50 - pos / FIXED, "fixed: every chunk from the insertion on is new");
            int cdcMid = newChunks(d, cb, mid, B_chunking.Chunker.contentDefined(mid, MIN, BITS, MAX));
            cdcWorst = Math.max(cdcWorst, cdcMid);
            cdcTotal += cdcMid;
            // Overwrite one byte in place: both schemes change very little.
            byte[] same = d.clone();
            same[pos] ^= 0x5a;
            eq(1, newChunks(d, fb, same, B_chunking.Chunker.fixed(same, FIXED)), "fixed: in-place edit changes one chunk");
            yes(newChunks(d, cb, same, B_chunking.Chunker.contentDefined(same, MIN, BITS, MAX)) <= 2, "cdc: in-place edit changes at most two");
        }
        yes(fixedFrontMin >= 50, "fixed: a front insertion changes all 50 chunks (min seen " + fixedFrontMin + ")");
        yes(cdcWorst <= 2, "cdc: an insertion changes at most two chunks (worst seen " + cdcWorst + ")");
        double avgChunks = cdcChunksTotal / (double) trials;
        yes(avgChunks > 40 && avgChunks < 60, "cdc: about 50 chunks for 50 × average size (saw " + avgChunks + ")");
        System.out.printf("chunking: fixed front-insert min new=%d; cdc worst new=%d, avg new=%.2f, avg chunks=%.1f%n",
                fixedFrontMin, cdcWorst, cdcTotal / (2.0 * trials), avgChunks);
    }

    // ---------- OT ----------

    static B_ot.Op ins(int p, char c, int s) { return B_ot.Op.ins(p, c, s); }
    static B_ot.Op del(int p, int s) { return B_ot.Op.del(p, s); }

    static void otWorkedExample() {
        B_ot.Op alice = ins(3, 's', 1), bob = ins(0, 'b', 2);
        eq("cats", B_ot.apply("cat", alice), "alice local");
        eq("bcat", B_ot.apply("cat", bob), "bob local");
        eq(ins(4, 's', 1), B_ot.transform(alice, bob), "alice's op shifts to 4");
        eq(bob, B_ot.transform(bob, alice), "bob's op unchanged");
        eq("bcats", B_ot.apply(B_ot.apply("cat", bob), B_ot.transform(alice, bob)), "server order: bob then alice'");
        eq("bcats", B_ot.apply(B_ot.apply("cat", alice), B_ot.transform(bob, alice)), "alice's screen");
        // Delete vs delete of the same character: one deletion, not two.
        eq("ct", B_ot.apply(B_ot.apply("cat", del(1, 1)), B_ot.transform(del(1, 2), del(1, 1))), "double delete");
        // Same-position inserts: the lower site goes first on both screens.
        eq("cat!?", B_ot.apply(B_ot.apply("cat", ins(3, '!', 1)), B_ot.transform(ins(3, '?', 2), ins(3, '!', 1))), "tie A-first");
        eq("cat!?", B_ot.apply(B_ot.apply("cat", ins(3, '?', 2)), B_ot.transform(ins(3, '!', 1), ins(3, '?', 2))), "tie B-first");
        // Insert at the position someone deleted: the insert survives where it was typed.
        eq("cXt", B_ot.apply(B_ot.apply("cat", del(1, 2)), B_ot.transform(ins(1, 'X', 1), del(1, 2))), "insert vs delete 1");
        eq("cXt", B_ot.apply(B_ot.apply("cat", ins(1, 'X', 1)), B_ot.transform(del(1, 2), ins(1, 'X', 1))), "insert vs delete 2");
    }

    static List<B_ot.Op> allOps(int len, int site, char insChar) {
        List<B_ot.Op> ops = new ArrayList<>();
        for (int p = 0; p <= len; p++) ops.add(ins(p, insChar, site));
        for (int p = 0; p < len; p++) ops.add(del(p, site));
        return ops;
    }

    /** Converges, and preserves intent: tagged characters let us check exactly what survived and where. */
    static void checkPair(String doc, B_ot.Op a, B_ot.Op b) {
        String ab = B_ot.apply(B_ot.apply(doc, a), B_ot.transform(b, a));
        String ba = B_ot.apply(B_ot.apply(doc, b), B_ot.transform(a, b));
        eq(ab, ba, "TP1 on '" + doc + "' with " + a + " and " + b);
        // Intent oracle on the original characters: remove every character either op deleted.
        Set<Integer> deleted = new HashSet<>();
        if (a.kind() == 'D') deleted.add(a.pos());
        if (b.kind() == 'D') deleted.add(b.pos());
        StringBuilder kept = new StringBuilder();
        for (int i = 0; i < doc.length(); i++) if (!deleted.contains(i)) kept.append(doc.charAt(i));
        StringBuilder originals = new StringBuilder();
        for (char c : ab.toCharArray()) if (doc.indexOf(c) >= 0) originals.append(c);
        eq(kept.toString(), originals.toString(), "intent: surviving originals in order");
        for (B_ot.Op op : new B_ot.Op[]{a, b}) {
            if (op.kind() != 'I') continue;
            int at = ab.indexOf(op.ch());
            yes(at >= 0, "intent: inserted char present");
            // The original character just before the insertion point is still the nearest original to its left.
            Character leftOrig = null;
            for (int i = op.pos() - 1; i >= 0; i--) if (!deleted.contains(i)) { leftOrig = doc.charAt(i); break; }
            Character seen = null;
            for (int i = at - 1; i >= 0; i--) if (doc.indexOf(ab.charAt(i)) >= 0) { seen = ab.charAt(i); break; }
            eq(leftOrig, seen, "intent: inserted char keeps its left neighbour");
        }
    }

    static void otExhaustive() {
        String letters = "abcdef";
        for (int len = 0; len <= 5; len++) {
            String doc = letters.substring(0, len);
            for (B_ot.Op a : allOps(len, 1, 'X'))
                for (B_ot.Op b : allOps(len, 2, 'Y')) { checkPair(doc, a, b); checkPair(doc, b, a); }
        }
    }

    static void otRandom() {
        String letters = "abcdefghijklmnopqrstuvwxyz";
        for (int t = 0; t < 5000; t++) {
            int len = R.nextInt(27);
            String doc = letters.substring(0, len);
            List<B_ot.Op> as = allOps(len, 1 + R.nextInt(5), 'X'), bs = allOps(len, 6 + R.nextInt(5), 'Y');
            checkPair(doc, as.get(R.nextInt(as.size())), bs.get(R.nextInt(bs.size())));
        }
    }

    /** The fragment from the lesson: on a tie, both sides shift right. */
    static B_ot.Op buggyInsertInsert(B_ot.Op a, B_ot.Op b) { return b.pos() <= a.pos() ? a.at(a.pos() + 1) : a; }

    static void otTieBreakBug() {
        B_ot.Op alice = ins(3, '!', 1), bob = ins(3, '?', 2);
        String aliceScreen = B_ot.apply(B_ot.apply("cat", alice), buggyInsertInsert(bob, alice));
        String bobScreen = B_ot.apply(B_ot.apply("cat", bob), buggyInsertInsert(alice, bob));
        eq("cat!?", aliceScreen, "bug: alice sees");
        eq("cat?!", bobScreen, "bug: bob sees");
        yes(!aliceScreen.equals(bobScreen), "bug: screens diverge");
    }

    // ---------- the sequencer, with real clients ----------

    /** A client keeps one op in flight and buffers the rest (the protocol the lesson describes). */
    static final class Client {
        final int site;
        String doc;
        int rev;
        B_ot.Op inflight;
        final List<B_ot.Op> buffer = new ArrayList<>();
        final ArrayDeque<Object[]> toServer = new ArrayDeque<>();   // {op, baseRev}
        final ArrayDeque<Object[]> fromServer = new ArrayDeque<>(); // {op, isAck}
        Client(int site, String doc) { this.site = site; this.doc = doc; }

        void edit(B_ot.Op op) {
            doc = B_ot.apply(doc, op);
            if (inflight == null) { inflight = op; toServer.add(new Object[]{op, rev}); }
            else buffer.add(op);
        }

        void receive(B_ot.Op op, boolean ack) {
            rev++;
            if (ack) {
                inflight = null;
                if (!buffer.isEmpty()) { inflight = buffer.remove(0); toServer.add(new Object[]{inflight, rev}); }
                return;
            }
            B_ot.Op r = op;
            if (inflight != null) { B_ot.Op i2 = B_ot.transform(inflight, r); r = B_ot.transform(r, inflight); inflight = i2; }
            for (int k = 0; k < buffer.size(); k++) {
                B_ot.Op b2 = B_ot.transform(buffer.get(k), r);
                r = B_ot.transform(r, buffer.get(k));
                buffer.set(k, b2);
            }
            doc = B_ot.apply(doc, r);
        }
    }

    static B_ot.Op randomEdit(String doc, int site) {
        if (doc.isEmpty() || R.nextInt(3) > 0) return ins(R.nextInt(doc.length() + 1), (char) ('a' + R.nextInt(26)), site);
        return del(R.nextInt(doc.length()), site);
    }

    static void sessionSimulation() {
        boolean threw = false;
        try { new B_ot.DocSession("x").receive(ins(0, 'a', 1), 5); } catch (IllegalArgumentException e) { threw = true; }
        yes(threw, "session rejects a revision from the future");

        for (int t = 0; t < 1500; t++) {
            String start = "kestrel".substring(0, R.nextInt(8));
            B_ot.DocSession server = new B_ot.DocSession(start);
            int n = 2 + R.nextInt(3);
            List<Client> clients = new ArrayList<>();
            for (int i = 0; i < n; i++) clients.add(new Client(i + 1, start));
            int edits = R.nextInt(40);
            while (true) {
                boolean pending = clients.stream().anyMatch(c -> !c.toServer.isEmpty() || !c.fromServer.isEmpty());
                if (edits == 0 && !pending) break;
                int move = R.nextInt(3);
                Client c = clients.get(R.nextInt(n));
                if (move == 0 && edits > 0) { c.edit(randomEdit(c.doc, c.site)); edits--; }
                else if (move == 1 && !c.toServer.isEmpty()) {
                    Object[] m = c.toServer.poll();
                    B_ot.Op recorded = server.receive((B_ot.Op) m[0], (Integer) m[1]);
                    for (Client other : clients) other.fromServer.add(new Object[]{recorded, other == c});
                } else if (move == 2 && !c.fromServer.isEmpty()) {
                    Object[] m = c.fromServer.poll();
                    c.receive((B_ot.Op) m[0], (Boolean) m[1]);
                }
            }
            for (Client c : clients) {
                eq(server.text(), c.doc, "client " + c.site + " converges with the server");
                eq(server.revision(), c.rev, "client revision matches");
            }
        }
    }

    // ---------- RGA ----------

    static void rgaExamples() {
        // Build "cat" on site 1 and copy it to site 2.
        B_rga.Rga a = new B_rga.Rga(1), b = new B_rga.Rga(2);
        List<Object> setup = new ArrayList<>();
        setup.add(a.insert(0, 'c')); setup.add(a.insert(1, 'a')); setup.add(a.insert(2, 't'));
        for (Object op : setup) b.apply((B_rga.Rga.Insert) op);
        eq("cat", b.text(), "rga setup");
        // Concurrent: Alice appends 's', Bob prepends 'b'.
        B_rga.Rga.Insert s = a.insert(3, 's'), bb = b.insert(0, 'b');
        a.apply(bb); b.apply(s);
        eq("bcats", a.text(), "rga cat example a");
        eq("bcats", b.text(), "rga cat example b");
        // Concurrent inserts at the same spot: same clock (5), higher site sorts first.
        B_rga.Rga.Insert bang = a.insert(5, '!'), q = b.insert(5, '?');
        eq(5L, bang.id().clock(), "clock of !");
        eq(5L, q.id().clock(), "clock of ?");
        a.apply(q); b.apply(bang);
        eq("bcats?!", a.text(), "rga tie a");
        eq("bcats?!", b.text(), "rga tie b");
        // Tombstones: 100 inserts, 60 deletes → 40 visible characters, 60 tombstones still stored.
        B_rga.Rga t = new B_rga.Rga(7);
        for (int i = 0; i < 100; i++) t.insert(i, (char) ('a' + i % 26));
        for (int i = 0; i < 60; i++) t.delete(R.nextInt(t.text().length()));
        eq(40, t.text().length(), "visible after deletes");
        eq(60, t.tombstones(), "tombstones kept");
    }

    static void rgaRandom() {
        for (int trial = 0; trial < 1500; trial++) {
            int n = 2 + R.nextInt(3);
            List<B_rga.Rga> reps = new ArrayList<>();
            for (int i = 0; i < n; i++) reps.add(new B_rga.Rga(i + 1));
            List<List<Object>> inbox = new ArrayList<>();
            for (int i = 0; i < n; i++) inbox.add(new ArrayList<>());
            int edits = R.nextInt(40);
            while (true) {
                boolean pending = inbox.stream().anyMatch(l -> !l.isEmpty());
                if (edits == 0 && !pending) break;
                int i = R.nextInt(n);
                B_rga.Rga r = reps.get(i);
                if (edits > 0 && R.nextBoolean()) {
                    String text = r.text();
                    Object op = (text.isEmpty() || R.nextInt(3) > 0)
                            ? r.insert(R.nextInt(text.length() + 1), (char) ('a' + R.nextInt(26)))
                            : r.delete(R.nextInt(text.length()));
                    for (int j = 0; j < n; j++) if (j != i) {
                        inbox.get(j).add(op);
                        if (R.nextInt(10) == 0) inbox.get(j).add(op);   // duplicate delivery
                    }
                    edits--;
                } else if (!inbox.get(i).isEmpty()) {
                    // Deliver any op whose dependency is already here, in random order.
                    List<Object> box = inbox.get(i);
                    List<Integer> ready = new ArrayList<>();
                    for (int k = 0; k < box.size(); k++) {
                        Object op = box.get(k);
                        boolean ok = op instanceof B_rga.Rga.Insert ins ? ins.after() == null || r.has(ins.after())
                                : r.has(((B_rga.Rga.Delete) op).target());
                        if (ok) ready.add(k);
                    }
                    if (ready.isEmpty()) continue;
                    Object op = box.remove((int) ready.get(R.nextInt(ready.size())));
                    if (op instanceof B_rga.Rga.Insert ins) r.apply(ins); else r.apply((B_rga.Rga.Delete) op);
                }
            }
            for (int i = 1; i < n; i++) eq(reps.get(0).text(), reps.get(i).text(), "rga replicas converge");
        }
    }
}
