import { row, step } from '../../lib/trace.ts';

export const ladder = [
  step('Two laptops edited the same 40 MB Photoshop file on a plane. Both land and sync. Which rung of the ladder?', [], 0, [
    ['Detect and punt: keep both, one named "conflicted copy"', 'Right. The file is opaque bytes. No merge function exists that a designer would trust, so the honest answer is to keep both and let a human choose.'],
    ['Last-writer-wins by upload time', 'Whichever laptop got wifi first loses an afternoon of work, silently. Nobody decided that; the network did.'],
    ['Operational transformation', 'OT needs operations with known meaning (insert at 5). A binary file save is one big "replace everything" — there is nothing to transform.'],
  ]),
  step('Two phones change the same user’s "dark mode" toggle while offline. Which rung?', [], 1, [
    ['Keep both as conflicted copies', 'Asking a person to choose between two copies of a boolean is pure friction. The value has no history worth keeping.'],
    ['Last-writer-wins, and say why losing the older write is the right product behaviour', 'Right. The newest toggle genuinely supersedes the older one. LWW is honest here because nothing of value is lost.'],
    ['A sequence CRDT', 'There is no sequence. A single register needs a register rule, and "newest wins" is the one users expect.'],
  ]),
  step('Ten people type into the same paragraph at once. Which rung?', [], 2, [
    ['Detect and punt', 'Conflicts happen several times a second. Ten conflicted copies a minute is not a document any more.'],
    ['Last-writer-wins on the whole document', 'Every save would erase the keystrokes the other nine made since their last refresh.'],
    ['Merge automatically: OT through a server, or a sequence CRDT', 'Right. Text edits have meaning (insert here, delete there), so they can be merged without asking anyone.'],
  ]),
];

export const lww = [
  step('Laptop A writes "v1" at 10:00:05 by its clock. Laptop B writes "v2" at 10:00:03 by its clock — but B’s clock runs 4 seconds slow, so B actually wrote after A. LWW by timestamp keeps which value?', [
    row('Real order', ['A writes v1', 'B writes v2'], { 1: 'LATER' }, { tones: { 1: 'hot' } }),
    row('Stamped time', ['10:00:05', '10:00:03']),
  ], 0, [
    ['v1, the write that really happened first', 'Right. The timestamps say A is "last", so LWW keeps v1 and silently drops the newer v2. Clock skew chose the winner.'],
    ['v2, because it happened later', 'It did happen later — but LWW compares the stamped times, not reality. 10:00:05 beats 10:00:03.'],
    ['Both, as siblings', 'That is what a version-vector store might do. LWW by definition keeps exactly one.'],
  ]),
  step('Which of these is an honest use of last-writer-wins?', [], 2, [
    ['A shared shopping cart', 'Two people adding items concurrently would each erase the other’s item. A cart is a set: merge it.'],
    ['A like counter', 'Two concurrent +1s become one +1. Counters need per-replica counts or a single increment path.'],
    ['A user’s current cursor position in a document', 'Right. Only the newest position matters; an older one is worthless the moment a newer one exists.'],
  ]),
];

export const chunking = [
  step('A 200 MB file is stored as 4 MB fixed-size chunks. The user inserts one byte at the very start. How many chunks must be uploaded?', [
    row('Chunks', ['0–4 MB', '4–8 MB', '…', '196–200 MB'], { 0: '+1 byte' }, { tones: { 0: 'hot' } }),
  ], 2, [
    ['One — only the first chunk changed', 'Every byte after the insertion moved one position right, so every fixed window now holds different bytes.'],
    ['Two — the first chunk and a new tail', 'The tail is new, but so is every chunk in between: each boundary still sits at a multiple of 4 MB while the content slid.'],
    ['All of them, about 200 MB', 'Right. Fixed boundaries do not move with the content, so one inserted byte shifts every chunk after it.'],
  ]),
  step('Same edit, but chunks end wherever a rolling hash of the last 64 bytes matches a pattern (average 4 MB). How many chunks change?', [], 1, [
    ['All of them', 'Boundaries are decided by nearby content. After the first boundary past the edit, the content — and so every later boundary — is exactly where it was.'],
    ['Usually one, occasionally two', 'Right. Only the chunk holding the edit changes (two if the edit sat near a boundary). About 4–8 MB instead of 200 MB.'],
    ['None — the hash ignores insertions', 'The chunk that contains the inserted byte has different bytes, so a different hash. It must be uploaded.'],
  ]),
];

