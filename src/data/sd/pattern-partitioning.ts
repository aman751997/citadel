import { row, step } from '../../lib/trace.ts';

// Decision puzzles for src/lessons/pattern-partitioning.mdx.
// Every number here is derived in the lesson and checked in tests/java/pattern-partitioning/Check.java
// (mod-N movement, ring add/remove, vnode spread, version vectors, Merkle comparisons) or by plain arithmetic.

export const modN = [
  step('Kestrel’s cache runs on 10 nodes with node = hash(key) mod 10. You add an 11th node and switch to mod 11. Roughly what fraction of keys now map to a different node?', [], 2, [
    ['About 1/11 — the new node’s fair share', 'That is what you WANT to move. Mod N does not respect it: a key stays only if h mod 10 equals h mod 11.'],
    ['About half', 'Half is what doubling (10 → 20) costs. Adding one node is worse.'],
    ['About 91% (10/11)', 'Right. In every block of 110 consecutive hash values only 10 (h = 0…9) keep their remainder, so 100/110 move. For a cache that is a near-total cold start.'],
  ]),
  step('A node in the same 10-node mod-N cluster dies and you go to mod 9. What moves?', [], 1, [
    ['Only the dead node’s 10% of keys', 'That is the minimum, and what consistent hashing achieves. Mod N reshuffles the survivors too.'],
    ['About 90% of all keys, including keys on healthy nodes', 'Right. A key stays only if h mod 10 = h mod 9: 9 values in every 90. A single failure becomes a cluster-wide cold start.'],
    ['Nothing, until an operator rebalances', 'If clients compute mod 9, they look in new places immediately; the old copies are now unreachable misses.'],
  ]),
];

export const ring = [
  step('Ring positions run 0–99. Nodes sit at A = 10, B = 40, C = 80. Which node owns a key that hashes to 95?', [
    row('Ring', ['A @10', 'k @25', 'B @40', 'k @60', 'C @80', 'k @95'], { 5: '?' }, { tones: { 5: 'hot' }, join: '→' }),
  ], 0, [
    ['A — clockwise from 95 wraps past 99 to 10', 'Right. The ring has no end: the first node at or after 95 is found by wrapping to the start.'],
    ['C — it is the nearest node', 'Ownership is the next node CLOCKWISE, not the nearest. C at 80 is behind 95.'],
    ['Nobody — 95 is past the last node', 'That gap is exactly why the space is a ring: past the last node, you wrap to the first.'],
  ]),
  step('Now node D joins at position 50. Which keys change owner?', [
    row('Ring', ['A @10', 'k @25', 'B @40', 'k @45', 'D @50', 'k @60', 'C @80', 'k @95'], { 4: 'NEW' }, { tones: { 3: 'hot', 4: 'done' }, join: '→' }),
  ], 1, [
    ['Every key — the ring changed', 'Only one arc changed hands. Keys at 25, 60 and 95 still find the same next node clockwise.'],
    ['Only keys in (40, 50] — the 45 key moves from C to D', 'Right. D takes over the slice of C’s arc between B and itself. One arc, one donor; everyone else is untouched.'],
    ['Keys in (50, 80] — they now see D first', 'Keys after 50 walk clockwise to C exactly as before; D sits behind them.'],
  ]),
  step('Node B (at 40) dies. Where do its keys go, and what is the problem?', [
    row('Ring', ['A @10', 'k @25', 'B @40', 'D @50', 'C @80'], { 2: 'DEAD' }, { tones: { 2: 'out', 1: 'hot' }, join: '→' }),
  ], 2, [
    ['They spread evenly across A, C and D', 'With one position per node, an arc has one successor. Nothing spreads.'],
    ['They are lost', 'They are not lost if replicated; ownership simply moves to the next node clockwise.'],
    ['All of B’s arc goes to D, which now carries its own load plus B’s', 'Right. One neighbour inherits everything. Virtual nodes fix this: B’s many small arcs have many different successors.'],
  ]),
];

