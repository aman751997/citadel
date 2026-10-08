import { row, step } from '../../lib/trace.ts';

export const scoping = [
  step('Iris says: "Suggestions should be personal, trending, multilingual, typo-tolerant and instant." It is minute four. What do you write under functional requirements?', [], 2, [
    ['All five, as core features', 'Five features means five deep dives you will never reach. Typo tolerance and personalization each change the index; promising them all spends the clock before you draw a box.'],
    ['Only "return suggestions", and ask nothing', 'Too thin. How many suggestions, ranked by what, how fresh? Those answers decide the index, the pipeline and the cache.'],
    ['Top 10 completions per keystroke ranked by popularity with recency, trending within minutes; personalization and typo tolerance as stretch goals', 'Right. The core is a popularity-ranked prefix completion with a freshness rule. Naming stretch goals out loud shows you saw them and chose not to start there.'],
  ]),
  step('Which non-functional requirement shapes this design most?', [], 0, [
    ['p99 under 100 ms from keystroke to painted suggestions, availability over consistency', 'Right. The 100 ms forces a precomputed in-memory answer and edge caching; availability over consistency lets every replica serve a slightly stale index instead of an error.'],
    ['Strong consistency: every user sees the same list at the same moment', 'Nobody can tell whether a suggestion list is a minute old. Paying for consistency here buys nothing and costs availability.'],
    ['Durability of the suggestion index', 'The index is derived data. If it is lost, you rebuild it from the logs. The logs need durability; the index needs speed.'],
  ]),
];

export const estimate = [
  step('100M daily users, 5 searches each, about 10 keystrokes per search, peak = 3 × average. What is the peak keystroke rate?', [], 1, [
    ['About 58,000 per second', 'That is the daily average: 5 billion ÷ 86,400 ≈ 57,870/s. Peak is three times that.'],
    ['About 175,000 per second', 'Right. 100M × 5 × 10 = 5 billion keystrokes a day ≈ 57,870/s average, × 3 ≈ 173,600/s at peak.'],
    ['About 1.7 million per second', 'Ten times too high. Check the seconds in a day: about 86,400, not 8,640.'],
  ]),
  step('The client debounces, cancels superseded requests and filters locally when it already holds the full list, cutting 10 keystrokes to about 6 requests per search. The edge answers 40% of those. What reaches the origin at peak?', [], 2, [
    ['About 104,000 per second', 'That is the peak after the client tricks: 500M × 6 ÷ 86,400 × 3 ≈ 104,200/s. The edge has not taken its share yet.'],
    ['About 42,000 per second', 'That is what the edge absorbs (40%). The origin sees the other 60%.'],
    ['About 62,500 per second', 'Right. 104,200 × 0.6 ≈ 62,500/s. At a conservative 5,000 requests a second per node, that is about 13 nodes of capacity worldwide.'],
  ]),
];

export const contract = [
  step('Which response headers belong on GET /v1/suggest?q=ca&locale=en-US for an anonymous user?', [], 1, [
    ['Cache-Control: no-store', 'That throws away the cheapest win in the design: the same short prefixes are asked millions of times an hour and the answer barely changes.'],
    ['Cache-Control: public, max-age=300, stale-while-revalidate=60, stale-if-error=86400', 'Right. Five minutes bounds how stale trending can be at the edge; stale-while-revalidate hides refreshes; stale-if-error keeps suggestions on screen if the origin is down.'],
    ['Cache-Control: public, max-age=31536000, immutable', 'A year is for fingerprinted files. Suggestions change with every build and every trend; an immutable year would freeze them.'],
  ]),
  step('A signed-in user’s response includes their own recent searches. How is it cached?', [], 0, [
    ['Keep the cacheable global list separate; the personal part is private, no-store, or merged on the device', 'Right. One user’s history must never land in a shared edge cache. Split the response: public global list, private personal part.'],
    ['Same public headers: the CDN keys on the URL, so it is fine', 'The URL does not contain the user. The next person typing "ca" at that edge would see someone else’s searches.'],
    ['Add Vary: Cookie', 'That makes every user a separate cache entry, so the hit ratio collapses — and one misconfigured CDN rule away from leaking. Separate the private part instead.'],
  ]),
];

