import { row, step } from '../../lib/trace.ts';

// Illustrative model used throughout the lesson (an assumption, not a vendor spec):
// 70B parameters, BF16 (2 bytes), 80 layers, 8 KV heads (grouped-query attention), head_dim 128.
// KV bytes per token = 2 × 80 × 8 × 128 × 2 = 327,680 bytes (≈ 0.33 MB).
// One replica = 4 GPUs × 80 GB = 320 GB; weights 140 GB; 32 GB reserved; KV budget 148 GB.

export const generation = [
  step('A user sends a 2,000-token prompt and gets a 400-token answer. How many forward passes does the model run?', [
    row('Passes', ['prefill: 2,000 prompt tokens at once', 'decode 1', 'decode 2', '…', 'decode 399'], { 0: 'TOKEN 1 OUT' }, { tones: { 0: 'hot' } }),
  ], 1, [
    ['2,400 — one per token, prompt and answer alike', 'The prompt tokens are all known up front, so they go through in one parallel pass. Only the answer is produced one token at a time.'],
    ['About 400 — one prefill pass that also emits the first token, then 399 decode passes', 'Right. Prefill processes all 2,000 prompt tokens together and its last position predicts token 1. Every later token needs its own pass, because each depends on the one before.'],
    ['One — the model writes the whole answer in a single pass', 'A decoder model predicts one next token per pass. Token 2 cannot be computed until token 1 exists.'],
  ]),
  step('Why does the server keep the keys and values (the KV cache) of every earlier token in GPU memory during decode?', [], 0, [
    ['So each new token attends to the past without recomputing it — the cost of a step stays proportional to one new token', 'Right. Without the cache, step 400 would recompute keys and values for all 2,399 earlier tokens. The price is memory that grows with every token and stays resident until the request ends.'],
    ['Because the model weights change during generation', 'Weights are frozen at inference. What grows is per-request state: the keys and values of the conversation so far.'],
    ['To make the prompt cheaper to send over the network', 'The KV cache never leaves the GPU in a normal serving path. It saves compute, and costs memory.'],
  ]),
];

export const metrics = [
  step('A request waits 300 ms in the queue, prefill takes 150 ms, then 200 tokens stream at 25 ms apart. What is the time to first token (TTFT)?', [
    row('Timeline', ['queue 300 ms', 'prefill 150 ms', 'token 1', '199 gaps × 25 ms'], { 2: 'TTFT ENDS' }, { tones: { 2: 'hot' } }),
  ], 2, [
    ['150 ms', 'That is prefill alone. The user also waited 300 ms before prefill started — queueing is part of TTFT.'],
    ['About 5.4 s', 'That is the end-to-end time: 0.45 s + 199 × 25 ms ≈ 5.43 s. TTFT stops at the first token.'],
    ['450 ms', 'Right. TTFT = queue wait + prefill (plus network and tokenisation, ignored here). The rest of the answer adds 199 × 25 ms ≈ 5 s of decode.'],
  ]),
  step('Your dashboard reports p99 end-to-end latency of 40 s and someone wants to alert on it. What is wrong with that SLO?', [], 1, [
    ['Nothing — users care about total time', 'Users see the first token in well under a second and read along. A 2,000-token essay is slow end-to-end by design, not by fault.'],
    ['End-to-end time mostly measures how long the answer was; alert on TTFT and inter-token latency instead', 'Right. TTFT captures queueing and prefill; inter-token latency captures decode health. Total time is TTFT + (tokens − 1) × time per output token, so it scales with answer length.'],
    ['p99 is too strict; use the mean', 'Switching to the mean hides tail pain. The problem is the metric, not the percentile.'],
  ]),
  step('Two configurations: A serves 6,000 tokens/s but 30% of requests miss the TTFT SLO; B serves 5,000 tokens/s and 2% miss. Which has higher goodput?', [], 1, [
    ['A — it moves more tokens', 'Raw throughput counts tokens nobody was willing to wait for. Goodput counts only work that met the SLO.'],
    ['B, most likely — goodput counts only requests that met the SLO, and A wastes 30% of its work on late requests', 'Right. Goodput is throughput subject to the latency SLO. Squeezing a bigger batch in raises tokens/s and can still lower goodput.'],
    ['They are equal; tokens are tokens', 'The SLO is the product promise. A late answer is a failed answer to that user.'],
  ]),
];

