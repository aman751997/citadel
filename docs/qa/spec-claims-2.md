# spec-claims-2: infra claims checked against official sources (2026-10-19)

Format: claim | where | source | result. Quotes are exact from the fetched page.

## 1. Kafka partition counts
- "ceiling varies by version and hardware" | queues-streams.mdx ~1175, card ~1230 | Confluent blog "How to choose the number of topics/partitions" (2015): "limit the number of partitions per broker to two to four thousand", "total number of partitions in the cluster to low tens of thousand"; Confluent blog "Apache Kafka Supports 200K Partitions Per Cluster": "each broker to have up to 4,000 partitions", "each cluster to have up to 200,000 partitions", reason "to accommodate for the rare event of a hard failure of the controller"; docs.confluent.io KRaft overview: lab ran "2 million partitions, which is 10 times the maximum number of partitions for a cluster running ZooKeeper"; "the per-node partition count limit and cluster-wide partition limit"; "KRaft mode is designed to handle a large number of partitions per cluster". | CORRECTED (hedge replaced): now says older ZooKeeper-era guidance 4,000/broker and 200,000/cluster, KRaft designed for many more (2 million in a Confluent lab), still per-node and cluster-wide limits, guidance not fixed rules. No lesson stated a hard ceiling number before (grep for partitions ceilings found none). The Confluent KRaft page did not state "200,000" itself; the figure is from the 200K blog. Apache kafka.apache.org/documentation gave only a redirect page, so no Apache-doc quote.
- max.poll.interval.ms default 5 min | queues-streams.mdx ~1070 | apache/kafka trunk ConsumerConfig.java: `MAX_POLL_INTERVAL_MS_CONFIG ... 300000` | VERIFIED; hedge "check your version" removed.

## 2. AWS ALB (docs.aws.amazon.com/elasticloadbalancing/latest/application)
- idle timeout default 60 s | load balancer attributes page: "`idle_timeout.timeout_seconds` The idle timeout value, in seconds. The default is 60 seconds." | VERIFIED; added to networking.mdx ~444.
- deregistration delay 300 s | edit-target-group-attributes: "By default, Elastic Load Balancing waits 300 seconds before completing the deregistration process" | VERIFIED; added to load-balancing.mdx ~976.
- cross-zone | "With Application Load Balancers, cross-zone load balancing is on by default and cannot be changed at the load balancer level"; target group can turn it off. | VERIFIED. Lesson makes no contrary claim; no change. (NLB default is off; not stated in lessons, not checked.)
- slow start | "You can't enable slow start mode when using the least outstanding requests or weighted random routing algorithms." Round robin is the default algorithm. | VERIFIED (lesson says round robin only; consistent).
- least outstanding requests | "routes requests to the targets with the lowest number of in progress requests" | VERIFIED.
- pre-warming | capacity-unit-reservation page: "Application Load Balancers automatically scale to support detected workloads"; LCU reservation "reserve a static minimum capacity", for "an upcoming event that will have a sudden, unusual high traffic"; "at least 100 LCU" | CORRECTED: hedge "check current docs and ask about pre-warming" replaced by automatic scaling plus LCU reservation for known spikes (load-balancing.mdx ~1098). No "pre-warm"/LCU anywhere else in src (grep).

## 3. DNS TTL 0 and JVM cache
- JVM networkaddress.cache.ttl | docs.oracle.com java-networking (JDK 21): "The default value is -1 (forever) if a security manager is installed", "implementation-specific if no security manager is installed"; "0 (zero) means no caching"; set in java.security. OpenJDK sun/net/InetAddressCachePolicy.java: `DEFAULT_POSITIVE = 30`. | VERIFIED and ADDED to networking.mdx ~218 (lesson only named the setting before).
- "TTL 0 is often treated as use a default by resolvers" | networking.mdx quiz explain ~253 | RFC 1035 s3.2.1: "Zero values are interpreted to mean that the RR can only be used for the transaction in progress, and should not be cached." Unbound docs: `cache-min-ttl` default 0 (disabled), BIND has `min-cache-ttl`. | CORRECTED: "often treated as use a default" was unsupported. Now: TTL 0 means do not cache (RFC 1035), but some resolvers can be configured to raise low TTLs to a minimum. No other place states it.

## 4. CloudFront
- 1,000 free invalidation paths/month, wildcard counts as one path | PayingForInvalidation.html: "The first 1,000 invalidation paths that you submit per month are free"; "A path that includes the * wildcard counts as one path even if it causes CloudFront to invalidate thousands of files." Allowance is per account across distributions. | VERIFIED; added to blob-cdn.mdx ~1356.
- Cache tag invalidation (new) | invalidation-by-tags.html: needs `CacheTagConfig`, tags in an origin header, `#tag` in the paths; "Tag invalidation paths count toward the same 1,000 free" | VERIFIED; blob-cdn.mdx ~1355 now says Cloudflare and CloudFront have cache tags too.
- invalidation does not reach browser caches; versioned names cheaper | Invalidation.html: "If you invalidate the file, the user might continue to see the old version until it expires from those caches." "Versioning is less expensive." | VERIFIED.
- signed URLs vs cookies | private-content-choosing-signed-urls-cookies: cookies for "multiple restricted files, for example, all of the files for a video in HLS format"; URLs for "individual files" and clients without cookies | VERIFIED.
- origin access control | private-content-restricting-access-to-s3: OAC recommended over OAI (SSE-KMS, all regions, PUT/DELETE) | VERIFIED.
- stale-while-revalidate / stale-if-error | already VERIFIED in docs-claims-B (Expiration.html).
- Cache key / "many CDNs skip caching when cookies present" | blob-cdn.mdx ~1171 | generic, vendor-dependent | COULD NOT VERIFY across CDNs; left hedged "check yours".

