# MySQL and Redis: remaining checks (task mysql-redis-remaining)

Run 2026-10-19 in throwaway containers (all removed): mysql:8.0 (8.0.46, GTID on for the driver tests), mysql:8.0.15 and 8.0.16 (linux/amd64 only, started via `mysqld --initialize-insecure` because the image entrypoint crashes under emulation), postgis/postgis:16-3.4, pgvector/pgvector:pg16, postgres:16, redis 5.0.14, 6.0.20, 6.2.24, 7.4.11, a 3-node cluster-enabled redis:7. Drivers: PyMySQL 1.2.3, mysql-connector-python 9.4.0 (pure and C extension), redis-py 7.0.1.

## 1. SQL blocks not covered by earlier passes

| Block (file:line) | Engine | Result | Observed |
|---|---|---|---|
| core-concepts:1248 idempotency_keys + insert/update/commit | MySQL 8.0.46 | VERIFIED | runs; repeat insert gives `ERROR 1062` |
| networking:1081 idempotency_keys + payments transaction (`LAST_INSERT_ID()`) | MySQL | VERIFIED | row ends with `payment_id=1`, response JSON; repeat gives 1062 (needs a `payments` table the lesson does not show) |
| pattern-geospatial:50 bounding box | MySQL | VERIFIED | returns the 2 expected rows |
| pattern-geospatial:272 `geohash LIKE 'tdr1v%'` | MySQL | VERIFIED | `type: range`, `key: geohash`, `Using where; Using index` |
| pattern-geospatial:870 conditional `UPDATE rides` | MySQL | VERIFIED | first `ROW_COUNT()=1`, second 0 |
| pattern-geospatial:652 GiST + `ST_DWithin` | PostGIS 3.4 (Postgres) | VERIFIED | within 2 km: 61.98 m and 1098.56 m, far point excluded, sorted nearest first |
| pattern-timeseries:1081 `ON DUPLICATE KEY UPDATE clicks = VALUES(clicks)` | MySQL | VERIFIED, with note | new row 1, same value again 0, changed value 2, one row ends at the new value. `VALUES()` raises warning 1287 (deprecated since 8.0.20); still works. Not changed (comment says MySQL) |
| search:130 FULLTEXT natural language | MySQL | VERIFIED | `brass lamp` ranks "Brass lamp" 0.91 first, then "Brass key" 0.46, "Steel lamp" 0.23 |
| search:142 tsvector / `websearch_to_tsquery` / `ts_rank` | Postgres | VERIFIED | needs a `tsv` column (generated column used); returns the right row |
| search:1229 pg_trgm | Postgres | VERIFIED | "Pizza place" 0.5, "Pizzeria" 0.33 for `pizzza` |
| blob-cdn:151 `photos` DDL | Postgres (it is Postgres syntax: TIMESTAMPTZ, `now()`) | VERIFIED | creates with a `users` table; would fail on MySQL |
| rag:735 pgvector query with `acl_groups && $2::text[]` and `<=>` | pgvector | VERIFIED | tenant and ACL filter applied, nearest first |
| feature-flags:1381 change transaction | MySQL | CORRECTED | `before` is a reserved word in MySQL: `ERROR 1064`. Renamed columns to `before_state`, `after_state` (feature-flags.mdx). With the rename: version CAS `ROW_COUNT()=1`, stale retry 0, whole transaction runs |
| url-shortener:326 idempotency | MySQL | VERIFIED | duplicate gives 1062 |
| url-shortener:848 id_blocks, :1126 links DDL | MySQL | VERIFIED | creates |
| url-shortener:1397 user_links cursor page | MySQL | VERIFIED | tuple comparison returns only rows after the cursor in order; `EXPLAIN` shows `Backward index scan; Using index` (no filesort) |
| url-shortener:1681 expiry sweep with `ORDER BY ... LIMIT` | MySQL | VERIFIED | first run 2 rows, second 0, row with future expiry untouched |
| pattern-timeseries:275 CQL (TWCS table) | Cassandra | NOT RUN | no Cassandra container; hedged in the lesson ("check current docs") |
| pattern-partitioning:746 CQL events table | Cassandra | NOT RUN | same |
| src/mastery reporting-engine (8 sql blocks) and ai-pipeline rag-layer (1) | Postgres-style, schema we do not have | NOT RUN | not parsed against a database; only read for obvious syntax slips (none seen) |

databases, pattern-contention, queues-streams, pattern-async-jobs, llm-gateway: covered by the earlier passes.

## 2. MySQL claims previously untestable

| Claim | Result | Observed |
|---|---|---|
| `CLIENT_FOUND_ROWS`: no-op `ON DUPLICATE KEY UPDATE col = col` reports 0 without the flag, 1 with it | VERIFIED | PyMySQL: without 0, with 1 (new row 1, changing ODKU 2 both ways). A no-op `UPDATE ... SET col = 9` also 0 without, 1 with. Connector/Python 9.4 (pure and C ext): default 0, `+FOUND_ROWS` 1. Both drivers leave the flag OFF by default. Lessons now say so (pattern-contention, queues-streams). Other drivers (JDBC, mysql2, Go) NOT tested |
| `session_track_gtids = OWN_GTID` returns a GTID to the driver | VERIFIED (not exposed) | Default `OFF`; `SET SESSION session_track_gtids = OWN_GTID` accepted. PyMySQL 1.2.3 and Connector/Python 9.4.0 expose no cursor or connection attribute for it (they only define the `SESSION_TRACK` capability constant). Lesson text now names this. Other drivers NOT tested |
| CHECK enforced from 8.0.16 | VERIFIED | 8.0.15: `CHECK (qty > 0)` parsed, absent from `SHOW CREATE TABLE`, `INSERT -5` succeeded. 8.0.16: constraint `inv_chk_1` shown, `ERROR 3819`. Column-level form same. Comment updated in databases.mdx |
| Partition limit 8,192 | VERIFIED | `PARTITION BY HASH ... PARTITIONS 8192` created (8192 rows in `information_schema.partitions`); 8193 gives `ERROR 1499 Too many partitions (including subpartitions) were defined`; RANGE with 8193 definitions: same 1499 |
| `innodb_lock_wait_timeout` default 50, `lock_wait_timeout` default 31536000 | VERIFIED | on 8.0.46 |
| MySQL `max_connections` default 151 | VERIFIED | 151 on 8.0.46 |
| PostgreSQL `max_connections` default 100 (networking.mdx:1196) | VERIFIED | `show max_connections` = 100 on postgres:16 |

