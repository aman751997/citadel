import java.math.*;
import java.time.*;
import java.util.*;

// Exercises every compiled design in src/lld-lessons/object-modeling.mdx: value-object equality and canonical
// form, the hashCode messes failing exactly as the lesson says, money arithmetic against BigDecimal oracles,
// time-zone facts, invariants that refuse illegal construction, the booking state machine (every status x every
// transition), the bay schedule's no-overlap invariant under random operations, many-to-many consistency, the
// scripted demo day, and the three side quests.
public class Check {
    static int checks = 0;
    static final Random RNG = new Random(20260316L);

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

    static final B_workshop W = new B_workshop();
    static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    static final Currency INR = Currency.getInstance("INR");

    static B_workshop.Money inr(String amount) { return B_workshop.Money.of(amount, "INR"); }
    static B_workshop.Money paise(long p) { return new B_workshop.Money(p, INR); }

    public static void main(String[] args) {
        yes(LocalDate.of(2026, 3, 16).getDayOfWeek() == DayOfWeek.MONDAY, "16 March 2026 is a Monday");
        jobs();
        values();
        entities();
        money();
        time();
        invariants();
        bays();
        lifecycle();
        inheritance();
        manyToMany();
        schedule();
        workshop();
        sideQuests();
        System.out.println("OK object-modeling: " + checks + " checks passed");
    }

    // Chapter 1.
    static void jobs() {
        eq(Set.of(B_workshop.Capability.LIFT), B_workshop.Job.BRAKE_CHECK.needs(), "brake check needs a lift");
        eq(Set.of(), B_workshop.Job.OIL_CHANGE.needs(), "oil change needs nothing special");
        eq(Duration.ofMinutes(30), B_workshop.Job.OIL_CHANGE.duration(), "oil change 30 min");
        eq(Duration.ofMinutes(30), B_workshop.Job.TYRE_ROTATION.duration(), "tyre rotation 30 min");
        eq(Duration.ofMinutes(60), B_workshop.Job.BRAKE_CHECK.duration(), "brake check 60 min");
        throwsOn(UnsupportedOperationException.class, () -> B_workshop.Job.OIL_CHANGE.needs().add(B_workshop.Capability.LIFT), "needs are immutable");
    }

