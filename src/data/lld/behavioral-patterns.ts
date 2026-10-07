import { row, step } from '../../lib/trace.ts';

// Hints for every "Your turn" and side-quest HintLadder in src/lld-lessons/behavioral-patterns.mdx.
// Every number quoted below is checked in tests/java/behavioral-patterns/Check.java.
export const hints: Record<string, [string, string, string]> = {
  discounts: [
    'Each category is a rule that turns a total into a new total. How small can one rule be?',
    'An enum PatientCategory and a Map from category to LongUnaryOperator. Each lambda is a whole strategy.',
    'GENERAL returns the total; SENIOR subtracts total / 10; STAFF subtracts min(total / 4, 50 000 paise). Integer division rounds each discount down.',
  ],
  stock: [
    'Which steps of ReportJob does a stock report need to change, and which hook did the base class leave open on purpose?',
    'PharmacyStockReport extends ReportJob<StockRow>. It fills fetch and render, and overrides the optional transform hook.',
    'transform keeps rows with fewer than 10 units, lowest first. run() is final, so the audit still happens without the subclass mentioning it.',
  ],
  apptStates: [
    'Confirming now reserves a slot; checking in assigns a room. Where does behaviour that depends on the current state belong?',
    'An ApptState interface whose default methods throw, and one class per state: Requested, Confirmed, CheckedIn, Completed, Cancelled.',
    'Each legal event is an override that does its side effect and returns the next state. Appointment just does state = state.confirm(this). Terminal states override nothing.',
  ],
  reschedule: [
    'Undo must put the appointment back where it was. What does the command have to remember from execute()?',
    'RescheduleAppointment implements Command, holding the scheduler, the id, the new slot, and the Appointment as it was before the move.',
    'execute(): before = scheduler.move(id, newSlot). undo(): scheduler.move(id, before.slot()). The receiver already refuses a busy slot.',
  ],
  bounded: [
    'A history that never forgets is a memory leak with a nice name. What do you drop when it is full?',
    'BoundedDraftHistory: the same caretaker, plus a limit. Snapshots still come from draft.save() and go back through draft.restore().',
    'push the new snapshot; if size > limit, removeLast() forgets the oldest. undo() pops the newest, exactly as before.',
  ],
  oneShot: [
    'The listener has to leave the list while the list is delivering to it. Which list makes that safe?',
    'FollowUpScheduler keeps the Runnable that subscribe() returned, plus an AtomicBoolean so it fires at most once even with asynchronous delivery.',
    'In the listener: if compareAndSet(false, true) fails, return; otherwise record the follow-up and run the unsubscribe handle.',
  ],
  rules: [
    'Each rule can veto. The first veto is the answer, and nothing after it should run.',
    'An abstract BookingRule that holds the next rule; PatientKnown, DoctorOnShift and SlotFree fill in problemWith().',
    'check(): ask this rule; if it found a problem, or there is no next rule, return; otherwise return next.check(form). then() links rules and returns the next one so calls chain.',
  ],
  chat: [
    'Members must never hold references to each other. Who decides who hears a message?',
    'ChatRoom is the mediator: it holds the members and the muted set. Member keeps a reference to the room and an inbox.',
    'member.say(text) calls room.send(this, text). The room skips the sender, and a muted sender is told so instead of being heard.',
  ],
  slots: [
    'An Iterable can be a lambda that returns a fresh Iterator. Nothing needs to be stored up front.',
    'slots(first, end, step) returns () -> new Iterator<LocalTime>() { ... } holding only the next time and a done flag.',
    'next() returns the current time, steps forward, and marks done if the new time is not after the current one (it wrapped past midnight) or is not before end.',
  ],
  exempt: [
    'A new operation over the bill tree. Which existing classes should you need to open?',
    'ExemptItems implements BillVisitor<List<String>>. No node class changes.',
    'visitItem returns the name when the item is not taxable, else an empty list; visitBundle concatenates its children’s answers in order.',
  ],
  percent: [
    'Percentages are extra input that the other rules do not need. Where does extra input go without fifteen overloads?',
    'A SplitRequest parameter object (total, parties, percentages); SplitStrategy.split takes it; PercentSplit is a new class.',
    'Floor each exact share, then hand the leftover paise to the shares with the largest rounding remainder. A 0% party can never receive one.',
  ],
  maintenance: [
    'A new state, and two new events. Which states gain an edge, and which keep refusing?',
    'Maintenance implements VendingState. The interface gains openPanel() and closePanel() as defaults that throw; Idle and SoldOut override openPanel().',
    'Maintenance allows restock and closePanel; closePanel returns Idle if anything is in stock, else SoldOut. HasCredit keeps the default: refund first.',
  ],
  macro: [
    'Two commands, one undo step. And if the second one fails, the first must not stay done.',
    'MacroCommand implements Command and holds a list of commands — a Composite of commands.',
    'execute() runs the steps in order and counts them; on failure it undoes the completed ones in reverse and rethrows. undo() runs every step’s undo in reverse.',
  ],
  audit: [
    'The auditor needs to know who asked and how it ended. Which handler produces “who”, and which ones produce “how it ended”?',
    'AuditHandler implements Handler. It goes after AuthHandler and before everything else, in a new assembly method.',
    'Call chain.proceed(r) first, then log the user and the response status. Vetoes from later handlers come back through it, so it sees 400 and 429 as well as 200.',
  ],
  discount: [
    'A new kind of node. Which classes must change, and which tool tells you about every one of them?',
    'A Discount record joins the sealed BillLine; BillVisitor gains visitDiscount; every visitor implements it.',
    'TotalVisitor subtracts the discount; TaxVisitor returns 0 for it. The Java 17 instanceof version compiles without a Discount branch — it only fails at runtime.',
  ],
};

