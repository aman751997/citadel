import { row, step } from '../../lib/trace.ts';

// Every number below is recomputed in the lesson author’s verification script; prose, tables and
// figures in src/lessons/estimation.mdx use the same values.

export const units = [
  step('Kestrel Moments stores 5 million new posts a day, about 1 KB of metadata each. How much is that per day?', [
    row('Ladder', ['B', 'KB', 'MB', 'GB', 'TB'], { 3: 'HERE' }, { tones: { 3: 'hot' }, join: '→' }),
  ], 1, [
    ['5 TB', 'One rung too high: 5 × 10⁶ × 10³ B = 5 × 10⁹ B, which is GB. This is the 1000× slip — exactly the one your own reps caught.'],
    ['5 GB', 'Right. 5 × 10⁶ posts × 10³ B = 5 × 10⁹ B = 5 GB. Add the exponents (6 + 3 = 9), then name the rung: 10⁹ is giga.'],
    ['500 MB', 'You lost a factor of ten somewhere: 5 × 10⁶ × 10³ is 5 × 10⁹, not 5 × 10⁸.'],
    ['50 GB', 'One zero too many. Write it as 5 × 10⁶ × 1 × 10³ and multiply the mantissas (5 × 1) separately from the exponents.'],
  ]),
  step('The upload service has a 10 Gbps network card. Roughly how many 2 MB photos per second can it receive at line rate?', [], 0, [
    ['About 600', 'Right. 10 Gbps ÷ 8 = 1.25 GB/s; 1.25 GB/s ÷ 2 MB = 625 photos per second. Network links are quoted in bits; files in bytes.'],
    ['About 5,000', 'You divided 10 × 10⁹ bits by 2 × 10⁶ bytes. Bits and bytes differ by 8: convert 10 Gbps to 1.25 GB/s first.'],
    ['About 60', 'One zero short: 1.25 × 10⁹ ÷ 2 × 10⁶ ≈ 6 × 10².'],
  ]),
  step('The photos table uses a signed 32-bit integer primary key. At 5 million new photos a day, roughly when does it overflow?', [], 1, [
    ['Never; two billion is plenty', 'Two billion is about 2.1 × 10⁹. At 5 × 10⁶ a day, that is only about 430 days of inserts.'],
    ['In about 14 months', 'Right. 2³¹ − 1 ≈ 2.15 × 10⁹; divided by 5 × 10⁶ per day ≈ 430 days. Use a 64-bit key (2⁶³ ≈ 9.2 × 10¹⁸) from day one.'],
    ['In about 2.4 years', 'That uses 2³² ≈ 4.3 × 10⁹, the unsigned range. Java ints and Postgres integer columns are signed, so the ceiling is 2³¹ − 1.'],
  ]),
];

export const traffic = [
  step('500 million requests a day. Average QPS, using the ÷10⁵ rule?', [], 1, [
    ['500', 'Two zeros lost. 500 × 10⁶ ÷ 10⁵ = 5 × 10³.'],
    ['5,000', 'Right. 5 × 10⁸ ÷ 10⁵ = 5 × 10³. The exact figure (5,787) is about 16% higher, and your peak factor is a bigger guess than that.'],
    ['50,000', 'One zero too many: you divided by 10⁴. A day is about 10⁵ seconds.'],
    ['5,787, because you must use the exact 86,400', 'Not wrong arithmetic, but it costs interview seconds for precision your DAU guess never had. Say "about 5K, call it 6K" and move on.'],
  ]),
  step('Moments averages 5,000 feed requests per second and you assume peak is 3× average. Which number do you size the fleet for?', [
    row('Feed req/s', ['5,000', '15,000'], { 0: 'AVERAGE', 1: 'PEAK' }, { tones: { 1: 'hot' } }),
  ], 1, [
    ['5,000, the average', 'A fleet sized for the average falls over every evening at peak. Averages are for storage and cost; capacity is sized for peak.'],
    ['15,000, the peak', 'Right. 5,000 × 3 = 15,000 req/s. Say the assumption out loud: "assuming peak is about 3× average."'],
    ['About 1,700', 'You divided by the peak factor instead of multiplying: 5,000 ÷ 3. Peak is higher than average, never lower.'],
  ]),
  step('Moments: 50M DAU, each opens the feed 10 times a day; 10% of them post one photo a day. What is the read:write ratio?', [], 0, [
    ['About 100:1', 'Right. Reads: 50M × 10 = 500M a day. Writes: 50M × 0.10 = 5M a day. 500M ÷ 5M = 100. That ratio alone justifies a cache and read replicas.'],
    ['About 10:1', 'That assumes every DAU posts once a day (50M writes). Only 10% post, so writes are 5M a day.'],
    ['About 1:1', 'Feed opens and photo posts are different actions with very different rates. Count each one separately.'],
  ]),
];

