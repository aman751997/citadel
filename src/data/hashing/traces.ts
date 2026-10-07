// Decision puzzles for the Hashing & Sets lesson. Every number here is re-derived in tests/hashing.test.ts.
import { row, step } from '../../lib/trace.ts';

export const wall = [
  step('A toy wall of 8 pigeonholes files each number in hole (number mod 8). 3 and 11 are already filed. Where does 19 go, and what does contains(19) have to do?',
    [row('Pigeonholes', ['·', '·', '·', '3 · 11', '·', '·', '·', '·'], { 3: 'hole 3' }, { tones: { 3: 'hot' } })], 0, [
      ['Hole 3, beside 3 and 11. contains(19) goes to hole 3 and compares 19 with each letter there', 'Yes. 19 mod 8 = 3, the same hole as 3 and 11: a collision. The stamp narrows the search to one hole; equals still checks the two letters inside. That short chain is why a lookup is O(1) on average, not always.'],
      ['Hole 19: every number gets a hole of its own', 'A hole for every possible int would mean four billion holes. The wall has 8, many numbers share each one, and that is fine as long as each hole stays short.'],
      ['Hole 3, and contains(19) can say yes at once because the hole is occupied', 'An occupied hole only means some number with the same stamp is filed there. 3 and 11 share hole 3 with 19, but neither is 19. Equals has to check.'],
    ]),
  step('Contains Duplicate on [1, 2, 3, 1]. You hold the 1 at index 3, and the set holds 1, 2 and 3. What does seen.add(1) return, and what do you do?',
    [row('nums', [1, 2, 3, 1], { 3: 'HERE' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'hot' } }), row('seen', [1, 2, 3], {}, { tones: { 0: 'hot' } })], 1, [
      ['true: add always succeeds, so keep going', 'Set.add returns false when an equal element is already present, and leaves the set unchanged. That return value is the answer to “seen before?”, for free.'],
      ['false: 1 is already on file, so return true', 'Yes. One call both asks and files. The first repeat ends the search; nothing after index 3 needs to be read.'],
      ['Sort the array first, to be sure', 'Sorting also works, in O(n log n), but the set has already answered in one expected O(1) step.'],
    ]),
  step('A default Java HashMap starts with 16 buckets and load factor 0.75. You put the 13th distinct key. What happens?', [], 2, [
      ['Nothing special: the chains just get longer', 'Without resizing, chains would grow with n and every lookup would slide toward O(n). The threshold is 16 × 0.75 = 12 entries, and the 13th crosses it.'],
      ['The map adds one bucket, making 17', 'Growing by one would re-file every entry on almost every put: O(n) each, O(n²) in total. Java always doubles, and keeps the capacity a power of two.'],
      ['It doubles to 32 buckets and re-files all 13 entries. That rare O(n) step averages out to O(1) per put', 'Yes. Because the wall doubles, all the re-filing over the map’s whole life adds up to roughly 2n entry moves at most: amortised O(1) per put.'],
      ['It throws: the map is full', 'A HashMap is never full. It grows until memory runs out.'],
    ]),
];

export const twoSum = [
  step('[3, 2, 4], target 6. You hold the 3 at index 0, and the register is empty. Which comes first?',
    [row('nums', [3, 2, 4], { 0: 'x' }, { tones: { 0: 'hot' } }), row('Register (value → index)', [])], 1, [
      ['File 3 → 0, then ask for 6 − 3 = 3', 'Then the register answers “yes, at index 0”: the 3 finds itself and you report [0, 0], one stamp used twice. The real answer is [1, 2].'],
      ['Ask for 6 − 3 = 3 first; only then file 3 → 0', 'Yes. The register only holds values from earlier positions, so any match is a different index. Nothing is found, so file 3 → 0 and move on.'],
      ['Ask for 3 itself', 'You ask for the partner, target − x, not for x. Here they happen to be equal, which is exactly the case where filing first would go wrong.'],
    ]),
  step('Index 2, holding 4. The register holds 3 → 0 and 2 → 1. What do you do?',
    [row('nums', [3, 2, 4], { 2: 'x' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } }), row('Register (value → index)', ['3 → 0', '2 → 1'], {}, { tones: { 1: 'hot' } })], 0, [
      ['Ask for 6 − 4 = 2: it is on file at index 1, so return [1, 2]', 'Yes. One lookup, one exact value. The pair is the filed index first, then the current one.'],
      ['Ask for 4: it is not on file, so file it', 'You ask for the partner, not for yourself: 6 − 4 = 2, and 2 is on file.'],
      ['Check every two entries of the register for a sum of 6', 'That is the O(n²) search the register exists to avoid. Each position needs exactly one lookup.'],
    ]),
  step('[3, 3], target 6. The register maps each value to ONE index. At index 1 it holds 3 → 0. Do the duplicates break it?',
    [row('nums', [3, 3], { 1: 'x' }, { tones: { 0: 'done', 1: 'hot' } }), row('Register (value → index)', ['3 → 0'], {}, { tones: { 0: 'hot' } })], 2, [
      ['Yes: the second 3 overwrites the first, so the pair is lost', 'The second 3 is never filed: its lookup comes first and succeeds. Ask-before-file is what makes one index per value enough.'],
      ['Yes: you need a map from value to a list of indices', 'Only if you must report every pair. For one pair, any earlier index with the right value will do.'],
      ['No: ask for 6 − 3 = 3, find index 0, and return [0, 1] before the second 3 is ever filed', 'Yes. Duplicates are exactly the case ask-first handles cleanly.'],
    ]),
];

