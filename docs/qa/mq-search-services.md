# Verification: message queues, Kafka, Elasticsearch (task `mq-search-services`)

Date run: 2026-10-19. All tests ran against real throwaway Docker containers (removed afterwards).
Versions: RabbitMQ 3.13.7 (`rabbitmq:3-management`) and 4.3.6 (`rabbitmq:4-management`), driven with Python `pika` and `rabbitmqctl`. Kafka 4.3.1 (`apache/kafka`, KRaft, one broker). Elasticsearch 8.19.0 (single node, security off, 1 GB heap).

Counts: VERIFIED 27, CORRECTED 4, COULD NOT VERIFY 4.

## RabbitMQ

### R1. Consumer dies before ack: the message is redelivered (at-least-once)
- Where: queues-streams.mdx:206, 254, 296; pattern-async-jobs.mdx:560, 596
- Method: consumer A `basic_get` without ack, then closed its connection; consumer B `basic_get`.
- Result: VERIFIED (3.13.7 and 4.3.6, same output).
```
consumer A got b'0' redelivered= False
ready/unacked while A holds: q1  2  1
consumer B got b'0' redelivered= True
```

### R2. Requeue ordering
- Method: B nacks with `requeue=True`, then drain.
- Result: VERIFIED (both versions): the requeued message goes back to the head (original position).
```
drain order: [('0', True), ('1', False), ('2', False)]
```

### R3. Prefetch behaviour
- Where: queues-streams.mdx:257, 1062; pattern-async-jobs.mdx:596-599, 1143
- Method: 10 messages, `basic_qos(prefetch_count=2)`, no acks, then one ack.
- Result: VERIFIED (both versions).
```
prefetch=2, delivered w/o ack: [(1, '0'), (2, '1')]
ready/unacked: q2  8  2
after ack of 1: [(1, '0'), (2, '1'), (3, '2')]
```
- Extra: with `auto_ack=True` the prefetch limit is not applied: `basic_qos(prefetch_count=5)` plus auto-ack consumer received all 10 at once, and after it closed the queue had 0 messages (they are lost). This confirms the quiz at queues-streams.mdx:296 (auto-ack consumer crash loses its messages). VERIFIED.

### R4. Per-message TTL: expired message behind a live one is not removed until it reaches the head (classic queue)
- Where: pattern-async-jobs.mdx:796
- Method: classic queue; publish A (expiration 60 s) then B (expiration 1 s); wait 4 s; list queue; get twice. Control: queue-level `x-message-ttl` 1000.
- Result: VERIFIED on 3.13.7 and 4.3.6; lesson text hedge replaced by the concrete statement.
```
messages in queue after 4s (B expired but behind A): q3  2
first get: b'A-live-60s'
second get: None
q3b (per-queue TTL, 3 s later): 0
```

### R5. Dead-letter exchange routing (`x-dead-letter-exchange`) and the TTL wait-queue recipe
- Where: pattern-async-jobs.mdx:786-796
- Method: `jobs` queue with DLX `jobs.dlx` (fanout) bound to `jobs.dead`; `basic_nack(requeue=False)`. Then `jobs.wait.2s` with `x-message-ttl`, DLX `""` and routing key `jobs`.
- Result: VERIFIED (both versions).
```
jobs.dead got: b'job1' x-death: [('rejected', 'jobs')]
jobs got after wait: b'retry1'
```

