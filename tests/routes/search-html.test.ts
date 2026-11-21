import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import request from 'supertest';
import app from '../../src/server.js';
import { initDb, closeDb } from '../../src/db/index.js';

const DB = '/tmp/test-search-html.db';

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

const cards = (html: string) => (html.match(/class="book-card"/g) || []).length;
const LEN_MSG = 'Search query must be 100 characters or fewer';

describe('GET /books/search (HTML fragment)', () => {
  it('AC-13: HTML search dune returns html card linking /books/16', async () => {
    const res = await request(app).get('/books/search').query({ q: 'dune' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('id="search-results"');
    expect(res.text).toContain('class="book-card"');
    expect(res.text).toContain('/books/16');
    expect(res.text).toContain('Dune');
    expect(() => JSON.parse(res.text)).toThrow();
  });

  it('AC-14: HTML search with q= and no q returns 50 cards', async () => {
    for (const url of ['/books/search?q=', '/books/search']) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(cards(res.text)).toBe(50);
    }
  });

  it('AC-15: HTML search zzzz shows no-results and no cards', async () => {
    const res = await request(app).get('/books/search').query({ q: 'zzzz' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('class="no-results"');
    expect(res.text).toContain('zzzz');
    expect(cards(res.text)).toBe(0);
  });

  it('AC-16: HTML search returns 400 error fragments inside #search-results', async () => {
    const long = await request(app).get('/books/search').query({ q: 'a'.repeat(101) });
    expect(long.status).toBe(400);
    expect(long.headers['content-type']).toMatch(/text\/html/);
    expect(long.text).toContain('id="search-results"');
    expect(long.text).toContain(`<p class="error">${LEN_MSG}</p>`);
    expect(cards(long.text)).toBe(0);
  });

  it('AC-17: HTML search escapes script query', async () => {
    const res = await request(app).get('/books/search').query({ q: '<script>alert(1)</script>' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('&lt;script&gt;');
    expect(res.text).not.toContain('<script>alert(1)');
  });

  it('AC-18: home page has 50 cards and input targets #search-results', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(cards(res.text)).toBe(50);
    expect(res.text).toContain('hx-get="/books/search"');
    expect(res.text).toContain('hx-target="#search-results"');
    expect(res.text).toContain('name="q"');
  });

  it('AC-18: home and fragments carry hx-on::before-swap on #search-results', async () => {
    const pages = [
      await request(app).get('/'),
      await request(app).get('/books/search').query({ q: 'dune' }),
      await request(app).get('/books/search').query({ q: 'zzzz' }),
      await request(app).get('/books/search').query({ q: 'a'.repeat(101) }),
    ];
    for (const res of pages) {
      expect(res.text).toMatch(/<div id="search-results"[^>]*hx-on::before-swap=/);
    }
  });
});
