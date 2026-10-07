// Decision puzzles for the Linked Lists lesson. Every number here is re-derived in tests/linked-lists.test.ts.
import { row, step } from '../../lib/trace.ts';

const J = { join: '→' };

export const middle = [
  step('Slow takes one ferry per turn, Fast takes two. The loop runs while fast != null && fast.next != null. Where is Slow when it stops?',
    [row('Chain', [1, 2, 3, 4, 5, 'null'], { 0: 'SLOW · FAST' }, { ...J, tones: { 5: 'ghost' } })], 1, [
      ['On 2', 'That is after one turn. Fast is then on 3, and 3 still has two ferries ahead (4, then 5), so the loop runs again.'],
      ['On 3', 'Yes. Two turns: Slow 1 → 2 → 3, Fast 1 → 3 → 5. Fast is on the last island, fast.next is null, and the loop stops. 3 is the exact middle of five.'],
      ['On 4', 'Slow always covers exactly half of Fast\'s distance. Fast covered 4 ferries, so Slow covered 2: island 3.'],
    ]),
  step('Now six islands, same loop. Where is Slow when it stops?',
    [row('Chain', [1, 2, 3, 4, 5, 6, 'null'], { 0: 'SLOW · FAST' }, { ...J, tones: { 6: 'ghost' } })], 1, [
      ['On 3, the first middle', 'Trace it: Fast goes 1 → 3 → 5 → null (from 5 it can still take two ferries: to 6, then to null). That is three turns, so Slow walks 1 → 2 → 3 → 4.'],
      ['On 4, the second middle', 'Right. Fast ends on null after three turns and Slow on 4. With both starting on the head, an even chain gives the SECOND middle, which is exactly what Middle of the Linked List asks for.'],
      ['The loop throws a NullPointerException', 'The guard checks fast != null first, then fast.next != null. Java\'s && stops at the first false, so fast.next.next is only read when it exists.'],
    ]),
  step('Another problem wants the FIRST middle (3 in 1 → … → 6). What is the smallest change?', [], 0, [
    ['Start Fast one island ahead: fast = head.next', 'Yes. The head start makes Fast run out one turn earlier on even chains: Fast 2 → 4 → 6, then 6.next is null, so Slow stops on 3. On five islands Slow still stops on 3.'],
    ['Change the guard to while (fast != null)', 'When Fast stands on the last island, fast.next is null and fast.next.next throws a NullPointerException.'],
    ['Run the same loop, then step Slow back one island', 'Ferries are one-way: a node has no pointer to the island behind it. Stepping back would need a second walk from the head.'],
  ]),
];

export const cycle = [
  step('Both couriers start on island 3. Before anyone moves, slow == fast. What does that tell you?',
    [row('Chain (the last ferry ↩ goes back to 2)', [3, 2, 0, -4, '↩ 2'], { 0: 'SLOW · FAST' }, { ...J, tones: { 4: 'ghost' } })], 1, [
      ['There is a loop: they are on the same island', 'Every chain, even 1 → null, starts with both couriers on the head. Compare only after they move.'],
      ['Nothing yet. Move first, then compare', 'Yes. Starting together is not evidence. The loop moves both couriers, then checks slow == fast.'],
    ]),
  step('A different chain, 1 → 2 → 2 → 3 → null. After one turn, Slow stands on a 2 and Fast on a 2. Loop found?',
    [row('Chain', [1, 2, 2, 3, 'null'], { 1: 'SLOW', 2: 'FAST' }, { ...J, tones: { 4: 'ghost' } })], 1, [
      ['Yes: slow.val == fast.val', 'Two islands can fly the same flag. This chain ends in null; comparing values reports a loop that is not there.'],
      ['No: they are different islands. Compare slow == fast (the nodes)', 'Right. == on references asks "the same node?". Next turn Fast reaches null (from the second 2 it takes the ferry to 3, then to null), so the answer is: no loop.'],
    ]),
  step('Inside a loop, Fast gains exactly one island on Slow per turn. Why can\'t Fast leap over Slow and miss it?', [], 0, [
    ['The gap between them shrinks by exactly 1 per turn, so it must pass through 0', 'That is the whole proof. Measure how far Fast is behind Slow along the loop: d, then d − 1, d − 2, … It cannot skip from 1 to −1, so they meet within L turns of Slow entering the loop.'],
    ['It can leap over. That is why some versions use speed 3', 'Speed 3 is worse: the gap shrinks by 2 per turn and can jump from 1 straight past 0. On a loop of even length with an odd gap, they would never meet.'],
    ['Because the values on a loop repeat', 'Values have nothing to do with it. This is about positions: one island closer per turn.'],
  ]),
];

