// Playground for the Stacks lesson: three modes, every move made by the reader.
//   brackets   — the bracket matcher (push / pop-and-match / reject / accept)
//   waiting    — next warmer day with a waiting stack (pop: today answers it / push: it waits / done)
//   histogram  — largest rectangle: push, or pop and finalize with the width shown; a height-0 sentinel flushes
import { makeLab, type LabBase, type LabRow } from '../lab.ts';
import type { CellTone } from '../trace.ts';

export interface StackLabState extends LabBase {
  chars: string[];          // brackets: the input
  closers: string[];        // brackets: expected closers, bottom → top
  a: number[];              // waiting: temperatures · histogram: heights
  i: number;                // next unread position (today / arriving bar / next character)
  stack: number[];          // waiting, histogram: indexes, bottom → top
  answer: (number | null)[];// waiting: null = still waiting
  best: number;             // histogram: best area so far
  verdict: boolean | null;  // brackets: final answer
}

type Mode = 'brackets' | 'waiting' | 'histogram';
const PAIR: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const isOpener = (c: string) => c in PAIR;

const bracketCases = ['([]{})', '([)]', ')(', '(('];
const tempCases = [[73, 74, 75, 71, 69, 72, 76, 73], [60, 50, 40], [70, 70, 71], []];
const barCases = [[2, 1, 5, 6, 2, 3], [3, 4], [3, 3, 3], []];

const blank = { chars: [] as string[], closers: [] as string[], a: [] as number[], i: 0, stack: [] as number[], answer: [] as (number | null)[], best: 0, verdict: null };
function build(mode: Mode, input: string | number[]) {
  if (mode === 'brackets') return { ...blank, chars: [...String(input)] };
  const a = [...(input as number[])];
  return mode === 'waiting' ? { ...blank, a, answer: a.map(() => null) } : { ...blank, a };
}

// Build a fresh lab state from any input (used by tests for random cases).
export function fromInput(mode: Mode, input: string | number[]): StackLabState {
  return { mode, done: false, moves: 0, message: 'Say what is waiting, then choose the next move.', ...build(mode, input) };
}

const top = (s: StackLabState) => s.stack[s.stack.length - 1];
const curHeight = (s: StackLabState) => (s.i === s.a.length ? 0 : s.a[s.i]);
const list = (values: (string | number)[]) => `[${values.join(', ')}]`;

