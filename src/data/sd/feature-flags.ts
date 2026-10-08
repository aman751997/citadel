import { row, step } from '../../lib/trace.ts';

// Bucket values below come from the lesson's Java `bucket(salt, userKey)` and are pinned in
// tests/java/feature-flags/Check.java (new-checkout: farah 571, ana 656, chen 2189, gus 2218,
// dara 6317, hana 7286, eli 7678, ben 8655; dark-mode: chen 82).

export const kinds = [
  step('Iris wants the new seller dashboard hidden until it is finished, then turned on for everyone over a week. Which kind of flag is it, and how long should it live?', [], 0, [
    ['A release toggle; days to weeks, deleted once it reaches 100%', 'Right. It exists to separate deploy from release. Once everyone has the new path, the flag and the old branch are dead code to delete.'],
    ['A permission flag; forever', 'Permission flags gate who may use a feature (a paid plan, a beta programme). Nothing here depends on who the user is in the long run.'],
    ['An ops kill switch; forever', 'A kill switch protects a feature that already works. This one is not finished yet, and it should disappear when it is.'],
  ]),
  step('Recommendations call a model service that sometimes melts under load. Dev wants a switch that turns them off in seconds without a deploy. Which kind, and what should the code default be if the flag system cannot be reached?', [], 1, [
    ['A release toggle defaulting to off', 'If this defaulted to off, a flag-system outage at boot would silently switch off a working feature for everyone.'],
    ['An ops kill switch; long-lived; the default keeps the feature running', 'Right. A kill switch is a long-lived lever for degrading on purpose. Its fallback is normal operation: the flag system being down is not a reason to degrade the product.'],
    ['An experiment flag; it lives until the result is in', 'Nothing is being measured. The question is how fast you can turn it off, not which variant wins.'],
  ]),
  step('“Pro sellers get bulk listing.” Someone proposes a flag targeting plan = pro. What is the honest concern?', [], 2, [
    ['Flags cannot target attributes like plan', 'Targeting by attributes is exactly what rules do. The concern is elsewhere.'],
    ['It will skew the experiment results', 'There is no experiment. Every pro seller gets it; nobody is being compared.'],
    ['It is an entitlement that lives forever and decides what customers paid for; it may belong in the billing or authorization service, with the flag only for the rollout', 'Right. Permission flags never expire, and a flag outage must not take away what someone paid for. Many teams keep entitlements in the source of truth for plans and use a flag only while launching.'],
  ]),
];

export const bucketing = [
  step('new-checkout is at 10%. Kestrel computes bucket = hash(flag key + "." + user key) mod 10,000 and serves the new checkout when bucket < 1,000. Who sees it?', [
    row('Bucket', ['farah 571', 'ana 656', 'chen 2189', 'gus 2218', 'dara 6317'], { 0: 'IN', 1: 'IN' }, { tones: { 0: 'done', 1: 'done' } }),
  ], 1, [
    ['Everyone whose bucket is below 10', 'The threshold is in buckets, not percent: 10% of 10,000 buckets is 1,000.'],
    ['farah and ana', 'Right. 571 and 656 are below 1,000; chen at 2189 is not.'],
    ['A random 10% of requests, different each time', 'Nothing here is random per request. The hash gives each user the same bucket on every request, in every process.'],
  ]),
  step('Iris ramps new-checkout from 10% to 25% (bucket < 2,500). What happens to farah and ana?', [
    row('Bucket', ['farah 571', 'ana 656', 'chen 2189', 'gus 2218', 'dara 6317'], { 0: 'IN', 1: 'IN', 2: 'NEW', 3: 'NEW' }, { tones: { 0: 'done', 1: 'done', 2: 'hot', 3: 'hot' } }),
  ], 0, [
    ['They stay in; chen and gus join them', 'Right. Their buckets did not change; only the threshold moved from 1,000 to 2,500. A ramp only ever adds users.'],
    ['They are reshuffled with everyone else', 'Reshuffling would happen only if the hash input (flag key or salt) changed. The threshold moved; the buckets did not.'],
    ['They drop out so the 25% is a fresh sample', 'Nobody leaves when a range widens. Kicking people out mid-ramp is exactly the flapping that bucketing exists to prevent.'],
  ]),
  step('A second flag, dark-mode, also goes to 10%. Kestrel’s first version hashed only the user key. What would that have meant?', [
    row('new-checkout', ['farah 571', 'ana 656', 'chen 2189'], { 0: 'IN', 1: 'IN' }, { tones: { 0: 'done', 1: 'done' } }),
    row('dark-mode', ['farah 9119', 'ana 5434', 'chen 82'], { 2: 'IN' }, { tones: { 2: 'done' } }),
  ], 2, [
    ['Nothing; a good hash is uniform either way', 'Uniform, yes, but identical. Without the flag key, every flag at 10% picks the same 10% of users.'],
    ['Users would get different buckets on different servers', 'Hashing only the user key is still deterministic. The problem is that it is the same for every flag.'],
    ['The same 10% of users would be in every rollout and every experiment, so their effects pile up and the results get tangled', 'Right. With the flag key in the hash, dark-mode’s 10% is chen, not farah and ana: independent rollouts. Without it, one unlucky cohort gets every half-built feature at once.'],
  ]),
];

