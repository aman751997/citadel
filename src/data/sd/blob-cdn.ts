import { row, step } from '../../lib/trace.ts';

// Chapter 1 · The metadata/blob split
export const split = [
  step('Kestrel stores 20 million avatars of about 200 KB each inside the users table, next to about 1 KB of profile columns per user. Roughly what share of the table’s bytes are avatar bytes?', [], 2, [
    ['About half', 'The profile columns total 20M × 1 KB = 20 GB. The avatars total 20M × 200 KB = 4 TB. That is nowhere near half.'],
    ['About 90%', 'Closer, but do the division: 4 TB of avatars against 20 GB of everything else.'],
    ['About 99.5%', 'Right. 4 TB ÷ (4 TB + 20 GB) ≈ 99.5%. Backups, replica rebuilds and replication traffic are now almost entirely moving pictures, not data.'],
  ]),
  step('You move the bytes to object storage. Which pair of things belongs in the database row?', [], 1, [
    ['The bytes, base64-encoded, so one query returns everything', 'Base64 makes the bytes about a third bigger and keeps every problem you just moved away from.'],
    ['The object key, size, content type, hash, owner and a status — everything you query or check, never the bytes', 'Right. The database answers every question ("list my photos", "is this mine?"); the object store only ever serves bytes by exact key.'],
    ['Nothing — list the bucket to find a user’s photos', 'Object stores are not query engines. Listing a prefix is slow, paginated, and can’t filter by date, privacy or status.'],
  ]),
];

// Chapter 2 · The object model
export const objectModel = [
  step('A user edits one caption word inside a 4 MB document stored as one object. What does the object store let you do?', [], 0, [
    ['Write a whole new object (same key or a new one); there is no in-place byte edit', 'Right. Objects are written whole. Change one byte and you PUT the whole object again — which is why big mutable files get chunked (Chapter 7).'],
    ['Seek to the byte offset and overwrite it, like a file', 'That is a file system or block device. The classic object API replaces whole objects.'],
    ['Append the change to the end of the object', 'Standard object stores don’t append in place. (A few newer storage classes add append — treat it as a special case and check the docs.)'],
  ]),
  step('Your service PUTs a new object to S3, gets 200 OK, and immediately GETs the same key from another server. Since December 2020, what does S3 guarantee?', [], 1, [
    ['The GET may return 404 for a while — S3 is eventually consistent', 'That was the old rule for some cases. S3 has provided strong read-after-write consistency for object PUTs, overwrites, deletes and LISTs since December 2020.'],
    ['The GET returns the new object: strong read-after-write consistency', 'Right. For other vendors or self-hosted S3-compatible stores, check their documented model before relying on it.'],
    ['It depends on which availability zone serves the GET', 'S3’s consistency guarantee doesn’t depend on which zone answers. That is the point of the 2020 change.'],
  ]),
  step('Two clients PUT different bytes to the same key at nearly the same moment, with no conditional headers. What happens?', [], 2, [
    ['The second PUT fails with a conflict', 'Only if you asked for it with a conditional write. Plain PUTs don’t check what is there.'],
    ['The store merges the two versions', 'Object stores never merge bytes. An object is one opaque blob.'],
    ['Last writer wins; one upload silently replaces the other', 'Right. That is why the server should choose unique keys (a fresh id per upload) instead of letting clients write to shared names.'],
  ]),
];

// Chapter 3 · Durability versus availability
export const durability = [
  step('A store is "designed for 99.999999999% durability and 99.99% availability". Kestrel keeps 10 million objects in it. What does the 11 nines promise?', [], 1, [
    ['The store is reachable 99.999999999% of the time', 'That is availability, and it is the smaller number: 99.99%, about 53 minutes a year when requests may fail.'],
    ['On average, about one object lost every 10,000 years', 'Right. 10⁷ objects × 10⁻¹¹ annual loss rate = 10⁻⁴ objects a year, one per 10,000 years. Durability is about not losing bytes, not about answering requests.'],
    ['A deleted object can always be recovered', 'Durability faithfully keeps whatever you told it to keep — including your delete. Recovering from your own mistakes needs versioning or backups.'],
  ]),
  step('Your team runs its own blob store. Option A: three full replicas. Option B: Reed–Solomon (10, 4) — 10 data fragments plus 4 parity fragments. For 5.5 PB of photos, which is right?', [], 2, [
    ['A — it survives more failures', 'Three replicas survive the loss of 2 copies. RS(10, 4) survives the loss of any 4 of 14 fragments.'],
    ['B — and repairs are cheaper too', 'Repairs are more expensive with erasure coding: rebuilding one lost fragment reads 10 others. That is the price of the space saving.'],
    ['B for the bulk: 1.4× raw (≈ 7.7 PB) instead of 3× (≈ 16.4 PB), tolerating 4 losses — but repair reads 10 fragments, so small hot objects often stay replicated', 'Right. Erasure coding wins on space and fault tolerance; replication wins on repair cost and read latency for small, hot data.'],
  ]),
];