export const latency = [
  step('Which of these is slowest?', [
    row('Operation', ['RAM read', 'DC round trip', 'HDD seek', 'Cross-continent RTT']),
  ], 3, [
    ['A main-memory read', 'About 100 ns. The fastest thing on this list by a factor of thousands.'],
    ['A round trip inside one data centre', 'Roughly 0.1–0.5 ms. Slow compared with memory, quick compared with any long-haul network hop.'],
    ['A hard-disk seek', 'About 10 ms. Slow, but a round trip across a continent or an ocean is slower still.'],
    ['A round trip across a continent or an ocean', 'Right. On the order of 100 ms (about 150 ms in the classic table), limited by the speed of light in fibre. No amount of hardware fixes physics.'],
  ]),
  step('The feed page renders 100 posts and fetches each author from a service in the same data centre, one call after another, at about 1 ms per call. How long does that part take?', [], 2, [
    ['About 1 ms', 'That would be true for one batched call. These are 100 sequential calls.'],
    ['About 10 ms', 'Off by ten. 100 calls × 1 ms = 100 ms.'],
    ['About 100 ms', 'Right. 100 × 1 ms = 100 ms, most of a typical latency budget, spent waiting. One batched multi-get costs about one round trip instead.'],
    ['About 1 second', 'Ten times too high. 100 × 1 ms is 100 ms.'],
  ]),
];

export const storage = [
  step('Kestrel comments: 20M a day, 500 B each (including index overhead), kept 3 years, replicated 3 times. How much raw disk?', [
    row('Chain', ['10 GB/day', '3.65 TB/yr', '~11 TB', '~33 TB'], { 0: '×365', 1: '×3 yrs', 2: '×3 copies' }, { join: '→' }),
  ], 0, [
    ['About 33 TB', 'Right. 20M × 500 B = 10 GB/day; × 365 = 3.65 TB/yr; × 3 years ≈ 11 TB; × 3 replicas ≈ 33 TB.'],
    ['About 11 TB', 'That is the logical size. Every replica is a full copy on its own disks, so raw disk is ×3.'],
    ['About 33 GB', 'Same digits, wrong rung: 3.65 TB per year is already past 33 GB. Climb KB → MB → GB → TB one step at a time.'],
    ['About 3.7 TB', 'That is one year, one copy. The question asks for three years and three replicas.'],
  ]),
  step('Moments photos come to about 5.5 PB a year. They go into a managed object store. Do you multiply by 3 for replication?', [], 1, [
    ['Yes, always multiply by 3', 'Only when you run the copies yourself. A managed object store keeps its own redundancy and bills you for the bytes you stored.'],
    ['No: the store handles redundancy; if you ran it yourself, erasure coding would cost about 1.2–1.5×, not 3×', 'Right. Say which world you are in. Self-run triple replication is 3×; an erasure code such as Reed–Solomon (10, 4) stores 14 blocks per 10 of data, 1.4×.'],
    ['No, because photos are never lost', 'Durability is exactly why redundancy exists. The point is who pays for it, and how much.'],
  ]),
];

