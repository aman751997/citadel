// Independent practice for the Tries lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  walk: 'Walk a tree of shared beginnings, one letter per step; a flag marks where words end',
  branch: 'The same tree, but try every child wherever the query leaves a letter open',
  lockstep: 'Explore the grid while walking a tree of all the words in lockstep; prune spent branches',
  counts: 'Keep counters on every node of the tree of shared beginnings',
  bits: 'A two-child tree over the bits, highest bit first; greedily take the opposite bit',
  topk: 'Let every node of the tree keep its own short ranked list',
  other: 'Another tool fits better than a tree of beginnings (hash set, plain scan)',
} as const;

export const conceptIds = [
  'distinct-prefixes', 'search-or-prefix', 'wildcard-count', 'grid-words', 'count-prefix', 'shortest-root',
  'built-word', 'three-suggestions', 'max-xor', 'top-k', 'exact-lookup', 'substring',
] as const;
type ConceptId = typeof conceptIds[number];

const quote = (s: string) => `“${s}”`;
const list = (ws: string[]) => ws.map(quote).join(', ');
const rotate = <T,>(a: T[], by: number) => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);

// ---------- small, deliberately plain helpers ----------
function traceable(board: string[], word: string): boolean {
  const R = board.length, C = board[0].length, used = board.map(r => [...r].map(() => false));
  const go = (r: number, c: number, i: number): boolean => {
    if (r < 0 || c < 0 || r >= R || c >= C || used[r][c] || board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    used[r][c] = true;
    const ok = go(r + 1, c, i + 1) || go(r - 1, c, i + 1) || go(r, c + 1, i + 1) || go(r, c - 1, i + 1);
    used[r][c] = false;
    return ok;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}
const prefixes = (ws: string[]) => new Set(ws.flatMap(w => [...w].map((_, i) => w.slice(0, i + 1))));

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'distinct-prefixes': {
      const bases = [['car', 'cat', 'cart', 'dog'], ['apple', 'app', 'apt', 'bat'], ['sea', 'seat', 'see', 'tea', 'ten'], ['a', 'ab', 'abc', 'abd'], ['in', 'inn', 'tin', 'tint', 'ten']];
      const extra = ['do', 'cab', 'zoo'][Math.floor(v / 5) % 3];
      const words = rotate([...bases[v % 5], extra], v % 3);
      const answer = prefixes(words).size;
      return {
        topic: 'Shared beginnings, stored once', section: 'implement-trie', strategy: 'walk',
        prompt: `Words: ${list(words)}. Counting each distinct non-empty prefix once (so “ca”, shared by “car” and “cat”, counts once), how many distinct non-empty prefixes do these words have?`,
        question: 'Enter the count.', answer,
        hints: ['Group the words by their first letter; each group shares that letter.', 'Picture a tree whose edges carry one letter. Every distinct prefix is exactly one node.', 'Count new nodes word by word: a letter costs a node only if no earlier word already created that prefix.'],
        rubric: ['Each distinct prefix corresponds to one node below the empty root.', 'A word adds only the letters past its longest prefix already present.', 'Insert is O(L) per word; total nodes are at most the total number of letters.'],
        explanation: `There are ${answer} distinct non-empty prefixes, so a tree of shared beginnings needs ${answer} nodes below its root.`,
      };
    }
    case 'search-or-prefix': {
      const cases: [string[], 'search' | 'prefix', string][] = [
        [['apple'], 'search', 'app'], [['apple'], 'prefix', 'app'], [['apple', 'app'], 'search', 'app'], [['car', 'cart', 'dog'], 'search', 'ca'],
        [['car', 'cart', 'dog'], 'prefix', 'ca'], [['car', 'cart', 'dog'], 'prefix', 'dot'], [['sea', 'seat'], 'search', 'seat'], [['sea', 'seat'], 'prefix', 'seats'],
        [['in', 'inn', 'tin'], 'search', 'ti'], [['in', 'inn', 'tin'], 'prefix', 'i'],
      ];
      const [words, kind, text] = cases[v % cases.length];
      const answer = kind === 'search' ? words.includes(text) : words.some(w => w.startsWith(text));
      return {
        topic: 'Whole word or just a beginning?', section: 'implement-trie', strategy: 'walk',
        prompt: `A dictionary holds exactly ${list(words)}. ${kind === 'search' ? `Is ${quote(text)} stored as a whole word?` : `Does any stored word start with ${quote(text)}?`}`,
        question: 'Enter yes or no.', answer,
        hints: ['Both questions walk the same letters from the start.', 'If a letter has no branch, the answer is no for both.', kind === 'search' ? 'At the end of the walk, only the end-of-word flag decides.' : 'Finishing the walk is enough; no end-of-word flag needed.'],
        rubric: ['Both operations walk one node per letter: O(L).', 'A missing branch ends the walk with “no”.', 'Whole-word lookup checks the end flag; the beginning check does not.'],
        explanation: kind === 'prefix'
          ? (answer ? `Yes: ${quote(words.find(w => w.startsWith(text))!)} starts with ${quote(text)}; the walk finishes, and that is enough.` : `No: the walk falls off a missing branch before ${quote(text)} is complete.`)
          : answer ? `Yes: the walk finishes on a node carrying the end-of-word flag.`
            : words.some(w => w.startsWith(text)) ? `No: ${quote(text)} is only a beginning of ${list(words.filter(w => w.startsWith(text)))}; its node has no end flag.` : `No: no stored word even starts with ${quote(text)}.`,
      };
    }
    case 'wildcard-count': {
      const cases: [string[], string][] = [
        [['bad', 'dad', 'mad', 'pad', 'bat'], '.ad'], [['bad', 'dad', 'mad', 'pad', 'bat'], 'b..'], [['bad', 'dad', 'mad'], '..'],
        [['cat', 'cot', 'cut', 'coat', 'cart'], 'c.t'], [['cat', 'cot', 'cut', 'coat', 'cart'], 'c..t'], [['ab', 'cd', 'ce', 'abc'], '.e'], [['apple', 'apply', 'ample'], 'a.pl.'],
      ];
      const [words, p] = cases[v % cases.length];
      const answer = words.filter(w => w.length === p.length && [...p].every((c, i) => c === '.' || c === w[i])).length;
      return {
        topic: 'Queries with blanks', section: 'wildcard-search', strategy: 'branch',
        prompt: `Stored words: ${list(words)}. In a query, “.” stands for exactly one letter of any kind. How many stored words match the query ${quote(p)}?`,
        question: 'Enter the count.', answer,
        hints: ['A letter in the query allows one branch; a dot allows every branch.', 'Explore the stored words letter by letter, splitting at each dot.', 'A match must end exactly when the query ends, on a whole word.'],
        rubric: ['Letters follow one child; dots try every child.', 'The match must land on an end-of-word node at the query’s length.', 'With d dots the work is O(26^d · L), capped by the number of nodes.'],
        explanation: `${answer} stored word(s) match ${quote(p)}.`,
      };
    }
    case 'grid-words': {
      const cases: [string[], string[]][] = [
        [['oaan', 'etae', 'ihkr', 'iflv'], ['oath', 'pea', 'eat', 'rain']],
        [['abce', 'sfcs', 'adee'], ['abcced', 'see', 'abcb', 'sfda', 'ecse']],
        [['ab', 'cd'], ['abdc', 'abcd', 'acdb', 'ba', 'ad']],
        [['cat', 'ore', 'gin'], ['cat', 'core', 'tern', 'gore', 'rot', 'nit']],
      ];
      const [board, base] = cases[v % cases.length];
      const words = rotate(base, Math.floor(v / cases.length) % base.length);
      const answer = words.filter(w => traceable(board, w)).length;
      return {
        topic: 'Many words, one grid', section: 'word-search-ii', strategy: 'lockstep',
        prompt: `A letter grid has rows ${board.map(quote).join(' / ')}. A word is traced by starting on any cell and stepping up, down, left or right, never reusing a cell within one word. Imagine 30,000 candidate words; here are ${words.length}: ${list(words)}. How many of these can be traced?`,
        question: 'Enter the count.', answer,
        hints: ['Tracing each word separately repeats the same grid walks over and over.', 'Put all the words in one tree of beginnings; walk the grid and the tree together.', 'Stop a walk as soon as the letters so far are no word’s beginning; record a word at its end node once.'],
        rubric: ['One walk of the grid tests every word sharing those letters.', 'Found words are cleared so they are reported once; dead branches are pruned.', 'Cells are marked while on the current path and restored on the way back.'],
        explanation: `${answer} of the words can be traced: ${list(words.filter(w => traceable(board, w))) || 'none'}.`,
      };
    }
    case 'count-prefix': {
      const cases: [string[], string, string][] = [
        [['apple', 'app', 'apple', 'apply', 'ape', 'bat'], 'apple', 'app'],
        [['apple', 'app', 'apple', 'apply', 'ape', 'bat'], 'app', 'ap'],
        [['tea', 'ten', 'tea', 'team', 'to', 'tea'], 'tea', 'tea'],
        [['in', 'inn', 'inn', 'ink', 'tin'], 'inn', 'in'],
        [['go', 'gone', 'good', 'go', 'gold'], 'go', 'go'],
      ];
      const [base, removed, p] = cases[v % cases.length];
      const adds = rotate(base, Math.floor(v / cases.length) % base.length);
      const bag = [...adds];
      bag.splice(bag.indexOf(removed), 1);
      const answer = bag.filter(w => w.startsWith(p)).length;
      return {
        topic: 'Counting beginnings in a bag of words', section: 'count-and-erase', strategy: 'counts',
        prompt: `A word bag starts empty. Add, in order: ${list(adds)} (repeats are separate copies). Then remove one copy of ${quote(removed)}. How many words in the bag now start with ${quote(p)}? Millions of such questions follow, so each should cost only the length of the beginning.`,
        question: 'Enter the count.', answer,
        hints: ['Walking all words below a beginning costs too much per question.', 'Each node could remember how many stored words pass through it.', 'Adding increments the counter on every node of the word’s path; removing decrements the same counters.'],
        rubric: ['pass = number of stored words through a node (duplicates included); end = words ending there.', 'The answer is pass at the node of the beginning: O(L).', 'Removal decrements along the path and unlinks a child whose pass drops to 0.'],
        explanation: `After the removal, ${answer} word(s) start with ${quote(p)}.`,
      };
    }
    case 'shortest-root': {
      const cases: [string[], string][] = [
        [['cat', 'bat', 'rat'], 'the cattle was rattled by the battery'],
        [['a', 'b', 'c'], 'aadsfasf absbs bbab cadsfafs'],
        [['a', 'aa', 'aaa', 'aaaa'], 'a aa a aaaa aaa aaa aaa aaaaaa bbb baba ababa'],
        [['ca', 'cat', 'do'], 'cattle dog dodge cabin crab'],
        [['re', 'red', 'un', 'under'], 'redo undo unless rebuild ready under'],
      ];
      const [base, sentence] = cases[v % cases.length];
      const roots = rotate(base, Math.floor(v / cases.length) % base.length);
      const answer = sentence.split(' ').map(w => roots.filter(r => w.startsWith(r)).sort((x, y) => x.length - y.length)[0] ?? w).join(' ');
      return {
        topic: 'The shortest root that fits', section: 'replace-words', strategy: 'walk',
        prompt: `Roots: ${list(roots)}. In the sentence ${quote(sentence)}, replace every word by the SHORTEST root that the word starts with; leave a word unchanged if no root fits. What is the new sentence?`,
        question: 'Enter the new sentence, words separated by single spaces.', answer,
        hints: ['Testing every root against every word repeats work on shared beginnings.', 'Store the roots in a tree of beginnings; walk each word from the start.', 'The first end-of-root node met on the walk is the shortest root. A missing branch first means no root fits.'],
        rubric: ['Roots go in the tree once; each sentence word is one walk.', 'Stop at the first end-of-root node: that prefix is the shortest root.', 'O(total letters of roots + total letters of the sentence).'],
        explanation: `The sentence becomes ${quote(answer)}.`,
      };
    }
    case 'built-word': {
      const bases = [['w', 'wo', 'wor', 'worl', 'world'], ['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple'], ['b', 'br', 'bre', 'brea', 'break', 'a', 'at', 'ate'], ['t', 'ti', 'tig', 'tiger', 'to', 'top', 'tops'], ['m', 'mo', 'moo', 'mood', 'mi', 'mil', 'mild', 'milk']];
      const base = bases[v % bases.length];
      const words = rotate(base, Math.floor(v / bases.length) % base.length);
      const set = new Set(words);
      let answer = '';
      for (const w of words) if ([...w].every((_, i) => set.has(w.slice(0, i + 1))) && (w.length > answer.length || (w.length === answer.length && w < answer))) answer = w;
      return {
        topic: 'Built one letter at a time', section: 'longest-word', strategy: 'walk',
        prompt: `Words: ${list(words)}. Find the longest word in the list that can be built one letter at a time, where every shorter beginning of it is also in the list. Break ties by choosing the alphabetically smallest. Which word is it?`,
        question: 'Enter the word.', answer,
        hints: ['A word qualifies only if each of its beginnings is itself a stored word.', 'In a tree of beginnings, that means every node on its path is an end-of-word node.', 'Explore children alphabetically, entering only end-of-word nodes; replace the best only when strictly longer.'],
        rubric: ['Only paths made entirely of end-of-word nodes count.', 'Alphabetical exploration plus “strictly longer” keeps the smallest among equals.', 'O(total letters) after building the tree.'],
        explanation: `${quote(answer)} is the longest buildable word.`,
      };
    }
    case 'three-suggestions': {
      const cases: [string[], string][] = [
        [['mobile', 'mouse', 'moneypot', 'monitor', 'mousepad'], 'mouse'],
        [['havana'], 'tatiana'],
        [['bags', 'baggage', 'banner', 'box', 'cloths'], 'bags'],
        [['car', 'card', 'care', 'cart', 'cat', 'cab'], 'cart'],
      ];
      const [base, typed] = cases[v % cases.length];
      const products = rotate(base, Math.floor(v / cases.length) % base.length);
      const k = 1 + (Math.floor(v / 2) % typed.length);
      const p = typed.slice(0, k);
      const shown = [...products].sort().filter(x => x.startsWith(p)).slice(0, 3);
      const answer = shown.length ? shown.join(' ') : 'none';
      return {
        topic: 'Three suggestions per keystroke', section: 'search-suggestions', strategy: 'topk',
        prompt: `Products: ${list(products)}. A customer types ${quote(typed)}. After each letter, the box shows up to three products that start with the letters typed so far, alphabetically smallest first. What does it show after the first ${k} letter(s), ${quote(p)}?`,
        question: 'Enter the products in order, separated by single spaces (or “none”).', answer,
        hints: ['Every keystroke asks the same kind of question for a longer beginning.', 'Sort the products first; then the three smallest with a given beginning are the first three met.', 'Either keep up to three words on each node of a tree built from the sorted list, or binary search the sorted list for the first word ≥ the beginning.'],
        rubric: ['Sorted order makes “three smallest” the same as “first three inserted”.', 'Each node’s list is ready before anyone types: O(1) per keystroke after the walk.', 'Once a branch is missing, every later keystroke shows nothing.'],
        explanation: shown.length ? `After ${quote(p)} the box shows ${shown.join(', ')}.` : `No product starts with ${quote(p)}, so the box is empty.`,
      };
    }
    case 'max-xor': {
      const bases = [[3, 10, 5, 25, 2, 8], [2, 3, 5], [14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70], [8, 1, 2, 12, 7, 6], [16, 1, 4, 9, 30]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      let answer = 0;
      for (const x of a) for (const y of a) answer = Math.max(answer, x ^ y);
      return {
        topic: 'The largest XOR pair', section: 'max-xor', strategy: 'bits',
        prompt: `Numbers: [${a.join(', ')}]. What is the largest value of x XOR y over all pairs x, y from the list? In the real task there are 200,000 numbers, so checking every pair is too slow.`,
        question: 'Enter the largest XOR.', answer,
        hints: ['A 1 in a higher bit is worth more than all lower bits together.', 'Store each number as a path of bits, highest first, in a tree with two children per node.', 'For each number, walk down preferring the opposite bit at every level; that greedy walk finds its best partner.'],
        rubric: ['Greedy is safe because bit b outweighs bits b − 1 … 0 combined.', 'Each insert and each query walks 31 levels: O(31 · n).', 'Insert before querying so the tree is never empty.'],
        explanation: `The largest XOR is ${answer}.`,
      };
    }
    case 'top-k': {
      const logs: [string, number][][] = [
        [['car', 5], ['cart', 3], ['cat', 5], ['care', 2], ['dog', 4]],
        [['sea', 4], ['seat', 9], ['see', 4], ['seen', 1], ['tea', 7]],
        [['apple', 3], ['app', 6], ['apply', 3], ['ape', 2], ['bat', 8]],
      ];
      const log = logs[v % logs.length];
      const p = [['ca', 'c', 'car'], ['se', 's', 'see'], ['ap', 'a', 'app']][v % logs.length][Math.floor(v / logs.length) % 3];
      const k = 2 + (v % 2);
      const top = log.filter(([w]) => w.startsWith(p)).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, k).map(([w]) => w);
      return {
        topic: 'Most popular completions', section: 'top-k-autocomplete', strategy: 'topk',
        prompt: `A search box has logged these queries with their search counts: ${log.map(([w, c]) => `${quote(w)} ×${c}`).join(', ')}. When someone types ${quote(p)}, it shows the ${k} most-searched queries starting with those letters, most searched first, ties alphabetical. It must answer in under 50 ms on millions of queries. What does it show?`,
        question: 'Enter the queries in order, separated by single spaces.', answer: top.join(' '),
        hints: ['Collecting and sorting everything below a beginning on every keystroke is too slow for short beginnings.', 'Let each node keep its own best-k list, ready before anyone types.', 'When a query’s count rises, refresh the lists on the nodes along its path: add it if missing, re-sort, trim to k.'],
        rubric: ['Each node caches the top k of its own subtree by (count desc, word asc).', 'A count increase touches only the nodes on that query’s path.', 'Reading a suggestion list is O(length of what was typed + k).'],
        explanation: `The box shows ${top.join(', ')}.`,
      };
    }
    case 'exact-lookup': {
      const dicts = [['apple', 'banana', 'cherry', 'date', 'fig'], ['red', 'green', 'blue', 'cyan'], ['sun', 'moon', 'star', 'comet', 'nova']];
      const lookups = [['apple', 'app', 'fig', 'grape', 'cherry'], ['blue', 'blu', 'cyan', 'teal'], ['star', 'stars', 'moon', 'mo', 'nova', 'sun']];
      const d = rotate(dicts[v % 3], Math.floor(v / 3) % dicts[v % 3].length), l = lookups[v % 3];
      const answer = l.filter(x => d.includes(x)).length;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A spell-checker holds ${list(d)} (in reality, 1 million words). It only ever asks “is this exact word present?” — never anything about beginnings. Of the lookups ${list(l)}, how many find their word?`,
        question: 'Enter the number of hits.', answer,
        hints: ['Does any question here involve a beginning, a pattern, or an order?', 'Only whole words are ever looked up.', 'A hash set answers each lookup with one hash of the word.'],
        rubric: ['No prefix questions means no reason to store prefix structure.', 'A HashSet<String> lookup is O(L) to hash plus O(1) expected.', 'A tree of beginnings would work but spends a node per letter for nothing.'],
        explanation: `${answer} lookup(s) hit. A hash set fits: the prefix structure of a letter tree buys nothing here.`,
      };
    }
    case 'substring': {
      const cases: [string[], string][] = [
        [['bear', 'early', 'hearth', 'heat', 'ear'], 'ear'],
        [['planet', 'plan', 'airplane', 'lane', 'cane'], 'lan'],
        [['stone', 'tone', 'notes', 'onset', 'one'], 'on'],
      ];
      const [base, s] = cases[v % cases.length];
      const words = rotate(base, Math.floor(v / cases.length) % base.length);
      const answer = words.filter(w => w.includes(s)).length;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Words: ${list(words)}. How many of them contain ${quote(s)} somewhere — anywhere in the word, not only at the start?`,
        question: 'Enter the count.', answer,
        hints: ['Is the letter sequence required to be at the beginning?', 'A tree of beginnings only finds words that START with the sequence.', 'Scan each word for the sequence; for many questions over fixed text, index every suffix instead.'],
        rubric: ['A letter tree of the words indexes beginnings only.', 'A substring may start at any position, so every position is a candidate.', 'One question: a plain scan with contains. Many: a suffix array or suffix automaton.'],
        explanation: `${answer} word(s) contain ${quote(s)}. A tree of word beginnings would miss the ones where it sits in the middle.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-tries-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