export const memory = [
  step('70B parameters in BF16 (2 bytes each). How much GPU memory do the weights alone need?', [], 2, [
    ['70 GB', 'That is INT8 (1 byte per parameter). BF16 is two bytes.'],
    ['35 GB', 'That is INT4 (half a byte per parameter).'],
    ['140 GB — more than one 80 GB GPU, so the model must be split', 'Right. 70 × 10⁹ × 2 bytes = 140 GB, before a single byte of KV cache. That alone forces tensor parallelism or quantisation.'],
  ]),
  step('Illustrative 70B shape: 80 layers, 8 KV heads, head_dim 128, BF16. KV cache per token = 2 × 80 × 8 × 128 × 2 bytes. How much for one 4,096-token conversation?', [
    row('Factors', ['2 (K and V)', '80 layers', '8 KV heads', '128 dims', '2 bytes'], {}, {}),
  ], 0, [
    ['About 1.34 GB (327,680 bytes per token × 4,096)', 'Right. 2 × 80 × 8 × 128 × 2 = 327,680 bytes ≈ 0.33 MB per token; × 4,096 ≈ 1.34 GB. A 32K-token context is ≈ 10.7 GB.'],
    ['About 1.34 MB', 'That is roughly the per-token figure times four, not times 4,096. Each token costs about 0.33 MB.'],
    ['About 10.7 GB', 'That is the same model with 64 KV heads (no grouped-query attention), or this model at 32K tokens. With 8 KV heads at 4K, it is 8× smaller.'],
  ]),
  step('One replica: 4 GPUs × 80 GB = 320 GB. Weights take 140 GB; reserve 32 GB for activations and runtime. Roughly how many 4,096-token conversations fit at once?', [
    row('Replica memory (GB)', ['weights 140', 'reserve 32', 'KV budget 148'], { 2: 'FOR CHATS' }, { tones: { 2: 'hot' } }),
  ], 1, [
    ['About 2,000 — memory is plentiful', 'That ignores the KV cache entirely. Each conversation holds ≈ 1.34 GB.'],
    ['About 110', 'Right. 148 GB ÷ 1.34 GB ≈ 110. At 32K tokens each it drops to about 13. Concurrency is a memory budget.'],
    ['About 4 — one per GPU', 'GPUs batch many sequences per step. The limit is how much KV cache fits, not the GPU count.'],
  ]),
];

export const bandwidth = [
  step('At batch size 1, each decode step must stream all 140 GB of weights out of memory. With about 12 TB/s of total memory bandwidth across 4 GPUs (an assumed peak), what is the floor on one step?', [], 1, [
    ['About 0.1 ms', 'Off by a factor of 100. 140 GB ÷ 12 TB/s ≈ 0.0117 s.'],
    ['About 12 ms — roughly 85 tokens/s for that one user, with the arithmetic units mostly idle', 'Right. 140 ÷ 12,000 s ≈ 11.7 ms. The math for one token takes a tiny fraction of that; the GPU is waiting on memory. Decode is memory-bandwidth-bound.'],
    ['About 1 s', 'Memory bandwidth is measured in terabytes per second. 140 GB moves in about a hundredth of a second.'],
  ]),
  step('Now batch 64 sequences, each with about 2,048 tokens of KV cache. The step reads the weights once plus 64 × 2,048 × 327,680 bytes ≈ 43 GB of KV. What happens?', [
    row('Bytes per step', ['weights 140 GB', 'KV 43 GB'], {}, {}),
  ], 2, [
    ['Each user\'s token takes 64× longer', 'The weights are read once for all 64 sequences. Step time only grows by the extra KV bytes.'],
    ['Nothing changes; batching only helps prefill', 'Batching is the main throughput lever for decode precisely because decode is memory-bound.'],
    ['Step time rises from ≈ 11.7 ms to ≈ 15.2 ms, but throughput jumps from ≈ 86 to ≈ 4,200 tokens/s', 'Right. (140 + 43) GB ÷ 12 TB/s ≈ 15.2 ms; 64 tokens per step ÷ 15.2 ms ≈ 4,200 tokens/s. Same weight read, 64 users served.'],
  ]),
  step('Prefill of a 2,000-token prompt costs about 2 × 70 × 10⁹ × 2,000 = 280 TFLOP. Why is prefill compute-bound when decode is not?', [], 0, [
    ['Each weight read is reused across all 2,000 prompt tokens, so arithmetic dominates memory traffic', 'Right. Arithmetic intensity scales with tokens processed per weight read. Decode gets that reuse only through batching; prefill gets it from the prompt itself.'],
    ['Prefill uses a different, larger model', 'Same weights, same layers. The difference is how many tokens share each pass over them.'],
    ['Prefill skips the KV cache', 'Prefill writes the KV cache for every prompt token. That is not why it is compute-heavy.'],
  ]),
];

