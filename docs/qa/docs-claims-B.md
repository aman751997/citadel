# docs-claims-B: documentation claims (retrieved 2026-10-19)

Lessons: queues-streams, load-balancing, caching, blob-cdn, pattern-partitioning, networking, core-concepts. Method: fetched the official page, compared the text. Verdicts: VERIFIED, CORRECTED (before to after), COULD NOT VERIFY.

## blob-cdn (S3 and CDN)

| Claim | Where | Source | Verdict |
|---|---|---|---|
| 3,500 writes / 5,500 reads per second per partitioned prefix; 503 Slow Down while scaling | blob-cdn.mdx ~282, ~1434, data/sd/blob-cdn.ts | docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html | VERIFIED. Dropped the "check current docs" hedge, added the gradual-scaling and 503 detail |
| Multipart: parts 5 MiB to 5 GiB, max 10,000 parts, last part may be smaller | blob-cdn.mdx ~725 | .../userguide/qfacts.html | VERIFIED |
| Max object size "5 TB" | blob-cdn.mdx ~726 | same page: 48.8 TiB | CORRECTED: "objects up to 5 TB (check current docs)" to "objects up to 48.8 TiB" |
| Standard-IA: 30-day minimum, 128 KB billed minimum; Glacier IR 90 d; Glacier Flexible 90 d; Deep Archive 180 d | blob-cdn.mdx ~945-976 | .../userguide/storage-class-intro.html (comparison table) | VERIFIED |
| Lifecycle small objects | blob-cdn.mdx ~975 | .../lifecycle-transition-general-considerations.html: since Sept 2024 objects under 128 KB are not transitioned by default | CORRECTED (added a sentence; the quiz about 20 KB thumbnails still holds as written because it says someone forced the transition) |
| Checksums: SHA-256 and CRC32C supported, `x-amz-checksum-sha256`, legacy `Content-MD5` | blob-cdn.mdx ~555 | .../checking-object-integrity.html and API_PutObject.html | VERIFIED. Kept "check which algorithms your store supports" because the sentence is about stores in general |
| Presigned POST policy supports `content-length-range`; presigned PUT has no max-size condition | blob-cdn.mdx ~546 | AWS POST Policy page (sigv4-HTTPPOSTConstructPolicy.html) | VERIFIED, weakly: the page is script-rendered and my fetch did not return its body. Confirmed through the search snippet quoting the page ("minimum and maximum allowable size", example 1048576 to 10485760) |
| Conditional writes: `If-None-Match: *` added 2024, `If-Match` ETag | blob-cdn.mdx ~280 | .../conditional-writes.html; aws.amazon.com/about-aws/whats-new/2024/08/amazon-s3-conditional-writes/ (Aug 20, 2024) | CORRECTED: now says August 2024 for If-None-Match, and If-Match "after that". Date of If-Match not found |
| S3 strong consistency Dec 2020 | blob-cdn.mdx ~345 | aws.amazon.com/about-aws/whats-new/2020/12/... (Dec 1, 2020) | VERIFIED |
| S3 Standard 11 nines durability, 99.99% availability (designed) | blob-cdn.mdx ~459, 1900, 2024 | .../userguide/DataDurability.html, storage-class-intro.html | VERIFIED. Left the "provider-dependent, check docs" note because other stores differ |
| Append not supported in object stores | data/sd/blob-cdn.ts:22 | .../directory-buckets-objects-append.html: S3 Express One Zone directory buckets support append, up to 10,000 appends | CORRECTED: named the exception |
| CloudFront honours s-maxage, stale-while-revalidate, stale-if-error (capped by max TTL) | blob-cdn.mdx ~1237-1244 | docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html | VERIFIED |
| max-age applies in browsers, s-maxage at the edge | blob-cdn.mdx ~1237 | same page, TTL table; RFC 9111 5.2.2.10 | VERIFIED |
| Shared cache must not reuse a response to an Authorization request unless public, s-maxage or must-revalidate | blob-cdn.mdx ~1171 | RFC 9111 section 3.5 | VERIFIED |
| Versioned file names preferred over invalidation; invalidation does not reach browser caches | blob-cdn.mdx ~1261-1357 | CloudFront Invalidation.html | VERIFIED |
| Cloudflare purge options (URL, hostname, tag, prefix, everything); no propagation figure published | blob-cdn.mdx ~1355-1357 | developers.cloudflare.com/cache/how-to/purge-cache/ | VERIFIED. The lesson already says latency varies and to check yours |
| Fastly "surrogate keys", CloudFront per-path charge beyond an allowance, signed cookies, origin access control | blob-cdn.mdx ~1355, 1501-1506 | not fetched | COULD NOT VERIFY (not checked, left as written; generic wording) |
| Glacier Deep Archive "about 1/20 or less" of Standard price | blob-cdn.mdx ~948 | prices change | COULD NOT VERIFY (lesson already says relative magnitudes, check price sheets) |

