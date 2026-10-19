# Kafka new consumer group protocol (KIP-848) checks (2026-10-19)

Setup: `apache/kafka:latest` (KRaft, 1 broker, kafka-server 4.3.1), Java client kafka-clients 4.3.1 + slf4j-simple 1.7.36 from Maven Central, OpenJDK 17.0.18. Consumer: `group.protocol=consumer`, `max.poll.interval.ms=5000`, `max.poll.records=1`, `auto.offset.reset=earliest` (`none` for item 4), topic with 3 records (1 partition), manual commit unless noted. Poll once, sleep 8 s (20 s where noted), then act. Harness: one small Java class (modes sync/async/auto/none/peer/oor), rebalance listener printing assigned/revoked/lost, broker described with `kafka-consumer-groups.sh --describe --members/--state/--offsets`. Containers and temp files removed afterwards.

## 0. Protocol is on (VERIFIED)
- `kafka-configs.sh --entity-type brokers --entity-name 1 --describe --all`: `group.coordinator.rebalance.protocols=classic,consumer,streams` (DEFAULT_CONFIG), `group.consumer.session.timeout.ms=45000`, `group.consumer.min.session.timeout.ms=45000`, `group.consumer.heartbeat.interval.ms=5000`, `group.consumer.assignors=uniform,range`. `kafka-features.sh describe`: `group.version` finalized level 1.
- Consumer log: `group.protocol = consumer`; `--describe --state` shows ASSIGNMENT-STRATEGY `uniform`; `--list --type consumer` shows TYPE `Consumer`.
- `session.timeout.ms=10000` on the client: `ConfigException: session.timeout.ms cannot be set when group.protocol=CONSUMER`. So the classic 10 s session timeout cannot be copied; the broker value (45 s) applies.

## 1. commitSync after 8 s pause (single member, topic t)
```
[+5.0 s] WARN ConsumerHeartbeatRequestManager - Consumer poll timeout has expired. ... max.poll.interval.ms ...
         Member ... STABLE -> PREPARE_LEAVING -> LEAVING -> STALE      (epoch -1)
[+8.4 s] commitSync OK
         onPartitionsLost [t-0]  ->  (rejoin, epoch 4)  onPartitionsAssigned [t-0]
poll2 got m1@1 (m0 NOT redelivered), poll3 m2@2
```
Committed offset after run: 1 (`--describe --offsets`). So with nobody else in the group the commit was ACCEPTED; no exception. Result VERIFIED (3 repeats, same).

### 1b. Same, but a second member (peer, 2-partition topic) took the partition: sleep 20 s
```
[+~10 s after poll1] WARN Consumer poll timeout has expired ...  (leave)
peer: onPartitionsAssigned [t3-1]  (~3 s after the leave)
woke: ERROR CommitRequestManager - OffsetCommit failed with UNKNOWN_MEMBER_ID
commitSync threw org.apache.kafka.clients.consumer.CommitFailedException: OffsetCommit failed with unknown member ID. The coordinator is not aware of this member.
onPartitionsLost [t3-1] -> onPartitionsAssigned [] -> (~5 s later) onPartitionsAssigned [t3-1]; m0@0 redelivered
```
Class is still `CommitFailedException`; message and cause differ. Not `UnknownMemberIdException`/`FencedInstanceIdException` at the app level.

## 2. commitAsync and auto-commit
- commitAsync, single member, 8 s: callback `offsets={t-0=...offset=1} ex=null` (success); lost then assigned; m1 next.
- commitAsync with peer holding the partition, 20 s: callback `offsets=null ex=CommitFailedException: OffsetCommit failed with unknown member ID. The coordinator is not aware of this member.`; lost, assigned [] then [partition]; m0@0 redelivered.
- auto-commit (1 s), single member, 8 s: no exception, no error log, m1 next, final committed offset 3.
- auto-commit with peer, 20 s: no exception to the app; log `ERROR CommitRequestManager - OffsetCommit failed with UNKNOWN_MEMBER_ID` followed by the `CommitFailedException` stack trace; lost, assigned; m0@0 redelivered.
- No-commit run (mode none, 8 s): leave at 5.0 s, `onPartitionsLost`, reassigned, m0@0 redelivered.

