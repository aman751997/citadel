import { row, step } from '../../lib/trace.ts';

// Decision puzzles for src/lessons/pattern-timeseries.mdx.
// Every number here is worked in the lesson text; the arithmetic was checked with a throwaway script.

export const shape = [
  step('Kestrel’s metrics pipeline takes 1,000,000 samples a second. Dashboards and alert rules issue about 1,200 queries a second. Which store shape fits?', [], 1, [
    ['A B-tree row store with an index on (metric, timestamp), updating rows in place', 'Samples are never updated, and a million random index inserts a second is the workload B-trees handle worst. You would pay for flexibility nobody uses.'],
    ['Append-only, grouped by series, sorted by time, so a query reads a few contiguous runs', 'Right. Writes are appends to the newest end of each series; reads ask for one or many series over a time range. Shape the storage for exactly that.'],
    ['A document store with one document per sample', 'One document per 16-byte sample spends far more on per-document overhead than on data, and range reads become scattered lookups.'],
  ]),
  step('Which query does a time-series store answer badly — and that you should route elsewhere?', [], 2, [
    ['Average CPU for service=checkout, last 6 hours', 'This is the bread and butter: select series by tags, read a time range, aggregate.'],
    ['p99 latency by region, last 30 days', 'Answered from rollups and mergeable histograms. A 30-day range at hourly resolution is 720 points per series.'],
    ['Which 50 user ids saw the most errors yesterday?', 'Right. Per-user questions need user_id as a dimension, which explodes series count. That question belongs in an event or log store built for high-cardinality group-bys.'],
  ]),
];

export const ingest = [
  step('10,000 hosts each produce 1,000 samples every 10 seconds. If every sample were its own HTTP request, collectors would see 1,000,000 requests a second. Agents instead flush one batch per 10 seconds. Requests per second now?', [], 0, [
    ['About 1,000', 'Right. 10,000 hosts ÷ 10 s = 1,000 batches a second, each about 100 KB. Batching turns a request-rate problem into a bandwidth problem.'],
    ['About 100,000', 'That would be ten batches per host per second. Each host flushes once every 10 seconds.'],
    ['Still 1,000,000: batching only saves bandwidth', 'Batching saves per-request overhead — the TLS, headers and handler work you pay per call. The bytes stay about the same; the request count falls a thousandfold.'],
  ]),
  step('Collectors write samples to Kafka before the storage writers. How should the topic be keyed?', [], 1, [
    ['Randomly, for perfectly even partitions', 'Even, but each series’ samples are scattered across every writer. Compression needs consecutive samples of one series in one place, and every writer would hold every series.'],
    ['By series id, so one writer owns each series and sees its samples in order', 'Right. Ordered appends per series, one owner per series’ open block, and even spread because there are ten million series.'],
    ['By host, so one host’s samples stay together', 'Closer, but a query reads series, not hosts, and one enormous host becomes one hot partition. Series id spreads better and matches the storage layout.'],
  ]),
];

export const compression = [
  step('Timestamps arrive at 1000, 1010, 1020, 1030, 1041, 1050 (seconds). What does delta-of-delta encoding store after the first two?', [
    row('Timestamp', [1000, 1010, 1020, 1030, 1041, 1050]),
    row('Delta', ['—', 10, 10, 10, 11, 9]),
  ], 2, [
    ['10, 10, 10, 11, 9', 'Those are the deltas. Delta-of-delta subtracts each delta from the one before it.'],
    ['1010, 1020, 1030, 1041, 1050', 'That is the raw column — 64 bits each. The point of the encoding is to avoid storing these.'],
    ['0, 0, 1, −2', 'Right. A steady 10-second cadence makes the delta-of-delta zero, and Gorilla’s scheme stores a zero in one bit. Jitter costs a few more bits.'],
  ]),
  step('A gauge reads 12.0, then 12.0, then 12.5. Gorilla XORs each value with the previous one. What makes this cheap?', [
    row('Value', ['12.0', '12.0', '12.5']),
    row('XOR with previous', ['—', '0', '0x0001000000000000']),
  ], 0, [
    ['Equal values XOR to zero (one bit), and close values share sign, exponent and high mantissa bits, so only a short middle run differs', 'Right. 12.0 and 12.5 differ in a single bit. The encoder stores how many leading zeros there are and the few meaningful bits, not 64 bits.'],
    ['XOR turns doubles into small integers', 'XOR works on the raw 64-bit patterns. The result is still 64 bits — mostly zeros, which is what gets skipped.'],
    ['It averages neighbouring values', 'Nothing is averaged. Gorilla’s compression is lossless: the exact doubles come back out.'],
  ]),
];

