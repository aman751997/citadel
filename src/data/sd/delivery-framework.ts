import { row, step } from '../../lib/trace.ts';

// Chapter 1 · The clock
export const clock = [
  step('A 45-minute round. Intros take 3 minutes, your questions at the end take 4, so design runs from 0:03 to 0:41. You spend 18 minutes on requirements. Entities, API and the high-level design then take their planned 2 + 4 + 10 minutes. How many minutes are left for deep dives and wrap-up together?', [
    row('Plan (min)', ['Intro 3', 'Req 6', 'Ent 2', 'API 4', 'HLD 10', 'Dives 13', 'Wrap 3', 'Q&A 4']),
    row('Actual (min)', ['Intro 3', 'Req 18', 'Ent 2', 'API 4', 'HLD 10', '?', '?', 'Q&A 4'], { 1: 'OVER', 5: 'LEFT?' }, { tones: { 1: 'hot', 5: 'ghost', 6: 'ghost' } }),
  ], 1, [
    ['16 minutes, as planned', 'The 12 extra minutes on requirements came from somewhere. The interview does not get longer because you were thorough.'],
    ['4 minutes', 'Right. 0:03 + 18 = 0:21. Add 2 + 4 + 10 and it is 0:37, leaving 4 minutes before 0:41 for dives and wrap-up that were budgeted 16. The phase where offers are won shrank by three quarters.'],
    ['None — you run into the Q&A', 'Close to the truth in practice, but the arithmetic leaves 4 minutes: 41 − 21 − 16 = 4.'],
    ['13 minutes', 'That is the planned deep-dive budget. Overspending on requirements means you never get it.'],
  ]),
  step('A 60-minute round gives you 15 more minutes than a 45. Where should most of them go?', [
    row('45 → 60 (min)', ['Intro 3→5', 'Req 6→7', 'Ent 2→3', 'API 4→5', 'HLD 10→12', 'Dives 13→20', 'Wrap 3→3', 'Q&A 4→5'], { 5: '+7' }, { tones: { 5: 'done' } }),
  ], 2, [
    ['Requirements — get them perfect', 'Requirements gain a minute, not ten. Longer requirements are the habit this lesson exists to break.'],
    ['The high-level diagram — make it complete', 'The diagram gains two minutes. A more elaborate diagram is not what a longer round is testing.'],
    ['Deep dives — a third dive, or deeper second one', 'Right. Seven of the fifteen extra minutes go to depth. A longer round mostly buys a third dive, or the ability to follow the interviewer further down one.'],
    ['Wrap-up — a longer summary', 'Wrap-up stays about three minutes. A long summary repeats what the interviewer already watched you build.'],
  ]),
];

// Chapter 2 · Who holds the marker
export const driving = [
  step('You finish requirements and the interviewer just nods and says nothing. What do you do?', [], 1, [
    ['Wait for them to tell you what is next', 'Waiting hands them the marker. In a senior round the silence is often a test of whether you will drive.'],
    ['Say what comes next and start it: “I’ll list the core entities, then the API — stop me if you’d rather go elsewhere.”', 'Right. Announce, invite redirection, proceed. You drive; they can still steer.'],
    ['Ask “What would you like me to do next?”', 'Polite, but it asks them to run your interview. Propose the next step instead and let them veto it.'],
    ['Start drawing the full architecture in silence', 'Silence is your logged failure mode. Nothing you do silently gets written down.'],
  ]),
  step('You are halfway through the API when the interviewer says: “Let’s talk about what happens when one link goes viral.” What now?', [], 2, [
    ['“Sure — I’ll get there in the deep dives, let me finish the API first.”', 'You just overruled the person writing your feedback. An interviewer’s steer is the strongest hint you will get.'],
    ['Answer in one sentence, then return to the API', 'One sentence tells them you did not take the steer seriously. They asked for a conversation about it.'],
    ['Follow them now, and leave a marker: “I’ll pause the remaining endpoints — they’re simple — and come back if we need them.”', 'Right. Follow the steer, say out loud what you are parking so it is not a silent skip, and return only if it matters.'],
    ['Ask them to clarify what “viral” means before saying anything', 'A clarifying number can help (“how many redirects per second?”), but asking only that and waiting stalls you. Ask, assume, and move.'],
  ]),
  step('Two candidates produce the same working design. What most often separates the senior performance from the mid-level one?', [], 0, [
    ['The senior names the hard parts unprompted and drives the deep dives with numbers and a committed choice', 'Right. Mid-level candidates often reach a working design with the interviewer steering into the dives; senior candidates find the dives themselves and finish each one with a decision.'],
    ['The senior draws more boxes', 'More boxes is more surface for “why does this exist?” Box count is not a signal.'],
    ['The senior uses more product names (Kafka, Cassandra, Envoy)', 'Names without reasons score nothing. The reason is the signal.'],
    ['The senior spends longer on requirements', 'Longer is not better. Sharper requirements, with numbers, in the same five or six minutes, is.'],
  ]),
];

