// Pure View -> HTML/SVG string renderers for <DryRun>. Used at build time (no-JS fallback) and in the browser.
import type { Frame, View, Val, ArrayView, GridView, ListView, MapView, TreeView, TreeNode, GraphView, RecursionView, TextView } from './dryrun.ts';

export const esc = (x: unknown) => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const name = (n?: string) => (n ? `<figcaption class="dr-name">${esc(n)}</figcaption>` : '');
const fig = (kind: string, label: string, body: string, n?: string) =>
  `<figure class="dr-view dr-${kind}" role="group" aria-label="${esc(label)}">${name(n)}${body}</figure>`;

// ---- layout (exported for tests) ---------------------------------------------------------------
export interface Placed { id: string; label: string; x: number; y: number; parent?: string; edge?: string }
// Binary tree: x = in-order slot, y = depth.
export function layoutTree(root: TreeNode | null | undefined, slot = 46, row = 54): Placed[] {
  const out: Placed[] = []; let k = 0;
  const walk = (n: TreeNode | null | undefined, d: number, parent?: string): void => {
    if (!n) return;
    const id = n.id ?? String(n.v);
    walk(n.l, d + 1, id);
    out.push({ id, label: String(n.v), x: slot / 2 + k++ * slot, y: 22 + d * row, parent });
    walk(n.r, d + 1, id);
  };
  walk(root, 0);
  return out;
}
export function treeFromArray(a: (Val | null)[]): TreeNode | null {
  const build = (i: number): TreeNode | null => (i >= a.length || a[i] === null ? null : { id: String(i), v: a[i]!, l: build(2 * i + 1), r: build(2 * i + 2) });
  return build(0);
}
// General tree (decision tree): leaves take consecutive slots, parents sit above the middle of their children.
export function layoutRecursion(nodes: RecursionView['nodes'], row = 56): { placed: Placed[]; width: number; height: number } {
  const kids = new Map<string, string[]>();
  for (const n of nodes) if (n.parent != null) kids.set(n.parent, [...(kids.get(n.parent) || []), n.id]);
  const widths = nodes.map(n => String(n.label).length * 7.2 + 18);
  const slot = Math.max(40, ...widths) + 8;
  const pos = new Map<string, { x: number; y: number }>(); let leaf = 0, maxD = 0;
  const walk = (id: string, d: number): number => {
    maxD = Math.max(maxD, d);
    const cs = kids.get(id) || [];
    const x = cs.length ? cs.map(c => walk(c, d + 1)).reduce((a, b) => a + b, 0) / cs.length : slot / 2 + leaf++ * slot;
    pos.set(id, { x, y: 22 + d * row });
    return x;
  };
  for (const n of nodes) if (n.parent == null) walk(n.id, 0);
  const placed = nodes.filter(n => pos.has(n.id)).map(n => ({ id: n.id, label: String(n.label), ...pos.get(n.id)!, parent: n.parent ?? undefined, edge: n.edge }));
  return { placed, width: Math.max(slot, leaf * slot), height: 44 + maxD * row };
}
export function circularLayout(ids: string[], w = 320, h = 220): Record<string, [number, number]> {
  const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 - 28;
  return Object.fromEntries(ids.map((id, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, ids.length) - Math.PI / 2;
    return [id, [Math.round(cx + rad * Math.cos(a)), Math.round(cy + rad * Math.sin(a))]];
  }));
}

