import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// Exercises every limiter in src/lessons/rate-limiter.mdx with a fake clock:
//  - the exact numbers the lesson quotes (boundary burst, weighted estimate, lazy refill, Retry-After),
//  - thousands of random request sequences against independent oracles,
//  - TokenBucket and GCRA agreeing decision-for-decision (the lesson's equivalence claim),
//  - the "keep the partial token" bug from the lesson failing on the input it names,
//  - real threads hammering each limiter without a single over-admission.
public class Check {
    static int checks = 0;
    static final long MS = 1_000_000L, SEC = 1_000_000_000L;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }

    /** A clock the test moves by hand. */
    static final class FakeClock implements LongSupplier {
        long now;
        FakeClock(long start) { now = start; }
        public long getAsLong() { return now; }
    }

    static int admit(BooleanSupplier limiter, int attempts) {
        int ok = 0;
        for (int i = 0; i < attempts; i++) if (limiter.getAsBoolean()) ok++;
        return ok;
    }

    public static void main(String[] args) throws Exception {
        fixedWindowNumbers();
        slidingLogNumbers();
        slidingCounterNumbers();
        tokenBucketNumbers();
        gcraNumbers();
        randomAgainstOracles();
        lostPartialTokenBug();
        concurrency();
        keyed();
        System.out.println("OK rate-limiter: " + checks + " checks passed");
    }

    // Chapter 5: 100 per minute; 100 requests at 11:59:59 and 100 at 12:00:00 all pass.
    static void fixedWindowNumbers() {
        FakeClock c = new FakeClock(0);
        B_limiters.FixedWindowCounter fw = new B_limiters.FixedWindowCounter(100, 60 * SEC, c);
        c.now = 59 * SEC;                                   // "11:59:59" — last second of window 0
        eq(100, admit(fw::tryAcquire, 100), "fixed: 100 admitted at 11:59:59");
        eq(false, fw.tryAcquire(), "fixed: 101st in the same window rejected");
        c.now = 60 * SEC;                                   // "12:00:00" — first instant of window 1
        eq(100, admit(fw::tryAcquire, 150), "fixed: another 100 admitted at 12:00:00");
        // 200 admitted inside a span of one second: twice the limit.
        c.now = 119 * SEC + 999 * MS;
        eq(0, admit(fw::tryAcquire, 5), "fixed: window 1 stays shut until 2:00");
        c.now = 120 * SEC;
        eq(100, admit(fw::tryAcquire, 120), "fixed: window 2 opens with a full quota");
    }

    // Chapter 6: limit 3 per second; the window is (now − 1 s, now].
    static void slidingLogNumbers() {
        FakeClock c = new FakeClock(0);
        B_limiters.SlidingWindowLog log = new B_limiters.SlidingWindowLog(3, SEC, c);
        eq(3, admit(log::tryAcquire, 5), "log: 3 at t=0");
        c.now = 999 * MS;
        eq(false, log.tryAcquire(), "log: t=999 ms still sees the three from t=0");
        c.now = SEC;
        eq(3, admit(log::tryAcquire, 5), "log: at t=1 s the t=0 entries have slid out");
        // The fixed-window burst cannot happen: 3 at 0.9 s, then at 1.0 s nothing new.
        FakeClock d = new FakeClock(0);
        B_limiters.SlidingWindowLog log2 = new B_limiters.SlidingWindowLog(100, 60 * SEC, d);
        d.now = 59 * SEC;
        eq(100, admit(log2::tryAcquire, 100), "log: 100 at 11:59:59");
        d.now = 60 * SEC;
        eq(0, admit(log2::tryAcquire, 100), "log: zero more at 12:00:00");
        d.now = 119 * SEC;
        eq(100, admit(log2::tryAcquire, 150), "log: refills only when 11:59:59 slides out at 12:00:59");
    }

    // Chapter 7: limit 100/min. previous = 80, current = 30, 15 s into the window: estimate 60 + 30 = 90.
    static void slidingCounterNumbers() {
        FakeClock c = new FakeClock(0);
        B_limiters.SlidingWindowCounter sw = new B_limiters.SlidingWindowCounter(100, 60 * SEC, c);
        c.now = 30 * SEC;
        eq(80, admit(sw::tryAcquire, 80), "counter: 80 in the previous minute");
        c.now = 60 * SEC + 15 * SEC;
        eq(30, admit(sw::tryAcquire, 30), "counter: 30 so far this minute");
        eq(10, admit(sw::tryAcquire, 50), "counter: at 15 s, 80 × 0.75 + 30 = 90, so exactly 10 more");
        // Earlier in the window the previous minute weighs more: at 5 s only 80 × 55/60 = 73.3 is carried.
        FakeClock c2 = new FakeClock(30 * SEC);
        B_limiters.SlidingWindowCounter sw2 = new B_limiters.SlidingWindowCounter(100, 60 * SEC, c2);
        eq(80, admit(sw2::tryAcquire, 80), "counter: 80 in the previous minute (again)");
        c2.now = 65 * SEC;
        eq(27, admit(sw2::tryAcquire, 50), "counter: at 5 s, 73.3 + current < 100 → 27 fit");

        // The boundary after a full minute: 100 admitted in window 0, then the first second of window 1.
        FakeClock d = new FakeClock(0);
        B_limiters.SlidingWindowCounter b = new B_limiters.SlidingWindowCounter(100, 60 * SEC, d);
        d.now = 59 * SEC;
        eq(100, admit(b::tryAcquire, 100), "counter: 100 at 11:59:59");
        d.now = 60 * SEC;
        eq(0, admit(b::tryAcquire, 50), "counter: 12:00:00 → estimate 100 × 60/60 = 100, nothing admitted");
        d.now = 61 * SEC;
        eq(2, admit(b::tryAcquire, 50), "counter: 12:00:01 → 100 × 59/60 = 98.3, two more fit");
        // A skipped window: nothing recent remains.
        d.now = 180 * SEC;
        eq(100, admit(b::tryAcquire, 150), "counter: after an idle window the previous count is zero");

        // Worst case for the approximation: previous window all at its last instant, current spread evenly.
        // The true trailing-minute count can approach 2 × limit (but never in a short burst).
        FakeClock e = new FakeClock(0);
        B_limiters.SlidingWindowCounter w = new B_limiters.SlidingWindowCounter(100, 60 * SEC, e);
        e.now = 60 * SEC - 1;
        eq(100, admit(w::tryAcquire, 100), "counter worst case: 100 at the last nanosecond of window 0");
        int spread = 0;
        for (long t = 60 * SEC; t < 120 * SEC - 2; t += 100 * MS) { e.now = t; if (w.tryAcquire()) spread++; }
        yes(spread >= 98 && spread <= 100, "counter worst case: ~100 more admitted across window 1 (" + spread + ")");
        // Trailing window (t − 60 s, t] at t = 120 s − 2 ns still contains the 100 burst at 60 s − 1 ns.
        yes(100 + spread > 190, "counter worst case: true trailing-minute count exceeds 190");
    }

    // Chapter 8: capacity 100, 10 per second (period 100 ms).
    static void tokenBucketNumbers() {
        FakeClock c = new FakeClock(0);
        B_limiters.TokenBucket tb = new B_limiters.TokenBucket(100, 100 * MS, c);
        eq(97, admit(tb::tryAcquire, 97), "bucket: spend 97 of 100");
        eq(3L, tb.available(), "bucket: 3 left");
        c.now = 450 * MS;                                   // 0.45 s × 10/s = 4.5 tokens earned
        eq(7L, tb.available(), "bucket: 3 + 4 whole tokens (the half token is kept as progress)");
        eq(true, tb.tryAcquire(), "bucket: request allowed");
        eq(6L, tb.available(), "bucket: 6 left (6.5 in the continuous picture)");
        c.now = 500 * MS;                                   // the kept half token completes
        eq(7L, tb.available(), "bucket: 7 at 0.5 s — 3 + 5 earned − 1 spent");

        // Retry-After.
        FakeClock d = new FakeClock(0);
        B_limiters.TokenBucket empty = new B_limiters.TokenBucket(100, 100 * MS, d);
        eq(100, admit(empty::tryAcquire, 150), "bucket: burst of exactly capacity");
        d.now = 30 * MS;
        eq(70 * MS, empty.nanosUntilNextToken(), "bucket: next token in 70 ms");
        eq(1L, (empty.nanosUntilNextToken() + SEC - 1) / SEC, "bucket: Retry-After rounds up to 1 s");
        d.now = 99 * MS;
        eq(false, empty.tryAcquire(), "bucket: 99 ms — still empty");
        d.now = 100 * MS;
        eq(true, empty.tryAcquire(), "bucket: 100 ms — one token");
        eq(false, empty.tryAcquire(), "bucket: and only one");

        // Long idle: never more than capacity, and no overflow after a very long gap.
        d.now = 365L * 24 * 3600 * SEC;
        eq(100L, empty.available(), "bucket: a year idle refills to capacity, not beyond");
        eq(100, admit(empty::tryAcquire, 1000), "bucket: burst after idling is capacity");

        // Clock going backwards does not mint or burn tokens.
        FakeClock back = new FakeClock(10 * SEC);
        B_limiters.TokenBucket tb2 = new B_limiters.TokenBucket(5, 100 * MS, back);
        admit(tb2::tryAcquire, 5);
        back.now = 9 * SEC;
        eq(0L, tb2.available(), "bucket: backwards clock earns nothing");
        back.now = 10 * SEC + 100 * MS;
        eq(1L, tb2.available(), "bucket: and forward again works from the old mark");

        // Time spent full is not banked: full at 0, first spend at 8 s, next token due at 8 s + period.
        FakeClock idle = new FakeClock(0);
        B_limiters.TokenBucket one = new B_limiters.TokenBucket(1, SEC, idle);
        idle.now = 8 * SEC;
        eq(true, one.tryAcquire(), "bucket: spend the only token at 8 s");
        eq(SEC, one.nanosUntilNextToken(), "bucket: next token a full period later, not early");
        idle.now = 9 * SEC - 1;
        eq(false, one.tryAcquire(), "bucket: nothing at 8.999 s");
        idle.now = 9 * SEC;
        eq(true, one.tryAcquire(), "bucket: one at 9 s");

        boolean threw = false;
        try { new B_limiters.TokenBucket(0, 1, back); } catch (IllegalArgumentException ex) { threw = true; }
        yes(threw, "bucket: capacity 0 rejected");
    }

    // Chapter 9: GCRA with T = 100 ms, burst 100 → τ = 9.9 s.
    static void gcraNumbers() {
        FakeClock c = new FakeClock(0);
        B_limiters.Gcra g = new B_limiters.Gcra(100, 100 * MS, c);
        eq(100, admit(g::tryAcquire, 150), "gcra: burst of 100 at t=0");
        eq(100 * MS, g.nanosUntilAllowed(), "gcra: next slot in 100 ms (TAT 10 s − τ 9.9 s)");
        c.now = 100 * MS;
        eq(true, g.tryAcquire(), "gcra: allowed at 100 ms");
        eq(false, g.tryAcquire(), "gcra: one per period after the burst");
        // Lesson example: at 12.0 s five requests book slots up to TAT = 12.5 s. The sixth is 0.5 s ahead of
        // schedule (within τ = 9.9 s), so it is allowed and TAT becomes 12.6 s; 94 more fit before τ is exceeded.
        FakeClock d = new FakeClock(0);
        B_limiters.Gcra h = new B_limiters.Gcra(100, 100 * MS, d);
        d.now = 12 * SEC;
        eq(5, admit(h::tryAcquire, 5), "gcra: five requests at 12.0 s → TAT 12.5 s");
        eq(0L, h.nanosUntilAllowed(), "gcra: 0.5 s ahead ≤ τ, conforming");
        eq(true, h.tryAcquire(), "gcra: sixth allowed, TAT 12.6 s");
        eq(94, admit(h::tryAcquire, 200), "gcra: 94 more until TAT − now would exceed 9.9 s (100 in all)");
        eq(100 * MS, h.nanosUntilAllowed(), "gcra: then one slot per 100 ms");
    }

    // Independent oracle: the continuous token bucket, tokens measured in "token-nanoseconds".
    static final class LevelOracle {
        final long cap, period; long level, last;
        LevelOracle(long cap, long period, long t0) { this.cap = cap; this.period = period; level = cap * period; last = t0; }
        boolean take(long now) {
            level = Math.min(cap * period, level + (now - last));
            last = now;
            if (level >= period) { level -= period; return true; }
            return false;
        }
        long waitNanos() { return level >= period ? 0 : period - level; }
    }

    static void randomAgainstOracles() {
        Random rnd = new Random(42);
        for (int trial = 0; trial < 3000; trial++) {
            long window = 1 + rnd.nextInt(50);
            int limit = 1 + rnd.nextInt(6);
            long period = 1 + rnd.nextInt(20);
            long cap = 1 + rnd.nextInt(6);
            long t0 = rnd.nextInt(3) == 0 ? -rnd.nextInt(1000) : rnd.nextInt(1000);   // negative clocks too
            FakeClock c = new FakeClock(t0);
            B_limiters.FixedWindowCounter fw = new B_limiters.FixedWindowCounter(limit, window, c);
            B_limiters.SlidingWindowLog log = new B_limiters.SlidingWindowLog(limit, window, c);
            B_limiters.SlidingWindowCounter swc = new B_limiters.SlidingWindowCounter(limit, window, c);
            B_limiters.TokenBucket tb = new B_limiters.TokenBucket(cap, period, c);
            B_limiters.Gcra gcra = new B_limiters.Gcra(cap, period, c);
            B_limiters.AtomicGcra atomic = new B_limiters.AtomicGcra(cap, period, c);
            LevelOracle oracle = new LevelOracle(cap, period, t0);
            List<Long> fwAdmitted = new ArrayList<>(), logAdmitted = new ArrayList<>(), swcAdmitted = new ArrayList<>();
            int n = 1 + rnd.nextInt(60);
            long t = t0;
            for (int i = 0; i < n; i++) {
                t += rnd.nextInt(4) == 0 ? 0 : rnd.nextInt((int) Math.max(window, period) * 2);
                c.now = t;
                final long now = t;

                // Fixed window oracle: count admitted with the same floor(t / W).
                long fwSame = fwAdmitted.stream().filter(x -> Math.floorDiv(x, window) == Math.floorDiv(now, window)).count();
                boolean fwExpect = fwSame < limit;
                eq(fwExpect, fw.tryAcquire(), "fixed random trial " + trial);
                if (fwExpect) fwAdmitted.add(now);

                // Sliding log oracle: count admitted in (now − W, now].
                long inWindow = logAdmitted.stream().filter(x -> x > now - window).count();
                boolean logExpect = inWindow < limit;
                eq(logExpect, log.tryAcquire(), "log random trial " + trial);
                if (logExpect) logAdmitted.add(now);

                // Sliding counter oracle: recount both windows from the full history.
                long wi = Math.floorDiv(now, window);
                long prev = swcAdmitted.stream().filter(x -> Math.floorDiv(x, window) == wi - 1).count();
                long cur = swcAdmitted.stream().filter(x -> Math.floorDiv(x, window) == wi).count();
                long into = now - wi * window;
                // estimate < limit  ⇔  prev × (W − into) + cur × W < limit × W  (checked in exact rationals)
                boolean swcExpect = prev * (window - into) + cur * window < (long) limit * window;
                eq(swcExpect, swc.tryAcquire(), "counter random trial " + trial);
                if (swcExpect) swcAdmitted.add(now);

                // Token bucket and GCRA against the continuous oracle — decision for decision.
                boolean expect = oracle.take(now);
                long oracleWaitAfter = oracle.waitNanos();
                eq(expect, tb.tryAcquire(), "bucket random trial " + trial + " step " + i);
                eq(expect, gcra.tryAcquire(), "gcra random trial " + trial + " step " + i);
                eq(expect, atomic.tryAcquire(), "atomic gcra random trial " + trial + " step " + i);
                eq(oracleWaitAfter, tb.nanosUntilNextToken(), "bucket wait matches oracle, trial " + trial + " step " + i);
                eq(oracleWaitAfter, gcra.nanosUntilAllowed(), "gcra wait matches oracle, trial " + trial);
            }
            // Property: the sliding log never has more than `limit` admissions in any window.
            for (long end : logAdmitted) {
                long inside = logAdmitted.stream().filter(x -> x > end - window && x <= end).count();
                yes(inside <= limit, "log never exceeds limit in a window");
            }
            // Property: fixed window can reach, but never exceed, 2 × limit in any window-length span.
            for (long end : fwAdmitted) {
                long inside = fwAdmitted.stream().filter(x -> x > end - window && x <= end).count();
                yes(inside <= 2L * limit, "fixed window never exceeds 2 × limit in a window-length span");
            }
        }
    }

    // Catch the bug (Chapter 8): resetting lastRefill to `now` with whole tokens throws away partial progress.
    static final class BuggyBucket {
        long cap, period, tokens, last;
        BuggyBucket(long cap, long period, long t0) { this.cap = cap; this.period = period; tokens = cap; last = t0; }
        boolean tryAcquire(long now) {
            tokens = Math.min(cap, tokens + (now - last) / period);
            last = now;                                   // the bug
            if (tokens == 0) return false;
            tokens--;
            return true;
        }
    }

    static void lostPartialTokenBug() {
        // Refill 10/s (period 100 ms); bucket drained; the client retries every 90 ms for 9 seconds.
        BuggyBucket bug = new BuggyBucket(10, 100 * MS, 0);
        FakeClock c = new FakeClock(0);
        B_limiters.TokenBucket good = new B_limiters.TokenBucket(10, 100 * MS, c);
        for (int i = 0; i < 10; i++) { bug.tryAcquire(0); good.tryAcquire(); }
        int bugOk = 0, goodOk = 0;
        for (long t = 90 * MS; t <= 9 * SEC; t += 90 * MS) {
            c.now = t;
            if (bug.tryAcquire(t)) bugOk++;
            if (good.tryAcquire()) goodOk++;
        }
        eq(0, bugOk, "buggy bucket: retries every 90 ms never earn a token");
        eq(90, goodOk, "correct bucket: 9 s × 10/s = 90 tokens earned and spent");
    }

    static void hammer(int threads, int perThread, BooleanSupplier limiter, Runnable tick, AtomicInteger admitted) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) futures.add(pool.submit(() -> {
            start.await();
            for (int k = 0; k < perThread; k++) { tick.run(); if (limiter.getAsBoolean()) admitted.incrementAndGet(); }
            return null;
        }));
        start.countDown();
        for (Future<?> f : futures) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();
        yes(pool.awaitTermination(10, TimeUnit.SECONDS), "threads finished");
    }

    static void concurrency() throws Exception {
        for (int round = 0; round < 5; round++) {
            // Frozen clock: every limiter must admit exactly its limit, no matter how threads interleave.
            LongSupplier frozen = () -> 7 * SEC;
            AtomicInteger a = new AtomicInteger();
            B_limiters.TokenBucket tb = new B_limiters.TokenBucket(1000, 100 * MS, frozen);
            hammer(16, 5000, tb::tryAcquire, () -> {}, a);
            eq(1000, a.get(), "threads: token bucket admits exactly capacity");

            AtomicInteger b = new AtomicInteger();
            B_limiters.SlidingWindowLog log = new B_limiters.SlidingWindowLog(700, SEC, frozen);
            hammer(16, 5000, log::tryAcquire, () -> {}, b);
            eq(700, b.get(), "threads: sliding log admits exactly limit");

            AtomicInteger c = new AtomicInteger();
            B_limiters.SlidingWindowCounter swc = new B_limiters.SlidingWindowCounter(800, SEC, frozen);
            hammer(16, 5000, swc::tryAcquire, () -> {}, c);
            eq(800, c.get(), "threads: sliding counter admits exactly limit");

            AtomicInteger d = new AtomicInteger();
            B_limiters.Gcra g = new B_limiters.Gcra(900, 100 * MS, frozen);
            hammer(16, 5000, g::tryAcquire, () -> {}, d);
            eq(900, d.get(), "threads: gcra admits exactly burst");

            AtomicInteger d2 = new AtomicInteger();
            B_limiters.AtomicGcra ag = new B_limiters.AtomicGcra(900, 100 * MS, frozen);
            hammer(16, 5000, ag::tryAcquire, () -> {}, d2);
            eq(900, d2.get(), "threads: lock-free gcra admits exactly burst");

            AtomicInteger e = new AtomicInteger();
            B_limiters.FixedWindowCounter fw = new B_limiters.FixedWindowCounter(600, SEC, frozen);
            hammer(16, 5000, fw::tryAcquire, () -> {}, e);
            eq(600, e.get(), "threads: fixed window admits exactly limit");

            // Moving clock shared by all threads: admissions never exceed capacity + earned tokens.
            AtomicLong clock = new AtomicLong(0);
            AtomicInteger f = new AtomicInteger();
            B_limiters.TokenBucket moving = new B_limiters.TokenBucket(50, 1000, clock::get);
            hammer(16, 20000, moving::tryAcquire, () -> clock.addAndGet(7), f);
            long bound = 50 + clock.get() / 1000;
            yes(f.get() <= bound, "threads: moving clock, admitted " + f.get() + " ≤ " + bound);
            yes(f.get() >= 50, "threads: moving clock admitted at least the initial burst");

            AtomicInteger h = new AtomicInteger();
            AtomicLong clock2 = new AtomicLong(0);
            B_limiters.Gcra movingG = new B_limiters.Gcra(50, 1000, clock2::get);
            hammer(16, 20000, movingG::tryAcquire, () -> clock2.addAndGet(7), h);
            yes(h.get() <= 50 + clock2.get() / 1000, "threads: moving clock gcra within bound");

            AtomicInteger h2 = new AtomicInteger();
            AtomicLong clock3 = new AtomicLong(0);
            B_limiters.AtomicGcra movingA = new B_limiters.AtomicGcra(50, 1000, clock3::get);
            hammer(16, 20000, movingA::tryAcquire, () -> clock3.addAndGet(7), h2);
            yes(h2.get() <= 50 + clock3.get() / 1000, "threads: moving clock lock-free gcra within bound");
        }
    }

    static void keyed() throws Exception {
        LongSupplier frozen = () -> 0L;
        for (int round = 0; round < 5; round++) {
            B_limiters.KeyedLimiter limiter = new B_limiters.KeyedLimiter(k -> new B_limiters.TokenBucket(20, SEC, frozen));
            ConcurrentHashMap<String, AtomicInteger> perKey = new ConcurrentHashMap<>();
            ExecutorService pool = Executors.newFixedThreadPool(12);
            CountDownLatch start = new CountDownLatch(1);
            List<Future<?>> fs = new ArrayList<>();
            for (int i = 0; i < 12; i++) fs.add(pool.submit(() -> {
                start.await();
                for (int k = 0; k < 3000; k++) {
                    String key = "k" + (k % 50);
                    if (limiter.tryAcquire(key)) perKey.computeIfAbsent(key, x -> new AtomicInteger()).incrementAndGet();
                }
                return null;
            }));
            start.countDown();
            for (Future<?> f : fs) f.get(60, TimeUnit.SECONDS);
            pool.shutdown();
            eq(50, limiter.trackedKeys(), "keyed: exactly one bucket per key");
            for (int k = 0; k < 50; k++) eq(20, perKey.get("k" + k).get(), "keyed: key k" + k + " admitted exactly capacity");
        }
    }
}
