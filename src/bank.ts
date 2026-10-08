// Question Bank — mirrored from Notion SD Master Sheet → Question Bank (web-validated 2026).
// `covers` names the portal lesson(s)/module teaching the question's core patterns,
// so coverage is auditable: every question maps to teaching content.
export interface BankQuestion {
  name: string;
  hot?: boolean; // 🔥 most-asked classic
  ai?: boolean; // ✨ modern/AI-era
  diff: string; // E/M/H
  freq: number; // 1–3 stars
  patterns: string;
  covers: string; // lesson(s) that teach this question's patterns
  walkthrough?: 'forged' | 'queued'; // has/gets a full walkthrough chapter
  links?: [lesson: string, anchor: string, label: string][]; // exact lesson chapters that answer it (src/lessons/<lesson>.mdx#anchor)
}

export interface BankTier {
  title: string;
  blurb: string;
  questions: BankQuestion[];
}

export const BANK: BankTier[] = [
  {
    title: 'Tier 1 — Warm-ups / Foundations',
    blurb: 'Every onsite loop starts here. Expect one as a screener.',
    questions: [
      { name: 'URL shortener (TinyURL)', hot: true, diff: 'E', freq: 3, patterns: 'base62, ID gen, KV, redirect cache (301/302)', covers: 'M1 framework + estimation; M3 warm-up', walkthrough: 'forged' },
      { name: 'Rate limiter', hot: true, diff: 'E/M', freq: 3, patterns: 'token/sliding bucket, Redis INCR+EXPIRE, Lua', covers: 'Warm-up walkthrough (M3)', walkthrough: 'forged' },
      { name: 'Unique ID generator', diff: 'E', freq: 2, patterns: 'Snowflake, UUIDv7, monotonicity, clock skew', covers: '2.1 Databases (ID strategies section)' },
      { name: 'Pastebin', diff: 'E', freq: 2, patterns: 'blob+metadata split, TTL, content-hash dedup', covers: '2.5 Blob storage & CDNs' },
      { name: 'Typeahead / autocomplete', hot: true, diff: 'E/M', freq: 3, patterns: 'trie, top-K per prefix, <100ms', covers: 'M3 Typeahead walkthrough + 2.6 Search + M10 Top-K', walkthrough: 'forged' },
      { name: 'API gateway', diff: 'E/M', freq: 2, patterns: 'routing, auth, throttle, circuit breaker', covers: '2.4 LBs & gateways' },
    ],
  },
  {
    title: 'Tier 2 — Classics (senior staples)',
    blurb: 'The canonical scale questions — most 45-min rounds come from here.',
    questions: [
      { name: 'Twitter / News feed', hot: true, diff: 'M', freq: 3, patterns: 'fan-out write vs read, hybrid for celebs, sorted sets', covers: 'Fan-out pattern (M5)', walkthrough: 'forged' },
      { name: 'Instagram', hot: true, diff: 'M/H', freq: 3, patterns: 'CDN, feed fan-out, blob, follower graph', covers: 'Fan-out pattern (M5) + 2.5 Blob/CDN (feed walkthrough transfers)' },
      { name: 'WhatsApp / Messenger', hot: true, diff: 'M', freq: 3, patterns: 'WebSocket, delivery receipts (at-least-once), presence', covers: 'Realtime pattern (M4)', walkthrough: 'forged' },
      { name: 'Dropbox / Drive', hot: true, diff: 'M', freq: 3, patterns: 'chunk + delta sync, content-hash dedup, conflict resolution', covers: '2.5 Blob + M11 sync/conflict', walkthrough: 'forged' },
      { name: 'Yelp / nearby search', hot: true, diff: 'M', freq: 3, patterns: 'geohash / quadtree, radius search', covers: 'Geospatial pattern (M7)', walkthrough: 'forged' },
      { name: 'Uber / Lyft', hot: true, diff: 'H', freq: 3, patterns: 'geo index (H3), driver matching, WS location stream, surge', covers: 'Geospatial pattern (M7) + Realtime pattern (M4)', walkthrough: 'forged' },
      { name: 'Ticketmaster', hot: true, diff: 'M', freq: 3, patterns: 'distributed lock, idempotency, virtual waiting room', covers: 'Contention pattern (M6)', walkthrough: 'forged' },
      { name: 'Web crawler', hot: true, diff: 'H', freq: 3, patterns: 'URL frontier, politeness, Bloom dedup, robots.txt', covers: 'Async-pipelines pattern (M8)', walkthrough: 'forged' },
      { name: 'Twitter search', diff: 'M', freq: 2, patterns: 'inverted index, shard by term vs doc', covers: '2.6 Search' },
      { name: 'Google Calendar', diff: 'M', freq: 2, patterns: 'RRULE, timezone expansion, conflict detection', covers: 'M1 framework + 2.1 Databases (data modeling)' },
    ],
  },
  {
    title: 'Tier 3 — Modern Product Systems',
    blurb: 'Product-flavored rounds — same patterns, newer skins.',
    questions: [
      { name: 'YouTube / Netflix', hot: true, diff: 'H', freq: 3, patterns: 'async transcode, adaptive bitrate (HLS/DASH), CDN, sharded counters', covers: 'Async-pipelines pattern (M8) + 2.5 CDN', walkthrough: 'forged' },
      { name: 'Google Docs', ai: true, diff: 'H', freq: 3, patterns: 'OT vs CRDT, cursor broadcast, version log', covers: 'Sync&collab pattern (M11)', walkthrough: 'forged' },
      { name: 'Notification system', hot: true, diff: 'M', freq: 3, patterns: 'multi-channel fan-out, retry+backoff, idempotency, priority queue', covers: 'Fan-out pattern (M5) + Async-jobs pattern (M8)', walkthrough: 'forged' },
      { name: 'TikTok', diff: 'M', freq: 2, patterns: 'short-video transcode, two-tower rec, infinite scroll', covers: 'M8 pipelines + 12.5 Recommendations' },
      { name: 'Discord / Slack', diff: 'M/H', freq: 2, patterns: 'WS connection sharding, msg ordering, selective delivery', covers: 'Realtime pattern (M4) (WhatsApp walkthrough transfers)' },
      { name: 'Recommendation system', diff: 'M', freq: 2, patterns: 'two-stage (candidate → rank), feature store, A/B', covers: '12.5 Recommendations' },
      { name: 'LeetCode / code judge', diff: 'M', freq: 2, patterns: 'sandboxed exec (container), quotas, async queue', covers: 'Async-jobs pattern (M8)' },
      { name: 'Airbnb marketplace', diff: 'M', freq: 2, patterns: 'availability calendar lock, double-booking prevent', covers: 'Contention pattern (M6) (Ticketmaster walkthrough transfers)' },
      { name: 'Tinder / dating', diff: 'M', freq: 1, patterns: 'geo filter, swipe state, match fan-out', covers: 'Geospatial pattern (M7) + Fan-out pattern (M5)' },
    ],
  },
  {
    title: 'Tier 4 — Infra & Hard Distributed',
    blurb: 'Senior/staff differentiators — infra rounds and "design Redis" questions.',
    questions: [
      { name: 'Distributed cache (Redis)', hot: true, diff: 'H', freq: 3, patterns: 'consistent hashing, eviction, hot-key L1, replication', covers: 'Partitioning pattern (M9) + 2.2 Caching', walkthrough: 'forged' },
      { name: 'Key-value store (Dynamo)', hot: true, diff: 'H', freq: 3, patterns: 'consistent hash + vnodes, quorum, vector clocks, gossip, Merkle', covers: 'Partitioning pattern (M9) + 1.3 Consistency', walkthrough: 'forged' },
      { name: 'Distributed job scheduler', hot: true, diff: 'H', freq: 3, patterns: 'exactly-once lease+heartbeat, DLQ, leader election', covers: 'Contention pattern (M6) + Async-jobs pattern (M8)', walkthrough: 'forged' },
      { name: 'Payment system (Stripe)', hot: true, diff: 'H', freq: 3, patterns: 'idempotency keys, double-entry ledger, reconciliation, webhooks', covers: 'Contention pattern (M6) (your wheelhouse — fintech day job)', walkthrough: 'forged' },
      { name: 'Metrics / Datadog', diff: 'H', freq: 2, patterns: 'time-series LSM, cardinality explosion, rollup, sliding-window alert', covers: 'Time-series pattern (M10)', walkthrough: 'forged' },
      { name: 'Ad click aggregator', diff: 'H', freq: 2, patterns: 'stream proc (Flink), exactly-once, watermark windows, Lambda/Kappa', covers: 'Time-series pattern (M10) + 2.3 Streams' },
      { name: 'S3 / object storage', diff: 'H', freq: 2, patterns: 'erasure coding, placement, multipart, versioning', covers: '2.5 Blob storage + Partitioning pattern (M9)' },
      { name: 'Distributed lock (Chubby)', diff: 'H', freq: 2, patterns: 'Raft/Paxos, lease + fencing tokens, Redlock critique', covers: 'Contention pattern (M6) (consensus section)' },
      { name: 'Top-K / leaderboard', diff: 'H', freq: 2, patterns: 'count-min sketch, sorted sets, windowed aggregation', covers: 'Time-series pattern (M10)' },
      { name: 'Stock exchange / Robinhood', diff: 'H', freq: 2, patterns: 'in-memory order book, total ordering, microsecond latency', covers: 'Contention pattern (M6) + M10 (ordering); practice-only' },
      { name: 'Food delivery (DoorDash)', diff: 'H', freq: 2, patterns: 'dispatch matching, ETA (ML), order state machine', covers: 'Geospatial pattern (M7) + M8 Async (Uber walkthrough transfers)' },
      { name: 'Google Maps / routing', diff: 'H', freq: 2, patterns: 'road graph (A*, contraction hierarchies), traffic ingest', covers: 'Geospatial pattern (M7) (routing section); practice-only' },
      { name: 'Zoom / video conf', diff: 'H', freq: 2, patterns: 'WebRTC SFU vs MCU, simulcast, TURN/STUN', covers: 'Realtime pattern (M4) (media section); practice-only' },
      { name: 'Flash sale', diff: 'H', freq: 1, patterns: 'inventory reserve under burst, queue ordering, stampede', covers: 'Contention pattern (M6) (Ticketmaster walkthrough transfers)' },
    ],
  },
  {
    title: 'Tier 5 — ✨ Modern / AI-era',
    blurb: 'Rising fast — and your day-job edge (LLM integration). Asked by MSFT, Amazon, OpenAI, Anthropic, Google, Datadog.',
    questions: [
      { name: 'ChatGPT / LLM inference serving', ai: true, diff: 'H', freq: 3, patterns: 'GPU bottleneck, KV cache, continuous batching (vLLM), token streaming (SSE), token-budget rate limit', covers: '12.1 LLM inference; walkthrough 5.1', walkthrough: 'forged' },
      { name: 'RAG / semantic search', ai: true, diff: 'H', freq: 3, patterns: 'embeddings, vector DB, ANN, chunking, rerank; ANN 10-50ms vs LLM 500ms+ budgets', covers: '12.2 RAG & vector search; walkthrough 5.2', walkthrough: 'forged' },
      { name: 'Vector database', ai: true, diff: 'H', freq: 2, patterns: 'HNSW/ANN index, shard embeddings, recall vs latency', covers: '12.2 RAG & vector search' },
      { name: 'AI agent platform / LLM gateway', ai: true, diff: 'H', freq: 2, patterns: 'orchestrator + tool gateway, token-budget, model fallback routing, per-tenant cost, OTEL', covers: '12.3 LLM gateway; walkthrough 5.3', walkthrough: 'forged' },
      { name: 'Feature flag / experimentation', ai: true, diff: 'M', freq: 2, patterns: 'hash-based sticky bucketing, SSE config streaming, A/B stats, kill switch', covers: '12.4 Feature flags' },
      { name: 'Distributed tracing', ai: true, diff: 'M/H', freq: 2, patterns: 'trace-id propagation, span ingest, sampling', covers: 'Time-series pattern (M10) + 12.3 (OTEL section)' },
      { name: 'Recommendation (two-tower)', ai: true, diff: 'M', freq: 2, patterns: 'candidate gen + ranker, ANN retrieval, feature store, online learning', covers: '12.5 Recommendations' },
    ],
  },
];

