#!/usr/bin/env node
// Per-stage cost report for one Claude Code session (main transcript + subagent transcripts).
//
//   node ticket-to-merge/scripts/stage-costs.mjs <session-id | path/to/<id>.jsonl> [--expect <usd>] [--out <file.md>]
//
// Session id → ~/.claude/projects/<cwd, every non-alphanumeric char → "-">/<id>.jsonl,
// subagents in <id>/subagents/agent-*.jsonl (+ agent-*.meta.json: agentType, model).
// The transcript format is internal to Claude Code and changes between versions (plan.md, C3).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------- prices: USD per million tokens (week 2 list prices, plan.md Economics) ----------
const PRICES = {
  opus:   { input: 4,    output: 20,   w5m: 5,     w1h: 8,    read: 0.20 },
  sonnet: { input: 2,    output: 10,   w5m: 2.50,  w1h: 4,    read: 0.10 },
  haiku:  { input: 0.10, output: 0.50, w5m: 0.125, w1h: 0.20, read: 0.01 },
};
const FAMILY_RE = /^claude-(opus|sonnet|haiku)-5-5(\b|$|[-[@])/;
const STAGES = ['Build', 'Review', 'Fix loop'];
const MAIN = 'orchestrator (main)';

// ---------- args ----------
function usage(msg) {
  if (msg) console.error(`stage-costs: ${msg}`);
  console.error('usage: node ticket-to-merge/scripts/stage-costs.mjs <session-id | path/to/main.jsonl> [--expect <usd>] [--out <file.md>]');
  process.exit(2);
}
const argv = process.argv.slice(2);
let target, expect = null, out = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--expect') { expect = Number(argv[++i]); if (!Number.isFinite(expect) || expect <= 0) usage('--expect needs a positive number'); }
  else if (a === '--out') { out = argv[++i]; if (!out) usage('--out needs a file'); }
  else if (a === '-h' || a === '--help') usage();
  else if (a.startsWith('--')) usage(`unknown option ${a}`);
  else if (target) usage('only one session');
  else target = a;
}
if (!target) usage('missing session id or transcript path');

let mainPath;
if (target.endsWith('.jsonl') || fs.existsSync(target)) {
  mainPath = path.resolve(target);
} else {
  const projectDir = process.cwd().replace(/[^A-Za-z0-9]/g, '-');
  mainPath = path.join(os.homedir(), '.claude', 'projects', projectDir, `${target}.jsonl`);
}
if (!fs.existsSync(mainPath)) usage(`transcript not found: ${mainPath}`);
const sessionId = path.basename(mainPath, '.jsonl');
const subDir = path.join(path.dirname(mainPath), sessionId, 'subagents');

// ---------- reading ----------
const notes = [];
const warnings = [];

function readJsonl(file) {
  const rows = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); }
    catch { warnings.push(`${path.basename(file)}:${i + 1}: unparseable line skipped`); }
  });
  return rows;
}

function family(model) {
  const m = FAMILY_RE.exec(model || '');
  return m ? m[1] : null;
}

const unknownModels = new Set();
let missingSplit = 0;

// One API call is logged as several rows: dedupe by message.id, keep the row with the largest output_tokens.
function callsOf(rows, agentLabel) {
  const byId = new Map();
  for (const r of rows) {
    const msg = r.message;
    if (r.type !== 'assistant' || !msg || !msg.usage) continue;
    if (msg.model === '<synthetic>') continue; // local placeholder rows, no API call
    const id = msg.id || `${r.uuid}`;
    const ts = Date.parse(r.timestamp);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, { id, agent: agentLabel, model: msg.model, usage: msg.usage, first: ts, last: ts });
    } else {
      prev.first = Math.min(prev.first, ts);
      prev.last = Math.max(prev.last, ts);
      if ((msg.usage.output_tokens || 0) > (prev.usage.output_tokens || 0)) prev.usage = msg.usage;
    }
  }
  return [...byId.values()].map(priceCall);
}