export const strategy = [
  step('Equal-split of ₹100.00 (10 000 paise) across 3 family members. What must your Strategy get right that naive division misses?', [], 1, [
    ['Use double division for accuracy', '10000 / 3.0 is 3333.333…, which no one can pay. Doubles also bring binary rounding drift into money — the reason you used paise in the first place.'],
    ['Integer minor-unit division leaves a remainder (3334 + 3333 + 3333 paise) — assign it deterministically so shares sum exactly to the total', 'Right. Money conservation is the hidden invariant graders test with “does it sum back?”. EqualSplit gives the first `total % n` parties one extra paisa.'],
    ['Round every share up to be safe', '3334 × 3 = 10 002. Rounding up overcharges the family by 2 paise — the shares no longer sum to the bill.'],
    ['Store shares as percentages instead', 'A percentage still has to become paise at some point, and the same remainder appears then.'],
  ]),
  step('Insurance-first: the bill is 100 001 paise, the policy cap is 40 000 paise, and two family members share the rest equally. What are the three shares?', [
    row('Parties', ['Insurer (cap 40 000)', 'Asha', 'Ravi']),
  ], 2, [
    ['Insurer 100 001; family 0 and 0', 'The insurer pays only up to its cap. min(100 001, 40 000) = 40 000.'],
    ['Insurer 40 000; family 30 000 and 30 000', 'That sums to 100 000. The extra paisa has to go somewhere, or the bill does not balance.'],
    ['Insurer 40 000; Asha 30 001; Ravi 30 000', 'Right. The remaining 60 001 goes to EqualSplit, which hands its one leftover paisa to the first party. Strategies composed.'],
    ['Insurer 40 000; Asha 30 000; Ravi 30 001', 'The sum is right, but EqualSplit gives the extra paisa to the first party, deterministically. “Last absorbs the remainder” is also legal — but it is not what this code does.'],
  ]),
  step('Finance adds a fourth rule: “the account holder pays everything”. With the strategy registry in place, what changes?', [], 1, [
    ['A new branch in BillSplitter.split()', 'Then BillSplitter is an if-ladder again. It only looks up a strategy by type; it never knows which rules exist.'],
    ['One enum constant and one wiring line — and the rule can be a one-line lambda', 'Right. A strategy interface with one method is a functional interface, so (total, parties) -> List.of(new Share(parties.get(0), total)) is a complete strategy.'],
    ['A new subclass of EqualSplit', 'Paying everything is not a kind of equal split. Inheriting from a concrete strategy couples the new rule to the old one’s internals.'],
  ]),
  step('When should a lambda strategy be promoted to a named class?', [], 2, [
    ['Never — lambdas are always more modern', 'A 20-line lambda with its own guards and no name is harder to read, test and find in a stack trace than a class.'],
    ['Always — interviews want classes', 'One-line rules as lambdas read well and graders accept them. Ceremony is not a virtue.'],
    ['When it needs a name in stack traces, its own tests, injected dependencies, or more than a few lines', 'Right. Small, pure, stateless rules stay lambdas; anything with configuration, collaborators or real logic earns a class.'],
  ]),
];

