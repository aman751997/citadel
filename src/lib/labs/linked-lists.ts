// The Ferry Guild's practice harbour: three linked-list playgrounds built on the shared makeLab engine.
//   reverse — the four-line reversal dance, one line per button; a wrong order is caught and explained
//   cycle   — Slow and Fast race; the reader decides when a meeting or a dead end proves the answer
//   gap     — remove the nth island from the end by opening a gap of n + 1 ferries from a dummy
// Islands are node indexes; `next[i]` is island i's single ferry rope (null = leads nowhere).
import { makeLab, type LabBase, type LabRow } from '../lab.ts';
import type { TraceCell } from '../trace.ts';

type Ref = number | null;
export type LinkedMode = 'reverse' | 'cycle' | 'gap';
export interface LinkedLabState extends LabBase {
  vals: number[];
  next: Ref[];
  // reverse
  prev: Ref; cur: Ref; saved: Ref; hasSaved: boolean; phase: number;
  // cycle
  slow: Ref; fast: Ref; moved: boolean; verdict: 'cycle' | 'none' | null; pos: number;
  // gap: positions 0 = dummy, 1..len = islands, len + 1 = null
  n: number; lead: number; trail: number; removed: number | null;
}
export interface LinkedInput { vals: number[]; pos?: number; n?: number }

const reverseCases: LinkedInput[] = [{ vals: [1, 2, 3, 4, 5] }, { vals: [7] }, { vals: [] }, { vals: [2, 2, 9] }];
const cycleCases: LinkedInput[] = [{ vals: [3, 2, 0, -4], pos: 1 }, { vals: [7, 7, 7, 7], pos: -1 }, { vals: [], pos: -1 }, { vals: [1, 2], pos: 0 }];
const gapCases: LinkedInput[] = [{ vals: [1, 2, 3, 4, 5], n: 2 }, { vals: [1], n: 1 }, { vals: [1, 2], n: 2 }, { vals: [4, 4, 4], n: 1 }];

type Core = Omit<LinkedLabState, 'mode' | 'done' | 'moves' | 'message'>;
function build(mode: LinkedMode, input: LinkedInput): Core {
  const vals = [...input.vals];
  const pos = mode === 'cycle' && input.pos !== undefined && input.pos >= 0 && input.pos < vals.length ? input.pos : -1;
  const next: Ref[] = vals.map((_, i) => (i + 1 < vals.length ? i + 1 : pos >= 0 ? pos : null));
  const head: Ref = vals.length ? 0 : null;
  return {
    vals, next, pos,
    prev: null, cur: mode === 'reverse' ? head : null, saved: null, hasSaved: false, phase: 0,
    slow: mode === 'cycle' ? head : null, fast: mode === 'cycle' ? head : null, moved: false, verdict: null,
    n: mode === 'gap' ? Math.max(1, Math.min(input.n ?? 1, vals.length)) : 0, lead: 0, trail: 0, removed: null,
  };
}
// Build a full playground state from any input (used by tests for random inputs).
export function fromInput(mode: LinkedMode, input: LinkedInput): LinkedLabState {
  return { done: false, moves: 0, message: 'Say what is settled, then choose the next move.', ...build(mode, input), mode };
}

