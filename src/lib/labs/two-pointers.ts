// Adapts the original two-pointer playground (src/lib/pointer-lab.ts) to the shared Lab interface.
import type { Lab, LabRow } from '../lab.ts';
import type { TraceCell } from '../trace.ts';
import { createLab, describeLab, moveLab, expectedAction, labActions, labNames, type LabMode, type LabState } from '../pointer-lab.ts';

function view(state: LabState): LabRow[] {
  const rowFor = (values: number[], second: boolean): LabRow => {
    const cells: TraceCell[] = values.map((value, index) => {
      const labels: string[] = []; let settled = false, placeholder = false;
      if (state.mode === 'pair') { if (index === state.left) labels.push('LEFT'); if (index === state.right) labels.push('RIGHT'); settled = index < state.left || index > state.right; }
      if (state.mode === 'compact') { if (index === state.read) labels.push('READ'); if (index === state.write) labels.push('WRITE'); settled = index < state.write; }
      if (state.mode === 'colors') { if (index === state.low) labels.push('LOW'); if (index === state.read) labels.push('MID'); if (index === state.right) labels.push('HIGH'); settled = index < state.read || index > state.right; }
      if (state.mode === 'merge') {
        if (second) { if (index === state.j) labels.push('J'); settled = index > state.j; }
        else { if (index === state.i) labels.push('I'); if (index === state.write) labels.push('WRITE'); settled = index > state.write || state.done; placeholder = index > state.i && index <= state.write; }
      }
      return { value: placeholder ? '·' : String(value), label: labels.join(' / ') || undefined, tone: labels.length ? 'hot' : settled ? 'done' : undefined };
    });
    return { name: second ? 'nums2' : state.mode === 'merge' ? 'nums1 · dots are spare slots' : 'Array', cells, empty: 'Empty array' };
  };
  return state.mode === 'merge' ? [rowFor(state.a, false), rowFor(state.b, true)] : [rowFor(state.a, false)];
}

export const lab: Lab<LabState> & { expected(state: LabState): string } = {
  legend: 'Gold = active pointers · green = settled values · positions start at 0',
  modes: Object.fromEntries((Object.keys(labNames) as LabMode[]).map(mode => [mode, { name: labNames[mode], cases: 4, actions: labActions[mode] }])),
  create: (mode, variant = 0) => createLab(mode as LabMode, variant),
  move: (state, action) => moveLab(state, action as Parameters<typeof moveLab>[1]),
  expected: state => expectedAction(state),
  view,
  describe: describeLab,
};
