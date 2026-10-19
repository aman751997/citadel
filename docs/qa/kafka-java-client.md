# Kafka Java client checks (2026-10-19)

Setup: `apache/kafka:latest` (KRaft, 1 broker; broker jar kafka-clients 4.3.1), Java client kafka-clients 4.3.1 from Maven Central + slf4j 1.7.36, OpenJDK 17.0.18, classic group protocol (client default). Consumer: `max.poll.interval.ms=5000`, `session.timeout.ms=10000`, `heartbeat.interval.ms=1000`, `max.poll.records=1`, `auto.offset.reset=earliest`, topic with 1 partition and 3 records. Poll once, sleep 8 s, then act. Containers and temp files removed afterwards.

## 1. commitSync after exceeding max.poll.interval.ms (queues-streams.mdx, Rebalance storms bullet) VERIFIED
```
commitSync threw org.apache.kafka.clients.consumer.CommitFailedException: Offset commit cannot be completed since the consumer is not part of an active group for auto partition assignment; it is likely that the consumer was kicked out of the group.
onPartitionsLost [t-0]  ->  onPartitionsAssigned [t-0]   (during the next poll)
poll2 returned [m0@0]  (uncommitted record redelivered), then m1, m2
```
Committed offset in the group stayed 0/none until the later successful commit.

## 2. commitAsync and auto-commit VERIFIED
- commitAsync: callback ran on the next poll with the same `CommitFailedException` message (offsets {t-0=1}); LOST then ASSIGNED; m0 redelivered.
- auto-commit (1 s interval): log `ERROR ... Asynchronous auto-commit of offsets failed: Offset commit cannot be completed since the consumer is not part of an active group ...`; no exception reaches application code; LOST then ASSIGNED; m0 redelivered.

## 3. Session timeout vs poll interval VERIFIED
Heartbeat thread log (three runs, ~5.1 s after the last poll, session timeout 10 s not yet reached):
```
[kafka-coordinator-heartbeat-thread | g-sync] WARN ... consumer poll timeout has expired. This means the time between subsequent calls to poll() was longer than the configured max.poll.interval.ms ...
[kafka-coordinator-heartbeat-thread | g-sync] INFO ... Member ... sending LeaveGroup request to coordinator ... due to consumer poll timeout has expired.
```
So the heartbeat thread keeps the member alive during a slow poll loop only until max.poll.interval.ms, then leaves the group itself.

## 4. auto.offset.reset=none VERIFIED
Topic `retention.ms=5000, segment.ms=1000`; committed offset 3; after retention: log start 7, end 12.
```
threw org.apache.kafka.clients.consumer.OffsetOutOfRangeException: Fetch position FetchPosition{offset=3, offsetEpoch=Optional[0], currentLeader=...} is out of range for partition oor-5041-0
fresh group (no committed offset) threw org.apache.kafka.clients.consumer.NoOffsetForPartitionException: Undefined offset with no reset policy for partitions: [oor-5041-0]
```

Lesson edits: queues-streams.mdx lines ~1069-1070 now name the exceptions and the client/version.
Not tested: classic vs KIP-848 (`group.protocol=consumer`) behaviour; other client versions; the 300,000 ms default (documented Java default, not measured).
