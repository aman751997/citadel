// Pure model of two users editing "cat" at the same moment and merging three ways. No DOM.
export type Mode = 'naive' | 'ot' | 'crdt';
export type ScenarioId = 'shift' | 'tie' | 'double-delete';

export interface Op { kind: 'I' | 'D' | 'N'; pos: number; ch: string; site: number }
export interface Scenario { id: ScenarioId; label: string; base: string; alice: Op; bob: Op; expected: string[] }
export interface Step {
  caption: string;
  alice: string;
  bob: string;
  applied?: { who: 'Alice' | 'Bob'; text: string };
  verdict?: 'converged' | 'diverged' | 'converged-wrong';
}

const ins = (pos: number, ch: string, site: number): Op => ({ kind: 'I', pos, ch, site });
const del = (pos: number, site: number): Op => ({ kind: 'D', pos, ch: '', site });
const ALICE = 1;
const BOB = 2;

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  shift: { id: 'shift', label: 'Different places', base: 'cat', alice: ins(3, 's', ALICE), bob: ins(0, 'b', BOB), expected: ['bcats'] },
  tie: { id: 'tie', label: 'Same place', base: 'cat', alice: ins(3, '!', ALICE), bob: ins(3, '?', BOB), expected: ['cat!?', 'cat?!'] },
  'double-delete': { id: 'double-delete', label: 'Both delete the same letter', base: 'cat', alice: del(1, ALICE), bob: del(1, BOB), expected: ['ct'] },
};

export function apply(doc: string, op: Op): string {
  if (op.kind === 'I') return doc.slice(0, op.pos) + op.ch + doc.slice(op.pos);
  if (op.kind === 'D') return doc.slice(0, op.pos) + doc.slice(op.pos + 1);
  return doc;
}

// Rewrite `a` so it means the same thing after the concurrent op `b` has been applied.
export function transform(a: Op, b: Op): Op {
  if (a.kind === 'N' || b.kind === 'N') return a;
  if (b.kind === 'I') {
    const before = b.pos < a.pos || (b.pos === a.pos && (a.kind === 'D' || b.site < a.site));
    return before ? { ...a, pos: a.pos + 1 } : a;
  }
  if (b.pos < a.pos) return { ...a, pos: a.pos - 1 };
  if (b.pos === a.pos && a.kind === 'D') return { ...a, kind: 'N' };
  return a;
}

// Minimal RGA: every character has a permanent id (clock, site).
interface Id { clock: number; site: number }
interface Node { id: Id; ch: string; dead: boolean }
type CrdtOp = { type: 'I'; id: Id; after: Id | null; ch: string } | { type: 'D'; target: Id };
const same = (a: Id, b: Id) => a.clock === b.clock && a.site === b.site;
const gt = (a: Id, b: Id) => (a.clock !== b.clock ? a.clock > b.clock : a.site > b.site);

class Rga {
  nodes: Node[] = [];
  constructor(base: string) {
    [...base].forEach((ch, i) => this.nodes.push({ id: { clock: i + 1, site: 0 }, ch, dead: false }));
  }
  text() { return this.nodes.filter((n) => !n.dead).map((n) => n.ch).join(''); }
  local(op: Op, site: number): CrdtOp {
    const visible = this.nodes.filter((n) => !n.dead);
    const maxClock = Math.max(...this.nodes.map((n) => n.id.clock));
    const out: CrdtOp = op.kind === 'I'
      ? { type: 'I', id: { clock: maxClock + 1, site }, after: op.pos === 0 ? null : visible[op.pos - 1].id, ch: op.ch }
      : { type: 'D', target: visible[op.pos].id };
    this.apply(out);
    return out;
  }
  apply(op: CrdtOp) {
    if (op.type === 'D') { this.nodes.find((n) => same(n.id, op.target))!.dead = true; return; }
    let i = op.after ? this.nodes.findIndex((n) => same(n.id, op.after!)) + 1 : 0;
    while (i < this.nodes.length && gt(this.nodes[i].id, op.id)) i++;
    this.nodes.splice(i, 0, { id: op.id, ch: op.ch, dead: false });
  }
}

const who = (op: Op) => (op.kind === 'I' ? `insert "${op.ch}" at ${op.pos}` : op.kind === 'D' ? `delete position ${op.pos}` : 'do nothing');

export function run(mode: Mode, id: ScenarioId): Step[] {
  const { base, alice: aOp, bob: bOp, expected } = SCENARIOS[id];
  let a = apply(base, aOp);
  let b = apply(base, bOp);
  const steps: Step[] = [
    { caption: `Both users start with "${base}". Neither has seen the other's edit yet.`, alice: base, bob: base },
    { caption: `Alice: ${who(aOp)}. Her screen updates at once.`, alice: a, bob: base },
    { caption: `Bob at the same moment: ${who(bOp)}.`, alice: a, bob: b },
  ];
  let aFinal: string;
  let bFinal: string;
  let shownA: string;
  let shownB: string;
  if (mode === 'naive') {
    shownA = `${who(bOp)} (unchanged)`; shownB = `${who(aOp)} (unchanged)`;
    aFinal = apply(a, bOp); bFinal = apply(b, aOp);
  } else if (mode === 'ot') {
    const bForA = transform(bOp, aOp);
    const aForB = transform(aOp, bOp);
    shownA = `${who(bOp)} becomes ${who(bForA)}`; shownB = `${who(aOp)} becomes ${who(aForB)}`;
    aFinal = apply(a, bForA); bFinal = apply(b, aForB);
  } else {
    const ra = new Rga(base); const rb = new Rga(base);
    const opA = ra.local(aOp, ALICE); const opB = rb.local(bOp, BOB);
    ra.apply(opB); rb.apply(opA);
    shownA = 'Bob\'s op names a character id, not a position'; shownB = 'Alice\'s op names a character id, not a position';
    aFinal = ra.text(); bFinal = rb.text();
  }
  steps.push({ caption: `Alice receives Bob's edit: ${shownA}.`, alice: aFinal, bob: b, applied: { who: 'Alice', text: shownA } });
  steps.push({ caption: `Bob receives Alice's edit: ${shownB}.`, alice: aFinal, bob: bFinal, applied: { who: 'Bob', text: shownB } });
  const verdict = aFinal !== bFinal ? 'diverged' : !expected.includes(aFinal) ? 'converged-wrong' : 'converged';
  const msg = { diverged: 'The screens now disagree, and nothing will ever fix it.', 'converged-wrong': `Both screens agree, but on the wrong text (intended: "${expected[0]}").`, converged: `Both screens show "${aFinal}". They agree, and the text is a valid merge of both edits.` }[verdict];
  steps.push({ caption: msg, alice: aFinal, bob: bFinal, verdict });
  return steps;
}
