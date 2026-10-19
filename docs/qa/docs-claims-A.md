# docs-claims-A: documentation claims (search, databases, llm-inference, rag, recsys, llm-gateway)

Retrieved 2026-10-19. Method: official docs fetched (WebFetch/WebSearch), papers via arXiv/publisher PDFs, links via curl (status and page title). Runtime behaviour was not tested here.

## Verified, text tightened with a dated source

| Claim | Where | Source | Verdict |
|---|---|---|---|
| ES refreshes every 1 s on indices searched in the last 30 s | search.mdx (write path) | elastic.co/docs/manage-data/data-store/near-real-time-search | VERIFIED |
| `index.max_result_window` 10,000 | search.mdx (deep paging, flashcard) | elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results | VERIFIED |
| search_after + PIT preferred over scroll; PIT adds implicit tiebreaker | search.mdx | same page (`_shard_doc`; scroll kept for batch jobs) | VERIFIED, wording made exact |
| Shards 10 GB to 50 GB | search.mdx (sizing) | elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards | VERIFIED ("roughly" removed) |
| fuzziness AUTO: 0-2 exact, 3-5 one edit, >5 two | search.mdx | elastic.co/docs/reference/elasticsearch/rest-apis/common-options | VERIFIED; "1 to 2 characters" changed to "up to 2" |
| Fuzzy query transpositions default true | search.mdx | elastic.co ... query-dsl-fuzzy-query | VERIFIED |
| field_value_factor modifiers incl. log2p = log10(value+2); gauss decay default 0.5 | search.mdx | elastic.co ... function-score-query | VERIFIED |
| BM25 is default similarity (k1 1.2, b 0.75) | search.mdx | elastic.co/docs/reference/elasticsearch/index-settings/similarity | VERIFIED for Elasticsearch ("Lucene-based engines" narrowed to Elasticsearch, intro version not stated by docs) |
| Adaptive replica selection on by default | search.mdx | elastic.co ... search-shard-routing | VERIFIED |
| Completion suggester is held in memory | search.mdx | elastic.co ... search-suggesters | VERIFIED in memory; docs do not say "FST", so "FST" removed |
| translog.durability default `request` | search.mdx | elastic.co ... index-settings/translog | VERIFIED |
| RRF rank_constant default 60; k=60 in the original paper | search.mdx, rag.mdx | ES RRF page; Cormack et al. SIGIR 2009 PDF text ("k = 60 was fixed during a pilot investigation", "near-optimal") | VERIFIED |
| dense_vector with HNSW kNN | search.mdx | elastic.co ... dense-vector | VERIFIED (ES); OpenSearch k-NN not fetched, left as "check current docs" |
| MySQL TIMESTAMP ends 2038-01-19 03:14:07 UTC; DATETIME to 9999; session time zone conversion | databases.mdx | MySQL 8.0 manual, datetime | VERIFIED |
| InnoDB max index key 3072 B (16 KB page, DYNAMIC), 1536/768 for 8/4 KB, 767 B for REDUNDANT/COMPACT, 16 columns | databases.mdx | MySQL 8.0 manual, innodb-limits | VERIFIED |
| replica_parallel_workers default 0 before 8.0.27, 4 from 8.0.27 | databases.mdx | MySQL 8.0 manual, replication-options-replica | VERIFIED |
| Semi-sync: AFTER_SYNC default, ack = received and flushed to relay log (not applied), timeout reverts to async | databases.mdx | MySQL 8.0 manual, replication-semisync | VERIFIED |
| Group Replication multi-primary is optimistic; conflicting transactions fail certification | databases.mdx | MySQL 8.0 manual, group-replication-multi-primary-mode | VERIFIED (certification rules themselves not on that page) |
| Partitioning: max 8192 partitions; no foreign keys; every unique key includes partitioning columns | databases.mdx | MySQL 8.0 manual, partitioning-limitations (+ keys page) | VERIFIED |
| `UUID_TO_BIN(uuid, 1)` swaps time parts; MySQL 8.0 has no v7 generator | databases.mdx | MySQL 8.0 manual, miscellaneous-functions | VERIFIED for 8.0 |
| max_connections default 151; lock_wait_timeout default 31536000 | databases.mdx | MySQL 8.0 manual, server-system-variables | VERIFIED |
| CHECK enforced from 8.0.16; EXPLAIN ANALYZE 8.0.18; skip scan 8.0.13; functional indexes 8.0.13; multi-valued indexes 8.0.17 | databases.mdx (already stated plainly) | MySQL 8.0 manual pages | VERIFIED (no edit needed) |
| NOWAIT / SKIP LOCKED in 8.0 | databases.mdx | manual describes them but gives no intro version | text already says "8.0+", not changed |
| vLLM block size 16 | llm-inference.mdx | vLLM source docs (v0.22 `DEFAULT_BLOCK_SIZE = 16`); stable docs say platform-dependent | PARTLY: reworded to "16 in recent versions, other values on older versions or some hardware" |
| Prompt caching: min length, 5 min default lifetime, read price 0.1x or lower | llm-inference.mdx, llm-gateway.mdx | platform.claude.com prompt-caching; developers.openai.com prompt-caching | VERIFIED, concrete numbers added |
| vLLM prefix cache hashes block tokens plus parent hash | llm-inference.mdx | docs.vllm.ai design/prefix_caching | VERIFIED |
| PagedAttention paper: earlier systems used only 20.4% to 38.2% of KV memory for token data; 2-4x throughput | llm-inference.mdx | arXiv 2309.06180 PDF | VERIFIED ("most" replaced by the figures) |
| Sarathi-Serve is OSDI 2024; Orca OSDI 2022 | llm-inference.mdx | usenix.org presentation pages | VERIFIED |
| Batch discount 50% (Anthropic, OpenAI) | llm-gateway.mdx | platform.claude.com batch-processing; developers.openai.com batch | VERIFIED |
| Rate-limit header names | llm-gateway.mdx | Anthropic rate-limits page; OpenAI rate-limits page | VERIFIED, names added |
| 429 and 529 are real Anthropic status codes; token bucket algorithm | llm-gateway.mdx | platform.claude.com api/errors, rate-limits | VERIFIED |
| pgvector m=16, ef_construction=64, hnsw.ef_search=40, iterative scans from 0.8.0 | rag.mdx (M=16 used in examples) | github.com/pgvector/pgvector README | VERIFIED (no edit needed) |
| Paper citations: Lewis 2020, Malkov 2016, Liu 2023 (Lost in the Middle), Greshake 2023, Covington RecSys 2016, Yi RecSys 2019, Cheng (Wide & Deep, Google), Naumov (DLRM, Meta), Monolith (ByteDance), Russo (Thompson), Sculley NeurIPS 2015, Dean and Barroso CACM 2013 | rag, recsys, llm-gateway, llm-inference | publisher/arXiv pages (titles, authors, venues) | VERIFIED |