// Chapter 3 · Requirements
export const requirements = [
  step('“Design Instagram.” You get to pick three core functional requirements. Which three?', [], 2, [
    ['Sign up / log in, upload a photo, view a profile', 'Auth is table stakes; you can assume it and say so. View-a-profile is a simple read and hides the hard problem.'],
    ['Upload a photo, like a photo, comment on a photo', 'Likes and comments are real features but they are not what makes Instagram hard. You would design a CRUD app and miss the feed.'],
    ['Upload a photo, follow a user, view a home feed of people you follow', 'Right. Without these three it is not Instagram, and together they create the hard part: building a feed from many follows. Name likes, comments, stories and DMs as out of scope.'],
    ['Feed, stories, reels', 'Three variations of “consume content” and nothing that creates content. Pick the verbs the product exists for, including the write.'],
  ]),
  step('Which non-functional requirements statement would score?', [], 1, [
    ['“It should be scalable, reliable and highly available.”', 'Every system wants these. Without numbers or a choice they change nothing in your design.'],
    ['“Feed loads in under 500 ms at p99; reads favour availability, so a new post may take a few seconds to reach followers; an acknowledged upload is never lost; about 100 million daily users.”', 'Right. A latency number with a percentile, an explicit availability-over-consistency choice and where it applies, a durability promise, and scale. Each one will drive a decision later.'],
    ['“We’ll use Cassandra so it’s always available.”', 'That is a solution, not a requirement — and it arrives before you know what the data looks like.'],
    ['“It must support millions of users.”', 'A start, but one vague number. How many daily users, what read/write mix, what latency?'],
  ]),
  step('Iris says the new service needs “three nines”. Roughly how much downtime is that in a 30-day month?', [], 1, [
    ['About 4 minutes', 'That is four nines: 0.01% of 43,200 minutes ≈ 4.3 minutes.'],
    ['About 43 minutes', 'Right. 30 × 24 × 60 = 43,200 minutes; 0.1% of that is 43.2 minutes. Over a year, 99.9% allows about 8.8 hours.'],
    ['About 8.8 hours', 'That is the yearly budget for 99.9% (0.1% of 8,760 hours). Per month it is about 43 minutes.'],
    ['About 43 seconds', 'Off by a factor of 60 — the unit slip. 0.1% of 43,200 minutes is 43.2 minutes.'],
  ]),
];

