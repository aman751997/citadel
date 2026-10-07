import { row, step } from '../../lib/trace.ts';

// Labels for every "Your turn" HintLadder in the LLD wing.
export const turn: [string, string, string, string] = ['A small nudge', 'Name the classes', 'The key interaction', 'Compare with the Java design'];

export const hints: Record<string, [string, string, string]> = {
  srp: [
    'List the people who could ask for a change to this class: who decides the ticket rules, who designs receipts, who runs the database?',
    'ParkingTicket (the rules: open, close, guards), ReceiptRenderer (layout), TicketRepository (storage) with an in-memory implementation.',
    'The ticket keeps close() and its two guards — those are invariants. Rendering reads the ticket through getters; the repository stores and finds it by id.',
  ],
  ocp: [
    'Which existing class would you have to open to add this rule? Can a new class do the job instead?',
    'A new FeeStrategy implementation (grace period, then hourly) and a new wiring method. Nothing else.',
    'If minutes ≤ grace, the fee is 0; otherwise startedHours × rate. Wire it in for BIKE only; CAR and EV keep their strategies.',
  ],
  lsp: [
    'The replica cannot honour save(). So stop asking it to promise save().',
    'Two role interfaces: TicketReader (find) and TicketWriter (save). The primary store implements both; the replica implements only TicketReader.',
    'Clients take the narrowest role they need: an audit takes a TicketReader, closing a ticket takes a TicketWriter. Passing a replica to a writer becomes a compile error.',
  ],
  isp: [
    'What is the one thing the receipt desk ever asks of the notification system?',
    'ReceiptDesk depends on EmailSender — not on the vendor client, not on a combined notifier.',
    'Constructor-inject the EmailSender; sendReceipt builds a subject and body and calls email() once. The test fake is a lambda.',
  ],
  dip: [
    'Which two things make the ticket unpredictable? Each is a dependency, just like a payment vendor.',
    'A TicketIds interface (production: random UUIDs; tests: sequential), plus java.time.Clock for the time. EntryGate receives both.',
    'issue() asks ids.next() for the id and LocalDateTime.now(clock) for the time. Tests pass SequentialTicketIds and Clock.fixed.',
  ],
  surge: [
    'Surge does not replace a pricing rule; it modifies whatever rule already applies. What pattern wraps an object and keeps its interface?',
    'WeekendSurge implements FeeStrategy and holds another FeeStrategy. A new wiring method wraps each existing strategy.',
    'Ask the wrapped strategy for its fee, then scale it by percent / 100 when the entry day is Saturday or Sunday. Integer rupees, rounded down.',
  ],
  csv: [
    'Formatting already lives in one class. What does a second format need that one format did not?',
    'An interface ReportFormat; the old formatter becomes PlainTextFormat; a new CsvFormat; the flow takes a ReportFormat.',
    'ShiftReportFlow asks the format to render (day, tickets, total) and mails the result. TicketLog, RevenueTotals and Mailer do not change.',
  ],
  vendor: [
    'Which class in the garage is allowed to know that CoinVault exists?',
    'CoinVaultAdapter implements the domain’s PaymentGateway and holds the vendor’s API object; one new wiring method builds CheckoutService with it.',
    'Translate both ways inside the adapter: rupees to a "60.00" string on the way out, status 200 to approved (anything else to declined) on the way back.',
  ],
  overstay: [
    'Throwing on a long stay breaks the promise “accepts every valid session”. What can the fee do instead?',
    'OverstayPenalty is a decorator: it implements FeeStrategy and wraps the EV strategy, with a limit in minutes and a penalty.',
    'Return base fee + (minutes > limit ? penalty : 0). The fee only jumps up at the limit, so it stays never-negative and never-decreasing.',
  ],
};

