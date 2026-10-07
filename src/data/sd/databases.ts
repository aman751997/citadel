import { row, step } from '../../lib/trace.ts';

// Chapter 1 · Pick the store from the access pattern.
export const chooseStore = [
  step('Kestrel Market stores orders and payments. The order row, the payment and the stock decrement must succeed or fail together, and finance will ask new questions of this data every quarter. Peak is about 120 orders a second. Which store?', [], 0, [
    ['A relational database such as Postgres', 'Right. Multi-row transactions, constraints, joins and ad-hoc queries are exactly what this data needs, and 120 writes a second is light work for one primary.'],
    ['A wide-column store partitioned by order_id', 'It would absorb write volume you do not have. Finance’s next unplanned question would need a new table or a full scan, and you would hand-build the order-plus-payment atomicity.'],
    ['A document store, one document per order', 'An order does embed nicely, but the stock decrement and the payment live in other documents. Document stores now offer multi-document transactions, yet you give up the joins and constraints this data leans on, and gain nothing on the access pattern.'],
  ]),
  step('Chat messages: about 35,000 writes a second at peak, always read as "the latest 50 messages in conversation X", almost never updated. Which store fits that access pattern?', [], 1, [
    ['Postgres with one big messages table', 'At about 280 GB a day it outgrows one node within a month. You would end up hand-sharding Postgres to get what a partitioned store gives you natively.'],
    ['A wide-column store: partition by conversation_id, cluster by message time', 'Right. Each conversation is one partition kept in time order, so the hot read is one sequential slice, and the LSM storage underneath soaks up append-heavy writes.'],
    ['A graph database, messages as edges between users', 'Nothing here walks relationships. You read one conversation in time order, which a graph engine does no better and scales worse.'],
    ['A search engine as the primary store', 'Search indexes are derived copies built for text queries and refreshed in near real time. They are not where the only copy of a message should live.'],
  ]),
  step('Trust & Safety, mid-investigation: "Show every account within three hops of this flagged seller that shares a card, a device or an address." They ask it interactively, many times a day. What fits best?', [], 2, [
    ['Postgres with recursive self-joins', 'It can be written (WITH RECURSIVE), but each hop multiplies the rows joined, and three hops over a dense graph gets slow and hard to bound. Fine for a one-off, painful as the daily tool.'],
    ['A key-value store keyed by account id', 'Each hop becomes many round trips from the application, and you rebuild graph traversal by hand.'],
    ['A graph database', 'Right. Multi-hop traversal over typed edges (shares-card, shares-device) is the one access pattern graph engines are built for. Feed it from the source of truth; it does not replace it.'],
  ]),
  step('Buyers search listings by free text — "vintage fender strat" — with typos, filters on price, and results ranked by relevance. Where does that query run?', [], 1, [
    ['Postgres with LIKE \'%fender%\'', 'A leading wildcard cannot use a B-tree index, so it scans every listing, with no typo tolerance and no relevance ranking.'],
    ['A search index (Elasticsearch or OpenSearch) fed from Postgres by change-data-capture', 'Right. The inverted index answers text, fuzziness and ranking; Postgres stays the source of truth, and the index is a derived copy that can be rebuilt.'],
    ['Move listings into the search engine and drop them from Postgres', 'Then listing edits, stock and orders lose their transactional home. Search engines are near-real-time derived stores, not systems of record.'],
  ]),
];

