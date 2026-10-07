// Decision puzzles for the Tries lesson. Every number here is re-derived in tests/tries.test.ts.
import { row, step } from '../../lib/trace.ts';

// The garden after inserting only "apple": one path from the root, a bloom on the final e.
const applePath = () => row('Path in the garden', ['root', 'a', 'p', 'p', 'l', 'e'], { 3: 'YOU', 5: 'bloom' }, { tones: { 1: 'done', 2: 'done', 3: 'hot' }, join: '→' });

export const anatomy = [
  step('The garden holds one word, “apple”. search("app") walks a → p → p and arrives at a node. What decides the answer?',
    [row('Query', ['a', 'p', 'p'], { 2: 'last letter' }), applePath()], 1, [
      ['You arrived, so true', 'Arriving proves only that some stored word STARTS with “app” — “apple” planted those nodes. search asks whether “app” itself was inserted.'],
      ['The isEnd flag on this node: it is false, so false', 'Yes. Only the last letter of an inserted word gets isEnd. This p is a waypoint on the way to “apple”, so search("app") is false.'],
      ['The node has a child (l), so it is not a word: false', 'Right answer, wrong reason. Insert “app” as well: the node still has the child l, yet search("app") must now be true. Children say nothing; the flag says everything.'],
    ]),
  step('Same garden. startsWith("app") makes the same walk and arrives at the same node. What does it return?',
    [row('Query', ['a', 'p', 'p'], { 2: 'last letter' }), applePath()], 0, [
      ['true: the walk finished, so a stored word passes through here', 'Yes. Nodes are only created by insert, so every node lies on the path of some stored word. Finishing the walk is the whole proof.'],
      ['false: isEnd is false here', 'That is search’s rule. startsWith asks whether ANY stored word continues through this node — and “apple” does.'],
      ['Walk down to a bloom first, to be sure a word really lies below', 'Unnecessary. As long as deletions prune dead nodes, every node is on some word’s path. The walk is O(L) for a prefix of length L, whatever lies below.'],
    ]),
  step('Now insert “apt” into the garden that holds “apple”. How many new nodes grow?',
    [row('Word to plant', ['a', 'p', 't']), applePath()], 1, [
      ['3: one per letter', 'Only letters with no existing branch need new nodes. a and p are already there, shared with “apple”.'],
      ['1: follow a, follow p, grow t, then set isEnd on t', 'Yes. Shared beginnings are stored once. That sharing is why startsWith costs O(L) instead of O(number of words).'],
      ['0: “ap” is already in the garden', 'The t branch is not. And even when every node exists already (inserting “app”), insert still has one job left: set isEnd.'],
    ]),
  step('Your garden must store names written in any of 50,000 different characters. Children as a 50,000-slot array, or a map?', [], 1, [
    ['An array: one slot per possible character', 'Every node pays for 50,000 slots, nearly all empty. 100,000 nodes would need 5 billion slots.'],
    ['A HashMap from character to child', 'Yes. A map stores only the children that exist. It costs a hash per step and more memory per real child, but it no longer multiplies every node by the alphabet size.'],
    ['Fold every character into a–z first', 'That merges different characters into the same branch, so different names collide and search returns wrong answers.'],
  ]),
];

export const wildcard = [
  step('Words bad, dad, mad. search(".ad"). At the root the pattern shows a dot. What do you do?',
    [row('Pattern', ['.', 'a', 'd'], { 0: 'i = 0' }, { tones: { 0: 'hot' } }), row('Root’s children', ['b', 'd', 'm'])], 1, [
      ['Follow the “.” child', 'There is no “.” branch: dots are never inserted, only searched. A dot stands for any single letter.'],
      ['Try b, then d, then m; stop as soon as one of them matches the rest of the pattern', 'Yes. b → a → d reaches a bloom, so search returns true after trying a single child.'],
      ['Try all three; return true only if every one matches', 'One match is enough. Add “cat”: the c branch fails (c → a → t, not d) while bad still matches, and “all must match” would wrongly answer false.'],
    ]),
  step('Same garden: bad, dad, mad. What does search("..") return?',
    [row('Pattern', ['.', '.']), row('Nodes two letters deep', ['ba', 'da', 'ma'], {}, { tones: { 0: 'out', 1: 'out', 2: 'out' } })], 1, [
      ['true: b → a fits two dots', 'The walk does reach the “ba” node, but no word ends there. Each dot matches exactly one letter, so “..” can only match a two-letter word.'],
      ['false: every two-letter path ends on a node without a bloom', 'Yes. The search reaches ba, da and ma, finds isEnd false at each, and backs out of all three.'],
      ['true: a dot may also match no letter', 'Not in this problem. A dot is exactly one letter, so the pattern’s length is the word’s length.'],
    ]),
  step('A pattern has 2 dots and 3 letters (length 5), and every node in the garden has all 26 children. At most how many root-to-depth-5 paths does the search explore?', [], 1, [
    ['26 + 26 = 52', 'Each branch taken at the first dot meets the second dot separately, so the choices multiply, not add.'],
    ['26 × 26 = 676, each followed for at most 5 letters', 'Yes: O(26^d · L) for d dots. LeetCode allows at most 2 dots per search, so this is a constant; with many dots the work is still capped by the number of nodes in the garden.'],
    ['26⁵ = 11,881,376', 'Letters don’t branch: a letter follows at most one child. Only the dots multiply the paths.'],
  ]),
];