function priceCall(c) {
  const u = c.usage;
  const input = u.input_tokens || 0;
  const output = u.output_tokens || 0;
  const read = u.cache_read_input_tokens || 0;
  const write = u.cache_creation_input_tokens || 0;
  let w5m, w1h;
  const split = u.cache_creation;
  if (split && (split.ephemeral_5m_input_tokens != null || split.ephemeral_1h_input_tokens != null)) {
    w5m = split.ephemeral_5m_input_tokens || 0;
    w1h = split.ephemeral_1h_input_tokens || 0;
    if (w5m + w1h !== write) warnings.push(`${c.id}: cache_creation split (${w5m}+${w1h}) ≠ cache_creation_input_tokens (${write}); split used`);
  } else {
    w5m = write; w1h = 0;
    if (write > 0) missingSplit++;
  }
  const fam = family(c.model);
  let cost = 0;
  if (fam) {
    const p = PRICES[fam];
    cost = (input * p.input + output * p.output + w5m * p.w5m + w1h * p.w1h + read * p.read) / 1e6;
  } else {
    unknownModels.add(c.model || '(none)');
  }
  return { ...c, input, output, read, w5m, w1h, cost };
}

const mainRows = readJsonl(mainPath);
const mainCalls = callsOf(mainRows, MAIN);

const agents = []; // { label, model, first, calls }
if (fs.existsSync(subDir)) {
  for (const f of fs.readdirSync(subDir).filter((f) => /^agent-.*\.jsonl$/.test(f)).sort()) {
    const file = path.join(subDir, f);
    const metaFile = file.replace(/\.jsonl$/, '.meta.json');
    let meta = {};
    if (fs.existsSync(metaFile)) {
      try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { warnings.push(`${path.basename(metaFile)}: unparseable`); }
    } else warnings.push(`${f}: no meta.json`);
    const rows = readJsonl(file);
    const stamps = rows.map((r) => Date.parse(r.timestamp)).filter(Number.isFinite);
    if (!stamps.length) { warnings.push(`${f}: no timestamped rows, skipped`); continue; }
    const label = meta.agentType || f.replace(/\.jsonl$/, '');
    agents.push({
      label,
      metaModel: meta.model,
      first: Math.min(...stamps),
      last: Math.max(...stamps),
      calls: callsOf(rows, label),
    });
  }
}

// A message.id in two transcripts would be counted twice: warn (and keep the first one seen).
{
  const seen = new Set(mainCalls.map((c) => c.id));
  for (const a of agents) {
    a.calls = a.calls.filter((c) => {
      if (seen.has(c.id)) { warnings.push(`${c.id} appears in more than one transcript; counted once`); return false; }
      seen.add(c.id);
      return true;
    });
  }
}

// ---------- stage boundaries (from the main transcript's own tool calls) ----------
function toolUses(rows) {
  const uses = [];
  for (const r of rows) {
    if (r.type !== 'assistant' || !Array.isArray(r.message?.content)) continue;
    for (const c of r.message.content) {
      if (c.type === 'tool_use') uses.push({ ts: Date.parse(r.timestamp), id: r.message.id, name: c.name, input: c.input || {} });
    }
  }
  return uses.sort((a, b) => a.ts - b.ts);
}
const uses = toolUses(mainRows);
// A session started with the /review-pr slash command logs no Skill tool_use; its reviewer Agent calls
// are the review itself, not a boundary, so the fallback below doesn't apply (→ everything is Review).
const reviewPrCommand = mainRows.some((r) => r.type === 'user' && typeof r.message?.content === 'string' &&
  r.message.content.includes('<command-name>/ticket-to-merge:review-pr</command-name>'));
