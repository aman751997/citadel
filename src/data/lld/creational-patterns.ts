import { row, step } from '../../lib/trace.ts';

// Decision puzzles and "your turn" hints for src/lld-lessons/creational-patterns.mdx.
// Every number quoted here is verified in tests/java/creational-patterns/Check.java.

export const hints: Record<string, [string, string, string]> = {
  labOrders: [
    'The checklist belongs to one patient. So each call must hand out a new form — what can a map store that makes a new object on demand?',
    'LabOrder interface (test(), checklist()); BloodPanelOrder, XrayOrder, MriOrder; LabOrders holding a Map<LabTest, Supplier<LabOrder>>; a wiring method using constructor references.',
    'newOrder(test) looks up the supplier and calls get(); a missing key throws. The constructor calls each supplier once and checks the form it makes reports the key it is wired under, then stores Map.copyOf.',
  ],
  campaign: [
    'The loop is identical in both campaigns. Only one line differs: which channel object gets created.',
    'Channel interface with SmsChannel and EmailChannel; an abstract ReminderCampaign with a final run() and an abstract createChannel(); SmsCampaign and EmailCampaign override only createChannel().',
    'run() calls createChannel() once, then sends to each patient and collects the strings. Subclasses never touch the loop.',
  ],
  recordingSuite: [
    'Billing takes a GatewaySuite. A test double for billing is therefore a whole family, not one object.',
    'RecordingSuite implements GatewaySuite and owns a list of calls; each product method returns a lambda, because every product interface has one method.',
    'The gateway lambda records "charge <patient> <paise>" and returns "fake-" plus the call count; the verifier accepts only the signature "good".',
  ],
  prescription: [
    'Which fields can the compiler force on you? Put those in the method that creates the builder.',
    'Medicine record (name, dose, controlled); Prescription with final fields and a private constructor; a nested Builder whose constructor takes patientId and doctorId.',
    'refills(n) rejects anything outside 0..5 immediately. build() checks at least one medicine and that no controlled medicine is combined with refills, then copies the list with List.copyOf.',
  ],
  catalog: [
    'Two directions can leak: the caller who registered an exemplar keeps a reference to it, and every caller who gets a copy can edit it.',
    'TemplateCatalog with a Map<String, InvoiceTemplate>; register(kind, exemplar) and newInvoice(kind), both using the copy constructor.',
    'Copy on the way in (so later edits to the registered object do not reach the catalog) and on the way out (so callers never touch the exemplar). Unknown kind throws.',
  ],
  injectMetrics: [
    'The problem is not that one registry exists. It is that BookingDesk reaches for it instead of being handed it.',
    'A one-method Metrics interface; InjectedBookingDesk takes a Metrics in its constructor; a productionDesk() wiring method.',
    'Production passes MetricsRegistry.INSTANCE::record; each test passes its own lambda over a fresh map, so no test can see another test’s counts.',
  ],
  lease: [
    'Which Java statement runs code on every exit path, including exceptions, without the caller writing finally?',
    'Lease<T> implements AutoCloseable: it borrows in its constructor, exposes get(), and gives back in close().',
    'Guard close() with an AtomicBoolean and compareAndSet so the item goes back exactly once; get() after close throws. Callers write try (Lease<...> lease = new Lease<>(pool, timeout)).',
  ],
  testRoot: [
    'The services already take everything through their constructors. What would a second main() for tests pass them?',
    'A testApp(List<String> told) method that builds a RecordingDatabase, a capturing Notifier lambda and a Clock.fixed, then the same two services.',
    'Clock.fixed(Instant.parse("2026-03-16T09:30:00Z"), ZoneOffset.UTC); the notifier appends patientId + ": " + text to the list. No service class changes.',
  ],
  cardRetries: [
    'Whose attempts is the counter counting — one payment’s, or everyone’s since startup?',
    'RetryingCardProcessor implements PaymentProcessor with an attempts field; a new wiring method that registers it as a Supplier in ProcessorSuppliers.',
    'process() increments attempts and declines after three. Wire RetryingCardProcessor::new so each payment gets a fresh counter.',
  ],
  staging: [
    'A new variant of the whole family. What does that cost in an abstract factory?',
    'StagingConfig record and a StagingSuite implementing GatewaySuite. Nothing else.',
    'gateway() and refunds() return sandbox products on the sandbox URL; verifier() returns a PennyPayVerifier built with the staging secret.',
  ],
  discounts: [
    'The list copy is fine. What is inside the list now?',
    'LineItem becomes a class with a mutable discountPercent and its own copy constructor; InvoiceTemplate copies each element, not just the list.',
    'In both InvoiceTemplate constructors, loop over the items and add new LineItem(item). totalPaise() sums netPaise() = paise × (100 − discount) / 100.',
  ],
  stale: [
    'Check each connection as it leaves the pool. And if replacing it fails, what must the pool still own?',
    'ValidatingPool<T> with a BlockingQueue, a lent set, a Supplier<T> factory and a Predicate<T> healthy check; a replaced counter.',
    'On borrow, if the polled item is unhealthy, ask the factory for a fresh one; if the factory throws, put the stale item back in the queue and rethrow, so no slot is lost.',
  ],
};

