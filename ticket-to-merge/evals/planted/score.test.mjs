#!/usr/bin/env node
// Self-test for score.mjs: synthetic run files against the real answers.json.
//   node score.test.mjs     (exit 0 = all checks pass)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseRunText, parseRunName, scoreRun, aggregate } from './score.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCORE = path.join(HERE, 'score.mjs');
const answers = JSON.parse(fs.readFileSync(path.join(HERE, 'answers.json'), 'utf8'));
const plant = Object.fromEntries(answers.plants.map((p) => [p.id, p]));

let passed = 0, failed = 0;
function check(name, cond, detail = '') {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}
const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// Verbatim code of the planted lines (what a reviewer would quote as evidence).
const CODE = {
  a39: `const q = query.trim().replace(/'/g, "''");`,
  a42: "`SELECT * FROM books WHERE instr(ulower(title), ulower('${q}')) > 0 OR instr(ulower(author), ulower('${q}')) > 0 ORDER BY title`",
  a31: 'if ([...raw].length > SEARCH_MAX_LENGTH) {',
  a18: 'const books = query ? Book.searchBooks(query) : [];',
  a5: '<p class="no-results">No books match “<%- query %>”.</p>',
  b28: 'const query = (raw as string).trim();',
  b29: 'if ([...query].length >= SEARCH_MAX_LENGTH) {',
  b39: "'SELECT * FROM books WHERE instr(ulower(title), ulower(?)) > 0 OR instr(author, ?) > 0 ORDER BY title',",
  bt30: "expect(titles('Herbert')).toContain('Dune');",
  bt7: "const DB = '/tmp/test-api.db';",
};
const F = (file, line, issue, evidence = '', severity = 'major') => ({ file, line, severity, issue, evidence });
const BOOK = 'src/models/book.ts';

// The guard the regexes must pass: quoting a planted line under an unrelated issue doesn't hit
// any plant whose ±3 window (same branch, same file) covers that line. Known exception, not
// listed: P2's own line a:34 \`const query = raw.trim();\` (the plant's key word is "trim").
const WHERE = {
  a39: ['a', BOOK, 39], a42: ['a', BOOK, 42], a31: ['a', BOOK, 31], a18: ['a', 'src/routes/books.ts', 18],
  a5: ['a', 'src/views/books/search-results.ejs', 5], b28: ['b', BOOK, 28], b29: ['b', BOOK, 29], b39: ['b', BOOK, 39],
  bt30: ['b', 'tests/models/book-search.test.ts', 30], bt7: ['b', 'tests/routes/search-api.test.ts', 7],
};
let guarded = 0;
for (const [k, code] of Object.entries(CODE)) {
  const [branch, file, line] = WHERE[k];
  for (const p of answers.plants.filter((q) => q.branch === branch)) {
    const covers = [{ file: p.file, lines: p.lines }, ...p.also].some((l) => l.file === file && line >= l.lines[0] - 3 && line <= l.lines[1] + 3);
    if (!covers) continue;
    if (p.id === 'P11' && k === 'bt7') continue; // the plant line is the bug's only text
    if (p.id === 'P4' && k === 'bt30') continue; // a bent test line names the plant's own case
    guarded++;
    check(`plant ${p.id} regex does not match bare code ${k}`, !new RegExp(p.match, 'i').test(`Unrelated note\n${code}`));
  }
}
check('guard covered the neighbour pairs', guarded >= 10, String(guarded));