export const vnodes = [
  step('Ten nodes, one token each, placed by hash. On average, how loaded is the busiest node compared with a fair 10% share?', [], 2, [
    ['About 1.1× — hashing is uniform', 'Hashing makes each POSITION uniform; it does not make the GAPS between ten random points equal.'],
    ['Exactly 1× — every arc is 1/10 of the ring', 'Only if you place nodes by hand at equal spacing, and that breaks again when one is added.'],
    ['About 2.9× — the largest of ten random gaps averages H₁₀ / 10 of the ring', 'Right. H₁₀ = 1 + 1/2 + … + 1/10 ≈ 2.93. The lesson’s checker measured 2.93 over 2,000 random rings.'],
  ]),
  step('Same ten nodes, 256 virtual nodes each. Roughly how busy is the busiest node now, and why?', [], 1, [
    ['Still about 2.9× — the hash function hasn’t changed', 'Each node’s share is now a sum of 256 small arcs, and sums of many random pieces are far more even.'],
    ['About 1.1× — a node’s share is the sum of 256 arcs, so its spread shrinks like 1/√256', 'Right. Relative spread ≈ 1/√V: 1/16 ≈ 6% per node, and the busiest of ten ends up about 10% over. The checker measured 1.09×.'],
    ['Exactly 1× — vnodes make it perfect', 'More tokens shrink the variance; they never remove it. That is why weighted vnodes and load monitoring still exist.'],
  ]),
];

export const strategies = [
  step('A routing tier picks one of 20 storage nodes per request. Nodes come and go; you want minimal movement and an even spread of a dead node’s keys, without managing vnodes. Which scheme fits most simply?', [], 1, [
    ['Hash mod 20', 'Every membership change remaps about 95% of keys.'],
    ['Rendezvous hashing: score every node for the key, take the highest', 'Right. 20 hashes per lookup is nothing; a new node steals only keys it now wins (≈1/21); a dead node’s keys scatter to each key’s runner-up, evenly.'],
    ['A range map maintained by hand', 'Possible, but it needs an operator or a balancer to keep it fair. Overkill for a pure point-lookup tier.'],
  ]),
  step('Redis Cluster has 3 primaries holding 5,461, 5,461 and 5,462 of its 16,384 slots. You add a 4th primary and rebalance evenly. What fraction of keys move?', [], 0, [
    ['25% — the new primary takes 4,096 slots, each holding its keys', 'Right. 16,384 ÷ 4 = 4,096 slots, taken roughly equally from the other three. Keys never change slot; slots change owner.'],
    ['About 75% — three quarters of the slots are renumbered', 'Slots are never renumbered. CRC16(key) mod 16384 is fixed forever; only the slot → node map changes.'],
    ['Nothing moves until keys expire', 'Redis Cluster migrates the keys of each moving slot (MIGRATE), redirecting clients with ASK during the move.'],
  ]),
  step('An event store must answer “all events for device 7 between 09:00 and 10:00” and “all devices with ids from 5000 to 5999”. Which partitioning keeps both scans cheap?', [], 2, [
    ['Hash by (device_id, timestamp)', 'Hashing the timestamp scatters one device’s hour across every partition.'],
    ['Hash by device_id only', 'Good for the first query, but a device-id range scan now has to ask every partition.'],
    ['Range partition by (device_id, timestamp), splitting ranges as they grow', 'Right. Both queries become contiguous key ranges on one or a few partitions. The price is watching for hot ranges and splitting them.'],
  ]),
];

export const hotKeys = [
  step('One celebrity’s profile takes 400,000 reads/s. Each cache shard serves about 100,000. You add 10 more shards. What changes for that key?', [], 0, [
    ['Nothing — one key lives in one place however many shards exist', 'Right. Hot keys are a concentration problem. Spread the READS: a ~1 s in-process cache on app servers, or N suffixed copies read at random.'],
    ['It now spreads across 10 more shards', 'A key hashes to exactly one slot. More shards spread different keys, not one key.'],
    ['Its shard gets less load from other keys, which is enough', 'At 400,000 reads/s on a shard that serves 100,000, freeing the neighbours is not enough.'],
  ]),
  step('A view counter takes 100,000 increments/s; one partition handles about 10,000 writes/s. You salt it into 16 sub-keys (views:42#0 … #15). What is the write load per sub-key, and what did you pay?', [], 1, [
    ['100,000/s each — salting copies writes', 'Each increment goes to ONE random sub-key; the load divides.'],
    ['About 6,250/s each; a read must now sum 16 sub-keys', 'Right. 100,000 ÷ 16 = 6,250, under the 10,000 budget. Name the cost: 16 reads, or a periodic roll-up that stores the total.'],
    ['About 6,250/s each, with no read cost', 'The total no longer lives in one place. Someone has to add up 16 numbers.'],
  ]),
];