// ---- views -------------------------------------------------------------------------------------
function array(v: ArrayView): string {
  const ptrAt = new Map<number, string[]>();
  for (const p of v.pointers || []) ptrAt.set(p.at, [...(ptrAt.get(p.at) || []), `<span class="t-${p.tone || 'gold'}">${esc(p.label)}</span>`]);
  const reg = new Map<number, { tone: string; first: boolean; label?: string }>();
  for (const r of v.regions || []) for (let i = r.from; i <= r.to; i++) reg.set(i, { tone: r.tone || 'gold', first: i === r.from, label: r.label });
  const cols = v.values.map((val, i) => {
    const t = v.tones?.[i], rg = reg.get(i);
    const state = t ? `, ${t}` : '';
    const ptrs = (v.pointers || []).filter(p => p.at === i).map(p => p.label);
    return `${v.join && i ? `<span class="dr-join" aria-hidden="true">${esc(v.join)}</span>` : ''}<div class="dr-col" role="listitem" aria-label="${esc(`${v.indices === false ? '' : `index ${i}: `}${val}${state}${ptrs.length ? `, pointer ${ptrs.join(' and ')}` : ''}`)}">`
      + `<span class="dr-ptr" aria-hidden="true">${ptrAt.get(i)?.join(' · ') || ''}</span>`
      + `<span class="dr-cell${t ? ` tone-${t}` : ''}">${esc(val)}</span>`
      + (v.indices === false ? '' : `<span class="dr-idx" aria-hidden="true">${i}</span>`)
      + `<span class="dr-reg${rg ? ` t-${rg.tone} on` : ''}"></span><span class="dr-reglbl t-${rg?.tone || 'gold'}">${rg?.first && rg.label ? esc(rg.label) : '&nbsp;'}</span></div>`;
  }).join('');
  return fig('array', `${v.name || 'array'}: ${v.values.length ? v.values.join(', ') : 'empty'}`, `<div class="dr-scroll"><div class="dr-row" role="list">${cols || '<span class="dr-empty">empty</span>'}</div></div>`, v.name);
}

function grid(v: GridView): string {
  const tone = new Map((v.tones || []).map(t => [`${t.r},${t.c}`, t.tone]));
  const ptr = new Map<string, string>();
  for (const p of v.pointers || []) ptr.set(`${p.r},${p.c}`, `<span class="dr-gptr t-${p.tone || 'gold'}">${esc(p.label)}</span>`);
  const head = v.colLabels ? `<tr><td class="dr-corner"></td>${v.colLabels.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr>` : '';
  const rows = v.cells.map((row, r) => `<tr>${v.rowLabels ? `<th scope="row">${esc(v.rowLabels[r] ?? '')}</th>` : ''}${row.map((c, k) => {
    const t = tone.get(`${r},${k}`);
    return `<td class="dr-cell${t ? ` tone-${t}` : ''}${c === null ? ' blank' : ''}"${t ? ` title="${t}"` : ''}>${c === null ? '·' : esc(c)}${t === 'found' ? '<span class="dr-mark" aria-label="selected">✓</span>' : ''}${ptr.get(`${r},${k}`) || ''}</td>`;
  }).join('')}</tr>`).join('');
  const marked = (v.tones || []).map(t => `row ${t.r} column ${t.c} ${t.tone}`).join('; ');
  return fig('grid', `${v.name || 'table'}, ${v.cells.length} rows by ${v.cells[0]?.length ?? 0} columns${marked ? `. Highlighted: ${marked}` : ''}`, `<div class="dr-scroll"><table class="dr-table"><tbody>${head}${rows}</tbody></table></div>`, v.name);
}

function list(v: ListView | MapView): string {
  const entries: string[] = v.kind === 'map' ? v.entries.map(([k, x]) => `${k}: ${x}`) : v.items.map(String);
  const tag: Record<string, string> = { stack: 'top', queue: 'front', set: '', map: '' };
  const chips = entries.map((e, i) => {
    const edge = v.kind === 'stack' ? i === entries.length - 1 : v.kind === 'queue' ? i === 0 : false;
    const hot = v.changed?.includes(i);
    return `<li class="dr-chip${hot ? ' just' : ''}${edge ? ' edge' : ''}">${esc(e)}${edge ? `<small>${tag[v.kind]}</small>` : ''}${hot ? '<small class="new">new</small>' : ''}</li>`;
  }).join('');
  const gone = (v.removed || []).map(x => `<li class="dr-chip gone">${esc(x)}<small>removed</small></li>`).join('');
  const empty = !entries.length ? `<li class="dr-chip empty">${esc(v.note || 'empty')}</li>` : '';
  const order = v.kind === 'stack' ? `${gone}${chips}${empty}` : `${empty}${chips}${gone}`;
  const label = `${v.name || v.kind}: ${entries.length ? entries.join(', ') : 'empty'}${v.kind === 'stack' && entries.length ? ' (last is the top)' : ''}${v.kind === 'queue' && entries.length ? ' (first is the front)' : ''}${v.removed?.length ? `. Just removed: ${v.removed.join(', ')}` : ''}`;
  return fig(`box dr-${v.kind}`, label, `<ul class="dr-chips">${order}</ul>${v.note && entries.length ? `<p class="dr-note">${esc(v.note)}</p>` : ''}`, v.name || v.kind);
}

