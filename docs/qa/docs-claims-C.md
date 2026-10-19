# docs-claims-C evidence (retrieved 2026-10-19)

Format: claim | where | source | verdict

## Lessons
- Stripe keeps idempotency keys at least 24 h (API v1; can be pruned after) | delivery-framework, pattern-contention | https://docs.stripe.com/api/idempotent_requests | VERIFIED; hedge removed, wording now "API v1 docs say keys can be removed once at least 24 hours old"
- Stripe errors on reused key with different params | pattern-contention | same page | VERIFIED
- IETF Idempotency-Key draft: 400 missing key, 422 different payload, 409 in flight | pattern-contention | https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt ; datatracker says draft expired | VERIFIED; text now lists codes and says draft expired
- Knight Capital 2012: 7 of 8 servers updated, old Power Peg code woken by reused flag, ~45 min, loss | feature-flags | SEC order 34-70694 https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf | CORRECTED "over $400 million" -> "more than $460 million" (order: "more than $460 million", 4M executions, 397M shares)
- SQS max visibility timeout 12 h from first receive, not reset by extending | pattern-async-jobs | AWS SQS developer guide, visibility timeout page | VERIFIED; hedge removed
- Gorilla: 1.37 bytes/point, 12x, 96% timestamps 1 bit, 26 h in memory | pattern-timeseries, estimation | https://www.vldb.org/pvldb/vol8/p1816-teller.pdf (read via pdftotext) | VERIFIED (1.37 B, 12x reduction, "about 96% of all time stamps can be compressed to a single bit")
- Prometheus two-hour blocks, head in memory + WAL, later compaction | pattern-timeseries | https://prometheus.io/docs/prometheus/latest/storage/ | VERIFIED; hedge removed
- Redis GEOSEARCH since 6.2.0; GEORADIUS deprecated; 52-bit geohash score; sorted set | pattern-geospatial | https://redis.io/docs/latest/commands/geosearch/ | VERIFIED; hedge replaced
- Redis HLL: up to 12 KB, 0.81% standard error | pattern-timeseries | https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/ | VERIFIED (16,384 registers / 1.04/sqrt(m)=0.81% is arithmetic, consistent)
- H3: 16 resolutions (0-15), exactly 12 pentagons per resolution, ~7x cells per step | pattern-geospatial | https://h3geo.org/docs/core-library/restable/ | VERIFIED
- S2: levels 0-30, 64-bit cell ids, Hilbert curve, six cube faces | pattern-geospatial | http://s2geometry.io/devguide/s2cell_hierarchy | VERIFIED
- Geohash cell sizes: precision 6 ~1.2 x 0.6 km, precision 7 ~150 m, precision 5 ~4.9 km | pattern-geospatial | https://en.wikipedia.org/wiki/Geohash (error table: 6 = +-0.61 km lat, 7 = +-76 m, 5 = +-2.4 km) and 5-bit/char arithmetic | VERIFIED
- Count-Min: w=ceil(e/eps), d=ceil(ln(1/delta)), overcount <= eps*N w.p. 1-delta, never undercounts | pattern-timeseries | https://en.wikipedia.org/wiki/Count%E2%80%93min_sketch | VERIFIED
- Lehr's rule n = 16 s^2/d^2 per arm (alpha 0.05 two-sided, 80% power); worked example 57,600 | feature-flags | Lehr 1992 via https://jhanley.biostat.mcgill.ca/c607/ch07/16_s_sq_over_d_sq.pdf (search result summary); arithmetic 16*0.09/0.000025 = 57,600 | VERIFIED
- Google Docs/Sheets/Slides: 100 people at once; beyond that only owner and some editors can edit | pattern-sync-collab | Google Workspace help pages (https://support.google.com/a/users/answer/9305685) via web search summary | VERIFIED (secondary read); hedge replaced with the figure
- Push payload ~4 KB | pattern-realtime | Apple remote notification docs (4096 B, VoIP 5120 B) and Firebase FCM overview (4096 B) via web search summaries | VERIFIED (secondary read); hedge replaced
- Stripe rate limiters blog: request-rate limiter (token bucket, Redis), concurrent-requests limiter, load shedders | rate-limiter | https://stripe.com/blog/rate-limiters | VERIFIED
- Cloudflare counting blog: sliding-window counter, 0.003% wrongly allowed/limited over 400M requests | rate-limiter | https://blog.cloudflare.com/counting-things-a-lot-of-different-things/ | VERIFIED (lesson says "measured error", no figure to correct)
- Discord blog: partition by (channel_id, time bucket), Cassandra | pattern-realtime | https://discord.com/blog/how-discord-stores-billions-of-messages | VERIFIED
- Slack/Discord/WhatsApp architecture attributions | pattern-realtime, pattern-fanout | n/a | SOFTENED: Slack paragraph now says it is a design sketch, not either company's internals; "Slack-style" changed to "as team-chat apps do". Fanout/WhatsApp walkthroughs are labelled design exercises with no internals claimed.
- Twitter push/hybrid timeline, Krikorian QCon 2013 | pattern-fanout reading list | https://www.infoq.com/presentations/Twitter-Timeline-Scalability/ (not re-fetched) | COULD NOT VERIFY in this pass (link and description only; not a fact claim in prose)
- Dynamo-style stores default to LWW; Cassandra/DynamoDB | pattern-sync-collab | not fetched | COULD NOT VERIFY (prose says "several", already generic)
- "Single Redis node ~100K ops/s", "~50,000 script calls/s", "100K idle connections per server", "4 core-minutes per video-minute", "sorted set ~4x bytes" | rate-limiter, estimation, pattern-sync-collab, pattern-async-jobs, pattern-fanout | n/a | left as labelled assumptions with "benchmark it" (runtime behaviour, other agents)
- OpenTelemetry semantic-convention link, Instagram/Twitter scale numbers | none found in these lessons (OpenTelemetry only mentioned as push exporters) | n/a | N/A
- Elasticsearch suggester links (typeahead), FCM/APNs reading-list "check current docs for limits" | typeahead, pattern-fanout | leave | COULD NOT VERIFY (version-dependent; hedge kept)
- Prometheus/Cassandra "check current docs for compaction options" (CQL comment) | pattern-timeseries:276 | needs live server | left

## lld-lessons / mastery
- JLS 17.7 non-volatile long/double may be torn, volatile atomic | concurrency-for-lld | https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html | VERIFIED
- JLS 17.5 final-field guarantee even through data race | concurrency-for-lld | same | VERIFIED
- Virtual threads final in Java 21 (JEP 444) | concurrency-for-lld | https://openjdk.org/jeps/444 | VERIFIED
- pgvector HNSW defaults m=16, ef_construction=64, ef_search=40; iterative scan since 0.8.0 | rag-layer... | https://github.com/pgvector/pgvector | VERIFIED
- MedCPT: 768-d, 512 max_length, 255M query-article pairs from PubMed search logs | rag-layer... | https://huggingface.co/ncbi/MedCPT-Article-Encoder | CORRECTED "255 million PubMed user click logs" -> "255 million query-article pairs from PubMed search logs"
- whisper large-v3-turbo: 809M params, decoder 32 -> 4 layers, fine-tuned, not distilled | transcription-alignment..., telemedicine-poc-interview-mastery | https://huggingface.co/openai/whisper-large-v3-turbo and https://github.com/openai/whisper/discussions/2363 | CORRECTED "distilled / distil" -> "decoder cut to 4 layers and fine-tuned (not distilled)"
- GLiNER default max_len 384 | the-three-stage-ner-pipeline, cheat sheet | https://raw.githubusercontent.com/urchade/GLiNER/main/gliner/config.py ("max_len: int = 384") | VERIFIED for the default; "truncates silently" COULD NOT VERIFY (not in docs read)
- i2b2 2010 assertion labels (present, absent, possible, conditional, hypothetical, associated with someone else) | negation-status... | secondary sources via web search (PubMed page blocked by cookie wall) | VERIFIED (secondary)
- HIPAA 18 identifiers, Safe Harbor / Expert Determination | ai-pipeline-fundamentals | HHS page returned 403 | COULD NOT VERIFY this pass (well-known; HHS link retained in text)
- DPDP Act, WebRTC DTLS-SRTP, LiveKit port defaults, Gemini model naming | mastery | no DPDP mention found; others not fetched | COULD NOT VERIFY / not present
