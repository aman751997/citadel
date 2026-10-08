import { row, step } from '../../lib/trace.ts';

// Chapter 1 · Why async
export const whyAsync = [
  step('Kestrel Clips transcodes each upload inside the HTTP request. A transcode takes about 120 seconds, and peak is 30 uploads per second. How many requests are held open at once (Little’s law: in flight = arrival rate × time in system)?', [], 2, [
    ['30', 'That is the arrival rate per second, not how many are in the system. Each one stays for 120 seconds.'],
    ['250', '30 ÷ 120 is not a quantity anything measures. Multiply rate by duration.'],
    ['3,600', 'Right. 30 per second × 120 seconds = 3,600 requests in flight, each pinning a thread, a connection and a load-balancer slot — and most load balancers will cut them off long before 120 seconds.'],
    ['120', 'That is the duration of one request. Little’s law multiplies it by the arrival rate.'],
  ]),
  step('Which of these belongs behind a queue rather than inside the request?', [], 1, [
    ['Fetching a user’s profile (5 ms)', 'Fast, cheap, and the user needs the answer to render the page. A queue adds latency and moving parts for nothing.'],
    ['Generating a PDF of a year of transactions (about 2 minutes)', 'Right. Longer than any sane request timeout, bursty at month-end, and safely retriable. Accept it, return a tracking id, do it in the background.'],
    ['Checking a password at login', 'The user cannot proceed without the answer, and it takes milliseconds. Keep it synchronous.'],
  ]),
];

// Chapter 2 · The template
export const template = [
  step('A job request arrives. In which order should the API persist the job and enqueue it?', [], 0, [
    ['Insert the job row (status queued), then enqueue its id; a reconciler re-enqueues rows stuck in queued', 'Right. The row is the truth and the queue is a delivery mechanism. If the enqueue fails, the reconciler finds the row and closes the gap.'],
    ['Enqueue first, then insert the row', 'If the insert fails after the enqueue, a worker runs a job that officially does not exist — no status, no owner, nothing to show the user.'],
    ['Enqueue only; the queue is durable', 'Durable until the message is consumed, dead-lettered or expires. Then there is no record that the job ever existed, nothing to poll, and nothing to audit.'],
  ]),
  step('What should the API return to the client for a 2-minute export?', [], 2, [
    ['200 with the file, after waiting two minutes', 'The request outlives most timeouts, and a retry by the client or a proxy starts a second export.'],
    ['201 Created with an empty body', '201 says the resource now exists. The export does not exist yet, and the client has no id to ask about.'],
    ['202 Accepted with a job id and a status URL', 'Right. 202 means “accepted for processing, not done”. The job id is the tracking number; GET /jobs/{id} answers “is it done?”.'],
  ]),
  step('A partner’s server, not a browser, starts the export. How should it learn the job finished?', [], 1, [
    ['A WebSocket from Kestrel to the partner', 'Persistent connections suit live user interfaces. A partner’s backend wants a call it can receive whenever the job ends, even hours later.'],
    ['A signed webhook, retried with backoff until acknowledged — with GET /jobs/{id} still available', 'Right. Server-to-server completion is a webhook. Sign it, retry it, make the receiver idempotent on the job id, and keep polling as the fallback.'],
    ['Polling every 100 ms', 'Polling is a fine fallback, but at 100 ms for a job that takes minutes it is thousands of wasted requests per job.'],
  ]),
];

