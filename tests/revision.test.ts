import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS, emptyStore, parseLocation, itemId, rate, signal, seedLegacy, rateItem, removeItem, isDue, dueItems,
  summarize, migrate, importJSON, exportJSON, STORE_VERSION, type Item, type ItemSpec,
} from '../src/lib/revision.ts';

const NOW = 1_700_000_000_000;
const spec: ItemSpec = { id: 'dsa:arrays/x:quiz:q-0', wing: 'dsa', path: 'dsa/lessons/arrays/x/', anchor: 'a', kind: 'quiz', title: 'Q?', lesson: 'X' };
const item = (box: number): Item => ({ ...spec, box, dueAt: NOW, lastAt: null, reviews: 0 });

test('rate moves boxes and schedules by fixed intervals', () => {
  assert.equal(rate(item(1), 'remembered', NOW).box, 2);
  assert.equal(rate(item(1), 'remembered', NOW).dueAt, NOW + 3 * DAY_MS);
  assert.equal(rate(item(5), 'remembered', NOW).box, 5);
  assert.equal(rate(item(5), 'remembered', NOW).dueAt, NOW + 30 * DAY_MS);
  assert.equal(rate(item(3), 'difficult', NOW).box, 3);
  assert.equal(rate(item(4), 'forgotten', NOW).box, 1);
  assert.equal(rate(item(4), 'forgotten', NOW).dueAt, NOW + DAY_MS);
  assert.equal(rate(item(2), 'remembered', NOW).reviews, 1);
});

test('isDue boundary is inclusive', () => {
  const i = { ...item(1), dueAt: NOW };
  assert.ok(isDue(i, NOW));
  assert.ok(!isDue(i, NOW - 1));
});

test('wrong answer creates a due box-1 item and resets an existing one', () => {
  let s = signal(emptyStore(), spec, 'wrong', NOW);
  assert.equal(s.items[spec.id].box, 1);
  assert.ok(isDue(s.items[spec.id], NOW));
  s = { ...s, items: { [spec.id]: { ...item(4), dueAt: NOW + 99 * DAY_MS } } };
  s = signal(s, spec, 'wrong', NOW);
  assert.equal(s.items[spec.id].box, 1);
  assert.ok(isDue(s.items[spec.id], NOW));
});

test('lesson-time difficult keeps the box, remembered on new item lands in box 2', () => {
  const s = { v: 1, items: { [spec.id]: item(3) } };
  assert.equal(signal(s, spec, 'difficult', NOW).items[spec.id].box, 3);
  assert.equal(signal(emptyStore(), spec, 'remembered', NOW).items[spec.id].box, 2);
});

test('seedLegacy never overwrites', () => {
  const s = { v: 1, items: { [spec.id]: item(4) } };
  assert.equal(seedLegacy(s, spec, 1, NOW), s);
  const seeded = seedLegacy(emptyStore(), spec, 2, NOW).items[spec.id];
  assert.equal(seeded.box, 2);
  assert.equal(seeded.dueAt, NOW + 3 * DAY_MS);
});

test('parseLocation is base independent and ignores lesson text', () => {
  assert.deepEqual(parseLocation('/citadel/dsa/lessons/arrays/x/'), { wing: 'dsa', slug: 'arrays/x', path: 'dsa/lessons/arrays/x/' });
  assert.equal(parseLocation('/sd/lessons/cache/')?.slug, 'cache');
  assert.equal(parseLocation('/citadel/mastery/proj/ch1/')?.slug, 'proj/ch1');
  assert.equal(parseLocation('/citadel/dsa/'), null);
  assert.equal(parseLocation('/citadel/review/'), null);
  assert.equal(itemId('lld', 'solid', 'cards', 'srp-2'), 'lld:solid:cards:srp-2');
});

test('dueItems and summarize group by wing', () => {
  const other = { ...item(2), id: 'sd:c:chapter:a', wing: 'sd' as const, dueAt: NOW + 5 * DAY_MS };
  const s = { v: 1, items: { [spec.id]: item(1), [other.id]: other } };
  assert.deepEqual(dueItems(s, NOW).map((i) => i.id), [spec.id]);
  const sum = summarize(s, NOW);
  assert.deepEqual(sum.dsa, { total: 1, due: 1, nextDue: null });
  assert.deepEqual(sum.sd, { total: 1, due: 0, nextDue: NOW + 5 * DAY_MS });
  assert.deepEqual(sum.lld, { total: 0, due: 0, nextDue: null });
  assert.equal(rateItem(s, spec.id, 'remembered', NOW).items[spec.id].box, 2);
  assert.equal(rateItem(s, 'nope', 'remembered', NOW), s);
  assert.equal(removeItem(s, spec.id).items[spec.id], undefined);
});

test('migrate guards versions and drops invalid items', () => {
  assert.ok(migrate(null).ok);
  assert.equal(migrate({ v: STORE_VERSION + 1, items: {} }).ok, false);
  assert.equal(migrate({ items: {} }).ok, false);
  assert.equal(migrate('x').ok, false);
  const r = migrate({ v: 1, items: { [spec.id]: item(2), bad: { id: 'bad' }, mismatch: item(1) } });
  assert.ok(r.ok && Object.keys(r.store.items).join() === spec.id);
});

test('export/import round trip, merge keeps newer review, bad input changes nothing', () => {
  const a = { v: 1, items: { [spec.id]: { ...item(3), lastAt: NOW } } };
  const text = exportJSON(a);
  const back = importJSON(text, emptyStore());
  assert.ok(back.ok && back.store.items[spec.id].box === 3);
  const local = { v: 1, items: { [spec.id]: { ...item(1), lastAt: NOW + 1 } } };
  const merged = importJSON(text, local);
  assert.ok(merged.ok && merged.store.items[spec.id].box === 1);
  const replaced = importJSON(text, local, 'replace');
  assert.ok(replaced.ok && replaced.store.items[spec.id].box === 3);
  assert.equal(importJSON('{nope', local).ok, false);
  assert.equal(importJSON('{"v":99,"items":{}}', local).ok, false);
});