export const indexChoice = [
  step('10M queries of about 20 characters. Every prefix stored as a key-value row holding its top 10 as strings (about 220 B a row), prefixes capped at 10 characters. Upper bound on size?', [
    row('Inputs', ['10M queries', '≤ 10 prefixes each', '220 B per row']),
  ], 1, [
    ['About 2.2 GB', 'That is the bound for 1M queries. Here there are 10M queries, so up to 100M prefix rows.'],
    ['About 22 GB', 'Right. At most 10M × 10 = 100M rows × 220 B = 22 GB, before per-key overhead in the store. Real prefix counts are lower because prefixes are shared — but say the bound.'],
    ['About 220 GB', 'Ten times too high. The cap at 10 characters limits each query to 10 prefixes.'],
  ]),
  step('Why can a node’s top-K list be built from only its children’s top-K lists, not their whole subtrees?', [], 2, [
    ['Because children never share queries', 'True, but not the reason. Disjoint subtrees alone do not tell you a child’s 11th-best query cannot win at the parent.'],
    ['It cannot — the parent must scan its subtree', 'It can. That is what makes the bottom-up build linear in the number of nodes times K log K.'],
    ['A query outside its child’s top K is beaten by K queries in that same child, so it can never make the parent’s top K', 'Right. Those K better queries are also candidates at the parent, so the 11th-best of any child is always crowded out.'],
  ]),
  step('Sellers want autocomplete over their own listing titles, filtered by category. Which machine?', [], 0, [
    ['Edge n-grams on the title field in the search index, filtered by seller and category', 'Right. That is completion over documents with filters — a search query. The global trie holds everyone’s popular queries and knows nothing about sellers.'],
    ['The global top-K trie', 'Its lists are global popularity. It cannot filter by seller or category without a separate trie per seller and category.'],
    ['A prefix→top-K row per seller in the KV store', 'Possible for a handful of sellers, but filters multiply the rows by every category combination. The search index already filters.'],
  ]),
];

export const pipeline = [
  step('Half-life 7 days. Query A: 1,000 searches every day for 28 days. Query B: 7,000 searches, all today. Who ranks higher in tonight’s build?', [
    row('Daily decay', ['× 0.906 per day', '0.906 = 2^(−1/7)']),
  ], 0, [
    ['A, about 9,940 against 7,000', 'Right. A = 1,000 × (1 + 0.906 + 0.906² + …) over 28 days ≈ 9,944. B = 7,000 at age zero. A steady favourite beats one day’s spike; the trending layer is how B shows up early.'],
    ['B, because recent counts always win', 'Decay discounts old days, it does not delete them. Four weeks of steady interest still add up to more.'],
    ['They tie at 28,000 against 7,000', '28,000 is A without decay. With a 7-day half-life the older days count much less.'],
  ]),
  step('A query is searched 400 times — all by one user. Should it be suggestible?', [], 1, [
    ['Yes, 400 is above the minimum count', 'Count alone lets one person (or one bot) put their private text into everyone’s search box. That is the prologue’s incident.'],
    ['No: require a minimum number of distinct users, not just searches', 'Right. A k-distinct-users threshold keeps one person’s name, phone number or address out of other people’s suggestions, and makes manipulation by a single account useless.'],
    ['Yes, but only for that user', 'That is personalization — their own history, on their own device. The global index still must not learn it.'],
  ]),
  step('A court orders one suggestion removed today. The next build is at 03:00. What lets you comply now?', [], 2, [
    ['Rebuild the index immediately', 'A full rebuild takes the pipeline’s whole run, and the edge still holds the old list for its TTL.'],
    ['Wait for the next build', 'An urgent removal cannot wait hours.'],
    ['A small denylist checked at serve time, plus a purge of the affected prefixes at the edge', 'Right. The serving layer filters denied suggestions before responding (backfilling from a slightly longer stored list), and the CDN purge clears cached copies. The next build drops it for good.'],
  ]),
];

