import { row, step } from '../../lib/trace.ts';

// Numbers used throughout (verified by a throwaway script and, where code is involved, by
// tests/java/url-shortener/Check.java):
//   100M new links/day, 100:1 reads, 1 day ≈ 10^5 s, peak = 3× average
//   writes 1,000/s avg · 3,000/s peak; redirects 10B/day · 100,000/s avg · 300,000/s peak
//   500 B/row incl. index → 50 GB/day → 18.25 TB/yr → 91.25 TB in 5 yr → 182.5 TB in 10 yr
//   62^6 = 56,800,235,584 · 62^7 = 3,521,614,606,208 · 62^8 ≈ 2.18 × 10^14
//   links in 5 yr = 182.5B → 62^7 fill 5.18% (1 in 19.3) · 10 yr = 365B → fill 10.4% (1 in 9.6)
//   birthday: 50% chance of some collision after √(2N ln 2) ≈ 2.21M codes; 1% after ≈ 266K
//   Snowflake id in base62: 10 chars for its first ~6.3 years past the epoch, then 11

export const scoping = [
  step('Iris lists five features: shorten, redirect, custom aliases, expiry, click analytics. You have six minutes. Which two make it this product?', [], 1, [
    ['Custom aliases and analytics — they are what customers pay for', 'They may be what sells the premium plan, but without shorten and redirect there is no product to sell. Keep them as stretch goals.'],
    ['Shorten and redirect; aliases and expiry are small add-ons, analytics a stretch — say so out loud', 'Right. The two verbs without which it is not a link shortener, then the rest named, sized and offered for veto. Aliases and expiry are cheap to fold in; analytics is a separate pipeline.'],
    ['All five — leaving any out looks lazy', 'Five features in 45 minutes means none of them gets a deep dive. Naming what you are not doing is scored as maturity, not laziness.'],
  ]),
  step('Which non-functional requirement decides the most boxes in this design?', [], 2, [
    ['"Creating a link should be fast"', 'Creates are 1,000 a second and nobody notices 80 ms on a create. It decides almost nothing.'],
    ['"Strong consistency everywhere"', 'A link never changes after it is created, so there is almost nothing to keep consistent. Promising it everywhere buys cross-region latency for no benefit.'],
    ['"Redirects in under 50 ms at p99 at 300,000 a second, and an acknowledged link is never lost"', 'Right. The redirect budget forces a cache and an edge layer; durability forces a replicated write before you return 201. Those two sentences place most of the boxes.'],
  ]),
];

export const estimate = [
  step('100M new links a day, 100 redirects per link, a day rounded to 10⁵ seconds, peak 3× average. Peak redirects per second?', [], 1, [
    ['30,000 per second', 'That is one zero short: 100M × 100 = 10B redirects a day, not 1B.'],
    ['300,000 per second', 'Right. 10¹⁰ ÷ 10⁵ = 100,000 a second on average, × 3 for peak = 300,000.'],
    ['3,000 per second', 'That is peak creates (100M ÷ 10⁵ × 3). Redirects are 100 times more.'],
  ]),
  step('500 B per row including indexes. How much logical storage after five years, and what does it decide?', [], 0, [
    ['About 91 TB — past one comfortable node, so the table is partitioned by code from the start', 'Right. 100M × 500 B = 50 GB/day; × 365 ≈ 18.25 TB/yr; × 5 ≈ 91 TB. About 46 partitions at 2 TB each, before replicas.'],
    ['About 18 TB — one big Postgres box', '18.25 TB is one year. Climb to the planning horizon: five years is five times that.'],
    ['About 91 GB — tiny', 'A unit slip: 50 GB a day is already more than that. GB × 365 × 5 lands in TB.'],
  ]),
  step('Bandwidth for redirects: 300,000 a second × ~500 B per response. Does it change the design?', [], 2, [
    ['Yes — 150 MB/s needs its own CDN tier', 'The CDN appears for latency and load, not bandwidth. 150 MB/s spread across a fleet is small.'],
    ['Yes — it forces compression', 'A redirect is a status line, a Location header and little else. There is nothing worth compressing.'],
    ['No — about 150 MB/s across the fleet; say "non-issue" and move on', 'Right. Estimation earns its keep by deciding what to ignore. Say the number, say it changes nothing, spend the time elsewhere.'],
  ]),
];

