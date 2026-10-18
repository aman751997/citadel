# DryRun: interactive step-through

`<DryRun>` lets the learner step through an algorithm, see pointers, compared values, swaps and visited items highlighted, and (optionally) predict each move before it is revealed.

- Component: `src/components/DryRun.astro`
- Frame types, recorder, state machine, generators: `src/lib/dryrun.ts`
- View renderers (pure strings, also used for the no-JS fallback): `src/lib/dryrun-render.ts`
- Tests: `tests/dryrun.test.ts` (`node --experimental-strip-types --test tests/dryrun.test.ts`)

## Props

| prop | type | meaning |
|---|---|---|
| `title` | string | heading and accessible name |
| `frames` | `Frame[]` | the steps, in order |
| `predict` | boolean | Predict mode starts switched on. The toggle is shown whenever any frame has `predict`; the learner can always flip it |

A frame is `{ caption, views, predict? }`.

- `caption`: plain English, say WHY the move happens ("sum 9 > target 7, so the right pointer moves left: the largest value is too big for every remaining left partner"). It is read out via an `aria-live` region.
- `views`: one or more `View`s drawn together.
- `predict`: `{ question, options: string[], answer: number, explain }`. In Predict mode the question appears BEFORE this frame is revealed. A wrong pick is marked with an x and can be retried; the right pick shows a tick plus `explain`, then reveals the frame. "Skip question" is always available. Put the predict on the frame that SHOWS the move, not the frame before it.

## MDX usage

```mdx
import DryRun from '../components/DryRun.astro';
import { twoSumSortedFrames, recorder, tvars } from '../lib/dryrun';

<DryRun title="Two Sum II" frames={twoSumSortedFrames([1, 3, 4, 6, 8, 11], 10)} predict />
```

Frames are plain JSON, so you can also write them inline or build them with the recorder:

```mdx
export const frames = (() => {
  const r = recorder();
  r.frame('Start with i at 0.', [{ kind: 'array', name: 'nums', values: [3, 1, 2], pointers: [{ at: 0, label: 'i' }] }]);
  r.frame('3 > 1, so swap them: the bigger value must go right.', [{ kind: 'array', name: 'nums', values: [1, 3, 2], tones: { 0: 'swapped', 1: 'swapped' } }],
    { question: 'Swap or not?', options: ['Swap', 'Keep'], answer: 0, explain: 'Left is bigger than right.' });
  return r.frames;
})();

<DryRun title="One bubble step" frames={frames} />
```

## View schema

All views take an optional `name` (a small label above the view). Tones are never the only signal: a legend names every tone on screen and screen readers get a text description of each view.

Cell tones: `active | compared | swapped | visited | done | out | found`. Pointer/region colours: `gold | blue | green | purple | red | dim`.

| kind | fields | MDX / data example |
|---|---|---|
| `array` | `values`, `indices?` (default true), `join?` (e.g. `'→'` for lists), `pointers: [{at,label,tone?}]`, `regions: [{from,to,label?,tone?}]`, `tones: {index: tone}` | `{ kind:'array', name:'nums', values:[1,3,5,7], pointers:[{at:0,label:'lo'},{at:3,label:'hi',tone:'blue'}], regions:[{from:1,to:2,label:'window'}], tones:{0:'compared',3:'out'} }` |
| `grid` | `cells` (2-D, `null` = empty), `rowLabels?`, `colLabels?`, `tones: [{r,c,tone}]`, `pointers: [{r,c,label,tone?}]` | `{ kind:'grid', cells:[[0,1],[1,null]], colLabels:['a','b'], tones:[{r:1,c:0,tone:'active'}] }` |
| `stack` / `queue` / `set` | `items`, `changed?` (indices just added, flagged "new"), `removed?` (values just taken out, shown struck through), `note?`. Stack top is the last item; queue front is the first | `{ kind:'queue', name:'queue', items:['B','C'], changed:[1], removed:['A'] }` |
| `map` | `entries: [[key,value],...]`, `changed?`, `removed?`, `note?` | `{ kind:'map', name:'seen', entries:[['a',0],['b',1]], changed:[1] }` |
| `tree` | `root` (nested `{id?,v,l?,r?}`) or `array` (level-order, `null` = hole); `tones: {id: current\|visited\|queued\|done}`; `path: [id,...]` highlighted. Ids default to `String(v)` (nested) or the array index as a string | `{ kind:'tree', array:[5,3,8,1,4], tones:{'0':'visited','1':'current'}, path:['0','1'] }` |
| `graph` | `nodes: [{id,label?,x?,y?}]` (x,y in a 320 by 220 box; omitted = automatic circle), `edges: [{from,to,weight?,tone?: active\|used\|dim}]`, `directed?`, `tones: {id: nodeTone}` | `{ kind:'graph', directed:true, nodes:[{id:'A'},{id:'B'}], edges:[{from:'A',to:'B',weight:4,tone:'active'}], tones:{A:'done',B:'current'} }` |
| `recursion` | `nodes: [{id,parent?,label,edge?,tone?: exploring\|pruned\|solution\|undone}]`. Each frame lists the nodes so far, so the tree grows. To show an undo, set the node's tone to `undone` (dashed, struck through) | `{ kind:'recursion', nodes:[{id:'r',label:'[]',tone:'exploring'},{id:'a',parent:'r',label:'[1]',edge:'+1',tone:'undone'}] }` |
| `text` | `vars: [{name,value,changed?}]`. `changed` shows a CHANGED flag. Helper: `tvars(now, prev?)` computes the flags | `tvars({ left: 1, right: 4 }, { left: 0, right: 4 })` |

