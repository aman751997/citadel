# Quiz review sd5

Lessons: pattern-sync-collab, llm-inference, rag, llm-gateway, feature-flags, recsys.
Method: solved each question blind, compared with `answer`, read every `explain`, recomputed every number with Python (`python3` one-liners: chunk count, RRF, MRR, KV bytes, sample sizes, SRM chi-square, retry/bucket arithmetic, cost). No question uses runnable Java/SQL/Redis code; the code snippets shown (RRF formula, chunk count, SRM call) were recomputed in Python.

Totals: 107 quizzes, 177 questions. OK 172, FIXED 4, REWRITTEN 1.

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| pattern-sync-collab | all 21 quizzes | 35 questions | OK | Recomputed: 24,500 presence msgs/s and 500 frames/s, 370 ops replay, 4 MB fixed chunk re-upload, G-counter 12, OT "cat" gives "aXt", "abc" gives "bcX"/"bXc". |
| llm-inference | llm-ch11 | 1 | FIXED | Stem: 8 x 80 = 640 GB, minus 400 GB weights = 240 GB, not "about 176 GB". Fixed in `why`. |
| llm-inference | llm-ch15 | 1 | FIXED | 32,300 x 327,680 = 10.58 GB. Option said 10.7 GB while `why` said 10.6 GB. Option now 10.6 GB (13.98 sequences, "about 14" kept). |
| llm-inference | other 17 quizzes | 26 questions | OK | Recomputed 148/43 = 3, 16.7 ms to 10.8 ms, 4.75x queue wait, 5.6 TB, 3,500 refund, 327,680 bytes/token. |
| rag | rag-eval | 1 | FIXED | Option 3 explanation said 0.675 comes from rank 5 counted as 1/1. That gives 0.625, so the claim was false. Explanation now states the sum. |
| rag | other 14 quizzes | 28 questions | OK | Recomputed 12 chunks, 409.6/102.4 GB, RRF Y>X>Z, $0.0135, 2.7x, 96% LLM share. |
| llm-gateway | llm-gateway-final | 2 | REWRITTEN | Option 4 ("scoped token per task") was also a defensible answer, and the `why` admitted it. Replaced with a clearly wrong option (long-lived admin token the model decides to use); `why` and explanation updated. |
| llm-gateway | other 16 quizzes | 26 questions | OK | Recomputed 48% saving, 3,850 streams, bucket 1,050 then 2,000, 1,950 reserved vs 1,800 used, hedging 2.8%. |
| feature-flags | ff-safety | 1 | FIXED | Option 1 text began with "Correct:", which labelled a wrong option. Removed the prefix. |
| feature-flags | other 15 quizzes | 30 questions | OK | Recomputed 0.999^8 = 0.992, 25 GB herd, 43.2B events/day, SRM 0.90 and 22.2, 57,600 and 230,400 sample sizes. |
| recsys | all 19 quizzes | 27 questions | OK | Recomputed score 2.8, 250,000 and 1,000,000 users per arm, SRM 49.7, page x1 y1 x2 y2, 100M x 1 ms = 27.8 h. Lesson numbers (144 servers, 400 candidates, 10 ms re-rank) match the prose. |

## Not fixed (systemic, needs a coordinator decision)
Answer position is heavily skewed to option index 1 (second option), and the correct option is usually the longest:

| lesson | answer 0 | answer 1 | answer 2 |
|---|---|---|---|
| pattern-sync-collab | 0 | 32 | 1 |
| llm-inference | 5 | 20 | 2 |
| rag | 3 | 23 | 3 |
| llm-gateway | 1 | 25 | 1 |
| feature-flags | 2 | 28 | 1 |
| recsys | 4 | 21 | 1 |

A learner can score well by always picking B. Shuffling needs options and `explain` reordered together; a few explanations refer to other options by position (for example "Same mistake from the other side" in pattern-sync-collab `replicas` Q1), so a script alone is not safe. Left unchanged.