export const keys = [
  step('Class Point overrides equals (same x, same y) but not hashCode. You add new Point(0, 0) to a HashSet, walk around the block, and add new Point(0, 0) again. What usually happens?', [], 1, [
    ['add returns false: the two points are equal', 'Equals never gets asked. The inherited hashCode comes from object identity, so two equal points almost always get different stamps and land in different holes. Equals only compares letters that share a hole.'],
    ['add returns true, and the set now holds two equal points', 'Yes. The contract says equal objects must have equal hash codes. Break it, and the set finds the twin only when two unrelated identity hashes happen to share a hole, so the bug even comes and goes.'],
    ['It throws an exception', 'Nothing checks the contract at runtime. That is why this bug is so quiet.'],
  ]),
  step('Integer a = 1000, b = 1000. What does a == b print?', [], 1, [
    ['true: both are 1000', '== on two Integer objects compares references, not values. Java must reuse cached Integer objects only for −128..127, and 1000 is outside that range.'],
    ['false: they are two different objects', 'Yes (with default JVM settings). With 127 it prints true, thanks to the cache, which is how this bug survives small tests. Compare with a.equals(b), or unbox to int first.'],
    ['It does not compile', 'It compiles without a warning. That is the trap.'],
  ]),
  step('You add an ArrayList [1, 2] to a HashSet, then call list.add(3) on that same list. Does set.contains(list) find it?', [], 1, [
    ['Yes: it is the very same object', 'Same object, new hash. The set filed it under the hash of [1, 2]; contains stamps [1, 2, 3], looks in a different hole, and finds nothing.'],
    ['No: the key changed its hash after it was filed, so it is stranded in the wrong hole', 'Yes. [1, 2] hashes to 994 (hole 2 of 16) and [1, 2, 3] to 30817 (hole 1). Neither the old list nor the new one finds the entry. Never change a key while it is filed.'],
    ['Only after you call rehash()', 'There is no public rehash. Remove the key, change it, and add it again — or use keys that cannot change.'],
  ]),
  step('You decide to key each corner (x, y) as a String. Which key is safe?', [], 2, [
    ['x + "" + y', 'Without a separator the digits run together: (1, 23) and (12, 3) both become "123", and so do (11, 1) and (1, 11). Two different corners, one key.'],
    ['x + y', 'That is integer addition: every corner on the same diagonal, such as (1, 2) and (2, 1), gets the same key.'],
    ['x + "," + y', 'Yes. The comma marks where x ends, and no digit or minus sign is a comma, so different corners always give different strings.'],
  ]),
];