export const layout = [
  step('Query: avg(cpu) by service where region="eu", last 6 hours. What does the TSDB do first?', [], 1, [
    ['Scan every block from the last 6 hours and filter rows by region', 'Blocks hold millions of series. Scanning all of them to find the eu ones is the full table scan you built the index to avoid.'],
    ['Intersect the posting lists for __name__=cpu and region=eu to get series ids, then read only those series’ chunks for the time range', 'Right. The tag index is an inverted index, like a search engine’s: each tag=value points at the series that carry it.'],
    ['Look up a precomputed avg-by-service row', 'Only if you defined that rollup in advance. The general path is index → series → chunks → aggregate.'],
  ]),
  step('Retention is 15 days for raw data. How does a well-designed TSDB delete day 16?', [], 2, [
    ['DELETE WHERE timestamp < now() − 15 days, nightly', 'Row deletes in an LSM write tombstones that must be compacted away — a lot of write work to delete data.'],
    ['Compaction notices the old samples and drops them gradually', 'Compaction can drop data, but making it the main deletion path still rewrites files to remove samples.'],
    ['Drop whole time-partitioned blocks once they are older than the retention', 'Right. Because blocks are cut by time, retention is a file delete. Time partitioning makes the most common delete free.'],
  ]),
];

export const cardinality = [
  step('http_request_duration has labels service × endpoint × status class × region: 4,000 service-endpoint pairs × 5 × 3 = 60,000 series. A team adds user_id. 10M daily users each hit about 10 endpoint-status combinations. Roughly how many series appear per day?', [], 2, [
    ['About 60,000 — labels only add metadata', 'Every distinct label combination is a separate series with its own index entry, memory and storage.'],
    ['About 10 million — one per user', 'Each user creates one series per combination they touch, not one in total.'],
    ['About 100 million — more than the whole system’s 10 million series today', 'Right. 10M users × 10 combinations = 10⁸. One label made one metric ten times bigger than everything else combined.'],
  ]),
  step('What is the strongest first defence against that label?', [], 0, [
    ['Drop or rewrite unbounded labels at the collector, with per-team series quotas and an alert on new-series rate', 'Right. Stop it at the door, cap the blast radius per team, and notice early. Questions that need user_id go to an event store.'],
    ['Add more storage nodes', 'Series cost memory for the index and open chunks on every write path, not just disk. Buying nodes for an unbounded label is a race you lose.'],
    ['Shorten raw retention to one day', 'Retention cuts disk, but the index and in-memory head still hold every active series. The explosion is in memory first.'],
  ]),
];

export const rollups = [
  step('Raw data (10 s) costs about 200 GB a day compressed. An hourly rollup keeps min, max, sum and count. How big is a day of hourly rollups?', [], 1, [
    ['About 50 GB — a quarter', 'Rollups shrink by samples per bucket ÷ numbers kept. One hour is 360 samples, not 4.'],
    ['About 2.2 GB — 360 samples become 4 numbers, 90× fewer', 'Right. 200 GB ÷ 90 ≈ 2.2 GB a day, so a year is about 0.8 TB.'],
    ['About 200 GB — rollups are views, not data', 'A rollup is stored data: computed once, kept for the long retention.'],
  ]),
  step('A 1-minute rung keeps the same four numbers per minute (6 raw samples → 4 numbers). Kept for 30 days it costs about 4 TB — more than 15 days of raw (3 TB). Why keep it?', [], 2, [
    ['To save disk', 'It saves only a third per day compared with raw, and it is kept twice as long, so in total it costs more.'],
    ['Because raw data cannot be read after 15 days', 'True, but the hourly rung also covers older data. The question is why a middle rung.'],
    ['For query cost: a 7-day panel reads 10,080 points per series at 1 minute instead of 60,480 raw', 'Right. Middle rungs are an index for reads, not a storage saving. If disk matters more, use a 5-minute rung (30 samples → 4 numbers, 7.5× smaller).'],
  ]),
  step('A chart is about 1,000 pixels wide. The user picks “last 30 days”. Which rung should the query planner read?', [], 2, [
    ['Raw: 259,200 points per series', 'More than 250 points per pixel. The chart throws almost all of it away after paying to read it.'],
    ['1 minute: 43,200 points per series', 'Still about 43 points per pixel.'],
    ['1 hour: 720 points per series', 'Right. Pick the coarsest rung that still gives about one point per pixel.'],
  ]),
];