// Chapter 4 · Presigned URLs
export const presigned = [
  step('New Year’s midnight: 1,500 photo uploads a second, 2 MB each, over congested 2 Mbps phone uplinks, proxied through 27 app servers with 200 threads each. How many uploads are in flight?', [
    row('Little’s law', ['1,500 / s', '× 8 s each', '= ?', 'pool: 5,400']),
  ], 2, [
    ['About 1,500', 'That is the arrival rate, not the number in flight. Each upload holds its thread for its whole duration.'],
    ['About 5,400', 'That is the size of the thread pool, not the demand on it.'],
    ['12,000 — more than double the 5,400 threads in the fleet', 'Right. 2 MB = 16 Mb, ÷ 2 Mbps = 8 s per upload; 1,500 × 8 = 12,000. Every thread is waiting on a slow phone, and feed requests queue behind them.'],
  ]),
  step('Same night, presigned URLs instead: the app server authorises, inserts a pending row and signs a URL in about 5 ms. How many app threads do uploads hold now?', [], 0, [
    ['About 8 across the whole fleet', 'Right. 1,500 × 0.005 s = 7.5. The bytes go phone → object store; the app tier only does the 5 ms of thinking.'],
    ['Still about 12,000 — the bytes have to go somewhere', 'They do, but not through you. The object store holds the slow connections; it is built for exactly that.'],
    ['Zero — the client signs its own URL', 'The client must never hold your signing credentials. The server signs; the client only receives one narrow, short-lived URL.'],
  ]),
  step('Which rule for issuing a presigned upload URL is the security-critical one?', [], 1, [
    ['Let the client choose the object key so it matches the file name', 'Then a client can overwrite someone else’s object, or plant files at paths you serve. Never.'],
    ['The server picks the key, signs one method on one key, pins the content type, keeps the expiry short — and validates the bytes after upload', 'Right. A presigned URL is a bearer permission slip: anyone holding it can use it until it expires, so make it narrow and short-lived, and never trust what arrives.'],
    ['Make the URL valid for a week so slow uploads don’t fail', 'A long-lived bearer URL is a long-lived hole. Resumable multipart uploads (Chapter 6) handle slow links without long expiries.'],
  ]),
];

// Chapter 5 · Pending, active, deleted
export const lifecycleOfUpload = [
  step('An upload finished at 14:00, but the "object created" event never reached your service. It’s 16:00. What state is the photo in, and what fixes it?', [
    row('Timeline', ['13:59 row: pending', '14:00 PUT done', 'event lost', '16:00 still pending'], { 2: 'LOST' }, { tones: { 2: 'out' } }),
  ], 1, [
    ['Active — the bytes are in storage, so the photo exists', 'The database is the source of truth for what users see. With the row still pending, the photo is invisible.'],
    ['Stuck in pending; a sweeper finds pending rows older than a threshold, HEADs each key, and activates or cleans up', 'Right. Events are delivered at least once but can be late, duplicated or (through your own bugs) lost. A reconciliation job closes the loop either way.'],
    ['Corrupted — the upload must be redone', 'Nothing is corrupt. The bytes and the row simply disagree, and reconciliation repairs that.'],
  ]),
  step('A user deletes a photo. Which order of operations is safe?', [], 0, [
    ['Mark the row deleted (the photo disappears for users), then delete the object asynchronously; a sweeper removes any bytes left behind', 'Right. A failure in step two leaves invisible orphan bytes — a small cost a sweeper fixes — never a broken image.'],
    ['Delete the object first, then the row', 'If the row update fails, users get a row that points at nothing: a broken image in every feed that shows it.'],
    ['Delete both inside one database transaction', 'The object store is not in your database transaction. Two systems, no shared commit; you order the steps so every failure is harmless.'],
  ]),
];

