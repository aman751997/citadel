import { row, step } from '../../lib/trace.ts';

export const hitRatio = [
  step('Profile reads peak at 200,000 per second. The database comfortably serves 20,000 reads per second. What is the lowest cache hit ratio that keeps the database safe?', [], 1, [
    ['80%', '20% of 200,000 is 40,000 misses per second — twice what the database can take.'],
    ['90%', 'Right. Misses = (1 − 0.90) × 200,000 = 20,000 per second, exactly the database budget. In practice you want headroom, so aim higher.'],
    ['50%', 'Half the traffic would still be 100,000 reads per second on the database.'],
  ]),
  step('Hit ratio climbs from 90% to 99%. By how much does database read load drop?', [], 2, [
    ['By 9%', 'The hit ratio rose by 9 points, but the MISS rate fell from 10% to 1%.'],
    ['By half', 'Misses go from 20,000 to 2,000 per second, which is far more than half.'],
    ['By 10×', 'Yes. The database sees the miss rate, not the hit rate: 10% → 1% is a tenfold drop. That is why the last few points of hit ratio matter so much.'],
  ]),
];

export const invalidation = [
  step('A user edits their bio. Writes go through your service, and you can tolerate a few seconds of staleness for other viewers but not for the editor. Which invalidation?', [], 1, [
    ['TTL only, 15 minutes', 'The editor would refresh and still see the old bio for up to 15 minutes.'],
    ['Delete the key after the database write, plus a TTL as backstop', 'Right. The next read repopulates from the database. The TTL caps the damage of any delete that gets lost.'],
    ['Update the cached value after the database write', 'Two concurrent writers can leave the older value in the cache permanently. Delete instead.'],
  ]),
  step('Five other services also write to the users table directly. Delete-on-write in your service misses their writes. Now what?', [], 2, [
    ['Ask every team to call your delete endpoint', 'It works until one team forgets. Invalidation that depends on every writer remembering will eventually miss.'],
    ['Lower the TTL to one second', 'That nearly removes the cache. Hit ratio collapses for every key, not just the changed ones.'],
    ['Drive deletes from the database change stream (CDC)', 'Right. Every committed write, from anyone, flows through the log, so no writer can forget.'],
  ]),
];

