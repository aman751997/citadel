import { row, step } from '../../lib/trace.ts';

// Hints for every "Your turn" HintLadder in the object-modeling lesson (labels come from ./labels.ts).
export const hints: Record<string, [string, string, string]> = {
  timeSlot: [
    'A slot is two moments. What must be true of them before the object is allowed to exist?',
    'A record TimeSlot(Instant start, Instant end) with a compact constructor, a static factory of(start, length), length(), and overlaps(other).',
    'Treat the slot as half-open, [start, end): two slots overlap exactly when each one starts before the other ends. 10:00–11:00 and 11:00–11:30 then share nothing.',
  ],
  split: [
    'Paise are whole numbers. Dividing 100000 by 3 leaves something over. Where does the leftover go so that nothing is lost?',
    'A small BillSplitter with one static method split(Money total, int parts) that returns a List<Money>.',
    'Every share gets total / parts paise; the first (total % parts) shares get one extra paisa. The shares differ by at most one paisa and add up exactly to the total.',
  ],
  admits: [
    'Opening hours are written in the garage’s wall-clock time. A slot is two Instants. Convert first, then compare.',
    'A record OpeningHours(LocalTime opens, LocalTime closes, ZoneId zone, Duration step) with slot(day, from, length) and admits(slot).',
    'Turn start and end into ZonedDateTimes in the garage’s zone. Reject a slot that crosses midnight, starts before opening or ends after closing; then require the start offset from opening and the length to be whole multiples of the step.',
  ],
  priceList: [
    'A record is only as immutable as its components. What happens if the caller keeps a reference to the map they passed in?',
    'A record PriceList(Map<Job, Money> prices) whose compact constructor copies the map, plus priceOf(job) and a with(job, price) that returns a new PriceList.',
    'Map.copyOf in the compact constructor; then refuse a list that misses a job or mixes currencies. with() copies into a HashMap, puts the new price and builds a fresh PriceList, so the old one never changes.',
  ],
  skills: [
    'Mechanic already knows its own skills. The question “who can do brake checks?” asks the same relationship from the other end.',
    'A SkillDirectory with one static method whoCanDo(Collection<Mechanic>) returning Map<Job, List<MechanicId>>.',
    'Start an EnumMap with an empty list for every Job, then for every mechanic and every job, add the mechanic’s id when canDo(job) is true. Compute it when asked, so it can never go stale.',
  ],
  prices: [
    'Which object remembers what Priya agreed to pay: the price list, or her booking?',
    'No new class at all. The workshop swaps in prices().with(OIL_CHANGE, 1699) through changePrices; bookings keep their BookingLines.',
    'Book before the change (1499.00), change the list, book after (1699.00). The first booking’s total still reads 1499.00, because its line copied the price when it was made.',
  ],
  pair: [
    'Two schedules are two aggregates. You cannot change both in one step, so what do you do if the second one refuses?',
    'A PairedHold that holds a Workshop and has one method holdBoth(...). It calls book twice.',
    'Book the first bay. Try the second inside a try block; if it throws, cancel the first (a compensating action: a held booking cancels free) and rethrow the original error.',
  ],
  loyalty: [
    'The booking completes in one aggregate; the upgrade happens in another. Which one reacts, and what if it is told twice?',
    'A LoyaltyDesk with a threshold and a Map<CustomerId, Set<BookingId>> of completed bookings, and one method onCompleted(booking, customer).',
    'Refuse anything that is not COMPLETED or belongs to someone else. Add the booking id to the customer’s set; only a new id counts. When the set reaches the threshold and the customer is still STANDARD, upgrade to GOLD.',
  ],
};