## queues-streams

| Claim | Where | Source | Verdict |
|---|---|---|---|
| SQS visibility timeout default 30 s, max 12 h | ~206 | docs.aws.amazon.com/AWSSimpleQueueService/.../sqs-visibility-timeout.html | CORRECTED: hedge removed, "up to 12 hours" added |
| SQS delay up to 15 min; FIFO does not support per-message timers | ~1242, data/sd/queues-streams.ts:182 | .../sqs-delay-queues.html, sqs-message-timers.html | CORRECTED: "per-queue or per-message delay of up to 15 minutes" to per-queue delay, per-message timer on standard queues only. Quiz explain now "caps delay at 15 minutes" |
| SQS FIFO dedup window 5 minutes | ~613 | .../FIFO-queues-exactly-once-processing.html | VERIFIED (hedge reworded) |
| SQS message size 1 MiB, retention default 4 d | ~1326 | .../quotas-messages.html | VERIFIED |
| Kafka log retention default 7 days (168 h) | ~225 | kafka.apache.org/43/configuration/broker-configs/ | VERIFIED |
| Kafka max record batch default about 1 MB (1048588) | ~1326 | same | VERIFIED |
| Idempotent producer default on in recent versions | ~455 | producer-configs (enable.idempotence true, acks all); KIP-679 (release 3.0) | CORRECTED: "(on by default since Kafka 3.0)" |
| Kafka share groups (KIP-932) status | ~262, ~1621 | kafka.apache.org/blog/2026/02/17/apache-kafka-4.2.0-release-announcement/ (production-ready in 4.2) | CORRECTED: "check status" to "production-ready in Kafka 4.2" in both places |
| RabbitMQ quorum queue delivery limit | ~948 | rabbitmq.com/docs/quorum-queues: default 20 since RabbitMQ 4.0 | CORRECTED: "can cap redeliveries (check current docs)" to "default 20 since RabbitMQ 4.0" |
| RabbitMQ delayed-message plugin | ~1242 | github.com/rabbitmq/rabbitmq-delayed-message-exchange README: no longer maintained, archived, native delay in quorum queues from 4.4 | CORRECTED: "(check status)" to plain statement |
| RabbitMQ auto-ack is fire-and-forget; prefetch caps unacked messages; DLX triggers (reject without requeue, TTL, length) | ~319, ~948, ~1062 | rabbitmq.com/docs/confirms, /docs/dlx | VERIFIED |
| Kafka partition-count ceiling "varies by version and hardware" | ~1175 | no authoritative figure | COULD NOT VERIFY (hedge kept on purpose) |
| Generic notes "defaults change between versions, check current docs" | ~40, ~248 | n/a | Kept (advice, not a claim) |

## caching

