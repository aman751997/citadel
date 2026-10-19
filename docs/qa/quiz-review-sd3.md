# Quiz review sd3 (2026-10-19)

Lessons: url-shortener (21 quizzes, 27 questions), rate-limiter (17, 45), typeahead (15, 31), pattern-realtime (18, 44), pattern-fanout (16, 35). Total 87 quizzes, 182 questions.

Method: solved each question blind, compared with `answer`, read every `explain`, recomputed every number in Python, ran code questions on `mysql:8.0` (8.0.46) and `redis:7` (7.4.11) in throwaway containers (removed). Sliding-window-counter worst case simulated in Python.

## Fixes

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| url-shortener | us-ch10 | 2 | FIXED | "fill around 70-75%" for 3-4 draws. 1/(1-fill) is 3 at 67% and 4 at 75%. Now "two thirds to three quarters (3 draws at 67%, 4 at 75%)". |
| url-shortener | us-ch11 | 1 | FIXED | "halves the usable keyspace" was wrong. Case-insensitive collation leaves 36 characters, so 36^7 = 78.4B vs 62^7 = 3.52T (about 2%). Fixed in quiz option and in the prose before the table. MySQL run: second insert of 'spring' after 'Spring' gives ERROR 1062 (default collation). |
| url-shortener | us-ch13 | 1 | FIXED | `why` said store budget "about 3,000 to 30,000"; the lesson's budget is 30,000/s (3,000/s at 99% hit). Reworded. |
| rate-limiter | rl-ch7 | 1 | FIXED | Option "70, allowed" had an explain that said 80 x 15/60 gives 70; it gives 20+30 = 50. Option text now "50, allowed". Also "pass while 60+current is under 100" contradicted "exactly 10 more" (100 is reached); reworded to "at or under 100". |
| rate-limiter | rl-ch9 | 1 | FIXED | Retry-After 0.1 s: header takes whole seconds (taught in rl-ch2). Added "send 1" to the correct explain. |

## Verified without change

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| url-shortener | us-prologue, ch1-ch9, ch12, ch14-ch19 | all | OK | 62^6=56.8B, 62^7=3.52T, 182.5B/3.52T=5.2% (1 in 19), 22 chars=131 bits, 30,000 = 100M x10 /1e5 x3, 300,000/12=25,000. |
| url-shortener | us-ch10 | 1 | OK | MySQL run: ON DUPLICATE KEY UPDATE silently changes row to b.example. |
| url-shortener | us-drills | 1-3 | OK | Birthday bound sqrt(2 x 62^7 x ln2) = 2.21M; at 1,157 links/s = 32 min. 2^42 = 4.4e12 = 1.25 x 62^7. |
| rate-limiter | rl-ch1..ch6, ch8, ch10..ch16, rl-final | all | OK | 200x10=2000; 10/200=0.05; 3 GB = 50,000x600x100 B; 3+0.45x10-1=6.5; GCRA tau 9.9, Retry-After 22-9.9-12=0.1; 200,000/100=2,000; 200,000/200=1,000/gateway; 1M/(50,000x0.7)=29; 10M -> about 300 primaries; 40,000/100=400. |
| rate-limiter | rl-ch5 Q2, rl-ch6 Q2 | - | OK | Redis run: INCR leaves TTL -1; EXPIRE NX works on 7.x (returns 1 then 0); two ZADD of the same member give ZCARD 1. |
| rate-limiter | rl-ch7 | 2 | OK | Simulation: prev=100 at end of window, 10 attempts/s in current window: 99 admitted, true trailing minute at t=59.9 is 199, so "approach 2 x limit" holds. |
| typeahead | all 15 | all 31 | OK | 62,500/5,000=12.5; 104,200x0.6=62,500; 104,200/5,000=21; 0.5^(1/7)=0.906; 1000x0.906+100=1006; 26+676+17,576=18,278; 1.5 GB lesson figures consistent. |
| pattern-realtime | all 18 | all 44 | OK | 20M/5=4M; 20M/30=667K; 500K/30=16.7K (=427 per gateway on 39); 500K/300=1.7K; 50Mx20x100/1e5=1M; 2e9x200x3=1.2 TB; 200M/500K=400; 1.8Mx200x8=2.9 Gbps; 1.2 TB x365=438 TB. |
| pattern-fanout | all 16 | all 35 | OK | 1-0.99^200=86.6%; 60K x200 = 12M; 50M/600K=83 s; 6,400/64=100; 50M/50K=16.7 min; 5% of 50M/60 s=41,667; 3.84 TB x4x2 about 30 TB; 18.25 TB/yr. Redis run: duplicate ZADD gives ZADD 1 then 0, ZCARD 1; second `SET NX EX` returns nil. |

## Could not verify / notes

- us-ch4 Q2: 301 without Cache-Control being cached by browsers depends on browser heuristics (RFC 9110 says cacheable by default; heuristic freshness needs Last-Modified). Stem says "may reuse"; left as is.
- rt-e2ee / rt-groups sender keys: kept hedged ("look up membership-change handling"); not checked against a protocol spec.
- Style-only weak spots left alone: ta-requirements Q2 and ta-prologue Q2 stems nearly give the answer; rl-ch7 Q2 phrase "cannot arrive as a sudden burst" is vague but not false.