export const batching = [
  step('Static batching: 8 requests start together. Seven finish in 50 tokens; one needs 2,000. With static batching, when can new requests use the 7 free slots?', [
    row('Slots', ['A done', 'B done', 'C done', 'D done', 'E done', 'F done', 'G done', 'H 2,000'], { 7: 'STILL GOING' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 4: 'out', 5: 'out', 6: 'out', 7: 'hot' } }),
  ], 1, [
    ['Immediately', 'That is continuous batching. A static batch is fixed until its last member finishes.'],
    ['Only after H finishes all 2,000 tokens — the slots sit idle and the queue waits', 'Right. The batch moves at the pace of its longest member: idle GPU and long TTFT for everyone queued behind it.'],
    ['After a fixed timeout cuts H off', 'Cutting off a user\'s answer is not a scheduling strategy.'],
  ]),
  step('Continuous (in-flight) batching rebuilds the batch at every decode step. What does the scheduler check before admitting a waiting request?', [], 2, [
    ['That the request count is below a fixed maximum, say 16', 'Request count ignores cost. One 30K-token request can need as much KV memory as twenty 1,500-token ones.'],
    ['That CPU utilisation is under 70%', 'CPU is not the bottleneck. GPU memory for the KV cache is.'],
    ['That enough free KV cache blocks exist for its prompt (and room to grow its output)', 'Right. Admission is a memory budget. Admit too greedily and running sequences must be preempted when the cache fills.'],
  ]),
];

export const prefix = [
  step('Every Kestrel Assist request starts with the same 1,000-token system prompt plus tool definitions. What does prefix caching save?', [], 0, [
    ['The prefill compute and KV memory for those 1,000 tokens on every request that hits the cache — lower TTFT and fewer GPU-seconds', 'Right. Their KV blocks are computed once, kept, and shared read-only. Prefill only runs on the new suffix.'],
    ['Decode time for the answer', 'Decode still produces each output token one step at a time. Prefix caching shortens prefill.'],
    ['Nothing, because each user\'s answer is different', 'The answers differ; the prefix is byte-identical. KV for identical prefix tokens is identical.'],
  ]),
  step('A long multi-turn chat resends its whole history every turn. Turn 5 lands on a different replica than turns 1–4. What did you lose?', [], 1, [
    ['Nothing; replicas share one global KV cache', 'In the common design each replica keeps its own cache in its own GPU memory. Cross-replica KV sharing exists in some systems but is not the default.'],
    ['The cached prefix — the new replica must re-prefill the whole history, so route by session or prefix hash', 'Right. Prefix-aware or sticky routing keeps a conversation where its KV already lives, until the cache evicts it.'],
    ['The conversation history itself', 'History lives in the chat database and is resent each turn. Only the GPU-side shortcut is lost.'],
  ]),
];

export const speculation = [
  step('A small draft model proposes 4 tokens; the large model checks all 4 in one forward pass. Why is that check about as cheap as a single decode step?', [], 1, [
    ['The large model skips layers during verification', 'It runs every layer. It just processes 4 positions in the same pass.'],
    ['Decode is memory-bound: one pass over the weights can score several positions for nearly the same time as one', 'Right. The weights are read once either way; checking 4 tokens is a tiny prefill. Accepted tokens are nearly free.'],
    ['The draft model\'s tokens are always correct', 'Many are rejected. The method is safe because rejected tokens are replaced by the large model\'s own choice.'],
  ]),
  step('If each draft token is accepted with probability 0.7 and the draft proposes 4, the expected tokens per large-model pass is (1 − 0.7⁵) ÷ (1 − 0.7). About how many?', [], 2, [
    ['4', 'Only if every draft token were accepted. Acceptance stops at the first rejection.'],
    ['0.7', 'Every verification pass yields at least one token — the large model\'s own token at the first rejection.'],
    ['About 2.8', 'Right. (1 − 0.168) ÷ 0.3 ≈ 2.77 tokens per pass, minus the draft model\'s own cost. Gains shrink when the batch is already large enough to make decode compute-bound.'],
  ]),
];