export const contract = [
  step('A phone on a train sends POST /urls, the 201 is lost in a tunnel, and the app retries. Without an idempotency key, what happens?', [], 1, [
    ['The server rejects the duplicate automatically', 'Nothing in a plain POST lets the server recognise a retry. It looks like a brand-new request.'],
    ['Two different short codes now point at the same long URL', 'Right. Harmless for routing, but the user sees two links, quota counts twice, and analytics split. An Idempotency-Key header lets the server return the first response again.'],
    ['The second request overwrites the first code', 'Each create mints a fresh code; nothing is overwritten. The problem is a duplicate, not a lost write.'],
  ]),
  step('Where does the creator\'s user id come from in POST /urls?', [], 0, [
    ['From the auth token on the request', 'Right. Identity comes from the session, never the body — otherwise any client can create links in anyone\'s name and burn their quota.'],
    ['From a userId field in the JSON body', 'Then any client can claim to be anyone. The body says what to create; the token says who is asking.'],
    ['From the short code', 'The code does not exist until the server mints it, and it carries no identity.'],
  ]),
];

export const redirects = [
  step('Marketing wants exact click counts on every link. Which redirect status should GET /{code} return?', [], 1, [
    ['301 Moved Permanently', '301 is cacheable by default (heuristically cacheable in HTTP terms), so a browser may skip your server on the next click. Those clicks never reach your counters.'],
    ['302 Found, with Cache-Control: private, no-store or a short max-age', 'Right. 302 is not cached unless you say so, so every click comes back to you — counted, and redirected to the current destination.'],
    ['200 with a page that redirects in JavaScript', 'Slower, breaks clients that do not run JavaScript, and still needs a cache policy. A plain 3xx is the contract every client understands.'],
  ]),
  step('A link is reported as phishing and you disable it. Users who clicked it before still land on the phishing page. Why?', [
    row('Response', ['301', 'no Cache-Control'], { 0: 'STATUS' }, { tones: { 0: 'hot' } }),
  ], 0, [
    ['Their browsers cached the 301 and never asked you again', 'Right. A cached permanent redirect lives in each browser, where you cannot purge it. That is the hidden cost of 301: you lose the ability to change your mind.'],
    ['The CDN ignored your purge', 'A CDN purge can work and the browsers still hold their own copy. The browser cache is the one you cannot reach.'],
    ['DNS caching', 'DNS resolves the shortener\'s host name; it knows nothing about individual codes.'],
  ]),
];

export const keyspace = [
  step('100M links a day for five years is 182.5 billion links. Six base62 characters give 62⁶ ≈ 56.8 billion codes. Enough?', [], 2, [
    ['Yes, with headroom', '56.8 billion is less than 182.5 billion. Six characters run out in under two years at this rate.'],
    ['Yes, if expired codes are reused', 'Reusing codes sends old links in emails and browser caches to someone else\'s destination. And it would still need more than three times the space.'],
    ['No — seven characters: 62⁷ ≈ 3.52 trillion, so five years fills about 5%', 'Right. 182.5B ÷ 3.52T ≈ 5.2%, about 19× headroom; ten years is still only about 10% full.'],
  ]),
  step('Random 7-character codes, five years in, the space is 5.2% full. What is the chance that a freshly drawn code is already taken?', [], 0, [
    ['About 5.2% — the fill fraction; a retry or two fixes it', 'Right. A uniform draw hits a taken code with probability equal to the fill. Expected attempts are 1 ÷ (1 − 0.052) ≈ 1.05, and needing more than three is about 1 in 7,000.'],
    ['About 50% — the birthday paradox', 'The birthday bound answers "has ANY pair collided?" — that happened within minutes. The question per insert is "is THIS code taken?", which is the fill fraction.'],
    ['Essentially zero — 3.5 trillion is huge', 'With 182.5 billion codes already issued, one in nineteen draws lands on one. Large space, not an empty one.'],
  ]),
];

