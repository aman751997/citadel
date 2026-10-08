import { row, step } from '../../lib/trace.ts';

// Numbers used below (all checked by a throwaway script while writing the lesson):
// Kestrel Discover: 50M DAU × 12 requests/day = 600M requests/day ≈ 6,000/s (÷ 10^5), 18,000/s at 3× peak.
// Funnel: ~2,000 candidates → light ranker → 400 → heavy ranker. Peak heavy scores = 18,000 × 400 = 7.2M/s.

export const funnel = [
  step('Discover peaks at 18,000 requests per second and the corpus holds 100 million videos. If the heavy ranker scored every video for every request, how many scores per second would that be?', [], 2, [
    ['About 7 million', 'That is 18,000 × 400 — the heavy ranker’s load when it only sees the 400 survivors of earlier stages. Scoring everything is far bigger.'],
    ['About 1.8 billion', 'Off by a factor of a thousand. 18,000 × 100,000,000 = 1.8 × 10¹² — trillions, not billions.'],
    ['About 1.8 trillion', 'Right. 18,000 × 100M = 1.8 × 10¹² scores per second. No fleet on Earth runs a heavy model that often; that single multiplication is why the funnel exists.'],
  ]),
  step('Which stage should optimise for recall (“don’t miss anything plausibly good”) rather than precision?', [], 0, [
    ['Candidate generation', 'Right. Retrieval only has to make sure the good items are somewhere in the few thousand it returns. The ranker can sort out the order — but it can never rank an item retrieval missed.'],
    ['The heavy ranker', 'The heavy ranker spends its compute on getting the order of a few hundred items exactly right. That is precision.'],
    ['The re-ranker', 'Re-ranking applies page-level rules (diversity, freshness, policy) to an already-ordered list. It neither finds new items nor scores them.'],
  ]),
];

export const sources = [
  step('A user watched three cat videos in the last two minutes. Which candidate source turns that into “more videos like these” most directly, without waiting for any batch job?', [], 1, [
    ['A nightly collaborative-filtering list for the user', 'Computed last night, it cannot know about the last two minutes.'],
    ['Item-to-item neighbours of the three recent videos, looked up now', 'Right. The neighbour lists are precomputed per item, but which items you look up is decided at request time — so the source reacts instantly to the session.'],
    ['The global trending list', 'Trending is the same for everyone in a region. It knows nothing about cats or this user.'],
  ]),
  step('A brand-new user opens the app for the first time. No history, no follows. Which sources can still produce candidates?', [], 2, [
    ['Collaborative filtering and item-to-item', 'Both need the user’s past interactions as input. There are none yet.'],
    ['Only the social graph', 'The user follows nobody yet; the graph source returns nothing.'],
    ['Trending/popular for their region and language, plus content matching the interests they picked at onboarding', 'Right. Popularity needs no personal history, and onboarding interests give content-based retrieval a starting point. Personal sources join in after the first few swipes.'],
  ]),
  step('Six sources each return up to 1,000 ids. Many ids appear in several lists. What does the merge step do first?', [], 0, [
    ['Union and dedupe, keep which sources found each id (as a feature), and cap each source with a quota', 'Right. One id ranked once; “found by three sources” is a useful ranking feature; quotas stop one noisy source from flooding the pool.'],
    ['Keep only ids that appear in every list', 'Intersection throws away almost everything and kills diversity: a niche video found by one source would never survive.'],
    ['Sort all 6,000 by each source’s own score', 'Scores from different sources are not on the same scale. Ordering is the ranker’s job.'],
  ]),
];