export const wordGrid = [
  step('The garden holds oath, pea, eat, rain, so the root’s children are o, p, e, r. The walk starts on the “o” in the top-left corner. Its neighbours are “a” (right) and “e” (below). Which neighbours does it enter?',
    [row('Row 0', ['o', 'a', 'a', 'n'], { 0: 'START' }, { tones: { 0: 'hot' } }), row('Row 1', ['e', 't', 'a', 'e']), row('Children of node “o”', ['a'])], 1, [
      ['Both: any neighbour could begin a word', 'The walk is no longer at the root; it stands on node “o”, and no word begins “oe”. A plain grid search would wander into e and keep going; the garden stops it with one lookup.'],
      ['Only the a to its right: node “o” has a single child, a', 'Yes. The grid and the garden move in lockstep. A neighbour is worth entering only if the current node has a child for its letter.'],
      ['Neither: “o” is not a word', '“o” doesn’t need to be a word. Node “o” exists, so some word (oath) starts here. Keep walking.'],
    ]),
  step('The walk traced o → a → t → h and reached the node that stores “oath”. You add it to the answer. What do you do to that node?',
    [row('Path', ['o', 'a', 't', 'h'], { 3: 'word = oath' }, { tones: { 3: 'done' }, join: '→' })], 1, [
      ['Nothing: duplicates don’t matter', 'The answer is a list. If “oath” could be traced along two different paths — or from two starting cells — it would be reported twice.'],
      ['Set node.word = null, so each word is reported once', 'Yes. The word is consumed. No set of results is needed, and later walks through this node report nothing.'],
      ['Stop the whole search: a word was found', 'Other words are still hidden in the grid. “eat” is found from a different cell later.'],
    ]),
  step('“oath” was the only word under “o”. With its word nulled, the h node has no children and no word. What should the search do as it returns from h?', [], 1, [
    ['Leave it: the garden must not change during the search', 'Then every later “o” cell still walks o → a → t → h for nothing. On a big board those dead walks are most of the work.'],
    ['Unlink h from t; then t, a and o empty out in turn and are unlinked as the search returns', 'Yes. Pruning removes branches that can no longer produce a word, so later walks stop at the root. A child counter per node makes “is this node empty?” an O(1) check.'],
    ['Clear the whole garden: a word was found', 'Only the branch that leads to no unfound word. pea, eat and rain must stay.'],
  ]),
  step('A 12 × 12 board and 30,000 words of up to 10 letters. Searching one word at a time, a worst-case bound is about 5.7 million steps per word. What does the shared garden cost?', [], 1, [
    ['The same 5.7 million × 30,000 ≈ 1.7 × 10¹¹: the garden is just bookkeeping', 'That is the per-word cost. One walk of the grid now serves every word at once.'],
    ['About 5.7 million steps in total, plus 300,000 letters to plant the garden', 'Yes. Each walk of the grid is a simple path of at most 10 cells, and the garden lets one walk test every word that shares those letters.'],
    ['30,000 steps: one per word', 'Every word still has to be traced on the grid. The saving is that all words share each walk, not that walks disappear.'],
  ]),
];