// Chapter 3 · The state machine
export const states = [
  step('Job 42 says running. Its lease expired ten minutes ago, there is no heartbeat, and it has used 2 of 5 attempts. What should the reconciler do?', [
    row('Job 42', ['running', 'lease expired', 'attempt 2 of 5'], {}, { tones: { 1: 'hot' } }),
  ], 1, [
    ['Leave it; the worker may come back', 'A worker that misses heartbeats for ten minutes is gone or partitioned. Waiting forever is how jobs hang for days.'],
    ['Move it to retrying with a backoff delay; the next claim becomes attempt 3', 'Right. An expired lease means attempt 2 failed. With attempts left, schedule another; at the cap, it goes to dead.'],
    ['Mark it succeeded, since nobody reported an error', 'Silence is not success. Nothing was written, and the user would download nothing.'],
    ['Delete the row', 'Then nothing remembers the job existed, and the user’s status page breaks.'],
  ]),
  step("Attempt 2’s worker was only paused (a long GC). It wakes up after attempt 3 has started and runs: UPDATE jobs SET status = 'succeeded' WHERE id = 42 AND attempt = 2. What happens?", [
    row('Job 42 row', ['attempt = 3', 'status = running'], { 0: 'NOW' }, { tones: { 0: 'hot' } }),
  ], 0, [
    ['0 rows change — the zombie’s write is rejected', 'Right. The attempt number is a fencing token. Only the current attempt may move the job. The zombie learns it lost and stops.'],
    ['The job becomes succeeded, and attempt 3 keeps running', 'That would happen without the attempt check — and attempt 3 might later fail and overwrite the status again.'],
    ['The database raises an error', 'A WHERE clause that matches nothing is not an error. It changes 0 rows, which the worker must check.'],
  ]),
];

// Chapter 4 · Leases
export const leases = [
  step('SQS visibility timeout is 30 seconds. Transcodes take 4 minutes at p99. Users report videos processed two or three times. Why, and what fixes it?', [], 2, [
    ['SQS is losing acknowledgements; switch brokers', 'The broker is doing what it was told: a message not deleted within 30 seconds becomes visible again.'],
    ['Add more workers so each job finishes sooner', 'More workers do not make one transcode faster. Each job still runs about 4 minutes.'],
    ['The message reappears while the first worker is still busy. Heartbeat to extend the timeout while working, and keep the work idempotent', 'Right. A lease must outlive the work. Extend it in small steps while alive, so a dead worker’s job still comes back quickly.'],
  ]),
  step('Why extend the lease in small steps (say 60 seconds, renewed every 20) instead of setting a 2-hour timeout once?', [], 0, [
    ['A crashed worker’s job comes back in about a minute instead of two hours', 'Right. The lease length is how long a crash goes unnoticed. Short leases plus heartbeats give fast recovery without cutting off slow, healthy work.'],
    ['Long timeouts are not allowed by any broker', 'Many queues allow long visibility timeouts (SQS allows hours — check current docs). The problem is recovery time, not permission.'],
    ['Heartbeats make the job run faster', 'Heartbeats only prove liveness. They do not change the work.'],
  ]),
];

// Chapter 5 · Retries and dead letters
export const retries = [
  step('A transcode fails with “unsupported codec” — the upload is a file the encoder cannot read. What should the worker do?', [], 1, [
    ['Retry with exponential backoff, 5 attempts', 'The file will be just as unreadable on attempt 5. Retries help transient failures, not permanent ones.'],
    ['Fail it as permanent now: mark the job failed, tell the user, and dead-letter it for inspection', 'Right. Classify first. A permanent error skips the retry loop; the user hears “we can’t process this file” in seconds, not after an hour.'],
    ['Retry forever until it works', 'This is the poison message: it burns a worker on every attempt and never finishes.'],
  ]),
  step('The thumbnail service has outages that last up to 20 minutes. Retry policy A: 6 attempts, delays 1, 2, 4, 8, 16 s. Policy B: 8 attempts, delays 30 s doubling (30 s … 32 min). Which rides out the outage?', [
    row('A delays (s)', [1, 2, 4, 8, 16], {}, {}),
    row('B delays (s)', [30, 60, 120, 240, 480, 960, 1920], {}, {}),
  ], 1, [
    ['A — it retries more often', 'A gives up after 1 + 2 + 4 + 8 + 16 = 31 seconds. Every job that hits the outage lands in the dead-letter queue.'],
    ['B — its retries span about an hour', 'Right. 30 + 60 + … + 1,920 = 3,810 s ≈ 63.5 minutes of backoff, longer than the outage. Size the retry window to the failures you want to absorb, and add jitter.'],
    ['Neither — retries cannot survive outages', 'They can, if the total backoff is longer than the outage. That is what a retry window is for.'],
  ]),
];