let reviewUse = uses.find((u) => u.name === 'Skill' && u.input.skill === 'ticket-to-merge:review-pr');
let reviewHow = 'first Skill ticket-to-merge:review-pr';
if (!reviewUse && !reviewPrCommand) {
  reviewUse = uses.find((u) => u.name === 'Agent' && String(u.input.subagent_type || '').startsWith('ticket-to-merge:reviewer-'));
  reviewHow = `first Agent ${reviewUse?.input.subagent_type} (fallback: no review-pr Skill call)`;
}
const fixUse = uses.find((u) => u.name === 'Write' && /(^|\/)tickets\/[^/]+\/review-1\.json$/.test(String(u.input.file_path || '')));

// Main calls: compare each call's first row with the first row of the call that made the boundary tool_use.
// Majors in the first review, from the content of the Write that saved review-1.json (null = unknown).
let firstReviewMajors = null;
if (fixUse && typeof fixUse.input.content === 'string') {
  try {
    const arr = JSON.parse(fixUse.input.content);
    if (Array.isArray(arr)) firstReviewMajors = arr.filter((f) => f && f.severity === 'major').length;
  } catch { /* not JSON: unknown */ }
}

const callFirst = (id) => mainCalls.find((c) => c.id === id)?.first;
const tReview = reviewUse?.ts ?? null;
const tFix = fixUse?.ts ?? null;
const tReviewCall = reviewUse ? callFirst(reviewUse.id) ?? tReview : null;
const tFixCall = fixUse ? callFirst(fixUse.id) ?? tFix : null;

let rule;
let stageOfMain, stageOfAgent;
if (tReview == null) {
  rule = reviewPrCommand
    ? 'No T_review (a /ticket-to-merge:review-pr slash-command session, no Skill call): everything is Review.'
    : 'No T_review (no review-pr Skill call, no reviewer Agent call): everything is Review.';
  stageOfMain = stageOfAgent = () => 'Review';
} else if (tFix == null) {
  rule = `T_review = ${iso(tReview)} (${reviewHow}); no T_fix (no Write to tickets/*/review-1.json, review never finished): Review runs to the end.`;
  stageOfMain = (c) => (c.first < tReviewCall ? 'Build' : 'Review');
  stageOfAgent = (a) => (a.first < tReview ? 'Build' : 'Review');
} else {
  const head = `T_review = ${iso(tReview)} (${reviewHow}); T_fix = ${iso(tFix)} (Write ${path.relative(process.cwd(), fixUse.input.file_path) || fixUse.input.file_path}`;
  if (firstReviewMajors === 0) {
    // No majors → nothing to fix: the rows after T_fix are the run summary, part of the review's outcome.
    rule = `${head}, 0 majors). Main rows before T_review → Build, from T_review to the end → Review (first review found no majors, so the rows after T_fix are counted as Review); subagents by their first row.`;
    stageOfMain = (c) => (c.first < tReviewCall ? 'Build' : 'Review');
    stageOfAgent = (a) => (a.first < tReview ? 'Build' : 'Review');
  } else {
    const majors = firstReviewMajors == null ? 'majors unknown: content not a JSON array' : `${firstReviewMajors} major(s)`;
    rule = `${head}, ${majors}). Main rows before T_review → Build, up to and including the T_fix row → Review, after → Fix loop; subagents by their first row.`;
    stageOfMain = (c) => (c.first < tReviewCall ? 'Build' : c.first <= tFixCall ? 'Review' : 'Fix loop');
    stageOfAgent = (a) => (a.first < tReview ? 'Build' : a.first <= tFix ? 'Review' : 'Fix loop');
  }
}

// ---------- aggregate ----------
const all = [];
for (const c of mainCalls) all.push({ ...c, stage: stageOfMain(c) });
for (const a of agents) {
  const st = stageOfAgent(a);
  for (const c of a.calls) all.push({ ...c, stage: st });
}