// Chapter 2 · Model from the questions.
export const modeling = [
  step('Each user has exactly one settings record (language, notification toggles), read on every app start together with the user. How do you store it?', [], 1, [
    ['A separate settings table with its own id and a user_id column', 'A separate surrogate id buys nothing, and without a unique constraint nothing stops two settings rows for one user.'],
    ['Columns on the users row, or a settings table whose primary key is user_id', 'Right. A 1:1 read together belongs in the same row. Split it out — keyed by user_id itself, so the "one" is enforced — only if it is large, rarely read, or has different access rules.'],
    ['A JSON file per user in blob storage', 'Every app start now pays a second, slower fetch, and there is no transaction tying the settings to the user.'],
  ]),
  step('A photo can collect hundreds of thousands of comments. In a document store, do you embed the comments inside the photo document?', [], 2, [
    ['Yes — one read loads the photo and every comment', 'The document grows without bound and each new comment rewrites it. Many stores cap document size (MongoDB at 16 MB). Embed only small, bounded, owned children.'],
    ['Yes, all of them, but compress the document', 'Compression delays the size limit; it does not remove it. Every comment still rewrites one ever-growing document, and readers download all of it to show the first ten.'],
    ['No: store comments separately, keyed by photo_id and time, and read a page at a time', 'Right. A 1:N with an unbounded N is its own table or collection keyed by the parent. (Embedding a capped preview of the latest few is a fine extra.)'],
  ]),
  step('The feed shows a like count on every post: 400,000 post views a second. Today it runs SELECT COUNT(*) FROM likes WHERE post_id = ?. A viral post has 3 million likes. What do you change?', [], 0, [
    ['Keep a like_count column on posts, updated when a like is added or removed', 'Right. Denormalise the read you do hundreds of thousands of times a second; pay a small cost on the write you do far less often. Keep it in step (same transaction, or a reconciling job), and shard the counter if one post makes it a hot row.'],
    ['Add an index on likes(post_id)', 'The index finds the rows, but the count still walks 3 million index entries per view. The cost grows with popularity — the wrong direction.'],
    ['Cache the COUNT(*) result for an hour', 'It hides the cost for most views, but every miss on a viral post still counts 3 million rows, and the number can lag by an hour. A maintained counter is cheaper and fresher.'],
  ]),
];

// Chapter 3 · Many-to-many.
export const manyToMany = [
  step('Kestrel Events: a user attends many events; an event has many attendees. Where does "who attends what" live?', [], 2, [
    ['An attendee_ids array column on events', '"Which events is user 42 attending?" must now look inside every event row, nothing keeps the ids valid, and every RSVP rewrites a growing row that thousands of people update at once.'],
    ['An event_ids array column on users', 'The mirror image: "who is attending event 9?" must look inside every user row. Keeping both arrays means two writes that can disagree.'],
    ['A join table event_attendees(event_id, user_id), one row per pair', 'Right. Each relationship is its own row: cheap to insert or delete, protected by foreign keys and a primary key that forbids duplicates, and indexable from both directions.'],
  ]),
  step('event_attendees has PRIMARY KEY (event_id, user_id). "Who is coming to event 9?" is instant; "my upcoming events" scans the whole table. Why, and what fixes it?', [
    row('PK order', ['event_id', 'user_id'], { 0: 'LEADS' }, { tones: { 0: 'hot' } }),
  ], 1, [
    ['The table needs more memory', 'Memory makes the scan faster; it does not avoid it. The index is sorted by event_id first, so one user’s rows are scattered through it.'],
    ['An index is sorted by its leading column; add a second index on (user_id, …)', 'Right. The primary key serves one direction, a reverse index serves the other. Almost every join table needs both.'],
    ['Change the primary key to (user_id, event_id)', 'Then "who is coming to event 9?" becomes the full scan. You need both orders, not a different single one.'],
  ]),
  step('Iris: "Oh, and also — attendees can RSVP yes, no or maybe, and we want to know who invited them." Where do those fields go?', [], 0, [
    ['On the event_attendees row', 'Right. They describe the relationship, not the user and not the event. This is the moment a join table becomes an entity of its own — an attendance — with its own columns.'],
    ['On the users table', 'A user has a different RSVP for every event, so one column on users cannot hold it.'],
    ['On the events table', 'An event has a different RSVP from every attendee, so one column on events cannot hold it either.'],
  ]),
];

