import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Exercises every compiled block in src/lessons/feature-flags.mdx:
//  - bucket(): pinned golden values the lesson quotes, an independent BigInteger re-implementation of
//    the hash on thousands of random strings, range, determinism, uniformity, ramp monotonicity,
//    independence across flags, and re-salting reshuffles,
//  - the two buggy versions the lesson names failing in the way it says (unsalted cohorts overlap
//    100%; the hashCode one-liner goes negative on "polygene" + "lubricants" and correlates flags),
//  - evaluate(): every reason by hand, plus random rulesets against an independent oracle,
//  - FlagStore: snapshots never go backwards, patches apply in order, gaps ask for a snapshot,
//    duplicates are ignored, and concurrent readers never see a torn ruleset,
//  - the SRM chi-square numbers quoted in the lesson.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }

    public static void main(String[] args) throws Exception {
        goldenBuckets();
        bucketMatchesReference();
        uniformity();
        rampIsMonotonic();
        flagsAreIndependent();
        resaltingReshuffles();
        weakHashBugs();
        evaluateByHand();
        evaluateRandomAgainstOracle();
        storeVersions();
        storeConcurrency();
        srmNumbers();
        System.out.println("OK feature-flags: " + checks + " checks passed");
    }

    // ---------- bucketing ----------

    /** Independent reference: FNV-1a 64 + MurmurHash3 fmix64, done in BigInteger mod 2^64. */
    static final BigInteger MOD = BigInteger.ONE.shiftLeft(64);
    static BigInteger mul(BigInteger a, String hex) { return a.multiply(new BigInteger(hex, 16)).mod(MOD); }
    static BigInteger xorShift(BigInteger a, int s) { return a.xor(a.shiftRight(s)); }
    static int refBucket(String salt, String user) {
        BigInteger h = new BigInteger("cbf29ce484222325", 16);
        for (byte b : (salt + "." + user).getBytes(StandardCharsets.UTF_8)) {
            h = h.xor(BigInteger.valueOf(b & 0xff));
            h = mul(h, "100000001b3");
        }
        h = mul(xorShift(h, 33), "ff51afd7ed558ccd");
        h = mul(xorShift(h, 33), "c4ceb9fe1a85ec53");
        h = xorShift(h, 33);
        return h.mod(BigInteger.valueOf(10_000)).intValue();
    }

    static void goldenBuckets() {
        // The numbers quoted in the lesson's ramp figure and traces.
        String[] users = {"ana", "ben", "chen", "dara", "eli", "farah", "gus", "hana"};
        int[] checkout = {656, 8655, 2189, 6317, 7678, 571, 2218, 7286};
        int[] dark = {5434, 3010, 82, 5223, 5721, 9119, 4879, 9632};
        for (int i = 0; i < users.length; i++) {
            eq(checkout[i], B_flags.bucket("new-checkout", users[i]), "new-checkout bucket of " + users[i]);
            eq(dark[i], B_flags.bucket("dark-mode", users[i]), "dark-mode bucket of " + users[i]);
        }
        // Ramp story: 10% → farah, ana; 25% adds chen, gus; 50% adds nobody; 75% adds dara, hana; 100% adds eli, ben.
        eq(List.of("ana", "farah"), inAt("new-checkout", users, 1000), "in at 10%");
        eq(List.of("ana", "chen", "farah", "gus"), inAt("new-checkout", users, 2500), "in at 25%");
        eq(List.of("ana", "chen", "farah", "gus"), inAt("new-checkout", users, 5000), "in at 50%");
        eq(List.of("ana", "chen", "dara", "farah", "gus", "hana"), inAt("new-checkout", users, 7500), "in at 75%");
        eq(List.of("chen"), inAt("dark-mode", users, 1000), "dark-mode at 10% is a different cohort");
    }
    static List<String> inAt(String flag, String[] users, int threshold) {
        List<String> in = new ArrayList<>();
        for (String u : users) if (B_flags.bucket(flag, u) < threshold) in.add(u);
        Collections.sort(in);
        return in;
    }

    static void bucketMatchesReference() {
        Random r = new Random(7);
        String alphabet = "abcXYZ019-_.@é漢😀";
        for (int t = 0; t < 5000; t++) {
            String salt = randomString(r, alphabet, r.nextInt(12));
            String user = randomString(r, alphabet, r.nextInt(16));
            int b = B_flags.bucket(salt, user);
            eq(refBucket(salt, user), b, "bucket matches reference for " + salt + "/" + user);
            yes(b >= 0 && b < 10_000, "bucket in range");
            eq(b, B_flags.bucket(salt, user), "bucket is deterministic");
        }
    }
    static String randomString(Random r, String alphabet, int n) {
        int[] cps = alphabet.codePoints().toArray();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.appendCodePoint(cps[r.nextInt(cps.length)]);
        return sb.toString();
    }

    static void uniformity() {
        int n = 100_000;
        int[] groups = new int[100];
        int under10 = 0;
        for (int i = 0; i < n; i++) {
            int b = B_flags.bucket("new-checkout", "user-" + i);
            groups[b / 100]++;
            if (b < 1000) under10++;
        }
        // std dev of the 10% count is sqrt(100000 × 0.1 × 0.9) ≈ 95; ±600 is over six of them.
        yes(Math.abs(under10 - 10_000) <= 600, "10% rollout lands near 10,000 of 100,000 users (got " + under10 + ")");
        double chi = 0, expected = n / 100.0;
        for (int g : groups) chi += (g - expected) * (g - expected) / expected;
        yes(chi < 150, "bucket groups are uniform (chi-square " + chi + " with 99 df)");
    }

    static B_flags.Flag percentFlag(String key, int onWeight) {
        B_flags.Rollout r = new B_flags.Rollout("key", List.of(new B_flags.Slice("on", onWeight), new B_flags.Slice("off", 10_000 - onWeight)));
        return new B_flags.Flag(key, key, true, "off", Map.of(), List.of(), new B_flags.Serve(null, r));
    }
    static B_flags.Ruleset rulesetOf(B_flags.Flag... flags) {
        Map<String, B_flags.Flag> m = new HashMap<>();
        for (B_flags.Flag f : flags) m.put(f.key(), f);
        return new B_flags.Ruleset(1, m, Map.of());
    }
    static B_flags.Context user(String key) { return new B_flags.Context(key, Map.of()); }

    static void rampIsMonotonic() {
        int[] ramp = {0, 1, 100, 500, 1000, 2500, 5000, 7500, 9999, 10_000};
        int users = 20_000;
        boolean[] wasOn = new boolean[users];
        for (int w : ramp) {
            B_flags.Ruleset rs = rulesetOf(percentFlag("new-checkout", w));
            int on = 0;
            for (int i = 0; i < users; i++) {
                boolean isOn = B_flags.evaluate(rs, "new-checkout", user("u" + i), "off").variation().equals("on");
                if (wasOn[i]) yes(isOn, "user u" + i + " stays in when the ramp grows to " + w);
                wasOn[i] = isOn;
                if (isOn) on++;
            }
            double expected = users * w / 10_000.0;
            yes(Math.abs(on - expected) <= 4 * Math.sqrt(users * 0.25) + 1, "ramp " + w + " serves about " + expected + " (got " + on + ")");
        }
        Random r = new Random(11);
        for (int t = 0; t < 2000; t++) {
            int a = r.nextInt(10_001), b = a + r.nextInt(10_001 - a);
            String u = "user-" + r.nextInt(1_000_000);
            boolean inA = B_flags.evaluate(rulesetOf(percentFlag("f", a)), "f", user(u), "off").variation().equals("on");
            boolean inB = B_flags.evaluate(rulesetOf(percentFlag("f", b)), "f", user(u), "off").variation().equals("on");
            if (inA) yes(inB, "monotonic " + a + " → " + b);
        }
    }

    static void flagsAreIndependent() {
        int n = 100_000, a = 0, b = 0, both = 0, unsaltedBoth = 0, unsaltedA = 0;
        for (int i = 0; i < n; i++) {
            String u = "user-" + i;
            boolean x = B_flags.bucket("new-checkout", u) < 5000, y = B_flags.bucket("dark-mode", u) < 5000;
            if (x) a++;
            if (y) b++;
            if (x && y) both++;
            boolean ux = B_flags.bucketUnsalted("new-checkout", u) < 5000, uy = B_flags.bucketUnsalted("dark-mode", u) < 5000;
            if (ux) unsaltedA++;
            if (ux && uy) unsaltedBoth++;
        }
        double overlap = both / (double) n;
        yes(Math.abs(overlap - 0.25) < 0.01, "salted: two 50% flags overlap on about 25% of users (got " + overlap + ")");
        eq(unsaltedA, unsaltedBoth, "unsalted: the two 50% flags pick exactly the same users");
    }

    static void resaltingReshuffles() {
        int n = 100_000, inOld = 0, stillIn = 0;
        for (int i = 0; i < n; i++) {
            String u = "user-" + i;
            if (B_flags.bucket("checkout-test", u) < 1000) {
                inOld++;
                if (B_flags.bucket("checkout-test-r2", u) < 1000) stillIn++;
            }
        }
        double share = stillIn / (double) inOld;
        yes(Math.abs(share - 0.10) < 0.02, "a new salt keeps only about 10% of the old 10% cohort (got " + share + ")");
    }

    static void weakHashBugs() {
        eq(Integer.MIN_VALUE, "polygenelubricants".hashCode(), "the famous MIN_VALUE hashCode");
        int b = B_weakBucket.weakBucket("polygene", "lubricants");
        yes(b < 0, "weakBucket goes negative for polygene + lubricants (got " + b + ")");
        eq(-48, b, "Math.abs(MIN_VALUE) % 100");
        int n = 100_000, both = 0;
        for (int i = 0; i < n; i++) {
            String u = "user-" + (100_000 + i);
            if (B_weakBucket.weakBucket("new-checkout", u) < 50 && B_weakBucket.weakBucket("dark-mode", u) < 50) both++;
        }
        double overlap = both / (double) n;
        yes(overlap < 0.2, "hashCode buckets are correlated across flags: overlap " + overlap + " instead of 0.25");
    }

    // ---------- evaluation ----------

    static B_flags.Clause clause(String attr, B_flags.Op op, String... values) { return new B_flags.Clause(attr, op, List.of(values)); }
    static B_flags.Serve fixed(String v) { return new B_flags.Serve(v, null); }

    static void evaluateByHand() {
        B_flags.Segment beta = new B_flags.Segment(Set.of("ana"), List.of(clause("email", B_flags.Op.ENDS_WITH, "@kestrel.dev")));
        B_flags.Segment listOnly = new B_flags.Segment(Set.of("ben"), List.of());
        B_flags.Rollout half = new B_flags.Rollout("key", List.of(new B_flags.Slice("on", 5000), new B_flags.Slice("off", 5000)));
        B_flags.Rollout byOrg = new B_flags.Rollout("org", List.of(new B_flags.Slice("on", 1000), new B_flags.Slice("off", 9000)));
        B_flags.Flag checkout = new B_flags.Flag("new-checkout", "new-checkout", true, "off",
                Map.of("dara", "off"),
                List.of(new B_flags.Rule(List.of(clause("", B_flags.Op.IN_SEGMENT, "beta", "missing")), fixed("on")),
                        new B_flags.Rule(List.of(clause("country", B_flags.Op.IN, "IN", "BR"), clause("plan", B_flags.Op.NOT_IN, "free")), new B_flags.Serve(null, half)),
                        new B_flags.Rule(List.of(clause("", B_flags.Op.IN_SEGMENT, "listOnly")), fixed("on"))),
                new B_flags.Serve(null, byOrg));
        B_flags.Flag killed = new B_flags.Flag("recs", "recs", false, "disabled", Map.of("ana", "enabled"), List.of(), fixed("enabled"));
        B_flags.Ruleset rs = new B_flags.Ruleset(7, Map.of("new-checkout", checkout, "recs", killed), Map.of("beta", beta, "listOnly", listOnly));

        B_flags.Evaluation e;
        e = B_flags.evaluate(rs, "nope", user("ana"), "safe");
        eq("safe", e.variation(), "unknown flag → caller's default"); eq("FLAG_NOT_FOUND", e.reason(), "reason");
        e = B_flags.evaluate(null, "new-checkout", user("ana"), "safe");
        eq("safe", e.variation(), "no ruleset yet → default"); eq("NOT_INITIALIZED", e.reason(), "reason");
        e = B_flags.evaluate(rs, "recs", user("ana"), "enabled");
        eq("disabled", e.variation(), "a flag that is off ignores targets"); eq("OFF", e.reason(), "reason");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("dara", Map.of("email", "dara@kestrel.dev")), "off");
        eq("off", e.variation(), "individual target beats the segment rule"); eq("TARGET", e.reason(), "reason");
        e = B_flags.evaluate(rs, "new-checkout", user("ana"), "x");
        eq("on", e.variation(), "segment by inclusion"); eq("RULE 0", e.reason(), "reason"); eq(-1, e.bucket(), "no bucket for a fixed serve");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("zed", Map.of("email", "zed@kestrel.dev")), "x");
        eq("RULE 0", e.reason(), "segment by clause");
        e = B_flags.evaluate(rs, "new-checkout", user("ben"), "x");
        eq("RULE 2", e.reason(), "list-only segment matches its listed key");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("chen", Map.of("country", "IN", "plan", "pro")), "x");
        eq("RULE 1", e.reason(), "attribute rule"); eq(B_flags.bucket("new-checkout", "chen"), e.bucket(), "rollout reports the bucket");
        eq(B_flags.bucket("new-checkout", "chen") < 5000 ? "on" : "off", e.variation(), "rollout picks by bucket");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("chen", Map.of("country", "IN")), "x");
        eq("MISSING_ATTRIBUTE", e.reason(), "no plan: NOT_IN cannot match, falls through to org rollout, and there is no org");
        eq("x", e.variation(), "missing bucketing attribute → default");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("chen", Map.of("country", "IN", "plan", "free")), "x");
        eq("MISSING_ATTRIBUTE", e.reason(), "free plan fails NOT_IN; fallthrough needs org");
        e = B_flags.evaluate(rs, "new-checkout", new B_flags.Context("gus", Map.of("org", "acme")), "x");
        eq("FALLTHROUGH", e.reason(), "fallthrough");
        eq(B_flags.bucket("new-checkout", "acme") < 1000 ? "on" : "off", e.variation(), "bucket by org, not user");
        eq(e.variation(), B_flags.evaluate(rs, "new-checkout", new B_flags.Context("hana", Map.of("org", "acme")), "x").variation(), "same org, same answer");

        boolean threw = false;
        try { new B_flags.Rollout("key", List.of(new B_flags.Slice("on", 5000), new B_flags.Slice("off", 4000))); }
        catch (IllegalArgumentException ex) { threw = true; }
        yes(threw, "weights must sum to 10,000");
        threw = false;
        try { new B_flags.Rollout("key", List.of(new B_flags.Slice("on", 11000), new B_flags.Slice("off", -1000))); }
        catch (IllegalArgumentException ex) { threw = true; }
        yes(threw, "negative weights rejected");

        // Zero-weight slices are never served.
        B_flags.Rollout zero = new B_flags.Rollout("key", List.of(new B_flags.Slice("a", 0), new B_flags.Slice("b", 10_000), new B_flags.Slice("c", 0)));
        B_flags.Flag z = new B_flags.Flag("z", "z", true, "off", Map.of(), List.of(), new B_flags.Serve(null, zero));
        for (int i = 0; i < 1000; i++) eq("b", B_flags.evaluate(rulesetOf(z), "z", user("u" + i), "x").variation(), "zero-weight slices skipped");
    }

    /** Independent oracle: written as a list of candidate answers, first one wins. */
    static String[] oracle(B_flags.Ruleset rs, String key, B_flags.Context ctx, String fallback) {
        if (rs == null) return new String[]{fallback, "NOT_INITIALIZED"};
        B_flags.Flag f = rs.flags().get(key);
        if (f == null) return new String[]{fallback, "FLAG_NOT_FOUND"};
        if (!f.on()) return new String[]{f.offVariation(), "OFF"};
        if (f.targets().containsKey(ctx.key())) return new String[]{f.targets().get(ctx.key()), "TARGET"};
        int idx = -1;
        for (int i = 0; i < f.rules().size() && idx < 0; i++) {
            boolean all = true;
            for (B_flags.Clause c : f.rules().get(i).clauses()) all &= oracleClause(rs, c, ctx, true);
            if (all) idx = i;
        }
        B_flags.Serve s = idx >= 0 ? f.rules().get(idx).serve() : f.fallthrough();
        String reason = idx >= 0 ? "RULE " + idx : "FALLTHROUGH";
        if (s.rollout() == null) return new String[]{s.variation(), reason};
        String unit = "key".equals(s.rollout().bucketBy()) ? ctx.key() : ctx.attributes().get(s.rollout().bucketBy());
        if (unit == null) return new String[]{fallback, "MISSING_ATTRIBUTE"};
        int b = refBucket(f.salt(), unit);
        int[] cum = new int[s.rollout().slices().size()];
        int sum = 0;
        for (int i = 0; i < cum.length; i++) { sum += s.rollout().slices().get(i).weight(); cum[i] = sum; }
        for (int i = 0; i < cum.length; i++) if (b < cum[i]) return new String[]{s.rollout().slices().get(i).variation(), reason};
        throw new AssertionError("weights");
    }
    static boolean oracleClause(B_flags.Ruleset rs, B_flags.Clause c, B_flags.Context ctx, boolean top) {
        if (c.op() == B_flags.Op.IN_SEGMENT) {
            if (!top) return false;
            return c.values().stream().map(rs.segments()::get).filter(Objects::nonNull).anyMatch(seg ->
                seg.included().contains(ctx.key())
                || (!seg.clauses().isEmpty() && seg.clauses().stream().allMatch(sc -> oracleClause(rs, sc, ctx, false))));
        }
        String v = "key".equals(c.attribute()) ? ctx.key() : ctx.attributes().get(c.attribute());
        if (v == null) return false;
        switch (c.op()) {
            case IN: return c.values().contains(v);
            case NOT_IN: return !c.values().contains(v);
            default: for (String s : c.values()) if (v.endsWith(s)) return true; return false;
        }
    }

    static void evaluateRandomAgainstOracle() {
        Random r = new Random(42);
        String[] keys = {"ana", "ben", "chen", "dara", "eli", "farah", "gus", "hana", "ivo", "jun"};
        String[][] attrValues = {{"country", "IN", "US", "BR"}, {"plan", "free", "pro"}, {"email", "a@kestrel.dev", "b@gmail.com", "c@acme.io"}, {"org", "acme", "globex", "initech"}};
        for (int t = 0; t < 3000; t++) {
            Map<String, B_flags.Segment> segs = new HashMap<>();
            for (String name : List.of("s1", "s2")) {
                Set<String> inc = new HashSet<>();
                for (String k : keys) if (r.nextInt(5) == 0) inc.add(k);
                segs.put(name, new B_flags.Segment(inc, randomClauses(r, attrValues, r.nextInt(3), r.nextInt(4) == 0)));
            }
            Map<String, B_flags.Flag> flags = new HashMap<>();
            for (String fk : List.of("f1", "f2")) {
                Map<String, String> targets = new HashMap<>();
                for (String k : keys) if (r.nextInt(8) == 0) targets.put(k, "v" + r.nextInt(3));
                List<B_flags.Rule> rules = new ArrayList<>();
                for (int i = r.nextInt(4); i > 0; i--) rules.add(new B_flags.Rule(randomClauses(r, attrValues, r.nextInt(3), true), randomServe(r)));
                flags.put(fk, new B_flags.Flag(fk, r.nextBoolean() ? fk : "salt-" + r.nextInt(5), r.nextInt(6) != 0, "off", targets, rules, randomServe(r)));
            }
            B_flags.Ruleset rs = new B_flags.Ruleset(t, flags, segs);
            for (int q = 0; q < 10; q++) {
                Map<String, String> attrs = new HashMap<>();
                for (String[] av : attrValues) if (r.nextInt(4) != 0) attrs.put(av[0], av[1 + r.nextInt(av.length - 1)]);
                B_flags.Context ctx = new B_flags.Context(keys[r.nextInt(keys.length)], attrs);
                String fk = r.nextInt(10) == 0 ? "missing" : (r.nextBoolean() ? "f1" : "f2");
                B_flags.Ruleset maybeNull = r.nextInt(50) == 0 ? null : rs;
                String[] want = oracle(maybeNull, fk, ctx, "dflt");
                B_flags.Evaluation got = B_flags.evaluate(maybeNull, fk, ctx, "dflt");
                eq(want[0], got.variation(), "random eval variation #" + t);
                eq(want[1], got.reason(), "random eval reason #" + t);
            }
        }
    }
    static List<B_flags.Clause> randomClauses(Random r, String[][] attrValues, int n, boolean allowSegments) {
        List<B_flags.Clause> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int kind = r.nextInt(allowSegments ? 4 : 3);
            if (kind == 3) { out.add(clause("", B_flags.Op.IN_SEGMENT, r.nextBoolean() ? "s1" : "s2")); continue; }
            String[] av = attrValues[r.nextInt(attrValues.length)];
            if (kind == 2) { out.add(clause("email", B_flags.Op.ENDS_WITH, r.nextBoolean() ? "@kestrel.dev" : ".io")); continue; }
            String v = av[1 + r.nextInt(av.length - 1)];
            out.add(clause(r.nextInt(6) == 0 ? "key" : av[0], kind == 0 ? B_flags.Op.IN : B_flags.Op.NOT_IN, r.nextInt(6) == 0 ? "chen" : v));
        }
        return out;
    }
    static B_flags.Serve randomServe(Random r) {
        if (r.nextBoolean()) return fixed("v" + r.nextInt(3));
        int parts = 1 + r.nextInt(3), left = 10_000;
        List<B_flags.Slice> slices = new ArrayList<>();
        for (int i = 0; i < parts; i++) {
            int w = i == parts - 1 ? left : r.nextInt(left + 1);
            slices.add(new B_flags.Slice("v" + i, w));
            left -= w;
        }
        String[] by = {"key", "key", "org", "country"};
        return new B_flags.Serve(null, new B_flags.Rollout(by[r.nextInt(by.length)], slices));
    }

    // ---------- the store ----------

    static B_flags.Flag constFlag(String key, String v) { return new B_flags.Flag(key, key, true, "off", Map.of(), List.of(), fixed(v)); }
    static B_flags.Ruleset snapshot(long version, B_flags.Flag... flags) {
        Map<String, B_flags.Flag> m = new HashMap<>();
        for (B_flags.Flag f : flags) m.put(f.key(), f);
        return new B_flags.Ruleset(version, m, Map.of());
    }

    static void storeVersions() {
        B_flags.FlagStore store = new B_flags.FlagStore();
        eq("safe", store.variation("a", user("ana"), "safe"), "before any snapshot: defaults");
        eq(B_flags.Applied.NEED_SNAPSHOT, store.applyPatch(1, "a", constFlag("a", "x")), "patch before snapshot");
        yes(store.applySnapshot(snapshot(41, constFlag("a", "one"))), "first snapshot accepted");
        eq("one", store.variation("a", user("ana"), "safe"), "serves snapshot");
        eq(B_flags.Applied.APPLIED, store.applyPatch(42, "a", constFlag("a", "two")), "next version applies");
        eq("two", store.variation("a", user("ana"), "safe"), "patched");
        eq(B_flags.Applied.IGNORED_OLD, store.applyPatch(42, "a", constFlag("a", "dup")), "duplicate ignored");
        eq(B_flags.Applied.IGNORED_OLD, store.applyPatch(30, "a", constFlag("a", "old")), "old ignored");
        eq("two", store.variation("a", user("ana"), "safe"), "still two");
        eq(B_flags.Applied.NEED_SNAPSHOT, store.applyPatch(44, "a", constFlag("a", "skip")), "gap: 42 → 44");
        eq(42L, store.current().version(), "gap left state unchanged");
        yes(!store.applySnapshot(snapshot(40, constFlag("a", "older"))), "older snapshot rejected");
        yes(store.applySnapshot(snapshot(44, constFlag("a", "four"), constFlag("b", "bee"))), "resync snapshot");
        eq(B_flags.Applied.APPLIED, store.applyPatch(45, "b", null), "delete patch");
        eq("safe", store.variation("b", user("ana"), "safe"), "deleted flag → default");
        eq("four", store.variation("a", user("ana"), "safe"), "other flags kept");

        // Random sequences against a simple model.
        Random r = new Random(5);
        for (int t = 0; t < 500; t++) {
            B_flags.FlagStore s = new B_flags.FlagStore();
            long modelVersion = -1; Map<String, String> model = null;
            for (int op = 0; op < 40; op++) {
                if (r.nextInt(6) == 0) {
                    long v = r.nextInt(30);
                    String val = "s" + v;
                    boolean ok = s.applySnapshot(snapshot(v, constFlag("a", val)));
                    boolean expect = model == null || v > modelVersion;
                    eq(expect, ok, "snapshot acceptance");
                    if (expect) { modelVersion = v; model = new HashMap<>(Map.of("a", val)); }
                } else {
                    long v = modelVersion + r.nextInt(4) - 1;
                    String k = r.nextBoolean() ? "a" : "b";
                    boolean del = r.nextInt(4) == 0;
                    B_flags.Applied got = s.applyPatch(v, k, del ? null : constFlag(k, "p" + v));
                    B_flags.Applied want = model == null ? B_flags.Applied.NEED_SNAPSHOT
                            : v <= modelVersion ? B_flags.Applied.IGNORED_OLD
                            : v == modelVersion + 1 ? B_flags.Applied.APPLIED : B_flags.Applied.NEED_SNAPSHOT;
                    eq(want, got, "patch outcome");
                    if (want == B_flags.Applied.APPLIED) { modelVersion = v; if (del) model.remove(k); else model.put(k, "p" + v); }
                }
                for (String k : List.of("a", "b"))
                    eq(model == null ? "d" : model.getOrDefault(k, "d"), s.variation(k, user("x"), "d"), "store matches model");
            }
        }
    }

    static void storeConcurrency() throws Exception {
        // A writer applies 20,000 patches; each sets flag "v" to a variation naming its own version.
        // Readers check that the ruleset version and the flag content always agree (no torn snapshot)
        // and that the version never goes backwards.
        B_flags.FlagStore store = new B_flags.FlagStore();
        store.applySnapshot(snapshot(0, constFlag("v", "0")));
        AtomicBoolean done = new AtomicBoolean(false);
        AtomicInteger readerChecks = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<?>> readers = new ArrayList<>();
        for (int t = 0; t < 3; t++) readers.add(pool.submit(() -> {
            long last = -1;
            while (!done.get()) {
                B_flags.Ruleset rs = store.current();
                String v = B_flags.evaluate(rs, "v", user("ana"), "none").variation();
                if (!v.equals(String.valueOf(rs.version()))) throw new AssertionError("torn read: version " + rs.version() + " flag " + v);
                if (rs.version() < last) throw new AssertionError("version went backwards");
                last = rs.version();
                readerChecks.incrementAndGet();
            }
            return null;
        }));
        Future<?> writer = pool.submit(() -> {
            for (long v = 1; v <= 20_000; v++)
                if (store.applyPatch(v, "v", constFlag("v", String.valueOf(v))) != B_flags.Applied.APPLIED) throw new AssertionError("patch " + v);
            return null;
        });
        writer.get(30, TimeUnit.SECONDS);
        done.set(true);
        for (Future<?> f : readers) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();
        eq(20_000L, store.current().version(), "all patches applied");
        yes(readerChecks.get() > 0, "readers ran");
    }

    // ---------- SRM ----------

    static void srmNumbers() {
        double chi = B_srm.srmChiSquare(50_000, 51_500, 0.5);
        yes(Math.abs(chi - 22.1675) < 0.001, "SRM chi-square 50,000 vs 51,500 ≈ 22.17 (got " + chi + ")");
        yes(B_srm.sampleRatioMismatch(50_000, 51_500, 0.5), "flagged as SRM");
        double small = B_srm.srmChiSquare(50_000, 50_300, 0.5);
        yes(Math.abs(small - 0.897) < 0.001, "50,000 vs 50,300 ≈ 0.90 (got " + small + ")");
        yes(!B_srm.sampleRatioMismatch(50_000, 50_300, 0.5), "not SRM");
        yes(B_srm.srmChiSquare(90_000, 10_000, 0.9) < 1e-9, "exact 90/10 split scores zero");
        yes(B_srm.sampleRatioMismatch(89_000, 11_000, 0.9), "89/11 on a 90/10 design is SRM");
        // Fair coin flips almost never trip the alarm.
        Random r = new Random(3);
        int alarms = 0, trials = 2000;
        for (int t = 0; t < trials; t++) {
            int a = 0, n = 10_000;
            for (int i = 0; i < n; i++) if (r.nextBoolean()) a++;
            if (B_srm.sampleRatioMismatch(a, n - a, 0.5)) alarms++;
        }
        yes(alarms <= 10, "fair splits rarely flagged (" + alarms + " of " + trials + ")");
    }
}
