// Count-Min Sketch walk-through with fixed, hand-picked hash columns so the collisions are visible and repeatable.
export const WIDTH = 5;
export const STREAM = ['cat', 'dog', 'cat', 'eel', 'fox', 'cat', 'dog'];
export const HASHES: Record<string, number[]> = { cat: [0, 2], dog: [2, 3], eel: [0, 3], fox: [4, 1] };

export interface Step {
  caption: string;
  table: number[][];
  touched: [number, number][];
  query: string | null;
  estimate: number | null;
}

const trueCount = (stream: string[], item: string) => stream.filter((x) => x === item).length;

export function estimate(table: number[][], item: string): number {
  return Math.min(...table.map((row, r) => row[HASHES[item][r]]));
}

export function buildSteps(rows: 1 | 2, stream: string[] = STREAM): Step[] {
  const table = Array.from({ length: rows }, () => Array<number>(WIDTH).fill(0));
  const snap = () => table.map((r) => [...r]);
  const steps: Step[] = [{ caption: `An empty sketch: ${rows} row${rows > 1 ? 's' : ''} of ${WIDTH} counters. Each item is hashed once per row.`, table: snap(), touched: [], query: null, estimate: null }];
  stream.forEach((item, n) => {
    const touched = HASHES[item].slice(0, rows).map((c, r) => [r, c] as [number, number]);
    touched.forEach(([r, c]) => { table[r][c] += 1; });
    steps.push({ caption: `Update ${n + 1}: "${item}" adds 1 to ${touched.map(([r, c]) => `row ${r + 1} column ${c}`).join(' and ')}.`, table: snap(), touched, query: null, estimate: null });
  });
  for (const item of [...new Set(stream)]) {
    const touched = HASHES[item].slice(0, rows).map((c, r) => [r, c] as [number, number]);
    const est = estimate(table, item);
    const real = trueCount(stream, item);
    const cells = touched.map(([r, c]) => table[r][c]).join(', ');
    steps.push({ caption: `Query "${item}": its counters are ${cells}. Minimum = ${est}. True count = ${real}${est > real ? `, so it is overcounted by ${est - real}` : ', exact'}.`, table: snap(), touched, query: item, estimate: est });
  }
  return steps;
}