export const hashing = [
  step('Codes are the first 7 base62 characters of SHA-256(longUrl). The space holds 3.52 trillion. Roughly when does it become a coin flip that some two different URLs share a code?', [], 1, [
    ['After about 1.76 trillion links — half the space', 'That is the intuition the birthday paradox breaks. Collisions between pairs show up long before the space is half full.'],
    ['After about 2.2 million links — roughly half an hour of traffic', 'Right. √(2 × 3.52 × 10¹² × ln 2) ≈ 2.2M. At 100M links a day that is about 32 minutes. Collisions are not a corner case; the design must detect and resolve them.'],
    ['Never — SHA-256 does not collide', 'SHA-256 is collision-resistant over all 256 bits. You kept about 42 bits\' worth. Truncation is what collides.'],
  ]),
  step('Two different users shorten the same long URL. With pure hash-and-truncate, what happens?', [], 2, [
    ['They get different codes', 'Same input, same hash, same code — unless you salt it, which removes the only advantage of hashing.'],
    ['The second create fails', 'It succeeds; it just returns the code the first user already owns.'],
    ['They share one code — and its analytics, its expiry and its owner', 'Right. Deduplication sounds nice until one user deletes "their" link, or sets it to expire, and breaks the other\'s. Per-user dedup, if wanted, is a separate lookup.'],
  ]),
];

export const counters = [
  step('One Redis INCR hands out every id. Creates peak at 3,000 a second. What is the real problem?', [], 2, [
    ['Throughput — Redis cannot do 3,000 INCRs a second', 'One node does on the order of 100,000 simple operations a second. Throughput is fine.'],
    ['Ids are not random enough', 'True but secondary — the next chapter. There is a worse problem first.'],
    ['It is a single point of failure, and a failover that loses recent writes re-issues ids already used', 'Right. With asynchronous replication, a promoted replica may be behind: it hands out ids that already map to links. Uniqueness — the one promise — breaks.'],
  ]),
  step('Each app server reserves a block of 10,000 ids at a time from a durable counter row. A server crashes holding half a block. What is lost?', [
    row('Server A block', ['1,240,000', '…', '1,244,999', '1,245,000', '…', '1,249,999'], { 0: 'START', 3: 'CRASH' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'out', 4: 'out', 5: 'out' } }),
  ], 1, [
    ['5,000 links', 'No link is lost. Those ids were never handed to any link, and nobody else will get them either.'],
    ['5,000 unused ids — a gap, which is harmless', 'Right. Gaps cost nothing: even a hundred servers losing a block every day for ten years wastes about 0.1% of 62⁷. Uniqueness is what matters, and the block is never re-issued.'],
    ['Uniqueness — another server may reuse them', 'The counter row only moves forward; the next reservation starts after this block. Nobody reuses it.'],
  ]),
  step('Why not use Snowflake ids as the codes?', [], 0, [
    ['A 63-bit id is 10–11 base62 characters, and the timestamp makes codes guessable', 'Right. The timestamp shifted by 22 bits passes 62¹⁰ about 6.3 years after the epoch, so codes grow to 11 characters — and anyone can predict the next one from the clock.'],
    ['Snowflake cannot generate 3,000 ids a second', 'One node can issue 4,096 per millisecond. Rate is not the issue.'],
    ['Snowflake ids are not unique across machines', 'The 10 machine bits make them unique as long as no two live nodes share a machine id.'],
  ]),
];

export const enumeration = [
  step('Codes are a raw counter in base62. A competitor shortens one link on Monday and one on Tuesday. What have you told them?', [], 1, [
    ['Nothing — the codes look random', 'Base62 of a counter is not random: the Tuesday code is the Monday code plus about 100 million.'],
    ['Your exact daily volume, and how to walk every link you have', 'Right. Subtract the two codes for your volume; count upwards to scrape every link, including ones users assumed were private.'],
    ['Only the owner of each link', 'The code says nothing about the owner. It says how many links came before it.'],
  ]),
  step('You keep the counter but pass each id through a keyed permutation of [0, 62⁷) before encoding. What does that buy?', [], 0, [
    ['Codes stay unique with no collision check, but no longer reveal order or volume', 'Right. A permutation is one-to-one, so distinct ids give distinct codes. It hides the sequence from anyone without the key. It is obfuscation, not secrecy: a random guess still finds a real link about 1 time in 19 at 5% fill.'],
    ['Codes become unguessable secrets, safe for private documents', 'At 5% fill, about one random guess in 19 still lands on a real link. Anything private needs a long random token or authentication, not a short code.'],
    ['Shorter codes', 'A permutation maps the space onto itself. Same length.'],
  ]),
];