export const lab = makeLab<StackLabState>({
  brackets: {
    name: 'Bracket matcher',
    cases: bracketCases.length,
    actions: [
      { action: 'push', label: 'Push: an opener waits for its closer' },
      { action: 'match', label: 'Pop: the closer matches the top' },
      { action: 'reject', label: 'Reject: not valid' },
      { action: 'accept', label: 'Accept: valid' },
    ],
    create: v => build('brackets', bracketCases[v]),
    expected: s => {
      if (s.i === s.chars.length) return s.closers.length === 0 ? 'accept' : 'reject';
      const c = s.chars[s.i];
      if (isOpener(c)) return 'push';
      return s.closers.length > 0 && s.closers[s.closers.length - 1] === c ? 'match' : 'reject';
    },
    apply: (s, action) => {
      const c = s.chars[s.i];
      if (action === 'push') { s.closers.push(PAIR[c]); s.i++; s.message = `${c} is open. Pushed the closer it expects, ${PAIR[c]}. Only the top can be closed next.`; }
      else if (action === 'match') { s.closers.pop(); s.i++; s.message = `${c} matched the top and closed the most recent opener.`; }
      else if (action === 'reject') {
        s.done = true; s.verdict = false;
        s.message = s.i === s.chars.length ? `Rejected: ${s.closers.length} opener(s) were never closed (the stack still holds ${list(s.closers)}).`
          : s.closers.length === 0 ? `Rejected: ${c} arrived with nothing open, so it has nothing to close.`
          : `Rejected: the top expects ${s.closers[s.closers.length - 1]}, but ${c} arrived. The pairs would cross.`;
      } else { s.done = true; s.verdict = true; s.message = s.chars.length ? 'Accepted: every opener was closed, newest first, and the stack is empty.' : 'Accepted: an empty string has nothing open, so it is valid.'; }
    },
    reject: (s, action) => {
      const expected = lab.expected(s);
      const c = s.chars[s.i];
      const want = s.closers[s.closers.length - 1];
      if (action === 'accept' && s.i < s.chars.length) return `You have only read ${s.i} of ${s.chars.length} characters. A later character could still break the string.`;
      if ((action === 'push' || action === 'match') && s.i === s.chars.length) return 'The input is used up. There is nothing left to push or match; decide with what is on the stack.';
      if (expected === 'push') return action === 'match' ? `${c} is an opener. Nothing closes here; push the closer it expects, ${PAIR[c]}.` : `An opener is never wrong by itself: a later ${PAIR[c]} may close it. Push and read on.`;
      if (expected === 'match') return action === 'push' ? `${c} is a closer. Pushing it would leave it waiting for nothing. It matches the top ${want}, so pop.` : `The top expects ${want}, and ${c} is exactly that. This pair is fine.`;
      if (expected === 'accept') return 'Every opener was closed and the input is used up. That is what valid means.';
      // expected === 'reject'
      if (s.i === s.chars.length) return `The stack still holds ${list(s.closers)}: those openers were never closed. Leftovers mean invalid.`;
      if (s.closers.length === 0) return action === 'match' ? `The stack is empty: nothing is open, so ${c} has nothing to close. pop() would throw here.` : `${c} is a closer with nothing open. No later character can fix that.`;
      return action === 'match' ? `The top expects ${want}, but ${c} arrived. Reaching under the top would accept crossed pairs like "([)]".` : `${c} is a closer. It must match the top (${want}) now; pushing it hides the mismatch.`;
    },
    view: s => [
      { name: 'Input', cells: s.chars.map((c, i) => ({ value: c, label: i === s.i && !s.done ? 'NEXT' : undefined, tone: (i < s.i ? 'done' : i === s.i && !s.done ? 'hot' : undefined) as CellTone | undefined })), empty: 'Empty string' },
      { name: 'Stack of expected closers · bottom → top', cells: s.closers.map((c, i) => ({ value: c, label: i === s.closers.length - 1 ? 'TOP' : undefined, tone: 'hot' as CellTone })), empty: 'Empty: nothing is open' },
    ],
    describe: s => s.done ? `Verdict: ${s.verdict ? 'valid' : 'invalid'}.` : s.i === s.chars.length ? `Input used up. ${s.closers.length} opener(s) still waiting.` : `Next character: ${s.chars[s.i]}. Open and waiting: ${s.closers.length}.`,
  },

  waiting: {
    name: 'Next warmer day',
    cases: tempCases.length,
    actions: [
      { action: 'pop', label: 'Pop: today answers it' },
      { action: 'push', label: 'Push: today waits' },
      { action: 'finish', label: 'Done: leftovers get 0' },
    ],
    create: v => build('waiting', tempCases[v]),
    expected: s => s.i === s.a.length ? 'finish' : s.stack.length && s.a[s.i] > s.a[top(s)] ? 'pop' : 'push',
    apply: (s, action) => {
      if (action === 'pop') {
        const day = s.stack.pop()!;
        s.answer[day] = s.i - day;
        s.message = `Day ${s.i} (${s.a[s.i]}°) answers day ${day} (${s.a[day]}°): ${s.i} − ${day} = ${s.i - day}.`;
      } else if (action === 'push') {
        s.stack.push(s.i);
        s.message = `Day ${s.i} (${s.a[s.i]}°) waits on top. From bottom to top, the waiting temperatures never increase.`;
        s.i++;
      } else {
        const left = s.answer.filter(x => x === null).length;
        s.answer = s.answer.map(x => x ?? 0);
        s.done = true;
        s.message = `Done. ${left} day(s) never met a warmer day and keep 0. Answer: ${list(s.answer as number[])}.`;
      }
    },
    reject: (s, action) => {
      const expected = lab.expected(s);
      const t = top(s);
      if (expected === 'finish') return action === 'pop' ? 'Every day has been read. Nobody else will arrive to answer the leftovers.' : 'There are no more days to push. Finish: the leftovers never met a warmer day.';
      if (action === 'finish') return `Day ${s.i} hasn't been read yet. It might answer someone who is waiting.`;
      if (expected === 'pop') return `Day ${s.i} (${s.a[s.i]}°) is warmer than day ${t} (${s.a[t]}°) on top. Pushing now would bury a day whose answer just arrived. Answer it first.`;
      if (!s.stack.length) return 'Nobody is waiting, so there is nothing to pop. Today waits.';
      return `${s.a[s.i]}° is not warmer than ${s.a[t]}° on top${s.a[s.i] === s.a[t] ? ' (equal is not warmer)' : ''}. Day ${t} keeps waiting, and so does everyone under it: they are at least as warm.`;
    },
    view: s => [
      { name: 'Temperatures', cells: s.a.map((v, i) => ({ value: String(v), label: i === s.i && !s.done ? 'TODAY' : undefined, tone: (s.answer[i] !== null ? 'done' : s.stack.includes(i) ? 'hot' : undefined) as CellTone | undefined })), empty: 'No days at all' },
      { name: 'Waiting · bottom → top', cells: s.stack.map((d, k) => ({ value: `d${d} · ${s.a[d]}`, label: k === s.stack.length - 1 ? 'TOP' : undefined, tone: 'hot' as CellTone })), empty: 'Nobody waiting' },
      { name: 'Answer (days to wait)', cells: s.answer.map(x => ({ value: x === null ? '·' : String(x), tone: (x === null ? undefined : 'done') as CellTone | undefined })), empty: 'Empty answer' },
    ],
    describe: s => s.done ? `Answer: ${list(s.answer as number[])}.` : s.i === s.a.length ? `All ${s.a.length} days read. ${s.stack.length} still waiting.` : `Today is day ${s.i} (${s.a[s.i]}°). ${s.stack.length ? `Top of the stack: day ${top(s)} (${s.a[top(s)]}°).` : 'Nobody is waiting.'}`,
  },

  histogram: {
    name: 'Histogram: finalize rectangles',
    cases: barCases.length,
    actions: [
      { action: 'push', label: 'Push: the arriving bar is taller, it waits' },
      { action: 'pop', label: 'Pop: finalize the top bar' },
      { action: 'finish', label: 'Done: report the best area' },
    ],
    create: v => build('histogram', barCases[v]),
    expected: s => s.stack.length && s.a[top(s)] >= curHeight(s) ? 'pop' : s.i === s.a.length ? 'finish' : 'push',
    apply: (s, action) => {
      if (action === 'pop') {
        const m = s.stack.pop()!;
        const left = s.stack.length ? top(s) : -1;
        const width = s.i - left - 1;
        const area = s.a[m] * width;
        s.best = Math.max(s.best, area);
        s.message = `Bar ${m} (height ${s.a[m]}) is finalized. It stretches from index ${left + 1} to ${s.i - 1}: width = ${left < 0 ? `i = ${s.i} (nothing shorter on its left)` : `${s.i} − ${left} − 1 = ${width}`}, area ${s.a[m]} × ${width} = ${area}. Best = ${s.best}.`;
      } else if (action === 'push') {
        s.stack.push(s.i);
        s.message = `Bar ${s.i} (height ${s.a[s.i]}) waits. Heights on the stack increase strictly from bottom to top.`;
        s.i++;
      } else { s.done = true; s.message = `Done. Largest rectangle: ${s.best}.`; }
    },
    reject: (s, action) => {
      const expected = lab.expected(s);
      const t = top(s);
      const h = curHeight(s);
      const who = s.i === s.a.length ? 'The sentinel (height 0)' : `Bar ${s.i} (height ${h})`;
      if (expected === 'finish') return action === 'pop' ? 'The stack is empty: every bar has been finalized.' : 'No bars are left to push; the sentinel has done its job. Report the best area.';
      if (expected === 'pop') {
        if (action === 'finish') return `Bars are still waiting on the stack. Their rectangles were never measured. ${who} is no taller than bar ${t}, so finalize it.`;
        return `${who} is no taller than bar ${t} (height ${s.a[t]}). That bar's rectangle can't stretch past index ${s.i}, so it is complete. Finalize it before pushing.`;
      }
      if (action === 'finish') return `Bar ${s.i} hasn't been read yet, and the sentinel hasn't flushed the stack. Rectangles are still unmeasured.`;
      if (!s.stack.length) return 'The stack is empty; there is nothing to finalize. The arriving bar waits.';
      return `${who} is taller than bar ${t} (height ${s.a[t]}), so that bar's rectangle can still stretch right. Push and keep going.`;
    },
    view: s => {
      const cells = s.a.map((v, i) => ({ value: String(v), label: i === s.i && !s.done ? 'i' : s.stack.length && i === top(s) ? 'TOP' : undefined, tone: (s.stack.includes(i) ? 'hot' : i < s.i ? 'done' : undefined) as CellTone | undefined }));
      cells.push({ value: '0', label: s.i === s.a.length && !s.done ? 'i · SENTINEL' : 'SENTINEL', tone: 'ghost' as CellTone });
      return [
        { name: 'Heights (+ height-0 sentinel)', cells },
        { name: 'Stack · bottom → top', cells: s.stack.map((d, k) => ({ value: `i${d} · ${s.a[d]}`, label: k === s.stack.length - 1 ? 'TOP' : undefined, tone: 'hot' as CellTone })), empty: 'Empty: nothing shorter on the left' },
      ];
    },
    describe: s => s.done ? `Largest rectangle: ${s.best}.` : `Arriving height: ${curHeight(s)}${s.i === s.a.length ? ' (sentinel)' : ''}. Best so far: ${s.best}.`,
  },
}, 'Gold = waiting on the stack · green = answered or finalized · dashed = the sentinel · positions start at 0');