// Chapter 1 · Nouns on a napkin.
export const nouns = [
  step('The brief says “driver” in one sentence and “customer” in another. How many classes do they become?', [
    row('Brief', ['Drivers book a bay…', 'Gold-card customers get 10%…']),
  ], 1, [
    ['Two: Driver and Customer', 'Two classes for one person means two places to update a phone number and two answers to “who booked this?”. These are synonyms.'],
    ['One: pick the business’s word for the person who books and pays, and use it everywhere', 'Right. Synonyms merge. The code says Customer; the brief’s “driver” is the same thing seen from the gate.'],
    ['Driver extends Customer', 'Inheritance is for a subtype that behaves differently. Nothing here behaves differently; it is the same person under two names.'],
    ['None: people are outside the system', 'The person is outside, but the system must remember who booked, to price gold cards and to find their bookings. That record is in scope.'],
  ]),
  step('“Oil change ₹1,499, tyre rotation ₹799, brake check ₹999.” Is “price” a class?', [], 1, [
    ['Yes: a Price entity with its own id', 'Nobody asks “which ₹1,499 is this?”. A price has no identity to track. It is a value.'],
    ['It is a Money value. A price list maps each job to one, and each booking copies the price it agreed', 'Right. Price is an attribute of a job in a price list, carried as a Money value object, and snapshotted onto the booking.'],
    ['A double field on Job', 'Never a double for money (Chapter 4). And a price on the job itself can’t change without rewriting every past booking’s total.'],
    ['Not modelled: the cashier handles it', 'The system computes cancellation fees from it. It must be modelled.'],
  ]),
  step('Which object should own the operation that must refuse a second booking for the same bay and time?', [], 1, [
    ['Customer.book(bay, slot)', 'A customer knows nothing about other people’s bookings, so it cannot check for a clash. The verb’s subject in the sentence is not the method’s owner.'],
    ['The schedule of that bay: the only object that can see every booking for it', 'Right. Behaviour goes where the data it needs lives. The overlap rule needs all of one bay’s bookings, so the bay’s schedule owns it.'],
    ['Booking: a booking books itself', 'One booking can’t see its siblings either. It can check its own rules (its slot fits its jobs), not this one.'],
    ['A static BookingUtils class', 'Static helpers take the rule away from the data and let any other code path skip them. This is how anemic models start.'],
  ]),
  step('Which concept that the design needs does the brief never name as a noun?', [], 2, [
    ['Bay', 'The brief names bays in its first sentence.'],
    ['Price', 'The brief lists prices job by job.'],
    ['The schedule of one bay: the object that holds its bookings and enforces no-overlap', 'Right. “Two bookings can never share a bay at the same time” implies an owner that can see them all. The best classes are often the ones the brief only implies.'],
    ['Driver', 'The brief names drivers in its first sentence.'],
  ]),
];

// Chapter 2 · The plate that wasn't found.
export const values = [
  step('Plate overrides equals but not hashCode. You put new Plate("KA01ZZ0001") → "Priya" into a HashMap, then call get with another new Plate("KA01ZZ0001"). What comes back?', [
    row('Key', ['new Plate(…)', 'new Plate(…)'], { 0: 'put', 1: 'get' }),
  ], 1, [
    ['"Priya", because the plates are equal', 'HashMap never gets as far as equals. It looks in the bucket for the new key’s hash first, and the two objects have different identity hashes.'],
    ['null, almost always', 'Right. Without hashCode, each object keeps Object’s identity-based hash, so equal plates land under different hashes and the lookup misses. Equal objects must have equal hash codes.'],
    ['It throws ClassCastException', 'Nothing is cast. The lookup quietly fails, which is why this bug survives code review.'],
    ['"Priya", as long as the map is small', 'Map size doesn’t matter. HashMap compares the stored hash before it calls equals, and the hashes differ.'],
  ]),
  step('Two half-open slots on one bay: 10:00–11:00 and 11:00–11:30. Do they overlap?', [
    row('Slot A', ['10:00', '11:00'], { 0: 'start', 1: 'end' }),
    row('Slot B', ['11:00', '11:30'], { 0: 'start', 1: 'end' }),
  ], 1, [
    ['Yes: they share 11:00', 'With half-open slots [start, end), 11:00 belongs to B only. A finishes the instant B starts, which is exactly how back-to-back bookings should behave.'],
    ['No: A ends exactly when B starts, and each must start before the other ends', 'Right. a.start < b.end is true (10:00 < 11:30) but b.start < a.end is false (11:00 < 11:00), so there is no overlap.'],
    ['Only if both are confirmed', 'Whether two slots overlap is a fact about time. Whether a booking blocks the bay is a separate question about status.'],
  ]),
  step('PriceList is a record with a Map component. A caller builds one from their HashMap, then puts a new price into that HashMap. Without Map.copyOf in the compact constructor, what happens to the PriceList?', [], 2, [
    ['Nothing: records are immutable', 'A record’s fields are final, but final only stops the field pointing at a different map. It doesn’t stop the map itself from changing.'],
    ['It throws ConcurrentModificationException', 'There is no iteration in progress, so nothing throws. The change just leaks in.'],
    ['It changes too: records are only shallowly immutable', 'Right. The record and the caller share one map. Copy mutable components in the compact constructor (Map.copyOf, List.copyOf), and the record really is a value.'],
  ]),
  step('Which of these is a value object in the workshop?', [], 0, [
    ['Plate: two plates with the same characters are the same plate', 'Right. Equality by value, no history, no lifecycle, and its constructor normalises “ka-01-zz-0001” into one canonical spelling.'],
    ['Booking', 'A booking is confirmed, checked in and completed while staying the same booking. That is identity: an entity.'],
    ['Mechanic', 'Ravi is still Ravi after he changes his name or learns a new skill. That is identity: an entity.'],
    ['Customer', 'A customer upgrades to gold and stays the same customer. That is identity: an entity.'],
  ]),
];

