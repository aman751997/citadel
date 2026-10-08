import { row, step } from '../../lib/trace.ts';

// Numbers in these steps were checked with a throwaway script (geohash encoder, haversine, cell sizes).

export const naiveIndex = [
  step('Kestrel Nearby runs `WHERE lat BETWEEN a AND b AND lng BETWEEN c AND d` with a B-tree index on lat. The box is 4 km on each side. Which rows does the index hand to the lng filter?', [], 2, [
    ['Only the rows inside the 4 km box', 'The lat index knows nothing about longitude. It cannot stop at the box’s east and west edges.'],
    ['Rows within 4 km of the user in any direction', 'An index on one column answers a one-dimensional range. "Within 4 km" is two-dimensional.'],
    ['Every row in a 4 km-tall strip that wraps the whole planet', 'Right. At latitude 13° that strip is about 39,000 km long, roughly 9,800 times longer than the box is wide. The lng filter then throws almost all of it away.'],
  ]),
  step('Theo suggests a composite B-tree index on (lat, lng). Does that fix it?', [], 1, [
    ['Yes — both columns are in the index now', 'Having both columns is not enough. The order of the columns decides what the index can seek on.'],
    ['No — after a range on lat, the index cannot seek on lng; it still walks the whole lat strip', 'Right. The phone-book rule: a range on the first column makes the second column unusable for seeking. You scan the strip, checking lng on each entry. Cheaper than reading rows, still the whole strip.'],
    ['Yes, if you also add an index on (lng, lat)', 'Now the planner picks one of the two strips. Each is still planet-wide.'],
  ]),
];

export const distance = [
  step('Two points in the same city: latitude 12.9716, longitude 77.5946 and latitude 12.9800, longitude 77.6100. Haversine gives about 1.912 km. What does the flat (equirectangular) approximation give?', [], 0, [
    ['About 1.912 km — the same to the metre', 'Right. Over a few kilometres the Earth is flat enough. Haversine matters across countries and near the poles; inside a city, the cheap formula is fine.'],
    ['About 2.4 km — it ignores the cos(latitude) shrink', 'The equirectangular formula multiplies the longitude difference by cos(latitude). That is exactly the shrink it accounts for.'],
    ['It cannot be used below 1,000 km', 'It is the opposite: the flat approximation is best at short distances and drifts at long ones.'],
  ]),
  step('Why not just compute the exact distance from the user to all 100 million places and keep the closest?', [], 1, [
    ['Haversine is inaccurate at scale', 'Haversine is accurate to well within what a "near me" query needs. Accuracy is not the problem.'],
    ['At tens of nanoseconds each, 100 million distances take seconds per query', 'Right. About 100,000,000 × 50 ns = 5 seconds of CPU for one search. Filter to a few cells first, then compute exact distance on a few hundred candidates.'],
    ['Distances can only be computed inside the database', 'Any service can do the arithmetic. The cost is doing it 100 million times.'],
  ]),
];

export const geohash = [
  step('Geohash encodes longitude first, then latitude, alternating. Longitude 77.5946: the first midpoint is 0. Latitude 12.9716: the first midpoint is 0. Next longitude midpoint is 90. What are the first three bits?', [
    row('Bit', ['1 · lng vs 0', '2 · lat vs 0', '3 · lng vs 90'], {}),
  ], 1, [
    ['0 1 0', 'A bit is 1 when the value is at or above the midpoint. 77.5946 ≥ 0, so the first bit is 1.'],
    ['1 1 0', 'Right. 77.5946 ≥ 0 → 1; 12.9716 ≥ 0 → 1; 77.5946 < 90 → 0. Ten bits later you have 11001 01100, which base32 spells "td".'],
    ['1 1 1', 'The third bit compares longitude with 90, the midpoint of the eastern half. 77.5946 is below it.'],
  ]),
  step('Two places have geohashes tdr1v9q and tdr1v9r. What can you conclude for certain?', [
    row('Geohash', ['t', 'd', 'r', '1', 'v', '9', 'q|r'], { 5: 'SHARED' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'done', 6: 'hot' } }),
  ], 0, [
    ['Both lie inside the same precision-6 cell, about 1.2 km × 0.6 km', 'Right. A shared prefix of length n means the same cell at precision n. That is the only guarantee the prefix gives.'],
    ['They are at most 150 metres apart', 'They share 6 characters, not 7. Inside a 6-character cell they can be about 1.3 km apart corner to corner.'],
    ['Points whose geohashes do not share this prefix are farther away', 'False, and it is the trap of the next chapter. A point 20 m away across the cell edge can have a different prefix.'],
  ]),
  step('Users search within 2 km. You want to read the user’s cell plus its 8 neighbours and be sure the circle is covered. Which precision?', [
    row('Precision', ['4', '5', '6', '7'], {}),
    row('Cell (equator)', ['39 × 19.5 km', '4.9 × 4.9 km', '1.2 × 0.6 km', '153 × 152 m'], {}),
  ], 1, [
    ['4', 'It covers the circle, but a 3 × 3 block of these cells is about 117 × 58 km. In a city you would refine a whole metro area’s worth of candidates for a 2 km question.'],
    ['5', 'Right. The rule: the cell’s shorter side must be at least the radius. 4.9 km ≥ 2 km, so the 3 × 3 block reaches at least one full cell beyond the user in every direction.'],
    ['6', 'The cell is only 0.6 km tall. A 3 × 3 block reaches as little as 0.6 km north or south of the user, short of 2 km. You would need a bigger ring of cells.'],
    ['7', 'Cells of about 150 m are far smaller than the radius; nine of them cover a few hundred metres at most.'],
  ]),
];