export const budget = [
  step('The p99 budget is 100 ms from keystroke to paint. Debounce 30, network to edge 20, edge to origin 20, service 5, render 10. How much headroom is left?', [
    row('Budget (ms)', [30, 20, 20, 5, 10, '?'], { 5: 'LEFT' }, { tones: { 5: 'hot' } }),
  ], 1, [
    ['5 ms', 'Add again: 30 + 20 + 20 + 5 + 10 = 85.'],
    ['15 ms', 'Right. 100 − 85 = 15 ms for p99 jitter. An edge hit skips the 20 ms to the origin, landing around 60 ms.'],
    ['35 ms', 'That forgets the edge-to-origin hop. Misses pay it.'],
  ]),
  step('Product asks for a 200 ms debounce "to save servers". What do you say?', [], 2, [
    ['Great — it halves the request rate', 'It may cut requests, but it spends twice the whole budget before the request even leaves the phone.'],
    ['Fine, if the servers get faster to compensate', 'The servers already take about 5 ms. You cannot win back 170 ms from a 5 ms step.'],
    ['It breaks the 100 ms promise on its own; keep debounce short and save requests with cancellation, client caching and the edge instead', 'Right. Debounce is a latency-versus-load knob, and in typeahead the latency side is the requirement.'],
  ]),
];

export const scaleOut = [
  step('The whole index is about 1.5 GB. You need 13 nodes of throughput. Shard by prefix range, or replicate?', [], 0, [
    ['Replicate the whole index on every node', 'Right. It fits in memory many times over, so every node answers every prefix: no routing, no hot shard, and losing a node loses no data. Shard only when it stops fitting.'],
    ['Shard by first letter, one letter per node', 'Every request starting with "s" lands on one node, and 26 letters do not spread evenly. Sharding solves a capacity problem you do not have.'],
    ['Shard by hash of the full query', 'A prefix lookup must find all completions of that prefix in one place. Hashing whole queries scatters them.'],
  ]),
  step('Years later the index is 300 GB across 40 locales. How do you split it?', [], 1, [
    ['Hash the prefix across 26 shards', '26 shards by letter is the skew problem again, and hashing prefixes only works if you store prefixes as keys (the KV table design).'],
    ['By locale first; then, for a locale that outgrows a node, by prefix range cut by traffic, with hot ranges replicated more', 'Right. Locale is a natural partition — a query never crosses it. Range cuts follow traffic, not the alphabet: "s" may need its own shards while "x–z" share one.'],
    ['One giant node with 512 GB of RAM', 'It might fit, but a single node is a single failure, and you still need replicas for throughput in every region.'],
  ]),
];

export const fresh = [
  step('A storm named Odile makes landfall at 14:05. The last batch build ran at 03:00. When can "odile" appear in suggestions?', [], 2, [
    ['At 03:00 tomorrow', 'That is the batch-only design. For breaking events, a day late is useless.'],
    ['Immediately, by updating the trie in place on every search', 'Live updates on every replica, on the hottest nodes, under read load, is exactly the write path you moved offline. And decreases cannot be applied to top-K lists in place.'],
    ['Within minutes, via a streaming trending layer merged with the batch list at query time', 'Right. A stream job finds queries whose recent rate far exceeds their baseline and pushes a small trending set to serving nodes every minute.'],
  ]),
  step('Merging at query time: the batch list for "od" is full (10 items). Trending has "odile". How should it enter?', [], 1, [
    ['Append it as item 11', 'The response has 10 slots. An 11th is never shown.'],
    ['Reserve at most 1–2 slots for trending items that clear a threshold, de-duplicated against the batch list', 'Right. Freshness gets a guaranteed place without letting a burst of noise take over the whole list.'],
    ['Replace the whole list with trending items', 'Trending is noisy and short-lived. The batch list is still the best guess for most people typing "od".'],
  ]),
];