// Chapter 3 · The booking that vanished.
export const entities = [
  step('ServiceTicket’s equals and hashCode use id AND status. You add a HELD ticket to a HashSet, then set its status to CONFIRMED. Does set.contains(ticket) find it?', [
    row('Ticket', ['BK-1', 'HELD → CONFIRMED']),
  ], 1, [
    ['Yes: it is the same object', 'HashSet doesn’t look for the same object. It recomputes hashCode, which now includes CONFIRMED, and looks for that hash. The entry was filed under HELD’s.'],
    ['No: the hash changed after it was filed, so the set looks under the wrong hash and misses', 'Right. The checker confirms it: contains is false, remove is false, and size is still 1. The ticket is in the set and unreachable.'],
    ['It throws IllegalStateException', 'Collections don’t detect this. They silently give wrong answers.'],
  ]),
  step('Two Mechanic objects: id M-7 named “Ravi”, and id M-7 named “Ravi K.” loaded later from another screen. Are they equal?', [], 0, [
    ['Yes: an entity is equal by identity, and both are M-7', 'Right. The name is state; it can change. M-7 is the identity that survives the change.'],
    ['No: the names differ', 'Then renaming Ravi would turn him into somebody else. Entities aren’t equal by their current state.'],
    ['Only if they are the same object in memory', 'That is the other honest choice (reference equality, one object per id). Once two copies of M-7 can exist, equality must be by id.'],
  ]),
  step('Your Booking entity’s equals compares only the id. What must hashCode use?', [], 2, [
    ['Every field, to spread the hashes well', 'Then two equal bookings (same id, different status) get different hashes, which breaks the contract. And the hash changes as the status changes.'],
    ['The status, because it is what changes', 'A hash that changes while the object sits in a HashSet makes it unreachable. That is the bug you just saw.'],
    ['The id, and nothing that can change', 'Right. Equal objects must have equal hashes, and an entity’s hash must stay put for its whole life. The id does both.'],
  ]),
];

// Chapter 4 · Ten paise short.
export const money = [
  step('With doubles: is 1.10 + 2.20 == 3.30?', [
    row('double', ['1.10', '2.20', '3.30']),
  ], 1, [
    ['Yes: two decimal places is well within a double’s precision', 'Precision isn’t the issue. 1.10 has no exact binary representation, so the stored values are already off before you add them.'],
    ['No: the sum is 3.3000000000000003', 'Right. Each literal is the nearest binary fraction, and the errors don’t cancel. In paise, 110 + 220 == 330 exactly.'],
    ['It depends on the CPU', 'Java’s double arithmetic is IEEE 754 and gives the same answer everywhere. It is reproducibly wrong.'],
  ]),
  step('Priya cancels a confirmed ₹2,298.00 booking one hour before the slot. The policy charges 20%, rounded half up to the paisa. What is the fee, in paise?', [
    row('Total', ['229800 paise']),
  ], 0, [
    ['45960 (₹459.60)', 'Right. 229800 × 20 = 4596000, plus 50 is 4596050, divided by 100 is 45960. Exact, so the rounding doesn’t change it.'],
    ['4596 (₹45.96)', 'That is 2% of the total, not 20%. Check the place value: 20% of ₹2,298 is about ₹460.'],
    ['459 (₹4.59)', 'That divides rupees instead of paise. Keep the arithmetic in one unit, the minor unit.'],
    ['0: cancelling is free', 'Cancelling is free only up to 24 hours before. One hour before, the 20% fee applies.'],
  ]),
  step('Split ₹1,000.00 across three cost centres so that no paisa is lost. What are the shares?', [
    row('Total', ['100000 paise']),
  ], 2, [
    ['333.33 each', 'Three times 333.33 is 999.99. One paisa vanished, and in a ledger that is a bug.'],
    ['333.33, 333.33, 333.33 and a separate 0.01 rounding line', 'The total is right, but it is now four lines where three were asked for. Allocation puts the leftover inside the shares.'],
    ['333.34, 333.33, 333.33', 'Right. 100000 / 3 = 33333 remainder 1, so the first share gets one extra paisa. The shares differ by at most one paisa and add up exactly.'],
    ['333.333… each, using BigDecimal', 'One third has no finite decimal; BigDecimal’s divide throws unless you give it a scale. Money still has to land on whole paise.'],
  ]),
  step('new BigDecimal("2.0").equals(new BigDecimal("2.00")) — true or false?', [], 1, [
    ['true: they are the same number', 'equals on BigDecimal compares value AND scale. compareTo is what compares only the number.'],
    ['false: equals also compares scale; use compareTo for numeric equality', 'Right. This bites when BigDecimals are HashMap keys or go through equals-based assertions. The Money record avoids it: “2.0” and “2.00” both parse to 200 paise.'],
    ['It throws ArithmeticException', 'Only divide (with a non-terminating result) or setScale (when it would have to round) throw. equals never does.'],
  ]),
];