export const srp = [
  step('Describe ShiftReport in one sentence: “It loads the day’s tickets, adds up revenue, lays out the text and emails Bram.” How many reasons to change does it have?', [], 2, [
    ['One — it is one feature, the shift report', 'A feature is not a responsibility. Finance, Bram, IT and the database owner can each ask for a change on a different day for a different reason, and all four edit the same file.'],
    ['Two — business logic and I/O', 'Closer, but finance’s arithmetic and Bram’s layout are both “logic” and change for different people. Split by who asks, not by layer.'],
    ['Four — storage, arithmetic, layout and delivery', 'Right. Four actors could each ask for a change, so the split gives each one its own class, plus a thin coordinator.'],
    ['Seven — one per method', 'SRP is not one method per class. Methods that change for the same actor belong together.'],
  ]),
  step('After the split, finance asks for refunded tickets to be excluded from revenue. Which class changes?', [], 1, [
    ['ShiftReportFlow', 'If the flow changes for a finance rule, it has started deciding instead of coordinating. Its only reason to change is the order of the steps.'],
    ['RevenueTotals, and nothing else', 'Right. One actor, one class. ReportFormatter, Mailer and TicketLog don’t know refunds exist.'],
    ['RevenueTotals and ReportFormatter', 'The formatter prints whatever total it is given. It does not need to know how the total was computed.'],
    ['All of them — refunds touch everything', 'That was true of the mess. After the split, only the arithmetic changes.'],
  ]),
  step('ShiftReportFlow calls four other classes. Is that an SRP violation?', [], 0, [
    ['No — coordinating the sequence is its one responsibility', 'Right. A coordinator is allowed to exist. It becomes a violation the moment it also makes business decisions, like filtering refunds.'],
    ['Yes — a class with four collaborators does four things', 'Counting collaborators doesn’t measure responsibilities. The flow does one thing: run the steps in order.'],
    ['Yes — it should be merged back with RevenueTotals', 'Merging would give it finance’s reason to change again. That is the mess you started from.'],
  ]),
];

export const ocp = [
  step('The grader asks “now add weekend surge pricing”. Your fee logic is an if/else ladder over vehicle type inside ParkingLot. What does the request expose?', [], 3, [
    ['Nothing — one more else-if is fine at this scale', 'The round is designed around this follow-up. Landing it as another branch inside ParkingLot is exactly what the extensibility question is grading.'],
    ['An OCP violation: pricing variation should be a strategy object, so the feature lands as a new class, not edits', 'True, but not the whole answer. Ask why the ladder lives inside ParkingLot at all.'],
    ['An SRP violation: ParkingLot should not compute fees at all', 'True, but also not the whole answer. Even outside ParkingLot, a ladder would still need editing for every new rule.'],
    ['Both: fee calculation is its own responsibility, and the pricing axis should be open', 'Right. The ladder inside ParkingLot fails twice. Extract a FeeStrategy: ParkingLot asks, strategies decide, and surge becomes a decorator.'],
  ]),
  step('Bram wants trucks at 40 an hour. With the strategy map, what changes?', [], 1, [
    ['FeeCalculator.fee() gets a new branch for TRUCK', 'Then FeeCalculator is a ladder again. It only looks up a strategy; it never needs to know which types exist.'],
    ['One enum constant and one wiring line — new HourlyFee(40)', 'Right. Trucks differ from cars only in data, so the existing HourlyFee class serves them. No working behaviour is reopened.'],
    ['A new TruckFee class, plus edits to HourlyFee', 'A new class is unnecessary when only the rate differs, and HourlyFee should never need editing for a new vehicle.'],
    ['Nothing at all', 'Something must say that trucks exist and what they pay: the enum and the composition root. OCP keeps behaviour closed, not the wiring.'],
  ]),
  step('The interviewer never hinted that spot allocation varies. Should SpotAllocator get an interface and a strategy too?', [], 2, [
    ['Yes — every class should be open for extension', 'Making everything pluggable is speculative generality. It costs time and adds interfaces with one implementation, which graders mark down.'],
    ['Yes — interfaces make the code look more professional', 'Graders count unearned interfaces against you. Each one should have a second implementation, a test double, or a stated reason.'],
    ['No — close the axis that was signalled, keep this concrete, and say so', 'Right. “I’ll keep allocation concrete until you tell me it varies” shows judgement. If it does vary later, extracting the interface then is a small edit.'],
  ]),
];