export const edges = [
  step('A café sits 22 m east of the user. The user’s cell is tdr1v9; the café’s is tdr1vc. The service queries only `geohash LIKE \'tdr1v9%\'`. What happens?', [
    row('Cells', ['tdr1v9 (user)', 'tdr1vc (café)'], { 0: 'QUERIED' }, { tones: { 0: 'done', 1: 'out' } }),
  ], 2, [
    ['The café is found — they share "tdr1v"', 'The query asked for prefix tdr1v9. tdr1vc does not start with it.'],
    ['The café is found if precision is raised to 7', 'Longer prefixes make cells smaller, so boundaries get closer, not farther. The miss gets more likely.'],
    ['The café is missed — it is across the cell edge', 'Right. Neighbouring cells can have different prefixes. Query the cell plus its 8 neighbours, then filter by exact distance.'],
  ]),
  step('You now read 9 cells at precision 5 for a 2 km radius. The 9 cells cover about 210 km²; the circle is about 12.6 km². What must happen to the candidates?', [], 1, [
    ['Return them all — they are all nearby', 'Most of the 3 × 3 block lies beyond 2 km; its corners are 7 to 14 km from the user. By area, about 94% of candidates are outside the circle.'],
    ['Compute the exact distance for each, drop those beyond 2 km, then sort', 'Right. Cells are a coarse filter; distance is the truth. Roughly 1 candidate in 17 survives at these sizes.'],
    ['Drop the 8 neighbour cells to save work', 'Then the café 22 m away across the edge is missed again.'],
  ]),
  step('Two points are 11 metres apart, one just north of the equator and one just south. Their 6-character geohashes are s0p058 and kpzpgx. What does this show?', [], 0, [
    ['Nearby points can share no prefix at all; only a shared prefix proves closeness, not the reverse', 'Right. The equator and the prime meridian are the first cuts, so points straddling them differ from the very first character. Neighbour lookup handles it; prefix matching alone never will.'],
    ['Geohash is broken at the equator', 'It works exactly as designed everywhere. Every cell edge behaves this way; the first cuts just make it dramatic.'],
    ['The points are far apart in the index, so the query is slow', 'Speed is not the issue. Correctness is: a prefix query would never see the other point.'],
  ]),
];

export const quadtree = [
  step('A quadtree splits a node into four when it holds more than 100 places. One downtown block has 5,000 cafés; a desert has 3 petrol stations. What does the tree look like?', [], 2, [
    ['Uniform depth everywhere, like geohash', 'That is a fixed grid. A quadtree only splits where a node overflows.'],
    ['Shallow downtown, deep in the desert', 'Backwards: crowded areas overflow and split; empty areas never do.'],
    ['Deep downtown with small cells, one big leaf over the desert', 'Right. Every leaf holds at most 100 places, so a query reads a similar amount of work anywhere on the map.'],
  ]),
  step('Kestrel’s 100 million places rarely move. The quadtree lives in memory on index servers. How do you keep it current?', [], 1, [
    ['Rebuild it on every place edit', 'A rebuild walks 100 million points. Doing that ten times a second is absurd.'],
    ['Apply the rare edits in place, rebuild periodically from the database, and run several replicas', 'Right. About 10 edits a second is easy to apply incrementally; a nightly rebuild from the source of truth repairs drift; replicas give throughput and a warm spare while one rebuilds.'],
    ['Store it in the database instead', 'The quadtree is in memory precisely because it serves thousands of reads a second at low latency. The database stays the source of truth it is built from.'],
  ]),
];