export const factory = [
  step('CounterDesk’s ladder ends in a plain else that builds a WalletProcessor. EMI is added to the enum. What does charge(EMI, 500000) return?', [
    row('Ladder', ['UPI', 'CARD', 'else'], { 2: 'EMI lands here' }),
  ], 2, [
    ['It does not compile until EMI is handled', 'An if/else ladder has no exhaustiveness check. Only a switch expression over the enum without a default would refuse to compile.'],
    ['It throws IllegalArgumentException', 'Nothing in the ladder throws. The catch-all else accepts every mode it has never heard of.'],
    ['"wallet-500000" — the EMI payment silently goes to the wallet', 'Right. The catch-all else turns “I forgot a case” into a wrong answer. That is the bug from the scene.'],
    ['"emi-500000"', 'There is no EMI processor anywhere in the code. Something must choose one; here the else chooses the wallet.'],
  ]),
  step('The same choice of processor is now made in three classes. What is the first, smallest fix?', [], 1, [
    ['A registry scanned from the classpath by reflection', 'Far more machinery than the problem needs, and unreadable in a 90-minute round. The duplication is the problem, not the switch.'],
    ['One factory method that returns the interface, using an exhaustive switch with no default', 'Right. One place decides, and adding a mode makes the switch stop compiling until someone handles it.'],
    ['Keep the ladders but add a comment reminding people to update all three', 'Comments do not stop the next missed copy. The structure has to make one place the only place.'],
  ]),
  step('Each processor will hold a retry counter for the payment it is handling. Which registry?', [], 2, [
    ['Map<PaymentMode, PaymentProcessor> — instances keyed by mode()', 'That shares one instance across every patient, so the counter counts everyone’s attempts. Side quest 1 shows the fourth patient declined.'],
    ['A static field per processor type', 'A static field is the same shared lifetime as the instance registry, plus a global.'],
    ['Map<PaymentMode, Supplier<PaymentProcessor>> — a new processor per call', 'Right. State that belongs to one use needs an object per use. (Or move the counter out of the processor entirely.)'],
  ]),
];