export const rebalance = [
  step('A new node joins and must take ~194 GB. If streaming runs at full disk speed, foreground p99 doubles. What do you do?', [], 2, [
    ['Stream at full speed — finish fast, accept the blip', 'A 30-minute blip on every node that is sending is an incident, not a blip.'],
    ['Wait for a quiet weekend', 'Capacity problems rarely wait. And a node can also die on a Tuesday.'],
    ['Throttle streaming (say 100 MB/s cluster-wide ≈ 32 minutes) and keep the old owners serving until handoff', 'Right. Movement is background work with a budget. Old owners stay authoritative until the new one has caught up.'],
  ]),
  step('Mid-migration, a write arrives for a key whose range is being moved from node P to node Q. Which rule avoids losing it?', [], 0, [
    ['P owns it until cutover; writes during the copy go to P and are forwarded or replayed to Q before Q takes ownership', 'Right. One owner at a time, and the copy catches up with a log of changes made during the move, then ownership flips (a new epoch or map version).'],
    ['Write to Q, since Q will own it soon', 'Q may not have the rest of the range yet, and readers still go to P. The write is invisible or later overwritten by the bulk copy.'],
    ['Write to whichever node answers first', 'Two owners accepting writes for one key is split brain.'],
  ]),
  step('A node stops answering heartbeats for 40 seconds during a long GC pause. Should the cluster immediately re-replicate its data elsewhere?', [], 1, [
    ['Yes — data safety first', 'Re-replicating hundreds of GB for a 40-second pause adds load exactly when the cluster is stressed, then must be undone.'],
    ['No — treat it as temporarily down (hinted handoff, sloppy quorum); move data only for an operator-confirmed or long-lasting removal', 'Right. Transient failure and permanent removal are different events. Dynamo-style systems make membership changes explicit for this reason.'],
    ['No — just drop writes for its keys until it returns', 'The other replicas (and hinted handoff) keep writes flowing. Dropping them is unnecessary.'],
  ]),
];

export const replicas = [
  step('N = 3 with 256 vnodes per node. A key’s next three tokens clockwise belong to nodes E, E and F. What is its preference list?', [
    row('Clockwise', ['token → E', 'token → E', 'token → F', 'token → G'], {}, { tones: { 1: 'out' }, join: '→' }),
  ], 2, [
    ['E, E, F', 'Two copies on one machine is one copy when that machine dies.'],
    ['E, F — two is enough here', 'You asked for three replicas. Keep walking.'],
    ['E, F, G — skip tokens of nodes already chosen', 'Right. Walk clockwise collecting DISTINCT physical nodes (and, in production, distinct racks or zones).'],
  ]),
  step('Your store needs per-key compare-and-set (“claim this username”). Leader-per-partition or leaderless?', [], 0, [
    ['Leader per partition (with consensus such as Raft per range)', 'Right. One leader orders every write to the partition, so compare-and-set is a local decision. Leaderless quorums cannot give CAS without extra machinery.'],
    ['Leaderless with W = 3', 'All three replicas acknowledging does not stop two concurrent CAS calls from both succeeding on different coordinators.'],
    ['Leaderless with last-write-wins', 'LWW lets both claimants “win” and then silently keeps one.'],
  ]),
];