export const claiming = [
  step('Random codes, five years in. Which write makes uniqueness safe when two servers draw the same code at the same instant?', [], 2, [
    ['Read the code first; insert if the read found nothing', 'Check-then-act. Both servers can read "absent" before either writes, and the second insert silently overwrites the first link.'],
    ['A distributed lock around the read and the insert', 'Correct but slow and fragile: two extra round trips and a lock service on the write path, to do what the database can do in one step.'],
    ['One conditional insert — insert only if the code does not exist; on failure, draw again', 'Right. A unique key or conditional put makes the store decide atomically. The loser gets a conflict and retries with a new code.'],
  ]),
  step('A user requests the custom alias "spring-sale". What makes it safe against a generated code or another user taking it at the same moment?', [], 1, [
    ['A Bloom filter of taken aliases', 'A Bloom filter can say "maybe taken" for a free alias and cannot settle a race. It is a pre-check at most.'],
    ['The same conditional insert as generated codes; 409 Conflict if it is taken', 'Right. One table, one unique key, one conditional insert. Aliases and generated codes share a namespace, so the same mechanism protects both.'],
    ['A separate aliases table checked before insert', 'Two tables means a generated code and an alias can both claim "spring1" — and the check-then-insert race is back.'],
  ]),
];

export const storage = [
  step('91 TB, single-key lookups, no joins on the hot path. Which partition key?', [], 0, [
    ['The short code, hashed', 'Right. Every redirect carries the code and nothing else, so each lookup touches exactly one partition. Hashing spreads codes evenly.'],
    ['The creator\'s user id', 'GET /{code} has no user id, so every redirect would ask every partition. The hottest path must stay single-partition.'],
    ['The creation date', 'Every new link lands on today\'s partition, which takes all the writes — and recent links take most reads too. A hot spot by design.'],
  ]),
  step('Users also want "list my links, newest first". The table is partitioned by code. What serves that query?', [], 2, [
    ['Scan all partitions and filter by owner', 'A scatter-gather across ~46 partitions for every page view, and a full scan in each. It does not scale.'],
    ['Re-partition the main table by owner', 'That breaks the redirect path, which is 100× hotter. The main table stays keyed by code.'],
    ['A second table keyed by owner and created-at, written alongside the link', 'Right. Denormalise: user_links(owner_id, created_at, code). A secondary index in the store is the managed version of the same idea. It can lag slightly; the redirect table cannot.'],
  ]),
];

export const hotPath = [
  step('Redirects peak at 300,000 a second. The store is sized for storage and writes, with a read budget of about 30,000 point reads a second. What cache hit ratio do you need — and what do you aim for?', [], 1, [
    ['50% is plenty', 'That sends 150,000 reads a second to the store — five times the budget.'],
    ['At least 90%; aim for 99%, which leaves the store at 3,000 reads a second', 'Right. (1 − 0.90) × 300,000 = 30,000 is exactly the budget, with no headroom. Links are immutable and clicked in bursts, so 99% is realistic — and the CDN takes a share before the cache sees anything.'],
    ['100% — never touch the store', 'Brand-new links, cold links and restarts always miss. Design for the miss rate you will actually have.'],
  ]),
  step('A celebrity posts a link. It takes 50,000 redirects a second, all for one key on one cache shard. First fix?', [], 0, [
    ['Serve the redirect from the CDN edge, and add a ~1 s in-process cache on each redirect server', 'Right. The edge absorbs most of it before your data centre; whatever arrives is answered from each server\'s memory, so the shard sees about one read per server per second.'],
    ['Add cache shards', 'One key hashes to one shard. More shards do not spread a single key.'],
    ['Lengthen the key\'s TTL', 'The key is already cached. The problem is the request rate on one shard, not misses.'],
  ]),
  step('Bots request random codes that do not exist. Every request misses the cache and reaches the store. Fix?', [], 2, [
    ['Raise the TTL on real links', 'Real links are not the problem; the missing ones are never cached at all.'],
    ['Switch to 301s so browsers cache', 'Bots do not keep a browser cache, and there is nothing to redirect to.'],
    ['Cache the 404 briefly (negative caching) and rate-limit per IP', 'Right. A short-lived "not found" entry stops repeats at the cache; rate limits stop the walk. Delete the negative entry when a code is created.'],
  ]),
];

