import { row, step } from '../../lib/trace.ts';

// Interview-scale numbers used throughout the lesson (verified by script):
// 200M DAU × 10 timeline opens = 2B reads/day → 20,000/s avg → 60,000/s peak (3×).
// 100M posts/day → 1,000/s avg → 3,000/s peak. ≤ 200 pushed inserts per post → 600,000 inserts/s peak.
// Pull with 200 followees: 60,000 × 200 = 12,000,000 lookups/s peak. 1 − 0.99^200 ≈ 0.87.

export const strategies = [
  step('Peak timeline reads are 60,000/s and each user follows 200 accounts. With pure pull (fan-out on read), how many per-author lookups per second does the read path make?', [], 2, [
    ['60,000', 'That is one lookup per read — what push gives you. Pull must ask every followee for recent posts.'],
    ['1,200,000', 'That is 60,000 × 20, the hydration count for a 20-item page. Pull first has to find the posts: one lookup per followee.'],
    ['12,000,000', 'Right. 60,000 reads × 200 followees = 12 million lookups a second, before you have fetched a single post body.'],
  ]),
  step('Same system with pure push (fan-out on write): 3,000 posts/s at peak, at most 200 pushed inserts per post. Inserts per second?', [], 1, [
    ['3,000', 'That is one write per post — what pull pays. Push copies the id into every follower’s timeline.'],
    ['600,000', 'Right. 3,000 × 200 = 600,000 timeline inserts a second — twenty times fewer operations than pull’s 12 million lookups, and each read becomes one range query.'],
    ['12,000,000', 'That is the pull read cost. Push moves the work to the write side, where there is far less traffic.'],
  ]),
  step('A pull read fans in to 200 shards and must wait for the slowest. Each call is slower than its own p99 1% of the time. Roughly what fraction of reads hit at least one slow call?', [], 2, [
    ['About 1%', 'That is one call. The read waits for all 200, so the chances compound: 1 − 0.99²⁰⁰.'],
    ['About 18%', 'That is 1 − 0.99²⁰, a 20-way fan-in. With 200 followees it is far worse.'],
    ['About 87%', 'Right. 1 − 0.99²⁰⁰ ≈ 0.87. Wide fan-in turns every backend’s rare tail into the common case — one more reason pull reads are slow, not just expensive.'],
  ]),
];

export const celebrity = [
  step('Juno Vale has 12M followers on Kestrel and posts 6 times in one awards night. The fan-out workers have 30,000 inserts/s of spare capacity. How long until the last follower gets the sixth post?', [], 1, [
    ['About 4 minutes', 'Check the multiplication: 6 × 12M = 72M inserts.'],
    ['About 40 minutes', 'Right. 72,000,000 ÷ 30,000/s = 2,400 s = 40 minutes — and every ordinary user’s post queued behind hers waits too.'],
    ['About 6 seconds', 'One post is not one write under push. Each post becomes one insert per follower.'],
  ]),
  step('You move to hybrid with a 100K-follower threshold. Alice follows 799 ordinary accounts and Juno. What does her timeline read do now?', [], 0, [
    ['Read her pushed timeline, fetch Juno’s recent posts, merge by time', 'Right. One range read for the 799 pushed authors, one lookup for the celebrity (a hot, cached list), then a merge of two sorted lists.'],
    ['Query all 800 followees and merge', 'That is pure pull. Only accounts above the threshold are pulled.'],
    ['Read her pushed timeline only', 'Juno’s posts are no longer pushed, so they would never appear.'],
  ]),
  step('Juno’s recent-posts list is read by millions of followers. What keeps that one key from melting its cache shard?', [], 2, [
    ['Shard the cluster more finely', 'One key still hashes to one shard. More shards do not spread one key.'],
    ['Push her posts after all', '50M-scale writes per post are the problem you just removed.'],
    ['A short-TTL in-process cache of celebrity post lists on every feed server', 'Right. It is the hot-key fix from the caching lesson: 200 feed servers each fetch the list about once a second, instead of every read reaching Redis.'],
  ]),
];

