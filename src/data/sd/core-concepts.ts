import { row, step } from '../../lib/trace.ts';

// Every number in these steps is checked in the lesson text (Chapter 3–14 worked numbers):
// 1 − 0.99^100 ≈ 0.634 · 0.999^4 ≈ 0.996 · 1 − 0.01² = 0.9999 · 2,000 × 0.05 = 100 · 2,000 × 2 = 4,000
// M/M/1: T = S / (1 − ρ) → 2S at 50%, 10S at 90% · hash % 10 → % 11 moves 10/11 ≈ 91% of keys · 3³ = 27.

export const layers = [
  step('You are deep in the database discussion when the Interviewer asks: "How do you rate-limit this?" What is your first sentence?', [], 1, [
    ['"Redis INCR with a TTL per user."', 'A mechanism with no address. The Interviewer may have meant per-API-key limits at the edge, or protecting one fragile dependency inside a service. You might answer a question nobody asked.'],
    ['"Which layer do you mean — per client at the gateway, or inside a service protecting a dependency? I’ll start at the gateway."', 'Right. Name the layer first. One clarifying clause costs five seconds; answering the wrong layer costs the whole deep dive.'],
    ['"I’d put a rate limiter in front of the database."', 'By the time a request reaches the data tier, every layer above has already spent work on it. Abusive traffic should die at the edge.'],
  ]),
  step('Same tenant, two users. The Interviewer asks: "How do you stop Asha from reading Ben’s invoice?" Which layer answers it?', [
    row('Auth layers', ['Identity', 'Tenant', 'Role', 'Resource'], { 3: 'THIS ONE' }, { tones: { 3: 'hot' } }),
  ], 2, [
    ['Tenant isolation: every query is scoped by tenant_id', 'That stops tenant X reading tenant Y. Asha and Ben are in the same tenant, so this answers a different layer — the exact miss in your mock logs.'],
    ['Authentication: validate the JWT', 'That proves who Asha is. It says nothing about which invoices she may read.'],
    ['Resource-level authorization: check the invoice’s owner or ACL against the caller on every read', 'Right. Identity says who, tenant says which company, role says what kind of user, resource says which object. The question named an object.'],
  ]),
];

export const scaling = [
  step('Kestrel’s API runs on one server at 85% CPU at peak. Traffic will double this quarter. Sessions live in an in-memory map on that server. What comes first?', [], 1, [
    ['Add three more servers behind a load balancer', 'A user who logged in on server 1 lands on server 3 and is logged out. Sticky sessions paper over it until a server dies and takes its users’ sessions with it.'],
    ['Move sessions out (a shared store or signed tokens), then add servers behind a load balancer', 'Right. Once any server can handle any request, adding servers adds capacity, and losing one loses nothing.'],
    ['Buy a server with twice the cores and stop there', 'Vertical scaling is a fair way to buy time. But it leaves one machine as a single point of failure, and the in-memory sessions still vanish on every deploy and crash.'],
  ]),
  step('Uploads are written to the app server’s local disk. A background worker, on whichever machine picks up the job, transcodes them. What breaks?', [], 2, [
    ['Nothing — the worker can read the file over the network', 'Only from the one machine that has it. That machine is now special: a single point of failure and a routing problem.'],
    ['Disk fills up faster', 'Possibly, but that is not the bug. The bug is that the file exists on one machine and the job runs on another.'],
    ['The worker usually runs on a different machine and cannot find the file; put uploads in blob storage', 'Right. Files are state. State goes to a shared, durable home — blob storage — and the job carries a key, not a path on someone’s disk.'],
  ]),
];

