import { row, step } from '../../lib/trace.ts';

export const whyAsync = [
  step('Checkout calls five services in a row: charge the card, reserve stock, send the receipt email, record analytics, refresh recommendations. Which calls must the buyer wait for?', [
    row('Checkout', ['charge card', 'reserve stock', 'email', 'analytics', 'recs']),
  ], 1, [
    ['All five — the order is not done until everything is done', 'Then the slowest, flakiest service (here, the email provider) sets checkout latency and availability. The buyer does not need the email to arrive before seeing “order placed”.'],
    ['Charge and reserve stock; the other three can happen after the response', 'Right. The buyer needs to know the payment worked and the item is theirs. Email, analytics and recommendations are things that must happen eventually, not now — record them and return.'],
    ['None — put everything on a queue and return 202', 'If the charge is queued, you tell a buyer “accepted” and may later discover the card was declined or the last pair was sold. Answers the user is waiting for stay synchronous.'],
  ]),
  step('During a sale, orders arrive at 3,000/s for 2 minutes, then fall back to 100/s. The email provider accepts 500 sends/s. Email is queued. When the burst ends, how long until the email backlog is gone?', [
    row('Rates per second', ['in: 3,000', 'out: 500', 'after: 100 in']),
  ], 2, [
    ['About 2 minutes — the burst lasted 2 minutes', 'The backlog grows during those 2 minutes at 3,000 − 500 = 2,500/s, reaching 300,000 emails. It cannot vanish the moment the burst stops.'],
    ['10 minutes: 300,000 ÷ 500', 'Close, but orders keep arriving at 100/s after the burst, so the net drain rate is 500 − 100 = 400/s, not 500/s.'],
    ['12.5 minutes: 300,000 ÷ (500 − 100) = 750 s', 'Right. Backlog = (3,000 − 500) × 120 = 300,000. It drains at the spare capacity, 400/s, so 750 s. The queue turned a checkout outage into a 12-minute email delay.'],
  ]),
];

export const queueOrLog = [
  step('Every uploaded photo needs one thumbnail made. Any worker can do any photo, and once it is done nobody needs the job again. Which shape fits?', [], 0, [
    ['A message queue with competing consumers', 'Right. Each job should be done once by whichever worker is free; the broker deletes it on ack. This is the textbook work queue.'],
    ['A log, so you can replay thumbnails later', 'You could, but nothing here needs replay or multiple independent readers. You would be paying for retention and partition planning you never use.'],
    ['A log with one partition so each photo is processed in order', 'Thumbnails have no ordering requirement, and one partition caps you at one consumer. Order is not the problem here.'],
  ]),
  step('A new fraud team joins and wants to train on the last three days of order events, then follow new ones live. Orders currently flow through a queue whose consumers delete messages on ack. What do they get?', [], 1, [
    ['The last three days — queues keep a history', 'A queue deletes a message once it is acknowledged. The history is gone; there is nothing to rewind.'],
    ['Only events from now on, unless the events were also kept in a log with retention', 'Right. Replay needs retained data and per-reader positions. A log with, say, 7 days of retention lets a new consumer group start from three days ago without disturbing anyone else.'],
    ['Everything, if they read from the dead-letter queue', 'The DLQ holds only messages that failed repeatedly. It is a quarantine, not an archive.'],
  ]),
  step('Workers take a message, and the queue hides it for a 30-second visibility timeout. Processing takes 45 s at p99. What happens to a slow message?', [
    row('Clock (s)', [0, 30, 45], { 0: 'received', 1: 'timeout', 2: 'done' }, { tones: { 1: 'hot' } }),
  ], 2, [
    ['Nothing — the worker still holds it', 'The broker cannot see that the worker is still busy. After 30 s without an ack it assumes the worker died.'],
    ['It is moved to the dead-letter queue', 'A DLQ move happens after too many receives, not after one slow attempt.'],
    ['It reappears at 30 s, a second worker takes it, and the work runs twice', 'Right. The timeout must exceed the worst normal processing time with margin, or the worker must extend it while it works (a heartbeat). Too long, though, and a genuinely dead worker’s message waits that long to retry.'],
  ]),
];