// Chapter 6 · Exactly-once effects
export const effects = [
  step('Transcode workers write their output. Which key makes a retried attempt harmless?', [], 1, [
    ['videos/{videoId}/{uuid-per-attempt}.ts', 'Each retry writes a new file. Duplicates pile up, and something has to decide which one is real.'],
    ['videos/{videoId}/720p/chunk-0007.ts', 'Right. A deterministic key means a retry overwrites the same object with the same content. The effect is the same whether it ran once or three times.'],
    ['A key chosen by the queue’s message id', 'If the job is ever re-enqueued (a reconciler, a redrive), it gets a new message id and a new key.'],
  ]),
  step('The export worker uploads the CSV, emails the download link, then crashes before marking the job done. The job is redelivered. How do you stop a second email?', [], 2, [
    ['You cannot; email is at-least-once, accept duplicates', 'Sometimes acceptable for a receipt, but there is a cheap fix here.'],
    ['Send the email before uploading the file', 'Then a crash after the email sends a link to a file that does not exist.'],
    ['Record “email sent for job 81” atomically before or with sending (or pass the job id as the provider’s idempotency key), and check it on retry', 'Right. The file write is idempotent by its deterministic key; the email needs its own marker. Name which side you choose: marker first risks a lost email, send first risks a duplicate.'],
  ]),
];

// Chapter 7 · Priorities and fairness
export const fairness = [
  step('One FIFO queue serves every tenant at 2,000 jobs per second. Tenant A enqueues 1,000,000 jobs. Tenant B then enqueues one. How long does B’s job wait?', [
    row('Queue', ['A', 'A', 'A', '… 1,000,000 A', 'B'], { 4: 'B' }, { tones: { 4: 'hot' } }),
  ], 2, [
    ['About 2 seconds', 'Only if B were near the front. It is behind a million jobs.'],
    ['About 1 minute', '1,000,000 ÷ 2,000 is 500 seconds, not 60.'],
    ['About 8 minutes', 'Right. 1,000,000 ÷ 2,000 = 500 s ≈ 8.3 minutes. One tenant’s burst became everyone’s latency. Per-tenant queues served round-robin fix it.'],
  ]),
  step('Interactive and batch jobs share 2,000 jobs/s of workers. With strict priority, batch jobs sometimes wait for hours. With weighted fair scheduling at 4 : 1, what throughput is batch guaranteed when interactive is saturating?', [], 1, [
    ['0 jobs/s — interactive always comes first', 'That is strict priority, the source of the starvation.'],
    ['400 jobs/s', 'Right. Batch gets 1 ÷ (4 + 1) = 20% of 2,000 = 400 jobs/s, no matter how busy interactive is. And when interactive is idle, a work-conserving scheduler gives batch all 2,000.'],
    ['1,000 jobs/s', 'That would be an even split. Weights 4 : 1 give batch one share in five.'],
  ]),
];

// Chapter 8 · Back-pressure, autoscaling and cost
export const scaling = [
  step('Kestrel Clips: 1,000,000 one-minute videos a day; the full rendition ladder costs about 4 core-minutes per video-minute. About how many cores are busy on average?', [], 1, [
    ['About 4,000,000', 'That is core-minutes per day. Divide by the 1,440 minutes in a day to get cores busy at once.'],
    ['About 2,800', 'Right. 4,000,000 core-minutes ÷ 1,440 minutes ≈ 2,778 cores — about 87 machines of 32 cores. Peak at 3× is about 8,300 cores, or 261 machines.'],
    ['About 46', '4,000,000 ÷ 86,400 divides core-minutes by seconds. The units do not match.'],
  ]),
  step('Which signal should drive autoscaling of the transcode workers?', [], 2, [
    ['Worker CPU', 'Workers sit at 100% CPU whether the backlog is ten jobs or ten million. CPU says they are busy, not that they are behind.'],
    ['Requests per second at the upload API', 'Upload rate predicts future work, but it ignores job size and how far behind you already are.'],
    ['Age of the oldest queued job (or backlog ÷ drain rate)', 'Right. Age is what users feel — “your video will be ready in…” — and it accounts for job size. Depth alone means nothing without the time each job takes.'],
  ]),
];