const runs = {
  // fenced review.sh -p output: a hit per plant, a duplicate, a near miss, two unmatched (labelled)
  'a-1.json': {
    fenced: true, cost: 0.91, duration: 151234,
    findings: [
      F(BOOK, 39, 'SQL is built with a template literal and quotes are escaped by hand instead of ? placeholders', CODE.a39),
      F(BOOK, 31, 'Length is checked before trim, so 100 characters padded with spaces return 400', CODE.a31),
      F('src/routes/books.ts', 18, 'An empty query renders no books on the HTML route instead of all 50', CODE.a18),
      F('src/views/books/search-results.ejs', 5, 'The query is echoed unescaped: reflected XSS with ?q=<script>', CODE.a5),
      F(BOOK, 42, 'Interpolating q into the SQL string is injectable', CODE.a42), // duplicate of P1
      F('src/routes/books.ts', 23, 'Empty query shows no results', 'res.render(...)'), // near miss: 19 + 4
      F('src/views/books/index.ejs', 19, "<%- include('search-results') %> renders unescaped HTML", "<%- include('search-results', { books, query: '', error: null }) %>", 'minor'), // P7 wording, wrong file
      F('src/routes/api.ts', 16, 'Error body leaks the internal message', 'return res.status(400).json({ error: parsed.error });'),
    ],
  },
  // bare array: P3/P9 neighbours on each other's line, a hit through an `also` location, P11, a trap that quotes P3's line
  'b-1.json': {
    fenced: false,
    findings: [
      F(BOOK, 28, 'Off-by-one: a query of exactly 100 characters is rejected; the limit should be > not >=', CODE.b29),
      F(BOOK, 29, 'The typeof check is gone: ?q=a&q=b passes an array and .trim throws TypeError (500)', CODE.b28),
      F('tests/models/book-search.test.ts', 30, "AC-2 uses 'Herbert' in the stored case, so the case-sensitive author match is never tested", CODE.bt30, 'minor'),
      F('tests/routes/search-api.test.ts', 7, 'Uses /tmp/test-api.db like api.test.ts; parallel test files clobber each other', CODE.bt7),
      F(BOOK, 29, 'Length counts code points via spread rather than UTF-16 units', CODE.b29, 'minor'),
    ],
  },
  // fenced: one finding matches both P3 and P9 (maximum matching must give both plants), a duplicate, a run-less label
  'b-2.json': {
    fenced: true, cost: 0.88, duration: 140000,
    findings: [
      F(BOOK, 29, 'Validation is broken: >= is off-by-one at exactly 100 chars, and arrays crash with TypeError', CODE.b29),
      F(BOOK, 29, 'Off-by-one: exactly 100 characters is rejected', CODE.b29),
      F(BOOK, 30, 'Boundary: 100-char queries get a 400', 'return { ok: false, error: `…` };'),
      F('src/routes/api.ts', 17, 'No rate limiting on search', "router.get('/books/search', …)", 'minor'),
    ],
  },
  // clean: no plants; unlabelled findings count as false, even one worded like P1 on P1's line
  'clean-1.json': {
    fenced: true, cost: 0.79, duration: 120500,
    findings: [
      F(BOOK, 34, 'Length uses [...query] code points', 'if ([...query].length > SEARCH_MAX_LENGTH) {', 'minor'),
      F('src/db/index.ts', 15, 'ulower is lost after export', 'registerFunctions();'),
      F(BOOK, 39, 'SQL injection through interpolation', "'SELECT * FROM books WHERE instr(ulower(title), ulower(?)) > 0'"),
    ],
  },
  'clean-2.json': { fenced: false, findings: [] },
};

const labels = [
  { branch: 'a', run: 1, file: 'src/views/books/index.ejs', line: 19, label: 'false', note: 'trap: include' },
  { branch: 'a', run: 1, file: 'src/routes/api.ts', line: 16, label: 'real', note: 'synthetic' },
  { branch: 'b', file: 'src/routes/api.ts', line: 17, label: 'false', note: 'no run: every b run' },
  { branch: 'clean', run: 1, file: 'src/db/index.ts', line: 15, label: 'real' },
  { branch: 'a', run: 1, file: BOOK, line: 39, label: 'false', note: 'on a plant hit: ignored' },
  { branch: 'a', run: 1, file: BOOK, line: 99, label: 'false', note: 'typo: matches nothing' },
];