export const storage = [
  step('Timeline entries must stay in time order even when fan-out messages arrive out of order, and a retried insert must not create a duplicate. Which Redis structure?', [], 1, [
    ['A list: LPUSH then LTRIM', 'LPUSH orders by arrival, not by post time, and a retried LPUSH inserts the id twice.'],
    ['A sorted set: ZADD with the post time as score and the post id as member', 'Right. Order comes from the score, not arrival, and re-adding the same member is a no-op — retries are idempotent for free.'],
    ['A hash keyed by post id', 'A hash has no order, so every read would sort the whole thing.'],
  ]),
  step('Kestrel uses 64-bit time-ordered post ids. Someone proposes using the id itself as the sorted-set score. What goes wrong?', [], 2, [
    ['Nothing — ids are time-ordered', 'The ordering idea is right; the number type is the problem.'],
    ['Sorted sets cannot hold more than 2³² members', 'Size is not the issue here, and timelines are capped at 800 anyway.'],
    ['Scores are double-precision floats, exact only up to 2⁵³; large 64-bit ids round, so neighbours can collide or misorder', 'Right. Use a millisecond timestamp as the score (exact in a double) and the id as the member; equal scores fall back to ordering by member.'],
  ]),
  step('Each timeline keeps the newest 800 entries. After ZADD, which command trims it?', [
    row('Ranks (ascending)', ['0', '1', '…', 'N−801', 'N−800', '…', 'N−1'], { 0: 'oldest', 6: 'newest' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 4: 'done', 5: 'done', 6: 'done' } }),
  ], 0, [
    ['ZREMRANGEBYRANK tl:{uid} 0 -801', 'Right. Rank −801 is N−801, so ranks 0 … N−801 go (N − 800 entries) and the newest 800 stay. With 800 or fewer, the range is empty and nothing is removed.'],
    ['ZREMRANGEBYRANK tl:{uid} 0 -800', 'Rank −800 is N−800, so this removes N − 799 entries and keeps only 799.'],
    ['ZREMRANGEBYRANK tl:{uid} 800 -1', 'Ascending ranks put the oldest first, so this keeps the oldest 800 and drops everything newer.'],
  ]),
];

export const pipeline = [
  step('One author with 90K followers posts; the fan-out job is a single message processed by a single worker. Ordinary users on the same partition see their posts delayed. What is the structural fix?', [], 1, [
    ['A bigger worker machine', 'The job is still serial, and the partition is still blocked behind it.'],
    ['Split the fan-out: one message per post, expanded into follower batches (say 1,000 ids each) on a second queue that many workers share', 'Right. Batches spread one big fan-out across the whole pool, and small authors are no longer stuck behind it. A separate lane for large fan-outs adds isolation.'],
    ['Make posting synchronous so the author waits', 'That moves the delay to the author and still blocks the workers.'],
  ]),
  step('A fan-out worker crashes after writing 600 of a 1,000-id batch. The batch is redelivered. What happens to the 600 timelines already written?', [], 2, [
    ['They get the post twice', 'Only with an append-only structure like a list. Choose the structure so retries are safe.'],
    ['The redelivery is skipped because the queue remembers', 'At-least-once delivery means redelivery is normal. The writer must tolerate it.'],
    ['Nothing — ZADD of the same member and score is a no-op', 'Right. The sorted set makes the insert idempotent, so at-least-once delivery is enough.'],
  ]),
  step('Fan-out lag hits 6 minutes during an outage on one cache shard. What should users see?', [], 0, [
    ['Followers’ feeds are a little stale; authors still see their own post immediately', 'Right. Lag delays fan-out, not posting. Merge the author’s own recent posts at read time so they never wonder if their post went through, and alert on lag in seconds.'],
    ['Posting fails until the lag clears', 'The post is already durable in the post store. Rejecting writes because fan-out is slow turns a delay into an outage.'],
    ['Feeds switch to pure pull for everyone', 'At 60,000 reads/s that is 12M lookups/s — the fallback would take down the read path.'],
  ]),
];