// Chapter 4 · Core entities
export const entities = [
  step('Users have roles. A role grants many permissions, and the same permission (say “export reports”) is granted by many roles. How do you model Role ↔ Permission?', [], 1, [
    ['A role_id column on permissions (one-to-many)', 'This is the bug from your own mock history. It forces each permission to belong to one role, so “export reports” would need a copy per role.'],
    ['A join table role_permissions(role_id, permission_id) — many-to-many, said out loud', 'Right. Ask “can each side have many of the other?” Yes twice means a join table, and you name it.'],
    ['A permissions array stored inside each role row', 'Reading one role is easy, but “which roles grant export?” becomes a scan, and renaming a permission touches every role that holds it.'],
    ['One table with a row per user per permission', 'That flattens roles away. Changing what a role grants would mean rewriting rows for every user who has it.'],
  ]),
  step('Designing a social app: users follow other users. Where does “follows” live?', [], 0, [
    ['Its own entity: Follow(follower_id, followee_id, created_at)', 'Right. A many-to-many relationship between users is an entity of its own. It gets a table, indexes in both directions, and is often the biggest table in the system.'],
    ['A followers list stored on each User', 'A celebrity has tens of millions of followers. One row cannot hold that, and every follow becomes an update to a huge row.'],
    ['It does not need to be modelled; the feed service handles it', 'Then the feed service has nothing to read. Relationships the product depends on must be named.'],
  ]),
  step('How much detail does the entity step need in a 45-minute round?', [], 2, [
    ['Full table definitions with column types and indexes', 'That takes ten minutes and most of it changes once you draw the design. Fields arrive when a box needs them.'],
    ['Skip it; the entities are obvious', 'Skipping it is exactly where the M:N trap hides. Two minutes buys you a shared vocabulary for the rest of the round.'],
    ['A list of the nouns and the relationships between them, with cardinality — about two minutes', 'Right. Names and cardinality now; key fields later, written next to the database box when you draw it.'],
  ]),
];

// Chapter 5 · The API
export const api = [
  step('Which endpoint creates a paste?', [], 3, [
    ['POST /createPaste with body content', 'A verb in the path. In REST the HTTP method is the verb and the path names a resource.'],
    ['POST /pastes with body userId and content', 'The resource is right, but userId in the body lets any client claim to be anyone. The user comes from the authentication token.'],
    ['GET /pastes/new?content=…', 'GET must be safe — no side effects. Crawlers, prefetchers and caches may call it, and query strings have length limits.'],
    ['POST /pastes with body content and expiresIn; the user (if any) comes from the auth token; returns 201 with the new id', 'Right. Plural noun, POST to create, identity from the token, 201 Created with the id (and a Location header).'],
  ]),
  step('A home feed scrolls forever, and new posts keep arriving at the top while the user scrolls. Which pagination?', [
    row('Page 1 (offset 0)', ['P9', 'P8', 'P7'], { 2: 'last' }),
    row('2 new posts arrive', ['P11', 'P10', 'P9', 'P8', 'P7', 'P6'], { 0: 'new', 1: 'new' }, { tones: { 0: 'hot', 1: 'hot' } }),
    row('Page 2 (offset 3)', ['P8', 'P7', 'P6'], { 0: 'dup', 1: 'dup' }, { tones: { 0: 'out', 1: 'out' } }),
  ], 1, [
    ['Offset pagination: ?limit=3&offset=3', 'The board shows the problem: two new posts shift everything down, so page 2 repeats P8 and P7. Deep offsets also make the database read and discard every skipped row.'],
    ['Cursor pagination: ?limit=3&cursor=after P7 — return items older than the last one seen, plus the next cursor', 'Right. The cursor names a position in the data, not a count, so inserts at the top cannot shift it. Page 2 is P6, P5, P4. The cost: no “jump to page 40”, which a feed never needs.'],
    ['No pagination — return the whole feed', 'A feed can hold thousands of posts. The first screen needs a handful.'],
  ]),
  step('A phone sends POST /orders, the server creates the order, and the response is lost in a tunnel. The app retries. How do you stop a second order?', [], 2, [
    ['Tell the app never to retry a POST', 'Then a lost response leaves the user not knowing whether they ordered. Retries are necessary; duplicates are the problem.'],
    ['Reject a second order from the same user with the same amount within a minute', 'Fuzzy de-duplication blocks real orders (two identical coffees) and misses retries that arrive later. It guesses at intent.'],
    ['The client sends an Idempotency-Key it generated for this order; the server stores key → result and replays the stored result on a retry', 'Right. One logical operation, one key, at most one effect. A client-chosen order id with PUT /orders/{id} is the same idea expressed in the URL.'],
    ['Wrap the insert in a database transaction', 'The first transaction committed. The retry is a new request with its own transaction; atomicity does not de-duplicate.'],
  ]),
  step('A retry arrives with the same Idempotency-Key but a different amount in the body. What should the server do?', [], 0, [
    ['Reject it with a client error — a reused key must carry the same request', 'Right. Same key, different body is a client bug. Replaying the old result would hide it; processing the new body would break the promise of the key.'],
    ['Return the stored result of the first request', 'The client would believe its new amount was charged when it was not.'],
    ['Process it as a new order', 'Then the key guarantees nothing — any changed field turns a retry into a duplicate.'],
  ]),
];

