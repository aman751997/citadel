import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// Exercises every compiled block in src/lld-lessons/concurrency-for-lld.mdx with REAL threads:
// the messes are shown to fail (lost updates, double allocation, stolen wakeups, deadlock, torn reads),
// the fixes hold their invariants under 8–64 threads and thousands of operations, every number the
// lesson quotes is recomputed, and every join/await has a timeout so a deadlock fails instead of hanging.
public class Check {
    static final AtomicInteger checks = new AtomicInteger();
    static final ThreadFactory DAEMONS = r -> { Thread t = new Thread(r); t.setDaemon(true); t.setUncaughtExceptionHandler((th, e) -> {}); return t; };

    static void eq(Object expected, Object actual, String what) {
        checks.incrementAndGet();
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    static void throwsOn(Class<? extends Throwable> type, Callable<?> c, String what) {
        checks.incrementAndGet();
        try { c.call(); } catch (Throwable t) {
            if (type.isInstance(t)) return;
            throw new AssertionError(what + ": threw " + t + " instead of " + type.getSimpleName());
        }
        throw new AssertionError(what + ": did not throw " + type.getSimpleName());
    }

    interface Body { void run(int thread) throws Exception; }

    /** Starts n daemon threads together, joins each with a deadline; a hang or any exception fails the check. */
    static void parallel(int n, long timeoutMs, Body body) {
        CountDownLatch go = new CountDownLatch(1);
        AtomicReference<Throwable> error = new AtomicReference<>();
        Thread[] threads = new Thread[n];
        for (int i = 0; i < n; i++) {
            int id = i;
            threads[i] = new Thread(() -> {
                try { go.await(); body.run(id); } catch (Throwable t) { error.compareAndSet(null, t); }
            });
            threads[i].setDaemon(true);
            threads[i].start();
        }
        go.countDown();
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        try {
            for (Thread t : threads) {
                long left = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
                if (left > 0) t.join(left);
                if (t.isAlive()) {
                    for (Thread x : threads) x.interrupt();
                    throw new AssertionError("threads still running after " + timeoutMs + " ms (deadlock or lost signal?)");
                }
            }
        } catch (InterruptedException e) { throw new AssertionError(e); }
        if (error.get() != null) throw new AssertionError("worker failed: " + error.get(), error.get());
        checks.incrementAndGet();
    }

    static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { throw new AssertionError(e); } }

    /** Runs a mess up to `attempts` times; passes as soon as one run shows the failure. */
    static int showsFailure(int attempts, IntSupplier failuresInOneRun, String what) {
        for (int i = 1; i <= attempts; i++) {
            int failures = failuresInOneRun.getAsInt();
            if (failures > 0) { checks.incrementAndGet(); System.out.println("mess fails as taught (run " + i + ", " + failures + " failures): " + what); return i; }
        }
        throw new AssertionError(what + ": the mess never failed in " + attempts + " runs");
    }

    public static void main(String[] args) throws Exception {
        Thread watchdog = new Thread(() -> {
            sleep(110_000);
            System.out.println("FAIL: watchdog — checker exceeded 110 s");
            Runtime.getRuntime().halt(2);
        });
        watchdog.setDaemon(true);
        watchdog.start();
        long start = System.nanoTime();

        races();
        visibilityAndLazy();
        counters();
        spots();
        gate();
        rates();
        stamped();
        atomics();
        visits();
        tariffs();
        pools();
        quotes();
        coordination();
        spooler();
        queues();
        deadlock();
        lru();
        limiter();
        turns();
        lot();
        exitOnce();
        dashboard();
        String poller = stopFlagMessIllustrative();   // last: a hung poller keeps spinning until the JVM exits

        System.out.println("stop-flag mess (illustrative): " + poller);
        System.out.printf("OK concurrency-for-lld: %d checks passed in %.1f s%n", checks.get(), (System.nanoTime() - start) / 1e9);
    }

    // Chapter 1: lost updates and check-then-act.
    static void races() {
        int runs = showsFailure(20, () -> {
            B_racyCounter.GateCounter c = new B_racyCounter().new GateCounter();
            parallel(8, 20_000, t -> { for (int i = 0; i < 100_000; i++) c.carEntered(); });
            return 800_000 - c.carsIn();
        }, "racy counter loses updates");
        yes(runs <= 20, "racy counter lost updates within 20 runs");

        showsFailure(5, () -> {
            B_spotMess mess = new B_spotMess();
            int rounds = 200_000;
            B_spotMess.Spot[] bays = new B_spotMess.Spot[rounds];
            for (int i = 0; i < rounds; i++) bays[i] = mess.new Spot();
            boolean[][] won = new boolean[2][rounds];
            AtomicInteger arrived = new AtomicInteger();
            parallel(2, 30_000, t -> {
                String plate = t == 0 ? "KA-01" : "KA-02";
                for (int r = 0; r < rounds; r++) {
                    arrived.incrementAndGet();
                    while (arrived.get() < 2 * (r + 1)) Thread.onSpinWait();   // release both gates together
                    won[t][r] = mess.park(bays[r], plate);
                }
            });
            int both = 0;
            for (int r = 0; r < rounds; r++) if (won[0][r] && won[1][r]) both++;
            return both;
        }, "check-then-act gives one bay to two cars");
    }

    // Chapter 2: volatile flag, volatile is not atomic, safe lazy init.
    static void visibilityAndLazy() {
        B_stopFlag.ExitPoller fixed = new B_stopFlag().new ExitPoller();
        AtomicLong polls = new AtomicLong(-1);
        Thread poller = new Thread(() -> polls.set(fixed.pollUntilStopped()));
        poller.setDaemon(true);
        poller.start();
        sleep(100);
        fixed.requestStop();
        try { poller.join(2000); } catch (InterruptedException e) { throw new AssertionError(e); }
        yes(!poller.isAlive(), "volatile poller stops");
        yes(polls.get() > 0, "volatile poller actually polled");

        showsFailure(10, () -> {
            B_volatileCounterMess.VolatileGateCounter c = new B_volatileCounterMess().new VolatileGateCounter();
            parallel(8, 20_000, t -> { for (int i = 0; i < 100_000; i++) c.carEntered(); });
            return 800_000 - c.carsIn();
        }, "volatile counter loses updates");

        B_lazy outer = new B_lazy();
        for (int round = 0; round < 50; round++) {
            AtomicInteger built = new AtomicInteger();
            B_lazy.Lazy<Object> lazy = outer.new Lazy<>(() -> { built.incrementAndGet(); sleep(1); return new Object(); });
            Set<Object> seen = ConcurrentHashMap.newKeySet();
            parallel(32, 10_000, t -> { for (int i = 0; i < 100; i++) seen.add(lazy.get()); });
            eq(1, built.get(), "DCL builds once");
            eq(1, seen.size(), "DCL: everyone gets the same instance");
        }
        eq(20L, B_lazy.TariffRegistry.rates().get("CAR"), "holder idiom rates");
        yes(B_lazy.TariffRegistry.rates() == B_lazy.TariffRegistry.rates(), "holder idiom: one instance");
    }

    static String stopFlagMessIllustrative() {
        B_stopFlagMess.ExitPoller mess = new B_stopFlagMess().new ExitPoller();
        Thread t = new Thread(mess::pollUntilStopped);
        t.setDaemon(true);
        t.start();
        sleep(300);                 // long enough for the JIT to compile the loop
        mess.requestStop();
        try { t.join(1000); } catch (InterruptedException e) { throw new AssertionError(e); }
        return t.isAlive() ? "still spinning 1 s after the stop — the hoisted read the lesson describes" : "stopped this time (allowed: the hang is permitted, not guaranteed)";
    }