export const lsp = [
  step('stretch(r) calls r.setWidth(5), then r.setHeight(4), then returns r.area(). What does it return for a Square?', [
    row('Call', ['setWidth(5)', 'setHeight(4)', 'area()']),
  ], 1, [
    ['20', 'That is what the caller expects from any Rectangle. Square’s setHeight(4) also sets the width to 4.'],
    ['16', 'Right. setWidth(5) makes it 5 × 5; setHeight(4) makes it 4 × 4. The postcondition “height unchanged by setWidth, width unchanged by setHeight” is broken.'],
    ['25', 'That would be the state after setWidth(5) alone. setHeight(4) then resizes both sides.'],
    ['It throws', 'Nothing throws, which is what makes this bug dangerous. The program runs and gives a wrong answer.'],
  ]),
  step('LoyaltyFee returns startedHours × 20 − 30. For a 20-minute car stay, what does it return, and which promise breaks?', [], 1, [
    ['0 — fine', 'One started hour is 20, and 20 − 30 is −10, not 0. Clamping to zero is the repair (MemberFee), not what this class does.'],
    ['−10 — it weakens the postcondition “never negative”', 'Right. Callers such as the pay-on-foot machine rely on that promise. The repair keeps the discount inside the contract with Math.max(0, …).'],
    ['−10 — it strengthens a precondition', 'It accepts every session, so the precondition is unchanged. It is the guarantee about the result that got weaker.'],
    ['20 — the discount only applies after the first hour', 'Nothing in the code says that. Read the formula: 1 × 20 − 30.'],
  ]),
  step('ChargingCapFee throws for EV sessions over 8 hours. A 9-hour session is valid. Which rule does it break?', [], 0, [
    ['It strengthens the precondition: it demands more from callers than FeeStrategy does', 'Right. Code written against FeeStrategy — the exit barrier — is entitled to pass any valid session. A subtype may accept more, never less.'],
    ['It weakens the postcondition', 'It never returns a bad value; it refuses to return at all. The extra demand is on the input side.'],
    ['None — throwing is always allowed for unchecked exceptions', 'The compiler allows it, which is exactly why LSP bugs ship. The contract, not the compiler, says what a caller can rely on.'],
  ]),
  step('CachedUserRepo extends DbUserRepo, but its find() can return stale users, where DbUserRepo documented “always current”. Which principle is violated, and why?', [], 1, [
    ['DIP — the cache should be injected', 'Injection is a fine way to wire a cache, but it is not what is broken. The subtype quietly changed what find() guarantees.'],
    ['LSP — the subclass weakens a guarantee callers rely on, so substitution silently changes behaviour', 'Right. The parent promised currency; the child delivers staleness, with no compile error. Fix: make staleness part of a separate contract (a CachedReader port), or compose the cache in front.'],
    ['ISP — the interface is too fat', 'The interface could be one method and the problem would remain. It is about what the method promises.'],
    ['None — caching is an implementation detail', 'Staleness is visible to every caller. A documented guarantee that the subtype breaks is not an implementation detail.'],
  ]),
];