export const anagram = [
  step('"rat" and "car". One int[26]: +1 for every letter of s, −1 for every letter of t. After the loop, which counts are not zero?',
    [row('s', ['r', 'a', 't'], {}, { tones: { 2: 'hot' } }), row('t', ['c', 'a', 'r'], {}, { tones: { 0: 'hot' } })], 0, [
      ['c is −1 and t is +1, so they are not anagrams', 'Yes. r and a cancel; t was added and never removed, c was removed and never added. Any nonzero count means the letters differ.'],
      ['All zero: both words have three letters', 'Equal length is necessary, not sufficient. The counts compare which letters, not how many in total.'],
      ['Only r, because it moved position', 'Position never matters to an anagram. r is +1 then −1, so it cancels.'],
    ]),
  step('You drop the length check and loop i over s only. s = "ab", t = "abx". What does the method return?',
    [row('s', ['a', 'b']), row('t', ['a', 'b', 'x'], {}, { tones: { 2: 'hot' } })], 1, [
      ['false: the x is never cancelled', 'The loop never reaches t[2] = x, so its −1 is never written. Every count is 0, and the method says true.'],
      ['true, which is wrong. The length check is what prevents it', 'Yes. Equal lengths guarantee that one loop visits every letter of both strings. (With t shorter than s, the same loop would throw instead.)'],
      ['It throws StringIndexOutOfBoundsException', 'Only when t is shorter than s. Here t is longer, so the loop simply never sees its last letter.'],
    ]),
  step('Follow-up: the strings may contain any Unicode characters, such as é. What replaces the int[26]?', [], 2, [
    ['Keep int[26] and index with c − \'a\'', 'é is U+00E9 = 233, so é − \'a\' = 233 − 97 = 136: ArrayIndexOutOfBoundsException.'],
    ['An int[128], one count per ASCII character', 'é is 233, past the end of an ASCII table. The alphabet is no longer small and fixed.'],
    ['A HashMap<Integer, Integer> from code point to count, built with merge(cp, 1, Integer::sum)', 'Yes. When the alphabet is large or unknown, a map is the general counter: O(n) expected time, space for the distinct characters only.'],
  ]),
];

export const group = [
  step('"tea" arrives. So far the drawer holds one bucket, "aet" → [eat]. What is the key for "tea"?',
    [row('Word', ['t', 'e', 'a'], {}, { tones: { 0: 'hot', 1: 'hot', 2: 'hot' } }), row('Buckets', ['aet: eat'])], 1, [
      ['"tea" itself', 'Then every spelling gets its own bucket, and no two anagrams ever meet. The key must be shared by every rearrangement.'],
      ['"aet", its letters sorted, so it joins eat', 'Yes. Sorting puts any rearrangement of the same letters into the same order, so all anagrams share one key, and non-anagrams cannot.'],
      ['The sum of its character codes, 116 + 101 + 97 = 314', 'Sums collide: "ad" and "bc" both total 197, yet they are not anagrams. A key must be equal exactly when the items belong together.'],
    ]),
  step('A count key written without separators: the 26 counts, digit after digit. "a" plus twelve "b"s has a = 1, b = 12. Eleven "a"s plus "bb" has a = 11, b = 2. What happens?', [], 0, [
    ['Both keys read "112" followed by 24 zeros, so two words that are not anagrams share a bucket', 'Yes. "1" then "12" and "11" then "2" are the same digits. Write a separator after every count ("1#12#…" against "11#2#…") and the keys differ.'],
    ['They get different keys, because the counts are different', 'The counts differ, but their written forms do not. Concatenating numbers loses where one ends and the next begins.'],
    ['Nothing can go wrong while words are shorter than 26 letters', 'These words have 13 letters. Any count of 10 or more has two digits, and that is all a collision needs.'],
  ]),
  step('"bat" brings a brand-new key, "abt". What does groups.get("abt").add("bat") do?', [], 1, [
    ['Creates the bucket and adds bat to it', 'get returns null for a key that is not in the map, and calling add on null fails.'],
    ['Throws NullPointerException, because get returns null for a missing key', 'Yes. groups.computeIfAbsent(key, k -> new ArrayList<>()) creates the list once and returns it every time, so .add(s) is always safe.'],
    ['Adds bat to the last bucket used', 'A map never guesses. A missing key gives null.'],
  ]),
];

