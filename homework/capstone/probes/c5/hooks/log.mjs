// ttm-probe hook logger. Appends one JSON line per event to <plugin root>/log/hooks.jsonl.
// Never blocks: every error is swallowed and the process always exits 0.
import { appendFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const event = process.argv[2] ?? null;

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

function listSubagents(transcriptPath) {
  try {
    if (typeof transcriptPath !== 'string') return [];
    const dir = transcriptPath.replace(/\.jsonl$/, '') + '/subagents/';
    let names;
    try { names = readdirSync(dir); } catch { return []; }
    const out = [];
    for (const file of names.filter((n) => n.endsWith('.meta.json')).sort()) {
      try {
        const meta = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        out.push({ file, agentType: meta.agentType ?? null, requestShape: meta.requestShape ?? null, finished: meta.finished ?? null });
      } catch (err) {
        out.push({ file, error: String(err?.message ?? err) });
      }
    }
    return out;
  } catch { return []; }
}

try {
  let input = {};
  try { input = JSON.parse(readStdin() || '{}') ?? {}; } catch { input = {}; }
  const line = {
    t: Date.now(),
    event,
    session_id: input.session_id ?? null,
    agent_id: input.agent_id ?? null,
    agent_type: input.agent_type ?? null,
    tool_name: input.tool_name ?? null,
    command: input.tool_input?.command ?? null,
    stop_hook_active: input.stop_hook_active ?? null,
  };
  if (event === 'Stop' || event === 'SubagentStop') line.subagents = listSubagents(input.transcript_path);
  const root = process.env.CLAUDE_PLUGIN_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
  const logDir = join(root, 'log');
  mkdirSync(logDir, { recursive: true });
  appendFileSync(join(logDir, 'hooks.jsonl'), JSON.stringify(line) + '\n');
} catch {
  // swallow
}
process.exit(0);