export const nth = [
  step('Remove the 2nd island from the end (that is 4). Both pilots start on the dummy D. How many ferries does Lead take alone before they move together?',
    [row('Chain', ['D', 1, 2, 3, 4, 5, 'null'], { 0: 'LEAD · TRAIL' }, { ...J, tones: { 0: 'ghost', 6: 'ghost' } })], 1, [
      ['2 (n)', 'Then when Lead falls off the end, Trail is on 4 — the island to delete. A rope is cut from the island BEFORE the target; you need Trail on 3.'],
      ['3 (n + 1)', 'Yes. A gap of n + 1 ferries means that when Lead reaches null, Trail is exactly one island before the target: on 3.'],
      ['5 (the length)', 'You do not know the length without a whole extra walk. And with a gap of 5, Lead is on 5 when the pair starts walking: after one hop together Lead is on null and Trail is on 1, before 2, not before 4.'],
    ]),
  step('Lead is on null; Trail is on 3. Which line removes 4?',
    [row('Chain', ['D', 1, 2, 3, 4, 5, 'null'], { 3: 'TRAIL', 6: 'LEAD' }, { ...J, tones: { 0: 'ghost', 4: 'hot', 6: 'ghost' } })], 0, [
      ['trail.next = trail.next.next', '3\'s ferry now goes straight to 5. Nothing points at 4, so it is gone: 1 → 2 → 3 → 5.'],
      ['trail = trail.next.next', 'That moves the pilot, not the rope. The chain is unchanged.'],
      ['trail.next = null', 'That cuts off 4 AND 5: you would return 1 → 2 → 3.'],
    ]),
  step('Chain 1, n = 1. Lead took 2 ferries and fell off; Trail never left the dummy. After trail.next = trail.next.next, what do you return?',
    [row('Chain', ['D', 1, 'null'], { 0: 'TRAIL', 2: 'LEAD' }, { ...J, tones: { 0: 'ghost', 2: 'ghost' } })], 0, [
      ['dummy.next, which is now null: the empty chain', 'Yes. The dummy gave Trail an island to stand on "before" the head. Returning dummy.next handles a removed head with no special case.'],
      ['head', 'head still points at island 1 — the node you just removed. You would return a deleted node.'],
      ['The dummy itself', 'The dummy is scaffolding with a made-up value. It is never part of the answer.'],
    ]),
];

