import { row, step } from '../../lib/trace.ts';

// Chapter 1 · The query that read everything
export const likeScan = [
  step('The listings table has a B-tree index on title. Which query can use it to jump straight to the matching rows?', [], 1, [
    ['WHERE title LIKE \'%lamp%\'', 'A leading wildcard means the match can start anywhere in the string. A B-tree is sorted by the whole string from its first character, so there is no place to start looking. The database reads every row.'],
    ['WHERE title LIKE \'lamp%\'', 'Right. A prefix pattern is a range in sorted order (everything from “lamp” up to just before “lamq”), so a B-tree can seek to it. In Postgres this needs the C collation or a text_pattern_ops index — but it is a seek, not a scan.'],
    ['WHERE lower(title) LIKE \'%lamp%\'', 'Lowercasing fixes case, not the leading wildcard. Worse, an index on title can’t serve lower(title) at all without an expression index. Still a full scan.'],
  ]),
  step('Kestrel Market has 50 million listings with about 1 KB of text each, and peaks at 2,000 searches per second. Roughly how much text would LIKE \'%lamp%\' read per second at peak?', [], 2, [
    ['About 50 GB per second', '50 GB is what ONE query reads (50,000,000 × 1 KB). Multiply by the query rate.'],
    ['About 2 TB per second', 'Close in spirit, but check the multiplication: 50 GB × 2,000 is 100,000 GB.'],
    ['About 100 TB per second', 'Right. 50 GB per query × 2,000 queries per second = 100,000 GB/s. No database does that. Even one query at an optimistic 2 GB/s takes 25 seconds.'],
  ]),
  step('Even on a tiny table, LIKE \'%lamp%\' gives poor results. Which of these is NOT one of its problems?', [], 3, [
    ['It matches “clamp” and “lampshade”', 'This IS a problem: substring matching ignores word boundaries. A search engine matches whole terms.'],
    ['“Lamps” and “lamp” don’t match each other', 'This IS a problem: no stemming. A search engine normalises both to the same term.'],
    ['It can’t order results by how relevant they are', 'This IS a problem: LIKE is a yes/no filter. Ranking needs term statistics the database doesn’t keep.'],
    ['It can return rows that were committed after the query started', 'Not a LIKE problem. Within a statement the database gives a consistent snapshot. The real problems are cost and quality, not consistency.'],
  ]),
];

// Chapter 2 · The back of the book
export const analysis = [
  step('Analyse “Two brass lamps for the desk” with: lowercase, split on spaces, drop stop words, strip plural “s”. Which terms reach the index?', [
    row('Raw tokens', ['Two', 'brass', 'lamps', 'for', 'the', 'desk'], { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }),
  ], 1, [
    ['two, brass, lamps, for, the, desk', 'That is only lowercasing. Stop words (“for”, “the”) should be dropped, and “lamps” should become “lamp”.'],
    ['two, brass, lamp, desk', 'Right. Lowercased, stop words gone, “lamps” → “lamp”. “Brass” keeps its double s: the plural rule must not strip it to “bras”.'],
    ['brass, lamp, desk', '“Two” is not a stop word in this list. Drop only what the analyzer is told to drop.'],
  ]),
  step('Postings (doc:position) for the three listings. A shopper searches “desk lamp” with every word required (AND). Which listings match?', [
    row('desk', ['d2:5', 'd3:1']),
    row('lamp', ['d1:2', 'd2:2', 'd3:2']),
  ], 2, [
    ['Only d3', 'That is the PHRASE answer (desk immediately before lamp). An AND query only needs both terms somewhere in the listing.'],
    ['d1, d2 and d3', 'That is OR. d1 has no “desk”.'],
    ['d2 and d3', 'Right. Intersect the doc lists: desk {d2, d3} ∩ lamp {d1, d2, d3} = {d2, d3}.'],
  ]),
  step('Now the shopper puts it in quotes: the phrase “desk lamp”. Which listings match?', [
    row('desk', ['d2:5', 'd3:1']),
    row('lamp', ['d1:2', 'd2:2', 'd3:2']),
  ], 0, [
    ['Only d3', 'Right. A phrase needs lamp at position desk + 1. d3 has desk@1, lamp@2. d2 has lamp@2 but desk@5 — both words, wrong order. Positions in the postings make this check possible without reading the documents.'],
    ['d2 and d3', 'd2 has both words, but “lamp” comes at position 2 and “desk” at 5. A phrase needs them adjacent and in order.'],
    ['None — stemming broke the phrase', 'Stemming happens at index time AND at query time with the same analyzer, so “lamp” in the query meets “lamp” in the index. d3 matches.'],
  ]),
];