export const expiry = [
  step('A link expires at 12:00. The cache TTL is 24 hours and the entry was cached at 11:30. What stops it redirecting at 12:05?', [], 1, [
    ['Nothing — wait for the cleanup job', 'The cleanup job is about reclaiming storage. Correctness must not depend on it.'],
    ['Store expires_at in the cached value, check it on every read, and cap the TTL at the time left', 'Right. The read path refuses anything past expires_at, wherever it was found. Capping the cache TTL at min(24 h, expires_at − now) means the entry also leaves on time.'],
    ['Purge the CDN at 12:00', 'One purge per expiring link, at the right second, for millions of links a day — and the in-process and Redis caches still hold it.'],
  ]),
  step('Should an expired code be reissued to a new link?', [], 2, [
    ['Yes — it frees up keyspace', 'The keyspace is 5% full after five years. Reuse saves nothing that matters.'],
    ['Yes, after a 30-day quarantine', 'Better, but old copies of the link live in emails, documents and browser caches for years. A click on one would land on a stranger\'s page.'],
    ['No — tombstone it so old copies get 410 Gone, never someone else\'s destination', 'Right. With 19× headroom there is no reason to recycle, and every reason not to.'],
  ]),
];

export const analytics = [
  step('Where should a click be counted?', [], 1, [
    ['Inside the redirect: UPDATE links SET clicks = clicks + 1, then redirect', 'A synchronous write on every redirect: 300,000 writes a second, and one hot row per viral link. The redirect now waits on the slowest thing in the system.'],
    ['Fire-and-forget into a local buffer, ship to a log, aggregate downstream', 'Right. The redirect never waits on analytics. Events flow to a partitioned log; a stream job rolls them into per-code, per-minute counts.'],
    ['Count from the CDN\'s monthly bill', 'A bill tells you totals across everything, not clicks per link, and arrives once a month.'],
  ]),
  step('Click events are partitioned by short code. The celebrity link is 50,000 events a second on one partition. Fix?', [], 0, [
    ['Pre-aggregate on each redirect server — send "code, count" every second instead of one event per click', 'Right. Each server sends one record per hot code per second. Per-click detail, if needed, goes to cheaper storage partitioned randomly.'],
    ['Add partitions', 'One code hashes to one partition, however many there are.'],
    ['Drop events from that link', 'The most popular link is the one the customer most wants counted.'],
  ]),
];

export const abuse = [
  step('Someone shortens a phishing URL that looks like a bank. When should you check it?', [], 2, [
    ['Only when a user reports it', 'By then thousands have clicked. Reports are the last line, not the first.'],
    ['Only at creation time', 'The destination can change after you check it — the page is clean on Monday and a phishing kit on Wednesday.'],
    ['At creation against a threat list, again periodically and on report, with a kill switch that removes the link from every cache', 'Right. Check early, re-check later, and make disabling fast: delete the cache keys, purge the CDN, serve a warning page. One more reason to prefer 302: browsers did not cache it.'],
  ]),
  step('One account creates 40,000 links an hour. What protects the system?', [], 0, [
    ['Per-account and per-IP creation rate limits, with lower limits for new or anonymous accounts', 'Right. The rate limiter walkthrough is the whole design: token bucket per identity at the gateway, 429 with Retry-After.'],
    ['A CAPTCHA on every create', 'Hostile to API customers and integrations; a step-up challenge for suspicious traffic is fine, but it is not the main control.'],
    ['Nothing — creates are cheap', 'Each link costs storage forever and may be a phishing vector. Volume is the abuse signal.'],
  ]),
];