// Chapter 9 · Progress and cancellation
export const progress = [
  step('The transcode worker can report progress after every encoded frame (thousands per second across the fleet) or after every finished chunk. Which, and where does it go?', [], 1, [
    ['Every frame, written to the job row', 'Thousands of writes a second to the database, to move a progress bar that nobody can see change that fast.'],
    ['Per chunk (or at most every few seconds), as a counter on the job; clients poll or get pushed the change', 'Right. Progress is a cheap derived number — chunks done ÷ chunks total. Throttle the writes; push over SSE or WebSocket only if the UI is watching.'],
    ['Never; show a spinner', 'For a job that takes minutes, users need a sign of life — and support needs to tell “slow” from “stuck”.'],
  ]),
  step('A user cancels a 300-task transcode: 120 tasks done, 40 running, 140 still queued. What should cancellation do?', [
    row('Tasks', ['120 done', '40 running', '140 queued'], {}, { tones: { 1: 'hot' } }),
  ], 0, [
    ['Mark the job cancelled; queued tasks skip themselves when dequeued, running ones stop at their next heartbeat, a sweeper deletes the outputs', 'Right. Cancellation is a state on the job row that every worker checks at safe points. You do not chase 140 messages through the queue.'],
    ['Delete the 140 messages from the queue', 'Most queues cannot delete arbitrary messages by content, and the 40 running tasks keep going.'],
    ['Kill the worker processes', 'They are shared by every user’s jobs. And killed tasks would simply be redelivered after the lease.'],
  ]),
];

// Chapter 10 · Staged pipelines
export const pipelines = [
  step('Video processing runs as one 40-minute job: validate, transcode, thumbnails, package, publish. The thumbnail step fails. What does splitting into stages, each with its own queue, buy?', [], 2, [
    ['Nothing — one job is simpler and equally reliable', 'A failure anywhere repeats everything before it, and every step must scale like the slowest one.'],
    ['Faster thumbnails', 'Thumbnails are fast either way. The gains are in retry and scaling.'],
    ['Only the thumbnail stage retries; each stage scales on its own backlog; a slow stage does not block the others', 'Right. Independent retry, independent scaling (transcode needs thousands of cores, thumbnails a few), and failure isolation.'],
  ]),
  step('A stage hands a 4 GB video to the next stage. What goes in the message?', [], 0, [
    ['The object key and job id — the bytes stay in object storage', 'Right. The claim-check pattern. Messages stay small; workers fetch what they need directly from storage.'],
    ['The video bytes, base64-encoded', 'Brokers cap message sizes far below this (check current limits), and every hop would copy 4 GB.'],
    ['A path on the previous worker’s local disk', 'That worker may be gone by the time the next stage runs. Local disks are not shared.'],
  ]),
];