export const duplicate = [
  step('Treat each index i as an island whose ferry goes to island nums[i]. Starting at island 0, which route do you sail?',
    [row('nums (index below each value)', [1, 3, 4, 2, 2], { 0: 'i = 0', 1: 'i = 1', 2: 'i = 2', 3: 'i = 3', 4: 'i = 4' })], 0, [
      ['0 → 1 → 3 → 2 → 4 → 2 → 4 → …', 'Yes: nums[0] = 1, nums[1] = 3, nums[3] = 2, nums[2] = 4, nums[4] = 2. Then 2 and 4 alternate forever — a loop.'],
      ['0 → 1 → 2 → 3 → 4, then null', 'That walks the indexes in order instead of following the ferries. And there is no null here: every value 1..4 is a valid island.'],
      ['1 → 3 → 4 → 2 → 2', 'That is the array read left to right. Follow i → nums[i] instead.'],
    ]),
  step('Phase 1: both couriers start on island 0; each turn slow = nums[slow], fast = nums[nums[fast]]. They meet on island 4. Is 4 the duplicate?', [], 1, [
    ['Yes: return 4', '4 appears only once in the array. The meeting point is wherever the race happens to end inside the loop — not necessarily its entrance.'],
    ['No: send one courier back to island 0; both take one ferry per turn', 'Right. Phase 2 finds the loop\'s entrance — the island with two ferries arriving — and that island\'s number is the duplicated value.'],
  ]),
  step('Phase 2: one courier starts on 0, the other stays on 4; each takes one ferry per turn. Where and when do they meet?', [], 0, [
    ['On island 2, after 3 turns', 'Courier A: 0 → 1 → 3 → 2. Courier B: 4 → 2 → 4 → 2. Both stand on 2 after 3 turns, because the tail from 0 to the entrance is 3 ferries long. And 2 is the duplicate: nums[3] = nums[4] = 2.'],
    ['On island 4, after 2 turns', 'After 2 turns the restarted courier is on 3 (0 → 1 → 3). It is still on the tail, not in the loop.'],
    ['Never: with equal speeds the gap stays fixed', 'The gap is fixed only while both are in the loop. The restarted courier walks the tail first, and the distance argument shows that both reach the entrance on the same turn.'],
  ]),
];

export const reverse = [
  step('One turn is done: 1 → null is reversed. cur is on 2. What is the FIRST line of this turn?',
    [row('From prev (reversed)', [1, 'null'], { 0: 'PREV' }, { ...J, tones: { 0: 'done', 1: 'ghost' } }),
     row('From cur (still to flip)', [2, 3, 4, 5, 'null'], { 0: 'CUR' }, { ...J, tones: { 0: 'hot', 4: 'ghost' } })], 0, [
      ['ListNode next = cur.next: hold the rope to 3', 'Yes. Save the rope before cutting it. Now 3 → 4 → 5 is held by next, and you are free to re-tie 2.'],
      ['cur.next = prev: flip 2\'s arrow', 'You just dropped the rope: 2 was the only island holding the line to 3. After the flip, 3 → 4 → 5 is unreachable — nobody can find it again.'],
      ['prev = cur', 'Then prev and cur are both 2, and the flip would tie 2 to itself: a one-island loop.'],
    ]),
  step('The loop has ended: cur is null. What do you return?',
    [row('From prev', [5, 4, 3, 2, 1, 'null'], { 0: 'PREV' }, { ...J, tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'done', 5: 'ghost' } }),
     row('cur', ['null'], { 0: 'CUR' }, { tones: { 0: 'ghost' } })], 0, [
      ['prev: island 5, the new head', 'Yes. prev is always the front of the reversed part, and now the reversed part is everything.'],
      ['cur', 'cur walked off the end: it is null. Returning it hands the caller an empty chain.'],
      ['head', 'head still points at island 1, which is now the LAST island: 1 → null. You would return a one-node chain and lose 2 … 5.'],
    ]),
  step('head is null (an empty chain). What does the four-line loop do?', [], 0, [
    ['The loop never runs; it returns prev, which is null', 'Correct, and no special case is needed.'],
    ['It throws a NullPointerException at cur.next', 'The while guard checks cur != null first; with an empty chain the body never runs.'],
    ['It needs if (head == null) return null; first', 'Harmless but unnecessary: prev starts as null and is returned unchanged.'],
  ]),
];