export const quorums = [
  step('N = 3, W = 2, R = 2. One replica is down. Can you still write and read with the overlap guarantee?', [], 0, [
    ['Yes — 2 of 3 are up, W + R = 4 > 3, so every read set overlaps every write set', 'Right. This is the classic balance: one failure tolerated on both paths.'],
    ['Writes yes, reads no', 'Reads need any 2 of 3 replies; two are up.'],
    ['No — quorums need all N up', 'That is W = N. Quorums exist precisely so you don’t need everyone.'],
  ]),
  step('Two of key K’s three home replicas (A and B) are cut off. With a sloppy quorum and W = 2, the write lands on C and on stand-in node D with a hint “for A”. What is the catch?', [
    row('Replicas', ['A', 'B', 'C', 'D (hint for A)'], { 0: 'DOWN', 1: 'DOWN' }, { tones: { 0: 'out', 1: 'out', 3: 'hot' } }),
  ], 1, [
    ['No catch — W was met', 'W was met by a node outside K’s home set. That is the point and the catch.'],
    ['A reader that reaches A and B gets R = 2 replies without the new value: W + R > N no longer guarantees overlap', 'Right. Sloppy quorums trade the overlap guarantee for write availability. Hinted handoff later delivers D’s copy to A.'],
    ['D will keep the value forever as a fourth replica', 'Hinted handoff: when A returns, D sends it the write and drops its copy.'],
  ]),
  step('Latency: replicas answer in 2 ms, 3 ms and 40 ms (one is in a GC pause). N = 3, W = 2. How long does the write wait?', [], 1, [
    ['40 ms — it waits for every replica', 'That is W = 3. The slow replica still gets the write; the client doesn’t wait for it.'],
    ['3 ms — the second-fastest acknowledgement', 'Right. A quorum waits for the W-th fastest reply, which is why quorums soften tail latency.'],
    ['2 ms — the fastest', 'That is W = 1.'],
  ]),
];

export const conflicts = [
  step('Two phones read cart {mug}. Phone X writes {mug, lamp}; 10 ms later phone Y writes {mug, rug}. The store uses last-write-wins by timestamp. What does the cart hold?', [], 2, [
    ['{mug, lamp, rug}', 'LWW never merges. It picks one whole value.'],
    ['{mug, lamp} — X wrote first', 'With accurate clocks LWW keeps the LATER timestamp, which is Y’s.'],
    ['{mug, rug} — and the lamp is silently gone', 'Right. Both writes were acknowledged; one vanished. With clock skew, even the “later” one can lose.'],
  ]),
  step('Value v3 has vector {A:2, B:1}; value v4 has {A:2, C:1}. What is their relationship?', [
    row('v3', ['A:2', 'B:1', 'C:0']),
    row('v4', ['A:2', 'B:0', 'C:1']),
  ], 2, [
    ['v4 is newer — C came later', 'Vectors have no notion of later between replicas. Compare counter by counter.'],
    ['Equal — both descend from A:2', 'They share an ancestor ({A:2}) but each has an update the other lacks.'],
    ['Concurrent — v3 has B:1 that v4 lacks, v4 has C:1 that v3 lacks', 'Right. Neither dominates, so the store keeps both as siblings and the next reader (or a merge rule) reconciles them.'],
  ]),
  step('The client reads both siblings, merges the carts, and writes through replica A. What vector does the merged value carry?', [], 0, [
    ['{A:3, B:1, C:1} — element-wise max of the two, then A increments', 'Right. Max gives {A:2, B:1, C:1}; A coordinates the write, so A becomes 3. It dominates both siblings, which can now be discarded.'],
    ['{A:4, B:1, C:1} — each sibling’s A:2 adds up', 'Merging takes the max per replica, never the sum.'],
    ['{A:3} — only the coordinator counts', 'Dropping B and C makes the new value look concurrent with, not newer than, the siblings.'],
  ]),
];

export const merkle = [
  step('Two replicas each hash their key space into 8 buckets and build a Merkle tree. They differ in one key. How many hash comparisons find it?', [
    row('Level', ['root: 1', 'level 1: 2', 'level 2: 2', 'leaves: 2']),
  ], 1, [
    ['8 — one per bucket', 'That is the flat comparison. The tree lets you skip every subtree whose hash already matches.'],
    ['7 — the root, then the two children at each of 3 levels on the path down', 'Right. 1 + 2 × 3 = 7. Only one bucket’s keys are then exchanged.'],
    ['1 — the root tells you everything', 'The root only says SOMETHING differs, not where.'],
  ]),
  step('Same idea with 2²⁰ ≈ 1 million buckets and still one differing key. How many comparisons?', [], 2, [
    ['About 1,048,576', 'That is a flat scan of every bucket.'],
    ['About 20', 'Close, but each level compares both children of the differing node: 2 per level.'],
    ['41 — 1 + 2 × 20', 'Right. Comparisons grow with the depth, not the size, when differences are few. The checker counts exactly 41.'],
  ]),
];