export const bandwidth = [
  step('Feed API at peak: 15,000 req/s, each response about 20 KB. Egress in Gbps?', [], 1, [
    ['About 0.3 Gbps', 'You stopped at 300 MB/s and read it as 0.3 G. Network capacity is in bits: × 8.'],
    ['About 2.4 Gbps', 'Right. 15,000 × 20 KB = 300 MB/s; × 8 = 2.4 Gbps. Spread across the fleet, that is a non-issue. Say so and move on.'],
    ['About 24 Gbps', 'One zero too many: 15,000 × 20,000 B is 3 × 10⁸ B/s, not 3 × 10⁹.'],
    ['About 300 Gbps', 'That treats 300 MB/s as 300 Gb/s and then forgets the bytes entirely. Convert once, carefully: MB/s × 8 = Mb/s.'],
  ]),
  step('Feed images average 10 GB/s of egress. The CDN’s hit ratio is 95%. What does the origin serve on average?', [
    row('Egress', ['10 GB/s', '95% edge', '5% origin'], {}, { tones: { 2: 'hot' } }),
  ], 0, [
    ['About 0.5 GB/s', 'Right. The origin only sees misses: (1 − 0.95) × 10 GB/s = 0.5 GB/s. The same (1 − h) × load rule as any cache.'],
    ['About 9.5 GB/s', 'That is what the edge serves. The origin sees the misses, 5%.'],
    ['About 10 GB/s', 'A CDN with a 95% hit ratio removes most of the origin load. That is the reason it exists.'],
  ]),
];

export const memory = [
  step('Kestrel has 50M profiles of about 2 KB each, and about 10% are read on a given day. How big is the cache working set?', [], 1, [
    ['100 GB', 'That is the whole dataset. Cache the data that is actually read, not everything you own.'],
    ['10 GB', 'Right. 50M × 2 KB = 100 GB total; 10% active = 10 GB. It fits on one cache node.'],
    ['1 GB', 'You took 10% twice. 10% of 100 GB is 10 GB.'],
    ['10 TB', 'Unit slip: 50 × 10⁶ × 2 × 10³ B = 10¹¹ B = 100 GB, and 10% of that is 10 GB.'],
  ]),
  step('A cache working set is 4 GB. Each node has 64 GB of RAM. Why might you still run 3 Redis nodes?', [], 1, [
    ['Capacity: 4 GB is too much for one node', '4 GB is about 6% of one node. Capacity is not the reason.'],
    ['Availability: surviving a node failure. Capacity is a non-issue', 'Right. Capacity-driven versus availability-driven clustering. Replicas exist so one node dying does not cold-start the cache and stampede the database behind it.'],
    ['Bandwidth: splitting network load', 'Possible at extreme request rates, but nothing here says the network is the limit. The ordinary reason is surviving failure.'],
    ['You would never run 3 nodes for 4 GB', 'You would, whenever the cache is load-bearing. Losing it would push every read onto the database.'],
  ]),
  step('Moments post cache: the hot set is 15 GB (fits one node). At peak the feed needs 300,000 post lookups per second, and you assume one node serves about 100,000 simple operations per second. How many primaries?', [], 2, [
    ['1: the data fits', 'Capacity fits in one node; throughput does not. 300,000 ÷ 100,000 = 3.'],
    ['2', '300,000 ÷ 100,000 = 3, and that is already at 100% of the assumed per-node rate.'],
    ['3, plus a replica each', 'Right. Throughput drives the count here, capacity does not. Then add replicas for availability. Benchmark the per-node number; do not trust anyone’s rule of thumb, including this one.'],
  ]),
];