export const mixedReview = [
  step('100,000 calls of “add this word” interleaved with 100,000 calls of “does any stored word start with this?”', [], 1, [
    ['A HashSet of the words', 'Exact lookups are O(L), but “starts with” would have to scan every stored word: up to 10¹⁰ comparisons.'],
    ['A trie: both operations walk at most L nodes', 'Yes. Prefix questions are the trigger. Each word shares the nodes of its beginning with every other word that starts the same way.'],
    ['Keep the words sorted and re-sort after each add', 'Re-sorting costs O(n log n) per add. A sorted array suits a dictionary that never changes.'],
  ]),
  step('A spell-checker only ever asks “is this exact word in the dictionary?”, a million times. Never prefixes.', [], 1, [
    ['A trie', 'It works, but it spends a node per letter on prefix structure you never use. Nothing here needs it.'],
    ['A HashSet<String>', 'Yes. One hash of the word (O(L)) and one lookup. A trie only wins when prefixes matter.'],
    ['A HashSet of every prefix of every word', 'That stores L strings per word and answers a question nobody asked.'],
  ]),
  step('Find every dictionary word that can be traced in a letter grid (adjacent cells, no cell reused within a word).', [], 2, [
    ['Run a grid search for each word separately', 'Correct, but it re-walks the same paths once per word: about 1.7 × 10¹¹ steps at LeetCode’s limits.'],
    ['Breadth-first search from every cell', 'BFS does not keep the per-path “cell already used” state that a word path needs; this is a path search, not a shortest-distance search.'],
    ['Plant the words in a trie and walk the grid and the trie in lockstep, pruning spent branches', 'Yes. One walk serves every word, dead prefixes stop the walk early, and pruning shrinks the garden as words are found.'],
  ]),
  step('Only “apple” was inserted, yet search("app") returns true. What is the bug?', [], 0, [
    ['search returns “walk finished” instead of the node’s isEnd flag', 'Yes. That is startsWith’s rule. search must return node.isEnd at the end of the walk.'],
    ['insert creates too many nodes', 'Insert created exactly a, p, p, l, e. The nodes are right; the final check is wrong.'],
    ['The children array should be a HashMap', 'The container doesn’t matter. Both versions need the end-of-word flag.'],
  ]),
  step('200,000 non-negative integers: the largest XOR of any two. Which plan?', [], 2, [
    ['Check every pair', 'About 2 × 10¹⁰ pairs. Correct, far too slow.'],
    ['Sort, then XOR each neighbouring pair', 'Neighbours in sorted order give the SMALLEST XOR, not the largest. On [2, 3, 5] neighbours give at most 6, but 2 ^ 5 = 7.'],
    ['A two-child trie over the bits, highest bit first; for each number, greedily take the opposite bit', 'Yes. A higher bit outweighs all lower bits together, so winning it greedily is safe. O(31 · n).'],
  ]),
  step('Autocomplete: after each keystroke show the 5 most popular completions, within 50 ms, over millions of phrases.', [], 1, [
    ['Walk to the prefix node, collect every word below it, sort by popularity', 'Under the prefix “a” that can be a large slice of the whole dictionary, on every keystroke.'],
    ['Each node keeps its own top-5 list, updated when counts change; a query reads one list', 'Yes. The work moves from query time to update time. Production typeahead systems rebuild these lists offline from search logs.'],
    ['One global heap of all phrases by popularity', 'A heap knows popularity but not prefixes; you would pop through unrelated phrases.'],
  ]),
  step('Count the words in a list that contain “ear” ANYWHERE (bear, early, hearth).', [], 2, [
    ['A trie of the words, then startsWith("ear")', 'A trie indexes beginnings. It finds early, but bear and hearth hide “ear” in the middle.'],
    ['Sort the words and binary search for “ear”', 'Sorting also groups by beginnings only, so this has the same blind spot.'],
    ['Check each word with contains, or build a structure over all suffixes', 'Yes. For a substring, every position is a possible start. A plain scan is fine for one question; many questions on fixed text call for a suffix array or suffix automaton.'],
  ]),
  step('A fixed dictionary of 2 million words, tight memory, many “words starting with this prefix” questions.', [], 1, [
    ['A trie with 26-slot arrays', 'With little sharing, 2 million words of 8 letters can need up to 16 million nodes × 26 slots = 416 million slots.'],
    ['Sort once; binary search for the first word ≥ the prefix, then read forward while words still start with it', 'Yes. Words sharing a prefix are contiguous in sorted order. O(L log n) per question, and the memory is just the words.'],
    ['A HashSet of every prefix', 'That stores up to 16 million prefix strings, and still cannot list the words, only say yes or no.'],
  ]),
];