export const gossip = [
  step('1,000 nodes; each second, every node that knows a new fact tells one random peer (push gossip). About how long until everyone knows?', [], 1, [
    ['About 1,000 seconds — one node per second', 'Every informed node spreads in parallel, so the informed set roughly doubles each round at first.'],
    ['About 17–18 seconds — log₂ N + ln N rounds', 'Right. log₂ 1000 ≈ 10 doubling rounds plus ln 1000 ≈ 7 to reach the stragglers; a simulation averages 18. Push-pull roughly halves it.'],
    ['About 3 seconds', 'Even perfect doubling needs log₂ 1000 ≈ 10 rounds.'],
  ]),
  step('A phi-accrual detector models heartbeat gaps as exponential with a 1 s mean, so φ = 0.434 × (silence ÷ mean). With threshold φ = 8, how long a silence before the node is convicted?', [], 2, [
    ['8 seconds', 'φ is not seconds. It is −log₁₀ of the chance a live node would be this late.'],
    ['1 second — one missed heartbeat', 'That is a fixed timeout, and it would convict on every GC pause.'],
    ['About 18 seconds — 8 ÷ 0.434 ≈ 18.4 mean intervals', 'Right. φ = 8 means a live node would be this quiet with probability 10⁻⁸. If heartbeats get jittery, the mean grows and the deadline stretches by itself.'],
  ]),
];

export const routing = [
  step('Clients are your own services, latency-sensitive, and can embed a library. Which routing gives the fewest hops?', [], 0, [
    ['Partition-aware client with a cached map, refreshed on a redirect', 'Right. One hop straight to the owner. A stale map is fixed by the node replying MOVED (or similar) and the client refreshing.'],
    ['A proxy tier in front of the cluster', 'Simpler clients, one extra hop, and a tier to scale and keep available.'],
    ['Send to a random node, which forwards', 'Works with any client, but usually costs an extra hop.'],
  ]),
  step('Redis Cluster replies to a GET with “MOVED 3999 10.0.0.7:6379”. What should a smart client do?', [], 1, [
    ['Retry the same node after a back-off', 'The node told you it doesn’t own the slot. Retrying it will get MOVED again.'],
    ['Send the command to 10.0.0.7 and update its slot map (slot 3999 now lives there)', 'Right. MOVED is permanent: update the map. ASK, by contrast, is a one-off redirect during a migration — don’t update the map for it.'],
    ['Fail the request — the cluster is inconsistent', 'Redirects are normal operation during resharding.'],
  ]),
];

export const storage = [
  step('A Dynamo-style node takes 30,000 small writes/s. Why do these stores almost always sit on an LSM engine rather than a B-tree?', [], 1, [
    ['LSMs use less memory', 'Memtables and Bloom filters use memory too. The win is in how the disk is written.'],
    ['Writes become sequential appends (commit log + memtable flush); sorting and merging happen later in compaction', 'Right. Random in-place page writes are the B-tree’s cost; the LSM pays later, in background compaction.'],
    ['B-trees can’t be replicated', 'Plenty of replicated stores use B-trees. This is about write patterns, not replication.'],
  ]),
  step('A key is deleted (a tombstone is written). One replica was down and missed the delete. Tombstones are purged after 10 days; repair runs every 14 days. What can happen?', [], 0, [
    ['The deleted value comes back: after the purge, repair sees the old value on the lagging replica and copies it everywhere', 'Right. “Zombie” data. Repair must run more often than tombstones are kept (in Cassandra terms, within gc_grace_seconds).'],
    ['Nothing — a delete is a delete', 'Without the tombstone, the replicas can’t tell “deleted” from “never received”.'],
    ['The lagging replica crashes', 'It works fine. It is just wrong, and then it spreads the wrong answer.'],
  ]),
];