export const servers = [
  step('Peak is 15,000 req/s. One app server handles about 1,000 req/s at full CPU, and you plan for 60% utilisation. How many servers?', [], 2, [
    ['15', 'That runs every server at 100% at peak. Latency explodes long before 100%, and you have no room for a failure.'],
    ['9', 'That is 5,000 ÷ 600: sized for the average, not the peak.'],
    ['25', 'Right. 15,000 ÷ (1,000 × 0.6) = 25. Spread them across three zones (round up to 27) so losing a zone leaves 18 servers at about 83%.'],
  ]),
  step('Each server handles 600 req/s and the average request takes 100 ms. How many requests are in flight on one server, on average?', [], 1, [
    ['6', 'You used 10 ms. 100 ms = 0.1 s, so L = 600 × 0.1.'],
    ['60', 'Right. Little’s law: L = λ × W = 600/s × 0.1 s = 60. A thread-per-request server needs at least 60 threads, plus headroom for bursts.'],
    ['60,000', 'You multiplied by 100 (milliseconds) instead of 0.1 (seconds). Keep units consistent: requests/second × seconds.'],
  ]),
  step('A dependency slows down: latency goes from 100 ms to 2 s at the same 600 req/s. The server has 200 worker threads. What happens, and what is the fix?', [], 0, [
    ['In-flight jumps to 1,200, the pool saturates and requests queue; a timeout (say 300 ms) caps it near 180', 'Right. L = 600 × 2 = 1,200 > 200 threads. With a 300 ms timeout, L ≤ 600 × 0.3 = 180, so the pool survives and the slow dependency fails fast instead of taking you down with it.'],
    ['Nothing: throughput did not change', 'Little’s law says concurrency is throughput × latency. Same throughput, 20× latency: 20× the threads tied up.'],
    ['Add more threads until it fits', '1,200 threads per server is a lot of memory and context switching, and the next slowdown needs even more. Bound the wait instead.'],
  ]),
];

export const availability = [
  step('A service promises 99.99% availability. How much downtime is that per year?', [], 0, [
    ['About 53 minutes', 'Right. 0.01% of 525,600 minutes ≈ 52.6 minutes a year, about 4.3 minutes a month.'],
    ['About 8.8 hours', 'That is three nines (99.9%): 0.1% of 8,760 hours.'],
    ['About 5 minutes', 'That is five nines (99.999%).'],
    ['About 4.4 hours', 'That is 99.95%.'],
  ]),
  step('A request must pass through three components in series, each 99.9% available. What is the availability of the whole path?', [
    row('Path', ['99.9%', '99.9%', '99.9%'], {}, { join: '→' }),
  ], 1, [
    ['99.9%, the weakest link', 'Serial availabilities multiply. Each component adds its own downtime.'],
    ['About 99.7%', 'Right. 0.999³ ≈ 0.997. A quick approximation: add the unavailabilities, 0.1% × 3 = 0.3%.'],
    ['About 99.9999%', 'That is the parallel formula. In series, any one failure fails the request.'],
  ]),
  step('Two independent replicas, each 99% available, sit behind a load balancer that fails over instantly. Availability of the pair?', [], 2, [
    ['99%', 'Redundancy helps: the pair is down only when both are down at once.'],
    ['98.01%', 'That multiplies the availabilities, which is the serial formula. In parallel, multiply the unavailabilities.'],
    ['99.99%', 'Right. 1 − (0.01 × 0.01) = 0.9999. The catch: it assumes independent failures and perfect failover. A shared rack, deploy or bug breaks the assumption.'],
  ]),
];

export const sharding = [
  step('Kestrel order history holds 30 TB today and grows 10 TB a year. You plan two years ahead at about 2 TB per shard. How many shards?', [], 1, [
    ['15', 'That fits today’s 30 TB and fills up within months. Plan for where the data will be: 30 + 2 × 10 = 50 TB.'],
    ['25', 'Right. (30 + 20) TB ÷ 2 TB = 25 shards, each with its own replicas.'],
    ['75', 'That counts each of the 3 replicas as a shard. Shards split the data; replicas copy it. 25 shards × 3 copies = 75 machines.'],
  ]),
  step('Like counters: about 90 GB a year of data, but 20,000 writes per second at peak. One primary comfortably takes about 5,000 writes per second. Shards?', [], 2, [
    ['1: the data fits on one node', 'Storage fits; writes do not. Check every axis that can force a split.'],
    ['1 primary plus read replicas', 'Replicas copy every write. They add read capacity, never write capacity.'],
    ['4, or fewer if you batch increments', 'Right. 20,000 ÷ 5,000 = 4. Throughput drives this split. Coalescing increments in memory and flushing every second can cut the write rate sharply. Say what you would lose on a crash.'],
  ]),
];