const zero = () => ({ calls: 0, input: 0, output: 0, read: 0, w5m: 0, w1h: 0, cost: 0, first: Infinity, last: -Infinity });
function add(acc, c) {
  acc.calls++; acc.input += c.input; acc.output += c.output; acc.read += c.read;
  acc.w5m += c.w5m; acc.w1h += c.w1h; acc.cost += c.cost;
  acc.first = Math.min(acc.first, c.first); acc.last = Math.max(acc.last, c.last);
  return acc;
}
const hit = (t) => { const d = t.input + t.w5m + t.w1h + t.read; return d ? t.read / d : null; };

const byStage = Object.fromEntries(STAGES.map((s) => [s, { tot: zero(), models: new Map() }]));
const byModel = new Map();
const total = zero();
for (const c of all) {
  const s = byStage[c.stage];
  add(s.tot, c);
  if (!s.models.has(c.model)) s.models.set(c.model, zero());
  add(s.models.get(c.model), c);
  if (!byModel.has(c.model)) byModel.set(c.model, zero());
  add(byModel.get(c.model), c);
  add(total, c);
}

// Per-agent rows: main session split by stage (and model); each subagent one row (per model).
const agentRows = [];
{
  const key = (stage, agent, model) => `${STAGES.indexOf(stage)}\u0000${agent}\u0000${model}`;
  const map = new Map();
  for (const c of mainCalls) {
    const st = stageOfMain(c);
    const k = key(st, MAIN, c.model);
    if (!map.has(k)) map.set(k, { stage: st, agent: MAIN, model: c.model, t: zero(), wallFirst: Infinity, wallLast: -Infinity, order: -1 });
    const r = map.get(k); add(r.t, c); r.wallFirst = Math.min(r.wallFirst, c.first); r.wallLast = Math.max(r.wallLast, c.last);
  }
  agents.forEach((a, i) => {
    const st = stageOfAgent(a);
    const models = a.calls.length ? [...new Set(a.calls.map((c) => c.model))] : [a.metaModel || '(no calls)'];
    for (const m of models) {
      const k = key(st, `${a.label}#${i}`, m);
      const r = { stage: st, agent: a.label, model: m, t: zero(), wallFirst: a.first, wallLast: a.last, order: a.first };
      for (const c of a.calls.filter((c) => c.model === m)) add(r.t, c);
      if (!a.calls.length) { r.t.first = a.first; r.t.last = a.last; }
      map.set(k, r);
    }
  });
  agentRows.push(...[...map.values()].sort((x, y) =>
    STAGES.indexOf(x.stage) - STAGES.indexOf(y.stage) || (x.agent === MAIN ? -1 : y.agent === MAIN ? 1 : x.order - y.order)));
}