## Generators (`src/lib/dryrun.ts`)

Each returns `Frame[]`. The last frame has a `text` view with an `answer` variable (read it in tests with `lastVar(frames, 'answer')`). Every generator is tested against an independent brute force on random inputs.

```mdx
import * as dr from '../lib/dryrun';

<DryRun title="Two pointers" frames={dr.twoSumSortedFrames([1,3,4,6,8,11], 10)} predict />   {/* nums sorted ascending */}
<DryRun title="Sliding window" frames={dr.slidingWindowMaxSumFrames([2,1,5,1,3,2], 3)} predict />
<DryRun title="Binary search" frames={dr.binarySearchFrames([1,3,5,7,9,11], 11)} predict />   {/* sorted ascending; eliminated half is faded */}
<DryRun title="BFS" frames={dr.bfsFrames({ A:['B','C'], B:['A','D'], C:['A','D'], D:['B','C'] }, 'A')} predict />
<DryRun title="DFS" frames={dr.dfsFrames({ A:['B','C'], B:['A'], C:['A'] }, 'A')} />
<DryRun title="Subsets" frames={dr.subsetsBacktrackFrames([1,2,3])} predict />   {/* keep n <= 4 */}
<DryRun title="Fibonacci DP" frames={dr.fibDpFrames(7)} predict />
<DryRun title="0/1 knapsack" frames={dr.knapsackFrames([1,3,4],[15,20,30],5)} predict />   {/* weights, values, capacity */}
<DryRun title="Reverse a list" frames={dr.reverseListFrames([1,2,3,4])} predict />
```

- `bfsFrames` / `dfsFrames`: adjacency is `Record<string, string[]>` (list both directions for undirected graphs). Third argument `{ directed: true }` draws arrows. Node positions are automatic (circle).
- Keep inputs small: a dry run is for understanding, and frame count grows quickly (knapsack: one frame per cell).

## Accessibility and behaviour notes

- Back / Next / Play / Reset are real `<button>`s, speed is a `<select>`, Predict mode is a checkbox. Tab order follows the visual order.
- When a question appears, focus moves to its first option; after a correct answer focus returns to Next. While a question is pending, autoplay pauses and Next becomes "Skip question".
- The caption and the right/wrong feedback are separate `aria-live="polite"` regions. Right/wrong is shown with tick and cross text, not colour alone.
- Each view has a text `aria-label` (array contents, highlighted cells, pointers, stack top, node states, edge in use). SVG nodes have `<title>`s.
- Works at 360px: wide arrays, grids and trees scroll horizontally inside the card (no page overflow). `prefers-reduced-motion` removes all transitions.
- No JavaScript: the controls are hidden, the final state is drawn, and a numbered list of every caption is printed.
- The component stores nothing (no localStorage); progress tracking belongs to other components.
