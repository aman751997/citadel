# spec-claims-3 (checked 2026-10-19)

Result key: V verified, C corrected, CNV could not verify.

## 1. Paper venues (Crossref API, arXiv API, USENIX pages; DBLP was rate-limited)
- Splitwise: "Splitwise: Efficient Generative LLM Inference Using Phase Splitting", Patel, Choukse, Zhang, Shah, Goiri, Maleki, Bianchini; Crossref container "2024 ACM/IEEE 51st Annual International Symposium on Computer Architecture (ISCA)", June 2024. V (ISCA 2024 = 51st edition). A later IEEE Micro version (July 2025, adds Fonseca) also exists. Lesson says "Patel et al., ISCA 2024": V, no change.
- Chen et al.: arXiv 2302.01318, "Accelerating Large Language Model Decoding with Speculative Sampling", Chen, Borgeaud, Irving, Lespiau, Sifre, Jumper, 2 Feb 2023. arXiv shows no journal reference or venue comment. V authors and title; no conference venue is listed on arXiv (not proof of absence). Lesson cites "Chen et al., 2023, DeepMind", no venue: no change. DeepMind affiliation not on the abstract page (taken from spec-claims-1).
- DistServe: arXiv 2401.09670 comment "OSDI 2024"; USENIX OSDI '24 technical sessions list it (Zhong first author). V.
- Sarathi-Serve: "Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve", Agrawal et al.; listed in OSDI '24 technical sessions. V. C: the further-reading bullet (llm-inference.mdx ~1842) said both papers had "goodput as the objective". Sarathi-Serve's abstract speaks of throughput-latency tradeoff and serving capacity under tail-latency constraints; goodput is DistServe's term. Reworded and added "OSDI 2024".
- Orca: usenix.org/conference/osdi22/presentation/yu: "Orca: A Distributed Serving System for Transformer-Based Generative Models", Yu, Jeong, Kim, Kim, Chun, OSDI '22. V.
- Earlybird: Crossref "Earlybird: Real-Time Search at Twitter", Busch, Gade, Larson, Lok, Luckenbill, Lin, 2012 IEEE 28th ICDE, pp. 1360-1369. V.
- Koren/Bell/Volinsky: "Matrix Factorization Techniques for Recommender Systems", Computer 42(8), Aug 2009, 30-37. V.
- Linden/Smith/York: "Amazon.com recommendations: item-to-item collaborative filtering", IEEE Internet Computing 7(1), Jan 2003, 76-80. V.
- PagedAttention: Kwon et al., SOSP 2023 (Crossref: 29th SOSP, Oct 2023, pp. 611-626; arXiv comment "SOSP 2023"). V.
- Gorilla: Pelkonen et al., PVLDB 8(12), Aug 2015, 1816-1827. V.
- Dynamo: DeCandia et al., SOSP 2007 (21st SOSP, pp. 205-220). V.
- Raft ATC 2014: the lessons cite only raft.github.io (core-concepts.mdx ~1742) and no venue/year, so nothing to check. "150 to 300 ms" election timeout is the paper's suggestion (known); not re-fetched.
- Tail at Scale: Dean and Barroso, CACM 56(2), Feb 2013, 74-80. V.
- Brewer, "CAP twelve years later: How the 'rules' have changed", Computer 45(2), Feb 2012, 23-29 (lesson links the InfoQ copy, no venue stated). V.
- Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story", Computer 45(2), Feb 2012, 37-42. V.
- Cormack, Clarke, Buettcher, SIGIR 2009 (32nd), pp. 758-759. V.

## 2. Kafka partition guidance (src/lessons/queues-streams.mdx ~1175)
- kafka.apache.org/43/operations/basic-kafka-operations/: no per-broker or per-cluster limit. Only "We assume the number of partitions will not ever be above 100,000" and that is about folder-name length (topic names max 249 chars), not a limit, so it is NOT cited.
- kafka.apache.org/43/operations/hardware-and-os/: "Each partition requires minimum 2 map areas, as long as it hosts a single log segment."; "creating 50000 partitions on a broker will result allocation of 100000 map areas"; vm.max_map_count "somewhere around 65535"; "We recommend at least 100000 allowed file descriptors for the broker processes as a starting point."
- C: added the Apache wording; the 4,000/200,000 figures now attributed to "older Confluent guidance"; Confluent kept as secondary. KRaft docs page has no partition-limit statement (web search).