export const twoTower = [
  step('In two-tower retrieval, what is precomputed offline and what is computed per request?', [], 1, [
    ['Both towers run nightly; requests just read the results', 'Then the user vector would not reflect what the user did five minutes ago — the very signal that makes the feed feel alive.'],
    ['Item vectors offline into an ANN index; the user vector per request', 'Right. There are 100M items and they change slowly: compute once, index. There is one user per request and their state changes every swipe: one cheap forward pass at request time.'],
    ['Item vectors per request; user vectors offline', 'Backwards. Computing 100M item vectors per request is the whole-corpus problem again.'],
  ]),
  step('The team retrains the two-tower model and deploys the new user tower. The ANN index still holds item vectors from the old item tower. What happens?', [], 2, [
    ['Nothing much — embeddings are stable between versions', 'Nothing forces two training runs to put “cooking” in the same direction. Each run learns its own coordinate system.'],
    ['Latency rises because vectors must be converted', 'There is no conversion. The vectors are simply incomparable.'],
    ['Retrieval quality silently collapses: new user vectors are compared against item vectors from a different embedding space', 'Right. User tower and item index must share a model version. Build the new index alongside the old one and switch both together (blue/green), keyed by model version.'],
  ]),
  step('100M items, 128-dimensional float32 vectors. Roughly how much memory do the raw vectors take?', [], 1, [
    ['About 5 GB', 'Off by 10×. 100M × 128 × 4 bytes = 51.2 billion bytes.'],
    ['About 51 GB', 'Right. 100M × 128 × 4 B = 51.2 GB. Int8 quantisation cuts it to 12.8 GB, and the HNSW graph adds roughly another 13 GB — one big machine per replica, or a few shards.'],
    ['About 512 GB', 'Off by 10× the other way. Check: 128 × 4 = 512 bytes per vector, × 100M = 51.2 GB.'],
  ]),
];

export const scoring = [
  step('Score = 0.1 × E[watch seconds] + 10 × p(like) + 30 × p(share) − 50 × p(hide). Video C: 25 s, p(like) 0.01, p(share) 0.001, p(hide) 0.06. What is its score?', [
    row('C', ['25 s', 'like 0.01', 'share 0.001', 'hide 0.06']),
  ], 0, [
    ['−0.37', 'Right. 2.5 + 0.1 + 0.03 − 3.0 = −0.37. The hide penalty wipes out everything the watch time earned.'],
    ['2.63', 'That forgets the hide term: 2.5 + 0.1 + 0.03. The penalty is the point of the example.'],
    ['5.63', 'The hide term is subtracted, not added: −50 × 0.06 = −3.0.'],
  ]),
  step('A scores 3.76, B scores 2.85, C scores −0.37. Ranked by watch time alone (A 40 s, C 25 s, B 12 s), C would be second. What does the combined score change?', [
    row('Watch-time order', ['A 40 s', 'C 25 s', 'B 12 s'], { 1: 'BAIT' }, { tones: { 1: 'hot' } }),
    row('Combined order', ['A 3.76', 'B 2.85', 'C −0.37'], {}, { tones: { 2: 'out' } }),
  ], 1, [
    ['Nothing — watch time dominates the formula anyway', 'Watch time is one term. C’s 6% hide probability costs it 3.0 points and drops it to last.'],
    ['C, the clickbait, drops from second to last; B, the one people like and share, moves up', 'Right. Multi-objective scoring lets the product say what “good” means: watched, liked, shared — and not regretted.'],
    ['A falls because of its long duration', 'A still wins: 4.0 from watch time and only 0.5 hide penalty.'],
  ]),
  step('The p(like) model is miscalibrated: it predicts 0.10 on average for a bucket of videos that are actually liked 5% of the time. What does that do to the weighted sum?', [], 2, [
    ['Nothing, ranking only needs the order of p(like)', 'Order within one head would survive, but the sum mixes heads. A doubled p(like) doubles the like term’s weight relative to watch time and hides.'],
    ['It lowers every score equally', 'Overprediction raises the like term, and not equally: items with high predicted p(like) gain the most.'],
    ['The like term silently counts double, so the weights product chose no longer mean what they say', 'Right. Weighted sums of probabilities only work if each head is calibrated. Monitor predicted vs observed rates per head.'],
  ]),
];