// Chapter 11 · Fan-out and fan-in
export const fanIn = [
  step('A 60-minute video becomes 60 chunks × 5 renditions = 300 tasks. A counter starts at 300 and every finished task runs DECR. Task 17 finishes, DECRs, and its worker dies before acknowledging. Task 17 is redelivered and DECRs again. What happens?', [
    row('remaining', [300, '…', 2, 1, 0], { 4: 'ZERO' }, { tones: { 4: 'hot' } }),
    row('task 17', ['done', 'redelivered', 'done again'], {}, { tones: { 2: 'hot' } }),
  ], 1, [
    ['Nothing — DECR is atomic', 'Atomic means two DECRs never interleave badly. It does not mean the same task is counted once.'],
    ['The counter reaches 0 one task early, and packaging starts while a chunk is still missing', 'Right. Atomic is not idempotent. A redelivered completion was counted twice, so the fan-in fired early — a video with a hole in it.'],
    ['The counter goes negative and the stage never fires', 'It hits 0 first — one task too soon — and that is when the next stage fires.'],
  ]),
  step('How do you count each task exactly once?', [], 2, [
    ['Wrap DECR in a retry loop', 'Retrying the decrement makes double counting more likely, not less.'],
    ['Use a bigger counter type', 'Size is not the problem. Counting the same completion twice is.'],
    ['Mark the task done with a conditional update (only if not already done) and decrement in the same transaction; the stage transition is itself conditional', "Right. UPDATE tasks SET state = 'done' WHERE id = 17 AND state <> 'done' — if 1 row changed, decrement. A redelivery changes 0 rows and counts nothing. Then UPDATE videos SET state = 'packaging' WHERE id = 9 AND state = 'transcoding' lets exactly one worker fire the next stage."],
  ]),
  step('Task 233 hits a poison chunk and is dead-lettered. The counter sits at 1 forever. What notices?', [], 0, [
    ['The parent job: a dead child fails the parent (or a sweeper fails parents with no progress past a deadline)', 'Right. Fan-in needs a failure path, not just a success path. A dead child should move the parent to failed (or partially-ready, if you allow it) and tell the user.'],
    ['Nothing needs to — it will finish eventually', 'A dead-lettered task never finishes on its own. Without a deadline the video is “processing” forever.'],
    ['The counter’s TTL', 'A TTL would silently delete the counter, which loses the information that the video is broken.'],
  ]),
];

// Chapter 12 · Orchestration vs choreography
export const orchestration = [
  step('Seven stages, timeouts per stage, a “retry from stage 4” button for support, and a status page showing exactly where each video is. Which shape fits?', [], 1, [
    ['Choreography: each stage listens for the previous stage’s event', 'Works, but the flow lives in seven services’ subscriptions. “Where is video 9 and what happens next?” has no single answer to show support.'],
    ['Orchestration: one workflow definition drives the stages and records each step', 'Right. When you need to see, time out, retry or change the whole flow, put the plan in one place — a workflow engine or an orchestrator service with a state table.'],
    ['A single 40-minute job', 'You would lose per-stage retry and scaling — the reason for stages.'],
  ]),
  step('Your workflow code (in a replay-based engine such as Temporal) calls the system clock and a random number generator directly. Why might that break?', [], 2, [
    ['Workflow engines forbid all side effects', 'Side effects are allowed — inside activities. The rule is about the workflow function itself.'],
    ['Clocks are too slow for workflows', 'Speed is not the issue.'],
    ['The engine rebuilds state by replaying the workflow code against its recorded history; non-deterministic calls can take a different path on replay', 'Right. Replay-based engines require deterministic workflow code and provide their own time and random APIs (check the engine’s docs). Do I/O in activities.'],
  ]),
];

// Chapter 13 · Scheduled jobs
export const scheduler = [
  step('Ten million schedules (“every Monday 9:00 in the user’s time zone”). How should the scheduler find what is due?', [], 1, [
    ['Scan the whole schedules table every second', 'Ten million rows a second to find a few hundred due ones. The scan never keeps up.'],
    ['Store next_run_at on each row, index it, and each tick fetch WHERE next_run_at <= now in small batches', 'Right. The due-time index turns “what is due?” into a short range scan. After firing, compute the next occurrence and write it back.'],
    ['One in-memory timer per schedule on a single node', 'Ten million timers on one node, lost on every restart, and a single point of failure.'],
  ]),
  step('The scheduler was down from 08:55 to 09:20. A daily 09:00 report did not fire. What is the right behaviour on restart?', [], 2, [
    ['Skip it; it is past 9:00', 'Sometimes right (a “good morning” push at 9:20 is fine to drop), but it must be a policy, not an accident.'],
    ['Fire every missed tick for the last week', 'There was one missed tick. And for a minutely job, firing every missed run creates a stampede.'],
    ['Apply a misfire policy per schedule: fire once now (catch-up) or skip, decided by the job owner', 'Right. Missed runs need an explicit rule. Reports usually fire once late; time-sensitive pushes skip. Either way, the execution id makes a double fire harmless.'],
  ]),
];