export const template = [
  step('Five copy-pasted report jobs drifted, and one stopped writing its audit line. In ReportJob, which choice makes skipping the audit impossible for a subclass?', [], 0, [
    ['run() is final and deliver() is private', 'Right. A subclass cannot override the sequence, and cannot even see the step that audits.'],
    ['deliver() is abstract', 'Then every subclass must write its own delivery — and can forget the audit inside it. That is the drift you started with.'],
    ['A comment saying “always call deliver()”', 'Comments do not compile. The copy-pasted jobs had the same intention.'],
  ]),
  step('Three reports share a sequence, and each differs only in a one-line fetch and a one-line render. No shared state, no extra hooks. Template Method or Strategy?', [], 1, [
    ['Template Method — the sequence is fixed, so inherit it', 'It works, but three subclasses for two one-liners each is ceremony. Inheritance also fixes the choice at compile time.'],
    ['Strategy — a final runner that takes the two steps as functions', 'Right. With tiny steps, composition wins: ReportRunner.run(name, day, fetch, render). Choose Template Method when hooks are several, optional, or need protected shared state.'],
    ['Neither — copy-paste is fine for three', 'Copy-paste is exactly how one report lost its audit.'],
  ]),
  step('Which statement about Template Method versus Strategy is true?', [], 2, [
    ['Template Method uses composition; Strategy uses inheritance', 'Backwards. Template Method fills holes by subclassing; Strategy passes an object (or lambda) in.'],
    ['Strategy can only vary one step', 'A strategy object can carry several methods, and a runner can take several strategies.'],
    ['Template Method fixes the variation when the class is written; Strategy can swap it at runtime', 'Right. A DailyRevenueReport is always a revenue report. A runner can be handed a different fetch on every call.'],
  ]),
];

export const state = [
  step('Appointment lifecycle: 5 states, no per-state behaviour beyond names. State-per-class or enum + transition table?', [], 1, [
    ['Always state-per-class — it is the named pattern', 'Five classes that differ only by which arrows leave them is ceremony. The pattern is the guarded transition, not the class count.'],
    ['Enum + explicit legal-moves table here (less code, same safety); state-per-class when states carry distinct behaviour. Either way, transitions validate in one gate', 'Right. Calibration beats pattern-worship. Drill 3 in the War Room makes you build both to feel the crossover.'],
    ['Always enum — classes are overkill in interviews', 'When each state does different work (reserve a slot, assign a room, start billing), switches on the enum spread through every method. That is when classes earn their keep.'],
    ['If-else inside each method, refactor later if asked', 'Scattered checks are how a COMPLETED appointment went back to CONFIRMED and was re-billed.'],
  ]),
  step('A COMPLETED appointment receives cancel(). What happens?', [
    row('Status', ['REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'], { 3: 'NOW' }, { tones: { 3: 'hot' } }),
  ], 2, [
    ['It becomes CANCELLED', 'No arrow leaves COMPLETED in the table. A completed visit cannot be cancelled — that is the re-billing bug made impossible.'],
    ['Nothing — it is silently ignored', 'Silent ignoring hides bugs in callers. The gate throws so the caller learns it asked for something illegal.'],
    ['IllegalStateException, and the status stays COMPLETED', 'Right. transition() checks before it assigns, so a refused event changes nothing.'],
  ]),
  step('Vending machine, A1 costs 25 and is the last item in the machine. Insert 10, insert 10, select A1. What does the display say, and which state is the machine in?', [
    row('Events', ['insert 10', 'insert 10', 'select A1']),
  ], 1, [
    ['“enjoy your A1”, Idle', 'Credit is 20 and the price is 25. Nothing is dispensed yet.'],
    ['“insert 5 more”, HasCredit', 'Right. HasCredit.select() checks credit against price, shows the shortfall, and returns itself.'],
    ['IllegalStateException', 'select is legal in HasCredit. Not having enough money is a normal outcome, not an illegal transition.'],
    ['“insert 5 more”, Idle', 'The 20 in credit is still in the machine, so it must stay in HasCredit — otherwise the customer’s coins vanish.'],
  ]),
  step('Then insert 10 more and select A1 again. What happens?', [
    row('Credit', ['30']),
  ], 0, [
    ['A1 is dispensed, 5 is returned, and the machine goes to SoldOut', 'Right. 30 − 25 = 5 change, credit back to 0, and total stock is now 0, so HasCredit returns a SoldOut state. Coins are refused from now on.'],
    ['A1 is dispensed, 5 is returned, and the machine goes to Idle', 'Idle promises there is something to sell. A1 was the last item, so the next state is SoldOut.'],
    ['A1 is dispensed and the 5 stays as credit', 'The machine returns change on a sale; keeping credit would leave it in HasCredit with nothing to sell.'],
  ]),
];