// Chapter 3 · Which lamp first?
export const relevance = [
  step('One million listings. “lamp” appears in 20,000 of them, “brass” in 5,000. With idf ≈ ln(N / df), which word in the query “brass lamp” carries more weight?', [
    row('idf', ['lamp: ln(50) ≈ 3.9', 'brass: ln(200) ≈ 5.3']),
  ], 1, [
    ['“lamp” — it is the thing being bought', 'Relevance math doesn’t know which word is the noun. It knows “lamp” is four times more common, so matching it says less about a listing.'],
    ['“brass” — it is rarer, so matching it is more informative', 'Right. Rare terms separate documents; common terms barely do. A word in 90% of listings has idf ≈ 0.1 and contributes almost nothing.'],
    ['Equal — both words are in the query', 'Each query term is weighted by how rare it is in the corpus, not just by being present.'],
  ]),
  step('Under BM25 (k1 = 1.2, b = 0.75), a listing of average length says “lamp” once and scores 1.0 for term frequency. A seller stuffs “lamp” 100 times. What happens to that part of the score?', [
    row('tf part', ['tf 1: 1.00', 'tf 2: 1.38', 'tf 10: 1.96', 'tf 100: ?']),
  ], 2, [
    ['It rises about 100×', 'That is raw TF-IDF without saturation — exactly the keyword-stuffing hole BM25 closes.'],
    ['It rises about 10× (square-root damping)', 'Some old TF-IDF variants damp with a square root or log. BM25 saturates instead.'],
    ['It approaches a ceiling of k1 + 1 = 2.2 (about 2.17 at tf 100)', 'Right. tf × 2.2 / (tf + 1.2) can never exceed 2.2. And the stuffed listing is also much longer than average, so length normalisation pulls it down further.'],
  ]),
  step('Iris wants newer and more popular listings to rank higher, but never above a clearly better text match. Best approach?', [], 1, [
    ['Sort by created_at descending', 'That throws away relevance entirely: a brand-new listing for “lamp oil” beats a perfect “brass desk lamp” from yesterday.'],
    ['Multiply the text score by gentle boosts: a recency decay and a capped popularity factor', 'Right. Text relevance stays the base; recency and popularity nudge it. Cap and dampen them (log of sales, a decay with a half-life) so one viral listing can’t swamp the match.'],
    ['Put popular listings in a filter so only they are returned', 'A filter removes listings; it doesn’t order them. Less popular but highly relevant listings would vanish.'],
  ]),
];

// Chapter 4 · Many machines, one answer
export const cluster = [
  step('The listings index is about 70 GB per copy and you planned 3 primary shards. Peak search traffic doubles. What do you add?', [], 1, [
    ['More primary shards', 'Primaries split the DATA. Every search still visits one copy of every primary, so more primaries means more fan-out per query, not more throughput — and the primary count is fixed at index creation.'],
    ['More replicas (and nodes to hold them)', 'Right. Each search needs one copy of each shard; more copies means more nodes can share the queries. Replicas buy read throughput and availability.'],
    ['A bigger refresh interval', 'That reduces indexing overhead and makes new listings visible later. It doesn’t double query capacity.'],
  ]),
  step('Each shard is slow (over 200 ms) on 1% of requests, independently. A search fans out to 100 shards and waits for all of them. Roughly what fraction of searches are slow?', [], 2, [
    ['1%', 'That is one shard’s rate. The search is slow if ANY of the hundred is slow.'],
    ['About 10%', 'Still too low: 1 − 0.99¹⁰⁰ is much larger.'],
    ['About 63%', 'Right. 1 − 0.99¹⁰⁰ ≈ 0.634. With 3 shards it would be 1 − 0.99³ ≈ 3%. Fan-out amplifies the tail — one reason to keep shard counts modest.'],
  ]),
  step('Sellers search only their own listings (“my lamps”), thousands of times a second. Every one of those searches fans out to all shards. Cheapest fix?', [], 0, [
    ['Route documents by seller_id, so each seller’s listings live on one shard and their searches hit only that shard', 'Right. Custom routing turns a scatter-gather into a single-shard query. Watch for a giant seller making one shard hot.'],
    ['Give every seller their own index', 'Millions of tiny indexes means millions of shards. Per-shard overhead would sink the cluster.'],
    ['Cache every seller’s results in Redis', 'Unbounded keys (seller × query) with near-zero reuse. The hit ratio would be poor, and each new listing would need invalidation.'],
  ]),
];