export const throughput = [
  step('A service handles 2,000 requests per second at an average latency of 50 ms. How many requests are in flight at any moment?', [
    row('Little’s Law', ['L', '=', 'λ', '×', 'W'], {}),
  ], 1, [
    ['40', 'That is 2,000 ÷ 50 — mixed units and the wrong operation. In flight = arrival rate × time in the system.'],
    ['100', 'Right. L = λ × W = 2,000/s × 0.05 s = 100 requests in flight.'],
    ['100,000', 'That is 2,000 × 50 with milliseconds left unconverted. Convert to seconds first: 50 ms = 0.05 s.'],
  ]),
  step('The database it calls slows down and latency climbs to 2 s. Arrivals stay at 2,000/s. The service has 200 worker threads. What happens?', [], 2, [
    ['Throughput halves, but everything still works', 'With 200 threads each held for 2 s, the service can finish at most 100 requests per second. 2,000 arrive. The backlog grows every second.'],
    ['Nothing — the slowness belongs to the database', 'Little’s Law now needs 2,000 × 2 = 4,000 requests in flight. You have 200 threads. The database’s problem has become yours.'],
    ['The pool is exhausted: 4,000 requests would need to be in flight, so they queue and time out', 'Right. A slow dependency turns into your outage without one line of your code changing. Timeouts and bulkheads (Chapter 13) exist for this moment.'],
  ]),
  step('Using the simplest queueing model (M/M/1, response time = S ÷ (1 − utilization)), how does average response time at 90% utilization compare with 50%?', [], 2, [
    ['About the same — there is still 10% headroom', 'Queues do not care about headroom in that way. Waiting time explodes as utilization nears 100%.'],
    ['About 1.8× worse (90 ÷ 50)', 'Response time is not linear in utilization. It goes as 1 ÷ (1 − ρ).'],
    ['About 5× worse: 2S at 50% versus 10S at 90%', 'Right. 1 ÷ (1 − 0.5) = 2 and 1 ÷ (1 − 0.9) = 10. This is why capacity plans target 60–70%, not 95%.'],
  ]),
];

export const tail = [
  step('A search request fans out to 100 leaf servers and waits for all of them. Each leaf is slow (over 1 s) on 1% of calls, independently. What fraction of user requests are slow?', [
    row('Fan-out', ['1 leaf', '10 leaves', '100 leaves'], { 2: 'YOU' }, { tones: { 2: 'hot' } }),
  ], 2, [
    ['1% — each leaf is only slow 1% of the time', 'That is true for one call. A user request is slow if ANY of its 100 calls is slow.'],
    ['About 10%', 'That is the answer for 10 leaves: 1 − 0.99¹⁰ ≈ 9.6%.'],
    ['About 63%', 'Right. P(no slow call) = 0.99¹⁰⁰ ≈ 0.366, so about 63% of user requests wait for at least one slow leaf. The tail of the part becomes the median of the whole.'],
    ['100%', 'Close to it at 1,000 leaves (≈ 99.996%), but at 100 there is still a 37% chance every leaf is fast.'],
  ]),
  step('You add hedged requests: if a leaf hasn’t answered by its p95 latency, send a duplicate to another replica and use whichever answers first. Roughly how much extra leaf load does this add?', [], 1, [
    ['It doubles the load', 'Only calls that are still running at the p95 mark get a duplicate — by definition about 5% of them.'],
    ['At most about 5% more leaf calls', 'Right. A small, bounded cost that cuts the tail sharply, because two independent replicas are rarely both slow.'],
    ['None — the duplicate is cancelled', 'Cancelling the loser helps, but the duplicate was still sent and partly served.'],
  ]),
  step('Your dashboard shows an average latency of 40 ms. Users still complain the app feels slow. What do you look at?', [], 0, [
    ['p99 and p99.9 per endpoint — especially endpoints that fan out', 'Right. An average hides the slow 1%, and the users in that 1% are often your heaviest users, with the most data and the most calls per page.'],
    ['The p50, to be precise about the typical user', 'The median tells you about the typical call, which is already fine. The complaint lives in the tail.'],
    ['Nothing — 40 ms is fast', 'An average of 40 ms is compatible with 2% of requests taking 2 seconds. The average cannot see them.'],
  ]),
];