export const commit = [
  step('A client wants to save a new version made of chunk hashes h1, h2, h7. The server already stores h1 and h2. What is the right order of calls?', [], 1, [
    ['Commit the new file version first, then upload h7', 'For a moment the metadata points at a chunk that does not exist. Another device syncing in that gap downloads a broken file.'],
    ['Ask which hashes are missing, upload h7, then commit the version', 'Right. Chunks first, metadata last: the commit is the moment the version becomes visible, and by then every chunk it names exists.'],
    ['Upload all three chunks, then commit', 'Correct but wasteful: h1 and h2 are already stored. Asking first is the whole point of content addressing.'],
  ]),
  step('The commit request times out. The client is not sure whether it landed. What makes a retry safe?', [], 0, [
    ['The commit carries the parent version and a client-generated commit id, so a duplicate is recognised or rejected as stale', 'Right. "Set file to [h1, h2, h7] if it is still at version 7, commit id c-91" is safe to repeat: the retry finds version 8 was made by c-91 and returns success instead of a conflict.'],
    ['Retry blindly; duplicates are harmless', 'A blind retry after someone else committed version 8 would overwrite their change with yours.'],
    ['Re-upload every chunk before retrying', 'The chunks are content-addressed and already there. The question is about the metadata commit.'],
  ]),
];

export const protocol = [
  step('A device has been offline for three days. When it reconnects, how does it find out what changed?', [], 2, [
    ['Download the full file list and compare', 'For 4,000 files that is wasteful; for a team folder with millions of entries it is a disaster on every reconnect.'],
    ['Ask for files modified after its last-seen timestamp', 'Clocks skew and two changes can share a millisecond. A timestamp cursor drops or repeats changes at the edges.'],
    ['Send its cursor — the last journal position it applied — and receive every entry after it', 'Right. The namespace journal has a monotonic position; "give me everything after 41,212" is exact, cheap and resumable.'],
  ]),
  step('Devices need to learn about changes within seconds, but most of the time nothing changes. What does the client do between changes?', [], 1, [
    ['Poll the list endpoint every second', 'Ten million devices polling every second is ten million mostly empty requests per second.'],
    ['Hold a long-poll (or socket) that only says "something changed", then fetch with its cursor', 'Right. The notification carries no data; the cursor fetch is the source of truth. A lost notification only delays sync until the next one or a periodic check.'],
    ['Have the server push full file contents to every device', 'Devices may be offline, slow, or not interested in every file. Push a hint, let the device pull what it needs.'],
  ]),
];

export const conflicts = [
  step('The server holds report.docx at version 8. Laptop A uploads an edit whose parent is version 8. Laptop B then uploads an edit whose parent is also version 8. What happens to B’s upload?', [
    row('Server', ['v7', 'v8', 'v9 (A)'], { 2: 'NOW' }, { tones: { 2: 'done' } }),
    row('B says parent', ['v8']),
  ], 1, [
    ['It becomes version 10 and replaces A’s edit', 'That is last-writer-wins. A’s work vanishes without anyone seeing a conflict.'],
    ['Rejected as stale; B keeps its edit as "report (B’s conflicted copy).docx" and downloads v9', 'Right. Parent 8 ≠ current 9 means B edited without seeing A’s change. Both versions survive; a human decides.'],
    ['The server merges the two .docx files', 'A .docx is a zip of XML. A byte-level merge produces a corrupt file at best.'],
  ]),
  step('Kestrel Drive has a central server that orders every commit. Does each file need a full version vector?', [], 0, [
    ['No — one server-assigned version per file is enough, because every commit passes through one ordering point', 'Right. "Parent = current?" detects every concurrent edit. Version vectors earn their keep when replicas sync peer-to-peer with no single authority.'],
    ['Yes — without a vector, concurrent edits go undetected', 'With a single authority, a counter and a parent check detect them all. The vector is per-replica history you only need without that authority.'],
    ['Neither — timestamps are enough', 'Timestamps cannot tell "edited after seeing v8" from "edited while v8 was being written".'],
  ]),
];

