const { run, parse } = require('./harness');
const assert = require('assert');
let n = 0;
const t = (name, fn) => {
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { console.log('BUG   ' + name + '\n        -> ' + e.message.split('\n')[0]); n++; }
};
const base = { vendor: 'Shop', date: '2026-11-10', subtotal: 10, gst: 0.5, pst: 0.7, hst: 0, total: 11.2, currency: 'CAD', category: 'Shopping', confidence: 0.9, notes: '' };

t('1 split: your share + IOUs == total (uneven 3-way $10.00)', () => {
  const o = parse({ ...base, total: 10 }, { 'Split with': 'Lucy, Sam' });
  assert.strictEqual(Math.round((o.your_share + o.each_owes * 2) * 100), 1000);
});
t('2 subtotal null must NOT show "totals add up"', () => {
  const o = parse({ ...base, subtotal: null }, {});
  assert(!/add up/.test(o.flag_text), `got: ${o.flag_text}`);
});
t('3 restaurant receipt with tip must not be flagged as a math error', () => {
  const o = parse({ ...base, vendor: 'Pizza', subtotal: 20, gst: 1, pst: 0, total: 25, category: 'Dining & coffee' }, {});
  assert(o.flags.length === 0, `got: ${o.flag_text}`);
});
t('4 HST (Ontario 13%) receipt must not claim items are tax-exempt', () => {
  const o = parse({ ...base, subtotal: 100, gst: 0, pst: 0, hst: 13, total: 113 }, {});
  assert(!/exempt/.test(o.info_text), `got info: "${o.info_text}"`);
});
t('5 Quebec QST 9.975% must not trip the "PST more than 7%" flag', () => {
  const o = parse({ ...base, subtotal: 100, gst: 5, pst: 9.98, total: 114.98 }, {});
  assert(o.flags.length === 0, `got: ${o.flag_text}`);
});
t('6 BC liquor (10% PST) must not trip the PST>7% flag', () => {
  const o = parse({ ...base, subtotal: 100, gst: 5, pst: 10, total: 115 }, {});
  assert(o.flags.length === 0, `got: ${o.flag_text}`);
});
t('7 no date printed -> fallback date should be flagged', () => {
  const o = parse({ ...base, date: null }, {});
  assert(o.flags.some(f => /date/i.test(f)), 'silently used today, no flag');
});
t('8 date fallback in Vancouver evening (Nov 30 5pm PST) must stay Nov 30', () => {
  const o = parse({ ...base, date: null }, {}, '2026-12-01T01:00:00Z');
  assert.strictEqual(o.date, '2026-11-30', `got ${o.date}`);
});
t('9 year-misread / future date flagged (2019 and 2031)', () => {
  const a = parse({ ...base, date: '2019-11-10' }, {}), b = parse({ ...base, date: '2031-11-10' }, {});
  assert(a.flags.length && b.flags.length, 'accepted silently');
});
t('10 USD receipt must be flagged / converted, not summed into CAD budget', () => {
  const o = parse({ ...base, currency: 'USD' }, {});
  assert(o.flags.some(f => /USD|currency/i.test(f)), 'no flag');
});
t('11 confidence 40 (percent scale) is treated as low', () => {
  const p = parse({ ...base, confidence: 40 }, {});
  assert(p.flags.some(f => /sure/.test(f)), 'confidence=40 passes as >0.7');
});
t('12 "$11.20" string total parses', () => {
  const o = parse({ ...base, total: '$11.20' }, {});
  assert.strictEqual(o.total, 11.2, `got ${o.total}`);
});
t('13 duplicate names / case: "Lucy, lucy"', () => {
  const o = parse({ ...base, total: 30 }, { 'Split with': 'Lucy, lucy' });
  assert(o.split_with.split(',').length === 1, `got "${o.split_with}" each_owes=${o.each_owes}`);
});