export const command = [
  step('Why does BookAppointment keep the `booked` field — why can’t undo() just be a fresh cancel call built from the request?', [], 1, [
    ['Performance — caching avoids a lookup', 'The point is correctness, not speed. A request does not even contain the appointment’s id.'],
    ['The command must remember what its own execution did (the appointment it created, with its id and slot) — undo reverses that specific effect, not a guess rebuilt from inputs', 'Right. Between execute and undo the world moved. Undo targets the exact effect this command produced — and redo re-books that same appointment, same id.'],
    ['Java requires commands to be stateful', 'Java requires nothing of the kind. Commands that never undo can be stateless.'],
    ['It cannot — undo() should rebuild from the request', 'The request says “Asha with Dr Rao at 10:00”. If two such appointments exist, which one is this command’s?'],
  ]),
  step('Run Book(Asha, 10:00) → A-1. Run Book(Ravi, 11:00) → A-2. Undo. Run Cancel(A-1). Now press redo. What happens?', [
    row('Undo stack', ['Book A-1', 'Cancel A-1']),
    row('Redo stack', ['(cleared)']),
  ], 2, [
    ['Ravi’s booking A-2 comes back', 'It was on the redo stack — until a new command ran. A new action forks history, and the old future is gone.'],
    ['Asha’s cancellation is redone', 'Cancel(A-1) is on the undo stack, not the redo stack. Redo only replays what was undone.'],
    ['Nothing: redo() returns false and the schedule stays empty', 'Right. run() clears the redo stack. This is how every editor behaves: type after undoing, and redo is gone.'],
  ]),
  step('A queued “book Asha at 10:00” command is delivered twice because the first acknowledgement was lost. How do you stop a double booking?', [], 0, [
    ['Give every command an id and record applied ids together with the effect; a repeated id is a no-op', 'Right. CommandWorker skips ids it has already applied. In production the id goes into the same transaction as the booking, so “applied” and “done” can never disagree.'],
    ['Deliver each command exactly once', 'Over a network, “exactly once delivery” is not available; you get at-least-once delivery plus idempotent processing.'],
    ['Make undo() run automatically after a duplicate', 'Then the first, legitimate booking is cancelled too. Prevent the duplicate instead of compensating for it.'],
  ]),
  step('The front desk’s booking also created an account in another service. Undo must reverse both. What does “undo” mean for the remote part?', [], 1, [
    ['Roll back the database transaction', 'A local transaction cannot reach into another service. The remote account was created and committed over there.'],
    ['A compensating action: call the other service to delete or deactivate what was created', 'Right. Cross-service undo is compensation, not rollback — the War Room’s Saga dossier. The command must remember what it created so it can compensate it.'],
    ['Nothing — remote effects cannot be undone', 'They cannot be rolled back, but they can be compensated. That is a design task, not a shrug.'],
  ]),
];

export const memento = [
  step('LeakyDraft.save() returns its live list. Add "A", save, add "B", restore the saved list (restore does lines.clear() then lines.addAll(saved)). What is in the draft?', [
    row('Draft', ['A', 'B']),
  ], 3, [
    ['["A"]', 'That is what a real snapshot would give. But saved is the same object as lines.'],
    ['["A", "B"]', 'restore() does change the list: clear() empties it first.'],
    ['["A", "B", "A", "B"]', 'clear() runs before addAll(), so there is nothing left to add twice.'],
    ['[] — the undo wipes the whole draft', 'Right. clear() empties the shared list, so addAll(saved) adds nothing. A memento must be a copy, never a view of live state.'],
  ]),
  step('The pharmacist wants “restore this prescription draft to how it was at 10:15”. Memento or Command?', [], 0, [
    ['Memento — restore a state, not reverse an action', 'Right. A snapshot taken at 10:15 is restored as a whole. Command fits when you need to reverse, replay or queue individual actions.'],
    ['Command — every edit becomes an undoable command', 'You could undo every edit since 10:15 one by one, but the request is about a moment in time. Snapshots answer it directly.'],
    ['Neither — store the draft as a string', 'A string is a snapshot without the encapsulation. The originator should decide what a snapshot contains.'],
  ]),
];