// Chapter 14 · Crawler frontier
export const frontier = [
  step('The crawler runs 40 fetcher machines pulling from one global URL queue. A news site’s 50,000 new links land together, and the site’s operators complain of a flood. What fixes politeness by construction?', [], 2, [
    ['Ask each fetcher to sleep 1 second between requests', 'Forty fetchers each sleeping 1 s can still hit one host forty times a second.'],
    ['Randomly shuffle the global queue', 'Shuffling spreads the burst out a little, but nothing guarantees one host is not hit in parallel.'],
    ['Partition the frontier by host: each host’s URLs live in one per-host queue, owned by one fetcher, released no faster than the host’s delay allows', 'Right. If one owner holds a host’s queue and a next-allowed-time for it, politeness is a local rule, not a hope.'],
  ]),
  step('At 386 pages per second, with a politeness gap of 2 seconds per host and one request per host at a time, at least how many hosts must be in rotation?', [], 1, [
    ['About 193', 'Each host yields one page every 2 seconds — 0.5 pages per second. You need more hosts, not fewer.'],
    ['About 772', 'Right. 386 ÷ 0.5 = 772 hosts at minimum, more at peak. A frontier with too few distinct hosts stalls on politeness, however many fetchers you add.'],
    ['386', 'That assumes one page per host per second, but the gap is 2 seconds.'],
  ]),
];

// Chapter 15 · Dedup, traps, recrawl
export const dedup = [
  step('A Bloom filter of 10 billion seen URLs is sized for a 1% false-positive rate (about 12 GB). What does a false positive do to the crawl?', [], 0, [
    ['A genuinely new URL is wrongly treated as seen and never crawled', 'Right. A Bloom filter never forgets a URL it has seen (no false negatives), but about 1% of new URLs look seen. Lower the rate (0.1% costs about 18 GB) if coverage matters more.'],
    ['A seen URL is crawled again', 'That would be a false negative, which Bloom filters do not have.'],
    ['The filter must be rebuilt', 'False positives are expected behaviour at the chosen rate, not corruption.'],
  ]),
  step('A shop’s calendar page links to “next month” forever: /calendar/2026/11, /2026/12, /2027/01… The crawler has fetched 2 million pages from this one host. What would have stopped it?', [], 2, [
    ['A bigger Bloom filter', 'Every one of those URLs is genuinely new. Dedup cannot catch an infinite space of real, distinct URLs.'],
    ['Content hashing', 'The pages differ slightly (the month heading), so exact hashes differ. Near-duplicate detection helps but is not the first guard.'],
    ['Per-host page budgets, a depth limit, URL length and pattern limits (repeating path segments)', 'Right. Crawler traps are infinite URL spaces. Budgets bound the damage from any one host; pattern rules catch the common shapes.'],
  ]),
];

// Chapter 16 · Code judge and friends
export const judge = [
  step('A code-judge worker runs untrusted submissions. Which isolation is enough?', [], 2, [
    ['Run each submission as a separate process on the worker', 'One fork bomb, one read of /etc, or one network call to an internal service, and the worker — or the network — is compromised.'],
    ['A container with default settings', 'Containers share the host kernel; defaults usually allow network access and generous resources.'],
    ['A sandbox with no network, CPU, memory, process and time limits, a read-only filesystem — inside a stronger boundary such as gVisor or a microVM', 'Right. Assume every submission is hostile. Limits stop resource abuse; the stronger boundary limits the damage from a kernel exploit.'],
  ]),
  step('In the last 10 minutes of a contest, 30,000 users submit 3 times each. Each run takes about 2 seconds of sandbox time. With a 70% utilisation target, about how many sandboxes do you pre-warm?', [], 1, [
    ['About 150', 'That is the arrival rate per second. Each submission occupies a sandbox for 2 seconds.'],
    ['About 430', 'Right. 90,000 ÷ 600 s = 150 per second; × 2 s = 300 busy at once (Little’s law); ÷ 0.7 ≈ 430.'],
    ['About 90,000', 'That is the total submissions over ten minutes, not how many run at once.'],
  ]),
];

