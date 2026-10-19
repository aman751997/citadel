# Live tests 3 (task `live-tests-3`)

Run 2026-10-19 on throwaway containers (all removed). RabbitMQ 3.13.7 (`rabbitmq:3.13-management`) and 4.3.6 (`rabbitmq:4-management`) with pika 1.4.4; `redis:7` with redis-py 7.0.1; `mysql:8.0` (8.0.46) with PyMySQL; Python 3.9 for the hashing simulation.

Counts: VERIFIED 1, CORRECTED 3, COULD NOT VERIFY 1 (OS crash / power loss for MySQL, cannot be simulated).

## 1. RabbitMQ `consumer_timeout` (pattern-async-jobs.mdx:565)
Method: `consumer_timeout = 10000` in `/etc/rabbitmq/conf.d/20-ct.conf`; `rabbitmqctl eval 'application:get_env(rabbit, consumer_timeout).'` returned `{ok,10000}` on both. One message per queue (classic, quorum), a pika consumer on its own channel with `auto_ack=False` that never acks, heartbeat 600 s, watched 330 s. Docs (rabbitmq-website `docs/consumers.md`, fetched 2026-10-19): "The default timeout value for RabbitMQ is 30 minutes. Whether the timeout should be enforced is evaluated periodically, at one minute intervals. Values lower than one minute are not supported, and values lower than five minutes are not recommended." Documented outcome: channel closed with `PRECONDITION_FAILED`.

| Version | Queue | Observed (time after delivery) |
|---|---|---|
| 3.13.7 | classic | channel closed at 60.0 s: `406 PRECONDITION_FAILED - delivery acknowledgement on channel 1 timed out. Timeout value used: 10000 ms.` Connection stayed open. Message back to `ready=1, unacked=0`. |
| 3.13.7 | quorum | same, channel closed at 60.0 s, message back to ready |
| 4.3.6 | quorum | broker sent `basic.cancel` at 10.0 s; channel and connection stayed open |
| 4.3.6 | classic | nothing in 330 s: no cancel, no channel close, message stayed unacked, no log line |

- Repeated 3 times for 3.13.7 (deliveries at different times, always exactly 60.0 s): the first check after the timeout passed ran about one minute after the delivery, consistent with the one-minute check interval. Broker log (3.13.7): `Consumer 'ctag1...' on channel 1 and queue 't-classic' in vhost '/' has timed out waiting for a consumer acknowledgement of a delivery with delivery tag = 1. Timeout used: 10000 ms.` then `operation none caused a channel exception precondition_failed: delivery acknowledgement on channel 1 timed out.`
- 4.3.6 classic: also tried the per-queue argument. `x-consumer-timeout` on a classic queue is refused: `PRECONDITION_FAILED - invalid arg 'x-consumer-timeout' for queue 't-classicarg' ... of queue type rabbit_classic_queue`. The docs show the per-queue policy example with `--apply-to quorum_queues`. So on 4.x the consumer timeout is not enforced for classic queues in this setup (the earlier 5 s / 150 s run is confirmed by a 10 s / 330 s run). The reason is not documented in the page read: COULD NOT VERIFY why. Not tested: waiting out the full 30 minute default on 4.x classic.
- Result: CORRECTED. Before: "After that the broker closes the channel or cancels the consumer and the message goes back to the queue." After: states the one-minute check, the 3.13 observation (both queue types, about 60 s with a 10 s timeout), the 4.3.6 quorum cancel at 10 s, and that 4.3.6 classic did not enforce it.

## 2. Redis LFU vs LRU when the hot set changes (caching.mdx ~1365, 1373, 1427)
Method: `redis:7`, `--maxmemory 4mb` (about 16,700 keys of 100-byte values fit), `lfu-log-factor 10`. Phase 1: 600,000 cache-aside reads of 12,000 hot keys `A:*` chosen uniformly (hit ratio 1.00, mean `OBJECT FREQ` of A keys 8.4). Phase 2: reads of 12,000 different keys `B:*`, about 3,000 requests a second, windows of 30,000 requests, 11 minutes. (Both sets together, 24,000 keys, do not fit.) Hit ratio per window:

| Policy | 30k | 60k | 180k | 360k | 540k | 1.8M (11 min) |
|---|---|---|---|---|---|---|
| allkeys-lru | 0.63 | 0.97 | 1.00 | 1.00 | 1.00 | 1.00 |
| allkeys-lfu, decay-time 1 (default) | 0.40 | 0.45 | 0.60 | 0.86 | 0.99 | 1.00 |
| allkeys-lfu, decay-time 0 | 0.40 | 0.45 | 0.48 | 0.55 | 0.59 | 0.70 (still rising) |

First window with hit ratio at least 90%: LRU 60,000 requests (22 s); LFU decay 1 about 420,000 requests (156 s); LFU decay 0 never within 1.8M requests. Mean `OBJECT FREQ` of cached A keys under decay 1 fell 8.4 -> 7.2 (360k) -> 3.4 (900k) -> 0.0 (1.8M) while B keys stayed 6-7. Under decay 0, A stayed 8.4-8.8, B reached 8.0, A keys still occupying 8,837 slots at the end.
- Result: CORRECTED/VERIFIED. LFU is slower to adapt (about 7x the requests of LRU with the default settings; stuck with decay off). The lesson said "slow to adapt ... (Redis decays counts over time)"; now has these numbers and settings. Caveat: with a Zipf hot set whose two phases both fit in the cache (first attempt, discarded) the old keys simply stayed resident next to the new ones and the effect cannot be seen; the effect only shows when the new hot set must displace the old one. Another earlier attempt measured residency with a 12,000-command pipeline, whose buffers themselves pushed Redis over `maxmemory`; discarded and redone with 200-command chunks.

## 3. Consistent hashing vs mod N, 3 -> 4 nodes (pattern-partitioning.mdx; core-concepts.mdx; caching.mdx)
Method: 100,000 keys `key0..key99999`, MD5-derived 64-bit hash; ring with v virtual nodes per node; moved = key's owner changes.
```
ring vnodes=    1 moved=50.12%
ring vnodes=   10 moved=25.52%
ring vnodes=  100 moved=25.71%
ring vnodes= 1000 moved=24.27%   (all moves go to the new node)
mod-N 3->4 moved=75.03%
mod-N 4->5 moved=80.10%   (databases.mdx says 80%)
mod-N 10->11 moved=90.81% (lessons say about 91%)
```
Result: VERIFIED (about 25% for consistent hashing with many vnodes, 75% for mod N; with a single point per node the move is far less even, 50% in this run). The "25%" in pattern-partitioning.mdx is the Redis Cluster slot share 4,096/16,384, also correct. No lesson text changed.

## 4. `innodb_flush_log_at_trx_commit` on a process crash (databases.mdx ~899)
Method: `mysql:8.0` (8.0.46), `--innodb-flush-log-at-trx-commit=V --sync-binlog=0`, data on a Docker volume. Autocommit insert; as soon as it returned, `docker kill -s KILL` (the kill took about 0.15 s); container restarted; check the row.
```
value=1: lost 0 of 8      value=2: lost 0 of 8      value=0: lost 3 of 8 (trials 6, 7, 8)
```
Earlier variant (burst of 200 autocommit inserts, then kill, 3 trials per value): 200 of 200 survived for 1, 2 and 0 (the log was written within the second). Result: CORRECTED databases.mdx: added what survives which crash. Process crash: 1 and 2 lose nothing, 0 can lose recent commits. OS crash / power loss: COULD NOT VERIFY here (cannot be simulated). The sentence rests on the MySQL manual text for this variable (value 2 is flushed to disk about once a second, so an OS crash can lose about a second); the value-1 power-loss guarantee depends on the hardware honouring flushes, as the manual says.

## Cleanup
Containers `vfy-lt3-*` and volumes removed; `/tmp/vfy-lt3` deleted.