export const regions = [
  step('Three regions. Each one mints random codes locally and replicates to the others asynchronously. What can go wrong?', [], 1, [
    ['Nothing — 3.5 trillion codes, collisions are rare', 'At 5% fill one draw in 19 collides. Rare per region is not "never" across regions.'],
    ['Two regions can mint the same code in the same second; each conditional insert succeeds locally, and replication picks a winner', 'Right. A conditional insert is only atomic inside one copy of the data. Fix: give each region its own slice of the code space, or send all creates to one home region.'],
    ['Reads become slow', 'Reads are local in this design; it is writes that need care.'],
  ]),
  step('A user in Mumbai creates a link and pastes it to a friend in Frankfurt, who clicks within a second. Replication lags two seconds. What should Frankfurt do on a miss?', [], 2, [
    ['Return 404 at once', 'The link exists; Frankfurt just has not heard yet. A 404 here — cached negatively, even — looks like a broken product.'],
    ['Wait for replication to catch up', 'How long? Holding the request open is unbounded latency on the hottest path.'],
    ['Fall back to the code\'s home region before answering 404', 'Right. If the code\'s region is encoded in it (or found by asking the home region), a local miss costs one cross-region read, only for brand-new links. Negative-cache only after that check.'],
  ]),
];

export const drills = [
  step('Which redirect status do you choose for a shortener that sells click analytics, and why?', [], 1, [
    ['301 — it is faster for users', '301s are faster on the second click only because the browser skips you — which is exactly the click you wanted to count.'],
    ['302, with a cache policy you choose, so every click returns to you', 'Right. You keep the counts and the power to change or disable a destination. If analytics did not matter, a 301 with a bounded max-age would save some load.'],
    ['307 — it is the modern one', '307 differs from 302 by preserving the method for non-GET requests. For a GET redirect the choice that matters is cacheability, and 307 is not the reason.'],
  ]),
  step('Hash-and-truncate, counter + base62, random + conditional insert. Which needs NO uniqueness check on insert?', [], 2, [
    ['Hash-and-truncate', 'Truncated hashes collide — a 50% chance of some collision after about 2.2 million links.'],
    ['Random codes', 'Random codes collide with probability equal to the fill fraction. They need the conditional insert.'],
    ['Counter + base62 (raw or through a permutation)', 'Right. Distinct counter values encode to distinct codes. But custom aliases share the namespace, so the insert should still be conditional — an alias can take a code the counter reaches later.'],
  ]),
  step('Five years, 7 characters, random codes. A scraper tries random codes. How often does it find a real link?', [], 0, [
    ['About 1 try in 19', 'Right. 182.5B ÷ 3.52T ≈ 5.2%. Short codes are not secrets: rate-limit lookups per IP, and never put private documents behind a bare short link.'],
    ['About 1 try in 3.5 trillion', 'That would be true with one link in the space. There are 182.5 billion.'],
    ['Never — random codes are unguessable', 'Unguessable means "cannot predict the next one", not "cannot hit any". A fuller space is easier to hit.'],
  ]),
  step('The cache cluster restarts empty at peak. 300,000 redirects a second, store read budget about 30,000 a second. What should the design have said?', [], 2, [
    ['Nothing — the cache is an optimisation', 'At ten times the store\'s read budget, the cache is load-bearing.'],
    ['Restart it and wait for the hit ratio', 'A cold cache starts at zero hits; the first minutes are the most dangerous.'],
    ['That the cache is load-bearing: replicas, CDN in front, request coalescing, and shedding until it warms', 'Right. Say it before the interviewer asks. The CDN keeps absorbing hot links even while the cache is cold.'],
  ]),
  step('Why is the redirect table partitioned by code rather than by user?', [], 1, [
    ['Codes are shorter than user ids', 'Length has nothing to do with it.'],
    ['The redirect — 100× the traffic of anything else — knows only the code', 'Right. The dominant query must resolve on one partition. User listings get their own denormalised table.'],
    ['Users never list their links', 'They do; that is why user_links exists. It just is not the hot path.'],
  ]),
  step('A client retries POST /urls with the same Idempotency-Key after a timeout. The first attempt actually succeeded. What does the server return?', [], 0, [
    ['The same 201 and the same short code as the first attempt', 'Right. The server stored the key with the response for 24 hours and replays it. No second link.'],
    ['409 Conflict', 'Conflict is for a different request reusing the key, or a taken alias. A faithful retry should look exactly like success.'],
    ['A new code — keys only dedupe concurrent requests', 'The key exists precisely for retries that come after the first one finished.'],
  ]),
];