export const availability = [
  step('Your design chains four services in series, each 99.9% available. Roughly what is the availability of the whole path?', [
    row('Path', ['99.9%', '99.9%', '99.9%', '99.9%'], {}, { join: '→' }),
  ], 2, [
    ['99.9% — the chain is as strong as each link', 'Each link can fail independently, and any one failure fails the request. Failures add up.'],
    ['99.99% — more boxes, more redundancy', 'Boxes in series are not redundancy. Redundancy means either one can serve.'],
    ['About 99.6% — serial availabilities multiply', 'Right. 0.999⁴ ≈ 0.996. Every box in the critical path costs availability — an argument for fewer boxes and for moving non-critical calls off the request path.'],
    ['100% if we add retries', 'Retries hide brief blips. They do nothing for a dependency that is down, and they can make an overloaded one worse (Chapter 12).'],
  ]),
  step('Two replicas, each 99% available, and either one can serve. What is the pair’s availability, and what is the catch?', [
    row('Parallel', ['99%', 'OR', '99%'], {}),
  ], 1, [
    ['99% — redundancy doesn’t change availability', 'The pair is down only when both are down at the same time.'],
    ['99.99%, if their failures are independent', 'Right. 1 − 0.01 × 0.01 = 0.9999. The catch is the "if": the same rack, the same bad deploy, or the same bug takes both down together, and the math collapses back toward 99%.'],
    ['99.5% — the average of the two', 'Availability of a parallel pair is not an average. Down time requires both to be down.'],
  ]),
  step('Twenty stateless app servers, three cache nodes, one primary database with an async replica, and no automated failover. Where is the single point of failure?', [], 2, [
    ['The app servers', 'There are twenty and they are stateless. Losing one loses 5% of capacity and nothing else.'],
    ['The cache', 'Three nodes, and the cache can be rebuilt. It may be load-bearing (check that), but it is not the single point here.'],
    ['The primary database: writes stop until a human promotes the replica', 'Right. A replica you must promote by hand turns a 30-second failover into a 30-minute page. Redundancy without automatic failover is half of redundancy.'],
  ]),
];

export const liveness = [
  step('Heartbeats every second; a node is declared dead after three missed heartbeats. Node B stops for a 4-second garbage-collection pause, then carries on. What did the failure detector actually know?', [
    row('Heartbeats from B', ['✓', '✓', '–', '–', '–', '–', '✓'], { 4: 'DEAD?' }, { tones: { 2: 'out', 3: 'out', 4: 'hot', 5: 'out' } }),
  ], 1, [
    ['That B had crashed', 'B was alive the whole time. From outside, a paused node and a dead node look identical.'],
    ['That B had stopped answering — not that it was dead', 'Right. A timeout is a suspicion, never a proof. That is why anything B does after waking must be checked, not trusted.'],
    ['Nothing — three missed heartbeats is too few to decide', 'Waiting longer only trades faster detection for fewer false alarms. No timeout turns suspicion into certainty.'],
  ]),
  step('Node A holds a 10-second leader lease, then pauses for 15 seconds. Node B is granted the lease and starts writing. A wakes up and sends a write to storage. What stops the corruption?', [], 2, [
    ['The lease expired, so A’s write is rejected automatically', 'Storage knows nothing about the lease unless the write carries something it can check. And A, having been paused, believes it is still the leader.'],
    ['A checks the clock before every write', 'The pause can happen after the check and before the write lands. Checking your own clock cannot protect someone else’s storage.'],
    ['A fencing token: every new lease carries a higher number, and storage rejects writes with an older one', 'Right. B’s token is 34, A’s is 33. Storage has seen 34, so A’s write bounces. The contention lesson builds this out.'],
  ]),
  step('Why does a five-node cluster require a majority (three votes) to elect a leader, instead of letting any node that can’t see the leader take over?', [], 0, [
    ['Two majorities of the same five nodes always overlap, so at most one leader can win a given term', 'Right. Any two sets of three out of five share a node, and a node votes once per term. That overlap is what prevents split brain.'],
    ['Majorities are faster to reach than unanimous votes', 'True, but speed is not the reason. Safety is.'],
    ['So the leader is the most up-to-date node', 'Raft adds a separate rule for that (voters refuse candidates with older logs). The majority is about there being only one leader.'],
  ]),
];

