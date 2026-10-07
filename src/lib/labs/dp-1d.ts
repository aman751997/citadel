// 1-D DP playground: write the scrolls yourself, one cell at a time.
// robber — House Robber: knock (nums[i − 1] + dp[i − 2]) or skip (dp[i − 1]); the scroll keeps the larger.
// coins  — Coin Change: for each amount choose the best LAST coin, or declare the amount unreachable.
// decode — Decode Ways: does a one-digit letter, a two-digit letter, both or neither end here?
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface DpState extends LabBase {
  a: number[];                 // robber: purses
  coins: number[];             // coins: denominations in the box (subset of 1..5)
  amount: number;
  s: string;                   // decode: digits
  dp: (number | null)[];       // written scrolls; null = unreachable (coins only)
  i: number;                   // index of the next scroll to write
  result: number | null;       // set by 'finish'
}

type Input =
  | { mode: 'robber'; a: number[] }
  | { mode: 'coins'; coins: number[]; amount: number }
  | { mode: 'decode'; s: string };

export const DENOMINATIONS = [1, 2, 3, 4, 5];

const robberCases = [[2, 7, 9, 3, 1], [2, 1, 1, 2], [4, 4, 4, 4], [5]];
const coinCases = [{ coins: [1, 3, 4], amount: 6 }, { coins: [2, 5], amount: 8 }, { coins: [2], amount: 3 }, { coins: [1, 2, 5], amount: 0 }];
const decodeCases = ['226', '11106', '100', '27'];

export function fromInput(input: Input): Omit<DpState, keyof LabBase> {
  const base = { a: [] as number[], coins: [] as number[], amount: 0, s: '', dp: [] as (number | null)[], i: 0, result: null };
  if (input.mode === 'robber') {
    const a = [...input.a];
    return { ...base, a, dp: a.length ? [0, a[0]] : [0], i: a.length ? 2 : 1 };
  }
  if (input.mode === 'coins') return { ...base, coins: [...input.coins].sort((x, y) => x - y), amount: input.amount, dp: [0], i: 1 };
  return { ...base, s: input.s, dp: [1], i: 1 };
}

const inf = (v: number | null) => (v === null ? '∞' : String(v));

// ---------- robber ----------
const robberN = (s: DpState) => s.a.length;
const knockValue = (s: DpState) => s.a[s.i - 1] + (s.dp[s.i - 2] as number);
const skipValue = (s: DpState) => s.dp[s.i - 1] as number;
function robberExpected(s: DpState) {
  if (s.i > robberN(s)) return 'finish';
  return knockValue(s) >= skipValue(s) ? 'knock' : 'skip';
}
function robberReject(s: DpState, action: string) {
  const n = robberN(s);
  if (s.i > n) {
    if (action === 'finish') return 'Read the answer.';
    return `All ${n + 1} scrolls are written. The best for the whole street is dp[${n}] = ${s.dp[n]}; read it.`;
  }
  const k = knockValue(s), sk = skipValue(s), h = s.i - 1;
  if (action === 'finish') return `dp[${s.i}] through dp[${n}] are still unwritten, and the answer lives in the last one, dp[${n}].`;
  if (action === 'knock') return `Knocking at house ${h} gives ${s.a[h]} + dp[${s.i - 2}] = ${s.a[h]} + ${s.dp[s.i - 2]} = ${k}, but skipping it keeps dp[${s.i - 1}] = ${sk}, which is more. The scroll records the best for the first ${s.i} houses, so it must say ${sk}.`;
  return `Skipping house ${h} keeps dp[${s.i - 1}] = ${sk}, but knocking gives ${s.a[h]} + dp[${s.i - 2}] = ${s.a[h]} + ${s.dp[s.i - 2]} = ${k}, which is more. House ${s.i - 2} is off-limits if you knock, and dp[${s.i - 2}] already respects that.`;
}
function robberApply(s: DpState, action: string) {
  const n = robberN(s);
  if (action === 'finish') {
    s.done = true;
    s.result = s.dp[n] as number;
    s.message = n ? `dp[${n}] = ${s.result}: the most alms on this street, with no two neighbours knocked.` : 'An empty street holds nothing: dp[0] = 0.';
    return;
  }
  const k = knockValue(s), sk = skipValue(s), h = s.i - 1;
  const value = Math.max(k, sk);
  s.dp.push(value);
  s.message = k === sk
    ? `dp[${s.i}] = ${value}: knocking (${s.a[h]} + ${s.dp[s.i - 2]}) and skipping (${sk}) tie, so either choice writes the same scroll.`
    : action === 'knock'
      ? `dp[${s.i}] = ${s.a[h]} + dp[${s.i - 2}] = ${value}: house ${h} is knocked, and the rest comes from the first ${s.i - 2} houses.`
      : `dp[${s.i}] = dp[${s.i - 1}] = ${value}: house ${h} is skipped; knocking would have given only ${k}.`;
  s.i++;
}
function robberView(s: DpState): LabRow[] {
  const n = robberN(s), writing = s.i <= n && !s.done;
  return [
    {
      name: 'Purses (houses 0..n − 1)', empty: 'No houses',
      cells: s.a.map((v, h) => ({ value: String(v), label: writing && h === s.i - 1 ? 'house i − 1' : undefined, tone: writing && h === s.i - 1 ? 'hot' : h < s.i - 1 ? 'done' : undefined })),
    },
    {
      name: 'dp[i] = best of the first i houses',
      cells: Array.from({ length: n + 1 }, (_, c) => {
        const written = c < s.dp.length;
        let label: string | undefined;
        if (writing && c === s.i) label = 'NEXT';
        else if (writing && c === s.i - 1) label = 'i − 1';
        else if (writing && c === s.i - 2) label = 'i − 2';
        else if (!writing && c === n) label = 'answer';
        return { value: written ? inf(s.dp[c]) : '·', label, tone: written ? (label === 'answer' ? 'hot' : 'done') : 'ghost' };
      }),
    },
  ];
}
function robberDescribe(s: DpState) {
  const n = robberN(s);
  if (s.done) return `Done: dp[${n}] = ${s.result}.`;
  if (s.i > n) return `Every scroll is written. The answer lives in dp[${n}].`;
  const h = s.i - 1;
  return `Writing dp[${s.i}]. Knock at house ${h} (${s.a[h]}) on top of dp[${s.i - 2}] = ${s.dp[s.i - 2]}, or skip it and keep dp[${s.i - 1}] = ${s.dp[s.i - 1]}?`;
}