### R6. Quorum queue `x-delivery-limit` default, and what happens after the limit
- Where: pattern-async-jobs.mdx:810; queues-streams.mdx:948 (already said "default 20 since 4.0")
- Method: quorum queue, one poison message, 30 delivery attempts through a fresh connection each time, two ways (nack requeue, or connection closed unacked). `jobs.dlx` dead-letter queue watched.
- Result: CORRECTED pattern-async-jobs.mdx:810 (hedge "check the current docs and defaults" replaced by facts below). queues-streams.mdx:948 consistent with the result.
```
3.13.7
default     nack-requeue        deliveries=30 last headers={'x-delivery-count': 29}   (no limit)
default     crash(conn closed)  deliveries=30 ...                                      (no limit)
limit3      nack-requeue        deliveries=4  last headers={'x-delivery-count': 3}
limit3      crash               deliveries=4
limit3+dlx  nack-requeue        deliveries=4   dead-lettered: ['delivery_limit']
limit3+dlx  crash               deliveries=4   dead-lettered: ['delivery_limit']
4.3.6
default     nack-requeue        deliveries=30 last headers={'x-acquired-count': 29}   (not counted)
default     crash(conn closed)  deliveries=21 last headers={'x-acquired-count': 20, 'x-delivery-count': 20}
limit3      nack-requeue        deliveries=30 (not counted)
limit3      crash               deliveries=4
limit3+dlx  crash               deliveries=4   dead-lettered: ['delivery_limit']
```
  Broker log (4.3.6): `queue 'to2-quorum' in vhost '/': delivery_limit not set, defaulting to 20`.
  Findings: 3.13 = unlimited by default; 4.3 = 20 by default (21 deliveries in total, the original plus 20 returns). With a limit, the message is dead-lettered with reason `delivery_limit` if a DLX is set; with no DLX it simply disappears (deliveries stop and the queue is empty). On 4.3 a `nack requeue=True` is NOT counted towards the limit (header `x-acquired-count` grows, limit never reached in 30 tries); only returns from a crashed or disconnected consumer count. On 3.13 both counted. This nack-requeue loop was added to the lesson.

### R7. `consumer_timeout` default and what happens on a long job
- Where: pattern-async-jobs.mdx:560, 596-610
- Method: `rabbitmqctl eval 'application:get_env(rabbit, consumer_timeout).'`; then a container configured with `consumer_timeout = 5000` (via `rabbitmq.conf`), a consumer that never acks, watching broker logs and queue counters.
- Result: default VERIFIED. Behaviour: CORRECTED text (was "holds it indefinitely ... check the current default"), partly COULD NOT VERIFY on 4.3 classic (see below).
```
{ok,1800000}            (3.13.7 and 4.3.6, no config)  -> 30 minutes
```
  3.13.7 with 5 s timeout, both classic and quorum, broker log (about 60 s after delivery, the check runs about once a minute):
```
Consumer '...' on channel 1 and queue 'to4-classic' in vhost '/' has timed out waiting for a consumer acknowledgement of a delivery with delivery tag = 1. Timeout used: 5000 ms.
operation none caused a channel exception precondition_failed: delivery acknowledgement on channel 1 timed out. Timeout value used: 5000 ms.
queue counters afterwards: to4-classic ready=1 unacked=0, to4-quorum ready=1 unacked=0
```
  4.3.6 with 5 s timeout: quorum queue: the broker cancelled the consumer at about 5.0 s (pika `on_cancel` callback fired at t=5.003 s), channel stayed open, message back in `messages_ready=1`. Classic queue: the message stayed unacked for the whole 150 s test (`to5-classic t=150 ['to5-classic 0 1 1'] open=True`), no log line, no channel close. COULD NOT VERIFY why (classic timeout not enforced on 4.3.6 in this setup); the lesson now says "closes the channel or cancels the consumer", which matches 3.13 and 4.3 quorum.
  Also seen: pika client did not raise on the channel close during idle processing; irrelevant for the claim.

### R8. `x-max-length` overflow behaviour
- Where: pattern-async-jobs.mdx:1144
- Method: `x-max-length: 3`, five publishes with publisher confirms, default / `drop-head` / `reject-publish`.
- Result: VERIFIED (both versions). No lesson change needed.
```
ml-default        ['ack','ack','ack','ack','ack']          remaining: ['2','3','4']   (drop-head is the default)
ml-drop-head      same                                     remaining: ['2','3','4']
ml-reject-publish ['ack','ack','ack','NackError','NackError'] remaining: ['0','1','2']
```

### R9. Side finding (not in lessons, no edit)
RabbitMQ 4.3.6 refuses non-durable, non-exclusive queues: `INTERNAL_ERROR - Feature 'transient_nonexcl_queues' is deprecated. By default, this feature is not permitted anymore.` The lesson code uses `durable=True`, so it is fine.

## Kafka (4.3.1 broker and client tools)

Producer and consumer defaults came from the client's own startup log (`KAFKA_LOG4J_OPTS` set to INFO). The console tools override a few values (`linger.ms=1000`, `retries=3`), so those are not quoted as defaults.

### K1. `enable.idempotence` default, `acks` default
- Where: queues-streams.mdx:455
- Result: VERIFIED (4.3.1 client). The "since Kafka 3.0" part is not checked here (COULD NOT VERIFY, no old client tried); the text in the file was added by another agent.
```
acks = -1
enable.idempotence = true
max.in.flight.requests.per.connection = 5
delivery.timeout.ms = 120000
max.request.size = 1048576
```