    // Chapter 2: plate mess, ids, Plate, TimeSlot.
    static void values() {
        B_plateMess pm = new B_plateMess();
        int misses = 0, tried = 0;
        for (int i = 0; i < 50; i++) {
            B_plateMess.Plate a = pm.new Plate("KA01ZZ0001"), b = pm.new Plate("KA01ZZ0001");
            yes(a.equals(b), "mess plates are equal");
            if (System.identityHashCode(a) == System.identityHashCode(b)) continue;   // astronomically rare
            tried++;
            Map<B_plateMess.Plate, String> map = new HashMap<>();
            map.put(a, "Priya");
            if (map.get(b) == null) misses++;
            Set<B_plateMess.Plate> set = new HashSet<>(List.of(a, b));
            eq(2, set.size(), "HashSet holds both 'equal' plates");
        }
        eq(tried, misses, "every lookup with an equal plate missed");
        yes(tried > 0, "ran plate lookups");

        throwsOn(IllegalArgumentException.class, () -> new B_workshop.BayId(" "), "blank bay id");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.BookingId(null), "null booking id");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.CustomerId(""), "blank customer id");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.MechanicId(""), "blank mechanic id");
        eq(new B_workshop.BayId("B1"), new B_workshop.BayId("B1"), "ids are values");

        B_workshop.Plate p1 = new B_workshop.Plate("ka-01 zz 0001"), p2 = new B_workshop.Plate("KA01ZZ0001");
        eq(p1, p2, "plate canonical form");
        eq(p1.hashCode(), p2.hashCode(), "equal plates hash equally");
        eq("KA01ZZ0001", p1.value(), "plate stored canonical");
        eq(new B_workshop.Plate("KA01ZZ0002"), new B_workshop.Plate("ka-01-zz-0002"), "lower-case dashed plate");
        Map<B_workshop.Plate, String> owners = new HashMap<>();
        owners.put(p1, "Priya");
        eq("Priya", owners.get(new B_workshop.Plate("KA 01 ZZ 0001")), "record plate as map key");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.Plate(null), "null plate");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.Plate("K!"), "bad plate");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.Plate("ABC"), "too short plate");

        Instant t0 = Instant.parse("2026-03-17T04:30:00Z");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.TimeSlot(t0, t0), "empty slot");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.TimeSlot(t0, t0.minusSeconds(1)), "backwards slot");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.TimeSlot(null, t0), "null start");
        throwsOn(IllegalArgumentException.class, () -> B_workshop.TimeSlot.of(t0, Duration.ZERO), "zero length");
        B_workshop.TimeSlot a = B_workshop.TimeSlot.of(t0, Duration.ofMinutes(60));
        B_workshop.TimeSlot b = B_workshop.TimeSlot.of(t0.plus(Duration.ofMinutes(60)), Duration.ofMinutes(30));
        yes(!a.overlaps(b) && !b.overlaps(a), "10:00-11:00 and 11:00-11:30 don't overlap");
        eq(Duration.ofMinutes(60), a.length(), "slot length");
        eq(a, B_workshop.TimeSlot.of(t0, Duration.ofHours(1)), "slot equality by value");
        int pairs = 0;
        for (int s1 = 0; s1 < 20; s1++) for (int e1 = s1 + 1; e1 <= 20; e1++)
            for (int s2 = 0; s2 < 20; s2++) for (int e2 = s2 + 1; e2 <= 20; e2++) {
                boolean oracle = false;
                for (int m = 0; m < 20; m++) if (s1 <= m && m < e1 && s2 <= m && m < e2) oracle = true;
                B_workshop.TimeSlot x = new B_workshop.TimeSlot(t0.plusSeconds(60L * s1), t0.plusSeconds(60L * e1));
                B_workshop.TimeSlot y = new B_workshop.TimeSlot(t0.plusSeconds(60L * s2), t0.plusSeconds(60L * e2));
                checks++;
                if (x.overlaps(y) != oracle) throw new AssertionError("overlap oracle " + s1 + "," + e1 + " / " + s2 + "," + e2);
                pairs++;
            }
        yes(pairs > 40000, "over 40,000 slot pairs (" + pairs + ")");
    }

    // Chapter 3.
    static void entities() {
        B_dataMess dm = new B_dataMess();
        eq(false, dm.stillFindable(), "mutated ticket not found");
        Set<B_dataMess.ServiceTicket> open = new HashSet<>();
        B_dataMess.ServiceTicket t = dm.new ServiceTicket("BK-1", "HELD");
        open.add(t);
        t.status = "CONFIRMED";
        eq(false, open.contains(t), "contains false");
        eq(false, open.remove(t), "remove false");
        eq(1, open.size(), "size still 1");

        B_workshop.Mechanic r1 = W.new Mechanic(new B_workshop.MechanicId("M-7"), "Ravi");
        B_workshop.Mechanic r2 = W.new Mechanic(new B_workshop.MechanicId("M-7"), "  Ravi K. ");
        eq(r1, r2, "equal by id despite names");
        eq(r1.hashCode(), r2.hashCode(), "same hash");
        eq("Ravi K.", r2.name(), "name stripped");
        Set<B_workshop.Mechanic> crew = new HashSet<>(List.of(r1));
        r1.rename("Ravindra");
        r1.certify(B_workshop.Job.BRAKE_CHECK);
        yes(crew.contains(r1), "renamed mechanic still found");
        yes(r1.canDo(B_workshop.Job.BRAKE_CHECK) && !r1.canDo(B_workshop.Job.OIL_CHANGE), "skills");
        yes(!r1.equals(W.new Mechanic(new B_workshop.MechanicId("M-8"), "Ravindra")), "different id, different mechanic");
        throwsOn(IllegalArgumentException.class, () -> W.new Mechanic(new B_workshop.MechanicId("M-9"), " "), "blank name");
        throwsOn(IllegalArgumentException.class, () -> W.new Mechanic(null, "X"), "null id");
        throwsOn(IllegalArgumentException.class, () -> r1.rename(null), "rename null");
        eq("Ravindra", r1.name(), "failed rename leaves name");
    }

    // Chapter 4.
    static void money() {
        B_doubleMess d = new B_doubleMess();
        eq(3.3000000000000003, d.add(1.10, 2.20), "1.10 + 2.20");
        yes(d.add(1.10, 2.20) != 3.30, "not 3.30");
        double[] dimes = new double[10];
        Arrays.fill(dimes, 0.10);
        eq(0.9999999999999999, d.sum(dimes), "ten dimes");
        eq(0.30000000000000004, 0.1 + 0.2, "0.1 + 0.2");

        B_decimalTraps bt = new B_decimalTraps();
        eq("0.1000000000000000055511151231257827021181583404541015625", bt.fromDouble(), "new BigDecimal(0.1)");
        eq("0.1", bt.fromString(), "BigDecimal(\"0.1\")");
        eq("0.1", BigDecimal.valueOf(0.1).toString(), "valueOf(0.1)");
        eq(false, bt.equalsSaysSame(), "2.0 equals 2.00 is false");
        eq(0, bt.compareSaysSame(), "compareTo 0");
        throwsOn(ArithmeticException.class, bt::oneThird, "1/3 throws");
        eq(new BigDecimal("0.33"), bt.oneThirdTo2dp(), "1/3 to 2dp");

        eq(149900L, inr("1499").minor(), "1499 rupees");
        eq("INR 1499.00", inr("1499").toString(), "toString");
        eq(149950L, inr("1499.5").minor(), "1499.5");
        eq(inr("1.0"), inr("1.00"), "1.0 equals 1.00 as Money");
        throwsOn(ArithmeticException.class, () -> inr("0.005"), "would round");
        throwsOn(IllegalArgumentException.class, () -> inr("-5"), "negative");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.Money(1, null), "null currency");
        eq(0, Currency.getInstance("JPY").getDefaultFractionDigits(), "JPY 0 digits");
        eq(3, Currency.getInstance("BHD").getDefaultFractionDigits(), "BHD 3 digits");
        eq(2, INR.getDefaultFractionDigits(), "INR 2 digits");
        eq(500L, B_workshop.Money.of("500", "JPY").minor(), "yen has no minor unit");
        eq("JPY 500", B_workshop.Money.of("500", "JPY").toString(), "yen toString");
        eq(inr("2298"), inr("1499").plus(inr("799")), "plus");
        eq(inr("700"), inr("1499").minus(inr("799")), "minus");
        eq(inr("2997"), inr("999").times(3), "times");
        throwsOn(IllegalArgumentException.class, () -> inr("1").minus(inr("2")), "minus below zero");
        throwsOn(IllegalArgumentException.class, () -> inr("1").plus(B_workshop.Money.of("1", "USD")), "currency mismatch");
        throwsOn(ArithmeticException.class, () -> paise(Long.MAX_VALUE).plus(paise(1)), "overflow");
        throwsOn(ArithmeticException.class, () -> paise(Long.MAX_VALUE).times(2), "multiply overflow");
        throwsOn(IllegalArgumentException.class, () -> inr("1").percent(-1), "negative percent");
        eq(45960L, inr("2298").percent(20).minor(), "20% of 2298.00 = 459.60");
        eq("INR 459.60", inr("2298").percent(20).toString(), "fee text");
        eq(1L, paise(5).percent(10).minor(), "0.5 paise rounds half up to 1");
        eq(0L, paise(4).percent(10).minor(), "0.4 paise rounds down");
        for (int i = 0; i < 2000; i++) {
            long minor = (long) (RNG.nextDouble() * 1_000_000_000_000L);
            long pct = RNG.nextInt(101);
            long oracle = BigDecimal.valueOf(minor).multiply(BigDecimal.valueOf(pct)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValueExact();
            eq(oracle, paise(minor).percent(pct).minor(), "percent oracle " + minor + " x " + pct);
        }

        eq(List.of(paise(33334), paise(33333), paise(33333)), B_workshop.BillSplitter.split(inr("1000"), 3), "1000 / 3");
        eq(List.of(paise(0), paise(0)), B_workshop.BillSplitter.split(paise(0), 2), "split zero");
        throwsOn(IllegalArgumentException.class, () -> B_workshop.BillSplitter.split(inr("1"), 0), "zero parts");
        for (int i = 0; i < 2000; i++) {
            long total = RNG.nextInt(10_000_000);
            int parts = 1 + RNG.nextInt(12);
            List<B_workshop.Money> shares = B_workshop.BillSplitter.split(paise(total), parts);
            eq(parts, shares.size(), "share count");
            long sum = 0, max = Long.MIN_VALUE, min = Long.MAX_VALUE, prev = Long.MAX_VALUE;
            for (B_workshop.Money m : shares) {
                sum += m.minor(); max = Math.max(max, m.minor()); min = Math.min(min, m.minor());
                yes(m.minor() <= prev, "bigger shares first"); prev = m.minor();
            }
            eq(total, sum, "shares add up");
            yes(max - min <= 1, "shares differ by at most one paisa");
        }
    }

    // Chapter 5.
    static void time() {
        eq(Instant.parse("2026-03-16T03:30:00Z"), ZonedDateTime.of(LocalDate.of(2026, 3, 16), LocalTime.of(9, 0), IST).toInstant(), "09:00 IST");
        ZoneId london = ZoneId.of("Europe/London");
        ZonedDateTime midnight = LocalDate.of(2026, 3, 29).atStartOfDay(london);
        eq(Duration.ofHours(23), Duration.between(midnight, LocalDate.of(2026, 3, 30).atStartOfDay(london)), "23-hour day");
        eq(LocalTime.of(2, 30), ZonedDateTime.of(LocalDate.of(2026, 3, 29), LocalTime.of(1, 30), london).toLocalTime(), "gap 01:30 -> 02:30");
        ZonedDateTime sat10 = ZonedDateTime.of(LocalDate.of(2026, 3, 28), LocalTime.of(10, 0), london);
        eq(LocalTime.of(10, 0), sat10.plus(Period.ofDays(1)).toLocalTime(), "Period: same wall clock");
        eq(LocalTime.of(11, 0), sat10.plus(Duration.ofDays(1)).toLocalTime(), "Duration: 24 h later");

        B_workshop.SequentialBookingIds ids = W.new SequentialBookingIds();
        eq(new B_workshop.BookingId("BK-1"), ids.next(), "BK-1");
        eq(new B_workshop.BookingId("BK-2"), ids.next(), "BK-2");
        String random = W.new RandomBookingIds().next().value();
        yes(random.startsWith("BK-") && random.length() == 3 + 36, "random id");

        B_workshop.ManualClock clock = W.new ManualClock(Instant.parse("2026-03-16T02:30:00Z"), IST);
        clock.advance(Duration.ofMinutes(20));
        eq(Instant.parse("2026-03-16T02:50:00Z"), clock.instant(), "advance");
        eq(IST, clock.getZone(), "zone");
        eq(LocalDateTime.of(2026, 3, 16, 8, 20), LocalDateTime.now(clock), "now(clock) in IST");
        eq(london, clock.withZone(london).getZone(), "withZone");

        B_workshop.OpeningHours hours = new B_workshop.OpeningHours(LocalTime.of(9, 0), LocalTime.of(18, 0), IST, Duration.ofMinutes(30));
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.OpeningHours(LocalTime.of(18, 0), LocalTime.of(9, 0), IST, Duration.ofMinutes(30)), "closes before opens");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.OpeningHours(LocalTime.of(9, 0), LocalTime.of(18, 0), IST, Duration.ZERO), "zero step");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.OpeningHours(LocalTime.of(9, 0), LocalTime.of(18, 0), null, Duration.ofMinutes(30)), "null zone");
        LocalDate day = LocalDate.of(2026, 3, 17);
        eq(Instant.parse("2026-03-17T04:30:00Z"), hours.slot(day, LocalTime.of(10, 0), Duration.ofHours(1)).start(), "slot conversion");
        for (int start = 0; start < 1440; start += 5)
            for (int len = 5; len <= 900; len += 5) {
                boolean oracle = start >= 540 && start + len <= 1080 && (start - 540) % 30 == 0 && len % 30 == 0;
                B_workshop.TimeSlot s = hours.slot(day, LocalTime.of(start / 60, start % 60), Duration.ofMinutes(len));
                checks++;
                if (hours.admits(s) != oracle) throw new AssertionError("admits oracle " + start + " +" + len);
            }
        yes(!hours.admits(hours.slot(day, LocalTime.of(9, 0, 30), Duration.ofMinutes(30))), "off-grid seconds");
        yes(hours.admits(hours.slot(day, LocalTime.of(17, 30), Duration.ofMinutes(30))), "last slot");
    }

    // Chapter 6.
    static void invariants() {
        B_walletMess wm = new B_walletMess();
        B_walletMess.Wallet anemic = wm.new Wallet();
        anemic.setBalance(500);
        wm.payForService(anemic, 800);
        eq(500L, anemic.getBalance(), "careful caller refuses");
        wm.applyLateFee(anemic, 800);
        eq(-300L, anemic.getBalance(), "anemic wallet goes negative");

        B_wallet b = new B_wallet();
        B_wallet.Wallet w = b.new Wallet();
        eq(0L, w.balance(), "starts at zero");
        w.credit(500);
        throwsOn(B_wallet.InsufficientFundsException.class, () -> w.debit(800), "debit too much");
        eq(500L, w.balance(), "refused debit leaves 500");
        throwsOn(IllegalArgumentException.class, () -> w.debit(0), "zero debit");
        throwsOn(IllegalArgumentException.class, () -> w.credit(-1), "negative credit");
        w.debit(200);
        eq(300L, w.balance(), "debit 200");
        w.debit(300);
        eq(0L, w.balance(), "exact debit to zero");

        // Three flags: 8 combinations, 5 meaningful (held, paid, cancelled unpaid, cancelled paid, checked in).
        int combos = 0, meaningful = 0;
        for (int m = 0; m < 8; m++) {
            boolean paid = (m & 1) != 0, cancelled = (m & 2) != 0, checkedIn = (m & 4) != 0;
            combos++;
            boolean legal = !(checkedIn && (cancelled || !paid));
            if (legal) meaningful++;
        }
        eq(8, combos, "eight combinations");
        eq(5, meaningful, "five meaningful");

        Map<B_workshop.Job, B_workshop.Money> src = new HashMap<>(Map.of(
                B_workshop.Job.OIL_CHANGE, inr("1499"), B_workshop.Job.TYRE_ROTATION, inr("799"), B_workshop.Job.BRAKE_CHECK, inr("999")));
        B_workshop.PriceList list = new B_workshop.PriceList(src);
        src.put(B_workshop.Job.OIL_CHANGE, inr("1"));
        eq(inr("1499"), list.priceOf(B_workshop.Job.OIL_CHANGE), "caller's map can't reach in");
        throwsOn(UnsupportedOperationException.class, () -> list.prices().put(B_workshop.Job.OIL_CHANGE, inr("1")), "prices() unmodifiable");
        B_workshop.PriceList raised = list.with(B_workshop.Job.OIL_CHANGE, inr("1699"));
        eq(inr("1699"), raised.priceOf(B_workshop.Job.OIL_CHANGE), "with: new price");
        eq(inr("1499"), list.priceOf(B_workshop.Job.OIL_CHANGE), "with: old list unchanged");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.PriceList(Map.of(B_workshop.Job.OIL_CHANGE, inr("1"))), "missing job");
        throwsOn(IllegalArgumentException.class, () -> list.with(B_workshop.Job.OIL_CHANGE, B_workshop.Money.of("20", "USD")), "mixed currency");
        throwsOn(NullPointerException.class, () -> list.with(B_workshop.Job.OIL_CHANGE, null), "null price");
    }

    // Chapter 7.
    static void bays() {
        B_bayMess bm = new B_bayMess();
        B_bayMess.Bay b2 = bm.new Bay();
        eq(false, bm.canBook(b2, "BRAKE_CHECK"), "no lift: can't book");
        eq(true, bm.canBook(b2, "OIL_CHANGE"), "oil change fine");
        bm.quickFix(b2);
        eq(true, bm.canBook(b2, "BRAKE_CHECK"), "after quickFix the bay claims a lift");

        Set<B_workshop.Capability> caps = new HashSet<>(Set.of(B_workshop.Capability.LIFT));
        B_workshop.Bay b1 = W.new Bay(new B_workshop.BayId("B1"), caps);
        caps.clear();
        yes(b1.canDo(B_workshop.Job.BRAKE_CHECK), "caller's set can't reach in");
        B_workshop.Bay plain = W.new Bay(new B_workshop.BayId("B2"), Set.of());
        yes(!plain.canDo(B_workshop.Job.BRAKE_CHECK) && plain.canDo(B_workshop.Job.OIL_CHANGE), "B2 canDo");
        throwsOn(UnsupportedOperationException.class, () -> plain.capabilities().add(B_workshop.Capability.LIFT), "capabilities read-only");
        yes(!plain.canDo(B_workshop.Job.BRAKE_CHECK), "still no lift");
        throwsOn(IllegalArgumentException.class, () -> W.new Bay(null, Set.of()), "null bay id");
    }

    // Chapter 8: the mess and the full state machine.
    static final Instant S = Instant.parse("2026-03-17T04:30:00Z");           // Tue 10:00 IST
    static final Instant H = S.minus(Duration.ofHours(26)).plus(Duration.ofMinutes(15));
    static final B_workshop.Plate CAR = new B_workshop.Plate("KA01ZZ0002");

    static B_workshop.Booking fresh(String id) {
        return W.new Booking(new B_workshop.BookingId(id), new B_workshop.CustomerId("C-1"), new B_workshop.BayId("B1"), CAR,
                B_workshop.TimeSlot.of(S, Duration.ofMinutes(60)),
                List.of(new B_workshop.BookingLine(B_workshop.Job.BRAKE_CHECK, inr("999"))), H);
    }

    static B_workshop.Booking reach(String status) {
        B_workshop.Booking b = fresh("BK-" + status);
        switch (status) {
            case "HELD" -> { }
            case "CONFIRMED" -> b.confirm(H.minusSeconds(60));
            case "CANCELLED" -> b.cancel(S.minusSeconds(3600));
            case "EXPIRED" -> b.expire(H);
            case "CHECKED_IN" -> { b.confirm(H.minusSeconds(60)); b.checkIn(CAR, S); }
            case "COMPLETED" -> { b.confirm(H.minusSeconds(60)); b.checkIn(CAR, S); b.complete(); }
            case "NO_SHOW" -> { b.confirm(H.minusSeconds(60)); b.markNoShow(S.plusSeconds(1800)); }
            default -> throw new AssertionError(status);
        }
        eq(status, b.status().name(), "reached " + status);
        return b;
    }

    static void lifecycle() {
        B_statusMess sm = new B_statusMess();
        B_statusMess.Booking mb = sm.new Booking();
        mb.setStatus(B_statusMess.Status.CANCELLED);
        throwsOn(IllegalStateException.class, () -> sm.new BookingService().confirm(mb), "service refuses");
        sm.new NightlyImporter().apply(mb, "CONFIRMED");
        eq(B_statusMess.Status.CONFIRMED, mb.getStatus(), "importer resurrects a cancelled booking");

        Map<String, Set<String>> legal = new HashMap<>();
        legal.put("HELD", Set.of("CONFIRMED", "CANCELLED", "EXPIRED"));
        legal.put("CONFIRMED", Set.of("CHECKED_IN", "CANCELLED", "NO_SHOW"));
        legal.put("CHECKED_IN", Set.of("COMPLETED"));
        for (String t : List.of("COMPLETED", "CANCELLED", "EXPIRED", "NO_SHOW")) legal.put(t, Set.of());
        eq(7, B_workshop.BookingStatus.values().length, "seven statuses");
        int edges = 0;
        for (B_workshop.BookingStatus s : B_workshop.BookingStatus.values()) {
            for (B_workshop.BookingStatus t : B_workshop.BookingStatus.values()) {
                eq(legal.get(s.name()).contains(t.name()), s.canMoveTo(t), "table " + s + "->" + t);
                if (s.canMoveTo(t)) edges++;
            }
            eq(legal.get(s.name()).isEmpty(), s.isTerminal(), "terminal " + s);
            eq(Set.of("HELD", "CONFIRMED", "CHECKED_IN").contains(s.name()), s.occupiesBay(), "occupies " + s);
        }
        eq(7, edges, "seven edges");

        Map<String, java.util.function.Consumer<B_workshop.Booking>> actions = new LinkedHashMap<>();
        actions.put("CONFIRMED", b -> b.confirm(H.minusSeconds(60)));
        actions.put("EXPIRED", b -> b.expire(H));
        actions.put("CANCELLED", b -> b.cancel(S.minusSeconds(3600)));
        actions.put("CHECKED_IN", b -> b.checkIn(CAR, S));
        actions.put("COMPLETED", b -> b.complete());
        actions.put("NO_SHOW", b -> b.markNoShow(S.plusSeconds(1800)));
        int ok = 0, refused = 0;
        for (B_workshop.BookingStatus s : B_workshop.BookingStatus.values())
            for (var a : actions.entrySet()) {
                B_workshop.Booking b = reach(s.name());
                if (legal.get(s.name()).contains(a.getKey())) {
                    a.getValue().accept(b);
                    eq(a.getKey(), b.status().name(), s + " --" + a.getKey());
                    ok++;
                } else {
                    throwsOn(IllegalStateException.class, () -> a.getValue().accept(b), s + " refuses " + a.getKey());
                    eq(s, b.status(), "refused move changes nothing");
                    refused++;
                }
            }
        eq(7, ok, "seven legal moves");
        eq(35, refused, "35 refused");

        // Timing guards from the legal source states.
        B_workshop.Booking h = reach("HELD");
        throwsOn(IllegalStateException.class, () -> h.confirm(H), "confirm at heldUntil");
        throwsOn(IllegalStateException.class, () -> h.expire(H.minusSeconds(1)), "expire too early");
        throwsOn(IllegalStateException.class, () -> h.cancel(S), "cancel at slot start");
        eq(B_workshop.BookingStatus.HELD, h.status(), "still held");
        B_workshop.Booking c = reach("CONFIRMED");
        throwsOn(IllegalArgumentException.class, () -> c.checkIn(new B_workshop.Plate("KA01ZZ0001"), S), "wrong plate");
        throwsOn(IllegalStateException.class, () -> c.checkIn(CAR, S.plus(Duration.ofMinutes(60))), "check-in after slot end");
        throwsOn(IllegalStateException.class, () -> c.markNoShow(S.minusSeconds(1)), "no-show before start");
        throwsOn(IllegalStateException.class, () -> c.cancel(S.plusSeconds(1)), "cancel after start");
        eq(B_workshop.BookingStatus.CONFIRMED, c.status(), "still confirmed");
        c.checkIn(new B_workshop.Plate("ka-01-zz-0002"), S.minusSeconds(300));
        eq(B_workshop.BookingStatus.CHECKED_IN, c.status(), "sloppy plate checks in");

        // Construction invariants.
        B_workshop.TimeSlot half = B_workshop.TimeSlot.of(S, Duration.ofMinutes(30));
        throwsOn(IllegalArgumentException.class, () -> W.new Booking(new B_workshop.BookingId("X"), new B_workshop.CustomerId("C"), new B_workshop.BayId("B1"), CAR, half,
                List.of(new B_workshop.BookingLine(B_workshop.Job.BRAKE_CHECK, inr("999"))), H), "brake check needs 60 min");
        throwsOn(IllegalArgumentException.class, () -> W.new Booking(new B_workshop.BookingId("X"), new B_workshop.CustomerId("C"), new B_workshop.BayId("B1"), CAR, half,
                List.of(), H), "no jobs");
        throwsOn(IllegalArgumentException.class, () -> W.new Booking(new B_workshop.BookingId("X"), new B_workshop.CustomerId("C"), new B_workshop.BayId("B1"), CAR,
                B_workshop.TimeSlot.of(S, Duration.ofMinutes(60)),
                List.of(new B_workshop.BookingLine(B_workshop.Job.OIL_CHANGE, inr("1")), new B_workshop.BookingLine(B_workshop.Job.OIL_CHANGE, B_workshop.Money.of("1", "USD"))), H), "mixed currencies");
        throwsOn(IllegalArgumentException.class, () -> W.new Booking(null, new B_workshop.CustomerId("C"), new B_workshop.BayId("B1"), CAR, half,
                List.of(new B_workshop.BookingLine(B_workshop.Job.OIL_CHANGE, inr("1"))), H), "null id");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.BookingLine(null, inr("1")), "line needs job");
        B_workshop.Booking two = W.new Booking(new B_workshop.BookingId("BK-9"), new B_workshop.CustomerId("C-1"), new B_workshop.BayId("B1"), CAR,
                B_workshop.TimeSlot.of(S, Duration.ofMinutes(60)),
                new ArrayList<>(List.of(new B_workshop.BookingLine(B_workshop.Job.OIL_CHANGE, inr("1499")), new B_workshop.BookingLine(B_workshop.Job.TYRE_ROTATION, inr("799")))), H);
        eq(inr("2298"), two.total(), "total 2298");
        throwsOn(UnsupportedOperationException.class, () -> two.lines().clear(), "lines unmodifiable");
        eq(fresh("BK-9"), two, "booking equality by id");
        eq(fresh("BK-9").hashCode(), two.hashCode(), "booking hash by id");
    }

    // Chapter 10.
    static void inheritance() {
        B_bayTreeMess m = new B_bayTreeMess();
        eq("EV bay B3 (0 kW)", m.new EvBay("B3", 22).label(), "constructor calls override too early");
        eq("Bay B1", m.new Bay("B1").label(), "plain bay");
        B_bayTreeFixed f = new B_bayTreeFixed();
        eq("EV bay B3 (22 kW)", f.new EvBay("B3", 22).label(), "fixed label");
        eq("Bay B1", f.new Bay("B1").label(), "fixed plain");

        eq(inr("899.10"), B_workshop.Tier.GOLD.price(inr("999")), "gold brake check");
        eq(inr("1349.10"), B_workshop.Tier.GOLD.price(inr("1499")), "gold oil change");
        eq(inr("719.10"), B_workshop.Tier.GOLD.price(inr("799")), "gold tyre rotation");
        eq(inr("999"), B_workshop.Tier.STANDARD.price(inr("999")), "standard price");
        B_workshop.Customer kofi = W.new Customer(new B_workshop.CustomerId("C-2"), "Kofi");
        B_workshop.Customer same = kofi;
        eq(B_workshop.Tier.STANDARD, kofi.tier(), "starts standard");
        kofi.upgradeTo(B_workshop.Tier.GOLD);
        yes(same == kofi && kofi.tier() == B_workshop.Tier.GOLD, "same object, now gold");
        throwsOn(IllegalStateException.class, () -> kofi.upgradeTo(B_workshop.Tier.GOLD), "no sideways");
        throwsOn(IllegalStateException.class, () -> kofi.upgradeTo(B_workshop.Tier.STANDARD), "no downgrade");
        eq(kofi, W.new Customer(new B_workshop.CustomerId("C-2"), "K."), "customer equality by id");
        throwsOn(IllegalArgumentException.class, () -> W.new Customer(new B_workshop.CustomerId("C-3"), ""), "blank name");
    }

    // Chapter 11.
    static void manyToMany() {
        B_crewMess cm = new B_crewMess();
        B_crewMess.Mechanic ravi = cm.new Mechanic("Ravi");
        B_crewMess.WorkOrder order = cm.new WorkOrder("WO-1");
        order.assign(ravi);
        eq(1, order.crew.size(), "order lists Ravi");
        eq(0, ravi.jobs.size(), "Ravi lists nothing");

        B_workshop.Roster roster = W.new Roster();
        B_workshop.BookingId bk = new B_workshop.BookingId("BK-1");
        B_workshop.MechanicId m7 = new B_workshop.MechanicId("M-7"), m8 = new B_workshop.MechanicId("M-8");
        roster.assign(new B_workshop.Assignment(bk, m7, B_workshop.Role.LEAD));
        throwsOn(IllegalStateException.class, () -> roster.assign(new B_workshop.Assignment(bk, m8, B_workshop.Role.LEAD)), "second lead");
        throwsOn(IllegalStateException.class, () -> roster.assign(new B_workshop.Assignment(bk, m7, B_workshop.Role.ASSIST)), "duplicate pair");
        roster.assign(new B_workshop.Assignment(bk, m8, B_workshop.Role.ASSIST));
        eq(2, roster.crewOf(bk).size(), "crew of two");
        eq(List.of(new B_workshop.Assignment(bk, m7, B_workshop.Role.LEAD)), roster.jobsOf(m7), "Ravi's jobs");
        throwsOn(IllegalStateException.class, () -> roster.unassign(bk, new B_workshop.MechanicId("M-9")), "unassign missing");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.Assignment(bk, m7, null), "assignment needs role");

        // Random operations against a plain list oracle.
        B_workshop.Roster r = W.new Roster();
        List<B_workshop.Assignment> oracle = new ArrayList<>();
        for (int step = 0; step < 3000; step++) {
            B_workshop.BookingId b = new B_workshop.BookingId("BK-" + RNG.nextInt(5));
            B_workshop.MechanicId m = new B_workshop.MechanicId("M-" + RNG.nextInt(5));
            boolean present = oracle.stream().anyMatch(a -> a.booking().equals(b) && a.mechanic().equals(m));
            if (RNG.nextBoolean()) {
                B_workshop.Role role = RNG.nextInt(3) == 0 ? B_workshop.Role.LEAD : B_workshop.Role.ASSIST;
                boolean hasLead = oracle.stream().anyMatch(a -> a.booking().equals(b) && a.role() == B_workshop.Role.LEAD);
                B_workshop.Assignment a = new B_workshop.Assignment(b, m, role);
                if (present || (role == B_workshop.Role.LEAD && hasLead)) throwsOn(IllegalStateException.class, () -> r.assign(a), "oracle refuses assign");
                else { r.assign(a); oracle.add(a); }
            } else {
                if (!present) throwsOn(IllegalStateException.class, () -> r.unassign(b, m), "oracle refuses unassign");
                else { r.unassign(b, m); oracle.removeIf(a -> a.booking().equals(b) && a.mechanic().equals(m)); }
            }
            for (int i = 0; i < 5; i++) {
                B_workshop.BookingId bi = new B_workshop.BookingId("BK-" + i);
                B_workshop.MechanicId mi = new B_workshop.MechanicId("M-" + i);
                eq(new HashSet<>(oracle.stream().filter(a -> a.booking().equals(bi)).toList()), new HashSet<>(r.crewOf(bi)), "crewOf oracle");
                eq(new HashSet<>(oracle.stream().filter(a -> a.mechanic().equals(mi)).toList()), new HashSet<>(r.jobsOf(mi)), "jobsOf oracle");
            }
        }

        B_workshop.Mechanic a = W.new Mechanic(new B_workshop.MechanicId("M-1"), "Ravi");
        B_workshop.Mechanic b = W.new Mechanic(new B_workshop.MechanicId("M-2"), "Asha");
        a.certify(B_workshop.Job.BRAKE_CHECK);
        a.certify(B_workshop.Job.OIL_CHANGE);
        b.certify(B_workshop.Job.OIL_CHANGE);
        Map<B_workshop.Job, List<B_workshop.MechanicId>> who = B_workshop.SkillDirectory.whoCanDo(List.of(a, b));
        eq(List.of(a.id()), who.get(B_workshop.Job.BRAKE_CHECK), "who can brake check");
        eq(List.of(a.id(), b.id()), who.get(B_workshop.Job.OIL_CHANGE), "who can oil change");
        eq(List.of(), who.get(B_workshop.Job.TYRE_ROTATION), "nobody rotates tyres");
        b.certify(B_workshop.Job.TYRE_ROTATION);
        eq(List.of(b.id()), B_workshop.SkillDirectory.whoCanDo(List.of(a, b)).get(B_workshop.Job.TYRE_ROTATION), "computed fresh");
    }

    // Chapter 12: the aggregate root under random operations.
    static void schedule() {
        B_workshop.BayId b1 = new B_workshop.BayId("B1");
        B_workshop.BaySchedule sched = W.new BaySchedule(W.new Bay(b1, Set.of(B_workshop.Capability.LIFT)));
        B_workshop.BaySchedule noLift = W.new BaySchedule(W.new Bay(new B_workshop.BayId("B2"), Set.of()));
        Instant base = Instant.parse("2026-03-20T00:00:00Z");
        Instant now = base.minus(Duration.ofDays(2));
        List<B_workshop.Booking> mine = new ArrayList<>();
        int accepted = 0, rejected = 0;
        for (int i = 0; i < 2000; i++) {
            int op = RNG.nextInt(10);
            now = now.plusSeconds(RNG.nextInt(600));
            if (op < 6) {
                int startMin = RNG.nextInt(48) * 30, len = 30 * (1 + RNG.nextInt(4));
                B_workshop.TimeSlot slot = B_workshop.TimeSlot.of(base.plusSeconds(60L * startMin), Duration.ofMinutes(len));
                B_workshop.Job job = RNG.nextBoolean() ? B_workshop.Job.OIL_CHANGE : (len >= 60 ? B_workshop.Job.BRAKE_CHECK : B_workshop.Job.TYRE_ROTATION);
                B_workshop.Booking cand = W.new Booking(new B_workshop.BookingId("R-" + i), new B_workshop.CustomerId("C"), b1, CAR, slot,
                        List.of(new B_workshop.BookingLine(job, inr("1"))), now.plus(Duration.ofMinutes(15)));
                final Instant at = now;
                boolean clash = false;
                for (B_workshop.Booking o : mine) {
                    String st = o.status().name();
                    boolean occ = st.equals("CONFIRMED") || st.equals("CHECKED_IN") || (st.equals("HELD") && at.isBefore(o.heldUntil()));
                    if (occ && o.slot().overlaps(slot)) clash = true;
                }
                if (clash) { throwsOn(IllegalStateException.class, () -> sched.hold(cand, at), "oracle: clash"); rejected++; }
                else { sched.hold(cand, at); mine.add(cand); accepted++; }
            } else if (op < 8 && !mine.isEmpty()) {
                B_workshop.Booking t = mine.get(RNG.nextInt(mine.size()));
                try { sched.confirm(t.id(), now); } catch (IllegalStateException ignored) { }
            } else if (!mine.isEmpty()) {
                B_workshop.Booking t = mine.get(RNG.nextInt(mine.size()));
                try { sched.cancel(t.id(), now); } catch (IllegalStateException ignored) { }
            }
            List<B_workshop.Booking> all = sched.bookings();
            for (int x = 0; x < all.size(); x++)
                for (int y = x + 1; y < all.size(); y++) {
                    B_workshop.Booking p = all.get(x), q = all.get(y);
                    boolean bothOcc = p.status().occupiesBay() && q.status().occupiesBay()
                            && (p.status() != B_workshop.BookingStatus.HELD || now.isBefore(p.heldUntil()))
                            && (q.status() != B_workshop.BookingStatus.HELD || now.isBefore(q.heldUntil()));
                    if (bothOcc && p.slot().overlaps(q.slot())) throw new AssertionError("overlap invariant broken");
                }
            checks++;
        }
        yes(accepted > 50 && rejected > 50, "random schedule exercised both paths (" + accepted + "/" + rejected + ")");
        int beforeSweep = (int) sched.bookings().stream().filter(x -> x.status() == B_workshop.BookingStatus.HELD).count();
        int swept = sched.expireHolds(now.plus(Duration.ofDays(1)));
        eq(beforeSweep, swept, "sweep expires every stale hold");
        yes(sched.bookings().stream().noneMatch(x -> x.status() == B_workshop.BookingStatus.HELD), "no holds left");

        B_workshop.Booking brake = fresh("BK-B");
        throwsOn(IllegalArgumentException.class, () -> noLift.hold(brake, H.minusSeconds(60)), "wrong bay");
        B_workshop.Booking onB2 = W.new Booking(new B_workshop.BookingId("BK-C"), new B_workshop.CustomerId("C"), new B_workshop.BayId("B2"), CAR,
                B_workshop.TimeSlot.of(S, Duration.ofMinutes(60)), List.of(new B_workshop.BookingLine(B_workshop.Job.BRAKE_CHECK, inr("1"))), H);
        throwsOn(IllegalArgumentException.class, () -> noLift.hold(onB2, H.minusSeconds(60)), "B2 cannot do brake check");
        B_workshop.BaySchedule s2 = W.new BaySchedule(W.new Bay(b1, Set.of(B_workshop.Capability.LIFT)));
        s2.hold(fresh("BK-D"), H.minusSeconds(60));
        throwsOn(IllegalStateException.class, () -> s2.hold(fresh("BK-D"), H.minusSeconds(60)), "duplicate id");
        B_workshop.Booking conf = fresh("BK-E");
        conf.confirm(H.minusSeconds(120));
        throwsOn(IllegalArgumentException.class, () -> s2.hold(conf, H.minusSeconds(60)), "only fresh holds");
        throwsOn(IllegalArgumentException.class, () -> s2.confirm(new B_workshop.BookingId("nope"), H), "unknown booking");
        eq(Optional.empty(), s2.find(new B_workshop.BookingId("nope")), "find missing");
        throwsOn(UnsupportedOperationException.class, () -> s2.bookings().clear(), "bookings() is a copy");
    }

    // Chapter 13.
    static void workshop() {
        eq(List.of(
                "BK-1 HELD INR 2298.00",
                "refused: B1 is taken: overlaps BK-1",
                "BK-3 HELD INR 899.10",
                "BK-1 CONFIRMED",
                "refused: hold on BK-3 expired at 2026-03-16T02:45:00Z",
                "BK-4 CONFIRMED, BK-3 EXPIRED",
                "BK-1 CANCELLED, fee INR 459.60",
                "BK-4 COMPLETED"), W.demoDay(), "demo day log");

        B_workshop.CancellationPolicy policy = new B_workshop.CancellationPolicy(Duration.ofHours(24), 20);
        B_workshop.Booking held = fresh("BK-P");
        eq(paise(0), policy.feeFor(held, S.minusSeconds(60)), "held: nothing owed");
        B_workshop.Booking confirmed = reach("CONFIRMED");
        eq(paise(0), policy.feeFor(confirmed, S.minus(Duration.ofHours(24))), "exactly 24 h before is free");
        eq(inr("199.80"), policy.feeFor(confirmed, S.minus(Duration.ofHours(24)).plusSeconds(1)), "one second later: 20% of 999");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.CancellationPolicy(Duration.ofHours(1), 101), "percent > 100");
        throwsOn(IllegalArgumentException.class, () -> new B_workshop.CancellationPolicy(Duration.ofHours(-1), 10), "negative window");

        LocalDate monday = LocalDate.of(2026, 3, 16), tuesday = monday.plusDays(1);
        B_workshop.ManualClock clock = W.new ManualClock(W.at(monday, 8, 0), IST);
        B_workshop.Workshop shop = W.copperline(clock);
        B_workshop.Customer priya = W.new Customer(new B_workshop.CustomerId("C-1"), "Priya");
        B_workshop.Plate car = new B_workshop.Plate("KA01ZZ0001");
        B_workshop.BayId b1 = new B_workshop.BayId("B1");
        throwsOn(IllegalArgumentException.class, () -> shop.book(priya, car, b1, tuesday, LocalTime.of(8, 30), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE)), "before opening");
        throwsOn(IllegalArgumentException.class, () -> shop.book(priya, car, b1, tuesday, LocalTime.of(10, 15), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE)), "off the grid");
        throwsOn(IllegalArgumentException.class, () -> shop.book(priya, car, b1, monday.minusDays(1), LocalTime.of(10, 0), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE)), "past slot");
        throwsOn(IllegalArgumentException.class, () -> shop.book(priya, car, new B_workshop.BayId("B9"), tuesday, LocalTime.of(10, 0), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE)), "unknown bay");
        throwsOn(IllegalArgumentException.class, () -> shop.book(priya, car, new B_workshop.BayId("B2"), tuesday, LocalTime.of(10, 0), Duration.ofMinutes(60), List.of(B_workshop.Job.BRAKE_CHECK)), "B2 has no lift");
        B_workshop.Booking ok = shop.book(priya, car, b1, tuesday, LocalTime.of(17, 30), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE));
        eq(inr("1499"), ok.total(), "standard price");
        throwsOn(IllegalArgumentException.class, () -> shop.find(new B_workshop.BookingId("BK-404")), "find unknown");
        clock.set(W.at(tuesday, 18, 0));
        throwsOn(IllegalStateException.class, () -> shop.pay(ok.id()), "paying long after the hold ran out");
    }

    static void sideQuests() {
        eq(List.of("INR 1499.00", "INR 1699.00"), W.mondayPriceRise(), "price rise keeps agreed prices");

        LocalDate monday = LocalDate.of(2026, 3, 16), tuesday = monday.plusDays(1);
        B_workshop.ManualClock clock = W.new ManualClock(W.at(monday, 8, 0), IST);
        B_workshop.Workshop shop = W.copperline(clock);
        B_workshop.Customer fleet = W.new Customer(new B_workshop.CustomerId("C-9"), "Fleet");
        B_workshop.PairedHold pair = W.new PairedHold(shop);
        B_workshop.Plate c1 = new B_workshop.Plate("KA01ZZ0011"), c2 = new B_workshop.Plate("KA01ZZ0012");
        List<B_workshop.Job> brake = List.of(B_workshop.Job.BRAKE_CHECK);
        List<B_workshop.Booking> both = pair.holdBoth(fleet, c1, new B_workshop.BayId("B1"), c2, new B_workshop.BayId("B3"), tuesday, LocalTime.of(14, 0), Duration.ofMinutes(60), brake);
        eq(2, both.size(), "both held");
        yes(both.stream().allMatch(b -> b.status() == B_workshop.BookingStatus.HELD), "both HELD");
        try {
            pair.holdBoth(fleet, c1, new B_workshop.BayId("B1"), c2, new B_workshop.BayId("B2"), tuesday, LocalTime.of(10, 0), Duration.ofMinutes(60), brake);
            throw new AssertionError("pair with B2 should fail");
        } catch (IllegalArgumentException e) {
            eq("B2 cannot do BRAKE_CHECK", e.getMessage(), "original error reaches caller");
            checks++;
        }
        B_workshop.Booking compensated = shop.find(new B_workshop.BookingId("BK-3"));
        eq(B_workshop.BookingStatus.CANCELLED, compensated.status(), "first hold compensated");
        eq(new B_workshop.BayId("B1"), compensated.bay(), "compensated booking was B1");
        B_workshop.Booking again = shop.book(fleet, c1, new B_workshop.BayId("B1"), tuesday, LocalTime.of(10, 0), Duration.ofMinutes(60), brake);
        eq(B_workshop.BookingStatus.HELD, again.status(), "B1 slot free again");
        eq(paise(0), shop.cancel(again.id()), "cancelling a hold is free");

        // Loyalty: five completed bookings, each reported twice.
        B_workshop.ManualClock lc = W.new ManualClock(W.at(monday, 8, 0), IST);
        B_workshop.Workshop ls = W.copperline(lc);
        B_workshop.Customer asha = W.new Customer(new B_workshop.CustomerId("C-5"), "Asha");
        B_workshop.Customer other = W.new Customer(new B_workshop.CustomerId("C-6"), "Other");
        B_workshop.LoyaltyDesk desk = W.new LoyaltyDesk(5);
        throwsOn(IllegalArgumentException.class, () -> W.new LoyaltyDesk(0), "threshold positive");
        B_workshop.Plate car = new B_workshop.Plate("KA01ZZ0050");
        List<B_workshop.Booking> made = new ArrayList<>();
        for (int i = 0; i < 6; i++)
            made.add(ls.book(asha, car, new B_workshop.BayId("B2"), tuesday, LocalTime.of(9 + i, 0), Duration.ofMinutes(30), List.of(B_workshop.Job.OIL_CHANGE)));
        for (B_workshop.Booking b : made) ls.pay(b.id());
        throwsOn(IllegalArgumentException.class, () -> desk.onCompleted(made.get(0), asha), "only completed bookings count");
        for (int i = 0; i < 6; i++) {
            B_workshop.Booking b = made.get(i);
            lc.set(W.at(tuesday, 9 + i, 5));
            ls.checkIn(b.id(), car);
            ls.complete(b.id());
            throwsOn(IllegalArgumentException.class, () -> desk.onCompleted(b, other), "someone else's booking");
            desk.onCompleted(b, asha);
            desk.onCompleted(b, asha);
            eq(Math.min(i + 1, 6), desk.completedCount(asha.id()), "idempotent count");
            eq(i + 1 >= 5 ? B_workshop.Tier.GOLD : B_workshop.Tier.STANDARD, asha.tier(), "tier after " + (i + 1));
        }
    }
}
