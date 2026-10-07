import { row, step } from '../../lib/trace.ts';

// Decision puzzles for src/lessons/rate-limiter.mdx. Every number here is recomputed in the lesson's
// worked numbers; the token-bucket, GCRA and sliding-window figures are also asserted by
// tests/java/rate-limiter/Check.java against the Java the lesson shows.

export const scoping = [
  step('A request arrives with no API key — someone browsing the public listings endpoint. What do you limit it by?', [], 1, [
    ['The User-Agent string', 'Any client can send any User-Agent. A scraper rotates it per request and gets a fresh limit each time.'],
    ['The client IP — read from the forwarding header your own edge sets, never one the client sent', 'Right. With no identity, the address is the best key you have. Read it from the header only your edge is allowed to set, or every request looks like it came from your load balancer — or from whatever address the client typed.'],
    ['Nothing — unauthenticated traffic is free', 'Anonymous traffic is exactly where floods and scrapers live. Leaving it unlimited protects the paying customers least.'],
    ['A session cookie', 'The client controls whether it sends the cookie at all. Drop it, and you get a fresh session and a fresh limit.'],
  ]),
  step('Iris: “Enterprise customers must never be cut off in the middle of a campaign — but they pay for overage.” Which limit do Enterprise keys get?', [], 2, [
    ['A hard limit: 429 at 100% of plan', 'That breaks the promise Iris just made. The contract says overage is allowed and billed.'],
    ['No limit at all', 'One runaway Enterprise script can still melt the search cluster for everybody. Unlimited is not the same as generous.'],
    ['A soft limit: past 100% requests pass with a warning header and are metered as overage, up to a hard ceiling at 2× plan', 'Right. Soft means “allowed, but signalled and billed”. The ceiling is still a hard limit, because the backends have a capacity even if the contract is generous.'],
    ['Queue their extra requests until the next minute', 'Holding an API request for up to a minute is an outage from the client’s point of view. Queueing is for traffic that can wait.'],
  ]),
  step('The check runs on every request: 1M requests per second at peak across 200 gateway instances, and it may add at most 5 ms at p99. Where do the counters live?', [], 0, [
    ['An in-memory store such as Redis, one round trip per check, shared by all gateways', 'Right. One same-datacentre round trip is well under a millisecond, and every gateway sees the same count.'],
    ['A Postgres row per counter, updated in a transaction', 'A write transaction per request at 1M/s, with row locks on hot counters and disk in the path. It misses the latency budget and melts the database.'],
    ['Only in each gateway’s memory', 'Fast, but each of the 200 gateways would enforce the full limit on its own: a 10/s key could get up to 200 × 10 = 2,000/s.'],
    ['A Kafka topic of request events, counted by a consumer', 'The count would arrive seconds after the requests it should have stopped. Fine for analytics, too late for admission.'],
  ]),
];

export const contract = [
  step('A Pro key (bucket of 100, refilling 10 tokens per second) has 0.5 tokens left and is rejected. What Retry-After value do you send?', [
    row('Bucket', ['0.5 tokens', '10 / s', 'need 1'], { 0: 'NOW', 1: 'REFILL' }, { tones: { 0: 'hot' } }),
  ], 1, [
    ['0', 'Retrying immediately fails again: half a token is still missing, and a retry storm is exactly what you are trying to stop.'],
    ['1', 'Right. The missing 0.5 token arrives in 0.5 ÷ 10 = 0.05 s, and Retry-After counts whole seconds, so you round up to 1.'],
    ['0.05', 'That is the true wait, but Retry-After takes a whole number of seconds (or an HTTP date). Round up, never down.'],
    ['10', 'Ten seconds is the time until the bucket is completely full again — a reasonable X-RateLimit-Reset, but far longer than the client needs to wait for one request.'],
  ]),
  step('The search cluster is overloaded. This client is well inside its own limit. What status do you return for the requests you shed?', [], 2, [
    ['429 Too Many Requests', '429 tells the client it exceeded its own allowance. It didn’t. A well-behaved client might wrongly back off for its whole quota, or open a support ticket about a limit it never hit.'],
    ['500 Internal Server Error', '500 says “something broke” and gives no hint about when to retry. Clients will retry at random.'],
    ['503 Service Unavailable, with Retry-After', 'Right. Overload is the server’s problem, not the client’s; 503 plus Retry-After says “come back shortly”. 429 is for a client that exceeded its policy.'],
  ]),
  step('Which responses carry the rate-limit headers (limit, remaining, reset)?', [], 0, [
    ['Every response, so clients can pace themselves before they ever see a 429', 'Right. Remaining = 3 on a 200 tells a good client to slow down now. Retry-After is added on the 429 itself.'],
    ['Only 429 responses', 'Then a client learns its budget only by failing. Good clients want to slow down before the wall.'],
    ['Only when the client asks with a special header', 'Clients that most need the information are the ones that never ask. Send it always; it is a few bytes.'],
  ]),
];