export const reverseII = [
  step('Reverse positions 2 through 4 (islands 2, 3, 4). Where must `before` stand when the flipping starts?',
    [row('Chain', ['D', 1, 2, 3, 4, 5, 'null'], {}, { ...J, tones: { 0: 'ghost', 2: 'hot', 3: 'hot', 4: 'hot', 6: 'ghost' } })], 0, [
      ['On 1, the island just before position 2', 'Yes. Its rope is the seam into the section. After the flips you re-tie it to the section\'s new first island, 4.'],
      ['On 2, the first island to flip', 'Then nobody stands where the section is entered. After the flips, 1 still points at 2, and you hold no reference to 1 to re-tie it.'],
      ['Always on the dummy', 'Only when left = 1. In general, walk left − 1 ferries from the dummy.'],
    ]),
  step('After flipping 2, 3, 4: prev = 4, cur = 5, first = 2. Which re-ties finish the surgery?',
    [row('before → (seam 1)', [1, 2, 'null'], { 0: 'BEFORE', 1: 'FIRST' }, J),
     row('reversed section', [4, 3, 2, 'null'], { 0: 'PREV' }, J),
     row('after the section', [5, 'null'], { 0: 'CUR' }, J)], 0, [
      ['before.next = prev and first.next = cur', 'Both seams: 1 → 4 → 3 → 2 → 5. The section\'s old first island (2) is now its last and must point at 5.'],
      ['before.next = prev only', 'You get 1 → 4 → 3 → 2 → null. Island 5 is dropped: nobody\'s rope leads to it.'],
      ['before.next = cur and first.next = prev', 'That ties 1 straight to 5 (the section vanishes from the chain) and ties 2 to 4, making a loop 4 → 3 → 2 → 4.'],
    ]),
  step('Now left = 1 and right = 3 on 1 → 2 → 3 → 4 → 5. What do you return?', [], 0, [
    ['dummy.next, which is island 3', 'before was the dummy, and seam 1 re-tied dummy.next to 3: 3 → 2 → 1 → 4 → 5.'],
    ['head, which is island 1', 'Island 1 is now third in line. Returning it gives 1 → 4 → 5 and loses 3 and 2.'],
  ]),
];

export const kGroup = [
  step('k = 3. The first group is done: 3 → 2 → 1. A probe from `before` counts ahead: 4, 5, then null. What now?',
    [row('Chain', [3, 2, 1, 4, 5, 'null'], { 2: 'BEFORE' }, { ...J, tones: { 0: 'done', 1: 'done', 2: 'done', 5: 'ghost' } })], 0, [
      ['Stop: fewer than k remain, so 4 → 5 keeps its order', 'Yes. The problem leaves a short final group untouched. Count before you flip.'],
      ['Reverse 4 → 5 anyway', 'That gives 3 → 2 → 1 → 5 → 4. The problem keeps a short tail in its original order.'],
      ['Report an error: the length is not a multiple of k', 'A short tail is normal input, not an error.'],
    ]),
  step('Start again with k = 3. After reversing 1 → 2 → 3 into 3 → 2 → 1, which island becomes `before` for the next group?',
    [row('After the first group', [3, 2, 1, 4, 5, 'null'], { 0: 'PREV', 2: 'FIRST', 3: 'CUR' }, { ...J, tones: { 5: 'ghost' } })], 0, [
      ['Island 1: the old first, now the group\'s last', 'Yes. Its rope is the seam into the next group.'],
      ['Island 3', '3 is now the group\'s first island. Standing there, the next seam re-tie would cut 2 and 1 out of the chain.'],
      ['Island 4', '4 is the next group\'s first island. You need to stand before it to re-tie its seam.'],
    ]),
  step('k = 2 on 1 → 2 → 3 → 4 → 5. What is the final chain?', [], 0, [
    ['2 → 1 → 4 → 3 → 5', 'Groups (1, 2) and (3, 4) flip; 5 is a short tail and stays.'],
    ['2 → 1 → 4 → 3 → null', 'Seam 2 ties each group\'s old first island to the node after the group. 3 must point at 5, or 5 is dropped.'],
    ['5 → 4 → 3 → 2 → 1', 'That reverses the whole chain. k-groups flip each block of 2 separately.'],
  ]),
];

