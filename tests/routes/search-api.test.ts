import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
import request from 'supertest';
import app from '../../src/server.js';
import { initDb, closeDb } from '../../src/db/index.js';

const DB = '/tmp/test-search-api.db';

beforeEach(async () => {
  await initDb(DB);
});

afterEach(() => {
  closeDb();
  try {
    unlinkSync(DB);
  } catch (e) {
    // ignore
  }
});

const search = (q: string) => request(app).get('/api/books/search').query({ q });
const titles = (body: { title: string }[]) => body.map((b) => b.title);
const LEN = 'Search query must be 100 characters or fewer';
const STR = 'Search query must be a single string';

describe('GET /api/books/search', () => {
  it('AC-1: JSON route matches PRAGMATIC and pRaGmAtIc', async () => {
    for (const q of ['PRAGMATIC', 'pRaGmAtIc']) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(titles(res.body)).toEqual(['The Pragmatic Programmer']);
    }
  });

  it('AC-2: JSON route matches author', async () => {
    const h = await search('HERBERT');
    expect(h.status).toBe(200);
    expect(titles(h.body)).toContain('Dune');
    const w = await search('weir');
    expect(titles(w.body).sort()).toEqual(['Project Hail Mary', 'The Martian']);
  });

  it('AC-3: JSON route non-ASCII case', async () => {
    for (const q of ['MIÉVILLE', 'miéville']) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(titles(res.body)).toEqual(['The City & the City']);
    }
    const none = await search('mieville');
    expect(none.status).toBe(200);
    expect(none.body).toEqual([]);
  });

  it('AC-6: zzzz returns 200 []', async () => {
    const res = await search('zzzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC-7: no q, q= and q=%20%20%20 return 50 books, first 1984', async () => {
    for (const path of ['/api/books/search', '/api/books/search?q=', '/api/books/search?q=%20%20%20']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(50);
      expect(res.body[0].title).toBe('1984');
    }
  });

  it('AC-8: JSON route trims', async () => {
    const a = await search('dune');
    const b = await search('  dune  ');
    expect(a.body.length).toBeGreaterThan(0);
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
  });

  it('AC-9: 100 a → 200', async () => {
    const res = await search('a'.repeat(100));
    expect(res.status).toBe(200);
  });

  it('AC-9: 101 a → 400 length error', async () => {
    const res = await search('a'.repeat(101));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: LEN });
  });

  it('AC-9: padded 100 a → 200', async () => {
    const res = await search('  ' + 'a'.repeat(100) + '  ');
    expect(res.status).toBe(200);
  });

  it('AC-9: 150 spaces → 50 books', async () => {
    const res = await search(' '.repeat(150));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(50);
  });

  it('AC-9: 100 😀 → 200', async () => {
    const res = await search('😀'.repeat(100));
    expect(res.status).toBe(200);
  });

  it('AC-9: 101 😀 → 400', async () => {
    const res = await search('😀'.repeat(101));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: LEN });
  });

  it('AC-10: q=a&q=b → 400 single string', async () => {
    const res = await request(app).get('/api/books/search?q=a&q=b');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: STR });
  });

  it('AC-10: q[x]=1 → 400 single string', async () => {
    const res = await request(app).get('/api/books/search?q[x]=1');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: STR });
  });

  it('AC-11: % _ and \\ each return []', async () => {
    for (const q of ['%', '_', '\\']) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    }
  });

  it("AC-12: ' OR 1=1 -- returns []", async () => {
    const res = await search("' OR 1=1 --");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC-12: DROP TABLE payload returns [] and /api/books still has 50', async () => {
    const res = await search("'); DROP TABLE books; --");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    const all = await request(app).get('/api/books');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(50);
  });

  it('AC-19: GET /api/books/1 still returns The Pragmatic Programmer', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('The Pragmatic Programmer');
  });
});
