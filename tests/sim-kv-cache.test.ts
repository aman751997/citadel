import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, MODELS, kvPerToken, weightsBytes, humanBytes, humanTokens, type Input } from '../src/lib/sim/kv-cache.ts';

const base: Input = { model: MODELS.large, weightBytes: 2, kvBytes: 2, gpus: 4, gpuGB: 80, reservePct: 10, contextTokens: 4096, batch: 1 };

test('lesson numbers: 140 GB weights, 327,680 B per token, 148 GB budget, about 110 chats of 4K', () => {
  const r = analyse(base);
  assert.equal(r.weightsBytes, 140e9);
  assert.equal(r.kvPerTokenBytes, 327680);
  assert.equal(r.kvBudgetBytes, 148e9);
  assert.equal(r.maxTokens, 451660);
  assert.equal(r.maxSeqs, 110);
  assert.equal(humanBytes(r.kvPerSeqBytes), '1.34 GB');
});
test('32K context fits 13 sequences; no GQA is 8x per token', () => {
  assert.equal(analyse({ ...base, contextTokens: 32768 }).maxSeqs, 13);
  assert.equal(kvPerToken(MODELS.mha, 2), 8 * kvPerToken(MODELS.large, 2));
});
test('INT4 weights fit one 80 GB GPU with 37 GB of KV; FP8 KV doubles tokens', () => {
  const r = analyse({ ...base, gpus: 1, weightBytes: 0.5 });
  assert.equal(weightsBytes(MODELS.large, 0.5), 35e9);
  assert.equal(r.kvBudgetBytes, 37e9);
  const fp8 = analyse({ ...base, gpus: 1, weightBytes: 0.5, kvBytes: 1 });
  assert.ok(Math.abs(fp8.maxTokens - 2 * r.maxTokens) <= 1);
});
test('weights alone too big: no KV budget and weightsFit is false', () => {
  const r = analyse({ ...base, gpus: 1 });
  assert.equal(r.kvBudgetBytes, 0);
  assert.equal(r.weightsFit, false);
  assert.equal(r.batchFits, false);
});
test('batch fit check and formatters', () => {
  assert.equal(analyse({ ...base, batch: 110 }).batchFits, true);
  assert.equal(analyse({ ...base, batch: 111 }).batchFits, false);
  assert.equal(humanTokens(451660), '452K');
});