export const observer = [
  step('Your Observer fires the feedback SMS inside the same DB transaction that saves the completed appointment. The transaction rolls back. What did the patient receive, and what is the fix?', [], 1, [
    ['Nothing — rollback cancels the SMS too', 'External side effects do not take part in database transactions. The SMS left the building before the rollback.'],
    ['A “how was your visit?” for a visit that never completed; fix: publish after commit (an AFTER_COMMIT listener, or a transactional outbox)', 'Right. Observers that touch the outside world must fire after commit. The outbox pattern is the durable version.'],
    ['A duplicate SMS; fix: idempotency keys', 'Nothing was sent twice. The problem is a message about something that did not happen.'],
    ['The SMS is delayed until commit automatically', 'Only if you asked for it — for example with Spring’s @TransactionalEventListener(phase = AFTER_COMMIT). A plain listener runs immediately.'],
  ]),
  step('NaiveEvents keeps listeners in an ArrayList. Three listeners; the first unsubscribes itself while publish() is looping. What happens?', [
    row('Listeners', ['L0 (leaves)', 'L1', 'L2'], { 0: 'NOW' }, { tones: { 0: 'hot' } }),
  ], 2, [
    ['L1 and L2 run normally', 'The for-each loop is iterating the same ArrayList that L0 just changed.'],
    ['L1 is skipped silently', 'That can happen with two listeners (the loop just stops early). With three, the iterator notices the change first.'],
    ['ConcurrentModificationException on the iterator’s next call — L1 and L2 never run', 'Right. The ArrayList iterator checks its modification count in next(). CopyOnWriteArrayList iterates a snapshot instead, so leaving mid-delivery is safe.'],
  ]),
  step('Each doctor dashboard tab subscribes when it opens. Tabs never unsubscribe. After 1 000 tabs have been opened and closed, how many listeners does the subject hold?', [], 2, [
    ['0 — the garbage collector cleans up closed tabs', 'The subject’s list holds a strong reference to each listener, and each listener captures its tab. Nothing is garbage.'],
    ['1 — only the newest tab', 'Subscribing adds; nothing ever removes.'],
    ['1 000 — every closed tab is still subscribed, and still kept in memory', 'Right. This is the lapsed listener leak. Return an unsubscribe handle from subscribe() and call it on every exit path.'],
  ]),
  step('The listener list is read on every event and changed only when a screen opens or closes. Which list?', [], 0, [
    ['CopyOnWriteArrayList', 'Right. Reads and iteration take no lock and see a snapshot; each write copies the array, which is cheap when writes are rare.'],
    ['ArrayList', 'Not thread-safe, and a listener that unsubscribes during delivery throws ConcurrentModificationException.'],
    ['Collections.synchronizedList(new ArrayList<>())', 'Single calls are synchronized, but iterating still needs a manual synchronized block — and then a listener that unsubscribes mid-loop still breaks the iterator.'],
  ]),
  step('Delivery is synchronous and the SMS listener takes 2 seconds. What does that do to complete()?', [], 1, [
    ['Nothing — listeners run in the background', 'Only if the subject hands them to an executor. Synchronous delivery runs each listener on the caller’s thread.'],
    ['complete() takes at least 2 seconds longer — the publisher waits for every listener', 'Right. Synchronous delivery is simple and ordered, but every listener’s latency is the caller’s latency. An executor makes delivery asynchronous at the price of ordering and error handling.'],
    ['The SMS is skipped after a timeout', 'There is no timeout unless you build one.'],
  ]),
];

export const chain = [
  step('The request pipeline was assembled from an unordered Set and tenant resolution ran after a handler that touched the database. What is the general lesson?', [], 1, [
    ['Sets cannot hold handlers with equal hashCodes', 'The handlers are all different objects. The problem is order, not membership.'],
    ['Chain order is a data dependency — later links consume earlier links’ side effects (the attached user, the resolved clinic); assemble an explicit ordered list in one place, with the dependencies written down', 'Right. That is the War Room dossier: links have invisible dependencies on earlier links’ work.'],
    ['Every handler should re-resolve the tenant defensively', 'Defensive re-resolution hides the design flaw and multiplies work. Make the order explicit — and let a handler fail loudly if its producer did not run.'],
    ['Chains are order-independent by design; the bug was elsewhere', 'Some chains are, many are not. This one is a producer–consumer pipeline.'],
  ]),
  step('Budget: 2 requests per client. kiosk-1 sends, with a valid token: “book 10:00”, an empty body, “book 11:00”, “book 12:00”. What are the four statuses?', [
    row('Order', ['Auth', 'Tenant', 'Validation', 'RateLimit', 'Dispatch']),
  ], 3, [
    ['200, 400, 429, 429', 'The empty body is rejected by Validation, which runs before RateLimit — so it never spends any of the budget.'],
    ['200, 400, 200, 200', 'The fourth request is the third that reaches RateLimit. The budget is 2.'],
    ['200, 429, 200, 429', 'Validation runs before RateLimit, so the empty body gets a 400, not a 429.'],
    ['200, 400, 200, 429', 'Right. Validation short-circuits the empty body before RateLimit counts it; the third request that reaches RateLimit is refused.'],
  ]),
  step('You add an AuditHandler that records “who asked, and the final status”. Where in the chain does it go?', [], 2, [
    ['First, before Auth', 'Before Auth there is no user to record. It would see the request but not who sent it.'],
    ['Last, just before Dispatch', 'Then every request vetoed earlier (400, 429) never reaches it, and the audit silently misses rejections.'],
    ['Right after Auth, calling proceed() first and logging the response it gets back', 'Right. The user is attached by then, and every later veto travels back through it. Unauthenticated requests (401) are not audited — say so out loud, or log them separately.'],
  ]),
];

