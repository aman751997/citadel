import java.time.*;
import java.util.*;

// Exercises every compiled design in src/lld-lessons/solid.mdx: the fee ladder and the strategy map agree on
// every stay up to three days, every honest FeeStrategy passes the shared contract test while the three
// lying ones fail exactly where the lesson says, new strategies plug in without edits, the messes misbehave
// on the inputs the lesson names, and injected fakes (gateway, clock, ids, senders) make the flows testable.
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

    static final LocalDateTime FRI_0900 = LocalDateTime.of(2026, 3, 13, 9, 0);

    static B_garage.ParkingSession session(B_garage.VehicleType type, LocalDateTime entry, long minutes) {
        return new B_garage.ParkingSession(type, entry, entry.plusMinutes(minutes));
    }

    public static void main(String[] args) {
        yes(LocalDate.of(2026, 3, 13).getDayOfWeek() == DayOfWeek.FRIDAY, "13 March 2026 is a Friday");
        yes(LocalDate.of(2026, 3, 14).getDayOfWeek() == DayOfWeek.SATURDAY, "14 March 2026 is a Saturday");

        garage();
        contract();
        checkout();
        report();
        reportCsv();
        ticket();
        shapes();
        counting();
        notifications();
        repo();
        entry();

        System.out.println("OK solid: " + checks + " checks passed");
    }

    // Chapter 2: the ladder and the strategy map agree; Your turn: grace period; Side quests 1 and 4.
    static void garage() {
        B_garage g = new B_garage();
        B_feeMess mess = new B_feeMess();
        B_garage.FeeCalculator standard = g.standardTariff();
        B_feeMess.VehicleType[] messTypes = B_feeMess.VehicleType.values();
        B_garage.VehicleType[] types = B_garage.VehicleType.values();
        eq(messTypes.length, types.length, "same vehicle types");
        for (int i = 0; i < types.length; i++) {
            eq(messTypes[i].name(), types[i].name(), "type order");
            for (long m = 0; m <= 3 * 24 * 60; m++)
                eq(mess.fee(messTypes[i], m), standard.fee(session(types[i], FRI_0900, m)), "ladder vs strategy " + types[i] + " " + m + " min");
        }
        eq(60L, standard.fee(session(B_garage.VehicleType.CAR, FRI_0900, 150)), "car 2h30 = 3 started hours x 20");
        eq(20L, standard.fee(session(B_garage.VehicleType.BIKE, FRI_0900, 61)), "bike 61 min = 2 started hours x 10");
        eq(50L, standard.fee(session(B_garage.VehicleType.EV, FRI_0900, 0)), "EV 0 min = charging flat only");
        eq(0L, standard.fee(session(B_garage.VehicleType.CAR, FRI_0900, 0)), "car 0 min is free");

        throwsOn(IllegalArgumentException.class, () -> new B_garage.ParkingSession(B_garage.VehicleType.CAR, FRI_0900, FRI_0900.minusMinutes(1)), "session invariant: exit before entry");
        B_garage.FeeCalculator noEv = g.new FeeCalculator(Map.of(B_garage.VehicleType.CAR, g.new HourlyFee(20)));
        throwsOn(IllegalArgumentException.class, () -> noEv.fee(session(B_garage.VehicleType.EV, FRI_0900, 30)), "missing tariff fails loudly");
        Map<B_garage.VehicleType, B_garage.FeeStrategy> source = new HashMap<>(Map.of(B_garage.VehicleType.CAR, g.new HourlyFee(20)));
        B_garage.FeeCalculator copied = g.new FeeCalculator(source);
        source.put(B_garage.VehicleType.EV, g.new HourlyFee(1));
        throwsOn(IllegalArgumentException.class, () -> copied.fee(session(B_garage.VehicleType.EV, FRI_0900, 30)), "Map.copyOf: later edits to the source map don't leak in");

        // Your turn (OCP): bikes free within 30 minutes, then hourly from the start; cars and EVs unchanged.
        B_garage.FeeCalculator grace = g.tariffWithBikeGrace();
        eq(0L, grace.fee(session(B_garage.VehicleType.BIKE, FRI_0900, 30)), "bike 30 min free");
        eq(10L, grace.fee(session(B_garage.VehicleType.BIKE, FRI_0900, 31)), "bike 31 min = 10");
        eq(20L, grace.fee(session(B_garage.VehicleType.BIKE, FRI_0900, 61)), "bike 61 min = 20");
        for (long m = 0; m <= 600; m++) {
            eq(standard.fee(session(B_garage.VehicleType.CAR, FRI_0900, m)), grace.fee(session(B_garage.VehicleType.CAR, FRI_0900, m)), "grace leaves cars alone");
            eq(standard.fee(session(B_garage.VehicleType.EV, FRI_0900, m)), grace.fee(session(B_garage.VehicleType.EV, FRI_0900, m)), "grace leaves EVs alone");
            long expectBike = m <= 30 ? 0 : ((m + 59) / 60) * 10;
            eq(expectBike, grace.fee(session(B_garage.VehicleType.BIKE, FRI_0900, m)), "bike grace oracle " + m);
        }

        // Side quest 1: weekend surge, by entry day.
        B_garage.FeeCalculator weekend = g.weekendTariff();
        LocalDateTime sat1530 = LocalDateTime.of(2026, 3, 14, 15, 30), fri1530 = LocalDateTime.of(2026, 3, 13, 15, 30);
        eq(90L, weekend.fee(session(B_garage.VehicleType.CAR, sat1530, 150)), "Saturday car 15:30-18:00 = 90");
        eq(60L, weekend.fee(session(B_garage.VehicleType.CAR, fri1530, 150)), "Friday car 15:30-18:00 = 60");
        eq(105L, weekend.fee(session(B_garage.VehicleType.EV, sat1530, 60)), "Saturday EV 1 hour = 105");
        eq(37L, g.new WeekendSurge((B_garage.FeeStrategy) s -> 25, 150).fee(session(B_garage.VehicleType.CAR, sat1530, 10)), "surge rounds down: 25 x 1.5 = 37");
        throwsOn(IllegalArgumentException.class, () -> g.new WeekendSurge(g.new HourlyFee(20), -1), "negative surge rejected");
        for (B_garage.VehicleType t : types)
            for (int day = 0; day < 7; day++) {
                LocalDateTime entry = LocalDateTime.of(2026, 3, 9 + day, 10, 0);   // Monday 9 March .. Sunday 15 March
                boolean isWeekend = entry.getDayOfWeek() == DayOfWeek.SATURDAY || entry.getDayOfWeek() == DayOfWeek.SUNDAY;
                for (long m = 0; m <= 1500; m += 7) {
                    long base = standard.fee(session(t, entry, m));
                    eq(isWeekend ? base * 150 / 100 : base, weekend.fee(session(t, entry, m)), "surge oracle " + t + " " + entry + " " + m);
                }
            }

        // Side quest 4: overstay penalty on EVs.
        B_garage.FeeStrategy evOverstay = g.new OverstayPenalty(g.new HourlyPlusChargingFee(20, 50), 480, 200);
        eq(210L, evOverstay.fee(session(B_garage.VehicleType.EV, FRI_0900, 480)), "EV exactly 8 h = 210");
        eq(430L, evOverstay.fee(session(B_garage.VehicleType.EV, FRI_0900, 540)), "EV 9 h = 430");
        eq(230L + 200L, evOverstay.fee(session(B_garage.VehicleType.EV, FRI_0900, 481)), "EV 8h01 = 9 started hours + penalty");
    }

    // Chapter 3: the shared contract test.
    static void contract() {
        B_garage g = new B_garage();
        Map<String, B_garage.FeeStrategy> honest = new LinkedHashMap<>();
        honest.put("HourlyFee(10)", g.new HourlyFee(10));
        honest.put("HourlyFee(20)", g.new HourlyFee(20));
        honest.put("HourlyPlusChargingFee", g.new HourlyPlusChargingFee(20, 50));
        honest.put("GraceThenHourlyFee", g.new GraceThenHourlyFee(30, 10));
        honest.put("MemberFee", g.new MemberFee());
        honest.put("DayCapFee", g.new DayCapFee());
        honest.put("WeekendSurge(Hourly)", g.new WeekendSurge(g.new HourlyFee(20), 150));
        honest.put("WeekendSurge(EV)", g.new WeekendSurge(g.new HourlyPlusChargingFee(20, 50), 150));
        honest.put("OverstayPenalty", g.new OverstayPenalty(g.new HourlyPlusChargingFee(20, 50), 480, 200));
        honest.put("Surge(Overstay(Grace))", g.new WeekendSurge(g.new OverstayPenalty(g.new GraceThenHourlyFee(30, 10), 480, 200), 150));
        for (var e : honest.entrySet())
            for (B_garage.VehicleType t : B_garage.VehicleType.values())
                eq(null, B_garage.FeeContract.firstViolation(e.getValue(), t), "contract holds for " + e.getKey() + " / " + t);

        eq("threw on a valid 485-minute stay", B_garage.FeeContract.firstViolation(g.new ChargingCapFee(), B_garage.VehicleType.EV), "ChargingCapFee strengthens the precondition");
        eq("negative fee -30 for 0 minutes", B_garage.FeeContract.firstViolation(g.new LoyaltyFee(), B_garage.VehicleType.CAR), "LoyaltyFee weakens never-negative");
        eq("fee fell from 60 to 50 at 185 minutes", B_garage.FeeContract.firstViolation(g.new AllDayDealFee(), B_garage.VehicleType.CAR), "AllDayDealFee weakens never-decreasing");
        eq(-10L, g.new LoyaltyFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 20)), "LoyaltyFee 20-minute stay = -10");
        eq(60L, g.new AllDayDealFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 180)), "AllDayDeal 3 h = 60");
        eq(50L, g.new AllDayDealFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 185)), "AllDayDeal 3h05 = 50");
        eq(210L, g.new ChargingCapFee().fee(session(B_garage.VehicleType.EV, FRI_0900, 480)), "ChargingCap ok at 8 h");
        throwsOn(IllegalArgumentException.class, () -> g.new ChargingCapFee().fee(session(B_garage.VehicleType.EV, FRI_0900, 540)), "ChargingCap throws on a valid 9-hour stay");
        eq(0L, g.new MemberFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 20)), "MemberFee floors at 0");
        eq(10L, g.new MemberFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 120)), "MemberFee 2 h = 10");
        eq(50L, g.new DayCapFee().fee(session(B_garage.VehicleType.CAR, FRI_0900, 600)), "DayCap caps at 50");

        // Independent brute-force oracle for the contract on the honest strategies: every minute, not every 5.
        for (var e : honest.entrySet()) {
            long prev = 0;
            for (long m = 0; m <= 2000; m++) {
                long fee = e.getValue().fee(session(B_garage.VehicleType.CAR, FRI_0900, m));
                yes(fee >= 0 && fee >= prev, "per-minute contract " + e.getKey() + " at " + m);
                prev = fee;
            }
        }
    }

    // Chapter 6 and Side quest 3: checkout with injected gateway and clock.
    static void checkout() {
        B_garage g = new B_garage();
        B_garage.Receipt r = g.checkoutAtSixPm();
        eq(new B_garage.Receipt("T-17", 60, "TEST-1"), r, "checkout at 18:00 for a 15:30 car");

        Clock sixPm = Clock.fixed(Instant.parse("2026-03-13T18:00:00Z"), ZoneOffset.UTC);
        B_garage.FakeGateway fake = g.new FakeGateway();
        B_garage.CheckoutService svc = g.new CheckoutService(g.standardTariff(), fake, sixPm);
        svc.checkout("T-17", B_garage.VehicleType.CAR, LocalDateTime.of(2026, 3, 13, 15, 30));
        eq(List.of("T-17:60"), fake.charges, "fake gateway recorded exactly one charge");
        B_garage.Receipt free = svc.checkout("T-18", B_garage.VehicleType.CAR, LocalDateTime.of(2026, 3, 13, 18, 0));
        eq(new B_garage.Receipt("T-18", 0, "FREE"), free, "zero-minute stay is free");
        eq(1, fake.charges.size(), "free stay never touches the gateway");
        fake.approve = false;
        throwsOn(IllegalStateException.class, () -> svc.checkout("T-19", B_garage.VehicleType.BIKE, LocalDateTime.of(2026, 3, 13, 17, 0)), "declined payment refuses checkout");
        eq(List.of("T-17:60", "T-19:10"), fake.charges, "declined charge was attempted once");

        B_garage.PennyPayClient penny = g.new PennyPayClient();
        B_garage.PaymentResult paid = g.new PennyPayAdapter(penny).charge("T-17", 60);
        eq(List.of("garage-T-17=6000"), penny.debits, "adapter converts rupees to paise");
        eq(new B_garage.PaymentResult(true, "PP-1"), paid, "adapter maps the vendor reference");
        B_garage.CheckoutService live = g.liveCheckout(g.new PennyPayClient());
        yes(live != null, "composition root builds a live checkout");

        B_garage.CoinVaultApi up = g.new CoinVaultApi(true);
        B_garage.Receipt cv = g.coinVaultCheckout(up, sixPm).checkout("T-17", B_garage.VehicleType.CAR, LocalDateTime.of(2026, 3, 13, 15, 30));
        eq(new B_garage.Receipt("T-17", 60, "CV-T-17"), cv, "CoinVault receipt");
        eq(List.of("T-17 60.00"), up.payments, "CoinVault gets a two-decimal string");
        B_garage.CoinVaultApi down = g.new CoinVaultApi(false);
        throwsOn(IllegalStateException.class, () -> g.coinVaultCheckout(down, sixPm).checkout("T-20", B_garage.VehicleType.CAR, LocalDateTime.of(2026, 3, 13, 15, 30)), "CoinVault 503 is a decline");
        eq(new B_garage.PaymentResult(false, null), g.new CoinVaultAdapter(down).charge("T-20", 60), "503 maps to declined");
    }

    // Chapter 1: the split report flow with fakes for storage and mail.
    static void report() {
        B_report b = new B_report();
        LocalDate day = LocalDate.of(2026, 3, 13);
        List<B_report.Ticket> tickets = List.of(new B_report.Ticket("T-1", 60), new B_report.Ticket("T-2", 10), new B_report.Ticket("T-3", 105));
        eq(175L, b.new RevenueTotals().total(tickets), "revenue total");
        eq(0L, b.new RevenueTotals().total(List.of()), "empty shift total");
        List<String> mail = new ArrayList<>();
        B_report.TicketLog log = d -> d.equals(day) ? tickets : List.of();
        B_report.Mailer mailer = (to, subject, body) -> mail.add(to + "|" + subject + "|" + body);
        b.new ShiftReportFlow(log, b.new RevenueTotals(), b.new ReportFormatter(), mailer).send(day, "bram@copperline.example");
        eq(List.of("bram@copperline.example|Shift report 2026-03-13|Shift report 2026-03-13\nT-1  60\nT-2  10\nT-3  105\nTickets: 3  Revenue: 175"), mail, "flow formats and mails once");
        mail.clear();
        b.new ShiftReportFlow(log, b.new RevenueTotals(), b.new ReportFormatter(), mailer).send(day.plusDays(1), "bram@copperline.example");
        eq(List.of("bram@copperline.example|Shift report 2026-03-14|Shift report 2026-03-14\nTickets: 0  Revenue: 0"), mail, "empty shift report");
    }

    // Side quest 2: the CSV format; plain text output identical to Chapter 1's formatter.
    static void reportCsv() {
        B_reportCsv b = new B_reportCsv();
        B_report a = new B_report();
        LocalDate day = LocalDate.of(2026, 3, 13);
        List<B_reportCsv.Ticket> tickets = List.of(new B_reportCsv.Ticket("T-1", 60), new B_reportCsv.Ticket("T-2", 10));
        List<B_report.Ticket> same = List.of(new B_report.Ticket("T-1", 60), new B_report.Ticket("T-2", 10));
        eq(a.new ReportFormatter().format(day, same, 70), b.new PlainTextFormat().render(day, tickets, 70), "PlainTextFormat is the old formatter, renamed");
        eq("ticket,fee\nT-1,60\nT-2,10\nTOTAL,70", b.new CsvFormat().render(day, tickets, 70), "CSV body");
        List<String> mail = new ArrayList<>();
        b.new ShiftReportFlow(d -> tickets, b.new RevenueTotals(), b.new CsvFormat(), (to, subject, body) -> mail.add(to + "|" + subject + "|" + body)).send(day, "accounts@copperline.example");
        eq(List.of("accounts@copperline.example|Shift report 2026-03-13|ticket,fee\nT-1,60\nT-2,10\nTOTAL,70"), mail, "CSV flow");
    }

    // Chapter 1, Your turn: ParkingTicket keeps its invariants; rendering and storage moved out.
    static void ticket() {
        B_ticket b = new B_ticket();
        B_ticket.ParkingTicket t = b.new ParkingTicket("T-7", FRI_0900);
        yes(t.isOpen(), "new ticket is open");
        eq("Copperline Garage\nTicket T-7\nIn  2026-03-13T09:00\nOut still parked\nFee 0", b.new ReceiptRenderer().render(t, 0), "render while parked");
        throwsOn(IllegalArgumentException.class, () -> t.close(FRI_0900.minusMinutes(1)), "close before entry");
        yes(t.isOpen(), "failed close leaves the ticket open");
        t.close(FRI_0900.plusMinutes(150));
        yes(!t.isOpen(), "closed");
        throwsOn(IllegalStateException.class, () -> t.close(FRI_0900.plusMinutes(200)), "close twice");
        eq("Copperline Garage\nTicket T-7\nIn  2026-03-13T09:00\nOut 2026-03-13T11:30\nFee 60", b.new ReceiptRenderer().render(t, 60), "render after exit");
        B_ticket.TicketRepository repo = b.new InMemoryTickets();
        eq(Optional.empty(), repo.find("T-7"), "empty repository");
        repo.save(t);
        yes(repo.find("T-7").get() == t, "repository round trip");
    }

    // Chapter 3: Rectangle/Square mess and the immutable fix.
    static void shapes() {
        B_rectMess m = new B_rectMess();
        eq(20, m.stretch(m.new Rectangle()), "stretch a Rectangle = 20");
        eq(16, m.stretch(m.new Square()), "stretch a Square = 16 (the LSP break)");
        eq(20, new B_shapes.Rect(5, 4).area(), "immutable Rect");
        eq(16, new B_shapes.Square(4).area(), "immutable Square");
        B_shapes.Shape[] all = { new B_shapes.Rect(2, 3), new B_shapes.Square(3) };
        eq(15, Arrays.stream(all).mapToInt(B_shapes.Shape::area).sum(), "shapes substitute freely");
    }

    // Chapter 4: inheritance double-counts; composition counts once.
    static void counting() {
        B_countingMess mess = new B_countingMess();
        B_countingMess.CountingTicketSet bad = mess.new CountingTicketSet();
        bad.addAll(List.of("T-1", "T-2", "T-3"));
        eq(6, bad.offered, "inherited addAll calls the overridden add: 6");
        eq(3, bad.size(), "set itself holds 3");
        B_counting.CountingTicketSet good = new B_counting().new CountingTicketSet();
        good.addAll(List.of("T-1", "T-2", "T-3"));
        eq(3, good.offered(), "composition counts 3");
        good.add("T-1");
        eq(4, good.offered(), "duplicates are still offers");
        eq(3, good.size(), "set ignores the duplicate");
    }

    // Chapter 5: role interfaces and one-lambda fakes.
    static void notifications() {
        B_notify n = new B_notify();
        eq(List.of("555-0100 <- Gate 3: barrier jammed"), n.gateAlertsTest(), "gate alerts test");
        B_notify.SignalHutClient hut = n.new SignalHutClient();
        n.new GateAlerts(hut).barrierJammed(2, "555-0101");
        hut.push("kiosk-1", "paper low");
        eq(List.of("SMS 555-0101: Gate 2: barrier jammed", "PUSH kiosk-1: paper low"), hut.outbox, "one vendor, two roles");
        List<String> captured = new ArrayList<>();
        n.new ReceiptDesk((to, subject, body) -> captured.add(to + "|" + subject + "|" + body)).sendReceipt("driver@example.com", "T-17", 60);
        eq(List.of("driver@example.com|Your Copperline receipt T-17|Ticket T-17 paid: 60"), captured, "receipt desk with a lambda fake");
    }

    // Chapter 3, Your turn: reader/writer split.
    static void repo() {
        B_repo r = new B_repo();
        B_repo.PrimaryTicketStore primary = r.new PrimaryTicketStore();
        primary.save(new B_repo.TicketRecord("T-1", 60));
        eq(Optional.of(new B_repo.TicketRecord("T-1", 60)), primary.find("T-1"), "primary round trip");
        Map<String, B_repo.TicketRecord> snapshot = new HashMap<>(Map.of("T-1", new B_repo.TicketRecord("T-1", 60)));
        B_repo.ReplicaTicketStore replica = r.new ReplicaTicketStore(snapshot);
        snapshot.put("T-2", new B_repo.TicketRecord("T-2", 10));
        eq(Optional.empty(), replica.find("T-2"), "replica snapshot is a copy");
        eq(60L, r.new RevenueAudit(replica).feeOf("T-1"), "audit over a replica");
        eq(60L, r.new RevenueAudit(primary).feeOf("T-1"), "audit over the primary");
        eq(0L, r.new RevenueAudit(primary).feeOf("nope"), "audit of a missing ticket");
        yes(!(replica instanceof Object && B_repo.TicketWriter.class.isInstance(replica)), "replica never claims to write");
    }

    // Chapter 6, Your turn: ids and time injected.
    static void entry() {
        B_entry e = new B_entry();
        Clock nine = Clock.fixed(Instant.parse("2026-03-13T09:00:00Z"), ZoneOffset.UTC);
        B_entry.EntryGate gate = e.new EntryGate(e.new SequentialTicketIds(), nine);
        eq(new B_entry.IssuedTicket("T-1", FRI_0900), gate.issue(), "first ticket");
        eq(new B_entry.IssuedTicket("T-2", FRI_0900), gate.issue(), "second ticket");
        String random = e.new RandomTicketIds().next();
        yes(random.startsWith("T-") && random.length() == 2 + 36, "random ids are T- plus a UUID");
    }
}