## CORRECTED

| Before | After | File |
|---|---|---|
| "vLLM documents both [preemption] modes" (swap and recompute) | Older vLLM had both; current vLLM (V1) defaults to recompute and the swap flag was removed (vLLM optimization docs) | llm-inference.mdx (prose and flashcard; Beyond-this-page link text) |
| "BM25 default similarity in Lucene-based engines" | Stated for Elasticsearch, with k1/b defaults | search.mdx |
| Completion suggester "with an in-memory FST" | "keeps its lookup structure in memory" (docs do not say FST) | search.mdx |
| fuzziness AUTO "exact for 1 to 2 characters" | "up to 2 characters" (docs say 0..2) | search.mdx |
| OpenTelemetry GenAI link opentelemetry.io/docs/specs/semconv/gen-ai/ (now a "Moved" stub) | github.com/open-telemetry/semantic-conventions-genai (HTTP 200) | llm-gateway.mdx (Beyond section and traces paragraph) |

## Beyond this page links

67 external links across the six lessons were opened (curl status and page title). All returned HTTP 200 with the expected title, except:
- MySQL 8.0 manual pages return 403 to curl (bot block); fetched through WebFetch instead. Checked: innodb-index-types ("Clustered and Secondary Indexes") and innodb-locking (record, gap, next-key locks). The other five MySQL links share the same URL pattern and were not individually opened.
- opentelemetry.io gen-ai page is a "Moved" stub (fixed, see above).
- The two RRF PDFs (cormack.uwaterloo.ca and plg.uwaterloo.ca) both return the Cormack, Clarke, Buttcher SIGIR 2009 paper.
- Dynamo PDF returns the Dynamo paper.

## COULD NOT VERIFY (hedge left in place)

- Elasticsearch RRF subscription tier (search.mdx, hybrid section: "sometimes on paid tiers"): the Elastic subscriptions page lists RRF as a feature, but the tier check marks are not readable in text; a search hit (Elastic forum, older) says Enterprise. Not stated plainly.
- OpenSearch has an HNSW-based k-NN index (search.mdx): docs pages fetched were truncated navigation; left as "check current docs".
- InnoDB change buffer exclusion of unique indexes: the 8.0 manual page says only "secondary indexes, not with descending columns"; the unique-index point comes from a MySQL team blog (2015). Text now describes it as the reason the benefit is for non-unique ones.
- Search vector-DB capabilities (rag.mdx), price per token and GPU-hour figures (rag.mdx, llm-inference.mdx, llm-gateway.mdx): labelled illustrative, left as is. Hardware figures (1,000 TFLOP/s, 3 TB/s) are labelled assumptions, left as is.
- recsys.mdx: "filter inside the index traversal if your index supports it" and the "2,000 queries/s per replica" figure are explicitly labelled as assumptions to benchmark; left as is.
- Quiz/flashcard hedges "Check the docs for the exact crash cases" and "gap-lock behaviour: check the docs" (databases.mdx) are advice to read the manual, not factual claims; left as is. Group Replication/InnoDB Cluster "exact guarantees" left as "check the docs".
- Splitwise (2024) and Chen et al. 2023 speculative sampling citations (llm-inference.mdx), Earlybird ICDE 2012 (search.mdx), Koren 2009 and Linden 2003 (recsys.mdx): not opened; cited from knowledge.
- Hosted APIs stop generating when the client disconnects (llm-gateway.mdx, "verify for each provider"): left hedged.