export const replication = [
  step('N = 3 replicas, W = 2, R = 2. Why does a read overlap the latest completed write?', [
    row('Replicas', ['n1', 'n2', 'n3'], { 0: 'W', 1: 'W·R', 2: 'R' }, { tones: { 1: 'hot' } }),
  ], 1, [
    ['Because 2 is a majority of 3, and majorities are always consistent', 'Close, but the reason is the overlap, not the word "majority". W = 3, R = 1 also works and involves no read majority.'],
    ['Because W + R = 4 > N = 3, so any read set shares at least one node with any write set', 'Right. Pigeonhole: 2 + 2 slots among 3 nodes must reuse one. That node holds the newest version. Say the inequality out loud.'],
    ['It is not guaranteed — this is eventual consistency', 'With W + R > N, a read that starts after a write completes does reach a node holding it. (Concurrency edge cases stop it being fully linearizable — see the Reveal.)'],
    ['Because the coordinator caches the latest write', 'No caching is involved. The guarantee comes from the counting.'],
  ]),
  step('The primary replicates asynchronously. The replica runs about 200 ms behind, and the primary takes 1,000 writes per second. The primary dies and the replica is promoted. What is lost?', [], 1, [
    ['Nothing — every write was acknowledged', 'Acknowledged by the primary, which has just died. The replica never received the last ones.'],
    ['Up to about 200 acknowledged writes', 'Right. 1,000/s × 0.2 s ≈ 200. Async replication means a failover can lose writes the user was told succeeded. Say so, or make at least one replica synchronous.'],
    ['Everything since the last backup', 'The replica has everything up to 200 ms ago. Only the tail is lost.'],
  ]),
];

export const cap = [
  step('The Interviewer: "There’s a network partition and a booking request arrives. What does your Ticketmaster design do?" Best answer shape?', [], 1, [
    ['"We keep accepting bookings on both sides and merge later."', 'Two sides can sell the same seat. There is no "merge" for one seat sold twice — only a refund and an apology.'],
    ['"This is a CP choice — the minority side refuses bookings; a failed request beats a double-sold seat."', 'Right. Seat inventory is the canonical CP case: a wrong answer is worse than no answer. The majority side keeps selling.'],
    ['"We use a database that handles partitions automatically."', 'Every database makes this choice for you, quietly. The Interviewer wants to hear that you know which choice it made, and why it fits.'],
    ['"Partitions are rare enough to ignore."', 'Dodging instead of reasoning aloud is the habit your logs say to kill. Rare is not never — and the question is literally about the rare case.'],
  ]),
  step('A like counter, during a partition between two regions. CP or AP, and how does it heal?', [], 0, [
    ['AP: both regions keep counting locally and the counts are merged when the link returns', 'Right. Keep a count per region (a counter CRDT does exactly this) and sum them. Nobody is harmed by a like count that is briefly off.'],
    ['CP: refuse likes until the regions agree', 'You would show errors to millions of people to protect a number nobody audits.'],
    ['AP: each side overwrites the other with its own total when the link returns', 'Last-writer-wins on a counter throws away one side’s likes. AP needs a merge that keeps both sides’ work.'],
  ]),
  step('No partition today. A user’s settings write must reach a second region 80 ms away before you acknowledge it. In PACELC terms, what are you paying?', [], 2, [
    ['Availability, for consistency', 'Without a partition, nothing is unavailable. That is the "PAC" half.'],
    ['Nothing — it’s fine when there is no partition', 'This is exactly the case CAP is silent about and PACELC exists for.'],
    ['Latency, for consistency — at least one 80 ms round trip on every write (the EC choice)', 'Right. Else (no partition): Latency or Consistency. Synchronous cross-region replication buys consistency with a round trip per write.'],
  ]),
];

