// Pure back-of-envelope model for EstimationCalculator. Decimal units (1 KB = 1,000 B), no DOM.
export interface Input {
  dau: number;
  actionsPerUser: number;  // all actions per user per day, reads and writes together
  readsPerWrite: number;   // read:write ratio, e.g. 100 means 100 reads for every write
  payloadKB: number;       // bytes moved per action, and stored per write
  retentionYears: number;
  replication: number;     // full copies kept on disk
  peakFactor: number;      // peak QPS = average QPS x this
  secondsPerDay: number;   // 100,000 (the lesson's rule) or 86,400 (exact)
}
export interface Result {
  actionsPerDay: number; readsPerDay: number; writesPerDay: number;
  avgQps: number; readQps: number; writeQps: number;
  peakQps: number; peakReadQps: number; peakWriteQps: number;
  storageDayBytes: number; storageYearBytes: number; storageRetainedBytes: number; storageRawBytes: number;
  egressPeakBytesPerSec: number; ingressPeakBytesPerSec: number;
  egressPeakGbps: number; ingressPeakGbps: number;
}

export function estimate(i: Input): Result {
  const actionsPerDay = i.dau * i.actionsPerUser;
  const writesPerDay = actionsPerDay / (i.readsPerWrite + 1);
  const readsPerDay = actionsPerDay - writesPerDay;
  const qps = (perDay: number) => perDay / i.secondsPerDay;
  const bytes = i.payloadKB * 1000;
  // Storage grows at the average write rate; capacity (QPS, bandwidth) is sized for peak.
  const storageDayBytes = writesPerDay * bytes;
  const storageYearBytes = storageDayBytes * 365;
  const storageRetainedBytes = storageYearBytes * i.retentionYears;
  const egressPeakBytesPerSec = qps(readsPerDay) * i.peakFactor * bytes;
  const ingressPeakBytesPerSec = qps(writesPerDay) * i.peakFactor * bytes;
  return {
    actionsPerDay, readsPerDay, writesPerDay,
    avgQps: qps(actionsPerDay), readQps: qps(readsPerDay), writeQps: qps(writesPerDay),
    peakQps: qps(actionsPerDay) * i.peakFactor, peakReadQps: qps(readsPerDay) * i.peakFactor, peakWriteQps: qps(writesPerDay) * i.peakFactor,
    storageDayBytes, storageYearBytes, storageRetainedBytes,
    storageRawBytes: storageRetainedBytes * i.replication,
    egressPeakBytesPerSec, ingressPeakBytesPerSec,
    egressPeakGbps: (egressPeakBytesPerSec * 8) / 1e9,
    ingressPeakGbps: (ingressPeakBytesPerSec * 8) / 1e9,
  };
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
// Climbs one x1000 rung at a time, like the lesson says. Three significant digits at most.
export function humanBytes(n: number, suffix = ''): string {
  let v = n, r = 0;
  while (v >= 1000 && r < BYTE_UNITS.length - 1) { v /= 1000; r++; }
  return `${v >= 100 ? Math.round(v) : Number(v.toPrecision(3))} ${BYTE_UNITS[r]}${suffix}`;
}

export function humanCount(n: number): string {
  if (n >= 1e9) return `${Number((n / 1e9).toPrecision(3))}B`;
  if (n >= 1e6) return `${Number((n / 1e6).toPrecision(3))}M`;
  if (n >= 1e3) return `${Number((n / 1e3).toPrecision(3))}K`;
  return String(Number(n.toPrecision(3)));
}

// Log-scale slider: position t (an exponent) to a round value with two significant digits.
export const fromLog = (t: number) => Number((10 ** t).toPrecision(2));
