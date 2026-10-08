import { row, step } from '../../lib/trace.ts';

// Decision puzzles for src/lessons/pattern-contention.mdx.
// Every number used here is derived in the lesson's worked-numbers sections.

export const race = [
  step('Two buyers run the same code for seat 17 at the same moment: SELECT status; if it says AVAILABLE, UPDATE status = HELD. The database runs Read Committed. What happens?', [
    row('Timeline', ['A: SELECT → AVAILABLE', 'B: SELECT → AVAILABLE', 'A: UPDATE → HELD', 'B: UPDATE → HELD'], { 3: 'LAST' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['B’s UPDATE fails because A already holds the seat', 'Nothing tells B to fail. B’s UPDATE has no condition, so it simply overwrites A’s row once A commits.'],
    ['Both get a “seat held” response; the row ends up owned by B and A is silently robbed', 'Right. A lost update. Both checks were true when they ran; the gap between check and write is the whole bug.'],
    ['The database detects the conflict and aborts one transaction', 'Read Committed does not detect this. Postgres Repeatable Read would abort the second writer, but the default level lets it through.'],
  ]),
  step('On-sale night: 2,000,000 fans, a 50,000-seat stadium, an average order of 2 seats. What fraction of fans can possibly succeed?', [
    row('Inputs', ['2,000,000 fans', '50,000 seats', '2 seats/order']),
  ], 2, [
    ['About 2.5%', 'That is 50,000 ÷ 2,000,000 — it counts seats, not orders. Each order takes two seats, so there are only 25,000 winning orders.'],
    ['About 25%', 'Off by a factor of 20. 25,000 orders ÷ 2,000,000 fans is a little over one percent.'],
    ['1.25% — 25,000 orders for 2,000,000 people', 'Right. 98.75% of the work the system does that night is telling people “no”. Design so “no” is cheap and arrives fast.'],
  ]),
];

export const toolbox = [
  step('A buyer wants one specific seat: section B, row 4, seat 17. Cheapest correct tool?', [], 0, [
    ['One conditional UPDATE: … WHERE seat_id = 17 AND status = \'AVAILABLE\', then check the row count', 'Right. The check and the change happen in one statement under the row lock. One row changed: you won. Zero: someone beat you.'],
    ['A Redis lock per seat, then a normal UPDATE', 'Correct only if the lock is perfect, and it adds a second system that can disagree with the database. The database can do this atomically for free.'],
    ['SELECT … FOR UPDATE, check in the app, then UPDATE', 'Correct but more than you need: a round trip with the lock held. Use it when the decision needs logic one statement cannot express.'],
  ]),
  step('General admission: any one of 5,000 identical standing tickets will do. Many buyers arrive at once. Which tool keeps them from queueing behind each other?', [], 1, [
    ['SELECT … FOR UPDATE on the first available row', 'Every buyer picks the same first row and waits for the one before them. You have built a single-file line.'],
    ['SELECT … FOR UPDATE SKIP LOCKED LIMIT 1 on available rows', 'Right. Each buyer skips rows others have locked and takes a different one. Use it when the caller wants any row from a pool.'],
    ['An optimistic version column on each ticket row', 'Everyone reads the same first row, all but one fail the version check, and they retry — into the same collision.'],
  ]),
  step('Rule: at most one redemption of coupon WELCOME50 per user. Two taps from the same user race. What enforces it with no lock at all?', [], 2, [
    ['Check “has this user redeemed?” then insert', 'Check-then-insert is the race itself: both checks pass before either insert lands.'],
    ['A Redis SETNX on user + coupon with a TTL', 'Works while Redis keeps the key, but the truth is in the database. When the key expires or is lost, the rule is gone.'],
    ['A UNIQUE constraint on (coupon_id, user_id) in the redemptions table', 'Right. The second insert fails with a duplicate-key error. A unique index is a lock the database never forgets to take.'],
  ]),
  step('An organiser edits an event’s description in a form for ten minutes. A colleague may edit it too. Which tool?', [], 0, [
    ['Optimistic concurrency: read version 7, write … WHERE version = 7, reload on zero rows', 'Right. Conflicts are rare and humans think slowly. Never hold a database lock across think time.'],
    ['SELECT … FOR UPDATE when the form opens', 'That holds a row lock for ten minutes and blocks every other writer to the row. Locks are for milliseconds.'],
    ['A distributed lock with a 15-minute TTL', 'Heavy machinery for a rare conflict, and if the editor wanders off the event is frozen for 15 minutes.'],
  ]),
];

export const contentionMath = [
  step('100 buyers hit one row with optimistic concurrency at the same instant. Each round only one version check succeeds, and every loser retries immediately. How many write attempts in total?', [
    row('Round', ['1: 100 try', '2: 99 try', '…', '100: 1 tries']),
  ], 1, [
    ['100', 'That would be true only if nobody ever lost. Every loser comes back for another round.'],
    ['5,050 — 100 + 99 + … + 1', 'Right. N(N + 1) ÷ 2 attempts for N writes: quadratic. Optimistic concurrency is a bet that conflicts are rare; on a hot row it loses the bet badly.'],
    ['200', 'Each loser retries more than once. The last winner tried 100 times.'],
  ]),
  step('Checkout locks the seat row with FOR UPDATE and calls the payment provider (300 ms) before committing. What is the most purchases per second that row can see?', [], 2, [
    ['About 500 per second', '500/s is the ceiling for a 2 ms lock. The provider call is inside the lock, so the lock lasts 300 ms.'],
    ['Unlimited — row locks are cheap', 'Locks are cheap to take. Holding one is what costs: every other buyer of that row waits.'],
    ['About 3 per second — 1 ÷ 0.3 s', 'Right. A hot row’s ceiling is one over the lock time. Move the slow call out of the lock: hold, commit, pay, confirm.'],
  ]),
];

export const locks = [
  step('Worker A takes a Redis lock with SET lock:job42 A NX PX 30000. Its work takes 40 s. When finished, it runs DEL lock:job42. What can go wrong?', [
    row('Timeline', ['0 s: A locks', '30 s: lock expires', '31 s: B locks', '40 s: A runs DEL'], { 3: 'BUG' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['Nothing — A owns the lock until it deletes it', 'The lock expired at 30 s. A does not own it any more; B does.'],
    ['A deletes B’s lock, so a third worker can take it while B is still working', 'Right. Release must check ownership: store a random token as the value and delete only if it still matches, atomically (a small Lua script). And A was still working after expiry — which needs fencing.'],
    ['Redis rejects the DEL because A is not the owner', 'Plain DEL has no idea who owns a key. That is why the release must compare the token first.'],
  ]),
  step('Now the release checks the token. A still pauses for 40 s in garbage collection, wakes, and writes to storage while B is mid-job. What actually stops A’s write?', [], 2, [
    ['A longer TTL, say 120 s', 'A longer TTL only moves the window. Pauses have no upper bound you can rely on.'],
    ['Checking “do I still hold the lock?” right before writing', 'The check can be true and then the pause happens between the check and the write. Any check done by the holder is too early.'],
    ['A fencing token: the lock service hands out 33, then 34; storage remembers 34 and rejects 33', 'Right. The protected resource refuses stale holders. Without fencing, a TTL lock is advisory, not safe.'],
  ]),
  step('Your interviewer asks whether Redlock (a majority of five independent Redis nodes) makes the lock safe for money movement. Best answer?', [], 0, [
    ['It is debated. It relies on timing assumptions and gives no fencing token, so for correctness I would use a consensus-backed lock with fencing — or better, guard the write in the database itself', 'Right. Name the debate (Kleppmann’s critique, antirez’s reply), take a side for this use case, and move the guarantee into storage.'],
    ['Yes — five nodes are safer than one', 'More nodes help availability. The safety argument is about clocks and pauses, which five nodes do not remove.'],
    ['No — Redis cannot be used for locks at all', 'Too strong. A single-node Redis lock is fine for efficiency (avoid duplicate work). The question is whether you need correctness.'],
  ]),
];

export const holds = [
  step('Holds expire after 10 minutes. The sweeper that flips expired holds back to AVAILABLE falls 5 minutes behind. With the hold written as … WHERE status = \'AVAILABLE\' OR (status = \'HELD\' AND held_until < now()), what do buyers see?', [], 1, [
    ['Expired seats stay locked for 5 extra minutes', 'Only if the hold statement trusts the status column alone. This one also treats an expired hold as available.'],
    ['Nothing wrong for holds — the hold statement treats expired holds as free; the seat map just looks stale for a bit', 'Right. Correctness lives in the conditional write; the sweeper only tidies up and refreshes the map. Same idea as Pastebin’s read-path expiry check.'],
    ['Double bookings', 'An expired hold is not a booking. Booking requires a live hold, checked in the confirm statement.'],
  ]),
  step('Admission is 100 buyers per second, each holding 2 seats. 20% of buyers abandon checkout. The 50,000 seats are all held after 250 s. How many seats come back when abandoned holds expire?', [
    row('Inputs', ['200 seats/s held', '250 s', '20% abandon', 'TTL 10 min']),
  ], 0, [
    ['10,000 seats, returning between 600 s and 850 s', 'Right. 20% of 50,000 = 10,000. Holds made from 0 to 250 s expire 600 s later. “Sold out” at 250 s really meant “all held”; keep the queue alive until holds settle.'],
    ['None — once sold out, the sale is over', 'The seats were held, not sold. Abandoned holds expire and those seats go back on sale.'],
    ['40 seats', 'That is the per-second rate of abandoned seats (20% of 200). Over 250 s it adds up to 10,000.'],
  ]),
  step('A buyer’s card payment succeeds 20 s after their hold expired, and another buyer already holds the seat. How should the design have prevented charging for a seat you cannot give?', [], 2, [
    ['Extend the hold whenever payment is slow', 'Extending it after expiry would steal the seat from the second buyer, who holds it legitimately.'],
    ['Charge first, assign seats afterwards', 'Then every failed seat assignment is a refund, and you have taken money for nothing.'],
    ['Authorise the card, confirm the seats with a conditional update that requires a live hold, then capture — void the authorisation if confirm fails', 'Right. Authorise, confirm, capture. Also give the server-side hold a grace period beyond the timer the buyer sees, and refuse to start checkout in the last minute.'],
  ]),
];

export const crowd = [
  step('The waiting room admits 100 people per second. Your position is 30,000. Roughly how long until you are admitted?', [], 1, [
    ['30 seconds', 'That would need 1,000 admissions per second.'],
    ['About 5 minutes — 30,000 ÷ 100 = 300 s', 'Right. Wait ≈ position ÷ admission rate. Show the estimate, and show how many tickets remain; at position 30,000 they may be gone.'],
    ['About 50 minutes', 'Off by ten. 30,000 ÷ 100 is 300 seconds.'],
  ]),
  step('2,000,000 people in the waiting room poll for their status every 10 s — 200,000 requests per second. How do you make that cheap?', [], 0, [
    ['Put each person’s position in a signed token; the poll only fetches the global “now serving” number, which is the same for everyone and cacheable for a second at the CDN', 'Right. A per-user lookup at 200,000/s becomes one shared value. The edge answers almost every poll.'],
    ['Store each position in Postgres and index it', '200,000 reads per second on the primary database, for a number that changes once a second. The waiting room would need its own waiting room.'],
    ['Hold a WebSocket per user and push updates', 'Two million long-lived connections is a large fleet just to say “not yet”. Possible, but polling a cached counter is far cheaper.'],
  ]),
];

export const idempotency = [
  step('A client retries POST /charges with Idempotency-Key k1, but the amount is now ₹900 instead of ₹500 (a bug in the client). The server has a completed result for k1. What should it do?', [], 2, [
    ['Replay the stored ₹500 result', 'The client asked for ₹900 and would be told “done” about a different request. Silent wrong answers are the worst kind.'],
    ['Charge ₹900 as a new request', 'The key promised “same operation”. Executing again breaks that promise and may double-charge.'],
    ['Reject it (422): the request hash stored with k1 does not match', 'Right. Store a hash of the canonical request with the key. Same key + same hash → replay. Same key + different hash → error.'],
  ]),
  step('The first request with key k2 is still running (calling the payment provider) when the retry with k2 arrives. What happens?', [], 1, [
    ['The retry runs too; the provider will sort it out', 'Two executions in flight is exactly the double charge the key exists to stop.'],
    ['The retry finds k2 in state IN_PROGRESS and gets 409 “try again shortly”', 'Right. Three states for a key: absent (claim it), in progress (conflict, retry later), completed (replay). A stale IN_PROGRESS row needs a recovery path.'],
    ['The retry blocks until the first finishes, holding a row lock', 'Holding a database lock across a provider call is the 3-per-second trap. Answer fast and let the client back off.'],
  ]),
  step('The server stores keys like this: GET key from Redis; if missing, process the charge, then SET the key. Under concurrency, what breaks?', [], 0, [
    ['Two requests both see “missing” and both charge — the claim must be atomic (INSERT with a unique key, or SET NX)', 'Right. Check-then-act is the race again. Claim the key first, atomically, then do the work.'],
    ['Nothing — Redis is single-threaded', 'Each command is atomic. Two separate commands with work between them are not.'],
    ['Only the TTL is wrong', 'The TTL is a detail. The order of operations is the bug.'],
  ]),
];

export const payments = [
  step('Your call to the payment provider times out after 10 s. What state is the payment in?', [], 2, [
    ['FAILED — tell the user to try again', 'The charge may have gone through. A new attempt with a new key could charge twice.'],
    ['SUCCEEDED — timeouts usually mean slow success', 'Hoping is not a state. You do not know.'],
    ['UNKNOWN — retry with the same provider idempotency key or query the provider, and let reconciliation settle anything still unknown', 'Right. A timeout means “no answer”, not “no”. Resolve it with idempotent retries and status queries, never with a fresh attempt.'],
  ]),
  step('A ₹1,000 charge (₹900 to the organiser, ₹100 Kestrel fee) is refunded in full. How does the ledger record the refund?', [], 1, [
    ['UPDATE the three original entries to zero', 'That erases history. Auditors, disputes and reconciliation all need to see the charge and the refund.'],
    ['Append a new balanced transaction with the opposite entries; the originals stay', 'Right. Append-only: every correction is a new transaction whose entries sum to zero. Balances are derived.'],
    ['Delete the original transaction', 'Deleting money movements is how ledgers stop matching the bank.'],
  ]),
  step('Every payment adds an entry to the single “Kestrel fees” account, and you keep its running balance in one row. Peak is about 579 payments per second; a balance update holds the row lock about 2 ms. What happens?', [], 0, [
    ['The row caps at about 500 updates per second, below peak — split it into sub-accounts or derive that balance asynchronously', 'Right. One over 2 ms is 500/s. A house account touched by every payment is a hot row; sharding it into N sub-accounts or batching its balance fixes it.'],
    ['Nothing — 579 is a small number', 'Small for the cluster, large for one row: every update of that row is serialised.'],
    ['Deadlocks', 'Not inherently. The problem is queueing on one lock, not a cycle of locks.'],
  ]),
];

export const scheduler = [
  step('Two scheduler instances both wake at midnight and create the run for job 42. How do you make sure only one run exists?', [], 1, [
    ['Elect a leader and hope failover never overlaps', 'Leader election narrows the window but failovers do overlap. You still want the data to refuse the duplicate.'],
    ['Give the run a deterministic id — (job_id, scheduled_at) — with a unique constraint; the second insert fails harmlessly', 'Right. A unique key turns “who fires the job” into an idempotent insert. Two schedulers become safe, not dangerous.'],
    ['A Redis lock around run creation', 'It works most of the time, and fails in exactly the expiry-and-pause case. The unique key needs no lock.'],
  ]),
  step('Worker W1 holds a 30 s lease on run 9 (fence 4). It pauses for 45 s. The lease expires; W2 claims the run with fence 5 and starts writing. W1 wakes and writes its output. What should happen?', [
    row('Fence', ['W1: 4', 'W2: 5'], { 1: 'NEWEST' }, { tones: { 0: 'out', 1: 'done' } }),
  ], 2, [
    ['Both writes land; the last one wins', 'Then a zombie worker can overwrite the live worker’s output. Order of arrival is not authority.'],
    ['W1 checks its lease before writing, so it stops itself', 'It might check, pass, and pause again before the write. The holder cannot police itself.'],
    ['The output store rejects fence 4 because it has seen fence 5', 'Right. Every write carries the run’s fence; storage keeps the highest and refuses older ones.'],
  ]),
  step('Heartbeat every 10 s, lease 30 s, and 50,000 runs in flight at peak. What write load do heartbeats alone add, and how many heartbeats can a worker miss before losing its lease?', [], 0, [
    ['5,000 writes per second; it survives 2 missed heartbeats', 'Right. 50,000 ÷ 10 = 5,000/s. Renewed at t, the lease ends at t + 30; beats at t + 10 and t + 20 can fail, and it is gone at t + 30.'],
    ['500 writes per second; it survives 3 missed heartbeats', 'Ten times too low: 50,000 runs each renew every 10 s. And the third missed beat lands exactly at expiry.'],
    ['50,000 writes per second; it survives 1 missed heartbeat', '50,000 would be one renewal per run per second. Each run renews every 10 s.'],
  ]),
];

export const drills = [
  step('Two users click “book seat 17” simultaneously. Cheapest correct mechanism?', [], 1, [
    ['Redis distributed lock per seat', 'It adds infrastructure and failure modes to do what the database does atomically for free.'],
    ['A conditional UPDATE … WHERE status = \'available\' — one atomic statement; exactly one request updates 1 row and wins', 'Right. A one-statement critical section needs no lock. Escalate tools only when the critical section grows.'],
    ['Queue all bookings through one worker', 'Correct but slow and a single point of failure, to solve a problem one statement already solves.'],
    ['Optimistic retry loop with version numbers', 'Correct, but on a hot seat the losers retry into the same conflict. The conditional update needs no loop.'],
  ]),
  step('A payment service holds a Redis lock (TTL 30 s), GC-pauses for 40 s, wakes and writes. A second holder is already working. What was missing?', [], 1, [
    ['A longer TTL', 'Longer TTLs just move the window. Pauses have no reliable upper bound.'],
    ['Fencing tokens — increasing numbers issued with the lock; storage rejects writes bearing a token older than the newest it has seen', 'Right. TTL expiry plus a zombie holder is the distributed-lock trap (Kleppmann’s Redlock critique). Fencing makes stale holders harmless at the storage layer.'],
    ['A Redis cluster for lock high availability', 'Availability of the lock service does not stop a paused holder from waking up and writing.'],
    ['Shorter GC pauses via JVM tuning', 'Helps the odds, guarantees nothing. Network delays and VM stalls pause processes too.'],
  ]),
  step('Why must the CLIENT generate the idempotency key?', [], 1, [
    ['Clients have better randomness', 'Randomness is not the point; any UUID library will do on either side.'],
    ['The duplicate the key must catch is the client’s own retry of one logical operation — only the client knows two requests are “the same attempt”', 'Right. A server-generated key differs per request and catches nothing. Server-side dedup by amount and time is a heuristic that blocks legitimate repeat purchases.'],
    ['To reduce server load', 'The server still stores and checks the key. Load is not the reason.'],
    ['Servers cannot generate unique keys safely', 'They can. They just cannot know that two requests express one intent.'],
  ]),
  step('“Why an append-only ledger instead of updating a balance column?”', [], 1, [
    ['Appends are faster than updates', 'Speed is not the argument, and a derived balance can even cost more to read.'],
    ['Updates destroy history: no audit trail, no dispute resolution, no reconciliation. Double-entry appends make every balance a derivable, explainable sum', 'Right. Money questions are history questions. Reconciliation against the bank only exists if history exists.'],
    ['Balance columns cannot be sharded', 'They can. The problem is what an update forgets.'],
    ['Regulation requires SQL', 'No regulation names a query language. Auditability is the requirement.'],
  ]),
  step('Airbnb: guests book date ranges on a listing, and two guests must never get overlapping nights. Which design enforces it in the database?', [], 2, [
    ['Check for overlapping bookings, then insert', 'Check-then-insert again: both checks pass, both insert. And there is no existing row to lock for “absence”.'],
    ['A unique constraint on (listing_id, check_in)', 'Two stays with different check-in dates can still overlap: 3–6 and 5–8 share the night of the 5th.'],
    ['One row per (listing_id, night) with a unique key, inserted in one transaction — or a Postgres exclusion constraint on the date range', 'Right. Per-night rows turn ranges into points a unique key can guard; an exclusion constraint guards the ranges directly.'],
  ]),
  step('Flash sale: 10,000 units, a million buyers in a minute. The stock counter lives in one Redis key and is the bottleneck. First move?', [], 0, [
    ['Split the stock into N buckets (10 keys of 1,000 units); each buyer decrements a random bucket and tries another if it is empty', 'Right. Spread the hot key; each decrement stays atomic. Put a waiting room in front too, and create orders asynchronously from the reservation.'],
    ['Add Redis replicas', 'Replicas serve reads. Every decrement is a write and still goes to the one primary for that key.'],
    ['Switch to optimistic concurrency in Postgres', 'A million contenders on one row with retry loops is the quadratic retry storm.'],
  ]),
  step('A candidate says: “Kafka gives us exactly-once delivery, so the email service will send each receipt once.” What is wrong?', [], 1, [
    ['Nothing — Kafka supports exactly-once', 'Kafka’s transactions cover reads and writes within Kafka. An email leaving the building is not in the transaction.'],
    ['Exactly-once delivery to an external effect does not exist; you get at-least-once delivery plus an idempotent effect (dedupe by event id, or pass the id to the provider)', 'Right. Say “effectively once”: duplicates arrive, and the effect ignores them.'],
    ['Kafka only offers at-most-once', 'Kafka offers at-most-once, at-least-once, and transactional processing inside Kafka. The trap is the boundary.'],
  ]),
  step('Stock exchange: thousands of orders per second for one symbol must be matched in a strict order. Which contention strategy fits?', [], 2, [
    ['Row locks on the order book table', 'Every order touches the same book. Lock waits would set your latency, at microsecond targets.'],
    ['Optimistic concurrency on the book', 'Every order conflicts with every other one on the same symbol. Retries would dominate.'],
    ['Serialise: one single-threaded in-memory matching engine per symbol, fed by a sequenced log', 'Right. If everyone needs the same thing, stop sharing it: one writer, in order, no locks. Partition across symbols for scale.'],
  ]),
];