export const mediator = [
  step('The garage ramp is one lane. Car A is going UP. Car B asks to go DOWN and is told WAIT. Car C now asks to go UP. What does the controller say to C?', [
    row('Ramp', ['A ↑']),
    row('Waiting', ['B ↓']),
  ], 1, [
    ['GO UP — it is going the same way as A', 'Then a steady stream of UP cars could keep B waiting forever. Joining the flow is only allowed when nobody is queued.'],
    ['WAIT — someone is already queued, so C joins the back of the queue', 'Right. FIFO fairness: no car overtakes an earlier waiter. This rule lives in one place — the controller.'],
    ['WAIT, and B is sent back to the start', 'Nobody loses their place. Waiting cars keep their order.'],
  ]),
  step('A leaves the ramp. Which cars are admitted?', [
    row('Waiting', ['B ↓', 'C ↑']),
  ], 0, [
    ['Only B — C is going the other way, so it waits for B to clear', 'Right. The controller admits the head of the queue plus everyone directly behind it going the same way. C goes when B leaves.'],
    ['B and C together', 'They are going in opposite directions on a one-lane ramp.'],
    ['Only C, because UP was already flowing', 'The ramp is empty once A leaves; nothing is flowing. The head of the queue goes first.'],
  ]),
  step('What separates a Mediator from an Observer?', [], 2, [
    ['Mediators are asynchronous; observers are synchronous', 'Either can be either. Timing is not the difference.'],
    ['An observer can have only one subscriber', 'An observer’s whole point is any number of subscribers.'],
    ['A mediator owns the rules for how colleagues interact; an observer subject just announces, and does not care who reacts or how', 'Right. The ramp controller decides who may move. A subject that publishes “appointment completed” makes no decisions for its listeners.'],
  ]),
];

export const iterator = [
  step('RecentScans has capacity 3. The gate scans T-1, T-2, T-3, T-4. What does a for-each loop over it print?', [
    row('Ring', ['T-4', 'T-2', 'T-3'], { 1: 'START' }),
  ], 1, [
    ['T-1, T-2, T-3', 'T-1 was overwritten when T-4 arrived. The buffer keeps the newest three.'],
    ['T-2, T-3, T-4', 'Right. The iterator starts at `start` — the oldest surviving scan — and walks size elements around the ring.'],
    ['T-4, T-2, T-3', 'That is the raw array order. The iterator hides the ring layout: callers see oldest-first.'],
  ]),
  step('You take an iterator, read one scan, and then the gate adds a new scan. What does the next call to next() do?', [], 0, [
    ['Throws ConcurrentModificationException', 'Right. The iterator remembered modCount when it was created; add() changed it. Fail fast rather than return a mixture of old and new.'],
    ['Returns the new scan', 'The iterator cannot know whether the new scan belongs in this pass. Guessing is how you get silently wrong reports.'],
    ['Returns null', 'An iterator never invents a null; it either has a next element or throws.'],
  ]),
  step('slots(23:00, 23:59, 30 minutes) without the midnight guard: next = next.plus(step) while next.isBefore(end). How many slots come out?', [], 2, [
    ['2 — 23:00 and 23:30', 'That is what the guarded version yields. Look at what 23:30 + 30 minutes is as a LocalTime.'],
    ['3 — 23:00, 23:30 and 00:00', '00:00 is before 23:59, so the loop does not stop there either.'],
    ['It never stops: 23:30 + 30 min wraps to 00:00, which is before 23:59', 'Right. LocalTime wraps at midnight. The guarded iterator also stops when the next time is not after the current one.'],
  ]),
];