export const consistency = [
  step('A user edits their profile and refreshes — they must see the change. Their followers can see it 5 seconds later. Cheapest sufficient consistency?', [], 2, [
    ['Linearizable reads for every profile view', 'Paying for coordination on every follower’s read, when followers don’t need it.'],
    ['Eventual consistency for everyone', 'The editor refreshes, hits a lagging replica, and their edit "vanishes". That is the bug Iris filed.'],
    ['Read-your-writes for the editor, eventual for everyone else', 'Right. Per data, per reader. Route the editor to the leader for a short window after their write (or carry their last-write position in the session).'],
    ['Quorum reads for everyone', 'Expensive for every reader, and still more than followers need.'],
  ]),
  step('A user refreshes a post three times and sees the comment count go 41, then 39, then 42. Which guarantee is missing?', [
    row('Refreshes', ['41', '39', '42'], { 1: 'BACKWARDS' }, { tones: { 1: 'hot' } }),
  ], 1, [
    ['Linearizability', 'True, but far stronger than needed. The user only wants time not to run backwards for them.'],
    ['Monotonic reads — each refresh hit a different replica with a different lag', 'Right. Pin the session to one replica (or track the last-seen position) and counts never go backwards for that user.'],
    ['Read-your-writes', 'The user didn’t write anything. This is about their reads disagreeing with each other.'],
  ]),
  step('A reply shows up in someone’s feed before the question it answers. What is the weakest model that forbids this?', [], 2, [
    ['Eventual', 'Eventual consistency promises convergence, not order. Reply-before-question is perfectly legal under it.'],
    ['Linearizable', 'It forbids it, but it is far from the weakest. You would pay global coordination to fix an ordering bug.'],
    ['Causal', 'Right. The reply was written after reading the question, so it causally depends on it. Causal consistency shows causes before effects to everyone, while unrelated posts may still arrive in any order.'],
  ]),
  step('Two people try to claim the username "kestrel" at the same moment, on different replicas. What do you need?', [], 0, [
    ['Linearizability for that check: one leader (or consensus) decides, and everyone sees the same winner', 'Right. Uniqueness needs one agreed order in real time. Read-from-replica-then-write cannot enforce it; a unique constraint on a single leader, or a compare-and-set in a consensus store, can.'],
    ['Causal consistency', 'The two claims are concurrent — neither caused the other — so causal consistency lets each side believe it won.'],
    ['Eventual consistency, then delete the loser', 'One user has already been told "it’s yours". Taking it back later is the bug.'],
  ]),
];

export const partitioning = [
  step('A cache cluster places keys with hash(key) % N on 10 nodes. You add an 11th. Roughly what fraction of keys now map to a different node?', [
    row('hash % 10 vs % 11', ['h = 7 → 7 | 7', 'h = 13 → 3 | 2', 'h = 25 → 5 | 3'], { 0: 'stays', 1: 'moves', 2: 'moves' }, { tones: { 1: 'out', 2: 'out' } }),
  ], 2, [
    ['About 1 in 11 (9%)', 'That is what consistent hashing gives you. Modulo reshuffles almost everything.'],
    ['About half', 'Worse than that. A key stays only when h % 10 equals h % 11.'],
    ['About 91%', 'Right. Only 10 of every 110 hash values give the same answer under % 10 and % 11, so 100/110 ≈ 91% of keys move. For a cache, that is a near-total cold start.'],
  ]),
  step('An events table is range-partitioned by timestamp. One partition is at 100% while the rest idle. Why, and what is the fix?', [], 0, [
    ['Every new write lands in the newest time range; prefix the key with a small hash bucket to spread writes, accepting that a time scan must read every bucket', 'Right. Range partitioning makes "now" a hot spot. Bucketing splits the write load N ways and costs N reads for a time-range query — name both sides.'],
    ['The partition’s disk is too small; buy a bigger disk', 'Capacity is not the problem. Concentration is: all the current traffic is aimed at one range.'],
    ['Switch to modulo hashing across the same partitions', 'That spreads writes, but every time-range query now hits every partition and rebalancing moves nearly everything. A bucket prefix gets the spread with less damage.'],
  ]),
];