// Follow ropes from `start`, stopping at null or at an island already visited.
function walk(s: LinkedLabState, start: Ref): { ids: number[]; loopsTo: number | null } {
  const ids: number[] = [], seen = new Set<number>();
  let at = start;
  while (at !== null && !seen.has(at)) { seen.add(at); ids.push(at); at = s.next[at]; }
  return { ids, loopsTo: at };
}
const chainText = (s: LinkedLabState, start: Ref) => {
  if (start === null) return 'null';
  const { ids, loopsTo } = walk(s, start);
  return ids.map(i => s.vals[i]).join(' → ') + (loopsTo === null ? ' → null' : ` → (back to ${s.vals[loopsTo]})`);
};
const islands = (s: LinkedLabState, start: Ref) => walk(s, start).ids.map(i => s.vals[i]).join(' → ');
const v = (s: LinkedLabState, at: Ref) => (at === null ? 'null' : String(s.vals[at]));
const nullCell: TraceCell = { value: 'null', tone: 'ghost' };
function chainRow(s: LinkedLabState, name: string, start: Ref, label: string, tone?: TraceCell['tone']): LabRow {
  const { ids, loopsTo } = walk(s, start);
  const cells: TraceCell[] = ids.map((id, k) => ({ value: String(s.vals[id]), label: k === 0 ? label : undefined, tone: k === 0 && tone === 'hot' ? 'hot' : tone === 'done' ? 'done' : undefined }));
  cells.push(loopsTo === null ? (ids.length ? nullCell : { ...nullCell, label }) : { value: `↩ ${s.vals[loopsTo]}`, tone: 'ghost' });
  return { name, cells, join: '→' };
}
const ord = (k: number) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? 'th' : k % 10 === 1 ? 'st' : k % 10 === 2 ? 'nd' : k % 10 === 3 ? 'rd' : 'th'}`;

// ---------- reverse: the four-line dance ----------
const STEPS = ['save', 'flip', 'prev', 'cur'] as const;
function reverseExpected(s: LinkedLabState): string {
  return s.phase === 0 && s.cur === null ? 'finish' : STEPS[s.phase];
}
function reverseReject(s: LinkedLabState, action: string): string {
  const e = reverseExpected(s), c = s.cur;
  const prevText = s.prev === null ? 'null' : `island ${v(s, s.prev)}`;
  if (e === 'finish') return s.prev === null
    ? 'cur is null and there was never an island to flip. The loop is over: return prev, which is null — the empty chain.'
    : `cur is null: every island has been flipped. There is nothing left to save, flip, or advance. Return prev — island ${v(s, s.prev)} — the new head: ${chainText(s, s.prev)}.`;
  if (action === 'finish') return `Not yet: cur still stands on island ${v(s, c)}, so the loop hasn't ended. Returning prev now would hand back ${chainText(s, s.prev)} and abandon the rest.`;
  const rest = c === null ? null : s.next[c];
  if (e === 'save') {
    if (action === 'flip') {
      if (rest === null) return `Save first, even on the last island. After the flip, cur.next would be ${prevText}, so "next = cur.next" would walk you backwards into the finished part instead of to null.`;
      const lost = islands(s, rest), many = walk(s, rest).ids.length > 1;
      return `You just dropped the rope: island ${v(s, c)} is the only thing holding the line to ${lost}. Flip its arrow now and ${lost} ${many ? 'are' : 'is'} unreachable — nobody can find ${many ? 'them' : 'it'} again. Save next = cur.next first.`;
    }
    if (action === 'prev') return `prev = cur now would put both pointers on island ${v(s, c)}; the flip would then tie ${v(s, c)} to itself — a one-island loop. Save the rope first.`;
    return `Nothing has been saved this turn, so there is no island to move cur onto — and island ${v(s, c)} hasn't been flipped yet. Save next = cur.next first.`;
  }
  const savedText = s.saved === null ? 'null' : `island ${v(s, s.saved)}`;
  if (e === 'flip') {
    if (action === 'save') return `next already holds ${chainText(s, s.saved)}. Saving again changes nothing. The rope is safe — flip island ${v(s, c)}'s arrow back to ${prevText}.`;
    if (action === 'prev') return `Flip first. If prev moves onto island ${v(s, c)} now, "cur.next = prev" would tie ${v(s, c)} to itself.`;
    return `Island ${v(s, c)} still points forward. Move cur on now and it is never flipped: the reversed chain would stop at ${prevText} and ${v(s, c)} would still lead forwards into the unflipped part.`;
  }
  if (e === 'prev') {
    if (action === 'cur') return `Advance prev first. Island ${v(s, c)} is now the front of the reversed chain and only cur is holding it. Move cur onto ${savedText} now and the reversed part ${islands(s, c)} is unreachable — you dropped the other end of the rope.`;
    if (action === 'flip') return `Island ${v(s, c)} already points back at ${prevText}. Flipping again changes nothing; advance prev onto it.`;
    return `next already holds ${savedText}, and island ${v(s, c)} is already flipped. Advance prev onto ${v(s, c)}.`;
  }
  // e === 'cur'
  if (action === 'prev') return `prev already stands on island ${v(s, c)}. Now move cur onto the saved rope: ${savedText}.`;
  if (action === 'flip') return `Island ${v(s, c)} is already flipped. Move cur onto the saved rope: ${savedText}.`;
  return `Careful: island ${v(s, c)}'s arrow now points backwards, so "next = cur.next" would aim you into the finished part. next already holds the forward rope (${savedText}) — move cur onto it.`;
}
function reverseApply(s: LinkedLabState, action: string) {
  const c = s.cur as number;
  if (action === 'finish') {
    s.done = true;
    s.message = s.prev === null ? 'The chain was empty: the loop never ran, and prev (null) is returned. No special case needed.' : `Returned prev: ${chainText(s, s.prev)}. Every island was flipped exactly once — O(n) time, three pointers of extra memory.`;
    return;
  }
  if (action === 'save') { s.saved = s.next[c]; s.hasSaved = true; s.message = `Saved the rope: next holds ${chainText(s, s.saved)}. Island ${v(s, c)} can now be re-tied safely.`; }
  if (action === 'flip') { s.next[c] = s.prev; s.message = `Flipped: island ${v(s, c)} now points back at ${v(s, s.prev)}. The rest of the chain is still held by next.`; }
  if (action === 'prev') { s.prev = c; s.message = `prev steps onto island ${v(s, c)}: the reversed chain now reads ${chainText(s, c)}.`; }
  if (action === 'cur') { s.cur = s.saved; s.saved = null; s.hasSaved = false; s.message = s.cur === null ? 'cur steps onto null. Nothing is left to flip.' : `cur steps onto island ${v(s, s.cur)}. One full turn done; the next turn starts by saving its rope.`; }
  s.phase = (s.phase + 1) % 4;
}