export const merge = [
  step('Both heads hold 1. What does this turn do?',
    [row('list1', [1, 2, 4, 'null'], { 0: 'L1' }, J), row('list2', [1, 3, 4, 'null'], { 0: 'L2' }, J), row('Result', ['D'], { 0: 'TAIL' }, { tones: { 0: 'ghost' } })], 0, [
      ['Splice list1\'s 1 after tail (list1.val <= list2.val), then advance list1 and tail', 'Yes. The other 1 goes next turn. Every node survives: 6 in, 6 out.'],
      ['Keep only one 1', 'Merging keeps every node. The result must be 1 → 1 → 2 → 3 → 4 → 4.'],
      ['Create a new node with value 1', 'It works, but it costs O(n) new nodes. Re-tying the existing ones needs only O(1) extra memory.'],
    ]),
  step('list1 is used up; list2 still holds 4. What now?',
    [row('list1', ['null'], { 0: 'L1' }, { tones: { 0: 'ghost' } }), row('list2', [4, 'null'], { 0: 'L2' }, J), row('Result', ['D', 1, 1, 2, 3, 4], { 5: 'TAIL' }, { ...J, tones: { 0: 'ghost' } })], 0, [
      ['tail.next = list2: one re-tie attaches the rest', 'The leftover is already linked and already sorted. No loop needed.'],
      ['Loop over list2, splicing one node at a time', 'Correct, but unnecessary: its nodes already point at each other in order.'],
      ['Return dummy.next now', 'The last 4 would be lost: tail (list1\'s 4) still points at null.'],
    ]),
  step('What do you return?', [], 0, [
    ['dummy.next', 'The dummy\'s rope points at the first real island of the merged chain.'],
    ['tail', 'tail is the LAST island of the merged chain.'],
    ['list1', 'list1 has walked to null. Even its original head is not always the smallest overall.'],
  ]),
];

export const reorder = [
  step('Guard: fast.next != null && fast.next.next != null, both starting on 1. Where does Slow stop?',
    [row('Chain', [1, 2, 3, 4, 5, 6, 'null'], { 0: 'SLOW · FAST' }, { ...J, tones: { 6: 'ghost' } })], 0, [
      ['On 3: the first half is 1 → 2 → 3', 'Slow 1 → 2 → 3, Fast 1 → 3 → 5. Then 5.next.next is null, so the loop stops. The second half starts at slow.next.'],
      ['On 4', 'That is what the middle-of-the-list guard (fast != null && fast.next != null) gives. This guard stops Fast one turn earlier, so Slow ends the first half on 3.'],
      ['On 6', 'Slow covers half of Fast\'s distance; it never reaches the end of the chain.'],
    ]),
  step('You cut after 3 (slow.next = null). What must happen to 4 → 5 → 6 before weaving?',
    [row('First half', [1, 2, 3, 'null'], {}, J), row('Second half', [4, 5, 6, 'null'], {}, J)], 0, [
      ['Reverse it to 6 → 5 → 4', 'Weaving takes from the front of each half, so the second half\'s front must be the original last island.'],
      ['Nothing: weave it as it is', 'You would get 1 → 4 → 2 → 5 → 3 → 6, a riffle shuffle, not first-last-second-second-last.'],
      ['Copy it into an array', 'That works at O(n) extra space. The point of this problem is O(1): middle + reverse + weave.'],
    ]),
  step('Weave one step with first on 1 and second on 6. Which order of lines?',
    [row('First', [1, 2, 3, 'null'], { 0: 'FIRST' }, J), row('Second', [6, 5, 4, 'null'], { 0: 'SECOND' }, J)], 0, [
      ['n1 = first.next; n2 = second.next; first.next = second; second.next = n1; first = n1; second = n2', 'Save both ropes, then re-tie: 1 → 6 → 2. The walkers move to 2 and 5.'],
      ['first.next = second; second.next = first.next', 'After the first line, first.next IS second, so the second line ties 6 to itself — a loop — and 2 → 3 is dropped.'],
      ['second.next = first.next; first.next = second; then advance', '6\'s rope to 5 was overwritten before anyone held 5. 5 → 4 drift away.'],
    ]),
];