// Chapter 17 · YouTube walkthrough
export const youtube = [
  step('500 hours of video are uploaded every minute. The ladder costs about 4 core-minutes per video-minute. About how many cores are busy transcoding on average?', [], 2, [
    ['About 2,000', '500 × 4 forgets that 500 hours is 30,000 minutes of video.'],
    ['About 30,000', 'That is video-minutes per minute. Each one costs 4 core-minutes.'],
    ['About 120,000', 'Right. 500 h × 60 = 30,000 video-minutes per minute, × 4 = 120,000 cores busy — about 3,750 machines of 32 cores, before peak headroom.'],
  ]),
  step('A creator uploads a 20-minute video. Which rendition should the pipeline finish first?', [], 0, [
    ['A low rendition (say 360p), on a high-priority queue, so the video is playable in minutes; higher renditions follow', 'Right. Time-to-playable is the user-facing number. Publish when the first rendition is ready and let the manifest grow.'],
    ['1080p, because most viewers watch in HD', 'It is the most expensive rendition, so it is the slowest to be ready. Nobody can watch anything until it finishes.'],
    ['All renditions together, then publish', 'Correct but slow: time-to-playable becomes the time of the slowest rendition.'],
  ]),
];

// Chapter 18 · Crawler walkthrough
export const crawlerWalk = [
  step('Target: 1 billion pages a month, 100 KB average. About what download bandwidth does the fleet need on average?', [], 1, [
    ['About 3 Gbps', 'Ten times too high. 386 pages/s × 100 KB = 38.6 MB/s.'],
    ['About 310 Mbps', 'Right. 1e9 ÷ (30 × 86,400 s) ≈ 386 pages/s; × 100 KB ≈ 38.6 MB/s ≈ 309 Mbps. Bandwidth is not what limits this crawler; politeness and the frontier are.'],
    ['About 39 Mbps', 'That is megabytes per second read as megabits. Multiply by 8.'],
  ]),
  step('Ten crawler nodes share the work. How should URLs be assigned to nodes?', [], 0, [
    ['By a hash of the host name, so one node owns each host’s queue, politeness clock, robots.txt cache and DNS entry', 'Right. Host affinity makes politeness, robots caching and per-host budgets local decisions. A discovered URL for another host is forwarded to its owner.'],
    ['By a hash of the full URL', 'Pages from one host would spread across all ten nodes, and none of them could enforce that host’s politeness gap alone.'],
    ['Round-robin', 'Same problem: every node hits every host, and every node needs every robots.txt.'],
  ]),
];

