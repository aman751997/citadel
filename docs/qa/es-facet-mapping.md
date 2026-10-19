# Verification: Elasticsearch snippets in the search lesson (task `es-facet-mapping`)

Date run: 2026-10-19. Elasticsearch 8.19.0 (`docker.elastic.co/elasticsearch/elasticsearch:8.19.0`, single node, `xpack.security.enabled=false`, `-Xms1g -Xmx1g`), Python client `elasticsearch` 8.19.3 (installed with `pip install --target`). Every snippet ran as written in `src/lessons/search.mdx`, against 7 sample listings (L01..L07: lamps, one doorknob, materials brass/oak/copper/steel) behind the alias `listings` -> `listings_v1`. Container and temp files removed afterwards. No deprecation warnings were raised by any request.

Counts: VERIFIED 20, CORRECTED 1, COULD NOT VERIFY 1.

## Mapping and field types
- **M1. Chapter 2 mapping (`category`, `material` as `keyword`, `price` scaled_float, `title.raw` sub-field)**: VERIFIED. Index created with no error and no mapping conflict. `sales` is not in the mapping; the later `function_score` snippet works because dynamic mapping makes it `long` (observed `{'type': 'long'}`).
- **M2. text vs keyword**: VERIFIED. `term title=brass` -> 4 hits (analysed); `term title="Brass Lamp"` -> 0 hits; `term title.raw="Brass desk lamp"` -> L07; `term title.raw="brass desk lamp"` -> 0; `term material=Brass` -> 0 (keyword is exact, case-sensitive); `match title="Lamps"` -> 6 hits (lamp/lamps stemmed together).
- **M3. "filter, sort or aggregate on keyword"**: VERIFIED. `terms` aggregation on the `text` field `title` -> 400 `Fielddata is disabled on [title] ... Please use a keyword field instead`.
- **M4. Ch4 `create(index="listings_v1", settings=...)` and Ch9 edge n-gram `create(index="listings_v1", ...)`**: CORRECTED. Run after the Chapter 2 mapping they fail with 400 `resource_already_exists_exception`. Added a sentence after the "Edge n-grams, done right" paragraph (search.mdx ~line 1146) saying the new settings and field join the full Chapter 2 mapping, and that `title_prefix` must be filled via `copy_to` from `title`. (`copy_to` verified: count 1.)

## Analysis
- **A1. `es.indices.analyze(analyzer="english", text="Two brass lamps for the desk")`**: VERIFIED. `[('two', 0), ('brass', 1), ('lamp', 2), ('desk', 5)]`, exactly the lesson comment.
- **A2. Three-listing worked example** (separate 1-shard index, `english` analyzer): VERIFIED. "brass lamp" AND -> d1, d2. "desk lamp" AND -> d2, d3. `match_phrase` "desk lamp" -> d3 only. Positions: d2 `two@0 brass@1 lamp@2 desk@5`; d3 `oak@0 desk@1 lamp@2 vintag@3`. Note: the real stemmer gives `vintag`, which the lesson already states (it says the tables use a light stemmer).
- **A3. Edge n-gram index-time only** (`edge_ngram` 1..10, `search_analyzer: standard`): VERIFIED. `analyze` "Lamp" -> `l, la, lam, lamp`. Search "lam" with seller_42 + lighting filters -> "Desk lamp", "Lampshade silk", "Vintage Brass Lamp". With the n-gram analyzer also at query time, "lam" matched "Large lamp" and "Ladder oak" (every title with an "l" word), as the text says.

## Ranking
- **R1. `multi_match` with `title^3` plus `in_stock` filter**: VERIFIED. 6 hits, out-of-stock L06 excluded; L01 and L07 (brass lamp in title) on top at 2.394.
- **R2. `function_score` (gauss + `field_value_factor` log2p, multiply)**: VERIFIED. Runs with no error. Result order L01 0.238, L06 0.220, L07 0.178, L03 0.130, L04 0.093, L02 0.016 (the 40-day-old, zero-sales L02 drops to last, base score alone put it 5th).
- **R3. `gauss` scale 30d decay 0.5**: VERIFIED. A document created exactly 30 days ago got factor 0.5.
- **R4. `log2p` is log10(2 + sales); `log1p` of 0 gives 0**: VERIFIED. log2p: sales 12 -> 1.146 (= log10 14), sales 0 -> 0.301 (= log10 2). log1p with sales 0 -> score 0.