const svg = (w: number, h: number, label: string, body: string, defs = '') =>
  `<div class="dr-scroll"><svg class="dr-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="min-width:${Math.min(w, 420)}px;max-width:${w}px" role="img" aria-label="${esc(label)}">${defs}${body}</svg></div>`;

function tree(v: TreeView): string {
  const root = v.root ?? (v.array ? treeFromArray(v.array) : null);
  const nodes = layoutTree(root);
  const at = new Map(nodes.map(n => [n.id, n]));
  const onPath = new Set(v.path || []);
  const w = Math.max(46, nodes.length * 46), h = 44 + Math.max(0, ...nodes.map(n => (n.y - 22) / 54)) * 54;
  const edges = nodes.filter(n => n.parent).map(n => { const p = at.get(n.parent!)!; return `<line class="dr-edge${onPath.has(n.id) && onPath.has(p.id) ? ' path' : ''}" x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}"/>`; }).join('');
  const circles = nodes.map(n => `<g class="dr-node tone-${v.tones?.[n.id] || 'none'}${onPath.has(n.id) ? ' onpath' : ''}"><title>${esc(`${n.label}${v.tones?.[n.id] ? `, ${v.tones[n.id]}` : ''}${onPath.has(n.id) ? ', on path' : ''}`)}</title><circle cx="${n.x}" cy="${n.y}" r="17"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle">${esc(n.label)}</text></g>`).join('');
  const desc = nodes.map(n => `${n.label}${v.tones?.[n.id] ? ` (${v.tones[n.id]})` : ''}`).join(', ');
  return fig('tree', `${v.name || 'tree'}: ${desc || 'empty'}${v.path?.length ? `. Path: ${v.path.map(i => at.get(i)?.label ?? i).join(' to ')}` : ''}`, nodes.length ? svg(w, h, `${v.name || 'tree'} diagram`, edges + circles) : '<p class="dr-empty">empty</p>', v.name);
}

function graph(v: GraphView): string {
  const auto = circularLayout(v.nodes.map(n => n.id));
  const p = (id: string): [number, number] => { const n = v.nodes.find(x => x.id === id)!; return n.x !== undefined && n.y !== undefined ? [n.x, n.y] : auto[id]; };
  const R = 16;
  const edges = v.edges.map(e => {
    const [x1, y1] = p(e.from), [x2, y2] = p(e.to);
    const d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    const a = [x1 + ux * R, y1 + uy * R], b = [x2 - ux * (R + (v.directed ? 4 : 0)), y2 - uy * (R + (v.directed ? 4 : 0))];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `<g class="dr-edge${e.tone ? ` e-${e.tone}` : ''}"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"${v.directed ? ' marker-end="url(#dr-arrow)"' : ''}/>${e.weight !== undefined ? `<text class="dr-w" x="${mx}" y="${my - 4}" text-anchor="middle">${esc(e.weight)}</text>` : ''}</g>`;
  }).join('');
  const nodes = v.nodes.map(n => { const [x, y] = p(n.id), t = v.tones?.[n.id]; return `<g class="dr-node tone-${t || 'none'}"><title>${esc(`${n.label ?? n.id}${t ? `, ${t}` : ''}`)}</title><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y + 5}" text-anchor="middle">${esc(n.label ?? n.id)}</text></g>`; }).join('');
  const defs = '<defs><marker id="dr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="dr-arrowhead"/></marker></defs>';
  const states = v.nodes.filter(n => v.tones?.[n.id]).map(n => `${n.label ?? n.id} ${v.tones![n.id]}`).join(', ');
  const active = v.edges.filter(e => e.tone === 'active').map(e => `${e.from} to ${e.to}`).join(', ');
  return fig('graph', `${v.name || 'graph'}, ${v.directed ? 'directed' : 'undirected'}, nodes: ${v.nodes.map(n => n.label ?? n.id).join(', ')}${states ? `. States: ${states}` : ''}${active ? `. Edge in use: ${active}` : ''}`, svg(320, 220, `${v.name || 'graph'} diagram`, edges + nodes, defs), v.name);
}