// Chapter 6 · Multipart and resumable uploads
export const multipart = [
  step('A 2 GB video over a 10 Mbps link, sent as one PUT. The connection drops at 99%. How much work is lost?', [], 2, [
    ['About 6 seconds', 'That is what you lose with 8 MB parts. One PUT has no parts.'],
    ['Nothing — the store keeps the partial object', 'A single PUT is all or nothing. A dropped connection leaves no object at all.'],
    ['About 26 minutes — the whole 1,600 s upload restarts from zero', 'Right. 2,000 MB × 8 = 16,000 Mb ÷ 10 Mbps = 1,600 s; 99% of it (≈ 1,584 s) is thrown away.'],
  ]),
  step('Same video as a multipart upload with 8 MB parts. How many parts, and what is lost when one part fails?', [
    row('Parts', ['1', '2', '…', '249', '250'], { 3: 'FAILED' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'hot', 4: 'done' } }),
  ], 0, [
    ['250 parts; only the failed part (≈ 6.4 s at 10 Mbps) is retried', 'Right. 2,000 MB ÷ 8 MB = 250 parts. Each part is uploaded and acknowledged independently; resume by asking which parts already arrived.'],
    ['250 parts; the whole upload restarts', 'Multipart exists precisely so it doesn’t. Completed parts stay stored until you complete or abort the upload.'],
    ['2,000 parts; one part retried', 'Check the division: 2,000 MB ÷ 8 MB = 250.'],
  ]),
  step('Six months later the bill shows terabytes of storage that no photo or video row points to. What is the most likely cause?', [], 1, [
    ['The CDN copies objects back into the bucket', 'A pull CDN reads from the origin; it doesn’t write to it.'],
    ['Abandoned multipart uploads: their parts are stored (and billed) until the upload is completed or aborted', 'Right. Add a lifecycle rule that aborts incomplete multipart uploads after a few days, and a sweeper for pending rows.'],
    ['Erasure-coding parity fragments', 'Redundancy is inside the store and priced into its per-GB rate. It doesn’t appear as extra objects in your bucket.'],
  ]),
];

// Chapter 7 · Content-hash dedup
export const dedup = [
  step('Two users upload the same 500 MB file into a chunked, content-addressed store with 4 MB chunks. How much new storage does the second upload need?', [
    row('User A chunks', ['h1', 'h2', 'h3', '…', 'h125'], {}, { tones: { 0: 'done', 1: 'done', 2: 'done', 4: 'done' } }),
    row('User B chunks', ['h1', 'h2', 'h3', '…', 'h125'], {}, { tones: { 0: 'ghost', 1: 'ghost', 2: 'ghost', 4: 'ghost' } }),
  ], 1, [
    ['Another 500 MB — every user gets their own copy', 'Not with content addressing. Chunk identity is its hash; the same bytes have the same name.'],
    ['Almost none — all 125 chunk hashes already exist, so B’s file is a new list of references', 'Right. 500 MB ÷ 4 MB = 125 chunks, all already stored. Only the metadata (a manifest of hashes) is new. The object store would not have done this for you; your chunking layer did.'],
    ['250 MB — dedup saves half', 'Dedup is all-or-nothing per chunk: a chunk is either already stored or it isn’t. Here all 125 are.'],
  ]),
  step('A user inserts one byte at the very start of a 500 MB file. With fixed 4 MB chunks, how many chunks change?', [
    row('Before', ['[0–4)', '[4–8)', '[8–12)', '…'], {}, {}),
    row('After +1 byte', ['shifted', 'shifted', 'shifted', '…'], {}, { tones: { 0: 'hot', 1: 'hot', 2: 'hot', 3: 'hot' } }),
  ], 2, [
    ['One — only the first chunk', 'True for an edit that keeps the length the same. An insertion shifts every later byte across every fixed boundary.'],
    ['Two — the first and the last', 'The shift propagates through the whole file, not just the ends.'],
    ['All 125 — every boundary moves; content-defined chunking (boundaries chosen by a rolling hash of the content) would change only one or two', 'Right. Fixed chunks are fine for in-place edits; for insertions, cut boundaries where the content says so, and they move with the data.'],
  ]),
  step('Your sync client sends chunk hashes first, and the server replies "already have it" for chunks stored by anyone. What can an attacker do with that?', [], 0, [
    ['Learn whether anyone has a specific file, and — if "already have it" grants access — fetch other people’s chunks from a hash alone', 'Right. Cross-user, client-visible dedup is a side channel and, done naively, an access-control hole. Scope dedup per user, dedup server-side after a full upload, or require proof of possession.'],
    ['Nothing — SHA-256 can’t be reversed', 'The attacker doesn’t reverse anything. They hash a file they already suspect exists and watch the server’s answer.'],
    ['Corrupt other users’ files by uploading colliding chunks', 'Finding a SHA-256 collision is not practical. The real problems are the existence leak and trusting a hash as proof of possession.'],
  ]),
];