export const deletes = [
  step('Laptop A deletes notes.txt. Laptop B, offline, still has notes.txt and has not touched it. B reconnects. Without tombstones, what happens?', [], 2, [
    ['B deletes its copy', 'B has no way to know. The server simply has no entry for the file, which looks exactly like "never existed here".'],
    ['Nothing — both are consistent', 'B still has the file locally and the server does not. They are not consistent.'],
    ['B sees a local file the server lacks and re-uploads it: the deleted file comes back', 'Right. Deletion must be a recorded event — a tombstone in the journal — so B learns "deleted at position 41,300" and removes its copy.'],
  ]),
  step('A deletes a file while B, offline, edits it. Both sync. Which outcome loses nothing?', [], 1, [
    ['The delete wins: it is newer', 'B’s edits are thrown away. Deletes are cheap to redo; edits are not.'],
    ['Keep B’s edited file (restored, or as a conflicted copy) and tell the user', 'Right. Edit beats delete is the usual safe rule: the worst case is a file someone has to delete twice.'],
    ['Keep both the tombstone and the file, invisible', 'A file nobody can see is lost data with extra steps.'],
  ]),
];

export const ot = [
  step('The document is "cat". Alice inserts "s" at position 3; Bob, at the same moment, inserts "b" at position 0. The server applies Bob’s op first. What must Alice’s op become?', [
    row('Doc', ['c', 'a', 't']),
    row('After Bob', ['b', 'c', 'a', 't'], { 0: 'NEW' }, { tones: { 0: 'hot' } }),
  ], 1, [
    ['insert("s", 3) — unchanged', 'Applied to "bcat" that gives "bcast". The s lands inside the word because Bob’s b pushed everything right.'],
    ['insert("s", 4)', 'Right. Bob’s insert was before position 3, so Alice’s target shifts right by one: "bcats".'],
    ['insert("s", 2)', 'Insertions before your position push you right, not left.'],
  ]),
  step('Both users delete the "a" in "cat" (position 1) at the same moment. The server applies Alice’s delete first. What does Bob’s delete become?', [], 2, [
    ['delete(1) — unchanged', 'After Alice’s delete the doc is "ct"; deleting position 1 again would remove the t. Two people deleted one character, not two.'],
    ['delete(0)', 'That would delete the c, which nobody asked for.'],
    ['A no-op', 'Right. The character Bob wanted gone is already gone. Transforming a delete against a delete of the same position yields nothing.'],
  ]),
  step('Alice and Bob both insert at position 3 of "cat": Alice "!", Bob "?". Without a tie-break, each shifts the other right. What do their screens show?', [], 0, [
    ['Alice "cat!?", Bob "cat?!" — they diverge forever', 'Right. A tie needs one deterministic rule both sides agree on, such as "the lower site id goes first". With it, both show "cat!?".'],
    ['Both "cat!?"', 'Only with a tie-break. With "both shift right", Alice sees ! then ?, and Bob sees ? then !.'],
    ['One insert is lost', 'Nothing is lost; both characters appear. The bug is that they appear in different orders on different screens.'],
  ]),
];

export const sequencer = [
  step('Why does Google-Docs-style OT route every op for a document through one server?', [], 1, [
    ['Because the server stores the document', 'Storage could live anywhere. The reason is about ordering, not storage.'],
    ['So there is one agreed order: each op is transformed only against the ops ordered before it', 'Right. With one sequencer, transforms only need the simple two-op property. Without one, every pair of replicas must agree on every interleaving — much harder transform rules that many published algorithms got wrong.'],
    ['To check permissions', 'Permissions are checked at the edge. One server per document is about the order of edits.'],
  ]),
  step('Kestrel Docs has one million open documents. Is "one sequencer per document" a scaling bottleneck?', [], 2, [
    ['Yes — all ops go through one machine', 'They go through one machine per document, not one machine overall. Different documents sit on different servers.'],
    ['Yes — so switch to CRDTs', 'CRDTs have their own reasons. Scale is not one of them here: the busiest document still sees only a few hundred ops per second.'],
    ['No — load is per document and small; shard documents across session servers by doc id', 'Right. A doc with 50 typists makes about 250 ops/s. One in-memory sequencer handles that easily; a million docs spread over about 100 servers.'],
  ]),
];

