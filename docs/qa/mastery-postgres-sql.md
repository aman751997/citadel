# Mastery chapters: SQL executed against real schemas

Date: 2026-10-19. Engines: `postgres:16` (16.15) for the reporting chapters, `pgvector/pgvector:pg16` (PostgreSQL 16.15, pgvector 0.8.7) for the RAG chapter. Throwaway containers `vfy-pg-main`, `vfy-pg-vec`, removed afterwards. Only synthetic rows. Source repos read-only.

## Schema sources and stand-ins

- Reporting: all 44 real Flyway files of the reporting service in the local healthcare monorepo (V1..V42, V44, V45; V43 is absent in `src`) applied in order. Result: 0 errors, 20 datasources, 243 fields, 40 system report definitions, 7 dashboards. Only change: `uuidv7()` (a Postgres 18 function) replaced by a stand-in returning `gen_random_uuid()`, because the container is Postgres 16.
- Source tables are NOT in the reporting service, so minimal stand-ins were built from the owning services' migrations: `patient.appointments` (status enum values from patient V1+V27, `start_at timestamptz`), `lead.leads` + `lead.lead_sources`, `billing.invoice`, `billing.invoice_line_item`, `billing.refund`, and `billing.v_invoice_revenue_line` (definition copied from billing V32).
- pgvector: DDL copied verbatim from `app/core/db.py` in the local AI pipeline repo (`_VECTOR_SCHEMA_DDL`). Query shape from `app/repositories/chunk_repo.py` `search_dense`.
- Chapter `:named` parameters were run as server-side `PREPARE ... (varchar, ...)` statements, so values arrive typed as varchar like the JDBC binds in the text.

## Reporting engine