// Chapter 6 · High-level design
export const highLevel = [
  step('Requirements and API are agreed for the URL shortener. What do you draw first?', [], 1, [
    ['Everything you will eventually need: load balancer, cache, queue, CDN, shards', 'You will spend ten minutes on boxes nobody asked for yet, and each one invites “why is this here?”'],
    ['Only the boxes the first functional requirement needs — create a short link — then trace that request through them; then the next requirement', 'Right. One requirement at a time keeps every box justified and guarantees the design actually satisfies what you promised.'],
    ['The database schema in full', 'The schema is a detail of one box. Draw the request path first; key fields go next to the database box.'],
  ]),
  step('Your URL shortener has about 3,000 redirects per second at peak and about 30 creates per second. Should reads and writes be separate services?', [], 2, [
    ['Yes — reads outnumber writes 100 to 1', 'A stateless service scales reads by adding instances behind the load balancer. A traffic ratio alone is not a reason to split code.'],
    ['Yes — microservices are the scalable choice', 'Each extra service adds a network hop, a deploy and a failure mode. Split for a reason you can say.'],
    ['Not yet — one stateless service scaled horizontally; split only when the paths need different scaling, failure isolation, data ownership or release cadence', 'Right. Name the reasons that would justify a split. Here the creation path could later move out if, say, abuse checks make it slow — but that is a deep dive, not a starting box.'],
  ]),
];

// Chapter 7 · Deep dives
export const deepDives = [
  step('URL shortener, 0:25 in a 45-minute round, high-level design done. Requirements said: redirects p99 under 100 ms, codes must be unique, 100:1 reads. Which plan for the next 13 minutes?', [], 0, [
    ['Dive 1: unique code generation. Dive 2: the redirect read path under peak and viral load (cache with its four promises). Commit in each.', 'Right. Each dive answers a requirement the high-level design has not yet proven. Two committed dives in 13 minutes is a strong round.'],
    ['Six short dives, two minutes per component', 'Two minutes per topic is a tour, not depth. Pick the hardest two or three and finish them.'],
    ['Kubernetes manifests and the CI pipeline', 'Real work, but it answers no stated requirement. Interviewers rarely score deployment tooling in a product design round.'],
    ['The analytics dashboard', 'You declared analytics out of scope at minute five. Re-opening it now spends depth on something you agreed not to build.'],
  ]),
  step('Random 7-character base62 codes: 62⁷ ≈ 3.5 trillion possible codes. After five years at 1 million new links a day (≈ 1.8 billion links), what is the chance a fresh random code collides with an existing one?', [], 1, [
    ['About 5%', 'That would need roughly 175 billion links in the space. 1.8 billion ÷ 3.5 trillion is far smaller.'],
    ['About 0.05%', 'Right. 1.825 × 10⁹ ÷ 3.52 × 10¹² ≈ 0.0005, or 1 in 2,000. A unique index catches it and you retry with a new code — one extra insert per 2,000 creates.'],
    ['About 50%', 'That is the birthday-paradox intuition for whether ANY two codes ever collided, which is near certain. The question is what one new code risks against everything stored.'],
    ['Exactly zero, because codes are random', 'Random does not mean unique. Only a uniqueness check (or a counter) guarantees it.'],
  ]),
];