// ---------- cycle: Slow and Fast ----------
function cycleExpected(s: LinkedLabState): string {
  if (s.moved && s.slow !== null && s.slow === s.fast) return 'meet';
  if (s.fast === null || s.next[s.fast] === null) return 'end';
  return 'step';
}
const where = (s: LinkedLabState, at: Ref) => (at === null ? 'off the map (null)' : `island #${at} (flag ${s.vals[at]})`);
function cycleReject(s: LinkedLabState, action: string): string {
  const e = cycleExpected(s);
  if (action === 'meet') {
    if (!s.moved && s.slow === s.fast) return 'They start together on the same island — every chain, even a straight one, begins this way. That proves nothing. Move first, then compare.';
    if (s.slow !== null && s.fast !== null && s.vals[s.slow] === s.vals[s.fast]) return `Same flag, different islands: Slow is on #${s.slow} and Fast on #${s.fast}, both flying ${s.vals[s.slow]}. Compare the islands themselves (slow == fast), never their values.`;
    return `Slow is on ${where(s, s.slow)} and Fast on ${where(s, s.fast)}: different islands. No meeting, no proof.`;
  }
  if (e === 'meet') return `Slow and Fast both stand on island #${s.slow}. A meeting is only possible on a loop — that is your proof. ${action === 'end' ? 'Fast never ran out of ferries.' : 'Another turn adds nothing.'}`;
  if (e === 'end') return s.fast === null
    ? `Fast has sailed off the map (null): the chain ends, so there is no loop. Taking another turn would read null.next — a NullPointerException.`
    : `Fast is on #${s.fast}, whose ferry leads nowhere. fast.next.next would read null.next — a NullPointerException. The chain ends: no loop.`;
  return `Fast can still take two ferries from ${where(s, s.fast)}. A dead end you haven't reached proves nothing — a loop could be ahead.`;
}
function cycleApply(s: LinkedLabState, action: string) {
  if (action === 'meet') { s.done = true; s.verdict = 'cycle'; s.message = `Same island, #${s.slow}. Fast gained one island per turn and could not skip over Slow, so a meeting proves a loop.`; return; }
  if (action === 'end') { s.done = true; s.verdict = 'none'; s.message = 'Fast found the end of the chain. A chain with an end has no loop.'; return; }
  s.slow = s.next[s.slow as number];
  s.fast = s.next[s.next[s.fast as number] as number];
  s.moved = true;
  s.message = `Slow takes one ferry to ${where(s, s.slow)}; Fast takes two to ${where(s, s.fast)}.`;
}