// Chapter 8 · Storage classes and lifecycle
export const tiers = [
  step('Kestrel Moments adds 15 TB of photos a day. Policy: Standard for 30 days, infrequent-access until one year, then an instant-retrieval archive tier. Relative prices ≈ 1 : ½ : ⅙. After three years, what is the monthly storage bill versus keeping everything in Standard?', [
    row('Tier (TB)', ['Std 450', 'IA 5,025', 'Archive 10,950'], {}, { tones: { 0: 'hot' } }),
  ], 1, [
    ['About the same — most data is recent', 'Most data is old. After three years, 10,950 of 16,425 TB is older than a year.'],
    ['About 29% of the all-Standard bill', 'Right. 450 × 1 + 5,025 × ½ + 10,950 × ⅙ ≈ 450 + 2,513 + 1,825 = 4,788 units, against 16,425 all-Standard: about 3.4× cheaper.'],
    ['About 6% — archive is a sixth of the price', 'Only two-thirds of the data is in archive, and the recent third costs more per GB.'],
  ]),
  step('Someone proposes moving 20 KB thumbnails to the infrequent-access class to halve their cost. The class bills every object as at least 128 KB. What happens?', [], 2, [
    ['Their cost halves', 'Only for objects of 128 KB or more. A 20 KB object is billed as 128 KB.'],
    ['No change — small objects are free', 'Small objects are billed by the class’s rules, and here those rules round them up.'],
    ['Their storage cost rises about 3.2×', 'Right. Billed size is 128 ÷ 20 = 6.4× the real size, at half the price: 6.4 × ½ = 3.2×. Plus per-object transition and retrieval fees. Keep small objects in Standard.'],
  ]),
];

// Chapter 9 · The CDN and the origin
export const offload = [
  step('Moments serves 30 GB/s of images at peak. The CDN hit ratio improves from 95% to 99%. What happens to origin egress?', [], 1, [
    ['It drops by 4%', 'The hit ratio rose 4 points; the miss ratio fell from 5% to 1%.'],
    ['It drops 5×, from 1.5 GB/s to 0.3 GB/s', 'Right. Origin = (1 − h) × total: 0.05 × 30 = 1.5 GB/s, 0.01 × 30 = 0.3 GB/s. The origin feels misses, not hits.'],
    ['It doesn’t change — the CDN still fetches every object', 'The CDN fetches each object once per cache lifetime, per location. Hits never reach the origin.'],
  ]),
  step('In 1,000 requests, 990 are 20 KB thumbnail hits and 10 are 4 MB video-segment misses. The request hit ratio is 99%. What is the byte hit ratio?', [
    row('Requests', ['990 hits × 20 KB', '10 misses × 4 MB'], {}, { tones: { 0: 'done', 1: 'hot' } }),
  ], 0, [
    ['About 33%', 'Right. Hit bytes 990 × 20 KB = 19.8 MB; miss bytes 10 × 4 MB = 40 MB; 19.8 ÷ 59.8 ≈ 33%. Origin bandwidth follows the byte hit ratio.'],
    ['99%, the same as the request hit ratio', 'Requests and bytes are different currencies. A few big misses can carry most of the bytes.'],
    ['About 67%', 'That is the byte MISS ratio: 40 MB of the 59.8 MB came from the origin.'],
  ]),
];