    // Chapters 3 and 5: the three correct counters are exact.
    static void counters() {
        B_counters g = new B_counters();
        for (int run = 0; run < 3; run++) {
            B_counters.SyncGateCounter s = g.new SyncGateCounter();
            B_counters.AtomicGateCounter a = g.new AtomicGateCounter();
            B_counters.HotGateCounter h = g.new HotGateCounter();
            parallel(8, 30_000, t -> { for (int i = 0; i < 100_000; i++) { s.carEntered(); a.carEntered(); h.carEntered(); } });
            eq(800_000, s.carsIn(), "synchronized counter exact");
            eq(800_000, a.carsIn(), "atomic counter exact");
            eq(800_000L, h.carsIn(), "LongAdder counter exact");
        }
        showsFailure(10, () -> {
            B_boxedLockMess.PlateCounter c = new B_boxedLockMess().new PlateCounter();
            parallel(8, 30_000, t -> { for (int i = 0; i < 100_000; i++) c.increment(); });
            return 800_000 - c.count();
        }, "locking a boxed Integer that changes loses updates");
    }

    // Chapter 3: tryAssign, reentrancy, a public board with a private lock.
    static void spots() {
        B_spots g = new B_spots();
        int bays = 1000;
        B_spots.Spot[] spots = new B_spots.Spot[bays];
        for (int i = 0; i < bays; i++) spots[i] = g.new Spot(i);
        AtomicIntegerArray wins = new AtomicIntegerArray(bays);
        String[] winner = new String[bays];
        parallel(32, 20_000, t -> {
            String plate = "P" + t;
            List<Integer> order = new ArrayList<>();
            for (int i = 0; i < bays; i++) order.add(i);
            Collections.shuffle(order, new Random(t));
            for (int i : order) if (spots[i].tryAssign(plate)) { wins.incrementAndGet(i); winner[i] = plate; }
        });
        for (int i = 0; i < bays; i++) {
            eq(1, wins.get(i), "bay " + i + " won exactly once");
            eq(winner[i], spots[i].occupant(), "bay " + i + " holds its winner");
        }
        B_spots.Spot s = g.new Spot(7);
        yes(s.tryAssign("KA-01"), "free bay assigns");
        yes(!s.tryAssign("KA-02"), "taken bay refuses");
        yes(!s.release("KA-02"), "another car cannot free it");
        yes(s.release("KA-01"), "its car frees it");
        eq(null, s.occupant(), "freed");
        eq(7, s.number(), "number");

        B_spots.TicketLog log = g.new TicketLog();
        log.addAll(List.of("a", "b", "c"));        // re-enters its own lock without self-deadlock
        eq(3, log.size(), "reentrant addAll");
        List<String> batch = new ArrayList<>();
        for (int i = 0; i < 1000; i++) batch.add("t" + i);
        parallel(8, 10_000, t -> log.addAll(batch));
        eq(8003, log.size(), "concurrent addAll exact");

        B_spots.OccupancyBoard board = new B_spots().new OccupancyBoard(40);
        AtomicBoolean writing = new AtomicBoolean(true);
        AtomicInteger bad = new AtomicInteger();
        AtomicInteger writersLeft = new AtomicInteger(16);
        parallel(20, 30_000, t -> {
            if (t < 16) {
                Random r = new Random(100 + t);
                for (int i = 0; i < 20_000; i++) { if (r.nextBoolean()) board.carIn(); else board.carOut(); }
                if (writersLeft.decrementAndGet() == 0) writing.set(false);
            } else {
                while (writing.get()) {
                    int[] snap = board.snapshot();
                    if (snap[0] + snap[1] != 40 || snap[0] < 0 || snap[1] < 0) bad.incrementAndGet();
                }
            }
        });
        eq(0, bad.get(), "board snapshots always sum to capacity");
        int[] end = board.snapshot();
        eq(40, end[0] + end[1], "board invariant at the end");
        B_spots.OccupancyBoard small = new B_spots().new OccupancyBoard(1);
        yes(small.carIn(), "1-bay board admits one");
        yes(!small.carIn(), "full board refuses");
        yes(small.carOut(), "car leaves");
        yes(!small.carOut(), "empty board refuses carOut");
    }