export const readPath = [
  step('A user deletes a post that has already been pushed into 40,000 timelines. What is the primary mechanism that hides it?', [], 1, [
    ['Synchronously remove it from all 40,000 timelines before acknowledging the delete', 'Slow and fragile — the same write amplification as fan-out, on the critical path.'],
    ['Mark it deleted in the post store; hydration drops it at read time; an async job may clean timelines later', 'Right. Timelines hold ids, so the one source of truth decides. Over-fetch a little (25 ids for a 20-item page) so filtered items do not leave short pages.'],
    ['Wait for it to fall off the 800-entry cap', 'It would be visible until then — unacceptable for a delete.'],
  ]),
  step('A user who has not opened Kestrel in 60 days logs in. Their timeline key was never maintained. What happens?', [], 2, [
    ['Show an empty feed until new posts arrive', 'A returning user seeing nothing is the worst first impression you can design.'],
    ['Fan-out keeps every user’s timeline forever, so it is already there', 'That spends writes and memory on users who never read them. Skipping inactive followers is the point.'],
    ['Cache miss → rebuild by pulling recent posts from their followees, merge, write the top 800, serve page one', 'Right. A one-time pull, then they rejoin push fan-out.'],
  ]),
  step('Alice blocks Bob. Bob’s posts are already in Alice’s timeline. Where is the cheapest correct place to enforce the block?', [], 0, [
    ['At read time: filter entries whose author is in Alice’s blocked set', 'Right. The block takes effect on the next read. Fan-out workers also check it for new posts, so the filter is a safety net, not the only line.'],
    ['Rebuild Alice’s timeline from scratch', 'Works, but it is a full pull for a single change.'],
    ['Nothing — old posts are fine', 'A block that still shows the person’s posts is a trust and safety bug.'],
  ]),
];

export const ranking = [
  step('The feed becomes ranked: each request scores about 1,000 candidates and returns the top 20. Page 2 uses a cursor of "posts older than the last one shown". What breaks?', [], 1, [
    ['Nothing — the cursor is stable', 'It was stable when order was time. Ranked order is not time order.'],
    ['Page 2 repeats and skips posts, because rank order is not time order and scores change between requests', 'Right. Rank once, store the ordered ids for the session (minutes), and make the cursor an offset into that snapshot.'],
    ['Ranking is too slow for page 2', 'Latency is a separate concern. This one is about correctness of paging.'],
  ]),
  step('Where does the fan-out pattern sit in a ranked feed?', [], 2, [
    ['It is replaced entirely by the recommender', 'For a For-You feed with no follow graph, mostly. A follow-based feed still needs the in-network candidates fan-out provides.'],
    ['It does the ranking', 'Fan-out moves ids. Scoring is the ranker’s job.'],
    ['Candidate generation: the pushed timeline and pulled celebrity posts are the in-network candidates the ranker scores', 'Right. Fan-out → candidates; ranker → order; blender → business rules (diversity, ads, freshness).'],
  ]),
];

export const notifications = [
  step('A security code and a weekly marketing digest both go through the push channel. Marketing sends 20M messages at 9:00. What stops the security codes from waiting behind them?', [], 1, [
    ['A faster push provider', 'The marketing burst still sits in front of the codes in one queue.'],
    ['Separate priority queues (and worker pools) per class: transactional ahead of bulk', 'Right. Priority is a property of the queue layout, not a flag a single FIFO can honour.'],
    ['Send security codes by email instead', 'That changes the channel, not the queueing problem.'],
  ]),
  step('The push worker sends a notification, then crashes before acking the message. It is redelivered. How do you avoid a duplicate on the user’s phone?', [], 2, [
    ['Exactly-once delivery from the queue', 'Queues give at-least-once. You make the effect idempotent instead.'],
    ['Never retry push notifications', 'Then every transient provider error drops a notification.'],
    ['An idempotency key per (notification id, device), checked in a store before sending; providers may also accept a collapse key', 'Right. Record the key on send; a redelivery finds it and skips. A small race window remains if the crash lands between send and record — say so.'],
  ]),
  step('“Juno is live” goes to 50M followers. If 5% open the app within one minute, how many extra feed reads per second hit the read path?', [], 0, [
    ['About 42,000/s', 'Right. 50M × 5% = 2.5M opens ÷ 60 s ≈ 41,667/s — two-thirds of the normal 60,000/s peak on top. Stagger the send over several minutes.'],
    ['About 4,200/s', 'Check the arithmetic: 2.5M opens in 60 seconds.'],
    ['About 830,000/s', 'That is 50M ÷ 60, as if every follower opened at once.'],
  ]),
];