### K2. `max.poll.interval.ms` default
- Where: queues-streams.mdx:1070
- Result: VERIFIED default (5 minutes). Behaviour on exceeding it (group drops the consumer, partitions reassigned) COULD NOT VERIFY: no Java client with a deliberate slow poll was available without a compiler in the image.
```
max.poll.interval.ms = 300000   max.poll.records = 500   session.timeout.ms = 45000   heartbeat.interval.ms = 3000
enable.auto.commit = true   auto.commit.interval.ms = 5000   group.protocol = classic   isolation.level = read_uncommitted
```

### K3. Message size default
- Result: VERIFIED. `kafka-configs.sh --describe --all`: `max.message.bytes=1048588 synonyms={DEFAULT_CONFIG:message.max.bytes=1048588}`. Producer side `max.request.size=1048576`.
```
1 MiB + message  -> RecordTooLargeException: The message is 1048664 bytes when serialized which is larger than 1048576, which is the value of the max.request.size configuration.
1.5 MB with max.request.size=3000000 -> RecordTooLargeException: The request included a message larger than the max message size the server will accept.
1,000,000 byte message -> accepted
```

### K4. Topic and broker defaults
- Result: VERIFIED: `retention.ms=604800000` (7 days), `cleanup.policy=delete`, `num.partitions=1`, `default.replication.factor=1`, `min.insync.replicas=1`, `auto.create.topics.enable=true` (single dev broker). `kafka-topics.sh --describe` showed `Configs: min.insync.replicas=1,segment.bytes=1073741824`.

### K5. Ordering within a partition, same key to same partition
- Where: queues-streams.mdx (ordering chapter, partition keys)
- Method: 30 keyed messages (`key0`..`key5`), 3 partitions, consumed with offsets.
- Result: VERIFIED. One key always lands on one partition and keeps send order:
```
key0 Partition:1 -> m6 m12 m18 m24 m30
key1 Partition:2 -> m1 m7 m13 m19 m25
key4 Partition:0 -> m4 m10 m16 m22 m28
```
  (a first run with only keys A/B/C hashed all to partition 1, a legal hash collision; offsets 0..19 were in send order.)

### K6. Consumer group rebalance
- Method: three console consumers, same group, topic with 3 partitions, `kafka-consumer-groups.sh --describe`.
- Result: VERIFIED.
```
c1 alone: partitions 0,1,2 -> c1
c2 joins: 0,1 -> c1, 2 -> c2
c3 joins: 0 -> c1, 1 -> c2, 2 -> c3
c1 killed with SIGKILL (static member, about 50 s later): 0,1 -> c2, 2 -> c3
```
  The last step also shows a dead member's partitions are reassigned only after the session timeout (45 s default) for a static member.

### K7. Offset commit vs ack
- Where: queues-streams.mdx:254, 1066-1070
- Method: topic with 10 messages, single partition.
- Result: VERIFIED.
```
auto-commit off: read 1 2 3, no committed offset; restart re-read: 1 2 3     (crash before commit = redelivery)
auto-commit on (commit on close): read 1 2 3 -> CURRENT-OFFSET 3, LOG-END 10, LAG 7; restart read 4 5 6 -> CURRENT-OFFSET 6, LAG 4
brand-new group, no --from-beginning: saw none of the 10 existing messages (reset policy latest)
```
  The statement about a committed offset falling off retention and then jumping to the newest record was NOT reproduced (would need retention deletion): COULD NOT VERIFY the retention case; the `latest` behaviour for a new group is verified.

## Elasticsearch 8.19.0