export const factoryMethod = [
  step('Which of these is the Gang of Four’s Factory Method pattern?', [], 1, [
    ['ProcessorFactory.forMode(mode) with a switch', 'That is a simple factory: one method choosing a class from runtime data. Not one of the 23 GoF patterns.'],
    ['UtilisationReport.render() calling an abstract createExporter() that subclasses implement', 'Right. A creation step inside the creator’s own algorithm, decided by a subclass.'],
    ['Money.rupees(10)', 'A static factory method. Effective Java says outright that it is not the Factory Method pattern.'],
  ]),
  step('Rao saw 14 patients and Iyer 9. What does the CSV report render?', [
    row('Visits', ['Dr Rao: 14', 'Dr Iyer: 9']),
  ], 0, [
    ['doctor,visits / Dr Iyer,9 / Dr Rao,14', 'Right. render() copies the map into a TreeMap, so doctors come out sorted by name, in both reports.'],
    ['doctor,visits / Dr Rao,14 / Dr Iyer,9', 'That is the order the story mentioned them in, not the order render() uses. It sorts by name.'],
    ['It depends on the HashMap’s iteration order', 'That was the copy-pasted printer report’s bug. The shared render() sorts once, for every subclass.'],
  ]),
  step('A third subclass would only override createExporter() with one line. Lighter alternative?', [], 2, [
    ['A static Exporter field set before each render', 'Global, mutable and racy: two reports rendering at once would fight over it.'],
    ['Copy render() into the new class', 'That is the copy-paste the chapter started by removing.'],
    ['One report class that takes a Supplier<Exporter>, e.g. new SuppliedReport(CsvExporter::new)', 'Right. Factory Method by composition. The checker shows it renders exactly what the CSV subclass renders.'],
  ]),
];

export const family = [
  step('The live PennyPay gateway was wired with the sandbox verifier. A webhook is signed with the public sandbox test secret. What happens?', [
    row('Wiring', ['PennyPayGateway', 'SandboxVerifier'], { 0: 'live', 1: 'sandbox' }),
  ], 1, [
    ['Rejected — the gateway is live', 'The gateway does not verify webhooks; the verifier does, and it holds the test secret.'],
    ['Accepted — a forgery passes, while genuine live webhooks fail', 'Right. Each object is correct on its own; the combination is the bug. The checker reproduces both halves.'],
    ['Nothing — the gateway refuses to start', 'Neither class knows about the other, so nothing refuses. That is exactly why the family needs to be a unit.'],
  ]),
  step('You have GatewaySuite with LiveSuite and SandboxSuite. What makes a mixed family truly impossible inside billing?', [], 2, [
    ['Naming conventions: Live* and Sandbox* prefixes', 'Names do not stop anyone passing a live gateway with a sandbox verifier.'],
    ['A comment on BillingService', 'Comments are not constraints.'],
    ['BillingService’s constructor takes a GatewaySuite, not the separate products', 'Right. There is no parameter list into which a live gateway and a sandbox verifier could both go.'],
  ]),
  step('Auditors want a new product, a PayoutClient, in every environment. What does it cost?', [], 0, [
    ['Edit GatewaySuite and every suite that implements it', 'Right. That is Abstract Factory’s known liability: new families are cheap, new products touch every factory.'],
    ['One new class', 'That is the cost of a new family (Side quest 2). A new product changes the family interface itself.'],
    ['Nothing — add it to BillingService directly', 'Then payouts are wired outside the family, and the mixing problem returns for that product.'],
  ]),
];

export const builder = [
  step('new Booking("P-1042", "D-07", slot, "R-3", null, true, false, null) — parameters 6 and 7 are teleconsult and followUp. What gets booked?', [
    row('Args 4–7', ['"R-3"', 'null', 'true', 'false'], { 2: 'teleconsult', 3: 'followUp' }),
  ], 1, [
    ['An in-person follow-up in R-3', 'That is what the author meant. The constructor reads true as teleconsult.'],
    ['A teleconsult with room R-3, not a follow-up', 'Right. Two adjacent booleans transposed, and nothing sees all the fields at once to object.'],
    ['It throws — teleconsults cannot have rooms', 'Nothing checks that rule in the mess. That is the point: no single place owns it.'],
  ]),
  step('Where does “teleconsult bookings cannot have a room” belong?', [], 2, [
    ['In room(), throwing if teleconsult is true', 'The caller may set room first and teleconsult second. A setter cannot see fields that are not set yet.'],
    ['In the Booking’s getters', 'By then an invalid Booking already exists. The rule must stop construction.'],
    ['In build(), the first moment the whole object is visible', 'Right. Single-value rules go in setters or value types; presence and cross-field rules go in build().'],
  ]),
  step('Booking’s symptoms field is final. The constructor stores the builder’s list directly. The same builder then adds “fever” and builds again. What happens to the first booking?', [], 0, [
    ['Its symptoms change too — final stops reassignment, not mutation', 'Right. That is why the constructor uses List.copyOf: a snapshot that is also unmodifiable.'],
    ['Nothing — final makes the list immutable', 'final applies to the field reference, not the list object it points at.'],
    ['The second build() throws', 'Builders can be reused. The danger is sharing a mutable list between the builder and a product.'],
  ]),
];

