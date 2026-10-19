# Verification sd2 (caching, queues-streams, load-balancing, blob-cdn, search)

Date 2026-10-19. Scope: the claims still listed as unverified in docs/PENDING.md for these five lessons, plus every real-product behaviour used in the new quiz distractors (see quiz-balance-sd2.md). Earlier evidence (quiz-review-sd2.md, mq-search-services.md, docs-claims-*.md) is not repeated.

| claim | where | method | result |
|---|---|---|---|
| Kafka `max.poll.interval.ms` default is 300,000 ms; a consumer that does not poll in time is considered failed and the group rebalances | queues-streams.mdx:1070 | Read `ConsumerConfig.java` (default `300000`) and `CommonClientConfigs.MAX_POLL_INTERVAL_MS_DOC` on apache/kafka trunk, fetched 2026-10-19 (raw.githubusercontent.com/apache/kafka/trunk/clients/...) | VERIFIED from source and its docstring. Runtime behaviour was not run (no Kafka client test). |
| Kafka `auto.offset.reset` default is `latest`; applies when the committed offset no longer exists on the server | queues-streams qs-lag #1 | Same file: default `AutoOffsetResetStrategy.LATEST`; doc text "if the current offset does not exist any more on the server (e.g. because that data has been deleted)" | VERIFIED |
| SQS visibility timeout: 30 s default, up to 12 hours | queues-streams.mdx:206 | docs.aws.amazon.com SQS Developer Guide, sqs-visibility-timeout.html, fetched 2026-10-19: "default visibility timeout for a queue is 30 seconds"; "12 hours from when the message is first received" | VERIFIED (docs only; no SQS to test) |
| S3 charges 128 KB for objects smaller than 128 KB in Standard-IA | blob-cdn blob-ch8 #0 | docs.aws.amazon.com S3 User Guide, storage-class-intro.html, fetched 2026-10-19: "If an object is less than 128 KB, Amazon S3 charges you for 128 KB." | VERIFIED. The "about half the Standard price" ratio is a list-price figure and was not re-checked. |
| S3 returns 503 Slow Down while scaling to a higher request rate | blob-cdn blob-ch13 #0 | docs.aws.amazon.com S3 User Guide, optimizing-performance.html, fetched 2026-10-19 | VERIFIED |
| A query that does not select a large out-of-line (TOAST) column does not read its bytes | blob-cdn blob-ch1 #1 | postgres:16 container (removed): 200 rows, 100 KB incompressible bytea, 21 MB total, heap 16 kB. After `pg_stat_reset()`: `select id, owner_id, created_at ...` gave heap_blks 2, toast_blks 0; then `select * ...` gave toast_blks 26. | VERIFIED |
| Arithmetic in new options (see quiz-balance-sd2.md) | all five | Python recomputation | VERIFIED |

## COULD NOT VERIFY (hedges kept)

- Kafka partition ceiling per broker/cluster (queues-streams.mdx:1175, card at 1230): the lesson already attributes "about 4,000 per broker and 200,000 per cluster" to older guidance; no current official figure fetched.
- ALB pre-warming, CloudFront and Fastly invalidation details, DNS TTL behaviour of resolvers and clients, JVM DNS cache default: no way to test from here; the JVM default was not used in any of these five lessons, so nothing changed.
- Glacier price ratios (blob-cdn.mdx:952-971): list prices change and were not re-fetched; the lesson already dates the Deep Archive figure.
- Standard-IA "about half the Standard price": not re-checked.

No lesson text was corrected in this pass other than the quiz options and explains.
