# Quiz and model-answer review: mastery chapters

Scope: every `<Quiz>`, in-DryRun predict question, `<Reveal>` model answer and `<AnswerModes>` block under `src/mastery/**` (ai-pipeline, reporting-engine, telemedicine-poc, war-stories). Source of truth: the chapter text plus the local repos, read-only (`~/code/rgt-ai-pipeline-service`, `~/code/rgt-healthcare-ecosystem`, `~/code/telemedicine-poc`). Reviewed 2026-10-19. No secrets or personal data recorded.

Totals: 6 `<Quiz>` blocks (15 questions), 2 DryRun predict questions, 146 `<Reveal>`, 40 `<AnswerModes>`. Quiz verdicts: 11 OK, 4 FIXED (explanations only; no answer index was wrong).

## Quizzes

| lesson | quiz id | Q# | verdict | note |
| --- | --- | --- | --- | --- |
| ai-pipeline/llm-engineering | ap-llm | 1 | OK | Thinking tokens: 40.3 s to 10.2 s is a chapter measurement; `thinking_budget=0` confirmed in `app/llm/gemini_api.py`. |
| ai-pipeline/llm-engineering | ap-llm | 2 | OK | 8.3 tok/s, 154 s/doc are chapter measurements (not re-runnable here). 1081/8.3 = 130 s decode plus prefill is consistent. |
| ai-pipeline/question-bank | qb-basic | 1 | FIXED | Wrong-option explain said "the chapter never gives this as a reason". Browser can hold a connection; rewrote to the real point. |
| ai-pipeline/question-bank | qb-basic | 2 | OK | Event carries pointers plus tenant/patient ids; checked against the event example. |
| ai-pipeline/question-bank | qb-inter | 1 | FIXED | Option 3 explain ("not the argument") replaced with a specific one: vector DBs can filter, the gap is operational. |
| ai-pipeline/question-bank | qb-inter | 2 | FIXED | "Correct." and "unrelated" explains given real reasons (LOINC code stable across phrasing; temperature does not affect rule matching). |
| ai-pipeline/question-bank | qb-adv | 1 | OK | Ack after work; `requeue=False` dead-letters only on exception (consumer.py). |
| ai-pipeline/question-bank | qb-adv | 2 | FIXED | Stem was definition recall ("the text says...") and two options shared the same reason. Rewritten as a scenario; `x-delivery-count >= 3` check confirmed at consumer.py:153/301. |
| ai-pipeline/question-bank | qb-adv | 3 | FIXED (explain) | "Correct." expanded: every merge reads all of the patient's entities. |
| reporting/request-lifecycle | re-lifecycle | 1 | OK | Branch predicate only for RESTRICTED scope (QueryCompiler). |
| reporting/request-lifecycle | re-lifecycle | 2 | OK | `IllegalStateException` thrown at QueryCompiler.java:94/176; 400 path is `CatalogValidationException`. |
| reporting/request-lifecycle | re-lifecycle | 3 | OK | Cast on the parameter keeps the index usable. |
| reporting/security | re-security | 1 | OK | Values bound; validator does not inspect values. |
| reporting/security | re-security | 2 | OK | QueryCompiler.java:209-212: HAVING only when `minimumGroupSize > 0`; validator has no privacy check. |
| reporting/security | re-security | 3 | OK | `BranchContextFilter` javadoc: header takes precedence. Gateway behaviour stays Unverified (already badged). |
| reporting/architecture (DryRun) | dashFrames | predict | OK | maxWaitDuration 0 gives immediate 429; `application.yml` bulkhead is 10 now. |
| reporting/request-lifecycle (DryRun) | runFrames | predict | OK | Scope RESTRICTED adds branch predicate. |

## Corrections and hedges to model answers (before to after)