export const chat = [
  step('Kestrel Chat stores 1B messages a day at about 200 B each, replicated 3 times. Raw disk per year?', [
    row('Chain', ['200 GB/day', '73 TB/yr', '219 TB/yr'], { 1: '×365', 2: '×3' }, { join: '→', tones: { 2: 'hot' } }),
  ], 0, [
    ['About 219 TB', 'Right. 10⁹ × 200 B = 200 GB/day; × 365 = 73 TB/yr logical; × 3 replicas = 219 TB raw.'],
    ['About 73 TB', 'That is the logical size. Three replicas means three full copies on disk.'],
    ['About 219 GB', 'Rung slip. 200 GB a day becomes tens of TB in a year.'],
    ['About 73 PB', 'That is 200 KB per message, a thousand times too big. A text message with metadata is hundreds of bytes.'],
  ]),
  step('20M DAU, each connected for about 60 minutes a day in total. How many connections are open at an average moment?', [], 1, [
    ['About 20 million', 'That assumes everyone is online at the same moment. Each user is connected for 60 of the day’s 1,440 minutes.'],
    ['About 830,000', 'Right. Little’s law: arrivals × time connected. 20M × 60 min ÷ 1,440 min ≈ 833K. With a 3× peak, about 2.5M, or 25 gateways at a conservative 100K each.'],
    ['About 14,000', 'That is 20M ÷ 1,440 minutes: users arriving per minute, without multiplying by how long each one stays.'],
  ]),
];

export const shortener = [
  step('Kestrel Links: 1M new links a day for 5 years, so about 1.8 billion links. Are 6 base-62 characters enough?', [], 0, [
    ['Yes: 62⁶ ≈ 57 billion, about 31× headroom', 'Right. 62⁶ ≈ 5.7 × 10¹⁰ against 1.825 × 10⁹. Seven characters (62⁷ ≈ 3.5 × 10¹²) buys room for 100× growth.'],
    ['No: you need at least 10 characters', 'Count it: 62⁶ is already about 57 billion. Ten characters is about 8 × 10¹⁷, far beyond any need.'],
    ['Only if links expire', 'Expiry helps, but the arithmetic says 6 characters already cover five years with room to spare.'],
  ]),
  step('Now the interviewer says "100× the traffic": 100M new links a day, 500 B per row, 5 years. What changes?', [], 2, [
    ['Nothing: Postgres handles it', 'At 1M a day the 5-year total was about 1 TB. At 100M a day it is about 91 TB, far past a comfortable single node.'],
    ['Bandwidth becomes the problem', 'Redirect responses are tiny: even 300K/s × 500 B is 150 MB/s. Storage and read QPS move, not bandwidth.'],
    ['About 91 TB means sharding by short code, and 182B links need 7 characters', 'Right. 100M × 500 B × 365 × 5 ≈ 91 TB. And 182.5B links exceed 62⁶ (≈ 57B), so move to 7 characters (≈ 3.5T, 19× headroom).'],
  ]),
];

export const metrics = [
  step('10,000 hosts each emit 1,000 metric series, sampled every 10 seconds. Samples per second?', [], 0, [
    ['1 million per second', 'Right. 10,000 × 1,000 = 10M series; ÷ 10 s = 1M samples/s.'],
    ['10 million per second', 'That is the number of series. Each one sends a sample every 10 seconds, so divide by 10.'],
    ['100,000 per second', 'One zero short: 10⁷ series ÷ 10 s = 10⁶ samples/s.'],
  ]),
  step('A metric had 20 series per host across 10,000 hosts. Someone adds a customer_id label with 50,000 values. Worst-case series count?', [], 1, [
    ['About 250,000: the label adds 50,000', 'Labels multiply, they do not add. Every existing series can split into one series per customer.'],
    ['About 10 billion', 'Right, as a worst case: 200,000 × 50,000 = 10¹⁰. Cardinality, not sample rate, is what usually melts a time-series database. Keep unbounded ids out of labels.'],
    ['Still 200,000: labels are free', 'Each distinct label combination is its own series, with its own index entry and memory.'],
  ]),
];