// Part Three · Under pressure
export const pressure = [
  step('Which sentence narrates a tradeoff the way an interviewer wants to hear it?', [], 3, [
    ['“Cursor pagination is better.”', 'Better for what, and at what cost? A verdict without a reason is not a tradeoff.'],
    ['“We could use offset or cursor pagination; both have pros and cons.”', 'A menu, not a decision. Listing options without committing is a common way to lose a deep dive.'],
    ['“I always use cursors.”', 'A habit, not a judgment. The interviewer will ask for the case where you would not.'],
    ['“Cursor over offset, because the feed changes while people scroll deep. We give up jumping to page N, which a feed never needs. For an admin table with page numbers I’d use offset.”', 'Right. Choice, reason tied to a requirement, the cost accepted, and the condition that would flip it.'],
  ]),
  step('The interviewer asks for Kafka’s default maximum message size. You don’t remember it. Best answer?', [], 2, [
    ['Give a confident number and move on', 'If it is wrong, you have taught the interviewer that your confident numbers cannot be trusted — including the ones you got right.'],
    ['“I’m not familiar with Kafka.” Then wait.', 'Honest, but it stops the conversation. Say what you do know and keep designing.'],
    ['“I don’t remember the default and I’d check the docs. It shouldn’t decide this design: I’d keep events small and put large payloads in object storage, passing a reference.”', 'Right. Admit it in one sentence, then show that your design does not depend on the fact you lack.'],
    ['Switch the design to a different message broker', 'Swapping components to avoid a question looks like dodging, and the new one has limits too.'],
  ]),
  step('Theo asks: “What happens to your ID-counter service when its one node dies?” You realise it is a single point of failure. What do you say?', [], 1, [
    ['“It rarely fails, and we can restart it quickly.”', 'Every create stops while it is down. Defending a flaw the interviewer has just found is the worst version of this moment.'],
    ['“Good catch — that’s a single point of failure. I’ll switch to range allocation: each app server leases a block of 1,000 ids from a replicated store, so losing a server wastes at most an unused block.” Then update the diagram.', 'Right. Name it, own it in one sentence, fix forward with the smallest change, and redraw. That recovery often scores better than never having made the mistake.'],
    ['“Let me start the design over.”', 'One flawed box does not justify a restart, and the clock will not give the minutes back.'],
    ['Apologise several times, then continue', 'One acknowledgement is enough. Repeated apologies spend time and signal panic.'],
  ]),
  step('You decide not to cover authentication in a 45-minute round. How do you handle it?', [], 0, [
    ['Say it: “I’ll assume a standard auth layer that gives us a user id on every request — happy to go into it if you want.”', 'Right. A spoken assumption is a decision; a silent one looks like a gap. It also invites the interviewer to redirect if auth matters to them.'],
    ['Leave it out; the interviewer knows auth exists', 'The interviewer can only score what you say. Silent skips read as “did not think of it”.'],
    ['Spend five minutes on OAuth flows to be safe', 'Five minutes of a generic topic is five minutes out of your deep dives.'],
  ]),
];