### E1. BM25 worked example (search.mdx:374-378)
- Method: one shard, `title` mapped `text` with the `english` analyzer (stop words removed, so "Two brass lamps for the desk" has 4 terms, as in the lesson's table), `explain: true`, query `match title "brass lamp"`.
- Result: VERIFIED. Lesson says 0.65 / 0.58 and lengths 3, 4, 4 (avg 3.67), idf 0.47 and 0.13, tf parts 1.08 and 0.96.
```
d1 0.652   brass 0.5078 (boost 2.2, idf 0.4700, tf 0.4911 dl=3 avgdl=3.6667) + lamp 0.1443 (idf 0.1335)
d2 0.5819  brass 0.4532 (tf 0.4382 dl=4) + lamp 0.1287
d3 0.1287  lamp only
```
  0.4911 x 2.2 = 1.08, 0.4382 x 2.2 = 0.96. The "boost 2.2" is k1+1, which the lesson mentions. Note: with the plain `standard` analyzer there is no stop-word removal or stemming, so the example only holds with an English analyzer (lesson table already shows stemmed, stop-word-free terms). Analyzer output check: `english` on "Two brass lamps for the desk" -> `['two', 'brass', 'lamp', 'desk']`; `standard` on "Brass Lamps" -> `['brass', 'lamps']`.

### E2. `log2p` modifier (search.mdx:411)
- Method: `field_value_factor` alone with `boost_mode: replace`, docs with sales 0, 9, 99.
- Result: VERIFIED: log2p = log10(2 + sales).
```
sales 99 score 2.00432  (log10(2+s) = 2.00432)
sales 9  score 1.04139  (1.04139)
sales 0  score 0.30103  (0.30103, not 0)
log1p, sales 0 -> score 0.0   (so the lesson's "log1p of 0 would multiply the whole score by 0" is right)
modifier log, sales 0 -> error: field value function must not produce negative scores, but got: [-Infinity]
```
  `gauss` with `scale: 30d, decay: 0.5`: a 30-day-old document scored `0.49999982`. VERIFIED.

### E3. `refresh_interval` default and near-real-time visibility (search.mdx:540, 542)
- Result: VERIFIED.
```
GET listings/_settings?include_defaults -> {"refresh_interval":"1s"}
index doc, search immediately: hits=0; GET by id immediately: found=True; search 1.6 s later: hits=1
refresh_interval=-1: doc indexed, 3 s later hits=1 (still not visible); after POST _refresh: hits=2
```

### E4. `search_after` with a point-in-time (search.mdx:815-831)
- Result: VERIFIED.
```
page 1 sorted by [_score desc, listing_id asc]: ['L02','L04','L09','L01'], last sort [0.12907705, 'L01', 0]
new doc indexed and refreshed between pages
page 2 using the PIT: ['L03','L05','L06','L07']       (new doc not shifted in)
fresh search without PIT, page 1 now: ['L02','L04','L09','L99']  (new doc appears)
sort by _score only, with PIT: sort values [[0.267..., 4294967296], [0.267..., 4294967297]]  (implicit tiebreaker added)
```
  The `from: 10000, size: 20` request fails: `Result window is too large, from + size must be less than or equal to: [10000] but was [10020]. ... index.max_result_window` (search.mdx:809 VERIFIED).

### E5. `text` vs `keyword` (search.mdx:235-250, 314-321, 392)
- Result: VERIFIED. Doc `{"t":"Brass Lamp","k":"Brass Lamp"}` (t text, k keyword):
```
match t "lamp" -> 1          match k "lamp" -> 0
term k "Brass Lamp" -> 1     term k "brass lamp" -> 0      (exact, case-sensitive)
term t "Brass Lamp" -> 0     (text is lowercased and split at index time)
match_phrase t "brass lamp" -> 1
sort on text field -> "Fielddata is disabled on [t]"
```

### E6. Is RRF licence-gated? (search.mdx:1403)
- Result: CORRECTED (was "sometimes on paid tiers, so check current docs"). The server answers on the free Basic licence:
```
GET _license -> status active, type basic
retriever.rrf search -> 403 security_exception: current license is non-compliant for [Reciprocal Rank Fusion (RRF)]
POST _license/start_trial?acknowledge=true -> {"trial_was_started":true,"type":"trial"}
same RRF search under trial licence -> [('L02', 0.03252), ('L01', 0.03178), ('L04', 0.03175)]
```
  So Elasticsearch's built-in RRF retriever needs a paid (or trial) licence as of 8.19; fusing in application code (the lesson's `rrf()` function) works on any licence.

## Not verified (no way to test here)
- SQS visibility timeout 30 s default (queues-streams.mdx:206): no SQS in Docker; left hedged ("check current docs").
- Kafka queue-style consumption status (pattern-async-jobs.mdx:333): news item, left hedged.
- Kafka `max.poll.interval.ms` exceeded behaviour, committed offset past retention (see K2, K7).
- RabbitMQ 4.3 classic `consumer_timeout` enforcement (see R7).
