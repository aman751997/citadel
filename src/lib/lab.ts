// Generic "you make every move" playground engine, shared by every pattern lesson.
// A pattern exports one `Lab` (usually built with `makeLab`) from src/lib/labs/<pattern>.ts
// and registers it in src/lib/registry.ts. <Playground lab="<pattern>" /> renders it.
import type { TraceRow } from './trace.ts';

export type LabRow = TraceRow & { empty?: string };
export interface LabBase { mode: string; done: boolean; moves: number; message: string }
export interface LabModeInfo { name: string; cases: number; actions: { action: string; label: string }[] }
export interface Lab<S extends LabBase = LabBase> {
  modes: Record<string, LabModeInfo>;
  legend?: string;
  create(mode: string, variant?: number): S;
  // Wrong moves must return accepted: false and leave everything except `message` untouched.
  move(state: S, action: string): { state: S; accepted: boolean };
  view(state: S): LabRow[];
  describe(state: S): string;
}

// One playground mode, written as pure functions over plain-data state.
export interface ModeDef<S extends LabBase> {
  name: string;
  cases: number;
  actions: { action: string; label: string }[];
  create(variant: number): Omit<S, 'mode' | 'done' | 'moves' | 'message'> & Partial<LabBase>;
  // The single correct action for this state. Return 'finish' (or any terminal action) when work is done.
  expected(state: S): string;
  // Optional: other actions that are equally valid here (ties).
  alsoValid?(state: S, action: string): boolean;
  // Perform a valid action on a private copy. Set `done = true` for terminal actions. Write a friendly `message`.
  apply(state: S, action: string): void;
  // Explain, without moving anything, what a wrong action would break.
  reject(state: S, action: string): string;
  view(state: S): LabRow[];
  describe(state: S): string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function makeLab<S extends LabBase>(defs: Record<string, ModeDef<S>>, legend?: string): Lab<S> & { expected(state: S): string } {
  const def = (state: S) => defs[state.mode];
  return {
    legend,
    modes: Object.fromEntries(Object.entries(defs).map(([key, d]) => [key, { name: d.name, cases: d.cases, actions: d.actions }])),
    create(mode, variant = 0) {
      const d = defs[mode];
      return { done: false, moves: 0, message: 'Say what is settled, then choose the next move.', ...clone(d.create(variant % d.cases)), mode } as S;
    },
    expected: state => def(state).expected(state),
    move(state, action) {
      if (state.done) return { state, accepted: false };
      const d = def(state);
      if (action !== d.expected(state) && !d.alsoValid?.(state, action)) {
        return { state: { ...clone(state), message: d.reject(state, action) }, accepted: false };
      }
      const next = clone(state);
      d.apply(next, action);
      next.moves = state.moves + 1;
      return { state: next, accepted: true };
    },
    view: state => def(state).view(state),
    describe: state => def(state).describe(state),
  };
}

// Test helper: drive a lab with its expected actions, asserting wrong moves never change the board.
export function solveLab<S extends LabBase>(lab: Lab<S> & { expected(state: S): string }, start: S, budget = 400): { final: S; steps: number; wrongMovesChangedBoard: boolean } {
  let state = start, steps = 0, wrongMovesChangedBoard = false;
  const strip = (s: S) => JSON.stringify({ ...s, message: '' });
  while (!state.done && steps < budget) {
    for (const { action } of lab.modes[state.mode].actions) {
      const result = lab.move(state, action);
      if (!result.accepted && strip(result.state) !== strip(state)) wrongMovesChangedBoard = true;
    }
    state = lab.move(state, lab.expected(state)).state;
    steps++;
  }
  return { final: state, steps, wrongMovesChangedBoard };
}