// Chapter 4 · Storage engines.
export const storage = [
  step('An index page holds about 400 keys, so each level of a B-tree multiplies its reach by 400. How many levels does it take to index 1 billion keys?', [], 2, [
    ['2 levels', '400 × 400 = 160,000 keys — far short of a billion.'],
    ['3 levels', '400³ = 64 million keys. Still short.'],
    ['4 levels', 'Right. 400⁴ = 25.6 billion, comfortably above 1 billion. The upper levels stay in memory, so a lookup costs about one or two disk reads.'],
  ]),
  step('Kestrel ingests 50,000 device events a second. Rows are never updated; reads are "this device, last hour". Which storage-engine family fits best?', [], 1, [
    ['B-tree, because its reads are steadier', 'Reads are steady, but each insert must read and rewrite the leaf page for its device — tens of thousands of scattered page writes a second.'],
    ['LSM-tree', 'Right. Writes become sequential appends (a log plus an in-memory table flushed as sorted files), and "this device, recent range" is a sorted read within each file.'],
    ['Neither — buy a bigger disk', 'Capacity is not the bottleneck. How each write turns into disk I/O is.'],
  ]),
  step('An LSM store holds 30 SSTables. A read asks for a key that does not exist. Why doesn’t it read all 30 files?', [], 0, [
    ['Each SSTable has a Bloom filter that can answer "definitely not here"', 'Right. A Bloom filter never gives a false "no", so most files are skipped without touching disk; a rare false "maybe" costs one extra lookup.'],
    ['The memtable remembers every key ever written', 'The memtable only holds recent writes that have not been flushed yet.'],
    ['Compaction records which keys are missing', 'Compaction merges files and drops overwritten values and old tombstones. It does not record keys that were never written.'],
  ]),
];

// Chapter 5 · Composite indexes.
export const indexes = [
  step('messages has an index on (conversation_id, created_at). Which query can NOT use it to jump straight to its rows?', [
    row('Index order', ['conversation_id', 'created_at'], { 0: '1st', 1: '2nd' }),
  ], 2, [
    ['WHERE conversation_id = 7 ORDER BY created_at DESC LIMIT 50', 'This is the query the index was built for: seek to conversation 7, walk backwards 50 entries, stop.'],
    ['WHERE conversation_id = 7 AND created_at > \'2026-10-01\'', 'Equality on the first column, range on the second: one seek, then a short walk.'],
    ['WHERE created_at > \'2026-10-01\'', 'Right. Entries are sorted by conversation first, so recent messages are scattered across every conversation. Without the leading column there is nowhere to seek to.'],
  ]),
  step('Seller dashboard: WHERE seller_id = ? AND status = \'active\' ORDER BY created_at DESC LIMIT 20. Which index serves it best?', [], 1, [
    ['(created_at, seller_id, status)', 'A range/sort column first scatters one seller’s rows across time. The engine walks recent listings from every seller, filtering as it goes.'],
    ['(seller_id, status, created_at)', 'Right. Equality columns first, then the sort column: one seek lands on this seller’s active listings already in time order. Read 20 entries, stop.'],
    ['(seller_id, created_at, status)', 'It works — seek to the seller, walk by time, skip rows that are not active — but if most of the seller’s listings are sold, it reads many entries to find 20.'],
    ['Three single-column indexes', 'Engines can combine single-column indexes (Postgres can AND bitmaps together), but the result still has to be sorted. One composite index in the right order beats three.'],
  ]),
  step('The tag page needs only photo_id and created_at: WHERE tag_id = ? ORDER BY created_at DESC LIMIT 30. With an index on (tag_id, created_at, photo_id), what does the database read?', [], 0, [
    ['Only the index — it covers the query', 'Right. Every column the query touches is in the index, so it answers without visiting table rows (an index-only scan; Postgres also consults its visibility map).'],
    ['The index, then 30 table rows', 'That happens when the query needs a column outside the index. This one does not.'],
    ['The whole table, because ORDER BY ignores indexes', 'ORDER BY can use an index whose order matches. This one matches exactly.'],
  ]),
];

// Chapter 6 · ACID.
export const acid = [
  step('A transfer debits wallet 7, then the server crashes before crediting wallet 9. Which ACID property means the debit does not survive?', [], 0, [
    ['Atomicity', 'Right. A transaction that did not commit is rolled back in full on recovery. Atomicity is about all-or-nothing under failure, not about concurrency.'],
    ['Isolation', 'Isolation is about what concurrent transactions see of each other. Here there is one transaction and a crash.'],
    ['Durability', 'Durability protects work that committed. This transaction never committed.'],
  ]),
  step('"Consistency" in ACID and "consistency" in CAP — same idea?', [], 1, [
    ['Yes: both mean every replica returns the latest write', 'That is CAP’s meaning (linearizability). ACID’s C is a different word that happens to share a spelling.'],
    ['No: ACID’s C means your invariants hold (constraints plus application logic); CAP’s C is about replicas agreeing on the latest value', 'Right. The database helps with ACID consistency through NOT NULL, UNIQUE, CHECK and foreign keys, but most invariants are the application’s job.'],
    ['No: ACID’s C means the data is durably on disk', 'That is the D.'],
  ]),
];

