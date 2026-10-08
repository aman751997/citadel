import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Exercises every compiled design in src/lld-lessons/classic-problems.mdx: parking fees, allocation and races;
// Splitwise splits, zero-sum balances and simplified settlements (against a brute-force optimum); the vending
// state machine (legal and illegal transitions, change-making against brute force, the enum table); the LRU
// cache against LinkedHashMap and under threads; seat holds with expiry and no double booking under threads;
// the LOOK elevator (worked numbers, no starvation) and the dispatcher; logger level filtering and the async
// appender; the token bucket and sliding log against independent oracles and under threads.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    static void throwsOn(Class<? extends Throwable> type, Runnable r, String what) {
        checks++;
        try { r.run(); } catch (Throwable t) {
            if (type.isInstance(t)) return;
            throw new AssertionError(what + ": threw " + t + " instead of " + type.getSimpleName());
        }
        throw new AssertionError(what + ": did not throw " + type.getSimpleName());
    }

    static final Instant NINE = Instant.parse("2026-03-13T09:00:00Z");

    static B_manualClock.ManualClock clockAt(Instant t) { return new B_manualClock.ManualClock(t); }

    public static void main(String[] args) throws Exception {
        clock();
        parking();
        parkingRace();
        evenSpread();
        splitwise();
        vending();
        vendingTable();
        lru();
        lruThreads();
        booking();
        bookingRace();
        elevator();
        logger();
        asyncAppender();
        limiter();
        limiterThreads();
        slidingLog();
        System.out.println("OK classic-problems: " + checks + " checks passed");
    }

    static void clock() {
        B_manualClock.ManualClock c = clockAt(NINE);
        eq(NINE, c.instant(), "manual clock starts where told");
        c.advance(Duration.ofMillis(250));
        eq(NINE.toEpochMilli() + 250, c.millis(), "millis follows instant");
        eq(ZoneOffset.UTC, c.getZone(), "UTC zone");
    }

    // ---------------------------------------------------------------- parking
    static void parking() {
        B_parking p = new B_parking();
        B_manualClock.ManualClock clock = clockAt(NINE);
        B_parking.ParkingLot lot = p.copperline(clock);
        eq(7L, lot.freeSpots(), "seven bays");

        B_parking.Ticket car1 = lot.park(new B_parking.Vehicle("KA-01", B_parking.VehicleType.CAR));
        eq("M-0-1", car1.spotId(), "first car: smallest fit, lowest floor");
        B_parking.Ticket car2 = lot.park(new B_parking.Vehicle("KA-02", B_parking.VehicleType.CAR));
        eq("M-0-2", car2.spotId(), "second car M-0-2");
        B_parking.Ticket car3 = lot.park(new B_parking.Vehicle("KA-03", B_parking.VehicleType.CAR));
        eq("M-1-1", car3.spotId(), "third car: medium on floor 1 beats large on floor 0");
        B_parking.Ticket bike = lot.park(new B_parking.Vehicle("BK-01", B_parking.VehicleType.BIKE));
        eq("S-0-1", bike.spotId(), "bike takes the small bay");
        throwsOn(IllegalStateException.class, () -> lot.park(new B_parking.Vehicle("KA-01", B_parking.VehicleType.CAR)), "same plate twice");
        B_parking.Ticket car4 = lot.park(new B_parking.Vehicle("KA-04", B_parking.VehicleType.CAR));
        eq("L-0-1", car4.spotId(), "fourth car falls to a large bay");
        B_parking.Ticket truck = lot.park(new B_parking.Vehicle("TR-01", B_parking.VehicleType.TRUCK));
        eq("L-1-1", truck.spotId(), "truck takes the last large bay");
        throwsOn(B_parking.LotFullException.class, () -> lot.park(new B_parking.Vehicle("TR-02", B_parking.VehicleType.TRUCK)), "truck: lot full while S-1-1 is free");
        eq(1L, lot.freeSpots(), "one small bay left");
        // the failed truck's plate is not stuck as 'parked'
        lot.unpark(truck.id());
        eq("L-1-1", lot.park(new B_parking.Vehicle("TR-02", B_parking.VehicleType.TRUCK)).spotId(), "TR-02 can park after a failure");

        // fees: 09:00 -> 11:10 is 130 minutes = 3 started hours x 20 = 60
        clock.advance(Duration.ofMinutes(130));
        B_parking.Receipt r = lot.unpark(car1.id());
        eq(new B_parking.Receipt(car1.id(), "M-0-1", 60), r, "car 2h10 = 60");
        throwsOn(IllegalArgumentException.class, () -> lot.unpark(car1.id()), "double unpark rejected");
        throwsOn(IllegalArgumentException.class, () -> lot.unpark("T-999"), "unknown ticket");
        eq(30L, lot.unpark(bike.id()).fee(), "bike 130 min = 3 x 10");

        B_parking.ParkingLot lot2 = p.copperline(clockAt(NINE));
        B_parking.Ticket quick = lot2.park(new B_parking.Vehicle("Q-1", B_parking.VehicleType.CAR));
        eq(20L, lot2.unpark(quick.id()).fee(), "zero-minute stay pays one hour");

        // fee oracle over many stays and types
        B_parking.FeeStrategy fee = p.new HourlyFee(Map.of(B_parking.VehicleType.BIKE, 10L, B_parking.VehicleType.CAR, 20L, B_parking.VehicleType.TRUCK, 40L));
        long[] rate = { 10, 20, 40 };
        for (B_parking.VehicleType t : B_parking.VehicleType.values())
            for (long m = 0; m <= 3000; m += 7) {
                B_parking.Ticket tk = p.new Ticket("x", new B_parking.Vehicle("x", t), "s", NINE);
                long hours = m == 0 ? 1 : (m % 60 == 0 ? m / 60 : m / 60 + 1);
                eq(hours * rate[t.ordinal()], fee.fee(tk, NINE.plusSeconds(m * 60)), "fee oracle " + t + " " + m);
            }
        B_parking.FeeStrategy noTruck = p.new HourlyFee(Map.of(B_parking.VehicleType.CAR, 20L));
        B_parking.ParkingLot lot3 = new B_parking().new ParkingLot(List.of(new B_parking.Floor(0, List.of(p.new Spot("L", B_parking.SpotType.LARGE)))), p.new SmallestFitLowestFloor(), noTruck, clockAt(NINE));
        B_parking.Ticket t3 = lot3.park(new B_parking.Vehicle("T", B_parking.VehicleType.TRUCK));
        throwsOn(IllegalArgumentException.class, () -> lot3.unpark(t3.id()), "missing tariff throws");
        eq(0L, lot3.freeSpots(), "...and nothing was mutated: the truck is still parked");

        // ticket invariant
        B_parking.Ticket tk = p.new Ticket("T", new B_parking.Vehicle("a", B_parking.VehicleType.CAR), "s", NINE);
        throwsOn(IllegalArgumentException.class, () -> tk.close(NINE.minusSeconds(1)), "close before entry");
        tk.close(NINE.plusSeconds(60));
        throwsOn(IllegalStateException.class, () -> tk.close(NINE.plusSeconds(120)), "close twice");
        B_parking.Spot s = p.new Spot("S", B_parking.SpotType.SMALL);
        eq(false, s.tryAssign(new B_parking.Vehicle("c", B_parking.VehicleType.CAR)), "car doesn't fit a small spot");
        throwsOn(IllegalStateException.class, s::release, "release a free spot");
    }

    static void parkingRace() throws Exception {
        B_parking p = new B_parking();
        for (int round = 0; round < 20; round++) {
            B_parking.ParkingLot lot = p.copperline(clockAt(NINE));
            int n = 200;
            ExecutorService pool = Executors.newFixedThreadPool(32);
            CountDownLatch start = new CountDownLatch(1);
            List<Future<Object>> results = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                final int id = i;
                results.add(pool.submit(() -> {
                    start.await();
                    try { return lot.park(new B_parking.Vehicle("C-" + id, B_parking.VehicleType.CAR)); }
                    catch (B_parking.LotFullException e) { return "full"; }
                }));
            }
            start.countDown();
            List<B_parking.Ticket> tickets = new ArrayList<>();
            int full = 0;
            for (Future<Object> f : results) {
                Object o = f.get();
                if (o instanceof B_parking.Ticket t) tickets.add(t); else full++;
            }
            // cars fit medium and large: 2 + 1 + 1 + 1 = 5 bays
            eq(5, tickets.size(), "exactly 5 car-sized bays claimed");
            eq(195, full, "the rest got LotFull");
            Set<String> spots = new HashSet<>();
            for (B_parking.Ticket t : tickets) yes(spots.add(t.spotId()), "no bay holds two cars");
            // now race 8 threads to unpark the same ticket
            String id = tickets.get(0).id();
            CountDownLatch go = new CountDownLatch(1);
            AtomicInteger receipts = new AtomicInteger(), refused = new AtomicInteger();
            List<Future<?>> fs = new ArrayList<>();
            for (int i = 0; i < 8; i++) fs.add(pool.submit(() -> {
                go.await();
                try { lot.unpark(id); receipts.incrementAndGet(); } catch (IllegalArgumentException e) { refused.incrementAndGet(); }
                return null;
            }));
            go.countDown();
            for (Future<?> f : fs) f.get();
            eq(1, receipts.get(), "one receipt for one ticket");
            eq(7, refused.get(), "seven exits refused");
            pool.shutdown();
        }
        // with bikes too: 200 bikes, 7 bays
        B_parking.ParkingLot lot = p.copperline(clockAt(NINE));
        ExecutorService pool = Executors.newFixedThreadPool(32);
        List<Future<Object>> results = new ArrayList<>();
        for (int i = 0; i < 200; i++) {
            final int id = i;
            results.add(pool.submit(() -> {
                try { return lot.park(new B_parking.Vehicle("B-" + id, B_parking.VehicleType.BIKE)); }
                catch (B_parking.LotFullException e) { return "full"; }
            }));
        }
        Set<String> spots = new HashSet<>();
        int ok = 0;
        for (Future<Object> f : results) if (f.get() instanceof B_parking.Ticket t) { ok++; yes(spots.add(t.spotId()), "distinct bays"); }
        eq(7, ok, "200 bikes, 7 tickets");
        pool.shutdown();
    }

    static void evenSpread() {
        B_parking p = new B_parking();
        List<B_parking.Floor> floors = new ArrayList<>();
        for (int f = 0; f < 3; f++) {
            List<B_parking.Spot> spots = new ArrayList<>();
            for (int i = 0; i < 4; i++) spots.add(p.new Spot("M-" + f + "-" + i, B_parking.SpotType.MEDIUM));
            floors.add(new B_parking.Floor(f, spots));
        }
        B_parking.FeeStrategy fee = p.new HourlyFee(Map.of(B_parking.VehicleType.CAR, 20L));
        B_parking.ParkingLot lot = p.new ParkingLot(floors, p.new EvenSpread(), fee, clockAt(NINE));
        int[] perFloor = new int[3];
        for (int i = 0; i < 12; i++) {
            B_parking.Ticket t = lot.park(new B_parking.Vehicle("E-" + i, B_parking.VehicleType.CAR));
            perFloor[t.spotId().charAt(2) - '0']++;
            int max = Arrays.stream(perFloor).max().getAsInt(), min = Arrays.stream(perFloor).min().getAsInt();
            yes(max - min <= 1, "even spread after " + (i + 1));
            if (i == 6) eq("[3, 2, 2]", Arrays.toString(perFloor), "seven cars land 3, 2, 2");
        }
        throwsOn(B_parking.LotFullException.class, () -> lot.park(new B_parking.Vehicle("X", B_parking.VehicleType.CAR)), "even spread: full");
        // smallest fit within the chosen floor
        List<B_parking.Floor> mixed = List.of(new B_parking.Floor(0, List.of(p.new Spot("L", B_parking.SpotType.LARGE), p.new Spot("M", B_parking.SpotType.MEDIUM))));
        eq("M", p.new EvenSpread().pick(mixed, B_parking.VehicleType.CAR).get().id(), "smallest fit on the floor");
    }

    // ---------------------------------------------------------------- splitwise
    static Map<String, Long> m(Object... kv) {
        Map<String, Long> out = new TreeMap<>();
        for (int i = 0; i < kv.length; i += 2) out.put((String) kv[i], ((Number) kv[i + 1]).longValue());
        return out;
    }

    static void splitwise() throws Exception {
        B_splitwise s = new B_splitwise();
        eq(Map.of("A", 3334L, "B", 3333L, "C", 3333L), new B_splitwise.EqualSplit(List.of("A", "B", "C")).shares(10000), "₹100 three ways");
        throwsOn(IllegalArgumentException.class, () -> new B_splitwise.EqualSplit(List.of()), "empty equal split");
        throwsOn(IllegalArgumentException.class, () -> new B_splitwise.PercentSplit(Map.of("A", 50, "B", 40)), "percents must sum to 100");
        throwsOn(IllegalArgumentException.class, () -> new B_splitwise.PercentSplit(Map.of("A", 150, "B", -50)), "negative percent");

        // Friday lunch
        B_splitwise.Ledger lunch = s.new Ledger();
        lunch.add(new B_splitwise.Expense("Oona", 90000, new B_splitwise.EqualSplit(List.of("Oona", "Wren", "Bram"))));
        lunch.add(new B_splitwise.Expense("Wren", 60000, new B_splitwise.ExactSplit(Map.of("Wren", 10000L, "Bram", 50000L))));
        eq(m("Bram", -80000, "Oona", 60000, "Wren", 20000), lunch.balances(), "lunch balances");
        eq(List.of(new B_splitwise.Transfer("Bram", "Oona", 60000), new B_splitwise.Transfer("Bram", "Wren", 20000)), lunch.simplify(), "lunch settles in two");
        B_splitwise.Ledger bad = s.new Ledger();
        throwsOn(IllegalArgumentException.class, () -> bad.add(new B_splitwise.Expense("A", 100, new B_splitwise.ExactSplit(Map.of("A", 50L, "B", 49L)))), "exact split must sum");
        throwsOn(IllegalArgumentException.class, () -> bad.add(new B_splitwise.Expense("A", 0, new B_splitwise.EqualSplit(List.of("A")))), "zero expense");
        throwsOn(IllegalArgumentException.class, () -> bad.add(new B_splitwise.Expense("A", 100, new B_splitwise.ExactSplit(Map.of("A", 150L, "B", -50L)))), "negative share");
        eq(Map.of(), bad.balances(), "rejected expenses change nothing");

        // A owes B 30, B owes C 30
        B_splitwise.Ledger chain = s.new Ledger();
        chain.add(new B_splitwise.Expense("B", 3000, new B_splitwise.ExactSplit(Map.of("A", 3000L))));
        chain.add(new B_splitwise.Expense("C", 3000, new B_splitwise.ExactSplit(Map.of("B", 3000L))));
        eq(List.of(new B_splitwise.Transfer("A", "C", 3000)), chain.simplify(), "A -> C once");

        // greedy vs optimal counterexample
        B_splitwise.Ledger five = s.new Ledger();
        five.add(new B_splitwise.Expense("Oona", 50000, new B_splitwise.ExactSplit(Map.of("Kofi", 50000L))));
        five.add(new B_splitwise.Expense("Wren", 40000, new B_splitwise.ExactSplit(Map.of("Bram", 40000L))));
        five.add(new B_splitwise.Expense("Ines", 30000, new B_splitwise.ExactSplit(Map.of("Bram", 30000L))));
        eq(m("Bram", -70000, "Ines", 30000, "Kofi", -50000, "Oona", 50000, "Wren", 40000), five.balances(), "five balances");
        eq(List.of(new B_splitwise.Transfer("Bram", "Oona", 50000), new B_splitwise.Transfer("Kofi", "Wren", 40000),
                   new B_splitwise.Transfer("Bram", "Ines", 20000), new B_splitwise.Transfer("Kofi", "Ines", 10000)), five.simplify(), "greedy: 4 transfers");
        eq(3, optimalTransfers(five.balances()), "optimum: 3");

        // percent and share splits
        eq(Map.of("A", 3334L, "B", 3333L, "C", 3333L), new B_splitwise.ShareSplit(Map.of("A", 1, "B", 1, "C", 1)).shares(10000), "share 1:1:1 = equal");
        eq(Map.of("Bram", 50000L, "Intern-A", 25000L, "Intern-B", 25000L), new B_splitwise.ShareSplit(Map.of("Bram", 2, "Intern-A", 1, "Intern-B", 1)).shares(100000), "share 2:1:1");
        eq(Map.of("A", 341L, "B", 330L, "C", 330L), new B_splitwise.PercentSplit(Map.of("C", 33, "B", 33, "A", 34)).shares(1001), "percent rounding: leftover paisa by name");
        eq(Map.of("A", 1L, "B", 0L), new B_splitwise.PercentSplit(Map.of("A", 50, "B", 50)).shares(1), "1 paisa 50/50 goes by name");
        eq(Map.of("A", 1L, "Z", 0L), new B_splitwise.PercentSplit(Map.of("A", 100, "Z", 0)).shares(1), "zero percent gets no leftover");
        throwsOn(IllegalArgumentException.class, () -> new B_splitwise.ShareSplit(Map.of("A", 0)), "no weight");

        Random rnd = new Random(42);
        String[] people = { "A", "B", "C", "D", "E", "F" };
        for (int trial = 0; trial < 1500; trial++) {
            B_splitwise.Ledger l = s.new Ledger();
            int k = 1 + rnd.nextInt(8);
            Map<String, Long> oracle = new TreeMap<>();
            for (int e = 0; e < k; e++) {
                long amount = 1 + rnd.nextInt(50000);
                String payer = people[rnd.nextInt(people.length)];
                List<String> who = new ArrayList<>();
                for (String p : people) if (rnd.nextBoolean()) who.add(p);
                if (who.isEmpty()) who.add(payer);
                B_splitwise.Split split;
                switch (rnd.nextInt(4)) {
                    case 0 -> split = new B_splitwise.EqualSplit(who);
                    case 1 -> {
                        Map<String, Long> ex = new HashMap<>();
                        long left = amount;
                        for (int i = 0; i < who.size(); i++) {
                            long part = i == who.size() - 1 ? left : rnd.nextInt((int) left + 1);
                            ex.merge(who.get(i), part, Long::sum);
                            left -= part;
                        }
                        split = new B_splitwise.ExactSplit(ex);
                    }
                    case 2 -> {
                        Map<String, Integer> pc = new HashMap<>();
                        int left = 100;
                        for (int i = 0; i < who.size(); i++) {
                            int part = i == who.size() - 1 ? left : rnd.nextInt(left + 1);
                            pc.merge(who.get(i), part, Integer::sum);
                            left -= part;
                        }
                        split = new B_splitwise.PercentSplit(pc);
                    }
                    default -> {
                        Map<String, Integer> w = new HashMap<>();
                        for (String p : who) w.put(p, 1 + rnd.nextInt(5));
                        split = new B_splitwise.ShareSplit(w);
                    }
                }
                Map<String, Long> shares = split.shares(amount);
                long sum = 0;
                for (long v : shares.values()) { yes(v >= 0, "non-negative share"); sum += v; }
                eq(amount, sum, "split sums to the amount");
                if (split instanceof B_splitwise.EqualSplit) {
                    long lo = Collections.min(shares.values()), hi = Collections.max(shares.values());
                    yes(hi - lo <= 1 || new HashSet<>(who).size() != who.size(), "equal shares differ by at most a paisa");
                }
                l.add(new B_splitwise.Expense(payer, amount, split));
                oracle.merge(payer, amount, Long::sum);
                shares.forEach((p, v) -> oracle.merge(p, -v, Long::sum));
            }
            Map<String, Long> bal = l.balances();
            eq(oracle, bal, "balances match an independent replay");
            eq(0L, bal.values().stream().mapToLong(Long::longValue).sum(), "balances sum to zero");
            List<B_splitwise.Transfer> plan = l.simplify();
            Map<String, Long> after = new TreeMap<>(bal);
            for (B_splitwise.Transfer t : plan) {
                yes(t.amount() > 0, "transfers are positive");
                yes(bal.get(t.from()) < 0 && bal.get(t.to()) > 0, "debtors pay creditors");
                after.merge(t.from(), t.amount(), Long::sum);
                after.merge(t.to(), -t.amount(), Long::sum);
            }
            for (long v : after.values()) eq(0L, v, "settlement zeroes everyone");
            long nonzero = bal.values().stream().filter(v -> v != 0).count();
            yes(plan.size() <= Math.max(0, nonzero - 1), "at most n-1 transfers");
            if (nonzero <= 10) yes(plan.size() >= optimalTransfers(bal), "greedy never beats the optimum");
        }

        // concurrency: 8 threads x 500 expenses
        B_splitwise.Ledger shared = s.new Ledger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<List<B_splitwise.Expense>>> fs = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            final int seed = t;
            fs.add(pool.submit(() -> {
                Random r = new Random(seed);
                List<B_splitwise.Expense> done = new ArrayList<>();
                for (int i = 0; i < 500; i++) {
                    B_splitwise.Expense e = new B_splitwise.Expense(people[r.nextInt(6)], 1 + r.nextInt(9999), new B_splitwise.EqualSplit(List.of(people[r.nextInt(6)], people[r.nextInt(6)])));
                    shared.add(e);
                    done.add(e);
                }
                return done;
            }));
        }
        B_splitwise.Ledger replay = s.new Ledger();
        for (var f : fs) for (B_splitwise.Expense e : f.get()) replay.add(e);
        pool.shutdown();
        eq(replay.balances(), shared.balances(), "concurrent ledger equals sequential replay");
        eq(0L, shared.balances().values().stream().mapToLong(Long::longValue).sum(), "concurrent ledger sums to zero");
    }

    // Brute force: minimum transfers = nonzero people - max number of disjoint zero-sum groups.
    static int optimalTransfers(Map<String, Long> balances) {
        List<Long> v = new ArrayList<>();
        for (long b : balances.values()) if (b != 0) v.add(b);
        int n = v.size();
        if (n == 0) return 0;
        long[] sum = new long[1 << n];
        int[] best = new int[1 << n];
        for (int mask = 1; mask < (1 << n); mask++) sum[mask] = sum[mask & (mask - 1)] + v.get(Integer.numberOfTrailingZeros(mask));
        for (int mask = 1; mask < (1 << n); mask++) {
            int b = 0;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) b = Math.max(b, best[mask ^ (1 << i)]);
            best[mask] = b + (sum[mask] == 0 ? 1 : 0);
        }
        return n - best[(1 << n) - 1];
    }

    // ---------------------------------------------------------------- vending
    static B_vending.VendingMachine loadedMachine(B_vending v) {
        B_vending.VendingMachine m = v.new VendingMachine(Map.of(
            "A1", new B_vending.Product("Cola", 25), "A2", new B_vending.Product("Chips", 20), "B1", new B_vending.Product("Peanut bar", 14)));
        m.restock("A1", 2);
        m.restock("A2", 1);
        m.restock("B1", 3);
        m.loadCoins(5, 1);
        m.loadCoins(2, 3);
        m.backInService();
        return m;
    }

    static void vending() {
        B_vending v = new B_vending();
        B_vending.VendingMachine fresh = v.new VendingMachine(Map.of("A1", new B_vending.Product("Cola", 25)));
        eq("OutOfService", fresh.stateName(), "a new machine is out of service");
        throwsOn(IllegalStateException.class, () -> fresh.insert(10), "no coins while out of service");
        throwsOn(IllegalStateException.class, () -> fresh.select("A1"), "no vending while out of service");

        B_vending.VendingMachine m = loadedMachine(v);
        eq("Idle", m.stateName(), "loaded and in service");
        throwsOn(IllegalStateException.class, () -> m.select("A2"), "Fennick bug 1: select with no money");
        throwsOn(IllegalStateException.class, m::cancel, "cancel while idle");
        throwsOn(IllegalStateException.class, () -> m.restock("A1", 1), "no restock while in service");
        throwsOn(IllegalArgumentException.class, () -> m.insert(3), "rejected coin");
        eq("Idle", m.stateName(), "rejected coin changes nothing");
        m.insert(20);
        eq("Collecting", m.stateName(), "coin -> collecting");
        throwsOn(IllegalStateException.class, m::outOfService, "can't leave service with credit");
        // ₹20 for the ₹14 peanut bar: change 6 from {5:1, 2:3, 20:1} -> 2+2+2
        B_vending.Vend vend = m.select("B1");
        eq(new B_vending.Vend("Peanut bar", List.of(2, 2, 2)), vend, "change 6 = 2+2+2");
        eq("Idle", m.stateName(), "back to idle");
        eq(2, m.stock("B1"), "stock decremented");
        eq(Map.of(20, 1, 5, 1, 2, 0), m.coinBox(), "box after vend");

        B_vending g = new B_vending();
        TreeMap<Integer, Integer> box = new TreeMap<>(Comparator.reverseOrder());
        box.put(5, 1); box.put(2, 3); box.put(20, 1);
        eq(null, new B_greedyChange().greedyChange(6, box), "greedy fails on change 6");

        // cancel twice
        m.insert(10);
        m.insert(5);
        eq(15, m.credit(), "credit 15");
        throwsOn(B_vending.Refused.class, () -> m.select("A1"), "insert 10 more");
        eq("Collecting", m.stateName(), "refused keeps collecting");
        eq(15, m.credit(), "refused keeps credit");
        List<Integer> refund = m.cancel();
        eq(15, refund.stream().mapToInt(Integer::intValue).sum(), "refund equals credit");
        eq(List.of(10, 5), refund, "fewest coins refund");
        throwsOn(IllegalStateException.class, m::cancel, "Fennick bug 2: second cancel throws");

        // sold out and exact change only
        m.insert(20);
        m.select("A2");                                     // chips 20, no change
        m.insert(20);
        throwsOn(B_vending.Refused.class, () -> m.select("A2"), "sold out");
        eq(20, m.credit(), "sold out keeps credit");
        m.insert(20);                                       // 40 for cola 25 -> change 15
        B_vending.VendingMachine poor = v.new VendingMachine(Map.of("A1", new B_vending.Product("Cola", 25)));
        poor.restock("A1", 1);
        poor.backInService();
        poor.insert(20);
        poor.insert(20);
        throwsOn(B_vending.Refused.class, () -> poor.select("A1"), "exact change only (box has only 20s)");
        eq(List.of(20, 20), poor.cancel(), "refund the customer's own coins");
        throwsOn(IllegalArgumentException.class, () -> { poor.insert(5); poor.select("Z9"); }, "unknown slot");
        poor.cancel();
        poor.outOfService();
        throwsOn(IllegalArgumentException.class, () -> poor.restock("Z9", 1), "bad restock");
        throwsOn(IllegalArgumentException.class, () -> poor.loadCoins(3, 1), "bad coin load");

        // random: coin conservation, credit accounting and change-making vs brute force
        Random rnd = new Random(7);
        int[] coins = { 1, 2, 5, 10, 20 };
        for (int trial = 0; trial < 300; trial++) {
            B_vending.VendingMachine r = v.new VendingMachine(Map.of("A", new B_vending.Product("a", 1 + rnd.nextInt(40)), "B", new B_vending.Product("b", 1 + rnd.nextInt(40))));
            r.restock("A", rnd.nextInt(3));
            r.restock("B", rnd.nextInt(3));
            for (int c : coins) r.loadCoins(c, rnd.nextInt(3));
            r.backInService();
            for (int step = 0; step < 40; step++) {
                Map<Integer, Integer> before = r.coinBox();
                int credit = r.credit();
                int op = rnd.nextInt(3);
                try {
                    if (op == 0) r.insert(coins[rnd.nextInt(5)]);
                    else if (op == 1) {
                        String slot = rnd.nextBoolean() ? "A" : "B";
                        int stock = r.stock(slot);
                        boolean changeExists = credit > 0 && changePossible(before, credit - priceOf(r, slot));
                        try {
                            B_vending.Vend out = r.select(slot);
                            int paid = out.change().stream().mapToInt(Integer::intValue).sum();
                            eq(credit - priceOf(r, slot), paid, "change is credit minus price");
                            eq(stock - 1, r.stock(slot), "one item left the slot");
                            yes(fewest(before, paid) == out.change().size(), "fewest coins");
                            eq(0, r.credit(), "credit cleared");
                        } catch (B_vending.Refused refused) {
                            yes(stock == 0 || credit < priceOf(r, slot) || !changeExists, "refused only for a reason: " + refused.getMessage());
                            if (stock > 0 && credit >= priceOf(r, slot)) yes(!changeExists, "exact change only means no change exists");
                            eq(credit, r.credit(), "refused keeps credit");
                        }
                    } else {
                        List<Integer> back = r.cancel();
                        eq(credit, back.stream().mapToInt(Integer::intValue).sum(), "refund = credit");
                    }
                } catch (IllegalStateException illegal) {
                    eq(before, r.coinBox(), "illegal action leaves the box alone");
                    eq(credit, r.credit(), "illegal action leaves credit alone");
                }
                for (int c : r.coinBox().values()) yes(c >= 0, "no negative coin counts");
            }
        }
    }

    static int priceOf(B_vending.VendingMachine m, String slot) { return slot.equals("A") ? priceA(m) : priceB(m); }
    static Map<B_vending.VendingMachine, int[]> prices = new IdentityHashMap<>();
    static int priceA(B_vending.VendingMachine m) { return price(m, "A"); }
    static int priceB(B_vending.VendingMachine m) { return price(m, "B"); }
    static int price(B_vending.VendingMachine m, String slot) {
        try {
            var f = B_vending.VendingMachine.class.getDeclaredField("products");
            f.setAccessible(true);
            @SuppressWarnings("unchecked") Map<String, B_vending.Product> ps = (Map<String, B_vending.Product>) f.get(m);
            return ps.get(slot).price();
        } catch (ReflectiveOperationException e) { throw new RuntimeException(e); }
    }

    // brute force over every count of every coin
    static boolean changePossible(Map<Integer, Integer> box, int amount) { return amount >= 0 && fewest(box, amount) >= 0; }
    static int fewest(Map<Integer, Integer> box, int amount) {
        List<int[]> kinds = new ArrayList<>();
        box.forEach((c, n) -> kinds.add(new int[] { c, n }));
        return fewest(kinds, 0, amount);
    }
    static int fewest(List<int[]> kinds, int i, int amount) {
        if (amount == 0) return 0;
        if (i == kinds.size() || amount < 0) return -1;
        int best = -1;
        for (int k = 0; k <= kinds.get(i)[1] && k * kinds.get(i)[0] <= amount; k++) {
            int rest = fewest(kinds, i + 1, amount - k * kinds.get(i)[0]);
            if (rest >= 0 && (best < 0 || rest + k < best)) best = rest + k;
        }
        return best;
    }

    static void vendingTable() {
        B_vending v = new B_vending();
        Random rnd = new Random(11);
        B_vending.VendOp[] ops = B_vending.VendOp.values();
        for (int trial = 0; trial < 100; trial++) {
            B_vending.VendingMachine m = loadedMachine(v);
            for (int step = 0; step < 200; step++) {
                B_vending.VendState st = switch (m.stateName()) {
                    case "Idle" -> B_vending.VendState.IDLE;
                    case "Collecting" -> B_vending.VendState.COLLECTING;
                    default -> B_vending.VendState.OUT_OF_SERVICE;
                };
                B_vending.VendOp op = ops[rnd.nextInt(ops.length)];
                boolean threwIllegal = false;
                try {
                    switch (op) {
                        case INSERT -> m.insert(new int[] { 1, 2, 5, 10, 20 }[rnd.nextInt(5)]);
                        case SELECT -> m.select(new String[] { "A1", "A2", "B1" }[rnd.nextInt(3)]);
                        case CANCEL -> m.cancel();
                        case OUT_OF_SERVICE -> m.outOfService();
                        case BACK_IN_SERVICE -> m.backInService();
                        case RESTOCK -> m.restock("A1", 1);
                        case LOAD_COINS -> m.loadCoins(1, 2);
                    }
                } catch (IllegalStateException e) {
                    threwIllegal = true;
                } catch (B_vending.Refused | IllegalArgumentException e) {
                    // legal request, not servable
                }
                eq(!st.allows(op), threwIllegal, "table agrees with machine: " + st + " " + op);
            }
        }
    }

    // ---------------------------------------------------------------- lru
    static void lru() {
        B_lru l = new B_lru();
        B_lru.LruCache<String, Integer> c = l.new LruCache<>(3);
        c.put("a", 1); c.put("b", 2); c.put("c", 3);
        eq(List.of("c", "b", "a"), c.keysMostRecentFirst(), "c, b, a");
        eq(1, c.get("a"), "get a");
        eq(List.of("a", "c", "b"), c.keysMostRecentFirst(), "a, c, b");
        c.put("d", 4);
        eq(List.of("d", "a", "c"), c.keysMostRecentFirst(), "b evicted");
        eq(null, c.get("b"), "b gone");
        c.put("c", 30);
        eq(List.of("c", "d", "a"), c.keysMostRecentFirst(), "update moves to front");
        eq(30, c.get("c"), "updated value");
        throwsOn(IllegalArgumentException.class, () -> l.new LruCache<String, Integer>(0), "capacity 0");
        throwsOn(NullPointerException.class, () -> c.put("x", null), "null value");

        Random rnd = new Random(3);
        for (int cap = 1; cap <= 5; cap++) {
            final int capacity = cap;
            B_lru.LruCache<Integer, Integer> mine = l.new LruCache<>(cap);
            LinkedHashMap<Integer, Integer> model = new LinkedHashMap<>(16, 0.75f, true) {
                @Override protected boolean removeEldestEntry(Map.Entry<Integer, Integer> e) { return size() > capacity; }
            };
            for (int i = 0; i < 4000; i++) {
                int k = rnd.nextInt(8);
                if (rnd.nextBoolean()) eq(model.get(k), mine.get(k), "get vs LinkedHashMap");
                else { int val = rnd.nextInt(100); model.put(k, val); mine.put(k, val); }
                List<Integer> order = new ArrayList<>(model.keySet());
                Collections.reverse(order);
                eq(order, mine.keysMostRecentFirst(), "order vs LinkedHashMap");
                eq(model.size(), mine.size(), "size");
            }
        }
    }

    static void lruThreads() throws Exception {
        B_lru l = new B_lru();
        B_lru.SynchronizedLru<Integer, Integer> cache = l.new SynchronizedLru<>(16);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicInteger maxSize = new AtomicInteger();
        List<Future<?>> fs = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            final int seed = t;
            fs.add(pool.submit(() -> {
                Random r = new Random(seed);
                for (int i = 0; i < 20000; i++) {
                    int k = r.nextInt(50);
                    if (r.nextBoolean()) cache.get(k); else cache.put(k, i);
                    maxSize.accumulateAndGet(cache.size(), Math::max);
                }
                return null;
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        yes(maxSize.get() <= 16, "never above capacity");
        List<Integer> keys = cache.keysMostRecentFirst();
        eq(cache.size(), keys.size(), "list and map agree");
        eq(keys.size(), new HashSet<>(keys).size(), "no duplicate nodes");
        eq(16, keys.size(), "full after the storm");
    }

    // ---------------------------------------------------------------- booking
    static void booking() {
        B_booking b = new B_booking();
        B_manualClock.ManualClock clock = clockAt(Instant.parse("2026-03-13T19:00:00Z"));
        List<String> seats = new ArrayList<>();
        for (char row = 'A'; row <= 'C'; row++) for (int i = 1; i <= 10; i++) seats.add("" + row + i);
        B_booking.Show show = b.new Show("S1", seats, clock, Duration.ofMinutes(10));

        B_booking.Hold asha = show.hold("asha", Set.of("A5", "A6")).orElseThrow();
        eq(Instant.parse("2026-03-13T19:10:00Z"), asha.expiresAt(), "expires 19:10");
        eq(B_booking.SeatStatus.HELD, show.status("A6"), "A6 held");
        clock.advance(Duration.ofMinutes(4));
        eq(Optional.empty(), show.hold("ravi", Set.of("A6", "A7")), "19:04: all or nothing");
        eq(B_booking.SeatStatus.AVAILABLE, show.status("A7"), "A7 not half-held");
        clock.advance(Duration.ofSeconds(359));
        eq(B_booking.SeatStatus.HELD, show.status("A6"), "19:09:59 still held");
        clock.advance(Duration.ofSeconds(1));
        B_booking.Hold ravi = show.hold("ravi", Set.of("A6", "A7")).orElseThrow();
        eq("ravi", ravi.user(), "19:10:00 exactly: Ravi gets both");
        clock.advance(Duration.ofSeconds(30));
        throwsOn(B_booking.HoldExpiredException.class, () -> show.confirm(asha.id()), "Asha's confirm at 19:10:30 fails");
        eq(B_booking.SeatStatus.AVAILABLE, show.status("A5"), "A5 freed by expiry");
        B_booking.Booking rb = show.confirm(ravi.id());
        eq(Set.of("A6", "A7"), rb.seats(), "Ravi booked");
        eq(B_booking.SeatStatus.BOOKED, show.status("A6"), "booked");
        throwsOn(B_booking.HoldExpiredException.class, () -> show.confirm(ravi.id()), "confirm twice");
        clock.advance(Duration.ofHours(5));
        eq(B_booking.SeatStatus.BOOKED, show.status("A7"), "bookings never expire");
        eq(Optional.empty(), show.hold("x", Set.of("A7")), "booked seat can't be held");

        B_booking.Hold h = show.hold("z", Set.of("B1")).orElseThrow();
        show.release(h.id());
        eq(B_booking.SeatStatus.AVAILABLE, show.status("B1"), "release frees");
        show.release(h.id());                       // idempotent
        throwsOn(IllegalArgumentException.class, () -> show.hold("z", Set.of("Z9")), "unknown seat");
        throwsOn(IllegalArgumentException.class, () -> show.hold("z", Set.of()), "empty hold");

        B_booking.Hold priced = show.hold("p", Set.of("A5", "A8", "C1")).orElseThrow();
        eq(1150L, b.total(priced, b.new RowPricing(Set.of('A', 'B'), 450, 250)), "450 + 450 + 250");
    }

    static void bookingRace() throws Exception {
        B_booking b = new B_booking();
        for (int round = 0; round < 10; round++) {
            List<String> seats = new ArrayList<>();
            for (int i = 1; i <= 30; i++) seats.add("F" + i);
            B_booking.Show show = b.new Show("S", seats, Clock.fixed(Instant.parse("2026-03-13T19:00:00Z"), ZoneOffset.UTC), Duration.ofMinutes(10));
            ExecutorService pool = Executors.newFixedThreadPool(40);
            CountDownLatch go = new CountDownLatch(1);
            List<Future<List<B_booking.Booking>>> fs = new ArrayList<>();
            for (int t = 0; t < 40; t++) {
                final int seed = t * 31 + round;
                fs.add(pool.submit(() -> {
                    go.await();
                    Random r = new Random(seed);
                    List<B_booking.Booking> mine = new ArrayList<>();
                    for (int i = 0; i < 50; i++) {
                        int s = 1 + r.nextInt(29);
                        Optional<B_booking.Hold> h = show.hold("u" + seed, Set.of("F" + s, "F" + (s + 1)));
                        if (h.isPresent()) {
                            if (r.nextInt(4) == 0) show.release(h.get().id());
                            else mine.add(show.confirm(h.get().id()));
                        }
                    }
                    return mine;
                }));
            }
            go.countDown();
            Map<String, Integer> owners = new HashMap<>();
            for (var f : fs) for (B_booking.Booking bk : f.get()) {
                eq(2, bk.seats().size(), "pairs");
                for (String s : bk.seats()) eq(null, owners.put(s, 1), "seat " + s + " booked twice");
            }
            for (String s : seats) eq(owners.containsKey(s) ? B_booking.SeatStatus.BOOKED : B_booking.SeatStatus.AVAILABLE, show.status(s), "status matches bookings for " + s);
            pool.shutdown();
        }
        // one hot seat, 64 threads
        B_booking.Show hot = b.new Show("H", List.of("F7"), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), Duration.ofMinutes(10));
        ExecutorService pool = Executors.newFixedThreadPool(64);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> fs = new ArrayList<>();
        for (int t = 0; t < 64; t++) {
            final int id = t;
            fs.add(pool.submit(() -> {
                go.await();
                Optional<B_booking.Hold> h = hot.hold("u" + id, Set.of("F7"));
                if (h.isEmpty()) return false;
                hot.confirm(h.get().id());
                return true;
            }));
        }
        go.countDown();
        int winners = 0;
        for (var f : fs) if (f.get()) winners++;
        eq(1, winners, "one booking for F7");
        pool.shutdown();
    }

    // ---------------------------------------------------------------- elevator
    static int runUntilIdle(B_elevator.Elevator e) {
        int ticks = 0;
        while (!e.idle()) { e.step(); if (++ticks > 10000) throw new AssertionError("elevator never finished"); }
        e.step();
        return ticks;
    }

    static void elevator() {
        B_elevator el = new B_elevator();
        B_elevator.Elevator car = el.new Elevator(0, 9, 0, el.new LookScheduler());
        for (int f : new int[] { 9, 1, 8, 2 }) car.request(f);
        runUntilIdle(car);
        eq(List.of(1, 2, 8, 9), car.served(), "LOOK serves 1, 2, 8, 9");
        eq(9, car.moves(), "LOOK: 9 floors");
        eq(30, new B_fcfs().fcfsMoves(0, List.of(9, 1, 8, 2)), "FCFS: 30 floors");
        eq(B_elevator.Direction.IDLE, car.direction(), "idle when done");

        // at 5 going up, stops 7 and 2, then 6 pressed
        B_elevator.Elevator c2 = el.new Elevator(0, 9, 4, el.new LookScheduler());
        c2.request(7);
        c2.step();                                  // 4 -> 5, now UP
        eq(5, c2.floor(), "at 5");
        eq(B_elevator.Direction.UP, c2.direction(), "going up");
        c2.request(2);
        c2.request(6);
        int before = c2.moves();
        runUntilIdle(c2);
        eq(List.of(6, 7, 2), c2.served(), "6 is on the way");
        eq(7, c2.moves() - before, "1 + 1 + 5 = 7");
        eq(11, new B_fcfs().fcfsMoves(5, List.of(7, 2, 6)), "FCFS in arrival order: 11");

        // idle tie goes up
        B_elevator.Elevator c3 = el.new Elevator(0, 9, 4, el.new LookScheduler());
        c3.request(2); c3.request(6);
        runUntilIdle(c3);
        eq(List.of(6, 2), c3.served(), "tie: up first");
        eq(6, c3.moves(), "2 + 4");
        throwsOn(IllegalArgumentException.class, () -> c3.request(10), "no floor 10");
        c3.request(2);
        runUntilIdle(c3);
        eq(List.of(6, 2, 2), c3.served(), "request at the current floor opens the doors");

        // random dynamic requests: everyone served, within 2*(top-bottom) moves, and direction reversals only at stops/ends
        Random rnd = new Random(5);
        for (int trial = 0; trial < 1000; trial++) {
            B_elevator.Elevator e = el.new Elevator(0, 9, rnd.nextInt(10), el.new LookScheduler());
            Map<Integer, Integer> pendingSince = new HashMap<>();   // floor -> moves count at request
            int tick = 0, served = 0, requested = 0;
            int lastDir = 0, lastFloor = e.floor();
            while (tick < 400 || !e.idle()) {
                if (tick < 400 && rnd.nextInt(4) == 0) {
                    int f = rnd.nextInt(10);
                    e.request(f);
                    pendingSince.putIfAbsent(f, e.moves());
                    requested++;
                }
                int sizeBefore = e.served().size();
                e.step();
                List<Integer> s = e.served();
                if (s.size() > sizeBefore) {
                    int f = s.get(s.size() - 1);
                    Integer since = pendingSince.remove(f);
                    yes(since != null, "served floor " + f + " was requested");
                    yes(e.moves() - since <= 18, "served within 2*(9-0) moves");
                    served++;
                }
                int dir = Integer.signum(e.floor() - lastFloor);
                if (dir != 0 && lastDir != 0 && dir != lastDir) yes(true, "reversal");
                if (dir != 0) lastDir = dir;
                lastFloor = e.floor();
                tick++;
                if (tick > 5000) throw new AssertionError("elevator starved");
            }
            yes(pendingSince.isEmpty(), "every request served");
            yes(served <= requested, "no phantom stops");
        }
        // static requests from idle: at most one reversal
        for (int trial = 0; trial < 1000; trial++) {
            B_elevator.Elevator e = el.new Elevator(0, 9, rnd.nextInt(10), el.new LookScheduler());
            Set<Integer> want = new TreeSet<>();
            int k = 1 + rnd.nextInt(6);
            for (int i = 0; i < k; i++) { int f = rnd.nextInt(10); want.add(f); e.request(f); }
            int reversals = 0, lastDir = 0, lastFloor = e.floor();
            while (!e.idle()) {
                e.step();
                int dir = Integer.signum(e.floor() - lastFloor);
                if (dir != 0) { if (lastDir != 0 && dir != lastDir) reversals++; lastDir = dir; }
                lastFloor = e.floor();
            }
            yes(reversals <= 1, "LOOK reverses at most once on a static batch");
            eq(new ArrayList<>(want), e.served().stream().sorted().toList(), "each stop once");
        }

        // dispatcher
        B_elevator.Elevator a = el.new Elevator(0, 9, 0, el.new LookScheduler());
        B_elevator.Elevator b = el.new Elevator(0, 9, 5, el.new LookScheduler());
        b.request(9);
        b.step();                                   // 5 -> 6, UP, stop 9 pending
        eq(6, b.floor(), "B at 6");
        B_elevator.NearestCarDispatcher d = el.new NearestCarDispatcher(List.of(a, b));
        eq(4, d.cost(a, 4), "A costs 4");
        eq(8, d.cost(b, 4), "B costs (9-6)+(9-4) = 8");
        eq(8, d.cost(a, 8), "A to 8 costs 8");
        eq(2, d.cost(b, 8), "B to 8 costs 2");
        yes(d.assign(4) == a, "A takes floor 4");
        yes(d.assign(8) == b, "B takes floor 8");
        yes(a.pendingStops().contains(4) && b.pendingStops().contains(8), "requests landed");
    }

    // ---------------------------------------------------------------- logger
    static void logger() throws Exception {
        B_logger lg = new B_logger();
        B_manualClock.ManualClock clock = clockAt(NINE);
        B_logger.LogManager mgr = lg.new LogManager(clock);
        B_logger.PatternLayout layout = lg.new PatternLayout();
        B_logger.MemoryAppender root = lg.new MemoryAppender(layout), lift = lg.new MemoryAppender(layout);
        mgr.root().addAppender(root);
        B_logger.Logger liftLogger = mgr.get("gearhouse.lift");
        liftLogger.setLevel(B_logger.Level.DEBUG);
        liftLogger.addAppender(lift);
        B_logger.Logger door = mgr.get("gearhouse.lift.door");
        yes(door == mgr.get("gearhouse.lift.door"), "same instance");
        eq(B_logger.Level.DEBUG, door.effectiveLevel(), "door inherits DEBUG");
        door.debug("still closed");
        eq(List.of("2026-03-13T09:00:00Z DEBUG [gearhouse.lift.door] still closed"), lift.lines, "lift appender");
        eq(List.of("2026-03-13T09:00:00Z DEBUG [gearhouse.lift.door] still closed"), root.lines, "root appender too");
        B_logger.Logger cinema = mgr.get("gearhouse.cinema");
        eq(B_logger.Level.INFO, cinema.effectiveLevel(), "cinema inherits INFO");
        cinema.debug("seat map");
        eq(1, root.lines.size(), "cinema debug dropped");
        clock.advance(Duration.ofSeconds(1));
        cinema.warn("hold expired");
        eq(2, root.lines.size(), "cinema warn to root");
        eq(1, lift.lines.size(), "not to lift");
        liftLogger.setAdditive(false);
        door.debug("still closed");
        eq(2, lift.lines.size(), "non-additive: lift gets it");
        eq(2, root.lines.size(), "...root doesn't");
        eq(B_logger.Level.INFO, mgr.get("gearhouse").effectiveLevel(), "gearhouse inherits root");

        // random hierarchies vs an oracle
        Random rnd = new Random(9);
        String[] names = { "a", "a.b", "a.b.c", "a.d", "e", "e.f" };
        B_logger.Level[] levels = B_logger.Level.values();
        for (int trial = 0; trial < 400; trial++) {
            B_logger.LogManager lm = lg.new LogManager(clockAt(NINE));
            Map<String, B_logger.Level> set = new HashMap<>();
            Map<String, Boolean> additive = new HashMap<>();
            Map<String, B_logger.MemoryAppender> apps = new HashMap<>();
            set.put("", B_logger.Level.INFO);
            if (rnd.nextBoolean()) { set.put("", levels[rnd.nextInt(4)]); lm.root().setLevel(set.get("")); }
            B_logger.MemoryAppender ra = lg.new MemoryAppender(e -> e.logger() + ":" + e.level() + ":" + e.message());
            lm.root().addAppender(ra);
            apps.put("", ra);
            for (String n : names) {
                B_logger.Logger x = lm.get(n);
                if (rnd.nextInt(3) == 0) { B_logger.Level lv = levels[rnd.nextInt(4)]; x.setLevel(lv); set.put(n, lv); }
                if (rnd.nextInt(4) == 0) { x.setAdditive(false); additive.put(n, false); }
                if (rnd.nextBoolean()) { B_logger.MemoryAppender ap = lg.new MemoryAppender(e -> e.logger() + ":" + e.level() + ":" + e.message()); x.addAppender(ap); apps.put(n, ap); }
            }
            Map<String, List<String>> expected = new HashMap<>();
            for (String k : apps.keySet()) expected.put(k, new ArrayList<>());
            int msg = 0;
            for (String n : names) for (B_logger.Level lv : levels) {
                String text = "m" + (msg++);
                lm.get(n).log(lv, text);
                // oracle
                B_logger.Level eff = null;
                for (String p = n; ; p = parentOf(p)) { if (set.containsKey(p)) { eff = set.get(p); break; } if (p.isEmpty()) break; }
                if (lv.compareTo(eff) < 0) continue;
                for (String p = n; ; p = parentOf(p)) {
                    if (expected.containsKey(p)) expected.get(p).add(n + ":" + lv + ":" + text);
                    if (Boolean.FALSE.equals(additive.get(p)) || p.isEmpty()) break;
                }
            }
            for (String k : apps.keySet()) eq(expected.get(k), apps.get(k).lines, "appender " + k + " trial " + trial);
        }

        // registry race: same instances
        B_logger.LogManager race = lg.new LogManager(clockAt(NINE));
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<List<B_logger.Logger>>> fs = new ArrayList<>();
        for (int t = 0; t < 16; t++) fs.add(pool.submit(() -> {
            go.await();
            List<B_logger.Logger> got = new ArrayList<>();
            for (int i = 0; i < 200; i++) got.add(race.get("g.s" + (i % 20) + ".x" + (i % 7)));
            return got;
        }));
        go.countDown();
        List<B_logger.Logger> first = fs.get(0).get();
        for (var f : fs) {
            List<B_logger.Logger> got = f.get();
            for (int i = 0; i < got.size(); i++) yes(got.get(i) == first.get(i), "one logger per name");
        }
        for (B_logger.Logger l : first) yes(l == race.get(l.name()), "registered");
        pool.shutdown();
    }

    static String parentOf(String n) { int dot = n.lastIndexOf('.'); return dot < 0 ? "" : n.substring(0, dot); }

    static void asyncAppender() throws Exception {
        B_logger lg = new B_logger();
        // slow target, small queue: delivered + dropped = offered, per-thread order preserved
        List<B_logger.LogEvent> delivered = Collections.synchronizedList(new ArrayList<>());
        B_logger.Appender slow = e -> { delivered.add(e); if (delivered.size() % 50 == 0) { try { Thread.sleep(1); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); } } };
        B_logger.AsyncAppender async = lg.new AsyncAppender(slow, 64);
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<?>> fs = new ArrayList<>();
        for (int t = 0; t < 4; t++) {
            final int id = t;
            fs.add(pool.submit(() -> { for (int i = 0; i < 1250; i++) async.append(new B_logger.LogEvent(NINE, B_logger.Level.INFO, "t" + id, String.valueOf(i))); }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        async.close();
        eq(5000L, delivered.size() + async.dropped(), "delivered + dropped = 5000");
        Map<String, Integer> last = new HashMap<>();
        for (B_logger.LogEvent e : delivered) {
            int n = Integer.parseInt(e.message());
            Integer prev = last.put(e.logger(), n);
            yes(prev == null || prev < n, "per-thread order preserved");
        }
        async.append(new B_logger.LogEvent(NINE, B_logger.Level.INFO, "late", "x"));
        eq(5001L, delivered.size() + async.dropped(), "after close: counted as dropped");

        List<B_logger.LogEvent> all = Collections.synchronizedList(new ArrayList<>());
        B_logger.AsyncAppender big = lg.new AsyncAppender(all::add, 10000);
        for (int i = 0; i < 5000; i++) big.append(new B_logger.LogEvent(NINE, B_logger.Level.INFO, "x", String.valueOf(i)));
        big.close();
        eq(5000, all.size(), "big queue: nothing dropped");
        eq(0L, big.dropped(), "zero dropped");
        for (int i = 0; i < 5000; i++) eq(String.valueOf(i), all.get(i).message(), "order");
    }

    // ---------------------------------------------------------------- rate limiter
    static void limiter() {
        B_limiter b = new B_limiter();
        B_manualClock.ManualClock clock = clockAt(Instant.EPOCH);
        B_limiter.TokenBucketLimiter lim = b.new TokenBucketLimiter(10, 5, Duration.ofSeconds(1), clock);
        int ok = 0;
        for (int i = 0; i < 12; i++) if (lim.allow("student")) ok++;
        eq(10, ok, "burst of 12: 10 allowed");
        clock.advance(Duration.ofMillis(200));
        eq(true, lim.allow("student"), "200 ms: one token");
        clock.advance(Duration.ofMillis(100));
        eq(false, lim.allow("student"), "300 ms: half a token");
        clock.advance(Duration.ofMillis(900));
        B_limiter.TokenBucket probe = b.new TokenBucket(10, 5, Duration.ofSeconds(1), clock);
        int got = 0;
        while (lim.allow("student")) got++;
        eq(5, got, "1.2 s: 5 tokens");
        int other = 0;
        for (int i = 0; i < 20; i++) if (lim.allow("other")) other++;
        eq(10, other, "another key has its own bucket");
        eq(10L, probe.available(), "new bucket starts full");
        throwsOn(IllegalArgumentException.class, () -> b.new TokenBucket(0, 1, Duration.ofSeconds(1), clock), "bad bucket");

        // clock stepping back mints nothing
        B_manualClock.ManualClock c2 = clockAt(Instant.ofEpochMilli(10_000));
        B_limiter.TokenBucket tb = b.new TokenBucket(2, 1, Duration.ofSeconds(1), c2);
        tb.tryAcquire(); tb.tryAcquire();
        c2.advance(Duration.ofMillis(-5000));
        eq(0L, tb.available(), "clock back: no tokens");
        c2.advance(Duration.ofMillis(5000));
        eq(0L, tb.available(), "back to the same time: still none");
        c2.advance(Duration.ofMillis(1000));
        eq(1L, tb.available(), "one second later: one");

        // random vs a 1-ms tick oracle
        Random rnd = new Random(13);
        for (int trial = 0; trial < 300; trial++) {
            long cap = 1 + rnd.nextInt(10), per = 1 + rnd.nextInt(7), periodMs = 1 + rnd.nextInt(2000);
            B_manualClock.ManualClock c = clockAt(Instant.ofEpochMilli(1_000_000));
            B_limiter.TokenBucket bucket = b.new TokenBucket(cap, per, Duration.ofMillis(periodMs), c);
            // oracle: tokens in units of 1/periodMs, stepped one millisecond at a time
            long units = cap * periodMs;
            for (int r = 0; r < 60; r++) {
                int wait = rnd.nextInt(4) == 0 ? rnd.nextInt(3000) : rnd.nextInt(40);
                for (int ms = 0; ms < wait; ms++) units = Math.min(cap * periodMs, units + per);
                c.advance(Duration.ofMillis(wait));
                boolean expect = units >= periodMs;
                if (expect) units -= periodMs;
                eq(expect, bucket.tryAcquire(), "bucket vs tick oracle");
            }
        }
    }

    static void limiterThreads() throws Exception {
        B_limiter b = new B_limiter();
        Clock frozen = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
        B_limiter.TokenBucketLimiter lim = b.new TokenBucketLimiter(10, 5, Duration.ofSeconds(1), frozen);
        ExecutorService pool = Executors.newFixedThreadPool(16);
        AtomicInteger ok = new AtomicInteger();
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> fs = new ArrayList<>();
        for (int t = 0; t < 16; t++) fs.add(pool.submit(() -> { go.await(); for (int i = 0; i < 1000; i++) if (lim.allow("k")) ok.incrementAndGet(); return null; }));
        go.countDown();
        for (Future<?> f : fs) f.get();
        eq(10, ok.get(), "frozen clock: exactly capacity");

        B_limiter.TokenBucketLimiter many = b.new TokenBucketLimiter(10, 5, Duration.ofSeconds(1), frozen);
        ConcurrentHashMap<String, AtomicInteger> perKey = new ConcurrentHashMap<>();
        CountDownLatch go2 = new CountDownLatch(1);
        fs.clear();
        for (int t = 0; t < 16; t++) fs.add(pool.submit(() -> {
            go2.await();
            for (int i = 0; i < 2000; i++) { String k = "key" + (i % 50); if (many.allow(k)) perKey.computeIfAbsent(k, x -> new AtomicInteger()).incrementAndGet(); }
            return null;
        }));
        go2.countDown();
        for (Future<?> f : fs) f.get();
        eq(50, perKey.size(), "50 keys");
        for (var e : perKey.entrySet()) eq(10, e.getValue().get(), "exactly 10 for " + e.getKey());
        pool.shutdown();
    }

    static void slidingLog() throws Exception {
        B_limiter b = new B_limiter();
        B_manualClock.ManualClock clock = clockAt(Instant.EPOCH);
        B_limiter.SlidingWindowLog log = b.new SlidingWindowLog(3, Duration.ofSeconds(1), clock);
        eq(true, log.allow("p"), "0 ms");
        clock.advance(Duration.ofMillis(100));
        eq(true, log.allow("p"), "100 ms");
        clock.advance(Duration.ofMillis(100));
        eq(true, log.allow("p"), "200 ms");
        clock.advance(Duration.ofMillis(100));
        eq(false, log.allow("p"), "300 ms rejected");
        clock.advance(Duration.ofMillis(699));
        eq(false, log.allow("p"), "999 ms rejected");
        clock.advance(Duration.ofMillis(1));
        eq(true, log.allow("p"), "1000 ms: the 0 ms request left the window");
        eq(true, log.allow("q"), "another key");

        Random rnd = new Random(17);
        for (int trial = 0; trial < 300; trial++) {
            int limit = 1 + rnd.nextInt(5);
            long window = 1 + rnd.nextInt(500);
            B_manualClock.ManualClock c = clockAt(Instant.EPOCH);
            B_limiter.SlidingWindowLog l = b.new SlidingWindowLog(limit, Duration.ofMillis(window), c);
            List<Long> allowed = new ArrayList<>();
            long now = 0;
            for (int r = 0; r < 80; r++) {
                long step = rnd.nextInt(3) == 0 ? 0 : rnd.nextInt((int) window);
                c.advance(Duration.ofMillis(step));
                now += step;
                final long t = now;
                long inWindow = allowed.stream().filter(x -> x > t - window && x <= t).count();
                boolean expect = inWindow < limit;
                eq(expect, l.allow("k"), "sliding log vs brute force");
                if (expect) allowed.add(now);
            }
            // property: every window of length W contains at most `limit` allowed
            for (long start : allowed) {
                long cnt = allowed.stream().filter(x -> x >= start && x < start + window).count();
                yes(cnt <= limit, "no window over the limit");
            }
        }
        // threads
        B_limiter.SlidingWindowLog frozen = b.new SlidingWindowLog(25, Duration.ofSeconds(60), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        ExecutorService pool = Executors.newFixedThreadPool(16);
        AtomicInteger ok = new AtomicInteger();
        List<Future<?>> fs = new ArrayList<>();
        for (int t = 0; t < 16; t++) fs.add(pool.submit(() -> { for (int i = 0; i < 500; i++) if (frozen.allow("partner")) ok.incrementAndGet(); }));
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        eq(25, ok.get(), "sliding log under threads: exactly the limit");
    }
}