// Decision drills — mixed, with the old checkpoint questions folded in
export const drills = [
  step('Why persist the job row BEFORE enqueueing, rather than only sending to the queue?', [], 1, [
    ['Queues are slower than databases', 'Speed is not the reason. Durability of the record is.'],
    ['The row is durable truth: if the enqueue fails or the message is lost, a reconciler re-enqueues stuck rows; queue-only jobs vanish with no record', 'Right. DB-first plus reconciliation gives at-least-once end to end. The reverse order has a hole: enqueued, row write fails, and a worker runs a job that officially does not exist.'],
    ['To generate the job id', 'The client or API can mint a UUID without the database. The row is about truth and status.'],
    ['Compliance requires database records', 'There may be audit reasons, but the design reason is recovery from lost messages.'],
  ]),
  step('A worker crashes 80% of the way through transcoding job 42. What is the recovery chain?', [], 1, [
    ['The job is failed; notify the user to retry', 'A crash is a transient failure. Making the user retry hands them your reliability problem.'],
    ['Lease or visibility timeout expires → the job returns to the queue → another worker runs it from the start → safe only because the work is idempotent', 'Right. Crash → redelivery → idempotency is the chain. Deterministic output keys and a conditional completion update make the rerun harmless.'],
    ['A monitor resumes at 80%', 'Resuming needs checkpoints you rarely need. Restart-safely is simpler and standard; checkpoint only very long jobs (or use chunks).'],
    ['The replacement worker inherits the dead one’s memory', 'Workers share nothing in memory. That is what makes them replaceable.'],
  ]),
  step('Two replicated scheduler nodes both see “9:00 job due”. How do you prevent a double fire?', [], 1, [
    ['Run only one scheduler node', 'That trades availability for correctness. Say why you rejected it: one node is a single point of failure for every schedule.'],
    ['A lease per firing (lock + TTL + heartbeat, or partitioned ownership) — and idempotent execution as the backstop', 'Right. Two layers: coordination makes double firing rare, an execution id (schedule id + scheduled time) makes it harmless.'],
    ['Fire twice and deduplicate in analytics later', 'Users would get two emails and two charges. Dedup in analytics fixes the dashboard, not the effect.'],
    ['NTP-synchronised clocks so both fire at the same instant', 'Firing at the same instant is still firing twice.'],
  ]),
  step('Fan-in for 300 chunk tasks uses an atomic Redis DECR per completion. What is the bug?', [], 2, [
    ['DECR is not atomic', 'It is atomic. That is not the problem.'],
    ['Redis is too slow for 300 operations', 'Redis handles that in well under a millisecond.'],
    ['A redelivered completion decrements twice, so the counter hits zero early', 'Right. Count each task once with a conditional “mark done” in the same transaction, and guard the next stage with a conditional state change.'],
  ]),
  step('One enterprise tenant enqueues a million exports. Everyone else’s exports now wait 8 minutes. The fix?', [], 0, [
    ['Per-tenant queues served round-robin (or weighted fair), plus a per-tenant concurrency cap', 'Right. Fairness is a scheduling decision. One tenant’s burst should consume that tenant’s share, not the whole fleet.'],
    ['Scale workers 10×', 'You would pay for 10× workers to hide a fairness bug, and a bigger burst brings it back.'],
    ['Reject the enterprise tenant’s jobs', 'They are a paying customer. Bound their share; do not refuse their work.'],
  ]),
  step('Transcode workers spend half their time waiting on object-storage reads, so they sit at 55% CPU. The oldest queued job is 40 minutes old and rising. The autoscaler (target: 70% CPU) adds nothing. Why, and what should it watch?', [], 1, [
    ['The autoscaler is broken', 'It is doing exactly what it was told: CPU is under 70%, so it holds steady. CPU measures how busy each worker is, not how far behind the queue is.'],
    ['CPU is the wrong signal for a queue; scale on queue age or backlog ÷ throughput per worker', 'Right. Age (or backlog per worker) says how far behind you are and how many workers would catch up within your target.'],
    ['Lower the CPU target to 50%', 'Tuning the wrong signal does not make it the right one.'],
  ]),
  step('A transcode stage fails for 2% of videos with a 400 “corrupt file” from the encoder. They retry five times over an hour, then dead-letter. What should change?', [], 2, [
    ['More retries', 'A corrupt file is permanent. More retries waste more cores and keep the user waiting longer for a “no”.'],
    ['Delete DLQ messages automatically after a day', 'Then no one ever learns which files fail or why. A DLQ is for inspection and redrive.'],
    ['Classify the error as permanent: fail fast, tell the uploader, dead-letter for inspection', 'Right. Retries are for transient errors. Permanent errors skip straight to failed.'],
  ]),
  step('For a web crawler, where does dedup happen?', [], 1, [
    ['Only on URLs', 'Many different URLs serve the same page (tracking parameters, mirrors). URL dedup alone stores the same content many times.'],
    ['On normalised URLs before enqueueing (Bloom filter or fingerprint set), and on content after fetching (exact hash, plus SimHash for near-duplicates)', 'Right. URL dedup saves fetches; content dedup saves storage and indexing. They catch different duplicates.'],
    ['Only on content hashes', 'Then you fetch every duplicate URL before discovering it was a duplicate — wasted bandwidth and politeness budget.'],
  ]),
];