// Chapter 7 · Isolation and anomalies.
export const anomalies = [
  step('A wallet holds 100. T1 adds 50 and T2 withdraws 20. Each reads the balance, computes in the application, and writes the result back. Final balance?', [
    row('Timeline', ['T1 read 100', 'T2 read 100', 'T1 write 150', 'T2 write 80'], { 3: 'LAST' }, { tones: { 3: 'hot' } }),
  ], 2, [
    ['130', 'That is the correct balance — and not what this interleaving produces. T2 computed 80 from the stale 100 it read before T1 wrote.'],
    ['150', 'T1 wrote 150, but T2 wrote after it.'],
    ['80', 'Right: a lost update. T1’s deposit vanished, overwritten by a value computed from an old read. Read Committed allows it, and so does MySQL’s Repeatable Read for this read-then-write shape. Postgres Repeatable Read would abort T2 with a serialization error to retry.'],
  ]),
  step('Rule: at least one engineer is on call. Dev and Priya are both on call. At the same moment each runs: count on-call engineers; if 2 or more, take myself off call. Both see 2; both commit. Which anomaly, and what prevents it?', [
    row('Timeline', ['Dev: count = 2', 'Priya: count = 2', 'Dev: off call', 'Priya: off call'], { 3: '0 left' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['A dirty read; Read Committed prevents it', 'Neither read uncommitted data. Each saw a correct, committed count of 2.'],
    ['Write skew; Serializable prevents it, or lock the rows you checked with SELECT … FOR UPDATE', 'Right. They updated different rows, so there was no write–write conflict to detect. The invariant spanned both rows; only Serializable, or explicitly locking what you read, catches it.'],
    ['A lost update; Repeatable Read prevents it', 'No row was overwritten: Dev changed his row and Priya hers. Snapshot-style Repeatable Read lets both commit.'],
  ]),
  step('Inside one transaction a report counts open orders twice and gets 1,204, then 1,207, because new orders committed in between. What is this called?', [], 0, [
    ['A phantom read', 'Right. New rows appeared in the set the query matched. Snapshot-based Repeatable Read (Postgres, and plain SELECTs in MySQL) shows the same snapshot both times.'],
    ['A dirty read', 'The new orders were committed. A dirty read sees changes that are not committed yet.'],
    ['A lost update', 'The report only reads. Nothing was overwritten.'],
  ]),
  step('You open a transaction on a stock Postgres install without choosing a level. Which isolation level are you running?', [], 0, [
    ['Read Committed', 'Right. Each statement sees data committed before that statement began. (MySQL’s InnoDB defaults to Repeatable Read — know both.)'],
    ['Repeatable Read', 'That is InnoDB’s default in MySQL. Postgres defaults to Read Committed.'],
    ['Serializable', 'Postgres supports it (as Serializable Snapshot Isolation), but you have to ask for it.'],
  ]),
];

// Chapter 8 · Optimistic vs pessimistic.
export const locking = [
  step('One vintage guitar left (stock = 1). Two buyers press Buy in the same millisecond. Which approach guarantees exactly one wins?', [], 2, [
    ['SELECT stock; if it is above 0, UPDATE SET stock = stock - 1', 'Both can read 1 before either writes. Under Read Committed the second UPDATE waits, then subtracts from 0, and stock ends at −1.'],
    ['Let whichever request reaches the app server first win', 'There is no "first" the app servers can agree on without coordination. Both requests believe they are first.'],
    ['UPDATE inventory SET stock = stock - 1 WHERE item_id = 7 AND stock > 0, then check one row changed', 'Right. Check and decrement happen in one atomic statement under a row lock. The loser’s condition fails on the new value, it updates zero rows, and it shows "sold out".'],
  ]),
  step('A seller opens the edit form for a listing and spends ten minutes rewriting the description. Meanwhile a moderator fixes the price. How do you stop the seller silently overwriting the moderator?', [], 1, [
    ['SELECT … FOR UPDATE when the form opens; commit on save', 'That holds a row lock — and an open transaction and a pooled connection — through ten minutes of human think time. Every other writer queues behind it.'],
    ['A version column: save with WHERE id = ? AND version = 7; zero rows changed means someone got there first', 'Right. Optimistic concurrency costs nothing while the human thinks, conflicts are rare, and the loser reloads and reapplies.'],
    ['Last write wins — it is the newest', 'The newest save is the seller’s, built on a ten-minute-old copy. The moderator’s fix disappears without anyone knowing.'],
  ]),
  step('Flash sale: 5,000 buyers race for 100 tickets held in one row. The team used optimistic versioning with automatic retries. What happens?', [], 0, [
    ['Most attempts fail the version check and retry, again and again; throughput collapses into wasted work', 'Right. Optimistic control assumes conflicts are rare. On one hot row they are constant. Use the atomic conditional decrement, a short pessimistic lock, or a queue in front.'],
    ['It works perfectly — versions never conflict', 'Every buyer read the same version; only one can win each round.'],
    ['Tickets are oversold', 'The WHERE version = ? guard prevents overselling. The damage is wasted work and latency, not wrong answers.'],
  ]),
];

// Chapter 9 · Leader-follower replication.
export const replicationLag = [
  step('A seller edits her listing price, the page reloads, and the old price is back. Ten seconds later the new price appears. Reads go to async replicas. Cheapest correct fix?', [], 1, [
    ['Make every replica synchronous', 'Every write would wait on every replica, and one slow replica stalls all writes. A big hammer for one user’s view of her own edit.'],
    ['Read-your-own-writes: route the seller’s reads of what she just changed to the primary for a short window, or wait until a replica has replayed her write’s log position', 'Right. Only the author needs the guarantee, and only briefly. Everyone else can keep reading slightly stale replicas.'],
    ['Put a cache in front of the replicas', 'A cache adds a second place to be stale. The problem is which copy the author reads, not how fast it is.'],
  ]),
  step('Theo reads a friend’s new comment, refreshes, and it is gone; refreshes again, and it is back. Reads are load-balanced across three replicas with different lag. Which guarantee is missing?', [], 2, [
    ['Read-your-own-writes', 'The comment is someone else’s write. Theo is seeing time move backwards across his reads, which is a different guarantee.'],
    ['Durability', 'The comment was never lost; one replica simply had not replayed it yet.'],
    ['Monotonic reads: pin each user to one replica (for example by hashing the user id)', 'Right. Once you have seen a value you should never see an older one. Reading from the same replica each time guarantees it, until that replica fails.'],
  ]),
  step('The primary dies. Replication is async and the freshest replica is 2 seconds behind. You promote it. What happens to the 2 seconds of writes the old primary had acknowledged?', [], 1, [
    ['They replay automatically when the old primary comes back', 'The new primary has accepted new writes since — possibly reusing the same ids. Blindly replaying the old primary’s tail can collide or double-apply, so most systems discard it.'],
    ['They are lost, or must be reconciled by hand — the price of async replication', 'Right. Say it out loud: async replication trades a small window of acknowledged writes for write latency. Semi-sync (wait for one replica) narrows that window.'],
    ['Nothing is lost — the replica had them', 'With async replication the primary acknowledged them before any replica had them.'],
  ]),
];

// Chapter 10 · Multi-leader and leaderless quorums.
export const quorums = [
  step('N = 3 replicas. Writes wait for W = 2 acknowledgements; reads ask R = 2 replicas. Is every read guaranteed to reach at least one replica that has the latest acknowledged write?', [
    row('Replicas', ['A', 'B', 'C'], { 0: 'write', 1: 'write' }, { tones: { 0: 'done', 1: 'done' } }),
  ], 0, [
    ['Yes: W + R = 4 > 3, so the write set and the read set must share a replica', 'Right. Any two of three replicas include A or B. The reader compares versions and keeps the newest.'],
    ['No: the read might ask C, which the write skipped', 'It might ask C — but it asks two replicas, and any two of the three include A or B.'],
  ]),
  step('To cut latency the team sets W = 1 and R = 1 with N = 3. What do they give up?', [], 1, [
    ['Nothing — quorum settings only affect availability', 'They affect which replicas a read can miss. That is the whole point of the arithmetic.'],
    ['The overlap: W + R = 2 is not more than 3, so a read can land on a replica that has not seen the write', 'Right. Fast and highly available, but reads can be stale until read repair or anti-entropy catches up.'],
    ['Writes now fail if any replica is down', 'The opposite: with W = 1 a write succeeds while any single replica is up.'],
  ]),
  step('N = 5. Reads and writes must keep working with 2 replicas down, and every read must overlap every write. Choose W and R.', [], 1, [
    ['W = 2, R = 2', 'It survives 3 down, but 2 + 2 = 4 is not more than 5, so a read and a write can miss each other.'],
    ['W = 3, R = 3', 'Right. 3 + 3 = 6 > 5, and each operation needs only 3 of 5 replicas, so 2 can be down.'],
    ['W = 5, R = 1', 'The overlap holds (6 > 5), but a single replica down blocks every write.'],
  ]),
];

// Chapter 11 · Will it fit?
export const capacity = [
  step('1 billion messages a day at about 280 bytes each, including two indexes. How much new storage per year for one copy?', [], 1, [
    ['About 10 TB', '280 GB a day reaches 10 TB in about five weeks. Multiply by 365, not 36.'],
    ['About 100 TB', 'Right. 10⁹ × 280 B = 280 GB a day; × 365 ≈ 102 TB a year, before compression and before replication.'],
    ['About 1 PB', 'That would need about 2.7 KB per message. Check the bytes per row.'],
  ]),
  step('Same data, replication factor 3, and you are comfortable at about 10 TB per node. Roughly how many nodes does one year of messages need?', [], 2, [
    ['About 3', '102 TB a year will not fit on 3 nodes of 10 TB even before replication.'],
    ['About 11', 'That is one copy (102 TB ÷ 10 TB ≈ 10.2, so 11 nodes). Replication triples it.'],
    ['About 31', 'Right. 102 TB × 3 ≈ 307 TB; ÷ 10 TB ≈ 30.7, so 31 nodes — and it grows every year. Partitioning is a day-one decision.'],
  ]),
];

// Chapter 12 · Sharding.
export const sharding = [
  step('Kestrel’s link shortener shards its links table by creator user_id. The hot path is GET /{code}, a redirect, at 100 reads per write. What breaks?', [], 1, [
    ['Nothing — user_id is always a safe shard key', 'The redirect request carries only the short code. With no user_id, the router cannot tell which shard holds it.'],
    ['Every redirect must ask every shard, because the code alone does not say where the row lives. Shard by the short code instead', 'Right. The dominant query must carry the shard key. A scatter-gather on the hottest path is a failed design.'],
    ['Short codes collide across shards', 'Collisions come from code generation, not from the shard key. The real damage is on the read path.'],
  ]),
  step('Messages: shard by conversation_id or by message_id?', [], 0, [
    ['conversation_id — "latest 50 in this conversation" stays on one shard', 'Right. The hot read lands on one partition, already sorted. The risk is a giant group chat; cap partition size with a time bucket in the key.'],
    ['message_id — it spreads writes perfectly evenly', 'It spreads writes, but every conversation read becomes a scatter-gather across all shards, then a merge sort.'],
    ['created_at — newest messages together', 'Range-by-time sends every new write to the newest shard: one hot shard, the rest idle.'],
  ]),
  step('You shard with hash(key) mod 4 and grow to 5 shards. Roughly what fraction of keys must move?', [], 2, [
    ['About 20% — the new shard’s share', 'That is what fixed logical partitions or consistent hashing achieve. With mod N, a key stays only if hash mod 4 equals hash mod 5.'],
    ['None — existing keys stay where they are', 'The mapping changed for almost every hash value. Lookups would go to the wrong shard.'],
    ['About 80%', 'Right. Only remainders that agree mod 4 and mod 5 stay — 4 of every 20 hash values. Pre-split into many logical partitions so growth moves whole partitions instead.'],
  ]),
  step('One flash-sale listing gets 50,000 reads a second; its shard handles about 10,000. More shards will not help. Why, and what does?', [], 0, [
    ['One key lives on one shard; serve its reads from a cache in front, and spread hot writes (like a view counter) across salted sub-keys', 'Right. A hot key is a concentration problem, not a capacity problem. Cache absorbs reads; salting (key#0 … key#9) splits writes, and readers sum the parts.'],
    ['Reshard into twice as many shards', 'The key still hashes to exactly one shard. You doubled the cluster and fixed nothing.'],
    ['Move the shard to a bigger machine', 'It raises the ceiling a little for this one key, at a large cost, and the next viral listing lands somewhere else.'],
  ]),
];

// Chapter 13 · ID strategies.
export const ids = [
  step('Why prefer a time-ordered id (UUIDv7, Snowflake) over a random UUIDv4 as the primary key of a large, write-heavy table?', [], 2, [
    ['v7 is more unique', 'Both are unique for practical purposes. v4 has 122 random bits; v7 has 74 plus a timestamp.'],
    ['v7 is shorter', 'Both are 128 bits. Snowflake ids are 64 bits, but that is not the main reason either.'],
    ['Time-ordered ids append at the right edge of the B-tree; random v4 inserts land on random pages and thrash the cache', 'Right. Index locality: sequential inserts keep the hot pages few and full; random inserts touch the whole index and split pages everywhere.'],
  ]),
  step('Snowflake gives the timestamp 41 bits of milliseconds. Roughly how long until it runs out?', [], 1, [
    ['About 2 years', '2³¹ ms is about 25 days; 2⁴¹ is 1,024 times more than that.'],
    ['About 69 years from the chosen epoch', 'Right. 2⁴¹ ms ≈ 2.2 × 10¹² ms ≈ 69.7 years. That is why Snowflake counts from a custom recent epoch, not 1970.'],
    ['About 4,000 years', 'That would need about 47 bits of milliseconds.'],
  ]),
  step('An NTP correction moves a Snowflake node’s clock back 5 ms. What should the generator do?', [], 0, [
    ['Refuse (or wait) until the clock passes the last timestamp it used', 'Right. Otherwise it can reissue a timestamp it already used and, with the same machine id, collide with an id it already gave out.'],
    ['Keep issuing with the earlier timestamp', 'Same timestamp, same machine id, same sequence number: a duplicate id.'],
    ['Switch to a random machine id', 'Another node may own that machine id. You trade a clock problem for a collision problem.'],
  ]),
  step('A table uses a signed 32-bit auto-increment id and averages 1,000 inserts a second. Roughly when does it run out?', [], 1, [
    ['In about 2 years', 'That would be about 34 inserts a second. At 1,000 a second it is much sooner.'],
    ['In under 25 days', 'Right. 2³¹ − 1 ≈ 2.15 billion; at 1,000 a second that is about 24.9 days. Use BIGINT from day one.'],
    ['Never, in practice', 'Plenty of production outages began with exactly this column.'],
  ]),
];

// Chapter 14 · Connection pooling.
export const pooling = [
  step('40 app pods each keep a pool of 10 connections to a Postgres primary with max_connections = 500. A rolling deploy briefly runs 80 pods. What happens?', [], 1, [
    ['Nothing — 80 × 10 = 800 is close enough', 'The server refuses connections beyond max_connections. New pods fail health checks right in the middle of the deploy.'],
    ['Connection errors; put a pooler such as PgBouncer between the pods and Postgres, and size pools from the work, not the pod count', 'Right. Postgres runs a process per connection, so the number of server connections should track what the database can execute in parallel, not how many pods you have.'],
    ['Postgres queues the extra connections until old pods stop', 'It rejects them. Queueing is what a pooler adds.'],
  ]),
  step('Peak is 5,000 queries a second and each holds a connection for 4 ms on average. How many connections are busy at once, on average?', [], 0, [
    ['About 20', 'Right. Little’s law: 5,000 per second × 0.004 s = 20. Size the pool for that plus headroom for bursts — tens, not thousands.'],
    ['About 5,000', 'That assumes each query holds a connection for a whole second.'],
    ['About 1,250', 'That divides instead of multiplying: 5,000 ÷ 4. Busy connections = arrival rate × time held.'],
  ]),
];

// Chapters 15–16 · Replica or cache, and zero-downtime migrations.
export const running = [
  step('The primary’s read load is 80%. Most reads are the same 10,000 popular listing pages, over and over. Read replicas or a cache?', [], 1, [
    ['Read replicas — they scale every query', 'Each replica stores the whole dataset and replays every write to serve the same hot pages. It works, but at a far higher cost per read than a cache.'],
    ['A cache: a small, hot, repeated working set is exactly what it is for', 'Right. 10,000 pages fit in memory easily and hit ratios will be high. Replicas earn their place when reads are diverse — many different queries, a long tail, reports.'],
    ['Neither — shard the database', 'Sharding addresses write volume and data size. This is a read-skew problem with a much cheaper fix.'],
  ]),
  step('Rename users.name to display_name on a 200-million-row table with zero downtime. What is the plan?', [], 2, [
    ['ALTER TABLE users RENAME COLUMN name TO display_name', 'The rename itself is quick, but every running app server still says "name" and starts failing the moment it commits. Code and schema cannot change in the same instant.'],
    ['Copy the table, rename, swap at midnight', 'Writes during the copy are lost unless you capture them too, and the swap still needs every server updated at once.'],
    ['Add display_name, write both, backfill in batches, switch reads, stop writing name, then drop it', 'Right: expand, migrate, contract. Every step is backward compatible, so old and new code run side by side during each deploy.'],
  ]),
];

// Decision drills · mixed review across the lesson.
export const drills = [
  step('A product catalogue: guitars have pickups and scale length, cameras have sensor sizes, and every product page loads one product whole, by id. Which model fits?', [], 2, [
    ['Strict relational: one column per attribute across every category', 'Hundreds of mostly-empty columns, and a migration every time a new category appears.'],
    ['A graph database', 'There is nothing to traverse. Each read is one entity by id.'],
    ['A document model — a document store, or a jsonb column in Postgres beside the relational fields', 'Right. Variable, nested attributes read whole by id are what documents are for. Postgres jsonb gives you the same shape while keeping transactions and joins for the rest.'],
  ]),
  step('The Interviewer asks: "Why not just index every column?" Best answer?', [], 1, [
    ['"Indexes take disk space."', 'True but minor. The cost that matters is on the write path.'],
    ['"Each index is another structure every insert, delete and update to its columns must maintain — write amplification — so I index the queries I serve, in the right column order."', 'Right. Six indexes means seven structures touched per insert. Indexes are bought with write throughput.'],
    ['"The optimiser gets confused."', 'Optimisers handle many indexes fine. The cost is on writes.'],
  ]),
  step('Ad metrics: 200,000 data points a second, queried as "this campaign, last 24 hours, one-minute buckets", with old data rolled up to hourly and deleted after 13 months. Which store?', [], 0, [
    ['A time-series database', 'Right. Append-only writes, time-range scans, downsampling and retention are its native operations.'],
    ['Postgres with one row per point and no partitioning', 'About 17 billion rows a day in one table, with deletes as the retention policy. Postgres can do time-series work with time-based partitioning or an extension, but plain tables fight this workload.'],
    ['A graph database', 'There are no relationships to walk. The access pattern is a time range per series.'],
  ]),
  step('Follows: PRIMARY KEY (follower_id, followee_id). The notification fan-out asks "who follows user 42?" Without another index, what happens?', [], 2, [
    ['A primary-key lookup', 'The key leads with follower_id; 42 here is a followee.'],
    ['An index-only scan', 'An index-only scan still needs an index that leads with the column you filter on.'],
    ['A scan of the whole follows table; add an index on (followee_id, follower_id)', 'Right. A self-referencing many-to-many needs both directions indexed, exactly like any other join table.'],
  ]),
  step('Two services each read a wallet balance, compute a new one, and write it back, under Read Committed. Cheapest fix that needs no isolation-level change?', [], 0, [
    ['UPDATE wallets SET balance = balance + :delta WHERE id = ? (with a guard such as AND balance + :delta >= 0)', 'Right. The read and the write happen atomically in one statement under a row lock, so no update is lost.'],
    ['Retry on failure', 'Nothing fails — the lost update commits silently. There is nothing to retry on.'],
    ['Add an index on wallets(id)', 'The primary key already is one. Indexes find rows; they do not serialise read-modify-write.'],
  ]),
  step('Leaderless store, N = 3. The team wants reads that always overlap writes and still tolerate one replica down for both. Which setting?', [], 1, [
    ['W = 3, R = 1', 'Overlap holds, but one replica down stops every write.'],
    ['W = 2, R = 2', 'Right. 2 + 2 > 3, and each operation needs only 2 of 3 replicas.'],
    ['W = 1, R = 1', 'Tolerant, but 1 + 1 is not more than 3: reads can miss the latest write.'],
  ]),
];