| # | Block | Where | Result | Exact output / note |
|---|---|---|---|---|
| 1 | Example 1 SQL (appointments by status), k = 5 | request-lifecycle-and-emitted-sql.mdx, Example 1 | VERIFIED | Parses and runs. Data: acme BR-DIL COMPLETED 9, NO_SHOW 3. k=5: 1 row `COMPLETED 9` (NO_SHOW group of 3 suppressed). |
| 2 | Same, k = 1 | same | VERIFIED | 2 rows: `COMPLETED 9`, `NO_SHOW 3` (HAVING keeps every group). k=4 still hides the 3-row group. Without HAVING a group of 3 comes back (`NO_SHOW 3`). |
| 3 | Tenant filter behaviour | same | VERIFIED | Params tenant `other`: only that tenant's rows counted; tenant `nobody`: 0 rows. |
| 4 | `status::text` cast claim ("no enum = varchar operator") | same, bullet 1 | VERIFIED | `ERROR: operator does not exist: patient.appointment_status_enum = character varying`. Same for uuid: `ERROR: operator does not exist: uuid = character varying`. |
| 5 | Example 2 SQL (time series, AT TIME ZONE before date_trunc), k=5 and k=1 | Example 2 | VERIFIED | k=5: `2026-09-05 00:00:00 | 6`. k=1: 5 days (09-01:1, 09-05:6, 09-06:3, 09-07:4, 09-30:1). A bad zone name errors: `time zone "Mars/Base" not recognized`. |
| 6 | 02:00 IST 1 Sep lands in August if truncated in UTC | Example 2 + Reveal | VERIFIED | `2026-08-31 20:30:00` UTC vs `2026-09-01 02:00:00` IST; UTC truncation gives day `2026-08-31`. |
| 7 | BETWEEN upper bound minus 1 microsecond | Example 2 | VERIFIED | Using `2026-10-01T00:00:00+05:30` as the September upper bound counted 16 rows (includes the midnight 1 Oct row, which also counts in October: 1); with `...23:59:59.999999` it counts 15. |
| 8 | HOUR_OF_DAY variant `EXTRACT(HOUR FROM start_at AT TIME ZONE :tz)` | Example 2 | VERIFIED | Returns hour numbers 0..23 pooled across days (hours 0, 2, 11..16, 23 in the data). |
| 9 | Cast the parameter, not the column, keeps the index | Example 2 bullet, Quiz | VERIFIED | 50,000+ rows, btree on `start_at`: parameter cast = `Index Only Scan using idx_appt_start2`; `start_at::text BETWEEN` = `Seq Scan ... Filter: ((start_at)::text >= ...)`. |
| 10 | Example 3 SQL (lookup join, `f` alias, soft delete), k=5 and k=1 | Example 3 | VERIFIED | k=5: `Website 6, avg 3.0`. k=1: Website 6 / Walk-in 1 / NULL label 1 (lead with no source). Soft-deleted lead excluded by `f.deleted_at IS NULL`. |
| 11 | `{f}.` placeholder / ambiguity reason | Example 3 | VERIFIED | Unqualified `created_at` with the join: `ERROR: column reference "created_at" is ambiguous`; without the join it runs. |
| 12 | "LEFT so a lead with a deleted source still counts, under a NULL label" | Example 3 | CORRECTED | Real lead schema: `source_id` has a foreign key and sources are soft-deleted (`deleted_at`), so a deleted source still joins and keeps its name; the NULL label comes from a lead with no source (tested). Now: "a lead with no source still counts, under a NULL label. A soft-deleted source row still joins ..." |
| 13 | Worked example steps 1-4 INSERTs | add-a-new-dashboard...mdx | CORRECTED | In a fresh catalog (real V1,V2,V5,V6,V7,V11) all four INSERTs ran. But the step 3 definition filters on `status`, which step 2 never declared (0 of 1 filter fields declared; the validator would reject it). Added the `status` field row to step 2. Re-run: 6 fields, every referenced field declared. |
| 14 | Same INSERTs against the real catalog | same | CORRECTED (note added) | Step 2 fails with `duplicate key ... uk_catalog_field_ds_key (billing.revenue_lines, consultation_type)` because V19 already registered them, and id `...0060` is the real "Telecaller Performance" report. Added a short note that steps 1-4 are a teaching copy (fresh id, `ON CONFLICT`). |
| 15 | "15 starter reports appear for a new tenant" | same | CORRECTED | V9 seeds 15 definitions (counted), but after all migrations there are 40 system definitions. Text now says V9 seeds 15 and V1..V45 leave 40. |
| 16 | Step 5 emitted SQL (billing view), k=5 and k=1 | same | VERIFIED | Runs. Data (synthetic): GENERAL 2 lines/1100.00, PANCHAKARMA 1/580.00 after the DRAFT invoice is excluded by status. k=5: 0 rows. k=1: 2 rows. Dashboard tiles ...0040 / ...0041 exist in the full catalog; ...0060 is not this report there (see 14). |
| 17 | `net_revenue` = line total with invoice discount apportioned | Step 0 | VERIFIED | Invoice subtotal 1000, GST 180, total 1180: lines 600 and 580 give net 600.00 and 580.00. |
| 18 | "billing view has no delete filter" (labelled unverified) | Step 1 table | VERIFIED as stated | `pg_get_viewdef(...) ~* 'delete'` is false for the V32 view definition. Label left as is. |
| 19 | Since V35 `SUM(net_revenue)` emits a correlated subquery that nets refunds | Step 2 note | VERIFIED | V35 expression run with synthetic refunds: COMPLETED refund 118 on PANCHAKARMA, PENDING_APPROVAL ignored, APPROVED 100 apportioned: GENERAL 1100 -> 1000, PANCHAKARMA 580 -> 462.00. `EXPLAIN` shows `SubPlan 1` correlated on `i.id`. |
| 20 | k = 1 seeded by V19 with the comment "pure revenue aggregate, no patient-level data to protect" | security chapter | VERIFIED | V19 file text: `minimumGroupSize 1` and the quoted comment (read from the migration). k=1 behaviour: see rows 1-2, 16. |
| 21 | `SET LOCAL statement_timeout`, read-only tx | architecture / lifecycle | VERIFIED | `BEGIN READ ONLY; UPDATE ...` gives `cannot execute UPDATE in a read-only transaction`. With `SET LOCAL statement_timeout='100ms'`, `pg_sleep(1)` gives `canceling statement due to statement timeout`; after ROLLBACK the setting is back to 0. |
| 22 | architecture/design chapters inline SQL (`date_trunc(.. AT TIME ZONE :tz)`, `branch_id::text IN`, `HAVING COUNT(*) >= :min_group_size`, audit INSERT) | architecture-and-data-flow.mdx, design-decisions-and-trade-offs.mdx | VERIFIED (same forms as rows 1-8) | No separate `sql` blocks in those two files. Audit INSERT: `report_run_audit` exists in V1 with the columns the text implies; the INSERT itself was not run (no claim in the chapter depends on its shape). |