export const crdt = [
  step('In a sequence CRDT, Alice types "s" after the "t" in "cat" and Bob types "b" at the start. Neither op mentions a numeric position. What does each op carry instead?', [], 0, [
    ['A unique id for the new character and the id of the character it goes after', 'Right. "Put s (id 4@alice) after t (id 3@alice)". Ids never shift, so nothing needs transforming.'],
    ['A position plus a timestamp', 'Positions shift under concurrent edits; that is OT’s problem. A CRDT avoids positions entirely.'],
    ['The whole new document', 'That is state transfer with last-writer-wins. Concurrent edits would erase each other.'],
  ]),
  step('A CRDT document has had 100,000 characters typed and 60,000 deleted. How many elements does a simple RGA still store?', [
    row('Typed', ['100,000']),
    row('Deleted', ['60,000']),
  ], 2, [
    ['40,000 — the visible text', 'Deleted characters must stay as tombstones: another replica might still send "insert after" one of them.'],
    ['60,000', 'That is just the tombstones. The visible characters are stored too.'],
    ['100,000 — 40,000 visible plus 60,000 tombstones', 'Right. Tombstones can be collected only once every replica has seen the delete, which offline-first apps can rarely promise.'],
  ]),
];

export const choose = [
  step('Kestrel’s notes app must work fully offline for days, sync between a phone and a laptop with no server in between, and merge cleanly. OT or CRDT?', [], 1, [
    ['OT with a central sequencer', 'There is no reliable central point here, and OT’s simple form assumes one.'],
    ['A CRDT', 'Right. Any replica can merge any other’s ops in any order and converge. Offline-first and peer-to-peer are where CRDTs shine.'],
    ['Last-writer-wins on the whole note', 'Two days of edits on two devices: one device’s days vanish.'],
  ]),
  step('Kestrel Docs is always online, already has a server per document, and needs version history and access checks on every edit. What is the strongest default?', [], 0, [
    ['OT through the per-document server, which also writes the op log', 'Right. The server you need anyway becomes the sequencer, and its log is your history. A CRDT would also work; it buys offline merging you mostly don’t need, and costs metadata.'],
    ['Peer-to-peer CRDT with no server', 'You would still need a server for permissions, history and persistence — so you have paid for both.'],
    ['Lock each paragraph while someone types', 'Locks make two people in one paragraph wait on each other, and a dropped connection leaves a paragraph locked.'],
  ]),
];

export const presence = [
  step('A document has 50 editors. Each cursor update goes to the other 49. Cursors send 10 updates per second. How many messages per second does the server send for this one document?', [], 2, [
    ['500', 'That is updates received. Each one is forwarded to 49 people.'],
    ['2,450', 'That would be one update per second each. At 10 per second it is ten times more.'],
    ['24,500', 'Right: 50 × 10 × 49. Throttle to 2/s and you get 4,900; batch everything into one frame per recipient every 100 ms and it is 50 × 10 = 500 frames.'],
  ]),
  step('Where should cursor positions be stored?', [], 1, [
    ['In the op log, with the edits', 'Cursor moves are 10× more frequent than edits and worthless a second later. Logging them bloats history for nothing.'],
    ['In memory on the session server, sent over the same socket, never persisted', 'Right. Presence is ephemeral, newest-wins state. If the server dies, clients re-announce cursors on reconnect.'],
    ['In the database, one row per user', 'Thousands of writes per second per hot document for data nobody will ever read back.'],
  ]),
];