export const chooseIndex = [
  step('A new city-guide feature: 2 million places, a few hundred searches a second, already on Postgres. What index?', [], 0, [
    ['PostGIS with a spatial (GiST) index and ST_DWithin', 'Right. At this scale Postgres answers radius and nearest-neighbour queries directly. Knowing when not to build custom infrastructure is the senior signal.'],
    ['A custom in-memory quadtree service', 'It would work, and it is a new service to build, deploy and keep in sync for a load Postgres handles.'],
    ['Uber’s H3 with a custom matching engine', 'Nothing here moves and nothing is matched. H3 earns its place in supply-and-demand maths, not a static listing search.'],
  ]),
  step('Delivery zones are drawn as polygons. Given a customer’s point, which zones contain it?', [], 2, [
    ['Geohash prefix query on the zone’s centre', 'A polygon is not a point. A zone’s centre can be kilometres from the customer while the polygon still contains them.'],
    ['Haversine from the customer to every zone', 'Distance to a centre does not answer containment.'],
    ['An R-tree (e.g. PostGIS GiST) over zone bounding boxes, then an exact point-in-polygon check', 'Right. R-trees index shapes by bounding rectangles: filter by box, refine with the exact geometry — the same filter-then-refine move as cells and distance.'],
  ]),
  step('Surge pricing compares demand and supply area by area, smoothed with neighbouring areas. Which cell system fits most naturally?', [], 1, [
    ['Geohash squares', 'Workable, but a square has 4 edge neighbours and 4 corner neighbours at about 1.4 times the distance, so smoothing weights are uneven.'],
    ['H3 hexagons', 'Right. Every hexagon has 6 neighbours with centres at the same distance, so "this cell plus its ring" means the same thing everywhere.'],
    ['A quadtree', 'Quadtree cells change size as density changes, so a cell’s surge history would not line up from hour to hour.'],
  ]),
];

export const moving = [
  step('1 million drivers report their location every 4 seconds. How many location writes per second?', [], 2, [
    ['4 million', 'That multiplies by 4. Each driver writes once per 4 seconds, so divide.'],
    ['25,000', 'Off by ten. 1,000,000 ÷ 4 = 250,000.'],
    ['250,000', 'Right. 1,000,000 ÷ 4 = 250,000 writes per second, around the clock at peak, each overwriting the last.'],
  ]),
  step('Where should the latest driver positions live?', [], 1, [
    ['Postgres with a geohash column and index', 'Each update rewrites a row, its index entry and the WAL, then replicates — 250,000 times a second, to keep history nobody queries from there.'],
    ['In memory — Redis geo sets or a location service — keyed by region and cell, with staleness bounded by TTLs', 'Right. Only the latest position matters. 1M drivers × about 100 bytes ≈ 100 MB of raw data: memory is easy. The cluster is for throughput and availability.'],
    ['Kafka, and consumers query it', 'Kafka is a pipe, not an index. It is the right home for the history stream, not for "who is near this point right now".'],
  ]),
  step('A driver’s phone dies mid-shift. Its last position sits in a Redis sorted set, where individual members cannot have their own TTL. How do you stop matching a ghost?', [], 0, [
    ['Write into time-bucketed keys that expire, and check last-seen on each candidate before offering', 'Right. drivers:{cell}:{30-second bucket} with a 60-second TTL disappears on its own; the per-driver hash with a timestamp is the final check.'],
    ['Set a TTL on the whole city key', 'That expires every driver in the city at once, not the one who went silent.'],
    ['Ask the driver app to send a "going offline" message', 'A dead phone sends nothing. Staleness must be detected by silence, not by a goodbye.'],
  ]),
];