// Chapter 10 · Cache keys
export const cacheKeys = [
  step('These three requests return the same resized image. With the default cache key (host + path + full query string), how many cache entries do they create?', [
    row('URLs', ['?w=400&h=300', '?h=300&w=400', '?w=400&h=300&utm_source=mail']),
  ], 2, [
    ['One — it is the same image', 'The CDN can’t know that. It compares keys as strings.'],
    ['Two — parameter order doesn’t matter', 'By default it does: the query strings are different strings.'],
    ['Three — and each one misses separately', 'Right. Normalise the key: sort parameters, keep only the ones that change the response (w, h), drop tracking parameters. Then all three share one entry.'],
  ]),
  step('An origin starts sending `Vary: User-Agent` on images. What happens to the CDN hit ratio, and why?', [], 1, [
    ['Nothing — Vary only affects browsers', 'Shared caches honour Vary too: it adds the named request header to the cache key.'],
    ['It collapses — thousands of distinct User-Agent strings each get their own copy of every image', 'Right. Vary on a high-cardinality header shards the cache into near-empty slices. Vary on Accept-Encoding is fine; for formats, normalise into a few buckets (Chapter 16).'],
    ['It improves — each device gets a better-matched copy', 'Better-matched, perhaps, but each copy is fetched from the origin separately. Hit ratio falls with every distinct value.'],
  ]),
];

// Chapter 11 · TTLs and Cache-Control
export const headers = [
  step('After a deploy, users keep running yesterday’s JavaScript. The file is served as `/app.js` with a one-day max-age. What is the lasting fix?', [], 2, [
    ['Purge the CDN on every deploy', 'That clears the CDN, not the browsers that already cached app.js for a day — and you will forget a purge one day.'],
    ['Drop the TTL to 60 seconds on all assets', 'Every user revalidates every minute: most of the CDN’s value gone, and still up to a minute of mixed versions.'],
    ['Fingerprint the file name (app.9f3ab2.js) with `max-age=31536000, immutable`, and give the HTML a short TTL or `no-cache`', 'Right. A deploy publishes new URLs; nothing old needs invalidating. The HTML is the one file that must stay fresh, because it names the fingerprints.'],
  ]),
  step('A response says `Cache-Control: public, max-age=60, s-maxage=86400`. How long may the CDN and the browser each keep it fresh?', [], 0, [
    ['CDN 1 day, browser 60 seconds', 'Right. `s-maxage` applies only to shared caches (CDNs, proxies) and overrides `max-age` there; browsers use `max-age`. Long at the edge, where you can purge; short in browsers, where you can’t.'],
    ['Both 60 seconds', '`s-maxage` exists precisely to give shared caches a different lifetime.'],
    ['Both 1 day', 'Browsers ignore `s-maxage`; it is for shared caches only.'],
  ]),
  step('Which header lets a cache store a response but forces it to check with the origin before every reuse?', [], 1, [
    ['`no-store`', '`no-store` forbids storing it at all. That is for sensitive responses.'],
    ['`no-cache`', 'Right — despite the name. `no-cache` means "store it, but revalidate every time", usually a cheap conditional request answered with 304 Not Modified.'],
    ['`private`', '`private` means a shared cache (the CDN) must not store it; the browser may.'],
  ]),
];

// Chapter 12 · Purge
export const purge = [
  step('A user reports a photo that must come down now. You delete the row and purge the CDN. Who might still see it?', [], 2, [
    ['Nobody — purge clears every copy', 'A CDN purge clears the CDN. It can’t reach copies already sitting in browsers and apps.'],
    ['Only users on the PoPs the purge hasn’t reached yet, forever', 'Purges propagate; depending on the CDN that takes from under a second to minutes. "Forever" is wrong.'],
    ['Anyone whose browser or app already cached it, until their max-age runs out — so private or takedown-prone content gets short browser TTLs or signed, expiring URLs', 'Right. Purge is a CDN operation. The browser cache is out of your reach, so its TTL is a decision you make up front.'],
  ]),
  step('You purge a hot image from 200 PoPs at once, with no origin shield. What does the origin see next?', [], 0, [
    ['A burst of up to 200 near-simultaneous fetches — more if PoPs don’t collapse concurrent misses', 'Right. A purge is a mass expiry: the CDN-sized version of a cache stampede. Origin shields and request collapsing exist for this.'],
    ['One fetch — the CDN coordinates refills', 'Only with tiered caching (an origin shield). Without it, each PoP refills independently.'],
    ['Nothing until the TTL expires', 'The purge removed the copies; the next request at each PoP is a miss right away.'],
  ]),
];