export const composition = [
  step('CountingTicketSet extends HashSet and overrides both add (offered++) and addAll (offered += size). After addAll of 3 new tickets, what is offered?', [
    row('Batch', ['T-1', 'T-2', 'T-3']),
  ], 2, [
    ['3', 'That is what the author intended. But the inherited addAll calls add() once per element, and add() is overridden too.'],
    ['0', 'Both overrides increment the counter, and both run.'],
    ['6', 'Right. Your addAll adds 3, then HashSet’s inherited addAll calls your add three times. The subclass depended on how its parent calls itself.'],
    ['It throws ConcurrentModificationException', 'Nothing is modified while iterating the batch. The bug is silent double counting.'],
  ]),
  step('Which fix removes the dependency on HashSet’s internals?', [], 1, [
    ['Delete the addAll override', 'It works today, because the inherited addAll calls your add. But that relies on exactly the internal self-call that caused the bug; if it changed, batch imports would count 0.'],
    ['Hold a HashSet in a private field and forward add and addAll to it', 'Right. Composition: the set’s internal calls to its own add never reach your counter, whatever HashSet does inside.'],
    ['Extend LinkedHashSet instead', 'Same inheritance, same inherited addAll. Changing the parent doesn’t remove the dependency on its self-use.'],
  ]),
];

export const isp = [
  step('The alerts squad’s fake GarageNotifier has 14 methods, 13 of which throw UnsupportedOperationException. What is the cut?', [], 1, [
    ['Give the 13 methods empty bodies instead of throwing', 'That hides the symptom. The client still depends on 14 methods, and every new method still breaks every implementation.'],
    ['One role interface per client need: SmsSender, EmailSender, PushSender', 'Right. GateAlerts depends on SmsSender only, so its fake is one method — a lambda.'],
    ['An abstract base class with default implementations of all 14', 'Every client still sees all 14 methods, and the defaults lie about what the object can do.'],
  ]),
  step('SignalHutClient can send both SMS and push. Under ISP, may one class implement both SmsSender and PushSender?', [], 0, [
    ['Yes — ISP limits what clients see, not what classes implement', 'Right. GateAlerts sees only SmsSender even when the object behind it can also push.'],
    ['No — each class should implement exactly one interface', 'That would force one vendor to be split into two classes for no reason. Role interfaces are about clients.'],
    ['Only if SmsSender extends PushSender', 'Then every SMS client would see push. That is the fat interface again.'],
  ]),
  step('How many methods does a test fake for GateAlerts need to implement?', [], 0, [
    ['One — it is a lambda', 'Right. SmsSender has one method, so (phone, text) -> sent.add(...) is the whole fake.'],
    ['Three — one per role interface', 'GateAlerts only receives an SmsSender. The other roles are invisible to it and to its test.'],
    ['Fourteen', 'That was the old interface. The cut removed the methods this client never calls.'],
  ]),
];

export const dip = [
  step('Why is “new PennyPayClient() inside CheckoutService” worse than verbose — what concretely breaks?', [], 1, [
    ['Performance: constructing SDK clients is slow', 'That can be cached. The real damage is to testing and to the direction of dependencies.'],
    ['Tests cannot replace the gateway, a vendor swap edits domain code, and the stable layer depends on the volatile one', 'Right. DIP is about the direction of the arrow: business rules should not know vendor names. Testability is the visible symptom; the arrow is the disease.'],
    ['The vendor forbids direct construction', 'No vendor rule is involved. The problem is in the design.'],
    ['Nothing breaks if PennyPayClient is stateless', 'Stateless or not, tests still hit the real vendor and the domain still imports its SDK.'],
  ]),
  step('Who should own the PaymentGateway interface?', [], 0, [
    ['The domain — it is written in the garage’s words, and the vendor adapter implements it', 'Right. That ownership is the inversion: the vendor side now depends on the domain, not the other way round.'],
    ['The vendor SDK — it knows the payment API best', 'Then the domain imports the vendor package, and switching vendors still edits domain code.'],
    ['A shared utilities package', 'Ownership by a neutral package hides the question. The abstraction should be shaped by the code that needs it.'],
  ]),
  step('The clock is fixed at 18:00 and a car entered at 15:30. CheckoutService uses standardTariff(). What does FakeGateway record?', [
    row('Session', ['15:30', '18:00']),
  ], 2, [
    ['T-17:50', '150 minutes is 3 started hours (any part of an hour is billed), not 2.5.'],
    ['T-17:40', '2 hours would ignore the extra 30 minutes. Every started hour is billed.'],
    ['T-17:60', 'Right. (150 + 59) / 60 = 3 started hours × 20 = 60, and the fixed clock makes this the answer at any time of day.'],
    ['Nothing — the fake does not record', 'FakeGateway records every charge as ticketId:amount. That is how the test checks it.'],
  ]),
  step('Which of these belongs in CheckoutService’s constructor?', [], 0, [
    ['The Clock', 'Right. Time is nondeterministic, so it is a dependency: inject it and tests can fix it.'],
    ['The ArrayList it collects line items in', 'A plain data structure with no I/O and no variation. Creating it with new is fine.'],
    ['A StringBuilder for the receipt text', 'Pure, deterministic, local. Injecting it adds a parameter and gains nothing.'],
    ['Duration.between, wrapped in an interface', 'A pure function from the JDK. Wrapping it is ceremony; tests can already predict it.'],
  ]),
];