function recursion(v: RecursionView): string {
  const { placed, width, height } = layoutRecursion(v.nodes);
  const at = new Map(placed.map(n => [n.id, n]));
  const toneOf = new Map(v.nodes.map(n => [n.id, n.tone || 'exploring']));
  const edges = placed.filter(n => n.parent && at.has(n.parent)).map(n => { const p = at.get(n.parent!)!; return `<g class="dr-edge${toneOf.get(n.id) === 'undone' ? ' e-dim' : ''}"><line x1="${p.x}" y1="${p.y + 12}" x2="${n.x}" y2="${n.y - 12}"/>${n.edge ? `<text class="dr-w" x="${(p.x + n.x) / 2 + (n.x < p.x ? -10 : 10)}" y="${(p.y + n.y) / 2 + 3}" text-anchor="middle">${esc(n.edge)}</text>` : ''}</g>`; }).join('');
  const boxes = placed.map(n => { const w = n.label.length * 7.2 + 14, t = toneOf.get(n.id); return `<g class="dr-node rec tone-${t}"><title>${esc(`${n.label}, ${t}`)}</title><rect x="${n.x - w / 2}" y="${n.y - 12}" width="${w}" height="24" rx="7"/><text x="${n.x}" y="${n.y + 4}" text-anchor="middle">${esc(n.label)}</text></g>`; }).join('');
  const label = `${v.name || 'decision tree'}: ${v.nodes.map(n => `${n.label} (${n.tone || 'exploring'})`).join(', ')}`;
  return fig('recursion', label, svg(width, height, `${v.name || 'decision tree'} diagram`, edges + boxes), v.name);
}

function text(v: TextView): string {
  const rows = v.vars.map(x => `<tr class="${x.changed ? 'chg' : ''}"><th scope="row">${esc(x.name)}</th><td>${esc(x.value)}${x.changed ? ' <small class="dr-flag">changed</small>' : ''}</td></tr>`).join('');
  return fig('text', `${v.name || 'variables'}: ${v.vars.map(x => `${x.name} = ${x.value}${x.changed ? ' (changed)' : ''}`).join(', ')}`, `<table class="dr-vars"><tbody>${rows}</tbody></table>`, v.name);
}

export function renderView(v: View): string {
  switch (v.kind) {
    case 'array': return array(v);
    case 'grid': return grid(v);
    case 'stack': case 'queue': case 'set': case 'map': return list(v);
    case 'tree': return tree(v);
    case 'graph': return graph(v);
    case 'recursion': return recursion(v);
    case 'text': return text(v);
  }
}

// Colour is never the only signal, so a legend names every tone currently on screen.
export function legend(views: View[]): string[] {
  const out = new Set<string>();
  for (const v of views) {
    if (v.kind === 'array') Object.values(v.tones || {}).forEach(t => out.add(t));
    if (v.kind === 'grid') (v.tones || []).forEach(t => out.add(t.tone));
    if (v.kind === 'tree' || v.kind === 'graph') Object.values(v.tones || {}).forEach(t => out.add(t));
    if (v.kind === 'recursion') v.nodes.forEach(n => out.add(n.tone || 'exploring'));
  }
  return [...out];
}
export const renderFrame = (f: Frame) => f.views.map(renderView).join('');
export const renderLegend = (f: Frame) => legend(f.views).map(t => `<span class="dr-key"><i class="sw tone-${t}"></i>${esc(t)}</span>`).join('');