export const video = [
  step('Kestrel Clips: 1M uploads a day, 50 MB each, peak 3× average. Peak ingress in Gbps?', [], 0, [
    ['About 12 Gbps', 'Right. 50 TB/day ÷ 10⁵ s = 500 MB/s average; × 3 = 1.5 GB/s; × 8 = 12 Gbps. Uploads go straight to object storage with presigned URLs, not through app servers.'],
    ['About 1.5 Gbps', 'That is 1.5 GB/s written as Gbps. Bytes to bits is × 8.'],
    ['About 4 Gbps', 'That is the average (500 MB/s × 8). Size the ingest path for peak.'],
    ['About 120 Gbps', 'One zero too many. 1M × 50 MB = 5 × 10¹³ B a day, ÷ 10⁵ = 5 × 10⁸ B/s.'],
  ]),
  step('A 50 MB upload over a 10 Mbps phone uplink takes about 40 s. At peak, 30 uploads start per second. How many uploads are in progress at once?', [], 1, [
    ['About 30', 'That is the arrival rate. Each upload stays open for 40 seconds.'],
    ['About 1,200', 'Right. Little’s law: 30/s × 40 s = 1,200. Cross-check: 1,200 × 10 Mbps = 12 Gbps, the same peak as before. Two routes, one answer.'],
    ['About 0.75', 'That is 30 ÷ 40. Concurrency is rate × duration, not rate ÷ duration.'],
  ]),
  step('Transcoding needs about 2,800 cores on average and about 8,300 at the 3× peak. Uploads land in a queue. What do you provision?', [], 1, [
    ['8,300 cores, for peak', 'Only if every video must be ready within seconds of upload. A queue lets work wait.'],
    ['Near the average plus headroom, and let the queue absorb the peak', 'Right. Asynchronous work can be sized close to the average (about 87 machines of 32 cores, versus about 261 for peak). The cost is latency at peak: say how long a creator may wait.'],
    ['2,800 exactly, no headroom', 'At exactly average capacity the backlog never drains after a peak. Leave headroom.'],
  ]),
];

export const sanity = [
  step('A candidate says Kestrel Chat needs 73 PB of storage a year (1B messages a day). Where is the slip most likely?', [], 0, [
    ['They used about 200 KB per message instead of about 200 B', 'Right. 10⁹ × 200 KB × 365 = 73 PB. With 200 B per message it is 73 TB. A thousandfold error is almost always a unit, not a rate.'],
    ['They forgot replication', 'Replication would make it bigger, and only 3×. A 1000× gap points at a unit.'],
    ['Nothing: chat is huge', 'Normalise it: 73 PB ÷ 20M users ÷ 365 ≈ 10 MB of text per user per day. Nobody types that much.'],
  ]),
  step('You estimated 1 PB a day of image egress for 50M DAU. What is the fastest sanity check?', [], 1, [
    ['Recompute it with 86,400 instead of 10⁵', 'That changes the answer by about 14%. It cannot catch the 10× or 1000× mistakes that matter.'],
    ['Divide by users: 1 PB ÷ 50M ≈ 20 MB per user per day. About ten feed opens of ten 200 KB images: plausible', 'Right. Per-user normalisation turns an abstract total into something you can picture.'],
    ['Ask the interviewer whether 1 PB is right', 'They want to watch you check it yourself.'],
  ]),
];

export const skip = [
  step('The prompt: "Design a rate limiter that must handle 1M requests per second." How much estimation?', [], 2, [
    ['The full sweep: DAU, QPS, storage, bandwidth, memory', 'The interviewer handed you the QPS. Deriving it again wastes minutes.'],
    ['None: the number is given', 'The given number still has a consequence you should say: what it means for latency and memory.'],
    ['Only what the given number implies: a sub-millisecond in-memory check, and counter memory', 'Right. Use the number, do not re-derive it. One minute: "1M QPS means an in-memory check; 50K keys × ~10 endpoints × ~100 B ≈ 50 MB, so one node’s worth of memory, sharded for throughput."'],
  ]),
  step('An internal admin tool for 200 employees. The interviewer seems keen to get to the data model. What do you say about estimation?', [], 0, [
    ['"At 200 users, load is trivial: one small instance and one database. I’ll skip detailed numbers unless something surprises us."', 'Right. Skip it out loud, with the reason. Silent skips read as "forgot"; a stated skip reads as judgment.'],
    ['Nothing. Move straight to the data model', 'Silent skips are on your own gap list. Say the one sentence that shows you checked.'],
    ['Compute QPS, storage, bandwidth and memory anyway', 'Every number would end in "this is tiny". That is five minutes for a conclusion you could state in one sentence.'],
  ]),
];