// Chapter 5 · What time is it in Copperline?
export const time = [
  step('Which type should record the moment Kofi’s hold runs out?', [], 1, [
    ['LocalDateTime', 'A LocalDateTime has no zone, so it isn’t a moment. “08:15” is a different instant in Copperline and on a UTC server.'],
    ['Instant', 'Right. An Instant is one point on the timeline, the same everywhere. Convert to the garage’s wall-clock time only to show it to a person.'],
    ['LocalTime', 'A time of day without a date: “08:15” on which day?'],
    ['A String like "08:15 IST"', 'Strings can’t be compared or added to, and “IST” is ambiguous (India, Israel and Ireland all use it).'],
  ]),
  step('In Europe/London, how long is the calendar day of Sunday 29 March 2026, from midnight to midnight?', [
    row('Clocks', ['00:00', '01:00 → 02:00', '24:00']),
  ], 2, [
    ['24 hours: a day is a day', 'Not when the clocks change. At 01:00 GMT, London jumps to 02:00 BST.'],
    ['25 hours', 'That is the autumn change, when clocks go back. In March they go forward.'],
    ['23 hours', 'Right. The checker measures it: Duration.between(midnight, next midnight) is PT23H. Period.ofDays(1) means “same wall-clock time tomorrow”; Duration.ofDays(1) means exactly 24 hours.'],
  ]),
  step('The free-cancellation test passes in the morning and fails at night. Most likely cause?', [], 0, [
    ['The code calls now() itself. Inject a Clock and fix it in tests', 'Right. Time is a dependency, like a payment vendor. The ManualClock in this chapter lets a test stand at 08:00, then move to 08:20.'],
    ['A race condition', 'Nothing is concurrent. The input that changes through the day is the wall clock.'],
    ['The test machine’s timezone', 'That causes a different flaky test. Even in one zone, now() moves.'],
  ]),
  step('Why give the workshop BookingId, CustomerId and BayId record types instead of plain Strings?', [], 1, [
    ['Records are faster than Strings', 'A tiny wrapper costs about the same. The benefit is correctness, not speed.'],
    ['Passing a customer id where a bay id belongs becomes a compile error, and each id validates itself once', 'Right. With three Strings, book(customerId, bayId) and book(bayId, customerId) both compile. This is the cure for the smell called primitive obsession.'],
    ['Strings can’t be HashMap keys', 'They can. Typed ids are about not mixing them up.'],
  ]),
];

// Chapter 6 · The wallet that went negative.
export const invariants = [
  step('A booking modelled with three booleans: paid, cancelled, checkedIn. How many combinations can exist, and how many mean something?', [
    row('Flags', ['paid', 'cancelled', 'checkedIn']),
  ], 2, [
    ['3 combinations, all meaningful', 'Three booleans are independent: 2 × 2 × 2 combinations, and the type permits them all.'],
    ['8 combinations, all meaningful', 'Is “checked in but not paid” meaningful? Or “cancelled and checked in”? The type permits them; the business doesn’t.'],
    ['8 combinations, only 5 meaningful', 'Right. Held, paid, cancelled before paying, cancelled after paying, checked in. The other 3 are illegal states that only comments forbid. An enum with one value per real state makes them impossible to write.'],
  ]),
  step('Where should “the slot is long enough for its jobs” be enforced?', [], 0, [
    ['In Booking’s constructor: it needs only the booking’s own slot and lines', 'Right. A rule that needs only one object’s data belongs in that object, checked at birth. A Booking that exists is long enough for its jobs.'],
    ['In the controller that receives the request', 'Then the importer, the admin screen and every test can build an invalid booking. Validate at the door of the object, not the door of the building.'],
    ['In the bay’s schedule, with the overlap check', 'The schedule owns rules that need to see the other bookings. This rule doesn’t, so the booking can guard it alone.'],
  ]),
  step('The rich Wallet holds 500. debit(800) throws InsufficientFundsException. What is the balance afterwards?', [
    row('Wallet', ['500']),
  ], 1, [
    ['−300', 'That is the anemic version. The rich debit checks before it changes anything.'],
    ['500', 'Right. Every guard runs before the single line that changes state, so a refused operation leaves the object exactly as it was.'],
    ['0', 'Nothing in debit zeroes the balance. Refused means unchanged.'],
  ]),
];

// Chapter 7 · The lift that appeared.
export const tellDontAsk = [
  step('B2 has no lift, so canBook(b2, "BRAKE_CHECK") is false. Someone calls quickFix(b2), which does bay.getCapabilities().add("LIFT"). What does canBook return now?', [
    row('B2', ['no lift']),
  ], 0, [
    ['true: the bay now claims a lift it does not have', 'Right. The getter handed out the bay’s real set, so any caller could rewrite the bay’s facts. Return an unmodifiable view or an immutable copy.'],
    ['false: getters return copies', 'Only if you write them to. This one returns the live HashSet.'],
    ['It throws UnsupportedOperationException', 'It would if the getter returned Set.copyOf or Collections.unmodifiableSet. In the mess it returns the real set.'],
  ]),
  step('Which line is ask-then-act that belongs inside the object?', [], 1, [
    ['log.info("bay " + bay.id())', 'Reading an id to print it is a plain query. Display and reports need data.'],
    ['if (w.getBalance() >= fee) w.setBalance(w.getBalance() - fee)', 'Right. The caller asks for state, decides with the object’s rule, then pushes new state back. Tell it instead: w.debit(fee).'],
    ['total = total.plus(booking.total())', 'booking.total() is a query the booking answers itself. Summing results across bookings is the caller’s own job.'],
    ['if (bay.canDo(job)) …', 'That is the tell-don’t-ask version: the bay answers with its own rule.'],
  ]),
  step('Does “tell, don’t ask” mean a class should have no getters?', [], 2, [
    ['Yes: every getter breaks encapsulation', 'Then no screen could show a booking’s status. Getters for read-only values are fine.'],
    ['Yes, except in tests', 'Tests read state the same way reports do. The principle is about who makes decisions.'],
    ['No: it means decisions about an object’s state are made by that object. Queries returning values or read-only views are fine', 'Right. The smell is asking for data, deciding, and writing back. Reading to display, report or combine is ordinary.'],
  ]),
];