// Chapter 5 · The listing that wasn't there
export const sync = [
  step('The listing service writes Postgres, then calls Elasticsearch. Two quick edits A then B commit in that order, but the ES calls land B then A. What does search show, and when does it heal?', [
    row('Timeline', ['DB ← A', 'DB ← B', 'ES ← B', 'ES ← A'], { 3: 'LAST' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['B — ES keeps the newest version automatically', 'ES keeps whatever was written last, unless you give it a version to compare. Here that is A.'],
    ['A, until the listing is edited again — there is no TTL to save you', 'Right. A cache heals at its TTL. A search index stays wrong until the document changes again. Dual writes need versioning, or better, a single ordered change stream.'],
    ['Neither — ES rejects the out-of-order write', 'Only if you send a version (external versioning) and ES finds it is not newer. Plain writes overwrite.'],
  ]),
  step('You switch to CDC: Postgres WAL → Kafka → indexer. What keeps a replayed or late event from overwriting newer data?', [], 2, [
    ['Kafka guarantees each event is delivered exactly once', 'Consumers can still see an event twice (a crash before committing the offset) and you will replay on purpose during reindexing. Don’t rely on exactly-once delivery.'],
    ['Refreshing the index after every event', 'Refresh controls when writes become searchable. It doesn’t decide which write wins.'],
    ['Partition the topic by listing_id and index with an external version (the row’s log position or a version column)', 'Right. Per-listing ordering within a partition, plus “only accept a strictly newer version”, makes duplicates and replays harmless.'],
  ]),
  step('You need a new analyzer for the title field. Existing postings were built with the old one. How do you ship it with zero downtime?', [], 1, [
    ['Update the mapping in place; old documents pick it up', 'Postings already on disk were built by the old analyzer. Changing how a field is analysed requires reindexing those documents.'],
    ['Build listings_v2 from the source, keep it fed from the change stream, verify, then atomically move the alias “listings” to v2', 'Right. Clients only know the alias. Record the stream position before the backfill, replay from it into v2, compare counts and sample queries, flip the alias, and keep v1 for rollback.'],
    ['Delete the index at 3 a.m. and rebuild quickly', 'Search is down or empty for the whole rebuild — about 40 minutes at 20,000 documents per second for 50 million listings.'],
  ]),
];

// Chapter 6 · Page five hundred
export const pagination = [
  step('3 shards, 20 results per page. With from/size, how many (id, score) entries must the coordinator sort to serve page 500?', [
    row('from + size', ['page 1: 20', 'page 500: 10,000']),
  ], 2, [
    ['20 — one page', 'The coordinator can’t know which 20 are 9,981st–10,000th overall without each shard sending its own top 10,000.'],
    ['10,000', 'That is per shard. There are three shards.'],
    ['30,000, to return 20', 'Right. Each shard returns its top from + size = 10,000; the coordinator merges 3 × 10,000 = 30,000 entries and throws away all but 20. Page 501 (from + size = 10,020) is refused by Elasticsearch’s default 10,000-hit window.'],
  ]),
  step('A partner wants to export all 2 million listings that match “furniture”. Best tool?', [], 1, [
    ['from/size with a raised max_result_window', 'Each page re-sorts everything before it; the last pages would ask every shard for its top two million. That is exactly what the window protects you from.'],
    ['search_after with a unique tiebreaker in the sort, inside a point-in-time', 'Right. Each page says “give me the next 1,000 after this sort key”, so each shard returns only 1,000. The point-in-time keeps the view stable while you page.'],
    ['One request with size = 2,000,000', 'Same cost as deep paging, in one huge response that can knock over the coordinating node.'],
  ]),
];

// Chapter 7 · Every keystroke is a query
export const typeahead = [
  step('Budget from keystroke to painted suggestions: 100 ms. Which design can’t fit?', [
    row('Budget', ['debounce 30', 'network 30', 'server 10', 'render 10', 'headroom 20']),
  ], 2, [
    ['Precomputed top-K in memory, served from the user’s region', 'This fits: a memory lookup is well under a millisecond, and the in-region round trip is the biggest cost.'],
    ['Hot short prefixes served from an edge cache', 'This fits even better: it removes the origin round trip for the most common requests.'],
    ['A full-text query to a search cluster in one central region', 'Right. A round trip across an ocean is often 100–200 ms by itself, and a scatter-gather adds its own tail. It blows the budget before anything is ranked.'],
  ]),
  step('The user types “l”, “la”, “lam” quickly. The response for “la” arrives AFTER the response for “lam”. What should the client show?', [
    row('Arrivals', ['sent: la', 'sent: lam', 'got: lam', 'got: la'], { 3: 'LATE' }, { tones: { 3: 'hot' } }),
  ], 0, [
    ['Keep the “lam” suggestions; drop the late “la” response', 'Right. Tag each request with the prefix (or a sequence number) and only paint the response that matches what is in the box now. Abort superseded requests when you can.'],
    ['Show the “la” suggestions — they arrived last', 'Last to arrive is not last typed. The user would see suggestions for text that is no longer in the box.'],
    ['Merge both lists', '“la” suggestions such as “ladder” no longer match what was typed. Only the current prefix’s list is valid.'],
  ]),
];

// Chapter 8 · A tree that already knows
export const trie = [
  step('Top-2 lists already sit on the children of node “ca”. Node “ca” is not a query itself. What is its top-2?', [
    row('car subtree', ['car 900', 'card 400']),
    row('cat subtree', ['cat 700', 'catalog 500']),
  ], 1, [
    ['car 900, card 400', 'That is only the “car” subtree. “cat” (700) beats “card” (400).'],
    ['car 900, cat 700', 'Right. Merge the children’s top-K lists (plus the node’s own query, if it is one) and keep the best K. Any query in the subtree’s top K must already be in some child’s top K, so the merge is enough.'],
    ['car 900, catalog 500', '“cat” at 700 beats “catalog” at 500.'],
  ]),
  step('A new phrase (“eclipse glasses”) is trending this hour. Your trie is rebuilt nightly from logs. Cheapest way to surface it today?', [], 2, [
    ['Update every ancestor node’s top-K synchronously on each search', 'Every search would write to every ancestor node (one per character of the query) on every serving replica, with locks on the hottest nodes. That is the cost the offline build exists to avoid.'],
    ['Rebuild the whole trie every minute', 'Aggregating all the logs and shipping a new trie every minute costs far more than the problem needs.'],
    ['A small streaming “trending” layer (recent counts, approximate top-K) merged with the trie’s list at query time', 'Right. The big trie stays offline and cheap; a short-window counter (a count-min sketch plus a heap works) supplies the few fresh phrases.'],
  ]),
];

// Chapter 9 · Three ways to answer a prefix
export const prefixStores = [
  step('A seller types into “search my listings” and wants completions from their OWN listing titles, filtered by category. Which tool fits?', [], 2, [
    ['A global trie of popular queries', 'Global popular queries aren’t this seller’s titles, and you can’t filter a precomputed global top-K by seller and category.'],
    ['A precomputed prefix table per seller and category', 'Millions of sellers × categories × prefixes — the precompute explodes, and most of it is never read.'],
    ['An edge n-gram field in the search index, queried with seller and category filters', 'Right. Index “lamp” as l, la, lam, lamp; a prefix becomes an ordinary term lookup, and filters work as usual. It costs extra index size, not a separate system.'],
  ]),
  step('You add an edge n-gram analyzer to the title field and use it for both indexing and searching. A user types “lam”. What goes wrong?', [
    row('Query grams', ['l', 'la', 'lam']),
  ], 1, [
    ['Nothing — that is how edge n-grams work', 'The index side is right. The query side is the bug.'],
    ['The query is also split into l, la, lam, so any title with a word starting with “l” matches', 'Right. Use the edge n-gram analyzer at index time only and a plain analyzer at search time, so the query stays the single term “lam”.'],
    ['Edge n-grams can’t match prefixes shorter than the whole word', 'They exist precisely to match prefixes. The problem is analysing the query the same way.'],
  ]),
];

// Chapter 10 · pizzza
export const fuzzy = [
  step('What is the Levenshtein distance from “lmap” to “lamp”, and does a fuzzy query with fuzziness 1 find it?', [
    row('Typed', ['l', 'm', 'a', 'p']),
    row('Meant', ['l', 'a', 'm', 'p']),
  ], 1, [
    ['Distance 1 — always found', 'Pure Levenshtein has no swap operation: fixing “ma” → “am” takes two substitutions.'],
    ['Distance 2 in Levenshtein, but 1 if transpositions count — Elasticsearch’s fuzzy query counts them by default', 'Right. Swapped neighbours are among the most common typos, so Damerau-style distance treats a swap as one edit. With transpositions on, fuzziness 1 finds it.'],
    ['Distance 4 — every position differs', 'Only positions 2 and 3 differ. Count the cheapest edits, not the mismatched positions.'],
  ]),
  step('Trigrams: “pizza” → {piz, izz, zza}; “pizzza” → {piz, izz, zzz, zza}. What is their Jaccard similarity?', [], 0, [
    ['3 / 4 = 0.75', 'Right. Shared trigrams: piz, izz, zza (3). Union: those plus zzz (4). A high overlap makes “pizza” a strong candidate without computing edit distance against every word.'],
    ['3 / 3 = 1.0', 'Every trigram of “pizza” is shared, but Jaccard divides by the union, which includes “zzz”.'],
    ['3 / 7 = 0.43', 'That divides by the sum of both sets (3 + 4). Jaccard divides by the union: 4 distinct trigrams.'],
  ]),
];

// Chapter 11 · Under fifty, in brass
export const facets = [
  step('“in stock” and “ships to my country” must hold for every result. Where do they go?', [], 0, [
    ['Filters: yes/no, no effect on score, cacheable', 'Right. Hard constraints are filters. They shrink the candidate set cheaply and their results can be cached as bitsets and reused across queries.'],
    ['Score boosts, so in-stock items rank higher', 'A boost still lets out-of-stock items appear, just lower. The user asked for a rule, not a preference.'],
    ['Post-processing in the app after fetching 20 results', 'If 15 of the 20 are out of stock, the page shows 5 results — and the next page is wrong too. Filter inside the engine, before ranking and paging.'],
  ]),
  step('The brand facet comes from a terms aggregation across 3 shards; each shard sends only its top 10 brands. What can go wrong?', [], 1, [
    ['Nothing — every shard sends its counts, so totals are exact', 'Each shard sends only its own top 10. A brand that is 11th on two shards and 1st on one can be undercounted or missed entirely.'],
    ['Counts can be approximate: a brand just outside one shard’s top 10 is missing from that shard’s contribution', 'Right. Per-shard top-N merging is approximate. Ask each shard for more buckets than you display (Elasticsearch’s shard_size) and treat facet counts as estimates.'],
    ['Facet counts include documents removed by the query', 'Aggregations run over the documents that match the query. The issue is the per-shard truncation.'],
  ]),
];

// Chapter 12 · Near me, and things like this
export const hybrid = [
  step('A shopper types the exact model code “BL-4471”. Which retrieval finds it most reliably?', [], 0, [
    ['Lexical (BM25) over an exact-match field', 'Right. Codes, SKUs and names are rare, exact tokens: BM25 gives them a huge idf. Embeddings blur them into “things that look like product codes”.'],
    ['Pure vector search on embeddings', 'Embeddings capture meaning, not exact identifiers. “BL-4471” and “BL-4417” may sit almost on top of each other.'],
    ['Fuzzy search with two edits', 'Two edits on a seven-character code turns up dozens of other codes. Exact identifiers want exact matching first.'],
  ]),
  step('Hybrid search with reciprocal rank fusion (k = 60). Listing A is #1 in BM25 and #5 in vector; listing B is #3 in BM25 and #1 in vector. Which ranks first?', [
    row('A', ['BM25 #1', 'vector #5']),
    row('B', ['BM25 #3', 'vector #1']),
  ], 1, [
    ['A — it won the keyword ranking', 'RRF adds both lists. A: 1/61 + 1/65 ≈ 0.03178. B: 1/63 + 1/61 ≈ 0.03227.'],
    ['B — 1/63 + 1/61 beats 1/61 + 1/65', 'Right. B ≈ 0.03227, A ≈ 0.03178. RRF rewards being near the top of both lists, and only needs ranks, so you never have to put BM25 and cosine scores on one scale.'],
    ['A tie — both have a #1', 'The other rank breaks it: #3 contributes more than #5.'],
  ]),
];

// Decision drills · the whole lesson, mixed
export const drills = [
  step('A seller creates a listing and immediately searches for it. It isn’t there; two seconds later it is. Bug?', [], 2, [
    ['Yes — the indexer lost the event and a retry found it', 'A lost event wouldn’t reappear by itself in two seconds. This is the designed lag.'],
    ['Yes — Elasticsearch should be strongly consistent', 'Search engines are near-real-time by design: a new segment becomes searchable at the next refresh.'],
    ['No — CDC lag plus the refresh interval (1 s by default); say it up front, and show the seller their own listing from the database', 'Right. Name the staleness before the interviewer finds it. For the author, read-your-own-writes comes from the source of truth (or a refresh=wait_for on that one write).'],
  ]),
  step('Design Twitter search. The interviewer asks: shard the index by term or by document?', [], 1, [
    ['By term — a query only touches the shards that own its terms', 'True for reads, but every tweet with 20 terms writes to up to 20 shards, multi-term queries ship big postings lists between shards, and a trending hashtag melts its shard.'],
    ['By document (and by time for tweets) — writes touch one shard, queries scatter-gather and merge', 'Right. Document partitioning keeps writes local and load even. Partitioning by time adds a win: most queries want recent tweets, so the newest index is small, hot and in memory.'],
    ['By user — all of a user’s tweets on one shard', 'Great for “search my tweets”, terrible for global search: every query still visits every shard, and celebrities create hot shards.'],
  ]),
  step('The product page shows “Page 1 of 4,200”. Iris wants a jump-to-last-page button. What do you say?', [], 0, [
    ['Cap the browsable depth (say, 50 pages) and use search_after cursors for next/previous; nobody reads page 4,200', 'Right. Deep from/size costs shards × (from + size) per page and hits the default 10,000-hit window. Cursors make “next” cheap but can’t jump; that is a product trade worth saying out loud.'],
    ['Raise max_result_window to 100,000', 'Each deep page would make every shard sort and send 84,000 entries. One bored user clicking “last” could hurt every other search.'],
    ['Cache every page of every query', 'Unbounded keys, almost no reuse, and stale the moment a listing changes.'],
  ]),
  step('Typeahead for 20 million daily users, 5 searches each, about 8 keystrokes per search, peak 3× average. Roughly what keystroke rate at peak, before any client-side savings?', [], 1, [
    ['About 9,000 per second', 'That is the AVERAGE: 800 million keystrokes ÷ 86,400 s ≈ 9,259/s. Peak is 3× that.'],
    ['About 28,000 per second', 'Right. 20M × 5 × 8 = 800M keystrokes per day ≈ 9,259/s average × 3 ≈ 27,800/s at peak. Debouncing and client caching cut the requests that actually leave the phone.'],
    ['About 2,800 per second', 'Check the units: 800 million per day is about 9,259 per second on average, and peak is higher, not lower.'],
  ]),
  step('Your trie’s top-K lists are ranked purely by raw search count. What will the interviewer poke at first?', [], 2, [
    ['Memory — tries are too big to fit in RAM', '1M popular queries × ~100 bytes is about 100 MB of raw data; even with top-K lists on every node it is around a gigabyte. It fits.'],
    ['Latency — walking to the node is too slow', 'Walking a 10-character prefix is 10 pointer hops in memory: microseconds.'],
    ['Safety and freshness: offensive or private queries, and last year’s hits outranking this week’s', 'Right. Filter suggestions (blocklists, a minimum number of distinct users per query so no one’s private search leaks), and decay counts over time so recent popularity wins.'],
  ]),
  step('“in stock” is implemented as a +10 boost so in-stock listings rank higher. A shopper filters by “in stock” and sees a sold-out lamp on page 2. Root cause?', [], 0, [
    ['A hard constraint was modelled as a ranking signal; it belongs in a filter', 'Right. Filters say yes or no; scores say “how good”. Mixing them lets a strong text match outscore the boost and leak through.'],
    ['The boost was too small; use +1,000', 'A bigger boost hides the bug until a stronger text match appears, and it distorts every other score.'],
    ['The index is stale', 'Staleness could explain one item, but the design guarantees leaks regardless of freshness.'],
  ]),
];