// Chapter 13 · Origin shield and hot objects
export const shield = [
  step('A photo goes viral: 50,000 requests a second worldwide, spread over 200 PoPs. With request collapsing at each PoP and one origin shield, how many origin fetches does the first wave cause?', [
    row('Path', ['200 PoPs', '→ 1 shield', '→ origin']),
  ], 1, [
    ['About 50,000', 'That is what the origin would see with no CDN at all.'],
    ['About one', 'Right. Concurrent misses at a PoP wait on one fetch to the shield; the shield’s concurrent misses wait on one fetch to the origin.'],
    ['About 200 — one per PoP', 'That is the answer without a shield. The shield turns 200 PoP misses into one origin request.'],
  ]),
  step('Why not just let phones fetch that viral photo straight from the object store?', [], 2, [
    ['Object stores can’t serve HTTP GETs', 'They can; presigned GETs are plain HTTPS. The problem is load and distance.'],
    ['It would be cheaper', 'Usually the opposite: you pay object-store egress and per-request fees on every view.'],
    ['One key sits in one partition of the store, with a per-prefix request budget (S3 documents at least 5,500 GETs a second per prefix) — 50,000/s can be throttled, and every viewer pays the full distance', 'Right. A CDN turns a hot key into one fetch per shield per TTL, and serves it from a city away instead of an ocean away.'],
  ]),
];

// Chapter 14 · Private content at the edge
export const privateContent = [
  step('Paid course videos sit behind the CDN with signed URLs — but the bucket still allows public reads. What is wrong?', [], 1, [
    ['Nothing — the CDN checks every signature', 'It checks the requests that come through it. Anyone who learns the bucket URL can skip the CDN entirely.'],
    ['The origin must accept requests only from the CDN; otherwise the signature check is a door in a wall with no wall', 'Right. Lock the bucket (for example CloudFront origin access control) so the only way to the bytes is through the edge that checks signatures.'],
    ['Signed URLs don’t work with video', 'They do. For streaming many segments, signed cookies are simply more convenient.'],
  ]),
  step('A 2-hour HLS course video is cut into 6-second segments. Why prefer a signed cookie over signing each segment URL?', [], 0, [
    ['1,200 segments per rendition would each need a signed URL baked into a per-user playlist; one cookie scoped to the video’s path covers them all', 'Right. 7,200 s ÷ 6 s = 1,200 segments. A cookie signed for /courses/42/* travels with every segment request; playlists stay shared and cacheable.'],
    ['Cookies are more secure than URLs', 'Both carry a signature with an expiry. The difference is how many things you have to sign.'],
    ['CDNs can’t cache requests that carry signed URLs', 'They can, as long as the signature parameters are kept out of the cache key. Otherwise every user’s unique signature is a separate entry.'],
  ]),
];

// Chapter 15 · Range requests and video segments
export const video = [
  step('A viewer seeks to 41:10 in an HLS video with 6-second segments. Which segment does the player fetch first (numbering from 0)?', [
    row('Segments', ['409', '410', '411', '412'], { 2: '2466–2472 s' }, { tones: { 2: 'hot' } }),
  ], 2, [
    ['409', 'Segment 409 covers 2,454–2,460 s. 41:10 is 2,470 s.'],
    ['412', 'Segment 412 starts at 2,472 s — two seconds after the seek point.'],
    ['411', 'Right. 41:10 = 2,470 s; ⌊2,470 ÷ 6⌋ = 411, which covers 2,466–2,472 s. The player reads the playlist, fetches that one small file, and starts.'],
  ]),
  step('The player’s measured bandwidth drops from 8 Mbps to 2 Mbps mid-video. What does adaptive bitrate streaming do?', [], 1, [
    ['The server re-encodes the rest of the video at a lower bitrate', 'Nothing is encoded on the fly. Every rendition was transcoded ahead of time.'],
    ['From the next segment on, the player requests a lower-bitrate rendition listed in the manifest', 'Right. Segments from every rendition are aligned in time, so the player can switch at any segment boundary. The CDN just serves small, immutable files.'],
    ['The CDN compresses the segments harder', 'Video is already compressed. The bitrate choice was made at transcode time.'],
  ]),
];

