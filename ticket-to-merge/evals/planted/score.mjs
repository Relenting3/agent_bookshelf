#!/usr/bin/env node
// Scores /review-pr runs on the planted branches against answers.json.
//
//   node score.mjs <run.json>... [--labels labels.json] [--answers answers.json] [--out report.md]
//
// Run files are named <branch>-<n>.json (branch = clean | a | b) and hold either the
// `review.sh -p` output (claude --output-format json: findings in `.result`, inside a
// ```json fence, then the `Review:` line) or a bare JSON array of findings.
//
// A finding hits a plant when: same branch, same file (the plant's main location or an
// `also` location), line within ±3 of that range, and the plant's `match` regex
// (case-insensitive) matches issue + evidence. Each finding hits at most one plant and each
// plant is hit by at most one finding (maximum matching, nearest line first); a further
// finding on an already-hit plant is a duplicate (real, not a miss). Findings that hit no
// plant are unlabelled unless labels.json labels them:
//   [{ "branch": "a", "run": 1, "file": "src/x.ts", "line": 12, "label": "real"|"false", "note": "…" }]
// (`run` may be omitted to label that file:line in every run of the branch).
//
// Precision = real ÷ findings, real = hits + duplicates + labelled real. While anything is
// unlabelled it is shown as a min–max range (unlabelled counted false … real). On the clean
// branch there are no plants, so no recall, and unlabelled findings count as false.
//
// Exit: 0 report written · 1 bad input · 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TOLERANCE = 3;
export const BRANCHES = ['a', 'b', 'clean'];
const HERE = path.dirname(fileURLToPath(import.meta.url));

class InputError extends Error {}

// ---------- parsing ----------

export function parseRunName(file) {
  const m = /^(clean|a|b)-(\d+)\.json$/.exec(path.basename(file));
  if (!m) throw new InputError(`${file}: name must be <branch>-<n>.json with branch clean|a|b`);
  return { branch: m[1], run: Number(m[2]) };
}

function extractFindings(result, where) {
  const fence = /```json[^\n]*\n([\s\S]*?)\n[ \t]*```/.exec(result);
  const attempts = [];
  if (fence) attempts.push(fence[1]);
  attempts.push(result.trim());
  const lb = result.indexOf('[');
  const review = result.search(/^Review:/m);
  const rb = result.lastIndexOf(']', review === -1 ? result.length : review);
  if (lb !== -1 && rb > lb) attempts.push(result.slice(lb, rb + 1));
  for (const text of attempts) {
    try {
      const v = JSON.parse(text);
      if (Array.isArray(v)) return v;
    } catch {
      // try the next form
    }
  }
  throw new InputError(`${where}: no JSON findings array in .result`);
}

export function parseRunText(text, where = 'run') {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new InputError(`${where}: not JSON (${e.message})`);
  }
  if (Array.isArray(data)) return { findings: data, cost: null, durationMs: null, summary: null };
  if (data && typeof data === 'object') {
    if (typeof data.result !== 'string') {
      const why = data.subtype || (data.is_error ? 'is_error' : 'no .result string');
      throw new InputError(`${where}: no review output (${why})`);
    }
    const summary = /^Review:.*$/m.exec(data.result);
    return {
      findings: extractFindings(data.result, where),
      cost: typeof data.total_cost_usd === 'number' ? data.total_cost_usd : null,
      durationMs: typeof data.duration_ms === 'number' ? data.duration_ms : null,
      summary: summary ? summary[0] : null,
    };
  }
  throw new InputError(`${where}: expected an object with .result or an array`);
}