// ---------- formatting ----------
function iso(ms) { return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'); }
const usd = (n) => `$${n.toFixed(n !== 0 && Math.abs(n) < 0.01 ? 4 : 2)}`;
const usd4 = (n) => `$${n.toFixed(4)}`;
const pct = (x) => (x == null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const int = (n) => n.toLocaleString('en-US');
const short = (m) => { const f = family(m); return f ? `${f[0].toUpperCase()}${f.slice(1)} 5.5` : m; };
function dur(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'n/a';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}
function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}
function emptyReason(stage) {
  if (stage === 'Build') return tReview == null ? 'no T_review: the whole session counts as Review' : 'no calls before the review';
  if (stage === 'Review') return 'no review calls';
  // Fix loop
  if (tReview == null) return 'no T_review: the whole session counts as Review';
  if (tFix == null) return 'review never finished';
  if (firstReviewMajors === 0) return 'review found no majors';
  return 'no calls after the first review';
}
const modelsCell = (models) => [...models.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([m, t]) => `${short(m)} ${usd(t.cost)}`).join(' · ');

const md = [];
md.push(`# Stage costs: session ${sessionId}`);
md.push('');
md.push(`- Transcript: \`${mainPath.replace(os.homedir(), '~')}\` + ${agents.length} subagent transcript(s)`);
md.push(`- API calls: ${total.calls} (deduped by message.id) · main ${mainCalls.length} · subagents ${agents.reduce((n, a) => n + a.calls.length, 0)}`);
md.push(`- Stage rule: ${rule}`);
const pmodes = [...new Set(mainRows.filter((r) => r.type === 'permission-mode').map((r) => r.permissionMode))];
if (pmodes.length) md.push(`- Permission mode: ${pmodes.join(', ')}`);
md.push('');

md.push('## Per stage');
md.push('');
md.push(table(['Stage', 'Cost', 'Cache hit', 'Models'], [
  ...STAGES.map((s) => {
    const { tot, models } = byStage[s];
    if (!tot.calls) return [s, usd(0), 'n/a', `none (${emptyReason(s)})`];
    return [s, usd(tot.cost), pct(hit(tot)), modelsCell(models)];
  }),
  ['**Total, one ticket**', `**${usd(total.cost)}**`, `**${pct(hit(total))}**`, modelsCell(byModel)],
]));
md.push('');

md.push('## Per agent');
md.push('');
md.push(table(['Stage', 'Agent', 'Model', 'API calls', 'Input', 'Output', 'Cache read', 'Cache write 5m / 1h', 'Cost', 'Wall time'],
  agentRows.map((r) => [r.stage, r.agent, short(r.model), r.t.calls, int(r.t.input), int(r.t.output), int(r.t.read),
    `${int(r.t.w5m)} / ${int(r.t.w1h)}`, usd4(r.t.cost), `${dur(r.wallLast - r.wallFirst)} (${iso(r.wallFirst).slice(11, 19)} → ${iso(r.wallLast).slice(11, 19)})`])));
md.push('');
md.push('Wall time: subagents = first → last row of their transcript; main = first → last row of its calls in that stage.');
md.push('');

md.push('## Per model (compare with /usage)');
md.push('');
md.push(table(['Model', 'Input', 'Output', 'Cache read', 'Cache write (5m + 1h)', 'Cost'],
  [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([m, t]) =>
    [m, int(t.input), int(t.output), int(t.read), `${int(t.w5m + t.w1h)} (${int(t.w5m)} + ${int(t.w1h)})`, usd4(t.cost)])
    .concat([['**Total**', int(total.input), int(total.output), int(total.read), int(total.w5m + total.w1h), `**${usd4(total.cost)}**`]])));
md.push('');

let exitCode = 0;
if (expect != null) {
  const diff = total.cost - expect;
  const rel = diff / expect;
  const ok = Math.abs(rel) <= 0.03;
  md.push('## Check against the expected total');
  md.push('');
  md.push(`- Expected ${usd4(expect)} · computed ${usd4(total.cost)} · difference ${diff >= 0 ? '+' : '−'}${usd4(Math.abs(diff))} (${rel >= 0 ? '+' : '−'}${Math.abs(rel * 100).toFixed(2)}%) → **${ok ? 'within 3%' : 'OVER 3%'}**`);
  if (diff < 0) md.push('- The computed total is lower: /usage can include calls that never reach a transcript (e.g. auto-mode classifier calls on Haiku), so a small Haiku shortfall is expected.' + (pmodes.includes('auto') ? ' This session ran in auto mode.' : ''));
  md.push('');
  if (!ok) exitCode = 1;
}

if (missingSplit) notes.push(`${missingSplit} call(s) had no cache_creation 5m/1h split: all their cache writes were priced as 5m.`);
for (const m of unknownModels) warnings.push(`unknown model "${m}": priced at $0`);
if (notes.length || warnings.length) {
  md.push('## Notes');
  md.push('');
  for (const n of notes) md.push(`- ${n}`);
  for (const w of [...new Set(warnings)]) md.push(`- WARNING: ${w}`);
  md.push('');
}

const text = md.join('\n');
process.stdout.write(text + '\n');
if (out) fs.writeFileSync(out, text + '\n');
for (const m of unknownModels) console.error(`stage-costs: WARNING unknown model "${m}" priced at $0`);
process.exit(exitCode);