// ---------- coins ----------
function coinOptions(s: DpState) {
  const options: { c: number; value: number }[] = [];
  for (const c of s.coins) if (c <= s.i && s.dp[s.i - c] !== null) options.push({ c, value: (s.dp[s.i - c] as number) + 1 });
  return options;
}
function bestCoin(s: DpState) {
  const options = coinOptions(s);
  if (!options.length) return null;
  const best = Math.min(...options.map(o => o.value));
  return { best, coins: options.filter(o => o.value === best).map(o => o.c) };
}
function coinsExpected(s: DpState) {
  if (s.i > s.amount) return 'finish';
  const b = bestCoin(s);
  return b ? `c${b.coins[0]}` : 'none';
}
function coinsAlsoValid(s: DpState, action: string) {
  if (s.i > s.amount || !action.startsWith('c')) return false;
  const b = bestCoin(s);
  return !!b && b.coins.includes(Number(action.slice(1)));
}
function coinsReject(s: DpState, action: string) {
  const a = s.i;
  if (a > s.amount) {
    if (action === 'finish') return 'Read the answer.';
    return `Every amount up to ${s.amount} is written. Read dp[${s.amount}].`;
  }
  if (action === 'finish') return `Amounts ${a}..${s.amount} are still unwritten, and the answer lives in dp[${s.amount}].`;
  const b = bestCoin(s);
  if (action === 'none') return `${a} can be made: a last ${b!.coins[0]}-coin after dp[${a - b!.coins[0]}] = ${s.dp[a - b!.coins[0]]} gives ${b!.best} coin(s).`;
  const c = Number(action.slice(1));
  if (!s.coins.includes(c)) return `This box has no ${c}-coin; its coins are ${s.coins.join(', ')}.`;
  if (c > a) return `A ${c}-coin is bigger than ${a}, so it can’t be the last coin of ${a}.`;
  if (s.dp[a - c] === null) return `Amount ${a - c} is unreachable (∞), so a last ${c}-coin leaves something nobody can make. ${b ? `A last ${b.coins[0]}-coin works: ${b.best} coin(s).` : 'No coin works here.'}`;
  if (!b) return `No coin works for ${a}.`;
  return `A last ${c}-coin gives 1 + dp[${a - c}] = 1 + ${s.dp[a - c]} = ${(s.dp[a - c] as number) + 1}, but a last ${b.coins[0]}-coin gives 1 + dp[${a - b.coins[0]}] = ${b.best}. The scroll keeps the fewest.`;
}
function coinsApply(s: DpState, action: string) {
  if (action === 'finish') {
    s.done = true;
    const v = s.dp[s.amount];
    s.result = v === null ? -1 : v;
    s.message = v === null ? `dp[${s.amount}] is still ∞: ${s.amount} can’t be made from ${s.coins.join(', ')}. The answer is −1.` : s.amount === 0 ? 'Zero needs zero coins: dp[0] = 0.' : `dp[${s.amount}] = ${v}: the fewest coins that make ${s.amount}.`;
    return;
  }
  const a = s.i;
  if (action === 'none') {
    s.dp.push(null);
    s.message = `No coin works: every coin is either bigger than ${a} or leaves an unreachable amount. dp[${a}] = ∞.`;
  } else {
    const c = Number(action.slice(1)), value = (s.dp[a - c] as number) + 1;
    s.dp.push(value);
    const ties = bestCoin(s)?.coins ?? [];
    s.message = `dp[${a}] = 1 + dp[${a - c}] = ${value}: a ${c}-coin goes last.` + (ties.length > 1 ? ` (${ties.join(' or ')} tie.)` : '');
  }
  s.i++;
}
function coinsView(s: DpState): LabRow[] {
  const writing = s.i <= s.amount && !s.done;
  return [
    { name: 'Coins in the box', cells: s.coins.map(c => ({ value: String(c) })) },
    {
      name: 'dp[a] = fewest coins for amount a (∞ = unreachable)',
      cells: Array.from({ length: s.amount + 1 }, (_, c) => {
        const written = c < s.dp.length;
        let label: string | undefined;
        if (writing && c === s.i) label = 'NEXT';
        else if (writing && s.coins.some(coin => s.i - coin === c)) label = s.coins.filter(coin => s.i - coin === c).map(coin => `−${coin}`).join(' ');
        else if (!writing && c === s.amount) label = 'answer';
        return { value: written ? inf(s.dp[c]) : '·', label, tone: !written ? 'ghost' : label === 'answer' || (label && label.startsWith('−')) ? 'hot' : s.dp[c] === null ? 'out' : 'done' };
      }),
    },
  ];
}
function coinsDescribe(s: DpState) {
  if (s.done) return `Done: the answer is ${s.result}.`;
  if (s.i > s.amount) return `Every amount up to ${s.amount} is written. Read dp[${s.amount}].`;
  return `Amount ${s.i}: which coin should go last? Each candidate c reads dp[${s.i} − c].`;
}

