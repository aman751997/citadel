# Quiz balance, TAG sd1

Lessons: delivery-framework, estimation, core-concepts, networking, databases (src/lessons/).
Measured with `node scripts/quiz-balance-src.mjs <files>` (source MDX, no build). "longest" = correct option is the single longest; "ratio" = mean correct length / other options.

| Lesson | n | before longest | before ratio | after longest | after ratio | after shortest |
|---|---|---|---|---|---|---|
| delivery-framework | 23 | 74% | 2.45 | 35% | 1.01 | 30% |
| estimation | 27 | 59% | 2.10 | 15% | 0.97 | 33% |
| core-concepts | 35 | 89% | 2.89 | 11% | 1.03 | 29% |
| networking | 24 | 88% | 3.48 | 8% | 1.00 | 4% |
| databases | 44 | 84% | 3.21 | 7% | 0.97 | 43% |
| TOTAL | 153 | 80% | 2.87 | 14% | 0.99 | 30% |

Questions rewritten (options, plus explain where a distractor changed): delivery 18, estimation 18, core 33, networking 21, databases 43 (133 total). Untouched: short numeric options already similar in length (and 2-option questions).

Checks run after the rewrite: answer index unchanged and the option at `answer` is the original correct claim (printed and eyeballed per question); exactly one explain starts with "Correct" and it sits at `answer` (script); every number in options recomputed by hand (e.g. 1.8e9/3.5e12 ~ 1 in 2,000; 2.15e9/200,000 ~ 30 years; 10 characters of base62 ~ 8e17 vs 3.65e13 needed ~ 20,000x; 2M x 1 KB x 365 ~ 730 GB).

## Five representative rewrites (before -> after)

1. delivery-framework, wrap-up bottleneck. Correct 197 chars vs 33 and 20 for the wrong ones.
   Before wrong: "We would scale it horizontally." / "It should be fine."
   After wrong: "We would scale horizontally by adding more servers behind the load balancer and more database nodes as traffic grows." / "I do not see a clear bottleneck; the design handles the expected load, and we can revisit it if monitoring flags anything later." Correct cut to "At 10x the read path breaks first, near 30,000 redirects a second. Replicas and the cache fix it; I would watch p99 latency."
2. core-concepts, cache stale. Correct 97 chars, wrong 30 and 56.
   Before wrong: "Propose a shorter TTL on Redis" / "Say we will invalidate on write without naming a layer".
   After: "Propose shortening the Redis TTL, the usual source of stale data" / correct "Ask which cache they mean, then answer for that layer" / "Say we will invalidate on write without naming a layer". Explain of the correct option now carries the "invalidation differs per layer" point.
3. networking, X-Forwarded-For. Correct 98 chars vs 17, 14, 12.
   Before wrong: "198.51.100.7 only" / "10.0.3.12 only" / "1.2.3.4 only".
   After wrong: "198.51.100.7 only: the balancer replaces whatever header the client sent" / "10.0.3.12 only: the balancer writes its own address into the header" / "1.2.3.4 only: the balancer leaves the client header untouched". Correct: "1.2.3.4, 198.51.100.7: the first is client-set, the last is yours".
4. databases, flash sale. Correct 144 chars vs 48 and 58.
   Before wrong: "Optimistic version check with automatic retries." / "SELECT ... FOR UPDATE held while the payment is processed."
   After wrong: "Optimistic version check on the counter row, with automatic retries and a short random backoff." / "SELECT ... FOR UPDATE on the counter row, held until the payment provider has responded." Correct: "One conditional UPDATE ... SET remaining = remaining - 1 WHERE remaining > 0, kept short."
5. databases, wallets lost update. Wrong option "A gets a serialisation error" (28 chars) next to 3-char numbers.
   After: options are all numbers: 150 (correct) / 170 / 120 / 100, each with a specific-misreading explain ("100 would mean the UPDATE of A was rolled back or ignored. It succeeded and wrote 150").

## Not balanced / notes
- databases: the correct option is now the single shortest in 43% of questions (fair about 32%); longest is 7%. Left as is (targets are longest <= 40% and ratio <= 1.3). Could be smoothed by padding some correct options by 5-10 characters.
- networking: shortest 4%, fine.
- delivery-framework #19/#20/#21, estimation #1/#4/#5/#6/#7/#9/#17/#26, databases #8/#24/#27: numeric options of near-equal length, left unchanged.
- A few distractors (estimation: "pool absorbs it, only an alert needed", networking: "heartbeats too often, carrier rate-limits") describe real-product behaviour in general terms; their explains state the true behaviour from the lesson text, no new product facts were added.