// ---------- gap: nth from the end ----------
const posName = (s: LinkedLabState, p: number) => (p <= 0 ? 'the dummy' : p > s.vals.length ? 'null' : `island ${s.vals[p - 1]} (position ${p})`);
function gapExpected(s: LinkedLabState): string {
  if (s.lead - s.trail < s.n + 1) return 'lead';
  return s.lead <= s.vals.length ? 'both' : 'cut';
}
function gapReject(s: LinkedLabState, action: string): string {
  const e = gapExpected(s), len = s.vals.length, gap = s.lead - s.trail, target = len - s.n + 1;
  if (e === 'lead') {
    if (action === 'both') {
      const end = len + 1 - gap;
      const where = end > len ? 'falls off the end with it' : end === target ? `stands on ${posName(s, end)} — the island to remove itself` : `stands on ${posName(s, end)}, past the target`;
      return `The gap is only ${gap} ferr${gap === 1 ? 'y' : 'ies'}. Walk together now and when Lead falls off the end, Trail ${where}. A rope is cut from the island BEFORE the target. Open the gap to n + 1 = ${s.n + 1} first.`;
    }
    return `Cutting now re-ties ${posName(s, s.trail)}'s rope past ${posName(s, s.trail + 1)} — the ${ord(len - s.trail)} island from the end, not the ${ord(s.n)}. Open the gap first.`;
  }
  if (e === 'both') {
    if (action === 'lead') return `The gap is already n + 1 = ${s.n + 1}. Widen it and Trail stops one island short, on ${posName(s, len - s.n - 1)}, and the cut would remove ${posName(s, len - s.n)} instead.`;
    return `Lead is still on ${posName(s, s.lead)}. Cut now and you remove ${posName(s, s.trail + 1)}, the ${ord(len - s.trail)} from the end.`;
  }
  return `Lead has already fallen off the end (null) — there is no ferry left to take. Trail stands on ${posName(s, s.trail)}, right before the target ${posName(s, s.trail + 1)}. Re-tie Trail's rope past it.`;
}
function gapApply(s: LinkedLabState, action: string) {
  if (action === 'lead') { s.lead++; s.message = `Lead hops alone to ${posName(s, s.lead)}. Gap: ${s.lead - s.trail}.`; return; }
  if (action === 'both') { s.lead++; s.trail++; s.message = `Both hop. Lead on ${posName(s, s.lead)}, Trail on ${posName(s, s.trail)}; the gap stays ${s.lead - s.trail}.`; return; }
  s.removed = s.trail; // 0-based index of the removed island (position trail + 1)
  s.done = true;
  const left = s.vals.filter((_, i) => i !== s.removed);
  s.message = `trail.next = trail.next.next: ${posName(s, s.trail + 1)} is cut out. Return dummy.next: ${left.length ? left.join(' → ') + ' → null' : 'null (the chain is now empty)'}.`;
}
export const gapResult = (s: LinkedLabState) => s.vals.filter((_, i) => i !== s.removed);