export const ids = [
  step('Orders are sharded across 8 databases, each with an auto-increment primary key. What goes wrong first?', [], 1, [
    ['Ids run out sooner', 'A 64-bit counter will not run out. The problem is that there are eight of them.'],
    ['Two shards both issue order 42', 'Right. Eight independent counters produce eight copies of every number. Ids must be unique without asking each other.'],
    ['Inserts get slower', 'Auto-increment inserts are about as fast as inserts get. The problem is uniqueness across shards.'],
  ]),
  step('You choose random UUIDv4 primary keys on a B-tree index. Insert throughput sags as the table grows. Why, and what helps?', [], 2, [
    ['UUIDs are 128 bits; switch to 64-bit ids', 'Size matters a little. Randomness matters much more.'],
    ['Collisions; add a uniqueness retry', 'With 122 random bits, a billion ids have about a 1-in-10¹⁹ chance of any collision. That is not the problem.'],
    ['Random keys land on random index pages, so the hot set is the whole index; a time-ordered id (UUIDv7 or Snowflake) appends at the right edge', 'Right. Time-ordered ids keep inserts on the newest pages, which stay in memory.'],
  ]),
  step('An NTP correction moves a Snowflake generator’s clock back 50 ms. What should the generator do?', [
    row('Timestamp (ms)', ['1000', '1001', '1002', '952?'], { 3: 'NOW' }, { tones: { 3: 'hot' } }),
  ], 0, [
    ['Refuse to issue ids (or wait) until the clock passes the last timestamp it used', 'Right. Going backwards can re-issue a (timestamp, machine, sequence) triple it already gave out. Waiting 50 ms is cheap; a duplicate primary key is not.'],
    ['Carry on with the new time', 'It can regenerate ids it already issued in those 50 ms: same timestamp, same machine id, same sequence numbers.'],
    ['Pick a random sequence number to avoid collisions', 'That lowers the odds but does not remove them, and it breaks the per-millisecond ordering the sequence gives you.'],
  ]),
];

export const retries = [
  step('A call to the payment provider times out. Is it safe to retry?', [], 2, [
    ['Yes — a timeout means it didn’t happen', 'A timeout means you didn’t hear back. The charge may have gone through and the reply got lost.'],
    ['No — never retry payments', 'Then a dropped reply becomes a lost sale. Retries are fine when the operation is made safe to repeat.'],
    ['Only with an idempotency key, so the provider recognises the retry and returns the first result', 'Right. Retries need idempotent operations. With a key, "charge ₹500" twice means one charge and two identical answers.'],
  ]),
  step('Gateway → service → database client. Each layer makes up to 3 attempts. The database is down. How many attempts reach it for one user request?', [
    row('Attempts', ['gateway ×3', 'service ×3', 'client ×3'], {}, { join: '→' }),
  ], 2, [
    ['3', 'Only if one layer retries. Each layer multiplies the one below it.'],
    ['9', 'That is two layers. There are three.'],
    ['27', 'Right. 3 × 3 × 3 = 27 — a retry storm aimed at the thing that is already down. Retry at one layer, and cap retries with a budget.'],
  ]),
  step('1,000 clients fail at the same instant and all retry after exactly 100 ms, then 200 ms, then 400 ms. What happens, and what fixes it?', [], 1, [
    ['The exponential growth spreads them out', 'Every client uses the same schedule, so they stay in lockstep: 1,000 requests at 100 ms, 1,000 more at 300 ms, and so on.'],
    ['They arrive in synchronized waves; add jitter — sleep a random time between 0 and the backoff ceiling', 'Right. "Full jitter" spreads each wave across the whole interval, so the recovering server sees a trickle instead of a wall.'],
    ['Shorter backoff, so the retries finish sooner', 'Faster waves are still waves, and they hit a struggling server harder.'],
  ]),
];