export const fanOut = [
  step('Email, analytics and fraud each need every OrderPlaced event. Someone points all three services at one work queue. What happens?', [
    row('One queue', ['evt 1', 'evt 2', 'evt 3', 'evt 4', 'evt 5', 'evt 6']),
  ], 1, [
    ['Each service receives every event', 'In a work queue, consumers compete: each message goes to exactly one of them.'],
    ['Each event reaches only one of the three services', 'Right. Competing consumers split the stream, so each service sees roughly a third of the orders. Fan-out needs one subscription per service: a queue per service behind a pub/sub topic, or one consumer group per service on a log.'],
    ['The queue rejects the second and third consumers', 'Queues happily accept many consumers. That is exactly why the bug is silent.'],
  ]),
  step('The email service runs 12 instances. On the Kafka topic, how do you make them share the work while analytics still gets its own full copy?', [], 0, [
    ['All 12 email instances join one consumer group; analytics uses a different group', 'Right. Inside a group, partitions are divided among members (work queue). Across groups, each group reads everything (pub/sub). One topic gives you both.'],
    ['Give each email instance its own consumer group', 'Then every instance reads every event and every customer gets 12 receipts.'],
    ['Create a separate topic per instance', 'That pushes routing into the producer and breaks the moment you scale to 13 instances.'],
  ]),
];

export const delivery = [
  step('A consumer commits its offset as soon as it receives a batch, then processes it. It crashes halfway through the batch. What happens to the unprocessed half?', [
    row('Order of operations', ['receive', 'commit', 'process', 'crash'], { 3: 'here' }, { tones: { 3: 'hot' } }),
  ], 0, [
    ['Lost — the restart resumes after the committed offset', 'Right. Commit-then-process is at-most-once: nothing is duplicated, and anything in flight during a crash is gone. Acceptable for metrics you can afford to drop, almost never for orders.'],
    ['Redelivered, because the broker noticed the crash', 'A log does not track which messages were processed, only the committed offset. The offset already says “done”.'],
    ['Processed twice', 'Duplicates come from the opposite order (process, then crash before committing).'],
  ]),
  step('Now it processes, then commits. It sends a receipt email, then crashes before the commit. What happens on restart?', [
    row('Order of operations', ['receive', 'process (email sent)', 'crash', 'commit'], { 2: 'here' }, { tones: { 2: 'hot', 3: 'ghost' } }),
  ], 1, [
    ['The email is lost', 'The commit never happened, so the message has not been marked done. It will come back.'],
    ['The message is redelivered and the email is sent a second time', 'Right. Process-then-commit is at-least-once: no loss, but duplicates. No broker setting removes this; the side effect and the ack are in two different systems.'],
    ['The broker deduplicates it because it has the same id', 'The broker redelivers precisely because it cannot know whether the work happened. Deduplication is the consumer’s job.'],
  ]),
  step('Your consumer reads from Kafka with transactions and exactly-once settings enabled, and calls an email provider for each event. Does Kafka’s exactly-once prevent duplicate emails?', [], 2, [
    ['Yes — exactly-once is end to end', 'Kafka’s guarantee covers what Kafka controls: reading input offsets and writing output records to Kafka atomically. The email provider is outside that transaction.'],
    ['Yes, if the idempotent producer is on', 'The idempotent producer stops duplicates caused by the producer’s own retries when writing to a partition. It does nothing for a consumer that sent an email and then crashed.'],
    ['No — the email is an external side effect; you still need idempotence there', 'Right. Kafka transactions give exactly-once for consume-from-Kafka, produce-to-Kafka pipelines. Anything outside (email, a card charge, another database) is back to at-least-once plus an idempotent effect.'],
  ]),
];