| file | claim | result |
| --- | --- | --- |
| ai-pipeline/negation (Reveal "why is not not a cue") | "bare 'not' as a cue would negate both" hypertension and nephropathy | CORRECTED. Ran the real `_is_negated` regexes: hypertension (before the cue) stays affirmed, only nephropathy flips. Reveal now says so and notes the "not well controlled hypertension" case. |
| ai-pipeline/negation (Reveal basic) | "Roughly half of clinical concept mentions are negated..." | Hedged as a recalled, unmeasured figure (Unverified badge). |
| telemedicine/transcription (gate table and AnswerModes deep) | no_speech 0.5 is "Whisper's own default" | CORRECTED. Installed mlx-whisper defaults: no_speech 0.6, compression 2.4, logprob -1.0. Gate 1 (0.5) is stricter than the default. |
| telemedicine/transcription (Reveal alignment) | "Who speaks first after alignment?" (the doctor's segment starts earlier anyway, so the stem was ambiguous) | REWRITTEN to "does the answer start before or after the question ends"; answer unchanged in substance (after, by 4 ms). |
| ai-pipeline/provenance (AnswerModes medium) | `span_match` distribution "is on the dashboard" | CORRECTED. Metric `ner_span_match_total` exists; no Grafana panel uses it in the repo. Now says so, Unverified badge. |
| ai-pipeline/provenance (Reveal fuzzy) | "everything else stays unlocated" | Tightened: a quote that fails the numeric guard or the 0.85 score stays unlocated. |
| ai-pipeline/rag (honest status) | chunk tenant falls back "to null" | CORRECTED to the placeholder `"unknown"` (chunking_service.py:90-114). |
| ai-pipeline/three-stage-ner (AnswerModes "why three models") | legacy-path metrics stated as fact while repo default `NER_MODE` is `medgemma_only` | Added mode caveat and Unverified badge. |
| ai-pipeline/llm-engineering (AnswerModes) | 3.8-flash numbers while repo default model is 2.5-flash | Added "my local runs, repo default is 2.5-flash" with Unverified badge. |
| ai-pipeline/production-readiness (AnswerModes short) | "361 tests" | Hedged: `pytest --collect-only` on the current working tree lists 384 (361 was the count when measured). |
| ai-pipeline/design-drills (drill 7 Reveal, AnswerModes, card) and question-bank (rabbit-vs-kafka medium) | "I can get [replay] by re-publishing from the documents table" | Marked Hypothetical: no replay/republish script exists in the repo. |
| ai-pipeline/question-bank (Q54 J3 rollback) | "One config row per section key" | Marked Planned: Java `AiSectionConfig` has model/prompt/enabled only, no source column. |
| ai-pipeline/question-bank (Q6 WebSocket auth) | CONNECT authenticated, SUBSCRIBE authorised | Unverified: no STOMP/ChannelInterceptor auth code in the checked-out Java branch (`feature/BH-129-trust-this-device`). |
| reporting/request-lifecycle, design-decisions, war-stories (Reveal, rehearsed answer, Q&A table) | "compilation is microseconds" | Replaced with "compiling builds SQL text, no database call" (not timed). |
| reporting/design-decisions (flyway-catalog medium) | "The reviewer checks two things" | Reworded to "should check"; no checklist in the repo (Unverified). |
| reporting/war-stories (Q&A table, story GST medium) and question-bank (table) | "replica was a URL change"; "I verified each..."; "byte-identical"; "five teams"; "25 of 38 migrations" | Replica move now Unverified (only the config mechanism is in code); "I verified" gated on it being the user; byte-identity softened to match the chapter's own test finding; five teams badged Unverified; migration share aligned with the hub (28 of 40 at 2026-09-11, about two-thirds). |
| telemedicine/architecture (Reveal End-before-delete) | egress "would be cut off" | Reworded as design reasoning, not reproduced. |

## Checked and VERIFIED against code (no change)

- Pipeline: prefetch 5, semaphore from `MAX_CONCURRENT_EVENTS` (default 1), webhooks outside the semaphore, webhook 2 attempts with 0.5 s backoff then logged and message acked, timeouts connect 1 s + read 5 s (about 6 s x 2 x 4 = 48 s), idempotency key `patient:section:document:run_id` with run id minted per handler call, NER-only failure still acked, only a double failure dead-letters, `x-delivery-count` never set on classic queues, DLQ not consumed (sweep is non-destructive).
- Pipeline: no allergy handling anywhere in `app/`; Gemini 2.5 Flash 0.30/2.50 per 1M; retries 4 with backoff base 1 s; `MAX_SPANS_PER_BATCH=30`; LLM concern ids are `uuid4` per run; `GEMINI_REASONING_THINKING_BUDGET` default -1 (thinking on); `risk_flags` JSONB column; reasoning prompt text; chunk 512/50 tiktoken cl100k; HNSW `m=16, ef_construction=64`; `vector(768)`; `hnsw.iterative_scan` in `search_dense`; resolver fuzzy tier 12 chars / 0.85 / numeric guard; S3 entity fetch semaphore 32; negation regexes; asyncpg `server_settings` search_path; `s3://` normaliser; GLiNER 300/50 windows; RabbitMQ `RABBITMQ_NODENAME` and volume.
- Reporting: bounds 5/10/100/5000; cache TTL 60/30 s; bulkhead `datasource-adapter` 10 / wait 0 (single global instance); `stub` default false; V33 and V36 contain no CREATE/ALTER (data only), dated 2026-09-02 and 2026-09-09 by git; V20 comment on denormalised branch name; V31 refund exclusion (`PENDING_APPROVAL`, `FAILED`); audit insert in try/catch, user `SYSTEM` fallback, `dslHash = sha256(sql)`, no definition id; `KEYS` scan in cache eviction; scheduler poll 60 s, ShedLock 30 s/9 m, next run advances in `finally`, delivery failure marks artifact FAILED and keeps it; save validates but does not compile.
- Telemedicine: gates 0.5/2.4/-1.0/0.2 s/-35 dBFS, coalesce 1.5 s, model `mlx-community/whisper-turbo`, MedGemma 180 s/1024, 409 on second record and second sign, 20 x 500 ms poll, any-missing startedAtNs falls back to relative time for all tracks, finalise removes room from map before awaits, End finalises before `deleteRoom`, webhook raw-body verification, HTTP relay via `sendData`, `pendingConsents` guard, audio deletion with `KEEP_AUDIO=1`, docker probe 40 x 5 s, no git repo, dev keys present in config.
- war-stories: all Python-side claims above (stories 1, 2, 4, 6) confirmed; Java-side claims (stories 3, 5, 8) not checkable.

## COULD NOT VERIFY (for the user; status badges left as they were)

- Anything about real usage, number of tenants/users, who authored which change, and your personal share (reporting, telemedicine, war-stories). Already badged Unverified.
- Timings and measurements in the chapters (55 s/doc, 52 s average GET, 40.3 to 10.2 s, 8.3 tok/s, 29-74 ms skew, under-a-minute transcription): they come from original runs.
- Java-side facts: WebSocket CONNECT/SUBSCRIBE auth, Java test failure counts, committed JWT literal, J3 rollback switch, Java listener retry behaviour, story 3 and 8 outcomes.
- Whether a gateway strips `X-Branch-Id`; whether a SELECT-only DB role exists; whether the replica move happened.
- ai-pipeline "Likely follow-ups" lines outside answer boxes: "temperature 0.1-0.2" (no temperature setting found in `gemini_api.py`), "a prompt that says return JSON gets JSON 97% of the time" (no source), "Rollback plan for J3" (planned only).
- Which `NER_MODE` and which Gemini model the quoted numbers came from.