export const scaling = [
  step('The 70B model needs 140 GB in BF16. You have 80 GB GPUs in 8-GPU servers with a fast intra-node link. Lowest-latency way to serve it?', [], 0, [
    ['Tensor parallelism across 2–4 GPUs in one server: every layer is split, so each GPU reads only its slice of the weights per step', 'Right. Each step reads a quarter of the weights per GPU (with 4-way splits), so per-token latency drops. The price is an all-reduce at every layer — keep it on the fast link inside one server.'],
    ['Pipeline parallelism across 2 servers', 'It fits the model, but a single token still passes every stage in sequence. It adds hops and fills well only with many micro-batches.'],
    ['Data parallelism: put a full copy on each GPU', 'A full copy is 140 GB. It does not fit on one 80 GB GPU.'],
  ]),
  step('Weight-only INT4 shrinks the model to about 35 GB. What does that buy, and what must you check?', [], 1, [
    ['Free speed with no quality risk', 'Quantisation changes the numbers the model computes. Quality impact varies by method, model and task.'],
    ['It fits on one GPU, frees memory for KV cache and speeds memory-bound decode — but run your own quality evals first', 'Right. Fewer bytes per weight means fewer bytes to stream per step. Measure accuracy on your tasks, especially reasoning and code, before shipping.'],
    ['It makes prefill four times faster on every GPU', 'Weight-only quantisation mainly helps memory traffic. Prefill speed-ups depend on hardware support for low-precision math.'],
  ]),
];

export const serving = [
  step('Queue depth is climbing and TTFT is breaching SLO. GPU compute utilisation reads 35%. Which signal should drive autoscaling?', [], 2, [
    ['GPU utilisation — it is low, so do not scale', 'Memory-bound decode shows low compute utilisation even when the replica is full. It is a poor scaling signal.'],
    ['CPU utilisation on the serving hosts', 'The CPU is mostly idle in GPU serving.'],
    ['Queue depth / waiting time, plus KV cache utilisation and TTFT', 'Right. They measure the real constraint: requests waiting for KV memory and batch slots. Scale on them, and keep a warm pool because a new replica takes minutes to load.'],
  ]),
  step('A user closes the tab halfway through a 1,500-token answer. What must the serving stack do?', [], 0, [
    ['Detect the disconnect, abort the sequence, and free its KV blocks at once', 'Right. Otherwise the GPU keeps generating tokens for nobody, holding memory that a queued request needed. Cancellation is a capacity feature.'],
    ['Finish generating and cache the answer in case they return', 'That spends GPU-seconds and KV memory on a reader who left. Persist what was streamed, then stop.'],
    ['Nothing; the stream will time out eventually', 'A timeout of minutes holds a slot hostage the whole time.'],
  ]),
  step('Peak is 2× the average and new replicas take about 5 minutes to become ready. Free trial users and paying API customers share the fleet. A spike arrives. Best move?', [], 1, [
    ['Accept everything and let the queue absorb it', 'An unbounded queue turns a spike into minutes of TTFT for everyone, including paying customers.'],
    ['Admission control by tier: protect paid interactive traffic, shed or downgrade free traffic to a smaller model, defer batch jobs', 'Right. Priority tiers decide who waits. The warm pool and autoscaler catch up in minutes; shedding covers the gap.'],
    ['Scale up and wait — five minutes is fine', 'Five minutes of breached TTFT is an outage to users. Scaling is too slow to be the only answer.'],
  ]),
];

export const capacity = [
  step('Peak 100 requests/s, 300 output tokens each, 1,000-token prompts of which 600 tokens hit the prefix cache. How many uncached prefill tokens per second, and how much compute?', [], 1, [
    ['100,000 tokens/s, 14 PFLOP/s', 'That counts the cached 600 tokens too. Only 400 per request need prefill.'],
    ['40,000 tokens/s; at 2 × 70 × 10⁹ FLOPs per token that is 5.6 PFLOP/s', 'Right. 100 × 400 = 40,000; × 140 GFLOP = 5.6 × 10¹⁵ FLOP/s. A replica that sustains about 2 PFLOP/s spends 2.8 replicas\' worth of time on prefill alone.'],
    ['30,000 tokens/s', 'That is the output (decode) rate: 100 × 300.'],
  ]),
  step('Requests take about 9.5 s each (0.5 s TTFT + 300 tokens × ~30 ms). By Little\'s law, about how many are in flight across the fleet at 100 requests/s?', [], 2, [
    ['100', 'That would be true if each request took one second. In flight = arrival rate × time in system.'],
    ['About 9,500', 'That multiplies by 100 twice. 100 requests/s × 9.5 s ≈ 950.'],
    ['About 950 — that is the batch the fleet must hold, and the KV cache it needs', 'Right. 100 × 9.5 ≈ 950 sequences. Spread over 13 replicas that is about 73 each — about 31 GB of KV at 1,300 tokens apiece, well inside a 148 GB budget.'],
  ]),
];