// Exact lesson chapters that answer each question (verified by tests/bank.test.ts against the lesson sources).
export const BANK_LINKS: Record<string, [lesson: string, anchor: string, label: string][]> = {
  'URL shortener (TinyURL)': [['url-shortener', 'walkthrough', 'Full walkthrough'], ['url-shortener', 'keyspace', 'Code length & collisions'], ['databases', 'ids', 'ID strategies']],
  'Rate limiter': [['rate-limiter', 'walkthrough', 'Full walkthrough'], ['rate-limiter', 'token-bucket', 'Token bucket'], ['rate-limiter', 'races', 'Redis races & Lua']],
  'Unique ID generator': [['databases', 'ids', 'ID strategies'], ['url-shortener', 'counter', 'Counters & ranges']],
  'Pastebin': [['blob-cdn', 'why-not-db', 'Metadata/blob split'], ['blob-cdn', 'dedup', 'Content-hash dedup'], ['delivery-framework', 'walkthrough', 'Worked Pastebin round']],
  'Typeahead / autocomplete': [['typeahead', 'walkthrough', 'Full walkthrough'], ['search', 'typeahead', 'Search: typeahead'], ['pattern-timeseries', 'top-k', 'Top-K']],
  'API gateway': [['load-balancing', 'gateway', 'API gateway'], ['load-balancing', 'l4-l7', 'L4 vs L7']],
  'Twitter / News feed': [['pattern-fanout', 'walkthrough', 'Full walkthrough'], ['pattern-fanout', 'celebrity', 'Celebrity problem'], ['pattern-fanout', 'ranking', 'Ranking']],
  'Instagram': [['pattern-fanout', 'transfer', 'Instagram/TikTok/LinkedIn variants'], ['blob-cdn', 'cdn', 'CDN'], ['pattern-fanout', 'two-strategies', 'Fan-out strategies']],
  'WhatsApp / Messenger': [['pattern-realtime', 'walkthrough', 'Full walkthrough'], ['pattern-realtime', 'receipts', 'Receipts'], ['pattern-realtime', 'presence', 'Presence']],
  'Dropbox / Drive': [['pattern-sync-collab', 'dropbox', 'Full walkthrough'], ['pattern-sync-collab', 'chunking', 'Chunking'], ['pattern-sync-collab', 'conflicts', 'Conflicted copies']],
  'Yelp / nearby search': [['pattern-geospatial', 'yelp', 'Full walkthrough'], ['pattern-geospatial', 'geohash', 'Geohash'], ['pattern-geospatial', 'edges', 'Edge problem']],
  'Uber / Lyft': [['pattern-geospatial', 'uber', 'Full walkthrough'], ['pattern-geospatial', 'matching', 'Matching'], ['pattern-realtime', 'gateway', 'Location stream']],
  'Ticketmaster': [['pattern-contention', 'ticketmaster', 'Full walkthrough'], ['pattern-contention', 'holds', 'Holds'], ['pattern-contention', 'waiting-room', 'Waiting room']],
  'Web crawler': [['pattern-async-jobs', 'crawler', 'Full walkthrough'], ['pattern-async-jobs', 'frontier', 'URL frontier'], ['pattern-async-jobs', 'dedup', 'Dedup']],
  'Twitter search': [['search', 'inverted-index', 'Inverted index'], ['search', 'cluster', 'Sharding: term vs doc'], ['search', 'sync', 'Index sync']],
  'Google Calendar': [['databases', 'many-to-many', 'Calendar data model'], ['databases', 'modeling', 'Modeling'], ['delivery-framework', 'api', 'API & entities']],
  'YouTube / Netflix': [['pattern-async-jobs', 'youtube', 'Full walkthrough'], ['blob-cdn', 'video', 'HLS/DASH segments'], ['pattern-async-jobs', 'fan-in', 'Fan-out / fan-in']],
  'Google Docs': [['pattern-sync-collab', 'google-docs', 'Full walkthrough'], ['pattern-sync-collab', 'ot', 'OT'], ['pattern-sync-collab', 'crdt', 'CRDT']],
  'Notification system': [['pattern-fanout', 'notification-walkthrough', 'Walkthrough sketch'], ['pattern-fanout', 'notifications', 'Notifications in depth'], ['pattern-async-jobs', 'retries', 'Retries & DLQ']],
  'TikTok': [['recsys', 'walkthrough', 'For You walkthrough'], ['pattern-async-jobs', 'youtube', 'Transcode pipeline'], ['pattern-fanout', 'transfer', 'Feed variants']],
  'Discord / Slack': [['pattern-realtime', 'groups', 'Large groups'], ['pattern-realtime', 'family', 'Same pattern, other skins'], ['pattern-realtime', 'walkthrough', 'WhatsApp walkthrough']],
  'Recommendation system': [['recsys', 'funnel', 'The funnel'], ['recsys', 'ranking', 'Ranking'], ['recsys', 'walkthrough', 'Walkthrough']],
  'LeetCode / code judge': [['pattern-async-jobs', 'code-judge', 'Code judge sandbox'], ['pattern-async-jobs', 'fairness', 'Quotas & fairness'], ['pattern-async-jobs', 'template', 'Async template']],
  'Airbnb marketplace': [['pattern-contention', 'transfer', 'Airbnb & booking variants'], ['pattern-contention', 'atomic', 'Exclusion constraints'], ['databases', 'concurrency-control', 'Locking']],
  'Tinder / dating': [['pattern-geospatial', 'transfer', 'Tinder & friends'], ['pattern-fanout', 'transfer', 'Match fan-out']],
  'Distributed cache (Redis)': [['pattern-partitioning', 'cache-round', 'Full walkthrough'], ['pattern-partitioning', 'slots', 'Hash slots'], ['caching', 'eviction', 'Eviction']],
  'Key-value store (Dynamo)': [['pattern-partitioning', 'kv-round', 'Full walkthrough'], ['pattern-partitioning', 'quorums', 'Quorums'], ['pattern-partitioning', 'conflicts', 'Version vectors']],
  'Distributed job scheduler': [['pattern-contention', 'scheduler-walkthrough', 'Walkthrough sketch'], ['pattern-async-jobs', 'scheduler', 'Scheduler'], ['pattern-async-jobs', 'leases', 'Leases']],
  'Payment system (Stripe)': [['pattern-contention', 'payments-walkthrough', 'Walkthrough sketch'], ['pattern-contention', 'ledger', 'Ledger'], ['pattern-contention', 'idempotency', 'Idempotency']],
  'Metrics / Datadog': [['pattern-timeseries', 'walkthrough', 'Full walkthrough'], ['pattern-timeseries', 'cardinality', 'Cardinality'], ['pattern-timeseries', 'rollups', 'Rollups']],
  'Ad click aggregator': [['pattern-timeseries', 'sketch-ads', 'Walkthrough sketch'], ['pattern-timeseries', 'ad-clicks', 'Exactly-once-ish'], ['queues-streams', 'prologue', 'Streams']],
  'S3 / object storage': [['blob-cdn', 'durability', 'Durability & erasure coding'], ['blob-cdn', 'multipart', 'Multipart'], ['pattern-partitioning', 'ring', 'Placement']],
  'Distributed lock (Chubby)': [['pattern-contention', 'distributed-locks', 'Locks & fencing'], ['pattern-contention', 'transfer', 'Chubby'], ['core-concepts', 'prologue', 'Leases']],
  'Top-K / leaderboard': [['pattern-timeseries', 'sketch-leaderboard', 'Leaderboard'], ['pattern-timeseries', 'top-k', 'Top-K'], ['pattern-timeseries', 'count-min', 'Count-Min']],
  'Stock exchange / Robinhood': [['pattern-contention', 'serialize', 'One line, one writer'], ['pattern-contention', 'transfer', 'Exchange']],
  'Food delivery (DoorDash)': [['pattern-geospatial', 'transfer', 'DoorDash'], ['pattern-geospatial', 'matching', 'Matching'], ['pattern-async-jobs', 'state-machine', 'Order state machine']],
  'Google Maps / routing': [['pattern-geospatial', 'eta-routing', 'Routing'], ['pattern-geospatial', 'transfer', 'Maps']],
  'Zoom / video conf': [['pattern-realtime', 'family', 'Zoom (SFU/MCU)'], ['pattern-realtime', 'transport', 'Transports']],
  'Flash sale': [['pattern-contention', 'transfer', 'Flash sale'], ['pattern-contention', 'waiting-room', 'Waiting room'], ['pattern-contention', 'atomic', 'Atomic stock update']],
  'ChatGPT / LLM inference serving': [['llm-inference', 'walkthrough', 'Full walkthrough'], ['llm-inference', 'batching', 'Continuous batching'], ['llm-inference', 'memory', 'KV cache']],
  'RAG / semantic search': [['rag', 'walkthrough', 'Full walkthrough'], ['rag', 'chunking', 'Chunking'], ['rag', 'hybrid', 'Hybrid search']],
  'Vector database': [['rag', 'ann', 'ANN indexes'], ['search', 'geo-vector', 'Vectors in search']],
  'AI agent platform / LLM gateway': [['llm-gateway', 'walkthrough', 'Full walkthrough'], ['llm-gateway', 'agents', 'Agent platform'], ['llm-gateway', 'token-limits', 'Token limits']],
  'Feature flag / experimentation': [['feature-flags', 'walkthrough', 'Full walkthrough'], ['feature-flags', 'bucketing', 'Sticky bucketing'], ['feature-flags', 'experiments', 'Experiments']],
  'Distributed tracing': [['pattern-timeseries', 'family', 'Tracing'], ['llm-gateway', 'observability', 'OTEL & sampling']],
  'Recommendation (two-tower)': [['recsys', 'two-tower', 'Two-tower'], ['recsys', 'candidates', 'Candidates'], ['recsys', 'features', 'Feature store']],
};

export const PAPERS =
  'Tier 6 — Staff-level stretch: Dynamo · Cassandra · Kafka · Bigtable · GFS · HDFS · Chubby · ZooKeeper · Spanner. One paper/week in Act IV, extract the one key idea each.';