// Chapter 8 · The booking that came back.
export const lifecycle = [
  step('In the mess, the nightly importer runs b.setStatus(Status.valueOf("CONFIRMED")) on a booking that was CANCELLED. What is its status afterwards?', [
    row('Booking', ['CANCELLED']),
  ], 0, [
    ['CONFIRMED: it came back from the dead', 'Right. BookingService checked the rule; the importer didn’t, and the setter let it through. A rule enforced by callers is enforced by some callers.'],
    ['CANCELLED: the service blocks it', 'The service’s check runs only when someone calls the service. The importer calls the setter directly.'],
    ['It throws IllegalArgumentException', 'valueOf("CONFIRMED") is a valid constant, so nothing throws. That’s what makes it dangerous.'],
  ]),
  step('In the new design, a CANCELLED booking receives confirm(…). What happens?', [], 1, [
    ['It becomes CONFIRMED', 'CANCELLED’s set of next states is empty: it is terminal.'],
    ['IllegalStateException, and the status stays CANCELLED', 'Right. requireEdge checks the enum’s table before anything changes. Every path to the status goes through a transition method, so nobody can skip the check.'],
    ['It silently does nothing', 'Silence would let the caller believe the booking is confirmed. A refused transition must be loud.'],
  ]),
  step('Kofi’s hold ran until 08:15. He pays at 08:20, so confirm(08:20) is called. What happens?', [
    row('Clock', ['08:00 held', '08:15 hold ends', '08:20 pays'], { 2: 'now' }),
  ], 2, [
    ['CONFIRMED: he paid, after all', 'The hold promised the bay for 15 minutes, not forever. Someone else may already be waiting for that slot.'],
    ['EXPIRED immediately, inside confirm', 'confirm doesn’t perform a different transition from the one it’s named for. It refuses, and the schedule’s sweep moves the booking to EXPIRED.'],
    ['IllegalStateException (“hold on BK-3 expired at …”); the booking stays HELD until the schedule sweeps it', 'Right. The demo prints exactly this refusal. The next hold() on that bay sweeps BK-3 to EXPIRED, which frees the slot.'],
  ]),
  step('Bram wants CONFIRMED bookings to send reminders and CHECKED_IN ones to start a job timer. Keep the enum table?', [], 1, [
    ['Yes: add if (status == …) branches wherever behaviour differs', 'That spreads one switch across the code: the repeated ladder the SOLID lesson warns about.'],
    ['When states behave differently, promote to one class per state (the State pattern) and keep the table as the guard', 'Right. Edges vary → enum table. Behaviour varies → State classes. Both → State classes with the table guarding transitions. It’s War Room Drill 3.'],
    ['No: delete the enum and use strings', 'Strings throw away the compiler’s help and the closed set of states.'],
  ]),
];

// Chapter 9 · Four kinds of arrow.
export const arrows = [
  step('Booking keeps a CustomerId field. Which relationship is that?', [], 2, [
    ['Composition: the booking owns the customer', 'A customer outlives every booking and is shared by many. Nothing dies with the booking.'],
    ['Inheritance', 'A booking is not a kind of customer.'],
    ['Association, by id: a lasting reference to another aggregate', 'Right. Solid arrow in the diagram. Holding the id rather than the object keeps the two aggregates separate.'],
    ['Dependency', 'A dependency is temporary: a parameter or a local. A field that lasts as long as the booking is an association.'],
  ]),
  step('BookingLine objects are created inside a booking, are never shared, and mean nothing without it. Which arrow?', [], 0, [
    ['Composition: filled diamond on the Booking end', 'Right. Exclusive ownership and a shared lifecycle. In Java, the booking builds or copies its lines and never hands out a mutable list.'],
    ['Aggregation: hollow diamond', 'Aggregation is for parts that can be shared or that outlive the whole. A line belongs to exactly one booking.'],
    ['Dependency: dashed arrow', 'The booking keeps its lines for its whole life. That is ownership, not a passing use.'],
  ]),
  step('CancellationPolicy.feeFor(booking, at) reads a Booking passed in as a parameter and keeps nothing. Which arrow?', [], 1, [
    ['Association', 'Nothing is stored. An association is a lasting reference.'],
    ['Dependency: dashed arrow', 'Right. The policy uses Booking for one call. If Booking’s interface changes, the policy may have to change, which is all a dependency promises.'],
    ['Composition', 'The policy doesn’t own any booking.'],
  ]),
  step('A Crew holds mechanics who were hired before the crew was formed and stay after it disbands. Which arrow?', [], 1, [
    ['Composition', 'The mechanics outlive the crew, so the crew can’t own their lifecycle.'],
    ['Aggregation: hollow diamond. A whole-part relationship whose parts exist on their own', 'Right. In Java it looks like an association: a field holding objects that were passed in. The difference is intent, which is why many teams just draw a plain association.'],
    ['Inheritance', 'A crew is not a kind of mechanic.'],
  ]),
];