export const history = [
  step('A document has 100,000 ops in its log, about 50 bytes each. Opening it by replaying the log means reading how much, and how do you avoid that?', [], 1, [
    ['50 KB; nothing to fix', '100,000 × 50 B is 5 MB, and each op must be applied in order. That is slow to open and grows forever.'],
    ['5 MB; snapshot every 1,000 ops and replay only the ops after the snapshot', 'Right. Open = latest snapshot (about the size of the doc) + at most 1,000 ops (about 50 KB).'],
    ['5 MB; delete the old ops', 'Old ops are your version history and your audit trail. Snapshot, then archive or compact old ops; do not just drop them.'],
  ]),
  step('Alice presses Undo. Bob typed in another paragraph after Alice’s last edit. What should Undo do?', [], 2, [
    ['Revert the document to the state before Alice’s edit', 'That also deletes Bob’s later typing. In a shared document, Undo must not undo other people.'],
    ['Undo Bob’s edit, since it was the last one', 'Users expect Undo to reverse their own actions, not whoever typed last.'],
    ['Apply the inverse of Alice’s last op, transformed past everything that happened since', 'Right. Undo becomes a new op ("delete what I inserted") sent like any other edit. Getting this exactly right in all cases is subtle; real editors track per-user undo stacks.'],
  ]),
];

export const drills = [
  step('Two devices edited the same spreadsheet FILE offline (opaque bytes). Correct handling?', [], 2, [
    ['Merge the binary diffs automatically', 'Byte-level merges of a structured file produce corruption, not a merge.'],
    ['Last-writer-wins by upload time', 'Silently deletes someone’s afternoon of work.'],
    ['Detect the version mismatch and keep both: the original and a conflicted copy', 'Right. Rung one is correct for opaque content. Auto-merging bytes or dropping one edit both destroy data.'],
    ['Lock files while any device is offline', 'That makes offline editing impossible — the feature’s whole point.'],
  ]),
  step('Why does OT need a central sequencer, and why is that NOT a scaling problem?', [], 1, [
    ['It is a scaling problem — CRDTs are always better', 'The sequencer is per document. One doc’s load is tiny.'],
    ['Transforms need one canonical order; load is per document (few concurrent editors), so sessions shard cleanly by doc id', 'Right. Per-entity coordination is not global coordination — the same insight as one matching engine per stock symbol.'],
    ['The sequencer is only for permissions', 'It exists to order operations so transforms converge.'],
    ['One global sequencer orders every document', 'Nothing requires that, and it would be a real bottleneck.'],
  ]),
  step('When is LWW an honest answer rather than silent data loss?', [], 1, [
    ['Whenever writes are timestamped accurately', 'Perfect clocks still drop the older write. The question is whether that write mattered.'],
    ['When the newest value supersedes by product definition — cursor, presence, a toggle — and you say so', 'Right. LWW is a product statement in technical clothing.'],
    ['Never', 'For presence and toggles it is exactly right.'],
    ['When clocks are NTP-synchronised', 'NTP narrows skew to milliseconds; it does not make losing a write correct.'],
  ]),
  step('A user renames a 2 GB video on their laptop. What should the sync client upload?', [], 0, [
    ['Only a metadata change: same chunk list, new path', 'Right. Content did not change, so no chunk hash changed. A rename is a journal entry.'],
    ['The whole 2 GB', 'Every chunk hash is unchanged and already stored.'],
    ['The first chunk, to be safe', 'Nothing about the bytes changed; there is nothing to be safe about.'],
  ]),
  step('Your sync client sees a file change on disk and immediately uploads it. The user is still saving a 1 GB file. What goes wrong, and the fix?', [], 1, [
    ['Nothing; uploads are atomic', 'The upload reads bytes while the app is still writing them.'],
    ['It uploads a half-written file; wait until the file is stable (unchanged size/mtime for a moment), hash, then upload', 'Right. Debounce file-system events and re-check the hash before committing.'],
    ['The server rejects it', 'The server has no idea the bytes are half-written. They hash just fine.'],
  ]),
  step('Kestrel Docs: a session server crashes mid-edit. What prevents lost edits?', [], 2, [
    ['Clients hold the document; nothing is lost', 'Clients hold unacknowledged ops, but acknowledged ones live only where the server put them.'],
    ['Restart the server and replay from memory', 'Memory is what crashed.'],
    ['Ack an op only after it is durably appended to the op log; clients resend un-acked ops to the new session server', 'Right. The new owner loads snapshot + log, and clients resend in-flight ops with their base revision; the server transforms them as usual.'],
  ]),
];