function normFinding(f, where, i) {
  if (!f || typeof f !== 'object') throw new InputError(`${where}: finding ${i} is not an object`);
  const line = Number(f.line);
  return {
    file: String(f.file ?? '').replace(/\\/g, '/').replace(/^\.\//, ''),
    line: Number.isFinite(line) ? line : NaN,
    severity: f.severity ?? '',
    issue: String(f.issue ?? ''),
    evidence: String(f.evidence ?? ''),
  };
}

const sameFile = (found, wanted) => found === wanted || found.endsWith('/' + wanted);

// ---------- scoring ----------

function candidates(f, plants) {
  const text = `${f.issue}\n${f.evidence}`;
  const out = [];
  for (const p of plants) {
    let best = Infinity;
    for (const loc of [{ file: p.file, lines: p.lines }, ...(p.also || [])]) {
      if (!sameFile(f.file, loc.file) || Number.isNaN(f.line)) continue;
      const [s, e] = loc.lines;
      const d = f.line < s ? s - f.line : f.line > e ? f.line - e : 0;
      best = Math.min(best, d);
    }
    if (best <= TOLERANCE && p.re.test(text)) out.push({ id: p.id, dist: best });
  }
  return out.sort((x, y) => x.dist - y.dist);
}

// Kuhn's augmenting paths: each plant gets at most one finding, as many plants as possible.
function assign(cands) {
  const owner = new Map();
  const tryAssign = (fi, seen) => {
    for (const c of cands[fi]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (!owner.has(c.id) || tryAssign(owner.get(c.id), seen)) {
        owner.set(c.id, fi);
        return true;
      }
    }
    return false;
  };
  cands.forEach((_, fi) => tryAssign(fi, new Set()));
  const hitOf = new Map();
  for (const [id, fi] of owner) hitOf.set(fi, id);
  return hitOf;
}

function findLabel(labels, branch, run, f) {
  return labels.find(
    (l) =>
      l.branch === branch &&
      (l.run === undefined || l.run === null || Number(l.run) === run) &&
      sameFile(f.file, String(l.file).replace(/^\.\//, '')) &&
      Number(l.line) === f.line
  );
}

export function scoreRun({ name, branch, run, parsed }, answers, labels = [], usedLabels = new Set()) {
  const plants = answers.plants
    .filter((p) => p.branch === branch)
    .map((p) => ({ ...p, re: new RegExp(p.match, 'i') }));
  const findings = parsed.findings.map((f, i) => normFinding(f, name, i));
  const cands = findings.map((f) => candidates(f, plants));
  const hitOf = assign(cands);

  const hits = [], duplicates = [], labelled = [], unlabelled = [];
  findings.forEach((f, fi) => {
    const at = { file: f.file, line: f.line, issue: f.issue };
    if (hitOf.has(fi)) hits.push({ id: hitOf.get(fi), ...at });
    else if (cands[fi].length) duplicates.push({ id: cands[fi][0].id, ...at });
    else {
      const l = findLabel(labels, branch, run, f);
      if (l) {
        usedLabels.add(l);
        labelled.push({ label: l.label, note: l.note ?? '', ...at });
      } else unlabelled.push(at);
    }
  });

  const n = findings.length;
  const labelledReal = labelled.filter((l) => l.label === 'real').length;
  const labelledFalse = labelled.length - labelledReal;
  const real = hits.length + duplicates.length + labelledReal;
  const isClean = branch === 'clean';
  const precision =
    n === 0
      ? null
      : isClean
        ? { min: real / n, max: real / n }
        : { min: real / n, max: (real + unlabelled.length) / n };
  const found = new Set(hits.map((h) => h.id));
  return {
    name, branch, run,
    findings: n,
    hits, duplicates, labelled, unlabelled,
    real, labelledFalse,
    falseCount: labelledFalse + (isClean ? unlabelled.length : 0),
    plants: plants.map((p) => p.id),
    missed: plants.map((p) => p.id).filter((id) => !found.has(id)),
    recall: isClean ? null : { found: found.size, of: plants.length },
    precision,
    cost: parsed.cost,
    durationMs: parsed.durationMs,
    summary: parsed.summary,
  };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function aggregate(results, answers) {
  const byBranch = {};
  for (const b of BRANCHES) {
    const rs = results.filter((r) => r.branch === b);
    const withP = rs.filter((r) => r.precision);
    byBranch[b] = {
      runs: rs.length,
      recall: b === 'clean' ? null : mean(rs.map((r) => r.recall.found / r.recall.of)),
      precision: withP.length
        ? { min: mean(withP.map((r) => r.precision.min)), max: mean(withP.map((r) => r.precision.max)) }
        : null,
    };
  }
  const allP = results.filter((r) => r.precision);
  const overall = allP.length
    ? { min: mean(allP.map((r) => r.precision.min)), max: mean(allP.map((r) => r.precision.max)) }
    : null;

  const runNos = [...new Set(results.map((r) => r.run))].sort((x, y) => x - y);
  const combined = [];
  for (const n of runNos) {
    const a = results.find((r) => r.branch === 'a' && r.run === n);
    const b = results.find((r) => r.branch === 'b' && r.run === n);
    if (a && b) combined.push({ run: n, found: a.recall.found + b.recall.found, of: a.recall.of + b.recall.of });
  }

  const perPlant = answers.plants.map((p) => {
    const rs = results.filter((r) => r.branch === p.branch);
    const found = rs.filter((r) => r.hits.some((h) => h.id === p.id)).length;
    return { id: p.id, branch: p.branch, k: rs.length, found, passAll: rs.length > 0 && found === rs.length, passAny: found > 0 };
  });

  const costs = results.map((r) => r.cost).filter((c) => c !== null);
  return {
    byBranch,
    overall,
    combined,
    combinedMean: mean(combined.map((c) => c.found / c.of)),
    perPlant,
    cost: { total: costs.reduce((a, b) => a + b, 0), n: costs.length },
  };
}

// ---------- report ----------

const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`);
const range = (p) => (!p ? 'n/a' : Math.round(p.min * 100) === Math.round(p.max * 100) ? pct(p.min) : `${pct(p.min)}–${pct(p.max)}`);
const usd = (c) => (c === null ? '—' : `$${c.toFixed(2)}`);
const secs = (ms) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const short = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const loc = (x) => `${x.file}:${Number.isNaN(x.line) ? '?' : x.line}`;

export function render(results, agg, meta) {
  const out = [];
  out.push('# Planted-bug eval: /review-pr', '');
  out.push(
    `Answers: \`${path.relative(process.cwd(), meta.answersPath) || meta.answersPath}\` (base ${meta.answers.base}, source ${meta.answers.source}) · line tolerance ±${TOLERANCE} · labels: ${meta.labelsPath ? `\`${meta.labelsPath}\` (${meta.labelCount})` : 'none'}`,
    ''
  );

  out.push('## Runs', '');
  out.push('| Run | Findings | Hits | Dup | Labelled real / false | Unlabelled | Recall | Precision | Cost | Duration |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const hits = r.hits.length ? `${r.hits.length} (${r.hits.map((h) => h.id).join(' ')})` : '0';
    const rec = r.recall ? `${r.recall.found}/${r.recall.of} = ${pct(r.recall.found / r.recall.of)}` : 'n/a';
    const lr = r.labelled.length - r.labelledFalse;
    out.push(
      `| ${r.name} | ${r.findings} | ${hits} | ${r.duplicates.length} | ${lr} / ${r.labelledFalse} | ${r.unlabelled.length}${r.branch === 'clean' && r.unlabelled.length ? ' (false)' : ''} | ${rec} | ${range(r.precision)} | ${usd(r.cost)} | ${secs(r.durationMs)} |`
    );
  }
  out.push('');
  if (agg.combined.length) {
    out.push('Recall over a + b of the same run (÷ 8): ' + agg.combined.map((c) => `run ${c.run} ${c.found}/${c.of} = ${pct(c.found / c.of)}`).join(' · '), '');
  }

  out.push('## Run details', '');
  for (const r of results) {
    out.push(`### ${r.name}`, '');
    if (r.summary) out.push(`\`${r.summary}\``, '');
    if (r.branch !== 'clean') {
      out.push(`- Hits: ${r.hits.length ? r.hits.map((h) => `${h.id} ${loc(h)}`).join(' · ') : 'none'}`);
      out.push(`- Missed: ${r.missed.length ? r.missed.join(' ') : 'none'}`);
      if (r.duplicates.length) out.push(`- Duplicates: ${r.duplicates.map((d) => `${d.id} ${loc(d)}`).join(' · ')}`);
    }
    for (const l of r.labelled) out.push(`- Labelled ${l.label}: ${loc(l)} ${short(l.issue)}${l.note ? ` (${l.note})` : ''}`);
    if (r.unlabelled.length) {
      out.push(`- Unlabelled${r.branch === 'clean' ? ' (counted false)' : ''}:`);
      for (const u of r.unlabelled) out.push(`  - ${loc(u)}: ${short(u.issue)}`);
    }
    if (!r.findings) out.push('- No findings');
    out.push('');
  }

  out.push('## Across runs', '');
  out.push('| Branch | Runs | Mean recall | Mean precision |', '|---|---|---|---|');
  for (const b of BRANCHES) {
    const s = agg.byBranch[b];
    if (!s.runs) continue;
    out.push(`| ${b} | ${s.runs} | ${b === 'clean' ? 'n/a' : pct(s.recall)} | ${range(s.precision)} |`);
  }
  if (agg.combined.length) out.push(`| a + b (÷ 8) | ${agg.combined.length} | ${pct(agg.combinedMean)} | |`);
  out.push(`| all | ${results.length} | | ${range(agg.overall)} |`, '');

  out.push('| Plant | Branch | Found | pass^k | pass@k |', '|---|---|---|---|---|');
  for (const p of agg.perPlant) {
    if (!p.k) continue;
    out.push(`| ${p.id} | ${p.branch} | ${p.found}/${p.k} | ${p.passAll ? 'yes' : 'no'} | ${p.passAny ? 'yes' : 'no'} |`);
  }
  out.push('');
  if (agg.cost.n) out.push(`Cost: ${usd(agg.cost.total)} over ${agg.cost.n} review${agg.cost.n === 1 ? '' : 's'} (mean ${usd(agg.cost.total / agg.cost.n)}).`, '');
  if (meta.unusedLabels.length) {
    out.push('Labels that matched no unmatched finding (typo, or the finding is a plant hit):');
    for (const l of meta.unusedLabels) out.push(`- ${l.branch}${l.run != null ? `-${l.run}` : ''} ${l.file}:${l.line} ${l.label}`);
    out.push('');
  }
  return out.join('\n');
}

// ---------- CLI ----------

function readJson(p, what) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new InputError(`${what} ${p}: ${e.message}`);
  }
}