export const prototype = [
  step('The Riverside template has one registration line. A copy made with super.clone() gets an X-ray added. How many lines does the template have now?', [
    row('Template', ['REG']),
    row('Clone', ['REG', 'XR-01'], {}, { tones: { 1: 'hot' } }),
  ], 1, [
    ['1', 'Only if the clone had its own list. Object.clone() copies the reference to the list, not the list.'],
    ['2', 'Right. Both objects hold the same list, so the X-ray appears on the template — and on every future copy.'],
    ['It throws CloneNotSupportedException', 'The class implements Cloneable, so Object.clone() succeeds. It just copies shallowly.'],
  ]),
  step('Template: one ₹200 registration line (20,000 paise). patientInvoice adds an ₹850 X-ray (85,000 paise). Totals of invoice and template?', [], 2, [
    ['105,000 and 105,000', 'That is the shallow-copy bug. The copy constructor gives the invoice its own list.'],
    ['85,000 and 20,000', 'The invoice starts as a copy of the template, so it keeps the registration line.'],
    ['105,000 and 20,000', 'Right. The copy got a fresh list; the template is untouched.'],
  ]),
  step('LineItem is an immutable record. Is new ArrayList<>(other.items) a deep enough copy?', [], 0, [
    ['Yes — copy mutable containers, share immutable elements', 'Right. Deep enough means no mutable state is shared. Side quest 3 shows it stops being enough when LineItem becomes mutable.'],
    ['No — every LineItem must be copied too', 'Copying immutable records buys nothing; nobody can change them.'],
    ['No — the header String must be copied too', 'Strings are immutable. Sharing them is safe and normal.'],
  ]),
];

export const singleton = [
  step('Sixty-four threads call a lazy get() — if (instance == null) instance = new LazyPool() — at once, with a slow constructor. How many pools can open?', [], 2, [
    ['Exactly one — the null check prevents a second', 'Several threads can read null before the first constructor finishes. Check-then-act without a lock is a race.'],
    ['Zero — the threads deadlock', 'There is no lock at all, so nothing can deadlock.'],
    ['More than one', 'Right. The checker sees several pools opened during the 50 ms constructor.'],
  ]),
  step('Double-checked locking, but without the second check inside synchronized. What goes wrong?', [], 1, [
    ['Nothing — the lock is enough', 'The lock only serialises the threads that already passed check 1. Each of them, in turn, builds a pool.'],
    ['Every thread that passed check 1 builds its own pool, one after another', 'Right — your third note. The checker shows more than one pool opened.'],
    ['The JVM throws IllegalMonitorStateException', 'The monitor is used correctly. The bug is logical, not a lock misuse.'],
  ]),
  step('Which form would you actually ship for a hand-rolled singleton?', [], 0, [
    ['An enum — class initialization does the locking, and it resists reflection and serialization', 'Right. The checker shows Constructor.newInstance refusing the enum and deserialization returning the same constant.'],
    ['DCL without volatile, because volatile is slow', 'Without volatile another thread can see a reference to a partly constructed object. Correctness first.'],
    ['A public static field assigned in main()', 'Anyone can reassign or replace it, and nothing enforces one instance.'],
  ]),
  step('BookingDesk records into MetricsRegistry.INSTANCE. Test A books once and asserts bookings = 1. Test B, next in the same JVM, does the same. What does test B see?', [], 1, [
    ['1', 'The registry outlives test A. Its count is still there.'],
    ['2 — global state bleeds between tests', 'Right. The hidden dependency has no seam for a fresh fake. Inject a Metrics instead.'],
    ['0 — each test gets a new JVM', 'Test runners normally reuse one JVM for many tests. That is why global state bites.'],
  ]),
];

