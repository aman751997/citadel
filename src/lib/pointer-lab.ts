export type LabMode = 'pair' | 'compact' | 'colors' | 'merge';
export type LabAction = 'left' | 'right' | 'found' | 'finish' | 'keep' | 'skip' | 'low' | 'mid' | 'high' | 'take-a' | 'take-b';
export interface LabState {
  mode: LabMode; a: number[]; b: number[]; target: number;
  left: number; right: number; read: number; write: number; low: number;
  i: number; j: number; done: boolean; moves: number; message: string;
}
export const labNames: Record<LabMode, string> = {
  pair: 'Find a pair', compact: 'Move zeroes', colors: 'Sort three colors', merge: 'Merge safely',
};
export const labActions: Record<LabMode, { action: LabAction; label: string }[]> = {
  pair: [{ action: 'left', label: 'Move left →' }, { action: 'right', label: '← Move right' }, { action: 'found', label: 'Claim this pair' }, { action: 'finish', label: 'No pair remains' }],
  compact: [{ action: 'keep', label: 'Keep it; advance read & write' }, { action: 'skip', label: 'Skip it; advance read' }, { action: 'finish', label: 'Finished reading' }],
  colors: [{ action: 'low', label: 'Swap with low; advance both' }, { action: 'mid', label: 'Advance mid only' }, { action: 'high', label: 'Swap with high; move high only' }, { action: 'finish', label: 'Unknown zone is empty' }],
  merge: [{ action: 'take-a', label: 'Write from nums1' }, { action: 'take-b', label: 'Write from nums2' }, { action: 'finish', label: 'Merge is complete' }],
};
export function createLab(mode: LabMode, variant = 0): LabState {
  const cases: Record<LabMode, { a: number[]; b?: number[]; target?: number }[]> = {
    pair: [{ a: [2, 7, 11, 15], target: 18 }, { a: [-8, -3, 2, 6], target: -1 }, { a: [1, 2, 4, 9], target: 8 }, { a: [2, 2, 3, 8], target: 4 }],
    compact: [{ a: [0, 1, 0, 3, 12] }, { a: [1, 0, 3, 0, 2] }, { a: [0, 0, 0] }, { a: [4, 2, 1] }],
    colors: [{ a: [1, 2, 0] }, { a: [2, 0, 2, 1, 1, 0] }, { a: [2, 2, 0] }, { a: [1, 1] }],
    merge: [{ a: [1, 4, 7], b: [2, 5, 6] }, { a: [], b: [0, 3] }, { a: [1, 2], b: [] }, { a: [-3, 2, 2], b: [-4, 2, 8] }],
  };
  const chosen = cases[mode][variant % cases[mode].length];
  const b = [...(chosen.b || [])];
  const a = [...chosen.a, ...(mode === 'merge' ? Array(b.length).fill(0) : [])];
  return { mode, a, b, target: chosen.target || 0, left: 0, right: a.length - 1, read: 0, write: mode === 'merge' ? a.length - 1 : 0, low: 0, i: chosen.a.length - 1, j: b.length - 1, done: false, moves: 0, message: 'Name what is settled, then choose the next move.' };
}
export function expectedAction(s: LabState): LabAction {
  if (s.mode === 'pair') return s.left >= s.right ? 'finish' : s.a[s.left] + s.a[s.right] === s.target ? 'found' : s.a[s.left] + s.a[s.right] < s.target ? 'left' : 'right';
  if (s.mode === 'compact') return s.read === s.a.length ? 'finish' : s.a[s.read] === 0 ? 'skip' : 'keep';
  if (s.mode === 'colors') return s.read > s.right ? 'finish' : s.a[s.read] === 0 ? 'low' : s.a[s.read] === 1 ? 'mid' : 'high';
  return s.j < 0 ? 'finish' : s.i >= 0 && s.a[s.i] > s.b[s.j] ? 'take-a' : 'take-b';
}
export function describeLab(s: LabState): string {
  if (s.done) return s.mode === 'pair' ? s.message : `Final array: [${s.a.join(', ')}]. Explain the stopping rule before trying another case.`;
  if (s.mode === 'pair') return s.left >= s.right ? 'The boundaries have met. Is there a pair left to try?' : `Target ${s.target}. Current sum: ${s.a[s.left]} + ${s.a[s.right]} = ${s.a[s.left] + s.a[s.right]}.`;
  if (s.mode === 'compact') return `read = ${s.read}, write = ${s.write}. Kept prefix: [${s.a.slice(0, s.write).join(', ')}].`;
  if (s.mode === 'colors') return `low = ${s.low}, mid = ${s.read}, high = ${s.right}. Unknown cells: ${Math.max(0, s.right - s.read + 1)}.`;
  return `i = ${s.i}, j = ${s.j}, write = ${s.write}. Everything after write is final.`;
}
export function moveLab(state: LabState, action: LabAction): { state: LabState; accepted: boolean } {
  if (state.done) return { state, accepted: false };
  const s = { ...state, a: [...state.a], b: [...state.b] };
  const expected = expectedAction(s);
  // Either equal merge candidate is safe; the teaching template chooses nums2.
  const tiedMerge = s.mode === 'merge' && action === 'take-a' && s.i >= 0 && s.j >= 0 && s.a[s.i] === s.b[s.j];
  if (action !== expected && !tiedMerge) {
    if (expected === 'finish') s.message = 'There is no unread work left for this loop. Moving again could read beyond a boundary. Choose the stopping action.';
    else if (action === 'finish') s.message = 'There is still work inside the active boundaries. Stopping now would leave it unchecked.';
    else if (s.mode === 'pair') {
      if (expected === 'found') s.message = `You already have ${s.target}. Moving would discard this matching pair; claim it first.`;
      else if (action === 'found') s.message = `The current sum is ${s.a[s.left] + s.a[s.right]}, not ${s.target}. This pair does not meet the condition.`;
      else {
        const dropping = action === 'left' ? s.left : s.right;
        const other = s.a.findIndex((value, index) => index >= s.left && index <= s.right && index !== dropping && value + s.a[dropping] === s.target);
        const nextLeft = action === 'left' ? s.left + 1 : s.left;
        const nextRight = action === 'right' ? s.right - 1 : s.right;
        const hypothetical = `That would leave [${s.a.slice(nextLeft, nextRight + 1).join(', ')}]. `;
        s.message = hypothetical + (other >= 0 ? `You would lose the valid pair ${s.a[dropping]} + ${s.a[other]} = ${s.target}. ` : 'That move has no elimination proof, even if this particular input still works. ') + (expected === 'left' ? 'The current left value cannot reach the target even with the largest remaining partner.' : 'The current right value overshoots even with the smallest remaining partner.');
      }
    } else if (s.mode === 'compact') s.message = expected === 'keep' ? `Skipping ${s.a[s.read]} would lose a required nonzero from the kept prefix. Keep it, even if read equals write.` : 'Keeping this zero would put it into the nonzero prefix. Skip it; write must stay put.';
    else if (s.mode === 'colors') s.message = `mid contains ${s.a[s.read]}. ${expected === 'high' ? 'Advancing mid would leave a 2 outside the final 2-zone. Swap with high and inspect the incoming value next.' : expected === 'low' ? 'This 0 belongs at low. Swap there, then advance low and mid.' : 'This is already a 1. It belongs in the middle zone; advance mid only.'}`;
    else s.message = `Writing ${action === 'take-a' ? (s.i >= 0 ? s.a[s.i] : 'from exhausted nums1') : s.b[s.j]} here would fail to place the largest unread value at the back. ${s.i < 0 ? 'nums1 is exhausted; take from nums2.' : 'Compare both unread ends.'}`;
    return { state: s, accepted: false };
  }
  if (action === 'finish' || action === 'found') {
    s.done = true;
    s.message = action === 'found' ? `Found ${s.a[s.left]} + ${s.a[s.right]} = ${s.target} at positions ${s.left + 1} and ${s.right + 1}.` : s.mode === 'pair' ? 'No pair exists. Every eliminated value was ruled out safely.' : s.mode === 'merge' ? 'nums2 is exhausted. Any remaining nums1 prefix is already in place.' : 'The unknown zone is empty. Every value has been processed.';
    return { state: s, accepted: true };
  }
  s.moves++;
  if (s.mode === 'pair') {
    s.message = action === 'left' ? `${s.a[s.left]} cannot reach ${s.target}, even with ${s.a[s.right]}. Left moves; the remaining possibilities stay inside.` : `${s.a[s.right]} overshoots ${s.target}, even with ${s.a[s.left]}. Right moves; the remaining possibilities stay inside.`;
    if (action === 'left') s.left++; else s.right--;
  } else if (s.mode === 'compact') {
    if (action === 'keep') {
      [s.a[s.write], s.a[s.read]] = [s.a[s.read], s.a[s.write]];
      s.write++;
      s.message = 'Kept one nonzero. write advances even for a self-swap; the prefix stays in original order.';
    } else s.message = 'Skipped a zero. Only read advances; the next kept slot has not changed.';
    s.read++;
  } else if (s.mode === 'colors') {
    if (action === 'low') { [s.a[s.low], s.a[s.read]] = [s.a[s.read], s.a[s.low]]; s.low++; s.read++; s.message = 'Placed a 0. The value received from low was a known 1, or this was a self-swap. Advance both.'; }
    else if (action === 'mid') { s.read++; s.message = 'A 1 is already in the right zone. Advance mid.'; }
    else { [s.a[s.read], s.a[s.right]] = [s.a[s.right], s.a[s.read]]; s.right--; s.message = s.read > s.right ? 'Placed the final 2. The unknown zone is now empty; no incoming value remains to inspect.' : `Placed a 2. mid stays: its incoming ${s.a[s.read]} has not been inspected.`; }
  } else {
    s.a[s.write--] = action === 'take-a' ? s.a[s.i--] : s.b[s.j--];
    s.message = 'Placed the largest unread value into the last free slot. Unread prefixes remain safe.';
  }
  return { state: s, accepted: true };
}