export const sizing = [
  step('2 billion items × 1 KB, replication factor 3, disks kept under 50% full for compaction headroom. How much disk does the cluster need?', [], 2, [
    ['2 TB', 'That is one copy of the raw data.'],
    ['6 TB', 'That counts three replicas but leaves no room for compaction.'],
    ['12 TB', 'Right. 2 TB × 3 = 6 TB of data, × 2 for the 50% headroom.'],
  ]),
  step('Peak: 200,000 reads/s at R = 2 and 50,000 writes/s at N = 3. You budget 20,000 replica operations/s per node. How many nodes, and what decides it?', [], 1, [
    ['6 nodes — 12 TB on 2 TB disks', 'That is the capacity floor. Check throughput too.'],
    ['About 28 — replica ops: 200,000 × 2 + 50,000 × 3 = 550,000/s ÷ 20,000', 'Right. Throughput, not capacity, sets the node count; each node then holds only about 400 GB.'],
    ['About 13 — 250,000 client requests ÷ 20,000', 'Each client request fans out to R or N replicas. Count replica operations.'],
  ]),
];

export const cacheRound = [
  step('“Design a distributed cache.” Which requirement question changes the design most?', [], 2, [
    ['Which programming language?', 'Doesn’t change a single box.'],
    ['Do you need pub/sub?', 'A fine extra; not what shapes the core.'],
    ['Is it a pure cache (rebuildable, loss is OK) or a store people rely on keeping data?', 'Right. A cache can replicate asynchronously and lose the last writes on failover; a store needs quorums or consensus and durable logs.'],
  ]),
  step('1.1 TB to hold (with per-key overhead), 50 GB usable per node, 2 million ops/s, ~100,000 ops/s per primary kept at 70%. How many primaries?', [], 1, [
    ['22 — capacity', 'Capacity says 22. Throughput says more.'],
    ['About 30 — throughput: 2,000,000 ÷ 70,000 ≈ 28.6', 'Right. Round to 30 primaries, each with a replica: about 546 of the 16,384 slots per primary.'],
    ['200 — one per 10,000 ops/s', 'A Redis-class node does far more than 10,000 simple GETs/s. Benchmark, but don’t starve it.'],
  ]),
];

export const kvRound = [
  step('In the Dynamo-style round the interviewer says: “Shopping carts. Never reject an add-to-cart.” Which choice follows?', [], 0, [
    ['Leaderless, sloppy quorum + hinted handoff, version vectors with sibling merge on read', 'Right. Always-writable means AP: accept writes on stand-ins, then reconcile concurrent versions instead of discarding one.'],
    ['Leader per partition with synchronous replication', 'A leader that is unreachable makes its partition unwritable: the opposite of the requirement.'],
    ['Last-write-wins to keep it simple', 'Simple, and it silently drops one of two concurrent add-to-carts. That is the bug the requirement forbids.'],
  ]),
  step('The interviewer asks: “How do replicas that missed writes catch up if nobody reads those keys?”', [], 1, [
    ['Read repair', 'Read repair only fixes keys that are read.'],
    ['Background anti-entropy: compare Merkle trees per key range, exchange only differing ranges', 'Right. Read repair for hot keys, hinted handoff for short outages, Merkle anti-entropy for everything else.'],
    ['Restart the replica', 'A restarted replica is still missing the writes.'],
  ]),
];

export const unlocks = [
  step('“Design S3.” Object LIST must return keys by prefix, in order. How should the metadata (bucket, key → location) be partitioned?', [], 1, [
    ['Hash on (bucket, key)', 'A prefix listing would then ask every partition and merge.'],
    ['Range on (bucket, key), splitting hot or large ranges automatically', 'Right. Listings are range scans. Hot prefixes are split, and the object bytes themselves are placed separately by hash.'],
    ['One metadata database per bucket', 'Billion-object buckets outgrow one database; tiny buckets waste one each.'],
  ]),
  step('Likes on a post are counted in three regions that keep accepting writes during a partition. Which counter converges without losing increments?', [], 2, [
    ['One integer per region, last-write-wins on merge', 'LWW keeps one region’s total and drops the others’ increments.'],
    ['One integer, incremented in place everywhere', 'Two regions both turning 41 into 42 gives 42 after merge, not 43.'],
    ['A G-counter: each region counts its own increments; merge is per-region max; the value is the sum', 'Right. A CRDT: merges in any order converge. Add a second G-counter for decrements (a PN-counter).'],
  ]),
];

