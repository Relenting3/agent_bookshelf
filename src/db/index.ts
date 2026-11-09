import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let SQL: SqlJsStatic;
let db: Database;
let dbPath: string;

export async function initDb(path?: string): Promise<Database> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file)
    });
  }

  dbPath = path || join(process.cwd(), 'bookshelf.db');

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  const userCount = db.exec('SELECT COUNT(*) as count FROM users');
  const count = userCount.length > 0 ? userCount[0].values[0][0] : 0;

  if (count === 0) {
    const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf-8');
    db.run(seed);
  }

  saveDb();
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
    // sql.js export() resets connection pragmas
    db.run('PRAGMA foreign_keys = ON');
  }
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
  }
}

export function query(sql: string, params: unknown[] = []): { columns: string[]; values: unknown[][] }[] {
  return getDb().exec(sql, params as any);
}

export function get(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  const stmt = getDb().prepare(sql);
  stmt.bind(params as any);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as Record<string, unknown>;
  }
  stmt.free();
  return undefined;
}

export function all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = getDb().prepare(sql);
  stmt.bind(params as any);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return results;
}

export function run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
  getDb().run(sql, params as any);
  const changesResult = getDb().exec('SELECT changes() as changes, last_insert_rowid() as lastInsertRowid');
  const changes = changesResult[0]?.values[0][0] as number || 0;
  const lastInsertRowid = changesResult[0]?.values[0][1] as number || 0;
  return { changes, lastInsertRowid };
}