// Chapter 10 · The bay that forgot its kilowatts.
export const inheritance = [
  step('Bay’s constructor calls describe(code). EvBay overrides describe to print its kilowatts, then sets kilowatts after super(code). What does new EvBay("B3", 22).label() return?', [
    row('Order', ['Bay()', 'describe()', 'kilowatts = 22']),
  ], 2, [
    ['"EV bay B3 (22 kW)"', 'That is what was meant. But the overriding describe runs inside Bay’s constructor, before EvBay’s constructor has assigned kilowatts.'],
    ['"Bay B3"', 'The call is virtual, so even from Bay’s constructor it reaches EvBay’s override.'],
    ['"EV bay B3 (0 kW)"', 'Right. The subclass method runs on a half-built object and reads the int field’s default, 0. Constructors must not call overridable methods.'],
    ['It throws NullPointerException', 'An int field defaults to 0, not null. Nothing throws. That’s why it shipped.'],
  ]),
  step('Kofi completes his fifth service and becomes gold. The model has GoldCustomer extends Customer. What goes wrong?', [], 1, [
    ['Nothing: cast him to GoldCustomer', 'The object was created as a Customer. A cast can’t change an object’s class.'],
    ['An object can’t change class, so you must build a new object with the same id, and every reference to the old one is now stale', 'Right. A role that changes during an object’s life fails the “is-a forever” test. Make it a field: Customer has a Tier.'],
    ['Java doesn’t allow subclasses of entities', 'It does. The trouble is modelling a changing role as a fixed type.'],
  ]),
  step('When is an abstract class the right tool instead of an interface?', [], 2, [
    ['Whenever two classes share any code', 'Shared code can be shared by composition, through a helper both hold, without coupling their types.'],
    ['Whenever you need a type for callers to depend on', 'That is an interface’s job. It’s a seam with no state and no single-parent limit.'],
    ['When close siblings share real code and state, and the parent is designed for extension, as in a Template Method', 'Right. Interfaces for seams; an abstract class for a deliberate shared skeleton. War Room dossier 7 shows one forced by module dependency direction.'],
  ]),
];

// Chapter 11 · Who is Ravi working on?
export const manyToMany = [
  step('In the mess, order.assign(ravi) adds Ravi to the order’s crew list and nothing else. What does ravi.jobs.size() return?', [
    row('Order WO-1 crew', ['Ravi']),
    row('Ravi’s jobs', ['(empty)']),
  ], 0, [
    ['0: only one side was updated', 'Right. Two collections hold one relationship, and assign updated one of them. The other side now gives a different answer to the same question.'],
    ['1: Java keeps both sides in sync', 'No language or collection keeps two lists in sync. That is your code’s job, or your design’s.'],
    ['It throws', 'Nothing checks the two sides against each other. They just disagree.'],
  ]),
  step('An assignment has a role: LEAD or ASSIST. Where does the role live?', [], 2, [
    ['On Mechanic: Ravi is a lead', 'Ravi can lead one job and assist on another. The role depends on the pair.'],
    ['On the booking: this booking’s lead', 'That handles LEAD but not who assists, and it spreads the relationship across two places.'],
    ['On the link object, Assignment(booking, mechanic, role)', 'Right. The relationship has its own data, so it becomes an object of its own: the object-world twin of a join-table row.'],
  ]),
  step('Roster keeps two maps: by booking and by mechanic. Why two?', [], 1, [
    ['Two copies are safer than one', 'Two copies are only safe because Roster is the one place that writes both, in the same method.'],
    ['One index per question: “who is on this booking?” and “what is this mechanic on?”', 'Right. This is a join table’s primary key plus its reverse index, in memory. Both answers come from one map lookup, and one class keeps them consistent.'],
    ['HashMap can’t hold more than one value per key', 'Each map holds a nested map per key. The two maps are there to serve the two directions.'],
  ]),
  step('BookingLine and Assignment are both links. Why does Booking own its lines, while assignments live in a separate Roster?', [], 0, [
    ['Lines are part of the booking’s own consistency (its total); assignments connect two aggregates, so they hold ids and live outside both', 'Right. Ask what the link must stay consistent with. Lines must agree with the booking’s total, so they live inside it. An assignment must not lock a booking and a mechanic together.'],
    ['Lines are smaller', 'Size isn’t the test. Consistency is.'],
    ['Records can’t be stored in collections', 'They can. Both links are records.'],
  ]),
];