## 5. Fastly, Cloudflare
- Fastly surrogate keys | fastly.com docs "Working with surrogate keys": "Surrogate keys are unique identifiers that you assign to groups of content for processing"; purge by key purges all objects with that key. | VERIFIED.
- Fastly soft purge | "mark content as outdated (stale)"; stale content "remain[s] available to use in some circumstances while Fastly fetches a new version" | VERIFIED (not stated in lessons).
- Fastly "instant purge"/speed figure | no speed number on the fetched docs | not claimed in lessons; lesson already says latency varies by CDN. Nothing to fix.
- Cloudflare purge by tag/prefix by plan | developers.cloudflare.com/cache/how-to/purge-cache: "URL, Hostname, Tag, Prefix, and Purge Everything" marked available for Free, Pro, Business and Enterprise; "Cloudflare's Instant Purge ensures that updates ... are reflected immediately." | VERIFIED as of 2026-10-19; lessons make no plan claim.

## 6. S3 classes and prices
- Minimum durations | docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro comparison table: Standard-IA 30 d, Glacier IR 90 d, Flexible 90 d, Deep Archive 180 d; IA 128 KB min billable | VERIFIED. Retrieval: Deep Archive "retrieval times of hours" (aws.amazon.com/s3/storage-classes: "within 12 hours"), Flexible "minutes to hours", IR milliseconds | VERIFIED.
- Durability/availability | same table: Standard 99.999999999% / 99.99%; IA 99.9%; One Zone-IA 99.5% | VERIFIED. Replaced four "check current docs / provider-dependent" hedges in blob-cdn.mdx (card ~459, quiz why ~1900, table ~2024; line ~359 left as a general caution) with "S3 Standard design figure, others differ".
- Price ratios | AWS price list JSON (pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/index.json, publicationDate 2026-10-15), US East (N. Virginia), $/GB-month: Standard 0.023 (first 50 TB), Standard-IA 0.0125 (0.54x), Glacier Instant Retrieval 0.004 (0.17x), Glacier Flexible 0.0036 (0.16x), Intelligent-Tiering Deep Archive Access tier 0.00099 (0.043x, about 1/23). The standalone Deep Archive storage line was not in the parsed JSON; $0.00099 for Deep Archive is from third-party guides and the INT Deep Archive Access tier (same archive tier). | VERIFIED for ratios 1/2 and 1/6; Deep Archive "about 1/20 or less" is consistent (about 1/23). Table cell now says "(about 1/23 in us-east-1 list prices, October 2026)". Treat the Deep Archive figure as approximate.

## 7. SQS (docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide)
- visibility timeout | quotas-messages: "The default visibility timeout for a message is 30 seconds. The minimum is 0 seconds. The maximum is 12 hours." sqs-visibility-timeout: "the visibility timeout has a maximum limit of 12 hours from when the message is first received. Extending the timeout doesn't reset this 12-hour limit." | VERIFIED (lesson text correct). Fixed data/sd/pattern-async-jobs.ts:65 "SQS allows hours - check current docs" to "SQS allows up to 12 hours".
- retention | "By default, a message is retained for 4 days. The minimum is 60 seconds (1 minute). The maximum is 1,209,600 seconds (14 days)." | VERIFIED.
- delay | "The default (minimum) delay for a queue is 0 seconds. The maximum is 15 minutes." Per-message timer max 15 min (quotas "Message timer"). | VERIFIED.
- FIFO dedup | "within the 5-minute deduplication interval" | VERIFIED.
- message size | "The maximum is 1,048,576 bytes (1 MiB)" | VERIFIED. pattern-async-jobs.ts:156 hedge "check current limits" now cites SQS 1 MiB.

## 8. Browsers about 6 connections per host (HTTP/1.1)
- Chromium net/socket/client_socket_pool_manager.cc (main): `g_max_sockets_per_group` ... `6, // kNormal`, comment cites crbug.com/12066 (routers blocking connections); WebSocket pool 255. | VERIFIED.
- Firefox gecko-dev modules/libpref/init/all.js: `pref("network.http.max-persistent-connections-per-server", 6);` | VERIFIED. Lesson "about 6 per host" is correct; no change.

## 9. Remaining hedges in the eight lessons
- Resolved: Kafka partitions, max.poll.interval.ms, ALB pre-warming, SQS 12 h and message size, S3 durability/availability, Deep Archive ratio, ALB idle timeout.
- Left (generic, vendor/version dependent, no single official source): queues-streams.mdx ~40 and ~248 and ~1613 ("check current docs"), blob-cdn.mdx ~140 (block vs object storage price, "check your provider"), ~359 and ~940 (provider-dependent figures), ~1171 (CDN cookie behaviour), ~1596 (CDN range caching), core-concepts.mdx ~875 (vendor consistency labels), delivery-framework (no real hedge), caching/pattern-realtime (no hedge found).

## Could not verify
- Apache Kafka documentation page for partition limits (redirect-only page); relied on Confluent.
- Standalone S3 Glacier Deep Archive $/GB line in the AWS price list (only the Intelligent-Tiering Deep Archive Access tier at $0.00099 found); aws.amazon.com/s3/pricing is JS-rendered.
- Fastly "instant purge" speed number; not claimed in the lessons.
- Default cache key behaviour across "most CDNs"; vendor-specific.

## Files edited
src/lessons/queues-streams.mdx, src/lessons/load-balancing.mdx, src/lessons/networking.mdx, src/lessons/blob-cdn.mdx, src/data/sd/pattern-async-jobs.ts. No quiz answer indices or tests touched.