export const pool = [
  step('A pool of 3 connections, all lent out. A fourth borrow(50 ms) arrives. What happens?', [
    row('Pool', ['lent', 'lent', 'lent'], {}, { tones: { 0: 'hot', 1: 'hot', 2: 'hot' } }),
  ], 2, [
    ['A fourth connection is created', 'The pool is bounded: it never creates more than its size, which is the whole point when the database caps connections.'],
    ['It waits forever', 'A forever-wait hangs a request thread. The pool bounds the wait.'],
    ['It waits up to 50 ms, then throws PoolExhaustedException', 'Right. Bounded resource, bounded wait, loud failure. A return within the 50 ms would have woken it.'],
  ]),
  step('A query throws between borrow() and giveBack(). Three such failures on a pool of 3. Then?', [], 0, [
    ['Every later borrow times out — the three connections leaked', 'Right. The second half of the promise lives in the caller. A Lease with try-with-resources makes the return automatic.'],
    ['The pool notices and reclaims them', 'This pool has no leak detection. Production pools can warn about leaks, but the fix is to always return.'],
    ['The JVM garbage-collects them back into the pool', 'They are still referenced from the pool’s lent set, and the pool never re-adds anything on its own.'],
  ]),
  step('Which of these deserves an object pool?', [], 1, [
    ['StringBuilders used to format receipts', 'Cheap to allocate; pooling adds contention and stale-state bugs. Effective Java says not to.'],
    ['Database connections, which take a network handshake and are capped by the server', 'Right. Expensive, reusable and limited — all three conditions.'],
    ['PaymentRequest records', 'Small immutable values. Allocate them freely.'],
  ]),
];

export const injection = [
  step('AppointmentService and DischargeService each do new PooledDatabase(20). The database allows 100. How many connections do the two services open?', [], 1, [
    ['20 — they share the pool', 'Each new builds a separate pool. Nothing makes them share.'],
    ['40 — two pools of 20', 'Right. The 6 p.m. incident again. One instance built in the composition root and passed to both fixes it.'],
    ['100 — the database decides', 'The database only sets the ceiling; each pool opens its own 20.'],
  ]),
  step('Which belongs in AppointmentService’s constructor?', [], 0, [
    ['The Database, the Notifier and the Clock', 'Right. I/O, side effects and nondeterminism: things tests must replace and lifetimes main() must decide.'],
    ['The ArrayList it uses to build a message', 'A plain local value. new is fine where it is used.'],
    ['A Money value for the booking fee', 'Values are created where needed. Injecting them is ceremony.'],
  ]),
  step('A class needs a fresh LabOrder for every patient. What do you inject?', [], 2, [
    ['One LabOrder instance', 'Then every patient shares one form — the bug from Chapter 1’s Your turn.'],
    ['Nothing; it calls new MriOrder() itself', 'That welds the concrete classes back into the business code.'],
    ['A factory: a Supplier<LabOrder> or the LabOrders registry', 'Right. When a class needs fresh objects repeatedly, inject the thing that makes them.'],
  ]),
];