export const copyRandom = [
  step('You create clones in one walk from A to C. Why can\'t you set every clone\'s random pointer during that same walk?',
    [row('Chain (random pointers in labels)', ['A·7', 'B·13', 'C·11', 'null'], { 0: 'random → C', 1: 'random → A', 2: 'random → null' }, { ...J, tones: { 3: 'ghost' } })], 0, [
      ['A.random is C, and C\'s clone does not exist yet when you clone A', 'Exactly. Some random pointers aim forward. Make every clone first (pass 1), then wire next and random (pass 2).'],
      ['Because random pointers may be null', 'null is easy: the clone\'s random is null too.'],
      ['Because clones must be created in reverse order', 'Order cannot fix it: A.random points forward and B.random points backward. Some pointer always aims at a clone you have not made.'],
    ]),
  step('Woven chain: every clone sits right after its original. A.random is C. Where must A\'.random point?',
    [row('Woven chain', ['A', "A'", 'B', "B'", 'C', "C'", 'null'], { 0: 'random → C' }, { ...J, tones: { 1: 'hot', 3: 'hot', 5: 'hot', 6: 'ghost' } })], 0, [
      ['A.random.next, which is C\'', 'The clone of any island X sits right after X, so the clone of A.random is A.random.next.'],
      ['A.random, which is C', 'C is an ORIGINAL. The copy would point into the old chain: a shallow copy that shares nodes.'],
      ['A\'.next.random', 'A\'.next is B, the next original. B\'s random has nothing to do with A.'],
    ]),
  step('Map version: when cur is the last original, what does map.get(cur.next) return?', [], 0, [
    ['null, so the last clone\'s next is null: correct', 'HashMap.get(null) returns null when no null key was stored, which is exactly the end of the copied chain.'],
    ['It throws a NullPointerException', 'HashMap allows a null key lookup. (TreeMap would throw; HashMap does not.)'],
    ['The head clone, closing a loop', 'Nothing maps null to the head. You would have to put that entry yourself.'],
  ]),
];

export const lru = [
  step('Capacity 2. put(1, 1), put(2, 2), get(1), then put(3, 3). Which key is evicted?',
    [row('Recency after get(1), most recent first', [1, 2], { 0: 'MOST', 1: 'LEAST' })], 0, [
      ['Key 2', 'get(1) made 1 the most recent, so 2 is the least recently used. After the put, recency is 3, 1.'],
      ['Key 1', 'That is first-in-first-out. LRU counts use: get(1) refreshed key 1.'],
      ['Nobody: the cache grows', 'Capacity is a hard limit. Adding a new key to a full cache evicts first.'],
    ]),
  step('Next, get(2) returns?', [], 1, [
    ['2', 'Key 2 was evicted by put(3, 3).'],
    ['−1', 'Yes: a miss. Remember that a miss does not change recency.'],
  ]),
  step('Why does each list node store its key as well as its value?', [], 0, [
    ['On eviction you find the node at the tail and need its key to remove it from the map too', 'Exactly. The list knows WHO is oldest; the map is keyed by key. Without the key in the node, eviction would need an O(n) map search.'],
    ['To keep the list sorted by key', 'The list is ordered by recency, never by key.'],
    ['Java\'s HashMap requires it', 'HashMap does not care what the values contain.'],
  ]),
];