export const distribution = [
  step('10,000 SDK instances. The ruleset is about 2 MB. A flag changes. What does pushing the full ruleset to everyone cost, versus pushing just the change (about 1 KB)?', [], 1, [
    ['2 MB versus 1 KB in total', 'Multiply by the listeners: every instance receives its own copy.'],
    ['About 20 GB versus about 10 MB', 'Right. 10,000 × 2 MB = 20 GB; 10,000 × 1 KB = 10 MB. Push deltas; serve full snapshots only at startup and after a gap.'],
    ['About 2 GB versus about 1 MB', 'Off by ten: 10,000 × 2 MB is 20,000 MB, which is 20 GB.'],
  ]),
  step('Kestrel polls every 30 seconds with an ETag. Dev says the kill switch needs to land within about 5 seconds. What do you tell him?', [], 0, [
    ['Polling alone cannot do it: worst case is 30 s plus processing. Stream changes (SSE) and keep polling as the fallback', 'Right. Polling at 30 s is cheap (about 333 mostly-304 requests per second) but its staleness is up to the whole interval. A stream delivers in about a second.'],
    ['Poll every second instead', 'That is 10,000 requests per second, almost all returning “nothing changed”, to buy what one open stream per instance gives you for free.'],
    ['Have every request call the flag service directly', 'That puts a network call on every flag check and makes the flag service a dependency of every request. The cure is worse than the delay.'],
  ]),
  step('An SDK holds ruleset version 41. The stream delivers a patch for version 43. What should it do?', [], 2, [
    ['Apply it; 43 is newer', 'Version 42 changed something you never saw. Applying 43 on top of 41 leaves the SDK in a state that never existed on the server.'],
    ['Ignore it and wait for 42', '42 may never come; the stream does not replay. Waiting leaves the SDK stale indefinitely.'],
    ['Detect the gap and fetch a full snapshot (version 43 or later), then resume patches', 'Right. Versions that count up by one make gaps detectable. A gap means resync from a snapshot; an old or duplicate version is simply ignored.'],
  ]),
];

export const clientSide = [
  step('The Kestrel web app needs flag values in the browser. The simplest idea is to ship the server ruleset to the browser and evaluate there. What is wrong with it?', [], 1, [
    ['The browser is too slow to evaluate rules', 'Evaluation is microseconds anywhere. Speed is not the problem.'],
    ['The ruleset exposes everyone’s targeting: beta customers’ emails, segment lists, names of unreleased features', 'Right. Anything sent to a browser is public. Send only this user’s results, evaluated on the server or at the edge.'],
    ['Browsers cannot open SSE connections', 'Browsers support SSE natively (EventSource). The problem is what you would be sending, not how.'],
  ]),
  step('The page renders with the default (old header), then 300 ms later the flag values arrive and it flips to the new header. Users see a flash. Best fix?', [], 0, [
    ['Evaluate on the server during the page request and embed the values in the HTML (bootstrap)', 'Right. The first render already knows the answer; the client SDK then streams only changes.'],
    ['Hide the page until the flag service answers', 'That couples page load to the flag service: when it is slow, every page is slow. Bootstrap the values instead.'],
    ['Pick a random variant until the values arrive', 'Random assignment would flap and corrupt any experiment on that flag.'],
  ]),
];

