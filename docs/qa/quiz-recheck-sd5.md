# Quiz re-check sd5 (after the option-length rebalance)

Lessons: pattern-sync-collab, llm-inference, rag, llm-gateway, feature-flags, recsys.
Method: dumped every quiz (stem, code, options, explains) with a small script, solved each blind, then compared with `answer`. Recomputed every number by hand or Python (chunks, CDC upload sizes, G-counter, OT positions, KV bytes, ITL, M/M/1 wait, RRF, MRR, embedding distance, token-bucket reserve/refund, breaker window, SRM chi-square, Lehr sample size, 0.999^8, 43.2B events/day). No quiz contains runnable Java/SQL/Redis, so no containers were used. Product claims in explains were checked against docs/qa/docs-claims-*.md and python-snippets.md.

Reviewed: 173 questions (33 + 27 + 29 + 27 + 31 + 26). Answer indices all agree with my own solution. OK 165, FIXED 8 (all small).

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| pattern-sync-collab | sync-protocol | 2 | FIXED | Option "100, retry whole page" was also safe (explain admitted it). Now "Nowhere on disk: ask the server which entries it applied", explain says the server only knows what it sent. |
| pattern-sync-collab | deletes | 1 | FIXED | Explain of the "server rejects the cursor" option claimed nothing rejects it, which is a design choice. Now says "Here the cursor is only a position..." and that retrying changes nothing. |
| pattern-sync-collab | presence | 1 | FIXED | Explain said "24,500 cursor writes per second". 24,500 is broadcast deliveries; writes are 500/s. Now "hundreds of cursor writes per second". |
| llm-inference | llm-drills | 2 | FIXED | "Separate queues for short and long prompts" was partly right. Reworded to the false claim "prompt length decides how long a request runs"; explain and `why` now say output length decides it. |
| llm-gateway | llm-gateway-final | 3 | FIXED | `why` said "Option 4 removes..."; positional reference replaced with "Always buffering". |
| feature-flags | ff-experiments | 1 | FIXED | "Analyse all assigned users" is a valid (intention-to-treat) answer. Stem now asks for the population with the most power that keeps the comparison fair. |
| all other | all | all | OK | Numbers recomputed and match: 4 MB re-upload cases, 12 chunks, 409.6/102.4 GB, 43 GB and 3 vs 27 concurrent, 16.7/10.8 ms, 4.75x, 10.6 GB / 14 sequences, 3,850 streams, 1,950 reserved vs 1,800 used (refund 150), RRF Y>X>Z, MRR 0.425, 2.8 score, 0.20 vs 0.60 distance, SRM 0.90 / 22.2 / 49.7, 57,600 to 230,400. Marker convention ("Correct") holds, no positional references remain. |

After edits: `check-quiz-integrity` 0 problems on all six files. Balance (longest / shortest / ratio): sync-collab 24/18/0.99, llm-inference 26/11/1.02, rag 17/10/1.02, llm-gateway 30/4/1.01, feature-flags 23/13/1.02, recsys 31/4/1.02.
Not resolved: shortest-option share is below 15% in llm-inference, rag, llm-gateway, feature-flags and recsys (4% in llm-gateway and recsys). Longest and ratio are in range. Left as is: fixing it needs wholesale option rewrites, not small edits.