export const drills = [
  step('What actually caps how many concurrent chats one GPU replica serves?', [], 2, [
    ['CPU threads for tokenisation', 'Tokenisation is cheap and runs beside the GPU.'],
    ['GPU FLOPs', 'Decode leaves most FLOPs idle. Arithmetic is not what runs out first.'],
    ['GPU memory for KV caches — gigabytes per long-context request; admission control budgets memory, not request count', 'Right. Every active request holds its attention state resident. This is the fact that separates people who understand LLM serving from people pattern-matching to web services.'],
    ['Network bandwidth for streaming', 'A token stream is a few bytes every few tens of milliseconds. The network barely notices.'],
  ]),
  step('Static batching gives great GPU utilisation but users complain short questions hang. Fix?', [], 1, [
    ['Smaller batches', 'Smaller static batches waste the GPU and still make short requests wait for the longest one in their batch.'],
    ['Continuous batching — rebuild the batch every decode step; finished sequences exit instantly, queued ones join mid-flight', 'Right. Iteration-level scheduling is the structural fix to convoy latency.'],
    ['Separate queues for short and long prompts', 'A real auxiliary tactic worth mentioning, but output length is unknown up front, and the batch still waits for its longest member.'],
    ['More GPUs', 'More hardware, same convoy. Each static batch still moves at the pace of its slowest request.'],
  ]),
  step('Why is per-tenant rate limiting by requests/minute wrong for an LLM API?', [], 1, [
    ['Requests/minute is fine', 'One request can cost 100× another. A request limit lets one tenant\'s long prompts starve everyone.'],
    ['Cost varies ~100× by token count — limit tokens/minute (a token bucket refilled with literal tokens) plus a concurrent-stream cap, since long streams hold GPU memory for minutes', 'Right. Limit the resource you actually spend. Same bucket as the rate-limiter lesson, different currency.'],
    ['LLM APIs cannot be rate limited mid-stream', 'The budget is checked at admission (reserve max_tokens) and settled at the end. Nothing needs to stop mid-stream.'],
    ['Because billing is monthly', 'Billing cadence has nothing to do with protecting shared GPUs right now.'],
  ]),
  step('Which metric should page the on-call engineer for a chat product?', [], 0, [
    ['p95 time to first token and p95 inter-token latency against their SLOs', 'Right. They measure what users feel: the wait before anything appears, and the rhythm of the stream.'],
    ['p99 end-to-end latency', 'It mostly measures answer length. A long essay looks like an outage.'],
    ['Average GPU compute utilisation', 'Memory-bound decode looks underutilised while queues explode.'],
  ]),
  step('Doubling the context window from 16K to 32K tokens for the same model on the same replica does what to the maximum number of full-length concurrent conversations?', [], 1, [
    ['Nothing — context length is a model property', 'Every token of context costs KV memory per request.'],
    ['Halves it — KV per request doubles', 'Right. 148 GB ÷ 5.4 GB ≈ 27 at 16K; ÷ 10.7 GB ≈ 13 at 32K. Long-context tiers need their own capacity plan and pricing.'],
    ['Quarters it — attention is quadratic', 'Attention compute grows quadratically in prefill, but KV memory is linear in tokens.'],
  ]),
  step('A new replica takes several minutes to become ready. Which is NOT a real way to soften cold starts?', [], 2, [
    ['Keep a warm pool of loaded replicas', 'This is a real lever: idle-but-loaded capacity absorbs spikes while new replicas boot.'],
    ['Stage weights on local NVMe or a nearby cache instead of pulling from remote object storage', 'This is a real lever: 140 GB over a slow link is minutes on its own.'],
    ['Autoscale on CPU usage so you react sooner', 'Right — this is the wrong one. CPU says nothing about GPU serving load. Scale on queue depth, KV utilisation and TTFT, and plan ahead for daily peaks.'],
  ]),
  step('Speculative decoding: does it change what the model would have said?', [], 1, [
    ['Yes — it trades quality for speed', 'With the standard accept/reject rule, the output distribution matches the large model\'s exactly.'],
    ['No — with the standard verification rule the output follows the large model\'s distribution; it only changes speed', 'Right. Rejected draft tokens are replaced by the large model\'s own sample. It is a latency trick, not an approximation.'],
    ['Only for greedy decoding', 'The rejection-sampling scheme preserves sampled outputs too, not only greedy ones.'],
  ]),
];