// ---------- decode ----------
const decodeN = (s: DpState) => s.s.length;
function oneOk(s: DpState) { return s.s[s.i - 1] !== '0'; }
function pairOf(s: DpState) { return s.i >= 2 ? s.s.slice(s.i - 2, s.i) : null; }
function twoOk(s: DpState) { const p = pairOf(s); return p !== null && p[0] !== '0' && Number(p) <= 26; }
function decodeExpected(s: DpState) {
  if (s.i > decodeN(s)) return 'finish';
  const one = oneOk(s), two = twoOk(s);
  return one && two ? 'both' : one ? 'one' : two ? 'two' : 'neither';
}
function whyTwo(s: DpState) {
  const p = pairOf(s);
  if (p === null) return 'there is only one digit so far, and a two-digit letter needs two';
  if (p[0] === '0') return `“${p}” starts with 0, and only 10..26 are two-digit letters`;
  if (Number(p) > 26) return `${p} is past 26 (Z)`;
  return `${p} is a letter (${String.fromCharCode(64 + Number(p))})`;
}
function decodeReject(s: DpState, action: string) {
  const n = decodeN(s);
  if (s.i > n) {
    if (action === 'finish') return 'Read the answer.';
    return `Every digit is read. The answer is dp[${n}] = ${s.dp[n]}.`;
  }
  if (action === 'finish') return `Digits ${s.i}..${n} still have no scroll; the answer lives in dp[${n}].`;
  const d = s.s[s.i - 1], one = oneOk(s), two = twoOk(s);
  const oneText = one ? `${d} alone is a letter (${String.fromCharCode(64 + Number(d))}), adding dp[${s.i - 1}] = ${s.dp[s.i - 1]}` : `the last digit is 0, and 0 is no letter on its own`;
  const twoText = two ? `${whyTwo(s)}, adding dp[${s.i - 2}] = ${s.dp[s.i - 2]}` : whyTwo(s);
  if (action === 'one') return one ? `The one-digit letter works, but so does the two-digit one: ${twoText}. Leaving it out loses those readings.` : `Not the one-digit letter: ${oneText}.`;
  if (action === 'two') return two ? `The two-digit letter works, but so does the one-digit one: ${oneText}. Leaving it out loses those readings.` : `Not a two-digit letter: ${twoText}.`;
  if (action === 'both') return !one ? `Only one of them applies: ${oneText}.` : `Only one of them applies: ${twoText}.`;
  return one ? `Something does end here: ${oneText}.` : `Something does end here: ${twoText}.`;
}
function decodeApply(s: DpState, action: string) {
  const n = decodeN(s);
  if (action === 'finish') {
    s.done = true;
    s.result = s.dp[n] as number;
    s.message = `dp[${n}] = ${s.result}: “${s.s}” can be read ${s.result} way(s).`;
    return;
  }
  const i = s.i, prev1 = s.dp[i - 1] as number, prev2 = i >= 2 ? (s.dp[i - 2] as number) : 0;
  const value = action === 'both' ? prev1 + prev2 : action === 'one' ? prev1 : action === 'two' ? prev2 : 0;
  s.dp.push(value);
  s.message = action === 'both' ? `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${prev1} + ${prev2} = ${value}: the last letter is one digit or two, never both, so the groups add.`
    : action === 'one' ? `dp[${i}] = dp[${i - 1}] = ${value}: only the one-digit letter ends here.`
      : action === 'two' ? `dp[${i}] = dp[${i - 2}] = ${value}: only the two-digit letter ${pairOf(s)} ends here.`
        : `dp[${i}] = 0: no letter can end here. Every scroll after it that depends on it inherits the 0.`;
  s.i++;
}
function decodeView(s: DpState): LabRow[] {
  const n = decodeN(s), writing = s.i <= n && !s.done;
  return [
    {
      name: 'Digits', empty: 'No digits',
      cells: [...s.s].map((ch, k) => ({ value: ch, label: writing && k === s.i - 1 ? 'last' : writing && k === s.i - 2 ? 'pair' : undefined, tone: writing && (k === s.i - 1 || k === s.i - 2) ? 'hot' : k < s.i - 1 ? 'done' : undefined })),
    },
    {
      name: 'dp[i] = readings of the first i digits',
      cells: Array.from({ length: n + 1 }, (_, c) => {
        const written = c < s.dp.length;
        let label: string | undefined;
        if (writing && c === s.i) label = 'NEXT';
        else if (writing && c === s.i - 1) label = 'i − 1';
        else if (writing && c === s.i - 2) label = 'i − 2';
        else if (!writing && c === n) label = 'answer';
        return { value: written ? inf(s.dp[c]) : '·', label, tone: written ? (label === 'answer' ? 'hot' : 'done') : 'ghost' };
      }),
    },
  ];
}
function decodeDescribe(s: DpState) {
  const n = decodeN(s);
  if (s.done) return `Done: ${s.result} reading(s).`;
  if (s.i > n) return `Every digit is read. The answer lives in dp[${n}].`;
  const p = pairOf(s);
  return `Writing dp[${s.i}]. Last digit ${s.s[s.i - 1]}${p ? `, last two ${p}` : ''}. Which letters can end here?`;
}