export const streak = [
  step('The set holds 100, 4, 200, 1, 3 and 2. You reach 4. Is 3 in the set, and what do you do?',
    [row('Set', [100, 4, 200, 1, 3, 2], { 1: 'x' }, { tones: { 1: 'hot' } })], 1, [
      ['3 is present, so walk upward from 4 anyway: 4, then stop at 5', 'That walk is wasted. The run containing 4 starts at 1, and the walk from 1 passes through 4 anyway. Walking from every number costs about L²/2 steps on a run of length L.'],
      ['3 is present, so skip 4: it sits in the middle of a run that starts lower', 'Yes. Only a number whose predecessor is missing starts a run. 4 will be counted when the walk from 1 reaches it.'],
      ['Walk downward from 4 to find where its run starts', 'Walking down from every number is the same quadratic trap in reverse. Let the start come to you.'],
    ]),
  step('Now 1. 0 is not in the set, so 1 starts a run. 2, 3 and 4 are present; 5 is not. What do you record?',
    [row('Set', [100, 4, 200, 1, 3, 2], { 3: 'start' }, { tones: { 3: 'hot', 4: 'done', 5: 'done', 1: 'done' } })], 0, [
      ['A run of length 4: 1, 2, 3, 4', 'Yes. When the walk stops, cur = 4 is the last number of the run, 5 is absent, and the length is cur − start + 1 = 4.'],
      ['A run of length 3: 2, 3, 4 are the numbers found', 'The start counts too. Begin with length 1 for the start itself, then add one for each successor found.'],
      ['A run of length 5: the walk looked up 2, 3, 4 and 5', 'The lookup for 5 failed; it only proves the run has ended. Four numbers are in the run.'],
    ]),
  step('Across the whole loop over the set, how many times is the walk ever on the number 3?', [], 2, [
    ['Once for every number below it', 'Only run starts walk, and 3 belongs to exactly one run, whose single start is 1.'],
    ['It depends on the order the set returns its numbers', 'Order changes when each run is walked, never how often. Each run is walked once, from its start, whichever order you meet the numbers in.'],
    ['Exactly once: only the walk from 1, the start of its run, reaches 3', 'Yes. Each number sits in exactly one run, and each run is walked once. So the walks take n steps in total, and the whole loop is O(n).'],
  ]),
];

export const codec = [
  step('Join the strings with commas. What do ["a,b"] and ["a", "b"] encode to?', [], 0, [
    ['Both become "a,b", so the decoder cannot tell them apart', 'Yes. A delimiter fails the moment the data can contain it. A rarer delimiter only makes the failure rarer.'],
    ['"a,b" and "a,,b"', 'Joining puts one comma between strings. ["a", "b"] becomes "a,b", the same text as the single string "a,b".'],
    ['The decoder splits on commas, so both decode correctly', 'Splitting "a,b" gives ["a", "b"] both times. The one-string list is lost.'],
  ]),
  step('Decode "3#a#b0#". The digits up to the first # say 3. What comes next?',
    [row('Encoded', ['3', '#', 'a', '#', 'b', '0', '#'], { 0: 'i' }, { tones: { 0: 'hot', 1: 'hot' } })], 1, [
      ['Read “a” up to the next #', 'The # inside a string is just data. The header promised 3 characters, so take 3, whatever they are.'],
      ['Take exactly 3 characters, "a#b". Then "0#" is an empty string. Result: ["a#b", ""]', 'Yes. After the header, the decoder never looks at what the characters are; it only counts them.'],
      ['Split on #: ["3", "a", "b0", ""]', 'Splitting treats every # as structure. The length header exists so that no character has to be special inside a string.'],
    ]),
  step('Which two lists does “join with #” confuse, that length framing keeps apart?', [], 2, [
    ['["a"] and ["a", ""]', 'Joining gives "a" and "a#": different. That pair survives.'],
    ['["ab"] and ["a", "b"]', 'Joining gives "ab" and "a#b": different.'],
    ['[] and [""]: joining gives "" for both; framing gives "" and "0#"', 'Yes. An empty list and a list holding one empty string are different lists, and only a frame per string tells them apart.'],
  ]),
];