export const preagg = [
  step('The main dashboard shows requests per second by service for 200 services, refreshing every 30 seconds over 24 hours. Raw, that is 10,000 host series × 8,640 points. What should the design do?', [], 1, [
    ['Read raw and aggregate at query time — it is only one dashboard', '86.4 million points decoded per refresh, every 30 seconds, for every viewer. That is the cost that gets dashboards banned.'],
    ['Pre-aggregate by service at 1-minute resolution on ingest: 200 series × 1,440 points', 'Right. 288,000 points, 300× fewer. Known, repeated questions get answers computed once at write time.'],
    ['Cache the dashboard for a day', 'A request-rate dashboard that is a day stale is useless during the incident you opened it for.'],
  ]),
  step('An engineer asks a new question during an incident: “error rate for endpoint /checkout on hosts running build 4812”. No rollup exists for it. What answers it?', [], 0, [
    ['Query-time aggregation over recent raw data — this is why you keep a short raw window', 'Right. Pre-aggregation only answers questions you predicted. A few days of raw data keeps ad-hoc questions possible.'],
    ['Add a rollup and wait for tomorrow', 'Rollups start from when they are defined. The incident is now.'],
    ['Nothing — a TSDB cannot filter by tag', 'Tag filtering is exactly what the inverted index does.'],
  ]),
];

export const windows = [
  step('“Clicks per ad, per minute, for billing.” Which window?', [], 0, [
    ['Tumbling 1-minute windows: each click belongs to exactly one minute', 'Right. Non-overlapping buckets, so the per-minute numbers add up to the day’s total — what billing needs.'],
    ['Sliding 5-minute window advancing every minute', 'Each click would be counted in five windows. Summing them over a day would bill each click five times.'],
    ['Session windows per user', 'Sessions group one user’s bursts of activity. Billing counts per ad per minute.'],
  ]),
  step('Tumbling 1-minute windows; watermark = largest event time seen − 30 s. Events arrive in this order. When does window [12:00, 12:01) fire, and with what count?', [
    row('Arrival order', ['12:00:10', '12:00:40', '12:00:55', '12:01:05', '12:00:50', '12:01:20', '12:01:31'], {}, { join: '→' }),
    row('Watermark after', ['11:59:40', '12:00:10', '12:00:25', '12:00:35', '12:00:35', '12:00:50', '12:01:01'], { 6: 'PASSES 12:01' }, { tones: { 6: 'hot' } }),
  ], 1, [
    ['When 12:01:05 arrives, with 3', 'An event past the window end does not close it. The watermark is still 12:00:35, so 12:00:50 can still arrive — and does.'],
    ['When 12:01:31 arrives, with 4', 'Right. The watermark passes 12:01:00 only then. The window holds 12:00:10, 12:00:40, 12:00:55 and the out-of-order 12:00:50.'],
    ['At 12:01:00 on the processing clock, with whatever has arrived', 'That is processing time. A delayed batch would make the count depend on network luck rather than on when clicks happened.'],
  ]),
  step('After the window fired with 4, an event stamped 12:00:58 arrives. What are the honest options?', [], 2, [
    ['Silently add it to the 12:01 window instead', 'That puts a click in the wrong minute — the bug event time exists to prevent.'],
    ['Hold every window open forever in case of stragglers', 'Then no window ever produces a final answer, and state grows without bound.'],
    ['Drop it and count drops, send it to a side output for a correction job, or keep allowed lateness and emit an updated count of 5', 'Right. Pick by product: dashboards can drop and count; billing must correct. Whatever you choose, measure how much is late.'],
  ]),
];