// Chapter 16 · Image transformation at the edge
export const images = [
  step('Your edge resizer accepts any width: `/img/abc.jpg?w=N`. Why is that dangerous?', [], 0, [
    ['Anyone can request w=1 … w=4000: thousands of uncached variants, each costing a resize and an origin fetch', 'Right. An unbounded parameter is an unbounded cache key and an unbounded CPU bill. Snap requests to a small allow-list of widths.'],
    ['Resizing at the edge loses image quality', 'Resizing from the original is how every rendition is made. Quality isn’t the issue; cardinality is.'],
    ['Edges can’t run code', 'Many CDNs offer image transformation or edge compute. The question is what you let callers ask for.'],
  ]),
  step('You serve AVIF, WebP or JPEG depending on the browser’s Accept header, at 4 allowed widths. What should the cache key contain?', [], 1, [
    ['The raw Accept header (Vary: Accept)', 'Accept strings differ across browsers and versions; you’d store many identical copies. Normalise first.'],
    ['The width and a normalised format bucket (avif, webp or jpeg): at most 4 × 3 = 12 variants per image', 'Right. The edge maps Accept to one of three formats and puts that, not the raw header, in the key.'],
    ['Only the path — the edge converts on every request', 'Then every request pays a conversion, and the CDN caches nothing useful.'],
  ]),
];

// Chapter 17 · Worked numbers
export const sweep = [
  step('Kestrel Snippets (a pastebin): 1 million pastes a day, 10 KB average, read 10 times each. What is peak read egress at a 3× peak factor?', [
    row('Chain', ['10M reads/day', '× 10 KB', '÷ 10⁵ s', '× 3']),
  ], 0, [
    ['About 3 MB/s (≈ 24 Mbps) — bandwidth is not why a pastebin needs blob storage', 'Right. 10M × 10 KB = 100 GB/day ÷ 10⁵ ≈ 1 MB/s average, 3 MB/s peak. The split is justified by the size tail (pastes up to 10 MB), a lean database and cacheable reads — not by bandwidth.'],
    ['About 3 GB/s — CDN territory', 'Check the units: 100 GB a day is about 1 MB a second, not 1 GB.'],
    ['About 30 MB/s', 'Off by 10×. 10M reads × 10 KB = 100 GB/day; ÷ 10⁵ s = 1 MB/s; × 3 = 3 MB/s.'],
  ]),
  step('Snippets keeps pastes for one year. Logical storage per year, and raw storage if you ran your own store with three replicas?', [], 2, [
    ['365 GB logical, 1.1 TB raw', '1M × 10 KB is 10 GB a day, not 1 GB.'],
    ['36.5 TB logical, 110 TB raw', 'That is ten times too much. 10 GB/day × 365 = 3.65 TB.'],
    ['3.65 TB logical, about 11 TB raw — a managed object store bills the logical bytes and handles redundancy itself', 'Right. 1M × 10 KB = 10 GB/day × 365 = 3.65 TB; × 3 = 10.95 TB raw if the replicas are yours to pay for.'],
  ]),
];