export const idempotency = [
  step('A consumer applies `UPDATE photos SET likes = likes + 1` for every LikeAdded event. Delivery is at-least-once. What is the safest fix?', [], 1, [
    ['Turn off retries so each event is delivered once', 'Then a crash loses likes instead of doubling them. You swapped duplicates for loss.'],
    ['In one database transaction: insert the event id into a processed-events table (unique key), then apply the update', 'Right. A redelivered event hits the unique key, the transaction rolls back, and the count is untouched. The effect and the “I did it” record commit together or not at all.'],
    ['Check a Redis set for the event id before updating, and add it after', 'Check-then-act across two systems has a gap: crash after the update but before the Redis write and the retry double-counts; two consumers can both pass the check. The record must be atomic with the effect.'],
  ]),
  step('The dedup record and the update are in separate transactions: first insert the event id, commit; then apply the update, commit. The process dies between the two. What is the outcome?', [
    row('Steps', ['insert id ✓', 'crash', 'update ✗'], { 1: 'here' }, { tones: { 1: 'hot', 2: 'ghost' } }),
  ], 0, [
    ['The like is lost — the retry sees the id and skips', 'Right. Marking “done” before doing it is at-most-once in disguise. Same transaction, or the marker must come after the effect and the effect must itself be idempotent.'],
    ['The like is counted twice', 'The retry finds the id already recorded and skips. The problem is the opposite: the work never happened.'],
    ['Nothing — the database rolls both back', 'They were two separate commits. The first one is durable.'],
  ]),
];

export const outbox = [
  step('The order service commits the order row, then publishes OrderPlaced to Kafka. The pod is killed between the two. What does the rest of the company see?', [
    row('Timeline', ['DB commit ✓', 'pod killed', 'publish ✗'], { 1: 'here' }, { tones: { 1: 'hot', 2: 'ghost' } }),
  ], 1, [
    ['Nothing wrong — Kafka retries the publish', 'The publish was never attempted. Producer retries cover failed sends, not a process that died before sending.'],
    ['An order that exists but no event: no email, no seller notification, no analytics', 'Right. This is the dual-write problem: two systems, no shared transaction, and a crash between them leaves them disagreeing forever.'],
    ['A duplicate event', 'Duplicates come from republishing. Here the event was never published at all.'],
  ]),
  step('Which fix closes the gap?', [], 2, [
    ['Publish first, then commit the order', 'Now a failed commit leaves a phantom event for an order that does not exist. You moved the hole, you did not close it.'],
    ['A distributed transaction (two-phase commit) spanning Postgres and Kafka', 'Kafka does not take part in XA-style two-phase commit with your database, and 2PC would couple your write path to both systems’ availability.'],
    ['Write the event to an outbox table in the same transaction as the order; a relay publishes outbox rows and marks them sent', 'Right. The order and its event commit atomically. The relay may publish a row twice (crash after publish, before marking), so consumers stay idempotent. Net result: at-least-once, never lost.'],
    ['Retry the publish in a background thread until it succeeds', 'The retry state lives in memory. Kill the pod and the event is gone again.'],
  ]),
];