// Chapter 12 · Two desks, one bay.
export const aggregates = [
  step('Which boundary should enforce “no two active bookings share a bay at the same time”?', [], 2, [
    ['Each Booking', 'One booking can’t see its siblings. The rule is about several bookings at once.'],
    ['The whole Workshop', 'It works, but every booking in every bay would now contend for one lock. Keep the boundary as small as the rule allows.'],
    ['One schedule per bay: the smallest object that can see every booking the rule talks about', 'Right. The invariant draws the boundary. BaySchedule is the root, and hold() is the one door into it.'],
  ]),
  step('A booking needs to know who booked it. Booking holds…', [], 1, [
    ['a Customer object, so it can call customer.tier() whenever it likes', 'Then loading a booking drags in a customer, and a booking method could change the customer, which is two aggregates in one change.'],
    ['a CustomerId: other aggregates are referenced by identity', 'Right. The Workshop reads the customer’s tier when the booking is made and copies the agreed prices onto the lines.'],
    ['the customer’s name and phone as Strings', 'Copies of another aggregate’s mutable state go stale. Hold the id; look the rest up when you need it.'],
  ]),
  step('A fleet wants two bays at once, both or neither. Bay schedules are separate aggregates. What do you do?', [], 1, [
    ['Change both schedules in one transaction', 'One transaction should change one aggregate. If “both or neither” were the usual case, you would redraw the boundary instead.'],
    ['Hold the first, try the second, and cancel the first if the second refuses: a compensating action', 'Right. This is Side quest 2. The compensation is a held booking cancelled free, and it is safe to run.'],
    ['Book them independently and hope', 'Then the fleet sometimes gets one bay of the two it needs. Both or neither is a requirement, so something has to enforce it.'],
  ]),
  step('A hold on B3 ran out at 08:15, but nothing has swept it. At 08:20 someone asks for the same slot. What does hold() do?', [], 0, [
    ['Sweeps expired holds first, then sees no clash and accepts', 'Right. The demo does exactly this: BK-3 becomes EXPIRED and BK-4 takes the slot.'],
    ['Refuses: the slot is still HELD', 'Stale holds would then block bays until a background job ran. The root sweeps before it checks.'],
    ['Accepts both, so the bay now has two bookings', 'Only one booking can occupy the slot. The sweep moves BK-3 to EXPIRED, which no longer occupies the bay.'],
  ]),
];

// Chapter 13 · From brief to running code.
export const model = [
  step('“Gold-card customers get 10% off every job.” In the finished model, who applies the discount, and when?', [], 1, [
    ['A GoldCustomer subclass overrides price()', 'That makes tier a type an object can never leave (Chapter 10).'],
    ['Tier.price(listPrice), called by the Workshop when it copies prices onto a new booking’s lines', 'Right. The enum holds the rule; the Workshop calls it once, at booking time; the booking keeps the result.'],
    ['Booking.total() checks the customer’s tier every time', 'Booking holds only a CustomerId, and a later upgrade must not change a price already agreed.'],
  ]),
  step('In the demo, Kofi’s booking that finally succeeds is BK-4. Why not BK-2?', [
    row('Ids', ['BK-1 Priya', 'BK-2 ?', 'BK-3 Kofi', 'BK-4 Kofi']),
  ], 2, [
    ['The ids are random', 'The demo uses SequentialBookingIds, so they count up.'],
    ['BK-2 belongs to another customer', 'There is no other customer in the demo.'],
    ['BK-2 went to the refused request for B1, and BK-3 was the hold that expired', 'Right. A refused request still drew an id. Gaps in ids are normal; never promise gapless ids.'],
  ]),
  step('Minute 15 of a 90-minute round. What should already be on the whiteboard?', [], 0, [
    ['The classes, each marked entity or value, the arrows, and each rule next to the class that enforces it', 'Right. Wrong models are cheap to fix on a whiteboard and expensive to fix in code.'],
    ['A full UML diagram with every getter', 'Ceremony costs time and shows nothing about rules. Boxes, arrows and invariants are enough.'],
    ['Nothing yet; start typing', 'The model is where most of the grade is decided. Ninety seconds of drawing saves twenty minutes of refactoring.'],
  ]),
];