export const placement = [
  step('40,000 requests per second from three IP addresses, no API key, all hitting the search endpoint. Where is it cheapest to drop them?', [], 0, [
    ['At the edge (CDN or web application firewall), by IP, before they reach your servers', 'Right. The edge sees the raw client address and can drop a flood before it costs you TLS handshakes, gateway CPU or a Redis call.'],
    ['In the search service, after the query is parsed', 'By then you have paid for the connection, the gateway, authentication and parsing — the flood has already done most of its damage.'],
    ['In the client SDK', 'An attacker doesn’t use your SDK. Client-side limits only help clients that want to be helped.'],
    ['In the database connection pool', 'The flood would starve every other caller of connections first. That is a symptom, not a limit.'],
  ]),
  step('“Free keys get 60 requests a minute, Pro keys 600.” Which layer can enforce that?', [], 1, [
    ['The edge, by IP', 'The edge usually hasn’t authenticated the request, so it doesn’t know the API key or the plan. One office NAT can also hide hundreds of honest users behind one IP.'],
    ['The API gateway, right after authentication', 'Right. The gateway has just resolved the API key and its plan, and it sees every route. That is where per-key, per-plan, per-endpoint limits belong.'],
    ['A sidecar next to each service', 'A sidecar sees one service’s traffic. A plan limit spans every endpoint the key calls, so the counts would be split across services.'],
  ]),
  step('“At most 5 verification texts per phone number per hour.” The gateway sees POST /otp with a JSON body. Where does this limit live?', [], 2, [
    ['The gateway, keyed by API key', 'One attacker with one key could still text a single victim’s number a thousand times — and each text costs money. The key here is the phone number.'],
    ['The edge, keyed by IP', 'Rotating IPs is cheap; the abuse target is the number. And the edge doesn’t parse your request body.'],
    ['Inside the OTP service, keyed by phone number, before it calls the SMS provider', 'Right. Only the service knows this request is an SMS to that number. Business-specific limits live where the business meaning is.'],
  ]),
];