| Claim | Where | Source | Verdict |
|---|---|---|---|
| Redis default maxmemory-policy is noeviction; volatile-* policies behave like noeviction when no key has a TTL; noeviction errors on writes, reads still work | ~1358, ~1384, ~1391, ~1418 | redis.io/docs/latest/develop/reference/eviction/; redis/redis src/config.c line `createEnumConfig("maxmemory-policy", ... MAXMEMORY_NO_EVICTION` (unstable branch) | VERIFIED. Hedges removed (also from the quiz question) |
| `redis-cli --hotkeys` only works with an LFU policy | ~1055, ~1110 | redis.io/docs/latest/develop/tools/cli/ ("only works when maxmemory-policy is *lfu") | VERIFIED. Hedges removed |
| Redis Cluster: 16,384 slots, CRC16(key) mod 16384, async replication can lose writes | ~1435, ~1469 | redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/ | VERIFIED |
| cluster-require-full-coverage default yes | ~1456, ~1511 | redis.io/docs/latest/operate/oss_and_stack/management/scaling/; config.c default 1 | VERIFIED. Hedges replaced with "yes by default" |
| A simple-GET Redis node handles very roughly 100,000 ops/s, "benchmark it" | ~1342 | redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/ shows about 180,000 SET/s on its sample box | VERIFIED as order of magnitude. Kept "benchmark it" (honest advice) |
| `stale-while-revalidate=300` meaning | ~941 | RFC 5861 | VERIFIED |

## load-balancing

| Claim | Where | Source | Verdict |
|---|---|---|---|
| Envoy least-request samples 2 hosts by default | ~556 | envoyproxy.io/docs/.../load_balancers ("N random available hosts ... 2 by default"; equal-weights case) | VERIFIED. Hedge replaced with "(when weights are equal)" |
| Envoy panic threshold default 50% | ~878 | .../panic_threshold | VERIFIED |
| Envoy outlier max_ejection_percent default 10%; base ejection time 30 s, ejection time grows with repeat ejections | ~934-935 | .../api-v3/config/cluster/v3/outlier_detection.proto; .../outlier | VERIFIED |
| HAProxy `default-server check inter 5s fall 3 rise 5 slowstart 60s` valid options; defaults inter 2 s, fall 3, rise 2 | ~859-865 | docs.haproxy.org/3.2/configuration.html | VERIFIED (sample uses non-default inter and rise; labelled illustrative) |
| HAProxy bounded-load consistent hashing (`hash-balance-factor`) | ~698 | same | VERIFIED |
| nginx: POST, LOCK, PATCH not retried on next server unless `non_idempotent` | ~1395 | nginx.org/en/docs/http/ngx_http_proxy_module.html (proxy_next_upstream) | CORRECTED: hedge replaced with the exact rule |
| nginx `random two least_conn`, `hash ... consistent` | ~556, ~688 | nginx.org/en/docs/http/ngx_http_upstream_module.html | VERIFIED |
| Slow start in Envoy, HAProxy, ALB | ~1019 | Envoy "Slow start mode" page; HAProxy `slowstart`; AWS ALB target group attributes (slow start works with round robin only, not least outstanding requests) | CORRECTED: removed hedge, added the ALB limitation |
| VRRP: advertisement default 1 s, master down = 3 x interval + skew | ~1090 | RFC 5798 | VERIFIED |
| Retry budget: per-request 3 attempts, per-client 10% retry ratio | ~1397, core-concepts ~1289 | sre.google/sre-book/handling-overload/ | VERIFIED |
| Linux ephemeral ports 32768-60999; TIME_WAIT 60 s | ~362 | kernel Documentation/networking/ip-sysctl.rst; include/net/tcp.h `TCP_TIMEWAIT_LEN (60*HZ)` | VERIFIED |
| ALB scales for surges, ask about pre-warming | ~1098 | no stable AWS figure found | COULD NOT VERIFY (hedge kept) |

## pattern-partitioning