export const dials = [
  step('In ShiftReport, db is used only by load(); smtpHost and smtpPort only by send(); the totals and layout use neither. What does that pattern tell you?', [
    row('Fields', ['db', 'smtpHost', 'smtpPort'], { 0: 'load()', 1: 'send()', 2: 'send()' }),
  ], 0, [
    ['Low cohesion: several classes are sharing one body', 'Right. Method groups that never touch each other’s fields are the visible form of several responsibilities.'],
    ['High coupling: the class depends on too many others', 'Coupling is about what a module knows of other modules. This is about how little its own parts have in common.'],
    ['Nothing — private methods are an implementation detail', 'The field-usage islands are precisely the evidence for the split.'],
  ]),
  step('Changing the hourly rate rule forced edits in six classes, each with its own copy of the arithmetic. Which smell, and which way do you move?', [], 1, [
    ['Divergent change — split the classes further', 'Divergent change is one class changing for many reasons. Here one reason changes many classes, and splitting further would make it worse.'],
    ['Shotgun surgery — gather the scattered responsibility into one place', 'Right. One reason to change should live in one class. This is the over-split side of SRP.'],
    ['Low coupling — nothing to fix', 'Six classes all knowing the rate arithmetic is coupling by duplication. It must change in six places at once.'],
  ]),
];

export const round = [
  step('Minute 40 of 90. Your ParkingLot class has started computing fees and formatting receipts. What do you do?', [], 2, [
    ['Keep going silently; refactor at the end if there is time', 'There is rarely time at the end, and the grader never hears that you noticed. Detection is what earns credit.'],
    ['Stop and recite the SOLID definitions to show you know them', 'Definitions earn nothing. The grader wants to see the move.'],
    ['Say “this is picking up a second reason to change” and pull fees out now', 'Right. Narrating the detection and making a two-minute split is exactly what the design score rewards.'],
  ]),
  step('The follow-up arrives: weekend surge pricing. Which landing earns full extensibility credit?', [], 0, [
    ['One new decorator class around the existing strategies, plus one wiring change', 'Right. Nothing that already worked reopens, and the contract test still passes.'],
    ['A weekend flag added to every fee strategy', 'That edits every existing strategy and forces every future one to remember the flag.'],
    ['An if (isWeekend) branch inside ParkingLot.unpark()', 'This puts pricing back inside ParkingLot and reopens the core flow.'],
  ]),
  step('Ten minutes left. You have seven interfaces, each with one implementation and no test double. What does the grader see?', [], 1, [
    ['Professional, extensible design', 'Interfaces with nothing standing in for them are speculative generality; they cost time and add indirection.'],
    ['Over-engineering — interfaces that haven’t earned their place', 'Right. Keep the ones with a second implementation, a fake, or a stated reason, and say you would inline the rest.'],
    ['Nothing — interfaces are free', 'Each costs reading time for the grader and minutes for you. More interfaces than implementations is a named smell.'],
  ]),
];

