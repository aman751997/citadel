// Three-step hint ladders for every <HintLadder> in tries.mdx.
export const hints: Record<string, [string, string, string]> = {
  trie: [
    'Words that start the same way could share the storage for that start. What would a tree look like if each edge carried one letter?',
    'A node holds 26 child slots (one per letter) and a boolean isEnd. The root holds no letter. insert, search and startsWith all walk from the root, one letter per step.',
    'insert: create missing children as you walk, then set isEnd on the last node. search: walk; a missing child means false; at the end return node.isEnd. startsWith: the same walk, but reaching the end is enough.',
  ],
  wildcard: [
    'Without dots this is Chapter 1. What changes at a position where any letter may stand?',
    'At a dot you cannot pick one child — try every non-null child, and succeed if any of them succeeds. That is a depth-first search over the children.',
    'search(word, i, node): if i == length return node.isEnd. If word[i] is a letter, recurse into that one child (false if missing). If it is a dot, loop over all 26 children and return true on the first child whose recursion succeeds; false after the loop.',
  ],
  wordSearch: [
    'Searching for each word separately repeats the same grid walks thousands of times. Could one walk of the grid serve every word at once?',
    'Put the words in a trie and store the whole word on its end node. Start a DFS from every cell, carrying the trie node: move to a neighbour only if the trie has a child for its letter.',
    'In the DFS: look up the child for this cell; if null, return. If child.word != null, record it and set it to null. Mark the cell, recurse into 4 neighbours, unmark. On the way back, if the child has no children and no word, unlink it from its parent (prune).',
  ],
  countErase: [
    'Counting words that start with a prefix should not mean walking the whole subtree. What could each node remember as words pass through it?',
    'Keep two counters per node: pass (how many stored words go through or end at this node) and end (how many end exactly here). Duplicates simply count twice.',
    'insert: pass++ on every node walked, end++ on the last. countWordsStartingWith = pass at the prefix node; countWordsEqualTo = end at the word node. erase: decrement the same counters; when a child’s pass reaches 0, unlink it and stop — nothing below is alive.',
  ],
  replaceWords: [
    'For each word in the sentence you want the SHORTEST root that is a prefix of it. Which walk finds the shortest one first?',
    'Put the roots in a trie. Walk each sentence word letter by letter from the root.',
    'Return the prefix at the FIRST node with isEnd set. If a branch is missing before any bloom, or the word runs out, keep the word unchanged. Join the results with single spaces.',
  ],
  longestWord: [
    'A word qualifies only if every one of its prefixes is also a word. In a trie, what does that say about the path to it?',
    'Every node on the path (except the root) must have isEnd set. So only walk into children that bloom.',
    'DFS from the root, visiting children a..z, entering a child only if it is an end node. Replace the best only when the depth is STRICTLY greater: a..z order then keeps the lexicographically smallest of the longest words.',
  ],
  suggestions: [
    'After each typed letter you need the three smallest words with that prefix. Could the answer be prepared before anyone types?',
    'Sort the products first. Insert them in sorted order into a trie where each node keeps a list of at most three words.',
    'While inserting, append the word to each node on its path whose list holds fewer than three. Then walk the search word: each node’s list is that step’s answer; once a branch is missing, every later step answers an empty list.',
  ],
  maxXor: [
    'The highest bit where two numbers differ decides more than all the lower bits together. Which bit should you try to win first?',
    'Store every number as a 31-bit path, highest bit first, in a tree with two children per node (bit 0 and bit 1).',
    'For each number x, walk from bit 30 down: prefer the child with the opposite bit (that bit of the XOR becomes 1); otherwise take the same bit. Insert x before querying so the tree is never empty; keep the best result.',
  ],
  typeahead: [
    'A query must answer instantly, so the ranking cannot be computed by walking a whole subtree each time. What could each node keep ready?',
    'Each node keeps its own list of the best K words below it (highest count first, ties alphabetical). Counts live in a map from word to count.',
    'record(word): bump its count, then for every node on its path (root included) add the word if missing, re-sort, and trim to K. suggest(prefix): walk to the prefix node and return a copy of its list — or nothing if a branch is missing.',
  ],
};
