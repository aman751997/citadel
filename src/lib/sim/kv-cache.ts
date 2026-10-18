// Pure GPU-memory model for KvCacheCalculator. Decimal GB (1 GB = 10^9 bytes). No DOM.
export interface Model { name: string; paramsB: number; layers: number; kvHeads: number; headDim: number }

// Illustrative shapes used in the lesson, not vendor specs.
export const MODELS: Record<string, Model> = {
  small: { name: '8B-class (32 layers, 8 KV heads)', paramsB: 8, layers: 32, kvHeads: 8, headDim: 128 },
  large: { name: '70B-class (80 layers, 8 KV heads)', paramsB: 70, layers: 80, kvHeads: 8, headDim: 128 },
  mha: { name: '70B-class without GQA (80 layers, 64 KV heads)', paramsB: 70, layers: 80, kvHeads: 64, headDim: 128 },
};

export interface Input {
  model: Model;
  weightBytes: number;   // bytes per parameter: 2 = BF16, 1 = INT8/FP8, 0.5 = INT4
  kvBytes: number;       // bytes per KV element: 2 = BF16, 1 = FP8
  gpus: number;
  gpuGB: number;
  reservePct: number;    // share of total memory held back for activations and runtime
  contextTokens: number; // tokens per sequence (prompt + output)
  batch: number;         // sequences in flight
}

export interface Result {
  totalBytes: number; weightsBytes: number; reserveBytes: number; kvBudgetBytes: number;
  kvPerTokenBytes: number; kvPerSeqBytes: number; kvNeededBytes: number;
  maxTokens: number; maxSeqs: number;
  weightsFit: boolean; batchFits: boolean;
}

export const weightsBytes = (m: Model, bytesPerParam: number) => m.paramsB * 1e9 * bytesPerParam;
export const kvPerToken = (m: Model, bytes: number) => 2 * m.layers * m.kvHeads * m.headDim * bytes;

export function analyse(i: Input): Result {
  const totalBytes = i.gpus * i.gpuGB * 1e9;
  const weights = weightsBytes(i.model, i.weightBytes);
  const reserveBytes = totalBytes * (i.reservePct / 100);
  const kvBudgetBytes = Math.max(0, totalBytes - weights - reserveBytes);
  const perToken = kvPerToken(i.model, i.kvBytes);
  const perSeq = perToken * i.contextTokens;
  const needed = perSeq * i.batch;
  return {
    totalBytes, weightsBytes: weights, reserveBytes, kvBudgetBytes,
    kvPerTokenBytes: perToken, kvPerSeqBytes: perSeq, kvNeededBytes: needed,
    maxTokens: Math.floor(kvBudgetBytes / perToken),
    maxSeqs: Math.floor(kvBudgetBytes / perSeq),
    weightsFit: weights + reserveBytes <= totalBytes,
    batchFits: needed <= kvBudgetBytes,
  };
}

export function humanBytes(n: number): string {
  if (n >= 1e9) return `${Number((n / 1e9).toPrecision(3))} GB`;
  if (n >= 1e6) return `${Number((n / 1e6).toPrecision(3))} MB`;
  if (n >= 1e3) return `${Number((n / 1e3).toPrecision(3))} KB`;
  return `${Math.round(n)} B`;
}

export const humanTokens = (n: number) => n >= 1e6 ? `${Number((n / 1e6).toPrecision(3))}M` : n >= 1e3 ? `${Number((n / 1e3).toPrecision(3))}K` : String(n);
