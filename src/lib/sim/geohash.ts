// Pure logic for GeohashSim: geohash encode/decode, neighbours, haversine, and a radius query over sample points.
export const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
export interface Box { latMin: number; latMax: number; lngMin: number; lngMax: number }
export interface Pt { id: number; lat: number; lng: number }

export function encode(lat: number, lng: number, precision: number): string {
  let latR: [number, number] = [-90, 90], lngR: [number, number] = [-180, 180];
  let out = '', bits = 0, ch = 0, evenBit = true;
  while (out.length < precision) {
    const r = evenBit ? lngR : latR;
    const v = evenBit ? lng : lat;
    const mid = (r[0] + r[1]) / 2;
    ch <<= 1;
    if (v >= mid) { ch |= 1; r[0] = mid; } else r[1] = mid;
    evenBit = !evenBit;
    if (++bits === 5) { out += BASE32[ch]; bits = 0; ch = 0; }
  }
  return out;
}

export function decodeBox(hash: string): Box {
  let latR: [number, number] = [-90, 90], lngR: [number, number] = [-180, 180];
  let evenBit = true;
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    for (let n = 4; n >= 0; n--) {
      const r = evenBit ? lngR : latR;
      const mid = (r[0] + r[1]) / 2;
      if ((idx >> n) & 1) r[0] = mid; else r[1] = mid;
      evenBit = !evenBit;
    }
  }
  return { latMin: latR[0], latMax: latR[1], lngMin: lngR[0], lngMax: lngR[1] };
}

// The 8 neighbours, found by stepping one cell from the centre and re-encoding. Longitude wraps at +-180;
// a step past a pole has no cell, so it is skipped.
export function neighbours(hash: string): string[] {
  const b = decodeBox(hash);
  const h = b.latMax - b.latMin, w = b.lngMax - b.lngMin;
  const cLat = (b.latMin + b.latMax) / 2, cLng = (b.lngMin + b.lngMax) / 2;
  const out: string[] = [];
  for (const dy of [1, 0, -1]) for (const dx of [-1, 0, 1]) {
    if (!dx && !dy) continue;
    const lat = cLat + dy * h;
    if (lat > 90 || lat < -90) continue;
    let lng = cLng + dx * w;
    if (lng >= 180) lng -= 360;
    if (lng < -180) lng += 360;
    out.push(encode(lat, lng, hash.length));
  }
  return out;
}

const R = 6371000;
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const CENTER = { lat: 12.9716, lng: 77.5946 };

// Deterministic sample "places" in a square about 8 km on a side around CENTER (mulberry32 PRNG).
export function samplePoints(n = 400, spanDeg = 0.036): Pt[] {
  let s = 0x9e3779b9;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Array.from({ length: n }, (_, id) => ({ id, lat: CENTER.lat + (rnd() * 2 - 1) * spanDeg, lng: CENTER.lng + (rnd() * 2 - 1) * spanDeg }));
}

export type Mode = 'own' | 'nine';
export interface QueryResult {
  cell: string; cells: string[];
  checked: number[];   // inside the searched cells, so haversine runs on them
  inside: number[];    // checked and within the radius: the answer
  missed: number[];    // within the radius but outside every searched cell: wrong answer
}

export function query(points: Pt[], user: { lat: number; lng: number }, precision: number, radiusM: number, mode: Mode): QueryResult {
  const cell = encode(user.lat, user.lng, precision);
  const cells = mode === 'own' ? [cell] : [cell, ...neighbours(cell)];
  const set = new Set(cells);
  const checked: number[] = [], inside: number[] = [], missed: number[] = [];
  for (const p of points) {
    const within = haversine(user, p) <= radiusM;
    if (set.has(encode(p.lat, p.lng, precision))) { checked.push(p.id); if (within) inside.push(p.id); }
    else if (within) missed.push(p.id);
  }
  return { cell, cells, checked, inside, missed };
}

// Rule of thumb from the lesson: the 3 x 3 block covers the circle when the cell's shorter side is at least the radius.
export function blockCovers(hash: string, radiusM: number): boolean {
  const b = decodeBox(hash);
  const midLat = (b.latMin + b.latMax) / 2;
  const hM = (b.latMax - b.latMin) * 111195;
  const wM = (b.lngMax - b.lngMin) * 111195 * Math.cos(midLat * Math.PI / 180);
  return Math.min(hM, wM) >= radiusM;
}