export const drills = [
  step('A NotificationService has sendSms, sendEmail and a 200-line retry engine. The retry rules change every sprint; the senders change yearly. Which principle, and what cut?', [], 2, [
    ['ISP — split the interface into SmsSender and EmailSender', 'Possibly useful, but the loudest problem is that retry rules and sending change for different reasons inside one class.'],
    ['OCP — add a strategy for each channel', 'Channels are not what is changing every sprint. Close the axis that actually moves.'],
    ['SRP — the retry policy is its own responsibility; extract it', 'Right. Two different rates of change are two reasons to change. The retry policy becomes its own class (and perhaps a decorator around a sender).'],
    ['DIP — inject the retry engine', 'Injection is how you would wire the extracted class, not the reason to extract it.'],
  ]),
  step('ReadOnlyRepo extends Repo and throws UnsupportedOperationException from save(). Callers now check instanceof before saving. Best fix?', [], 1, [
    ['Catch the exception everywhere save() is called', 'That spreads knowledge of one subtype through every caller — the instanceof problem in a different costume.'],
    ['Split the contract: a Reader role and a Writer role; the read-only store implements only Reader', 'Right. Every implementation can honour everything it claims, and a misuse becomes a compile error.'],
    ['Make save() silently do nothing in ReadOnlyRepo', 'Worse than throwing: callers believe the data was saved. That weakens the postcondition invisibly.'],
  ]),
  step('Your checkout test passes in the morning and fails in the evening. Most likely cause and fix?', [], 0, [
    ['LocalDateTime.now() inside business logic — inject a Clock and fix it in tests', 'Right. Time is a dependency. Clock.fixed makes the fee deterministic.'],
    ['A race condition — add synchronized', 'Nothing here is concurrent. The input that changes with the time of day is the clock.'],
    ['The test is flaky — retry it three times', 'Retrying hides a real dependency on wall-clock time; it will fail again at the wrong moment.'],
  ]),
  step('Bram: “EV owners can choose between two charging speeds, priced differently.” With FeeStrategy in place, what do you need?', [], 2, [
    ['A new branch in FeeCalculator for EV speed', 'That reopens the calculator and turns it back into a ladder.'],
    ['A FastEv subclass of HourlyPlusChargingFee overriding fee()', 'Subclassing a concrete strategy couples you to its internals; and if only the rates differ, a subclass is a constructor argument wearing a hierarchy.'],
    ['Pick the strategy by (type, speed) — e.g. two HourlyPlusChargingFee instances with different rates — and wire it at the root', 'Right. If the difference is data, it’s two instances of one class; the lookup key gains the speed. No existing behaviour changes.'],
  ]),
  step('An interviewer asks: “Why not make every class implement an interface, just in case?”', [], 1, [
    ['Agree — interfaces are always more flexible', 'Unearned interfaces cost time and indirection and are graded as over-engineering.'],
    ['Interfaces go where something stands in: a second implementation, a test fake, or a vendor/clock boundary', 'Right. Everything else stays concrete until a second variant appears, and extracting the interface then is cheap.'],
    ['Disagree — interfaces slow the JVM down', 'Performance is not the argument. Design clarity and cost are.'],
  ]),
  step('Which subtype keeps FeeStrategy’s contract (never negative, never decreasing, accepts every valid session)? h is the number of started hours.', [], 0, [
    ['max(0, h×20 − 30)', 'Right. MemberFee: a floor at zero keeps it non-negative, and the maximum of a non-decreasing function and a constant is still non-decreasing.'],
    ['h×20 − 30', 'Negative for short stays: 0 started hours gives −30. It weakens a postcondition.'],
    ['flat 50 after 3 h', 'Three hours cost 60, three hours and five minutes cost 50: staying longer cost less.'],
    ['throws after 8 h', 'A 9-hour session is valid. Throwing strengthens the precondition.'],
  ]),
];