| Claim | Where | Source | Verdict |
|---|---|---|---|
| Cassandra hint window 3 hours | ~1166, ~1233 | cassandra.apache.org/doc/latest/.../cass_yaml_file.html (`max_hint_window` 3h) | VERIFIED. Hedges replaced with the setting name |
| Cassandra phi_convict_threshold default 8 | ~1598, ~1661 | same page ("Default Value: 8") | VERIFIED. Hedges removed |
| Cassandra gc_grace_seconds 864000 (10 days) | ~1766 | cassandra.apache.org/doc/latest/.../ddl.html | VERIFIED. Hedge removed |
| Cassandra vnodes: 256 for years, newer default far fewer with a token allocator | ~369 | cass_yaml num_tokens default 16; architecture/dynamo.html (2.x random tokens 256, allocator added in 3.x) | CORRECTED: added "the current docs show 16", removed hedge |
| DynamoDB (service) uses a replication group per partition with Multi-Paxos | ~1056 | USENIX ATC 2022 DynamoDB paper (text: "The replication group uses Multi-Paxos") | VERIFIED |
| Redis Cluster 16,384 slots, hash tags | ~585 | cluster-spec | VERIFIED |

## core-concepts

| Claim | Where | Source | Verdict |
|---|---|---|---|
| Raft election timeout 150 to 300 ms | ~643 | raft.github.io/raft.pdf section 5.2 ("e.g., 150-300ms") | VERIFIED |
| Per-client retry budget about 10% | ~1289 | SRE book (above) | VERIFIED |
| UUIDv7 / RFC 9562 | ~1732 | rfc-editor.org/rfc/rfc9562 | VERIFIED |
| Nines table (8.8 h, 53 min, 5.3 min per year) | ~510-512 | arithmetic | VERIFIED |

## networking

| Claim | Where | Source | Verdict |
|---|---|---|---|
| TLS 1.3 0-RTT: no replay protection between connections; servers answer 425 Too Early | ~302 | RFC 8446 section 2.3 ("no guarantees of non-replay"), RFC 8470 | VERIFIED |
| Initial congestion window 10 segments (about 14 KB) | ~309 | RFC 6928 | VERIFIED |
| PUT and DELETE are idempotent with safe methods | ~1066 | RFC 9110 section 9.2.2 | VERIFIED |
| HTTP/3 uses QPACK instead of HPACK | ~448 | RFC 9114 | VERIFIED |
| 429 with Retry-After, 503 retry | ~1052 | RFC 6585, RFC 9110 | VERIFIED (standard text, not re-fetched) |
| 409 vs 422 | not present in these lessons | n/a | N/A |
| "Browsers open about 6 connections per host" | ~465, ~603 | browser behaviour, not in a spec | COULD NOT VERIFY (no authoritative document found) |
| DNS TTL 0 treated as "use default" by some resolvers; JVM networkaddress.cache.ttl | ~253, ~218 | not fetched | COULD NOT VERIFY |

## "Beyond this page" links (63 external URLs)

All 63 URLs fetched. 60 returned 200 with a title matching the description. Notes:
- The three DOI links (The Tail at Scale, Gilbert-Lynch, Abadi) returned 403/202 to curl (publisher bot walls). DOIs match the cited papers (10.1145/2408776.2408794, 10.1145/564585.564601, 10.1109/MC.2012.33); the IEEE one resolved to ieeexplore document 6127847.
- The KIP-98 link redirects to the same KIP-98 page (title matches). MDN Cache-Control redirects to /Reference/Headers/Cache-Control (works).
- Kafka docs link serves a "Documentation Redirect" page to the current version (works).
- The LinkedIn "The Log" link points to a web.archive.org copy; title matches.
- Netflix Open Connect redirects (200).
- RFC links redirect to rfc-editor.org/info/rfcNNNN; each title matches the label (5798 VRRPv3, 5861, 6455, 8216, 8246, 8446, 8470, 9000, 9110, 9111, 9114, 9213, 9562).
- Envoy links render "envoy 1.41.0-dev" docs under /latest/.