export const windows = [
  step('Fixed windows, 100 requests per minute. A client sends 100 requests at 11:59:59 and 100 more at 12:00:00. How many pass?', [
    row('Window', ['11:59', '11:59', '12:00', '12:00'], {}, {}),
    row('Second', [':58', ':59', ':00', ':01'], { 1: '100 sent', 2: '100 sent' }, { tones: { 1: 'hot', 2: 'hot' } }),
  ], 2, [
    ['100 — the limit is 100 per minute', 'The counter is per aligned window. The first 100 fill the 11:59 window; at 12:00:00 a brand-new counter starts at zero.'],
    ['150', 'There is no partial carry-over in a fixed window. Each side of the boundary gets its whole quota.'],
    ['200 — twice the limit within about one second', 'Right. This is the boundary burst: the worst case for a fixed window is 2 × limit in any window-length span, and it can all land in two adjacent seconds.'],
  ]),
  step('Pro keys are limited to 600 requests a minute. With a sliding window log, at about 100 bytes per stored timestamp, how much memory do 50,000 keys at full use need?', [], 2, [
    ['About 5 MB', 'That is one ~100-byte counter per key — the cost of a token bucket, not a log. The log stores one entry per request.'],
    ['About 300 MB', 'Check the zeros: 50,000 × 600 = 30 million entries, × 100 B = 3 GB.'],
    ['About 3 GB — 600 times a counter', 'Right. 50,000 × 600 × 100 B = 3 × 10⁹ bytes. Exactness costs memory proportional to the limit.'],
    ['About 30 GB', 'One zero too many: 50,000 × 600 × 100 B is 3 GB.'],
  ]),
  step('Sliding window counter, limit 100 per minute. The previous minute admitted 80; this minute has admitted 30 so far; you are 15 seconds in. What is the estimate, and does the next request pass?', [
    row('Window', ['previous', 'current'], { 0: '× 45/60', 1: '× 1' }, {}),
    row('Count', [80, 30], {}, { tones: { 1: 'hot' } }),
  ], 1, [
    ['110 — rejected', 'That adds the whole previous minute. Only the part of it still inside the sliding minute counts: 45 of its 60 seconds.'],
    ['90 — allowed, and exactly 10 more fit before the estimate reaches 100', 'Right. 80 × 45/60 + 30 = 60 + 30 = 90. Requests pass while 60 + current < 100, so current can rise from 30 to 40.'],
    ['30 — allowed', 'Ignoring the previous minute brings back the fixed-window boundary burst.'],
    ['70 — allowed', 'That weights the previous minute by the elapsed 15 seconds instead of the remaining 45. The previous window’s overlap shrinks as the current one fills.'],
  ]),
];

export const buckets = [
  step('Pro bucket: capacity 100, refill 10 tokens per second. At 12.40 s the bucket holds 3 tokens. The next request arrives at 12.85 s. How many tokens are left after it is served?', [
    row('Time', ['12.40 s', '12.85 s'], { 0: 'LAST', 1: 'NOW' }, { tones: { 1: 'hot' } }),
    row('Tokens', ['3', '?'], {}, {}),
  ], 1, [
    ['2', 'That forgets the refill. Nothing ran in the background, but 0.45 s did pass — lazy refill credits it now.'],
    ['6.5', 'Right. Refill: 3 + 0.45 s × 10/s = 7.5, capped at 100. Spend one: 6.5. No timer thread, just arithmetic on the stored timestamp.'],
    ['7.5', 'That is the level before this request spends its token.'],
    ['100', 'Only a long idle period fills the bucket. 0.45 s earns 4.5 tokens, not 97.'],
  ]),
  step('A Pro client (capacity 100, 10/s) has been idle for an hour, then sends 500 requests at once. How many pass immediately?', [], 2, [
    ['500 — it saved up an hour of tokens', 'An hour at 10/s would be 36,000 tokens, but the bucket caps at its capacity. Idle time is not banked beyond 100.'],
    ['10', 'Ten is the refill per second. The burst allowance is the capacity.'],
    ['100 — the capacity; the rest are rejected (and 10 more become available each second)', 'Right. Capacity is the burst; refill rate is the long-run average. Two knobs, set independently.'],
  ]),
  step('GCRA with T = 100 ms per request and a burst of 100, so the tolerance τ = 99 × 100 ms = 9.9 s. The stored TAT is 22.0 s and the clock says 12.0 s. Is the request allowed?', [
    row('GCRA', ['now 12.0 s', 'TAT 22.0 s', 'τ 9.9 s'], { 1: 'STORED' }, { tones: { 1: 'hot' } }),
  ], 0, [
    ['No: TAT − now = 10.0 s, more than τ. It would conform at 12.1 s', 'Right. The client is 10 s ahead of schedule and may only be 9.9 s ahead. Retry-After = TAT − τ − now = 0.1 s. In token terms, the bucket holds 100 − 10.0/0.1 = 0 tokens.'],
    ['Yes: TAT is in the future, so there is capacity', 'TAT in the future just means the client is ahead of schedule. The question is whether it is more than τ ahead.'],
    ['Yes: 12.0 s is after the previous request', 'GCRA doesn’t compare against the previous request. It compares the theoretical arrival time with now plus the tolerance.'],
  ]),
  step('A leaky bucket used as a queue holds up to 100 requests and drains 10 per second. The queue is full. How long does the newest request wait before it is processed?', [], 1, [
    ['0.1 s', 'That is the wait for the request at the head of the queue. The newest one is at the back, behind 99 others.'],
    ['About 10 s', 'Right. 100 queued ÷ 10 per second = 10 s. Queues smooth traffic by spending latency — fine for outgoing jobs, usually unacceptable for an API caller.'],
    ['It is rejected immediately', 'Only the 101st is rejected. Everything already in the queue is served, slowly.'],
  ]),
];