    // Chapter 4: tryLock timeout, lockInterruptibly, counts.
    static void gate() throws Exception {
        B_gate.BarrierGate gate = new B_gate().new BarrierGate();
        CountDownLatch held = new CountDownLatch(1), release = new CountDownLatch(1);
        Thread selfTest = new Thread(() -> gate.service(() -> {
            held.countDown();
            try { release.await(10, TimeUnit.SECONDS); } catch (InterruptedException e) { }
        }));
        selfTest.setDaemon(true);
        selfTest.start();
        yes(held.await(5, TimeUnit.SECONDS), "self-test holds the gate");
        long t0 = System.nanoTime();
        yes(!gate.tryOpen(100, TimeUnit.MILLISECONDS), "tryOpen gives up while the gate is held");
        long waited = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);
        yes(waited >= 90 && waited < 2000, "tryOpen waited about its timeout (" + waited + " ms)");
        AtomicBoolean interrupted = new AtomicBoolean();
        Thread waiter = new Thread(() -> {
            try { gate.openWhenFree(); } catch (InterruptedException e) { interrupted.set(true); }
        });
        waiter.setDaemon(true);
        waiter.start();
        sleep(50);
        waiter.interrupt();
        waiter.join(2000);
        yes(!waiter.isAlive() && interrupted.get(), "lockInterruptibly responds to interrupt");
        release.countDown();
        selfTest.join(2000);
        yes(gate.tryOpen(1, TimeUnit.SECONDS), "tryOpen succeeds once the gate is free");
        eq(1, gate.opened(), "only the successful open counted");
        parallel(16, 30_000, t -> { for (int i = 0; i < 5000; i++) yes2(gate.tryOpen(5, TimeUnit.SECONDS)); });
        eq(80_001, gate.opened(), "16 x 5000 opens counted exactly");
    }
    static void yes2(boolean b) { if (!b) throw new AssertionError("expected true"); }

    // Chapter 4: read-write lock gives whole-table snapshots.
    static void rates() {
        B_rates.RateBook book = new B_rates().new RateBook();
        Map<String, Long> a = Map.of("CAR", 20L, "BIKE", 10L);
        Map<String, Long> b = Map.of("CAR", 30L, "BIKE", 15L, "TRUCK", 40L);
        book.setRates(a);
        AtomicBoolean writing = new AtomicBoolean(true);
        AtomicInteger bad = new AtomicInteger(), reads = new AtomicInteger();
        parallel(5, 30_000, t -> {
            if (t == 0) {
                for (int i = 0; i < 20_000; i++) book.setRates(i % 2 == 0 ? b : a);
                writing.set(false);
            } else {
                while (writing.get()) {
                    Map<String, Long> snap = book.snapshot();
                    if (!snap.equals(a) && !snap.equals(b)) bad.incrementAndGet();
                    Long car = book.rateFor("CAR");
                    if (car == null || (car != 20L && car != 30L)) bad.incrementAndGet();
                    reads.incrementAndGet();
                }
            }
        });
        eq(0, bad.get(), "rate snapshots are never a mix of two tables");
        yes(reads.get() > 0, "readers ran");
        eq(a, book.snapshot(), "last write wins");
    }

    static void stamped() {
        B_stamped.LevelDisplay level = new B_stamped().new LevelDisplay(100);
        AtomicInteger writersLeft = new AtomicInteger(4), bad = new AtomicInteger();
        AtomicBoolean writing = new AtomicBoolean(true);
        parallel(8, 30_000, t -> {
            if (t < 4) {
                Random r = new Random(t);
                for (int i = 0; i < 50_000; i++) { if (r.nextBoolean()) level.carIn(); else level.carOut(); }
                if (writersLeft.decrementAndGet() == 0) writing.set(false);
            } else {
                while (writing.get()) {
                    int[] v = level.read();
                    if (v[0] + v[1] != 100 || v[0] < 0 || v[1] < 0) bad.incrementAndGet();
                }
            }
        });
        eq(0, bad.get(), "optimistic reads never see a torn pair");
        int[] v = level.read();
        eq(100, v[0] + v[1], "stamped invariant at the end");
    }

    // Chapter 5: CAS loop never over-allocates.
    static void atomics() {
        B_atomics g = new B_atomics();
        for (int variant = 0; variant < 2; variant++) {
            B_atomics.SpotCounter c = g.new SpotCounter(100);
            AtomicInteger won = new AtomicInteger();
            boolean shortForm = variant == 1;
            parallel(32, 20_000, t -> {
                for (int i = 0; i < 1000; i++) if (shortForm ? c.tryReserveShort() : c.tryReserve()) won.incrementAndGet();
            });
            eq(100, won.get(), "exactly capacity reservations (variant " + variant + ")");
            eq(0, c.free(), "nothing left");
        }
        B_atomics.SpotCounter c = g.new SpotCounter(10);
        AtomicInteger bad = new AtomicInteger();
        parallel(16, 20_000, t -> {
            for (int i = 0; i < 20_000; i++) {
                if (c.tryReserve()) {
                    int f = c.free();
                    if (f < 0 || f > 10) bad.incrementAndGet();
                    c.release();
                }
            }
        });
        eq(0, bad.get(), "free stays within [0, capacity]");
        eq(10, c.free(), "every reservation released");
        throwsOn(IllegalStateException.class, () -> { c.release(); return null; }, "release without reservation");

        B_atomics.DailyRecord rec = g.new DailyRecord();
        parallel(8, 10_000, t -> { for (int i = 0; i < 10_000; i++) rec.offer(t * 10_000L + i); });
        eq(79_999L, rec.highest(), "running max");
    }

    // Chapter 6: get-then-put loses; merge, compute, computeIfAbsent don't.
    static void visits() {
        showsFailure(10, () -> {
            B_visitsMess.PlateVisits m = new B_visitsMess().new PlateVisits();
            parallel(16, 20_000, t -> { for (int i = 0; i < 2000; i++) m.record("KA-01"); });
            return 32_000 - m.visits("KA-01");
        }, "get-then-put on a ConcurrentHashMap loses visits");
        B_visits g = new B_visits();
        B_visits.PlateVisits v = g.new PlateVisits();
        B_visits.HotPlateVisits h = g.new HotPlateVisits();
        parallel(16, 20_000, t -> { for (int i = 0; i < 2000; i++) { v.record("KA-01"); h.record("KA-01"); v.record("P" + (i % 7)); } });
        eq(32_000, v.visits("KA-01"), "merge exact");
        eq(32_000L, h.visits("KA-01"), "computeIfAbsent + LongAdder exact");
        int other = 0;
        for (int k = 0; k < 7; k++) other += v.visits("P" + k);
        eq(32_000, other, "merge exact across keys");
        eq(0, v.visits("nobody"), "absent plate");
        eq(0L, h.visits("nobody"), "absent plate (hot)");

        ConcurrentHashMap<String, AtomicInteger> messBuilds = new ConcurrentHashMap<>();
        B_templatesMess.ReceiptTemplates mess = new B_templatesMess().new ReceiptTemplates(k -> {
            messBuilds.computeIfAbsent(k, x -> new AtomicInteger()).incrementAndGet();
            sleep(20);
            return "template:" + k;
        });
        parallel(16, 20_000, t -> eq("template:G" + (t % 3), mess.forGarage("G" + (t % 3)), "mess returns a template"));
        int messTotal = messBuilds.values().stream().mapToInt(AtomicInteger::get).sum();
        yes(messTotal > 3, "containsKey-then-put builds some templates more than once (" + messTotal + " builds for 3 keys)");

        ConcurrentHashMap<String, AtomicInteger> builds = new ConcurrentHashMap<>();
        B_visits.ReceiptTemplates good = g.new ReceiptTemplates(k -> {
            builds.computeIfAbsent(k, x -> new AtomicInteger()).incrementAndGet();
            sleep(20);
            return "template:" + k;
        });
        parallel(16, 20_000, t -> eq("template:G" + (t % 3), good.forGarage("G" + (t % 3)), "computeIfAbsent returns a template"));
        eq(3, builds.size(), "three garages built");
        for (AtomicInteger n : builds.values()) eq(1, n.get(), "computeIfAbsent builds each key once");
    }

    // Chapter 7: immutable tariff, atomic swap, two maps published together.
    static void tariffs() {
        B_tariffs g = new B_tariffs();
        Map<String, Long> mutable = new HashMap<>(Map.of("EV", 50L));
        B_tariffs.Tariff t0 = new B_tariffs.Tariff(20, 10, mutable);
        mutable.put("EV", 999L);
        eq(50L, t0.surcharges().get("EV"), "defensive copy: caller's edits don't leak in");
        throwsOn(UnsupportedOperationException.class, () -> t0.surcharges().put("X", 1L), "surcharges are read-only");
        throwsOn(IllegalArgumentException.class, () -> new B_tariffs.Tariff(-1, 10, Map.of()), "negative rate refused");
        B_tariffs.TariffBoard board = g.new TariffBoard(t0);
        AtomicInteger bad = new AtomicInteger();
        parallel(20, 20_000, t -> {
            if (t < 16) for (int i = 0; i < 1000; i++) board.raiseCarRate(1);
            else for (int i = 0; i < 20_000; i++) {
                B_tariffs.Tariff now = board.current();
                if (now.carPerHour() < 20 || now.bikePerHour() != 10 || now.surcharges().get("EV") != 50L) bad.incrementAndGet();
            }
        });
        eq(0, bad.get(), "readers always see a whole tariff");
        eq(16_020L, board.current().carPerHour(), "16 x 1000 raises, none lost");
        B_tariffs.Tariff next = new B_tariffs.Tariff(25, 12, Map.of());
        board.publish(next);
        yes(board.current() == next, "publish swaps the reference");

        B_tariffs.LookupCache cache = g.new LookupCache();
        Map<String, Integer> l1 = new HashMap<>(), l2 = new HashMap<>();
        for (int i = 0; i < 50; i++) { l1.put("P" + i, i); l2.put("P" + i, 49 - i); }
        for (int i = 0; i < 10; i++) l2.put("Q" + i, 50 + i);
        AtomicBoolean refreshing = new AtomicBoolean(true);
        AtomicInteger torn = new AtomicInteger(), reads = new AtomicInteger();
        parallel(5, 30_000, t -> {
            if (t == 0) {
                for (int i = 0; i < 5000; i++) cache.refresh(i % 2 == 0 ? l1 : l2);
                refreshing.set(false);
            } else {
                while (refreshing.get()) {
                    B_tariffs.Lookups l = cache.read();
                    for (Map.Entry<String, Integer> e : l.spotByPlate().entrySet())
                        if (!e.getKey().equals(l.plateBySpot().get(e.getValue()))) torn.incrementAndGet();
                    if (l.spotByPlate().size() != l.plateBySpot().size()) torn.incrementAndGet();
                    reads.incrementAndGet();
                }
            }
        });
        eq(0, torn.get(), "lookup pairs always consistent");
        yes(reads.get() > 0, "lookup readers ran");
    }

    // Chapter 8: the pool's decision order, sizing, scheduled tasks, shutdown.
    static void pools() throws Exception {
        B_pools g = new B_pools();
        ThreadPoolExecutor pool = g.gatePool();
        CountDownLatch release = new CountDownLatch(1);
        Set<String> names = ConcurrentHashMap.newKeySet();
        Runnable blocker = () -> { names.add(Thread.currentThread().getName()); try { release.await(20, TimeUnit.SECONDS); } catch (InterruptedException e) { } };
        for (int i = 1; i <= 4; i++) pool.execute(blocker);
        eq(4, pool.getPoolSize(), "tasks 1-4 start core threads");
        eq(0, pool.getQueue().size(), "nothing queued yet");
        pool.execute(blocker);
        eq(4, pool.getPoolSize(), "task 5 does not start a thread");
        eq(1, pool.getQueue().size(), "task 5 is queued");
        for (int i = 6; i <= 104; i++) pool.execute(blocker);
        eq(4, pool.getPoolSize(), "still core only while the queue has room");
        eq(100, pool.getQueue().size(), "tasks 5-104 queued");
        for (int i = 105; i <= 108; i++) pool.execute(blocker);
        eq(8, pool.getPoolSize(), "tasks 105-108 start threads 5-8");
        eq(100, pool.getQueue().size(), "queue still full");
        AtomicReference<Thread> ranOn = new AtomicReference<>();
        pool.execute(() -> ranOn.set(Thread.currentThread()));
        eq(Thread.currentThread(), ranOn.get(), "task 109 runs on the caller (CallerRunsPolicy)");
        release.countDown();
        g.shutdownGracefully(pool, 10, TimeUnit.SECONDS);
        yes(pool.isTerminated(), "graceful shutdown terminates");
        yes(!names.isEmpty() && names.stream().allMatch(n -> n.startsWith("gate-worker-")), "threads are named");
        eq(108L, pool.getCompletedTaskCount(), "every pool task completed");
        eq(8, names.size(), "eight named workers ran tasks");

        eq(80, g.threadsFor(8, 90, 10), "8 cores x (1 + 90/10) = 80");
        eq(8, g.threadsFor(8, 0, 10), "CPU-bound: cores");

        ThreadPoolExecutor fixed = (ThreadPoolExecutor) Executors.newFixedThreadPool(2);
        eq(Integer.MAX_VALUE, fixed.getQueue().remainingCapacity(), "newFixedThreadPool's queue is unbounded");
        fixed.shutdown();
        ThreadPoolExecutor cached = (ThreadPoolExecutor) Executors.newCachedThreadPool();
        eq(Integer.MAX_VALUE, cached.getMaximumPoolSize(), "newCachedThreadPool's max is unbounded");
        eq(0, cached.getCorePoolSize(), "cached pool has no core threads");
        cached.shutdown();

        ScheduledExecutorService timer = Executors.newScheduledThreadPool(2, DAEMONS);
        AtomicInteger rawRuns = new AtomicInteger();
        ScheduledFuture<?> raw = timer.scheduleAtFixedRate(() -> { rawRuns.incrementAndGet(); throw new RuntimeException("sensor offline"); }, 0, 10, TimeUnit.MILLISECONDS);
        sleep(200);
        eq(1, rawRuns.get(), "one throw suppresses every later run");
        yes(raw.isDone(), "the periodic task is finished");
        AtomicInteger guardedRuns = new AtomicInteger();
        java.io.PrintStream err = System.err;
        System.setErr(new java.io.PrintStream(java.io.OutputStream.nullOutputStream()));
        try {
            ScheduledFuture<?> guarded = g.every(timer, 10, () -> { if (guardedRuns.incrementAndGet() % 2 == 1) throw new RuntimeException("flaky"); });
            sleep(300);
            yes(guardedRuns.get() >= 5, "guarded tick keeps running (" + guardedRuns.get() + " runs)");
            yes(!guarded.isDone(), "guarded task still scheduled");
            guarded.cancel(false);
        } finally { System.setErr(err); }
        timer.shutdownNow();

        ExecutorService stubborn = Executors.newSingleThreadExecutor(DAEMONS);
        stubborn.submit(() -> { Thread.sleep(10_000); return null; });
        sleep(20);
        long t0 = System.nanoTime();
        g.shutdownGracefully(stubborn, 100, TimeUnit.MILLISECONDS);
        yes(stubborn.isTerminated(), "shutdownNow interrupts the straggler");
        yes(System.nanoTime() - t0 < TimeUnit.SECONDS.toNanos(3), "shutdown did not wait 10 s");
    }

    // Chapter 9: combine, fall back, compose, unwrap.
    static void quotes() throws Exception {
        ExecutorService io = Executors.newFixedThreadPool(8, DAEMONS);
        B_quotes g = new B_quotes();
        B_quotes.Payments pay = (plate, amount) -> "REF-" + plate + "-" + amount;

        B_quotes.QuoteService ok = g.new QuoteService(p -> 60, p -> 20, pay, io);
        eq(40L, ok.quote("KA-01").get(2, TimeUnit.SECONDS), "60 - 20 = 40");
        eq("PAID REF-KA-01-40", ok.checkout("KA-01").get(2, TimeUnit.SECONDS), "checkout pays the quoted amount");

        B_quotes.QuoteService slow = g.new QuoteService(p -> 60, p -> { sleep(2000); return 20; }, pay, io);
        long t0 = System.nanoTime();
        eq(60L, slow.quote("KA-01").get(2, TimeUnit.SECONDS), "slow loyalty: no discount");
        long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);
        yes(ms < 1000, "slow loyalty did not hold the quote (" + ms + " ms)");

        B_quotes.QuoteService broken = g.new QuoteService(p -> 60, p -> { throw new IllegalStateException("loyalty down"); }, pay, io);
        eq(60L, broken.quote("KA-01").get(2, TimeUnit.SECONDS), "broken loyalty: no discount");

        B_quotes.QuoteService big = g.new QuoteService(p -> 10, p -> 30, pay, io);
        eq(0L, big.quote("KA-01").get(2, TimeUnit.SECONDS), "discount never makes the fee negative");

        B_quotes.QuoteService noTariff = g.new QuoteService(p -> { throw new IllegalArgumentException("unknown plate"); }, p -> 0, pay, io);
        try {
            noTariff.quote("XX").join();
            throw new AssertionError("join should throw");
        } catch (CompletionException e) {
            yes(e.getCause() instanceof IllegalArgumentException, "join wraps the cause in CompletionException");
        }
        try {
            noTariff.quote("XX").get(2, TimeUnit.SECONDS);
            throw new AssertionError("get should throw");
        } catch (ExecutionException e) {
            yes(e.getCause() instanceof IllegalArgumentException, "get wraps the cause in ExecutionException");
        }
        eq("FAILED unknown plate", noTariff.checkout("XX").get(2, TimeUnit.SECONDS), "handle reports the root cause");

        B_quotes.QuoteService declined = g.new QuoteService(p -> 60, p -> 0, (p, a) -> { throw new IllegalStateException("card declined"); }, io);
        eq("FAILED card declined", declined.checkout("KA-01").get(2, TimeUnit.SECONDS), "declined card");

        AtomicReference<Throwable> seen = new AtomicReference<>();
        CompletableFuture.supplyAsync(() -> { throw new IllegalStateException("x"); }, io)
            .exceptionally(e -> { seen.set(e); return null; }).get(2, TimeUnit.SECONDS);
        yes(seen.get() instanceof CompletionException && seen.get().getCause() instanceof IllegalStateException,
            "exceptionally after supplyAsync receives a CompletionException wrapping the cause");
        AtomicBoolean whenCompleteRan = new AtomicBoolean();
        CompletableFuture<Integer> observed = CompletableFuture.<Integer>supplyAsync(() -> { throw new IllegalStateException("y"); }, io)
            .whenComplete((v, e) -> whenCompleteRan.set(e != null));
        try { observed.join(); throw new AssertionError("whenComplete must not recover"); }
        catch (CompletionException e) { yes(whenCompleteRan.get(), "whenComplete observed the failure and passed it on"); }
        io.shutdownNow();
    }

    // Chapter 10: latch, barrier, semaphore.
    static void coordination() throws Exception {
        B_coord g = new B_coord();
        ExecutorService pool = Executors.newFixedThreadPool(4, DAEMONS);
        Runnable healthy = () -> sleep(10);
        yes(g.openWhenAllGatesReady(pool, List.of(healthy, healthy, healthy), 2, TimeUnit.SECONDS), "three healthy gates open the lot");
        Runnable brokenGate = () -> { throw new IllegalStateException("arm motor fault"); };
        long t0 = System.nanoTime();
        yes(!g.openWhenAllGatesReady(pool, List.of(healthy, brokenGate, healthy), 200, TimeUnit.MILLISECONDS), "a broken gate keeps the lot closed");
        yes(System.nanoTime() - t0 >= TimeUnit.MILLISECONDS.toNanos(190), "closed only after the timeout");
        pool.shutdownNow();

        B_coord.NightAudit audit = g.new NightAudit(3);
        parallel(3, 20_000, gateNo -> { for (int night = 0; night < 50; night++) audit.gateClosed(gateNo * 1000L + night); });
        eq(50, audit.nights.size(), "one total per night");
        for (int night = 0; night < 50; night++) eq(3000L + 3L * night, audit.nights.get(night), "night " + night + " total");

        B_coord.ChargerBank bank = g.new ChargerBank(3);
        AtomicInteger charging = new AtomicInteger(), maxCharging = new AtomicInteger();
        AtomicInteger done = new AtomicInteger();
        parallel(20, 30_000, t -> {
            for (int i = 0; i < 10; i++) {
                yes2(bank.charge(() -> {
                    maxCharging.accumulateAndGet(charging.incrementAndGet(), Math::max);
                    sleep(2);
                    charging.decrementAndGet();
                }, 10, TimeUnit.SECONDS));
                done.incrementAndGet();
            }
        });
        eq(200, done.get(), "every session ran");
        yes(maxCharging.get() <= 3, "never more than 3 sessions at once (" + maxCharging.get() + ")");
        eq(3, maxCharging.get(), "all three chargers were used");
        CountDownLatch busy = new CountDownLatch(3), unplug = new CountDownLatch(1);
        ExecutorService cars = Executors.newFixedThreadPool(3, DAEMONS);
        for (int i = 0; i < 3; i++) cars.submit(() -> bank.charge(() -> {
            busy.countDown();
            try { unplug.await(10, TimeUnit.SECONDS); } catch (InterruptedException e) { }
        }, 1, TimeUnit.SECONDS));
        yes(busy.await(5, TimeUnit.SECONDS), "three cars charging");
        yes(!bank.charge(() -> { throw new AssertionError("must not run"); }, 100, TimeUnit.MILLISECONDS), "fourth car is refused after the timeout");
        unplug.countDown();
        cars.shutdown();
        yes(cars.awaitTermination(5, TimeUnit.SECONDS), "chargers released");
        yes(bank.charge(() -> {}, 1, TimeUnit.SECONDS), "a charger is free again");
    }

    // Chapter 11: the spooler.
    static void spooler() throws Exception {
        B_spooler.PrintSpooler spooler = new B_spooler().new PrintSpooler(16);
        parallel(8, 20_000, gate -> { for (int i = 0; i < 1000; i++) spooler.print(gate + ":" + i); });
        List<String> printed = spooler.close(5, TimeUnit.SECONDS);
        eq(8000, printed.size(), "every ticket printed");
        eq(8000, new HashSet<>(printed).size(), "no ticket printed twice");
        int[] last = new int[8];
        Arrays.fill(last, -1);
        for (String job : printed) {
            String[] parts = job.split(":");
            int gate = Integer.parseInt(parts[0]), n = Integer.parseInt(parts[1]);
            yes2(n == last[gate] + 1);
            last[gate] = n;
        }
        checks.incrementAndGet();
    }

    interface IntQueue { void put(int x) throws InterruptedException; Integer take() throws InterruptedException; }

    static void queueHarness(String name, Supplier<IntQueue> make, IntSupplier sizeOf, int capacity) {
        // many producers, many consumers: exactly once, per-producer order, never over capacity
        IntQueue q = make.get();
        int producers = 8, consumers = 8, per = 10_000;
        List<List<Integer>> got = new ArrayList<>();
        for (int c = 0; c < consumers; c++) got.add(new ArrayList<>());
        AtomicBoolean running = new AtomicBoolean(true);
        AtomicInteger maxSeen = new AtomicInteger();
        Thread observer = null;
        if (sizeOf != null) {
            observer = new Thread(() -> { while (running.get()) maxSeen.accumulateAndGet(sizeOf.getAsInt(), Math::max); });
            observer.setDaemon(true);
            observer.start();
        }
        parallel(producers + consumers, 30_000, t -> {
            if (t < producers) for (int k = 0; k < per; k++) q.put(t * 1_000_000 + k);
            else { List<Integer> mine = got.get(t - producers); for (int k = 0; k < per; k++) mine.add(q.take()); }
        });
        running.set(false);
        Set<Integer> all = new HashSet<>();
        for (List<Integer> mine : got) {
            int[] last = new int[producers];
            Arrays.fill(last, -1);
            for (int x : mine) {
                int p = x / 1_000_000, k = x % 1_000_000;
                if (k <= last[p]) throw new AssertionError(name + ": producer " + p + "'s items out of order");
                last[p] = k;
                all.add(x);
            }
        }
        eq(producers * per, all.size(), name + ": every item delivered exactly once");
        if (sizeOf != null) yes(maxSeen.get() <= capacity, name + ": size never above " + capacity + " (saw " + maxSeen.get() + ")");

        // one producer, one consumer: strict FIFO
        IntQueue fifo = make.get();
        List<Integer> out = new ArrayList<>();
        parallel(2, 20_000, t -> {
            if (t == 0) for (int k = 0; k < 20_000; k++) fifo.put(k);
            else for (int k = 0; k < 20_000; k++) out.add(fifo.take());
        });
        for (int k = 0; k < 20_000; k++) if (out.get(k) != k) throw new AssertionError(name + ": FIFO broken at " + k);
        checks.incrementAndGet();

        // put blocks while full, and a take releases it
        IntQueue full = make.get();
        try { for (int k = 0; k < capacity; k++) full.put(k); } catch (InterruptedException e) { throw new AssertionError(e); }
        Thread blocked = new Thread(() -> { try { full.put(99); } catch (InterruptedException e) { } });
        blocked.setDaemon(true);
        blocked.start();
        sleep(100);
        yes(blocked.isAlive(), name + ": put blocks on a full queue");
        try { eq(0, full.take(), name + ": head of the full queue"); } catch (InterruptedException e) { throw new AssertionError(e); }
        try { blocked.join(2000); } catch (InterruptedException e) { throw new AssertionError(e); }
        yes(!blocked.isAlive(), name + ": take unblocks the waiting put");
    }

    static void queues() throws Exception {
        B_queue g = new B_queue();
        queueHarness("BoundedQueue", () -> {
            B_queue.BoundedQueue<Integer> q = g.new BoundedQueue<>(4);
            lastBounded = q;
            return new IntQueue() { public void put(int x) throws InterruptedException { q.put(x); } public Integer take() throws InterruptedException { return q.take(); } };
        }, () -> lastBounded.size(), 4);
        B_monitorQueue m = new B_monitorQueue();
        queueHarness("MonitorQueue", () -> {
            B_monitorQueue.MonitorQueue<Integer> q = m.new MonitorQueue<>(4);
            return new IntQueue() { public void put(int x) throws InterruptedException { q.put(x); } public Integer take() throws InterruptedException { return q.take(); } };
        }, null, 4);

        B_queue.BoundedQueue<Integer> q = g.new BoundedQueue<>(2);
        yes(q.offer(1, 10, TimeUnit.MILLISECONDS), "offer with room");
        yes(q.offer(2, 10, TimeUnit.MILLISECONDS), "offer fills the queue");
        long t0 = System.nanoTime();
        yes(!q.offer(3, 50, TimeUnit.MILLISECONDS), "offer on a full queue times out");
        yes(System.nanoTime() - t0 >= TimeUnit.MILLISECONDS.toNanos(45), "offer waited about its timeout");
        eq(2, q.size(), "still two");
        eq(1, q.take(), "FIFO after offer");
        throwsOn(IllegalArgumentException.class, () -> g.new BoundedQueue<Integer>(0), "capacity must be positive");

        // the `if` version: stolen wakeups make take() return null
        showsFailure(3, () -> {
            B_ifQueueMess.IfQueue<Integer> bad = new B_ifQueueMess().new IfQueue<>(2);
            AtomicInteger nulls = new AtomicInteger();
            AtomicBoolean stop = new AtomicBoolean();
            List<Thread> threads = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                boolean producer = i < 4;
                Thread th = new Thread(() -> {
                    try {
                        while (!stop.get()) { if (producer) bad.put(1); else if (bad.take() == null) nulls.incrementAndGet(); }
                    } catch (InterruptedException e) { }
                });
                th.setDaemon(true);
                threads.add(th);
                th.start();
            }
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (nulls.get() == 0 && System.nanoTime() < deadline) sleep(10);
            stop.set(true);
            for (Thread th : threads) th.interrupt();
            return nulls.get();
        }, "the if-version of take returns null");
    }
    static B_queue.BoundedQueue<Integer> lastBounded;

    // Chapter 12: the mess deadlocks; both fixes conserve money and finish.
    static void deadlock() {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        showsFailure(3, () -> {
            B_transferMess bank = new B_transferMess();
            B_transferMess.Wallet asha = bank.new Wallet(1, 1_000_000), ben = bank.new Wallet(2, 1_000_000);
            Thread t1 = new Thread(() -> { while (true) bank.transfer(asha, ben, 1); });
            Thread t2 = new Thread(() -> { while (true) bank.transfer(ben, asha, 1); });
            t1.setDaemon(true); t2.setDaemon(true);
            t1.start(); t2.start();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < deadline) {
                long[] ids = mx.findDeadlockedThreads();
                if (ids != null) {
                    Set<Long> stuck = new HashSet<>();
                    for (long id : ids) stuck.add(id);
                    if (stuck.contains(t1.getId()) && stuck.contains(t2.getId())) return 1;   // abandoned: daemons
                }
                sleep(5);
            }
            return 0;
        }, "transfer(a,b) + transfer(b,a) deadlocks");

        B_wallets ordered = new B_wallets();
        B_wallets.Wallet[] w = new B_wallets.Wallet[10];
        for (int i = 0; i < 10; i++) w[i] = ordered.new Wallet(i, 1000);
        AtomicInteger negative = new AtomicInteger();
        parallel(16, 30_000, t -> {
            Random r = new Random(t);
            for (int i = 0; i < 20_000; i++) {
                int a = r.nextInt(10), b = r.nextInt(10);
                ordered.transfer(w[a], w[b], 1 + r.nextInt(50));
                if (w[a].balance() < 0) negative.incrementAndGet();
            }
        });
        long total = 0;
        for (B_wallets.Wallet x : w) { total += x.balance(); if (x.balance() < 0) negative.incrementAndGet(); }
        eq(10_000L, total, "ordered locking conserves money");
        eq(0, negative.get(), "no negative balance (ordered)");
        yes(!ordered.transfer(w[0], w[0], 5), "self-transfer refused");
        yes(!ordered.transfer(w[0], w[1], 0), "zero transfer refused");
        yes(!ordered.transfer(w[0], w[1], 1_000_000), "insufficient funds refused");

        B_lockWallets tl = new B_lockWallets();
        B_lockWallets.Wallet[] v = new B_lockWallets.Wallet[10];
        for (int i = 0; i < 10; i++) v[i] = tl.new Wallet(i, 1000);
        AtomicInteger timedOut = new AtomicInteger();
        parallel(16, 30_000, t -> {
            Random r = new Random(t);
            for (int i = 0; i < 20_000; i++) {
                int a = r.nextInt(10), b = r.nextInt(10);
                if (a == b) continue;                       // tryLock version: same wallet twice would self-collide on purpose
                if (tl.transfer(v[a], v[b], 1 + r.nextInt(50), 1, TimeUnit.SECONDS) == B_lockWallets.Outcome.TIMED_OUT) timedOut.incrementAndGet();
            }
        });
        long total2 = 0;
        for (B_lockWallets.Wallet x : v) { total2 += x.balance; yes2(x.balance >= 0); }
        eq(10_000L, total2, "tryLock transfers conserve money");
        yes(timedOut.get() < 100, "tryLock transfers rarely time out (" + timedOut.get() + ")");
        eq(B_lockWallets.Outcome.INSUFFICIENT, tl.transfer(v[0], v[1], 1_000_000, 1, TimeUnit.SECONDS), "insufficient (tryLock)");
        // a held lock makes the transfer time out instead of hanging
        v[1].lock.lock();
        try {
            AtomicReference<B_lockWallets.Outcome> out = new AtomicReference<>();
            Thread mover = new Thread(() -> out.set(tl.transfer(v[0], v[1], 1, 100, TimeUnit.MILLISECONDS)));
            mover.setDaemon(true);
            mover.start();
            mover.join(3000);
            eq(B_lockWallets.Outcome.TIMED_OUT, out.get(), "tryLock gives up after its timeout");
        } catch (InterruptedException e) { throw new AssertionError(e); }
        finally { v[1].lock.unlock(); }
    }

    // Chapter 13: LRU vs an independent oracle, then under threads.
    static void lru() {
        B_lru g = new B_lru();
        Random r = new Random(13);
        for (int cap : new int[] { 1, 2, 3, 5 }) {
            B_lru.LruCache<Integer, Integer> cache = g.new LruCache<>(cap);
            List<Integer> order = new ArrayList<>();          // oldest first
            Map<Integer, Integer> values = new HashMap<>();
            for (int i = 0; i < 5000; i++) {
                int k = r.nextInt(8);
                if (r.nextBoolean()) {
                    Integer expect = values.get(k);
                    if (expect != null) { order.remove((Integer) k); order.add(k); }
                    eq(expect, cache.get(k), "LRU get " + k);
                } else {
                    int val = r.nextInt(100);
                    if (values.containsKey(k)) order.remove((Integer) k);
                    order.add(k);
                    values.put(k, val);
                    if (order.size() > cap) values.remove(order.remove(0));
                    cache.put(k, val);
                }
                eq(order, cache.keysOldestFirst(), "LRU order");
            }
        }
        throwsOn(IllegalArgumentException.class, () -> g.new LruCache<Integer, Integer>(0), "capacity must be positive");

        B_lru.LruCache<Integer, Integer> shared = g.new LruCache<>(50);
        AtomicBoolean running = new AtomicBoolean(true);
        AtomicInteger maxSize = new AtomicInteger();
        Thread observer = new Thread(() -> { while (running.get()) maxSize.accumulateAndGet(shared.size(), Math::max); });
        observer.setDaemon(true);
        observer.start();
        parallel(16, 30_000, t -> {
            Random rr = new Random(t);
            for (int i = 0; i < 20_000; i++) {
                int k = rr.nextInt(200);
                if (rr.nextBoolean()) { Integer v = shared.get(k); if (v != null && v != k * 10) throw new AssertionError("wrong value"); }
                else shared.put(k, k * 10);
            }
        });
        running.set(false);
        yes(maxSize.get() <= 50, "LRU size never above capacity");
        eq(shared.size(), shared.keysOldestFirst().size(), "LRU structure consistent");
        eq(50, shared.size(), "LRU full after the storm");
    }

    // Chapter 14 + Side quest 1: token bucket.
    static void limiter() {
        B_limiter g = new B_limiter();
        AtomicLong clock = new AtomicLong(5_000_000_000L);
        B_limiter.TokenBucket b = g.new TokenBucket(5, 2, clock::get);
        for (int i = 0; i < 5; i++) yes(b.tryAcquire(), "burst " + i);
        yes(!b.tryAcquire(), "sixth refused");
        clock.addAndGet(500_000_000L);
        yes(b.tryAcquire(), "500 ms later: one token");
        yes(!b.tryAcquire(), "and only one");
        clock.addAndGet(10_000_000_000L);
        int passes = 0;
        for (int i = 0; i < 30; i++) if (b.tryAcquire()) passes++;
        eq(5, passes, "10 s later: capped at 5, not 20");

        AtomicLong negative = new AtomicLong(-7_000_000_000_000L);
        B_limiter.TokenBucket n = g.new TokenBucket(5, 2, negative::get);
        int negPasses = 0;
        for (int i = 0; i < 10; i++) if (n.tryAcquire()) negPasses++;
        eq(5, negPasses, "a negative nanoTime origin still allows the first burst");

        for (int run = 0; run < 5; run++) {
            B_limiter.TokenBucket frozen = g.new TokenBucket(5, 2, clock::get);
            AtomicInteger ok = new AtomicInteger();
            parallel(32, 20_000, t -> { for (int i = 0; i < 1000; i++) if (frozen.tryAcquire()) ok.incrementAndGet(); });
            eq(5, ok.get(), "frozen clock, 32 threads: exactly capacity");
        }

        AtomicLong moving = new AtomicLong(0);
        B_limiter.TokenBucket m = g.new TokenBucket(10, 1000, moving::get);
        AtomicInteger granted = new AtomicInteger();
        AtomicBoolean ticking = new AtomicBoolean(true);
        parallel(17, 20_000, t -> {
            if (t == 16) { for (int i = 0; i < 2000; i++) { moving.addAndGet(100_000L); Thread.onSpinWait(); } ticking.set(false); }
            else while (ticking.get()) if (m.tryAcquire()) granted.incrementAndGet();
        });
        double bound = 10 + moving.get() / 1e9 * 1000 + 1e-6;
        yes(granted.get() <= bound, "moving clock: " + granted.get() + " grants <= capacity + rate x elapsed (" + bound + ")");
        yes(granted.get() >= 10, "moving clock: at least the burst");

        B_limiter.TokenBucket real = g.new TokenBucket(20, 100);
        AtomicInteger realOk = new AtomicInteger();
        long t0 = System.nanoTime();
        parallel(8, 10_000, t -> { long end = System.nanoTime() + 200_000_000L; while (System.nanoTime() < end) if (real.tryAcquire()) realOk.incrementAndGet(); });
        double realBound = 20 + (System.nanoTime() - t0) / 1e9 * 100 + 1;
        yes(realOk.get() <= realBound, "real clock: " + realOk.get() + " <= " + realBound);

        AtomicLong frozenClock = new AtomicLong(42);
        B_limiter.ClientLimiter clients = g.new ClientLimiter(10, 5, frozenClock::get);
        AtomicIntegerArray perClient = new AtomicIntegerArray(4);
        parallel(16, 20_000, t -> { for (int i = 0; i < 500; i++) { int c = (t + i) % 4; if (clients.allow("app" + c)) perClient.incrementAndGet(c); } });
        for (int c = 0; c < 4; c++) eq(10, perClient.get(c), "client " + c + " gets exactly its own 10");
    }

    // Chapter 15: ordering puzzles, every start order, many runs.
    static void turns() {
        B_turns g = new B_turns();
        int[][] perms = { {0,1,2}, {0,2,1}, {1,0,2}, {1,2,0}, {2,0,1}, {2,1,0} };
        for (int run = 0; run < 50; run++) for (int[] p : perms) {
            B_turns.InOrder io = g.new InOrder();
            List<String> out = Collections.synchronizedList(new ArrayList<>());
            parallel(3, 5000, t -> {
                int role = p[t];
                if (role == 0) io.first(() -> out.add("first"));
                else if (role == 1) io.second(() -> out.add("second"));
                else io.third(() -> out.add("third"));
            });
            eq(List.of("first", "second", "third"), out, "print in order");
        }
        for (int run = 0; run < 100; run++) {
            B_turns.PingPong pp = g.new PingPong(50);
            StringBuffer sb = new StringBuffer();
            boolean barFirst = run % 2 == 1;
            parallel(2, 5000, t -> { if ((t == 0) != barFirst) pp.foo(() -> sb.append("foo")); else pp.bar(() -> sb.append("bar")); });
            eq("foobar".repeat(50), sb.toString(), "ping-pong alternates");
        }
        for (int n : new int[] { 1, 15, 100 }) {
            List<String> expected = new ArrayList<>();
            for (int i = 1; i <= n; i++) expected.add(i % 15 == 0 ? "fizzbuzz" : i % 3 == 0 ? "fizz" : i % 5 == 0 ? "buzz" : String.valueOf(i));
            for (int run = 0; run < 50; run++) {
                B_turns.FizzBuzz fb = g.new FizzBuzz(n);
                List<String> out = Collections.synchronizedList(new ArrayList<>());
                int shift = run % 4;
                parallel(4, 5000, t -> {
                    switch ((t + shift) % 4) {
                        case 0: fb.fizz(() -> out.add("fizz")); break;
                        case 1: fb.buzz(() -> out.add("buzz")); break;
                        case 2: fb.fizzbuzz(() -> out.add("fizzbuzz")); break;
                        default: fb.number(i -> out.add(String.valueOf(i)));
                    }
                });
                eq(expected, out, "fizzbuzz n=" + n);
            }
        }
    }

    interface LotOps { OptionalInt park(String plate); boolean unpark(String plate); int parked(); }

    static void lotHarness(String name, Supplier<LotOps> make) {
        int bays = 50, threads = 32;
        LotOps lot = make.get();
        AtomicReferenceArray<String> claims = new AtomicReferenceArray<>(bays);
        ConcurrentHashMap<String, Integer> sharedHolder = new ConcurrentHashMap<>();
        AtomicInteger violations = new AtomicInteger();
        String[] shared = { "S0", "S1", "S2", "S3" };
        int[] stillParked = new int[threads];
        parallel(threads, 60_000, t -> {
            Random r = new Random(t);
            String[] own = new String[5];
            for (int k = 0; k < 5; k++) own[k] = "T" + t + "-" + k;
            Map<String, Integer> mine = new HashMap<>();   // plate -> bay, parked by this thread
            for (int op = 0; op < 3000; op++) {
                String plate = r.nextInt(5) == 0 ? shared[r.nextInt(4)] : own[r.nextInt(5)];
                Integer bay = mine.get(plate);
                if (bay == null) {
                    OptionalInt got = lot.park(plate);
                    if (got.isPresent()) {
                        int b = got.getAsInt();
                        if (b < 0 || b >= bays || !claims.compareAndSet(b, null, plate)) violations.incrementAndGet();   // double allocation
                        if (plate.startsWith("S") && sharedHolder.putIfAbsent(plate, t) != null) violations.incrementAndGet();   // one car, two bays
                        mine.put(plate, b);
                    }
                } else {
                    claims.set(bay, null);                  // clear our records BEFORE the bay can be reused
                    if (plate.startsWith("S")) sharedHolder.remove(plate);
                    if (!lot.unpark(plate)) violations.incrementAndGet();
                    mine.remove(plate);
                }
            }
            stillParked[t] = mine.size();
        });
        eq(0, violations.get(), name + ": no double allocation, no car in two bays");
        int expected = Arrays.stream(stillParked).sum(), claimed = 0;
        for (int i = 0; i < bays; i++) if (claims.get(i) != null) claimed++;
        eq(expected, lot.parked(), name + ": parked count matches the cars still inside");
        eq(claimed, lot.parked(), name + ": parked count matches claimed bays");
        yes(lot.parked() <= bays, name + ": never more cars than bays");

        for (int run = 0; run < 20; run++) {
            LotOps fresh = make.get();
            AtomicInteger wins = new AtomicInteger();
            parallel(64, 10_000, t -> { if (fresh.park(new String("SAME")).isPresent()) wins.incrementAndGet(); });
            eq(1, wins.get(), name + ": 64 gates, one plate, one bay");
            yes(fresh.unpark(new String("SAME")), name + ": unpark with an equal (not identical) plate string");
            eq(0, fresh.parked(), name + ": empty again");
            yes(fresh.park("SAME").isPresent(), name + ": the freed bay is reusable");
        }
        LotOps tiny = make.get();
        for (int i = 0; i < bays; i++) yes2(tiny.park("C" + i).isPresent());
        yes(!tiny.park("ONE-TOO-MANY").isPresent(), name + ": full lot refuses");
        yes(!tiny.unpark("NOBODY"), name + ": unpark of an absent car");
    }

    static void lot() {
        lotHarness("coarse lot", () -> {
            B_lotCoarse.ParkingLot l = new B_lotCoarse().new ParkingLot(50);
            return new LotOps() { public OptionalInt park(String p) { return l.tryPark(p); } public boolean unpark(String p) { return l.unpark(p); } public int parked() { return l.parked(); } };
        });
        lotHarness("fine-grained lot", () -> {
            B_lot.ParkingLot l = new B_lot().new ParkingLot(50);
            return new LotOps() { public OptionalInt park(String p) { return l.tryPark(p); } public boolean unpark(String p) { return l.unpark(p); } public int parked() { return l.parked(); } };
        });
        // the lesson's "catch the bug": CAS compares references, not equals()
        AtomicReference<String> occupant = new AtomicReference<>(new String("KA-01"));
        yes(!occupant.compareAndSet(new String("KA-01"), null), "CAS with an equal but different String fails");
        B_lot.Spot s = new B_lot().new Spot(3);
        yes(s.tryAssign("KA-01") && !s.tryAssign("KA-02"), "spot CAS claims once");
        s.release();
        eq(null, s.occupant(), "release clears");
    }

    // Side quest 2: exactly-once close.
    static void exitOnce() {
        B_exitOnce g = new B_exitOnce();
        int tickets = 1000;
        B_exitOnce.ExitTicket[] all = new B_exitOnce.ExitTicket[tickets];
        for (int i = 0; i < tickets; i++) all[i] = g.new ExitTicket("T" + i);
        AtomicIntegerArray charged = new AtomicIntegerArray(tickets), closedTrue = new AtomicIntegerArray(tickets);
        parallel(32, 20_000, t -> {
            for (int i = 0; i < tickets; i++) {
                int idx = i;
                if (all[i].close(60, (id, amount) -> charged.incrementAndGet(idx))) closedTrue.incrementAndGet(i);
            }
        });
        for (int i = 0; i < tickets; i++) {
            eq(1, charged.get(i), "ticket " + i + " charged once");
            eq(1, closedTrue.get(i), "ticket " + i + " closed once");
            eq(B_exitOnce.ExitTicket.State.CLOSED, all[i].state(), "ticket " + i + " closed");
        }
        B_exitOnce.ExitTicket flaky = g.new ExitTicket("F");
        throwsOn(IllegalStateException.class, () -> flaky.close(60, (id, a) -> { throw new IllegalStateException("gateway down"); }), "failed charge propagates");
        eq(B_exitOnce.ExitTicket.State.OPEN, flaky.state(), "failed charge reopens the ticket");
        yes(flaky.close(60, (id, a) -> {}), "retry succeeds");
        yes(!flaky.close(60, (id, a) -> { throw new AssertionError("must not charge twice"); }), "closed ticket refuses");
    }

    // Side quest 3: two atomics tear; one immutable value doesn't.
    static void dashboard() {
        showsFailure(5, () -> {
            B_dashboardMess.Dashboard d = new B_dashboardMess().new Dashboard();
            AtomicInteger torn = new AtomicInteger();
            AtomicInteger writersLeft = new AtomicInteger(4);
            AtomicBoolean writing = new AtomicBoolean(true);
            parallel(8, 30_000, t -> {
                if (t < 4) { for (int i = 0; i < 200_000; i++) d.carPaid(20); if (writersLeft.decrementAndGet() == 0) writing.set(false); }
                else while (writing.get()) { long[] r = d.read(); if (r[1] != 20 * r[0]) torn.incrementAndGet(); }
            });
            return torn.get();
        }, "two AtomicLongs show a car without its fee");

        B_dashboard g = new B_dashboard();
        B_dashboard.Dashboard d = g.new Dashboard();
        AtomicInteger torn = new AtomicInteger();
        AtomicInteger writersLeft = new AtomicInteger(4);
        AtomicBoolean writing = new AtomicBoolean(true);
        parallel(8, 30_000, t -> {
            if (t < 4) { for (int i = 0; i < 100_000; i++) d.carPaid(20); if (writersLeft.decrementAndGet() == 0) writing.set(false); }
            else while (writing.get()) { B_dashboard.Totals r = d.read(); if (r.revenue() != 20 * r.cars()) torn.incrementAndGet(); }
        });
        eq(0, torn.get(), "Totals always consistent");
        eq(400_000L, d.read().cars(), "no car lost");
        eq(8_000_000L, d.read().revenue(), "no fee lost");
    }
}