export const choose = [
  step('“Each clinic country needs a matching gateway, SMS provider and tax format.”', [], 1, [
    ['Builder', 'Nothing here is one complex object assembled in steps. The rule spans several objects.'],
    ['Abstract Factory', 'Right. A family with a cross-product invariant: one suite per country.'],
    ['Singleton', 'How many instances exist is not the question; which ones go together is.'],
  ]),
  step('“A Prescription has two required fields, five optional ones, and a rule linking controlled medicines to refills.”', [], 0, [
    ['Builder with the required fields in builder(...) and the rule in build()', 'Right. Required fields become compile errors; the cross-field rule lives where the whole object is visible.'],
    ['Abstract Factory', 'There is one product, not a family.'],
    ['Prototype', 'Nothing is being copied from an exemplar.'],
  ]),
  step('“The app needs exactly one metrics registry.” In application code, the first choice is…', [], 2, [
    ['Double-checked locking', 'Correct with volatile, but it keeps the global access point and the hidden dependencies.'],
    ['An enum singleton', 'The best hand-rolled form — still the second choice in application code.'],
    ['Create one in the composition root and inject it', 'Right. Exactly one, without a global access point; tests pass their own.'],
  ]),
  step('“Every invoice starts from the clinic’s standard template.” The template has a mutable list and map.', [], 1, [
    ['Implement Cloneable and call super.clone()', 'Shallow: the copy shares the list and map. That was Monday’s X-ray bug.'],
    ['A copy constructor with fresh collections', 'Right. Prototype the Java way: share immutable, copy mutable.'],
    ['A Singleton template everyone edits', 'Every patient would edit the same invoice.'],
  ]),
];

export const drills = [
  step('Interviewer: “Your factory has a switch — isn’t that an OCP violation?”', [], 1, [
    ['Yes, I’ll switch to reflection scanning', 'Reflection costs readability and fails at runtime. Containment in one class was already most of the value.'],
    ['The variation lives in one class whose job is choosing; if implementations multiply, I’d move to a registry where each declares its key', 'Right. Honest and calibrated — and name the trade: compile-time exhaustiveness for an unedited chooser.'],
    ['Enum switches are exempt from OCP', 'There is no such exemption. The defence is containment, not a rule.'],
  ]),
  step('A ProcessorSuppliers map is wired CARD → WalletProcessor::new by mistake. When does it fail?', [], 0, [
    ['At startup — the constructor makes one of each and checks mode()', 'Right. The key sits beside the supplier, so the constructor verifies it. The checker wires this exact typo.'],
    ['At the first card payment', 'That would be the case without the startup check — the card payment would quietly go to the wallet.'],
    ['Never — wallet payments work', 'That is the danger the startup check exists to remove.'],
  ]),
  step('Which builder detail makes “constructed ⇒ valid” true?', [], 2, [
    ['Fluent setters that return this', 'Chaining is syntax. It enforces nothing.'],
    ['A public all-arguments constructor kept for convenience', 'Then invalid objects can bypass build() entirely.'],
    ['A private product constructor, so build() and its checks are the only way in', 'Right. Plus final fields and defensive copies for immutability.'],
  ]),
  step('Why is volatile required in double-checked locking?', [], 1, [
    ['To make the synchronized block faster', 'volatile does not speed up locks; it gives a happens-before edge for the unsynchronized read.'],
    ['Without it, another thread can see the reference before the constructor’s writes, and use a half-built object', 'Right. volatile makes the publication safe. Or avoid the cliff: enum or holder.'],
    ['To stop two threads entering synchronized at once', 'synchronized already does that. The problem is the read outside the lock.'],
  ]),
  step('A connection pool of 20. What must every caller do?', [], 0, [
    ['Return the connection on every path — try-with-resources over a Lease', 'Right. Each missed return is a permanent leak; enough leaks and every borrow times out.'],
    ['Close the connection when done', 'Closing a pooled connection destroys the thing the pool is meant to reuse (real pools wrap connections so close() returns them instead).'],
    ['Nothing — the pool handles it', 'The pool cannot know a borrower has finished unless the borrower says so.'],
  ]),
  step('Where should “exactly one database pool” be decided?', [], 2, [
    ['In ClinicDbPool, with a private constructor and DCL', 'That works, but every user now reaches for a global, and tests cannot replace it.'],
    ['In each service, by checking whether a pool already exists', 'That is the scattered decision the chapter removes.'],
    ['In the composition root: build one, pass it to every service', 'Right. A singleton by scope — one line in one method.'],
  ]),
];