export const failure = [
  step('The nightly pipeline fails for the third night running. What do the serving nodes do?', [], 0, [
    ['Keep serving the last good snapshot and alert on index age', 'Right. Availability over freshness: a three-day-old suggestion list is nearly as good as today’s. An age alert makes sure someone fixes the pipeline.'],
    ['Stop serving until a fresh index exists', 'That trades a slightly stale list for no suggestions at all, for everyone.'],
    ['Fall back to querying the search cluster per keystroke', 'At 62,500 requests a second that would melt the search cluster, which serves the real searches.'],
  ]),
  step('A new build passes its size checks but every suggestion for "k" is now the same spam phrase. How should this have been caught?', [], 2, [
    ['Bigger blocklists', 'A blocklist catches words you predicted. This is a new phrase pushed up by coordinated searches.'],
    ['Users will report it', 'By then millions of people have seen it.'],
    ['Distinct-user thresholds and bot filtering in aggregation, golden-prefix checks and a canary before the swap, and instant rollback to the previous snapshot', 'Right. Defence in depth: stop manipulation upstream, diff the new build against the old on known prefixes, roll out to one node first, and keep the previous snapshot loaded so rollback is one swap.'],
  ]),
];

export const drills = [
  step('Which opening for "Design typeahead" scores best?', [], 1, [
    ['"I’ll use a trie."', 'A data structure is not a design. Requirements, numbers and the offline/online split come first.'],
    ['"Top 10 completions per keystroke by decayed popularity, trending within minutes, p99 under 100 ms, stale over unavailable — then the numbers."', 'Right. One breath: output, ranking, freshness, latency, consistency stance.'],
    ['"Elasticsearch with a prefix query."', 'It answers a different question (documents) at search-cluster latency, on every keystroke.'],
  ]),
  step('Where does the work of ranking happen?', [], 0, [
    ['Offline, in a batch build of top-K lists; the read path is a lookup', 'Right. Pay at build time, read in microseconds — the same trade as a materialized view.'],
    ['At query time: walk the subtree and sort', 'Correct output, wrong cost: for "s" that is a huge subtree on every keystroke.'],
    ['In the client', 'The client can re-rank a small list (personal history), but it cannot rank the world’s queries.'],
  ]),
  step('Why is the whole index replicated instead of sharded?', [], 2, [
    ['Sharding is always slower', 'Not always. Sharding is needed when data stops fitting; it is just not needed here.'],
    ['Replication is cheaper to build', 'Both build from the same pipeline. The question is fit and skew.'],
    ['About 1.5 GB fits in every node’s memory, so replicas avoid routing and hot-prefix skew; the cluster exists for throughput and availability', 'Right. Capacity says one node; throughput and availability say many copies.'],
  ]),
  step('How do you keep one user’s private search out of everyone’s suggestions?', [], 1, [
    ['A profanity filter', 'Profanity is a different problem. A phone number is not profane.'],
    ['A minimum number of distinct users per suggestion, plus PII pattern filters, before the build', 'Right. k-distinct-users is the core rule; pattern filters (emails, phone numbers, ids) catch what slips through.'],
    ['Encrypt the index', 'Encryption protects data from outsiders. Suggestions are shown to everyone by design.'],
  ]),
  step('What is safe to cache at the CDN edge?', [], 0, [
    ['Global suggestions for short normalised prefixes, keyed by locale and prefix, with a short TTL', 'Right. A few thousand short prefixes per locale carry a large share of traffic, and their answers are the same for everyone.'],
    ['Every response, including personalized ones', 'Personal history in a shared cache leaks to the next person with the same prefix.'],
    ['Nothing — suggestions change too often', 'They change hourly or daily; a few minutes of TTL is harmless and saves a large share of origin traffic.'],
  ]),
  step('The origin region goes down. What does a user typing "ca" see?', [], 2, [
    ['An error banner in the search box', 'Typeahead is an aid, not the product. Never show an error for it.'],
    ['Nothing ever again until the region returns', 'Traffic should fail over to another region; suggestions are replicated everywhere.'],
    ['Edge-cached lists (stale-if-error), then another region’s answers at higher latency; if all fails, no suggestions and search still works', 'Right. Degrade in steps, and the worst case is silent: an empty dropdown, never a broken search box.'],
  ]),
];