export const chooseAlgorithm = [
  step('A public API: bursty mobile clients, 50,000 keys, up to 1M requests per second, per-check budget of 5 ms. Which algorithm?', [], 3, [
    ['Sliding window log', 'Exact, but memory grows with the limit: 3 GB for Pro keys alone, and a sorted-set write per request.'],
    ['Fixed window', 'Cheap, but the boundary lets 2 × limit through in a second — the exact spike the limiter exists to stop.'],
    ['Leaky bucket queue', 'It would hold API callers in a queue for seconds. Clients would time out instead of getting a clean 429.'],
    ['Token bucket (or GCRA)', 'Right. Constant memory per key, bursts are a setting rather than an accident, and the refill is computed lazily with no background jobs.'],
  ]),
  step('Outgoing calls to a payment provider that rejects anything faster than 50 per second. The calls come from a background job and may wait. Which algorithm?', [], 1, [
    ['Token bucket with a burst of 100', 'A burst of 100 would hit the provider at once and get rejected. Here bursts are the enemy.'],
    ['Leaky bucket as a queue, draining at 50 per second', 'Right. The job can wait, and the provider needs a smooth stream. Shaping, not rejecting, is the goal.'],
    ['Fixed window of 50 per second', 'The boundary would allow 100 within a few milliseconds — exactly what the provider rejects.'],
  ]),
  step('An internal quota: “roughly 1,000 report exports per hour per team”. Nobody minds a little slack. Simplest correct choice?', [], 0, [
    ['Fixed window: INCR a key that includes the hour, with an expiry', 'Right. One atomic command, a few bytes per team, and a 2× boundary burst on a rough internal quota hurts nobody. Choosing the simple tool when it is enough is a senior move.'],
    ['Sliding window log', 'Exact to the request, and nobody asked for exact. You would store up to 1,000 timestamps per team for no benefit.'],
    ['GCRA with a multi-region sync', 'Engineering for a requirement that doesn’t exist. Say “roughly” out loud and pick the simple tool.'],
  ]),
];

export const races = [
  step('Limit 100. Two gateways handle requests for the same key at the same moment. Both GET the count (99), both see room, both SET it to 100. How many requests were admitted in total?', [
    row('Gateway A', ['GET → 99', 'admit', 'SET 100'], {}, {}),
    row('Gateway B', ['GET → 99', 'admit', 'SET 100'], { 1: 'RACE' }, { tones: { 1: 'hot' } }),
  ], 2, [
    ['100 — the counter says 100', 'The counter says 100 because both writes stored the same number. One increment was lost.'],
    ['99', 'Both requests were admitted after the 99 earlier ones.'],
    ['101 — and the stored count is still 100', 'Right. Read-then-write from two machines is a lost update. At 1M requests per second this is not rare; it is constant.'],
  ]),
  step('A fixed-window limiter does INCR rl:k42 and then, as a separate command, EXPIRE rl:k42 60. The gateway crashes between the two. The key has no window id in its name. What happens?', [], 1, [
    ['Nothing — Redis expires keys eventually anyway', 'Redis only expires keys that have a TTL. This one never got one.'],
    ['The key lives forever: once it reaches the limit, that client is blocked permanently', 'Right. The window was supposed to be reset by the TTL. Make INCR and EXPIRE one atomic step (a MULTI/EXEC transaction or a Lua script) — or put the window id in the key name, so a missed TTL leaks a little memory instead of blocking a customer.'],
    ['The count resets to zero on the next INCR', 'INCR only increments. Nothing resets it without the TTL.'],
  ]),
  step('Token bucket in Redis: read tokens and timestamp, compute the refill, decide, write back — from many gateways at once. What makes it correct within the latency budget?', [], 3, [
    ['A distributed lock around the read-modify-write', 'Extra round trips to take and release the lock, plus a new failure mode when the holder dies — on every request.'],
    ['WATCH/MULTI/EXEC and retry on conflict', 'Correct, but a hot key conflicts constantly, and retries have no upper bound on latency. The p99 suffers exactly when traffic is highest.'],
    ['Store the bucket in Postgres with SELECT … FOR UPDATE', 'Row locks at 1M/s on hot keys, with disk-backed latency. Correct and far too slow.'],
    ['A Lua script, so the whole read-refill-decide-write runs as one atomic command in one round trip', 'Right. Redis runs each script to completion before the next command, so no other gateway can interleave. One round trip keeps the 5 ms budget.'],
  ]),
];