export const lab = makeLab<LinkedLabState>({
  reverse: {
    name: 'The reversal dance (four lines)',
    cases: reverseCases.length,
    actions: [
      { action: 'save', label: '1 · Save the rope: next = cur.next' },
      { action: 'flip', label: '2 · Flip the arrow: cur.next = prev' },
      { action: 'prev', label: '3 · Advance prev: prev = cur' },
      { action: 'cur', label: '4 · Advance cur: cur = next' },
      { action: 'finish', label: 'Loop over: return prev' },
    ],
    create: variant => build('reverse', reverseCases[variant]),
    expected: reverseExpected,
    apply: reverseApply,
    reject: reverseReject,
    view: s => {
      if (s.done) return [chainRow(s, 'Returned chain (from prev)', s.prev, 'HEAD', 'done')];
      const rows = [chainRow(s, 'From prev · reversed so far', s.prev, 'PREV', 'done'), chainRow(s, 'From cur · still to flip', s.cur, 'CUR', 'hot')];
      if (s.hasSaved) rows.push(chainRow(s, 'From next · the saved rope', s.saved, 'NEXT'));
      return rows;
    },
    describe: s => s.done ? 'Reversed. Say out loud why the four lines must run in that order.' : `prev: ${chainText(s, s.prev)} · cur: ${chainText(s, s.cur)} · next: ${s.hasSaved ? chainText(s, s.saved) : 'not saved this turn'}.`,
  },
  cycle: {
    name: 'Tortoise & hare (is there a loop?)',
    cases: cycleCases.length,
    actions: [
      { action: 'step', label: 'Take a turn: Slow one ferry, Fast two' },
      { action: 'meet', label: 'Same island: there is a loop' },
      { action: 'end', label: 'Fast hit the end: no loop' },
    ],
    create: variant => build('cycle', cycleCases[variant]),
    expected: cycleExpected,
    apply: cycleApply,
    reject: cycleReject,
    view: s => {
      const cells: TraceCell[] = s.vals.map((val, i) => {
        const labels = [i === s.slow && 'SLOW', i === s.fast && 'FAST'].filter(Boolean).join(' · ');
        return { value: String(val), label: labels || undefined, tone: labels ? 'hot' : undefined };
      });
      cells.push(s.pos >= 0 ? { value: `↩ #${s.pos}`, label: 'loops back', tone: 'ghost' } : { ...nullCell, label: s.fast === null && s.moved ? 'FAST' : undefined });
      return [{ name: 'Islands #0, #1, … in ferry order', cells, join: '→', empty: 'Empty chain: head is null' }];
    },
    describe: s => s.vals.length === 0 ? 'The chain is empty: head is null. Both couriers start on null.' : `Slow on ${where(s, s.slow)}, Fast on ${where(s, s.fast)}.${s.moved ? '' : ' Nobody has moved yet.'}`,
  },
  gap: {
    name: 'Two pilots, one gap (remove nth from end)',
    cases: gapCases.length,
    actions: [
      { action: 'lead', label: 'Lead hops alone (open the gap)' },
      { action: 'both', label: 'Both hop together' },
      { action: 'cut', label: 'Cut: trail.next = trail.next.next' },
    ],
    create: variant => build('gap', gapCases[variant]),
    expected: gapExpected,
    apply: gapApply,
    reject: gapReject,
    view: s => {
      const len = s.vals.length;
      const cells: TraceCell[] = ['D', ...s.vals.map(String), 'null'].map((value, p) => {
        const labels = [p === s.lead && 'LEAD', p === s.trail && 'TRAIL'].filter(Boolean).join(' · ');
        const removed = s.removed !== null && p === s.removed + 1;
        return { value, label: labels || undefined, tone: removed ? 'out' : labels ? 'hot' : p === 0 || p === len + 1 ? 'ghost' : undefined };
      });
      const rows: LabRow[] = [{ name: `Chain with dummy D · remove the ${ord(s.n)} from the end`, cells, join: '→' }];
      if (s.done) rows.push({ name: 'After the cut (dummy.next onward)', cells: [...gapResult(s).map(x => ({ value: String(x), tone: 'done' as const })), nullCell], join: '→' });
      return rows;
    },
    describe: s => `n = ${s.n}. Lead on ${posName(s, s.lead)}, Trail on ${posName(s, s.trail)}: a gap of ${s.lead - s.trail} ferr${s.lead - s.trail === 1 ? 'y' : 'ies'}.`,
  },
}, 'Gold = where a pointer stands · green = settled · dashed = null, the dummy, or a rope that loops back');
