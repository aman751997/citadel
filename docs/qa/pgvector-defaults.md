# pgvector HNSW defaults (task pgvector-defaults)

Date: 2026-10-19. Engine: `pgvector/pgvector:pg16`, pgvector 0.8.7 (`SELECT extversion FROM pg_extension`). Container `vfy-pgvd-db`, removed afterwards.

## Claim: HNSW defaults are m = 16 and ef_construction = 64 (and ef_search = 40)
Result: VERIFIED (replaces COULD NOT VERIFY, row 26 of mastery-postgres-sql.md).

### Primary sources (tag v0.8.7, fetched 2026-10-19)
- `src/hnsw.h`: `HNSW_DEFAULT_M 16` (min 2, max 100); `HNSW_DEFAULT_EF_CONSTRUCTION 64` (min 4, max 1000); `HNSW_DEFAULT_EF_SEARCH 40` (min 1, max 1000).
- `src/hnsw.c`: `add_int_reloption` for `m` and `ef_construction` use those defaults; GUCs `hnsw.ef_search` (40), `hnsw.iterative_scan` (default off), `hnsw.max_scan_tuples` (default 20000, min 1), `hnsw.scan_mem_multiplier` (default 1).
- README (v0.8.7): "`m` ... (16 by default)", "`ef_construction` ... (64 by default)", "`hnsw.ef_search` of 40 by default", iterative scans "Starting with 0.8.0".
- Source: https://github.com/pgvector/pgvector/blob/v0.8.7/src/hnsw.h and README.md at the same tag.
- Extra rule found in source (hnswutils.c): `ERROR: ef_construction must be greater than or equal to 2 * m` (seen live: `WITH (ef_construction=16)` with default m=16 fails).

### Experiment
20,000 random 64-dim vectors (values random()-0.5), 100 random queries, cosine ops, `hnsw.ef_search=40`, recall@10 against exact (seq scan) top 10. Single run each, one machine, so timings are rough.

| Index | Size (bytes) | Build | reloptions | recall@10 |
|---|---|---|---|---|
| (a) no options | 11,403,264 | 2.94 s | NULL | 0.675 |
| (a) default, rebuilt | 11,419,648 | 3.03 s | NULL | 0.681 |
| (b) m=16, ef_construction=64 | 11,403,264 | 3.10 s | {m=16,ef_construction=64} | 0.676 |
| (c) m=8 | 9,355,264 | 1.57 s | {m=8} | 0.440 |
| (d) m=32 | 15,343,616 | 7.62 s | {m=32} | 0.872 |
| (e) ef_construction=16 | rejected (needs >= 2*m) | | | |
| (e1) ef_construction=32 | 11,427,840 | 2.17 s | {ef_construction=32} | 0.630 |
| (f) ef_construction=200 | 11,411,456 | 6.62 s | {ef_construction=200} | 0.698 |
| m=8, ef_construction=16 | 9,363,456 | 0.67 s | {m=8,ef_construction=16} | 0.310 |
| m=8, ef_construction=64 | 9,355,264 | 1.46 s | {m=8,ef_construction=64} | 0.424 |
| m=8, ef_construction=200 | 9,363,456 | 3.68 s | {m=8,ef_construction=200} | 0.477 |

Reading it:
- Default and (b) have the identical size (11,403,264), and recall within noise (default rebuilds gave 0.675 and 0.681; (b) 0.676). m=8 and m=32 are clearly different in size, build time and recall, so size is a real fingerprint for `m`.
- `m=8` alone gives the same size (9,355,264) and similar recall (0.440) as `m=8, ef_construction=64` (0.424), consistent with default ef_construction = 64 (the m=8 default-efc build is not distinguishable from explicit 64 within noise).
- ef_construction does not change size; it changes build time and recall: 16 gives 0.310 and 0.67 s, 64 gives 0.424 and 1.46 s, 200 gives 0.477 and 3.68 s (at m=8). At m=16: 32 gives 0.630, 64 gives 0.676, 200 gives 0.698. Direction is clear; single builds are noisy (index builds are not deterministic: two default builds differed in size by 16 KB).
- Recall is low in absolute terms because random 64-dim vectors are a hard case for ANN; only the comparison matters.
- Defaults are NOT stored: `reloptions` is NULL for the no-options index; explicit options appear as `{m=16,ef_construction=64}`. So the earlier lesson check (`indexdef ... WITH (m='16', ef_construction='64')`) was showing explicit options, not proof of defaults.
- Live GUCs on 0.8.7 after first vector query in session: `hnsw.ef_search` = 40, `hnsw.iterative_scan` = off, `hnsw.max_scan_tuples` = 20000, `hnsw.scan_mem_multiplier` = 1. (They are unknown until the extension library is loaded in the session.)

## Lesson text edits
- `src/mastery/ai-pipeline/rag-layer-chunking-embeddings-pgvector.mdx`: section 4 bullet now says both values are defaults, attributed to README and `src/hnsw.h` v0.8.7, with ranges and the 2 x m rule; revision card says "both pgvector defaults, v0.8.7".
- Other mentions (`question-bank` Q46, cheat sheet, rag.mdx, recsys.mdx) state `m=16` as a parameter or example, not a claim about defaults, and were left unchanged.