export const isolation = [
  step('Service A calls service B with no timeout. B hangs (it accepts connections but never replies). What happens to A?', [], 1, [
    ['A’s requests fail fast with an error', 'Without a timeout nothing fails. Each call simply waits forever.'],
    ['Every A thread that calls B blocks; soon A has no threads left and stops serving everything', 'Right. A hung dependency is worse than a dead one: a dead one fails fast. Set a timeout shorter than A’s own deadline.'],
    ['The load balancer routes around B', 'B is accepting connections, so health checks may still pass. The load balancer sees nothing wrong.'],
  ]),
  step('A circuit breaker opened after half the last 20 calls failed. Thirty seconds later, what does it do?', [
    row('States', ['CLOSED', 'OPEN', 'HALF-OPEN'], { 2: 'NOW' }, { tones: { 1: 'out', 2: 'hot' } }),
  ], 2, [
    ['Closes and sends all traffic again', 'If the dependency is still sick, the full load knocks it straight back down.'],
    ['Stays open until someone resets it', 'Then every recovery needs a human. Breakers are meant to heal themselves.'],
    ['Goes half-open: lets a few trial calls through; success closes it, failure opens it again', 'Right. Half-open is a probe. It tests recovery with a trickle, not a flood.'],
  ]),
  step('The recommendations dependency slows down and soaks up all 200 shared threads. Checkout stalls too. What design would have contained it?', [], 0, [
    ['Bulkheads: separate pools (or concurrency limits) per dependency, so recommendations can only exhaust its own 20 threads', 'Right. Like the watertight compartments of a ship: one flooded room does not sink the vessel. Checkout keeps its own pool.'],
    ['A bigger shared pool', 'Little’s Law says a slow enough dependency fills any pool. A bigger pool only delays the moment.'],
    ['Retrying recommendations faster', 'Retries add load to the slow dependency and hold threads longer.'],
  ]),
];

export const overload = [
  step('Capacity is 10,000 requests per second. A surge brings 15,000 per second for ten minutes. Which plan serves users best?', [], 1, [
    ['Queue everything; the surge will pass', 'The queue grows by 5,000 every second — 3 million by the end. Each request waits behind it, times out, and the client retries, adding more.'],
    ['Reject about a third immediately with a 503 and a Retry-After, and serve the rest fast', 'Right. 5,000 of 15,000 is one third. Shedding keeps 10,000 users per second happy instead of making 15,000 per second miserable.'],
    ['Accept all of it and let the servers sort it out', 'Overloaded servers slow down for everyone, and throughput often falls below capacity as they thrash.'],
  ]),
  step('You must shed load. What goes first?', [], 2, [
    ['Whatever arrives last', 'Arrival order says nothing about value. You may be dropping checkouts and keeping prefetches.'],
    ['Requests from the newest users', 'Fairness to users is not the axis. The value of the request is.'],
    ['The least valuable work: prefetches, analytics, retries, background refreshes — before logins and checkouts', 'Right. Tag requests with a priority at the edge so every layer can make the same choice.'],
  ]),
  step('A producer writes to a queue faster than consumers drain it, all day. What does back-pressure mean here?', [], 0, [
    ['Bound the queue and push the slowness back to the producer — block it, slow it, or reject — instead of buffering without limit', 'Right. An unbounded queue only postpones the failure and turns it into an out-of-memory crash or hours of lag. Either add consumers or make the producer feel the limit.'],
    ['Add a bigger queue', 'If arrivals exceed departures all day, any queue fills. Size buys time, not balance.'],
    ['Drop the oldest messages silently', 'Sometimes acceptable for metrics, but "silently" is the problem: nobody upstream learns to slow down.'],
  ]),
];