export const visitor = [
  step('describe(Line), describe(Fee) and describe(Pack) are overloads. describeAll loops `for (Line l : pack.lines()) describe(l)`. The pack holds a Fee and a Pack. What does it print?', [], 1, [
    ['“fee 100” and “pack of 0”', 'That would need the overload to be picked at runtime. Java picks overloads at compile time, from the static type.'],
    ['“some line” twice', 'Right. l’s static type is Line, so describe(Line) is chosen for both. This is why Visitor needs accept(): it turns the runtime type into a second, virtual call.'],
    ['It does not compile', 'It compiles. That is the trap.'],
  ]),
  step('Your bill tree has three visitors. What does each kind of change cost?', [], 0, [
    ['New operation: one new visitor, no node edits. New node type: one new method in every visitor', 'Right. Visitor makes operations cheap and node types expensive. Choose it when the tree is stable and the operations keep coming.'],
    ['Both are one new class', 'A new node type needs a new visitXxx method, which every visitor must implement.'],
    ['New operation: edit every node. New node type: one new class', 'That is the cost of putting operations on the nodes themselves — the opposite trade.'],
  ]),
  step('On Java 17, you replace the visitor with `if (line instanceof Item i) … else if (line instanceof Bundle b) …` over a sealed BillLine. Then someone adds a Discount record. What tells you?', [], 2, [
    ['The compiler — sealed types make instanceof chains exhaustive', 'Only switch can be checked for exhaustiveness. An if-chain is never checked.'],
    ['Nothing ever — Discount lines are skipped', 'The final throw in the chain fires at runtime. You find out — just late.'],
    ['Nothing at compile time; the fallback throw at the end fires at runtime. Java 21’s pattern-matching switch would refuse to compile instead', 'Right. Sealed + switch (Java 21) gives the visitor’s compile-time safety without accept(). On 17, the visitor interface is what makes the compiler list every place to update.'],
  ]),
];

export const which = [
  step('“The fee depends on the vehicle type, and new types keep arriving.”', [], 0, [
    ['Strategy (+ registry)', 'Right. One verb, N interchangeable rules, chosen by data.'],
    ['State', 'State is for behaviour that changes as the object moves through a lifecycle. The vehicle type does not change.'],
    ['Template Method', 'There is no fixed sequence with holes here — just a swappable rule.'],
  ]),
  step('“An order can be cancelled only before it ships, and refunded only after it is delivered.”', [], 1, [
    ['Observer', 'Observers react to changes; they do not decide which changes are legal.'],
    ['State — one guarded transition gate', 'Right. Not every change is legal, and an illegal one corrupts data. Enum table if only the edges vary; classes if behaviour varies too.'],
    ['Command', 'Command makes actions into objects. Legality of the lifecycle is a different question.'],
  ]),
  step('“When a payment succeeds, send a receipt, update loyalty points and notify the warehouse — and marketing will want more later.”', [], 2, [
    ['Chain of Responsibility', 'A chain runs steps that can veto each other in order. These reactions are independent and none may stop the others.'],
    ['Mediator', 'Nothing needs coordinating between the reactions; they do not talk to each other.'],
    ['Observer — publish after commit, guard each listener', 'Right. N interested parties, unknown to the producer, needing to know when.'],
  ]),
  step('“Every API call goes through: authenticate, resolve the tenant, validate, rate-limit — any can reject.”', [], 0, [
    ['Chain of Responsibility — ordered, assembled in one place', 'Right. Sequential steps, each with a veto, and order is a data dependency.'],
    ['Decorator', 'Stacked decorators look like a chain, but a decorator exists to add behaviour around a call and normally passes it on. Links that may veto and stop the request, in an order that matters, are the chain’s defining move.'],
    ['Strategy', 'Strategy picks one rule. Here every rule runs, in order, until one says no.'],
  ]),
  step('“The editor needs undo and redo, and the same actions must be replayable from a log.”', [], 1, [
    ['Memento', 'Snapshots give undo but not replay or a log of actions. Here the actions themselves are the asset.'],
    ['Command — execute and undo, an invoker with two stacks', 'Right. An action that must be undone, queued, logged or replayed has to be an object.'],
    ['Iterator', 'Iterating a log is incidental; the log has to contain something replayable first.'],
  ]),
  step('“Totals, tax, a printed statement and a fraud audit — all over the same bill tree, and finance will invent more.”', [], 2, [
    ['Composite alone', 'Composite gives you the tree. Each new operation would still be a new method on every node.'],
    ['Strategy', 'A strategy cannot reach into each node type without instanceof checks.'],
    ['Visitor (or sealed types + pattern matching)', 'Right. A stable structure and a growing list of operations is exactly Visitor’s trade.'],
  ]),
  step('“Same flow everywhere: fetch, transform, render, deliver. Two of the four steps differ per report.”', [], 0, [
    ['Template Method (or a final runner taking lambdas)', 'Right. A fixed sequence with holes. If the holes are one-liners, a runner with function parameters does it without inheritance.'],
    ['Chain of Responsibility', 'Every step always runs and none vetoes; this is a skeleton, not a pipeline of gatekeepers.'],
    ['Observer', 'Nothing is being announced. The steps are the algorithm itself.'],
  ]),
];