export const percentiles = [
  step('Server A: 1,000 requests, p99 = 500 ms. Server B: 10 requests, p99 = 2,000 ms. The dashboard averages them. What does it show, and what is the true combined p99?', [
    row('A latencies', ['985 × 10 ms', '15 × 500 ms']),
    row('B latencies', ['10 × 2,000 ms']),
  ], 2, [
    ['Shows 1,250 ms; true p99 is also 1,250 ms', 'Percentiles are positions in a sorted list. The average of two positions is not a position in the merged list.'],
    ['Shows 500 ms; true p99 is 1,250 ms', 'The average of 500 and 2,000 is 1,250, not 500.'],
    ['Shows 1,250 ms; true p99 is 500 ms', 'Right. Merged: 1,010 requests sorted; the 1,000th is 500 ms. The average was 2.5× too high — and with other mixes it is too low. Neither is p99.'],
  ]),
  step('What should each host send per 10-second window so p99 is correct across hosts and across time?', [], 1, [
    ['Its own p99', 'That is the number you just proved cannot be combined.'],
    ['A histogram (bucket counts) or a mergeable sketch, plus count and sum', 'Right. Bucket counts add across hosts and minutes; p99 is read off the merged distribution at query time. Sum ÷ count gives a correct average too.'],
    ['Every raw latency', 'Correct but enormous: one number per request, forever. A histogram is a few dozen counters per window.'],
  ]),
];

export const sketches = [
  step('A viral video takes 100,000 view increments a second on one counter key. First fix?', [], 1, [
    ['A bigger Redis node', 'One key still lives on one shard and one thread. A bigger box raises the ceiling a little.'],
    ['Split it: views:{id}:0..15, increment a random shard, sum the 16 on read — and batch increments in the app', 'Right. Each shard key takes about 6,250 a second, and batching 100 increments per write cuts it a hundredfold more. View counts tolerate seconds of lag.'],
    ['Queue the increments and apply them one at a time', 'Serialising moves the bottleneck into the queue consumer. It still applies 100,000 updates a second to one key.'],
  ]),
  step('You keep one HyperLogLog of visitor ids per hour. Daily uniques: add the 24 hourly PFCOUNT results?', [], 2, [
    ['Yes — counts add', 'A visitor who came in 5 different hours would be counted 5 times. Distinct counts do not add.'],
    ['No — keep a hash set per day instead', 'Exact, but 100 million ids × 8 bytes is 800 MB per day per campaign. The sketch exists to avoid that.'],
    ['No — PFMERGE the 24 sketches (register-wise max), then PFCOUNT once', 'Right. HyperLogLogs merge losslessly into the sketch of the union, so the daily estimate keeps the same ~0.81% standard error.'],
  ]),
  step('Count-Min Sketch, two rows of five counters. Row 1 = [4, 0, 2, 0, 1], row 2 = [0, 1, 3, 3, 0]. “eel” hashes to column 0 in row 1 and column 3 in row 2. Its estimate?', [
    row('Row 1', [4, 0, 2, 0, 1], { 0: 'eel' }, { tones: { 0: 'hot' } }),
    row('Row 2', [0, 1, 3, 3, 0], { 3: 'eel' }, { tones: { 3: 'hot' } }),
  ], 0, [
    ['3 — the minimum across rows (its true count is 1)', 'Right. Every counter it touches holds its count plus collisions, so the minimum is the least-polluted guess. It can overcount; it never undercounts.'],
    ['3.5 — the average across rows', 'Averaging keeps the noise from both rows. The minimum is the estimate because collisions only ever add.'],
    ['4 — the maximum, to be safe', 'The maximum is the most-polluted counter. Count-Min takes the minimum.'],
  ]),
];