// Decision drills — mixed, including the original checkpoint questions
export const drills = [
  step('Your interviewer asks: “How would you handle resource-level authorization?” What happens FIRST?', [], 1, [
    ['Draw the auth service on the diagram', 'Drawing before you know which layer they mean risks designing the wrong thing in detail.'],
    ['Confirm which layer they mean — identity, tenant, role, or resource — before answering', 'Right. Answering a different layer than asked is your logged failure mode (tenant isolation answered when resource authorization was asked). One clarifying sentence costs five seconds; answering the wrong question costs the whole dive.'],
    ['Explain JWT validation end to end', 'JWT validation is identity (authentication). The question was about which user may act on which resource.'],
    ['Add a Redis permission cache', 'A cache is an optimisation for an answer you have not given yet — and without key, TTL and invalidation it is a hand-wave.'],
  ]),
  step('Which of these counts as a completed deep-dive decision?', [], 2, [
    ['“We can cache hot URLs in Redis to reduce DB load.”', 'No key shape, no TTL reason, no invalidation story, no failure plan. This is the hand-wave interviewers mark down.'],
    ['“We could use either a fixed window or a sliding window here.”', 'Two options and no commitment. A dive ends with a choice.'],
    ['“Cache code → long URL, 24h TTL since mappings are immutable, cache-aside, delete the key if a link is deleted.”', 'Right: key shape, a TTL with a reason, and an invalidation story, in one breath. Add the failure plan if there is time.'],
    ['“Redis is faster than Postgres for reads.”', 'A fact, not a design decision. Faster for which reads, and how does the cache stay correct?'],
  ]),
  step('You are 28 minutes into a 45-minute round and still drawing high-level boxes. What does the framework say?', [], 1, [
    ['Finish the diagram properly — completeness first', 'Completeness of boxes is not what is being scored at minute 28. Every minute here comes out of the deep dives.'],
    ['Cut to deep dives now; an incomplete diagram with two strong dives beats a complete diagram with none', 'Right. Dives were due at 0:25. Interviewers forgive a rough diagram; they do not forgive zero depth. Say what you are leaving rough so it is not a silent skip.'],
    ['Ask the interviewer for more time', 'The slot is fixed. Asking signals you lost the clock.'],
    ['Skip wrap-up to compensate later', 'Wrap-up is only three minutes; skipping it does not rescue the dives, and you lose the strong ending.'],
  ]),
  step('You finish your numbers: about 3,000 redirects per second at peak and 1 TB over five years. What is the next sentence?', [], 3, [
    ['“Let me double-check those with exact arithmetic.”', 'Precision your inputs never had. The numbers are rough on purpose.'],
    ['Silence while you start drawing', 'The numbers end without a conclusion — your logged red flag of skipping the bridge.'],
    ['“So we’ll need Cassandra and Kafka.”', 'Your own numbers say a single relational database fits. Reaching for scale tools contradicts them.'],
    ['“So one relational database with a replica holds the data for years, and a cache keeps redirects fast and absorbs viral spikes — here’s the shape I’d start with.”', 'Right. Every number ends in a decision, and the bridge sentence moves you into the design.'],
  ]),
  step('Minute 5. Your functional list is “shorten a URL, redirect”. What sentence must you add?', [], 0, [
    ['“Out of scope: custom aliases, analytics, link expiry — tell me if you want any of them.”', 'Right. The out-of-scope sentence buys depth later and is scored as maturity. It also lets the interviewer add one back before you have built around its absence.'],
    ['“And anything else the product might need later.”', 'Unbounded scope is the opposite of a requirement. You cannot finish a design for “anything”.'],
    ['Nothing; two items are enough', 'Two items are fine. Not saying what you left out is a silent skip.'],
  ]),
  step('The interviewer says: “Let’s assume the database can handle the load.” What does that mean?', [], 2, [
    ['They want you to prove it can, with numbers', 'They just told you not to. Proving it anyway spends minutes they have taken off the table.'],
    ['It is a trick; you should add sharding to be safe', 'Ignoring an explicit assumption from the interviewer looks like not listening.'],
    ['Move on — they want your time spent somewhere else', 'Right. “Assume X is solved” is a steer. Thank them, note it on the board, and go where they are pointing.'],
  ]),
];