export const mixedReview = [
  step('Unsorted values: return the ORIGINAL positions of two values that add up to a target.', [], 1, [
    ['Sort, then walk two pointers inward', 'Sorting loses the original positions unless you sort (value, index) pairs, and it costs O(n log n). It works, but it is not the fast tool here.'],
    ['A map from value to index: for each x ask for target − x, then file x', 'Yes. One pass, O(n) expected time, and asking before filing stops x from pairing with itself.'],
    ['Nested loops over every pair', 'Correct, but O(n²). The map turns the inner loop into one lookup.'],
  ]),
  step('SORTED values: find two that add up to a target, using O(1) extra space.', [], 0, [
    ['Two pointers from both ends', 'Yes. Sorted order lets each comparison throw away a whole row of pairs. The map would work, but it costs O(n) space the problem forbids.'],
    ['A map from value to index', 'Correct, but it spends O(n) memory. Sorted input is a hint that you do not need it.'],
    ['A set of every value, then check target − x for each', 'Still O(n) extra space, and with duplicates it can pair a value with itself.'],
  ]),
  step('Group a list of words so that anagrams share a group.', [], 2, [
    ['Compare every pair of words with an anagram check', 'Correct, but O(n²) comparisons. A shared key lets the map do the grouping in one pass.'],
    ['Key each word by its spelling', 'Then anagrams, which are spelled differently, never meet.'],
    ['Key each word by its sorted letters, or by its 26 counts with a separator after each', 'Yes. The key must be equal exactly when two words are anagrams. computeIfAbsent builds each group.'],
  ]),
  step('Unsorted integers: find the longest run of consecutive values in O(n).', [], 0, [
    ['Put them all in a set; walk upward only from numbers whose predecessor is missing', 'Yes. Each number is walked exactly once, by its run’s start, so the whole pass is O(n) expected.'],
    ['Sort, then scan for runs', 'Correct, and a fine first answer, but O(n log n). The problem asked for O(n).'],
    ['Walk upward from every number in a set', 'Correct answer, but a run of length L costs about L²/2 steps: O(n²) on one long run.'],
  ]),
  step('Numbers arrive one at a time. After each arrival, report the smallest stored number greater than x.', [], 1, [
    ['A HashSet, then check x + 1, x + 2, … until one is found', 'A HashSet keeps no order, and the gap to the next number can be enormous.'],
    ['A TreeSet: higher(x) answers in O(log n)', 'Yes. When the question is about order (next, previous, smallest, range), use a balanced tree. TreeSet and TreeMap give O(log n) per operation plus sorted iteration.'],
    ['Sort the whole list after every arrival', 'O(n log n) per arrival. A tree keeps the order up to date for O(log n).'],
  ]),
  step('You use your own class as a HashMap key. What must you do?', [], 2, [
    ['Override equals, so equal keys match', 'Not enough. The map checks equals only inside one hole, and without hashCode equal keys land in different holes.'],
    ['Override hashCode, so equal keys share a hole', 'Not enough. Without equals, two keys in the same hole are still compared by identity and never match.'],
    ['Override both equals and hashCode from the same fields (or use a record), and never change those fields while the key is filed', 'Yes. Equal objects must have equal hash codes, and a key whose hash changes is stranded in the wrong hole.'],
  ]),
  step('An int[] of 200 million values already fills most of your memory. Is any value repeated?', [], 1, [
    ['Copy them into a HashSet<Integer>', 'Each boxed entry costs dozens of bytes against 4 in the array: around ten times the memory you have.'],
    ['Sort the array, then compare neighbours', 'Yes. O(n log n) time and almost no extra memory. When memory is the binding constraint, sorting beats hashing.'],
    ['Compare every pair', 'About 2 × 10¹⁶ comparisons. It fits in memory and never finishes.'],
  ]),
  step('Count how often each word appears in a long text.', [], 0, [
    ['A HashMap<String, Integer> with count.merge(word, 1, Integer::sum)', 'Yes. merge inserts 1 for a new word and adds 1 to an existing count, in one call.'],
    ['An int[26]', 'An int[26] counts letters. Words are unbounded keys, so they need a map.'],
    ['Sort the words and count equal neighbours', 'Correct, in O(n log n). The map does it in one O(n) pass.'],
  ]),
  step('Pack a list of arbitrary strings into one string, so that it can be unpacked exactly.', [], 2, [
    ['Join with a character that is unlikely to appear, like |', 'Unlikely is not never. The first string containing | breaks the decoder, and [] and [""] still collide.'],
    ['Join with commas and hope', 'Hope is not a codec: ["a,b"] and ["a", "b"] both become "a,b".'],
    ['Write each string as its length, a #, then the string itself', 'Yes. The decoder reads digits up to the first #, then takes exactly that many characters, whatever they are.'],
  ]),
  step('map.get(a) == map.get(b), where both values are Integer counts of 300. What does it return?', [], 1, [
    ['true, because both counts are 300', 'Two Integer objects holding 300 are usually different objects, and == compares references.'],
    ['Usually false. Integers outside the cache (−128..127) are separate objects; use .equals', 'Yes. The same code passes every test with small counts and fails once a count passes 127.'],
    ['It does not compile', 'It compiles. Comparing two Integer references with == is legal Java.'],
  ]),
];
