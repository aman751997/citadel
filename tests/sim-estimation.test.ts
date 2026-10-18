import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, humanBytes, humanCount, fromLog, type Input } from '../src/lib/sim/estimation.ts';

const feed: Input = { dau: 50e6, actionsPerUser: 10.1, readsPerWrite: 100, payloadKB: 1, retentionYears: 5, replication: 3, peakFactor: 3, secondsPerDay: 1e5 };

test('lesson photo-feed numbers: 5,000 reads/s, 50 writes/s, 1.8 TB/year', () => {
  const r = estimate(feed);
  assert.ok(Math.abs(r.readQps - 5000) < 1e-6);
  assert.ok(Math.abs(r.writeQps - 50) < 1e-6);
  assert.ok(Math.abs(r.peakReadQps - 15000) < 1e-6);
  assert.equal(humanBytes(r.storageDayBytes), '5 GB');
  assert.equal(humanBytes(r.storageYearBytes), '1.82 TB');
  assert.equal(humanBytes(r.storageRawBytes), '27.4 TB');
});
test('exact 86,400 gives the exact QPS', () => {
  const r = estimate({ ...feed, dau: 100e6, actionsPerUser: 10, readsPerWrite: 1e9, secondsPerDay: 86400 });
  assert.ok(Math.abs(r.avgQps - 1e9 / 86400) < 1e-3);
});
test('bandwidth converts bytes to bits: 15,000 req/s x 20 KB = 2.4 Gbps', () => {
  const r = estimate({ ...feed, actionsPerUser: 10, payloadKB: 20, readsPerWrite: 1e9 });
  assert.ok(Math.abs(r.egressPeakGbps - 2.4) < 0.01);
});
test('storage scales with writes, retention and replication, not with reads', () => {
  const a = estimate(feed), b = estimate({ ...feed, readsPerWrite: 1e6 });
  assert.ok(b.storageYearBytes < a.storageYearBytes);
  assert.equal(estimate({ ...feed, replication: 1 }).storageRawBytes * 3, a.storageRawBytes);
});
test('formatters climb one rung at a time', () => {
  assert.equal(humanBytes(500e6), '500 MB');
  assert.equal(humanBytes(999), '999 B');
  assert.equal(humanBytes(1000), '1 KB');
  assert.equal(humanCount(15000), '15K');
  assert.equal(humanCount(50e6), '50M');
  assert.equal(fromLog(7.7), 50000000);
});