## 3. Who detects the slow poll
- Client side. Log: `WARN ConsumerHeartbeatRequestManager - Consumer poll timeout has expired. This means the time between subsequent calls to poll() was longer than the configured max.poll.interval.ms ...`, state STABLE -> PREPARE_LEAVING -> LEAVING -> STALE. In no-commit, sync and async runs this was 5.0 s after the poll. `--describe --state` went Stable/1 member -> Empty/0 within ~2-4 s of that, long before the 45 s session timeout.
- Timing caveat: with auto-commit on, the single-member 8 s runs (4 runs) showed NO leave during the pause (group stayed Stable); the client only logged `Time between subsequent calls to poll() was longer than the configured max.poll.interval.ms, exceeded approximately by 3040 ms. Member ... will rejoin the group now.` on the next poll. With a 20 s pause the leave came at ~9.9 s (single member, auto-commit), and at 5.0 s in the auto-commit peer run. Inference (not proven): the check runs on the 5 s heartbeat tick, so the leave happens at the first tick after the limit, i.e. between 5 s and ~10 s.
- Server side: the frozen JVM (kill -STOP, no heartbeats) stayed Stable in `--describe --state` through +35 s and was Empty at +41 s (checked every ~6 s), consistent with `group.consumer.session.timeout.ms=45000` counted from the last heartbeat.

## 4. auto.offset.reset=none (topic oor; 12 records, group committed offset 3, `kafka-delete-records.sh` to low watermark 7; log end 12)
Method differs from the classic run (which used retention.ms); end state is the same (committed 3 below log start 7).
```
threw org.apache.kafka.clients.consumer.OffsetOutOfRangeException: Fetch position FetchPosition{offset=3, offsetEpoch=Optional.empty, currentLeader=...} is out of range for partition oor-0
fresh group: threw org.apache.kafka.clients.consumer.NoOffsetForPartitionException: Undefined offset with no reset policy for partitions: [oor-0]
```

## Comparison with classic (docs/qa/kafka-java-client.md)
| Check | Classic (client 4.3.1, session 10 s) | KIP-848 (`group.protocol=consumer`) |
|---|---|---|
| commitSync after 8 s pause, alone in group | `CommitFailedException: ...not part of an active group ... kicked out of the group` | succeeded (no exception); committed offset 1; m0 not redelivered |
| commitSync after partition given to another member | not tested | `CommitFailedException: OffsetCommit failed with unknown member ID. The coordinator is not aware of this member.` |
| commitAsync | same CommitFailedException in callback | success when alone; same unknown-member CommitFailedException when partition was taken |
| auto-commit | ERROR log `Asynchronous auto-commit ... failed`, no exception to app | no exception; ERROR log `OffsetCommit failed with UNKNOWN_MEMBER_ID` when partition was taken |
| assignment | lost then assigned on next poll | lost then assigned on next poll (empty set first, then partition ~3-5 s later when a peer held it) |
| redelivery | m0 redelivered | m0 redelivered when the commit failed or nothing was committed; not redelivered when commit succeeded |
| who detects | client heartbeat thread leaves at ~5.1 s | client leaves at the first heartbeat tick after 5 s (5.0 s to ~10 s seen); server session timeout 45 s (broker setting, client `session.timeout.ms` rejected) |
| `none` offset-out-of-range | `OffsetOutOfRangeException` / `NoOffsetForPartitionException` | same two classes |

Lesson edits: queues-streams.mdx, Rebalance storms bullet (client/broker version and protocol named, new-protocol results added) and the `auto.offset.reset=none` sentence (both protocols).
Not tested: other client/broker versions, static membership (`group.instance.id`) / `FencedInstanceIdException`, cooperative vs eager under the classic protocol, the 300,000 ms default.
