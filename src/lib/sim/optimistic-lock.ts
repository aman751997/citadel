// Pure model of two writers each selling one item from the same row. No DOM.
export type Mode = 'optimistic' | 'none' | 'pessimistic';
export type Writer = 'A' | 'B';
export interface Row { value: number; version: number }
export interface Step {
  caption: string;
  actor: Writer | '-';
  op: 'init' | 'select' | 'update' | 'commit' | 'blocked';
  attempt: 1 | 2;
  sql: string;
  rows: number | null;
  row: Row;
  lockedBy: Writer | null;
  local: Record<Writer, Row | null>;
  status: Record<Writer, string>;
}

export function buildSteps(mode: Mode, init: Row = { value: 10, version: 1 }): Step[] {
  const row = { ...init };
  let lock: Writer | null = null;
  const local: Record<Writer, Row | null> = { A: null, B: null };
  const status: Record<Writer, string> = { A: 'idle', B: 'idle' };
  const steps: Step[] = [];
  const push = (op: Step['op'], actor: Step['actor'], caption: string, sql = '', rows: number | null = null, attempt: 1 | 2 = 1) =>
    steps.push({
      caption, actor, op, attempt, sql, rows, row: { ...row }, lockedBy: lock,
      local: { A: local.A && { ...local.A }, B: local.B && { ...local.B } }, status: { ...status },
    });
  const read = (w: Writer) => { local[w] = { ...row }; };
  // Returns rows affected, like JDBC executeUpdate.
  const update = (w: Writer, checkVersion: boolean) => {
    if (checkVersion && row.version !== local[w]!.version) return 0;
    row.value = local[w]!.value - 1;
    if (checkVersion) row.version += 1;
    return 1;
  };
  const sel = mode === 'optimistic' ? 'SELECT qty, version FROM stock WHERE id = 1;' : 'SELECT qty FROM stock WHERE id = 1;';
  const upd = (w: Writer) => {
    const l = local[w]!;
    return mode === 'optimistic'
      ? `UPDATE stock SET qty = ${l.value - 1}, version = ${l.version + 1}\nWHERE id = 1 AND version = ${l.version};`
      : `UPDATE stock SET qty = ${l.value - 1} WHERE id = 1;`;
  };

  push('init', '-', `The row holds qty = ${row.value}${mode === 'optimistic' ? `, version = ${row.version}` : ''}. Writers A and B each want to sell one item, so the correct final qty is ${init.value - 2}.`);

  if (mode === 'pessimistic') {
    const lockSql = 'BEGIN;\nSELECT qty FROM stock WHERE id = 1 FOR UPDATE;';
    lock = 'A'; read('A'); status.A = `holds lock, read qty ${local.A!.value}`;
    push('select', 'A', 'A locks the row while reading it. Nobody else can write or lock it until A commits.', lockSql);
    status.B = 'BLOCKED waiting for A';
    push('blocked', 'B', 'B runs the same SELECT ... FOR UPDATE and the database makes it wait. B has read nothing yet, so it cannot work from stale data.', lockSql);
    row.value = local.A!.value - 1; status.A = 'wrote, not yet committed';
    push('update', 'A', `A sells one item: qty becomes ${row.value}. B is still blocked.`, upd('A'), 1);
    lock = null; status.A = 'committed';
    push('commit', 'A', 'A commits and releases the lock.', 'COMMIT;');
    lock = 'B'; read('B'); status.B = `unblocked, read qty ${local.B!.value}`;
    push('select', 'B', `B wakes up and its SELECT returns the fresh value, qty = ${local.B!.value}. B now holds the lock.`, '-- B\'s waiting SELECT ... FOR UPDATE returns', null, 2);
    update('B', false); status.B = 'wrote, not yet committed';
    push('update', 'B', `B sells one item from the correct value: qty = ${row.value}.`, upd('B'), 1, 2);
    lock = null; status.B = 'committed';
    push('commit', 'B', `B commits. Final qty = ${row.value}, correct. The price: B sat idle while A worked, and a long transaction would hold everyone up.`, 'COMMIT;', null, 2);
    return steps;
  }

  read('A'); status.A = `read qty ${local.A!.value}`;
  push('select', 'A', `A reads the row: qty = ${local.A!.value}${mode === 'optimistic' ? `, version = ${local.A!.version}` : ''}.`, sel);
  read('B'); status.B = `read qty ${local.B!.value}`;
  push('select', 'B', `B reads the same row before A has written anything: qty = ${local.B!.value}${mode === 'optimistic' ? `, version = ${local.B!.version}` : ''}. Both now hold the same snapshot.`, sel);

  const check = mode === 'optimistic';
  let rows = update('A', check); status.A = 'committed';
  push('update', 'A', check
    ? `A's UPDATE matches version ${local.A!.version}, so 1 row is affected. qty = ${row.value}, version is now ${row.version}.`
    : `A's UPDATE has no version condition, so it simply writes qty = ${row.value}.`, upd('A'), rows);

  if (!check) {
    const stale = local.B!.value;
    rows = update('B', false); status.B = 'committed (overwrote A)';
    push('update', 'B', `B writes qty = ${row.value} computed from its stale copy (${stale}). The database reports success, A's sale vanished, and final qty is ${row.value} instead of ${init.value - 2}. This is a lost update.`, upd('B'), rows);
    return steps;
  }

  const bSql = upd('B');
  rows = update('B', true);
  status.B = 'CONFLICT: 0 rows affected';
  push('update', 'B', `B runs the same UPDATE guarded by version ${local.B!.version}, but the row is now at version ${row.version}. 0 rows affected, so B knows someone else got there first and nothing was overwritten.`, bSql, rows);
  read('B'); status.B = `re-read qty ${local.B!.value}, retrying`;
  push('select', 'B', `B retries: it re-reads the row and now sees qty = ${local.B!.value}, version = ${local.B!.version}.`, sel, null, 2);
  const retrySql = upd('B');
  rows = update('B', true); status.B = 'committed';
  push('update', 'B', `B's retry matches version ${local.B!.version}, 1 row affected. Final qty = ${row.value}, correct, with no locks held while the writers were thinking.`, retrySql, rows, 2);
  return steps;
}