export const matching = [
  step('A rider requests a car. You have 40 candidate drivers from the nearby cells. How do you choose whom to offer?', [], 2, [
    ['The one with the smallest straight-line distance', 'Straight-line ignores rivers, one-way streets and traffic. The nearest dot may be 15 minutes away by road.'],
    ['Call the routing service for ETAs on all 40, every time', 'Correct but expensive: 600 requests/s × 40 = 24,000 routing calls a second.'],
    ['Shortlist about 10 by straight-line distance, get road ETAs for those, offer the best ETA', 'Right. Cheap filter, expensive refine — the same move as cells then haversine. 600 × 10 = 6,000 ETA calls a second.'],
  ]),
  step('Two riders, 50 m apart, request at the same instant. Both shortlists put driver D first. How do you stop D being assigned twice?', [
    row('Timeline', ['R1 picks D', 'R2 picks D', 'R1 hold D', 'R2 hold D'], { 3: '?' }, { tones: { 2: 'done', 3: 'hot' } }),
  ], 1, [
    ['Check D’s status, then set it to OFFERED', 'Both requests can read AVAILABLE before either writes. Check-then-set is the race itself.'],
    ['An atomic conditional hold — SET driver:D:hold NX with a 15-second expiry; the loser moves to its next candidate', 'Right. Exactly one SET NX succeeds. The expiry releases D if the offer is ignored or the matcher crashes.'],
    ['A database transaction around the whole matching function', 'It would serialise matching behind long locks, including the ETA calls. Make only the claim atomic.'],
  ]),
  step('The offer to D expires after 15 seconds with no answer. What happens?', [], 0, [
    ['The hold key expires, D is available again, and the rider’s request moves to the next candidate', 'Right. A hold without an expiry is a leak: one crashed matcher would park a driver forever.'],
    ['D is assigned anyway', 'An unaccepted ride sends a driver nowhere. The rider waits for a car that is not coming.'],
    ['The rider’s request fails', 'There are other candidates. Fail only when the shortlist is exhausted and a wider search finds no one.'],
  ]),
];

export const hotCells = [
  step('A 60,000-seat stadium empties; 6,000 people request rides within 30 minutes. What is the actual problem?', [], 2, [
    ['Request QPS — 6,000 requests will overload the matcher', '6,000 ÷ 1,800 s ≈ 3.3 requests per second. Trivial throughput.'],
    ['Location writes from the stadium cell', 'Writes scale with drivers, not riders. The stadium has few drivers — that is the problem.'],
    ['Every request sees the same few hundred drivers: demand far exceeds supply and requests race for the same holds', 'Right. Batch the matching in that area every couple of seconds, widen the search ring, and let surge pricing pull drivers in.'],
  ]),
  step('Location writes are sharded by city. One megacity has 60,000 online drivers. Is its shard in trouble?', [], 1, [
    ['Yes — one city cannot fit on one shard', '60,000 × ~100 bytes is about 6 MB. Capacity is not the issue.'],
    ['Not yet: 60,000 ÷ 4 = 15,000 writes/s, comfortable for one in-memory node; split by cell inside the city if it grows', 'Right. Shard by region first because queries stay within one; split a hot region by cell, and remember a query near a split must read both sides.'],
    ['Yes — shard by driver id instead', 'Then a "drivers near this point" query must ask every shard. Shard by where, because the query is by where.'],
  ]),
];

export const serving = [
  step('You want to cache "nearby restaurants". What is the key?', [], 1, [
    ['nearby:{lat}:{lng} — the user’s exact coordinates', 'Every user stands somewhere slightly different. Unbounded keys mean a hit ratio near zero.'],
    ['nearby:v1:{geohash6}:{category} — the places in one cell; a search reads the cells it needs and merges', 'Right. Keys are bounded and shared by everyone nearby, and a place edit invalidates exactly one cell key.'],
    ['nearby:{userId}', 'Results depend on where the user is, not who. This key goes stale the moment they walk a block.'],
  ]),
  step('Place A: 300 m away, 4.2 stars from 800 reviews. Place B: 1.5 km away, 4.8 stars from 12 reviews. Score = half (smoothed rating ÷ 5) + half e^(−distance in km). Smoothed rating uses a prior of 3.8 worth 50 reviews. Which ranks first?', [
    row('A', ['4.2★ × 800', '300 m'], {}),
    row('B', ['4.8★ × 12', '1.5 km'], {}),
  ], 0, [
    ['A, about 0.79 versus 0.51', 'Right. A smooths to (50 × 3.8 + 800 × 4.2) ÷ 850 ≈ 4.18; B to (190 + 57.6) ÷ 62 ≈ 3.99. Distance terms: e^−0.3 ≈ 0.74, e^−1.5 ≈ 0.22.'],
    ['B — 4.8 stars beats 4.2', 'Twelve reviews is thin evidence; smoothing pulls B to about 3.99. And B is five times farther away.'],
    ['A tie', 'Work the numbers: 0.5 × 4.18/5 + 0.5 × 0.74 ≈ 0.79 for A, and 0.5 × 3.99/5 + 0.5 × 0.22 ≈ 0.51 for B.'],
  ]),
];