// Decision drills: mixed, including every question from the old checkpoint quiz.
export const drills = [
  step('Your Booking class has getStatus()/setStatus(), and a BookingService checks “if status == HELD then setStatus(CONFIRMED)”. What is the core problem?', [], 1, [
    ['BookingService should be named BookingManager', 'Renaming changes nothing. Any caller can still call setStatus.'],
    ['The status rule lives outside the object it protects, so any other caller can make an illegal transition', 'Right. Anemic model. The rule belongs inside Booking: confirm() throws unless the booking is HELD. Once a setter exists, every caller is trusted, and one will betray you.'],
    ['Enums should not be used for status fields', 'The enum is the right tool. The problem is the public setter around it.'],
    ['setStatus should return the new status for chaining', 'Chaining doesn’t stop an illegal transition.'],
  ]),
  step('Money as double: what breaks?', [], 1, [
    ['Nothing: doubles hold 15+ significant digits', 'Precision isn’t the problem; representation is. 0.1 can’t be stored exactly in binary at any precision.'],
    ['Binary floating point can’t represent most decimal fractions: 0.1 + 0.2 != 0.3, so sums and comparisons drift', 'Right. Store minor units (paise) in a long inside a Money value object, or use BigDecimal with an explicit rounding rule. “0.1 has no exact binary representation” is the one-sentence proof interviewers want.'],
    ['Doubles overflow at ten million rupees', 'A double reaches about 1.8 × 10^308. The trouble is exactness at small amounts, not size.'],
    ['Doubles can’t be serialised to JSON', 'They can, and many parsers (JavaScript’s included) read JSON numbers back as doubles. That is one more reason to send money as minor units or as a string.'],
  ]),
  step('When is extending a class the right call, rather than composing?', [], 1, [
    ['Whenever two classes share any code', 'Shared code can be shared by composition. Inheritance also shares the parent’s type, its promises and its internals.'],
    ['When the subclass is substitutable for the parent under EVERY operation, the type never changes during the object’s life, and the parent was designed for extension', 'Right. Is-a under all operations (Liskov), is-a forever, and a parent built to be extended. Anything less, compose. Square extends Rectangle fails the first test.'],
    ['When you want to override just one method', 'Overriding one method of a concrete class you don’t control is how fragile base classes happen.'],
    ['Never: inheritance is always wrong', 'Sealed hierarchies of records and Template Method skeletons are fine. The rule is about the three tests, not a ban.'],
  ]),
  step('A value object (a record) is used as a HashMap key. Which guarantee makes this safe?', [], 1, [
    ['Records are stored by reference, so lookup always works', 'A lookup builds a new key object, so reference equality would miss every time.'],
    ['Records generate field-based equals AND hashCode together, keeping the hash contract intact', 'Right. The classic bug is overriding equals without hashCode: two “equal” keys land under different hashes and lookups silently miss. Records generate both. Copy any mutable component, or the hash can still change under you.'],
    ['HashMap falls back to a linear scan for records', 'HashMap treats every key the same way: hash first, then equals.'],
    ['Records are interned like Strings', 'Nothing interns records. Two equal records are usually two objects.'],
  ]),
  step('Money.of("1.0", "INR").equals(Money.of("1.00", "INR")) in this lesson’s Money record?', [], 0, [
    ['true: both parse to 100 paise', 'Right. The scale disappears at parse time, so equality means “same amount, same currency”. Compare BigDecimal, where equals("1.0", "1.00") is false.'],
    ['false: the strings differ', 'The record stores minor units, not the original string.'],
    ['It throws: "1.0" has the wrong number of decimals', 'setScale(2) only throws when it would have to round. "1.0" becomes 1.00 exactly.'],
  ]),
  step('Workshop creates one BaySchedule per bay in its constructor, keeps them in a private map and never hands them out. Which arrow from Workshop to BaySchedule?', [], 2, [
    ['Dependency', 'Workshop keeps its schedules for its whole life. That is more than a passing use.'],
    ['Aggregation', 'Aggregated parts exist independently. These schedules are created by the workshop and live only inside it.'],
    ['Composition', 'Right. Created inside, never shared, gone with the workshop: a filled diamond.'],
  ]),
  step('An interviewer asks: “Is a TimeSlot an entity or a value?”', [], 1, [
    ['An entity: bookings refer to it', 'Being referred to doesn’t create identity. Nobody asks which 10:00–11:00 this is.'],
    ['A value: two slots with the same start and end are the same slot, and it never changes; a booking that moves gets a new slot', 'Right. Value semantics, an invariant in the constructor (end after start), behaviour (overlaps), and no setters.'],
    ['Neither: it is a pair of Instants', 'Two loose Instants can’t check that end comes after start or answer overlaps(). The concept earns a type.'],
  ]),
  step('A new rule: “a car may be booked into at most one bay at a time.” The bay schedules can’t see each other. Which answer would you give in an interview?', [], 2, [
    ['Put the check in BaySchedule.hold()', 'One bay’s schedule can’t see bookings in other bays, so it can’t enforce this.'],
    ['Merge all bays into one Workshop aggregate and stop worrying', 'That works, at the cost of one lock for every booking in the garage. It’s worth saying as the simple option, not as the only one.'],
    ['Name the trade-off: a cross-bay check in the Workshop (with a small race between two bays) or a separate per-plate reservation that both bookings must claim', 'Right. A rule that spans aggregates either becomes its own small aggregate (a reservation keyed by plate) or is checked across them and tolerates a race. Naming that choice is the senior answer.'],
  ]),
];