// Decision drills · mixed review (folds in the old checkpoint questions)
export const drills = [
  step('Interviewer: "Walk me through a user uploading a 50 MB video." Which is the strong shape?', [], 1, [
    ['Client POSTs the file to our API; the API streams it to object storage', 'Every byte crosses your app tier twice and pins a thread for the whole slow upload. At scale this is the night the app servers melted.'],
    ['Client asks our API, gets presigned multipart URLs, uploads parts directly to object storage in parallel; the completion event (plus a sweeper) flips the metadata row from pending to active', 'Right. Bytes bypass your servers, parts give resumability, and pending → active closes the loop.'],
    ['Client uploads to the CDN, which forwards to S3', 'CDNs are built to serve reads. Some offer upload acceleration, but the core design is still a presigned upload to the store.'],
    ['Client uploads to the nearest app server, which chunks it server-side', 'Still proxying bytes. Chunk on the client, where the slow link is.'],
  ]),
  step('Two users upload the same 500 MB file to your Dropbox-style design. How much does it store, and how does it know?', [], 1, [
    ['1 GB — separate users, separate storage', 'Correct for a design without dedup, but a content-addressed design stores each distinct chunk once.'],
    ['About 500 MB — chunks are content-hashed, so the second upload’s hashes all match stored chunks and only references are created', 'Right. And remember the cost: if the client can see "already have it", cross-user dedup leaks whether a file exists. Many designs dedup per user, or server-side after a full upload.'],
    ['About 500 MB — S3 deduplicates identical objects automatically', 'S3 does not dedup for you. Two PUTs of the same bytes are two billed objects. Dedup is your chunking layer’s job.'],
    ['1 GB — dedup across users is always forbidden', 'It isn’t forbidden; it has a privacy cost you must design around (per-user scope, server-side dedup, proof of possession).'],
  ]),
  step('You deployed new JS, but users still get the old version from the CDN. What prevents this for good?', [], 2, [
    ['Purge the CDN cache on every deploy', 'Purges are per-CDN, take time to propagate, and don’t touch browser caches. They fix today, not tomorrow.'],
    ['Set a 60-second TTL on all assets', 'Short TTLs throw away most of the CDN’s value and still serve mixed versions for up to a minute.'],
    ['Content-hashed file names (app.9f3ab2.js) with long, immutable TTLs — a deploy publishes new URLs, so nothing ever needs invalidating', 'Right. Design the invalidation problem out of existence; keep only the HTML short-lived.'],
    ['Serve JS from the origin and use the CDN only for images', 'You lose the CDN for exactly the files every page needs first.'],
  ]),
  step('Why not store user photos in the main database as BLOB columns?', [], 0, [
    ['Bytes swamp backups, replication and replica rebuilds, cost several times more per GB on replicated SSD, and can’t be served by a CDN without going through your app', 'Right. Keep a metadata row (key, size, hash, owner, status) in the database and the bytes in object storage.'],
    ['Databases can’t store binary data', 'They can (BYTEA, BLOB). They just aren’t the right place for terabytes of it.'],
    ['Because blobs make every query slower', 'Not every query — Postgres, for instance, stores large values out of line. The damage is to backups, replication, cost and serving.'],
  ]),
  step('Your bucket says "11 nines durability". Can a user’s photo still be lost?', [], 2, [
    ['No — 11 nines means effectively never', 'The store won’t lose it by itself. Your code can still delete or overwrite it, and that is durably recorded too.'],
    ['Only if a whole region burns down', 'A region-wide disaster is one risk; a bad deploy that deletes the wrong prefix is a far more common one.'],
    ['Yes — by your own bugs or a bad delete; versioning, object lock or a copy in another account protects against that, not durability', 'Right. Durability protects against hardware loss. Backups and versioning protect against you.'],
  ]),
  step('A viral photo is about to be shared by a celebrity. What protects the origin?', [], 1, [
    ['A bigger object-store bucket', 'Buckets don’t have sizes to raise. One key still lives in one partition.'],
    ['Long TTLs on an immutable URL, request collapsing at each PoP, and an origin shield in front of the store', 'Right. Each layer turns many concurrent misses into one fetch upstream.'],
    ['A short TTL so updates propagate', 'The photo is immutable; a short TTL only multiplies refetches at the worst possible moment.'],
  ]),
  step('Which object in a video stream should get a SHORT edge TTL?', [], 0, [
    ['A live stream’s playlist, which gains a new segment every few seconds', 'Right. Live playlists change every segment duration; segments themselves never change once written, so they get long TTLs.'],
    ['A 6-second media segment', 'A segment’s bytes never change once written. Cache it for a long time.'],
    ['A VOD playlist for a finished movie', 'A finished movie’s playlist doesn’t change. It can be cached for a long time.'],
  ]),
];