export const counters = [
  step('A viral post receives 50,000 likes per second. One counter row handles a few thousand contended updates per second at best. With 64 sharded sub-counters chosen at random, what does each shard take?', [], 1, [
    ['About 50,000/s', 'That is the unsharded load — the whole point is to divide it.'],
    ['About 780/s', 'Right. 50,000 ÷ 64 ≈ 781 per shard. A read sums 64 values; cache that sum for a second or two.'],
    ['About 3,200/s', 'That would be 16 shards. Divide by 64.'],
  ]),
  step('Product wants “unique viewers” per post, approximate is fine, for billions of posts. Which structure?', [], 2, [
    ['A set of viewer ids per post', 'Exact, but memory grows with every viewer — gigabytes for a viral post.'],
    ['A counter incremented on every view', 'That counts views, not unique viewers.'],
    ['A HyperLogLog per post', 'Right. Redis HLLs use at most about 12 KB each with a standard error around 0.81%, no matter how many viewers.'],
  ]),
];

export const drills = [
  step('Feeds are read 100× more than written. Which strategy does that ratio favour, and why?', [], 1, [
    ['Pull — fresh data for all those reads', 'Freshness is not the bottleneck. Paying the expensive merge on every one of 100 reads multiplies cost on the hot path.'],
    ['Push — do the expensive work once at write time so each read is a single cache fetch', 'Right. Move work to the rare side of the ratio. It is the same precompute trade as typeahead’s top-K lists.'],
    ['Neither — the ratio is irrelevant', 'The ratio is the main input to the choice.'],
    ['Pull with a big cache in front', 'Each user’s merged feed is unique, so a cache in front of pull is just push with extra steps.'],
  ]),
  step('Your push-based feed is live and a superstar with 600M followers joins. What breaks, and what is the fix?', [], 1, [
    ['Nothing — queues absorb it', '“Queues absorb it” just moves a multi-hour backlog into the queue, and every other post waits behind it.'],
    ['Each post triggers 600M inserts, hogging workers for hours. Fix: hybrid — accounts above ~100K followers are pulled at read time and merged', 'Right. The celebrity problem is write amplification. The hybrid with a stated threshold is the answer.'],
    ['Their reads get slow — add read replicas', 'Reads are not the problem; writes per post are.'],
    ['Storage explodes — store one copy per post', 'Timelines already store ids, not copies. The cost is the number of inserts.'],
  ]),
  step('Why do timeline caches store post ids rather than full post content?', [], 2, [
    ['Ids are needed for pagination', 'Cursors use ids, but that does not stop you storing content too.'],
    ['Redis cannot store large values', 'It can. That is not the reason.'],
    ['Content copied into millions of timelines wastes memory and makes edits and deletes nearly impossible; ids plus one post cache, hydrated at read time, fix both', 'Right. Fan-out copies the cheap reference; the content lives in one place, so a delete or edit heals every timeline at once.'],
    ['To keep feeds encrypted', 'Encryption is unrelated to the choice.'],
  ]),
  step('Where does the threshold for “celebrity” come from in your answer?', [], 0, [
    ['A stated number (say 100K followers), justified by fan-out lag and tuned by measurement', 'Right. Say the number, the reason (one post must not hog the workers for more than seconds), and that you would tune it.'],
    ['Users mark themselves as celebrities', 'The threshold is about follower count and fan-out cost, not self-description.'],
    ['Whoever posts most often', 'Posting rate matters too, but follower count is what multiplies each post.'],
  ]),
  step('A ranked feed, a TikTok For-You page and a notification blast. Which uses fan-out on write least?', [], 1, [
    ['The ranked follow feed', 'It still pushes in-network candidates for most authors.'],
    ['The For-You page', 'Right. Candidates come from a recommender, not a follow graph, so there is nothing to push. It is pull plus ranking.'],
    ['The notification blast', 'That is fan-out on write to devices — one event, many deliveries.'],
  ]),
];