## 3. S3 prices (AWS Price List, us-east-1, USD per GB-month)
- AmazonS3 offer publicationDate 2026-10-15: Standard first 50 TB 0.023; Standard-IA 0.0125; Glacier IR 0.004.
- AmazonS3GlacierDeepArchive offer (separate file, publicationDate 2026-09-11): TimedStorage-GDA-ByteHrs, Glacier Deep Archive, 0.00099 "per GB-Month for storage used in Glacier Deep Archive in US East (N. Virginia)". (The $0.021 "GDA-Staging" row in the S3 offer is staging, not storage.)
- Ratios: 0.00099/0.023 = 0.0430 = about 1/23.2 -> "about 1/20 or less" holds. Standard-IA 0.0125/0.023 = 0.543 (54%), "about half" holds, but the 20 KB example: 6.4 x 0.543 = 3.47x. C: blob-cdn.mdx table row now gives the dollar figures and 1/23 with the price-list date; the "Minimum size" bullet says roughly 3.2x to 3.5x. The quiz (stem premise "about half", answer 3.2x) was left as is, its premise is stated.

## 4. LiveKit egress and Redis
- github.com/livekit/egress README (main): config has `redis: address: must be the same redis address used by your livekit server`; troubleshooting: "Your livekit server cannot connect to an egress instance through redis. Make sure they are both able to reach the same redis db." V: egress requires Redis shared with the server. The chapters' statements (Redis coordinates server and egress; "egress needs shared Redis") V.
- C: design-decisions-war-stories... line 26 said "LiveKit routing depends on low-latency Redis keepalives" (not in the README). Reworded to cite the README and mark the latency story as the PoC's own diagnosis.

## 5. OpenSearch HNSW defaults
- opensearch-project/documentation-website main, _mappings/supported-field-types/knn-methods-engines.md: Lucene HNSW `ef_construction` 100, `m` 16; Faiss HNSW `ef_search` 100, `ef_construction` 100 (256 for binary indexes), `m` 16; "An index created in OpenSearch version 2.11 or earlier will still use the previous ef_construction value (512)." C: search.mdx ~1377 now states these.

## 6. CDN default cache keys (checked 2026-10-19)
- CloudFront (docs.aws.amazon.com .../understanding-the-cache-key.html): "By default, the cache key for a CloudFront distribution includes" the distribution domain name and the URL path (OPTIONS method included for OPTIONS requests). Query strings, headers, cookies not included until a cache policy adds them.
- Cloudflare (developers.cloudflare.com/cache/how-to/cache-keys/): default includes full URL (scheme, host, URI with query string), the Origin header, method-override headers (x-http-method-override etc.) and some forwarding headers (x-forwarded-host, x-host, etc.). Cookies not listed.
- Fastly (fastly.com/documentation/reference/vcl/subroutines/hash/ and .../manipulating-the-cache-key/): "By default we include req.url and req.http.host in the hash"; method ignored; TLS vs plain ignored; Vary adds a secondary key. Cookies only if you build them into the key.
- C: blob-cdn.mdx ~1165 said "most CDNs key on scheme, host, path and the full query string"; wrong for CloudFront (no query string by default). Rewritten per vendor, vendor named each time. ~1176 "Many CDNs skip caching when cookies are present" was unsupported; now says cookies are not in the default key for the three, and caching of responses that set cookies is vendor-specific (not verified per vendor).

## 7. Fastly purge latency
- fastly.com docs purging index page: no timing. fastly.com/products/web-and-mobile-performance/caching-and-purging: "150 ms instant purge" (marketing, no measurement footnote; other Fastly pages reportedly say a mean under 150 ms with a date, not fetched). C: blob-cdn.mdx purge bullet now cites it as a marketing figure, not a guarantee. The "latency varies widely by CDN" wording stays.

## 8. innodb_flush_log_at_trx_commit (MySQL 8.0 manual, innodb-parameters.html)
Exact wording: "With a setting of 0, logs are written and flushed to disk once per second. Transactions for which logs have not been flushed can be lost in a crash. With a setting of 2, logs are written after each transaction commit and flushed to disk once per second. Transactions for which logs have not been flushed can be lost in a crash. For settings 0 and 2, once-per-second flushing is not 100% guaranteed ... up to one second of transactions can be lost in a crash." Also "InnoDB crash recovery works regardless of the innodb_flush_log_at_trx_commit setting. Transactions are either applied entirely or erased entirely." The manual does NOT distinguish mysqld crash from OS crash/power loss. C: databases.mdx ~899 now quotes it and labels "value 2 survives a mysqld-only crash" as the usual reading, not a manual statement; quiz explain no longer says "check the docs". CNV: a real power-loss test (not done).

## Files edited
src/lessons/queues-streams.mdx, blob-cdn.mdx, search.mdx, databases.mdx, llm-inference.mdx, src/mastery/telemedicine-poc/design-decisions-war-stories-q-and-a-and-further-reading.mdx. No quiz answers or tests touched.