export const race = [
  step('Writers A and B update the same row. Order: A writes DB (v1), B writes DB (v2), B sets cache (v2), A sets cache (v1). What does the cache hold, and for how long?', [
    row('Timeline', ['A → DB v1', 'B → DB v2', 'B → cache v2', 'A → cache v1'], { 3: 'LAST' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['v2, the newest value', 'The cache keeps whatever was written last. A wrote last.'],
    ['v1, until the TTL expires or someone writes again', 'Right. The database says v2, the cache says v1. With no TTL, it is wrong forever. This is why you delete instead of set.'],
    ['Nothing — the writes cancel out', 'Cache writes do not merge or cancel. The last SET wins.'],
  ]),
  step('Now you delete on write. A reader misses, reads v1 from the DB, pauses; a writer stores v2 and deletes the key; the reader resumes and sets v1. Is the cache stale?', [
    row('Timeline', ['R: miss', 'R: read DB v1', 'W: DB v2', 'W: delete key', 'R: set v1'], { 4: 'LAST' }, { tones: { 4: 'hot' } }),
  ], 0, [
    ['Yes, until the TTL expires', 'Right. Delete-on-write narrows the window but does not close it. A short TTL bounds it; leases or versioned sets close it.'],
    ['No — the delete came after the read', 'The delete happened before the reader’s SET, so the SET re-inserts the stale value it read earlier.'],
  ]),
];

export const failures = [
  step('A popular key expires at 09:00:00. In that second, 10,000 requests miss and each queries the database. What is this called, and what is the first fix?', [], 1, [
    ['A hot key; replicate it across shards', 'Replication spreads read load on a key that exists. Here the problem is many simultaneous recomputations after expiry.'],
    ['A stampede; let one request recompute while the others wait or get the stale value', 'Right. A per-key lock or lease turns 10,000 database queries into one. Stale-while-revalidate even avoids the waiting.'],
    ['Cache penetration; add a Bloom filter', 'Penetration is repeated misses for keys that do not exist at all. This key exists; it just expired.'],
  ]),
  step('A celebrity’s profile key takes 500,000 reads per second, all on one Redis shard, which is now at 100% CPU. Best first fix?', [], 2, [
    ['Move to a bigger Redis instance', 'One key still lives on one shard. A bigger box raises the ceiling a little; it does not spread the load.'],
    ['Add more shards to the cluster', 'More shards do not help one key. It still hashes to exactly one slot.'],
    ['A tiny in-process cache (about 1 second TTL) on each app server', 'Right. With 200 app servers, Redis sees about 200 reads per second for that key instead of 500,000. Staleness is bounded at one second.'],
  ]),
  step('Bots request profile ids that do not exist. Every request misses the cache and hits the database. What stops it?', [], 0, [
    ['Cache the "not found" result with a short TTL, or check a Bloom filter of valid ids first', 'Right. This is cache penetration. Negative caching or a Bloom filter (no false negatives) keeps nonexistent keys away from the database.'],
    ['Increase the TTL on real profiles', 'Real profiles are not the problem. The missing ones never get cached.'],
    ['Switch eviction from LRU to LFU', 'Eviction decides what leaves a full cache. These keys never enter it.'],
  ]),
];

export const drills = [
  step('Which sentence would pass Mara’s four-part rule for a product page cache?', [], 1, [
    ['"We cache product pages in Redis for speed."', 'No key shape, no TTL, no invalidation, no failure plan. This is the sentence interviewers mark down.'],
    ['"Cache-aside on product:{id}, TTL 10 minutes because price edits tolerate brief staleness, delete-on-write from the catalog service, jittered TTLs and a per-key lock against stampedes."', 'Right: key shape, TTL with a reason, invalidation, failure plan. One breath, four parts.'],
    ['"Write-through caching with LRU eviction."', 'Names a write policy and an eviction policy. Still no key, TTL reason, or failure plan.'],
    ['"We cache the top 20% of products, which serve 80% of traffic."', 'A sizing observation, not a design. Which keys? How do they stay fresh? What if the cache dies?'],
  ]),
  step('Why delete the key on write instead of setting the new value?', [], 1, [
    ['DEL is faster than SET', 'Speed is not the reason. Correctness under concurrency is.'],
    ['Two racing writers can leave the losing value cached; delete self-heals with one extra miss', 'Right. A delete can never install a stale value; at worst the next reader pays a miss.'],
    ['SET would reset the TTL', 'You can SET with any TTL you like. The problem is ordering between writers.'],
    ['Deleting saves memory', 'Memory is not the concern here.'],
  ]),
  step('The cache cluster goes down at peak. What should your design have said up front?', [], 2, [
    ['Nothing — a cache is just an optimisation', 'Only if the database survives full read load without it. At 10× the database budget, the cache is load-bearing.'],
    ['Restart it and the hit ratio recovers instantly', 'A cold cache starts at 0% hits. The first minutes after restart are the most dangerous.'],
    ['Whether the database survives without it, and if not: circuit breaking, load shedding, degraded responses, and a warm-up plan', 'Right. Saying "the cache is load-bearing, so here is what happens when it fails" is the senior answer.'],
  ]),
  step('Your working set is 10 GB, and one cache node has about 25 GB usable memory. Why run a cluster at all?', [], 0, [
    ['For throughput and availability, not capacity', 'Right. The data fits on one node; you add shards for request rate and replicas so one failure does not cold-start your whole cache.'],
    ['Because 10 GB is too much for one node', 'It fits with room to spare. Size first, then decide why you need more nodes.'],
    ['Clusters always have higher hit ratios', 'Hit ratio depends on the working set and eviction, not the number of nodes.'],
  ]),
];