export const failure = [
  step('A new Kestrel API pod starts while the flag service is completely down, and it has no cached ruleset on disk. What should flag checks return?', [], 2, [
    ['Block startup until the flag service answers', 'Now an outage of the flag service stops you from scaling or restarting the product. The flag system must never take the product down.'],
    ['Throw an exception from every flag check', 'Every request that touches a flag would fail. That converts a flag outage into a product outage.'],
    ['Wait a bounded time (a second or two), then serve the defaults written in code and keep retrying in the background', 'Right. Bounded initialization, then fail-safe defaults, then catch up when the stream reconnects. Log and alert that the pod is running on defaults.'],
  ]),
  step('The flag service has been unreachable for six hours. SDKs are serving the last ruleset they received. What is the right posture?', [], 1, [
    ['Switch every flag to its code default after five minutes', 'That would flip a ramped feature off for millions of users at once because of an outage in an unrelated system.'],
    ['Keep serving last-known-good, export the ruleset age as a metric, and alert when it passes a bound', 'Right. Stale-but-consistent beats a mass flip. The age metric tells you which instances are behind, and the alert tells a human that kill switches will not land.'],
    ['Restart the pods to force a refresh', 'Restarted pods come up without the ruleset (the service is down) and fall back to defaults. You just made it worse.'],
  ]),
];

export const rollout = [
  step('A guarded rollout puts 1% of Kestrel’s 500,000 requests per second on the new search path. Control errors at 0.1%; the new path errors at 0.5%. Roughly how many errors would one minute show in the 1% treatment?', [], 1, [
    ['About 15 errors', 'Check the volume: 1% of 500,000 is 5,000 requests per second, and a minute is 60 seconds.'],
    ['About 1,500, versus about 300 if it behaved like control', 'Right. 5,000/s × 60 s = 300,000 requests. At 0.5% that is 1,500 errors; at control’s 0.1% it would be 300. Unmistakable within a minute, so the rollout can stop and roll back automatically.'],
    ['About 150,000', 'That would be a 50% error rate. 0.5% of 300,000 is 1,500.'],
  ]),
  step('A Friday-evening change sets a production flag from 10% to 100% by mistake. Which control would have caught it before it took effect?', [], 0, [
    ['A required approval for production changes to flagged-critical flags, plus a ramp schedule instead of a jump', 'Right. Approvals stop the fat-finger; ramp steps with guardrails make even an approved mistake small. The audit log tells you who and why afterwards.'],
    ['An audit log', 'An audit log answers “who did this?” after the fact. It does not stop the change.'],
    ['Faster streaming', 'Faster streaming would deliver the mistake faster.'],
  ]),
];

export const stats = [
  step('An experiment was configured 50/50. Exposure logs show 50,000 users in control and 51,500 in treatment. The SRM check (chi-square, 1 degree of freedom) gives about 22.2 against a threshold of 10.83. What do you conclude?', [], 2, [
    ['Treatment is more popular; ship it', 'Assignment is a coin flip. Users cannot choose their arm, so a lopsided count is not a product signal.'],
    ['1,500 is only 3%, too small to matter', 'With 101,500 users, a fair 50/50 split would very rarely be off by 1,500. Chi-square 22.2 means p is far below 0.001.'],
    ['Sample ratio mismatch: something in assignment or logging is broken, so the results cannot be trusted until it is found', 'Right. Typical causes: treatment logs exposure on a code path control lacks, a crash that drops control events, bots filtered unevenly, redirects that lose users.'],
  ]),
  step('The product manager checks the dashboard every day for 20 days and plans to stop the first day p < 0.05. Roughly how often would an experiment with NO real effect be declared a winner?', [], 1, [
    ['5% — that is what p < 0.05 means', 'Five percent holds for one look at a fixed sample size. Every extra look is another chance to cross the line by luck.'],
    ['About 25%', 'Right. Simulating 20 equally spaced looks on an A/A test gives about one false winner in four. Fix the sample size up front, or use a sequential method designed for peeking.'],
    ['Never — more data always makes the result more accurate', 'More data helps a single final test. Stopping at the first lucky crossing is what inflates false positives.'],
  ]),
  step('Should the analysis include users who were assigned to the experiment but never reached the checkout page where the change appears?', [], 0, [
    ['No: analyse users with an exposure event, logged when the code path actually evaluated the flag', 'Right. Unexposed users behave the same in both arms and dilute the measured effect toward zero.'],
    ['Yes: assignment is what randomised them', 'Assignment is randomised, but users who never saw the change cannot react to it. Including them shrinks the effect and wastes power.'],
    ['Only the treatment users who did not reach it', 'Filtering one arm differently from the other breaks the randomisation and biases the comparison.'],
  ]),
];