export const topk = [
  step('Three shards each send their local top-1. Shard A: x=10, y=9. Shard B: z=10, y=9. Shard C: w=10, y=9. What does merging the top-1 lists miss?', [
    row('Shard A', ['x 10', 'y 9'], { 0: 'TOP-1' }, { tones: { 0: 'hot' } }),
    row('Shard B', ['z 10', 'y 9'], { 0: 'TOP-1' }, { tones: { 0: 'hot' } }),
    row('Shard C', ['w 10', 'y 9'], { 0: 'TOP-1' }, { tones: { 0: 'hot' } }),
  ], 1, [
    ['Nothing — the global winner is one of x, z, w with 10', 'Add y up: 9 + 9 + 9 = 27. It never made any local list.'],
    ['y, the true winner with 27, which was second everywhere', 'Right. Local top-K lists do not merge into a global top-K when one item’s count is split across shards.'],
    ['Only ties, which do not matter', 'This is not a tie: y beats every listed item by 17.'],
  ]),
  step('So how do you make the merge exact?', [], 0, [
    ['Partition the stream by item, so each item’s whole count lives on one shard; then the global top-K is the top-K of the shards’ top-K lists', 'Right. Once no item is split, any global top-K item is also in its own shard’s top K. Watch for hot items and pre-aggregate them.'],
    ['Ask each shard for its top 2K instead of top K', 'A common heuristic that usually helps, but it is not exact: an item just below the cut everywhere can still win.'],
    ['Average the shards’ lists', 'Averaging counts across shards hides exactly the split item you are trying to find.'],
  ]),
];

export const leaderboard = [
  step('Kestrel Daily has 20 million players in one Redis sorted set. A player opens the leaderboard: show their rank and the 5 players either side. Which calls?', [], 1, [
    ['ZRANGE the whole set and find the player in the app', '20 million entries over the network per view. Ranks are what the sorted set already knows.'],
    ['ZREVRANK lb player → r, then ZREVRANGE lb r−5 r+5 WITHSCORES', 'Right. Two O(log N) calls (plus the 11 rows returned). The skip list knows ranks without scanning.'],
    ['ZSCORE the player, then ZCOUNT everyone above, then ZRANGEBYSCORE around it', 'Works, but it is three calls to do what ZREVRANK and one range do directly.'],
  ]),
  step('The game grows to 500 million players and score updates outgrow one Redis primary. You shard by hash of player id into 16 sorted sets. What becomes expensive?', [], 2, [
    ['The global top 10', 'Each player lives in exactly one shard, so the global top 10 is the best 10 of the 16 shards’ top-10 lists — 16 small reads, exact.'],
    ['Updating a score', 'Still one ZINCRBY on the shard that owns the player.'],
    ['One player’s exact global rank: ZCOUNT of higher scores on all 16 shards, summed', 'Right. Rank is a global question. Fan out and sum, cache it for a few seconds, or show an approximate percentile from a score histogram for the long tail.'],
  ]),
];

export const adclicks = [
  step('The stream job dedups clicks by click_id. Someone proposes a Bloom filter instead of exact keyed state to save memory. What goes wrong for billing?', [], 1, [
    ['Duplicates slip through and advertisers are overbilled', 'A Bloom filter never says “not seen” for an id it has seen, so it does not let duplicates through.'],
    ['False positives drop real clicks as “duplicates”, so advertisers are underbilled, and you cannot tell which clicks were lost', 'Right. Bloom filters err in one direction: “maybe seen”. Use exact state (tens of GB in RocksDB is fine), or treat a Bloom “maybe” as a reason to check exact state.'],
    ['Nothing — it is exact for ids', 'A Bloom filter is approximate by design. At billions of ids its false-positive rate is small but not zero.'],
  ]),
  step('After a crash, the job restores its last checkpoint and replays from the saved Kafka offsets. The sink then sees some (ad, minute) results again. Which sink write keeps the totals right?', [], 0, [
    ['Upsert: SET count = N for key (ad_id, minute) — replaying writes the same value again', 'Right. An idempotent overwrite makes replays harmless. With Kafka-to-Kafka output, transactions are the other route.'],
    ['Increment: count += N', 'A replayed window adds its count a second time. Increments are not idempotent.'],
    ['Append a row per result and sum at query time', 'Replays append duplicate rows, and every query sums them.'],
  ]),
  step('Real-time counts and the nightly batch job over raw clicks disagree by 0.3% for one advertiser. Which number goes on the invoice?', [], 2, [
    ['The streaming number — it was first', 'Speed is not the property billing needs. Streaming drops very late events and works with bounded state.'],
    ['The average of the two', 'Averaging two counts produces a number neither system computed.'],
    ['The batch recomputation over the complete raw log; streaming serves dashboards, and a reconciliation job alerts when they drift apart', 'Right. Fast and approximate for the dashboard, slow and exact for money — and you watch the gap.'],
  ]),
];