export const lab = makeLab<DpState>({
  robber: {
    name: 'The almoner’s round (House Robber)',
    cases: robberCases.length,
    actions: [
      { action: 'knock', label: 'Knock: nums[i − 1] + dp[i − 2]' },
      { action: 'skip', label: 'Skip: dp[i − 1]' },
      { action: 'finish', label: 'Read the answer dp[n]' },
    ],
    create: v => fromInput({ mode: 'robber', a: robberCases[v] }),
    expected: robberExpected,
    alsoValid: (s, action) => s.i <= robberN(s) && action === 'skip' && knockValue(s) === skipValue(s),
    apply: robberApply,
    reject: robberReject,
    view: robberView,
    describe: robberDescribe,
  },
  coins: {
    name: 'The offering box (Coin Change)',
    cases: coinCases.length,
    actions: [
      ...DENOMINATIONS.map(c => ({ action: `c${c}`, label: `Last coin ${c}: 1 + dp[a − ${c}]` })),
      { action: 'none', label: 'No coin works: write ∞' },
      { action: 'finish', label: 'Read the answer (∞ → −1)' },
    ],
    create: v => fromInput({ mode: 'coins', ...coinCases[v] }),
    expected: coinsExpected,
    alsoValid: coinsAlsoValid,
    apply: coinsApply,
    reject: coinsReject,
    view: coinsView,
    describe: coinsDescribe,
  },
  decode: {
    name: 'The cipher (Decode Ways)',
    cases: decodeCases.length,
    actions: [
      { action: 'one', label: 'Only one digit: dp[i − 1]' },
      { action: 'two', label: 'Only two digits: dp[i − 2]' },
      { action: 'both', label: 'Both: dp[i − 1] + dp[i − 2]' },
      { action: 'neither', label: 'Neither: 0' },
      { action: 'finish', label: 'Read the answer dp[n]' },
    ],
    create: v => fromInput({ mode: 'decode', s: decodeCases[v] }),
    expected: decodeExpected,
    apply: decodeApply,
    reject: decodeReject,
    view: decodeView,
    describe: decodeDescribe,
  },
}, 'Gold = the scroll being read or written · green = settled · faded = not yet written · ∞ = unreachable');