## Facets
- **F1. Facet request (`query` + `post_filter` material=brass + `terms` + `histogram`, `shard_size`)**: VERIFIED. Request accepted, no error. Hits: L01, L02 (total 2, brass only). `materials` buckets: brass 2, copper 1, oak 1 (siblings keep their counts). `price` histogram: bucket 25.0 -> 4. `doc_count_error_upper_bound` 0, `sum_other_doc_count` 0.
- **F2. post_filter vs plain filter**: VERIFIED. Same selection as a plain `filter` -> same 2 hits, but the facet shrinks to `brass 2` only. The facet counts also respect the in_stock and price filters in `query` (L06 steel and L07 brass at 60 are not counted), which the lesson does not claim otherwise.
- **F3. Error bound reported**: VERIFIED. Response has `doc_count_error_upper_bound` and `sum_other_doc_count` (with `size: 2`: other count 2).

## Typos
- **T1. Fuzzy `bool.should` snippet ("lmap" with boost 3 + `fuzziness AUTO`, `prefix_length 1`)**: VERIFIED. Returns the lamp documents (transposition counts as one edit).
- **T2. `AUTO` rule: exact for up to 2 chars, 1 edit for 3-5, 2 edits for longer**: VERIFIED. "ax" vs "ab": no match; "axc" vs "abc": match; "axcde" vs "abcde": match; "axxde" (2 edits, length 5): no match; "axxdefg" (2 edits, length 7): match; 3 edits: no match.

## Paging
- **P1. Page 501 refused above 10,000**: VERIFIED. `from_=9980, size=20` works (0 hits on the tiny index); `from_=10000, size=20` -> 400 `Result window is too large, from + size must be less than or equal to: [10000] but was [10020] ... index.max_result_window`.
- **P2. PIT + `search_after`** (sort `_score desc, listing_id asc`, size 3): VERIFIED. Page 1 L01, L04, L06; `last = hits[-1]["sort"]` = `[0.2115, 'L06', 5]`; page 2 L07, L02, L03; PIT closed without error. The sort array carries a third value, the implicit `_shard_doc`, even when you give a tiebreaker.
- **P3. "A PIT search adds an implicit tiebreaker (`_shard_doc`)"**: VERIFIED. Sorting only by `_score` returned `sort` values `[0.2115, 0]` and `[0.2115, 3]`.

## Shards, routing, bulk, aliases
- **S1. `create(settings={"number_of_shards": 3, "number_of_replicas": 2})`**: VERIFIED. Created; on one node health is `yellow` (replicas unassigned). Changing `number_of_shards` later -> 400 `Can't update non dynamic settings`; changing `number_of_replicas` later works.
- **S2. Routing** (3 shards, 30 docs routed with `seller_42`): VERIFIED. With `routing="seller_42"`: `_shards.total` 1; without: 3. Both found all 30.
- **S3. Bulk with external version through an alias** (`helpers.bulk`, `_version_type: external`): VERIFIED. Create lsn 10, update lsn 11, stale update lsn 5, delete lsn 12: the stale one returned 409 `version_conflict_engine_exception ... current version [11] is higher or equal to the one provided [5]`; the delete worked.
- **S4. `update_aliases` remove + add**: VERIFIED. After the call `listings` points only at `listings_v2`.

## Hybrid search
- **H1. Application-side RRF with `knn` + `filter`** (3-dim `dense_vector`, cosine, indexed): VERIFIED. `bm25` order 1,2,3,4,5; `knn` with in_stock filter 1,5,3,4 (out-of-stock doc 2 excluded); fused `rrf` order 1,3,5,4,2. The lesson's mapping chapter does not show the `embedding` mapping; the lesson says it is a `dense_vector` with a vector index, which is what was used.
- **H2. Built-in `rrf` retriever needs a paid licence, 403 on Basic**: VERIFIED. 403 `security_exception: current license is non-compliant for [Reciprocal Rank Fusion (RRF)]`.

## Could not verify
- The lesson's claim that `elasticsearch-py` 9.x also runs the analyze snippet ("8.x/9.x"): only the 8.19 client was run. A 9.1.3 client installed first by default; it was replaced by 8.19.3 as the task asks.
