import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { initDb, closeDb, get } from '../../src/db/index.js';
import * as Book from '../../src/models/book.js';

const DB = '/tmp/test-book-search.db';

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

const titles = (q: string) => Book.searchBooks(q).map((b) => b.title);

describe('searchBooks', () => {
  it('AC-1: searchBooks matches title in any case', () => {
    expect(titles('PRAGMATIC')).toEqual(['The Pragmatic Programmer']);
    expect(titles('pRaGmAtIc')).toEqual(['The Pragmatic Programmer']);
  });

  it('AC-2: searchBooks matches author HERBERT', () => {
    expect(titles('HERBERT')).toContain('Dune');
    expect(titles('weir').sort()).toEqual(['Project Hail Mary', 'The Martian']);
  });

  it('AC-3: ulower is registered after every initDb', async () => {
    const ul = (sql: string): { err: string | null; v: unknown } => {
      try {
        return { err: null, v: (get(sql) as unknown as { v: unknown }).v };
      } catch (e) {
        return { err: String(e), v: undefined };
      }
    };
    expect(ul("SELECT ulower('MIÉVILLE') AS v")).toEqual({ err: null, v: 'miéville' });
    expect(ul('SELECT ulower(NULL) AS v')).toEqual({ err: null, v: null });
    closeDb();
    await initDb(DB);
    expect(ul("SELECT ulower('MIÉVILLE') AS v")).toEqual({ err: null, v: 'miéville' });
  });

  it('AC-3: searchBooks folds non-ASCII case', () => {
    expect(titles('MIÉVILLE')).toEqual(['The City & the City']);
    expect(titles('miéville')).toEqual(['The City & the City']);
    expect(titles('mieville')).toEqual([]);
  });

  it('AC-4: phrase matches within one field', () => {
    expect(titles('pragmatic programmer')).toEqual(['The Pragmatic Programmer']);
  });

  it("AC-4: words split across title and author don't match", () => {
    expect(titles('dune frank')).toEqual([]);
    expect(titles('frank dune')).toEqual([]);
  });

  it('AC-5: results ordered as in getAllBooks', () => {
    const all = Book.getAllBooks().map((b) => b.title);
    const found = titles('the');
    expect(found.length).toBeGreaterThan(1);
    const expected = all.filter((t) => found.includes(t));
    expect(found).toEqual(expected);
  });

  it('AC-7: searchBooks empty and whitespace return all 50', () => {
    for (const q of ['', '   ']) {
      const res = Book.searchBooks(q);
      expect(res).toHaveLength(50);
      expect(res[0].title).toBe('1984');
      expect(res.map((b) => b.id)).toEqual(Book.getAllBooks().map((b) => b.id));
    }
  });

  it('AC-8: searchBooks trims the query', () => {
    expect(Book.searchBooks('  dune  ')).toEqual(Book.searchBooks('dune'));
    expect(titles('  dune  ')).toContain('Dune');
  });

  it('AC-9: parseSearchQuery length limit (100/101, emoji)', () => {
    const p = Book.parseSearchQuery;
    const tooLong = { ok: false, error: 'Search query must be 100 characters or fewer' };
    expect(p('a'.repeat(100))).toEqual({ ok: true, query: 'a'.repeat(100) });
    expect(p('a'.repeat(101))).toEqual(tooLong);
    expect(p('😀'.repeat(100))).toEqual({ ok: true, query: '😀'.repeat(100) });
    expect(p('😀'.repeat(101))).toEqual(tooLong);
    expect(p(undefined)).toEqual({ ok: true, query: '' });
    expect(Book.SEARCH_MAX_LENGTH).toBe(100);
  });

  it('AC-10: parseSearchQuery rejects arrays and objects', () => {
    const err = { ok: false, error: 'Search query must be a single string' };
    expect(Book.parseSearchQuery(['a', 'b'])).toEqual(err);
    expect(Book.parseSearchQuery({ x: '1' })).toEqual(err);
  });

  it('AC-11: percent, underscore and backslash are literal', () => {
    expect(Book.searchBooks('%')).toEqual([]);
    expect(Book.searchBooks('_')).toEqual([]);
    expect(Book.searchBooks('\\')).toEqual([]);
  });
});
