import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Exercises every block in src/lessons/url-shortener.mdx (group "codes"):
//  - Base62: the exact values the lesson quotes, round trips for 0, Long.MAX_VALUE and 200,000 random
//    longs against an independent BigInteger oracle, order preservation of fixed-width codes, and
//    every rejection path (negative, too wide, bad character, overflow).
//  - RangeIdGenerator: 8 "servers" × 4 threads drawing ids concurrently from one counter row — no
//    duplicates, no gaps when nobody crashes, and a crashed server's block is never re-issued.
//  - CodeScrambler: an exhaustive bijection check on small domains, round trips and spread on 62^7.
//  - CodeMinter: collision rate tracks the fill fraction (the lesson's 1-in-19 claim, scaled down),
//    concurrent creates never overwrite each other, aliases share the namespace, a full space fails loudly.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    static void throwsA(Class<? extends Throwable> type, Runnable r, String what) {
        checks++;
        try { r.run(); } catch (Throwable t) {
            if (type.isInstance(t)) return;
            throw new AssertionError(what + ": expected " + type.getSimpleName() + " but got " + t);
        }
        throw new AssertionError(what + ": expected " + type.getSimpleName() + ", nothing thrown");
    }

    static final long N7 = 3_521_614_606_208L;   // 62^7

    public static void main(String[] args) throws Exception {
        keyspaceNumbers();
        base62Fixed();
        base62Random();
        ranges();
        rangeCrash();
        scramblerExhaustive();
        scramblerSevenChars();
        minterCollisionRate();
        minterConcurrent();
        aliases();
        fullSpace();
        System.out.println("OK url-shortener: " + checks + " checks passed");
    }

    // Numbers the lesson quotes.
    static void keyspaceNumbers() {
        long p = 1;
        for (int i = 0; i < 7; i++) p *= 62;
        eq(N7, p, "62^7");
        eq(56_800_235_584L, p / 62, "62^6");
        eq(N7, B_codes.CodeScrambler.SEVEN_CHARS, "scrambler domain is 62^7");
        yes((1L << 42) >= N7 && (1L << 41) < N7, "42 bits is the smallest power of two covering 62^7");
        long links5y = 100_000_000L * 365 * 5;
        eq(182_500_000_000L, links5y, "links in five years");
        double fill = (double) links5y / N7;
        yes(Math.abs(fill - 0.0518) < 0.0001, "five-year fill is about 5.2%");
        yes(Math.round(1 / fill) == 19, "one random guess in about 19 hits a real link");
        double half = Math.sqrt(2 * N7 * Math.log(2));
        yes(half > 2.2e6 && half < 2.22e6, "birthday 50% point is about 2.2 million codes");
        // Snowflake in base62: 10 characters for ~6.3 years, then 11.
        long msPerYear = 365L * 86_400_000L;
        eq(10, B_codes.Base62.encode(msPerYear << 22).length(), "a one-year-old Snowflake id is 10 chars");
        eq(11, B_codes.Base62.encode((7 * msPerYear) << 22).length(), "a seven-year-old Snowflake id is 11 chars");
    }

    static void base62Fixed() {
        eq("0", B_codes.Base62.encode(0), "encode 0");
        eq("z", B_codes.Base62.encode(61), "encode 61");
        eq("10", B_codes.Base62.encode(62), "encode 62");
        eq("1000000", B_codes.Base62.encode(56_800_235_584L), "62^6 is the smallest 7-char code");
        eq("zzzzzzz", B_codes.Base62.encode(N7 - 1), "62^7 - 1 is the largest 7-char code");
        eq("AzL8n0Y58m7", B_codes.Base62.encode(Long.MAX_VALUE), "Long.MAX_VALUE");
        eq(Long.MAX_VALUE, B_codes.Base62.decode("AzL8n0Y58m7"), "decode Long.MAX_VALUE");
        eq(0L, B_codes.Base62.decode("0"), "decode 0");
        eq(0L, B_codes.Base62.decode("0000000"), "decode padded 0");
        eq("0000000", B_codes.Base62.encode(0, 7), "pad 0 to 7");
        eq("00000G8", B_codes.Base62.encode(1000, 7), "pad 1000 to 7");
        eq(1000L, B_codes.Base62.decode("00000G8"), "decode padded 1000");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.encode(-1), "negative id rejected");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.encode(N7, 7), "62^7 does not fit in 7");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.decode(""), "empty code rejected");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.decode("ab-c"), "non-base62 char rejected");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.decode("é"), "non-ASCII rejected");
        throwsA(IllegalArgumentException.class, () -> B_codes.Base62.decode("000000000000"), "12 chars rejected");
        throwsA(ArithmeticException.class, () -> B_codes.Base62.decode("AzL8n0Y58m8"), "Long.MAX_VALUE + 1 overflows");
        throwsA(ArithmeticException.class, () -> B_codes.Base62.decode("zzzzzzzzzzz"), "62^11 - 1 overflows");
    }

    static final String ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    static String oracleEncode(long n) {
        BigInteger v = BigInteger.valueOf(n), base = BigInteger.valueOf(62);
        if (v.signum() == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (v.signum() > 0) { BigInteger[] qr = v.divideAndRemainder(base); sb.append(ALPHA.charAt(qr[1].intValue())); v = qr[0]; }
        return sb.reverse().toString();
    }
    static BigInteger oracleDecode(String s) {
        BigInteger v = BigInteger.ZERO;
        for (char c : s.toCharArray()) v = v.multiply(BigInteger.valueOf(62)).add(BigInteger.valueOf(ALPHA.indexOf(c)));
        return v;
    }

    static void base62Random() {
        Random rnd = new Random(62);
        long[] edges = {0, 1, 61, 62, 63, 3843, 3844, N7 - 1, N7, Long.MAX_VALUE - 1, Long.MAX_VALUE};
        for (long n : edges) {
            eq(oracleEncode(n), B_codes.Base62.encode(n), "oracle encode " + n);
            eq(n, B_codes.Base62.decode(B_codes.Base62.encode(n)), "round trip " + n);
        }
        for (int i = 0; i < 200_000; i++) {
            long n = rnd.nextLong() & Long.MAX_VALUE;
            if (i % 3 == 0) n >>>= rnd.nextInt(63);          // also small and medium values
            String s = B_codes.Base62.encode(n);
            if (i % 50 == 0) eq(oracleEncode(n), s, "oracle encode random");
            eq(n, B_codes.Base62.decode(s), "round trip random");
        }
        // Random strings decode like the oracle, or overflow exactly when the oracle exceeds Long.MAX_VALUE.
        BigInteger max = BigInteger.valueOf(Long.MAX_VALUE);
        for (int i = 0; i < 20_000; i++) {
            int len = 1 + rnd.nextInt(11);
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < len; j++) sb.append(ALPHA.charAt(rnd.nextInt(62)));
            String s = sb.toString();
            BigInteger want = oracleDecode(s);
            if (want.compareTo(max) > 0) throwsA(ArithmeticException.class, () -> B_codes.Base62.decode(s), "overflow " + s);
            else eq(want.longValue(), B_codes.Base62.decode(s), "decode " + s);
        }
        // Fixed-width codes sort in numeric order (the alphabet is in ASCII order).
        for (int i = 0; i < 20_000; i++) {
            long a = Math.floorMod(rnd.nextLong(), N7), b = Math.floorMod(rnd.nextLong(), N7);
            int byNumber = Long.compare(a, b);
            int byCode = Integer.signum(B_codes.Base62.encode(a, 7).compareTo(B_codes.Base62.encode(b, 7)));
            eq(byNumber, byCode, "fixed-width order");
        }
    }

    // 8 servers, each with its own generator shared by 4 threads, all reserving blocks from one counter row.
    static void ranges() throws Exception {
        B_codes.CounterRow row = new B_codes.CounterRow(0);
        int servers = 8, threadsPerServer = 4, perThread = 25_000;
        long block = 1_000;
        B_codes.RangeIdGenerator[] gens = new B_codes.RangeIdGenerator[servers];
        for (int s = 0; s < servers; s++) gens[s] = new B_codes.RangeIdGenerator(row, block);
        ExecutorService pool = Executors.newFixedThreadPool(servers * threadsPerServer);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<long[]>> futures = new ArrayList<>();
        for (int s = 0; s < servers; s++) for (int t = 0; t < threadsPerServer; t++) {
            B_codes.RangeIdGenerator g = gens[s];
            futures.add(pool.submit(() -> {
                start.await();
                long[] out = new long[perThread];
                for (int i = 0; i < perThread; i++) out[i] = g.nextId();
                return out;
            }));
        }
        start.countDown();
        long[] all = new long[servers * threadsPerServer * perThread];
        int k = 0;
        for (Future<long[]> f : futures) for (long id : f.get(30, TimeUnit.SECONDS)) all[k++] = id;
        pool.shutdown();
        Arrays.sort(all);
        for (int i = 0; i < all.length; i++) if (all[i] != i) eq((long) i, all[i], "ids are exactly 0.." + (all.length - 1));
        checks++;
        // Each server used exactly 100 full blocks of 1,000, so the counter moved exactly 800,000 — 800 reservations.
        eq((long) all.length, row.reserve(0), "counter advanced by exactly the ids handed out");
    }

    // A server that dies mid-block leaves a gap; its ids are never handed out again.
    static void rangeCrash() {
        B_codes.CounterRow row = new B_codes.CounterRow(1_240_000);
        B_codes.RangeIdGenerator a = new B_codes.RangeIdGenerator(row, 10_000);
        Set<Long> seen = new HashSet<>();
        for (int i = 0; i < 5_000; i++) yes(seen.add(a.nextId()), "server A unique");
        eq(1_244_999L, Collections.max(seen), "server A got to 1,244,999 then crashed");
        // A is gone. Its replacement and a peer keep going.
        B_codes.RangeIdGenerator a2 = new B_codes.RangeIdGenerator(row, 10_000), b = new B_codes.RangeIdGenerator(row, 10_000);
        eq(1_250_000L, a2.nextId(), "replacement starts at the next block, after A's");
        eq(1_260_000L, b.nextId(), "peer gets its own block");
        for (int i = 0; i < 30_000; i++) {
            long x = (i % 2 == 0 ? a2 : b).nextId();
            yes(x < 1_245_000 || x >= 1_250_000, "A's unused half is never re-issued");
            yes(seen.add(x), "no duplicates after the crash");
        }
        throwsA(IllegalArgumentException.class, () -> new B_codes.RangeIdGenerator(row, 0), "block size must be positive");
    }

    static void scramblerExhaustive() {
        int[][] shapes = {{3000, 6}, {4096, 6}, {1, 1}, {37, 3}, {62 * 62 * 62, 9}};
        Random rnd = new Random(7);
        for (int[] shape : shapes) {
            int domain = shape[0], half = shape[1];
            B_codes.CodeScrambler s = new B_codes.CodeScrambler(domain, half, rnd.nextLong(), rnd.nextLong(), rnd.nextLong(), rnd.nextLong());
            boolean[] hit = new boolean[domain];
            for (int x = 0; x < domain; x++) {
                long y = s.scramble(x);
                yes(y >= 0 && y < domain, "scramble stays in [0, " + domain + ")");
                yes(!hit[(int) y], "scramble is one-to-one on " + domain);
                hit[(int) y] = true;
                eq((long) x, s.unscramble(y), "unscramble inverts scramble");
            }
        }
        throwsA(IllegalArgumentException.class, () -> new B_codes.CodeScrambler(5000, 6, 1, 2, 3), "domain larger than 2^(2*half) rejected");
    }

    static void scramblerSevenChars() {
        B_codes.CodeScrambler s = B_codes.CodeScrambler.sevenChars(0x5eedL, 0xc0ffeeL, 0xbadc0deL, 0x1234567L);
        Random rnd = new Random(42);
        for (int i = 0; i < 100_000; i++) {
            long x = Math.floorMod(rnd.nextLong(), N7);
            long y = s.scramble(x);
            yes(y >= 0 && y < N7, "7-char scramble in range");
            eq(x, s.unscramble(y), "7-char round trip");
            eq(7, B_codes.Base62.encode(y, 7).length(), "always 7 characters");
        }
        // Consecutive counter values come out distinct and nowhere near consecutive.
        Set<Long> outs = new HashSet<>();
        long prev = -1, adjacent = 0;
        for (long x = 0; x < 100_000; x++) {
            long y = s.scramble(x);
            yes(outs.add(y), "consecutive inputs give distinct codes");
            if (y == prev + 1) adjacent++;
            prev = y;
        }
        yes(adjacent < 5, "consecutive inputs do not produce consecutive codes (" + adjacent + ")");
        throwsA(IllegalArgumentException.class, () -> s.scramble(N7), "62^7 is outside the domain");
        throwsA(IllegalArgumentException.class, () -> s.scramble(-1), "negative is outside the domain");
    }

    // Per-attempt collision probability equals the fill fraction. Scaled down: 3 chars = 238,328 codes.
    static void minterCollisionRate() {
        B_codes.LinkStore store = new B_codes.LinkStore();
        B_codes.CodeMinter m = new B_codes.CodeMinter(store, new Random(1), 3, 100);
        long space = 62L * 62 * 62;
        while (store.size() < space / 4) m.create("https://example.com/" + store.size());
        long before = m.collisions.get();
        double expected = 0;
        for (int i = 0; i < 20_000; i++) {
            double f = (double) store.size() / space;
            expected += f / (1 - f);                  // expected failed draws before a success at fill f
            String code = m.create("https://example.com/x" + i);
            eq(3, code.length(), "3-char code");
        }
        long got = m.collisions.get() - before;
        yes(Math.abs(got - expected) < 0.05 * expected, "collisions " + got + " ≈ expected " + Math.round(expected));
    }

    static void minterConcurrent() throws Exception {
        B_codes.LinkStore store = new B_codes.LinkStore();
        B_codes.CodeMinter m = new B_codes.CodeMinter(store, new Random(3), 3, 100);
        int threads = 8, per = 5_000;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Map<String, String>>> fs = new ArrayList<>();
        for (int t = 0; t < threads; t++) {
            int id = t;
            fs.add(pool.submit(() -> {
                start.await();
                Map<String, String> mine = new HashMap<>();
                for (int i = 0; i < per; i++) { String url = "https://t" + id + ".example/" + i; mine.put(m.create(url), url); }
                return mine;
            }));
        }
        start.countDown();
        Map<String, String> all = new HashMap<>();
        for (Future<Map<String, String>> f : fs) for (Map.Entry<String, String> e : f.get(30, TimeUnit.SECONDS).entrySet())
            yes(all.put(e.getKey(), e.getValue()) == null, "no code handed to two creates");
        pool.shutdown();
        eq(threads * per, all.size(), "every create got its own code");
        eq(threads * per, store.size(), "store holds exactly the created links");
        for (Map.Entry<String, String> e : all.entrySet()) eq(e.getValue(), store.get(e.getKey()), "no link overwritten");
        yes(m.collisions.get() > 0, "collisions happened and were retried");
    }

    static void aliases() {
        B_codes.LinkStore store = new B_codes.LinkStore();
        B_codes.CodeMinter m = new B_codes.CodeMinter(store, new Random(5), 7, 5);
        yes(m.claimAlias("spring-sale", "https://shop.example/spring"), "free alias claimed");
        yes(!m.claimAlias("spring-sale", "https://other.example/"), "taken alias → false (409)");
        eq("https://shop.example/spring", store.get("spring-sale"), "first owner keeps the alias");
        String code = m.create("https://a.example/");
        yes(!m.claimAlias(code, "https://b.example/"), "an alias cannot take a generated code");
        eq("https://a.example/", store.get(code), "generated link untouched");
        throwsA(IllegalArgumentException.class, () -> m.claimAlias("api", "https://x.example/"), "reserved word");
        throwsA(IllegalArgumentException.class, () -> m.claimAlias("Admin", "https://x.example/"), "reserved, any case");
        throwsA(IllegalArgumentException.class, () -> m.claimAlias("ab", "https://x.example/"), "too short");
        throwsA(IllegalArgumentException.class, () -> m.claimAlias("has space", "https://x.example/"), "bad character");
        throwsA(IllegalArgumentException.class, () -> m.claimAlias("x".repeat(33), "https://x.example/"), "too long");
        yes(m.claimAlias("Kestrel_2026", "https://k.example/"), "letters, digits, _ and - allowed");
    }

    static void fullSpace() {
        B_codes.LinkStore store = new B_codes.LinkStore();
        for (int i = 0; i < 62; i++) yes(store.insertIfAbsent(B_codes.Base62.encode(i), "u" + i), "fill 1-char space");
        B_codes.CodeMinter m = new B_codes.CodeMinter(store, new Random(9), 1, 20);
        throwsA(IllegalStateException.class, () -> m.create("https://late.example/"), "a full space fails loudly");
        eq(20L, m.collisions.get(), "it tried exactly maxAttempts times");
    }
}
