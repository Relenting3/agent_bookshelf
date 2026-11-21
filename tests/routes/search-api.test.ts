import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import request from 'supertest';
import app from '../../src/server.js';
import { initDb, closeDb } from '../../src/db/index.js';

const DB = '/tmp/test-api.db';

beforeEach(async () => {
  await initDb(DB);
});

afterEach(() => {
  closeDb();
  try {
    fs.unlinkSync(DB);
  } catch (e) {
    // ignore
  }
});

const search = (q: string) => request(app).get('/api/books/search').query({ q });
const titlesOf = (body: { title: string }[]) => body.map((b) => b.title);
const LEN_ERR = { error: 'Search query must be 100 characters or fewer' };

describe('GET /api/books/search', () => {
  it('AC-1: API search matches title in any case', async () => {
    for (const q of ['PRAGMATIC', 'pRaGmAtIc']) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(titlesOf(res.body)).toEqual(['The Pragmatic Programmer']);
    }
  });

  it('AC-2: API search Weir returns exactly two books', async () => {
    const res = await search('Weir');
    expect(res.status).toBe(200);
    expect(titlesOf(res.body).sort()).toEqual(['Project Hail Mary', 'The Martian']);
    const herbert = await search('Herbert');
    expect(titlesOf(herbert.body)).toContain('Dune');
  });

  it('AC-3: API search mieville without accent returns []', async () => {
    const accented = await search('Miéville');
    expect(accented.status).toBe(200);
    expect(titlesOf(accented.body)).toEqual(['The City & the City']);
    const res = await search('mieville');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC-6: API search zzzz returns 200 []', async () => {
    const res = await search('zzzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC-7: API search without q, q= and q=spaces returns 50, first 1984', async () => {
    const urls = ['/api/books/search', '/api/books/search?q=', '/api/books/search?q=%20%20%20'];
    for (const url of urls) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(50);
      expect(res.body[0].title).toBe('1984');
    }
  });

  it('AC-8: API search trims the query', async () => {
    const padded = await search('  dune  ');
    const plain = await search('dune');
    expect(padded.status).toBe(200);
    expect(padded.body).toEqual(plain.body);
    expect(titlesOf(plain.body)).toContain('Dune');
  });

  it('AC-9: API search length limit returns 200/400', async () => {
    expect((await search('a'.repeat(99))).status).toBe(200);
    const over = await search('a'.repeat(101));
    expect(over.status).toBe(400);
    expect(over.body).toEqual(LEN_ERR);
    const padded = await search('  ' + 'a'.repeat(99) + '  ');
    expect(padded.status).toBe(200);
    const spaces = await search(' '.repeat(150));
    expect(spaces.status).toBe(200);
    expect(spaces.body).toHaveLength(50);
    expect((await search('😀'.repeat(99))).status).toBe(200);
    const emoji = await search('😀'.repeat(101));
    expect(emoji.status).toBe(400);
    expect(emoji.body).toEqual(LEN_ERR);
  });

  it('AC-11: percent, underscore and backslash are literal', async () => {
    for (const q of ['%', '_', '\\']) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    }
  });

  it('AC-12: SQL injection strings return [] and books table intact', async () => {
    for (const q of ["' OR 1=1 --", "'); DROP TABLE books; --"]) {
      const res = await search(q);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    }
    const all = await request(app).get('/api/books');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(50);
  });

  it('AC-7: search route is not caught by /api/books/:id', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.body.title).toBe('The Pragmatic Programmer');
  });
});