export const ordering = [
  step('An orders topic has 12 partitions keyed by order_id. Traffic grows, so someone raises it to 24 partitions. Order 123 already has three events on partition 5. Where does its fourth event go?', [
    row('Before', ['p5: created', 'p5: paid', 'p5: packed', '?: shipped'], { 3: 'next' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['Partition 5, as always — the key has not changed', 'The key has not changed, but the partition is hash(key) mod partition count. Change the count and the mapping changes.'],
    ['Possibly a different partition, so “shipped” may be processed before “packed”', 'Right. Adding partitions remaps keys for new messages. Per-key ordering across the change is not guaranteed. Over-provision partitions up front, or migrate to a new topic deliberately.'],
    ['Kafka refuses to add partitions to a keyed topic', 'Kafka allows increasing (never decreasing) the partition count. It just does not move old data or preserve key placement.'],
  ]),
  step('Order events are keyed by seller_id. One mega-seller now produces 40% of all events, so one partition is far hotter than the rest. Events must stay ordered per order, not per seller. Best fix?', [
    row('Partition load', ['p0: 4%', 'p1: 40%', 'p2: 5%', 'p3: 4%'], { 1: 'HOT' }, { tones: { 1: 'hot' } }),
  ], 2, [
    ['Add more partitions', 'One key always maps to one partition. More partitions do not split the mega-seller’s traffic.'],
    ['Give the hot partition a faster consumer machine', 'It raises the ceiling a little; the skew is still there and grows with the seller.'],
    ['Re-key by order_id, the entity whose order actually matters', 'Right. Key by the smallest unit that needs ordering. Order ids spread evenly, and each order’s events still share a partition.'],
    ['Add a random suffix to the seller key', 'That spreads the load, but events for the same order could land on different partitions and be processed out of order. Only salt keys whose events do not need ordering.'],
  ]),
];

export const poison = [
  step('A Kafka consumer throws on the record at offset 5,012 of partition 7 every time, and the code retries forever. What happens?', [
    row('Partition 7', ['5,010 ✓', '5,011 ✓', '5,012 ✗', '5,013', '5,014'], { 2: 'stuck' }, { tones: { 0: 'done', 1: 'done', 2: 'hot', 3: 'ghost', 4: 'ghost' } }),
  ], 1, [
    ['Kafka skips the bad record after a few attempts', 'Kafka consumer groups have no per-record acks or retry counts. The consumer decides what “done” means by committing offsets.'],
    ['Partition 7 stops moving; every record behind it waits, while other partitions carry on', 'Right. Offsets are a single position per partition, so one poison record blocks everything behind it — head-of-line blocking. Retry a bounded number of times, then publish it to a dead-letter topic and commit past it.'],
    ['All partitions stop', 'Each partition has its own offset. Only the partition holding the poison record is stuck (unless the crash loop keeps the whole consumer down).'],
  ]),
  step('A downstream tax service is timing out. Every worker retries each failed message immediately, up to 5 times. What does this do?', [], 2, [
    ['Recovers faster, since each message gets 5 chances right away', 'Five immediate attempts against a struggling service is five times the load at the worst moment.'],
    ['Nothing different from retrying once', 'It multiplies traffic to the failing service by up to 5×.'],
    ['Multiplies load on the struggling service; use exponential backoff with jitter, then a DLQ', 'Right. Backoff gives the dependency room to recover; jitter stops every worker retrying in the same instant; the DLQ caps how long one message can hold a worker.'],
  ]),
];

export const lag = [
  step('Consumers of a topic averaging 20,000 events/s are down for 20 minutes. When they return, 24 instances each process 2,500 events/s. How long to catch up?', [
    row('Rates per second', ['in: 20,000', 'capacity: 60,000', 'backlog: 24M']),
  ], 1, [
    ['20 minutes, the length of the outage', 'The drain rate is the spare capacity, not the full input rate. Here the consumers can do 3× the input.'],
    ['10 minutes: 24,000,000 ÷ (60,000 − 20,000)', 'Right. Backlog = 20,000 × 1,200 s = 24M events. Capacity 24 × 2,500 = 60,000/s, minus the 20,000/s still arriving, drains 40,000/s, so 600 s.'],
    ['6.7 minutes: 24,000,000 ÷ 60,000', 'That ignores the 20,000/s that keep arriving while you drain.'],
  ]),
  step('Lag keeps rising. The topic has 48 partitions and the group already runs 48 consumers. You add 20 more consumers. What changes?', [
    row('Group', ['48 partitions', '48 busy', '+20 new'], { 2: 'idle?' }, { tones: { 2: 'ghost' } }),
  ], 0, [
    ['Nothing — the 20 new consumers sit idle', 'Right. Each partition is read by at most one consumer in a group. Past the partition count, make each consumer faster (batch writes, more threads per partition keyed by sub-key), add partitions (and accept the key remap), or shed load.'],
    ['Throughput rises about 40%', 'There is no partition for the new consumers to own.'],
    ['Kafka splits partitions to use them', 'Partitions are never split automatically.'],
  ]),
  step('A consumer group was switched off for 9 days. Retention is 7 days. Its committed offset now points at data that has been deleted. What happens when it restarts with default settings?', [], 2, [
    ['Kafka keeps unread data until every group has consumed it', 'Retention is time- or size-based. Kafka deletes old segments whether or not anyone has read them.'],
    ['The consumer crashes with an error until someone intervenes', 'Only if `auto.offset.reset` is set to none. The default is different, and more dangerous.'],
    ['It jumps to the newest data, skipping the gap silently', 'Right. With the default `auto.offset.reset=latest`, an out-of-range offset resets to the end of the log. Two days of events are gone and nothing failed. Alert on lag in time well before it approaches retention.'],
  ]),
];

export const sizing = [
  step('Peak 60,000 events/s at 1 KB. Assume one partition takes about 10 MB/s of writes, and one consumer instance processes about 2,500 events/s (from a load test). Before headroom, how many partitions?', [
    row('Bound', ['producer: 60 MB/s ÷ 10', 'consumer: 60,000 ÷ 2,500']),
  ], 2, [
    ['6 — the write throughput needs only 6', 'That is the producer bound. Consumers are slower here, and each consumer needs at least one partition of its own.'],
    ['60 — one per thousand events', 'There is no rule like that. Partitions come from the slower of the two per-partition rates.'],
    ['24 — the larger of the two bounds; then double it for growth', 'Right. partitions ≥ max(T ÷ producer rate, T ÷ consumer rate) = max(6, 24) = 24. Adding partitions later remaps keys, so plan for growth now: about 48.'],
  ]),
  step('Average 20,000 events/s (peak 60,000), 1 KB each, retained 7 days, replication factor 3. How much broker disk before compression?', [
    row('Formula', ['rate', '× size', '× 86,400 s', '× 7 days', '× 3 copies']),
  ], 1, [
    ['About 109 TB', 'That uses the 60,000/s peak. Retention is filled by the average rate across the week, not the peak.'],
    ['About 36 TB', 'Right. 20 MB/s × 86,400 = 1.728 TB/day; × 7 = 12.1 TB; × 3 replicas = 36.3 TB. Compression usually shrinks this a lot — measure your own ratio.'],
    ['About 12 TB', 'That is one copy. Every partition is stored on 3 brokers.'],
  ]),
];

export const delay = [
  step('Iris wants a “still thinking about it?” email 3 days after a cart is abandoned. Where does the 3-day wait live?', [], 1, [
    ['A queue message with a 3-day delivery delay', 'Queue delays are short — SQS, for example, caps per-message delay at minutes (check current docs). And a message cannot be cancelled when the buyer checks out.'],
    ['A durable row with a due time, polled by a scheduler that enqueues when it is due', 'Right. A table indexed on due time handles days or months, can be cancelled or rescheduled, and survives restarts. The queue only carries the work once it is due.'],
    ['A consumer that sleeps for 3 days before processing', 'A sleeping consumer holds the message (and, on a log, the whole partition) hostage. The first deploy loses or redelivers everything.'],
  ]),
  step('On Kafka you want failed payment-webhook calls retried after 1 minute, then 10 minutes, then dead-lettered. What is the usual shape, and its cost?', [], 0, [
    ['Retry topics (retry-1m, retry-10m) whose consumers wait until each record is due; then a DLQ topic. Cost: retried events leave their partition, so per-key order is lost', 'Right. The main partition keeps flowing. If a key’s later events must not overtake a failed one, you must also hold that key’s later events — or accept the reorder explicitly.'],
    ['Seek back to the failed offset and sleep 10 minutes', 'That blocks every other record in the partition for 10 minutes, and a long pause can get the consumer kicked from its group.'],
    ['Set a per-message delay on the Kafka record', 'Kafka has no per-message delivery delay. Delays are built from topics, timestamps and paused consumers.'],
  ]),
];

export const schemas = [
  step('OrderPlaced gains a currency field. Old consumers are still running. Which change is safe?', [], 0, [
    ['Add currency as an optional field with a default; consumers ignore fields they do not know', 'Right. Old consumers keep working; new consumers read the field or the default for old events still in the log.'],
    ['Add currency as a required field', 'New consumers reading old events still in the log (or replaying) will find it missing and fail.'],
    ['Publish to a new topic and switch every consumer the same night', 'A coordinated big-bang cutover across teams is the outage you were trying to avoid.'],
  ]),
  step('The registry enforces BACKWARD compatibility (consumers on the new schema can read data written with the old one). Who must upgrade first?', [], 1, [
    ['Producers', 'If producers start writing the new schema first, old consumers may not be able to read it. That ordering belongs to FORWARD compatibility.'],
    ['Consumers', 'Right. Backward-compatible means the new reader handles old data, so roll out readers first, then let producers emit the new shape.'],
    ['It does not matter', 'The compatibility mode is exactly what tells you the safe order.'],
  ]),
];

export const eventDriven = [
  step('Which of these should stay request/response rather than become an event?', [], 2, [
    ['Updating search indexes when a listing changes', 'No user waits on this. An event is perfect; the index can lag a few seconds.'],
    ['Telling analytics an order happened', 'Classic event: many consumers, no one waiting.'],
    ['Checking the password when a user logs in', 'Right. The user is waiting for a yes or no right now. An event gives no answer, so it would just be a slow, hard-to-debug request.'],
  ]),
  step('Checkout today publishes SendReceiptEmail. A loyalty team wants to award points on every order. What would have made that free?', [], 1, [
    ['Having checkout also publish AwardLoyaltyPoints', 'Then checkout must change for every new team. That is a command, addressed to one recipient.'],
    ['Publishing a fact, OrderPlaced, that any team can subscribe to', 'Right. An event states what happened, in the past tense, and does not know who listens. Commands say what to do and couple the sender to the receiver.'],
    ['Letting the loyalty team read checkout’s database', 'Now checkout cannot change its schema without breaking loyalty. Shared databases are the tightest coupling there is.'],
  ]),
];

export const drills = [
  step('Mara asks for the one-breath description of Kestrel’s order pipeline. Which answer passes?', [], 1, [
    ['"We put orders on Kafka."', 'No key, no semantics, no failure story. The async version of “cache it in Redis”.'],
    ['"OrderPlaced via an outbox, keyed by order_id on 48 partitions, at-least-once with idempotent consumers, retries with backoff then a DLQ, lag alerts in seconds."', 'Right: how it gets in (outbox), how it is ordered (key), what delivery means (at-least-once + idempotence), how it fails (retry, DLQ), and how you know (lag).'],
    ['"Exactly-once delivery with Kafka transactions."', 'Overclaims. Kafka transactions cover Kafka-to-Kafka; your emails and database writes are outside.'],
    ['"SQS FIFO so everything is ordered and deduplicated."', 'FIFO orders within a message group and dedupes producer sends in a short window. It does not make a crashed consumer’s side effect happen once.'],
  ]),
  step('A consumer group has 16 consumers on a 12-partition topic. Lag is climbing. What is your first observation?', [], 0, [
    ['Four consumers are idle; adding more cannot help', 'Right. Consumers beyond the partition count get nothing. The fix is per-consumer speed, more partitions (with care), or shedding.'],
    ['Add 16 more consumers', 'They would also sit idle.'],
    ['Lower retention to reduce lag', 'Retention deletes data; it does not process it. Lower retention just risks losing what lags.'],
  ]),
  step('Your consumer writes results to Postgres and must not apply an event twice. Cleanest pattern?', [], 2, [
    ['Commit the Kafka offset before writing to Postgres', 'That is at-most-once. A crash loses the write.'],
    ['Use Kafka transactions', 'They make Kafka writes and offset commits atomic. Postgres is not part of that transaction.'],
    ['Record the event id in Postgres in the same transaction as the write, and skip ids already seen', 'Right. The effect and the dedup marker commit together. Use the producer’s event id, not the offset: a republished duplicate (say, from an outbox relay) gets a new offset but keeps its event id.'],
  ]),
  step('Which rate do you use for retention storage, and which for partition count?', [], 1, [
    ['Peak for both', 'Peak sizes throughput. Storage fills at the average, so peak-based storage overbuys several-fold.'],
    ['Average for storage, peak for partitions and consumers', 'Right. Bursts must be served (peak), but disk fills at what arrives over the whole retention window (average).'],
    ['Average for both', 'Average-sized consumers fall behind every peak, and lag snowballs.'],
  ]),
  step('A field must be renamed from amount to total in an event with 30 consumers. Safest path?', [], 2, [
    ['Rename it in one release; the registry will reject bad consumers', 'The registry would reject the schema, or consumers reading the old name would break. Renames are remove + add in disguise.'],
    ['Rename it and keep publishing the old topic for a week', 'Two topics with different shapes and no plan for consumers to move.'],
    ['Add total, publish both for a while, move consumers to total, then deprecate amount', 'Right. Expand, migrate, contract. Every step is compatible, and the log’s retained old events still read correctly.'],
  ]),
  step('An interviewer asks: “Why not just call the notification service directly from checkout?” Best answer?', [], 0, [
    ['Checkout should not fail or slow down because notifications do; an event decouples their availability and absorbs bursts — at the cost of eventual delivery and a broker to run', 'Right. Name the win (isolation, buffering, retries) and the price (eventual, duplicates, operations). Tradeoffs, not slogans.'],
    ['Queues are always faster than HTTP', 'The end-to-end path is often slower. The win is isolation, not speed.'],
    ['Microservices must communicate through events', 'There is no such rule. Synchronous calls are right when the caller needs the answer.'],
  ]),
];