// Build row
const parsed = { vendor: 'Shoppers', notes: '', date: '2026-11-10', subtotal: 10, gst: .5, pst: .7, hst: 0, total: 11.2, your_share: 11.2, split_with: '', each_owes: 0, currency: 'CAD', category: 'Health', paid_with: 'Debit', flag_text: 'ok' };
const build = f => run('Build row', { input: f, nodes: { 'Parse + check': parsed } });
t('14 Decision ["Approve"] array parses', () => assert.strictEqual(build({ Decision: '["Approve"]' }).Category, 'Health'));
t('15 "Change category" with no category chosen keeps the AI category and says so', () => {
  const r = build({ Decision: 'Change category' });
  assert.strictEqual(r.Category, 'Health');
  assert(/none was picked/.test(r.Checks), r.Checks);
});
t('16 Approve + a category picked: user intent silently ignored', () => {
  const r = build({ Decision: 'Approve', Category: 'Groceries' });
  assert.strictEqual(r.Category, 'Groceries', `logged as ${r.Category}`);
});
const noTotal = { ...parsed, total: null, flag_text: '⚠ Total could not be read' };
t('17 unreadable total never reaches the ledger as a blank row', () => {
  assert.throws(() => run('Build row', { input: { Decision: 'Approve' }, nodes: { 'Parse + check': noTotal } }), /Fix total/);
});
t('17b a typed "Fix total" logs that total and re-splits it', () => {
  const r = run('Build row', { input: { Decision: '["Approve"]', 'Fix total (optional)': '12.40' }, nodes: { 'Parse + check': { ...noTotal, split_with: 'Lucy' } } });
  assert.strictEqual(r.Total, 12.4); assert.strictEqual(r['Each owes you'], 6.2); assert(/fixed by you/.test(r.Checks), r.Checks);
});
t('17c a typed "Fix date" replaces the AI date', () => {
  const r = build({ Decision: 'Approve', 'Fix date (optional)': '2026-11-02' });
  assert.strictEqual(r.Date, '2026-11-02');
});

// Budget math
const bm = (rows, row, now) => run('Budget math', { input: rows, nodes: { 'Build row': row }, now });
const rowOf = (date, share, cat = 'Shopping') => ({ Date: date, 'Your share': share, Category: cat, Total: share, 'Split with': '', 'Each owes you': '' });
const cur = (d, s) => ({ ...rowOf(d, s), Vendor: 'X', 'Keep for taxes': '' });
t('18 month boundary: Nov 30 5pm Vancouver (UTC Dec 1) counts November spend', () => {
  const r = bm([rowOf('2026-11-30', 20)], cur('2026-11-30', 20), '2026-12-01T01:00:00Z');
  assert.strictEqual(r.count, 1, `count=${r.count}, spent=$${r.spent} (page says month budget is empty)`);
});
t('19 Sheets returns US-locale dates "11/16/2026" -> rows silently dropped', () => {
  const r = bm([rowOf('11/16/2026', 20)], cur('2026-11-16', 20), '2026-11-16T20:00:00Z');
  assert.strictEqual(r.count, 1, `count=${r.count}`);
});
t('20 currency-formatted cells "$20.00" in Your share parse', () => {
  const r = bm([rowOf('2026-11-16', '$20.00')], cur('2026-11-16', 20), '2026-11-16T20:00:00Z');
  assert.strictEqual(r.spent, '20.00', `spent=${r.spent}`);
});
t('21 over budget (spent $645): wording is sane', () => {
  const r = bm([rowOf('2026-11-16', 645)], cur('2026-11-16', 645), '2026-11-16T20:00:00Z');
  assert(!/\$-/.test(r.done_html) && Number(r.left) >= 0, `Left row renders "$${r.left}"; pct field=${r.pct}`);
});
t('22 IOU names merge case-insensitively (Lucy vs lucy)', () => {
  const rows = [{ ...rowOf('2026-11-16', 5), 'Split with': 'Lucy', 'Each owes you': 5 }, { ...rowOf('2026-11-16', 5), 'Split with': 'lucy', 'Each owes you': 5 }];
  const r = bm(rows, cur('2026-11-16', 5), '2026-11-16T20:00:00Z');
  assert(/Lucy \$10/.test(r.owed), r.owed);
});
t('23 model reply that is not JSON becomes an unreadable review, not a crash', () => {
  const o = run('Parse + check', { input: { content: 'Sorry, I cannot read that.' }, nodes: { 'Upload receipt': {} } });
  assert.strictEqual(o.total, null); assert(/receipt we can read/.test(o.flag_text), o.flag_text);
});
t('24 AI says it is not a receipt', () => {
  const o = parse({ ...base, is_receipt: false }, {});
  assert.strictEqual(o.total, null);
});
t('25 clean BC receipt shows the verified check', () => {
  const o = parse(base, {});
  assert(o.verified && /Checked/.test(o.flag_text), o.flag_text);
});
console.log(`\n${n} failing `);
t('26 empty "Fix total" that n8n sends as 0 keeps the AI total', () => {
  const r = build({ Decision: 'Approve', 'Fix total (optional)': 0 });
  assert.strictEqual(r.Total, 11.2, `logged ${r.Total}`);
});
console.log(`${n} failing after test 26`);
