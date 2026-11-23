import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
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
    unlinkSync(DB);
  } catch (e) {
    // ignore
  }
});

const cards = (html: string) => (html.match(/class="book-card"/g) || []).length;
const LEN = 'Search query must be 100 characters or fewer';
const STR = 'Search query must be a single string';

describe('GET /books/search (HTML fragment)', () => {
  it('AC-13: q=dune returns text/html with a card linking to /books/16', async () => {
    const res = await request(app).get('/books/search').query({ q: 'dune' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('class="book-card"');
    expect(res.text).toContain('/books/16');
    expect(res.text).toContain('id="search-results"');
  });

  it('AC-14: q= and no q return 50 .book-card', async () => {
    for (const path of ['/books/search?q=', '/books/search']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(cards(res.text)).toBe(50);
    }
  });

  it('AC-15: q=zzzz shows .no-results with zzzz and no cards', async () => {
    const res = await request(app).get('/books/search?q=zzzz');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/class="no-results"[^>]*>[^<]*zzzz/);
    expect(cards(res.text)).toBe(0);
  });

  it('AC-16: 101 a → 400 length error inside #search-results', async () => {
    const res = await request(app).get('/books/search').query({ q: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('id="search-results"');
    expect(res.text).toContain(`<p class="error">${LEN}</p>`);
  });

  it('AC-16: q=a&q=b → 400 single-string error inside #search-results', async () => {
    const res = await request(app).get('/books/search?q=a&q=b');
    expect(res.status).toBe(400);
    expect(res.text).toContain('id="search-results"');
    expect(res.text).toContain(`<p class="error">${STR}</p>`);
  });

  it('AC-17: script query is escaped', async () => {
    const res = await request(app).get('/books/search').query({ q: '<script>alert(1)</script>' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('&lt;script&gt;');
    expect(res.text).not.toContain('<script>alert(1)');
  });

  it('AC-18: GET / shows 50 cards and input targets #search-results', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(cards(res.text)).toBe(50);
    expect(res.text).toContain('hx-get="/books/search"');
    expect(res.text).toMatch(/hx-target="#search-results"/);
  });

  it('AC-18: #search-results carries hx-on::before-swap on home page, 200 and 400 fragments', async () => {
    const paths = [
      '/',
      '/books/search?q=dune',
      '/books/search?q=zzzz',
      '/books/search?q=' + 'a'.repeat(101),
      '/books/search?q=a&q=b',
    ];
    for (const p of paths) {
      const res = await request(app).get(p);
      expect(res.text).toMatch(/<div id="search-results"[^>]*hx-on::before-swap=/);
    }
  });
});