const summaryFor = (fs_) => `Review: ${fs_.length} findings (${fs_.filter((f) => f.severity === 'major').length} major) · raw 9 from 3 reviewers · dropped 2 by verifier · base main 0e6fb66 · spec none · CLAUDE.md no`;
function runText(r) {
  if (!r.fenced) return JSON.stringify(r.findings);
  const result = '```json\n' + JSON.stringify(r.findings, null, 2) + '\n```\n' + summaryFor(r.findings);
  return JSON.stringify({ type: 'result', subtype: 'success', is_error: false, duration_ms: r.duration, total_cost_usd: r.cost, result });
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-test-'));
try {
  for (const [name, r] of Object.entries(runs)) fs.writeFileSync(path.join(dir, name), runText(r));
  fs.writeFileSync(path.join(dir, 'labels.json'), JSON.stringify(labels));

  // ---- parsing ----
  const pa = parseRunText(fs.readFileSync(path.join(dir, 'a-1.json'), 'utf8'));
  eq('fenced: findings parsed', pa.findings.length, 8);
  eq('fenced: cost', pa.cost, 0.91);
  eq('fenced: duration', pa.durationMs, 151234);
  check('fenced: Review line', /^Review: 8 findings/.test(pa.summary || ''), pa.summary);
  const pb = parseRunText(fs.readFileSync(path.join(dir, 'b-1.json'), 'utf8'));
  eq('bare: findings parsed', pb.findings.length, 5);
  eq('bare: no cost', pb.cost, null);
  eq('fenced empty array', parseRunText(JSON.stringify({ result: '```json\n[]\n```\nReview: 0 findings · no changes', total_cost_usd: 0.1 })).findings, []);
  eq('unfenced .result', parseRunText(JSON.stringify({ result: '[]\nReview: 0 findings' })).findings, []);
  eq('run name', parseRunName('/x/y/clean-12.json'), { branch: 'clean', run: 12 });
  let threw = false;
  try { parseRunName('c-1.json'); } catch { threw = true; }
  check('bad run name throws', threw);
  threw = false;
  try { parseRunText(JSON.stringify({ subtype: 'error_max_budget_usd', is_error: true })); } catch (e) { threw = /error_max_budget_usd/.test(e.message); }
  check('budget error run throws with subtype', threw);

  // ---- scoring ----
  const parsed = Object.fromEntries(Object.keys(runs).map((n) => [n, parseRunText(fs.readFileSync(path.join(dir, n), 'utf8'))]));
  const used = new Set();
  const res = {};
  for (const n of Object.keys(runs)) {
    const { branch, run } = parseRunName(n);
    res[n] = scoreRun({ name: `${branch}-${run}`, branch, run, parsed: parsed[n] }, answers, labels, used);
  }
  const ids = (xs) => xs.map((x) => x.id).sort();
  const a1 = res['a-1.json'];
  eq('a-1: a hit per plant', ids(a1.hits), ['P1', 'P2', 'P6', 'P7']);
  eq('a-1: P1 hit is the line-39 finding', a1.hits.find((h) => h.id === 'P1')?.line, 39);
  eq('a-1: duplicate of P1', a1.duplicates.map((d) => `${d.id}:${d.line}`), ['P1:42']);
  eq('a-1: near miss (±4) is unlabelled', a1.unlabelled.map((u) => `${u.file}:${u.line}`), ['src/routes/books.ts:23']);
  eq('a-1: P7 wording in another file is not a hit (labelled false)', a1.labelled.map((l) => `${l.label}:${l.file}:${l.line}`), ['false:src/views/books/index.ejs:19', 'real:src/routes/api.ts:16']);
  eq('a-1: recall', a1.recall, { found: 4, of: 4 });
  eq('a-1: precision range', a1.precision, { min: 6 / 8, max: 7 / 8 });

  const b1 = res['b-1.json'];
  eq('b-1: all four plants', ids(b1.hits), ['P11', 'P3', 'P4', 'P9']);
  eq('b-1: P3 wording on P9 line -> P3', b1.hits.find((h) => h.id === 'P3')?.line, 28);
  eq('b-1: P9 wording on P3 line -> P9', b1.hits.find((h) => h.id === 'P9')?.line, 29);
  eq('b-1: P4 through its also location', b1.hits.find((h) => h.id === 'P4')?.file, 'tests/models/book-search.test.ts');
  eq('b-1: trap quoting P3 line is unlabelled, not a hit', b1.unlabelled.map((u) => `${u.file}:${u.line}`), [`${BOOK}:29`]);
  eq('b-1: no duplicates', b1.duplicates, []);
  eq('b-1: precision range', b1.precision, { min: 4 / 5, max: 1 });

  const b2 = res['b-2.json'];
  eq('b-2: ambiguous finding + P3-only finding -> both P3 and P9', ids(b2.hits), ['P3', 'P9']);
  eq('b-2: the ambiguous finding takes P9', b2.hits.find((h) => h.id === 'P9')?.issue.startsWith('Validation is broken') ?? false, true);
  eq('b-2: third P3 finding is a duplicate', b2.duplicates.map((d) => `${d.id}:${d.line}`), ['P3:30']);
  eq('b-2: missed', b2.missed, ['P4', 'P11']);
  eq('b-2: run-less label applies', b2.labelled.map((l) => l.label), ['false']);
  eq('b-2: precision exact when all labelled', b2.precision, { min: 3 / 4, max: 3 / 4 });

  const c1 = res['clean-1.json'];
  eq('clean-1: no recall', c1.recall, null);
  eq('clean-1: no hits on clean, even P1 wording', c1.hits.length + c1.duplicates.length, 0);
  eq('clean-1: unlabelled count against precision', c1.precision, { min: 1 / 3, max: 1 / 3 });
  eq('clean-1: false count', c1.falseCount, 2);
  eq('clean-2: no findings -> precision n/a', res['clean-2.json'].precision, null);

  eq('unused labels', labels.filter((l) => !used.has(l)).map((l) => l.line), [39, 99]);

  const results = ['a-1.json', 'b-1.json', 'clean-1.json', 'b-2.json', 'clean-2.json'].map((n) => res[n]);
  const agg = aggregate(results, answers);
  eq('mean recall a', agg.byBranch.a.recall, 1);
  eq('mean recall b', agg.byBranch.b.recall, 0.75);
  eq('a + b combined only for run 1', agg.combined, [{ run: 1, found: 8, of: 8 }]);
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  check('mean precision b', near(agg.byBranch.b.precision.min, 0.775) && near(agg.byBranch.b.precision.max, 0.875), JSON.stringify(agg.byBranch.b.precision));
  check('mean precision all', near(agg.overall.min, (0.75 + 0.8 + 0.75 + 1 / 3) / 4) && near(agg.overall.max, (0.875 + 1 + 0.75 + 1 / 3) / 4), JSON.stringify(agg.overall));
  const pp = Object.fromEntries(agg.perPlant.map((p) => [p.id, p]));
  eq('P3 pass^k and pass@k', [pp.P3.found, pp.P3.k, pp.P3.passAll, pp.P3.passAny], [2, 2, true, true]);
  eq('P4 found once in 2 runs', [pp.P4.found, pp.P4.k, pp.P4.passAll, pp.P4.passAny], [1, 2, false, true]);
  eq('P1 over 1 run', [pp.P1.found, pp.P1.k, pp.P1.passAll], [1, 1, true]);
  check('cost total', near(agg.cost.total, 0.91 + 0.88 + 0.79) && agg.cost.n === 3, JSON.stringify(agg.cost));

  // ---- CLI ----
  const out = path.join(dir, 'report.md');
  const files = Object.keys(runs).map((n) => path.join(dir, n));
  const cli = spawnSync(process.execPath, [SCORE, ...files, '--labels', path.join(dir, 'labels.json'), '--out', out], { encoding: 'utf8' });
  eq('cli exit', cli.status, 0);
  check('cli stderr empty', cli.stderr === '', cli.stderr);
  const report = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  check('cli --out matches stdout', report === cli.stdout);
  check('report: a-1 row', /\| a-1 \| 8 \| 4 \(P1 P2 P6 P7\) \| 1 \| 1 \/ 1 \| 1 \| 4\/4 = 100% \| 75%–88% \| \$0\.91 \| 151\.2 s \|/.test(report));
  check('report: clean-1 row', /\| clean-1 \| 3 \| 0 \| 0 \| 1 \/ 0 \| 2 \(false\) \| n\/a \| 33% \|/.test(report));
  check('report: combined recall', report.includes('run 1 8/8 = 100%'));
  check('report: pass^k table', /\| P4 \| b \| 1\/2 \| no \| yes \|/.test(report));
  check('report: unlabelled listed with issue', report.includes('src/routes/books.ts:23: Empty query shows no results'));
  check('report: unused labels listed', report.includes('a-1 src/models/book.ts:99 false'));
  check('report: rows in run order', report.indexOf('| a-1 ') < report.indexOf('| b-1 ') && report.indexOf('| clean-1 ') < report.indexOf('| b-2 '));

  fs.writeFileSync(path.join(dir, 'x-1.json'), '[]');
  eq('cli bad name exit 1', spawnSync(process.execPath, [SCORE, path.join(dir, 'x-1.json')]).status, 1);
  fs.writeFileSync(path.join(dir, 'a-9.json'), JSON.stringify({ result: 'no findings here' }));
  eq('cli unparseable result exit 1', spawnSync(process.execPath, [SCORE, path.join(dir, 'a-9.json')]).status, 1);
  eq('cli same run twice exit 1', spawnSync(process.execPath, [SCORE, files[0], files[0]]).status, 1);
  eq('cli no args exit 2', spawnSync(process.execPath, [SCORE]).status, 2);
  eq('cli unknown option exit 2', spawnSync(process.execPath, [SCORE, files[0], '--bogus']).status, 2);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