export const mixedReview = [
  step('In the reversal loop, why must `ListNode next = cur.next` come before `cur.next = prev`?', [], 1, [
    ['Java evaluation order requires it', 'Java runs statements in the order you write them; nothing forces this order except the rope.'],
    ['Flipping the arrow first destroys the only reference to the rest of the list — next saves the rope before you cut it; without it the remaining nodes are unreachable', 'The single most common linked-list bug. "Save the rope before cutting it": that phrase is the fix.'],
    ['It avoids a NullPointerException', 'Flipping first throws nothing — that is what makes the bug dangerous. It silently strands the rest of the chain.'],
    ['Purely stylistic', 'Swap the two lines and the rest of the chain is gone. The order is the algorithm.'],
  ]),
  step('Find the Duplicate: array [1, 3, 4, 2, 2], no modification, O(1) space. Why is this a linked-list problem?', [], 1, [
    ['Arrays are linked lists internally', 'Arrays are contiguous blocks. The linked structure here is one you imagine: index i → nums[i].'],
    ['Treat i → nums[i] as pointers: values 1..n over n + 1 slots guarantee two arrows into one node — a cycle whose ENTRANCE is the duplicate. Floyd\'s two phases find it', 'The hidden-structure transfer. The constraints (values 1..n, read-only, O(1) space) rule out hashing and sorting and point straight at Floyd\'s. Constraint scan → pattern: your Alien Protocol working as designed.'],
    ['Sort it with pointer swaps', 'Sorting modifies the array, which the problem forbids.'],
    ['It is not — use a HashSet', 'A HashSet works in O(n) space. The problem demands O(1) extra space.'],
  ]),
  step('LRU Cache: why a doubly linked list specifically, not singly?', [], 1, [
    ['Doubly is faster to traverse', 'Traversal speed is the same, and get/put never traverse anyway.'],
    ['get() must move an arbitrary middle node to the front in O(1) — removal needs instant access to the node\'s PREDECESSOR, which only a prev pointer gives you', 'O(1) removal of a known node needs node.prev. A singly linked list forces an O(n) hunt for the predecessor and breaks the whole contract. This "why doubly" follow-up is asked nearly every time.'],
    ['Singly linked lists cannot store key-value pairs', 'A node can hold any fields. The problem is finding the predecessor.'],
    ['To iterate the cache in both orders', 'Nothing in get or put iterates. The prev pointer exists for O(1) unlinking.'],
  ]),
  step('Reorder List (L0 → Ln → L1 → Ln−1 …): the plan, cold.', [], 1, [
    ['Store nodes in an ArrayList, rebuild by index', 'It works, but costs O(n) space and reads as pattern-blindness.'],
    ['Fast/slow to find the middle → reverse the second half → weave the halves alternately: three list techniques chained, O(1) space', 'The chain (middle + reverse + weave) is why this problem exists: it audits all three skills at once.'],
    ['Recursively swap ends inward', 'Finding each new end costs a walk: O(n²) time, or O(n) stack with clever recursion.'],
    ['Priority queue by original index', 'A heap adds O(n log n) time and O(n) space, and you would still need the weave.'],
  ]),
  step('Does this chain loop back on itself? O(1) extra memory, and the nodes must not be modified.', [], 0, [
    ['Slow and Fast from the head; compare the nodes after each turn', 'Yes. A meeting proves a loop; Fast reaching null proves an end.'],
    ['A HashSet of visited nodes', 'Correct answer, wrong budget: O(n) extra memory.'],
    ['Overwrite each visited node\'s value with a marker', 'That modifies the nodes, and a real value could equal your marker.'],
  ]),
  step('Two chains may merge into one shared tail. Return the first shared node in O(m + n) time and O(1) memory.', [], 1, [
    ['Compare values while walking both chains together', 'Equal values are not the same node, and the chains may have different lengths before they join.'],
    ['Two walkers; each restarts at the OTHER chain\'s head when it runs out', 'Both walk a + c + b nodes before reaching the join, so they arrive together — or reach null together if there is no join.'],
    ['Reverse both chains and compare from the back', 'The tail is shared: reversing chain A also reverses the end of chain B, so the second reversal walks a tangled chain. And you would have to restore both.'],
  ]),
  step('Remove the nth node from the end in one pass. Where do the two pointers start, and how far apart?', [], 0, [
    ['Both on a dummy; Lead takes n + 1 hops first, then both walk until Lead is null', 'Then Trail ends just before the target, and the dummy covers removing the head.'],
    ['Both on head; Lead takes n hops first, then both walk until Lead is null', 'A gap of n puts Trail ON the target when Lead reaches null, and a rope is cut from the island before it. When n equals the length, there is no island before the head at all. The dummy and the extra hop solve both.'],
    ['Count the length first, then walk', 'Correct, but that is two passes. The gap does it in one.'],
  ]),
  step('Sort a chain in O(n log n) time. Which plan fits a linked list best?', [], 2, [
    ['Quicksort by swapping values at indexes', 'A list has no O(1) indexing; quicksort\'s partition-by-index does not fit.'],
    ['Copy into an array, sort, rebuild', 'It works at O(n) extra memory. Fine if allowed, but it skips what the question tests.'],
    ['Merge sort: split at the middle (fast/slow), sort each half, merge with a dummy head', 'Splitting costs one walk, and merging re-ties existing nodes with no extra array.'],
  ]),
];