export const drills = [
  step('An if-else over five payment gateways, where each branch parses a different payload format before verifying it. What do you reach for, and what is the follow-up you will get?', [], 1, [
    ['State — each gateway is a state', 'Gateways are not stages of a lifecycle; the choice does not change over time.'],
    ['Strategy + registry; “why not an enum with an abstract method?” — fine for 2–3 tiny variants, but these need injected keys and clients', 'Right. That is the War Room’s first dossier, follow-up included.'],
    ['Template Method — gateways share a sequence', 'The verification algorithms share nothing but their signature. There is no common skeleton to inherit.'],
  ]),
  step('A follow-up was marked DONE, dragged back to IN_PROGRESS, and completed again — overwriting completedAt and completedBy. Where does the fix live?', [], 0, [
    ['In one guarded transition method over an explicit table of legal moves; terminal states allow nothing', 'Right. Every path — API, importer, scheduler — goes through the same gate, so none can forget.'],
    ['In the UI, by hiding the drag handle', 'The API, the bulk importer and the scheduler would still allow it. Guard the data, not the button.'],
    ['In a nightly job that repairs bad history', 'The reports built on the overwritten stamps are already wrong by morning.'],
  ]),
  step('Your Observer subject iterates an ArrayList, and listeners occasionally unsubscribe during delivery. Production sees rare ConcurrentModificationExceptions. The least risky fix?', [], 2, [
    ['Catch ConcurrentModificationException and retry the loop', 'Retrying re-delivers to listeners that already ran.'],
    ['Make publish() synchronized', 'The modification happens on the same thread, inside the loop. A lock does not stop a thread from tripping over itself.'],
    ['Switch to CopyOnWriteArrayList, which iterates a snapshot', 'Right. Listener lists are read-mostly, which is exactly the case it is built for.'],
  ]),
  step('A class named BookingCommand has no execute(), no undo() and no receiver — it is an immutable bag of request fields. What is it?', [], 1, [
    ['A Command with the methods left for later', 'A name claiming a pattern does not make it one.'],
    ['A parameter object; read the structure, not the label', 'Right. If the action cannot be queued, retried or reversed, you want a parameter object — and should say so.'],
    ['A Memento', 'A memento is a snapshot of an originator’s state, taken and restored by that originator.'],
  ]),
  step('Which iterator behaviour is guaranteed by the Java collections’ fail-fast iterators?', [], 2, [
    ['They always detect concurrent modification from another thread', 'The JDK documentation says fail-fast behaviour cannot be guaranteed under unsynchronized concurrent modification. It is a bug detector, not a concurrency control.'],
    ['They make iteration thread-safe', 'They do nothing to make it safe; they only try to notice when it was not.'],
    ['They throw ConcurrentModificationException on a best-effort basis, so you should never rely on it for correctness', 'Right. Use it to find bugs; use concurrent collections or locks to prevent them.'],
  ]),
  step('Undo for “restore the draft to 10:15” versus undo for “reverse the last booking”. Which pair is right?', [], 0, [
    ['Memento for the draft, Command for the booking', 'Right. A moment-in-time state versus an action with an effect in the world (which may need compensation).'],
    ['Command for both', 'Possible for the draft, but it means reversing every edit one by one. Snapshots answer “how it was” directly.'],
    ['Memento for both', 'A snapshot of your own objects cannot un-send an SMS or un-create a remote account.'],
  ]),
  step('Wren asks: “Why is ReportJob.run() final but transform() protected with a body?”', [], 1, [
    ['Both are style choices', 'Each keyword defends something specific.'],
    ['final: the sequence is the asset and cannot be skipped. protected with a default: an optional hook most reports ignore', 'Right. abstract = must fill, protected-with-default = may fill, private/final = hands off.'],
    ['final makes it faster', 'The JIT can inline either way. The keyword is about what subclasses may change.'],
  ]),
];