export const keys = [
  step('In Redis Cluster you name the key rl:{tenant42}:{user7}:min. Which part decides the hash slot?', [], 0, [
    ['Only "tenant42" — the first {…} pair. Every user in that tenant lands in the same slot', 'Right. Redis hashes the text inside the first non-empty pair of braces. A big tenant becomes one hot shard. Put the tag on what should be co-located, e.g. rl:{t42:u7}:min.'],
    ['The whole key, braces included', 'Braces are not decoration in Redis Cluster. They mark the hash tag.'],
    ['Both tags combined: "tenant42" and "user7"', 'Only the first pair counts. The second pair is ordinary key text.'],
  ]),
  step('Each gateway computes the refill with its own clock, and the clocks differ by up to 50 ms. A key refills at 1,000 tokens per second. What can the skew cost?', [], 2, [
    ['Nothing — 50 ms is too small to matter', 'At 1,000 tokens per second, 50 ms is 50 tokens.'],
    ['The bucket can never refill', 'A slow clock earns nothing for a moment (with a max(0, elapsed) guard); it doesn’t stop refill forever.'],
    ['Up to 50 extra tokens each time the key’s requests move from a slow-clock gateway to a fast-clock one. Use the Redis server’s clock inside the script instead', 'Right. Elapsed time measured across two clocks includes their skew. One key lives on one Redis primary, so its TIME is one clock for that key.'],
  ]),
  step('What TTL should a token-bucket key get?', [], 1, [
    ['One minute, like everything else', 'If the refill takes longer than a minute, the key expires while the bucket is still partly empty — and a missing key is read as a full bucket. That hands out free tokens.'],
    ['The time it takes to refill completely, plus a little slack', 'Right. Once the bucket would be full, the stored state says exactly what a missing key says. Expiring it then loses nothing and frees memory.'],
    ['No TTL — buckets are small', 'Small times every IP address that ever visited adds up, and nothing ever cleans them. A TTL is free garbage collection.'],
  ]),
];

export const hybrid = [
  step('One internal service key sends 200,000 requests per second. A Redis primary handles roughly 50,000 script calls per second. Would adding shards help?', [], 1, [
    ['Yes — 4 more shards gives 200,000 per second', 'A key hashes to exactly one slot on one shard. More shards spread different keys, not one key.'],
    ['No. One key lives on one shard; this key alone needs 4 shards’ worth of throughput', 'Right. It is a concentration problem, not a capacity problem — the same as a hot cache key. The fix is to stop sending every request to Redis.'],
    ['Yes, if you use hash tags', 'Hash tags force keys together. They can’t split one key apart.'],
  ]),
  step('Each of the 200 gateways leases tokens from the global bucket 100 at a time and spends them locally. The hot key runs at 200,000 requests per second. How many Redis calls per second does this key cost now?', [], 2, [
    ['200,000', 'That is one call per request — the situation before leasing.'],
    ['200', 'That would be one lease per gateway per second. Each gateway spends 1,000 tokens a second, so it needs 10 leases a second.'],
    ['2,000', 'Right. 200,000 ÷ 100 tokens per lease = 2,000 calls per second — 100 times fewer. The price: up to 200 × 100 = 20,000 leased tokens can sit unused on gateways, so the key may see a few early 429s near its limit, but never over-admission.'],
  ]),
  step('Instead of leasing, every gateway admits locally using the last global count it saw and syncs its counts every 100 ms. In the worst case, how far over the limit can the hot key go?', [], 0, [
    ['About one sync interval of traffic: 200,000/s × 0.1 s = 20,000 requests', 'Right. When the global bucket runs out, no gateway knows until its next sync, so everything that arrives in that interval is admitted. Leasing turns this into under-admission instead.'],
    ['A few hundred requests', 'Do the arithmetic: the key sends 20,000 requests in 100 ms, and none of the gateways knows the bucket is empty yet.'],
    ['Zero — the sync is atomic', 'Each sync is atomic; the decisions between syncs are not. That gap is the error.'],
  ]),
];