export const alerting = [
  step('Rule: page when checkout p99 > 500 ms. The value hovers between 480 and 520 ms, crossing the line most minutes. On-call is paged 25 times in an hour. Fix?', [], 2, [
    ['Raise the threshold to 600 ms', 'This hides the hovering for now and moves the flapping to the next plateau. The rule still has no memory.'],
    ['Evaluate every 10 seconds for faster detection', 'Faster evaluation sees more crossings, so it flaps more.'],
    ['Require the condition to hold for 5 minutes (“for: 5m”), and resolve only below a lower line such as 450 ms', 'Right. Duration plus hysteresis. One page per real episode, not one per crossing.'],
  ]),
  step('A rack switch dies and 400 hosts stop reporting. 400 “host down” alerts and 1,600 “service degraded” alerts fire in two minutes. What should the alert router have done?', [], 1, [
    ['Paged all 2,000 — every alert is real', 'Every alert is true, and the on-call engineer can read none of them. An alert storm hides the one alert that matters.'],
    ['Group by rack and cluster, suppress child alerts while the parent “rack down” fires, and send one page that names the scope', 'Right. Grouping, inhibition and deduplication turn 2,000 notifications into one actionable page.'],
    ['Drop alerts once more than 100 fire', 'A blind cap can drop the root cause and keep the noise.'],
  ]),
];

export const walkthrough = [
  step('Sixty-minute round, “design a metrics system like Datadog”. At 0:12 you are still listing features (logs? traces? APM? SLOs?). What do you say?', [], 0, [
    ['“Metrics only: ingest, query, dashboards, threshold alerts. Logs and traces are out of scope — happy to come back to them.” Then move to entities.', 'Right. Scope it in one breath and leave at the checkpoint. Your logged gap is the 18-minute requirements phase; this is where it bites.'],
    ['Ask about each of the other products, one by one', 'Each is a system the size of this one. Exploring them burns the minutes deep dives need.'],
    ['Skip entities and API to make up time', 'Silently skipping steps is the other logged gap. Compress them to a minute each and say so out loud.'],
  ]),
  step('You have 20 minutes of deep dives. Which pair earns the most signal for this question?', [], 1, [
    ['Dashboard UI rendering and the auth system', 'Real work, but not what makes metrics systems hard. They show you can build CRUD.'],
    ['Ingest plus cardinality control, then storage with rollups and retention', 'Right. The firehose and the series explosion are where these systems die; rollups are where storage cost lives. Alerting is the third if time allows.'],
    ['Kafka internals and replication protocols', 'You can name Kafka’s role in one sentence. Its internals are a different interview.'],
  ]),
];