export const drills = [
  step('Why must flag evaluation be local (SDK memory) instead of a flag-service API call?', [], 1, [
    ['API calls are harder to authenticate', 'Authentication is solvable. The problem is latency and coupling.'],
    ['Flag checks run thousands of times per second inside the request hot path; a network hop per check adds latency and makes the flag service a single point of failure for everything', 'Right. Push config, evaluate locally: the inversion that defines this design. It also gives you the availability story (last-known-good on disk) for free.'],
    ['Local evaluation is easier to test', 'It is, but that is a side benefit, not the reason.'],
    ['SSE cannot carry evaluation results', 'SSE can carry anything. Local evaluation is about the hot path.'],
  ]),
  step('Why hash(flag key + user key) rather than hash(user key)?', [], 1, [
    ['It distributes more uniformly', 'A good hash of the user key alone is already uniform. Uniform but identical for every flag is the problem.'],
    ['Without the flag key, the same cohort lands in treatment for every experiment; cohorts correlate across experiments and contaminate all results', 'Right. Independent randomisation per flag. One token of salt buys the statistical validity of the whole platform.'],
    ['user key alone can collide', 'Collisions are irrelevant here; many users share each bucket by design.'],
    ['The flag key makes the hash cryptographically secure', 'Security is not the goal. Independence across flags is.'],
  ]),
  step('The product manager checks the dashboard daily and stops the experiment the first day p < 0.05. What is wrong?', [], 1, [
    ['Nothing — that is what significance means', 'Significance at 0.05 assumes one planned look. Daily looks with stop-on-success give many chances to be fooled.'],
    ['Peeking: repeated interim checks with stop-on-significance inflate false positives (about 25% at 20 looks); fix sample size or duration up front, or use a sequential test built for peeking', 'Right. Optional stopping is the most common real-world experimentation sin. Naming the fix is what “has shipped experiments” sounds like.'],
    ['The sample was too small on day one', 'Small samples are noisy, but the deeper problem is the stopping rule, which inflates false positives at any size.'],
    ['p-values require a week minimum by convention', 'There is no such convention. A full week is often wise for weekly seasonality, but that is a separate point.'],
  ]),
  step('A flag service redesign proposes storing user → variant rows so assignment is “guaranteed sticky”. Your response?', [], 2, [
    ['Good idea; storage is cheap', 'Cheap to store, expensive to read: a lookup per flag check puts the network back on the hot path.'],
    ['Only for experiments, not rollouts', 'Experiments need stickiness just as much, and hashing already gives it.'],
    ['Unnecessary: a deterministic hash of flag key and user key is already sticky everywhere, with no storage and no lookup', 'Right. The only reason to store assignments is to freeze them against future rule edits (some platforms offer this for long experiments). Say that as the exception.'],
  ]),
  step('Which flag should NOT have an expiry date?', [], 3, [
    ['The release toggle for the new seller dashboard', 'Release toggles should be the shortest-lived of all. Give them an expiry date and a cleanup ticket on day one.'],
    ['The checkout button colour experiment', 'Experiments end when the decision is made. The losing branch is deleted.'],
    ['A temporary flag that “might be useful later”', 'This is how flag debt starts. If it is not needed now, delete it.'],
    ['The kill switch around the recommendation model call', 'Right. Ops kill switches are deliberately permanent levers, like circuit breakers. They still need an owner and a periodic test that flipping them works.'],
  ]),
  step('Kestrel has 10,000 SDK instances and a kill switch must land within seconds. Which distribution design?', [], 0, [
    ['Streaming deltas (SSE) through regional relays, versioned rulesets with gap detection, CDN-cached snapshots for startup and resync, polling as fallback', 'Right. Each piece answers one need: speed (stream), scale (relays and CDN), correctness (versions), resilience (poll fallback, last-known-good).'],
    ['Polling every 30 seconds from the database', '333 queries per second on the source of truth and up to 30 seconds of delay for a kill switch.'],
    ['Push the full ruleset to every instance on each change', '20 GB per change at 2 MB × 10,000. Push deltas.'],
    ['Each request asks the flag service', 'Back to a network call per flag check. The whole point is to avoid this.'],
  ]),
];