export const drills = [
  step('Why can’t separate B-tree indexes on lat and lng answer "restaurants within 2 km" efficiently?', [], 1, [
    ['Floating-point comparison is slow', 'Comparisons are cheap. The problem is how many rows each index range returns.'],
    ['Each index narrows one dimension — the lat index returns a planet-wide strip; intersecting with lng still scans huge irrelevant sets', 'Right. Two one-dimensional indexes cannot answer a two-dimensional question. Say this failure first; the fix lands harder after it.'],
    ['B-trees cannot store coordinates', 'They store numbers perfectly well. They just order them along one line.'],
    ['It works fine — this is premature optimisation', 'At 100 million places, every query reads a strip around the planet. It does not work fine.'],
  ]),
  step('Your geohash query returns no drivers, but one is 200 m away. What happened?', [], 1, [
    ['The geohash precision is too coarse', 'Coarser cells would make the miss less likely, not more. The cause is the boundary.'],
    ['The driver is across a cell boundary; query the cell plus its 8 neighbours, then filter by exact distance', 'Right. The boundary problem is THE geohash follow-up. Attach "+8 neighbours" to geohash in your head as one unit.'],
    ['The driver’s location update was lost', 'Possible in general, but a 200 m miss with a fresh index is the textbook edge case.'],
    ['Geohashes don’t work near the equator', 'They work everywhere. Edges exist everywhere; the equator only makes them dramatic.'],
  ]),
  step('1M drivers send locations every 4 s. Where does this data live?', [], 1, [
    ['Postgres with an indexed geohash column', '250,000 index rewrites a second, each logged and replicated, to keep history nobody reads from there.'],
    ['An in-memory geo grid (e.g. Redis geo sets per region/cell) — latest position only, about 100 MB of raw data', 'Right. Ephemeral, hot, latest-only data belongs in memory. The estimate licenses the answer: compute it out loud.'],
    ['Elasticsearch with a geo_point mapping', 'Search engines are built for read-heavy indexes with periodic refresh, not 250,000 overwrites a second.'],
    ['Kafka, queried by consumers', 'Kafka is a pipe, not a queryable index. Use it for the history stream.'],
  ]),
  step('Kestrel’s 3-million-place catalogue is in Postgres; nearby searches run at 200 per second. What do you say first?', [], 2, [
    ['Build a quadtree service', 'Nothing here needs it yet. Custom infrastructure is a cost you justify with numbers.'],
    ['Move to Elasticsearch', 'A fine choice if you also need full-text relevance; not required for radius search at 200/s.'],
    ['PostGIS with a GiST index answers this; custom infrastructure starts when we outgrow it', 'Right. Knowing when not to build is senior signal.'],
  ]),
  step('Places are spread very unevenly: dense cities, empty deserts. You are building the index service yourself. Which structure adapts to density?', [], 0, [
    ['A quadtree — it splits only where nodes overflow', 'Right. Small cells downtown, one big leaf over the desert.'],
    ['Geohash at precision 7 everywhere', 'Fixed cells: downtown cells still hold thousands of places while desert cells sit empty.'],
    ['H3 at a single resolution', 'Also a fixed grid at one resolution. H3’s strength is uniform neighbours, not adaptive density.'],
  ]),
  step('Matching found driver D for two riders at once. What makes the assignment safe?', [], 1, [
    ['A read of D’s status before assigning', 'Two readers both see AVAILABLE. Check-then-act is the race.'],
    ['An atomic hold with expiry (SET NX PX, or a conditional update); the loser tries its next candidate', 'Right. Contention pattern meets geospatial: one atomic claim, an expiry so crashes release it.'],
    ['Assign to both and let the drivers sort it out', 'A driver can carry one ride. The second rider waits for a car that never arrives.'],
  ]),
  step('You cache nearby search results. Which design is both hit-friendly and easy to invalidate?', [], 0, [
    ['Cache each cell’s candidate list; a search reads the cells it needs and ranks per user', 'Right. Bounded keys, shared by everyone near that cell; a place edit deletes exactly one key.'],
    ['Cache each user’s final ranked result by exact coordinates', 'Unbounded keys and a hit ratio near zero, and an edit would need to find every result that included the place.'],
    ['Don’t cache — the index is fast enough', 'Maybe at low scale. Downtown queries repeat heavily, which is exactly what a cache is for.'],
  ]),
  step('"Design Google Maps directions." Which index from this lesson is the core?', [], 2, [
    ['Geohash with 8 neighbours', 'Geohash finds things near a point. Directions need the best path through a road network.'],
    ['A quadtree of roads', 'Spatial indexes help find the road segment you are standing on. They do not find routes.'],
    ['None — routing is a graph shortest-path problem (Dijkstra, A*, contraction hierarchies)', 'Right. Say out loud that this is not a proximity-index question; then use spatial indexing only to snap points to the road graph.'],
  ]),
];
