// Shared shapes for <Trace> decision puzzles. Data files build steps with `row` and `step`.
export type CellTone = 'hot' | 'done' | 'out' | 'ghost';
export interface TraceCell { value: string; label?: string; tone?: CellTone }
export interface TraceRow { name: string; cells: TraceCell[]; join?: string }
export interface TraceStep {
  question: string;
  rows: TraceRow[];
  choices: { label: string; feedback: string }[];
  answer: number;
}

// row('Heights', [2, 9, 4], { 0: 'LEFT' }, { tones: { 1: 'done' }, join: '→' })
export const row = (
  name: string,
  values: (string | number)[],
  labels: Record<number, string> = {},
  options: { tones?: Record<number, CellTone>; join?: string } = {},
): TraceRow => ({
  name,
  cells: values.map((value, index) => ({ value: String(value), label: labels[index], tone: options.tones?.[index] })),
  ...(options.join ? { join: options.join } : {}),
});

export const step = (question: string, rows: TraceRow[], answer: number, choices: [string, string][]): TraceStep => ({
  question, rows, answer, choices: choices.map(([label, feedback]) => ({ label, feedback })),
});