export const drills = [
  step('Dashboard shows p99 latency per service, 5-minute windows, 30 days back. Store what?', [], 1, [
    ['Every request latency; compute PERCENTILE() at read', 'Correct numbers, dead at scale: every refresh rescans billions of raw latencies.'],
    ['Per-service per-minute histograms or sketches, rolled up on a resolution ladder', 'Right. Percentiles do not average, so store mergeable distributions, precomputed at ingest. They merge across hosts and up the ladder.'],
    ['The p99 per minute as a single number, averaged into windows at read', 'Averaging p99s is mathematically wrong — the most common candidate error in this domain.'],
    ['5-minute p99 numbers only, computed at ingest', 'Now a 1-hour or 1-day view needs p99s of p99s — the same averaging error, one level up.'],
  ]),
  step('A video goes viral: 100,000 view increments a second on one counter. First fix?', [], 1, [
    ['Move the counter to a bigger Redis node', 'Hot key, costume number four: one key is one shard. A bigger box does not spread it.'],
    ['Shard it — views:{id}:0..15, increment one at random, sum on read; batch increments app-side because view counts tolerate lag', 'Right. Same diagnosis muscle as a hot shard or a hot partition.'],
    ['Queue the increments and apply them serially', 'Serial queueing moves the bottleneck into the consumer.'],
    ['Sample: count every 10th view and multiply', 'Changes the product answer without being asked to — and creators will notice.'],
  ]),
  step('“Top 10 searched terms, last hour, billions of searches.” Why might the answer start with a Count-Min Sketch?', [], 1, [
    ['It computes faster than sorted sets', 'Speed is not the reason; memory and mergeability are.'],
    ['The distinct-term space is unbounded; a sketch gives frequency estimates with bounded overcount in fixed small space, paired with a heap of current top-K candidates', 'Right. The trigger is an unbounded keyspace. With bounded keys (10 million videos), a sorted set is exact and simpler — say which regime you are in.'],
    ['It is the only windowable structure', 'Exact counters window too: one table per minute, merged.'],
    ['Sorted sets cannot rank strings', 'Sorted-set members are strings; scores are the counts.'],
  ]),
  step('Your metrics rollup job reads Kafka and writes 1-minute sums to the TSDB. The job restarts and replays 30 seconds of data. The 12:03 sums are now too high. Cause?', [], 0, [
    ['The sink increments instead of overwriting the (series, minute) row', 'Right. Replays are normal under at-least-once. Make the write idempotent — overwrite the window’s full value.'],
    ['Kafka delivered duplicate messages by mistake', 'Redelivery after a restart is Kafka working as designed. The sink must tolerate it.'],
    ['The watermark was too short', 'A short watermark drops late data — it makes sums too low, not too high.'],
  ]),
  step('Your watermark allows 30 seconds of lateness. Mobile clients send events buffered for up to 2 hours offline. What changes?', [], 2, [
    ['Raise the watermark delay to 2 hours', 'Then every dashboard is two hours behind for everyone, to wait for a few phones.'],
    ['Use processing time instead', 'Then a phone’s 2-hour-old events are counted in the wrong hour.'],
    ['Keep the short watermark for live views and handle stragglers in a correction path (side output, or a batch recompute) that amends old windows', 'Right. Live answers stay fast; late truth still arrives. Measure the late fraction so you know what the live view misses.'],
  ]),
  step('“Unique users per day across 1,000 campaigns, kept for a year.” Exact sets would need hundreds of GB per day. What do you propose?', [], 1, [
    ['A Count-Min Sketch per campaign', 'Count-Min estimates how often each item appears. It does not count distinct items.'],
    ['One HyperLogLog per campaign per day: about 12 KB each, ~0.81% error, mergeable into weeks and months — about 4.5 GB for the year', 'Right. 1,000 × 365 × 12 KB ≈ 4.5 GB, and PFMERGE answers any longer range.'],
    ['A Bloom filter per campaign', 'A Bloom filter answers “have I seen this id?”. Sized for 100 million ids at 1% false positives it needs about 120 MB — per campaign, per day.'],
  ]),
  step('Why must the time-series topic be keyed by series id rather than spread at random?', [], 2, [
    ['Kafka requires a key', 'Kafka accepts keyless messages and spreads them across partitions.'],
    ['Random keys overload one partition', 'Random keys spread evenly. The problem is what they spread.'],
    ['So each series lands on one writer in order — compressing and appending consecutive samples needs them together', 'Right. Ordering and ownership per series, plus even spread because there are millions of series.'],
  ]),
  step('A leaderboard needs ties broken by who reached the score first. Redis sorts equal scores by member name. What do you store?', [], 0, [
    ['score = points × 10⁶ + (999,999 − seconds into the week), exact in a double because it stays far below 2⁵³', 'Right. Higher points win; for equal points, the earlier time gives a larger tie-breaker. 10⁶ points × 10⁶ ≈ 10¹² is well inside the 2⁵³ ≈ 9 × 10¹⁵ exact-integer range.'],
    ['Prefix member names with a timestamp', 'Equal scores are ordered by member name, and ZREVRANGE reverses that order — so the latest timestamp comes first. And the member stops being a stable player id you can ZINCRBY.'],
    ['Nothing — ties are rare', 'In a game with integer points, ties are common at every popular score.'],
  ]),
  step('An alert “requests = 0 for checkout” fires during an ingest backlog, while checkout is fine. What was missing?', [], 1, [
    ['A higher threshold', 'The data was missing, not low. Any threshold on a gap fires.'],
    ['Evaluating only windows the pipeline has completed (respecting ingest lag), and treating “no data” as its own state', 'Right. Alerting reads the same watermark idea: never judge a minute whose data has not arrived. Page on pipeline lag separately.'],
    ['Evaluating on raw data instead of rollups', 'Raw data was just as missing.'],
  ]),
];