export const failure = [
  step('Redis is down. The limiter protects a public API from customers using more than their share. Fail open or closed?', [], 1, [
    ['Closed — reject everything until Redis is back', 'Every paying customer gets an outage because a protection layer failed. The cure is worse than the disease.'],
    ['Open on the per-key policy, with a coarse local limit per gateway and a loud alert', 'Right. Briefly over-serving is better than blocking everyone, and the local ceiling still stops a runaway client. The alert makes sure “no limits” never happens silently.'],
    ['Open, silently', 'Nobody would know the limiter was off. Make fail-open the most visible event on the dashboard.'],
  ]),
  step('Redis is down. This limiter caps password attempts per account. Fail open or closed?', [], 0, [
    ['Closed — or a strict local limit — because here the limiter is the security control', 'Right. Failing open means unlimited password guessing for as long as Redis is down. When the limiter is the protection, losing it must not remove the protection.'],
    ['Open — availability first', 'Availability of password guessing is not a feature. The answer flips because of what the limiter protects.'],
    ['It doesn’t matter for logins', 'It matters most for logins. Credential stuffing is exactly what this limiter exists for.'],
  ]),
  step('Redis is timing out at 3 ms on every call. There is no circuit breaker. What happens to latency?', [], 2, [
    ['Nothing — fail-open means requests continue', 'They continue, but each one waits for the 3 ms timeout first.'],
    ['Latency improves because Redis is skipped', 'Nothing skips it. Every request still tries Redis and waits.'],
    ['Every request pays the full 3 ms timeout, eating most of the 5 ms budget. A circuit breaker stops calling Redis until probes succeed again', 'Right. A dead dependency should fail fast. The breaker opens after repeated failures, skips Redis entirely, and lets a trickle of probe calls test for recovery.'],
  ]),
];

export const regions = [
  step('An Enterprise key has 6,000 requests per minute, split evenly across three regions: 2,000 each. 90% of this customer’s traffic comes from the EU. What happens?', [], 1, [
    ['Nothing — the global total is still 6,000', 'Each region enforces only its own share. The EU share is 2,000 a minute.'],
    ['The EU region throttles them at 2,000 a minute while they want 5,400, though they pay for 6,000', 'Right. A static split is simple and fast but unfair when traffic is uneven. Weight the shares by recent traffic and rebalance every few seconds.'],
    ['The other regions lend tokens automatically', 'Only if you build that. A static split has no lending.'],
  ]),
  step('Why not keep one global counter in one region and have every region call it?', [], 0, [
    ['A cross-region round trip costs tens to over a hundred milliseconds — far past a 5 ms budget, and the limiter region becomes everyone’s dependency', 'Right. Exact global counting buys correctness with latency and a cross-region single point of failure.'],
    ['Redis cannot be reached from another region', 'It can; it is just slow and fragile at that distance.'],
    ['Counters cannot be shared', 'They can. The question is what each check would cost.'],
  ]),
];