export const drills = [
  step('Which opening sentence shows the most judgment for a photo-sharing feed’s availability?', [], 1, [
    ['"Five nines, because users hate downtime."', 'Five nines is about 5 minutes a year and needs multi-region active-active. Claimed without a reason, it reads as slop.'],
    ['"99.9% for the feed — about 8.8 hours a year is annoying, not catastrophic — but uploads must not lose photos once acknowledged."', 'Right. A number with a reason, and a separate durability promise where it actually matters.'],
    ['"We need full consistency and five nines."', 'This sentence tells the Interviewer you don’t know the tradeoff.'],
  ]),
  step('A request reads from 50 shards in parallel and waits for all of them. Each shard is slow 2% of the time, independently. Roughly what fraction of requests are slow?', [], 1, [
    ['2%', 'True for one shard. The request waits for the slowest of 50.'],
    ['About 64%', 'Right. 1 − 0.98⁵⁰ ≈ 0.636. Same shape as 1 − 0.99¹⁰⁰: wide fan-out turns a rare tail into a common one.'],
    ['About 100%', 'Close only at much wider fan-out. 0.98⁵⁰ ≈ 0.36 of requests still see no slow shard.'],
  ]),
  step('"We picked a CA system, so partitions aren’t our problem." What is wrong with this?', [], 2, [
    ['Nothing — CA systems exist', 'A single-node database is "CA" in the trivial sense that it cannot be partitioned. The moment there are two nodes and a network, P is not optional.'],
    ['CA is fine as long as you also add retries', 'Retries do not choose what happens on each side of a partition.'],
    ['Networks partition whether you chose to or not; "CA" just means you haven’t decided what happens when they do', 'Right. The real choice is C or A, during a partition. Say which, per piece of data.'],
  ]),
  step('Which retry policy would Dev sign off on?', [], 0, [
    ['Retry idempotent calls only, at one layer, up to 3 attempts, with exponential backoff and full jitter, inside a retry budget', 'Right. Safe operations, one layer, bounded attempts, spread out in time, capped in total.'],
    ['Retry everything 5 times, immediately, at every layer', 'Non-idempotent operations get duplicated, immediate retries hammer a sick server, and every layer multiplies the others.'],
    ['Never retry; surface every error to the user', 'Most transient failures vanish in milliseconds. A careful retry turns them into nothing.'],
  ]),
  step('Your service holds a 10-second lease to process a job. Which pairing is correct?', [], 2, [
    ['Renew every 10 s, exactly when it expires', 'Any delay means it lapses. Renew well before expiry.'],
    ['Renew every 1 s and trust your own clock completely', 'Frequent renewal is fine, but a pause can still outlast the lease. The storage side must check.'],
    ['Renew every ~3 s, stop work if renewal fails, and send a fencing token with every write', 'Right. Renew early, give up gracefully, and let the storage reject a holder that woke up too late.'],
  ]),
  step('Which consistency choice fits a bank ledger, a user’s "recent transactions" list, and spending analytics?', [], 1, [
    ['Strong for all three — it’s money', 'Analytics over last month do not need a coordinated read of every replica. You would pay for nothing.'],
    ['Ledger linearizable, recent list read-your-writes, analytics eventual', 'Right. Different data in the same system gets different models. Saying that sentence about your own design is a deep-dive win.'],
    ['Eventual for all three, with nightly reconciliation', 'An eventually consistent ledger can let two withdrawals spend the same balance.'],
  ]),
];