export const drills = [
  step('Mid-estimation you catch yourself writing "0.5 TB/day" for 1M × 500 B. Which killer is this?', [], 1, [
    ['The stale-numbers killer', 'Stale numbers means reusing an earlier axis’s inputs. Here the inputs are right; the unit is wrong.'],
    ['The unit-slip killer: it is 500 MB/day, one rung skipped and 1000× too high', 'Right. 1M × 500 B = 5 × 10⁸ B = 500 MB. The GB↔TB class of slip, exactly the one your live reps caught. Climb one rung at a time, out loud.'],
    ['No killer: 0.5 TB is right', '10⁶ × 5 × 10² = 5 × 10⁸ bytes, which is 500 MB, not 500 GB.'],
    ['The peak-factor killer', 'Peak factors are about QPS. This is a units problem.'],
  ]),
  step('You compute 200 GB a year for a metadata store. What is the required next sentence?', [], 1, [
    ['"Let me double-check with exact byte counts."', 'Precision is not the goal. Every estimate must end in a decision.'],
    ['"So about 1 TB in five years; a single Postgres handles that; sharding is not a day-one problem."', 'Right. The conclusion sentence is the deliverable. 200 GB a year is small, so the decision is "no sharding yet".'],
    ['"We should use Cassandra for scale."', 'That ignores your own numbers. Nothing at 200 GB a year needs a distributed store.'],
    ['"Adding a 30% buffer for indexes brings it to 260 GB."', 'Fair arithmetic, still no conclusion. Refining a number that already says "small" changes nothing.'],
  ]),
  step('Peak QPS for a new service: 9,000. Per-server throughput: 1,500 req/s at full CPU. Target utilisation: 60%. Servers?', [], 1, [
    ['6', '9,000 ÷ 1,500 = 6 runs every box at 100% at peak, with nothing spare for a failure.'],
    ['10, then spread across zones', 'Right. 9,000 ÷ (1,500 × 0.6) = 10. Then check that losing one zone still leaves enough.'],
    ['4', 'That divides by 2,250 (1,500 × 1.5). Headroom means more servers, not fewer.'],
  ]),
  step('Your request path calls 10 services in series, each 99.9% available. Roughly what can you promise end to end?', [], 0, [
    ['About 99.0%: roughly 3.65 days of downtime a year', 'Right. 0.999¹⁰ ≈ 0.990. Long serial chains eat nines; that is why critical paths are kept short and dependencies made optional.'],
    ['99.9%: each one is 99.9%', 'Serial availabilities multiply. Ten small risks add up to one large one.'],
    ['99.99%: there are ten of them', 'More components in series means less availability, not more.'],
  ]),
  step('A connection pool: the service does 2,000 queries per second, each holding a connection for 5 ms. Minimum busy connections on average?', [], 2, [
    ['2', 'You used 1 ms. 5 ms = 0.005 s.'],
    ['400', 'You used 0.2 s. 2,000 × 0.005 = 10.'],
    ['10, so a pool of about 20 gives burst headroom', 'Right. Little’s law: 2,000/s × 0.005 s = 10 connections busy on average. Pools sized in the hundreds per server overwhelm the database; each Postgres connection is a whole backend process.'],
  ]),
  step('Ten minutes in, requirements ran long and the interviewer looks at the clock. How do you handle estimation?', [], 1, [
    ['Do the full five-minute sweep anyway; it is in the framework', 'The framework serves the interview, not the other way round. You would burn time you no longer have.'],
    ['Say the one or two numbers that drive the design in under a minute, and offer to size the rest in the deep dive', 'Right. "Reads dominate at about 100:1 and roughly 15K peak QPS, so: cache plus replicas. I’ll size storage when we pick the database." Lazy estimation, said out loud.'],
    ['Skip it silently and draw boxes', 'A silent skip is on your gap list. One sentence turns it into judgment.'],
  ]),
];