export const rerank = [
  step('Page rule: no two adjacent videos from the same creator, and at most 2 per creator on a page of 5. The ranker’s order is below. Which video goes in slot 2?', [
    row('Ranked', ['a1', 'a2', 'b1', 'a3', 'c1', 'b2'], { 0: 'SLOT 1' }, { tones: { 0: 'done' } }),
  ], 1, [
    ['a2', 'a2 is the next highest, but slot 1 is already creator a. Two in a row breaks the adjacency rule.'],
    ['b1', 'Right. Walk down the ranked list and take the first video that breaks no rule: a2 is blocked (same creator as slot 1), b1 is fine.'],
    ['c1', 'c1 is allowed, but b1 is ranked higher and also allowed. The greedy walk takes the best legal item.'],
  ]),
  step('Slots so far: a1, b1, a2. Which video takes slot 4?', [
    row('Ranked', ['a1', 'a2', 'b1', 'a3', 'c1', 'b2'], {}, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
  ], 2, [
    ['a3', 'Two reasons it fails: slot 3 is creator a, and creator a already has 2 on the page.'],
    ['b2', 'Allowed, but c1 is ranked above it and is also legal.'],
    ['c1', 'Right. a3 is blocked twice over, c1 is next and legal. Slot 5 then takes b2, giving a1, b1, a2, c1, b2.'],
  ]),
];

export const latency = [
  step('Budget: 200 ms server p99. Allocated: 10 fetch user + 25 candidates + 5 filter + 20 features + 15 light rank + 60 heavy rank + 10 re-rank + 15 hydrate. How much headroom is left?', [], 1, [
    ['0 ms', 'Add it up: the stages total 160 ms.'],
    ['40 ms', 'Right. 10 + 25 + 5 + 20 + 15 + 60 + 10 + 15 = 160 ms, leaving 40 ms for network jitter, GC pauses and retries.'],
    ['60 ms', 'Recount: the stages total 160 ms, not 140.'],
  ]),
  step('Six candidate sources run in parallel. Each independently exceeds 25 ms 1% of the time. How often does at least one of them run late?', [], 2, [
    ['1%', 'That is one source. The request waits for the slowest of six.'],
    ['6% exactly', 'Close but not exact: it is 1 − 0.99⁶. The rare overlaps are counted only once.'],
    ['About 5.9%', 'Right. 1 − 0.99⁶ ≈ 0.0585. Waiting for every source makes one request in seventeen slow, so give each source a timeout and rank whatever arrived in time.'],
  ]),
  step('The heavy ranker is down. What should the feed do?', [], 0, [
    ['Serve a degraded feed: light-ranker order, or a cached popular list for the region, and alert', 'Right. A slightly worse feed beats an error screen. Every stage needs a fallback that skips it.'],
    ['Return an error until the ranker recovers', 'The feed is the product. An empty screen loses the session; a less personal one rarely does.'],
    ['Retry the ranker until it answers', 'Retries against a dead dependency stack up, blow the budget for every request, and add load to whatever is recovering.'],
  ]),
];

export const features = [
  step('Which of these is a cross feature?', [], 2, [
    ['The video’s like rate over the last hour', 'That describes the item alone. Every user sees the same value.'],
    ['The user’s preferred language', 'That describes the user alone.'],
    ['How many of this creator’s videos the user watched to the end in the last 30 days', 'Right. It depends on the pair (user, creator). Cross features are often the strongest signals a ranker has.'],
  ]),
  step('“Video’s like rate in the last 10 minutes” — where should it be computed?', [], 1, [
    ['In the nightly batch job', 'Nightly is up to 24 hours stale. A 10-minute window must be updated continuously.'],
    ['By a stream processor reading the event log, written to the online store', 'Right. Windowed counters over the event stream — the time-series pattern — keep it seconds fresh.'],
    ['At request time, by scanning the video’s recent events', 'Scanning raw events for 2,000 candidates per request is far too slow. Precompute the counter.'],
  ]),
];

export const skew = [
  step('A training row is an impression served at 10:00 on Monday. The job builds it on Friday and joins today’s “video like count” to it. What goes wrong?', [
    row('Timeline', ['Mon 10:00 served', 'Mon–Fri likes pile up', 'Fri join: count = today'], { 2: 'LEAK' }, { tones: { 2: 'hot' } }),
  ], 1, [
    ['Nothing, the like count only grows', 'That is the problem: it grew partly because of impressions like this one. The model learns from information it will not have at serving time.'],
    ['Label leakage: the feature includes the future, so offline metrics look great and online results disappoint', 'Right. Features must be joined as of the impression time — a point-in-time join, or simply log the feature values the server actually used.'],
    ['Training crashes on the newer schema', 'Nothing crashes. Leakage is silent; you only see it as an offline-online gap.'],
  ]),
  step('What is the most robust way to make training features match serving features exactly?', [], 0, [
    ['Log the feature vector the ranker actually used with each impression, and train on those logs joined to later labels', 'Right. “Log and wait” makes skew impossible by construction: training sees exactly what serving saw. The cost is storage and a delay before new features have history.'],
    ['Write the feature logic twice, carefully, once in SQL and once in the service', 'Two implementations drift. This is how skew happens in the first place.'],
    ['Retrain more often', 'Fresher models trained on skewed features are still skewed.'],
  ]),
];

export const realtime = [
  step('A user skips three dog videos within two seconds each. What should change before their next request, five seconds later?', [], 2, [
    ['Nothing until tonight’s retrain', 'Then the next page is more dogs. The session is where short-video feeds win or lose.'],
    ['Retrain the ranker on those three events', 'Retraining takes minutes to hours and is a fleet-wide change. This is one user’s session.'],
    ['Session features (recent skips, recent topics) update in the online store, and the user tower reads them on the next request', 'Right. The model does not change; its inputs do. That is why the user vector is computed per request.'],
  ]),
  step('Match each component to its natural refresh rate. Which pairing is wrong?', [], 1, [
    ['Ranking model weights: hours to a day', 'That one is right. Retrains are heavy; daily is common, faster is possible with care.'],
    ['User vector: nightly', 'Right, that is the wrong pairing. The user vector is computed per request so it reflects the last few minutes.'],
    ['Streaming item counters: seconds to minutes', 'That one is right. Windowed counters update continuously.'],
  ]),
];

export const events = [
  step('The client logs a “click” only when a user taps a video. The training job has no negatives. What should the client also log?', [], 0, [
    ['Impressions: every video actually shown on screen, with position, so “shown and not engaged” becomes a negative', 'Right. Without impressions you cannot tell “ignored” from “never shown”. Log what was on screen, where, for how long.'],
    ['Nothing — sample random videos as negatives', 'Random unshown videos tell the model nothing about what users skip. Real negatives come from real impressions.'],
    ['Server-side responses only', 'The server knows what it sent, not what scrolled into view. Ten videos sent is not ten videos seen.'],
  ]),
  step('Videos in slot 1 get twice the engagement of slot 5, regardless of content. How should training treat position?', [], 2, [
    ['Ignore it', 'The model then credits the content for what the slot did, and keeps reinforcing whatever it already ranked first.'],
    ['Drop all impressions below slot 1', 'You would lose most of your data and still be biased.'],
    ['Log position, feed it as a training feature, and set it to a fixed value at serving time', 'Right. The model learns how much of engagement is position; at serving, every candidate gets the same position so only content differs. Exploration traffic helps too.'],
  ]),
];

export const coldStart = [
  step('A creator uploads a video one minute ago. No one has watched it. How does two-tower retrieval give it a vector?', [], 1, [
    ['It can’t — wait until it has 1,000 views', 'Then it never gets views: retrieval is the only door, and it is locked.'],
    ['The item tower uses content features (visual, audio, caption, creator), so it produces a vector as soon as those are extracted', 'Right. If the item tower only used an id embedding, new items would be invisible. Content features solve that; insert the vector into the index incrementally.'],
    ['Copy the vector of the creator’s most popular video', 'A rough prior at best; the new video may be about something else entirely.'],
  ]),
  step('Discover serves 6 billion impressions a day and gets 2 million uploads. Product reserves 5% of impressions for exploration. How many impressions can each new upload get, on average?', [], 0, [
    ['150', 'Right. 6B × 0.05 = 300M exploration impressions ÷ 2M uploads = 150 each — enough for a first read on whether it lands.'],
    ['15', 'Off by 10×: 300M ÷ 2M = 150.'],
    ['1,500', 'Off by 10× the other way: 300M ÷ 2M = 150.'],
  ]),
];

export const explore = [
  step('Thompson sampling with Beta(likes + 1, non-likes + 1). Video X: 3 likes in 10 views. Video Y: 300 likes in 1,000 views. Which is true?', [
    row('X', ['Beta(4, 8)', 'mean 0.333', 'wide']),
    row('Y', ['Beta(301, 701)', 'mean 0.300', 'narrow']),
  ], 2, [
    ['Y always wins: it has more evidence', 'More evidence makes Y’s distribution narrow, not higher. X’s mean is actually above Y’s.'],
    ['X always wins: its mean is higher', 'Each round draws a random sample from each distribution. X’s wide distribution often draws below 0.30.'],
    ['Each draws a sample; X wins about 57% of head-to-heads, Y the rest', 'Right. Uncertain X gets shown often enough to learn its true rate; if it is really worse, its distribution narrows and it stops winning. Exploration fades as evidence grows.'],
  ]),
  step('Epsilon-greedy with ε = 0.05 on a page of 10. On average, how many slots per page go to exploration?', [], 1, [
    ['5', 'That would be ε = 0.5.'],
    ['0.5', 'Right. 10 × 0.05 = 0.5: one explore slot every other page. Exploration is a budget, and this is its size.'],
    ['1, always', 'ε-greedy is random per slot; on average 0.5 per page, sometimes 0, sometimes 1 or 2.'],
  ]),
];

export const loops = [
  step('After a year, 1% of creators get 70% of impressions, and the model has almost no data about anyone else. Why does retraining not fix it?', [], 1, [
    ['The model is too small', 'A bigger model trained on the same data learns the same bias faster.'],
    ['The model trains only on what it chose to show; unshown items never produce labels, so the loop reinforces itself', 'Right. A feedback loop. Fixes change the data: exploration, logged propensities, popularity correction, diversity rules, and a small random holdout.'],
    ['Users really only like those creators', 'Maybe — but you cannot know, because you never showed them anything else. That is the point.'],
  ]),
  step('Which metric should be on the dashboard to catch this early?', [], 0, [
    ['Share of impressions going to the top 1% of creators, and the fraction of new uploads reaching 100 views', 'Right. Concentration and new-item reach are the vital signs of a feedback loop. Watch the trend, not just the level.'],
    ['Average click-through rate', 'CTR can rise while the catalogue collapses into a few creators. It hides the loop.'],
    ['Model training loss', 'Loss measures fit to the data you logged — the loop’s own output.'],
  ]),
];

export const evaluation = [
  step('Scores: positives 0.9 and 0.4; negatives 0.7, 0.3 and 0.2. What is the AUC?', [
    row('Positives', [0.9, 0.4], {}, { tones: { 0: 'done', 1: 'done' } }),
    row('Negatives', [0.7, 0.3, 0.2], {}, { tones: { 0: 'out', 1: 'out', 2: 'out' } }),
  ], 1, [
    ['0.67', 'Count all 2 × 3 = 6 pairs: 0.9 beats all three negatives, 0.4 beats two. That is 5 of 6.'],
    ['0.83', 'Right. AUC = the share of (positive, negative) pairs ordered correctly = 5/6 ≈ 0.83. Only 0.4 vs 0.7 is wrong.'],
    ['1.0', 'The positive 0.4 scores below the negative 0.7. One pair is out of order.'],
  ]),
  step('The ranker orders four videos with true relevance 2, 0, 3, 1 (top to bottom). Using DCG = Σ rel / log₂(position + 1), NDCG@4 is about…', [
    row('Ranked rel', [2, 0, 3, 1]),
    row('Ideal', [3, 2, 1, 0]),
  ], 2, [
    ['0.50', 'Compute both: DCG = 2 + 0 + 1.5 + 0.43 = 3.93; ideal = 3 + 1.26 + 0.5 + 0 = 4.76.'],
    ['0.98', 'That is what you would get by swapping only the bottom two of an otherwise ideal order. Here the best item sits in third.'],
    ['0.83', 'Right. 3.93 ÷ 4.76 ≈ 0.83. NDCG rewards putting the most relevant items at the top, with a log discount for each slot down.'],
  ]),
  step('A new ranker improves offline AUC from 0.780 to 0.786. The A/B test shows watch time flat and next-day retention slightly down. Ship it?', [], 0, [
    ['No: the online metrics and guardrails decide; investigate why offline and online disagree', 'Right. Offline metrics are a filter for what is worth testing. Retention is the goal, and a small offline gain often fails to transfer — or optimises something users don’t value.'],
    ['Yes: AUC is the most reliable metric', 'AUC measures ordering on logged data from the old system. It cannot see novelty, diversity or long-term satisfaction.'],
    ['Yes, but only for new users', 'Nothing in the result suggests new users benefit. Splitting the launch does not answer why retention fell.'],
  ]),
];

export const serving = [
  step('Kestrel has 80M monthly Discover users and 50M daily ones. Precomputing 500 candidate ids (8 bytes each) per monthly user, every night, stores how much — and how many of those lists go unread on a typical day?', [], 1, [
    ['200 GB; none wasted', '200 GB is the daily-active figure. Precomputing for everyone monthly-active is bigger, and 30M of them don’t open the app that day.'],
    ['320 GB; about 30M lists unread', 'Right. 80M × 500 × 8 B = 320 GB, and 80M − 50M = 30M users won’t read theirs. Precompute only what is expensive and slow-changing, for users likely to return.'],
    ['3.2 TB; about 50M unread', 'Off by 10×: 80M × 4,000 B = 320 GB.'],
  ]),
  step('A new HNSW index (new model version) finished building. How should it go live?', [], 2, [
    ['Overwrite the live index files in place', 'Readers would see a half-written index, and the user tower would be paired with the wrong item space during the copy.'],
    ['Restart all retrieval servers at once with the new files', 'A cold, simultaneous restart drops retrieval capacity to zero and has no rollback.'],
    ['Load it beside the old one, warm it, then switch traffic by model version together with the matching user tower — canary first, old index kept for rollback', 'Right. Blue/green by model version: the pair (user tower, item index) moves as one.'],
  ]),
];

export const safety = [
  step('A video is removed for policy at 14:00. It sits in thousands of cached candidate lists computed at 13:00. When must the filter run?', [], 0, [
    ['At serving time, after candidates are read from any cache — a final check against a live blocklist', 'Right. Caches are allowed to be stale about relevance, never about safety. The final filter reads a fast, fresh set of removed and restricted ids.'],
    ['Only when the candidate lists are recomputed tonight', 'The removed video would be served for up to 10 more hours.'],
    ['Only inside the ranker, as a feature', 'A feature lowers a score; it does not guarantee removal. Hard rules must be hard filters.'],
  ]),
  step('A user deletes their account. Which is NOT enough on its own?', [], 1, [
    ['Deleting their rows from the online feature store and their events from the lake on a deadline', 'That is part of the job — the deletion has to reach every derived store.'],
    ['Deleting their profile row and nothing else', 'Right, that is not enough. Their events, features, cached lists and training snapshots also hold their data, and each needs a deletion path.'],
    ['Excluding their data from future training sets', 'Also required. Models retrain on fresh data, so their influence ages out.'],
  ]),
];

export const drills = [
  step('Why two stages instead of ranking all 100M items with the good model?', [], 1, [
    ['Two models are more accurate than one', 'Accuracy is not the reason. A single perfect model would still be too slow to run 100M times per request.'],
    ['The ranker costs about a millisecond per item; 100M items would take hours per request. Cheap recall-oriented retrieval cuts 100M to about a thousand so expensive precision is spent where it matters', 'Right. The funnel is compute economics: filter cheap, then expensive — the same move as Bloom filter before disk, or ANN before re-rank in RAG.'],
    ['Regulatory separation of retrieval and ranking', 'No regulation requires it. It is about cost and latency.'],
    ['The item corpus doesn’t fit in one model', 'Model size is not the constraint. Per-request compute is.'],
  ]),
  step('Which is precomputed vs computed per request in two-tower serving, and why?', [], 1, [
    ['Both towers precompute nightly', 'The user vector would be a day stale; the feed would ignore the session.'],
    ['Item vectors precompute into an ANN index (items change slowly, there are 100M of them); the user vector computes per request (it must reflect the last 5 minutes of behaviour)', 'Right. Split by cardinality × freshness: many-and-slow goes to an offline index; one-and-fast-changing goes online.'],
    ['Both compute per request for freshness', 'Computing 100M item vectors per request is the problem the funnel exists to avoid.'],
    ['User vectors precompute; item vectors compute per request', 'Exactly backwards.'],
  ]),
  step('Training used “user 7-day clicks” from the warehouse; serving computes it slightly differently in Redis. Result and fix?', [], 1, [
    ['No effect — the model generalises', 'Models generalise across examples drawn from the same distribution. Skew changes the distribution.'],
    ['Training/serving skew: the model sees different feature distributions at serve time and silently underperforms. Fix: one feature definition consumed by both, or log served features and train on them', 'Right. Silent, no-error degradation — the nastiest failure class. The feature store’s reason to exist is one definition, two consumers.'],
    ['Serving crashes on schema mismatch', 'Nothing crashes. That is why it is dangerous.'],
    ['Only cold-start users are affected', 'Everyone with that feature is affected.'],
  ]),
  step('Retrieval returns 2,000 candidates. Offline, 4 of a user’s 5 held-out next watches are among them. What is recall@2000 for that user?', [], 2, [
    ['0.2', 'That is the miss rate: 1 of 5 was missed.'],
    ['0.002', 'Recall divides by the relevant items (5), not the returned ones (2,000).'],
    ['0.8', 'Right. 4 ÷ 5 = 0.8. Recall@k is the retrieval metric: what fraction of the good items made it into the pool the ranker will see.'],
  ]),
  step('Feed p99 jumps from 180 ms to 900 ms. Traces show one candidate source (a graph service) timing out. Best immediate change?', [], 0, [
    ['A per-source timeout: rank whatever arrived in time, and drop the slow source for that request', 'Right. Candidate sources are optional by design. The ranker can work with five of six.'],
    ['Increase the overall timeout to one second', 'That hides the problem by making every request as slow as the slowest source.'],
    ['Remove the heavy ranker to win back time', 'The ranker is not the slow part here. Cut the dependency that is.'],
  ]),
  step('An interviewer says: “Just cache each user’s recommendations for a day.” Your best response?', [], 2, [
    ['Agree — caching always helps', 'Caching a feed for a day ignores the session, the main signal in short video, and serves removed content unless filtered again.'],
    ['Refuse — feeds can’t be cached', 'Parts can be: item-to-item lists, item features, popular lists, the session’s ranked list.'],
    ['Cache what is expensive and slow-changing (neighbour lists, item embeddings, item features); compute the user vector and ranking per request; always re-filter at serve time', 'Right. Name what is cached and why, its TTL, and what is never trusted from cache — your caching four promises applied to a feed.'],
  ]),
];