export const drills = [
  step('Minute 9 of a 45-minute round. You have three functional requirements and numbers for latency, scale and accuracy. The interviewer mentions that “per-endpoint usage analytics would be nice”. What now?', [], 2, [
    ['Design analytics too — it is a fair requirement', 'That is how 6 minutes of requirements becomes 18. Every extra feature comes out of the deep dives.'],
    ['Keep asking clarifying questions until nothing is ambiguous', 'Nothing is ever fully unambiguous. The checkpoint is 0:09.'],
    ['Put analytics on the out-of-scope list out loud, say the summary sentence, and move to entities', 'Right. Scope it, say it, ask for the nod, move. The deep dives are where this design is won.'],
  ]),
  step('Why does fail-open win over fail-closed for a public API rate limiter?', [], 1, [
    ['Fail-open is easier to implement', 'Both are a branch on a timeout. The reason is about consequences, not code.'],
    ['Blocking all paying customers because the limiter died is worse than briefly over-serving; the limiter protects capacity, it is not the product', 'Right — a product decision. And know the inversion: a login brute-force limiter fails closed, because there the limiter is the security control.'],
    ['Fail-closed would lose the audit log', 'The audit log is how you notice fail-open; it doesn’t decide the policy.'],
    ['Redis cannot fail closed', 'Redis doesn’t choose. Your gateway code does.'],
  ]),
  step('100 requests at 11:59:59 and 100 more at 12:00:00 all pass a 100-per-minute limit. Which algorithm has this flaw?', [], 2, [
    ['Token bucket', 'A token bucket admits at most its capacity in a burst, then the refill rate. There is no window boundary.'],
    ['Sliding window counter', 'At 12:00:00 the previous minute still weighs almost fully, so almost nothing new passes.'],
    ['Fixed window', 'Right. The counter resets at the boundary, so back-to-back windows each admit a full quota. This is the standard rate-limiter follow-up question.'],
    ['Sliding window log', 'The log is exact: at 12:00:00 it still sees the 100 from one second ago.'],
  ]),
  step('Two gateway nodes check a bucket with 1 token at the same instant and both admit. The fix that respects a 5 ms budget is:', [], 2, [
    ['A distributed lock (Redlock) around the check', 'Extra round trips per request and a new failure mode when a lock holder stalls.'],
    ['A Postgres row lock on the counter', 'Disk-backed, lock-heavy, and nowhere near 1M checks per second.'],
    ['A Lua script in Redis — check, refill and decrement execute atomically in one round trip', 'Right. Redis runs a script to completion before anything else: atomicity for free, one round trip.'],
    ['A retry loop with compare-and-swap', 'Hot keys conflict constantly, and retries make the tail latency unbounded.'],
  ]),
  step('The memory estimate said about 50 MB, yet the design runs a Redis cluster. The interviewer asks why. Best answer?', [], 2, [
    ['It is standard practice for production Redis', 'Standard practice is not a reason. Name the constraint.'],
    ['The estimate is probably wrong at peak', 'The estimate holds: buckets are fixed-size, so peak traffic doesn’t grow memory.'],
    ['Capacity needs one node; a million checks per second and surviving a node failure need a cluster — it is throughput- and availability-driven, not capacity-driven', 'Right. Naming which constraint drives the cluster is the senior sentence this design hinges on.'],
    ['Cluster mode is required for Lua scripts', 'Lua runs on a single node too. Cluster mode actually adds a rule: every key a script touches must be in one slot.'],
  ]),
  step('Your one script checks both rl:{k_8f3a}:all and rl:{k_8f3a}:ep:search. Why do the braces matter?', [], 0, [
    ['They put both keys in the same hash slot, so one atomic script can touch both in Redis Cluster', 'Right. Cluster rejects a script whose keys live in different slots. The hash tag co-locates one key’s limits while different keys still spread out.'],
    ['They make the key expire with its sibling', 'Expiry is per key. Braces only affect slot placement.'],
    ['They are only for readability', 'In Redis Cluster, braces mark the hash tag.'],
  ]),
  step('A gateway sends Retry-After: 1 on a 429. The client retries after exactly one second, along with ten thousand other clients rejected in the same second. What should well-behaved clients add?', [], 1, [
    ['Nothing — the server told them when', 'Then every rejected client comes back in the same instant. Synchronised retries recreate the spike.'],
    ['Random jitter on top of Retry-After, and exponential backoff if they are rejected again', 'Right. Jitter spreads the retries out; backoff stops a client from hammering a limit it keeps hitting.'],
    ['An immediate retry, then wait', 'An immediate retry fails for the same reason and costs the server another request.'],
  ]),
];