export const drills = [
  step('Cache cluster grows 10 → 11 nodes with modulo placement. What happens, and with consistent hashing instead?', [], 1, [
    ['Modulo: 1/11 of keys move. Consistent: same', 'Modulo moves 10/11, not 1/11. That gap is the whole reason consistent hashing exists.'],
    ['Modulo: ~10/11 of keys remap → near-total cache cold start → DB stampede. Consistent hashing: ~1/11 move — a blip, not an event', 'Right. Tie it to consequence: remapped cache keys are misses, and misses are the stampede math from the caching lesson.'],
    ['Both cause full reshuffles; consistent hashing is just faster at it', 'Consistent hashing moves only the arc the new node takes over.'],
    ['Modulo fails only if N is not prime', 'Primality is irrelevant. Any change of N reshuffles almost everything.'],
  ]),
  step('Why do real systems put each physical node at hundreds of ring positions (vnodes)?', [], 1, [
    ['More positions = more storage capacity', 'Positions are bookkeeping; capacity is disks.'],
    ['Even load statistically, scatter a dead node’s arcs across ALL survivors instead of one unlucky neighbour, and weight heterogeneous hardware by vnode count', 'Right. Three problems, one mechanism. Listing all three is the difference between having heard of vnodes and understanding them.'],
    ['To make the hash function cryptographically secure', 'Placement hashes need spread, not secrecy.'],
    ['Vnodes enable range queries on the ring', 'A hash ring scatters adjacent keys whatever the token count.'],
  ]),
  step('Metrics system: partition by timestamp for time-range scans, but all writes hammer the newest partition. Standard fix?', [], 1, [
    ['Switch to pure hash partitioning', 'It spreads writes and kills the range scans you partitioned for.'],
    ['Compound key — a hash prefix spreads current writes across k partitions (hash(series) % k, then time), range-sorted within; reads fan out to k partitions instead of 1, a stated cost', 'Right. Both properties survive, at a bounded read fan-out. Naming that trade is the senior move.'],
    ['Buffer writes in a queue', 'A queue smooths bursts; it does not change where the writes land.'],
    ['Bigger node for the current partition', 'Tomorrow’s partition will need the bigger node too. Vertical scaling a moving hot spot is a treadmill.'],
  ]),
  step('A Dynamo-style store with N = 3 must keep every acknowledged write visible to the next read. Which setting is the minimum?', [], 2, [
    ['W = 1, R = 1', 'W + R = 2, not more than 3: the read may miss the only replica that has the write.'],
    ['W = 3, R = 3', 'Correct, but more than the minimum, and any single dead replica blocks both paths.'],
    ['W = 2, R = 2 (or W = 1, R = 3, or W = 3, R = 1)', 'Right. Any W + R > N overlaps. 2/2 tolerates one failure on both paths. Strict quorums only: sloppy ones break the guarantee.'],
  ]),
  step('Two replicas hold different values for a key with vectors {A:1, B:2} and {A:2, B:1}. What should the store do?', [], 0, [
    ['Keep both as siblings and let a reader or merge function reconcile', 'Right. Neither vector dominates: they are concurrent. Choosing one silently is LWW’s data loss.'],
    ['Keep {A:2, B:1} — A is the coordinator', 'Vectors don’t rank replicas. Compare per counter: each side is ahead somewhere.'],
    ['Average them', 'Values aren’t numbers to average, and vectors don’t average either.'],
  ]),
  step('Which repair path fixes a replica that missed writes to keys nobody reads?', [], 2, [
    ['Read repair', 'Only fires when a key is read.'],
    ['Hinted handoff', 'Only covers writes made while a node was briefly down, within the hint window.'],
    ['Merkle-tree anti-entropy', 'Right. It compares whole key ranges in the background, independent of reads.'],
  ]),
];