## AI pipeline (pgvector)

| # | Block | Where | Result | Exact output / note |
|---|---|---|---|---|
| 23 | `CREATE TABLE document_chunks (..., embedding vector(768), ...)` | rag-layer, section 4 | VERIFIED | Real DDL runs on pgvector 0.8.7. |
| 24 | `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` | section 4 | VERIFIED | `indexdef: ... USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64')`; `reloptions {m=16,ef_construction=64}`. Extra fact seen: `ef_construction = 16` with m=16 fails: `ef_construction must be greater than or equal to 2 * m` (not added to the chapter). |
| 25 | `ef_search` default 40 | section 4, card | VERIFIED | `SHOW hnsw.ef_search` = 40. |
| 26 | `m = 16` and `ef_construction = 64` are pgvector defaults | section 4, card | VERIFIED | Source (pgvector v0.8.7 `src/hnsw.h`, README) and experiment: see docs/qa/pgvector-defaults.md. |
| 27 | `<=>` is cosine distance; `1 - (a <=> b)` is similarity | section 4 / chunk_repo | VERIFIED | `[1,0] <=> [0,1]` = 1; same vector = 0; `1 - ([1,1] <=> [1,0])` = 0.7071067811865475. |
| 28 | The filter trap: `WHERE patient_id = ? ORDER BY embedding <=> ? LIMIT 10` on HNSW returns fewer rows | section 4, Reveal | VERIFIED | 6,004 random 768-d vectors, patient `P-TEST` with 4 chunks. Plan: `Index Scan using idx_chunks_embedding_hnsw ... Filter: patient_id`. Default: 1 row returned. With `SET LOCAL hnsw.iterative_scan = strict_order`: 4 rows (all that exist). Setting is off again after COMMIT. With a btree on `patient_id` present the planner chose that index instead (a note, not in the chapter). |
| 29 | `SET hnsw.iterative_scan = strict_order` exists in pgvector 0.8 | section 4 | VERIFIED | Accepted on 0.8.7; default `off`. "Not in < 0.8" not tested. |
| 30 | "Each chunk row carries ... its text (a deliberate exception ...)" | section 2, answer mode deep, and question-bank lines | CORRECTED | Real DDL has no text column: columns are `chunk_id, tenant_id, patient_id, document_id, chunk_index, chunk_count, s3_chunk_key, document_date, embedding, chunk_tsv, created_at`; `insert_many` only feeds the text to `to_tsvector('english', $10)`. A tsvector keeps stemmed words and positions (`'chunk':3 'synthet':1 'test':2`). Text now says: raw chunk text stays in S3, Postgres holds the pointer, the vector and a tsvector. Fixed in rag-layer (2 places) and question-bank-with-model-answers.mdx (3 places: quiz explain, answer, revision card). |

## Not run

- `search_lexical` / `websearch_to_tsquery` (not in the five chapters' SQL).
- The Postgres statement `SET LOCAL statement_timeout` from the real JDBC adapter (only the SQL semantics were run).