function validateLabels(labels, p) {
  if (!Array.isArray(labels)) throw new InputError(`labels ${p}: expected an array`);
  labels.forEach((l, i) => {
    if (!l || !BRANCHES.includes(l.branch) || !l.file || !Number.isFinite(Number(l.line)) || !['real', 'false'].includes(l.label)) {
      throw new InputError(`labels ${p}: entry ${i} needs branch (clean|a|b), file, line and label real|false`);
    }
  });
}

export function main(argv) {
  const files = [];
  let labelsPath = null, outPath = null, answersPath = path.join(HERE, 'answers.json');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--labels' || a === '--out' || a === '--answers') {
      const v = argv[++i];
      if (!v) return usage(`${a} needs a value`);
      if (a === '--labels') labelsPath = v;
      else if (a === '--out') outPath = v;
      else answersPath = v;
    } else if (a === '-h' || a === '--help') {
      process.stdout.write(USAGE);
      return 0;
    } else if (a.startsWith('--')) return usage(`unknown option ${a}`);
    else files.push(a);
  }
  if (!files.length) return usage('no run files');

  try {
    const answers = readJson(answersPath, 'answers');
    const labels = labelsPath ? readJson(labelsPath, 'labels') : [];
    validateLabels(labels, labelsPath);
    const seen = new Set();
    const runs = files.map((f) => {
      const { branch, run } = parseRunName(f);
      const name = `${branch}-${run}`;
      if (seen.has(name)) throw new InputError(`${f}: ${name} given twice`);
      seen.add(name);
      return { name, branch, run, parsed: parseRunText(fs.readFileSync(f, 'utf8'), f) };
    });
    runs.sort((x, y) => x.run - y.run || BRANCHES.indexOf(x.branch) - BRANCHES.indexOf(y.branch));
    const used = new Set();
    const results = runs.map((r) => scoreRun(r, answers, labels, used));
    const agg = aggregate(results, answers);
    const report = render(results, agg, {
      answers, answersPath, labelsPath, labelCount: labels.length,
      unusedLabels: labels.filter((l) => !used.has(l)),
    });
    process.stdout.write(report + '\n');
    if (outPath) fs.writeFileSync(outPath, report + '\n');
    return 0;
  } catch (e) {
    if (e instanceof InputError || e.code === 'ENOENT') {
      process.stderr.write(`score: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
}

const USAGE = 'usage: node score.mjs <branch>-<n>.json... [--labels labels.json] [--answers answers.json] [--out report.md]\n';
function usage(msg) {
  process.stderr.write(`score: ${msg}\n${USAGE}`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