## 3. Redis

| Claim | Result | Observed |
|---|---|---|
| `ZRANGE ... BYSCORE REV LIMIT` needs 6.2+ | VERIFIED | 5.0.14 and 6.0.20: `ERR value is not an integer or out of range`; 6.2.24 and 7.4.11 work. Plain `ZRANGE z 0 -1 REV` also fails before 6.2 (`ERR syntax error`) |
| `GETEX` is 6.2+ | VERIFIED | unknown command on 5 and 6.0; works on 6.2 |
| `GEOSEARCH` is 6.2+ | VERIFIED | unknown command on 5 and 6.0; works on 6.2 |
| `EXPIRE ... NX` is Redis 7+ | VERIFIED | 6.2.24: `ERR wrong number of arguments`; 7.4.11: 1 then 0, TTL stays 100 |
| `TIME` then write inside a script (Redis 5+) | VERIFIED | works on 5.0.14, 6.0.20, 6.2.24, 7.4.11 |
| Default `maxmemory-policy` noeviction | VERIFIED | on 5.0.14, 6.0, 6.2, 7.4 |
| noeviction: writes fail at maxmemory, reads keep working | VERIFIED | maxmemory 2mb: `OOM command not allowed when used memory > 'maxmemory'` after about 5,176 keys of 100 bytes; `GET` still worked; after switching to allkeys-lru, writes succeeded |
| `OBJECT FREQ` and `redis-cli --hotkeys` need an LFU policy | VERIFIED | under noeviction and allkeys-lru: `ERR An LFU maxmemory policy is not selected, access frequency not tracked`. Under `allkeys-lfu` and `volatile-lfu` both work. Counter is logarithmic: a key read once showed 6, a key read 50 times showed 8. Keys created before the switch showed 0 |
| `EVALSHA` unknown script gives `NOSCRIPT` | VERIFIED | `NOSCRIPT No matching script. Please use EVAL.` |
| redis-py `register_script` falls back (rate-limiter text) | VERIFIED (now run) | redis-py 7.0.1: after `SCRIPT FLUSH`, calling the registered script returned 1 and `SCRIPT EXISTS` was then true; raw `evalsha` raised `NoScriptError` |
| `WAIT` with a real replica | VERIFIED | primary + replica on one network: `SET` then `WAIT 1 100` = 1 and replica had the key. Replica stopped: `WAIT 1 100` = 0, `WAIT 1 200` = 0, `connected_slaves:0`. Right after a replica (re)starts, WAIT returned 0 until it was `state=online` (about 5 s) |
| Acknowledged write lost on failover; a `DEL` can bring the old value back | VERIFIED | replica cut off with `docker network disconnect`; primary acknowledged `SET fresh 1` and `DEL stale`; `REPLICAOF NO ONE` on the replica: `fresh` missing, `stale` = old value. When the old primary rejoined as a replica of the promoted node it lost `fresh` and got `stale` back |
| Cluster: 16,384 slots, `CLUSTER KEYSLOT` | VERIFIED | 3 primaries, slots 0-5460, 5461-10922, 10923-16383. `foo` 12182, `bar` 5061, `user:1` 10778; `{u1}:a` and `{u1}:b` both 4574 |
| `MOVED` | VERIFIED | `SET foo 1` on the wrong node: `MOVED 12182 <ip>:6379`; `redis-cli -c` follows it |
| `CROSSSLOT` | VERIFIED | `MSET foo 1 bar 2`, `EVAL ... 2 foo bar`, and a MULTI with two slots all rejected; also rejected when both slots live on the same node (`{u1}:a` and `bar`); same hash tag works |
| `ASK` vs `MOVED` during slot migration | VERIFIED | slot 5061 set MIGRATING on source, IMPORTING on target: existing key served by source; a missing key gave `ASK 5061 <target>`; target without `ASKING` replied `MOVED 5061 <source>`, with `ASKING` it served the command |
| `allkeys-lfu`, `volatile-*` behave as the table says | VERIFIED (policies accepted, LFU counters) | eviction itself was not stress-tested |

## Text changed
databases.mdx (CHECK comment, GTID driver note, partition limit error), caching.mdx (WAIT sentence), pattern-contention.mdx and queues-streams.mdx (driver default for CLIENT_FOUND_ROWS), feature-flags.mdx (audit_log column names). No tests touched.

## Still NOT verified
Other MySQL drivers (JDBC, mysql2, Go) for `CLIENT_FOUND_ROWS` and OK-packet GTIDs; Cassandra CQL blocks; Mastery Postgres-style SQL; Cluster failover with replicas and the "adding a fourth node moves 25%" figure (arithmetic only); real eviction behaviour under LFU load.
