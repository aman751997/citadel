import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, decodeBox, neighbours, haversine, samplePoints, query, blockCovers, CENTER } from '../src/lib/sim/geohash.ts';

test('encode matches the lesson worked example', () => {
  assert.equal(encode(12.9716, 77.5946, 2), 'td');
  assert.equal(encode(12.9716, 77.5946, 7), 'tdr1v9q');
});

test('decodeBox contains the encoded point', () => {
  const b = decodeBox('tdr1v9');
  assert.ok(CENTER.lat >= b.latMin && CENTER.lat < b.latMax && CENTER.lng >= b.lngMin && CENTER.lng < b.lngMax);
});

test('neighbours of tdr1v9 are the 8 cells around it', () => {
  assert.deepEqual(neighbours('tdr1v9').sort(), ['tdr1v2', 'tdr1v3', 'tdr1v6', 'tdr1v8', 'tdr1vb', 'tdr1vc', 'tdr1vd', 'tdr1vf']);
});

test('neighbours wrap across the antimeridian and skip past the poles', () => {
  const east = neighbours(encode(0, 179.99, 4));
  assert.equal(east.length, 8);
  assert.ok(east.some((h) => decodeBox(h).lngMin < -179));
  assert.equal(neighbours(encode(89.99, 10, 4)).length, 5);
});

test('haversine matches the lesson number', () => {
  assert.ok(Math.abs(haversine({ lat: 12.9716, lng: 77.5946 }, { lat: 12.98, lng: 77.61 }) - 1912) < 2);
});

test('a cafe 22 m away across a cell edge is missed by own-cell-only but found with 9 cells', () => {
  const user = { lat: 12.972, lng: 77.5963 }, cafe = { id: 1, lat: 12.972, lng: 77.5965 };
  assert.notEqual(encode(user.lat, user.lng, 6), encode(cafe.lat, cafe.lng, 6));
  assert.deepEqual(query([cafe], user, 6, 200, 'own').missed, [1]);
  assert.deepEqual(query([cafe], user, 6, 200, 'nine').inside, [1]);
});

test('9 cells never miss when the cell shorter side is at least the radius', () => {
  const pts = samplePoints();
  for (const p of pts.slice(0, 40)) {
    const r = query(pts, p, 5, 2000, 'nine');
    assert.ok(blockCovers(r.cell, 2000));
    assert.equal(r.missed.length, 0);
  }
});

test('precision 6 with a 2 km radius can miss (cell is only 0.6 km tall)', () => {
  assert.equal(blockCovers('tdr1v9', 2000), false);
  const pts = samplePoints();
  const missed = pts.slice(0, 80).reduce((n, p) => n + query(pts, p, 6, 2000, 'nine').missed.length, 0);
  assert.ok(missed > 0);
});

test('checked is a superset of inside', () => {
  const pts = samplePoints();
  const r = query(pts, CENTER, 6, 1000, 'nine');
  for (const id of r.inside) assert.ok(r.checked.includes(id));
});
